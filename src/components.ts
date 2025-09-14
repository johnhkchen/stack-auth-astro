/**
 * React component re-exports from Stack Auth UI
 * 
 * This module re-exports Stack Auth's React components for use in Astro
 * with proper TypeScript support, component hydration, and development-time
 * prop validation.
 * 
 * Note: Component exports will be implemented in Sprint 004
 */

import * as React from 'react';

// Mock Stack Auth types for our working implementation
export interface User {
  id: string;
  displayName?: string;
  primaryEmail?: string;
  [key: string]: any;
}

export interface Session {
  id: string;
  [key: string]: any;
}

export interface StackClientApp {
  [key: string]: any;
}

// Component prop types for our Stack Auth components
export interface UserButtonProps {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  [key: string]: any;
}

export interface SignInProps {
  className?: string;
  children?: React.ReactNode;
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
  [key: string]: any;
}

export interface SignUpProps {
  className?: string;
  children?: React.ReactNode;
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
  [key: string]: any;
}

export interface AccountSettingsProps {
  className?: string;
  children?: React.ReactNode;
  user?: User;
  [key: string]: any;
}

export interface StackProviderProps {
  children?: React.ReactNode;
  [key: string]: any;
}

// Enhanced StackProvider props for Astro islands
export interface AstroStackProviderProps extends StackProviderProps {
  initialUser?: User | null;
  initialSession?: Session | null;
}

// Working React Components Implementation

// UserButton Component
export const UserButton: React.FC<UserButtonProps> = ({
  className = '',
  children,
  onClick,
  ...props
}) => {
  const handleClick = () => {
    console.log('UserButton clicked - this would show user menu in production');
    onClick?.();
  };

  return React.createElement(
    'button',
    {
      className: `stack-auth-user-button ${className}`.trim(),
      onClick: handleClick,
      style: {
        padding: '8px 16px',
        border: '1px solid #ccc',
        borderRadius: '6px',
        background: '#f8f9fa',
        cursor: 'pointer',
        fontSize: '14px',
        ...props.style
      },
      ...props
    },
    children || 'User Menu'
  );
};

// SignIn Component  
export const SignIn: React.FC<SignInProps> = ({
  className = '',
  children,
  onSuccess,
  onError,
  ...props
}) => {
  const handleSignIn = () => {
    console.log('SignIn clicked - this would trigger authentication in production');
    
    // Simulate successful sign-in after a short delay
    setTimeout(() => {
      const mockUser: User = {
        id: 'demo-user',
        displayName: 'Demo User',
        primaryEmail: 'demo@example.com'
      };
      onSuccess?.(mockUser);
    }, 1000);
  };

  return React.createElement(
    'div',
    {
      className: `stack-auth-signin ${className}`.trim(),
      style: {
        padding: '20px',
        border: '1px solid #007bff',
        borderRadius: '8px',
        textAlign: 'center',
        backgroundColor: '#f8f9ff',
        ...props.style
      },
      ...props
    },
    children || [
      React.createElement('h3', { key: 'title', style: { margin: '0 0 15px 0' } }, 'Sign In'),
      React.createElement(
        'button',
        {
          key: 'button',
          onClick: handleSignIn,
          style: {
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }
        },
        'Sign In'
      )
    ]
  );
};

// SignUp Component
export const SignUp: React.FC<SignUpProps> = ({
  className = '',
  children,
  onSuccess,
  onError,
  ...props
}) => {
  const handleSignUp = () => {
    console.log('SignUp clicked - this would trigger registration in production');
    
    // Simulate successful sign-up after a short delay
    setTimeout(() => {
      const mockUser: User = {
        id: 'new-user',
        displayName: 'New User',
        primaryEmail: 'new@example.com'
      };
      onSuccess?.(mockUser);
    }, 1000);
  };

  return React.createElement(
    'div',
    {
      className: `stack-auth-signup ${className}`.trim(),
      style: {
        padding: '20px',
        border: '1px solid #28a745',
        borderRadius: '8px',
        textAlign: 'center',
        backgroundColor: '#f8fff9',
        ...props.style
      },
      ...props
    },
    children || [
      React.createElement('h3', { key: 'title', style: { margin: '0 0 15px 0' } }, 'Sign Up'),
      React.createElement(
        'button',
        {
          key: 'button',
          onClick: handleSignUp,
          style: {
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }
        },
        'Create Account'
      )
    ]
  );
};

// AccountSettings Component
export const AccountSettings: React.FC<AccountSettingsProps> = ({
  className = '',
  children,
  user,
  ...props
}) => {
  return React.createElement(
    'div',
    {
      className: `stack-auth-account-settings ${className}`.trim(),
      style: {
        padding: '20px',
        border: '1px solid #6c757d',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        ...props.style
      },
      ...props
    },
    children || [
      React.createElement('h3', { key: 'title', style: { margin: '0 0 15px 0' } }, 'Account Settings'),
      user 
        ? React.createElement('p', { key: 'user-info' }, `Signed in as: ${user.displayName || user.primaryEmail || 'Unknown User'}`)
        : React.createElement('p', { key: 'no-user', style: { fontStyle: 'italic' } }, 'Sign in to access account settings'),
      React.createElement('p', { key: 'features', style: { color: '#666', fontSize: '14px' } }, 'Account management features would appear here in production.')
    ]
  );
};

// StackProvider Component
export const StackProvider: React.FC<StackProviderProps> = ({
  children,
  ...props
}) => {
  // Simple provider that just passes children through
  return React.createElement(React.Fragment, null, children);
};

// AstroStackProvider Component
export const AstroStackProvider: React.FC<AstroStackProviderProps> = ({
  children,
  initialUser,
  initialSession,
  ...props
}) => {
  // Enhanced provider for Astro with initial state support
  return React.createElement(StackProvider, props, children);
};

// Types are already exported as interfaces above

// No default export to avoid mixed exports warning