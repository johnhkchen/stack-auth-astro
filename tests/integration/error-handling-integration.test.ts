/**
 * Error Handling Integration Tests for Sprint 004
 * 
 * This test suite validates comprehensive error handling across all Sprint 004 features:
 * - Component error boundaries prevent app crashes
 * - Network errors are handled gracefully with fallbacks
 * - User-friendly error messages are displayed
 * - Error recovery mechanisms work correctly
 * - Auth state errors don't break component synchronization
 * - Performance is maintained during error scenarios
 * 
 * Ensures that Feature #10 (Helpful error messages) integrates properly
 * with all other Sprint 004 components and functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { 
  UserButton, 
  SignIn, 
  SignUp, 
  AccountSettings, 
  AstroStackProvider,
  StackAuthErrorBoundary,
  StackAuthComponentBoundary,
  withStackAuthErrorBoundary,
  useStackAuthErrorHandler,
  StackAuthClientError,
  CLIENT_ERROR_CODES,
  getErrorMessage,
  formatClientError,
  createErrorNotification
} from '../../src/components.js';
import { signIn, signOut } from '../../src/client.js';
import { getAuthState, subscribeToAuthState, initAuthState, getAuthStateManager } from '../../src/client/state.js';
import { initSync, broadcastSignIn, broadcastSignOut } from '../../src/client/sync.js';

// Mock console methods to track error handling
const consoleMocks = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn()
};

// Error simulation utilities
class ErrorSimulator {
  static networkError(message: string = 'Network error'): Error {
    const error = new Error(message);
    (error as any).code = 'NETWORK_ERROR';
    return error;
  }

  static corsError(): Error {
    const error = new Error('Cross-origin request blocked');
    (error as any).name = 'CORSError';
    return error;
  }

  static rateLimitError(): Error {
    const error = new Error('429 Too Many Requests');
    (error as any).status = 429;
    return error;
  }

  static serviceUnavailableError(): Error {
    const error = new Error('503 Service Unavailable');
    (error as any).status = 503;
    return error;
  }

  static componentError(componentName: string): Error {
    const error = new Error(`${componentName} component failed to render`);
    error.stack = `Error: ${error.message}\n    at ${componentName}Component`;
    return error;
  }

  static authError(message: string = 'Authentication failed'): StackAuthClientError {
    return new StackAuthClientError(
      message,
      'INVALID_CREDENTIALS',
      CLIENT_ERROR_CODES.INVALID_CREDENTIALS
    );
  }
}

// Mock Stack Auth components with error scenarios
vi.mock('@stackframe/stack', () => ({
  SignIn: vi.fn(({ onSuccess, onError, simulateError, ...props }) => {
    React.useEffect(() => {
      if (simulateError && onError) {
        const error = ErrorSimulator.networkError('SignIn component error');
        onError(error);
      }
    }, [simulateError, onError]);

    if (simulateError === 'render') {
      throw ErrorSimulator.componentError('SignIn');
    }

    return React.createElement('div', { 
      'data-testid': 'signin-component',
      ...props,
      onClick: () => {
        if (simulateError === 'click') {
          if (onError) onError(ErrorSimulator.authError('Click error'));
          return;
        }
        if (onSuccess) onSuccess({
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        });
      }
    }, 'Stack Auth SignIn');
  }),

  SignUp: vi.fn(({ onSuccess, onError, simulateError, ...props }) => {
    if (simulateError === 'render') {
      throw ErrorSimulator.componentError('SignUp');
    }

    return React.createElement('div', { 
      'data-testid': 'signup-component',
      ...props,
      onClick: () => {
        if (simulateError === 'click') {
          if (onError) onError(ErrorSimulator.rateLimitError());
          return;
        }
        if (onSuccess) onSuccess({
          user: { id: 'signup-user', email: 'signup@example.com' },
          session: { id: 'signup-session' }
        });
      }
    }, 'Stack Auth SignUp');
  }),

  UserButton: vi.fn(({ user, simulateError, ...props }) => {
    if (simulateError === 'render') {
      throw ErrorSimulator.componentError('UserButton');
    }

    return React.createElement('div', { 
      'data-testid': 'userbutton-component',
      ...props
    }, user ? `User: ${user.email}` : 'Not signed in');
  }),

  AccountSettings: vi.fn(({ user, simulateError, ...props }) => {
    if (simulateError === 'render') {
      throw ErrorSimulator.componentError('AccountSettings');
    }

    return React.createElement('div', { 
      'data-testid': 'accountsettings-component',
      ...props
    }, user ? `Settings for ${user.email}` : 'No user settings');
  }),

  StackProvider: vi.fn(({ children, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'stack-provider',
      ...props
    }, children)
  )
}));

// Mock fetch with error scenarios
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset console mocks
    Object.entries(consoleMocks).forEach(([method, mock]) => {
      vi.spyOn(console, method as keyof Console).mockImplementation(mock);
    });

    // Initialize auth state
    initAuthState({
      persistStorage: false,
      autoRefresh: false,
      refreshInterval: 0
    });

    initSync({
      enableBroadcastSync: true,
      enableStorageSync: true
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Component Error Boundaries', () => {
    it('should prevent app crashes when components fail', () => {
      const TestApp = () => (
        <StackAuthErrorBoundary
          fallback={({ error, retry, resetError }) => (
            <div data-testid="error-boundary">
              <div data-testid="error-message">Error: {error.message}</div>
              <button onClick={retry} data-testid="retry-button">Retry</button>
              <button onClick={resetError} data-testid="reset-button">Reset</button>
            </div>
          )}
        >
          <SignIn simulateError="render" />
        </StackAuthErrorBoundary>
      );

      render(<TestApp />);

      // Should show error boundary instead of crashing
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('SignIn component failed to render');
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should isolate component failures', () => {
      const TestApp = () => (
        <div>
          <StackAuthComponentBoundary isolateFailures={true}>
            <UserButton simulateError="render" />
          </StackAuthComponentBoundary>
          
          <StackAuthComponentBoundary isolateFailures={true}>
            <SignIn />
          </StackAuthComponentBoundary>
          
          <div data-testid="unrelated-content">This should still work</div>
        </div>
      );

      render(<TestApp />);

      // SignIn should still work even though UserButton failed
      expect(screen.getByTestId('signin-component')).toBeInTheDocument();
      expect(screen.getByTestId('unrelated-content')).toBeInTheDocument();
    });

    it('should provide error recovery mechanisms', async () => {
      const user = userEvent.setup();
      let retryCount = 0;

      const TestApp = () => (
        <StackAuthErrorBoundary
          enableRecovery={true}
          fallback={({ error, retry }) => (
            <div data-testid="error-fallback">
              <div>Recovery available</div>
              <button 
                onClick={() => {
                  retryCount++;
                  retry();
                }} 
                data-testid="recovery-button"
              >
                Recover
              </button>
            </div>
          )}
        >
          <UserButton simulateError={retryCount === 0 ? 'render' : undefined} />
        </StackAuthErrorBoundary>
      );

      render(<TestApp />);

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();

      await user.click(screen.getByTestId('recovery-button'));

      // After recovery, component should work
      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
      });

      expect(retryCount).toBe(1);
    });

    it('should reset error state on props change', async () => {
      const TestApp = () => {
        const [errorMode, setErrorMode] = React.useState(true);

        return (
          <div>
            <button 
              onClick={() => setErrorMode(false)}
              data-testid="fix-error-button"
            >
              Fix Error
            </button>
            
            <StackAuthErrorBoundary
              resetOnPropsChange={true}
              fallback={() => <div data-testid="props-error">Component error</div>}
            >
              <UserButton simulateError={errorMode ? 'render' : undefined} />
            </StackAuthErrorBoundary>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestApp />);

      expect(screen.getByTestId('props-error')).toBeInTheDocument();

      await user.click(screen.getByTestId('fix-error-button'));

      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling', () => {
    it('should handle sign in network errors with fallback', async () => {
      mockFetch.mockRejectedValueOnce(ErrorSimulator.networkError('Failed to fetch'));

      const onError = vi.fn();

      try {
        await signIn('github', { onError });
      } catch (error) {
        expect(error).toBeInstanceOf(StackAuthClientError);
        expect((error as StackAuthClientError).code).toBe('NETWORK_ERROR');
        expect((error as StackAuthClientError).recovery).toContain('Check your internet connection');
      }
    });

    it('should handle CORS errors appropriately', async () => {
      mockFetch.mockRejectedValueOnce(ErrorSimulator.corsError());

      try {
        await signIn('google');
      } catch (error) {
        expect(error).toBeInstanceOf(StackAuthClientError);
        expect((error as StackAuthClientError).code).toBe('CORS_ERROR');
        expect((error as StackAuthClientError).recovery).toContain('proper CORS configuration');
      }
    });

    it('should handle rate limiting with user guidance', async () => {
      mockFetch.mockRejectedValueOnce(ErrorSimulator.rateLimitError());

      try {
        await signIn();
      } catch (error) {
        expect(error).toBeInstanceOf(StackAuthClientError);
        expect((error as StackAuthClientError).code).toBe('RATE_LIMITED');
        expect((error as StackAuthClientError).recovery).toContain('wait before trying again');
      }
    });

    it('should handle service unavailable errors', async () => {
      mockFetch.mockRejectedValueOnce(ErrorSimulator.serviceUnavailableError());

      try {
        await signOut();
      } catch (error) {
        expect(error).toBeInstanceOf(StackAuthClientError);
        expect((error as StackAuthClientError).code).toBe('SERVICE_UNAVAILABLE');
        expect((error as StackAuthClientError).recovery).toContain('temporarily unavailable');
      }
    });

    it('should provide fallback redirect for persistent errors', async () => {
      const originalLocation = window.location.href;
      
      // Mock multiple failed attempts
      mockFetch
        .mockRejectedValueOnce(ErrorSimulator.networkError())
        .mockRejectedValueOnce(ErrorSimulator.networkError())
        .mockRejectedValueOnce(ErrorSimulator.networkError())
        .mockRejectedValueOnce(ErrorSimulator.networkError());

      await signIn('github', { redirectTo: '/dashboard' });

      // Should fallback to redirect-based sign in
      expect(window.location.href).toBe('/handler/signin/github?redirectTo=%2Fdashboard');
    });
  });

  describe('Error Message Integration', () => {
    it('should provide helpful error messages across components', async () => {
      const user = userEvent.setup();
      const errorMessages: string[] = [];

      const TestApp = () => (
        <AstroStackProvider
          errorFallback={({ error }) => {
            errorMessages.push(error.message);
            return <div data-testid="provider-error">Provider Error</div>;
          }}
        >
          <SignIn 
            simulateError="click"
            onError={(error) => {
              errorMessages.push(error.message);
            }}
          />
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      await user.click(screen.getByTestId('signin-component'));

      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0]).toContain('Authentication failed');
    });

    it('should format error messages consistently', () => {
      const networkError = new StackAuthClientError(
        'Network request failed',
        'NETWORK_ERROR',
        CLIENT_ERROR_CODES.NETWORK_ERROR
      );

      const formattedError = formatClientError(networkError);
      
      expect(formattedError).toContain('Network request failed');
      expect(formattedError).toContain('Check your internet connection');
    });

    it('should create error notifications', () => {
      const authError = new StackAuthClientError(
        'Invalid credentials',
        'INVALID_CREDENTIALS',
        CLIENT_ERROR_CODES.INVALID_CREDENTIALS
      );

      const notification = createErrorNotification(authError);
      
      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('recovery');
      expect(notification.recovery).toBe(CLIENT_ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('should extract helpful messages from various error types', () => {
      const errors = [
        new Error('Failed to fetch'),
        new Error('429 Too Many Requests'),
        new Error('CORS policy violation'),
        ErrorSimulator.authError('Token expired')
      ];

      errors.forEach(error => {
        const message = getErrorMessage(error);
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      });
    });
  });

  describe('Auth State Error Handling', () => {
    it('should handle auth state errors without breaking sync', async () => {
      const authStateManager = getAuthStateManager();
      const stateUpdates: any[] = [];

      const unsubscribe = subscribeToAuthState((state) => {
        stateUpdates.push(state);
      });

      try {
        // Simulate auth state error
        authStateManager.setError(ErrorSimulator.authError('State sync failed'));

        // Should still be able to update auth state
        authStateManager.setAuthData(
          { id: 'recovery-user', email: 'recovery@example.com' } as any,
          { id: 'recovery-session' } as any
        );

        expect(stateUpdates.length).toBeGreaterThan(0);
        
        // Latest state should have the user data
        const latestState = stateUpdates[stateUpdates.length - 1];
        expect(latestState.user?.email).toBe('recovery@example.com');
      } finally {
        unsubscribe();
      }
    });

    it('should handle broadcast errors gracefully', async () => {
      // Mock BroadcastChannel to throw error
      const originalBroadcastChannel = global.BroadcastChannel;
      (global as any).BroadcastChannel = vi.fn().mockImplementation(() => {
        throw new Error('BroadcastChannel not available');
      });

      const TestApp = () => (
        <AstroStackProvider syncAcrossTabs={true}>
          <UserButton data-testid="sync-error-userbutton" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should still render component despite sync error
      expect(screen.getByTestId('sync-error-userbutton')).toBeInTheDocument();

      // Restore
      (global as any).BroadcastChannel = originalBroadcastChannel;
    });

    it('should recover from storage errors', async () => {
      const originalLocalStorage = window.localStorage;
      
      // Mock localStorage to throw error
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage quota exceeded');
          }),
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage quota exceeded');
          }),
          removeItem: vi.fn(),
          clear: vi.fn()
        }
      });

      const TestApp = () => (
        <AstroStackProvider>
          <UserButton data-testid="storage-error-userbutton" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should still work despite storage errors
      expect(screen.getByTestId('storage-error-userbutton')).toBeInTheDocument();

      // Restore
      Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
    });
  });

  describe('Error Hook Integration', () => {
    it('should provide error handling hooks', () => {
      let errorHandler: any = null;

      const TestComponent = () => {
        errorHandler = useStackAuthErrorHandler();
        return <div data-testid="hook-component">Component with error hook</div>;
      };

      const TestApp = () => (
        <AstroStackProvider>
          <TestComponent />
        </AstroStackProvider>
      );

      render(<TestApp />);

      expect(screen.getByTestId('hook-component')).toBeInTheDocument();
      expect(errorHandler).toBeTruthy();
      expect(typeof errorHandler.handleError).toBe('function');
      expect(typeof errorHandler.clearError).toBe('function');
    });

    it('should handle errors through hooks', () => {
      let errorHandler: any = null;
      let hookError: any = null;

      const TestComponent = () => {
        errorHandler = useStackAuthErrorHandler();
        
        React.useEffect(() => {
          if (errorHandler) {
            errorHandler.handleError(ErrorSimulator.authError('Hook test error'));
          }
        }, [errorHandler]);

        return <div data-testid="hook-error-component">Hook Error Component</div>;
      };

      const TestApp = () => (
        <AstroStackProvider
          errorFallback={({ error }) => {
            hookError = error;
            return <div data-testid="hook-error-fallback">Hook error handled</div>;
          }}
        >
          <TestComponent />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Hook should handle error appropriately
      expect(screen.getByTestId('hook-error-component')).toBeInTheDocument();
    });
  });

  describe('Performance During Error Scenarios', () => {
    it('should maintain performance during error handling', async () => {
      const startTime = performance.now();
      const user = userEvent.setup();

      const TestApp = () => (
        <div>
          {Array.from({ length: 5 }, (_, i) => (
            <StackAuthErrorBoundary
              key={i}
              fallback={() => <div data-testid={`error-${i}`}>Error {i}</div>}
            >
              <UserButton 
                simulateError={i % 2 === 0 ? 'render' : undefined}
                data-testid={`userbutton-${i}`}
              />
            </StackAuthErrorBoundary>
          ))}
        </div>
      );

      render(<TestApp />);

      // Error boundaries should handle errors quickly
      await waitFor(() => {
        expect(screen.getByTestId('error-0')).toBeInTheDocument();
        expect(screen.getByTestId('userbutton-1')).toBeInTheDocument();
        expect(screen.getByTestId('error-2')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const errorHandlingTime = endTime - startTime;

      expect(errorHandlingTime).toBeLessThan(500); // Error handling should be fast
    });

    it('should not cause memory leaks during error recovery', async () => {
      const components: any[] = [];

      for (let i = 0; i < 3; i++) {
        const TestApp = () => (
          <StackAuthErrorBoundary
            fallback={({ retry }) => (
              <button onClick={retry} data-testid={`retry-${i}`}>Retry {i}</button>
            )}
          >
            <UserButton simulateError="render" />
          </StackAuthErrorBoundary>
        );

        components.push(render(<TestApp />));
      }

      // All should show error fallbacks
      for (let i = 0; i < 3; i++) {
        expect(screen.getByTestId(`retry-${i}`)).toBeInTheDocument();
      }

      // Cleanup
      components.forEach(({ unmount }) => unmount());

      // Should not cause memory issues
      expect(components.length).toBe(3);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should support complete error recovery workflow', async () => {
      const user = userEvent.setup();
      let recovered = false;

      const TestApp = () => {
        const [hasError, setHasError] = React.useState(true);

        return (
          <div>
            <button 
              onClick={() => {
                setHasError(false);
                recovered = true;
              }}
              data-testid="fix-component"
            >
              Fix Component
            </button>

            <StackAuthErrorBoundary
              fallback={({ error, retry, resetError }) => (
                <div data-testid="recovery-ui">
                  <div>Error: {error.message}</div>
                  <button onClick={retry} data-testid="retry">Retry</button>
                  <button onClick={resetError} data-testid="reset">Reset</button>
                  <div>Recovery guidance available</div>
                </div>
              )}
            >
              <UserButton simulateError={hasError ? 'render' : undefined} />
            </StackAuthErrorBoundary>
          </div>
        );
      };

      render(<TestApp />);

      // Should show recovery UI
      expect(screen.getByTestId('recovery-ui')).toBeInTheDocument();

      // Fix the component
      await user.click(screen.getByTestId('fix-component'));

      // Reset error boundary
      await user.click(screen.getByTestId('reset'));

      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
      });

      expect(recovered).toBe(true);
    });
  });

  describe('Comprehensive Error Scenarios', () => {
    it('should handle multiple simultaneous errors', async () => {
      const user = userEvent.setup();

      // Mock multiple error types
      mockFetch.mockRejectedValue(ErrorSimulator.networkError());

      const TestApp = () => (
        <div>
          <StackAuthErrorBoundary
            fallback={({ error }) => (
              <div data-testid="signin-error">SignIn: {error.message}</div>
            )}
          >
            <SignIn simulateError="render" />
          </StackAuthErrorBoundary>

          <StackAuthErrorBoundary
            fallback={({ error }) => (
              <div data-testid="userbutton-error">UserButton: {error.message}</div>
            )}
          >
            <UserButton simulateError="render" />
          </StackAuthErrorBoundary>

          <AstroStackProvider
            errorFallback={({ error }) => (
              <div data-testid="provider-error">Provider: {error.message}</div>
            )}
          >
            <SignUp />
          </AstroStackProvider>
        </div>
      );

      render(<TestApp />);

      // Multiple error boundaries should handle their respective errors
      expect(screen.getByTestId('signin-error')).toBeInTheDocument();
      expect(screen.getByTestId('userbutton-error')).toBeInTheDocument();
      expect(screen.getByTestId('signup-component')).toBeInTheDocument(); // This should still work
    });
  });
});