# React Type Usage Patterns for Sprint 004

This document provides comprehensive usage patterns for React type definitions in Stack Auth Astro integration, validated in Sprint 001 Task 1.2.3.

## Overview

The React type definitions in `components.ts` have been fully validated and provide comprehensive TypeScript support for Stack Auth UI components. This document outlines how to use these types in Sprint 004 implementation.

## Validated Type Definitions

### Core Component Types

#### StackAuthFC
```typescript
// Basic usage for Stack Auth components
const MyComponent: StackAuthFC<{ title: string }> = ({ 
  title, 
  user, 
  session, 
  children, 
  className 
}) => {
  return <div className={className}>
    <h1>{title}</h1>
    {user && <span>Welcome, {user.displayName}</span>}
    {children}
  </div>;
};
```

#### StackAuthComponentProps
```typescript
// Base props that all Stack Auth components receive
interface CustomComponentProps extends StackAuthComponentProps {
  additionalProp: string;
}
```

### Context Integration

#### StackAuthContextType
```typescript
// Create Stack Auth context
const StackAuthContext = React.createContext<StackAuthContextType>({
  user: null,
  session: null,
  app: undefined
});

// Custom hook for accessing Stack Auth context
const useStackAuth = (): StackAuthContextType => {
  return React.useContext(StackAuthContext);
};

// Component using context
const AuthenticatedComponent: React.FC = () => {
  const { user, session } = useStackAuth();
  
  if (!user) return <div>Please sign in</div>;
  
  return <div>Welcome, {user.displayName}</div>;
};
```

### Event Handling

#### Stack Auth Event Types
```typescript
// Event handlers with proper typing
const handleSignIn = (event: StackAuthMouseEvent) => {
  event.preventDefault();
  // Handle sign in logic
};

const handleFormSubmit = (event: StackAuthEvent<HTMLFormElement>) => {
  event.preventDefault();
  // Handle form submission
};

const handleInputChange = (event: StackAuthChangeEvent<HTMLInputElement>) => {
  const value = event.target.value;
  // Handle input change
};

// Component with event handlers
const SignInForm: React.FC = () => {
  return (
    <form onSubmit={handleFormSubmit}>
      <input onChange={handleInputChange} />
      <button onClick={handleSignIn}>Sign In</button>
    </form>
  );
};
```

### Ref Forwarding

#### StackAuthRef and forwardRef Patterns
```typescript
// Component with ref forwarding
const StackAuthButton = React.forwardRef<
  HTMLButtonElement, 
  ForwardRefStackComponentProps
>(({ onClick, children, className, user }, ref) => {
  return (
    <button ref={ref} className={className} onClick={onClick}>
      {children}
      {user && <span> ({user.displayName})</span>}
    </button>
  );
});

// Usage with ref
const MyComponent: React.FC = () => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  
  return (
    <StackAuthButton 
      ref={buttonRef}
      onClick={(e) => console.log('clicked')}
    >
      Click me
    </StackAuthButton>
  );
};
```

### Hook Patterns

#### UseStackAuthHook
```typescript
// Implementation pattern for Stack Auth hooks
const useStackAuth: UseStackAuthHook = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Hook logic here

  return {
    user,
    session,
    isLoading
  };
};

// Usage in components
const UserProfile: React.FC = () => {
  const { user, session, isLoading } = useStackAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return <div>User: {user.displayName}</div>;
};
```

### Provider Patterns

#### StackProviderProps
```typescript
// Stack Auth provider implementation
const StackProvider: React.FC<StackProviderProps> = ({ app, children }) => {
  return (
    <StackAuthContext.Provider value={{ 
      user: null, 
      session: null, 
      app 
    }}>
      {children}
    </StackAuthContext.Provider>
  );
};

// Usage
const App: React.FC = () => {
  const stackApp = useStackApp(); // from @stackframe/stack
  
  return (
    <StackProvider app={stackApp}>
      <UserProfile />
      <SignInForm />
    </StackProvider>
  );
};
```

## Complex Component Pattern

### Multi-Type Integration
```typescript
// Complex component using multiple type patterns
interface AdvancedComponentProps extends StackAuthComponentProps {
  title: string;
  onUserAction?: (user: User, event: StackAuthMouseEvent) => void;
  onSessionChange?: (session: Session | null) => void;
}

const AdvancedStackComponent = React.forwardRef<
  HTMLDivElement, 
  AdvancedComponentProps
>(({ 
  title, 
  onUserAction, 
  onSessionChange, 
  user, 
  session, 
  children, 
  className 
}, ref) => {
  
  // Effect with proper session handling
  React.useEffect(() => {
    if (onSessionChange) {
      onSessionChange(session ?? null);
    }
  }, [session, onSessionChange]);

  // Event handler with user validation
  const handleUserClick = (event: StackAuthMouseEvent) => {
    if (user && onUserAction) {
      onUserAction(user, event);
    }
  };

  return (
    <div ref={ref} className={className}>
      <h2>{title}</h2>
      {user && (
        <button onClick={handleUserClick}>
          Action for {user.displayName}
        </button>
      )}
      {children}
    </div>
  );
});
```

## Sprint 004 Implementation Guidelines

### Component Re-exports
When implementing component re-exports in Sprint 004:

```typescript
// Re-export Stack Auth UI components with proper typing
export { 
  SignIn as StackSignIn,
  SignUp as StackSignUp,
  UserButton as StackUserButton,
  AccountSettings as StackAccountSettings 
} from '@stackframe/stack-ui';

// Re-export provider with proper typing
export { StackProvider } from '@stackframe/stack';

// Export our enhanced types for consumer usage
export type {
  StackAuthFC,
  StackAuthComponentProps,
  UseStackAuthHook,
  StackAuthContextType,
  StackProviderProps
} from './components';
```

### Astro Integration
For Astro component usage:

```astro
---
// Component script with proper typing
import type { StackAuthFC } from 'astro-stack-auth/components';
import { StackSignIn } from 'astro-stack-auth/components';
---

<!-- Stack Auth component with Astro hydration -->
<StackSignIn client:load />
```

## Validation Status

✅ **All type definitions validated and compile successfully**
- React.FC compatibility confirmed
- Context types work with useContext hook
- Event types compile with proper handlers
- Ref types work with forwardRef patterns
- Complex type composition functions correctly
- Full TypeScript compilation passes

## Next Steps for Sprint 004

1. Implement actual component re-exports using these validated patterns
2. Add Stack Auth UI component wrappers with enhanced TypeScript support
3. Create provider component with proper context integration
4. Add Astro-specific component optimizations
5. Implement proper hydration patterns for Astro islands

All type definitions are ready for Sprint 004 implementation with comprehensive TypeScript support and validation.