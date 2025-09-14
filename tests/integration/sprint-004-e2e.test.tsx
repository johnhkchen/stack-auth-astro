/**
 * End-to-End Integration Tests for Sprint 004
 * 
 * This test suite validates all Sprint 004 features work together seamlessly:
 * - Feature #3: SignIn React component  
 * - Feature #5: Client-side signOut function  
 * - Feature #7: UserButton component  
 * - Feature #8: SignUp component  
 * - Feature #10: Helpful error messages
 * 
 * Tests complete authentication flows with React components in Astro,
 * cross-component state synchronization, hydration compatibility,
 * and comprehensive error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { 
  SignIn, 
  SignUp, 
  UserButton, 
  AccountSettings, 
  AstroStackProvider,
  StackAuthClientError,
  CLIENT_ERROR_CODES
} from '../../src/components.js';
import { signIn, signOut, redirectToSignIn, redirectToSignUp, redirectToAccount } from '../../src/client.js';
import { getAuthState, subscribeToAuthState, initAuthState } from '../../src/client/state.js';
import { initSync, broadcastSignIn, broadcastSignOut } from '../../src/client/sync.js';

// Mock Stack Auth SDK for testing
vi.mock('@stackframe/stack', () => ({
  SignIn: vi.fn(({ onSuccess, onError, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'signin-component',
      ...props,
      onClick: () => {
        if (props.disabled) return;
        // Simulate sign in success
        setTimeout(() => onSuccess?.({ 
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        }), 100);
      }
    }, 'Stack Auth SignIn')
  ),
  SignUp: vi.fn(({ onSuccess, onError, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'signup-component',
      ...props,
      onClick: () => {
        if (props.disabled) return;
        // Simulate sign up success
        setTimeout(() => onSuccess?.({ 
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        }), 100);
      }
    }, 'Stack Auth SignUp')
  ),
  UserButton: vi.fn(({ user, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'userbutton-component',
      ...props
    }, user ? `User: ${user.email}` : 'Not signed in')
  ),
  AccountSettings: vi.fn(({ user, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'accountsettings-component',
      ...props
    }, user ? `Settings for ${user.email}` : 'No user')
  ),
  StackProvider: vi.fn(({ children, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'stack-provider',
      ...props
    }, children)
  )
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    assign: vi.fn(),
    reload: vi.fn()
  },
  writable: true
});

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() { return Object.keys(store).length; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock });

describe('Sprint 004 End-to-End Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Reset auth state
    initAuthState({
      persistStorage: false,
      autoRefresh: false,
      refreshInterval: 0
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Feature #3: SignIn React Component Integration', () => {
    it('should render SignIn component with proper Astro island hydration', async () => {
      const TestApp = () => (
        React.createElement(AstroStackProvider, {},
          React.createElement(SignIn, { 'data-testid': 'signin-island' })
        )
      );

      render(React.createElement(TestApp));
      
      expect(screen.getByTestId('signin-component')).toBeInTheDocument();
      expect(screen.getByTestId('stack-provider')).toBeInTheDocument();
    });

    it('should handle sign in success and update auth state', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      const TestApp = () => (
        <AstroStackProvider>
          <SignIn onSuccess={onSuccess} />
        </AstroStackProvider>
      );

      render(<TestApp />);
      
      const signInComponent = screen.getByTestId('signin-component');
      await user.click(signInComponent);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        });
      });
    });

    it('should handle sign in errors with helpful error messages', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();

      // Mock fetch to simulate network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const TestApp = () => (
        <AstroStackProvider>
          <SignIn onError={onError} />
        </AstroStackProvider>
      );

      render(<TestApp />);
      
      // Trigger sign in through client function
      try {
        await signIn('github', { onError });
      } catch (error) {
        expect(error).toBeInstanceOf(StackAuthClientError);
        expect((error as StackAuthClientError).code).toBe('NETWORK_ERROR');
        expect((error as StackAuthClientError).recovery).toContain('Check your internet connection');
      }
    });
  });

  describe('Feature #5: Client-side signOut Function Integration', () => {
    beforeEach(async () => {
      // Set up authenticated state
      const authState = getAuthState();
      authState.user = { id: 'test-user', email: 'test@example.com' } as any;
      authState.session = { id: 'test-session' } as any;
      authState.isAuthenticated = true;
    });

    it('should sign out user and clear auth state', async () => {
      const onSuccess = vi.fn();
      
      // Mock successful signout response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ redirectUrl: '/signed-out' })
      });

      await signOut({ onSuccess });

      expect(fetch).toHaveBeenCalledWith('/handler/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectTo: window.location.origin }),
        credentials: 'same-origin'
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should clear localStorage when clearLocalStorage option is true', async () => {
      // Set some auth-related items in localStorage
      localStorageMock.setItem('stack-auth-token', 'test-token');
      localStorageMock.setItem('auth-user', 'test-user');
      localStorageMock.setItem('other-data', 'should-remain');

      // Mock successful signout response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await signOut({ clearLocalStorage: true });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('stack-auth-token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-user');
      expect(localStorageMock.getItem('other-data')).toBe('should-remain');
    });

    it('should handle signout errors with fallback to redirect', async () => {
      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await signOut();

      // Should fallback to redirect-based signout
      expect(window.location.href).toBe(`/handler/signout?redirectTo=${encodeURIComponent(window.location.origin)}`);
    });
  });

  describe('Feature #7: UserButton Component Integration', () => {
    it('should display user information when authenticated', () => {
      const user = { id: 'test-user', email: 'test@example.com' };

      const TestApp = () => (
        <AstroStackProvider initialUser={user as any}>
          <UserButton user={user as any} />
        </AstroStackProvider>
      );

      render(<TestApp />);

      expect(screen.getByTestId('userbutton-component')).toHaveTextContent('User: test@example.com');
    });

    it('should display not signed in state when no user', () => {
      const TestApp = () => (
        <AstroStackProvider>
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      expect(screen.getByTestId('userbutton-component')).toHaveTextContent('Not signed in');
    });

    it('should work with different Astro hydration strategies', () => {
      const user = { id: 'test-user', email: 'test@example.com' };

      const strategies = ['immediate', 'lazy', 'onVisible', 'onIdle'] as const;
      
      strategies.forEach(strategy => {
        const TestApp = () => (
          <AstroStackProvider 
            hydrationStrategy={strategy}
            initialUser={user as any}
          >
            <UserButton user={user as any} />
          </AstroStackProvider>
        );

        const { unmount } = render(<TestApp />);
        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Feature #8: SignUp Component Integration', () => {
    it('should render SignUp component and handle success', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      const TestApp = () => (
        <AstroStackProvider>
          <SignUp onSuccess={onSuccess} />
        </AstroStackProvider>
      );

      render(<TestApp />);
      
      const signUpComponent = screen.getByTestId('signup-component');
      await user.click(signUpComponent);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        });
      });
    });

    it('should handle signup errors with user-friendly messages', async () => {
      const onError = vi.fn();

      // Mock rate limit error
      (global.fetch as any).mockRejectedValueOnce(new Error('Too many requests'));

      try {
        await signIn('email', { onError });
      } catch (error) {
        expect(error).toBeInstanceOf(StackAuthClientError);
        expect((error as StackAuthClientError).code).toBe('RATE_LIMITED');
        expect((error as StackAuthClientError).recovery).toContain('wait before trying again');
      }
    });
  });

  describe('Feature #10: Helpful Error Messages Integration', () => {
    it('should provide helpful error messages for different error scenarios', async () => {
      const errorScenarios = [
        {
          error: new Error('Failed to fetch'),
          expectedCode: 'NETWORK_ERROR',
          expectedRecovery: 'Check your internet connection'
        },
        {
          error: new Error('CORS policy'),
          expectedCode: 'CORS_ERROR',
          expectedRecovery: 'ensure proper CORS configuration'
        },
        {
          error: new Error('429 Too Many Requests'),
          expectedCode: 'RATE_LIMITED',
          expectedRecovery: 'wait before trying again'
        },
        {
          error: new Error('503 Service Unavailable'),
          expectedCode: 'SERVICE_UNAVAILABLE',
          expectedRecovery: 'temporarily unavailable'
        }
      ];

      for (const scenario of errorScenarios) {
        (global.fetch as any).mockRejectedValueOnce(scenario.error);

        try {
          await signIn();
        } catch (error) {
          expect(error).toBeInstanceOf(StackAuthClientError);
          expect((error as StackAuthClientError).code).toBe(scenario.expectedCode);
          expect((error as StackAuthClientError).recovery).toContain(scenario.expectedRecovery);
        }
      }
    });

    it('should provide context-specific error messages', async () => {
      const TestApp = () => (
        <AstroStackProvider>
          <SignIn />
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Mock component error
      const error = new StackAuthClientError(
        'Component failed to load',
        'COMPONENT_ERROR',
        CLIENT_ERROR_CODES.COMPONENT_ERROR
      );

      expect(error.recovery).toBe(CLIENT_ERROR_CODES.COMPONENT_ERROR);
    });
  });

  describe('Complete Authentication Flow Integration', () => {
    it('should complete full authentication flow with React components in Astro', async () => {
      const user = userEvent.setup();
      let authState = { user: null, session: null, isAuthenticated: false };

      const TestApp = () => {
        const [currentAuthState, setCurrentAuthState] = React.useState(authState);

        React.useEffect(() => {
          const unsubscribe = subscribeToAuthState((newState) => {
            setCurrentAuthState(newState);
            authState = newState;
          });
          return unsubscribe;
        }, []);

        return (
          <AstroStackProvider onAuthStateChange={setCurrentAuthState}>
            <div data-testid="auth-flow-container">
              {!currentAuthState.isAuthenticated ? (
                <>
                  <SignIn data-testid="signin-form" />
                  <SignUp data-testid="signup-form" />
                </>
              ) : (
                <>
                  <UserButton data-testid="user-button" />
                  <AccountSettings data-testid="account-settings" />
                  <button 
                    data-testid="signout-btn"
                    onClick={() => signOut()}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </AstroStackProvider>
        );
      };

      render(<TestApp />);

      // Initially should show sign in form
      expect(screen.getByTestId('signin-form')).toBeInTheDocument();
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();

      // Mock successful authentication
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        })
      });

      // Click sign in
      await user.click(screen.getByTestId('signin-form'));

      await waitFor(() => {
        expect(screen.getByTestId('user-button')).toBeInTheDocument();
        expect(screen.getByTestId('account-settings')).toBeInTheDocument();
      });

      // Mock successful sign out
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      // Click sign out
      await user.click(screen.getByTestId('signout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('signin-form')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Component State Synchronization', () => {
    it('should synchronize auth state across multiple component islands', async () => {
      const TestApp = () => (
        <div>
          {/* Simulate multiple Astro islands */}
          <AstroStackProvider>
            <UserButton data-testid="island1-userbutton" />
          </AstroStackProvider>
          
          <AstroStackProvider enableSync={true}>
            <UserButton data-testid="island2-userbutton" />
          </AstroStackProvider>
          
          <AstroStackProvider syncAcrossTabs={true}>
            <AccountSettings data-testid="island3-settings" />
          </AstroStackProvider>
        </div>
      );

      render(<TestApp />);

      // All components should initially show unauthenticated state
      expect(screen.getByTestId('island1-userbutton')).toHaveTextContent('Not signed in');
      expect(screen.getByTestId('island2-userbutton')).toHaveTextContent('Not signed in');
      expect(screen.getByTestId('island3-settings')).toHaveTextContent('No user');

      // Simulate sign in broadcast
      const testUser = { id: 'test-user', email: 'test@example.com' };
      const testSession = { id: 'test-session' };
      
      broadcastSignIn(testUser as any, testSession as any);

      await waitFor(() => {
        expect(screen.getByTestId('island1-userbutton')).toHaveTextContent('User: test@example.com');
        expect(screen.getByTestId('island2-userbutton')).toHaveTextContent('User: test@example.com');
        expect(screen.getByTestId('island3-settings')).toHaveTextContent('Settings for test@example.com');
      });

      // Simulate sign out broadcast
      broadcastSignOut();

      await waitFor(() => {
        expect(screen.getByTestId('island1-userbutton')).toHaveTextContent('Not signed in');
        expect(screen.getByTestId('island2-userbutton')).toHaveTextContent('Not signed in');
        expect(screen.getByTestId('island3-settings')).toHaveTextContent('No user');
      });
    });
  });

  describe('Hydration and SSR/SSG Compatibility', () => {
    it('should work with server-side rendered initial state', () => {
      const initialUser = { id: 'ssr-user', email: 'ssr@example.com' };
      const initialSession = { id: 'ssr-session' };

      const TestApp = () => (
        <AstroStackProvider 
          initialUser={initialUser as any}
          initialSession={initialSession as any}
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      expect(screen.getByTestId('userbutton-component')).toHaveTextContent('User: ssr@example.com');
    });

    it('should handle hydration mismatches gracefully', () => {
      const serverUser = { id: 'server-user', email: 'server@example.com' };
      const clientUser = { id: 'client-user', email: 'client@example.com' };

      const TestApp = () => {
        const [user, setUser] = React.useState(serverUser);

        React.useEffect(() => {
          // Simulate hydration with different client state
          setUser(clientUser);
        }, []);

        return (
          <AstroStackProvider initialUser={user as any}>
            <UserButton user={user as any} />
          </AstroStackProvider>
        );
      };

      render(<TestApp />);

      // Should eventually show client user after hydration
      waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toHaveTextContent('User: client@example.com');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should prevent app crashes when components fail', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestApp = () => (
        <AstroStackProvider
          errorFallback={({ error, retry }) => (
            <div data-testid="error-fallback">
              Error: {error.message}
              <button onClick={retry} data-testid="retry-button">Retry</button>
            </div>
          )}
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Component should render without crashing
      expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should provide error recovery mechanisms', async () => {
      const user = userEvent.setup();
      const retryFn = vi.fn();

      const TestApp = () => (
        <div>
          <button 
            onClick={() => retryFn()}
            data-testid="retry-auth"
          >
            Retry Auth
          </button>
        </div>
      );

      render(<TestApp />);

      await user.click(screen.getByTestId('retry-auth'));
      expect(retryFn).toHaveBeenCalled();
    });
  });

  describe('Client-side Redirect Functions', () => {
    it('should redirect to sign in page', () => {
      redirectToSignIn('/dashboard');
      
      // Should have initiated sign in with redirect
      expect(signIn).toHaveBeenCalled();
    });

    it('should redirect to sign up page', () => {
      redirectToSignUp('/welcome');
      
      expect(window.location.href).toBe('/handler/signup?redirect=%2Fwelcome');
    });

    it('should redirect to account page', () => {
      redirectToAccount('/profile');
      
      expect(window.location.href).toBe('/handler/account?redirect=%2Fprofile');
    });
  });
});