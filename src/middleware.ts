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
import { tryGetConfig } from './config.js';
import { createSetupGuide } from './validation.js';
import { 
  StackAuthEnvironmentError, 
  StackAuthConfigurationError,
  createErrorWithGuide 
} from './errors.js';
import type { StackAuthConfig } from './types.js';
import type { User, Session } from './rest-api/types.js';
import { recordProviderApiTime } from './server/performance.js';
import { StackAuthRestClient } from './rest-api/client.js';

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
 * Validate session and resolve user using Stack Auth REST API
 */
async function validateSession(config: StackAuthConfig, request: Request): Promise<{ user: User | null; session: Session | null }> {
  try {
    // Initialize Stack Auth REST client
    const client = new StackAuthRestClient({
      projectId: config.projectId,
      publishableClientKey: config.publishableClientKey,
      secretServerKey: config.secretServerKey,
      baseUrl: config.baseUrl
    });

    // Track Stack Auth API response time
    const apiStartTime = performance.now();
    
    // Get user and session - REST client handles token extraction from request
    const { user, session } = await client.getUserAndSession(request);
    
    // Record API response time
    const apiResponseTime = performance.now() - apiStartTime;
    recordProviderApiTime(apiResponseTime);
    
    return { user, session };
    
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
        // Provide specific, helpful error messages for missing environment variables
        const missingVars = [];
        if (!process.env.STACK_PROJECT_ID) missingVars.push('STACK_PROJECT_ID');
        if (!process.env.STACK_PUBLISHABLE_CLIENT_KEY) missingVars.push('STACK_PUBLISHABLE_CLIENT_KEY');
        if (!process.env.STACK_SECRET_SERVER_KEY) missingVars.push('STACK_SECRET_SERVER_KEY');
        
        if (missingVars.length > 0) {
          // Show specific missing variable error with actionable steps
          const specificError = missingVars.map(varName => {
            switch(varName) {
              case 'STACK_PROJECT_ID':
                return `\n🔑 Missing STACK_PROJECT_ID\n   → Go to https://app.stack-auth.com\n   → Select your project\n   → Copy the Project ID from settings\n   → Add to .env: STACK_PROJECT_ID=your_project_id`;
              case 'STACK_PUBLISHABLE_CLIENT_KEY':
                return `\n🔑 Missing STACK_PUBLISHABLE_CLIENT_KEY\n   → Go to https://app.stack-auth.com\n   → Navigate to API Keys\n   → Copy the Publishable Client Key\n   → Add to .env: STACK_PUBLISHABLE_CLIENT_KEY=pk_...`;
              case 'STACK_SECRET_SERVER_KEY':
                return `\n🔑 Missing STACK_SECRET_SERVER_KEY\n   → Go to https://app.stack-auth.com\n   → Navigate to API Keys\n   → Copy the Secret Server Key\n   → Add to .env: STACK_SECRET_SERVER_KEY=sk_...\n   ⚠️  Keep this key secret!`;
              default:
                return '';
            }
          }).join('\n');
          
          console.error(`❌ Stack Auth Configuration Error\n${specificError}\n\n📚 Quick Setup Guide:\n   1. Create a .env file in your project root\n   2. Add all three required environment variables\n   3. Restart your development server\n\n💡 Learn more: https://docs.stack-auth.com/getting-started`);
        } else {
          // Show validation errors for invalid configuration
          const setupGuide = createSetupGuide();
          const errorMessage = createErrorWithGuide(
            'Stack Auth Configuration Invalid',
            `Configuration issues found:\n${validation.errors.join('\n')}`,
            [
              'Verify your API keys are correct',
              'Check that keys match your project',
              'Ensure you\'re using the right environment (test vs live)'
            ]
          );
          
          console.error(`❌ ${errorMessage}\n\n${setupGuide}`);
        }
        
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
        // In production, log minimal error without exposing sensitive details
        console.error('Stack Auth: Configuration error detected. Check server logs.');
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
        if (!config) {
          // Handle null config case - set empty locals and continue
          context.locals.user = null;
          context.locals.session = null;
          setCachedSession(cacheKey, null, null);
        } else {
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