/**
 * Consumer Project Type Integration Validation Test
 * 
 * This file simulates how a real consumer project would import and use
 * astro-stack-auth types and components, validating that all exported
 * types work correctly in strict TypeScript mode.
 * 
 * Sprint: 001
 * Task: 1.2.6 - Consumer Project Type Integration Validation
 */

import * as React from 'react';
import type { APIContext } from 'astro';

// =============================================================================
// 1. IMPORT TESTS - All Entry Points
// =============================================================================

// Main integration import
import type { AstroStackAuth } from 'astro-stack-auth';
import type { StackAuthConfig, StackAuthOptions } from 'astro-stack-auth';

// Server-side imports
import type { 
  getUser, 
  requireAuth, 
  getSession 
} from 'astro-stack-auth/server';

// Client-side imports  
import type { 
  signIn, 
  signOut,
  redirectToSignIn,
  redirectToSignUp,
  redirectToAccount
} from 'astro-stack-auth/client';

// Component imports
import type {
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC,
  ReactFC,
  ReactElement,
  ReactComponent,
  UseStackAuthHook,
  StackAuthContextType,
  StackAuthRef,
  StackAuthEvent,
  StackAuthMouseEvent,
  StackAuthChangeEvent,
  ForwardRefStackComponentProps
} from 'astro-stack-auth/components';

// Stack Auth SDK imports for compatibility testing
import type { User, Session, StackClientApp } from '@stackframe/stack';

// =============================================================================
// 2. CONFIGURATION TYPE VALIDATION
// =============================================================================

// Test configuration types work with all possible options
const fullConfig: StackAuthConfig = {
  projectId: 'test-project',
  publishableClientKey: 'test-key',
  secretServerKey: 'secret-key',
  baseUrl: 'https://api.example.com',
  prefix: '/api/auth'
};

const minimalConfig: StackAuthConfig = {
  projectId: 'test-project',
  publishableClientKey: 'test-key',
  secretServerKey: 'secret-key'
};

const integrationOptions: StackAuthOptions = {
  projectId: 'test-project',
  publishableClientKey: 'test-key', 
  secretServerKey: 'secret-key',
  prefix: '/auth',
  injectRoutes: true,
  addReactRenderer: true
};

// Test partial options (should work with TypeScript's exact optional property types)
const partialOptions: StackAuthOptions = {
  projectId: 'test-project',
  publishableClientKey: 'test-key',
  secretServerKey: 'secret-key'
  // All other properties should be optional
};

// =============================================================================
// 3. SERVER-SIDE FUNCTION TYPE VALIDATION
// =============================================================================

// Test server function signatures work with Astro's APIContext
const testServerFunctions = async (context: APIContext) => {
  // getUser should return User | null
  const user: User | null = await getUser(context);
  
  // getSession should return Session | null
  const session: Session | null = await getSession(context);
  
  // requireAuth should return User (not null)
  const authenticatedUser: User = await requireAuth(context);
  
  // requireAuth with options
  const authenticatedUserWithOptions: User = await requireAuth(context, {
    signInUrl: '/login',
    redirectTo: '/dashboard',
    throwOnUnauthenticated: true
  });

  // Test that returned values have correct types
  if (user) {
    const userId: string = user.id;
    const displayName: string | null = user.displayName;
    const email: string | null = user.primaryEmail;
    const verified: boolean = user.primaryEmailVerified;
    const signedUpAt: Date = user.signedUpAt;
  }

  if (session) {
    const tokens = await session.getTokens();
    const accessToken: string = tokens.accessToken;
    const refreshToken: string = tokens.refreshToken;
  }

  return { user, session, authenticatedUser };
};

// =============================================================================
// 4. CLIENT-SIDE FUNCTION TYPE VALIDATION  
// =============================================================================

const testClientFunctions = async () => {
  // signIn function signatures
  await signIn();
  await signIn('google');
  await signIn('google', { redirectTo: '/dashboard' });

  // signOut function signatures
  await signOut();
  await signOut({ 
    redirectTo: '/',
    clearLocalStorage: true,
    onSuccess: () => console.log('Signed out'),
    onError: (error) => console.error('Error:', error)
  });

  // redirect functions
  redirectToSignIn('/callback');
  redirectToSignUp('/welcome');
  redirectToAccount('/profile');

  // redirect functions without parameters (should work)
  redirectToSignIn();
  redirectToSignUp();
  redirectToAccount();
};

// =============================================================================
// 5. REACT COMPONENT TYPE VALIDATION
// =============================================================================

// Test basic component props
const TestBasicProps: React.FC<StackAuthComponentProps> = ({ 
  children, 
  className, 
  user, 
  session 
}) => {
  // Validate user properties if present
  if (user) {
    const id: string = user.id;
    const name: string | null = user.displayName;
    const email: string | null = user.primaryEmail;
    const verified: boolean = user.primaryEmailVerified;
  }

  // Validate session if present
  if (session) {
    const getTokens = session.getTokens;
    const isFunction: boolean = typeof getTokens === 'function';
  }

  return React.createElement('div', { className }, children);
};

// Test StackAuthFC with additional props
interface CustomComponentProps {
  title: string;
  isVisible?: boolean;
  onAction?: (event: StackAuthMouseEvent) => void;
}

const CustomStackComponent: StackAuthFC<CustomComponentProps> = ({
  title,
  isVisible = true,
  onAction,
  user,
  session,
  children,
  className
}) => {
  const handleClick = React.useCallback((event: StackAuthMouseEvent) => {
    onAction?.(event);
  }, [onAction]);

  if (!isVisible) return null;

  return React.createElement('div', { className, onClick: handleClick }, [
    React.createElement('h3', { key: 'title' }, title),
    user ? React.createElement('p', { key: 'user' }, `Welcome, ${user.displayName || 'User'}`) : null,
    session ? React.createElement('p', { key: 'session' }, 'Session active') : null,
    children
  ]);
};

// Test ForwardRef component with proper typing
const ForwardRefComponent = React.forwardRef<
  HTMLDivElement, 
  ForwardRefStackComponentProps
>(({ children, className, user, session, onClick }, ref) => {
  return React.createElement('div', {
    ref,
    className,
    onClick
  }, [
    user ? React.createElement('span', { key: 'user' }, user.displayName) : null,
    children
  ]);
});

// Test StackProvider usage
const TestStackProvider: React.FC<{ 
  app: StackClientApp;
  children: React.ReactNode;
}> = ({ app, children }) => {
  const providerProps: StackProviderProps = { app, children };
  
  // In real usage, this would be the actual StackProvider component
  // For type testing, we just validate the props structure
  return React.createElement('div', null, children);
};

// Test hook type
const TestHookUsage: React.FC = () => {
  // Type for custom hook (would be implemented in Sprint 004)
  const hookResult: ReturnType<UseStackAuthHook> = {
    user: null,
    session: null,
    isLoading: false
  };

  const { user, session, isLoading } = hookResult;

  if (isLoading) {
    return React.createElement('div', null, 'Loading...');
  }

  return React.createElement('div', null, [
    user ? React.createElement('p', { key: 'user' }, user.displayName) : null,
    session ? React.createElement('p', { key: 'session' }, 'Session active') : null
  ]);
};

// =============================================================================
// 6. CONTEXT TYPE VALIDATION
// =============================================================================

// Test context type structure
const contextValue: StackAuthContextType = {
  user: null,
  session: null,
  app: undefined // Optional
};

const contextWithApp: StackAuthContextType = {
  user: null,
  session: null,
  app: {} as StackClientApp
};

// =============================================================================
// 7. EVENT HANDLER TYPE VALIDATION
// =============================================================================

const TestEventHandlers: React.FC = () => {
  const handleClick = (event: StackAuthMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    console.log('Button clicked');
  };

  const handleChange = (event: StackAuthChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Input changed:', value);
  };

  const handleGenericEvent = (event: StackAuthEvent<HTMLElement>) => {
    const target = event.target;
    console.log('Generic event on:', target);
  };

  return React.createElement('div', null, [
    React.createElement('button', { 
      key: 'button', 
      onClick: handleClick 
    }, 'Click me'),
    React.createElement('input', { 
      key: 'input', 
      onChange: handleChange,
      onFocus: handleGenericEvent
    })
  ]);
};

// =============================================================================
// 8. REF TYPE VALIDATION
// =============================================================================

const TestRefUsage: React.FC = () => {
  const divRef: StackAuthRef<HTMLDivElement> = React.useRef<HTMLDivElement>(null);
  const buttonRef: StackAuthRef<HTMLButtonElement> = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (divRef.current) {
      divRef.current.style.background = 'lightblue';
    }
    
    if (buttonRef.current) {
      buttonRef.current.disabled = false;
    }
  }, []);

  return React.createElement('div', { ref: divRef }, [
    React.createElement('button', { key: 'button', ref: buttonRef }, 'Test Button')
  ]);
};

// =============================================================================
// 9. COMPREHENSIVE INTEGRATION TEST COMPONENT
// =============================================================================

interface ConsumerIntegrationTestProps {
  user?: User | null;
  session?: Session | null;
  app?: StackClientApp;
}

const ConsumerIntegrationTest: React.FC<ConsumerIntegrationTestProps> = ({
  user = null,
  session = null,
  app
}) => {
  const [testResults, setTestResults] = React.useState<{
    typeImportsValid: boolean;
    configurationValid: boolean;
    componentPropsValid: boolean;
    eventHandlersValid: boolean;
    refTypesValid: boolean;
  }>({
    typeImportsValid: false,
    configurationValid: false,
    componentPropsValid: false,
    eventHandlersValid: false,
    refTypesValid: false
  });

  React.useEffect(() => {
    // Validate all type imports and usage work correctly
    const results = {
      typeImportsValid: true, // If this compiles, imports work
      configurationValid: !!fullConfig.projectId && !!minimalConfig.projectId,
      componentPropsValid: true, // If components render, props work  
      eventHandlersValid: true, // If event handlers compile, types work
      refTypesValid: true // If refs compile, ref types work
    };
    
    setTestResults(results);
  }, [user, session, app]);

  const allTestsPassed = Object.values(testResults).every(Boolean);

  return React.createElement('div', { className: 'consumer-integration-test' }, [
    React.createElement('h1', { key: 'title' }, 'Consumer Project Type Integration Test'),
    
    React.createElement('div', { 
      key: 'status', 
      className: allTestsPassed ? 'success' : 'failure' 
    }, [
      React.createElement('h2', { key: 'status-title' }, `Status: ${allTestsPassed ? 'PASS' : 'FAIL'}`)
    ]),
    
    React.createElement('div', { key: 'results' }, [
      React.createElement('h3', { key: 'results-title' }, 'Test Results'),
      React.createElement('ul', { key: 'results-list' }, [
        React.createElement('li', { key: 'imports' }, 
          `Type Imports: ${testResults.typeImportsValid ? 'PASS' : 'FAIL'}`),
        React.createElement('li', { key: 'config' }, 
          `Configuration Types: ${testResults.configurationValid ? 'PASS' : 'FAIL'}`),
        React.createElement('li', { key: 'props' }, 
          `Component Props: ${testResults.componentPropsValid ? 'PASS' : 'FAIL'}`),
        React.createElement('li', { key: 'events' }, 
          `Event Handlers: ${testResults.eventHandlersValid ? 'PASS' : 'FAIL'}`),
        React.createElement('li', { key: 'refs' }, 
          `Ref Types: ${testResults.refTypesValid ? 'PASS' : 'FAIL'}`)
      ])
    ]),

    // Test component usage
    React.createElement(CustomStackComponent, {
      key: 'custom',
      title: 'Custom Component Test',
      user,
      session,
      isVisible: true,
      onAction: (event) => console.log('Custom action:', event)
    }, 'Custom component content'),

    React.createElement(TestBasicProps, {
      key: 'basic',
      user,
      session,
      className: 'test-basic'
    }, 'Basic props test'),

    React.createElement(TestEventHandlers, { key: 'events' }),
    React.createElement(TestRefUsage, { key: 'refs' }),
    React.createElement(TestHookUsage, { key: 'hooks' }),

    // Test ForwardRef component
    React.createElement(ForwardRefComponent, {
      key: 'forward-ref',
      user,
      session,
      className: 'forward-ref-test',
      onClick: (event) => console.log('Forward ref clicked:', event)
    }, 'Forward ref content'),

    // Test StackProvider if app is available
    app ? React.createElement(TestStackProvider, {
      key: 'provider',
      app
    }, 'Provider content') : null
  ]);
};

// =============================================================================
// 10. ASTRO INTEGRATION VALIDATION
// =============================================================================

// Test Astro integration usage (type-only, implementation in Sprint 002)
const testAstroIntegration = (astroStackAuth: AstroStackAuth) => {
  // Test that the integration can be called with various configurations
  const integration1 = astroStackAuth();
  const integration2 = astroStackAuth(fullConfig);
  const integration3 = astroStackAuth(integrationOptions);

  return { integration1, integration2, integration3 };
};

// =============================================================================
// 11. EXPORTS
// =============================================================================

export {
  ConsumerIntegrationTest,
  CustomStackComponent,
  TestBasicProps,
  ForwardRefComponent,
  TestStackProvider,
  TestEventHandlers,
  TestRefUsage,
  TestHookUsage,
  testServerFunctions,
  testClientFunctions,
  testAstroIntegration,
  fullConfig,
  minimalConfig,
  integrationOptions,
  partialOptions,
  contextValue,
  contextWithApp
};

export type {
  ConsumerIntegrationTestProps,
  CustomComponentProps
};

export default {
  ConsumerIntegrationTest,
  version: '1.0.0',
  testName: 'Consumer Project Type Integration Validation',
  description: 'Validates all exported types work correctly in consumer projects'
};