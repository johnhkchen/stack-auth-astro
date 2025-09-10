/**
 * React component re-exports from Stack Auth UI
 * 
 * This module re-exports Stack Auth's React components for use in Astro
 * with proper TypeScript support and component hydration.
 * 
 * Note: Component exports will be implemented in Sprint 004
 */

import * as React from 'react';
import type { User, Session, StackClientApp } from '@stackframe/stack';

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
export type StackAuthFC<P = {}> = React.ComponentType<P & StackAuthComponentProps>;

// Test React component types
export type ReactFC<P = {}> = React.ComponentType<P>;
export type ReactElement = React.ReactElement;
export type ReactComponent<P = {}> = React.ComponentType<P>;

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

export default {};