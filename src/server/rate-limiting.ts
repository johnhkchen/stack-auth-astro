/**
 * Rate limiting implementation for Stack Auth endpoints
 * 
 * Provides in-memory rate limiting with configurable windows and limits
 * to protect against brute force attacks and API abuse.
 */

import { getClientIP, generateRateLimitKey, SecurityError } from './security.js';
import type { APIContext } from 'astro';

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  keyGenerator?: (request: Request) => string; // Custom key generation
  onLimitReached?: (key: string, limit: RateLimitConfig) => void; // Callback when limit reached
}

// Rate limit store entry
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Default rate limiting configurations
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints (signin, signup, etc.)
  AUTH_ENDPOINTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 attempts per 15 minutes
    skipSuccessfulRequests: true
  } as RateLimitConfig,
  
  // Password reset endpoints
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 attempts per hour
    skipSuccessfulRequests: false
  } as RateLimitConfig,
  
  // General API endpoints
  GENERAL_API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    skipSuccessfulRequests: true
  } as RateLimitConfig,
  
  // Strict rate limiting for sensitive operations
  SENSITIVE_OPERATIONS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    skipSuccessfulRequests: false
  } as RateLimitConfig
} as const;

/**
 * In-memory rate limit store
 * In production, this should be replaced with Redis or another distributed store
 */
class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    
    // Remove expired entries
    if (entry && Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry;
  }
  
  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }
  
  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const existing = this.get(key);
    
    if (!existing) {
      // First request in window
      const entry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      };
      this.set(key, entry);
      return entry;
    }
    
    // Increment existing entry
    existing.count++;
    this.set(key, existing);
    return existing;
  }
  
  reset(key: string): void {
    this.store.delete(key);
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
  
  // Debug methods for testing
  size(): number {
    return this.store.size;
  }
  
  clear(): void {
    this.store.clear();
  }
}

// Global rate limit store instance
const rateLimitStore = new InMemoryRateLimitStore();

/**
 * Rate limit result information
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // Seconds until retry allowed
}

/**
 * Apply rate limiting to a request
 */
export function checkRateLimit(
  request: Request, 
  config: RateLimitConfig,
  customKey?: string
): RateLimitResult {
  // Generate rate limit key
  const key = customKey || (config.keyGenerator ? 
    config.keyGenerator(request) : 
    generateRateLimitKey(request, 'ip')
  );
  
  // Get current entry and increment
  const entry = rateLimitStore.increment(key, config.windowMs);
  
  const result: RateLimitResult = {
    success: entry.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime
  };
  
  // Calculate retry after if limit exceeded
  if (!result.success) {
    result.retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
    
    // Call limit reached callback if configured
    if (config.onLimitReached) {
      config.onLimitReached(key, config);
    }
  }
  
  return result;
}

/**
 * Apply rate limiting and throw error if limit exceeded
 */
export function enforceRateLimit(
  request: Request,
  config: RateLimitConfig,
  customKey?: string
): RateLimitResult {
  const result = checkRateLimit(request, config, customKey);
  
  if (!result.success) {
    const error = new SecurityError(
      `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      'RATE_LIMIT_EXCEEDED'
    );
    
    // Add rate limit info to error
    (error as any).rateLimit = result;
    throw error;
  }
  
  return result;
}

/**
 * Remove rate limiting for successful authentication (if configured)
 */
export function clearRateLimit(request: Request, config: RateLimitConfig, customKey?: string): void {
  if (config.skipSuccessfulRequests) {
    const key = customKey || (config.keyGenerator ? 
      config.keyGenerator(request) : 
      generateRateLimitKey(request, 'ip')
    );
    rateLimitStore.reset(key);
  }
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export function createRateLimitMiddleware(config: RateLimitConfig, customKeyGenerator?: (context: APIContext) => string) {
  return (context: APIContext, next: () => Promise<Response>): Promise<Response> => {
    const key = customKeyGenerator ? customKeyGenerator(context) : undefined;
    
    try {
      const result = enforceRateLimit(context.request, config, key);
      
      // Add rate limit headers to response
      return next().then(response => {
        response.headers.set('X-RateLimit-Limit', result.limit.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        return response;
      });
      
    } catch (error) {
      if (error instanceof SecurityError && error.code === 'RATE_LIMIT_EXCEEDED') {
        const rateLimitInfo = (error as any).rateLimit as RateLimitResult;
        
        return Promise.resolve(new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: error.message,
          retryAfter: rateLimitInfo.retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Retry-After': rateLimitInfo.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString()
          }
        }));
      }
      
      throw error;
    }
  };
}

/**
 * Rate limiting utilities for different authentication scenarios
 */
export const RateLimiters = {
  /**
   * Rate limiter for authentication attempts (signin, signup)
   */
  authAttempts: (context: APIContext, next: () => Promise<Response>) => {
    return createRateLimitMiddleware(RATE_LIMIT_CONFIGS.AUTH_ENDPOINTS)(context, next);
  },
  
  /**
   * Rate limiter for password reset requests
   */
  passwordReset: (context: APIContext, next: () => Promise<Response>) => {
    return createRateLimitMiddleware(
      RATE_LIMIT_CONFIGS.PASSWORD_RESET,
      // Use email-based key for password reset if available
      (ctx) => {
        try {
          const url = new URL(ctx.request.url);
          const email = url.searchParams.get('email');
          if (email) {
            return generateRateLimitKey(ctx.request, 'user', email.toLowerCase());
          }
        } catch {
          // Fallback to IP-based limiting
        }
        return generateRateLimitKey(ctx.request, 'ip');
      }
    )(context, next);
  },
  
  /**
   * Rate limiter for sensitive operations (account changes, etc.)
   */
  sensitiveOperations: (context: APIContext, next: () => Promise<Response>) => {
    return createRateLimitMiddleware(
      RATE_LIMIT_CONFIGS.SENSITIVE_OPERATIONS,
      // Use user-based key if authenticated
      (ctx) => {
        const user = (ctx.locals as any).user;
        if (user && user.id) {
          return generateRateLimitKey(ctx.request, 'user', user.id);
        }
        return generateRateLimitKey(ctx.request, 'ip');
      }
    )(context, next);
  },
  
  /**
   * General API rate limiter
   */
  general: (context: APIContext, next: () => Promise<Response>) => {
    return createRateLimitMiddleware(RATE_LIMIT_CONFIGS.GENERAL_API)(context, next);
  }
};

/**
 * Get current rate limit status for a request
 */
export function getRateLimitStatus(request: Request, config: RateLimitConfig, customKey?: string): RateLimitResult {
  return checkRateLimit(request, config, customKey);
}

/**
 * Reset rate limit for testing purposes
 */
export function resetRateLimit(request: Request, config: RateLimitConfig, customKey?: string): void {
  const key = customKey || (config.keyGenerator ? 
    config.keyGenerator(request) : 
    generateRateLimitKey(request, 'ip')
  );
  rateLimitStore.reset(key);
}

/**
 * Get rate limit store statistics (for monitoring/debugging)
 */
export function getRateLimitStats(): { totalKeys: number } {
  return {
    totalKeys: rateLimitStore.size()
  };
}

/**
 * Clean up rate limit store (for testing/shutdown)
 */
export function cleanup(): void {
  rateLimitStore.destroy();
}