/**
 * Event Handling and State Management Across Hydration Boundaries Tests
 * 
 * Tests event handling, state management, and component interactions
 * across different Astro hydration strategies and island boundaries.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

// Components for testing
import { UserButton, SignIn, SignUp, StackProvider } from '../../src/components.js';
import {
  EventTestComponent,
  TestStackProvider,
  HydrationTracker
} from '../fixtures/astro-components/test-components.js';

// Test utilities
import { testUtils } from '../setup.js';

describe('Event Handling Across Hydration Boundaries', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let events: string[];
  let mockUser: any;

  beforeEach(() => {
    user = userEvent.setup();
    events = [];
    mockUser = testUtils.createMockUser();
    testUtils.mockStackAuthEnv();
  });

  afterEach(() => {
    testUtils.clearEnvMocks();
    vi.clearAllMocks();
  });

  describe('Cross-Island Communication', () => {
    it('should handle events between different hydration islands', async () => {
      const SharedStateComponent = () => {
        const [sharedState, setSharedState] = React.useState('initial');
        const [eventLog, setEventLog] = React.useState<string[]>([]);

        const addEvent = (event: string) => {
          setEventLog(prev => [...prev, event]);
        };

        React.useEffect(() => {
          // Simulate cross-island event listener
          const handleCustomEvent = (event: CustomEvent) => {
            setSharedState(event.detail.newState);
            addEvent(`State changed to: ${event.detail.newState}`);
          };

          window.addEventListener('stateChange', handleCustomEvent as EventListener);
          return () => window.removeEventListener('stateChange', handleCustomEvent as EventListener);
        }, []);

        return (
          <div data-testid="shared-state" data-state={sharedState}>
            {/* Island 1: client:load */}
            <div data-testid="island-1" data-hydration="load">
              <button
                data-testid="island-1-button"
                onClick={() => {
                  const event = new CustomEvent('stateChange', {
                    detail: { newState: 'updated-from-island-1' }
                  });
                  window.dispatchEvent(event);
                }}
              >
                Update from Island 1
              </button>
              <UserButton data-testid="island-1-user-button" />
            </div>

            {/* Island 2: client:visible */}
            <div data-testid="island-2" data-hydration="visible">
              <button
                data-testid="island-2-button"
                onClick={() => {
                  const event = new CustomEvent('stateChange', {
                    detail: { newState: 'updated-from-island-2' }
                  });
                  window.dispatchEvent(event);
                }}
              >
                Update from Island 2
              </button>
              <SignIn data-testid="island-2-sign-in" />
            </div>

            <div data-testid="event-log" data-events={JSON.stringify(eventLog)}>
              {eventLog.map((event, i) => (
                <div key={i} data-testid={`log-${i}`}>{event}</div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestStackProvider testId="cross-island-provider">
          <SharedStateComponent />
        </TestStackProvider>
      );

      // Initial state
      expect(screen.getByTestId('shared-state')).toHaveAttribute('data-state', 'initial');

      // Click island 1 button
      await user.click(screen.getByTestId('island-1-button'));

      await waitFor(() => {
        expect(screen.getByTestId('shared-state')).toHaveAttribute('data-state', 'updated-from-island-1');
      });

      // Click island 2 button
      await user.click(screen.getByTestId('island-2-button'));

      await waitFor(() => {
        expect(screen.getByTestId('shared-state')).toHaveAttribute('data-state', 'updated-from-island-2');
      });

      // Check event log
      const eventLog = screen.getByTestId('event-log');
      const events = JSON.parse(eventLog.getAttribute('data-events') || '[]');
      expect(events).toContain('State changed to: updated-from-island-1');
      expect(events).toContain('State changed to: updated-from-island-2');
    });

    it('should maintain component state within islands during interactions', async () => {
      const IslandStateComponent = ({ islandId }: { islandId: string }) => {
        const [clickCount, setClickCount] = React.useState(0);
        const [isHydrated, setIsHydrated] = React.useState(false);

        React.useEffect(() => {
          setIsHydrated(true);
        }, []);

        return (
          <div 
            data-testid={`island-${islandId}`} 
            data-hydrated={isHydrated}
            data-clicks={clickCount}
          >
            <button
              data-testid={`island-${islandId}-button`}
              onClick={() => setClickCount(prev => prev + 1)}
            >
              Clicks: {clickCount}
            </button>
            {islandId === '1' ? (
              <UserButton data-testid={`island-${islandId}-user-button`} />
            ) : (
              <SignIn data-testid={`island-${islandId}-sign-in`} />
            )}
          </div>
        );
      };

      render(
        <TestStackProvider testId="island-state-provider">
          <IslandStateComponent islandId="1" />
          <IslandStateComponent islandId="2" />
        </TestStackProvider>
      );

      // Wait for hydration
      await waitFor(() => {
        expect(screen.getByTestId('island-1')).toHaveAttribute('data-hydrated', 'true');
        expect(screen.getByTestId('island-2')).toHaveAttribute('data-hydrated', 'true');
      });

      // Click island 1 multiple times
      const island1Button = screen.getByTestId('island-1-button');
      await user.click(island1Button);
      await user.click(island1Button);
      await user.click(island1Button);

      // Click island 2 once
      const island2Button = screen.getByTestId('island-2-button');
      await user.click(island2Button);

      // Check independent state
      await waitFor(() => {
        expect(screen.getByTestId('island-1')).toHaveAttribute('data-clicks', '3');
        expect(screen.getByTestId('island-2')).toHaveAttribute('data-clicks', '1');
      });
    });
  });

  describe('Form Interactions and State Management', () => {
    it('should handle form submission across hydration boundaries', async () => {
      const FormTestComponent = () => {
        const [formData, setFormData] = React.useState({ email: '', password: '' });
        const [submitCount, setSubmitCount] = React.useState(0);
        const [isHydrated, setIsHydrated] = React.useState(false);

        React.useEffect(() => {
          setIsHydrated(true);
        }, []);

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          setSubmitCount(prev => prev + 1);
        };

        return (
          <div data-testid="form-test" data-hydrated={isHydrated}>
            <form onSubmit={handleSubmit} data-testid="test-form">
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
              <button type="submit" data-testid="submit-button">
                Submit ({submitCount})
              </button>
            </form>
            <SignIn data-testid="form-sign-in" />
            <div data-testid="form-data" data-email={formData.email} data-password={formData.password} />
          </div>
        );
      };

      render(
        <TestStackProvider testId="form-provider">
          <FormTestComponent />
        </TestStackProvider>
      );

      // Wait for hydration
      await waitFor(() => {
        expect(screen.getByTestId('form-test')).toHaveAttribute('data-hydrated', 'true');
      });

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('submit-button');

      // Test form interactions
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Check state updates
      await waitFor(() => {
        expect(screen.getByTestId('form-data')).toHaveAttribute('data-email', 'test@example.com');
        expect(screen.getByTestId('form-data')).toHaveAttribute('data-password', 'password123');
      });

      // Submit form
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Submit (1)');
      });

      // Submit again
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Submit (2)');
      });
    });

    it('should handle complex form interactions with Stack Auth components', async () => {
      const StackAuthFormComponent = () => {
        const [user, setUser] = React.useState<any>(null);
        const [formState, setFormState] = React.useState({
          email: '',
          isLoggedIn: false,
          showSettings: false
        });

        const handleLogin = () => {
          setUser(mockUser);
          setFormState(prev => ({ 
            ...prev, 
            isLoggedIn: true, 
            email: mockUser.email,
            showSettings: true 
          }));
        };

        const handleLogout = () => {
          setUser(null);
          setFormState(prev => ({ 
            ...prev, 
            isLoggedIn: false, 
            email: '',
            showSettings: false 
          }));
        };

        return (
          <TestStackProvider testId="stack-form-provider">
            <div 
              data-testid="stack-auth-form" 
              data-logged-in={formState.isLoggedIn}
              data-email={formState.email}
            >
              {!formState.isLoggedIn ? (
                <div data-testid="auth-section">
                  <SignIn data-testid="stack-sign-in" />
                  <button
                    data-testid="mock-login"
                    onClick={handleLogin}
                  >
                    Mock Login
                  </button>
                </div>
              ) : (
                <div data-testid="user-section">
                  <UserButton data-testid="stack-user-button" />
                  {formState.showSettings && (
                    <button
                      data-testid="settings-toggle"
                      onClick={() => setFormState(prev => ({ 
                        ...prev, 
                        showSettings: !prev.showSettings 
                      }))}
                    >
                      Toggle Settings
                    </button>
                  )}
                  <button
                    data-testid="mock-logout"
                    onClick={handleLogout}
                  >
                    Mock Logout
                  </button>
                </div>
              )}
            </div>
          </TestStackProvider>
        );
      };

      render(<StackAuthFormComponent />);

      // Initially not logged in
      expect(screen.getByTestId('stack-auth-form')).toHaveAttribute('data-logged-in', 'false');
      expect(screen.getByTestId('auth-section')).toBeInTheDocument();
      expect(screen.getByTestId('stack-sign-in')).toBeInTheDocument();

      // Mock login
      await user.click(screen.getByTestId('mock-login'));

      await waitFor(() => {
        expect(screen.getByTestId('stack-auth-form')).toHaveAttribute('data-logged-in', 'true');
        expect(screen.getByTestId('stack-auth-form')).toHaveAttribute('data-email', mockUser.email);
      });

      // User section should be visible
      expect(screen.getByTestId('user-section')).toBeInTheDocument();
      expect(screen.getByTestId('stack-user-button')).toBeInTheDocument();

      // Mock logout
      await user.click(screen.getByTestId('mock-logout'));

      await waitFor(() => {
        expect(screen.getByTestId('stack-auth-form')).toHaveAttribute('data-logged-in', 'false');
        expect(screen.getByTestId('auth-section')).toBeInTheDocument();
      });
    });
  });

  describe('Event Propagation and Bubbling', () => {
    it('should handle event propagation correctly across component boundaries', async () => {
      const eventLog: { type: string; target: string; phase: string }[] = [];
      
      const EventPropagationComponent = () => {
        const logEvent = (type: string, target: string, phase: string) => {
          eventLog.push({ type, target, phase });
        };

        return (
          <div
            data-testid="outer-container"
            onClick={(e) => logEvent('click', 'outer', 'bubble')}
            onClickCapture={(e) => logEvent('click', 'outer', 'capture')}
          >
            <div
              data-testid="middle-container"
              onClick={(e) => logEvent('click', 'middle', 'bubble')}
              onClickCapture={(e) => logEvent('click', 'middle', 'capture')}
            >
              <UserButton 
                data-testid="user-button-prop"
                onClick={(e: React.MouseEvent) => {
                  logEvent('click', 'user-button', 'bubble');
                  e.stopPropagation();
                }}
              />
              <button
                data-testid="inner-button"
                onClick={(e) => logEvent('click', 'inner-button', 'bubble')}
              >
                Click me
              </button>
            </div>
          </div>
        );
      };

      render(
        <TestStackProvider testId="propagation-provider">
          <EventPropagationComponent />
        </TestStackProvider>
      );

      // Click inner button - should propagate normally
      await user.click(screen.getByTestId('inner-button'));

      // Check event propagation order
      expect(eventLog.some(e => e.target === 'outer' && e.phase === 'capture')).toBe(true);
      expect(eventLog.some(e => e.target === 'middle' && e.phase === 'capture')).toBe(true);
      expect(eventLog.some(e => e.target === 'inner-button' && e.phase === 'bubble')).toBe(true);

      // Clear log
      eventLog.length = 0;

      // Click user button - should stop propagation
      const userButton = screen.getByTestId('user-button-prop');
      if (userButton.tagName === 'BUTTON' || userButton.querySelector('button')) {
        const button = userButton.tagName === 'BUTTON' ? userButton : userButton.querySelector('button')!;
        await user.click(button);

        // Should have capture phases but not bubble to outer containers
        expect(eventLog.some(e => e.target === 'user-button')).toBe(true);
        expect(eventLog.filter(e => e.target === 'outer' && e.phase === 'bubble')).toHaveLength(0);
      }
    });

    it('should handle keyboard events across component boundaries', async () => {
      const keyboardEvents: string[] = [];
      
      const KeyboardTestComponent = () => {
        const handleKeyDown = (key: string, target: string) => {
          keyboardEvents.push(`${key}-${target}`);
        };

        return (
          <div 
            data-testid="keyboard-container"
            onKeyDown={(e) => handleKeyDown(e.key, 'container')}
          >
            <input
              data-testid="test-input"
              onKeyDown={(e) => handleKeyDown(e.key, 'input')}
              placeholder="Type here"
            />
            <UserButton 
              data-testid="keyboard-user-button"
              onKeyDown={(e) => handleKeyDown(e.key, 'user-button')}
            />
            <div data-testid="keyboard-events" data-events={JSON.stringify(keyboardEvents)} />
          </div>
        );
      };

      render(
        <TestStackProvider testId="keyboard-provider">
          <KeyboardTestComponent />
        </TestStackProvider>
      );

      const input = screen.getByTestId('test-input');
      
      // Focus input and type
      input.focus();
      await user.type(input, 'hello');

      // Check keyboard events
      expect(keyboardEvents).toContain('h-input');
      expect(keyboardEvents).toContain('h-container');
      expect(keyboardEvents).toContain('e-input');

      // Navigate with tab
      await user.keyboard('{Tab}');
      expect(keyboardEvents).toContain('Tab-input');
      expect(keyboardEvents).toContain('Tab-container');
    });
  });

  describe('State Synchronization', () => {
    it('should synchronize state between multiple component instances', async () => {
      const GlobalStateComponent = () => {
        const [globalState, setGlobalState] = React.useState('initial');
        
        React.useEffect(() => {
          const handleGlobalStateChange = (event: CustomEvent) => {
            setGlobalState(event.detail.newState);
          };

          window.addEventListener('globalStateChange', handleGlobalStateChange as EventListener);
          return () => window.removeEventListener('globalStateChange', handleGlobalStateChange as EventListener);
        }, []);

        const updateGlobalState = (newState: string) => {
          setGlobalState(newState);
          window.dispatchEvent(new CustomEvent('globalStateChange', {
            detail: { newState }
          }));
        };

        return (
          <div data-testid="global-state-container">
            {/* Instance 1 */}
            <div data-testid="instance-1" data-state={globalState}>
              <UserButton data-testid="instance-1-user-button" />
              <button
                data-testid="instance-1-update"
                onClick={() => updateGlobalState('updated-by-1')}
              >
                Update State 1
              </button>
              <span data-testid="instance-1-display">{globalState}</span>
            </div>

            {/* Instance 2 */}
            <div data-testid="instance-2" data-state={globalState}>
              <SignIn data-testid="instance-2-sign-in" />
              <button
                data-testid="instance-2-update"
                onClick={() => updateGlobalState('updated-by-2')}
              >
                Update State 2
              </button>
              <span data-testid="instance-2-display">{globalState}</span>
            </div>
          </div>
        );
      };

      render(
        <TestStackProvider testId="global-state-provider">
          <GlobalStateComponent />
        </TestStackProvider>
      );

      // Initial state should be synchronized
      expect(screen.getByTestId('instance-1')).toHaveAttribute('data-state', 'initial');
      expect(screen.getByTestId('instance-2')).toHaveAttribute('data-state', 'initial');

      // Update from instance 1
      await user.click(screen.getByTestId('instance-1-update'));

      await waitFor(() => {
        expect(screen.getByTestId('instance-1')).toHaveAttribute('data-state', 'updated-by-1');
        expect(screen.getByTestId('instance-2')).toHaveAttribute('data-state', 'updated-by-1');
      });

      // Update from instance 2
      await user.click(screen.getByTestId('instance-2-update'));

      await waitFor(() => {
        expect(screen.getByTestId('instance-1')).toHaveAttribute('data-state', 'updated-by-2');
        expect(screen.getByTestId('instance-2')).toHaveAttribute('data-state', 'updated-by-2');
      });
    });
  });
});