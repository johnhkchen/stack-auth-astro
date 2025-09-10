/**
 * React Component Type Integration Tests
 * 
 * This file tests React component type definitions with actual React imports
 * to ensure comprehensive compatibility with React patterns and Stack Auth.
 * 
 * Sprint: 001
 * Task: 1.2.4 - React Type Integration Testing
 */

import * as React from 'react';
import type { 
  User, 
  Session, 
  StackClientApp
} from '@stackframe/stack';

import type {
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC,
  ReactFC,
  UseStackAuthHook,
  StackAuthContextType,
  StackAuthRef,
  StackAuthEvent,
  StackAuthMouseEvent,
  StackAuthChangeEvent,
  ForwardRefStackComponentProps
} from './components';

// =============================================================================
// 1. REACT HOOKS INTEGRATION TESTS
// =============================================================================

// Test useState with Stack Auth types
const UseStateIntegrationTest: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [app, setApp] = React.useState<StackClientApp | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Test that useState works with Stack Auth types
  React.useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        // Simulate app initialization
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'useState Integration Test'),
    React.createElement('p', { key: 'loading' }, `Loading: ${isLoading}`),
    React.createElement('p', { key: 'user' }, `User: ${user?.displayName || 'None'}`),
    React.createElement('p', { key: 'session' }, `Session: ${session ? 'Active' : 'None'}`),
    error ? React.createElement('p', { key: 'error' }, `Error: ${error}`) : null
  ]);
};

// Test useEffect with Stack Auth types
const UseEffectIntegrationTest: React.FC<{ app: StackClientApp }> = ({ app }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);

  // Test useEffect with Stack Auth SDK calls
  React.useEffect(() => {
    const setupAuth = async () => {
      try {
        const currentUser = await app.getUser();
        setUser(currentUser);
        
        // Session is available through the user's Auth interface when authenticated
        const currentSession = currentUser?.currentSession || null;
        setSession(currentSession);
      } catch (error) {
        console.error('Auth setup failed:', error);
      }
    };

    setupAuth();
  }, [app]);

  // Test cleanup effect
  React.useEffect(() => {
    const cleanup = () => {
      setUser(null);
      setSession(null);
    };

    return cleanup;
  }, []);

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'useEffect Integration Test'),
    React.createElement('p', { key: 'user' }, `User: ${user?.displayName || 'None'}`),
    React.createElement('p', { key: 'session' }, `Session: ${session ? 'Active' : 'None'}`)
  ]);
};

// Test useCallback with Stack Auth types
const UseCallbackIntegrationTest: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);

  const handleUserUpdate = React.useCallback((newUser: User | null) => {
    setUser(newUser);
  }, []);

  const handleUserSignIn = React.useCallback(async (email: string, password: string): Promise<User | null> => {
    try {
      // Simulate sign in
      return null;
    } catch (error) {
      console.error('Sign in failed:', error);
      return null;
    }
  }, []);

  const handleUserSignOut = React.useCallback(async (): Promise<void> => {
    try {
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, []);

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'useCallback Integration Test'),
    React.createElement('button', {
      key: 'signin',
      onClick: () => handleUserSignIn('test@example.com', 'password')
    }, 'Sign In'),
    React.createElement('button', {
      key: 'signout',
      onClick: handleUserSignOut
    }, 'Sign Out'),
    React.createElement('button', {
      key: 'clear',
      onClick: () => handleUserUpdate(null)
    }, 'Clear User')
  ]);
};

// Test useMemo with Stack Auth types
const UseMemoIntegrationTest: React.FC<{ user: User | null; session: Session | null }> = ({ 
  user, 
  session 
}) => {
  const userDisplayInfo = React.useMemo(() => {
    if (!user) return { name: 'Anonymous', email: 'N/A', avatar: null };
    
    return {
      name: user.displayName || user.primaryEmail || 'Unknown',
      email: user.primaryEmail || 'No email',
      avatar: user.profileImageUrl || null
    };
  }, [user]);

  const authStatus = React.useMemo(() => {
    return {
      hasUser: !!user,
      hasSession: !!session,
      isAuthenticated: !!(user && session),
      userId: user?.id || null,
      sessionId: session ? 'active' : null
    };
  }, [user, session]);

  const combinedInfo = React.useMemo(() => {
    return {
      ...userDisplayInfo,
      ...authStatus
    };
  }, [userDisplayInfo, authStatus]);

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'useMemo Integration Test'),
    React.createElement('p', { key: 'name' }, `Name: ${combinedInfo.name}`),
    React.createElement('p', { key: 'email' }, `Email: ${combinedInfo.email}`),
    React.createElement('p', { key: 'auth' }, `Authenticated: ${combinedInfo.isAuthenticated}`),
    React.createElement('p', { key: 'user-id' }, `User ID: ${combinedInfo.userId || 'None'}`),
    React.createElement('p', { key: 'session-status' }, `Session: ${combinedInfo.sessionId || 'None'}`)
  ]);
};

// Test useRef with Stack Auth types
const UseRefIntegrationTest: React.FC = () => {
  const userRef = React.useRef<User | null>(null);
  const sessionRef = React.useRef<Session | null>(null);
  const appRef = React.useRef<StackClientApp | null>(null);
  const elementRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdateRefs = React.useCallback(() => {
    userRef.current = null;
    sessionRef.current = null;
    appRef.current = null;

    if (elementRef.current) {
      elementRef.current.style.backgroundColor = 'lightgreen';
    }

    if (inputRef.current) {
      inputRef.current.value = 'Updated';
      inputRef.current.focus();
    }
  }, []);

  return React.createElement('div', { ref: elementRef }, [
    React.createElement('h3', { key: 'title' }, 'useRef Integration Test'),
    React.createElement('input', {
      key: 'input',
      ref: inputRef,
      placeholder: 'Test input'
    }),
    React.createElement('button', {
      key: 'update',
      onClick: handleUpdateRefs
    }, 'Update Refs'),
    React.createElement('p', { key: 'info' }, 'Check console for ref values')
  ]);
};

// =============================================================================
// 2. REACT CONTEXT INTEGRATION TESTS
// =============================================================================

// Test React Context with Stack Auth types
const StackAuthReactContext = React.createContext<StackAuthContextType>({
  user: null,
  session: null
});

const StackAuthContextProvider: React.FC<{ 
  app: StackClientApp;
  children: React.ReactNode 
}> = ({ app, children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    const setupContext = async () => {
      try {
        const currentUser = await app.getUser();
        setUser(currentUser);
        
        // Session is available through the user's Auth interface when authenticated
        const currentSession = currentUser?.currentSession || null;
        setSession(currentSession);
      } catch (error) {
        console.error('Context setup failed:', error);
      }
    };

    setupContext();
  }, [app]);

  const contextValue: StackAuthContextType = React.useMemo(() => ({
    user,
    session,
    app
  }), [user, session, app]);

  return React.createElement(StackAuthReactContext.Provider, {
    value: contextValue
  }, children);
};

const useStackAuthContext = (): StackAuthContextType => {
  const context = React.useContext(StackAuthReactContext);
  if (!context) {
    throw new Error('useStackAuthContext must be used within StackAuthContextProvider');
  }
  return context;
};

const StackAuthContextConsumer: React.FC = () => {
  const { user, session, app } = useStackAuthContext();

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'Context Consumer Test'),
    React.createElement('p', { key: 'user' }, `Context User: ${user?.displayName || 'None'}`),
    React.createElement('p', { key: 'session' }, `Context Session: ${session ? 'Active' : 'None'}`),
    React.createElement('p', { key: 'app' }, `Context App: ${app ? 'Available' : 'None'}`)
  ]);
};

// =============================================================================
// 3. REACT COMPONENT PATTERN TESTS
// =============================================================================

// Test React.FC with Stack Auth props
const ReactFCTest: ReactFC<StackAuthComponentProps & { title: string }> = ({ 
  title,
  children,
  className,
  user,
  session 
}) => {
  return React.createElement('div', { className }, [
    React.createElement('h3', { key: 'title' }, title),
    React.createElement('p', { key: 'user' }, `User: ${user?.displayName || 'None'}`),
    React.createElement('p', { key: 'session' }, `Session: ${session ? 'Active' : 'None'}`),
    children
  ]);
};

// Test StackAuthFC
const StackAuthFCTest: StackAuthFC<{ title: string; onClick?: () => void }> = ({ 
  title,
  onClick,
  children,
  className,
  user,
  session 
}) => {
  const handleClick = React.useCallback(() => {
    if (onClick) onClick();
    console.log('StackAuthFC clicked', { user, session });
  }, [onClick, user, session]);

  return React.createElement('div', { className, onClick: handleClick }, [
    React.createElement('h3', { key: 'title' }, title),
    React.createElement('p', { key: 'user-info' }, user ? `Welcome ${user.displayName}` : 'Not authenticated'),
    children
  ]);
};

// Test forwardRef with Stack Auth types
const ForwardRefStackAuth = React.forwardRef<
  HTMLDivElement,
  ForwardRefStackComponentProps & { title: string }
>(({ title, onClick, children, className, user, session }, ref) => {
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(event);
    }
    console.log('ForwardRef clicked', { user, session });
  }, [onClick, user, session]);

  return React.createElement('div', {
    ref,
    className,
    onClick: handleClick
  }, [
    React.createElement('h3', { key: 'title' }, title),
    React.createElement('p', { key: 'user' }, `Ref User: ${user?.displayName || 'None'}`),
    React.createElement('p', { key: 'session' }, `Ref Session: ${session ? 'Active' : 'None'}`),
    children
  ]);
});

// =============================================================================
// 4. EVENT HANDLING TESTS
// =============================================================================

// Test event handlers with Stack Auth types
const EventHandlingTest: React.FC<{ user: User | null; session: Session | null }> = ({ 
  user, 
  session 
}) => {
  const handleStackAuthEvent = React.useCallback((event: StackAuthEvent) => {
    event.preventDefault();
    console.log('Stack Auth event handled', { user, session });
  }, [user, session]);

  const handleStackAuthMouseEvent = React.useCallback((event: StackAuthMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Stack Auth mouse event handled', { user, session, button: event.button });
  }, [user, session]);

  const handleStackAuthChangeEvent = React.useCallback((event: StackAuthChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Stack Auth change event handled', { user, session, value });
  }, [user, session]);

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'Event Handling Test'),
    React.createElement('form', {
      key: 'form',
      onSubmit: handleStackAuthEvent
    }, [
      React.createElement('input', {
        key: 'input',
        onChange: handleStackAuthChangeEvent,
        placeholder: 'Test input'
      }),
      React.createElement('button', {
        key: 'button',
        onClick: handleStackAuthMouseEvent,
        type: 'button'
      }, 'Test Button'),
      React.createElement('button', {
        key: 'submit',
        type: 'submit'
      }, 'Submit Form')
    ])
  ]);
};

// =============================================================================
// 5. HIGHER-ORDER COMPONENT TESTS
// =============================================================================

// Test HOC with Stack Auth types
const withStackAuth = <P extends object>(
  Component: React.ComponentType<P & StackAuthComponentProps>
) => {
  const WithStackAuth: React.FC<P> = (props) => {
    const { user, session } = useStackAuthContext();
    
    return React.createElement(Component, {
      ...props,
      user,
      session
    } as P & StackAuthComponentProps);
  };

  WithStackAuth.displayName = `withStackAuth(${Component.displayName || Component.name})`;
  return WithStackAuth;
};

// Test component that uses HOC
const BaseComponent: React.FC<StackAuthComponentProps & { message: string }> = ({ 
  message,
  user,
  session 
}) => {
  return React.createElement('div', null, [
    React.createElement('p', { key: 'message' }, message),
    React.createElement('p', { key: 'user' }, `HOC User: ${user?.displayName || 'None'}`),
    React.createElement('p', { key: 'session' }, `HOC Session: ${session ? 'Active' : 'None'}`)
  ]);
};

const EnhancedComponent = withStackAuth(BaseComponent);

// =============================================================================
// 6. RENDER PROPS PATTERN TESTS
// =============================================================================

// Test render props with Stack Auth types
interface RenderPropsTestProps {
  children: (props: {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
  }) => React.ReactElement;
}

const RenderPropsTest: React.FC<RenderPropsTestProps> = ({ children }) => {
  const { user, session } = useStackAuthContext();
  const [isLoading, setIsLoading] = React.useState(false);

  const signIn = React.useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate sign in
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate sign out
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return children({ user, session, isLoading, signIn, signOut });
};

// =============================================================================
// 7. COMPREHENSIVE COMPONENT INTEGRATION TEST
// =============================================================================

interface ComprehensiveReactTestProps {
  app: StackClientApp;
}

const ComprehensiveReactIntegrationTest: React.FC<ComprehensiveReactTestProps> = ({ app }) => {
  return React.createElement(StackAuthContextProvider, { 
    app,
    children: [
      React.createElement('div', { key: 'container', className: 'comprehensive-react-test' }, [
      React.createElement('h2', { key: 'title' }, 'Comprehensive React Integration Test'),
      
      React.createElement(UseStateIntegrationTest, { key: 'useState' }),
      React.createElement(UseEffectIntegrationTest, { key: 'useEffect', app }),
      React.createElement(UseCallbackIntegrationTest, { key: 'useCallback' }),
      React.createElement(UseMemoIntegrationTest, { key: 'useMemo', user: null, session: null }),
      React.createElement(UseRefIntegrationTest, { key: 'useRef' }),
      
      React.createElement(StackAuthContextConsumer, { key: 'context' }),
      
      React.createElement(ReactFCTest, {
        key: 'reactFC',
        title: 'React.FC Test',
        user: null,
        session: null
      }),
      
      React.createElement(StackAuthFCTest, {
        key: 'stackAuthFC',
        title: 'StackAuthFC Test',
        user: null,
        session: null
      }),
      
      React.createElement(ForwardRefStackAuth, {
        key: 'forwardRef',
        title: 'ForwardRef Test',
        user: null,
        session: null
      }),
      
      React.createElement(EventHandlingTest, {
        key: 'events',
        user: null,
        session: null
      }),
      
      React.createElement(EnhancedComponent, {
        key: 'hoc',
        message: 'HOC Test Message'
      }),
      
      React.createElement(RenderPropsTest, {
        key: 'renderProps',
        children: ({ user, session, isLoading, signIn, signOut }: {
          user: User | null;
          session: Session | null;
          isLoading: boolean;
          signIn: (email: string, password: string) => Promise<void>;
          signOut: () => Promise<void>;
        }) =>
        React.createElement('div', null, [
          React.createElement('h4', { key: 'title' }, 'Render Props Test'),
          React.createElement('p', { key: 'user' }, `Render Props User: ${user?.displayName || 'None'}`),
          React.createElement('p', { key: 'loading' }, `Loading: ${isLoading}`),
          React.createElement('button', {
            key: 'signin',
            onClick: () => signIn('test@example.com', 'password'),
            disabled: isLoading
          }, 'Sign In'),
          React.createElement('button', {
            key: 'signout',
            onClick: signOut,
            disabled: isLoading
          }, 'Sign Out')
        ])
      })
      ])
    ]
  });
};

// =============================================================================
// 8. EXPORTS
// =============================================================================

export {
  UseStateIntegrationTest,
  UseEffectIntegrationTest,
  UseCallbackIntegrationTest,
  UseMemoIntegrationTest,
  UseRefIntegrationTest,
  StackAuthContextProvider,
  useStackAuthContext,
  StackAuthContextConsumer,
  ReactFCTest,
  StackAuthFCTest,
  ForwardRefStackAuth,
  EventHandlingTest,
  withStackAuth,
  RenderPropsTest,
  ComprehensiveReactIntegrationTest,
  StackAuthReactContext
};

export type {
  RenderPropsTestProps,
  ComprehensiveReactTestProps
};

export default {
  ComprehensiveReactIntegrationTest,
  allTests: [
    'UseStateIntegrationTest',
    'UseEffectIntegrationTest', 
    'UseCallbackIntegrationTest',
    'UseMemoIntegrationTest',
    'UseRefIntegrationTest',
    'StackAuthContextConsumer',
    'ReactFCTest',
    'StackAuthFCTest',
    'ForwardRefStackAuth',
    'EventHandlingTest',
    'EnhancedComponent',
    'RenderPropsTest'
  ] as const,
  version: '1.0.0'
};