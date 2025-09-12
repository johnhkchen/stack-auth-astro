/**
 * Test fixture components for Astro island hydration testing
 * 
 * These components are used to test Stack Auth component integration
 * with various Astro hydration strategies and island architecture.
 */

import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { UserButton, SignIn, SignUp, AccountSettings, StackProvider } from '../../../src/components.js';

/**
 * Test wrapper component for hydration testing
 */
export interface TestWrapperProps {
  children: React.ReactNode;
  hydrationDirective?: 'load' | 'visible' | 'idle' | 'media' | 'only';
  testId?: string;
  onMount?: () => void;
  onUnmount?: () => void;
}

export function TestWrapper({ 
  children, 
  hydrationDirective = 'load',
  testId = 'test-wrapper',
  onMount,
  onUnmount 
}: TestWrapperProps): ReactElement {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    onMount?.();
    
    return () => {
      onUnmount?.();
    };
  }, [onMount, onUnmount]);

  return (
    <div 
      data-testid={testId}
      data-hydration={hydrationDirective}
      data-mounted={mounted}
      className="test-wrapper"
    >
      {children}
    </div>
  );
}

/**
 * Test component that tracks hydration state
 */
export interface HydrationTrackerProps {
  onStateChange?: (state: 'ssr' | 'hydrating' | 'hydrated') => void;
  testId?: string;
}

export function HydrationTracker({ 
  onStateChange,
  testId = 'hydration-tracker'
}: HydrationTrackerProps): ReactElement {
  const [hydrationState, setHydrationState] = useState<'ssr' | 'hydrating' | 'hydrated'>('ssr');
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setHydrationState('hydrating');
    onStateChange?.('hydrating');
    
    const timeoutId = setTimeout(() => {
      setHydrationState('hydrated');
      onStateChange?.('hydrated');
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [onStateChange]);

  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  return (
    <div 
      data-testid={testId}
      data-hydration-state={hydrationState}
      data-render-count={renderCount}
      className={`hydration-tracker ${hydrationState}`}
    >
      <span>State: {hydrationState}</span>
      <span>Renders: {renderCount}</span>
    </div>
  );
}

/**
 * Test UserButton with hydration tracking
 */
export interface TestUserButtonProps {
  hydrationDirective?: 'load' | 'visible' | 'idle';
  onHydrationComplete?: () => void;
  testId?: string;
}

export function TestUserButton({ 
  hydrationDirective = 'load',
  onHydrationComplete,
  testId = 'test-user-button'
}: TestUserButtonProps): ReactElement {
  return (
    <TestWrapper 
      hydrationDirective={hydrationDirective}
      onMount={onHydrationComplete}
      testId={testId}
    >
      <HydrationTracker />
      <UserButton />
    </TestWrapper>
  );
}

/**
 * Test SignIn component with state management
 */
export interface TestSignInProps {
  hydrationDirective?: 'load' | 'visible' | 'idle';
  onStateChange?: (state: any) => void;
  testId?: string;
}

export function TestSignIn({ 
  hydrationDirective = 'load',
  onStateChange,
  testId = 'test-sign-in'
}: TestSignInProps): ReactElement {
  const [componentState, setComponentState] = useState({ initialized: false });

  useEffect(() => {
    setComponentState({ initialized: true });
    onStateChange?.(componentState);
  }, [componentState, onStateChange]);

  return (
    <TestWrapper 
      hydrationDirective={hydrationDirective}
      testId={testId}
    >
      <HydrationTracker />
      <SignIn />
      <div data-testid="sign-in-state" data-initialized={componentState.initialized} />
    </TestWrapper>
  );
}

/**
 * Test component for event handling across hydration boundaries
 */
export interface EventTestComponentProps {
  onClientEvent?: (event: string) => void;
  testId?: string;
}

export function EventTestComponent({ 
  onClientEvent,
  testId = 'event-test'
}: EventTestComponentProps): ReactElement {
  const [clickCount, setClickCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    onClientEvent?.('hydrated');
  }, [onClientEvent]);

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    onClientEvent?.(`clicked-${clickCount + 1}`);
  };

  return (
    <div 
      data-testid={testId}
      data-hydrated={isHydrated}
      data-click-count={clickCount}
    >
      <button 
        onClick={handleClick}
        data-testid="click-button"
      >
        Click me ({clickCount})
      </button>
      <UserButton />
    </div>
  );
}

/**
 * Performance test component for hydration timing
 */
export interface PerformanceTestComponentProps {
  onPerformanceData?: (data: {
    mountTime: number;
    hydrationTime: number;
    renderTime: number;
  }) => void;
  testId?: string;
}

export function PerformanceTestComponent({ 
  onPerformanceData,
  testId = 'performance-test'
}: PerformanceTestComponentProps): ReactElement {
  const [performanceData, setPerformanceData] = useState({
    mountTime: 0,
    hydrationTime: 0,
    renderTime: 0
  });

  useEffect(() => {
    const mountStart = performance.now();
    
    const hydrationStart = performance.now();
    
    // Simulate hydration timing
    setTimeout(() => {
      const renderTime = performance.now();
      
      const data = {
        mountTime: mountStart,
        hydrationTime: hydrationStart - mountStart,
        renderTime: renderTime - hydrationStart
      };
      
      setPerformanceData(data);
      onPerformanceData?.(data);
    }, 5);
  }, [onPerformanceData]);

  return (
    <div 
      data-testid={testId}
      data-performance={JSON.stringify(performanceData)}
    >
      <SignIn />
      <UserButton />
      <div data-testid="performance-data">
        Mount: {performanceData.mountTime}ms |
        Hydration: {performanceData.hydrationTime}ms |
        Render: {performanceData.renderTime}ms
      </div>
    </div>
  );
}

/**
 * Stack Provider test wrapper
 */
export interface TestStackProviderProps {
  children: React.ReactNode;
  mockUser?: any;
  testId?: string;
}

export function TestStackProvider({ 
  children, 
  mockUser,
  testId = 'test-stack-provider'
}: TestStackProviderProps): ReactElement {
  return (
    <div data-testid={testId}>
      <StackProvider publishableClientKey="test-key" baseUrl="http://localhost:3000">
        {children}
      </StackProvider>
    </div>
  );
}

/**
 * Complete test suite component combining all Stack Auth components
 */
export function CompleteTestSuite(): ReactElement {
  const [events, setEvents] = useState<string[]>([]);
  
  const addEvent = (event: string) => {
    setEvents(prev => [...prev, `${Date.now()}: ${event}`]);
  };

  return (
    <TestStackProvider testId="complete-suite">
      <div data-testid="complete-test-suite">
        <TestUserButton 
          onHydrationComplete={() => addEvent('UserButton hydrated')}
          testId="suite-user-button"
        />
        <TestSignIn 
          onStateChange={() => addEvent('SignIn state changed')}
          testId="suite-sign-in"
        />
        <EventTestComponent 
          onClientEvent={addEvent}
          testId="suite-events"
        />
        <PerformanceTestComponent 
          onPerformanceData={(data) => addEvent(`Performance: ${JSON.stringify(data)}`)}
          testId="suite-performance"
        />
        <div data-testid="event-log" data-events={JSON.stringify(events)}>
          {events.map((event, i) => (
            <div key={i} data-testid={`event-${i}`}>{event}</div>
          ))}
        </div>
      </div>
    </TestStackProvider>
  );
}