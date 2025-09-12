/**
 * Error Recovery Utilities for Stack Auth Integration
 * 
 * This module provides centralized error recovery mechanisms, retry logic,
 * and fallback strategies for handling Stack Auth API failures gracefully.
 */

import type { APIContext } from 'astro';

/**
 * Configuration for error recovery mechanisms
 */
export interface ErrorRecoveryConfig {
  /**
   * Maximum number of retry attempts for transient errors
   */
  maxRetries: number;
  
  /**
   * Base delay between retry attempts (milliseconds)
   */
  retryDelayMs: number;
  
  /**
   * Whether to use exponential backoff for retries
   */
  useExponentialBackoff: boolean;
  
  /**
   * Circuit breaker threshold - failures before circuit opens
   */
  circuitBreakerThreshold: number;
  
  /**
   * Circuit breaker reset timeout (milliseconds)
   */
  circuitBreakerResetTimeout: number;
  
  /**
   * Cache TTL for fallback data (milliseconds)
   */
  fallbackCacheTTL: number;
}

/**
 * Default error recovery configuration
 */
export const DEFAULT_ERROR_RECOVERY_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  useExponentialBackoff: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 30000,
  fallbackCacheTTL: 5 * 60 * 1000 // 5 minutes
};

/**
 * Error classification for recovery strategies
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  CONFIGURATION = 'configuration',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Error recovery strategy
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  FAIL_FAST = 'fail_fast',
  CIRCUIT_BREAKER = 'circuit_breaker'
}

/**
 * Circuit breaker state management
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(private config: ErrorRecoveryConfig) {}
  
  /**
   * Check if circuit breaker allows the request
   */
  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime > this.config.circuitBreakerResetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    // Half-open state - allow one request
    return true;
  }
  
  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  /**
   * Record a failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.state = 'open';
    } else if (this.state === 'half-open') {
      this.state = 'open';
    }
  }
  
  /**
   * Get current circuit breaker state
   */
  getState(): string {
    return this.state;
  }
}

/**
 * Global circuit breaker instance
 */
const circuitBreaker = new CircuitBreaker(DEFAULT_ERROR_RECOVERY_CONFIG);

/**
 * Classify error type for appropriate recovery strategy
 */
export function classifyError(error: unknown): ErrorType {
  if (!error || typeof error !== 'object') {
    return ErrorType.UNKNOWN;
  }
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
  
  // Network errors
  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
    return ErrorType.TIMEOUT;
  }
  
  if (errorMessage.includes('enotfound') || 
      errorMessage.includes('econnrefused') || 
      errorMessage.includes('enetunreach') ||
      errorMessage.includes('fetch')) {
    return ErrorType.NETWORK;
  }
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || 
      errorMessage.includes('invalid token') ||
      errorMessage.includes('expired')) {
    return ErrorType.AUTHENTICATION;
  }
  
  // Configuration errors
  if (errorMessage.includes('project not found') ||
      errorMessage.includes('invalid credentials') ||
      errorMessage.includes('invalid project')) {
    return ErrorType.CONFIGURATION;
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return ErrorType.RATE_LIMIT;
  }
  
  // Server errors (5xx responses)
  if ('status' in error && typeof (error as any).status === 'number') {
    const status = (error as any).status;
    if (status >= 500) {
      return ErrorType.SERVER;
    }
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Determine recovery strategy based on error type
 */
export function getRecoveryStrategy(errorType: ErrorType): RecoveryStrategy {
  switch (errorType) {
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
    case ErrorType.SERVER:
      return RecoveryStrategy.RETRY;
      
    case ErrorType.AUTHENTICATION:
      return RecoveryStrategy.FALLBACK;
      
    case ErrorType.CONFIGURATION:
      return RecoveryStrategy.FAIL_FAST;
      
    case ErrorType.RATE_LIMIT:
      return RecoveryStrategy.CIRCUIT_BREAKER;
      
    default:
      return RecoveryStrategy.FALLBACK;
  }
}

/**
 * Execute function with retry logic and error recovery
 */
export async function executeWithRecovery<T>(
  operation: () => Promise<T>,
  config: Partial<ErrorRecoveryConfig> = {},
  context?: string
): Promise<T | null> {
  const finalConfig = { ...DEFAULT_ERROR_RECOVERY_CONFIG, ...config };
  let lastError: unknown;
  
  // Check circuit breaker
  if (!circuitBreaker.canExecute()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Stack Auth: Circuit breaker is open, skipping request');
    }
    return null;
  }
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await operation();
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);
      const strategy = getRecoveryStrategy(errorType);
      
      // Log error details in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️  Stack Auth: Operation failed (attempt ${attempt + 1}/${finalConfig.maxRetries + 1})`, {
          context,
          errorType,
          strategy,
          error: error instanceof Error ? error.message : error
        });
      }
      
      // Check if we should retry
      if (attempt < finalConfig.maxRetries && strategy === RecoveryStrategy.RETRY) {
        const delay = finalConfig.useExponentialBackoff
          ? finalConfig.retryDelayMs * Math.pow(2, attempt)
          : finalConfig.retryDelayMs;
          
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Record failure for circuit breaker
      if (strategy === RecoveryStrategy.CIRCUIT_BREAKER || errorType === ErrorType.SERVER) {
        circuitBreaker.recordFailure();
      }
      
      // Handle based on strategy
      if (strategy === RecoveryStrategy.FAIL_FAST) {
        throw error;
      }
      
      // For other strategies, return null (fallback)
      break;
    }
  }
  
  // All retries exhausted or fallback strategy
  if (process.env.NODE_ENV === 'development' && lastError) {
    console.warn('⚠️  Stack Auth: Operation failed after all retries, falling back', {
      context,
      error: lastError instanceof Error ? lastError.message : lastError
    });
  }
  
  return null;
}

/**
 * Create detailed error response with recovery guidance
 */
export function createRecoveryErrorResponse(
  error: unknown,
  context: APIContext,
  operationType: string = 'API request'
): Response {
  const errorType = classifyError(error);
  const { url, request } = context;
  const method = request.method;
  const path = url.pathname.replace(/^.*\/handler\//, '');
  
  // Error-specific guidance
  const getErrorGuidance = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return {
          description: 'Network connectivity issue prevented communication with Stack Auth',
          steps: [
            'Check your internet connection',
            'Verify Stack Auth service status at https://status.stack-auth.com/',
            'Check firewall settings allow HTTPS to *.stack-auth.com',
            'Try again in a few moments'
          ]
        };
        
      case ErrorType.TIMEOUT:
        return {
          description: 'Request to Stack Auth API timed out',
          steps: [
            'Check your internet connection speed',
            'Verify Stack Auth service status',
            'Try again with a slower connection',
            'Contact support if timeouts persist'
          ]
        };
        
      case ErrorType.AUTHENTICATION:
        return {
          description: 'Authentication credentials are invalid or expired',
          steps: [
            'Check your STACK_SECRET_SERVER_KEY is correct',
            'Verify the key matches your project ID',
            'Regenerate API keys if they may have been compromised',
            'Ensure you\'re using the correct environment keys'
          ]
        };
        
      case ErrorType.CONFIGURATION:
        return {
          description: 'Stack Auth configuration is invalid',
          steps: [
            'Verify STACK_PROJECT_ID is correct',
            'Check that your project exists in Stack Auth dashboard',
            'Ensure API keys have proper permissions',
            'Confirm you\'re using the correct environment'
          ]
        };
        
      case ErrorType.RATE_LIMIT:
        return {
          description: 'Too many requests sent to Stack Auth API',
          steps: [
            'Wait before retrying (check Retry-After header)',
            'Implement exponential backoff in your application',
            'Contact Stack Auth support about rate limits',
            'Consider upgrading your Stack Auth plan'
          ]
        };
        
      case ErrorType.SERVER:
        return {
          description: 'Stack Auth API is experiencing server issues',
          steps: [
            'Check Stack Auth service status',
            'Try again in a few minutes',
            'Implement fallback authentication if critical',
            'Contact Stack Auth support if issues persist'
          ]
        };
        
      default:
        return {
          description: 'An unexpected error occurred while communicating with Stack Auth',
          steps: [
            'Check the browser console for more details',
            'Verify your Stack Auth configuration',
            'Try refreshing the page',
            'Contact support if the issue persists'
          ]
        };
    }
  };
  
  const guidance = getErrorGuidance(errorType);
  const circuitBreakerState = circuitBreaker.getState();
  
  const errorResponse = {
    error: 'Stack Auth Error',
    message: `Failed to ${operationType}`,
    details: {
      path,
      method,
      errorType,
      circuitBreakerState,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    },
    troubleshooting: {
      description: guidance.description,
      steps: guidance.steps,
      documentation: 'https://docs.stack-auth.com/troubleshooting',
      support: 'https://stack-auth.com/support',
      status: 'https://status.stack-auth.com/'
    }
  };
  
  // Determine appropriate HTTP status code
  let statusCode = 502; // Bad Gateway (default for proxy errors)
  
  if (errorType === ErrorType.AUTHENTICATION) {
    statusCode = 401; // Unauthorized
  } else if (errorType === ErrorType.CONFIGURATION) {
    statusCode = 400; // Bad Request
  } else if (errorType === ErrorType.RATE_LIMIT) {
    statusCode = 429; // Too Many Requests
  } else if (errorType === ErrorType.TIMEOUT) {
    statusCode = 504; // Gateway Timeout
  }
  
  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Error-Type': errorType,
      'X-Circuit-Breaker-State': circuitBreakerState
    }
  });
}

/**
 * Enhanced error logging with context
 */
export function logRecoveryEvent(
  event: 'error' | 'recovery' | 'fallback' | 'circuit_breaker',
  context: {
    operation?: string;
    errorType?: ErrorType;
    attempt?: number;
    success?: boolean;
    duration?: number;
    error?: unknown;
  }
): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const logLevel = event === 'error' ? 'error' : 'warn';
    
    console[logLevel](`🔄 Stack Auth Recovery [${timestamp}]`, {
      event,
      ...context
    });
  }
}

/**
 * Get recovery statistics for monitoring
 */
export function getRecoveryStats(): {
  circuitBreakerState: string;
  circuitBreakerFailures: number;
  lastFailureTime: number;
} {
  return {
    circuitBreakerState: circuitBreaker.getState(),
    circuitBreakerFailures: (circuitBreaker as any).failureCount,
    lastFailureTime: (circuitBreaker as any).lastFailureTime
  };
}

/**
 * Reset recovery mechanisms (useful for testing)
 */
export function resetRecoveryState(): void {
  (circuitBreaker as any).failureCount = 0;
  (circuitBreaker as any).lastFailureTime = 0;
  (circuitBreaker as any).state = 'closed';
}