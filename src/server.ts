/**
 * Server-side authentication helpers for Astro
 * 
 * These functions run on the server and provide access to the
 * authenticated user and session in API routes and pages.
 */

import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';
import type { RequireAuthOptions } from './types.js';
import { tryGetConfig } from './config.js';

/**
 * Get the authenticated user from the request context
 * 
 * @param context - Astro API context
 * @returns Promise resolving to User or null if not authenticated
 */
export async function getUser(context: APIContext): Promise<User | null> {
  return context.locals.user || null;
}

/**
 * Get the current session from the request context
 * 
 * @param context - Astro API context  
 * @returns Promise resolving to Session or null if no session
 */
export async function getSession(context: APIContext): Promise<Session | null> {
  return context.locals.session || null;
}

/**
 * Determine if the current request is an API route
 * 
 * @param context - Astro API context
 * @returns true if this is an API route, false if it's a page
 */
function isApiRoute(context: APIContext): boolean {
  // Check if URL path starts with /api/
  if (context.url.pathname.startsWith('/api/')) {
    return true;
  }
  
  // Check if request accepts JSON (indicating API usage)
  const acceptHeader = context.request.headers.get('accept');
  if (acceptHeader?.includes('application/json')) {
    return true;
  }
  
  return false;
}

/**
 * Get the configured sign-in URL with proper prefix
 * 
 * @param customSignInUrl - Custom sign-in URL from options
 * @returns The sign-in URL to use for redirects
 */
function getSignInUrl(customSignInUrl?: string): string {
  if (customSignInUrl) {
    return customSignInUrl;
  }
  
  // Try to get configured prefix from config
  const { config } = tryGetConfig();
  const prefix = config?.prefix || process.env.STACK_AUTH_PREFIX || '/handler';
  
  return `${prefix}/signin`;
}

/**
 * Require authentication, throwing or redirecting if not authenticated
 * 
 * @param context - Astro API context
 * @param options - Authentication requirements and redirect options
 * @returns Promise resolving to User if authenticated
 * @throws Response with 401 for API routes, never returns for page redirects
 */
export async function requireAuth(
  context: APIContext, 
  options: RequireAuthOptions = {}
): Promise<User> {
  const user = await getUser(context);
  
  if (user) {
    return user;
  }
  
  // User is not authenticated - handle based on request type
  const isApi = isApiRoute(context);
  
  if (isApi) {
    // Return 401 JSON response for API routes
    throw new Response(JSON.stringify({
      error: 'Authentication required',
      message: 'You must be signed in to access this resource',
      statusCode: 401
    }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } else {
    // Redirect for pages with URL preservation
    const signInUrl = getSignInUrl(options.signInUrl);
    const returnUrl = options.redirectTo || context.url.pathname + context.url.search;
    const redirectUrl = `${signInUrl}?redirect=${encodeURIComponent(returnUrl)}`;
    
    return context.redirect(redirectUrl);
  }
}