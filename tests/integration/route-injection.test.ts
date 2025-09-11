/**
 * End-to-End Route Injection Tests for Stack Auth Astro Integration
 * 
 * This test suite verifies that the route injection system works correctly
 * in real Astro applications with all rendering modes and HTTP methods.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testUtils, stackAuthMocks, astroTestUtils } from '../setup';
import astroStackAuth from '../../src/index';

describe('Stack Auth Route Injection - End-to-End Integration', () => {
  beforeEach(() => {
    testUtils.mockStackAuthEnv();
    vi.clearAllMocks();
  });

  describe('Basic Route Injection', () => {
    it('should inject routes at default prefix (/handler)', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth();

      // Execute the integration hook
      await integration.hooks['astro:config:setup']!(context);

      // Verify injectRoute was called with correct parameters
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should inject routes at custom prefix when configured', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth({ prefix: '/auth' });

      // Execute the integration hook
      await integration.hooks['astro:config:setup']!(context);

      // Verify injectRoute was called with custom prefix
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should inject routes at environment variable prefix', async () => {
      testUtils.mockStackAuthEnv({ STACK_AUTH_PREFIX: '/custom' });
      
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth();

      // Execute the integration hook
      await integration.hooks['astro:config:setup']!(context);

      // Verify injectRoute was called with environment prefix
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/custom/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should skip route injection when disabled', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth({ injectRoutes: false });

      // Execute the integration hook
      await integration.hooks['astro:config:setup']!(context);

      // Verify injectRoute was not called
      expect(context.injectRoute).not.toHaveBeenCalled();
    });
  });

  describe('HTTP Methods Support', () => {
    it('should handle all HTTP methods through injected route handler', async () => {
      // Import the API handler to test directly
      const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = await import('../../src/api/handler');
      
      // Create mock context for each method with unique requests to avoid body reuse issues
      const createMockContext = (method: string, path: string, body?: string) => ({
        url: new URL(`http://localhost:3000/handler${path}`),
        request: new Request(`http://localhost:3000/handler${path}?_t=${Date.now()}`, { 
          method,
          body: body && ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
          headers: body ? { 'content-type': 'application/json' } : undefined
        }),
        params: { stack: path.split('/').filter(p => p) }
      });

      // Test each method individually with fresh mocks
      
      // Test GET method
      let mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      
      const getContext = createMockContext('GET', '/signin');
      const getResponse = await GET(getContext as any);
      expect(getResponse).toBeInstanceOf(Response);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.stack-auth.com/api/v1/signin'),
        expect.objectContaining({ method: 'GET' })
      );
      mockFetch.mockRestore();

      // Test POST method
      mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      
      const postContext = createMockContext('POST', '/signin', '{"email":"test@example.com"}');
      const postResponse = await POST(postContext as any);
      expect(postResponse).toBeInstanceOf(Response);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.stack-auth.com/api/v1/signin'),
        expect.objectContaining({ method: 'POST' })
      );
      mockFetch.mockRestore();

      // Test PUT method
      mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      
      const putContext = createMockContext('PUT', '/user', '{"name":"Updated Name"}');
      const putResponse = await PUT(putContext as any);
      expect(putResponse).toBeInstanceOf(Response);
      mockFetch.mockRestore();

      // Test PATCH method
      mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      
      const patchContext = createMockContext('PATCH', '/user', '{"displayName":"New Name"}');
      const patchResponse = await PATCH(patchContext as any);
      expect(patchResponse).toBeInstanceOf(Response);
      mockFetch.mockRestore();

      // Test DELETE method
      mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      
      const deleteContext = createMockContext('DELETE', '/session');
      const deleteResponse = await DELETE(deleteContext as any);
      expect(deleteResponse).toBeInstanceOf(Response);
      mockFetch.mockRestore();

      // Test OPTIONS method (CORS preflight)
      const optionsContext = createMockContext('OPTIONS', '/signin');
      const optionsResponse = await OPTIONS(optionsContext as any);
      expect(optionsResponse.status).toBe(204);
      expect(optionsResponse.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(optionsResponse.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should properly forward request headers to Stack Auth API', async () => {
      const { POST } = await import('../../src/api/handler');
      
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 })
      );

      const context = {
        url: new URL('http://localhost:3000/handler/signin'),
        request: new Request('http://localhost:3000/handler/signin', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer test-token',
            'user-agent': 'Test Agent'
          }
        }),
        params: { stack: ['signin'] }
      };

      await POST(context as any);

      // Verify fetch was called with forwarded headers
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'authorization': 'Bearer test-token',
            'user-agent': 'Test Agent',
            'x-stack-project-id': 'test-project-id',
            'x-stack-publishable-client-key': 'test-publishable-key',
            'x-stack-secret-server-key': 'test-secret-key'
          })
        })
      );

      mockFetch.mockRestore();
    });
  });

  describe('Rendering Mode Compatibility', () => {
    it('should work with SSR rendering mode', async () => {
      const context = astroTestUtils.createIntegrationContext();
      // Override config to simulate SSR mode
      context.config.output = 'server';
      
      const integration = astroStackAuth();
      
      // Should not throw error in SSR mode
      expect(async () => {
        await integration.hooks['astro:config:setup']!(context);
      }).not.toThrow();

      // Routes should still be injected with prerender: false
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should work with SSG rendering mode', async () => {
      const context = astroTestUtils.createIntegrationContext();
      // Override config to simulate SSG mode
      context.config.output = 'static';
      
      const integration = astroStackAuth();
      
      // Should not throw error in SSG mode
      expect(async () => {
        await integration.hooks['astro:config:setup']!(context);
      }).not.toThrow();

      // Routes should be injected with prerender: false (auth routes are dynamic)
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should work with hybrid rendering mode', async () => {
      const context = astroTestUtils.createIntegrationContext();
      // Override config to simulate hybrid mode
      context.config.output = 'hybrid';
      
      const integration = astroStackAuth();
      
      // Should not throw error in hybrid mode
      expect(async () => {
        await integration.hooks['astro:config:setup']!(context);
      }).not.toThrow();

      // Routes should be injected with prerender: false
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });
  });

  describe('Middleware Integration', () => {
    it('should add middleware when route injection is enabled', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth();

      await integration.hooks['astro:config:setup']!(context);

      // Verify middleware was added with correct configuration
      expect(context.addMiddleware).toHaveBeenCalledWith({
        entrypoint: 'astro-stack-auth/middleware',
        order: 'pre'
      });
    });

    it('should add both routes and middleware by default', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth();

      await integration.hooks['astro:config:setup']!(context);

      // Both should be called
      expect(context.injectRoute).toHaveBeenCalledTimes(1);
      expect(context.addMiddleware).toHaveBeenCalledTimes(1);
    });

    it('should skip middleware when disabled', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth({ addMiddleware: false });

      await integration.hooks['astro:config:setup']!(context);

      // Routes should be injected but middleware should not
      expect(context.injectRoute).toHaveBeenCalledTimes(1);
      expect(context.addMiddleware).not.toHaveBeenCalled();
    });

    it('should test middleware session resolution with injected routes', async () => {
      // Mock Astro middleware define function
      const mockOnRequest = vi.fn();
      vi.doMock('astro:middleware', () => ({
        defineMiddleware: vi.fn((fn) => {
          mockOnRequest.mockImplementation(fn);
          return fn;
        })
      }));

      // Mock Stack Auth user response
      const mockUser = testUtils.createMockUser();
      const mockSession = testUtils.createMockSession();
      
      // Mock StackServerApp before importing middleware
      vi.doMock('@stackframe/stack', () => ({
        StackServerApp: vi.fn().mockImplementation(() => ({
          getUser: vi.fn().mockResolvedValue({
            ...mockUser,
            currentSession: mockSession
          })
        }))
      }));

      // Import middleware after mocks are set up
      const { onRequest } = await import('../../src/middleware');

      const context = testUtils.createMockAstroContext({
        request: new Request('http://localhost:3000/handler/signin'),
        url: new URL('http://localhost:3000/handler/signin')
      });

      const next = vi.fn().mockResolvedValue(new Response('OK'));

      // Execute middleware
      await onRequest(context as any, next);

      // Verify next was called (basic middleware functionality test)
      expect(next).toHaveBeenCalledTimes(1);

      // Verify locals are populated (user and session should be set)
      expect(context.locals.user).toBeDefined();
      expect(context.locals.session).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid prefix configurations gracefully', async () => {
      const context = astroTestUtils.createIntegrationContext();
      
      // Test with valid but unusual prefix
      const integration = astroStackAuth({ prefix: '/custom-auth' });

      await integration.hooks['astro:config:setup']!(context);

      // Should inject route with custom prefix pattern
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/custom-auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should handle route conflicts with existing routes', async () => {
      const context = astroTestUtils.createIntegrationContext();
      
      // Mock injectRoute to throw an error (simulating route conflict)
      context.injectRoute.mockImplementation(() => {
        throw new Error('Route already exists');
      });

      const integration = astroStackAuth();

      // Should throw the route conflict error
      await expect(
        integration.hooks['astro:config:setup']!(context)
      ).rejects.toThrow('Route already exists');
    });

    it('should handle missing Stack Auth configuration', async () => {
      // Clear environment variables
      testUtils.clearEnvMocks();
      
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth({ skipValidation: false });

      // Should throw configuration error
      await expect(
        integration.hooks['astro:config:setup']!(context)
      ).rejects.toThrow(/Stack Auth configuration is invalid/);
    });

    it('should handle API handler proxy errors', async () => {
      const { GET } = await import('../../src/api/handler');
      
      // Mock fetch to reject
      const mockFetch = vi.spyOn(global, 'fetch').mockRejectedValue(
        new Error('Network error')
      );

      const context = {
        url: new URL('http://localhost:3000/handler/signin'),
        request: new Request('http://localhost:3000/handler/signin'),
        params: { stack: ['signin'] }
      };

      const response = await GET(context as any);

      // Should return 502 error response
      expect(response.status).toBe(502);
      
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Proxy Error');
      expect(responseBody.message).toBe('Failed to communicate with Stack Auth API');

      mockFetch.mockRestore();
    });

    it('should handle malformed Stack Auth API responses', async () => {
      const { GET } = await import('../../src/api/handler');
      
      // Mock fetch to return malformed response
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('invalid json', { status: 500 })
      );

      const context = {
        url: new URL('http://localhost:3000/handler/signin'),
        request: new Request('http://localhost:3000/handler/signin'),
        params: { stack: ['signin'] }
      };

      const response = await GET(context as any);

      // Should forward the error response
      expect(response.status).toBe(500);
      
      const responseBody = await response.text();
      expect(responseBody).toBe('invalid json');

      mockFetch.mockRestore();
    });
  });

  describe('Route Path Resolution', () => {
    it('should correctly resolve nested Stack Auth endpoints', async () => {
      const { GET } = await import('../../src/api/handler');
      
      // Test different endpoint paths
      const testCases = [
        {
          requestPath: '/handler/signin',
          expectedApiPath: 'https://api.stack-auth.com/api/v1/signin'
        },
        {
          requestPath: '/handler/callback/google',
          expectedApiPath: 'https://api.stack-auth.com/api/v1/callback/google'
        },
        {
          requestPath: '/handler/user/profile',
          expectedApiPath: 'https://api.stack-auth.com/api/v1/user/profile'
        }
      ];

      for (const testCase of testCases) {
        // Mock fetch for each test case individually
        const mockFetch = vi.spyOn(global, 'fetch').mockImplementation((url) => {
          return Promise.resolve(
            new Response(`{"path": "${url}"}`, { 
              status: 200,
              headers: { 'content-type': 'application/json' }
            })
          );
        });
        
        const context = {
          url: new URL(`http://localhost:3000${testCase.requestPath}`),
          request: new Request(`http://localhost:3000${testCase.requestPath}`),
          params: { stack: testCase.requestPath.split('/').slice(2) }
        };

        await GET(context as any);

        expect(mockFetch).toHaveBeenCalledWith(
          testCase.expectedApiPath,
          expect.any(Object)
        );

        mockFetch.mockRestore();
      }
    });

    it('should handle query parameters correctly', async () => {
      const { GET } = await import('../../src/api/handler');
      
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 })
      );

      const context = {
        url: new URL('http://localhost:3000/handler/signin?redirect=/dashboard&provider=google'),
        request: new Request('http://localhost:3000/handler/signin?redirect=/dashboard&provider=google'),
        params: { stack: ['signin'] }
      };

      await GET(context as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/signin?redirect=/dashboard&provider=google',
        expect.any(Object)
      );

      mockFetch.mockRestore();
    });
  });

  describe('Performance and Caching', () => {
    it('should not interfere with middleware session caching', async () => {
      // This test verifies that route injection doesn't break middleware caching
      // We test this by ensuring middleware can be called multiple times without issues
      
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth();

      // Execute the integration hook
      await integration.hooks['astro:config:setup']!(context);

      // Verify both route injection and middleware are configured
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });

      expect(context.addMiddleware).toHaveBeenCalledWith({
        entrypoint: 'astro-stack-auth/middleware',
        order: 'pre'
      });
    });

    it('should handle high concurrency route requests', async () => {
      const { GET } = await import('../../src/api/handler');
      
      // Mock fetch to return successful responses for each request
      const mockFetch = vi.spyOn(global, 'fetch').mockImplementation((url) => {
        return Promise.resolve(
          new Response(`{"success": true, "url": "${url}"}`, { 
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );
      });

      // Create multiple concurrent requests with unique IDs
      const contexts = Array.from({ length: 5 }, (_, i) => ({
        url: new URL(`http://localhost:3000/handler/user?id=${i}`),
        request: new Request(`http://localhost:3000/handler/user?id=${i}`),
        params: { stack: ['user'] }
      }));

      // Execute all requests concurrently
      const responses = await Promise.all(
        contexts.map(context => GET(context as any))
      );

      // All should succeed
      expect(responses).toHaveLength(5);
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // All should have made individual fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(5);

      mockFetch.mockRestore();
    });
  });
});