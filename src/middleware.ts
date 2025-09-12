/**
 * Authentication middleware for Astro
 * 
 * This middleware runs on every request to populate Astro.locals
 * with the current user and session information from Stack Auth.
 * 
 * Implements full Stack Auth SDK integration with session validation,
 * user resolution, and performance-optimized caching.
 */

import { defineMiddleware } from 'astro:middleware';
import { StackServerApp } from '@stackframe/stack';
import { tryGetConfig } from './config.js';
import { createSetupGuide } from './validation.js';
import { 
  StackAuthEnvironmentError, 
  StackAuthConfigurationError,
  createErrorWithGuide 
} from './errors.js';
import type { User, Session, StackAuthConfig } from './types.js';
import { recordProviderApiTime } from './server/performance.js';

// Simple in-memory session cache for performance optimization
interface CachedSession {
  user: User | null;
  session: Session | null;
  timestamp: number;
}

const sessionCache = new Map<string, CachedSession>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from request for session caching
 */
function generateCacheKey(request: Request): string {
  // Use cookies as primary cache key source
  const cookies = request.headers.get('cookie') || '';
  const authCookies = cookies.split(';')
    .filter(cookie => cookie.trim().startsWith('stack-'))
    .sort()
    .join(';');
  
  // Fallback to Authorization header if no auth cookies
  if (!authCookies) {
    const authHeader = request.headers.get('authorization') || request.headers.get('x-stack-auth') || '';
    return `auth:${authHeader.slice(0, 32)}`; // Use first 32 chars for cache key
  }
  
  return `cookies:${authCookies.slice(0, 64)}`; // Use first 64 chars for cache key
}

/**
 * Get cached session if valid and within TTL
 */
function getCachedSession(cacheKey: string): { user: User | null; session: Session | null } | null {
  const cached = sessionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { user: cached.user, session: cached.session };
  }
  
  // Clean up expired cache entry
  if (cached) {
    sessionCache.delete(cacheKey);
  }
  
  return null;
}

/**
 * Cache session data with timestamp
 */
function setCachedSession(cacheKey: string, user: User | null, session: Session | null): void {
  sessionCache.set(cacheKey, {
    user,
    session,
    timestamp: Date.now()
  });
}

/**
 * Validate session and resolve user using Stack Auth SDK
 */
async function validateSession(config: StackAuthConfig, request: Request): Promise<{ user: User | null; session: Session | null }> {
  try {
    // Initialize Stack Auth server app with request-based token store
    const stackApp = new StackServerApp({
      projectId: config.projectId,
      publishableClientKey: config.publishableClientKey,
      secretServerKey: config.secretServerKey,
      ...(config.baseUrl && { baseUrl: config.baseUrl }),
      tokenStore: request // Stack Auth will extract tokens from cookies/headers automatically
    });

    // Track Stack Auth API response time
    const apiStartTime = performance.now();
    
    // Get user - this handles session validation internally
    const user = await stackApp.getUser();
    
    // Record API response time
    const apiResponseTime = performance.now() - apiStartTime;
    recordProviderApiTime(apiResponseTime);
    
    if (user) {
      // User is authenticated - access session if available
      const session = user.currentSession || null;
      return { user, session };
    }
    
    // No valid session
    return { user: null, session: null };
    
  } catch (error) {
    // Handle session validation errors gracefully
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Stack Auth session validation error:', error instanceof Error ? error.message : error);
    }
    
    return { user: null, session: null };
  }
}

/**
 * Stack Auth middleware with full session management
 * 
 * Validates Stack Auth configuration, performs session validation,
 * resolves user data, and populates Astro.locals with caching optimization.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  try {
    // Validate Stack Auth configuration
    const { config, validation } = tryGetConfig();
    
    if (!validation.isValid) {
      // Configuration is invalid - handle gracefully
      if (process.env.NODE_ENV === 'development') {
        const setupGuide = createSetupGuide();
        const errorMessage = createErrorWithGuide(
          'Stack Auth Configuration Invalid',
          `Missing or invalid configuration:\n${validation.errors.join('\n')}`,
          [
            'Check your environment variables are set correctly',
            'Ensure STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY, and STACK_SECRET_SERVER_KEY are defined',
            'Refer to the setup guide below'
          ]
        );
        
        console.error(`❌ ${errorMessage}\n\n${setupGuide}`);
        
        // Add debugging context in development
        if (context.url.searchParams.has('debug-auth')) {
          console.log('🔍 Stack Auth Debug Info:', {
            hasProjectId: !!process.env.STACK_PROJECT_ID,
            hasPublishableKey: !!process.env.STACK_PUBLISHABLE_CLIENT_KEY,
            hasSecretKey: !!process.env.STACK_SECRET_SERVER_KEY,
            validationErrors: validation.errors,
            validationWarnings: validation.warnings
          });
        }
      } else {
        // In production, log errors but don't expose configuration details
        console.error('❌ Stack Auth configuration invalid - authentication disabled');
      }
      
      // Set locals to null when configuration is invalid
      context.locals.user = null;
      context.locals.session = null;
    } else {
      // Configuration is valid - proceed with session management
      
      // Log warnings in development
      if (process.env.NODE_ENV === 'development' && validation.warnings.length > 0) {
        console.warn('⚠️  Stack Auth configuration warnings:');
        validation.warnings.forEach(warning => 
          console.warn(`   • ${warning}`)
        );
      }
      
      // Generate cache key for this request
      const cacheKey = generateCacheKey(context.request);
      
      // Try to get cached session first
      const cached = getCachedSession(cacheKey);
      if (cached) {
        // Use cached session data
        context.locals.user = cached.user;
        context.locals.session = cached.session;
        
        if (process.env.NODE_ENV === 'development' && context.url.searchParams.has('debug-auth')) {
          console.log('🔍 Stack Auth: Using cached session data');
        }
      } else {
        // No valid cache - perform session validation
        const { user, session } = await validateSession(config, context.request);
        
        // Populate Astro.locals
        context.locals.user = user;
        context.locals.session = session;
        
        // Cache the session data
        setCachedSession(cacheKey, user, session);
        
        if (process.env.NODE_ENV === 'development' && context.url.searchParams.has('debug-auth')) {
          console.log('🔍 Stack Auth: Session validated and cached', {
            hasUser: !!user,
            hasSession: !!session,
            cacheKey: cacheKey.slice(0, 20) + '...'
          });
        }
      }
    }
    
    // Continue with request processing
    return await next();
    
  } catch (error) {
    // Handle unexpected errors gracefully
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Stack Auth middleware error:', error);
      
      // Provide helpful debugging information
      if (error instanceof StackAuthEnvironmentError) {
        console.error('Environment configuration issue:', error.missingVariables);
      } else if (error instanceof StackAuthConfigurationError) {
        console.error('Configuration validation failed');
      }
    } else {
      console.error('❌ Stack Auth middleware encountered an error - authentication disabled');
    }
    
    // Ensure locals are set even on error
    context.locals.user = null;
    context.locals.session = null;
    
    // Continue processing - don't let middleware errors break the application
    return await next();
  }
});