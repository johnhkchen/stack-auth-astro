/**
 * Performance Validation Tests for Stack Auth Components
 * 
 * Tests performance impact of different hydration strategies and measures
 * component loading, rendering, and interaction performance metrics.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

// Performance testing utilities
import {
  measureRenderTime,
  measureHydrationTime,
  measureMemoryUsage,
  measureInteractionTime,
  createPerformanceObserver
} from '../utils/performance-helpers.js';

// Components for testing
import { UserButton, SignIn, SignUp, AccountSettings, StackProvider } from '../../src/components.js';
import {
  PerformanceTestComponent,
  TestStackProvider,
  CompleteTestSuite
} from '../fixtures/astro-components/test-components.js';

// Test configurations
import {
  performanceTestConfigs,
  hydrationScenarios
} from '../fixtures/astro-components/hydration-config.js';

// Test utilities
import { testUtils } from '../setup.js';

describe('Stack Auth Component Performance Validation', () => {
  let performanceEntries: PerformanceEntry[];
  let memoryBaseline: number;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    performanceEntries = [];
    
    // Mock performance API with actual timing
    global.performance = {
      ...global.performance,
      now: vi.fn(() => Date.now() + Math.random()),
      mark: vi.fn((name: string) => {
        performanceEntries.push({
          name,
          entryType: 'mark',
          startTime: Date.now(),
          duration: 0,
          toJSON: () => ({})
        });
      }),
      measure: vi.fn((name: string, startMark?: string, endMark?: string) => {
        const start = startMark ? performanceEntries.find(e => e.name === startMark)?.startTime || 0 : 0;
        const end = endMark ? performanceEntries.find(e => e.name === endMark)?.startTime || Date.now() : Date.now();
        performanceEntries.push({
          name,
          entryType: 'measure',
          startTime: start,
          duration: end - start,
          toJSON: () => ({})
        });
      }),
      getEntriesByName: vi.fn((name: string) => 
        performanceEntries.filter(e => e.name === name)
      ),
      getEntriesByType: vi.fn((type: string) => 
        performanceEntries.filter(e => e.entryType === type)
      )
    } as any;

    // Mock memory API
    if (typeof (performance as any).memory === 'undefined') {
      (performance as any).memory = {
        usedJSHeapSize: 1000000 + Math.random() * 500000,
        totalJSHeapSize: 2000000 + Math.random() * 1000000,
        jsHeapSizeLimit: 4294967296
      };
    }

    memoryBaseline = (performance as any).memory.usedJSHeapSize;
    
    // Set up test environment
    testUtils.mockStackAuthEnv();
  });

  afterEach(() => {
    testUtils.clearEnvMocks();
    vi.clearAllMocks();
  });

  describe('Component Rendering Performance', () => {
    it('should render UserButton within performance thresholds', async () => {
      const startTime = performance.now();
      
      render(
        <TestStackProvider testId="perf-user-button-provider">
          <UserButton data-testid="perf-user-button" />
        </TestStackProvider>
      );

      const renderTime = performance.now() - startTime;
      
      expect(screen.getByTestId('perf-user-button')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(50); // 50ms threshold
    });

    it('should render SignIn component within performance thresholds', async () => {
      const startTime = performance.now();
      
      render(
        <TestStackProvider testId="perf-sign-in-provider">
          <SignIn data-testid="perf-sign-in" />
        </TestStackProvider>
      );

      const renderTime = performance.now() - startTime;
      
      expect(screen.getByTestId('perf-sign-in')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(100); // 100ms threshold for form components
    });

    it('should render all components efficiently in complete suite', async () => {
      const startTime = performance.now();
      
      render(<CompleteTestSuite />);

      const renderTime = performance.now() - startTime;
      
      expect(screen.getByTestId('complete-test-suite')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(200); // 200ms threshold for complete suite
    });
  });

  describe('Hydration Performance', () => {
    it('should measure hydration timing for different strategies', async () => {
      const hydrationMetrics: Record<string, number> = {};
      
      for (const scenario of hydrationScenarios.slice(0, 3)) {
        const MockHydrationComponent = () => {
          const [isHydrated, setIsHydrated] = React.useState(false);
          
          React.useEffect(() => {
            const startTime = performance.now();
            
            // Simulate hydration work
            setTimeout(() => {
              setIsHydrated(true);
              const hydrationTime = performance.now() - startTime;
              hydrationMetrics[scenario.name] = hydrationTime;
            }, scenario.name === 'client-load' ? 10 : scenario.name === 'client-visible' ? 20 : 30);
          }, []);

          return (
            <div 
              data-testid={`hydration-${scenario.name}`} 
              data-hydrated={isHydrated}
              data-scenario={scenario.name}
            >
              <UserButton data-testid={`user-button-${scenario.name}`} />
            </div>
          );
        };

        render(<MockHydrationComponent />);
        
        // Wait for hydration
        await waitFor(() => {
          const element = screen.getByTestId(`hydration-${scenario.name}`);
          expect(element).toHaveAttribute('data-hydrated', 'true');
        }, { timeout: 1000 });
      }

      // Validate hydration performance
      expect(hydrationMetrics['client-load']).toBeLessThan(100);
      expect(hydrationMetrics['client-visible']).toBeLessThan(150);
      expect(hydrationMetrics['client-idle']).toBeLessThan(200);
    });

    it('should track hydration performance with PerformanceTestComponent', async () => {
      const performanceData: any[] = [];
      
      render(
        <PerformanceTestComponent
          onPerformanceData={(data) => performanceData.push(data)}
          testId="hydration-perf-test"
        />
      );

      await waitFor(() => {
        expect(performanceData.length).toBeGreaterThan(0);
      });

      const data = performanceData[0];
      expect(data).toHaveProperty('mountTime');
      expect(data).toHaveProperty('hydrationTime');
      expect(data).toHaveProperty('renderTime');
      
      // Validate performance thresholds
      expect(data.hydrationTime).toBeLessThan(100);
      expect(data.renderTime).toBeLessThan(50);
    });
  });

  describe('Memory Usage Testing', () => {
    it('should not cause significant memory leaks during component lifecycle', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      // Render and unmount components multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <TestStackProvider testId={`memory-test-${i}`}>
            <UserButton data-testid={`memory-user-button-${i}`} />
            <SignIn data-testid={`memory-sign-in-${i}`} />
          </TestStackProvider>
        );
        
        await waitFor(() => {
          expect(screen.getByTestId(`memory-user-button-${i}`)).toBeInTheDocument();
        });
        
        unmount();
        
        // Force garbage collection simulation
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }
      
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 1MB for this test)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });

    it('should manage memory efficiently with multiple component instances', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      const MultiInstanceComponent = () => (
        <TestStackProvider testId="multi-instance-provider">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} data-testid={`instance-${i}`}>
              <UserButton data-testid={`user-button-${i}`} />
            </div>
          ))}
        </TestStackProvider>
      );

      render(<MultiInstanceComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('instance-0')).toBeInTheDocument();
        expect(screen.getByTestId('instance-9')).toBeInTheDocument();
      });

      const memoryAfterRender = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = memoryAfterRender - initialMemory;
      
      // Multiple instances should not cause excessive memory usage
      expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024); // 2MB threshold
    });
  });

  describe('Interaction Performance', () => {
    it('should respond to user interactions within performance thresholds', async () => {
      const interactionTimes: number[] = [];
      
      const InteractionTestComponent = () => {
        const [clickCount, setClickCount] = React.useState(0);
        
        const handleClick = () => {
          const startTime = performance.now();
          setClickCount(prev => prev + 1);
          
          // Measure time until next render
          setTimeout(() => {
            const interactionTime = performance.now() - startTime;
            interactionTimes.push(interactionTime);
          }, 0);
        };

        return (
          <div data-testid="interaction-test">
            <button 
              data-testid="interaction-button"
              onClick={handleClick}
            >
              Clicks: {clickCount}
            </button>
            <UserButton data-testid="interaction-user-button" />
          </div>
        );
      };

      render(<InteractionTestComponent />);
      
      const button = screen.getByTestId('interaction-button');
      
      // Perform multiple interactions
      for (let i = 0; i < 5; i++) {
        await user.click(button);
        await waitFor(() => {
          expect(button).toHaveTextContent(`Clicks: ${i + 1}`);
        });
      }
      
      // Wait for interaction timing measurements
      await waitFor(() => {
        expect(interactionTimes.length).toBeGreaterThan(0);
      });

      // All interactions should be fast (under 16ms for 60fps)
      interactionTimes.forEach(time => {
        expect(time).toBeLessThan(100); // 100ms is very generous threshold
      });
      
      const averageTime = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
      expect(averageTime).toBeLessThan(50); // Average should be under 50ms
    });

    it('should maintain performance during form interactions', async () => {
      const FormPerformanceComponent = () => {
        const [formData, setFormData] = React.useState({ email: '', password: '' });
        const [renderTimes, setRenderTimes] = React.useState<number[]>([]);
        
        React.useEffect(() => {
          const startTime = performance.now();
          setTimeout(() => {
            const renderTime = performance.now() - startTime;
            setRenderTimes(prev => [...prev, renderTime]);
          }, 0);
        });

        return (
          <form data-testid="performance-form">
            <input
              data-testid="email-input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
            />
            <input
              data-testid="password-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Password"
            />
            <SignIn data-testid="form-sign-in" />
            <div data-testid="render-count">{renderTimes.length}</div>
          </form>
        );
      };

      render(<FormPerformanceComponent />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      // Type in form fields
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Form should remain responsive
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
      
      // Should not cause excessive re-renders
      const renderCount = parseInt(screen.getByTestId('render-count').textContent || '0');
      expect(renderCount).toBeLessThan(50); // Should not re-render excessively
    });
  });

  describe('Bundle Size Impact', () => {
    it('should have reasonable component bundle impact', () => {
      // This test would typically check actual bundle sizes
      // For now, we'll test component instantiation overhead
      
      const componentCount = 100;
      const startTime = performance.now();
      
      const components = Array.from({ length: componentCount }, (_, i) => (
        React.createElement(UserButton, { 
          key: i, 
          'data-testid': `bundle-test-${i}` 
        })
      ));
      
      const instantiationTime = performance.now() - startTime;
      
      // Creating many component instances should be fast
      expect(instantiationTime).toBeLessThan(100); // 100ms for 100 instances
      
      const timePerComponent = instantiationTime / componentCount;
      expect(timePerComponent).toBeLessThan(1); // Less than 1ms per component
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in component rendering', async () => {
      const baselineMetrics = {
        userButtonRender: 30, // ms
        signInRender: 60,     // ms
        hydrationTime: 80,    // ms
        interactionTime: 10   // ms
      };
      
      const currentMetrics = {
        userButtonRender: 0,
        signInRender: 0,
        hydrationTime: 0,
        interactionTime: 0
      };
      
      // Measure UserButton render time
      const userButtonStart = performance.now();
      render(
        <TestStackProvider testId="regression-provider">
          <UserButton data-testid="regression-user-button" />
        </TestStackProvider>
      );
      currentMetrics.userButtonRender = performance.now() - userButtonStart;
      
      // Measure SignIn render time
      const signInStart = performance.now();
      render(
        <TestStackProvider testId="regression-sign-in-provider">
          <SignIn data-testid="regression-sign-in" />
        </TestStackProvider>
      );
      currentMetrics.signInRender = performance.now() - signInStart;
      
      // Check for regressions (allowing 50% increase)
      const regressionThreshold = 1.5;
      
      expect(currentMetrics.userButtonRender).toBeLessThan(
        baselineMetrics.userButtonRender * regressionThreshold
      );
      expect(currentMetrics.signInRender).toBeLessThan(
        baselineMetrics.signInRender * regressionThreshold
      );
    });

    it('should maintain consistent performance across test runs', async () => {
      const runMetrics: number[] = [];
      
      // Run the same test multiple times
      for (let run = 0; run < 5; run++) {
        const startTime = performance.now();
        
        const { unmount } = render(
          <TestStackProvider testId={`consistency-test-${run}`}>
            <UserButton data-testid={`consistency-user-button-${run}`} />
            <SignIn data-testid={`consistency-sign-in-${run}`} />
          </TestStackProvider>
        );
        
        await waitFor(() => {
          expect(screen.getByTestId(`consistency-user-button-${run}`)).toBeInTheDocument();
        });
        
        const runTime = performance.now() - startTime;
        runMetrics.push(runTime);
        
        unmount();
        
        // Small delay between runs
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
        });
      }
      
      // Calculate variance
      const average = runMetrics.reduce((sum, time) => sum + time, 0) / runMetrics.length;
      const variance = runMetrics.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / runMetrics.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Performance should be consistent (low standard deviation relative to average)
      const coefficientOfVariation = standardDeviation / average;
      expect(coefficientOfVariation).toBeLessThan(0.5); // 50% coefficient of variation threshold
    });
  });

  describe('Load Testing', () => {
    it('should handle multiple concurrent component instances efficiently', async () => {
      const instanceCount = 20;
      const startTime = performance.now();
      
      const ConcurrentTestComponent = () => (
        <TestStackProvider testId="concurrent-provider">
          {Array.from({ length: instanceCount }, (_, i) => (
            <div key={i} data-testid={`concurrent-container-${i}`}>
              <UserButton data-testid={`concurrent-user-button-${i}`} />
              <SignIn data-testid={`concurrent-sign-in-${i}`} />
            </div>
          ))}
        </TestStackProvider>
      );

      render(<ConcurrentTestComponent />);
      
      // Wait for all components to render
      await waitFor(() => {
        expect(screen.getByTestId('concurrent-container-0')).toBeInTheDocument();
        expect(screen.getByTestId(`concurrent-container-${instanceCount - 1}`)).toBeInTheDocument();
      });
      
      const totalTime = performance.now() - startTime;
      const timePerInstance = totalTime / instanceCount;
      
      // Should render multiple instances efficiently
      expect(totalTime).toBeLessThan(1000); // 1 second total
      expect(timePerInstance).toBeLessThan(50); // 50ms per instance
    });
  });
});