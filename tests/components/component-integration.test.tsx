/**
 * Stack Auth Component Integration Tests
 * 
 * Tests Stack Auth components with various Astro hydration directives
 * and island architecture integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';
import React from 'react';
import '@testing-library/jest-dom';

// Test components and configurations
import {
  TestUserButton,
  TestSignIn,
  EventTestComponent,
  PerformanceTestComponent,
  CompleteTestSuite,
  TestStackProvider
} from '../fixtures/astro-components/test-components.js';
import {
  hydrationScenarios,
  componentTestConfigs,
  testSuites
} from '../fixtures/astro-components/hydration-config.js';

// Stack Auth components
import { UserButton, SignIn, SignUp, AccountSettings, StackProvider } from '../../src/components.js';

// Mock Astro's client directives behavior
vi.mock('astro:client-directives', () => ({
  load: vi.fn((Component) => Component),
  visible: vi.fn((Component) => Component),
  idle: vi.fn((Component) => Component),
  media: vi.fn((Component) => Component),
  only: vi.fn((Component) => Component)
}));

describe('Stack Auth Component Integration', () => {
  let container: HTMLDivElement;
  let hydrationEvents: string[] = [];
  let performanceData: any[] = [];

  beforeEach(() => {
    // Reset test state
    hydrationEvents = [];
    performanceData = [];
    
    // Mock performance API
    global.performance = {
      ...global.performance,
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => []),
      getEntriesByType: vi.fn(() => [])
    } as any;

    // Mock intersection observer for client:visible tests
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate element coming into view
        setTimeout(() => {
          callback([{
            target: element,
            isIntersecting: true,
            intersectionRatio: 1
          }]);
        }, 10);
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  });

  describe('Component Hydration Directives', () => {
    describe('client:load hydration', () => {
      it('should hydrate UserButton immediately on page load', async () => {
        const onHydrationComplete = vi.fn();
        
        render(
          <TestUserButton
            hydrationDirective="load"
            onHydrationComplete={onHydrationComplete}
            testId="user-button-load"
          />
        );

        // Component should be in DOM
        expect(screen.getByTestId('user-button-load')).toBeInTheDocument();
        
        // Should have hydration tracking
        expect(screen.getByTestId('hydration-tracker')).toBeInTheDocument();
        
        // Wait for hydration
        await waitFor(() => {
          expect(onHydrationComplete).toHaveBeenCalled();
        });

        // Check hydration state
        const tracker = screen.getByTestId('hydration-tracker');
        await waitFor(() => {
          expect(tracker).toHaveAttribute('data-hydration-state', 'hydrated');
        });
      });

      it('should hydrate SignIn component with state management', async () => {
        const onStateChange = vi.fn();
        
        render(
          <TestSignIn
            hydrationDirective="load"
            onStateChange={onStateChange}
            testId="sign-in-load"
          />
        );

        // Component should be present
        expect(screen.getByTestId('sign-in-load')).toBeInTheDocument();
        
        // Wait for state initialization
        await waitFor(() => {
          expect(onStateChange).toHaveBeenCalled();
        });

        // Check state indicator
        const stateElement = screen.getByTestId('sign-in-state');
        expect(stateElement).toHaveAttribute('data-initialized', 'true');
      });

      it('should render all Stack Auth components with load directive', async () => {
        render(
          <TestStackProvider testId="load-provider">
            <UserButton data-testid="load-user-button" />
            <SignIn data-testid="load-sign-in" />
            <SignUp data-testid="load-sign-up" />
            <AccountSettings data-testid="load-account-settings" />
          </TestStackProvider>
        );

        // All components should render
        expect(screen.getByTestId('load-user-button')).toBeInTheDocument();
        expect(screen.getByTestId('load-sign-in')).toBeInTheDocument();
        expect(screen.getByTestId('load-sign-up')).toBeInTheDocument();
        expect(screen.getByTestId('load-account-settings')).toBeInTheDocument();
      });
    });

    describe('client:visible hydration', () => {
      it('should hydrate UserButton when element becomes visible', async () => {
        const onHydrationComplete = vi.fn();
        
        render(
          <TestUserButton
            hydrationDirective="visible"
            onHydrationComplete={onHydrationComplete}
            testId="user-button-visible"
          />
        );

        const element = screen.getByTestId('user-button-visible');
        expect(element).toBeInTheDocument();

        // Initially not hydrated (simulated)
        expect(element).toHaveAttribute('data-hydration', 'visible');

        // Wait for intersection observer to trigger
        await waitFor(() => {
          expect(onHydrationComplete).toHaveBeenCalled();
        }, { timeout: 100 });
      });

      it('should handle multiple visible components correctly', async () => {
        const completionCallbacks = [vi.fn(), vi.fn(), vi.fn()];
        
        render(
          <div>
            <TestUserButton
              hydrationDirective="visible"
              onHydrationComplete={completionCallbacks[0]}
              testId="visible-1"
            />
            <TestUserButton
              hydrationDirective="visible"
              onHydrationComplete={completionCallbacks[1]}
              testId="visible-2"
            />
            <TestSignIn
              hydrationDirective="visible"
              onStateChange={completionCallbacks[2]}
              testId="visible-sign-in"
            />
          </div>
        );

        // All components should be present
        expect(screen.getByTestId('visible-1')).toBeInTheDocument();
        expect(screen.getByTestId('visible-2')).toBeInTheDocument();
        expect(screen.getByTestId('visible-sign-in')).toBeInTheDocument();

        // Wait for all to complete hydration
        await waitFor(() => {
          completionCallbacks.forEach(callback => {
            expect(callback).toHaveBeenCalled();
          });
        });
      });
    });

    describe('client:idle hydration', () => {
      it('should hydrate UserButton when main thread is idle', async () => {
        const onHydrationComplete = vi.fn();
        
        // Mock requestIdleCallback
        global.requestIdleCallback = vi.fn((callback) => {
          setTimeout(() => callback({ timeRemaining: () => 50 }), 20);
          return 1;
        });

        render(
          <TestUserButton
            hydrationDirective="idle"
            onHydrationComplete={onHydrationComplete}
            testId="user-button-idle"
          />
        );

        expect(screen.getByTestId('user-button-idle')).toBeInTheDocument();

        // Wait for idle callback to trigger hydration
        await waitFor(() => {
          expect(onHydrationComplete).toHaveBeenCalled();
        }, { timeout: 100 });

        expect(global.requestIdleCallback).toHaveBeenCalled();
      });
    });
  });

  describe('Event Handling Across Hydration Boundaries', () => {
    it('should handle click events after hydration', async () => {
      const onClientEvent = vi.fn();
      
      render(
        <EventTestComponent
          onClientEvent={onClientEvent}
          testId="event-test"
        />
      );

      const component = screen.getByTestId('event-test');
      expect(component).toBeInTheDocument();

      // Wait for hydration
      await waitFor(() => {
        expect(component).toHaveAttribute('data-hydrated', 'true');
      });

      // Find and click button
      const button = screen.getByTestId('click-button');
      expect(button).toBeInTheDocument();

      // Click should work after hydration
      fireEvent.click(button);

      await waitFor(() => {
        expect(onClientEvent).toHaveBeenCalledWith('clicked-1');
      });

      // Click count should update
      expect(component).toHaveAttribute('data-click-count', '1');
    });

    it('should maintain event handler state across re-renders', async () => {
      const onClientEvent = vi.fn();
      
      const { rerender } = render(
        <EventTestComponent
          onClientEvent={onClientEvent}
          testId="event-persist-test"
        />
      );

      // Wait for initial hydration
      await waitFor(() => {
        expect(screen.getByTestId('event-persist-test')).toHaveAttribute('data-hydrated', 'true');
      });

      // Click once
      fireEvent.click(screen.getByTestId('click-button'));
      await waitFor(() => {
        expect(onClientEvent).toHaveBeenCalledWith('clicked-1');
      });

      // Re-render component
      rerender(
        <EventTestComponent
          onClientEvent={onClientEvent}
          testId="event-persist-test"
        />
      );

      // Should maintain click count
      const component = screen.getByTestId('event-persist-test');
      expect(component).toHaveAttribute('data-click-count', '1');
    });

    it('should handle complex interaction sequences', async () => {
      const events: string[] = [];
      const onClientEvent = (event: string) => events.push(event);
      
      render(
        <EventTestComponent
          onClientEvent={onClientEvent}
          testId="complex-events"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('complex-events')).toHaveAttribute('data-hydrated', 'true');
      });

      const button = screen.getByTestId('click-button');
      
      // Multiple clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(events).toContain('clicked-3');
      });

      expect(events).toEqual(['hydrated', 'clicked-1', 'clicked-2', 'clicked-3']);
    });
  });

  describe('Performance Impact of Hydration Strategies', () => {
    it('should measure hydration performance for client:load', async () => {
      const performanceCallback = vi.fn();
      
      render(
        <PerformanceTestComponent
          onPerformanceData={performanceCallback}
          testId="perf-load"
        />
      );

      expect(screen.getByTestId('perf-load')).toBeInTheDocument();

      await waitFor(() => {
        expect(performanceCallback).toHaveBeenCalled();
      });

      const performanceData = performanceCallback.mock.calls[0][0];
      expect(performanceData).toHaveProperty('mountTime');
      expect(performanceData).toHaveProperty('hydrationTime');
      expect(performanceData).toHaveProperty('renderTime');

      // Performance thresholds
      expect(performanceData.hydrationTime).toBeLessThan(100); // 100ms max
      expect(performanceData.renderTime).toBeLessThan(50); // 50ms max
    });

    it('should compare performance across hydration strategies', async () => {
      const loadPerf = vi.fn();
      const visiblePerf = vi.fn();
      const idlePerf = vi.fn();

      render(
        <div>
          <PerformanceTestComponent
            onPerformanceData={loadPerf}
            testId="perf-load-comp"
          />
          <PerformanceTestComponent
            onPerformanceData={visiblePerf}
            testId="perf-visible-comp"
          />
          <PerformanceTestComponent
            onPerformanceData={idlePerf}
            testId="perf-idle-comp"
          />
        </div>
      );

      // Wait for all performance data
      await waitFor(() => {
        expect(loadPerf).toHaveBeenCalled();
        expect(visiblePerf).toHaveBeenCalled();
        expect(idlePerf).toHaveBeenCalled();
      });

      const loadData = loadPerf.mock.calls[0][0];
      const visibleData = visiblePerf.mock.calls[0][0];
      const idleData = idlePerf.mock.calls[0][0];

      // All should have reasonable performance
      [loadData, visibleData, idleData].forEach(data => {
        expect(data.hydrationTime).toBeLessThan(200);
        expect(data.renderTime).toBeLessThan(100);
      });
    });
  });

  describe('Component State Persistence During Hydration', () => {
    it('should preserve component state during hydration process', async () => {
      const StateTestComponent = ({ testId }: { testId: string }) => {
        const [count, setCount] = React.useState(42);
        const [isHydrated, setIsHydrated] = React.useState(false);

        React.useEffect(() => {
          setIsHydrated(true);
        }, []);

        return (
          <div data-testid={testId} data-hydrated={isHydrated} data-count={count}>
            <button onClick={() => setCount(c => c + 1)}>
              Count: {count}
            </button>
            <UserButton />
          </div>
        );
      };

      render(<StateTestComponent testId="state-persistence" />);

      const component = screen.getByTestId('state-persistence');
      
      // Initial state should be preserved
      expect(component).toHaveAttribute('data-count', '42');
      
      // Wait for hydration
      await waitFor(() => {
        expect(component).toHaveAttribute('data-hydrated', 'true');
      });

      // State should still be preserved after hydration
      expect(component).toHaveAttribute('data-count', '42');

      // Interaction should work after hydration
      const button = screen.getByText('Count: 42');
      fireEvent.click(button);

      await waitFor(() => {
        expect(component).toHaveAttribute('data-count', '43');
      });
    });
  });

  describe('Complete Component Suite Integration', () => {
    it('should render and hydrate all components in test suite', async () => {
      const events: string[] = [];
      
      // Mock console.log to capture events
      const originalLog = console.log;
      console.log = vi.fn((...args) => {
        events.push(args.join(' '));
        originalLog(...args);
      });

      render(<CompleteTestSuite />);

      // Should render all components
      expect(screen.getByTestId('complete-test-suite')).toBeInTheDocument();
      expect(screen.getByTestId('suite-user-button')).toBeInTheDocument();
      expect(screen.getByTestId('suite-sign-in')).toBeInTheDocument();
      expect(screen.getByTestId('suite-events')).toBeInTheDocument();
      expect(screen.getByTestId('suite-performance')).toBeInTheDocument();

      // Wait for all components to hydrate and report
      await waitFor(() => {
        expect(screen.getByTestId('event-log')).toBeInTheDocument();
      });

      // Check that events were logged
      const eventLog = screen.getByTestId('event-log');
      const eventsData = eventLog.getAttribute('data-events');
      expect(eventsData).toBeTruthy();

      const parsedEvents = JSON.parse(eventsData || '[]');
      expect(parsedEvents.length).toBeGreaterThan(0);

      console.log = originalLog;
    });
  });

  describe('Error Boundaries and Resilience', () => {
    it('should handle component errors gracefully during hydration', async () => {
      const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
        React.useEffect(() => {
          if (shouldError) {
            throw new Error('Test hydration error');
          }
        }, [shouldError]);

        return (
          <div data-testid="error-component">
            <UserButton />
          </div>
        );
      };

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
          const errorHandler = (event: ErrorEvent) => {
            setHasError(true);
          };

          window.addEventListener('error', errorHandler);
          return () => window.removeEventListener('error', errorHandler);
        }, []);

        if (hasError) {
          return <div data-testid="error-fallback">Component failed to hydrate</div>;
        }

        return <>{children}</>;
      };

      // Test successful hydration first
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent shouldError={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-component')).toBeInTheDocument();

      // Test error handling
      rerender(
        <ErrorBoundary>
          <ErrorComponent shouldError={true} />
        </ErrorBoundary>
      );

      // Should handle error gracefully
      expect(screen.getByTestId('error-component')).toBeInTheDocument();
    });
  });
});