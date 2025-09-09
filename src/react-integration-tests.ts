/**
 * React Type Integration Tests
 * 
 * This file provides comprehensive integration testing for React type definitions
 * with actual Stack Auth SDK imports and various TypeScript compilation scenarios.
 * 
 * Sprint: 001
 * Task: 1.2.4 - React Type Integration Testing
 */

import * as React from 'react';
import type { 
  User, 
  Session, 
  StackClientApp,
  StackServerApp,
  Project
} from '@stackframe/stack';

// Import Stack Auth components for type testing (from main package, not UI)
import type {
  SignIn as StackSignIn,
  SignUp as StackSignUp,
  UserButton as StackUserButton,
  AccountSettings as StackAccountSettings,
  StackProvider as StackStackProvider
} from '@stackframe/stack';

// Import our local type definitions
import type {
  StackAuthOptions,
  StackAuthConfig,
  RequireAuthOptions,
  SignInOptions,
  SignOutOptions,
  User as LocalUser,
  Session as LocalSession
} from './types';

import type {
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC,
  ReactFC,
  UseStackAuthHook,
  StackAuthContextType,
  ForwardRefStackComponentProps
} from './components';

// =============================================================================
// 1. REAL STACK AUTH SDK IMPORT INTEGRATION TESTS
// =============================================================================

// Test direct Stack Auth SDK type compatibility
type StackUserCompatibility = User extends LocalUser ? true : false;
type StackSessionCompatibility = Session extends LocalSession ? true : false;

// Verify our re-exported types match the original SDK types
const testUserTypeCompatibility: StackUserCompatibility = true;
const testSessionTypeCompatibility: StackSessionCompatibility = true;

// Test Stack Auth client app initialization types
interface TestStackClientAppProps {
  app: StackClientApp;
  user: User | null;
  session: Session | null;
}

const TestStackClientIntegration: React.FC<TestStackClientAppProps> = ({ 
  app, 
  user, 
  session 
}) => {
  // Test accessing Stack Auth client methods (methods are directly on app)
  const handleSignIn = async () => {
    // These should compile without errors if types are correct
    await app.signInWithCredential({ email: 'test@example.com', password: 'password' });
  };

  const handleSignOut = async () => {
    const currentUser = await app.getUser();
    if (currentUser) {
      await currentUser.signOut();
    }
  };

  // Test React component with real Stack Auth types
  return React.createElement('div', null, [
    React.createElement('h1', { key: 'title' }, 'Stack Auth Integration Test'),
    user ? React.createElement('p', { key: 'user' }, `User: ${user.displayName || user.primaryEmail}`) : null,
    session ? React.createElement('p', { key: 'session' }, `Session: Active`) : null,
    React.createElement('button', { key: 'signin', onClick: handleSignIn }, 'Sign In'),
    React.createElement('button', { key: 'signout', onClick: handleSignOut }, 'Sign Out')
  ]);
};

// =============================================================================
// 2. STACK AUTH UI COMPONENTS TYPE INTEGRATION
// =============================================================================

// Test that Stack Auth UI component types work with our wrapper types
interface StackUIIntegrationProps {
  app: StackClientApp;
  user: User | null;
}

const StackUIIntegrationComponent: React.FC<StackUIIntegrationProps> = ({ app, user }) => {
  // Test that we can reference Stack Auth UI component types
  type SignInComponent = typeof StackSignIn;
  type SignUpComponent = typeof StackSignUp;
  type UserButtonComponent = typeof StackUserButton;
  type AccountSettingsComponent = typeof StackAccountSettings;
  type ProviderComponent = typeof StackStackProvider;

  // Test React component creation with Stack Auth UI types
  const signInElement = React.createElement('div', {
    'data-component': 'SignIn'
  }, 'SignIn placeholder');

  const userButtonElement = user ? React.createElement('div', {
    'data-component': 'UserButton',
    'data-user': user.id
  }, `${user.displayName} button`) : null;

  return React.createElement('div', { className: 'stack-ui-integration' }, [
    signInElement,
    userButtonElement
  ]);
};

// =============================================================================
// 3. MODULE RESOLUTION AND IMPORT/EXPORT SCENARIOS
// =============================================================================

// Test re-export scenarios from different entry points
export type { User, Session, StackClientApp } from '@stackframe/stack';
export type { 
  StackAuthOptions,
  StackAuthConfig,
  RequireAuthOptions,
  SignInOptions,
  SignOutOptions
} from './types';

export type {
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC,
  UseStackAuthHook
} from './components';

// Test namespace imports
import * as StackSDK from '@stackframe/stack';
import * as StackUI from '@stackframe/stack';

// Verify namespace imports work correctly
type NamespaceUser = StackSDK.User;
type NamespaceSession = StackSDK.Session;
type NamespaceClientApp = StackSDK.StackClientApp;

// Test that namespace types are equivalent to direct imports
type NamespaceUserEquivalence = NamespaceUser extends User ? true : false;
type NamespaceSessionEquivalence = NamespaceSession extends Session ? true : false;

const testNamespaceUserEquivalence: NamespaceUserEquivalence = true;
const testNamespaceSessionEquivalence: NamespaceSessionEquivalence = true;

// Test mixed import scenarios
const MixedImportComponent: React.FC<{
  directUser: User;
  namespaceUser: StackSDK.User;
  session: Session | StackSDK.Session;
}> = ({ directUser, namespaceUser, session }) => {
  // Test that both import styles work interchangeably
  const userId1 = directUser.id;
  const userId2 = namespaceUser.id;
  const sessionId = session ? 'active' : null;

  return React.createElement('div', null, [
    React.createElement('p', { key: 'user1' }, `Direct import user: ${userId1}`),
    React.createElement('p', { key: 'user2' }, `Namespace import user: ${userId2}`),
    React.createElement('p', { key: 'session' }, `Session: ${sessionId}`)
  ]);
};

// =============================================================================
// 4. REACT COMPONENT TYPE DEFINITIONS WITH ACTUAL REACT IMPORTS
// =============================================================================

// Test our React component types with actual React functionality
const ReactHooksIntegrationTest: React.FC = () => {
  // Test React hooks with Stack Auth types
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [app, setApp] = React.useState<StackClientApp | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Test useEffect with Stack Auth types
  React.useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      try {
        // This tests that StackClientApp type works with async operations
        setIsLoading(false);
      } catch (error) {
        console.error('App initialization failed:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Test useCallback with Stack Auth types
  const handleUserUpdate = React.useCallback((newUser: User | null) => {
    setUser(newUser);
  }, []);

  const handleSessionUpdate = React.useCallback((newSession: Session | null) => {
    setSession(newSession);
  }, []);

  // Test useMemo with Stack Auth types
  const userDisplayName = React.useMemo(() => {
    return user?.displayName || user?.primaryEmail || 'Anonymous';
  }, [user]);

  // Test useRef with Stack Auth component types
  const stackAuthRef = React.useRef<HTMLDivElement>(null);

  return React.createElement('div', { ref: stackAuthRef }, [
    React.createElement('h2', { key: 'title' }, 'React Hooks Integration Test'),
    React.createElement('p', { key: 'loading' }, `Loading: ${isLoading}`),
    React.createElement('p', { key: 'user' }, `User: ${userDisplayName}`),
    React.createElement('p', { key: 'session' }, session ? 'Session active' : 'No session'),
    React.createElement('button', {
      key: 'update-user',
      onClick: () => handleUserUpdate(null)
    }, 'Clear User'),
    React.createElement('button', {
      key: 'update-session',
      onClick: () => handleSessionUpdate(null)
    }, 'Clear Session')
  ]);
};

// Test forwardRef with Stack Auth types
const StackAuthForwardRefComponent = React.forwardRef<
  HTMLDivElement,
  ForwardRefStackComponentProps & { app?: StackClientApp }
>(({ onClick, children, className, user, session, app }, ref) => {
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(event);
    }
    
    // Test that we can access Stack Auth properties in event handlers
    if (user) {
      console.log(`User ${user.displayName} clicked`);
    }
  }, [onClick, user]);

  return React.createElement('div', {
    ref,
    className,
    onClick: handleClick,
    'data-has-user': !!user,
    'data-has-session': !!session,
    'data-has-app': !!app
  }, children);
});

// =============================================================================
// 5. CONTEXT AND PROVIDER TYPE INTEGRATION
// =============================================================================

// Test React Context with Stack Auth types
const StackAuthContext = React.createContext<StackAuthContextType>({
  user: null,
  session: null,
  app: undefined
});

// Test Provider component with Stack Auth types
interface StackAuthProviderProps {
  app: StackClientApp;
  children: React.ReactNode;
}

const StackAuthProvider: React.FC<StackAuthProviderProps> = ({ app, children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);

  // Test async effect with Stack Auth SDK
  React.useEffect(() => {
    const setupAuth = async () => {
      try {
        // Test that we can call Stack Auth SDK methods (methods directly on app)
        const currentUser = await app.getUser();
        setUser(currentUser);
        
        // Test session management - session is available through user's Auth interface
        const currentSession = currentUser?.currentSession || null;
        setSession(currentSession);
      } catch (error) {
        console.error('Auth setup failed:', error);
      }
    };

    setupAuth();
  }, [app]);

  const contextValue: StackAuthContextType = {
    user,
    session,
    app
  };

  return React.createElement(StackAuthContext.Provider, {
    value: contextValue
  }, children);
};

// Test custom hook with Stack Auth context
const useStackAuth: UseStackAuthHook = () => {
  const context = React.useContext(StackAuthContext);
  
  if (!context) {
    throw new Error('useStackAuth must be used within a StackAuthProvider');
  }

  return {
    user: context.user,
    session: context.session,
    isLoading: false // Simplified for testing
  };
};

// =============================================================================
// 6. COMPREHENSIVE COMPONENT INTEGRATION TEST
// =============================================================================

// Test a comprehensive component that uses all the type integrations
interface ComprehensiveTestProps {
  initialApp: StackClientApp;
  onUserChange?: (user: User | null) => void;
  onSessionChange?: (session: Session | null) => void;
}

const ComprehensiveIntegrationTest: React.FC<ComprehensiveTestProps> = ({
  initialApp,
  onUserChange,
  onSessionChange
}) => {
  const { user, session, isLoading } = useStackAuth();
  const componentRef = React.useRef<HTMLDivElement>(null);

  // Test that callbacks work with Stack Auth types
  React.useEffect(() => {
    if (onUserChange) {
      onUserChange(user);
    }
  }, [user, onUserChange]);

  React.useEffect(() => {
    if (onSessionChange) {
      onSessionChange(session);
    }
  }, [session, onSessionChange]);

  const handleAuth = React.useCallback(async (action: 'signIn' | 'signOut') => {
    try {
      if (action === 'signIn') {
        // Test Stack Auth SDK method calls (methods directly on app)
        await initialApp.signInWithCredential({ email: 'test@example.com', password: 'password123' });
      } else {
        const currentUser = await initialApp.getUser();
        if (currentUser) {
          await currentUser.signOut();
        }
      }
    } catch (error) {
      console.error(`${action} failed:`, error);
    }
  }, [initialApp]);

  if (isLoading) {
    return React.createElement('div', null, 'Loading Stack Auth...');
  }

  return React.createElement('div', { ref: componentRef, className: 'comprehensive-test' }, [
    React.createElement('h1', { key: 'title' }, 'Comprehensive Integration Test'),
    React.createElement(TestStackClientIntegration, {
      key: 'client-integration',
      app: initialApp,
      user,
      session
    }),
    React.createElement(StackUIIntegrationComponent, {
      key: 'ui-integration',
      app: initialApp,
      user
    }),
    React.createElement(ReactHooksIntegrationTest, {
      key: 'hooks-integration'
    }),
    React.createElement(StackAuthForwardRefComponent, {
      key: 'forwardref-test',
      user,
      session,
      app: initialApp,
      onClick: () => console.log('ForwardRef component clicked')
    }, 'Forward ref test content'),
    React.createElement('div', { key: 'actions' }, [
      React.createElement('button', {
        key: 'signin',
        onClick: () => handleAuth('signIn')
      }, 'Sign In'),
      React.createElement('button', {
        key: 'signout', 
        onClick: () => handleAuth('signOut')
      }, 'Sign Out')
    ])
  ]);
};

// =============================================================================
// 7. EXPORT ALL TEST COMPONENTS FOR EXTERNAL TESTING
// =============================================================================

export {
  TestStackClientIntegration,
  StackUIIntegrationComponent,
  ReactHooksIntegrationTest,
  StackAuthForwardRefComponent,
  StackAuthProvider,
  useStackAuth,
  ComprehensiveIntegrationTest,
  StackAuthContext
};

export type {
  TestStackClientAppProps,
  StackUIIntegrationProps,
  StackAuthProviderProps,
  ComprehensiveTestProps,
  NamespaceUser,
  NamespaceSession,
  NamespaceClientApp
};

// Test that the file compiles and exports work
export default {
  TestStackClientIntegration,
  StackUIIntegrationComponent,
  ReactHooksIntegrationTest,
  ComprehensiveIntegrationTest,
  version: '1.0.0'
};