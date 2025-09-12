/**
 * Auth State and Hydration Integration Tests
 * 
 * This file tests the authentication state bridge and hydration utilities
 * for Astro island architecture, ensuring proper component state management
 * and cross-island synchronization.
 * 
 * Sprint: 004
 * Task: 4.3 - Component Hydration & State Management
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type { User, Session } from '@stackframe/stack';
import {
  createAuthStateBridge,
  getServerAuthState,
  createHydrationScript,
  getHydrationData,
  hydrateAllIslands,
  type AuthState,
  type HydrationOptions
} from './auth-state.js';
import {
  extractAuthDataForHydration,
  createAuthHydrationScript,
  withAuthHydration,
  getClientHydrationData,
  waitForHydrationData,
  type HydrationConfig,
  type HydrationData
} from './hydration.js';

// Mock data for testing
const mockUser: User = {
  id: 'user-123',
  primaryEmail: 'test@example.com',
  displayName: 'Test User',
  profileImageUrl: 'https://example.com/avatar.jpg',
  primaryEmailVerified: true,
  clientMetadata: { theme: 'dark' }
} as User;

const mockSession: Session = {
  id: 'session-123',
  userId: 'user-123',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  createdAt: new Date()
} as Session;

const mockLocals = {
  user: mockUser,
  session: mockSession
};

// Mock browser environment
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  crypto: { randomUUID: () => 'test-uuid' },
  location: { href: 'https://example.com' },
  localStorage: new Map(),
  sessionStorage: new Map()
};

describe('Auth State Bridge', () => {
  beforeEach(() => {
    // Mock window object for browser environment
    global.window = mockWindow as any;
    
    // Reset any global state
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (global as any).window;
  });

  test('should create auth state bridge with default options', () => {
    const bridge = createAuthStateBridge();
    
    expect(bridge).toHaveProperty('getAuthState');
    expect(bridge).toHaveProperty('subscribeToAuthState');
    expect(bridge).toHaveProperty('hydrateWithServerData');
    expect(bridge).toHaveProperty('getIslandId');
    
    const islandId = bridge.getIslandId();
    expect(islandId).toMatch(/^island-[a-zA-Z0-9]+$/);
  });

  test('should create auth state bridge with custom options', () => {
    const options: HydrationOptions = {
      strategy: 'lazy',
      initialUser: mockUser,
      initialSession: mockSession,
      enableSync: false,
      autoRefresh: false
    };
    
    const bridge = createAuthStateBridge(options);
    expect(bridge.getIslandId()).toBeDefined();
  });

  test('should hydrate with server data', async () => {
    const bridge = createAuthStateBridge({
      strategy: 'immediate',
      enableSync: false
    });
    
    // Hydrate with server data
    bridge.hydrateWithServerData(mockUser, mockSession);
    
    // Get auth state should now return the hydrated data
    const authState = await bridge.getAuthState();
    expect(authState.user).toEqual(mockUser);
    expect(authState.session).toEqual(mockSession);
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.isLoading).toBe(false);
  });

  test('should subscribe to auth state changes', async () => {
    const bridge = createAuthStateBridge({
      strategy: 'immediate',
      enableSync: false
    });
    
    const stateChanges: AuthState[] = [];
    const unsubscribe = bridge.subscribeToAuthState((state) => {
      stateChanges.push(state);
    });
    
    // Hydrate with server data to trigger state change
    bridge.hydrateWithServerData(mockUser, mockSession);
    
    // Should have received at least one state update
    expect(stateChanges.length).toBeGreaterThan(0);
    
    const latestState = stateChanges[stateChanges.length - 1];
    expect(latestState.user).toEqual(mockUser);
    expect(latestState.session).toEqual(mockSession);
    
    // Clean up subscription
    unsubscribe();
  });

  test('should handle multiple subscribers', async () => {
    const bridge = createAuthStateBridge({
      strategy: 'immediate',
      enableSync: false
    });
    
    const subscriber1Changes: AuthState[] = [];
    const subscriber2Changes: AuthState[] = [];
    
    const unsubscribe1 = bridge.subscribeToAuthState((state) => {
      subscriber1Changes.push(state);
    });
    
    const unsubscribe2 = bridge.subscribeToAuthState((state) => {
      subscriber2Changes.push(state);
    });
    
    // Trigger state change
    bridge.hydrateWithServerData(mockUser, mockSession);
    
    // Both subscribers should receive the update
    expect(subscriber1Changes.length).toBeGreaterThan(0);
    expect(subscriber2Changes.length).toBeGreaterThan(0);
    
    unsubscribe1();
    unsubscribe2();
  });
});

describe('Server Auth State', () => {
  test('should extract server auth state from locals', () => {
    const serverAuth = getServerAuthState(mockLocals);
    
    expect(serverAuth.user).toEqual(mockUser);
    expect(serverAuth.session).toEqual(mockSession);
  });

  test('should handle missing auth data in locals', () => {
    const emptyLocals = {};
    const serverAuth = getServerAuthState(emptyLocals);
    
    expect(serverAuth.user).toBeNull();
    expect(serverAuth.session).toBeNull();
  });

  test('should handle partial auth data in locals', () => {
    const partialLocals = { user: mockUser };
    const serverAuth = getServerAuthState(partialLocals);
    
    expect(serverAuth.user).toEqual(mockUser);
    expect(serverAuth.session).toBeNull();
  });
});

describe('Hydration Script Generation', () => {
  test('should create basic hydration script', () => {
    const script = createHydrationScript(mockUser, mockSession);
    
    expect(script).toContain('<script>');
    expect(script).toContain('window.__ASTRO_STACK_AUTH__');
    expect(script).toContain(mockUser.id);
    expect(script).toContain(mockSession.id);
  });

  test('should handle null user and session', () => {
    const script = createHydrationScript(null, null);
    
    expect(script).toContain('<script>');
    expect(script).toContain('"user":null');
    expect(script).toContain('"session":null');
  });
});

describe('Enhanced Hydration Utilities', () => {
  test('should extract auth data for hydration with default config', () => {
    const hydrationData = extractAuthDataForHydration(mockLocals);
    
    expect(hydrationData.user).toEqual(expect.objectContaining({
      id: mockUser.id,
      primaryEmail: mockUser.primaryEmail,
      displayName: mockUser.displayName
    }));
    expect(hydrationData.session).toEqual(expect.objectContaining({
      id: mockSession.id,
      userId: mockSession.userId
    }));
    expect(hydrationData.timestamp).toBeDefined();
  });

  test('should exclude user data when configured', () => {
    const config: HydrationConfig = {
      includeUserData: false,
      includeSessionData: true
    };
    
    const hydrationData = extractAuthDataForHydration(mockLocals, config);
    
    expect(hydrationData.user).toBeNull();
    expect(hydrationData.session).toBeDefined();
  });

  test('should exclude session data when configured', () => {
    const config: HydrationConfig = {
      includeUserData: true,
      includeSessionData: false
    };
    
    const hydrationData = extractAuthDataForHydration(mockLocals, config);
    
    expect(hydrationData.user).toBeDefined();
    expect(hydrationData.session).toBeNull();
  });

  test('should create enhanced hydration script with custom config', () => {
    const config: HydrationConfig = {
      scriptId: 'custom-auth-hydration',
      strategy: 'defer'
    };
    
    const script = createAuthHydrationScript(mockLocals, config);
    
    expect(script).toContain('id="custom-auth-hydration"');
    expect(script).toContain('defer');
    expect(script).toContain('__ASTRO_STACK_AUTH_READY__');
  });

  test('should create inline script by default', () => {
    const script = createAuthHydrationScript(mockLocals);
    
    expect(script).toMatch(/<script[^>]*>[\s\S]*<\/script>/);
    expect(script).not.toContain('src=');
  });
});

describe('Client-side Hydration Data', () => {
  beforeEach(() => {
    // Setup window with mock hydration data
    global.window = {
      ...mockWindow,
      __ASTRO_STACK_AUTH__: {
        user: mockUser,
        session: mockSession,
        timestamp: Date.now()
      }
    } as any;
    
    // Mock document for meta tag fallback
    global.document = {
      querySelector: vi.fn().mockReturnValue(null)
    } as any;
  });

  afterEach(() => {
    delete (global as any).window;
    delete (global as any).document;
  });

  test('should get hydration data from window global', () => {
    const hydrationData = getClientHydrationData();
    
    expect(hydrationData).toBeDefined();
    expect(hydrationData?.user).toEqual(mockUser);
    expect(hydrationData?.session).toEqual(mockSession);
  });

  test('should return null when no hydration data available', () => {
    delete (global.window as any).__ASTRO_STACK_AUTH__;
    
    const hydrationData = getClientHydrationData();
    expect(hydrationData).toBeNull();
  });

  test('should fallback to meta tags when window global not available', () => {
    delete (global.window as any).__ASTRO_STACK_AUTH__;
    
    // Mock meta tag elements
    const userMeta = {
      getAttribute: vi.fn().mockReturnValue(encodeURIComponent(JSON.stringify(mockUser)))
    };
    const sessionMeta = {
      getAttribute: vi.fn().mockReturnValue(encodeURIComponent(JSON.stringify(mockSession)))
    };
    const timestampMeta = {
      getAttribute: vi.fn().mockReturnValue(Date.now().toString())
    };
    
    (global.document.querySelector as any)
      .mockReturnValueOnce(userMeta)
      .mockReturnValueOnce(sessionMeta)
      .mockReturnValueOnce(timestampMeta);
    
    const hydrationData = getClientHydrationData();
    
    expect(hydrationData).toBeDefined();
    expect(hydrationData?.user).toEqual(mockUser);
    expect(hydrationData?.session).toEqual(mockSession);
  });
});

describe('Wait for Hydration Data', () => {
  beforeEach(() => {
    global.window = {
      ...mockWindow,
      __ASTRO_STACK_AUTH__: null
    } as any;
    
    global.document = {
      querySelector: vi.fn().mockReturnValue(null)
    } as any;
  });

  afterEach(() => {
    delete (global as any).window;
    delete (global as any).document;
  });

  test('should resolve immediately when data is already available', async () => {
    (global.window as any).__ASTRO_STACK_AUTH__ = {
      user: mockUser,
      session: mockSession,
      timestamp: Date.now()
    };
    
    const hydrationData = await waitForHydrationData();
    
    expect(hydrationData).toBeDefined();
    expect(hydrationData?.user).toEqual(mockUser);
  });

  test('should timeout when data is not available', async () => {
    await expect(waitForHydrationData(100)).rejects.toThrow('Hydration data not ready within 100ms');
  });

  test('should resolve when ready event is dispatched', async () => {
    // Simulate event dispatch after a delay
    setTimeout(() => {
      const event = new CustomEvent('astro-stack-auth-ready', {
        detail: {
          user: mockUser,
          session: mockSession,
          timestamp: Date.now()
        }
      });
      
      // Find and call the event listener
      const addEventListenerCalls = (mockWindow.addEventListener as any).mock.calls;
      const readyEventListener = addEventListenerCalls.find(
        (call: any) => call[0] === 'astro-stack-auth-ready'
      );
      
      if (readyEventListener) {
        readyEventListener[1](event);
      }
    }, 50);
    
    const hydrationData = await waitForHydrationData(200);
    
    expect(hydrationData).toBeDefined();
    expect(hydrationData?.user).toEqual(mockUser);
  });
});

describe('withAuthHydration Helper', () => {
  const mockContext = {
    locals: mockLocals
  } as any;

  test('should create helper with all utilities', () => {
    const helper = withAuthHydration(mockContext);
    
    expect(helper).toHaveProperty('script');
    expect(helper).toHaveProperty('meta');
    expect(helper).toHaveProperty('data');
    expect(helper).toHaveProperty('isAuthenticated');
    expect(helper).toHaveProperty('getComponentProps');
    expect(helper).toHaveProperty('getProviderProps');
  });

  test('should detect authentication status correctly', () => {
    const helper = withAuthHydration(mockContext);
    expect(helper.isAuthenticated).toBe(true);
    
    const emptyContext = { locals: {} } as any;
    const emptyHelper = withAuthHydration(emptyContext);
    expect(emptyHelper.isAuthenticated).toBe(false);
  });

  test('should provide component props', () => {
    const helper = withAuthHydration(mockContext);
    const componentProps = helper.getComponentProps();
    
    expect(componentProps).toEqual({
      initialUser: mockUser,
      initialSession: mockSession,
      isAuthenticated: true
    });
  });

  test('should provide provider props with defaults', () => {
    const helper = withAuthHydration(mockContext);
    const providerProps = helper.getProviderProps();
    
    expect(providerProps).toEqual({
      initialUser: mockUser,
      initialSession: mockSession,
      hydrationStrategy: 'immediate',
      enableSync: true,
      syncAcrossTabs: true,
      autoRefresh: true
    });
  });

  test('should allow provider props overrides', () => {
    const helper = withAuthHydration(mockContext);
    const providerProps = helper.getProviderProps({ strategy: 'lazy' });
    
    expect(providerProps.hydrationStrategy).toBe('lazy');
  });
});

describe('Error Handling', () => {
  test('should handle auth bridge creation errors gracefully', () => {
    // Simulate environment without proper setup
    const originalWindow = global.window;
    delete (global as any).window;
    
    expect(() => {
      createAuthStateBridge();
    }).not.toThrow();
    
    global.window = originalWindow;
  });

  test('should handle malformed hydration data', () => {
    global.window = {
      ...mockWindow,
      __ASTRO_STACK_AUTH__: 'invalid json'
    } as any;
    
    global.document = {
      querySelector: vi.fn().mockReturnValue({
        getAttribute: vi.fn().mockReturnValue('invalid%json')
      })
    } as any;
    
    const hydrationData = getClientHydrationData();
    expect(hydrationData).toBeNull();
    
    delete (global as any).window;
    delete (global as any).document;
  });

  test('should handle subscription errors gracefully', async () => {
    const bridge = createAuthStateBridge({
      strategy: 'immediate',
      enableSync: false
    });
    
    // Subscriber that throws an error
    const erroringSubscriber = vi.fn().mockImplementation(() => {
      throw new Error('Subscriber error');
    });
    
    const unsubscribe = bridge.subscribeToAuthState(erroringSubscriber);
    
    // This should not throw despite the erroring subscriber
    expect(() => {
      bridge.hydrateWithServerData(mockUser, mockSession);
    }).not.toThrow();
    
    expect(erroringSubscriber).toHaveBeenCalled();
    
    unsubscribe();
  });
});

describe('TypeScript Type Validation', () => {
  test('should validate HydrationOptions interface', () => {
    const options: HydrationOptions = {
      strategy: 'immediate',
      initialUser: mockUser,
      initialSession: mockSession,
      enableSync: true,
      syncAcrossTabs: true,
      autoRefresh: true
    };
    
    expect(options.strategy).toBe('immediate');
    expect(options.initialUser).toEqual(mockUser);
    expect(options.initialSession).toEqual(mockSession);
  });

  test('should validate AuthState interface', () => {
    const authState: AuthState = {
      user: mockUser,
      session: mockSession,
      isLoading: false,
      isAuthenticated: true,
      error: null,
      lastUpdated: Date.now()
    };
    
    expect(authState.user).toEqual(mockUser);
    expect(authState.session).toEqual(mockSession);
    expect(authState.isAuthenticated).toBe(true);
  });

  test('should validate HydrationData interface', () => {
    const hydrationData: HydrationData = {
      user: mockUser,
      session: mockSession,
      timestamp: Date.now(),
      islandId: 'test-island'
    };
    
    expect(hydrationData.user).toEqual(mockUser);
    expect(hydrationData.session).toEqual(mockSession);
    expect(hydrationData.islandId).toBe('test-island');
  });
});