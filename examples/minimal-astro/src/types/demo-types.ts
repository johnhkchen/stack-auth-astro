/**
 * Standardized prop types and interfaces for Stack Auth component demos
 * This file consolidates all type definitions used across showcase examples
 */

// Stack Auth component prop types
export interface SignInProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showProviders?: boolean;
}

export interface SignUpProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showProviders?: boolean;
}

export interface UserButtonProps {
  className?: string;
  showDisplayName?: boolean;
  showEmail?: boolean;
  onSignOut?: () => void;
}

export interface AstroStackProviderProps {
  initialUser?: string; // JSON stringified user data
  hydrationStrategy?: 'immediate' | 'lazy' | 'onVisible';
  enableSync?: boolean;
  syncAcrossTabs?: boolean;
  onHydrationComplete?: () => void;
  onAuthStateChange?: (state: { isAuthenticated: boolean }) => void;
  errorFallback?: (props: { error: Error; retry: () => void }) => React.ReactElement;
}

// Dynamic import utility types
export interface ComponentConfig {
  id: string;
  component: string; // Component name
  strategy?: 'immediate' | 'lazy' | 'onVisible';
  props?: Record<string, any>;
}

export interface SyncConfig {
  id: string;
  enableSync: boolean;
  syncAcrossTabs: boolean;
  strategy?: 'immediate' | 'lazy' | 'onVisible';
}

// Error handling types
export interface ErrorDisplayConfig {
  type: string;
  message: string;
  recovery: string;
}

export interface PerformanceMetrics {
  hydrationStartTime: number;
  componentCount: number;
  syncEvents: number;
  errorsHandled: number;
}

// Authentication state types
export interface AuthState {
  user: any | null; // Stack Auth user object
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Client function option types
export interface SignOutOptions {
  clearLocalStorage?: boolean;
  redirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface BroadcastOptions {
  includeSession?: boolean;
  syncAcrossTabs?: boolean;
}

// Window interface extensions
declare global {
  interface Window {
    signOut?: () => Promise<void>;
    signOutUser?: () => Promise<void>;
    signIn?: (provider?: string) => Promise<void>;
    broadcastSignIn?: (user: any, session?: any) => void;
    updatePerformanceDisplay?: () => void;
    displayError?: (type: string, message: string, recovery: string) => void;
  }
}

export {};