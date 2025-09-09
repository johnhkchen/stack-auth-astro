/**
 * TypeScript Configuration Validation
 * 
 * This file tests various TypeScript compiler configurations to ensure
 * Stack Auth React type definitions work correctly across different
 * compilation scenarios and strictness levels.
 * 
 * Sprint: 001
 * Task: 1.2.4 - React Type Integration Testing
 */

// Import dependencies that should work across all TS configurations
import * as React from 'react';
import type { User, Session, StackClientApp } from '@stackframe/stack';
import type { 
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC
} from './components';

// =============================================================================
// 1. STRICT MODE COMPATIBILITY TESTS
// =============================================================================

// Test that works with strict: true and all strict flags enabled
interface StrictModeTestProps {
  user: User | null;                    // strictNullChecks compatibility
  session: Session | null;              // strictNullChecks compatibility
  onUserClick: (user: User) => void;    // strictFunctionTypes compatibility
  optionalCallback?: () => void;        // exactOptionalPropertyTypes compatibility
}

const StrictModeComponent: React.FC<StrictModeTestProps> = ({ 
  user, 
  session, 
  onUserClick, 
  optionalCallback 
}) => {
  // Test noImplicitAny - all variables should have explicit types
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    
    // Test strictNullChecks - must check for null before using
    if (user !== null) {
      onUserClick(user);
    }
    
    // Test exactOptionalPropertyTypes - optional callback handling
    if (optionalCallback !== undefined) {
      optionalCallback();
    }
  };

  // Test strictBindCallApply - this binding should be properly typed
  const boundHandler = handleClick.bind(null);

  // Test noImplicitReturns - all code paths must return a value
  const getUserDisplayName = (u: User | null): string => {
    if (u === null) {
      return 'Anonymous';
    } else {
      return u.displayName || u.primaryEmail || 'Unknown User';
    }
  };

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'Strict Mode Test'),
    React.createElement('p', { key: 'user' }, getUserDisplayName(user)),
    React.createElement('p', { key: 'session' }, session ? 'Session active' : 'No session'),
    React.createElement('button', { 
      key: 'button',
      onClick: handleClick 
    }, 'Test Click')
  ]);
};

// =============================================================================
// 2. LOOSE MODE COMPATIBILITY TESTS
// =============================================================================

// Test that works with strict: false - more permissive typing
interface LooseModeTestProps {
  user: any;                           // Should work in loose mode
  session?: any;                       // Optional any type
  callback?: Function;                 // Generic Function type
  data?: object;                       // Generic object type
}

const LooseModeComponent: React.FC<LooseModeTestProps> = ({ 
  user, 
  session, 
  callback,
  data
}) => {
  // In loose mode, these should not cause errors even without explicit typing
  const handleEvent = (e) => {
    e.preventDefault();
    
    // Should work without strict null checks
    const userName = user.displayName || user.primaryEmail;
    
    if (callback) {
      callback(user, session);
    }
  };

  // Implicit return types should be allowed
  const processData = (input) => {
    if (input) {
      return input.toString();
    }
    // Missing return statement should be allowed in loose mode
  };

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'Loose Mode Test'),
    React.createElement('p', { key: 'info' }, `User: ${user?.displayName || 'None'}`),
    React.createElement('button', { 
      key: 'button',
      onClick: handleEvent 
    }, 'Loose Mode Click')
  ]);
};

// =============================================================================
// 3. MODULE RESOLUTION COMPATIBILITY TESTS
// =============================================================================

// Test imports that should work with different moduleResolution settings

// Classic module resolution test
const ClassicModuleTest: React.FC = () => {
  // These imports should resolve in classic mode
  const [user, setUser] = React.useState<User | null>(null);
  
  React.useEffect(() => {
    // Test that Stack Auth types work with classic module resolution
    setUser(null);
  }, []);

  return React.createElement('div', null, 'Classic Module Test');
};

// Node16 module resolution test  
const Node16ModuleTest: React.FC = () => {
  // These should work with Node16 module resolution
  const userRef = React.useRef<User | null>(null);
  
  const handleUserUpdate = React.useCallback((newUser: User | null) => {
    userRef.current = newUser;
  }, []);

  return React.createElement('div', null, 'Node16 Module Test');
};

// Bundler module resolution test
const BundlerModuleTest: React.FC = () => {
  // Should work with bundler module resolution (default)
  const [session, setSession] = React.useState<Session | null>(null);
  
  return React.createElement('div', null, 'Bundler Module Test');
};

// =============================================================================
// 4. TARGET COMPATIBILITY TESTS
// =============================================================================

// ES2018 compatibility test
const ES2018CompatibilityTest: React.FC = () => {
  // Use features available in ES2018
  const data = {
    user: null as User | null,
    session: null as Session | null,
    ...{ additionalProp: 'test' }  // Object spread
  };

  // Async/await should work in ES2018
  const handleAsync = async (): Promise<void> => {
    try {
      // Promise-based operations
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Async error:', error);
    }
  };

  return React.createElement('div', null, 'ES2018 Compatibility Test');
};

// ES2020 compatibility test
const ES2020CompatibilityTest: React.FC = () => {
  // Use features available in ES2020
  const testUser: User | null = null;
  
  // Optional chaining (ES2020) - Type assertion to help TypeScript
  const userName = (testUser as User | null)?.displayName ?? 'Anonymous';
  
  // Nullish coalescing (ES2020) - Type assertion to help TypeScript  
  const email = (testUser as User | null)?.primaryEmail ?? 'no-email@example.com';
  
  // BigInt support (ES2020)
  const bigNumber = BigInt(123456789);

  return React.createElement('div', null, [
    React.createElement('p', { key: 'user' }, `User: ${userName}`),
    React.createElement('p', { key: 'email' }, `Email: ${email}`),
    React.createElement('p', { key: 'big' }, `Big number: ${bigNumber.toString()}`)
  ]);
};

// ES2022 compatibility test
const ES2022CompatibilityTest: React.FC = () => {
  // Use features available in ES2022
  const userData = {
    #privateField: 'private data'  // Private fields (ES2022)
  };

  // Top-level await should be supported (though not used here)
  // Class static blocks would be available (ES2022)

  return React.createElement('div', null, 'ES2022 Compatibility Test');
};

// =============================================================================
// 5. LIBRARY COMPATIBILITY TESTS
// =============================================================================

// DOM library compatibility test
const DOMCompatibilityTest: React.FC = () => {
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Test DOM API availability
    if (elementRef.current) {
      const element = elementRef.current;
      element.addEventListener('click', () => {
        console.log('DOM event handled');
      });
      
      // Test DOM manipulation
      element.style.backgroundColor = 'lightblue';
      element.setAttribute('data-test', 'dom-compatibility');
    }
  }, []);

  return React.createElement('div', { 
    ref: elementRef 
  }, 'DOM Compatibility Test');
};

// ES6 lib compatibility test
const ES6LibCompatibilityTest: React.FC = () => {
  // Test ES6 features
  const map = new Map<string, User | null>();
  const set = new Set<string>();
  const weakMap = new WeakMap();
  
  // Array methods
  const users: (User | null)[] = [null];
  const filteredUsers = users.filter(Boolean);
  const userIds = users.map(u => u?.id).filter(id => id !== undefined);

  // String methods
  const testString = 'Stack Auth Integration';
  const includesStack = testString.includes('Stack');

  return React.createElement('div', null, 'ES6 Lib Compatibility Test');
};

// =============================================================================
// 6. COMPREHENSIVE CONFIGURATION TEST COMPONENT
// =============================================================================

interface ConfigurationTestProps {
  config: string;
  user?: User | null;
  session?: Session | null;
}

const ConfigurationTestComponent: React.FC<ConfigurationTestProps> = ({
  config,
  user,
  session
}) => {
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Test that the configuration works with React effects
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Render appropriate test based on configuration
  const renderConfigTest = (): React.ReactElement => {
    switch (config) {
      case 'strict':
        return React.createElement(StrictModeComponent, {
          user,
          session,
          onUserClick: (u: User) => console.log('Strict mode user click:', u)
        });
      
      case 'loose':
        return React.createElement(LooseModeComponent, {
          user,
          session,
          callback: (u: any, s: any) => console.log('Loose mode callback:', { u, s })
        });
      
      case 'node16':
        return React.createElement(Node16ModuleTest);
      
      case 'classic':
        return React.createElement(ClassicModuleTest);
      
      case 'bundler':
        return React.createElement(BundlerModuleTest);
      
      case 'es2018':
        return React.createElement(ES2018CompatibilityTest);
      
      case 'es2020':
        return React.createElement(ES2020CompatibilityTest);
      
      case 'es2022':
        return React.createElement(ES2022CompatibilityTest);
      
      case 'dom':
        return React.createElement(DOMCompatibilityTest);
      
      case 'es6':
        return React.createElement(ES6LibCompatibilityTest);
      
      default:
        return React.createElement('div', null, `Unknown config: ${config}`);
    }
  };

  return React.createElement('div', {
    className: `config-test config-test--${config}`,
    'data-loaded': isLoaded
  }, [
    React.createElement('h2', { key: 'title' }, `Configuration Test: ${config}`),
    React.createElement('p', { key: 'status' }, `Loaded: ${isLoaded}`),
    renderConfigTest()
  ]);
};

// =============================================================================
// 7. EXPORTS FOR TESTING
// =============================================================================

export {
  StrictModeComponent,
  LooseModeComponent,
  ClassicModuleTest,
  Node16ModuleTest,
  BundlerModuleTest,
  ES2018CompatibilityTest,
  ES2020CompatibilityTest,
  ES2022CompatibilityTest,
  DOMCompatibilityTest,
  ES6LibCompatibilityTest,
  ConfigurationTestComponent
};

export type {
  StrictModeTestProps,
  LooseModeTestProps,
  ConfigurationTestProps
};

export default {
  ConfigurationTestComponent,
  configs: [
    'strict',
    'loose', 
    'node16',
    'classic',
    'bundler',
    'es2018',
    'es2020',
    'es2022',
    'dom',
    'es6'
  ]
};