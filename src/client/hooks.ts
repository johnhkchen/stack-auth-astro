/**
 * React hooks for authentication state management
 * 
 * Provides convenient React hooks to access and manage authentication
 * state across components with automatic re-rendering on state changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Session } from '@stackframe/stack';
import { getAuthStateManager, type AuthState } from './state.js';
import { buildAuthUrl } from './prefix.js';
import { getSyncManager, type SyncMessage } from './sync.js';
import { signIn as clientSignIn, signOut as clientSignOut } from '../client.js';

export interface UseAuthStateOptions {
  autoRefresh?: boolean;
  syncAcrossTabs?: boolean;
}

export interface UseAuthStateReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  lastUpdated: number;
  isOnline: boolean;
  networkStatus: 'online' | 'offline' | 'reconnecting' | 'degraded';
  loadingState: {
    type: 'idle' | 'signing-in' | 'signing-out' | 'refreshing' | 'checking-auth' | 'syncing';
    message: string;
    progress?: number;
    startTime: number;
  };
  operationHistory: Array<{
    operation: string;
    timestamp: number;
    success: boolean;
    duration: number;
    error?: string;
  }>;
}

export interface UseAuthActionsReturn {
  signIn: (provider?: string, options?: any) => Promise<void>;
  signOut: (options?: any) => Promise<void>;
  refreshSession: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook to access current authentication state
 */
export function useAuthState(options: UseAuthStateOptions = {}): UseAuthStateReturn {
  const { autoRefresh = true, syncAcrossTabs = true } = options;
  
  const authStateManager = getAuthStateManager({
    autoRefresh,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  const [state, setState] = useState<AuthState>(() => authStateManager.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribeAuth = authStateManager.subscribe(setState);

    // Subscribe to cross-tab sync if enabled
    let unsubscribeSync: (() => void) | null = null;
    
    if (syncAcrossTabs) {
      const syncManager = getSyncManager();
      unsubscribeSync = syncManager.subscribe((message: SyncMessage) => {
        // Update local state based on sync messages
        switch (message.type) {
          case 'AUTH_STATE_CHANGE':
          case 'SIGN_IN':
          case 'SIGN_OUT':
          case 'SESSION_REFRESH':
            // Refresh our local state
            authStateManager.checkAuthStatus();
            break;
        }
      });
    }

    return () => {
      unsubscribeAuth();
      unsubscribeSync?.();
    };
  }, [authStateManager, syncAcrossTabs]);

  return {
    user: state.user,
    session: state.session,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    lastUpdated: state.lastUpdated,
    isOnline: state.isOnline,
    networkStatus: state.networkStatus,
    loadingState: state.loadingState,
    operationHistory: state.operationHistory
  };
}

/**
 * Hook to access only the current user
 */
export function useUser(): User | null {
  const { user } = useAuthState();
  return user;
}

/**
 * Hook to access only the current session
 */
export function useSession(): Session | null {
  const { session } = useAuthState();
  return session;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuthState();
  return isAuthenticated;
}

/**
 * Hook to access authentication loading state
 */
export function useAuthLoading(): boolean {
  const { isLoading } = useAuthState();
  return isLoading;
}

/**
 * Hook to access authentication error state
 */
export function useAuthError(): Error | null {
  const { error } = useAuthState();
  return error;
}

/**
 * Hook to access network status
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  networkStatus: 'online' | 'offline' | 'reconnecting' | 'degraded';
} {
  const { isOnline, networkStatus } = useAuthState();
  return { isOnline, networkStatus };
}

/**
 * Hook to access detailed loading state
 */
export function useAuthLoadingState(): {
  type: 'idle' | 'signing-in' | 'signing-out' | 'refreshing' | 'checking-auth' | 'syncing';
  message: string;
  progress?: number;
  duration: number;
  isLoading: boolean;
} {
  const { loadingState, isLoading } = useAuthState();
  const duration = loadingState.type !== 'idle' ? Date.now() - loadingState.startTime : 0;
  
  return {
    ...loadingState,
    duration,
    isLoading
  };
}

/**
 * Hook to access operation history for debugging/analytics
 */
export function useAuthOperationHistory(): Array<{
  operation: string;
  timestamp: number;
  success: boolean;
  duration: number;
  error?: string;
}> {
  const { operationHistory } = useAuthState();
  return operationHistory;
}

/**
 * Hook to access authentication actions
 */
export function useAuthActions(): UseAuthActionsReturn {
  const authStateManager = getAuthStateManager();
  const syncManager = getSyncManager();
  
  const signIn = useCallback(async (provider?: string, options: any = {}) => {
    try {
      authStateManager.setLoadingState(
        'signing-in', 
        provider ? `Signing in with ${provider}...` : 'Signing in...'
      );
      
      await clientSignIn(provider, options);
      
      // Broadcast sign in to other tabs
      syncManager.broadcastSignIn(null, null);
    } catch (error) {
      const authError = error instanceof Error ? error : new Error('Sign in failed');
      authStateManager.setError(authError);
      authStateManager.setLoadingState('idle', '');
      throw error;
    }
  }, [authStateManager, syncManager]);

  const signOut = useCallback(async (options: any = {}) => {
    try {
      authStateManager.setLoadingState('signing-out', 'Signing out...');
      await clientSignOut(options);
      
      // Clear auth state and broadcast to other tabs
      authStateManager.clearAuth();
      syncManager.broadcastSignOut();
    } catch (error) {
      const authError = error instanceof Error ? error : new Error('Sign out failed');
      authStateManager.setError(authError);
      authStateManager.setLoadingState('idle', '');
      throw error;
    }
  }, [authStateManager, syncManager]);

  const refreshSession = useCallback(async () => {
    await authStateManager.refreshSession();
  }, [authStateManager]);

  const checkAuthStatus = useCallback(async () => {
    await authStateManager.checkAuthStatus();
  }, [authStateManager]);

  const clearError = useCallback(() => {
    authStateManager.setError(null);
  }, [authStateManager]);

  return {
    signIn,
    signOut,
    refreshSession,
    checkAuthStatus,
    clearError
  };
}

/**
 * Hook for authentication status with automatic checking
 */
export function useAuthCheck(): {
  isChecking: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: Error | null;
} {
  const authState = useAuthState();
  const { checkAuthStatus } = useAuthActions();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!hasChecked.current) {
      hasChecked.current = true;
      checkAuthStatus();
    }
  }, [checkAuthStatus]);

  return {
    isChecking: authState.isLoading && !hasChecked.current,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    error: authState.error
  };
}

/**
 * Hook for protected routes - redirects if not authenticated
 */
export function useRequireAuth(): {
  isLoading: boolean;
  user: User | null;
  session: Session | null;
} {
  const { user, session, isLoading, isAuthenticated } = useAuthState();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to sign in page
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = buildAuthUrl('signin', { redirectTo: currentUrl });
    }
  }, [isLoading, isAuthenticated]);

  return {
    isLoading,
    user: isAuthenticated ? user : null,
    session: isAuthenticated ? session : null
  };
}

/**
 * Hook for conditional rendering based on auth state
 */
export function useAuthGuard(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  renderWhenAuthenticated: (children: React.ReactNode) => React.ReactNode | null;
  renderWhenUnauthenticated: (children: React.ReactNode) => React.ReactNode | null;
  renderWhenLoading: (children: React.ReactNode) => React.ReactNode | null;
} {
  const { isAuthenticated, isLoading, user } = useAuthState();

  const renderWhenAuthenticated = useCallback((children: React.ReactNode) => {
    return isAuthenticated && !isLoading ? children : null;
  }, [isAuthenticated, isLoading]);

  const renderWhenUnauthenticated = useCallback((children: React.ReactNode) => {
    return !isAuthenticated && !isLoading ? children : null;
  }, [isAuthenticated, isLoading]);

  const renderWhenLoading = useCallback((children: React.ReactNode) => {
    return isLoading ? children : null;
  }, [isLoading]);

  return {
    isAuthenticated,
    isLoading,
    user,
    renderWhenAuthenticated,
    renderWhenUnauthenticated,
    renderWhenLoading
  };
}

/**
 * Hook for user profile management
 */
export function useUserProfile(): {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<void>;
} {
  const { user, isLoading, error } = useAuthState();
  const { refreshSession } = useAuthActions();
  
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      const response = await fetch(buildAuthUrl('user/profile'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Profile update failed: ${response.status}`);
      }

      // Refresh session to get updated user data
      await refreshSession();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Profile update failed');
    }
  }, [refreshSession]);

  const refreshProfile = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  return {
    user,
    isLoading,
    error,
    updateProfile,
    refreshProfile
  };
}

/**
 * Hook for session management
 */
export function useSessionManagement(): {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  refreshSession: () => Promise<void>;
  isSessionValid: boolean;
  timeUntilExpiry: number | null;
} {
  const { session, isLoading, error } = useAuthState();
  const { refreshSession } = useAuthActions();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);

  useEffect(() => {
    if (!session) {
      setTimeUntilExpiry(null);
      return;
    }

    // Calculate time until expiry
    const updateTimeUntilExpiry = () => {
      // Note: Stack Auth Session type may not have expiresAt property
      // This is a placeholder for when it becomes available
      const expiresAt = (session as any).expiresAt;
      if (expiresAt) {
        const now = Date.now();
        const expiry = new Date(expiresAt).getTime();
        const timeLeft = Math.max(0, expiry - now);
        setTimeUntilExpiry(timeLeft);
      } else {
        setTimeUntilExpiry(null);
      }
    };

    updateTimeUntilExpiry();
    const interval = setInterval(updateTimeUntilExpiry, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const isSessionValid = session ? (
    timeUntilExpiry === null || timeUntilExpiry > 0
  ) : false;

  return {
    session,
    isLoading,
    error,
    refreshSession,
    isSessionValid,
    timeUntilExpiry
  };
}

/**
 * Performance-optimized hook that only re-renders when specific auth properties change
 */
export function useAuthSelector<T>(
  selector: (state: UseAuthStateReturn) => T,
  equality?: (a: T, b: T) => boolean
): T {
  const authState = useAuthState();
  const selectorRef = useRef(selector);
  const [selectedValue, setSelectedValue] = useState(() => selector(authState));
  const selectedValueRef = useRef(selectedValue);

  // Update selector ref if it changes
  useEffect(() => {
    selectorRef.current = selector;
  }, [selector]);

  // Update selected value when auth state changes
  useEffect(() => {
    const newValue = selectorRef.current(authState);
    const hasChanged = equality 
      ? !equality(selectedValueRef.current, newValue)
      : selectedValueRef.current !== newValue;

    if (hasChanged) {
      selectedValueRef.current = newValue;
      setSelectedValue(newValue);
    }
  }, [authState, equality]);

  return selectedValue;
}

/**
 * Hook for optimized auth status checking with debouncing
 */
export function useOptimizedAuthCheck(): {
  isChecking: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: Error | null;
  forceCheck: () => void;
} {
  const authState = useAuthState();
  const { checkAuthStatus } = useAuthActions();
  const [isChecking, setIsChecking] = useState(false);
  const hasChecked = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced check function
  const debouncedCheck = useCallback(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(async () => {
      if (!hasChecked.current || authState.error) {
        setIsChecking(true);
        try {
          await checkAuthStatus();
          hasChecked.current = true;
        } catch (error) {
          // Error is handled by the auth state manager
        } finally {
          setIsChecking(false);
        }
      }
    }, 100); // 100ms debounce
  }, [checkAuthStatus, authState.error]);

  const forceCheck = useCallback(async () => {
    hasChecked.current = false;
    await debouncedCheck();
  }, [debouncedCheck]);

  useEffect(() => {
    debouncedCheck();

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [debouncedCheck]);

  return {
    isChecking: isChecking || authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    error: authState.error,
    forceCheck
  };
}