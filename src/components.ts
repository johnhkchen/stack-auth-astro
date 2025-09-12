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
import {
  SignIn as StackSignIn,
  SignUp as StackSignUp,
  UserButton as StackUserButton,
  AccountSettings as StackAccountSettings,
  StackProvider as StackStackProvider
} from '@stackframe/stack';
import { createValidatedComponents } from './component-wrapper.js';

// Real Stack Auth component re-exports with validation wrapper integration

// Component prop types derived from Stack Auth components
export type UserButtonProps = React.ComponentProps<typeof StackUserButton>;
export type SignInProps = React.ComponentProps<typeof StackSignIn>;
export type SignUpProps = React.ComponentProps<typeof StackSignUp>;
export type AccountSettingsProps = React.ComponentProps<typeof StackAccountSettings>;
export type StackProviderProps = React.ComponentProps<typeof StackStackProvider>;

// Legacy interface for backward compatibility
export interface StackAuthComponentProps {
  children?: React.ReactNode;
  className?: string;
  user?: User | null;
  session?: Session | null;
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

// Use real Stack Auth components as base components
const UserButtonBase = StackUserButton;
const SignInBase = StackSignIn;
const SignUpBase = StackSignUp;
const AccountSettingsBase = StackAccountSettings;
const StackProviderBase = StackStackProvider;

// Create validated components with development-time prop validation
const validatedComponents = createValidatedComponents({
  UserButton: UserButtonBase as React.ComponentType<any>,
  SignIn: SignInBase as React.ComponentType<any>,
  SignUp: SignUpBase as React.ComponentType<any>,
  AccountSettings: AccountSettingsBase as React.ComponentType<any>,
  StackProvider: StackProviderBase as React.ComponentType<any>
}, {
  enhanced: true // Enable enhanced development features
});

// Export validated components with proper Stack Auth typing
export const UserButton = validatedComponents.UserButton as typeof StackUserButton;
export const SignIn = validatedComponents.SignIn as typeof StackSignIn;
export const SignUp = validatedComponents.SignUp as typeof StackSignUp;
export const AccountSettings = validatedComponents.AccountSettings as typeof StackAccountSettings;
export const StackProvider = validatedComponents.StackProvider as typeof StackStackProvider;

// No default export to avoid mixed exports warning