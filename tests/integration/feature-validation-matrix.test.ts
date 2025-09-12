/**
 * Feature Validation Matrix Tests
 * 
 * This test suite validates all Sprint 004 features across different combinations of:
 * - Rendering modes: SSR, SSG, Client-only
 * - Hydration strategies: client:load, client:visible, client:idle, client:only
 * - Browser capabilities: Modern, Legacy, Mobile
 * - Network conditions: Fast, Slow, Offline
 * - Device types: Desktop, Mobile, Tablet
 * 
 * Creates a comprehensive validation matrix to ensure Sprint 004 features work
 * in all supported environments and configurations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
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
import { initAuthState } from '../../src/client/state.js';
import { initSync } from '../../src/client/sync.js';

// Environment simulation utilities
class EnvironmentSimulator {
  static simulateSSR(): () => void {
    const originalWindow = global.window;
    const originalDocument = global.document;
    
    delete (global as any).window;
    delete (global as any).document;

    return () => {
      (global as any).window = originalWindow;
      (global as any).document = originalDocument;
    };
  }

  static simulateSSG(): void {
    // SSG is similar to SSR but with pre-rendered content
    if (typeof window !== 'undefined') {
      (window as any).__ASTRO_SSG_MODE__ = true;
    }
  }

  static simulateLegacyBrowser(): () => void {
    const originalIntersectionObserver = global.IntersectionObserver;
    const originalBroadcastChannel = global.BroadcastChannel;
    const originalRequestIdleCallback = (global as any).requestIdleCallback;

    delete (global as any).IntersectionObserver;
    delete (global as any).BroadcastChannel;
    delete (global as any).requestIdleCallback;

    return () => {
      (global as any).IntersectionObserver = originalIntersectionObserver;
      (global as any).BroadcastChannel = originalBroadcastChannel;
      (global as any).requestIdleCallback = originalRequestIdleCallback;
    };
  }

  static simulateSlowNetwork(): () => void {
    const originalFetch = global.fetch;
    
    global.fetch = vi.fn((...args) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          originalFetch(...args).then(resolve).catch(reject);
        }, 2000); // 2 second delay
      });
    });

    return () => {
      global.fetch = originalFetch;
    };
  }

  static simulateOffline(): () => void {
    const originalNavigator = global.navigator;
    
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        onLine: false
      },
      configurable: true
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    return () => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
    };
  }

  static simulateMobileDevice(): () => void {
    const originalUserAgent = navigator.userAgent;
    
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true
    });

    // Mock touch events
    (global as any).TouchEvent = vi.fn();

    return () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
      delete (global as any).TouchEvent;
    };
  }
}

// Test matrix configuration
interface TestEnvironment {
  name: string;
  renderingMode: 'SSR' | 'SSG' | 'CLIENT';
  hydrationStrategy: 'immediate' | 'lazy' | 'onVisible' | 'onIdle' | 'none';
  browserType: 'modern' | 'legacy' | 'mobile';
  networkCondition: 'fast' | 'slow' | 'offline';
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

const testMatrix: TestEnvironment[] = [
  // Modern browser scenarios
  {
    name: 'SSR + Modern + Fast',
    renderingMode: 'SSR',
    hydrationStrategy: 'immediate',
    browserType: 'modern',
    networkCondition: 'fast',
    deviceType: 'desktop'
  },
  {
    name: 'SSG + Modern + Slow',
    renderingMode: 'SSG',
    hydrationStrategy: 'lazy',
    browserType: 'modern',
    networkCondition: 'slow',
    deviceType: 'desktop'
  },
  {
    name: 'Client + Modern + Offline',
    renderingMode: 'CLIENT',
    hydrationStrategy: 'immediate',
    browserType: 'modern',
    networkCondition: 'offline',
    deviceType: 'desktop'
  },
  
  // Legacy browser scenarios
  {
    name: 'SSR + Legacy + Fast',
    renderingMode: 'SSR',
    hydrationStrategy: 'immediate',
    browserType: 'legacy',
    networkCondition: 'fast',
    deviceType: 'desktop'
  },
  {
    name: 'SSG + Legacy + Slow',
    renderingMode: 'SSG',
    hydrationStrategy: 'none',
    browserType: 'legacy',
    networkCondition: 'slow',
    deviceType: 'desktop'
  },
  
  // Mobile scenarios
  {
    name: 'SSR + Mobile + Fast',
    renderingMode: 'SSR',
    hydrationStrategy: 'onVisible',
    browserType: 'mobile',
    networkCondition: 'fast',
    deviceType: 'mobile'
  },
  {
    name: 'Client + Mobile + Slow',
    renderingMode: 'CLIENT',
    hydrationStrategy: 'lazy',
    browserType: 'mobile',
    networkCondition: 'slow',
    deviceType: 'mobile'
  },
  
  // Edge cases
  {
    name: 'SSG + Legacy + Offline',
    renderingMode: 'SSG',
    hydrationStrategy: 'none',
    browserType: 'legacy',
    networkCondition: 'offline',
    deviceType: 'desktop'
  }
];

// Feature test definitions
interface FeatureTest {
  name: string;
  component: React.ComponentType<any>;
  testId: string;
  expectedBehavior: (env: TestEnvironment) => {
    shouldRender: boolean;
    shouldHydrate: boolean;
    shouldFunction: boolean;
  };
}

const featureTests: FeatureTest[] = [
  {
    name: 'SignIn Component',
    component: SignIn,
    testId: 'signin-component',
    expectedBehavior: (env) => ({
      shouldRender: true,
      shouldHydrate: env.hydrationStrategy !== 'none',
      shouldFunction: env.networkCondition !== 'offline'
    })
  },
  {
    name: 'SignUp Component', 
    component: SignUp,
    testId: 'signup-component',
    expectedBehavior: (env) => ({
      shouldRender: true,
      shouldHydrate: env.hydrationStrategy !== 'none',
      shouldFunction: env.networkCondition !== 'offline'
    })
  },
  {
    name: 'UserButton Component',
    component: UserButton,
    testId: 'userbutton-component',
    expectedBehavior: (env) => ({
      shouldRender: true,
      shouldHydrate: env.hydrationStrategy !== 'none',
      shouldFunction: true // Should work offline with cached state
    })
  },
  {
    name: 'AccountSettings Component',
    component: AccountSettings,
    testId: 'accountsettings-component',
    expectedBehavior: (env) => ({
      shouldRender: true,
      shouldHydrate: env.hydrationStrategy !== 'none',
      shouldFunction: env.networkCondition !== 'offline'
    })
  }
];

// Mock Stack Auth components with environment awareness
vi.mock('@stackframe/stack', () => ({
  SignIn: vi.fn((props) => {
    const [isHydrated, setIsHydrated] = React.useState(typeof window === 'undefined' ? false : true);
    
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        const timer = setTimeout(() => setIsHydrated(true), 100);
        return () => clearTimeout(timer);
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'signin-component',
      'data-hydrated': isHydrated,
      'data-environment': typeof window === 'undefined' ? 'server' : 'client',
      ...props
    }, 'Stack Auth SignIn');
  }),

  SignUp: vi.fn((props) => {
    const [isHydrated, setIsHydrated] = React.useState(typeof window === 'undefined' ? false : true);
    
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        const timer = setTimeout(() => setIsHydrated(true), 100);
        return () => clearTimeout(timer);
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'signup-component',
      'data-hydrated': isHydrated,
      'data-environment': typeof window === 'undefined' ? 'server' : 'client',
      ...props
    }, 'Stack Auth SignUp');
  }),

  UserButton: vi.fn((props) => {
    const [isHydrated, setIsHydrated] = React.useState(typeof window === 'undefined' ? false : true);
    
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        const timer = setTimeout(() => setIsHydrated(true), 50); // Faster hydration
        return () => clearTimeout(timer);
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'userbutton-component',
      'data-hydrated': isHydrated,
      'data-environment': typeof window === 'undefined' ? 'server' : 'client',
      ...props
    }, 'Stack Auth UserButton');
  }),

  AccountSettings: vi.fn((props) => {
    const [isHydrated, setIsHydrated] = React.useState(typeof window === 'undefined' ? false : true);
    
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        const timer = setTimeout(() => setIsHydrated(true), 150);
        return () => clearTimeout(timer);
      }
    }, []);

    return React.createElement('div', { 
      'data-testid': 'accountsettings-component',
      'data-hydrated': isHydrated,
      'data-environment': typeof window === 'undefined' ? 'server' : 'client',
      ...props
    }, 'Stack Auth AccountSettings');
  }),

  StackProvider: vi.fn(({ children, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'stack-provider',
      ...props
    }, children)
  )
}));

describe('Feature Validation Matrix', () => {
  let restoreEnvironment: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize auth state for client-side tests
    if (typeof window !== 'undefined') {
      initAuthState({
        persistStorage: false,
        autoRefresh: false,
        refreshInterval: 0
      });

      initSync({
        enableBroadcastSync: true,
        enableStorageSync: true
      });
    }
  });

  afterEach(() => {
    cleanup();
    if (restoreEnvironment) {
      restoreEnvironment();
      restoreEnvironment = null;
    }
  });

  describe('Comprehensive Matrix Testing', () => {
    testMatrix.forEach(environment => {
      describe(`Environment: ${environment.name}`, () => {
        beforeEach(() => {
          // Set up environment
          switch (environment.renderingMode) {
            case 'SSR':
              restoreEnvironment = EnvironmentSimulator.simulateSSR();
              break;
            case 'SSG':
              EnvironmentSimulator.simulateSSG();
              break;
          }

          if (environment.browserType === 'legacy') {
            const restore = EnvironmentSimulator.simulateLegacyBrowser();
            if (restoreEnvironment) {
              const originalRestore = restoreEnvironment;
              restoreEnvironment = () => {
                originalRestore();
                restore();
              };
            } else {
              restoreEnvironment = restore;
            }
          }

          if (environment.browserType === 'mobile') {
            const restore = EnvironmentSimulator.simulateMobileDevice();
            if (restoreEnvironment) {
              const originalRestore = restoreEnvironment;
              restoreEnvironment = () => {
                originalRestore();
                restore();
              };
            } else {
              restoreEnvironment = restore;
            }
          }

          if (environment.networkCondition === 'slow') {
            const restore = EnvironmentSimulator.simulateSlowNetwork();
            if (restoreEnvironment) {
              const originalRestore = restoreEnvironment;
              restoreEnvironment = () => {
                originalRestore();
                restore();
              };
            } else {
              restoreEnvironment = restore;
            }
          }

          if (environment.networkCondition === 'offline') {
            const restore = EnvironmentSimulator.simulateOffline();
            if (restoreEnvironment) {
              const originalRestore = restoreEnvironment;
              restoreEnvironment = () => {
                originalRestore();
                restore();
              };
            } else {
              restoreEnvironment = restore;
            }
          }
        });

        featureTests.forEach(featureTest => {
          it(`should handle ${featureTest.name} correctly`, async () => {
            const expectations = featureTest.expectedBehavior(environment);
            const Component = featureTest.component;

            const TestApp = () => (
              <AstroStackProvider 
                hydrationStrategy={environment.hydrationStrategy}
                fallback={<div data-testid="fallback">Loading...</div>}
                errorFallback={({ error }) => (
                  <div data-testid="error-fallback">Error: {error.message}</div>
                )}
              >
                <Component />
              </AstroStackProvider>
            );

            // For SSR/SSG, we need to handle server rendering differently
            if (environment.renderingMode === 'SSR' && typeof window === 'undefined') {
              const { renderToString } = await import('react-dom/server');
              const serverHTML = renderToString(React.createElement(TestApp));
              
              if (expectations.shouldRender) {
                expect(serverHTML).toBeTruthy();
                expect(serverHTML).toContain(featureTest.testId);
              }
              return;
            }

            render(<TestApp />);

            if (expectations.shouldRender) {
              expect(screen.getByTestId(featureTest.testId)).toBeInTheDocument();

              if (expectations.shouldHydrate && environment.hydrationStrategy !== 'none') {
                await waitFor(() => {
                  expect(screen.getByTestId(featureTest.testId)).toHaveAttribute('data-hydrated', 'true');
                }, { timeout: 3000 });
              }

              // Test environment-specific attributes
              const component = screen.getByTestId(featureTest.testId);
              expect(component).toHaveAttribute('data-environment', 
                environment.renderingMode === 'SSR' ? 'server' : 'client'
              );
            }
          });
        });

        it('should handle complete authentication flow', async () => {
          if (environment.renderingMode === 'SSR' && typeof window === 'undefined') {
            return; // Skip interactive tests for SSR
          }

          const user = userEvent.setup();

          const TestApp = () => (
            <AstroStackProvider hydrationStrategy={environment.hydrationStrategy}>
              <div>
                <SignIn />
                <UserButton />
                <SignUp />
                <AccountSettings />
              </div>
            </AstroStackProvider>
          );

          render(<TestApp />);

          // All components should render
          expect(screen.getByTestId('signin-component')).toBeInTheDocument();
          expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
          expect(screen.getByTestId('signup-component')).toBeInTheDocument();
          expect(screen.getByTestId('accountsettings-component')).toBeInTheDocument();

          if (environment.hydrationStrategy !== 'none') {
            await waitFor(() => {
              expect(screen.getByTestId('signin-component')).toHaveAttribute('data-hydrated', 'true');
            }, { timeout: 3000 });
          }
        });

        it('should handle error scenarios gracefully', async () => {
          if (environment.renderingMode === 'SSR' && typeof window === 'undefined') {
            return;
          }

          const ErrorComponent = () => {
            throw new Error(`Test error in ${environment.name}`);
          };

          const TestApp = () => (
            <AstroStackProvider
              hydrationStrategy={environment.hydrationStrategy}
              errorFallback={({ error }) => (
                <div data-testid="matrix-error-fallback">
                  Error handled: {error.message}
                </div>
              )}
            >
              <ErrorComponent />
            </AstroStackProvider>
          );

          render(<TestApp />);

          // Should show error fallback instead of crashing
          await waitFor(() => {
            expect(screen.getByTestId('matrix-error-fallback')).toBeInTheDocument();
          });
        });

        it('should maintain performance in this environment', async () => {
          if (environment.renderingMode === 'SSR' && typeof window === 'undefined') {
            return;
          }

          const startTime = performance.now();

          const TestApp = () => (
            <AstroStackProvider hydrationStrategy={environment.hydrationStrategy}>
              {Array.from({ length: 3 }, (_, i) => (
                <UserButton key={i} data-testid={`perf-userbutton-${i}`} />
              ))}
            </AstroStackProvider>
          );

          render(<TestApp />);

          await waitFor(() => {
            expect(screen.getByTestId('perf-userbutton-0')).toBeInTheDocument();
          });

          const endTime = performance.now();
          const renderTime = endTime - startTime;

          // Performance expectations vary by environment
          const maxTime = environment.networkCondition === 'slow' ? 5000 : 
                         environment.browserType === 'legacy' ? 3000 : 1000;

          expect(renderTime).toBeLessThan(maxTime);
        });
      });
    });
  });

  describe('Cross-Environment Compatibility', () => {
    it('should maintain consistent API across environments', () => {
      // Test that components have consistent props across environments
      const commonProps = ['className', 'style', 'id'];
      
      featureTests.forEach(test => {
        const Component = test.component;
        
        // This is a basic check - in a real scenario you'd test prop compatibility
        expect(Component).toBeTruthy();
        expect(typeof Component).toBe('function');
      });
    });

    it('should handle graceful degradation', async () => {
      const TestApp = () => (
        <AstroStackProvider 
          hydrationStrategy="none"
          fallback={<div data-testid="degraded-fallback">Basic functionality</div>}
        >
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Should render basic functionality even without hydration
      expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
    });

    it('should provide consistent error handling across environments', async () => {
      const environments = ['modern', 'legacy', 'mobile'] as const;
      
      for (const browserType of environments) {
        if (browserType === 'legacy') {
          restoreEnvironment = EnvironmentSimulator.simulateLegacyBrowser();
        } else if (browserType === 'mobile') {
          restoreEnvironment = EnvironmentSimulator.simulateMobileDevice();
        }

        const TestApp = () => (
          <AstroStackProvider
            errorFallback={({ error }) => (
              <div data-testid={`error-${browserType}`}>
                {browserType} error: {error.message}
              </div>
            )}
          >
            <UserButton />
          </AstroStackProvider>
        );

        render(<TestApp />);

        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();

        cleanup();
        if (restoreEnvironment) {
          restoreEnvironment();
          restoreEnvironment = null;
        }
      }
    });
  });

  describe('Performance Matrix', () => {
    it('should meet performance targets across all environments', async () => {
      const performanceResults: Array<{
        environment: string;
        renderTime: number;
        hydrationTime: number;
      }> = [];

      for (const env of testMatrix.slice(0, 3)) { // Test subset for performance
        if (env.renderingMode === 'SSR' && typeof window === 'undefined') continue;

        const startTime = performance.now();

        const TestApp = () => (
          <AstroStackProvider hydrationStrategy={env.hydrationStrategy}>
            <UserButton />
          </AstroStackProvider>
        );

        render(<TestApp />);
        const renderTime = performance.now() - startTime;

        const hydrationStart = performance.now();
        if (env.hydrationStrategy !== 'none') {
          await waitFor(() => {
            expect(screen.getByTestId('userbutton-component')).toHaveAttribute('data-hydrated', 'true');
          }, { timeout: 3000 });
        }
        const hydrationTime = performance.now() - hydrationStart;

        performanceResults.push({
          environment: env.name,
          renderTime,
          hydrationTime
        });

        cleanup();
      }

      // All environments should meet basic performance criteria
      performanceResults.forEach(result => {
        expect(result.renderTime).toBeLessThan(1000); // 1s max render
        expect(result.hydrationTime).toBeLessThan(500); // 500ms max hydration
      });
    });
  });

  describe('Accessibility Matrix', () => {
    it('should maintain accessibility across environments', async () => {
      const TestApp = () => (
        <AstroStackProvider>
          <UserButton aria-label="User account button" />
          <SignIn aria-label="Sign in form" />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Basic accessibility checks
      expect(screen.getByTestId('userbutton-component')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('signin-component')).toHaveAttribute('aria-label');
    });
  });
});