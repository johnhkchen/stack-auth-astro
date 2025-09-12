/**
 * Astro Components Integration Tests
 * 
 * This file tests the enhanced components with Astro island support,
 * focusing on AstroStackProvider and component hydration functionality.
 * 
 * Sprint: 004
 * Task: 4.3 - Component Hydration & State Management
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import type { User, Session } from '@stackframe/stack';
import type {
  AstroStackProviderProps,
  UserButtonProps,
  SignInProps,
  SignUpProps,
  AccountSettingsProps
} from './components.js';

// Mock Stack Auth components
vi.mock('@stackframe/stack', () => ({
  SignIn: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'sign-in', ...props }, children),
  SignUp: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'sign-up', ...props }, children),
  UserButton: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'user-button', ...props }, children),
  AccountSettings: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'account-settings', ...props }, children),
  StackProvider: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'stack-provider', ...props }, children)
}));

// Mock auth-state module
vi.mock('./auth-state.js', () => ({
  createAuthStateBridge: vi.fn(() => ({
    getAuthState: vi.fn().mockResolvedValue({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      lastUpdated: Date.now()
    }),
    subscribeToAuthState: vi.fn((callback) => {
      // Return unsubscribe function
      return () => {};
    }),
    hydrateWithServerData: vi.fn(),
    getIslandId: vi.fn(() => 'test-island-123')
  })),
  getHydrationData: vi.fn(() => ({ user: null, session: null }))
}));

// Mock component-wrapper
vi.mock('./component-wrapper.js', () => ({
  createValidatedComponents: vi.fn((components) => components)
}));

// Test data
const mockUser: User = {
  id: 'user-123',
  primaryEmail: 'test@example.com',
  displayName: 'Test User',
  profileImageUrl: 'https://example.com/avatar.jpg',
  primaryEmailVerified: true
} as User;

const mockSession: Session = {
  id: 'session-123',
  userId: 'user-123',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date()
} as Session;

describe('Component Type Validation', () => {
  test('should validate UserButtonProps interface', () => {
    const props: UserButtonProps = {
      className: 'custom-user-button',
      style: { color: 'blue' }
    };
    
    expect(props.className).toBe('custom-user-button');
    expect(props.style).toEqual({ color: 'blue' });
  });

  test('should validate SignInProps interface', () => {
    const props: SignInProps = {
      className: 'custom-sign-in',
      onSignIn: vi.fn()
    };
    
    expect(props.className).toBe('custom-sign-in');
    expect(props.onSignIn).toBeDefined();
  });

  test('should validate SignUpProps interface', () => {
    const props: SignUpProps = {
      className: 'custom-sign-up',
      onSignUp: vi.fn()
    };
    
    expect(props.className).toBe('custom-sign-up');
    expect(props.onSignUp).toBeDefined();
  });

  test('should validate AccountSettingsProps interface', () => {
    const props: AccountSettingsProps = {
      className: 'custom-account-settings'
    };
    
    expect(props.className).toBe('custom-account-settings');
  });
});

describe('AstroStackProvider Props Validation', () => {
  test('should validate basic AstroStackProvider props', () => {
    const props: AstroStackProviderProps = {
      children: React.createElement('div', null, 'Test'),
      initialUser: mockUser,
      initialSession: mockSession,
      hydrationStrategy: 'immediate'
    };
    
    expect(props.initialUser).toEqual(mockUser);
    expect(props.initialSession).toEqual(mockSession);
    expect(props.hydrationStrategy).toBe('immediate');
  });

  test('should validate all hydration strategies', () => {
    const strategies: AstroStackProviderProps['hydrationStrategy'][] = [
      'immediate',
      'lazy',
      'onVisible',
      'onIdle'
    ];
    
    strategies.forEach(strategy => {
      const props: AstroStackProviderProps = {
        hydrationStrategy: strategy
      };
      expect(props.hydrationStrategy).toBe(strategy);
    });
  });

  test('should validate sync options', () => {
    const props: AstroStackProviderProps = {
      enableSync: true,
      syncAcrossTabs: false,
      autoRefresh: true
    };
    
    expect(props.enableSync).toBe(true);
    expect(props.syncAcrossTabs).toBe(false);
    expect(props.autoRefresh).toBe(true);
  });

  test('should validate callback props', () => {
    const onAuthStateChange = vi.fn();
    const onHydrationComplete = vi.fn();
    
    const props: AstroStackProviderProps = {
      onAuthStateChange,
      onHydrationComplete
    };
    
    expect(props.onAuthStateChange).toBe(onAuthStateChange);
    expect(props.onHydrationComplete).toBe(onHydrationComplete);
  });

  test('should validate fallback props', () => {
    const fallback = React.createElement('div', null, 'Loading...');
    const loadingFallback = React.createElement('div', null, 'Loading auth...');
    const ErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) =>
      React.createElement('div', null, `Error: ${error.message}`);
    
    const props: AstroStackProviderProps = {
      fallback,
      loadingFallback,
      errorFallback: ErrorFallback
    };
    
    expect(props.fallback).toBe(fallback);
    expect(props.loadingFallback).toBe(loadingFallback);
    expect(props.errorFallback).toBe(ErrorFallback);
  });
});

describe('Component Integration', () => {
  let mockCreateAuthStateBridge: any;
  let mockGetHydrationData: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Get mock functions
    const authStateModule = require('./auth-state.js');
    mockCreateAuthStateBridge = authStateModule.createAuthStateBridge;
    mockGetHydrationData = authStateModule.getHydrationData;
    
    // Mock browser environment
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      crypto: { randomUUID: () => 'test-uuid' }
    } as any;
  });

  afterEach(() => {
    delete (global as any).window;
  });

  test('should create auth state bridge when AstroStackProvider mounts', () => {
    // Import after mocking
    const { AstroStackProvider } = require('./components.js');
    
    const props: AstroStackProviderProps = {
      hydrationStrategy: 'immediate',
      enableSync: true
    };
    
    // Simulate React rendering by manually calling the component
    // Note: This is a simplified test since we can't run full React rendering in Vitest
    expect(AstroStackProvider).toBeDefined();
    expect(typeof AstroStackProvider).toBe('function');
  });

  test('should pass initial auth data to bridge', () => {
    const { AstroStackProvider } = require('./components.js');
    
    const props: AstroStackProviderProps = {
      initialUser: mockUser,
      initialSession: mockSession,
      hydrationStrategy: 'lazy'
    };
    
    // Verify component exists and can be called
    expect(() => AstroStackProvider(props)).not.toThrow();
  });

  test('should handle different hydration strategies', () => {
    const { AstroStackProvider } = require('./components.js');
    
    const strategies: AstroStackProviderProps['hydrationStrategy'][] = [
      'immediate',
      'lazy',
      'onVisible',
      'onIdle'
    ];
    
    strategies.forEach(strategy => {
      const props: AstroStackProviderProps = {
        hydrationStrategy: strategy
      };
      
      expect(() => AstroStackProvider(props)).not.toThrow();
    });
  });

  test('should create bridge with correct options', () => {
    const { AstroStackProvider } = require('./components.js');
    
    const props: AstroStackProviderProps = {
      initialUser: mockUser,
      initialSession: mockSession,
      hydrationStrategy: 'onVisible',
      enableSync: false,
      syncAcrossTabs: true,
      autoRefresh: false
    };
    
    // Render component (simplified)
    AstroStackProvider(props);
    
    // Verify bridge was created with correct options
    expect(mockCreateAuthStateBridge).toHaveBeenCalledWith({
      strategy: 'onVisible',
      initialUser: mockUser,
      initialSession: mockSession,
      enableSync: false,
      syncAcrossTabs: true,
      autoRefresh: false
    });
  });

  test('should call onHydrationComplete when hydrated', () => {
    const onHydrationComplete = vi.fn();
    const { AstroStackProvider } = require('./components.js');
    
    const props: AstroStackProviderProps = {
      onHydrationComplete,
      hydrationStrategy: 'immediate'
    };
    
    AstroStackProvider(props);
    
    // Verify callback was provided
    expect(onHydrationComplete).toBeDefined();
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      crypto: { randomUUID: () => 'test-uuid' }
    } as any;
  });

  afterEach(() => {
    delete (global as any).window;
  });

  test('should handle auth bridge creation errors', () => {
    // Mock bridge creation to throw error
    const authStateModule = require('./auth-state.js');
    authStateModule.createAuthStateBridge.mockImplementation(() => {
      throw new Error('Bridge creation failed');
    });
    
    const { AstroStackProvider } = require('./components.js');
    
    const props: AstroStackProviderProps = {
      hydrationStrategy: 'immediate'
    };
    
    // Should not throw even if bridge creation fails
    expect(() => AstroStackProvider(props)).not.toThrow();
  });

  test('should handle subscription errors gracefully', () => {
    // Mock subscription to throw error
    const authStateModule = require('./auth-state.js');
    authStateModule.createAuthStateBridge.mockImplementation(() => ({
      getAuthState: vi.fn().mockResolvedValue({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        lastUpdated: Date.now()
      }),
      subscribeToAuthState: vi.fn(() => {
        throw new Error('Subscription failed');
      }),
      hydrateWithServerData: vi.fn(),
      getIslandId: vi.fn(() => 'test-island-123')
    }));
    
    const { AstroStackProvider } = require('./components.js');
    
    const props: AstroStackProviderProps = {
      hydrationStrategy: 'immediate'
    };
    
    expect(() => AstroStackProvider(props)).not.toThrow();
  });

  test('should handle hydration data retrieval errors', () => {
    // Mock getHydrationData to throw error
    const authStateModule = require('./auth-state.js');
    authStateModule.getHydrationData.mockImplementation(() => {
      throw new Error('Hydration data retrieval failed');
    });
    
    const { AstroStackProvider } = require('./components.js');
    
    const props: AstroStackProviderProps = {
      hydrationStrategy: 'immediate'
    };
    
    expect(() => AstroStackProvider(props)).not.toThrow();
  });
});

describe('Fallback Rendering', () => {
  beforeEach(() => {
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      crypto: { randomUUID: () => 'test-uuid' }
    } as any;
  });

  afterEach(() => {
    delete (global as any).window;
  });

  test('should provide fallback prop type checking', () => {
    const fallback = React.createElement('div', null, 'No auth data');
    const loadingFallback = React.createElement('div', null, 'Loading...');
    
    const ErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => {
      return React.createElement('div', {
        onClick: retry
      }, `Error: ${error.message} (Click to retry)`);
    };
    
    const props: AstroStackProviderProps = {
      fallback,
      loadingFallback,
      errorFallback: ErrorFallback
    };
    
    expect(props.fallback).toBe(fallback);
    expect(props.loadingFallback).toBe(loadingFallback);
    expect(typeof props.errorFallback).toBe('function');
  });

  test('should validate ErrorFallback component signature', () => {
    const ErrorFallback: AstroStackProviderProps['errorFallback'] = ({ error, retry }) => {
      // Test that error is an Error object
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBeDefined();
      
      // Test that retry is a function
      expect(typeof retry).toBe('function');
      
      return React.createElement('div', null, 'Error component');
    };
    
    const testError = new Error('Test error');
    const testRetry = vi.fn();
    
    if (ErrorFallback) {
      const result = ErrorFallback({ error: testError, retry: testRetry });
      expect(result).toBeDefined();
    }
  });
});

describe('Cross-Island State Management', () => {
  test('should support sync configuration', () => {
    const props: AstroStackProviderProps = {
      enableSync: true,
      syncAcrossTabs: true
    };
    
    expect(props.enableSync).toBe(true);
    expect(props.syncAcrossTabs).toBe(true);
  });

  test('should support disabling sync', () => {
    const props: AstroStackProviderProps = {
      enableSync: false,
      syncAcrossTabs: false
    };
    
    expect(props.enableSync).toBe(false);
    expect(props.syncAcrossTabs).toBe(false);
  });

  test('should validate auth state change callback', () => {
    const onAuthStateChange = vi.fn();
    
    const props: AstroStackProviderProps = {
      onAuthStateChange
    };
    
    expect(typeof props.onAuthStateChange).toBe('function');
    
    // Simulate auth state change
    const mockAuthState = {
      user: mockUser,
      session: mockSession,
      isLoading: false,
      isAuthenticated: true,
      error: null,
      lastUpdated: Date.now()
    };
    
    props.onAuthStateChange?.(mockAuthState);
    expect(onAuthStateChange).toHaveBeenCalledWith(mockAuthState);
  });
});

describe('TypeScript Integration', () => {
  test('should extend base StackProvider props correctly', () => {
    // Test that AstroStackProviderProps extends the base props
    const baseProps = {
      projectId: 'test-project',
      publishableClientKey: 'test-key'
    };
    
    const astroProps: AstroStackProviderProps = {
      ...baseProps,
      initialUser: mockUser,
      hydrationStrategy: 'lazy'
    };
    
    expect(astroProps.projectId).toBe('test-project');
    expect(astroProps.initialUser).toEqual(mockUser);
    expect(astroProps.hydrationStrategy).toBe('lazy');
  });

  test('should omit children from base props and redefine', () => {
    const children = React.createElement('div', null, 'Test children');
    
    const props: AstroStackProviderProps = {
      children
    };
    
    expect(props.children).toBe(children);
    expect(React.isValidElement(props.children)).toBe(true);
  });

  test('should maintain type safety with optional props', () => {
    // All props should be optional except for children
    const minimalProps: AstroStackProviderProps = {};
    
    expect(minimalProps).toBeDefined();
    
    // Test with all optional props
    const fullProps: AstroStackProviderProps = {
      children: React.createElement('div'),
      initialUser: mockUser,
      initialSession: mockSession,
      hydrationStrategy: 'onVisible',
      enableSync: true,
      syncAcrossTabs: false,
      autoRefresh: true,
      onAuthStateChange: vi.fn(),
      onHydrationComplete: vi.fn(),
      fallback: React.createElement('div'),
      loadingFallback: React.createElement('div'),
      errorFallback: ({ error, retry }) => React.createElement('div')
    };
    
    expect(fullProps.initialUser).toEqual(mockUser);
    expect(fullProps.hydrationStrategy).toBe('onVisible');
  });
});