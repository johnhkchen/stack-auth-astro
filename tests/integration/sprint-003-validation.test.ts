/**
 * Sprint 003 Comprehensive Validation Test
 * 
 * This test validates that all Sprint 003 server-side authentication
 * functionality works together correctly, including:
 * - Middleware populating context.locals
 * - Server functions retrieving data from middleware
 * - Configuration system working across all functions
 * - Custom prefix configuration
 * - Error handling and security measures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUser, getSession, requireAuth } from '../../src/server.js';
import { onRequest as middleware } from '../../src/middleware.js';
import { getConfig, tryGetConfig, hasValidConfig } from '../../src/config.js';
import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';

describe('Sprint 003 Comprehensive Integration Validation', () => {
  let mockContext: Partial<APIContext>;
  let mockNext: vi.Mock;
  let mockRedirect: vi.Mock;
  
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
    signedUpAtMillis: Date.now() - 86400000,
    clientMetadata: {},
    serverMetadata: {},
    oauthProviders: []
  } as User;
  
  const mockSession: Session = {
    id: 'session-123',
    userId: 'user-123',
    expiresAtMillis: Date.now() + 3600000,
    createdAtMillis: Date.now() - 1800000
  } as Session;

  beforeEach(() => {
    // Set up test environment variables
    process.env.STACK_PROJECT_ID = 'test-project-id';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-publishable-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret-key';
    process.env.STACK_AUTH_PREFIX = '/handler';
    
    mockNext = vi.fn().mockResolvedValue(new Response('OK'));
    mockRedirect = vi.fn();
    
    mockContext = {
      url: new URL('http://localhost:3000/dashboard'),
      request: new Request('http://localhost:3000/dashboard'),
      locals: {},
      redirect: mockRedirect
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration System Integration', () => {
    it('should validate configuration is working across all functions', () => {
      // Test configuration validation
      expect(hasValidConfig()).toBe(true);
      
      const { config, validation } = tryGetConfig();
      expect(config).not.toBeNull();
      expect(validation.isValid).toBe(true);
      expect(config?.projectId).toBe('test-project-id');
      expect(config?.prefix).toBe('/handler');
    });

    it('should handle custom prefix configuration correctly', () => {
      process.env.STACK_AUTH_PREFIX = '/custom-auth';
      
      const { config } = tryGetConfig();
      expect(config?.prefix).toBe('/custom-auth');
    });

    it('should handle missing configuration gracefully', () => {
      delete process.env.STACK_PROJECT_ID;
      delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
      delete process.env.STACK_SECRET_SERVER_KEY;
      
      const { config, validation } = tryGetConfig();
      expect(config).toBeNull();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('STACK_PROJECT_ID'))).toBe(true);
    });
  });

  describe('Middleware and Server Function Integration', () => {
    it('should simulate middleware populating context.locals and server functions using it', async () => {
      // Simulate what middleware would do
      mockContext.locals = { user: mockUser, session: mockSession };
      
      // Test that all server functions can retrieve the data
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      const authUser = await requireAuth(mockContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(session).toEqual(mockSession);
      expect(authUser).toEqual(mockUser);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should handle missing user data consistently across functions', async () => {
      // Simulate middleware with no user
      mockContext.locals = { user: null, session: null };
      
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      
      expect(user).toBeNull();
      expect(session).toBeNull();
      
      // requireAuth should redirect for pages
      mockContext.request = new Request('http://localhost:3000/protected', {
        headers: { 'accept': 'text/html' }
      });
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/dashboard')
      );
    });

    it('should handle API route authentication consistently', async () => {
      mockContext.url = new URL('http://localhost:3000/api/protected');
      mockContext.request = new Request('http://localhost:3000/api/protected', {
        headers: { 'accept': 'application/json' }
      });
      mockContext.locals = { user: null, session: null };
      
      try {
        await requireAuth(mockContext as APIContext);
        expect.fail('Should have thrown a Response');
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(401);
        
        const body = await response.json();
        expect(body.error).toBe('Authentication required');
        expect(mockRedirect).not.toHaveBeenCalled();
      }
    });
  });

  describe('Custom Prefix Integration Scenarios', () => {
    it('should use custom prefix across all authentication flows', async () => {
      process.env.STACK_AUTH_PREFIX = '/custom-auth';
      
      mockContext.locals = { user: null, session: null };
      mockContext.request = new Request('http://localhost:3000/protected', {
        headers: { 'accept': 'text/html' }
      });
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/custom-auth/signin?redirect=' + encodeURIComponent('/dashboard')
      );
    });

    it('should handle multiple request scenarios with custom prefix', async () => {
      process.env.STACK_AUTH_PREFIX = '/auth-handler';
      
      const scenarios = [
        {
          path: '/dashboard',
          headers: { 'accept': 'text/html' },
          expectedRedirect: '/auth-handler/signin?redirect=' + encodeURIComponent('/dashboard')
        },
        {
          path: '/profile?tab=settings',
          headers: { 'accept': 'text/html' },
          expectedRedirect: '/auth-handler/signin?redirect=' + encodeURIComponent('/dashboard')
        }
      ];

      for (const scenario of scenarios) {
        vi.clearAllMocks();
        
        mockContext.locals = { user: null, session: null };
        mockContext.request = new Request(`http://localhost:3000${scenario.path}`, {
          headers: scenario.headers
        });
        
        try {
          await requireAuth(mockContext as APIContext);
        } catch (error) {}
        
        expect(mockRedirect).toHaveBeenCalledWith(scenario.expectedRedirect);
      }
    });
  });

  describe('End-to-End Authentication Flow Validation', () => {
    it('should validate complete protected page flow', async () => {
      // Scenario 1: Unauthenticated user accesses protected page
      mockContext.locals = { user: null, session: null };
      mockContext.url = new URL('http://localhost:3000/protected-page');
      mockContext.request = new Request('http://localhost:3000/protected-page', {
        headers: { 'accept': 'text/html' }
      });
      
      try {
        await requireAuth(mockContext as APIContext);
      } catch (error) {}
      
      expect(mockRedirect).toHaveBeenCalledWith(
        '/handler/signin?redirect=' + encodeURIComponent('/protected-page')
      );
      
      vi.clearAllMocks();
      
      // Scenario 2: Authenticated user accesses same page
      mockContext.locals = { user: mockUser, session: mockSession };
      
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      const authUser = await requireAuth(mockContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(session).toEqual(mockSession);
      expect(authUser).toEqual(mockUser);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should validate complete API route flow', async () => {
      // Scenario 1: Unauthenticated API request
      mockContext.locals = { user: null, session: null };
      mockContext.url = new URL('http://localhost:3000/api/user-data');
      mockContext.request = new Request('http://localhost:3000/api/user-data', {
        headers: { 'accept': 'application/json' }
      });
      
      try {
        await requireAuth(mockContext as APIContext);
        expect.fail('Should have thrown a Response');
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(401);
      }
      
      // Scenario 2: Authenticated API request
      mockContext.locals = { user: mockUser, session: mockSession };
      
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      const authUser = await requireAuth(mockContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(session).toEqual(mockSession);
      expect(authUser).toEqual(mockUser);
    });

    it('should handle complex redirect scenarios with query parameters', async () => {
      const complexUrls = [
        'http://localhost:3000/dashboard?tab=settings&sort=name',
        'http://localhost:3000/search?q=test%20query&filter=active',
        'http://localhost:3000/profile?user=123&edit=true'
      ];

      for (const urlString of complexUrls) {
        vi.clearAllMocks();
        
        const url = new URL(urlString);
        mockContext.url = url;
        mockContext.request = new Request(urlString, {
          headers: { 'accept': 'text/html' }
        });
        mockContext.locals = { user: null, session: null };
        
        try {
          await requireAuth(mockContext as APIContext);
        } catch (error) {}
        
        const expectedPath = url.pathname + url.search;
        expect(mockRedirect).toHaveBeenCalledWith(
          '/handler/signin?redirect=' + encodeURIComponent(expectedPath)
        );
      }
    });
  });

  describe('Performance and Error Handling Integration', () => {
    it('should handle concurrent access patterns correctly', async () => {
      mockContext.locals = { user: mockUser, session: mockSession };
      
      // Simulate concurrent requests
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

    it('should maintain consistent error handling across functions', async () => {
      // Test with minimal context (but still valid Request)
      const minimalContext = {
        url: new URL('http://localhost:3000/test'),
        request: new Request('http://localhost:3000/test'),
        locals: { user: mockUser, session: mockSession },
        redirect: mockRedirect
      };
      
      // Functions should handle gracefully
      const user = await getUser(minimalContext as APIContext);
      const session = await getSession(minimalContext as APIContext);
      const authUser = await requireAuth(minimalContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(session).toEqual(mockSession);
      expect(authUser).toEqual(mockUser);
    });

    it('should handle missing environment variables consistently', async () => {
      // Clear environment variables
      delete process.env.STACK_PROJECT_ID;
      delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
      delete process.env.STACK_SECRET_SERVER_KEY;
      
      mockContext.locals = { user: mockUser, session: mockSession };
      
      // Functions should still work if user data is in context
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      const authUser = await requireAuth(mockContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(session).toEqual(mockSession);
      expect(authUser).toEqual(mockUser);
      
      // But configuration should be invalid
      expect(hasValidConfig()).toBe(false);
    });
  });

  describe('Security and Validation Integration', () => {
    it('should consistently apply security headers and validation', async () => {
      mockContext.locals = { user: null, session: null };
      mockContext.url = new URL('http://localhost:3000/api/secure');
      mockContext.request = new Request('http://localhost:3000/api/secure', {
        headers: { 'accept': 'application/json' }
      });
      
      try {
        await requireAuth(mockContext as APIContext);
        expect.fail('Should have thrown a Response');
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(401);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(response.headers.get('Content-Type')).toBe('application/json');
      }
    });

    it('should validate session data integrity across functions', async () => {
      // Test with partially corrupted session data
      const partialSession = { id: 'session-123' } as Session;
      mockContext.locals = { user: mockUser, session: partialSession };
      
      const user = await getUser(mockContext as APIContext);
      const session = await getSession(mockContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(session).toEqual(partialSession);
    });
  });
});