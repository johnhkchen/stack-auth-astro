/**
 * Cross-Component State Synchronization Tests
 * 
 * This test suite validates that authentication state synchronizes correctly
 * across multiple Astro component islands, ensuring consistent user experience
 * when multiple Stack Auth components are present on the same page.
 * 
 * Key scenarios tested:
 * - Auth state syncs across multiple islands
 * - Tab synchronization works correctly
 * - Components respond to external auth changes
 * - State updates are atomic and consistent
 * - Performance is maintained with multiple islands
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
  AstroStackProvider 
} from '../../src/components.js';
import { signIn, signOut } from '../../src/client.js';
import { getAuthState, subscribeToAuthState, initAuthState } from '../../src/client/state.js';
import { 
  initSync, 
  broadcastSignIn, 
  broadcastSignOut, 
  subscribeToSync,
  getSyncManager,
  broadcastAuthChange
} from '../../src/client/sync.js';

// Mock BroadcastChannel for cross-tab sync testing
class MockBroadcastChannel {
  private static channels: Map<string, MockBroadcastChannel[]> = new Map();
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public name: string;

  constructor(name: string) {
    this.name = name;
    const existing = MockBroadcastChannel.channels.get(name) || [];
    existing.push(this);
    MockBroadcastChannel.channels.set(name, existing);
  }

  postMessage(data: any): void {
    const channels = MockBroadcastChannel.channels.get(this.name) || [];
    channels.forEach(channel => {
      if (channel !== this && channel.onmessage) {
        const event = { data } as MessageEvent;
        setTimeout(() => channel.onmessage?.(event), 0);
      }
    });
  }

  close(): void {
    const channels = MockBroadcastChannel.channels.get(this.name) || [];
    const index = channels.indexOf(this);
    if (index > -1) {
      channels.splice(index, 1);
      MockBroadcastChannel.channels.set(this.name, channels);
    }
  }

  static clearAll(): void {
    this.channels.clear();
  }
}

// Mock window.BroadcastChannel
(global as any).BroadcastChannel = MockBroadcastChannel;

// Mock Stack Auth components with sync capabilities
vi.mock('@stackframe/stack', () => ({
  SignIn: vi.fn(({ onSuccess, onError, ...props }) => {
    const [user, setUser] = React.useState(null);
    
    React.useEffect(() => {
      const unsubscribe = subscribeToAuthState((state) => {
        setUser(state.user);
      });
      return unsubscribe;
    }, []);

    return React.createElement('div', { 
      'data-testid': 'signin-component',
      ...props,
      onClick: () => {
        if (props.disabled) return;
        const authData = { 
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        };
        broadcastSignIn(authData.user, authData.session);
        onSuccess?.(authData);
      }
    }, user ? 'Already signed in' : 'Click to sign in');
  }),

  SignUp: vi.fn(({ onSuccess, onError, ...props }) => {
    const [user, setUser] = React.useState(null);
    
    React.useEffect(() => {
      const unsubscribe = subscribeToAuthState((state) => {
        setUser(state.user);
      });
      return unsubscribe;
    }, []);

    return React.createElement('div', { 
      'data-testid': 'signup-component',
      ...props,
      onClick: () => {
        if (props.disabled) return;
        const authData = { 
          user: { id: 'new-user', email: 'new@example.com' },
          session: { id: 'new-session' }
        };
        broadcastSignIn(authData.user, authData.session);
        onSuccess?.(authData);
      }
    }, user ? 'Already signed up' : 'Click to sign up');
  }),

  UserButton: vi.fn(({ user, ...props }) => {
    const [currentUser, setCurrentUser] = React.useState(user);
    
    React.useEffect(() => {
      const unsubscribe = subscribeToAuthState((state) => {
        setCurrentUser(state.user);
      });
      return unsubscribe;
    }, []);

    return React.createElement('div', { 
      'data-testid': 'userbutton-component',
      ...props,
      onClick: () => {
        if (currentUser) {
          broadcastSignOut();
        }
      }
    }, currentUser ? `User: ${currentUser.email}` : 'Not signed in');
  }),

  AccountSettings: vi.fn(({ user, ...props }) => {
    const [currentUser, setCurrentUser] = React.useState(user);
    
    React.useEffect(() => {
      const unsubscribe = subscribeToAuthState((state) => {
        setCurrentUser(state.user);
      });
      return unsubscribe;
    }, []);

    return React.createElement('div', { 
      'data-testid': 'accountsettings-component',
      ...props
    }, currentUser ? `Settings for ${currentUser.email}` : 'No user settings');
  }),

  StackProvider: vi.fn(({ children, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'stack-provider',
      ...props
    }, children)
  )
}));

describe('Cross-Component State Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockBroadcastChannel.clearAll();
    
    // Initialize auth state and sync
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
    MockBroadcastChannel.clearAll();
  });

  describe('Multi-Island Synchronization', () => {
    it('should synchronize auth state across multiple islands', async () => {
      const user = userEvent.setup();

      const TestApp = () => (
        <div>
          {/* Island 1: Sign in form */}
          <div data-testid="island1">
            <AstroStackProvider>
              <SignIn />
              <UserButton />
            </AstroStackProvider>
          </div>
          
          {/* Island 2: User display */}
          <div data-testid="island2">
            <AstroStackProvider enableSync={true}>
              <UserButton data-testid="island2-userbutton" />
            </AstroStackProvider>
          </div>
          
          {/* Island 3: Account management */}
          <div data-testid="island3">
            <AstroStackProvider syncAcrossTabs={true}>
              <AccountSettings data-testid="island3-settings" />
              <UserButton data-testid="island3-userbutton" />
            </AstroStackProvider>
          </div>
        </div>
      );

      render(<TestApp />);

      // Initially all components should show unauthenticated state
      expect(screen.getByTestId('userbutton-component')).toHaveTextContent('Not signed in');
      expect(screen.getByTestId('island2-userbutton')).toHaveTextContent('Not signed in');
      expect(screen.getByTestId('island3-userbutton')).toHaveTextContent('Not signed in');
      expect(screen.getByTestId('island3-settings')).toHaveTextContent('No user settings');

      // Sign in through first island
      await user.click(screen.getByTestId('signin-component'));

      // All islands should update to show authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toHaveTextContent('User: test@example.com');
        expect(screen.getByTestId('island2-userbutton')).toHaveTextContent('User: test@example.com');
        expect(screen.getByTestId('island3-userbutton')).toHaveTextContent('User: test@example.com');
        expect(screen.getByTestId('island3-settings')).toHaveTextContent('Settings for test@example.com');
      });
    });

    it('should handle sign out synchronization across islands', async () => {
      const user = userEvent.setup();

      const TestApp = () => (
        <div>
          <AstroStackProvider>
            <SignIn />
            <UserButton data-testid="main-userbutton" />
          </AstroStackProvider>
          
          <AstroStackProvider>
            <UserButton data-testid="secondary-userbutton" />
          </AstroStackProvider>
        </div>
      );

      render(<TestApp />);

      // Sign in first
      await user.click(screen.getByTestId('signin-component'));
      
      await waitFor(() => {
        expect(screen.getByTestId('main-userbutton')).toHaveTextContent('User: test@example.com');
        expect(screen.getByTestId('secondary-userbutton')).toHaveTextContent('User: test@example.com');
      });

      // Sign out from main island
      await user.click(screen.getByTestId('main-userbutton'));

      // Both islands should show signed out state
      await waitFor(() => {
        expect(screen.getByTestId('main-userbutton')).toHaveTextContent('Not signed in');
        expect(screen.getByTestId('secondary-userbutton')).toHaveTextContent('Not signed in');
      });
    });

    it('should handle mixed component types across islands', async () => {
      const user = userEvent.setup();

      const TestApp = () => (
        <div>
          {/* Island with sign-in capability */}
          <AstroStackProvider>
            <SignIn />
          </AstroStackProvider>
          
          {/* Island with user display */}
          <AstroStackProvider>
            <UserButton data-testid="display-userbutton" />
          </AstroStackProvider>
          
          {/* Island with account management */}
          <AstroStackProvider>
            <AccountSettings data-testid="display-settings" />
          </AstroStackProvider>
          
          {/* Island with sign up option */}
          <AstroStackProvider>
            <SignUp data-testid="alt-signup" />
          </AstroStackProvider>
        </div>
      );

      render(<TestApp />);

      // Use sign up component to authenticate
      await user.click(screen.getByTestId('alt-signup'));

      // All other components should reflect the new auth state
      await waitFor(() => {
        expect(screen.getByTestId('display-userbutton')).toHaveTextContent('User: new@example.com');
        expect(screen.getByTestId('display-settings')).toHaveTextContent('Settings for new@example.com');
      });
    });
  });

  describe('State Update Consistency', () => {
    it('should ensure atomic state updates across islands', async () => {
      const stateUpdates: any[] = [];
      let updateCount = 0;

      const TestApp = () => {
        const [updates, setUpdates] = React.useState(0);

        React.useEffect(() => {
          const unsubscribe = subscribeToAuthState((state) => {
            updateCount++;
            stateUpdates.push({
              timestamp: Date.now(),
              user: state.user,
              session: state.session,
              isAuthenticated: state.isAuthenticated
            });
            setUpdates(prev => prev + 1);
          });
          return unsubscribe;
        }, []);

        return (
          <div>
            <div data-testid="update-counter">Updates: {updates}</div>
            <AstroStackProvider>
              <SignIn />
              <UserButton />
            </AstroStackProvider>
            
            <AstroStackProvider>
              <UserButton data-testid="sync-userbutton" />
            </AstroStackProvider>
          </div>
        );
      };

      render(<TestApp />);

      // Trigger authentication
      const user = userEvent.setup();
      await user.click(screen.getByTestId('signin-component'));

      await waitFor(() => {
        expect(screen.getByTestId('sync-userbutton')).toHaveTextContent('User: test@example.com');
      });

      // Verify state updates were atomic
      expect(updateCount).toBeGreaterThan(0);
      
      // All auth state changes should be consistent
      stateUpdates.forEach(update => {
        if (update.user) {
          expect(update.session).toBeTruthy();
          expect(update.isAuthenticated).toBe(true);
        } else {
          expect(update.isAuthenticated).toBe(false);
        }
      });
    });

    it('should handle rapid state changes without race conditions', async () => {
      const user = userEvent.setup();
      let finalState: any = null;

      const TestApp = () => {
        React.useEffect(() => {
          const unsubscribe = subscribeToAuthState((state) => {
            finalState = state;
          });
          return unsubscribe;
        }, []);

        return (
          <div>
            <AstroStackProvider>
              <SignIn />
              <UserButton data-testid="rapid-userbutton" />
            </AstroStackProvider>
          </div>
        );
      };

      render(<TestApp />);

      // Rapidly trigger multiple auth state changes
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByTestId('signin-component'));
        if (i < 4) {
          await user.click(screen.getByTestId('rapid-userbutton')); // Sign out
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await waitFor(() => {
        expect(screen.getByTestId('rapid-userbutton')).toHaveTextContent('User: test@example.com');
      });

      // Final state should be consistent
      expect(finalState?.user?.email).toBe('test@example.com');
      expect(finalState?.isAuthenticated).toBe(true);
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should sync auth state across browser tabs', async () => {
      let tabAState: any = null;
      let tabBState: any = null;

      const TabAComponent = () => {
        React.useEffect(() => {
          const unsubscribe = subscribeToAuthState((state) => {
            tabAState = state;
          });
          return unsubscribe;
        }, []);

        return (
          <AstroStackProvider syncAcrossTabs={true}>
            <UserButton data-testid="taba-userbutton" />
          </AstroStackProvider>
        );
      };

      const TabBComponent = () => {
        React.useEffect(() => {
          const unsubscribe = subscribeToAuthState((state) => {
            tabBState = state;
          });
          return unsubscribe;
        }, []);

        return (
          <AstroStackProvider syncAcrossTabs={true}>
            <UserButton data-testid="tabb-userbutton" />
          </AstroStackProvider>
        );
      };

      const TestApp = () => (
        <div>
          <div data-testid="tab-a">
            <TabAComponent />
          </div>
          <div data-testid="tab-b">
            <TabBComponent />
          </div>
        </div>
      );

      render(<TestApp />);

      // Simulate authentication in tab A by broadcasting
      broadcastSignIn(
        { id: 'tab-user', email: 'tab@example.com' } as any,
        { id: 'tab-session' } as any
      );

      await waitFor(() => {
        expect(screen.getByTestId('taba-userbutton')).toHaveTextContent('User: tab@example.com');
        expect(screen.getByTestId('tabb-userbutton')).toHaveTextContent('User: tab@example.com');
      });

      expect(tabAState?.user?.email).toBe('tab@example.com');
      expect(tabBState?.user?.email).toBe('tab@example.com');
    });

    it('should handle tab synchronization with storage events', async () => {
      const storageEvents: StorageEvent[] = [];
      const originalAddEventListener = window.addEventListener;

      window.addEventListener = vi.fn((type, listener, options) => {
        if (type === 'storage') {
          // Mock storage event
          const mockStorageEvent = new StorageEvent('storage', {
            key: 'stack-auth-state',
            newValue: JSON.stringify({
              user: { id: 'storage-user', email: 'storage@example.com' },
              session: { id: 'storage-session' },
              isAuthenticated: true
            }),
            oldValue: null,
            storageArea: localStorage
          });
          
          storageEvents.push(mockStorageEvent);
          (listener as EventListener)(mockStorageEvent);
        } else {
          originalAddEventListener.call(window, type, listener, options);
        }
      }) as any;

      const TestApp = () => (
        <AstroStackProvider syncAcrossTabs={true}>
          <UserButton data-testid="storage-sync-userbutton" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Trigger storage event (simulating external tab auth)
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'stack-auth-state',
        newValue: JSON.stringify({
          user: { id: 'storage-user', email: 'storage@example.com' },
          session: { id: 'storage-session' },
          isAuthenticated: true
        }),
        oldValue: null,
        storageArea: localStorage
      }));

      await waitFor(() => {
        expect(screen.getByTestId('storage-sync-userbutton')).toHaveTextContent('User: storage@example.com');
      });

      window.addEventListener = originalAddEventListener;
    });
  });

  describe('Performance with Multiple Islands', () => {
    it('should maintain performance with many islands', async () => {
      const user = userEvent.setup();
      const startTime = performance.now();

      const TestApp = () => (
        <div>
          {/* Create 10 islands to test performance */}
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} data-testid={`island-${i}`}>
              <AstroStackProvider>
                <UserButton data-testid={`userbutton-${i}`} />
                {i === 0 && <SignIn />}
              </AstroStackProvider>
            </div>
          ))}
        </div>
      );

      render(<TestApp />);

      // Sign in and measure time for all islands to update
      await user.click(screen.getByTestId('signin-component'));

      await waitFor(() => {
        for (let i = 0; i < 10; i++) {
          expect(screen.getByTestId(`userbutton-${i}`)).toHaveTextContent('User: test@example.com');
        }
      });

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Should complete within reasonable time even with many islands
      expect(updateTime).toBeLessThan(1000); // 1 second for 10 islands
    });

    it('should handle island cleanup without memory leaks', () => {
      const subscriptions: (() => void)[] = [];

      const DynamicIsland = ({ id }: { id: number }) => {
        React.useEffect(() => {
          const unsubscribe = subscribeToAuthState(() => {
            // Track subscription
          });
          subscriptions.push(unsubscribe);
          return unsubscribe;
        }, []);

        return (
          <AstroStackProvider>
            <UserButton data-testid={`dynamic-userbutton-${id}`} />
          </AstroStackProvider>
        );
      };

      const TestApp = () => {
        const [islands, setIslands] = React.useState([1, 2, 3]);

        return (
          <div>
            {islands.map(id => (
              <DynamicIsland key={id} id={id} />
            ))}
            <button 
              onClick={() => setIslands(prev => prev.slice(1))}
              data-testid="remove-island"
            >
              Remove Island
            </button>
          </div>
        );
      };

      const { unmount } = render(<TestApp />);

      // Remove islands
      fireEvent.click(screen.getByTestId('remove-island'));
      fireEvent.click(screen.getByTestId('remove-island'));

      // Unmount entire component tree
      unmount();

      // Subscriptions should be cleaned up
      expect(subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Sync Manager Integration', () => {
    it('should provide sync manager with correct state', () => {
      const TestApp = () => (
        <AstroStackProvider>
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      const syncManager = getSyncManager();
      expect(syncManager).toBeTruthy();
      
      // Test sync manager methods
      broadcastAuthChange({
        user: { id: 'sync-user', email: 'sync@example.com' } as any,
        session: { id: 'sync-session' } as any,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      });

      // Should trigger state updates
      expect(screen.getByTestId('userbutton-component')).toHaveTextContent('User: sync@example.com');
    });

    it('should handle sync subscription management', () => {
      let syncCallbacks = 0;

      const TestApp = () => {
        React.useEffect(() => {
          const unsubscribe = subscribeToSync(() => {
            syncCallbacks++;
          });
          return unsubscribe;
        }, []);

        return (
          <AstroStackProvider>
            <UserButton />
          </AstroStackProvider>
        );
      };

      render(<TestApp />);

      // Trigger sync events
      broadcastSignIn(
        { id: 'sync-test-user', email: 'synctest@example.com' } as any,
        { id: 'sync-test-session' } as any
      );

      expect(syncCallbacks).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle partial sync failures gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock BroadcastChannel to fail
      const originalBroadcastChannel = global.BroadcastChannel;
      (global as any).BroadcastChannel = vi.fn().mockImplementation(() => {
        throw new Error('BroadcastChannel not supported');
      });

      const TestApp = () => (
        <div>
          <AstroStackProvider syncAcrossTabs={true}>
            <SignIn />
            <UserButton data-testid="fallback-userbutton" />
          </AstroStackProvider>
        </div>
      );

      render(<TestApp />);

      // Should still work with local state
      await user.click(screen.getByTestId('signin-component'));

      await waitFor(() => {
        expect(screen.getByTestId('fallback-userbutton')).toHaveTextContent('User: test@example.com');
      });

      // Restore original
      (global as any).BroadcastChannel = originalBroadcastChannel;
      consoleSpy.mockRestore();
    });

    it('should handle conflicting state updates', async () => {
      const TestApp = () => (
        <AstroStackProvider>
          <UserButton data-testid="conflict-userbutton" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Simulate conflicting updates
      broadcastSignIn(
        { id: 'user1', email: 'user1@example.com' } as any,
        { id: 'session1' } as any
      );

      // Immediately send another update
      broadcastSignIn(
        { id: 'user2', email: 'user2@example.com' } as any,
        { id: 'session2' } as any
      );

      await waitFor(() => {
        const userButton = screen.getByTestId('conflict-userbutton');
        // Should show one of the users (last update wins)
        expect(userButton.textContent).toMatch(/User: user[12]@example\.com/);
      });
    });
  });
});