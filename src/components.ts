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
import type { User, Session, StackClientApp } from '@stackframe/stack';
import { createValidatedComponents } from './component-wrapper.js';

// TODO: Implement component re-exports in Sprint 004
// For now, just provide the module structure with React namespace test

// Test React namespace and types are available
export interface StackAuthComponentProps {
  children?: React.ReactNode;
  className?: string;
  user?: User | null;
  session?: Session | null;
}

// Advanced React component types for Stack Auth integration
export interface StackProviderProps {
  app: StackClientApp;
  children: React.ReactNode;
}

// Test React component compatibility with Stack Auth types
export type StackAuthFC<P = Record<string, never>> = React.ComponentType<P & StackAuthComponentProps>;

// Test React component types
export type ReactFC<P = Record<string, never>> = React.ComponentType<P>;
export type ReactElement = React.ReactElement;
export type ReactComponent<P = Record<string, never>> = React.ComponentType<P>;

// Test React hooks compatibility
export type UseStackAuthHook = () => {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

// Test React context types
export type StackAuthContextType = {
  user: User | null;
  session: Session | null;
  app?: StackClientApp;
};

// Test React ref types for Stack Auth components
export type StackAuthRef<T = HTMLElement> = React.Ref<T>;

// Test React event types that Stack Auth components might use
export type StackAuthEvent<T = Element> = React.SyntheticEvent<T>;
export type StackAuthMouseEvent<T = Element> = React.MouseEvent<T>;
export type StackAuthChangeEvent<T = Element> = React.ChangeEvent<T>;

// Test forwardRef compatibility
export interface ForwardRefStackComponentProps extends StackAuthComponentProps {
  onClick?: (event: StackAuthMouseEvent) => void;
}

// TODO: Sprint 004 - Replace these placeholder components with real Stack Auth UI components
// These are temporary implementations to fix TypeScript compilation in examples

const UserButtonBase: React.FC<StackAuthComponentProps> = ({ className, children, ...props }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  return React.createElement('div', {
    className: className || 'stack-auth-placeholder',
    style: {
      padding: '8px 16px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: '#f5f5f5',
      color: '#666',
      fontFamily: 'sans-serif',
      fontSize: '14px'
    },
    ...props
  }, 'UserButton - Coming in Sprint 004');
};

const SignInBase: React.FC<StackAuthComponentProps> = ({ className, children, ...props }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  return React.createElement('div', {
    className: className || 'stack-auth-placeholder',
    style: {
      padding: '16px',
      border: '1px solid #007acc',
      borderRadius: '4px',
      backgroundColor: '#f0f8ff',
      color: '#007acc',
      fontFamily: 'sans-serif',
      fontSize: '16px',
      textAlign: 'center'
    },
    ...props
  }, 'SignIn Component - Coming in Sprint 004');
};

const SignUpBase: React.FC<StackAuthComponentProps> = ({ className, children, ...props }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  return React.createElement('div', {
    className: className || 'stack-auth-placeholder',
    style: {
      padding: '16px',
      border: '1px solid #28a745',
      borderRadius: '4px',
      backgroundColor: '#f8fff8',
      color: '#28a745',
      fontFamily: 'sans-serif',
      fontSize: '16px',
      textAlign: 'center'
    },
    ...props
  }, 'SignUp Component - Coming in Sprint 004');
};

const AccountSettingsBase: React.FC<StackAuthComponentProps> = ({ className, children, ...props }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  return React.createElement('div', {
    className: className || 'stack-auth-placeholder',
    style: {
      padding: '16px',
      border: '1px solid #6c757d',
      borderRadius: '4px',
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
      fontFamily: 'sans-serif',
      fontSize: '16px',
      textAlign: 'center'
    },
    ...props
  }, 'AccountSettings Component - Coming in Sprint 004');
};

const StackProviderBase: React.FC<StackProviderProps> = ({ app, children }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  return React.createElement('div', {
    'data-stack-provider': 'placeholder',
    style: {
      border: '2px dashed #ffc107',
      padding: '16px',
      backgroundColor: '#fff9e6',
      color: '#856404',
      fontFamily: 'sans-serif'
    }
  }, [
    React.createElement('p', { key: 'title', style: { margin: '0 0 8px 0', fontWeight: 'bold' } }, 'StackProvider - Coming in Sprint 004'),
    React.createElement('div', { key: 'children' }, children)
  ]);
};

// Create validated components with development-time prop validation
const validatedComponents = createValidatedComponents({
  UserButton: UserButtonBase,
  SignIn: SignInBase,
  SignUp: SignUpBase,
  AccountSettings: AccountSettingsBase,
  StackProvider: StackProviderBase
}, {
  enhanced: true // Enable enhanced development features
});

// Export validated components with explicit React.FC typing for examples validation
export const UserButton: React.FC<StackAuthComponentProps> = validatedComponents.UserButton;
export const SignIn: React.FC<StackAuthComponentProps> = validatedComponents.SignIn;
export const SignUp: React.FC<StackAuthComponentProps> = validatedComponents.SignUp;
export const AccountSettings: React.FC<StackAuthComponentProps> = validatedComponents.AccountSettings;
export const StackProvider: React.FC<StackProviderProps> = validatedComponents.StackProvider;

// No default export to avoid mixed exports warning