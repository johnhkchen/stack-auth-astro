/**
 * API Handler Tests
 * 
 * Tests the Stack Auth API proxy handler implementation
 * focusing on request forwarding, header handling, and error cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIContext } from 'astro';

// Mock the config module
vi.mock('../src/config.js', () => ({
  getConfig: vi.fn(() => ({
    projectId: 'test-project-id',
    publishableClientKey: 'test-publishable-key',
    secretServerKey: 'test-secret-key',
    prefix: '/handler'
  }))
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Stack Auth API Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockContext = (
    method: string = 'GET',
    pathname: string = '/handler/signin',
    headers: Record<string, string> = {},
    body: string = ''
  ): APIContext => ({
    request: {
      method,
      headers: new Headers(headers),
      text: vi.fn().mockResolvedValue(body)
    } as any,
    url: new URL(`https://example.com${pathname}?test=param`),
    // Add other APIContext properties as needed for testing
    locals: {},
    params: {},
    site: undefined,
    generator: 'astro',
    redirect: vi.fn(),
    cookies: {} as any,
    clientAddress: '127.0.0.1'
  });

  describe('URL creation', () => {
    it('should create correct API URL for signin endpoint', async () => {
      const { GET } = await import('../src/api/handler.js');
      const context = createMockContext('GET', '/handler/signin');
      
      mockFetch.mockResolvedValue(
        new Response('{"message":"success"}', {
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' })
        })
      );

      await GET(context);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/signin?test=param',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle nested paths correctly', async () => {
      const { POST } = await import('../src/api/handler.js');
      const context = createMockContext('POST', '/handler/auth/callback');
      
      mockFetch.mockResolvedValue(
        new Response('{"message":"success"}', { status: 200 })
      );

      await POST(context);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/auth/callback?test=param',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Header forwarding', () => {
    it('should forward allowed headers to Stack Auth API', async () => {
      const { GET } = await import('../src/api/handler.js');
      const context = createMockContext('GET', '/handler/user', {
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
        'user-agent': 'Test/1.0',
        'x-forwarded-for': '192.168.1.1'
      });
      
      mockFetch.mockResolvedValue(
        new Response('{}', { status: 200 })
      );

      await GET(context);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'authorization': 'Bearer token123',
            'content-type': 'application/json',
            'user-agent': 'Test/1.0',
            'x-forwarded-for': '192.168.1.1',
            'x-stack-project-id': 'test-project-id',
            'x-stack-publishable-client-key': 'test-publishable-key',
            'x-stack-secret-server-key': 'test-secret-key'
          })
        })
      );
    });

    it('should forward response headers back to client', async () => {
      const { GET } = await import('../src/api/handler.js');
      const context = createMockContext('GET', '/handler/session');
      
      mockFetch.mockResolvedValue(
        new Response('{"user": {"id": "123"}}', {
          status: 200,
          headers: new Headers({
            'content-type': 'application/json',
            'set-cookie': 'session=abc123; HttpOnly',
            'cache-control': 'no-cache',
            'x-ratelimit-remaining': '99'
          })
        })
      );

      const response = await GET(context);

      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('set-cookie')).toBe('session=abc123; HttpOnly');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('x-ratelimit-remaining')).toBe('99');
    });
  });

  describe('HTTP methods', () => {
    const testMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    testMethods.forEach(method => {
      it(`should handle ${method} requests`, async () => {
        const handler = await import('../src/api/handler.js');
        const handlerFn = handler[method as keyof typeof handler] as Function;
        const context = createMockContext(method, '/handler/test', {}, method === 'GET' ? '' : '{"data": "test"}');
        
        mockFetch.mockResolvedValue(
          new Response('{"success": true}', { status: 200 })
        );

        const response = await handlerFn(context);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://api.stack-auth.com/api/v1/test'),
          expect.objectContaining({
            method,
            body: method === 'GET' ? undefined : '{"data": "test"}'
          })
        );
        expect(response.status).toBe(200);
      });
    });
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const { OPTIONS } = await import('../src/api/handler.js');
      const context = createMockContext('OPTIONS', '/handler/signin', {
        'origin': 'https://myapp.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Content-Type, Authorization'
      });

      const response = await OPTIONS(context);

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe('https://myapp.com');
      expect(response.headers.get('access-control-allow-methods')).toBe('GET, POST, PUT, PATCH, DELETE, OPTIONS');
      expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type, Authorization');
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const { GET } = await import('../src/api/handler.js');
      const context = createMockContext('GET', '/handler/signin');
      
      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await GET(context);

      expect(response.status).toBe(502);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Proxy Error');
      expect(responseBody.details.error).toBe('Network error');
    });

    it('should handle config errors', async () => {
      // Mock getConfig to throw an error
      const { getConfig } = await import('../src/config.js');
      vi.mocked(getConfig).mockImplementation(() => {
        throw new Error('Missing environment variables');
      });

      const { GET } = await import('../src/api/handler.js');
      const context = createMockContext('GET', '/handler/signin');

      const response = await GET(context);

      expect(response.status).toBe(502);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Proxy Error');
    });
  });

  describe('Response forwarding', () => {
    it('should forward response status and body correctly', async () => {
      const { POST } = await import('../src/api/handler.js');
      const context = createMockContext('POST', '/handler/auth', {}, '{"username": "test"}');
      
      const responseData = { user: { id: '123', email: 'test@example.com' } };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 201,
          statusText: 'Created',
          headers: new Headers({ 'content-type': 'application/json' })
        })
      );

      const response = await POST(context);

      expect(response.status).toBe(201);
      expect(response.statusText).toBe('Created');
      
      const responseBody = await response.json();
      expect(responseBody).toEqual(responseData);
    });

    it('should handle redirect responses correctly', async () => {
      const { GET } = await import('../src/api/handler.js');
      const context = createMockContext('GET', '/handler/oauth/callback');
      
      mockFetch.mockResolvedValue(
        new Response('', {
          status: 302,
          headers: new Headers({ 'location': '/dashboard' })
        })
      );

      const response = await GET(context);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/dashboard');
    });
  });
});