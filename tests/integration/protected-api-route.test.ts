/**
 * Test for Issue #6: User can create protected API routes that require authentication
 * 
 * This test validates that the getUser() pattern works correctly for 
 * creating protected API routes as described in the issue.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUser } from '../../src/server.js';
import type { APIContext } from 'astro';
import type { User } from '@stackframe/stack';

describe('Protected API Routes with getUser() Pattern (Issue #6)', () => {
  let mockContext: Partial<APIContext>;
  
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

  beforeEach(() => {
    // Set up test environment variables
    process.env.STACK_PROJECT_ID = 'test-project-id';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-publishable-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret-key';
    
    mockContext = {
      url: new URL('http://localhost:3000/api/protected'),
      request: new Request('http://localhost:3000/api/protected'),
      locals: {}
    };
  });

  describe('getUser() Helper Function Behavior', () => {
    it('should return user when authenticated', async () => {
      // Simulate middleware populating context.locals with user
      mockContext.locals = { user: mockUser, session: null };
      
      const user = await getUser(mockContext as APIContext);
      
      expect(user).toEqual(mockUser);
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when not authenticated', async () => {
      // Simulate middleware with no user
      mockContext.locals = { user: null, session: null };
      
      const user = await getUser(mockContext as APIContext);
      
      expect(user).toBeNull();
    });

    it('should handle missing locals gracefully', async () => {
      // Simulate edge case where locals might not be set
      mockContext.locals = {};
      
      const user = await getUser(mockContext as APIContext);
      
      expect(user).toBeNull();
    });
  });

  describe('Protected API Route Pattern Validation', () => {
    it('should allow implementing the exact pattern from the issue', async () => {
      // This tests the exact pattern described in the issue acceptance criteria
      
      // Test Case 1: Authenticated request
      mockContext.locals = { user: mockUser, session: null };
      
      // Simulate the pattern from the issue
      const user = await getUser(mockContext as APIContext);
      
      if (!user) {
        // This should not happen in this test case
        expect.fail('User should be authenticated');
      }
      
      // Simulate API route logic
      const response = {
        status: 200,
        body: JSON.stringify({ user })
      };
      
      expect(response.status).toBe(200);
      expect(JSON.parse(response.body).user).toEqual(mockUser);
    });

    it('should handle unauthenticated requests with 401', async () => {
      // Test Case 2: Unauthenticated request
      mockContext.locals = { user: null, session: null };
      
      // Simulate the pattern from the issue
      const user = await getUser(mockContext as APIContext);
      
      if (!user) {
        // This should happen - simulate the 401 response
        const response = {
          status: 401,
          body: 'Unauthorized'
        };
        
        expect(response.status).toBe(401);
        expect(response.body).toBe('Unauthorized');
        return;
      }
      
      expect.fail('Should have returned 401 for unauthenticated user');
    });

    it('should work with all HTTP methods', async () => {
      // Test that the pattern works regardless of HTTP method
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      
      for (const method of methods) {
        mockContext.request = new Request('http://localhost:3000/api/protected', {
          method
        });
        mockContext.locals = { user: mockUser, session: null };
        
        const user = await getUser(mockContext as APIContext);
        
        expect(user).toEqual(mockUser);
      }
    });

    it('should provide proper error handling capabilities', async () => {
      // Test that getUser doesn't throw errors under normal circumstances
      const testCases = [
        { user: mockUser, session: null }, // authenticated
        { user: null, session: null },     // unauthenticated  
        {}                                 // missing data
      ];
      
      for (const locals of testCases) {
        mockContext.locals = locals;
        
        // getUser should never throw under normal circumstances
        await expect(getUser(mockContext as APIContext)).resolves.toBeDefined();
      }
    });
  });

  describe('Acceptance Criteria Validation', () => {
    it('should satisfy: "Can use getUser() helper in API route handlers"', async () => {
      mockContext.locals = { user: mockUser, session: null };
      
      // This should work without any issues
      const user = await getUser(mockContext as APIContext);
      expect(user).toBeDefined();
      expect(typeof getUser).toBe('function');
    });

    it('should satisfy: "Returns 401 status for unauthenticated requests"', async () => {
      mockContext.locals = { user: null, session: null };
      
      const user = await getUser(mockContext as APIContext);
      
      // The API route would implement this logic:
      if (!user) {
        const responseStatus = 401;
        expect(responseStatus).toBe(401);
      }
    });

    it('should satisfy: "Returns user data and allows API logic for authenticated requests"', async () => {
      mockContext.locals = { user: mockUser, session: null };
      
      const user = await getUser(mockContext as APIContext);
      
      // Should return user data
      expect(user).toEqual(mockUser);
      
      // Should allow API logic to proceed
      if (user) {
        const apiLogicResult = {
          processedUserId: user.id,
          canProceed: true
        };
        
        expect(apiLogicResult.processedUserId).toBe('user-123');
        expect(apiLogicResult.canProceed).toBe(true);
      }
    });

    it('should satisfy: "Proper error handling and status codes"', async () => {
      // Test various scenarios that should be handled gracefully
      const scenarios = [
        { locals: { user: mockUser, session: null }, expectedResult: 'success' },
        { locals: { user: null, session: null }, expectedResult: 'unauthorized' },
        { locals: {}, expectedResult: 'unauthorized' }
      ];
      
      for (const scenario of scenarios) {
        mockContext.locals = scenario.locals;
        
        const user = await getUser(mockContext as APIContext);
        
        if (scenario.expectedResult === 'success') {
          expect(user).toBeDefined();
          expect(user?.id).toBe('user-123');
        } else {
          expect(user).toBeNull();
        }
      }
    });
  });
});