/**
 * Client-side authentication functions for Astro
 * 
 * These functions run in the browser and provide methods to
 * sign in, sign out, and manage authentication state.
 */

import type { SignInOptions, SignOutOptions } from './types.js';
import { getAuthStateManager, initAuthState } from './client/state.js';
import { initSync, broadcastSignIn, broadcastSignOut } from './client/sync.js';

/**
 * Client-side error class with recovery guidance
 */
export class StackAuthClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recovery?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StackAuthClientError';
  }
}

/**
 * Error codes with recovery suggestions
 */
export const CLIENT_ERROR_CODES = {
  NETWORK_ERROR: 'Check your internet connection and try again',
  INVALID_CREDENTIALS: 'Please check your login information',
  SERVICE_UNAVAILABLE: 'Authentication service is temporarily unavailable. Please try again in a few minutes',
  RATE_LIMITED: 'Too many requests. Please wait before trying again',
  TIMEOUT: 'Request timed out. Please check your connection and try again',
  CORS_ERROR: 'Cross-origin request blocked. Please ensure proper CORS configuration',
  OFFLINE: 'You appear to be offline. Please check your connection',
  COMPONENT_ERROR: 'Authentication component failed to load. Please refresh the page',
  STATE_SYNC_ERROR: 'Failed to synchronize authentication state across tabs',
  STORAGE_ERROR: 'Browser storage is not available or has been disabled',
  SECURITY_ERROR: 'Security policy violation. Please ensure HTTPS and proper configuration'
} as const;

/**
 * Classify client-side errors for appropriate recovery
 */
function classifyClientError(error: unknown): { code: keyof typeof CLIENT_ERROR_CODES; recovery: string } {
  if (!error) {
    return { code: 'NETWORK_ERROR', recovery: CLIENT_ERROR_CODES.NETWORK_ERROR };
  }

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  // Network and connectivity errors
  if (errorMessage.includes('failed to fetch') || 
      errorMessage.includes('networkerror') ||
      errorMessage.includes('network error')) {
    return { code: 'NETWORK_ERROR', recovery: CLIENT_ERROR_CODES.NETWORK_ERROR };
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
    return { code: 'TIMEOUT', recovery: CLIENT_ERROR_CODES.TIMEOUT };
  }
  
  // CORS and security errors
  if (errorMessage.includes('cors') || 
      errorMessage.includes('cross-origin') ||
      errorMessage.includes('access-control-allow-origin')) {
    return { code: 'CORS_ERROR', recovery: CLIENT_ERROR_CODES.CORS_ERROR };
  }
  
  // Offline detection
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { code: 'OFFLINE', recovery: CLIENT_ERROR_CODES.OFFLINE };
  }
  
  // Rate limiting
  if (errorMessage.includes('429') || 
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')) {
    return { code: 'RATE_LIMITED', recovery: CLIENT_ERROR_CODES.RATE_LIMITED };
  }
  
  // Service unavailable
  if (errorMessage.includes('503') || 
      errorMessage.includes('502') ||
      errorMessage.includes('service unavailable')) {
    return { code: 'SERVICE_UNAVAILABLE', recovery: CLIENT_ERROR_CODES.SERVICE_UNAVAILABLE };
  }
  
  // Authentication errors
  if (errorMessage.includes('401') || 
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid credentials')) {
    return { code: 'INVALID_CREDENTIALS', recovery: CLIENT_ERROR_CODES.INVALID_CREDENTIALS };
  }
  
  // Storage errors
  if (errorMessage.includes('localstorage') || 
      errorMessage.includes('storage') ||
      errorMessage.includes('quota')) {
    return { code: 'STORAGE_ERROR', recovery: CLIENT_ERROR_CODES.STORAGE_ERROR };
  }
  
  // Default to network error
  return { code: 'NETWORK_ERROR', recovery: CLIENT_ERROR_CODES.NETWORK_ERROR };
}

/**
 * Create enhanced client error with recovery guidance
 */
function createClientError(error: unknown, context?: string): StackAuthClientError {
  const { code, recovery } = classifyClientError(error);
  const baseMessage = error instanceof Error ? error.message : String(error);
  const contextMessage = context ? `${context}: ${baseMessage}` : baseMessage;
  
  return new StackAuthClientError(
    contextMessage,
    code,
    recovery,
    error instanceof Error ? error : undefined
  );
}

/**
 * Enhanced error logging for client-side errors
 */
function logClientError(error: StackAuthClientError, operation: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Stack Auth Client Error: ${operation}`);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Recovery:', error.recovery);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    console.groupEnd();
  } else {
    // In production, log minimal info for debugging
    console.error(`Stack Auth Error (${error.code}):`, error.message);
  }
}

/**
 * Retry mechanism with exponential backoff
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const { code } = classifyClientError(error);
      
      // Don't retry certain errors
      if (code === 'INVALID_CREDENTIALS' || 
          code === 'CORS_ERROR' || 
          code === 'SECURITY_ERROR') {
        throw error;
      }
      
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(`🔄 Retrying operation (attempt ${attempt + 2}/${maxRetries + 1})`);
      }
    }
  }
  
  throw lastError;
}

// Initialize state management on module load
if (typeof window !== 'undefined') {
  // Initialize edge case handling first
  import('./edge-case-handler.js').then(({ initializeEdgeCaseHandling, getBrowserHandler, getNetworkHandler }) => {
    initializeEdgeCaseHandling();
    
    // Check browser compatibility before initializing
    const browserHandler = getBrowserHandler();
    const authCheck = browserHandler.canUseAuthentication();
    
    if (authCheck.canUse || authCheck.limitations.length === 0) {
      // Initialize auth state management with default options
      initAuthState({
        persistStorage: true,
        autoRefresh: true,
        refreshInterval: 5 * 60 * 1000, // 5 minutes
      });
      
      // Initialize cross-tab synchronization
      initSync({
        enableBroadcastSync: true,
        enableStorageSync: true,
      });
    } else {
      // Limited initialization for compatibility issues
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Stack Auth: Limited initialization due to browser compatibility issues:', authCheck.limitations);
      }
      
      // Initialize with fallbacks
      initAuthState({
        persistStorage: false, // Disable persistence if storage unavailable
        autoRefresh: false, // Disable auto-refresh if offline
        refreshInterval: 0,
      });
    }
  }).catch(error => {
    // Fallback initialization if edge case handler fails
    console.error('Failed to initialize edge case handling:', error);
    initAuthState({
      persistStorage: true,
      autoRefresh: true,
      refreshInterval: 5 * 60 * 1000,
    });
    
    initSync({
      enableBroadcastSync: true,
      enableStorageSync: true,
    });
  });
}

/**
 * Sign in a user with Stack Auth
 * 
 * @param provider - OAuth provider name (optional)
 * @param options - Sign in options
 */
export async function signIn(provider?: string, options: SignInOptions = {}): Promise<void> {
  const { redirectTo = window.location.origin, onSuccess, onError } = options;
  const authStateManager = getAuthStateManager();
  
  try {
    // Set loading state
    authStateManager.setLoading(true);
    
    // Use retry mechanism for sign in operation
    await retryOperation(async () => {
      // Construct API endpoint for sign in
      const baseUrl = '/handler';
      const endpoint = provider ? `${baseUrl}/signin/${provider}` : `${baseUrl}/signin`;
      
      // Make POST request to sign in endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectTo: redirectTo
        }),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        // Create error with response details
        const errorData = await response.json().catch(() => ({ message: 'Sign in failed' }));
        const errorMessage = errorData.message || `Sign in failed with status: ${response.status}`;
        const error = new Error(errorMessage);
        
        // Add response status for better error classification
        (error as any).status = response.status;
        throw error;
      }
      
      // Check if response contains user/session data
      const responseData = await response.json().catch(() => ({}));
      
      // Update auth state if user data is available
      if (responseData.user && responseData.session) {
        authStateManager.setAuthData(responseData.user, responseData.session);
        broadcastSignIn(responseData.user, responseData.session);
      }
      
      // Handle successful sign in
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect to the final destination
      const finalRedirectTo = responseData.redirectUrl || redirectTo;
      window.location.href = finalRedirectTo;
    }, 3, 1000); // 3 retries with 1s base delay
    
  } catch (error) {
    // Create enhanced client error with recovery guidance
    const clientError = createClientError(error, 'Sign in failed');
    
    // Log error appropriately for development vs production
    logClientError(clientError, 'signIn');
    
    // Update auth state with the enhanced error
    authStateManager.setError(clientError);
    
    if (onError) {
      onError(clientError);
    } else {
      // Check if fallback redirect should be used
      const shouldFallback = clientError.code === 'NETWORK_ERROR' || 
                           clientError.code === 'TIMEOUT' || 
                           clientError.code === 'SERVICE_UNAVAILABLE';
      
      if (shouldFallback) {
        // Fallback to redirect-based sign in for certain errors
        console.warn('Sign in API failed, falling back to redirect method:', clientError.message);
        const signInUrl = provider 
          ? `/handler/signin/${provider}?redirectTo=${encodeURIComponent(redirectTo)}`
          : `/handler/signin?redirectTo=${encodeURIComponent(redirectTo)}`;
        
        window.location.href = signInUrl;
      } else {
        // For other errors, throw to let caller handle
        throw clientError;
      }
    }
  } finally {
    authStateManager.setLoading(false);
  }
}

/**
 * Sign out the current user
 * 
 * @param options - Sign out options
 */
export async function signOut(options: SignOutOptions = {}): Promise<void> {
  const { redirectTo = window.location.origin, clearLocalStorage = false, onSuccess, onError } = options;
  const authStateManager = getAuthStateManager();
  
  try {
    // Set loading state
    authStateManager.setLoading(true);
    
    // Clear auth state immediately (optimistic clear)
    authStateManager.clearAuth();
    broadcastSignOut();
    
    // Clear local storage if requested
    if (clearLocalStorage) {
      try {
        // Clear Stack Auth related items from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('stack-') || key.startsWith('auth-') || key.includes('stack')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear sessionStorage as well
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('stack-') || key.startsWith('auth-') || key.includes('stack')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        // Log storage error but don't fail the sign out process
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to clear local storage:', storageError);
        }
      }
    }
    
    // Use retry mechanism for sign out operation
    await retryOperation(async () => {
      // Make POST request to sign out endpoint
      const response = await fetch('/handler/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectTo: redirectTo
        }),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        // Create error with response details
        const errorData = await response.json().catch(() => ({ message: 'Sign out failed' }));
        const errorMessage = errorData.message || `Sign out failed with status: ${response.status}`;
        const error = new Error(errorMessage);
        
        // Add response status for better error classification
        (error as any).status = response.status;
        throw error;
      }
      
      // Handle successful sign out
      if (onSuccess) {
        onSuccess();
      }
      
      // Check if response contains redirect URL
      const responseData = await response.json().catch(() => ({}));
      const finalRedirectTo = responseData.redirectUrl || redirectTo;
      
      // Redirect to the final destination
      window.location.href = finalRedirectTo;
    }, 3, 1000); // 3 retries with 1s base delay
    
  } catch (error) {
    // Create enhanced client error with recovery guidance
    const clientError = createClientError(error, 'Sign out failed');
    
    // Log error appropriately for development vs production
    logClientError(clientError, 'signOut');
    
    // Update auth state with the enhanced error
    authStateManager.setError(clientError);
    
    if (onError) {
      onError(clientError);
    } else {
      // Check if fallback redirect should be used
      const shouldFallback = clientError.code === 'NETWORK_ERROR' || 
                           clientError.code === 'TIMEOUT' || 
                           clientError.code === 'SERVICE_UNAVAILABLE';
      
      if (shouldFallback) {
        // Fallback to redirect-based sign out for certain errors
        console.warn('Sign out API failed, falling back to redirect method:', clientError.message);
        const signOutUrl = `/handler/signout?redirectTo=${encodeURIComponent(redirectTo)}`;
        
        window.location.href = signOutUrl;
      } else {
        // For other errors, throw to let caller handle
        throw clientError;
      }
    }
  } finally {
    authStateManager.setLoading(false);
  }
}

/**
 * Redirect to sign in page
 * 
 * @param callbackUrl - URL to redirect to after sign in
 */
export function redirectToSignIn(callbackUrl?: string): void {
  const redirectTo = callbackUrl || window.location.href;
  signIn(undefined, { redirectTo });
}

/**
 * Redirect to sign up page
 * 
 * @param callbackUrl - URL to redirect to after sign up
 */
export function redirectToSignUp(callbackUrl?: string): void {
  const redirectTo = callbackUrl || window.location.href;
  const signUpUrl = `/handler/signup?redirect=${encodeURIComponent(redirectTo)}`;
  window.location.href = signUpUrl;
}

/**
 * Redirect to account settings page
 * 
 * @param callbackUrl - URL to redirect to after account management
 */
export function redirectToAccount(callbackUrl?: string): void {
  const redirectTo = callbackUrl || window.location.href;
  const accountUrl = `/handler/account?redirect=${encodeURIComponent(redirectTo)}`;
  window.location.href = accountUrl;
}

// Export state management functionality
export {
  getAuthState,
  subscribeToAuthState,
  getAuthStateManager,
  initAuthState
} from './client/state.js';

export {
  authStorage,
  sessionAuthStorage,
  authStorageUtils
} from './client/storage.js';

export {
  broadcastAuthChange,
  broadcastSignIn as broadcastSignInEvent,
  broadcastSignOut as broadcastSignOutEvent,
  subscribeToSync,
  getSyncManager,
  initSync
} from './client/sync.js';

// Export React hooks for consuming authentication state
export {
  useAuthState,
  useUser,
  useSession,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useAuthActions,
  useAuthCheck,
  useRequireAuth,
  useAuthGuard,
  useUserProfile,
  useSessionManagement
} from './client/hooks.js';