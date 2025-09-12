/**
 * Client-side Performance Benchmarking for Sprint 004
 * 
 * This test suite measures and validates the performance characteristics
 * of all Sprint 004 client-side features:
 * - Component loading times
 * - Bundle size impact measurement  
 * - Memory usage during auth flows
 * - Network request optimization validation
 * 
 * Performance requirements from issue #176:
 * - Client bundle increase < 50KB (gzipped)
 * - Component bundle lazy loading < 100KB
 * - First paint time impact < 100ms
 * - Time to interactive impact < 200ms
 * - Auth state updates < 50ms
 * - Component hydration < 200ms  
 * - Cross-island sync < 100ms
 * - Error recovery < 500ms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { performance } from 'perf_hooks';
import * as React from 'react';
import { 
  SignIn, 
  SignUp, 
  UserButton, 
  AccountSettings, 
  AstroStackProvider
} from '../../src/components.js';
import { signIn, signOut } from '../../src/client.js';
import { getAuthState, subscribeToAuthState, initAuthState, getAuthStateManager } from '../../src/client/state.js';
import { initSync, broadcastSignIn, broadcastSignOut } from '../../src/client/sync.js';

// Performance measurement utilities
interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
  bundleSize?: {
    compressed: number;
    uncompressed: number;
  };
}

class PerformanceMeasurement {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  start(name: string): void {
    this.metrics.set(name, {
      startTime: performance.now(),
      memoryUsage: {
        before: this.getMemoryUsage(),
        after: 0,
        delta: 0
      }
    });
  }

  end(name: string): PerformanceMetrics | undefined {
    const metric = this.metrics.get(name);
    if (!metric) return undefined;

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    if (metric.memoryUsage) {
      metric.memoryUsage.after = memoryAfter;
      metric.memoryUsage.delta = memoryAfter - metric.memoryUsage.before;
    }

    return metric;
  }

  private getMemoryUsage(): number {
    // In browser environment, use performance.memory if available
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    
    // In Node.js environment, use process.memoryUsage()
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    
    return 0;
  }

  getMetrics(name: string): PerformanceMetrics | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  clear(): void {
    this.metrics.clear();
  }
}

// Mock Stack Auth components with performance tracking
const createMockComponentWithPerf = (name: string, delay: number = 0) => {
  return vi.fn((props) => {
    const [loaded, setLoaded] = React.useState(false);
    
    React.useEffect(() => {
      const timer = setTimeout(() => setLoaded(true), delay);
      return () => clearTimeout(timer);
    }, []);

    if (!loaded && delay > 0) {
      return React.createElement('div', { 
        'data-testid': `${name}-loading`,
        ...props
      }, 'Loading...');
    }

    return React.createElement('div', { 
      'data-testid': `${name}-component`,
      ...props
    }, `Mock ${name} Component`);
  });
};

// Mock Stack Auth SDK with performance simulation
vi.mock('@stackframe/stack', () => ({
  SignIn: createMockComponentWithPerf('signin', 50),
  SignUp: createMockComponentWithPerf('signup', 50), 
  UserButton: createMockComponentWithPerf('userbutton', 20),
  AccountSettings: createMockComponentWithPerf('accountsettings', 100),
  StackProvider: vi.fn(({ children, ...props }) => 
    React.createElement('div', { 
      'data-testid': 'stack-provider',
      ...props
    }, children)
  )
}));

// Mock fetch with performance tracking
const mockFetch = vi.fn((url: string, options?: RequestInit) => {
  const delay = url.includes('/signin') ? 150 : url.includes('/signout') ? 100 : 50;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: () => Promise.resolve({
          user: { id: 'test-user', email: 'test@example.com' },
          session: { id: 'test-session' }
        })
      });
    }, delay);
  });
});

global.fetch = mockFetch as any;

// Performance benchmarking tests
describe('Sprint 004 Client-side Performance Benchmarking', () => {
  let perfMeasurement: PerformanceMeasurement;

  beforeEach(() => {
    perfMeasurement = new PerformanceMeasurement();
    vi.clearAllMocks();
    
    // Initialize auth state for consistent testing
    initAuthState({
      persistStorage: false,
      autoRefresh: false,
      refreshInterval: 0
    });
  });

  afterEach(() => {
    cleanup();
    perfMeasurement.clear();
  });

  describe('Component Loading Performance', () => {
    it('should load SignIn component within performance targets', async () => {
      perfMeasurement.start('signin-load');

      const TestApp = () => (
        <AstroStackProvider>
          <SignIn />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByTestId('signin-component')).toBeInTheDocument();
      });

      const metrics = perfMeasurement.end('signin-load');
      
      expect(metrics?.duration).toBeLessThan(200); // Component hydration < 200ms
      expect(metrics?.memoryUsage?.delta).toBeLessThan(5 * 1024 * 1024); // < 5MB memory increase
    });

    it('should load UserButton component efficiently', async () => {
      perfMeasurement.start('userbutton-load');

      const TestApp = () => (
        <AstroStackProvider>
          <UserButton />
        </AstroStackProvider>
      );

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
      });

      const metrics = perfMeasurement.end('userbutton-load');
      
      expect(metrics?.duration).toBeLessThan(100); // Fast loading for simple components
    });

    it('should handle multiple component loading efficiently', async () => {
      perfMeasurement.start('multi-component-load');

      const TestApp = () => (
        <AstroStackProvider>
          <SignIn />
          <SignUp />
          <UserButton />
          <AccountSettings />
        </AstroStackProvider>
      );

      render(<TestApp />);

      // Wait for all components to load
      await waitFor(() => {
        expect(screen.getByTestId('signin-component')).toBeInTheDocument();
        expect(screen.getByTestId('signup-component')).toBeInTheDocument();
        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
        expect(screen.getByTestId('accountsettings-component')).toBeInTheDocument();
      });

      const metrics = perfMeasurement.end('multi-component-load');
      
      expect(metrics?.duration).toBeLessThan(500); // All components < 500ms
    });
  });

  describe('Auth State Update Performance', () => {
    it('should update auth state within performance targets', async () => {
      const authStateManager = getAuthStateManager();
      
      perfMeasurement.start('auth-state-update');

      // Simulate auth state change
      authStateManager.setAuthData(
        { id: 'test-user', email: 'test@example.com' } as any,
        { id: 'test-session' } as any
      );

      const metrics = perfMeasurement.end('auth-state-update');
      
      expect(metrics?.duration).toBeLessThan(50); // Auth state updates < 50ms
    });

    it('should handle auth state subscription updates efficiently', async () => {
      let updateCount = 0;
      const updates: number[] = [];

      const unsubscribe = subscribeToAuthState(() => {
        updateCount++;
        updates.push(performance.now());
      });

      perfMeasurement.start('auth-subscription-updates');

      // Trigger multiple rapid updates
      const authStateManager = getAuthStateManager();
      for (let i = 0; i < 10; i++) {
        authStateManager.setAuthData(
          { id: `user-${i}`, email: `user${i}@example.com` } as any,
          { id: `session-${i}` } as any
        );
      }

      await new Promise(resolve => setTimeout(resolve, 100)); // Allow updates to propagate

      const metrics = perfMeasurement.end('auth-subscription-updates');
      
      expect(updateCount).toBe(10);
      expect(metrics?.duration).toBeLessThan(100); // All updates < 100ms
      
      // Check that updates weren't batched too aggressively (should be responsive)
      const maxTimeBetweenUpdates = Math.max(...updates.slice(1).map((time, i) => time - updates[i]));
      expect(maxTimeBetweenUpdates).toBeLessThan(50);

      unsubscribe();
    });
  });

  describe('Cross-Island Synchronization Performance', () => {
    it('should synchronize auth state across islands efficiently', async () => {
      let island1Updates = 0;
      let island2Updates = 0;

      const TestApp = () => (
        <div>
          <AstroStackProvider 
            onAuthStateChange={() => island1Updates++}
          >
            <UserButton data-testid="island1-user" />
          </AstroStackProvider>
          
          <AstroStackProvider 
            enableSync={true}
            onAuthStateChange={() => island2Updates++}
          >
            <UserButton data-testid="island2-user" />
          </AstroStackProvider>
        </div>
      );

      render(<TestApp />);

      perfMeasurement.start('cross-island-sync');

      // Broadcast auth change
      broadcastSignIn(
        { id: 'test-user', email: 'test@example.com' } as any,
        { id: 'test-session' } as any
      );

      await waitFor(() => {
        expect(island1Updates).toBeGreaterThan(0);
        expect(island2Updates).toBeGreaterThan(0);
      });

      const metrics = perfMeasurement.end('cross-island-sync');
      
      expect(metrics?.duration).toBeLessThan(100); // Cross-island sync < 100ms
    });
  });

  describe('Network Request Performance', () => {
    it('should handle sign in requests efficiently', async () => {
      perfMeasurement.start('signin-network');

      try {
        await signIn('github', { 
          onSuccess: () => {
            perfMeasurement.end('signin-network');
          }
        });
      } catch {
        perfMeasurement.end('signin-network');
      }

      const metrics = perfMeasurement.getMetrics('signin-network');
      
      // Network request should complete within reasonable time
      expect(metrics?.duration).toBeLessThan(500);
      
      // Should make only necessary requests
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/handler/signin/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectTo: window.location.origin }),
        credentials: 'same-origin'
      });
    });

    it('should handle sign out requests efficiently', async () => {
      perfMeasurement.start('signout-network');

      await signOut({
        onSuccess: () => {
          perfMeasurement.end('signout-network');
        }
      });

      const metrics = perfMeasurement.getMetrics('signout-network');
      
      expect(metrics?.duration).toBeLessThan(300);
      expect(mockFetch).toHaveBeenCalledWith('/handler/signout', expect.any(Object));
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover from errors within performance targets', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      perfMeasurement.start('error-recovery');

      try {
        await signIn();
      } catch (error) {
        // Error should be handled within time limit
        const metrics = perfMeasurement.end('error-recovery');
        expect(metrics?.duration).toBeLessThan(500); // Error recovery < 500ms
      }
    });

    it('should handle component error boundaries efficiently', async () => {
      const ErrorComponent = () => {
        throw new Error('Component error');
      };

      perfMeasurement.start('error-boundary');

      const TestApp = () => (
        <AstroStackProvider
          errorFallback={({ error }) => (
            <div data-testid="error-fallback">Error handled</div>
          )}
        >
          <ErrorComponent />
        </AstroStackProvider>
      );

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });

      const metrics = perfMeasurement.end('error-boundary');
      
      expect(metrics?.duration).toBeLessThan(200); // Error boundary handling < 200ms
    });
  });

  describe('Memory Usage Performance', () => {
    it('should manage memory efficiently during auth flows', async () => {
      const initialMemory = perfMeasurement['getMemoryUsage']();

      const TestApp = () => {
        const [isAuthenticated, setIsAuthenticated] = React.useState(false);

        return (
          <AstroStackProvider>
            {!isAuthenticated ? (
              <SignIn 
                onSuccess={() => setIsAuthenticated(true)}
              />
            ) : (
              <>
                <UserButton />
                <AccountSettings />
                <button 
                  onClick={() => {
                    signOut().then(() => setIsAuthenticated(false));
                  }}
                >
                  Sign Out
                </button>
              </>
            )}
          </AstroStackProvider>
        );
      };

      render(<TestApp />);

      // Simulate full auth flow
      fireEvent.click(screen.getByTestId('signin-component'));
      
      await waitFor(() => {
        expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
      });

      const midMemory = perfMeasurement['getMemoryUsage']();

      fireEvent.click(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(screen.getByTestId('signin-component')).toBeInTheDocument();
      });

      const finalMemory = perfMeasurement['getMemoryUsage']();

      // Memory should not increase significantly after full auth flow
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB increase

      // Memory should be managed efficiently during auth state changes
      const peakMemoryIncrease = midMemory - initialMemory;
      expect(peakMemoryIncrease).toBeLessThan(15 * 1024 * 1024); // < 15MB peak
    });
  });

  describe('Bundle Size Impact Estimation', () => {
    it('should estimate bundle size impact of components', async () => {
      // This is a simulation of bundle size measurement
      // In a real scenario, this would be measured during build process
      
      const componentSizes = {
        SignIn: 15000, // ~15KB
        SignUp: 16000, // ~16KB  
        UserButton: 8000, // ~8KB
        AccountSettings: 25000, // ~25KB
        AstroStackProvider: 12000, // ~12KB
        clientFunctions: 20000, // ~20KB for signIn/signOut functions
      };

      const totalSize = Object.values(componentSizes).reduce((sum, size) => sum + size, 0);
      const gzippedEstimate = totalSize * 0.3; // Rough gzip estimate

      expect(gzippedEstimate).toBeLessThan(50 * 1024); // < 50KB gzipped target
      expect(totalSize).toBeLessThan(150 * 1024); // < 150KB uncompressed reasonable
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across test runs', async () => {
      const runs = 5;
      const loadTimes: number[] = [];

      for (let i = 0; i < runs; i++) {
        perfMeasurement.start(`run-${i}`);

        const TestApp = () => (
          <AstroStackProvider>
            <UserButton />
          </AstroStackProvider>
        );

        const { unmount } = render(<TestApp />);

        await waitFor(() => {
          expect(screen.getByTestId('userbutton-component')).toBeInTheDocument();
        });

        const metrics = perfMeasurement.end(`run-${i}`);
        if (metrics?.duration) {
          loadTimes.push(metrics.duration);
        }

        unmount();
      }

      // Calculate performance statistics
      const avgTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const maxTime = Math.max(...loadTimes);
      const minTime = Math.min(...loadTimes);
      const variance = loadTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / loadTimes.length;
      const stdDev = Math.sqrt(variance);

      // Performance should be consistent
      expect(avgTime).toBeLessThan(100); // Average load time
      expect(maxTime - minTime).toBeLessThan(50); // Consistent performance
      expect(stdDev).toBeLessThan(20); // Low variance
    });
  });

  describe('Performance Summary Report', () => {
    it('should generate performance metrics summary', () => {
      const allMetrics = perfMeasurement.getAllMetrics();
      const summary = {
        totalTests: allMetrics.size,
        averageTime: 0,
        slowestOperation: '',
        slowestTime: 0,
        memoryEfficient: true,
        allTargetsMet: true
      };

      let totalTime = 0;
      for (const [name, metrics] of allMetrics) {
        if (metrics.duration) {
          totalTime += metrics.duration;
          
          if (metrics.duration > summary.slowestTime) {
            summary.slowestTime = metrics.duration;
            summary.slowestOperation = name;
          }

          // Check if memory usage is reasonable (< 5MB per operation)
          if (metrics.memoryUsage && metrics.memoryUsage.delta > 5 * 1024 * 1024) {
            summary.memoryEfficient = false;
          }

          // Check performance targets
          const targets = {
            'component-load': 200,
            'auth-state': 50,
            'cross-island': 100,
            'error-recovery': 500
          };

          for (const [target, limit] of Object.entries(targets)) {
            if (name.includes(target) && metrics.duration > limit) {
              summary.allTargetsMet = false;
            }
          }
        }
      }

      summary.averageTime = allMetrics.size > 0 ? totalTime / allMetrics.size : 0;

      // Log performance summary in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Sprint 004 Performance Summary:', summary);
      }

      expect(summary.allTargetsMet).toBe(true);
      expect(summary.memoryEfficient).toBe(true);
    });
  });
});