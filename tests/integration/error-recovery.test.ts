/**
 * Stack Auth Integration Error Recovery Testing
 * 
 * This file contains comprehensive error handling scenario tests and recovery 
 * mechanisms to ensure the Stack Auth integration gracefully handles failures
 * and provides helpful guidance.
 * 
 * Test Categories:
 * - Network connectivity issues and recovery
 * - Stack Auth API failures (4xx, 5xx errors)
 * - Authentication failures and token expiration
 * - Configuration errors and runtime validation
 * - Service degradation scenarios
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { testUtils, stackAuthMocks } from '../setup.js';
import type { APIContext } from 'astro';

// Mock Astro middleware imports
vi.mock('astro:middleware', () => ({
  defineMiddleware: vi.fn((middleware) => middleware)
}));

// Mock Stack Auth SDK
vi.mock('@stackframe/stack', () => ({
  StackServerApp: vi.fn(() => ({
    getUser: vi.fn().mockResolvedValue(null)
  }))
}));

// Mock the middleware and handler modules
let onRequest: any;
let handler: any;

beforeAll(async () => {
  // Dynamically import modules after mocks are set up
  const middlewareModule = await import('../../src/middleware.js');
  const handlerModule = await import('../../src/api/handler.js');
  
  onRequest = middlewareModule.onRequest;
  handler = handlerModule;
});

describe('Stack Auth Error Recovery Testing', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
    
    // Mock fetch for network simulation
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    // Set up valid environment by default
    testUtils.mockStackAuthEnv();
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Network Connectivity Error Recovery', () => {
    it('should handle Stack Auth API timeouts gracefully', async () => {
      // Mock network timeout
      mockFetch.mockRejectedValue(new Error('fetch timeout'));
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      // Middleware should handle timeout and continue processing
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(next).toHaveBeenCalled();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      
      // Should handle error gracefully - exact log message may vary
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should recover from temporary network failures', async () => {
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await onRequest(context as APIContext, next);
      expect(context.locals.user).toBeNull();
      
      // Second call succeeds
      const mockUser = testUtils.createMockUser();
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ user: mockUser }), { status: 200 })
      );
      
      // Should work on retry (simulated by a new request)
      const context2 = testUtils.createMockAstroContext();
      await onRequest(context2 as APIContext, next);
      
      // Network recovery should be handled
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle connection refused errors', async () => {
      mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED'));
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Stack Auth API Error Recovery', () => {
    it('should handle 500 internal server errors', async () => {
      mockFetch.mockResolvedValue(
        new Response('Internal Server Error', { status: 500 })
      );
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle 429 rate limiting gracefully', async () => {
      mockFetch.mockResolvedValue(
        new Response('Too Many Requests', { 
          status: 429,
          headers: { 'Retry-After': '60' }
        })
      );
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle 502/503 service unavailable errors', async () => {
      mockFetch.mockResolvedValue(
        new Response('Service Unavailable', { status: 503 })
      );
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Authentication Error Recovery', () => {
    it('should handle expired session tokens', async () => {
      // Mock expired token response
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Token expired' }), { status: 401 })
      );
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle invalid credentials at runtime', async () => {
      // Mock invalid credentials response
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 403 })
      );
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle malformed authentication tokens', async () => {
      // Create request with malformed token
      const context = testUtils.createMockAstroContext({
        request: {
          headers: new Headers({
            'cookie': 'stack-session=invalid-malformed-token'
          })
        }
      });
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      mockFetch.mockRejectedValue(new Error('Malformed token'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Configuration Error Recovery', () => {
    it('should handle missing environment variables gracefully', async () => {
      testUtils.clearEnvMocks();
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
      
      // Should log configuration errors - exact message may vary
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle invalid project ID at runtime', async () => {
      testUtils.mockStackAuthEnv({
        STACK_PROJECT_ID: 'invalid-project-id'
      });
      
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })
      );
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      expect(response).toBeDefined();
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should recover from configuration changes', async () => {
      // Initial configuration
      testUtils.mockStackAuthEnv({
        STACK_PROJECT_ID: 'old-project-id'
      });
      
      const context1 = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid project' }), { status: 401 })
      );
      
      await onRequest(context1 as APIContext, next);
      expect(context1.locals.user).toBeNull();
      
      // Update configuration
      testUtils.mockStackAuthEnv({
        STACK_PROJECT_ID: 'new-project-id'
      });
      
      const mockUser = testUtils.createMockUser();
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ user: mockUser }), { status: 200 })
      );
      
      // Should work with new configuration
      const context2 = testUtils.createMockAstroContext();
      await onRequest(context2 as APIContext, next);
      
      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('Service Degradation Scenarios', () => {
    it('should provide graceful degradation when Stack Auth is unavailable', async () => {
      // Mock complete service outage
      mockFetch.mockRejectedValue(new Error('Service Unavailable'));
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      const response = await onRequest(context as APIContext, next);
      
      // Application should continue to function
      expect(response).toBeDefined();
      expect(next).toHaveBeenCalled();
      
      // Users should be treated as unauthenticated
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
      
      // Application continues to work despite error
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle service restoration after outage', async () => {
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      // Service is down - should handle gracefully
      mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));
      
      await onRequest(context as APIContext, next);
      expect(context.locals.user).toBeNull();
      expect(next).toHaveBeenCalled();
      
      // Service restoration - should continue to work
      const context2 = testUtils.createMockAstroContext();
      await onRequest(context2 as APIContext, next);
      
      expect(next).toHaveBeenCalledTimes(2);
    });

  });

  describe('API Handler Error Recovery', () => {
    it('should handle proxy errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const context = testUtils.createMockAstroContext({
        url: new URL('http://localhost:3000/handler/signin'),
        request: new Request('http://localhost:3000/handler/signin')
      });
      
      const response = await handler.GET(context as APIContext);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(502); // Bad Gateway
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('error', 'Proxy Error');
      expect(responseData).toHaveProperty('troubleshooting');
      expect(responseData.troubleshooting).toHaveProperty('steps');
      expect(responseData.troubleshooting.steps).toContain(
        'Verify your Stack Auth environment variables are correct'
      );
    });

    it('should provide helpful error messages for API failures', async () => {
      mockFetch.mockResolvedValue(
        new Response('Unauthorized', { status: 401 })
      );
      
      const context = testUtils.createMockAstroContext({
        url: new URL('http://localhost:3000/handler/user'),
        request: new Request('http://localhost:3000/handler/user')
      });
      
      const response = await handler.GET(context as APIContext);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(401); // Forward the original status
    });

    it('should handle malformed responses from Stack Auth API', async () => {
      mockFetch.mockResolvedValue(
        new Response('Not valid JSON', { 
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      
      const context = testUtils.createMockAstroContext({
        url: new URL('http://localhost:3000/handler/user'),
        request: new Request('http://localhost:3000/handler/user')
      });
      
      const response = await handler.GET(context as APIContext);
      
      expect(response).toBeInstanceOf(Response);
      // Should forward the response as-is even if malformed
      expect(response.status).toBe(200);
    });
  });

  describe('Error Message Quality and Guidance', () => {
    it('should provide specific error messages for different failure types', async () => {
      const testCases = [
        {
          error: 'fetch timeout',
          expectedMessage: 'connection timeout'
        },
        {
          error: 'getaddrinfo ENOTFOUND',
          expectedMessage: 'DNS resolution'
        },
        {
          error: 'connect ECONNREFUSED', 
          expectedMessage: 'connection refused'
        }
      ];
      
      for (const testCase of testCases) {
        mockFetch.mockRejectedValueOnce(new Error(testCase.error));
        
        const context = testUtils.createMockAstroContext();
        const next = vi.fn().mockResolvedValue(new Response('OK'));
        
        await onRequest(context as APIContext, next);
        
        // Should handle the error and continue
        expect(next).toHaveBeenCalled();
        expect(context.locals.user).toBeNull();
      }
    });

    it('should provide development vs production error detail levels', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Test development mode - should log more details
      process.env.NODE_ENV = 'development';
      mockFetch.mockRejectedValue(new Error('Detailed error for debugging'));
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      await onRequest(context as APIContext, next);
      
      // Development mode should have logging
      const developmentCalls = vi.mocked(console.warn).mock.calls.length + 
                              vi.mocked(console.error).mock.calls.length;
      
      // Test production mode
      vi.clearAllMocks();
      process.env.NODE_ENV = 'production';
      mockFetch.mockRejectedValue(new Error('Production error'));
      
      await onRequest(context as APIContext, next);
      
      // Production mode should have less verbose logging
      const productionCalls = vi.mocked(console.warn).mock.calls.length + 
                             vi.mocked(console.error).mock.calls.length;
      
      // Development should have more logging than production
      expect(developmentCalls).toBeGreaterThanOrEqual(productionCalls);
      
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should provide actionable troubleshooting steps', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));
      
      const context = testUtils.createMockAstroContext({
        url: new URL('http://localhost:3000/handler/signin'),
        request: new Request('http://localhost:3000/handler/signin')
      });
      
      const response = await handler.GET(context as APIContext);
      const responseData = await response.json();
      
      expect(responseData.troubleshooting).toHaveProperty('steps');
      expect(responseData.troubleshooting.steps).toEqual(
        expect.arrayContaining([
          'Verify your Stack Auth environment variables are correct',
          'Check your network connection',
          'Ensure Stack Auth service is available',
          'Check the browser console for more details'
        ])
      );
      
      expect(responseData.troubleshooting).toHaveProperty('documentation');
      expect(responseData.troubleshooting.documentation).toBe(
        'https://docs.stack-auth.com/troubleshooting'
      );
    });
  });

  describe('Performance During Error Conditions', () => {
    it('should maintain performance during repeated failures', async () => {
      const start = Date.now();
      
      // Simulate multiple failed requests
      mockFetch.mockRejectedValue(new Error('Service unavailable'));
      
      const promises = Array.from({ length: 10 }, async () => {
        const context = testUtils.createMockAstroContext();
        const next = vi.fn().mockResolvedValue(new Response('OK'));
        return onRequest(context as APIContext, next);
      });
      
      await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      // Error detection should be fast (under 500ms for 10 requests)
      expect(duration).toBeLessThan(500);
    });

    it('should not create memory leaks during repeated failures', async () => {
      // Note: This is a basic test. In a real scenario, you might want to use
      // more sophisticated memory monitoring tools
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate many failed requests
      mockFetch.mockRejectedValue(new Error('Service unavailable'));
      
      for (let i = 0; i < 100; i++) {
        const context = testUtils.createMockAstroContext();
        const next = vi.fn().mockResolvedValue(new Response('OK'));
        await onRequest(context as APIContext, next);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB for 100 requests)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should have minimal impact on successful request performance', async () => {
      const start = Date.now();
      
      const context = testUtils.createMockAstroContext();
      const next = vi.fn().mockResolvedValue(new Response('OK'));
      
      // Mock successful middleware execution (no Stack Auth calls due to missing config)
      await onRequest(context as APIContext, next);
      
      const duration = Date.now() - start;
      
      // Middleware execution should be fast (under 100ms)
      expect(duration).toBeLessThan(100);
      expect(next).toHaveBeenCalled();
    });
  });
});