import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../../src/server.js';
import type { APIContext } from 'astro';

describe('requireAuth URL Preservation', () => {
  let mockContext: Partial<APIContext>;
  let mockRedirect: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect = vi.fn();
    mockContext = {
      url: new URL('http://localhost:3000/dashboard?tab=settings&sort=name'),
      request: new Request('http://localhost:3000/dashboard?tab=settings&sort=name', {
        headers: {
          'accept': 'text/html',
        }
      }),
      locals: {
        user: null,
        session: null
      },
      redirect: mockRedirect
    };

    // Mock environment variables
    process.env.STACK_PROJECT_ID = 'test-project';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret';
    process.env.STACK_AUTH_PREFIX = '/handler';
  });

  it('should preserve original URL with query parameters in redirect', async () => {
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
    mockContext.url = new URL('http://localhost:3000/search?q=test%20query&filter=active&page=2');
    mockContext.request = new Request('http://localhost:3000/search?q=test%20query&filter=active&page=2', {
      headers: { 'accept': 'text/html' }
    });

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
    mockContext.url = new URL('http://localhost:3000/profile');
    mockContext.request = new Request('http://localhost:3000/profile', {
      headers: { 'accept': 'text/html' }
    });

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
    mockContext.locals = {
      user: mockUser,
      session: { id: 'session-123' }
    };

    const result = await requireAuth(mockContext as APIContext);

    expect(result).toBe(mockUser);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should return 401 JSON response for API routes', async () => {
    mockContext.url = new URL('http://localhost:3000/api/protected');
    mockContext.request = new Request('http://localhost:3000/api/protected', {
      headers: { 'accept': 'application/json' }
    });

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