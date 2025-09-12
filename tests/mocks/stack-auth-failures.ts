/**
 * Stack Auth Failure Simulation Utilities
 * 
 * This file provides utilities for simulating various Stack Auth API failure
 * scenarios to test error recovery mechanisms and graceful degradation.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

/**
 * Network error types and their corresponding error messages
 */
export const NetworkErrors = {
  TIMEOUT: 'fetch timeout',
  DNS_FAILURE: 'getaddrinfo ENOTFOUND api.stack-auth.com',
  CONNECTION_REFUSED: 'connect ECONNREFUSED 127.0.0.1:443',
  NETWORK_UNREACHABLE: 'connect ENETUNREACH',
  SSL_ERROR: 'unable to verify the first certificate',
  ABORT_ERROR: 'The operation was aborted'
} as const;

/**
 * Stack Auth API error responses
 */
export const StackAuthAPIErrors = {
  UNAUTHORIZED: {
    status: 401,
    body: { error: 'Unauthorized', message: 'Invalid or expired token' }
  },
  FORBIDDEN: {
    status: 403,
    body: { error: 'Forbidden', message: 'Insufficient permissions' }
  },
  PROJECT_NOT_FOUND: {
    status: 404,
    body: { error: 'Not Found', message: 'Project not found' }
  },
  RATE_LIMITED: {
    status: 429,
    body: { error: 'Too Many Requests', message: 'Rate limit exceeded' },
    headers: { 'Retry-After': '60' }
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    body: { error: 'Internal Server Error', message: 'Something went wrong' }
  },
  BAD_GATEWAY: {
    status: 502,
    body: { error: 'Bad Gateway', message: 'Upstream server error' }
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    body: { error: 'Service Unavailable', message: 'Service temporarily down' },
    headers: { 'Retry-After': '30' }
  },
  GATEWAY_TIMEOUT: {
    status: 504,
    body: { error: 'Gateway Timeout', message: 'Upstream timeout' }
  }
} as const;

/**
 * Configuration error scenarios
 */
export const ConfigurationErrors = {
  INVALID_PROJECT_ID: {
    status: 404,
    body: { error: 'Project Not Found', message: 'Invalid project ID' }
  },
  INVALID_CREDENTIALS: {
    status: 403,
    body: { error: 'Invalid Credentials', message: 'Secret key is invalid' }
  },
  EXPIRED_CREDENTIALS: {
    status: 401,
    body: { error: 'Expired Credentials', message: 'API key has expired' }
  },
  SUSPENDED_PROJECT: {
    status: 403,
    body: { error: 'Project Suspended', message: 'Project has been suspended' }
  }
} as const;

/**
 * Authentication failure scenarios
 */
export const AuthenticationErrors = {
  EXPIRED_SESSION: {
    status: 401,
    body: { error: 'Session Expired', message: 'Session has expired' }
  },
  INVALID_TOKEN: {
    status: 401,
    body: { error: 'Invalid Token', message: 'Token is malformed or invalid' }
  },
  REVOKED_TOKEN: {
    status: 401,
    body: { error: 'Token Revoked', message: 'Token has been revoked' }
  },
  MALFORMED_TOKEN: {
    status: 400,
    body: { error: 'Malformed Token', message: 'Token format is invalid' }
  }
} as const;

/**
 * Utility class for simulating Stack Auth API failures
 */
export class StackAuthFailureSimulator {
  private mockFetch: MockedFunction<typeof fetch>;

  constructor() {
    this.mockFetch = vi.fn();
    global.fetch = this.mockFetch;
  }

  /**
   * Simulate a network error
   */
  simulateNetworkError(errorType: keyof typeof NetworkErrors): void {
    const errorMessage = NetworkErrors[errorType];
    this.mockFetch.mockRejectedValue(new Error(errorMessage));
  }

  /**
   * Simulate a Stack Auth API error response
   */
  simulateAPIError(errorType: keyof typeof StackAuthAPIErrors): void {
    const error = StackAuthAPIErrors[errorType];
    this.mockFetch.mockResolvedValue(
      new Response(JSON.stringify(error.body), {
        status: error.status,
        headers: error.headers || {}
      })
    );
  }

  /**
   * Simulate configuration errors
   */
  simulateConfigurationError(errorType: keyof typeof ConfigurationErrors): void {
    const error = ConfigurationErrors[errorType];
    this.mockFetch.mockResolvedValue(
      new Response(JSON.stringify(error.body), {
        status: error.status
      })
    );
  }

  /**
   * Simulate authentication errors
   */
  simulateAuthenticationError(errorType: keyof typeof AuthenticationErrors): void {
    const error = AuthenticationErrors[errorType];
    this.mockFetch.mockResolvedValue(
      new Response(JSON.stringify(error.body), {
        status: error.status
      })
    );
  }

  /**
   * Simulate intermittent failures (fails first N calls, then succeeds)
   */
  simulateIntermittentFailure(
    failureCount: number,
    errorType: keyof typeof NetworkErrors = 'TIMEOUT',
    successResponse?: any
  ): void {
    const errorMessage = NetworkErrors[errorType];
    
    // Fail the first N calls
    for (let i = 0; i < failureCount; i++) {
      this.mockFetch.mockRejectedValueOnce(new Error(errorMessage));
    }
    
    // Then succeed
    const response = successResponse || { user: null };
    this.mockFetch.mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 })
    );
  }

  /**
   * Simulate gradual service degradation (increasing response times/error rates)
   */
  simulateServiceDegradation(stages: Array<{
    duration: number; // milliseconds
    errorRate: number; // 0-1 (0 = no errors, 1 = all errors)
    responseDelay: number; // milliseconds
  }>): void {
    let callCount = 0;
    
    this.mockFetch.mockImplementation(async () => {
      const stage = stages[Math.min(callCount, stages.length - 1)];
      callCount++;
      
      // Add delay to simulate slow responses
      await new Promise(resolve => setTimeout(resolve, stage.responseDelay));
      
      // Randomly fail based on error rate
      if (Math.random() < stage.errorRate) {
        throw new Error('Service degradation - temporary failure');
      }
      
      return new Response(JSON.stringify({ user: null }), { status: 200 });
    });
  }

  /**
   * Simulate circuit breaker scenario (many failures, then recovery)
   */
  simulateCircuitBreakerScenario(
    consecutiveFailures: number,
    recoveryAttempts: number = 3
  ): void {
    let callCount = 0;
    
    this.mockFetch.mockImplementation(async () => {
      callCount++;
      
      // Fail for consecutive failures count
      if (callCount <= consecutiveFailures) {
        throw new Error('Service overloaded - circuit breaker open');
      }
      
      // Half-open state - some calls succeed, some fail
      if (callCount <= consecutiveFailures + recoveryAttempts) {
        if (callCount % 2 === 0) {
          throw new Error('Service still recovering');
        }
      }
      
      // Full recovery
      return new Response(JSON.stringify({ user: null }), { status: 200 });
    });
  }

  /**
   * Simulate malformed responses
   */
  simulateMalformedResponse(responseType: 'invalid_json' | 'empty' | 'html' | 'truncated'): void {
    switch (responseType) {
      case 'invalid_json':
        this.mockFetch.mockResolvedValue(
          new Response('{ invalid json }', {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );
        break;
        
      case 'empty':
        this.mockFetch.mockResolvedValue(
          new Response('', {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );
        break;
        
      case 'html':
        this.mockFetch.mockResolvedValue(
          new Response('<html><body>Error page</body></html>', {
            status: 500,
            headers: { 'content-type': 'text/html' }
          })
        );
        break;
        
      case 'truncated':
        this.mockFetch.mockResolvedValue(
          new Response('{"user": {"id": "123", "email": "test@exam', {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );
        break;
    }
  }

  /**
   * Simulate CORS errors
   */
  simulateCORSError(): void {
    this.mockFetch.mockRejectedValue(
      new TypeError('Failed to fetch: CORS error')
    );
  }

  /**
   * Simulate timeout with custom duration
   */
  simulateTimeout(timeoutMs: number = 5000): void {
    this.mockFetch.mockImplementation(
      () => new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    );
  }

  /**
   * Simulate successful response after specific conditions
   */
  simulateConditionalSuccess(
    condition: () => boolean,
    successResponse: any,
    failureError: string = 'Service temporarily unavailable'
  ): void {
    this.mockFetch.mockImplementation(async () => {
      if (condition()) {
        return new Response(JSON.stringify(successResponse), { status: 200 });
      } else {
        throw new Error(failureError);
      }
    });
  }

  /**
   * Reset all mocks
   */
  reset(): void {
    this.mockFetch.mockReset();
  }

  /**
   * Restore original fetch
   */
  restore(): void {
    vi.restoreAllMocks();
  }
}

/**
 * Pre-configured failure scenarios for common testing patterns
 */
export const FailureScenarios = {
  /**
   * Complete service outage
   */
  SERVICE_OUTAGE: () => {
    const simulator = new StackAuthFailureSimulator();
    simulator.simulateNetworkError('CONNECTION_REFUSED');
    return simulator;
  },

  /**
   * Temporary network issues with recovery
   */
  NETWORK_INSTABILITY: () => {
    const simulator = new StackAuthFailureSimulator();
    simulator.simulateIntermittentFailure(3, 'TIMEOUT');
    return simulator;
  },

  /**
   * Authentication system failure
   */
  AUTH_SYSTEM_DOWN: () => {
    const simulator = new StackAuthFailureSimulator();
    simulator.simulateAPIError('SERVICE_UNAVAILABLE');
    return simulator;
  },

  /**
   * Rate limiting scenario
   */
  RATE_LIMITED: () => {
    const simulator = new StackAuthFailureSimulator();
    simulator.simulateAPIError('RATE_LIMITED');
    return simulator;
  },

  /**
   * Configuration issues
   */
  INVALID_CONFIG: () => {
    const simulator = new StackAuthFailureSimulator();
    simulator.simulateConfigurationError('INVALID_PROJECT_ID');
    return simulator;
  },

  /**
   * Progressive service degradation
   */
  GRADUAL_DEGRADATION: () => {
    const simulator = new StackAuthFailureSimulator();
    simulator.simulateServiceDegradation([
      { duration: 1000, errorRate: 0.1, responseDelay: 100 },
      { duration: 2000, errorRate: 0.3, responseDelay: 300 },
      { duration: 3000, errorRate: 0.7, responseDelay: 1000 },
      { duration: 4000, errorRate: 1.0, responseDelay: 5000 }
    ]);
    return simulator;
  }
};

/**
 * Helper function to create failure scenarios in tests
 */
export function createFailureScenario(scenarioName: keyof typeof FailureScenarios): StackAuthFailureSimulator {
  return FailureScenarios[scenarioName]();
}

/**
 * Assertion helpers for error recovery testing
 */
export const ErrorRecoveryAssertions = {
  /**
   * Assert that error was handled gracefully (no crashes, logs error)
   */
  expectGracefulErrorHandling: (
    response: any,
    consoleSpy: any,
    shouldLogError: boolean = true
  ) => {
    expect(response).toBeDefined();
    if (shouldLogError && consoleSpy) {
      expect(consoleSpy).toHaveBeenCalled();
    }
  },

  /**
   * Assert that user is treated as unauthenticated during errors
   */
  expectUnauthenticatedState: (locals: any) => {
    expect(locals.user).toBeNull();
    expect(locals.session).toBeNull();
  },

  /**
   * Assert that application continues to function during errors
   */
  expectApplicationContinues: (nextFunction: any, response: any) => {
    expect(nextFunction).toHaveBeenCalled();
    expect(response).toBeDefined();
  },

  /**
   * Assert error response has proper structure and guidance
   */
  expectHelpfulErrorResponse: async (response: Response) => {
    expect(response.status).toBeGreaterThanOrEqual(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('troubleshooting');
    expect(data.troubleshooting).toHaveProperty('steps');
    expect(data.troubleshooting).toHaveProperty('documentation');
    expect(Array.isArray(data.troubleshooting.steps)).toBe(true);
    expect(data.troubleshooting.steps.length).toBeGreaterThan(0);
  }
};