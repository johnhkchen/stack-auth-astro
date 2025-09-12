/**
 * Server-side authentication helpers for Astro
 * 
 * These functions run on the server and provide access to the
 * authenticated user and session in API routes and pages.
 * Includes comprehensive security measures and validation.
 */

import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';
import type { RequireAuthOptions } from './types.js';
import { tryGetConfig } from './config.js';
import { 
  validateAPIContext, 
  sanitizeInput, 
  validateRedirectURL, 
  addSecurityHeaders,
  SecurityError,
  ValidationError,
  type SecurityValidationOptions
} from './server/security.js';
import { 
  logAuthSuccess, 
  logAuthFailure, 
  logSecurityViolation,
  AuditEventType 
} from './server/audit.js';
import { 
  enforceRateLimit, 
  clearRateLimit,
  RATE_LIMIT_CONFIGS 
} from './server/rate-limiting.js';

/**
 * Get the authenticated user from the request context
 * 
 * @param context - Astro API context
 * @param options - Security validation options
 * @returns Promise resolving to User or null if not authenticated
 */
export async function getUser(
  context: APIContext, 
  options: SecurityValidationOptions = {}
): Promise<User | null> {
  try {
    // Apply security validation if requested
    if (options.requireSecureTransport || options.validateOrigin || options.requireCSRF) {
      validateAPIContext(context, options);
    }
    
    const user = context.locals.user || null;
    
    // Log successful user retrieval for audit purposes (low priority)
    if (user && process.env.NODE_ENV === 'development') {
      logAuthSuccess(context, user, { operation: 'getUser' });
    }
    
    return user;
    
  } catch (error) {
    if (error instanceof SecurityError) {
      logSecurityViolation(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        context,
        `Security validation failed in getUser: ${error.message}`,
        { code: error.code }
      );
      throw error;
    }
    
    // Log unexpected errors
    if (error instanceof Error) {
      logSecurityViolation(
        AuditEventType.SYSTEM_ERROR,
        context,
        `Unexpected error in getUser: ${error.message}`
      );
    }
    
    throw error;
  }
}

/**
 * Get the current session from the request context
 * 
 * @param context - Astro API context  
 * @param options - Security validation options
 * @returns Promise resolving to Session or null if no session
 */
export async function getSession(
  context: APIContext, 
  options: SecurityValidationOptions = {}
): Promise<Session | null> {
  try {
    // Apply security validation if requested
    if (options.requireSecureTransport || options.validateOrigin || options.requireCSRF) {
      validateAPIContext(context, options);
    }
    
    const session = context.locals.session || null;
    
    // Log session access for audit purposes (low priority, only in development)
    if (session && process.env.NODE_ENV === 'development') {
      logAuthSuccess(context, context.locals.user, { 
        operation: 'getSession',
        sessionId: session.id 
      });
    }
    
    return session;
    
  } catch (error) {
    if (error instanceof SecurityError) {
      logSecurityViolation(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        context,
        `Security validation failed in getSession: ${error.message}`,
        { code: error.code }
      );
      throw error;
    }
    
    // Log unexpected errors
    if (error instanceof Error) {
      logSecurityViolation(
        AuditEventType.SYSTEM_ERROR,
        context,
        `Unexpected error in getSession: ${error.message}`
      );
    }
    
    throw error;
  }
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
 * Get the configured sign-in URL with proper prefix and validation
 * 
 * @param customSignInUrl - Custom sign-in URL from options
 * @returns The sign-in URL to use for redirects
 */
function getSignInUrl(customSignInUrl?: string): string {
  if (customSignInUrl) {
    try {
      // Validate the custom sign-in URL for security
      return validateRedirectURL(customSignInUrl);
    } catch (error) {
      if (error instanceof ValidationError) {
        console.warn('⚠️ Invalid custom sign-in URL provided, using default:', error.message);
      }
      // Fall through to default
    }
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
  options: RequireAuthOptions & SecurityValidationOptions = {}
): Promise<User> {
  try {
    // Apply rate limiting for authentication attempts
    enforceRateLimit(context.request, RATE_LIMIT_CONFIGS.AUTH_ENDPOINTS);
    
    // Apply security validation
    const securityOptions: SecurityValidationOptions = {
      requireSecureTransport: process.env.NODE_ENV === 'production',
      validateOrigin: options.validateOrigin,
      allowedOrigins: options.allowedOrigins,
      requireCSRF: options.requireCSRF
    };
    
    if (securityOptions.requireSecureTransport || securityOptions.validateOrigin || securityOptions.requireCSRF) {
      validateAPIContext(context, securityOptions);
    }
    
    const user = await getUser(context, securityOptions);
    
    if (user) {
      // Clear rate limit for successful authentication
      clearRateLimit(context.request, RATE_LIMIT_CONFIGS.AUTH_ENDPOINTS);
      
      // Log successful authentication access
      logAuthSuccess(context, user, { 
        operation: 'requireAuth',
        endpoint: context.url.pathname 
      });
      
      return user;
    }
    
    // User is not authenticated - log the failure
    logAuthFailure(context, 'User not authenticated', {
      endpoint: context.url.pathname,
      userAgent: context.request.headers.get('user-agent'),
      requireAuth: true
    });
    
    // User is not authenticated - handle based on request type
    const isApi = isApiRoute(context);
    
    if (isApi) {
      // Create secure 401 response for API routes
      const response = new Response(JSON.stringify({
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
      
      // Add security headers
      addSecurityHeaders(response.headers);
      
      throw response;
    } else {
      // Redirect for pages with URL preservation and validation
      const signInUrl = getSignInUrl(options.signInUrl);
      let returnUrl = options.redirectTo || context.url.pathname + context.url.search;
      
      try {
        // Validate and sanitize the return URL
        returnUrl = validateRedirectURL(returnUrl);
      } catch (error) {
        if (error instanceof ValidationError) {
          console.warn('⚠️ Invalid redirect URL detected, using safe default:', error.message);
          returnUrl = '/'; // Safe default
        } else {
          throw error;
        }
      }
      
      const redirectUrl = `${signInUrl}?redirect=${encodeURIComponent(returnUrl)}`;
      
      return context.redirect(redirectUrl);
    }
    
  } catch (error) {
    if (error instanceof SecurityError) {
      // Log security violations
      logSecurityViolation(
        error.code === 'RATE_LIMIT_EXCEEDED' ? AuditEventType.RATE_LIMIT_EXCEEDED : AuditEventType.SUSPICIOUS_ACTIVITY,
        context,
        `Security violation in requireAuth: ${error.message}`,
        { code: error.code, endpoint: context.url.pathname }
      );
      
      // Handle rate limiting specifically
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const rateLimitInfo = (error as any).rateLimit;
        const response = new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: error.message,
          retryAfter: rateLimitInfo?.retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Retry-After': rateLimitInfo?.retryAfter?.toString() || '60'
          }
        });
        
        addSecurityHeaders(response.headers);
        throw response;
      }
      
      // Other security errors
      const response = new Response(JSON.stringify({
        error: 'Security validation failed',
        message: 'Request does not meet security requirements',
        statusCode: 403
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
      
      addSecurityHeaders(response.headers);
      throw response;
    }
    
    // Log unexpected errors
    if (error instanceof Error) {
      logSecurityViolation(
        AuditEventType.SYSTEM_ERROR,
        context,
        `Unexpected error in requireAuth: ${error.message}`,
        { endpoint: context.url.pathname }
      );
    }
    
    // Re-throw the original error if it's already a Response
    throw error;
  }
}