/**
 * Client-side authentication functions for Astro
 * 
 * These functions run in the browser and provide methods to
 * sign in, sign out, and manage authentication state.
 */

import type { SignInOptions, SignOutOptions } from './types.js';

/**
 * Sign in a user with Stack Auth
 * 
 * @param provider - OAuth provider name (optional)
 * @param options - Sign in options
 */
export async function signIn(provider?: string, options: SignInOptions = {}): Promise<void> {
  const { redirectTo = window.location.origin, onSuccess, onError } = options;
  
  try {
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

    if (response.ok) {
      // Handle successful sign in
      if (onSuccess) {
        onSuccess();
      }
      
      // Check if response contains redirect URL
      const responseData = await response.json().catch(() => ({}));
      const finalRedirectTo = responseData.redirectUrl || redirectTo;
      
      // Redirect to the final destination
      window.location.href = finalRedirectTo;
    } else {
      // Handle API error response
      const errorData = await response.json().catch(() => ({ message: 'Sign in failed' }));
      const error = new Error(errorData.message || `Sign in failed with status: ${response.status}`);
      
      if (onError) {
        onError(error);
      } else {
        throw error;
      }
    }
  } catch (error) {
    // Handle network or other errors
    const finalError = error instanceof Error ? error : new Error('Network error during sign in');
    
    if (onError) {
      onError(finalError);
    } else {
      // Fallback to redirect-based sign in for network failures
      console.warn('Sign in API failed, falling back to redirect method:', finalError.message);
      const signInUrl = provider 
        ? `/handler/signin/${provider}?redirectTo=${encodeURIComponent(redirectTo)}`
        : `/handler/signin?redirectTo=${encodeURIComponent(redirectTo)}`;
      
      window.location.href = signInUrl;
    }
  }
}

/**
 * Sign out the current user
 * 
 * @param options - Sign out options
 */
export async function signOut(options: SignOutOptions = {}): Promise<void> {
  const { redirectTo = window.location.origin, clearLocalStorage = false, onSuccess, onError } = options;
  
  try {
    // Clear local storage if requested
    if (clearLocalStorage) {
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
    }
    
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

    if (response.ok) {
      // Handle successful sign out
      if (onSuccess) {
        onSuccess();
      }
      
      // Check if response contains redirect URL
      const responseData = await response.json().catch(() => ({}));
      const finalRedirectTo = responseData.redirectUrl || redirectTo;
      
      // Redirect to the final destination
      window.location.href = finalRedirectTo;
    } else {
      // Handle API error response
      const errorData = await response.json().catch(() => ({ message: 'Sign out failed' }));
      const error = new Error(errorData.message || `Sign out failed with status: ${response.status}`);
      
      if (onError) {
        onError(error);
      } else {
        throw error;
      }
    }
  } catch (error) {
    // Handle network or other errors
    const finalError = error instanceof Error ? error : new Error('Network error during sign out');
    
    if (onError) {
      onError(finalError);
    } else {
      // Fallback to redirect-based sign out for network failures
      console.warn('Sign out API failed, falling back to redirect method:', finalError.message);
      const signOutUrl = `/handler/signout?redirectTo=${encodeURIComponent(redirectTo)}`;
      
      window.location.href = signOutUrl;
    }
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