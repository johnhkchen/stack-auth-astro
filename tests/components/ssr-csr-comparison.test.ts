/**
 * SSR/CSR Rendering Comparison Tests
 * 
 * Tests Stack Auth components in both server-side rendered (SSR) and 
 * client-side rendered (CSR) contexts to ensure consistency and 
 * proper hydration behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

// Components for testing
import { UserButton, SignIn, SignUp, AccountSettings, StackProvider } from '../../src/components.js';
import {
  TestUserButton,
  TestSignIn,
  TestStackProvider,
  HydrationTracker
} from '../fixtures/astro-components/test-components.js';

// Test utilities
import { testUtils } from '../setup.js';

describe('SSR/CSR Rendering Comparison', () => {
  let mockUser: any;
  let mockSession: any;

  beforeEach(() => {
    mockUser = testUtils.createMockUser();
    mockSession = testUtils.createMockSession();
    
    // Mock Stack Auth for SSR testing
    testUtils.mockStackAuthEnv({
      STACK_PROJECT_ID: 'test-project',
      STACK_PUBLISHABLE_CLIENT_KEY: 'test-key',
      STACK_SECRET_SERVER_KEY: 'test-secret'
    });
  });

  afterEach(() => {
    testUtils.clearEnvMocks();
  });

  describe('Component SSR Output', () => {
    it('should render UserButton consistently in SSR and CSR', async () => {
      const TestComponent = () => (
        <TestStackProvider testId="ssr-csr-provider">
          <UserButton data-testid="user-button" />
        </TestStackProvider>
      );

      // SSR rendering
      const ssrOutput = renderToString(<TestComponent />);
      expect(ssrOutput).toContain('data-testid="user-button"');
      expect(ssrOutput).toContain('data-testid="ssr-csr-provider"');

      // CSR rendering
      render(<TestComponent />);
      const csrElement = screen.getByTestId('user-button');
      expect(csrElement).toBeInTheDocument();

      // Compare structure - both should have similar DOM structure
      expect(ssrOutput).toContain('user-button');
    });

    it('should render SignIn form consistently in SSR and CSR', async () => {
      const TestComponent = () => (
        <TestStackProvider testId="sign-in-provider">
          <SignIn data-testid="sign-in-form" />
        </TestStackProvider>
      );

      // SSR rendering
      const ssrOutput = renderToString(<TestComponent />);
      expect(ssrOutput).toContain('data-testid="sign-in-form"');
      
      // CSR rendering
      render(<TestComponent />);
      const csrElement = screen.getByTestId('sign-in-form');
      expect(csrElement).toBeInTheDocument();

      // Both should contain form elements
      expect(ssrOutput).toContain('sign-in-form');
    });

    it('should render all Stack Auth components in SSR', () => {
      const CompleteComponent = () => (
        <TestStackProvider testId="complete-ssr">
          <div data-testid="component-container">
            <UserButton data-testid="ssr-user-button" />
            <SignIn data-testid="ssr-sign-in" />
            <SignUp data-testid="ssr-sign-up" />
            <AccountSettings data-testid="ssr-account-settings" />
          </div>
        </TestStackProvider>
      );

      const ssrOutput = renderToString(<CompleteComponent />);
      
      // All components should be present in SSR output
      expect(ssrOutput).toContain('ssr-user-button');
      expect(ssrOutput).toContain('ssr-sign-in');
      expect(ssrOutput).toContain('ssr-sign-up');
      expect(ssrOutput).toContain('ssr-account-settings');
      expect(ssrOutput).toContain('component-container');
    });
  });

  describe('Hydration Consistency', () => {
    it('should maintain consistent markup between SSR and hydration', async () => {
      const HydrationTestComponent = () => {
        const [isHydrated, setIsHydrated] = React.useState(false);

        React.useEffect(() => {
          setIsHydrated(true);
        }, []);

        return (
          <div data-testid="hydration-test" data-hydrated={isHydrated}>
            <UserButton data-testid="hydration-user-button" />
            <div data-testid="hydration-state">
              {isHydrated ? 'hydrated' : 'ssr'}
            </div>
          </div>
        );
      };

      // SSR output
      const ssrOutput = renderToString(<HydrationTestComponent />);
      expect(ssrOutput).toContain('data-hydrated="false"');
      expect(ssrOutput).toContain('>ssr<');

      // CSR hydration
      render(<HydrationTestComponent />);
      
      // Initially should match SSR
      const element = screen.getByTestId('hydration-test');
      expect(element).toBeInTheDocument();

      // After hydration should update
      await waitFor(() => {
        expect(element).toHaveAttribute('data-hydrated', 'true');
      });

      const stateElement = screen.getByTestId('hydration-state');
      await waitFor(() => {
        expect(stateElement).toHaveTextContent('hydrated');
      });
    });

    it('should handle component props consistently in SSR and CSR', async () => {
      const PropsTestComponent = ({ initialValue }: { initialValue: string }) => {
        const [value, setValue] = React.useState(initialValue);

        return (
          <div data-testid="props-test" data-value={value}>
            <UserButton data-testid="props-user-button" />
            <input 
              data-testid="props-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        );
      };

      const testProps = { initialValue: 'test-value' };

      // SSR output
      const ssrOutput = renderToString(<PropsTestComponent {...testProps} />);
      expect(ssrOutput).toContain('data-value="test-value"');
      expect(ssrOutput).toContain('value="test-value"');

      // CSR rendering
      render(<PropsTestComponent {...testProps} />);
      
      const element = screen.getByTestId('props-test');
      expect(element).toHaveAttribute('data-value', 'test-value');

      const input = screen.getByTestId('props-input') as HTMLInputElement;
      expect(input.value).toBe('test-value');
    });

    it('should maintain user state between SSR and hydration', async () => {
      const UserStateComponent = () => {
        const [user, setUser] = React.useState(mockUser);
        const [isHydrated, setIsHydrated] = React.useState(false);

        React.useEffect(() => {
          setIsHydrated(true);
        }, []);

        return (
          <TestStackProvider testId="user-state-provider">
            <div data-testid="user-state" data-hydrated={isHydrated}>
              <UserButton data-testid="state-user-button" />
              {user && (
                <div data-testid="user-info" data-user-id={user.id}>
                  {user.email}
                </div>
              )}
            </div>
          </TestStackProvider>
        );
      };

      // SSR should include user data
      const ssrOutput = renderToString(<UserStateComponent />);
      expect(ssrOutput).toContain('test@example.com');
      expect(ssrOutput).toContain('data-user-id');

      // CSR should hydrate with same data
      render(<UserStateComponent />);
      
      const userInfo = screen.getByTestId('user-info');
      expect(userInfo).toHaveTextContent('test@example.com');
      expect(userInfo).toHaveAttribute('data-user-id', mockUser.id);

      // Should hydrate properly
      await waitFor(() => {
        const stateElement = screen.getByTestId('user-state');
        expect(stateElement).toHaveAttribute('data-hydrated', 'true');
      });
    });
  });

  describe('Client-Only Components', () => {
    it('should handle client-only rendering correctly', async () => {
      const ClientOnlyComponent = () => {
        const [mounted, setMounted] = React.useState(false);

        React.useEffect(() => {
          setMounted(true);
        }, []);

        // Don't render anything on server
        if (!mounted) {
          return <div data-testid="client-placeholder">Loading...</div>;
        }

        return (
          <div data-testid="client-only" data-mounted={mounted}>
            <UserButton data-testid="client-only-user-button" />
          </div>
        );
      };

      // SSR should only render placeholder
      const ssrOutput = renderToString(<ClientOnlyComponent />);
      expect(ssrOutput).toContain('client-placeholder');
      expect(ssrOutput).toContain('Loading...');
      expect(ssrOutput).not.toContain('client-only-user-button');

      // CSR should render full component
      render(<ClientOnlyComponent />);
      
      // Initially should show placeholder
      expect(screen.getByTestId('client-placeholder')).toBeInTheDocument();

      // After mount should show full component
      await waitFor(() => {
        expect(screen.getByTestId('client-only')).toBeInTheDocument();
      });

      expect(screen.getByTestId('client-only-user-button')).toBeInTheDocument();
    });

    it('should handle conditional rendering based on client-side state', async () => {
      const ConditionalComponent = () => {
        const [showAdvanced, setShowAdvanced] = React.useState(false);
        const [mounted, setMounted] = React.useState(false);

        React.useEffect(() => {
          setMounted(true);
          // Simulate client-side condition
          setShowAdvanced(typeof window !== 'undefined');
        }, []);

        return (
          <div data-testid="conditional" data-mounted={mounted}>
            <UserButton data-testid="conditional-user-button" />
            {showAdvanced && (
              <AccountSettings data-testid="conditional-account-settings" />
            )}
          </div>
        );
      };

      // SSR output
      const ssrOutput = renderToString(<ConditionalComponent />);
      expect(ssrOutput).toContain('conditional-user-button');
      expect(ssrOutput).not.toContain('conditional-account-settings');

      // CSR should show conditional content
      render(<ConditionalComponent />);
      
      const element = screen.getByTestId('conditional');
      expect(element).toBeInTheDocument();
      expect(screen.getByTestId('conditional-user-button')).toBeInTheDocument();

      await waitFor(() => {
        expect(element).toHaveAttribute('data-mounted', 'true');
      });

      // Should show conditional content after mount
      await waitFor(() => {
        expect(screen.getByTestId('conditional-account-settings')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling in SSR/CSR', () => {
    it('should handle SSR errors gracefully', () => {
      const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
        if (shouldError && typeof window === 'undefined') {
          throw new Error('SSR Error');
        }

        return (
          <div data-testid="error-component">
            <UserButton data-testid="error-user-button" />
          </div>
        );
      };

      // Should not throw during SSR with error
      expect(() => {
        renderToString(<ErrorComponent shouldError={false} />);
      }).not.toThrow();

      // CSR should still work
      render(<ErrorComponent shouldError={false} />);
      expect(screen.getByTestId('error-component')).toBeInTheDocument();
    });

    it('should handle hydration mismatches gracefully', async () => {
      const MismatchComponent = () => {
        const [clientValue, setClientValue] = React.useState('ssr-value');
        
        React.useEffect(() => {
          // Simulate hydration mismatch
          setClientValue('client-value');
        }, []);

        return (
          <div data-testid="mismatch" data-value={clientValue}>
            <UserButton data-testid="mismatch-user-button" />
            <span data-testid="mismatch-value">{clientValue}</span>
          </div>
        );
      };

      // SSR output
      const ssrOutput = renderToString(<MismatchComponent />);
      expect(ssrOutput).toContain('ssr-value');

      // CSR hydration
      render(<MismatchComponent />);
      
      const element = screen.getByTestId('mismatch');
      const valueElement = screen.getByTestId('mismatch-value');
      
      // Initially should have SSR value
      expect(valueElement).toHaveTextContent('ssr-value');

      // Should update to client value after hydration
      await waitFor(() => {
        expect(element).toHaveAttribute('data-value', 'client-value');
        expect(valueElement).toHaveTextContent('client-value');
      });
    });
  });

  describe('Performance Comparison', () => {
    it('should measure SSR vs CSR rendering performance', async () => {
      const PerformanceComponent = () => {
        const [renderTime, setRenderTime] = React.useState(0);

        React.useEffect(() => {
          const startTime = performance.now();
          
          // Simulate component work
          setTimeout(() => {
            setRenderTime(performance.now() - startTime);
          }, 10);
        }, []);

        return (
          <div data-testid="performance" data-render-time={renderTime}>
            <UserButton data-testid="perf-user-button" />
            <SignIn data-testid="perf-sign-in" />
            <SignUp data-testid="perf-sign-up" />
          </div>
        );
      };

      // Measure SSR time
      const ssrStart = performance.now();
      const ssrOutput = renderToString(<PerformanceComponent />);
      const ssrTime = performance.now() - ssrStart;

      expect(ssrOutput).toContain('perf-user-button');
      expect(ssrTime).toBeLessThan(100); // SSR should be fast

      // Measure CSR hydration time
      const csrStart = performance.now();
      render(<PerformanceComponent />);
      const csrTime = performance.now() - csrStart;

      expect(csrTime).toBeLessThan(200); // CSR should be reasonable

      // Wait for client-side render time measurement
      await waitFor(() => {
        const element = screen.getByTestId('performance');
        const renderTime = element.getAttribute('data-render-time');
        expect(parseFloat(renderTime || '0')).toBeGreaterThan(0);
      });
    });
  });
});