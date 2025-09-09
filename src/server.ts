/**
 * Server-side authentication helpers for Astro
 * 
 * These functions run on the server and provide access to the
 * authenticated user and session in API routes and pages.
 */

import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';
import type { RequireAuthOptions } from './types.js';

/**
 * Get the authenticated user from the request context
 * 
 * @param context - Astro API context
 * @returns Promise resolving to User or null if not authenticated
 */
export async function getUser(context: APIContext): Promise<User | null> {
  return context.locals.user;
}

/**
 * Get the current session from the request context
 * 
 * @param context - Astro API context  
 * @returns Promise resolving to Session or null if no session
 */
export async function getSession(context: APIContext): Promise<Session | null> {
  return context.locals.session;
}

/**
 * Require authentication, throwing or redirecting if not authenticated
 * 
 * @param context - Astro API context
 * @param options - Authentication requirements and redirect options
 * @returns Promise resolving to User if authenticated
 * @throws Error if not authenticated and throwOnUnauthenticated is true
 */
export async function requireAuth(
  context: APIContext, 
  options: RequireAuthOptions = {}
): Promise<User> {
  const user = await getUser(context);
  
  if (!user) {
    const { redirectTo = '/auth/signin', throwOnUnauthenticated = false } = options;
    
    if (throwOnUnauthenticated) {
      throw new Error('Authentication required');
    }
    
    // Redirect to sign in page
    context.redirect(redirectTo);
    throw new Error('Authentication required');
  }
  
  return user;
}