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
import { createAuthStateBridge, getHydrationData, type HydrationOptions, type AuthState } from './auth-state.js';
import { 
  StackAuthErrorBoundary, 
  StackAuthComponentBoundary,
  withStackAuthErrorBoundary,
  useStackAuthErrorHandler,
  type ErrorFallbackProps,
  type StackAuthErrorBoundaryProps
} from './error-boundary.js';
import { StackAuthClientError, CLIENT_ERROR_CODES } from './client.js';
import { getErrorMessage, formatClientError, createErrorNotification, logError } from './error-messages.js';

// Real Stack Auth component re-exports with validation wrapper integration

// Component prop types derived from Stack Auth components
export type UserButtonProps = React.ComponentProps<typeof StackUserButton>;
export type SignInProps = React.ComponentProps<typeof StackSignIn>;
export type SignUpProps = React.ComponentProps<typeof StackSignUp>;
export type AccountSettingsProps = React.ComponentProps<typeof StackAccountSettings>;
export type StackProviderProps = React.ComponentProps<typeof StackStackProvider>;

// Enhanced StackProvider props for Astro islands
export interface AstroStackProviderProps extends Omit<StackProviderProps, 'children'> {
  children?: React.ReactNode;
  initialUser?: User | null;
  initialSession?: Session | null;
  hydrationStrategy?: 'immediate' | 'lazy' | 'onVisible' | 'onIdle';
  enableSync?: boolean;
  syncAcrossTabs?: boolean;
  autoRefresh?: boolean;
  onAuthStateChange?: (state: AuthState) => void;
  onHydrationComplete?: (islandId: string) => void;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ComponentType<ErrorFallbackProps>;
}

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

// Enhanced StackProvider implementation for Astro islands
const AstroStackProviderImpl: React.FC<AstroStackProviderProps> = ({
  children,
  initialUser = null,
  initialSession = null,
  hydrationStrategy = 'immediate',
  enableSync = true,
  syncAcrossTabs = true,
  autoRefresh = true,
  onAuthStateChange,
  onHydrationComplete,
  fallback = null,
  loadingFallback = null,
  errorFallback: ErrorFallback = undefined,
  ...stackProviderProps
}) => {
  // State for managing auth data and hydration status
  const [authState, setAuthState] = React.useState<AuthState>(() => ({
    user: initialUser,
    session: initialSession,
    isLoading: false,
    isAuthenticated: !!(initialUser && initialSession),
    error: null,
    lastUpdated: Date.now()
  }));
  
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [authBridge, setAuthBridge] = React.useState<ReturnType<typeof createAuthStateBridge> | null>(null);
  
  // Create auth state bridge on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const bridge = createAuthStateBridge({
      strategy: hydrationStrategy,
      initialUser,
      initialSession,
      enableSync,
      syncAcrossTabs,
      autoRefresh
    });
    
    setAuthBridge(bridge);
    
    // Try to get hydration data from window global first
    const hydrationData = getHydrationData();
    if (hydrationData.user || hydrationData.session) {
      bridge.hydrateWithServerData(hydrationData.user, hydrationData.session);
    }
    
    // Subscribe to auth state changes
    const unsubscribe = bridge.subscribeToAuthState((newState) => {
      setAuthState(newState);
      onAuthStateChange?.(newState);
      
      if (!isHydrated && (newState.user || newState.session)) {
        setIsHydrated(true);
        onHydrationComplete?.(bridge.getIslandId());
      }
    });
    
    // Initial state fetch based on strategy
    if (hydrationStrategy === 'immediate') {
      bridge.getAuthState().then((state) => {
        setAuthState(state);
        setIsHydrated(true);
        onHydrationComplete?.(bridge.getIslandId());
      }).catch((error) => {
        setAuthState(prev => ({ ...prev, error, isLoading: false }));
      });
    } else if (hydrationStrategy === 'lazy') {
      // Start background hydration
      bridge.getAuthState().catch(console.error);
    }
    
    return unsubscribe;
  }, [hydrationStrategy, enableSync, syncAcrossTabs, autoRefresh, onAuthStateChange, onHydrationComplete]);
  
  // Handle loading state
  if (authState.isLoading && loadingFallback) {
    return React.createElement(React.Fragment, null, loadingFallback);
  }
  
  // Handle error state
  if (authState.error && ErrorFallback) {
    const retry = () => {
      if (authBridge) {
        authBridge.getAuthState().catch(console.error);
      }
    };
    
    // Ensure error is properly formatted
    const formattedError = authState.error instanceof StackAuthClientError 
      ? authState.error 
      : new StackAuthClientError(
          authState.error.message || 'Component error',
          'COMPONENT_ERROR',
          CLIENT_ERROR_CODES.COMPONENT_ERROR,
          authState.error
        );
    
    return React.createElement(ErrorFallback, { 
      error: formattedError, 
      retry, 
      resetError: () => setAuthState(prev => ({ ...prev, error: null })),
      details: {
        componentStack: 'AstroStackProvider',
        errorBoundary: 'AstroStackProvider',
        operation: 'component hydration'
      }
    });
  }
  
  // If no auth state available and fallback provided, show fallback
  if (!isHydrated && !authState.user && !authState.session && fallback) {
    return React.createElement(React.Fragment, null, fallback);
  }
  
  // Create enhanced stack provider props
  const enhancedProps = {
    ...stackProviderProps,
    // Pass current auth state to Stack Provider if available
    ...(authState.user && { user: authState.user }),
    ...(authState.session && { session: authState.session })
  };
  
  return React.createElement(StackProviderBase, { ...enhancedProps, children });
};

// Create validated components with development-time prop validation
const validatedComponents = createValidatedComponents({
  UserButton: UserButtonBase as React.ComponentType<any>,
  SignIn: SignInBase as React.ComponentType<any>,
  SignUp: SignUpBase as React.ComponentType<any>,
  AccountSettings: AccountSettingsBase as React.ComponentType<any>,
  StackProvider: StackProviderBase as React.ComponentType<any>,
  AstroStackProvider: AstroStackProviderImpl as React.ComponentType<any>
}, {
  enhanced: true // Enable enhanced development features
});

// Wrap components with error boundaries for better reliability
const UserButtonWithBoundary = withStackAuthErrorBoundary(validatedComponents.UserButton, {
  level: 'component',
  isolateFailures: true,
  enableRecovery: true,
  resetOnPropsChange: true
});

const SignInWithBoundary = withStackAuthErrorBoundary(validatedComponents.SignIn, {
  level: 'component',
  isolateFailures: true,
  enableRecovery: true,
  resetOnPropsChange: true
});

const SignUpWithBoundary = withStackAuthErrorBoundary(validatedComponents.SignUp, {
  level: 'component',
  isolateFailures: true,
  enableRecovery: true,
  resetOnPropsChange: true
});

const AccountSettingsWithBoundary = withStackAuthErrorBoundary(validatedComponents.AccountSettings, {
  level: 'component',
  isolateFailures: true,
  enableRecovery: true,
  resetOnPropsChange: true
});

// Export validated components with proper Stack Auth typing and error boundaries
export const UserButton = UserButtonWithBoundary as typeof StackUserButton;
export const SignIn = SignInWithBoundary as typeof StackSignIn;
export const SignUp = SignUpWithBoundary as typeof StackSignUp;
export const AccountSettings = AccountSettingsWithBoundary as typeof StackAccountSettings;
export const StackProvider = validatedComponents.StackProvider as typeof StackStackProvider;
export const AstroStackProvider = validatedComponents.AstroStackProvider as React.FC<AstroStackProviderProps>;

// Export error handling components and utilities
export {
  StackAuthErrorBoundary,
  StackAuthComponentBoundary,
  withStackAuthErrorBoundary,
  useStackAuthErrorHandler,
  type ErrorFallbackProps,
  type StackAuthErrorBoundaryProps
};

// Export error classes and utilities
export {
  StackAuthClientError,
  CLIENT_ERROR_CODES,
  getErrorMessage,
  formatClientError,
  createErrorNotification,
  logError
};

// Export edge case handling utilities
export {
  detectBrowserCapabilities,
  getNetworkCondition,
  analyzeSecurityContext,
  getBrowserHandler,
  getNetworkHandler,
  performEnvironmentCheck,
  initializeEdgeCaseHandling,
  type BrowserCapabilities,
  type NetworkCondition,
  type SecurityContext
} from './edge-case-handler.js';

// No default export to avoid mixed exports warning