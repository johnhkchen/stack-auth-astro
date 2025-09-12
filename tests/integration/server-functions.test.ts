import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUser, getSession, requireAuth } from '../../src/server.js';
import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';

describe('Server-side Authentication Functions Integration', () => {
  let mockContext: Partial<APIContext>;
  let mockRedirect: vi.Mock;
  
  // Sample test data
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    primaryEmail: 'test@example.com',
    primaryEmailAuthFactor: {
      id: 'email-auth-123',
      type: 'email'
    },
    profileImageUrl: 'https://example.com/avatar.jpg',
    signedUpAtMillis: Date.now() - 86400000, // 1 day ago
    clientMetadata: {},
    serverMetadata: {},
    oauthProviders: []
  } as User;
  
  const mockSession: Session = {
    id: 'session-123',
    userId: 'user-123',
    expiresAtMillis: Date.now() + 3600000, // 1 hour from now
    createdAtMillis: Date.now() - 1800000 // 30 minutes ago
  } as Session;

  beforeEach(() => {
    mockRedirect = vi.fn();
    
    // Set up clean environment variables
    process.env.STACK_PROJECT_ID = 'test-project-id';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-publishable-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret-key';
    process.env.STACK_AUTH_PREFIX = '/handler';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser Function', () => {
    beforeEach(() => {
      mockContext = {
        url: new URL('http://localhost:3000/dashboard'),
        request: new Request('http://localhost:3000/dashboard'),
        locals: {},
        redirect: mockRedirect
      };
    });

    it('should return user when present in context.locals', async () => {
      mockContext.locals = { user: mockUser, session: mockSession };
      
      const result = await getUser(mockContext as APIContext);
      
      expect(result).toEqual(mockUser);
      expect(result?.id).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when no user in context.locals', async () => {
      mockContext.locals = { user: null, session: null };
      
      const result = await getUser(mockContext as APIContext);
      
      expect(result).toBeNull();
    });

    it('should return null when user is undefined', async () => {
      mockContext.locals = { session: mockSession };
      
      const result = await getUser(mockContext as APIContext);
      
      expect(result).toBeNull();
    });

    it('should return null when context.locals is empty', async () => {
      mockContext.locals = {};
      
      const result = await getUser(mockContext as APIContext);
      
      expect(result).toBeNull();
    });

    it('should handle malformed user data gracefully', async () => {
      // Test with partially malformed user data
      const malformedUser = {
        id: 'user-123',
        // Missing required fields
        displayName: 'Test User'
      } as User;
      
      mockContext.locals = { user: malformedUser, session: mockSession };
      
      const result = await getUser(mockContext as APIContext);
      
      expect(result).toEqual(malformedUser);
      expect(result?.id).toBe('user-123');
    });

    it('should work with various request types', async () => {
      const scenarios = [
        {
          name: 'GET request to page',
          request: new Request('http://localhost:3000/dashboard', { method: 'GET' }),
          headers: { 'accept': 'text/html' }
        },
        {
          name: 'POST request to API',
          request: new Request('http://localhost:3000/api/user', { method: 'POST' }),
          headers: { 'accept': 'application/json' }
        },
        {
          name: 'PUT request with JSON',
          request: new Request('http://localhost:3000/api/update', { method: 'PUT' }),
          headers: { 'accept': 'application/json', 'content-type': 'application/json' }
        }
      ];

      for (const scenario of scenarios) {
        mockContext.request = new Request(scenario.request.url, {
          method: scenario.request.method,
          headers: scenario.headers
        });
        mockContext.locals = { user: mockUser, session: mockSession };
        
        const result = await getUser(mockContext as APIContext);
        
        expect(result, `Failed for ${scenario.name}`).toEqual(mockUser);
      }
    });
  });

  describe('getSession Function', () => {
    beforeEach(() => {
      mockContext = {
        url: new URL('http://localhost:3000/dashboard'),
        request: new Request('http://localhost:3000/dashboard'),
        locals: {},
        redirect: mockRedirect
      };
    });

    it('should return session when present in context.locals', async () => {
      mockContext.locals = { user: mockUser, session: mockSession };
      
      const result = await getSession(mockContext as APIContext);
      
      expect(result).toEqual(mockSession);
      expect(result?.id).toBe('session-123');
      expect(result?.userId).toBe('user-123');
    });

    it('should return null when no session in context.locals', async () => {
      mockContext.locals = { user: mockUser, session: null };
      
      const result = await getSession(mockContext as APIContext);
      
      expect(result).toBeNull();
    });

    it('should return null when session is undefined', async () => {
      mockContext.locals = { user: mockUser };
      
      const result = await getSession(mockContext as APIContext);
      
      expect(result).toBeNull();
    });

    it('should return null when context.locals is empty', async () => {
      mockContext.locals = {};
      
      const result = await getSession(mockContext as APIContext);
      
      expect(result).toBeNull();
    });

    it('should handle invalid session data gracefully', async () => {
      const invalidSession = {
        id: 'session-123',
        // Missing required fields
      } as Session;
      
      mockContext.locals = { user: mockUser, session: invalidSession };
      
      const result = await getSession(mockContext as APIContext);
      
      expect(result).toEqual(invalidSession);
      expect(result?.id).toBe('session-123');
    });

    it('should work independently of user presence', async () => {
      // Session present but no user (edge case)
      mockContext.locals = { user: null, session: mockSession };
      
      const result = await getSession(mockContext as APIContext);
      
      expect(result).toEqual(mockSession);
    });

    it('should work with various request contexts', async () => {
      const contexts = [
        {
          url: 'http://localhost:3000/',
          headers: { 'accept': 'text/html' }
        },
        {
          url: 'http://localhost:3000/api/session',
          headers: { 'accept': 'application/json' }
        },
        {
          url: 'http://localhost:3000/protected/page',
          headers: { 'accept': 'text/html,application/xhtml+xml' }
        }
      ];

      for (const ctx of contexts) {
        mockContext.url = new URL(ctx.url);
        mockContext.request = new Request(ctx.url, { headers: ctx.headers });
        mockContext.locals = { user: mockUser, session: mockSession };
        
        const result = await getSession(mockContext as APIContext);
        
        expect(result, `Failed for ${ctx.url}`).toEqual(mockSession);
      }
    });
  });

  describe('requireAuth Function - Page Routes', () => {
    beforeEach(() => {
      mockContext = {
        url: new URL('http://localhost:3000/protected-page'),
        request: new Request('http://localhost:3000/protected-page', {
          headers: { 'accept': 'text/html' }
        }),
        locals: {},
        redirect: mockRedirect
      };
    });

    it('should return user when authenticated', async () => {
      mockContext.locals = { user: mockUser, session: mockSession };
      
      const result = await requireAuth(mockContext as APIContext);
      
      expect(result).toEqual(mockUser);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users to sign-in', async () => {
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {
        // requireAuth calls context.redirect which may not throw in tests
      }
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/protected-page')
      );
    });

    it('should preserve query parameters in redirect', async () => {
      mockContext.url = new URL('http://localhost:3000/dashboard?tab=settings&sort=name');
      mockContext.request = new Request('http://localhost:3000/dashboard?tab=settings&sort=name', {
        headers: { 'accept': 'text/html' }
      });
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/dashboard?tab=settings&sort=name')
      );
    });

    it('should use custom sign-in URL when provided', async () => {
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext, { signInUrl: '/custom-signin' });
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/custom-signin?redirect=' + encodeURIComponent('/protected-page')
      );
    });

    it('should use custom redirectTo when provided', async () => {
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext, { redirectTo: '/specific-return' });
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/specific-return')
      );
    });

    it('should handle complex URLs with special characters', async () => {
      const complexUrl = 'http://localhost:3000/search?q=test%20query&filter=active&page=2';
      mockContext.url = new URL(complexUrl);
      mockContext.request = new Request(complexUrl, {
        headers: { 'accept': 'text/html' }
      });
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/search?q=test%20query&filter=active&page=2')
      );
    });

    it('should handle URLs without query parameters', async () => {
      mockContext.url = new URL('http://localhost:3000/profile');
      mockContext.request = new Request('http://localhost:3000/profile', {
        headers: { 'accept': 'text/html' }
      });
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/profile')
      );
    });
  });

  describe('requireAuth Function - API Routes', () => {
    beforeEach(() => {
      mockContext = {
        url: new URL('http://localhost:3000/api/protected'),
        request: new Request('http://localhost:3000/api/protected', {
          headers: { 'accept': 'application/json' }
        }),
        locals: {},
        redirect: mockRedirect
      };
    });

    it('should return user when authenticated', async () => {
      mockContext.locals = { user: mockUser, session: mockSession };
      
      const result = await requireAuth(mockContext as APIContext);
      
      expect(result).toEqual(mockUser);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should return 401 JSON response for unauthenticated requests', async () => {
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext);
        expect.fail('Should have thrown a Response');
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(401);
        
        const body = await response.json();
        expect(body).toEqual({
          error: 'Authentication required',
          message: 'You must be signed in to access this resource',
          statusCode: 401
        });
        
        expect(response.headers.get('Content-Type')).toBe('application/json');
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(mockRedirect).not.toHaveBeenCalled();
      }
    });

    it('should handle all HTTP methods consistently', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      
      for (const method of methods) {
        vi.clearAllMocks();
        
        mockContext.request = new Request('http://localhost:3000/api/test', {
          method,
          headers: { 'accept': 'application/json' }
        });
        mockContext.locals = { user: null, session: null };
        
        try {
          await requireAuth(mockContext as APIContext);
          expect.fail(`Should have thrown a Response for ${method}`);
        } catch (response) {
          expect(response, `Failed for ${method}`).toBeInstanceOf(Response);
          expect(response.status, `Wrong status for ${method}`).toBe(401);
          
          const body = await response.json();
          expect(body.error, `Wrong error for ${method}`).toBe('Authentication required');
          expect(mockRedirect, `Should not redirect for ${method}`).not.toHaveBeenCalled();
        }
      }
    });

    it('should detect API routes by /api/ path prefix', async () => {
      const apiPaths = [
        '/api/users',
        '/api/auth/signin',
        '/api/v1/data',
        '/api/protected/resource'
      ];
      
      for (const path of apiPaths) {
        vi.clearAllMocks();
        
        mockContext.url = new URL(`http://localhost:3000${path}`);
        mockContext.request = new Request(`http://localhost:3000${path}`, {
          headers: { 'accept': 'text/html' } // Even with HTML accept header
        });
        mockContext.locals = { user: null, session: null };
        
        try {
          await requireAuth(mockContext as APIContext);
          expect.fail(`Should have thrown a Response for ${path}`);
        } catch (response) {
          expect(response, `Failed for ${path}`).toBeInstanceOf(Response);
          expect(response.status, `Wrong status for ${path}`).toBe(401);
          expect(mockRedirect, `Should not redirect for ${path}`).not.toHaveBeenCalled();
        }
      }
    });

    it('should detect API routes by JSON Accept header', async () => {
      const jsonAcceptHeaders = [
        'application/json',
        'application/json, text/plain',
        'text/html,application/json,*/*'
        // Note: Enhanced JSON detection (like application/vnd.api+json) will be in a future feature
      ];
      
      for (const acceptHeader of jsonAcceptHeaders) {
        vi.clearAllMocks();
        
        mockContext.url = new URL('http://localhost:3000/data/endpoint');
        mockContext.request = new Request('http://localhost:3000/data/endpoint', {
          headers: { 'accept': acceptHeader }
        });
        mockContext.locals = { user: null, session: null };
        
        try {
          await requireAuth(mockContext as APIContext);
          expect.fail(`Should have thrown a Response for accept: ${acceptHeader}`);
        } catch (response) {
          expect(response, `Failed for accept: ${acceptHeader}`).toBeInstanceOf(Response);
          expect(response.status, `Wrong status for accept: ${acceptHeader}`).toBe(401);
          expect(mockRedirect, `Should not redirect for accept: ${acceptHeader}`).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Custom Prefix Integration', () => {
    it('should use custom prefix from environment variable', async () => {
      process.env.STACK_AUTH_PREFIX = '/custom-auth';
      
      mockContext = {
        url: new URL('http://localhost:3000/protected'),
        request: new Request('http://localhost:3000/protected', {
          headers: { 'accept': 'text/html' }
        }),
        locals: { user: null, session: null },
        redirect: mockRedirect
      };
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/custom-auth/signin?redirect=' + encodeURIComponent('/protected')
      );
    });

    it('should use custom prefix from options over environment', async () => {
      process.env.STACK_AUTH_PREFIX = '/env-prefix';
      
      mockContext = {
        url: new URL('http://localhost:3000/protected'),
        request: new Request('http://localhost:3000/protected', {
          headers: { 'accept': 'text/html' }
        }),
        locals: { user: null, session: null },
        redirect: mockRedirect
      };
      
      try {
        await requireAuth(mockContext as APIContext, { signInUrl: '/options-signin' });
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/options-signin?redirect=' + encodeURIComponent('/protected')
      );
    });

    it('should default to /handler when no prefix configured', async () => {
      delete process.env.STACK_AUTH_PREFIX;
      
      mockContext = {
        url: new URL('http://localhost:3000/protected'),
        request: new Request('http://localhost:3000/protected', {
          headers: { 'accept': 'text/html' }
        }),
        locals: { user: null, session: null },
        redirect: mockRedirect
      };
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/protected')
      );
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle missing environment variables gracefully', async () => {
      // Clear environment variables
      delete process.env.STACK_PROJECT_ID;
      delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
      delete process.env.STACK_SECRET_SERVER_KEY;
      
      mockContext = {
        url: new URL('http://localhost:3000/dashboard'),
        request: new Request('http://localhost:3000/dashboard'),
        locals: { user: mockUser, session: mockSession },
        redirect: mockRedirect
      };
      
      // Functions should still work if user data is in context
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      const authUser = await requireAuth(mockContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(session).toEqual(mockSession);
      expect(authUser).toEqual(mockUser);
    });

    it('should handle malformed Request objects', async () => {
      mockContext = {
        url: new URL('http://localhost:3000/test'),
        // Missing or malformed request
        request: {} as Request,
        locals: { user: mockUser, session: mockSession },
        redirect: mockRedirect
      };
      
      // Functions should handle gracefully
      const user = await getUser(mockContext as APIContext);
      expect(user).toEqual(mockUser);
    });

    it('should handle missing context.locals', async () => {
      mockContext = {
        url: new URL('http://localhost:3000/test'),
        request: new Request('http://localhost:3000/test'),
        // Missing locals
        redirect: mockRedirect
      } as Partial<APIContext>;
      
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      
      expect(user).toBeNull();
      expect(session).toBeNull();
    });

    it('should handle various URL formats correctly', async () => {
      const urlVariations = [
        'http://localhost:3000/',
        'http://localhost:3000/path',
        'http://localhost:3000/path/',
        'http://localhost:3000/path?query=value',
        'http://localhost:3000/path?query=value&other=test',
        'https://example.com:8080/path?query=value#hash',
      ];
      
      for (const urlString of urlVariations) {
        mockContext = {
          url: new URL(urlString),
          request: new Request(urlString, {
            headers: { 'accept': 'text/html' }
          }),
          locals: { user: null, session: null },
          redirect: mockRedirect
        };
        
        try {
          await requireAuth(mockContext as APIContext);
        } catch (error) {}
        
        // Should have been called with some redirect URL
        expect(mockRedirect, `Failed for URL: ${urlString}`).toHaveBeenCalled();
        
        vi.clearAllMocks();
      }
    });

    it('should preserve all URL components in redirects', async () => {
      const testUrl = 'http://localhost:3000/complex/path?param1=value1&param2=value%20with%20spaces&param3=special%26chars';
      mockContext = {
        url: new URL(testUrl),
        request: new Request(testUrl, {
          headers: { 'accept': 'text/html' }
        }),
        locals: { user: null, session: null },
        redirect: mockRedirect
      };
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      const expectedRedirectUrl = new URL(testUrl).pathname + new URL(testUrl).search;
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent(expectedRedirectUrl)
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent function calls', async () => {
      mockContext = {
        url: new URL('http://localhost:3000/test'),
        request: new Request('http://localhost:3000/test'),
        locals: { user: mockUser, session: mockSession },
        redirect: mockRedirect
      };
      
      // Run multiple functions concurrently
      const promises = [
        getUser(mockContext as APIContext),
        getSession(mockContext as APIContext),
        requireAuth(mockContext as APIContext),
        getUser(mockContext as APIContext),
        getSession(mockContext as APIContext)
      ];
      
      const results = await Promise.all(promises);
      
      expect(results[0]).toEqual(mockUser);
      expect(results[1]).toEqual(mockSession);
      expect(results[2]).toEqual(mockUser);
      expect(results[3]).toEqual(mockUser);
      expect(results[4]).toEqual(mockSession);
    });

    it('should handle rapid successive calls', async () => {
      mockContext = {
        url: new URL('http://localhost:3000/test'),
        request: new Request('http://localhost:3000/test'),
        locals: { user: mockUser, session: mockSession },
        redirect: mockRedirect
      };
      
      // Make many rapid calls
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await getUser(mockContext as APIContext));
      }
      
      results.forEach(result => {
        expect(result).toEqual(mockUser);
      });
    });
  });
});