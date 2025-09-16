import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { requireAuth } from '../../src/server.js';
import type { APIContext } from 'astro';

// Helper function to create isolated mock context for each test
function createMockContext(url: string, options: { 
  user?: any; 
  session?: any; 
  acceptHeader?: string 
} = {}) {
  const mockRedirect = vi.fn();
  const mockContext: Partial<APIContext> = {
    url: new URL(url),
    request: new Request(url, {
      headers: {
        'accept': options.acceptHeader || 'text/html',
      }
    }),
    locals: {
      user: options.user || null,
      session: options.session || null
    },
    redirect: mockRedirect
  };
  return { mockContext, mockRedirect };
}

describe.sequential('requireAuth URL Preservation', () => {
  beforeAll(() => {
    // Set up environment variables once for all tests
    process.env.STACK_PROJECT_ID = 'test-project';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret';
    process.env.STACK_AUTH_PREFIX = '/handler';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should preserve original URL with query parameters in redirect', async () => {
    const { mockContext, mockRedirect } = createMockContext(
      'http://localhost:3000/dashboard?tab=settings&sort=name'
    );

    try {
      await requireAuth(mockContext as APIContext);
    } catch (response) {
      // requireAuth should call context.redirect for unauthenticated users
    }

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith(
      '/handler/signin?redirect=' + encodeURIComponent('/dashboard?tab=settings&sort=name')
    );
  });

  it('should handle custom sign-in URL', async () => {
    const { mockContext, mockRedirect } = createMockContext(
      'http://localhost:3000/dashboard?tab=settings&sort=name'
    );

    try {
      await requireAuth(mockContext as APIContext, { signInUrl: '/custom-signin' });
    } catch (response) {
      // requireAuth should call context.redirect for unauthenticated users
    }

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith(
      '/custom-signin?redirect=' + encodeURIComponent('/dashboard?tab=settings&sort=name')
    );
  });

  it('should use custom redirectTo option when provided', async () => {
    const { mockContext, mockRedirect } = createMockContext(
      'http://localhost:3000/dashboard?tab=settings&sort=name'
    );

    try {
      await requireAuth(mockContext as APIContext, { redirectTo: '/specific-return-page' });
    } catch (response) {
      // requireAuth should call context.redirect for unauthenticated users
    }

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith(
      '/handler/signin?redirect=' + encodeURIComponent('/specific-return-page')
    );
  });

  it('should preserve complex URLs with special characters', async () => {
    const { mockContext, mockRedirect } = createMockContext(
      'http://localhost:3000/search?q=test%20query&filter=active&page=2'
    );

    try {
      await requireAuth(mockContext as APIContext);
    } catch (response) {
      // requireAuth should call context.redirect for unauthenticated users
    }

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith(
      '/handler/signin?redirect=' + encodeURIComponent('/search?q=test%20query&filter=active&page=2')
    );
  });

  it('should handle URLs without query parameters', async () => {
    const { mockContext, mockRedirect } = createMockContext(
      'http://localhost:3000/profile'
    );

    try {
      await requireAuth(mockContext as APIContext);
    } catch (response) {
      // requireAuth should call context.redirect for unauthenticated users
    }

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith(
      '/handler/signin?redirect=' + encodeURIComponent('/profile')
    );
  });

  it('should return user when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const { mockContext, mockRedirect } = createMockContext(
      'http://localhost:3000/dashboard',
      { 
        user: mockUser,
        session: { id: 'session-123' }
      }
    );

    const result = await requireAuth(mockContext as APIContext);

    expect(result).toBe(mockUser);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should return 401 JSON response for API routes', async () => {
    const { mockContext, mockRedirect } = createMockContext(
      'http://localhost:3000/api/protected',
      { acceptHeader: 'application/json' }
    );

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