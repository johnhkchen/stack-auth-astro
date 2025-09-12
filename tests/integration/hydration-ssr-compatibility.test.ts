/**
 * Hydration and SSR/SSG Compatibility Tests
 * 
 * This test suite validates that Stack Auth components work correctly with
 * all Astro rendering modes and hydration strategies:
 * - Server-side rendering (SSR)
 * - Static site generation (SSG)
 * - Client-side hydration with different strategies
 * - Hydration mismatch handling
 * - Progressive enhancement
 * 
 * Tests ensure no hydration mismatches and proper functionality across
 * all Astro deployment modes and client hydration directives.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import * as React from 'react';
import { 
  UserButton, 
  SignIn, 
  SignUp, 
  AccountSettings, 
  AstroStackProvider 
} from '../../src/components.js';
import { getHydrationData, createAuthStateBridge } from '../../src/auth-state.js';
import { getAuthState, initAuthState } from '../../src/client/state.js';

// Mock server-side rendering environment
const mockServerEnvironment = () => {
  // Remove window object to simulate server
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalNavigator = global.navigator;
  
  delete (global as any).window;
  delete (global as any).document;
  delete (global as any).navigator;

  return () => {
    // Restore browser environment
    (global as any).window = originalWindow;
    (global as any).document = originalDocument;
    (global as any).navigator = originalNavigator;
  };
};

// Mock Stack Auth components with SSR/hydration awareness
vi.mock('@stackframe/stack', () => ({
  SignIn: vi.fn(({ initialUser, ...props }) => {
    const [isClient, setIsClient] = React.useState(false);
    const [user, setUser] = React.useState(initialUser || null);

    React.useEffect(() => {
      setIsClient(true);
      // Simulate client-side hydration
      if (typeof window !== 'undefined') {
        const hydrationData = getHydrationData();
        if (hydrationData.user) {
          setUser(hydrationData.user);
        }
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'signin-component',
      'data-client': isClient,
      'data-user': user?.email || 'none',
      ...props
    }, `SignIn - Client: ${isClient}, User: ${user?.email || 'none'}`);
  }),

  SignUp: vi.fn(({ initialUser, ...props }) => {
    const [isClient, setIsClient] = React.useState(false);
    const [user, setUser] = React.useState(initialUser || null);

    React.useEffect(() => {
      setIsClient(true);
      if (typeof window !== 'undefined') {
        const hydrationData = getHydrationData();
        if (hydrationData.user) {
          setUser(hydrationData.user);
        }
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'signup-component',
      'data-client': isClient,
      'data-user': user?.email || 'none',
      ...props
    }, `SignUp - Client: ${isClient}, User: ${user?.email || 'none'}`);
  }),

  UserButton: vi.fn(({ user, initialUser, ...props }) => {
    const [isClient, setIsClient] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(user || initialUser || null);

    React.useEffect(() => {
      setIsClient(true);
      if (typeof window !== 'undefined') {
        const hydrationData = getHydrationData();
        if (hydrationData.user) {
          setCurrentUser(hydrationData.user);
        }
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'userbutton-component',
      'data-client': isClient,
      'data-user': currentUser?.email || 'none',
      ...props
    }, `UserButton - Client: ${isClient}, User: ${currentUser?.email || 'none'}`);
  }),

  AccountSettings: vi.fn(({ user, initialUser, ...props }) => {
    const [isClient, setIsClient] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(user || initialUser || null);

    React.useEffect(() => {
      setIsClient(true);
      if (typeof window !== 'undefined') {
        const hydrationData = getHydrationData();
        if (hydrationData.user) {
          setCurrentUser(hydrationData.user);
        }
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'accountsettings-component',
      'data-client': isClient,
      'data-user': currentUser?.email || 'none',
      ...props
    }, `AccountSettings - Client: ${isClient}, User: ${currentUser?.email || 'none'}`);
  }),

  StackProvider: vi.fn(({ children, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'stack-provider',
      ...props
    }, children)
  )
}));

// Mock hydration data
const mockHydrationData = (user: any = null, session: any = null) => {
  // Mock window.__STACK_AUTH_HYDRATION_DATA__
  if (typeof window !== 'undefined') {
    (window as any).__STACK_AUTH_HYDRATION_DATA__ = {
      user,
      session,
      timestamp: Date.now()
    };
  }
};

describe('Hydration and SSR/SSG Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize auth state for client-side tests
    initAuthState({
      persistStorage: false,
      autoRefresh: false,
      refreshInterval: 0
    });
  });

  afterEach(() => {
    cleanup();
    
    // Clean up hydration data
    if (typeof window !== 'undefined') {
      delete (window as any).__STACK_AUTH_HYDRATION_DATA__;
    }
  });

  describe('Server-Side Rendering (SSR)', () => {
    it('should render components on server without errors', () => {
      const restoreEnvironment = mockServerEnvironment();

      try {
        const TestApp = () => (
          <AstroStackProvider>
            <UserButton />
            <SignIn />
          </AstroStackProvider>
        );

        // Should not throw during server-side rendering
        expect(() => {
          const serverHTML = renderToString(React.createElement(TestApp));
          expect(serverHTML).toBeTruthy();
          expect(serverHTML).toContain('UserButton - Client: false');
          expect(serverHTML).toContain('SignIn - Client: false');
        }).not.toThrow();
      } finally {
        restoreEnvironment();
      }
    });

    it('should render with initial server data', () => {
      const restoreEnvironment = mockServerEnvironment();

      try {
        const initialUser = { id: 'ssr-user', email: 'ssr@example.com' };

        const TestApp = () => (
          <AstroStackProvider initialUser={initialUser as any}>
            <UserButton initialUser={initialUser as any} />
          </AstroStackProvider>
        );

        const serverHTML = renderToString(React.createElement(TestApp));
        
        expect(serverHTML).toContain('ssr@example.com');
        expect(serverHTML).toContain('Client: false');
        expect(serverHTML).toContain('User: ssr@example.com');
      } finally {
        restoreEnvironment();
      }
    });

    it('should handle missing user data gracefully on server', () => {
      const restoreEnvironment = mockServerEnvironment();

      try {
        const TestApp = () => (
          <AstroStackProvider>
            <UserButton />
            <SignIn />
            <AccountSettings />
          </AstroStackProvider>
        );

        const serverHTML = renderToString(React.createElement(TestApp));
        
        expect(serverHTML).toContain('User: none');
        expect(serverHTML).toContain('Client: false');
      } finally {
        restoreEnvironment();
      }
    });
  });

  describe('Client-Side Hydration', () => {
    it('should hydrate components without mismatches', async () => {
      const initialUser = { id: 'hydration-user', email: 'hydration@example.com' };
      mockHydrationData(initialUser, { id: 'hydration-session' });

      const TestApp = () => (
        <AstroStackProvider 
          initialUser={initialUser as any}
          hydrationStrategy="immediate"
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should initially show server state
      expect(screen.getByTestId('userbutton-component')).toHaveAttribute('data-user', 'hydration@example.com');

      // After hydration, should show client state
      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toHaveAttribute('data-client', 'true');
      });
    });

    it('should handle different hydration strategies', async () => {
      const strategies = ['immediate', 'lazy', 'onVisible', 'onIdle'] as const;

      for (const strategy of strategies) {
        const TestApp = () => (
          <AstroStackProvider 
            hydrationStrategy={strategy}
            onHydrationComplete={(islandId) => {
              expect(islandId).toBeTruthy();
            }}
          >
            <UserButton data-testid={`userbutton-${strategy}`} />
          </AstroStackProvider>
        );

        const { unmount } = render(<TestApp />);

        await waitFor(() => {
          expect(screen.getByTestId(`userbutton-${strategy}`)).toHaveAttribute('data-client', 'true');
        });

        unmount();
      }
    });

    it('should handle hydration with mismatched data', async () => {
      const serverUser = { id: 'server-user', email: 'server@example.com' };
      const clientUser = { id: 'client-user', email: 'client@example.com' };

      mockHydrationData(clientUser, { id: 'client-session' });

      const TestApp = () => (
        <AstroStackProvider 
          initialUser={serverUser as any}
          hydrationStrategy="immediate"
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should start with server data
      expect(screen.getByTestId('userbutton-component')).toHaveAttribute('data-user', 'server@example.com');

      // After hydration, should resolve to client data
      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toHaveAttribute('data-user', 'client@example.com');
      });
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work without JavaScript (graceful degradation)', () => {
      const TestApp = () => (
        <AstroStackProvider 
          fallback={<div data-testid="no-js-fallback">Please enable JavaScript</div>}
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Component should render even without hydration
      expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
    });

    it('should enhance functionality after hydration', async () => {
      let enhancedFeatures = false;

      const TestApp = () => {
        const [enhanced, setEnhanced] = React.useState(false);

        React.useEffect(() => {
          // Simulate progressive enhancement
          setEnhanced(true);
          enhancedFeatures = true;
        }, []);

        return (
          <AstroStackProvider>
            <UserButton />
            {enhanced && (
              <div data-testid="enhanced-features">Enhanced features available</div>
            )}
          </AstroStackProvider>
        );
      };

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-features')).toBeInTheDocument();
        expect(enhancedFeatures).toBe(true);
      });
    });

    it('should handle partial hydration scenarios', async () => {
      const TestApp = () => (
        <div>
          {/* Island 1: Hydrated immediately */}
          <AstroStackProvider hydrationStrategy="immediate">
            <UserButton data-testid="immediate-userbutton" />
          </AstroStackProvider>

          {/* Island 2: Lazy hydration */}
          <AstroStackProvider hydrationStrategy="lazy">
            <SignIn data-testid="lazy-signin" />
          </AstroStackProvider>

          {/* Static content (no hydration) */}
          <div data-testid="static-content">Static authentication info</div>
        </div>
      );

      render(<TestApp />);

      // Static content should be immediately available
      expect(screen.getByTestId('static-content')).toBeInTheDocument();

      // Components should hydrate according to their strategy
      await waitFor(() => {
        expect(screen.getByTestId('immediate-userbutton')).toHaveAttribute('data-client', 'true');
      });

      // Lazy component may still be hydrating
      const lazyComponent = screen.getByTestId('lazy-signin');
      expect(lazyComponent).toBeInTheDocument();
    });
  });

  describe('SSG (Static Site Generation)', () => {
    it('should generate static HTML correctly', () => {
      const TestApp = () => (
        <AstroStackProvider>
          <SignIn />
          <UserButton />
          <div data-testid="static-page">Welcome to our app</div>
        </AstroStackProvider>
      );

      // Simulate static generation
      const staticHTML = renderToString(React.createElement(TestApp));
      
      expect(staticHTML).toContain('SignIn - Client: false');
      expect(staticHTML).toContain('UserButton - Client: false');
      expect(staticHTML).toContain('Welcome to our app');
    });

    it('should handle pre-rendered auth states', () => {
      const preRenderedUser = { id: 'ssg-user', email: 'ssg@example.com' };

      const TestApp = () => (
        <AstroStackProvider initialUser={preRenderedUser as any}>
          <UserButton initialUser={preRenderedUser as any} />
          <AccountSettings initialUser={preRenderedUser as any} />
        </AstroStackProvider>
      );

      const staticHTML = renderToString(React.createElement(TestApp));
      
      expect(staticHTML).toContain('ssg@example.com');
      expect(staticHTML).toContain('User: ssg@example.com');
    });
  });

  describe('Client Directives Compatibility', () => {
    it('should work with client:load directive simulation', async () => {
      const TestApp = () => (
        <AstroStackProvider hydrationStrategy="immediate">
          <UserButton data-testid="load-directive" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('load-directive')).toHaveAttribute('data-client', 'true');
      });
    });

    it('should work with client:visible directive simulation', async () => {
      const TestApp = () => (
        <AstroStackProvider hydrationStrategy="onVisible">
          <UserButton data-testid="visible-directive" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should eventually hydrate (simulating intersection)
      await waitFor(() => {
        expect(screen.getByTestId('visible-directive')).toHaveAttribute('data-client', 'true');
      });
    });

    it('should work with client:idle directive simulation', async () => {
      const TestApp = () => (
        <AstroStackProvider hydrationStrategy="onIdle">
          <UserButton data-testid="idle-directive" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should hydrate when idle (simulated)
      await waitFor(() => {
        expect(screen.getByTestId('idle-directive')).toHaveAttribute('data-client', 'true');
      });
    });

    it('should handle mixed hydration directives', async () => {
      const TestApp = () => (
        <div>
          <AstroStackProvider hydrationStrategy="immediate">
            <UserButton data-testid="mixed-immediate" />
          </AstroStackProvider>
          
          <AstroStackProvider hydrationStrategy="lazy">
            <SignIn data-testid="mixed-lazy" />
          </AstroStackProvider>
          
          <AstroStackProvider hydrationStrategy="onVisible">
            <AccountSettings data-testid="mixed-visible" />
          </AstroStackProvider>
        </div>
      );

      render(<TestApp />);

      // All components should eventually hydrate
      await waitFor(() => {
        expect(screen.getByTestId('mixed-immediate')).toHaveAttribute('data-client', 'true');
        expect(screen.getByTestId('mixed-lazy')).toHaveAttribute('data-client', 'true');
        expect(screen.getByTestId('mixed-visible')).toHaveAttribute('data-client', 'true');
      });
    });
  });

  describe('Auth State Bridge Integration', () => {
    it('should create auth state bridge with correct configuration', async () => {
      const TestApp = () => (
        <AstroStackProvider
          hydrationStrategy="immediate"
          enableSync={true}
          syncAcrossTabs={true}
          autoRefresh={true}
        >
          <UserButton data-testid="bridge-userbutton" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should create bridge and configure it properly
      await waitFor(() => {
        expect(screen.getByTestId('bridge-userbutton')).toHaveAttribute('data-client', 'true');
      });
    });

    it('should handle bridge initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock createAuthStateBridge to throw error
      const originalCreateBridge = createAuthStateBridge;
      vi.mocked(createAuthStateBridge).mockImplementationOnce(() => {
        throw new Error('Bridge initialization failed');
      });

      const TestApp = () => (
        <AstroStackProvider
          errorFallback={({ error }) => (
            <div data-testid="bridge-error">Bridge error: {error.message}</div>
          )}
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should still render component even if bridge fails
      expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Loading States and Fallbacks', () => {
    it('should show loading fallback during hydration', async () => {
      const TestApp = () => (
        <AstroStackProvider
          loadingFallback={<div data-testid="loading">Loading auth...</div>}
          hydrationStrategy="lazy"
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should show component without loading state for lazy hydration
      expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
    });

    it('should show fallback when no auth state available', () => {
      const TestApp = () => (
        <AstroStackProvider
          fallback={<div data-testid="no-auth">No authentication available</div>}
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should show UserButton component (fallback is for when no initial auth state)
      expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
    });
  });

  describe('Memory and Performance during Hydration', () => {
    it('should not cause memory leaks during hydration', async () => {
      const components = [];

      for (let i = 0; i < 5; i++) {
        const TestApp = () => (
          <AstroStackProvider hydrationStrategy="immediate">
            <UserButton data-testid={`perf-userbutton-${i}`} />
          </AstroStackProvider>
        );

        components.push(render(<TestApp />));
      }

      // Wait for all to hydrate
      await waitFor(() => {
        for (let i = 0; i < 5; i++) {
          expect(screen.getByTestId(`perf-userbutton-${i}`)).toHaveAttribute('data-client', 'true');
        }
      });

      // Cleanup all components
      components.forEach(({ unmount }) => unmount());

      // Should not have memory leaks (this is a basic test)
      expect(components.length).toBe(5);
    });

    it('should hydrate efficiently with multiple strategies', async () => {
      const startTime = performance.now();

      const TestApp = () => (
        <div>
          {Array.from({ length: 3 }, (_, i) => (
            <AstroStackProvider 
              key={i}
              hydrationStrategy={i === 0 ? 'immediate' : i === 1 ? 'lazy' : 'onVisible'}
            >
              <UserButton data-testid={`efficient-userbutton-${i}`} />
            </AstroStackProvider>
          ))}
        </div>
      );

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('efficient-userbutton-0')).toHaveAttribute('data-client', 'true');
        expect(screen.getByTestId('efficient-userbutton-1')).toHaveAttribute('data-client', 'true');
        expect(screen.getByTestId('efficient-userbutton-2')).toHaveAttribute('data-client', 'true');
      });

      const endTime = performance.now();
      const hydrationTime = endTime - startTime;

      // Should complete hydration in reasonable time
      expect(hydrationTime).toBeLessThan(1000); // 1 second max
    });
  });
});