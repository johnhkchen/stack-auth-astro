/**
 * TypeScript Type Validation for React Component Definitions
 * 
 * This file validates that all React type definitions in components.ts
 * compile correctly and provide the expected TypeScript support for
 * Stack Auth UI components.
 * 
 * Sprint: 001
 * Task: 1.2.3 - Validate Enhanced React Type Definitions
 */

import * as React from 'react';
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
} from './components';
import type { User, Session, StackClientApp } from '@stackframe/stack';

// =============================================================================
// 1. Test React.FC Compatibility with StackAuthFC Type
// =============================================================================

// Test basic React.FC usage
const BasicReactFC: ReactFC<{ title: string }> = ({ title }) => {
  return React.createElement('div', null, title);
};

// Test StackAuthFC with props
interface CustomProps {
  title: string;
  onClick?: () => void;
}

const StackAuthComponent: StackAuthFC<CustomProps> = ({ 
  title, 
  onClick, 
  children, 
  className, 
  user, 
  session 
}) => {
  return React.createElement('div', {
    className,
    onClick
  }, [
    React.createElement('h1', { key: 'title' }, title),
    children,
    user ? React.createElement('span', { key: 'user' }, `User: ${user.displayName}`) : null
  ]);
};

// Test React.FC assignment compatibility (with proper type casting for validation)
const TestFCAssignment: React.FC<StackAuthComponentProps & CustomProps> = StackAuthComponent;

// =============================================================================
// 2. Validate React Context Types with useContext Hook
// =============================================================================

// Create test context using StackAuthContextType
const StackAuthContext = React.createContext<StackAuthContextType>({
  user: null,
  session: null
});

// Test useContext hook with our context type
const useStackAuthContext = (): StackAuthContextType => {
  const context = React.useContext(StackAuthContext);
  return context;
};

// Test custom hook that uses our context
const TestContextComponent: React.FC = () => {
  const { user, session, app } = useStackAuthContext();
  
  return React.createElement('div', null, [
    user ? React.createElement('span', { key: 'user' }, user.displayName) : null,
    session ? React.createElement('span', { key: 'session' }, 'Authenticated') : null
  ]);
};

// =============================================================================
// 3. Test React Event Types Compilation
// =============================================================================

// Test event handler functions with Stack Auth event types
const handleStackAuthEvent = (event: StackAuthEvent): void => {
  event.preventDefault();
};

const handleStackAuthMouseEvent = (event: StackAuthMouseEvent): void => {
  event.preventDefault();
  event.stopPropagation();
};

const handleStackAuthChangeEvent = (event: StackAuthChangeEvent<HTMLInputElement>): void => {
  const value = event.target.value;
  console.log('Input value:', value);
};

// Test component with event handlers
interface EventTestProps {
  onSubmit?: (event: StackAuthEvent) => void;
  onClick?: (event: StackAuthMouseEvent) => void;
  onChange?: (event: StackAuthChangeEvent<HTMLInputElement>) => void;
}

const EventTestComponent: ReactFC<EventTestProps> = ({ onSubmit, onClick, onChange }) => {
  return React.createElement('form', {
    onSubmit
  }, [
    React.createElement('button', {
      key: 'button',
      onClick
    }, 'Click me'),
    React.createElement('input', {
      key: 'input',
      onChange
    })
  ]);
};

// =============================================================================
// 4. Test React Ref Types with forwardRef Patterns
// =============================================================================

// Test basic ref usage
const TestRefComponent: React.FC<{ ref?: StackAuthRef<HTMLDivElement> }> = 
  React.forwardRef<HTMLDivElement, {}>((props, ref) => {
    return React.createElement('div', { ref }, 'Test component with ref');
  });

// Test forwardRef with Stack Auth component props
const ForwardRefStackComponent = React.forwardRef<
  HTMLButtonElement,
  ForwardRefStackComponentProps
>(({ onClick, children, className, user, session }, ref) => {
  return React.createElement('button', {
    ref,
    className,
    onClick
  }, [
    children,
    user ? React.createElement('span', { key: 'user' }, ` (${user.displayName})`) : null
  ]);
});

// Test ref assignment
const testRef: StackAuthRef<HTMLButtonElement> = React.useRef<HTMLButtonElement>(null);

// =============================================================================
// 5. Test Hook Type Definition
// =============================================================================

// Mock implementation of useStackAuth hook that matches our type definition
const useStackAuth: UseStackAuthHook = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  return {
    user,
    session,
    isLoading
  };
};

// Test hook usage in component
const HookTestComponent: React.FC = () => {
  const { user, session, isLoading } = useStackAuth();

  if (isLoading) {
    return React.createElement('div', null, 'Loading...');
  }

  return React.createElement('div', null, [
    React.createElement('p', { key: 'user' }, user ? `Hello, ${user.displayName}` : 'Not authenticated'),
    React.createElement('p', { key: 'session' }, session ? 'Session active' : 'No session')
  ]);
};

// =============================================================================
// 6. Test Stack Provider Props
// =============================================================================

// Mock StackClientApp for testing
const mockStackApp: StackClientApp = {} as StackClientApp;

// Test StackProvider props type
const TestStackProvider: React.FC<StackProviderProps> = ({ app, children }) => {
  return React.createElement('div', {
    'data-stack-app': app ? 'initialized' : 'not-initialized'
  }, children);
};

// Test provider usage
const ProviderTestComponent: React.FC = () => {
  return React.createElement(TestStackProvider, {
    app: mockStackApp,
    children: React.createElement('div', null, 'Provider content')
  });
};

// =============================================================================
// 7. Complex Type Composition Test
// =============================================================================

// Test complex component that uses multiple type definitions
interface ComplexComponentProps extends StackAuthComponentProps {
  title: string;
  onUserClick?: (user: User, event: StackAuthMouseEvent) => void;
  onSessionChange?: (session: Session | null) => void;
  ref?: StackAuthRef<HTMLDivElement>;
}

const ComplexStackAuthComponent = React.forwardRef<HTMLDivElement, ComplexComponentProps>(
  ({ title, onUserClick, onSessionChange, user, session, children, className }, ref) => {
    
    React.useEffect(() => {
      if (onSessionChange) {
        onSessionChange(session ?? null);
      }
    }, [session, onSessionChange]);

    const handleUserClick = (event: StackAuthMouseEvent) => {
      if (user && onUserClick) {
        onUserClick(user, event);
      }
    };

    return React.createElement('div', {
      ref,
      className
    }, [
      React.createElement('h2', { key: 'title' }, title),
      user ? React.createElement('button', {
        key: 'user-button',
        onClick: handleUserClick
      }, `Click for ${user.displayName}`) : null,
      children
    ]);
  }
);

// =============================================================================
// Export validation types for potential testing usage
// =============================================================================

export type ValidationTypes = {
  StackAuthFC: typeof StackAuthComponent;
  EventHandlers: typeof handleStackAuthEvent;
  RefComponent: typeof ForwardRefStackComponent;
  Hook: typeof useStackAuth;
  Context: typeof StackAuthContext;
  Provider: typeof TestStackProvider;
  Complex: typeof ComplexStackAuthComponent;
};

export default {};