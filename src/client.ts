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
  const { redirectTo = window.location.origin } = options;
  
  // Construct sign in URL based on provider
  const baseUrl = '/handler';
  const signInUrl = provider 
    ? `${baseUrl}/signin/${provider}?redirectTo=${encodeURIComponent(redirectTo)}`
    : `${baseUrl}/signin?redirectTo=${encodeURIComponent(redirectTo)}`;
  
  window.location.href = signInUrl;
}

/**
 * Sign out the current user
 * 
 * @param options - Sign out options
 */
export async function signOut(options: SignOutOptions = {}): Promise<void> {
  const { redirectTo = window.location.origin } = options;
  
  const signOutUrl = `/handler/signout?redirectTo=${encodeURIComponent(redirectTo)}`;
  window.location.href = signOutUrl;
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
  const signUpUrl = `/handler/signup?redirectTo=${encodeURIComponent(redirectTo)}`;
  window.location.href = signUpUrl;
}

/**
 * Redirect to account settings page
 * 
 * @param callbackUrl - URL to redirect to after account management
 */
export function redirectToAccount(callbackUrl?: string): void {
  const redirectTo = callbackUrl || window.location.href;
  const accountUrl = `/handler/account?redirectTo=${encodeURIComponent(redirectTo)}`;
  window.location.href = accountUrl;
}