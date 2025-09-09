# Task 2.2: Astro Middleware Implementation

**Sprint**: 002  
**Estimated Time**: 3-4 hours  
**Blockers**: Task 2.1 (Environment Configuration)

## Objective

Implement Astro middleware that automatically populates `Astro.locals.user` and `Astro.locals.session` with Stack Auth authentication state on every request.

## Acceptance Criteria

- [ ] Middleware populates `Astro.locals.user` and `Astro.locals.session`
- [ ] Works with all Astro rendering modes (SSR, SSG, hybrid)
- [ ] Efficient session validation with caching
- [ ] Graceful error handling for invalid sessions
- [ ] Performance optimized for unauthenticated requests

## Implementation Steps

1. **Create middleware function that integrates with Stack Auth**
2. **Implement session validation and user resolution**
3. **Add request caching to avoid duplicate API calls**
4. **Handle authentication errors gracefully**
5. **Integrate middleware with Astro integration hooks**

## Test Specification

### Middleware Registration Test

```javascript
// Test: Middleware is properly registered with Astro
const { test, expect } = require('vitest');
const { experimental_AstroContainer as AstroContainer } = require('astro/container');
const stackAuth = require('astro-stack-auth');

test('middleware is registered correctly', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth({
      projectId: 'test',
      publishableClientKey: 'test',
      secretServerKey: 'test'
    })]
  });
  
  // Expected: Middleware should be registered
  expect(container.middleware).toBeDefined();
});
```

### Authenticated Request Test

```javascript
// Test: Middleware populates locals for authenticated requests
test('middleware populates locals for authenticated user', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth({
      projectId: 'test',
      publishableClientKey: 'test', 
      secretServerKey: 'test'
    })]
  });
  
  // Mock authenticated request with session cookie
  const request = new Request('http://localhost/', {
    headers: {
      cookie: 'stack-session=valid-token'
    }
  });
  
  const component = `
    ---
    const user = Astro.locals.user;
    const session = Astro.locals.session;
    ---
    <div data-testid="auth-data">
      User: {user?.displayName || 'null'}
      Session: {session?.id || 'null'}
    </div>
  `;
  
  const result = await container.renderToString(component, { request });
  
  // Expected: Should contain user data populated by middleware
  expect(result).toContain('data-testid="auth-data"');
});
```

### Unauthenticated Request Test

```javascript
// Test: Middleware handles unauthenticated requests gracefully
test('middleware handles unauthenticated requests', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth({
      projectId: 'test',
      publishableClientKey: 'test',
      secretServerKey: 'test'
    })]
  });
  
  const request = new Request('http://localhost/');
  
  const component = `
    ---
    const user = Astro.locals.user;
    const session = Astro.locals.session;
    ---
    <div data-testid="no-auth">
      User: {user === null ? 'null' : 'not-null'}  
      Session: {session === null ? 'null' : 'not-null'}
    </div>
  `;
  
  const result = await container.renderToString(component, { request });
  
  // Expected: Should have null values for unauthenticated
  expect(result).toContain('User: null');
  expect(result).toContain('Session: null');
});
```

### Error Handling Test

```javascript
// Test: Middleware handles Stack Auth API errors gracefully
const { vi } = require('vitest');

test('middleware handles auth service errors', async () => {
  // Mock Stack Auth API failure
  global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
  
  const container = await AstroContainer.create({
    integrations: [stackAuth({
      projectId: 'test',
      publishableClientKey: 'test',
      secretServerKey: 'test'
    })]
  });
  
  const request = new Request('http://localhost/', {
    headers: { cookie: 'stack-session=invalid-token' }
  });
  
  const component = `
    ---
    const user = Astro.locals.user;
    ---
    <div>{user === null ? 'no-user' : 'has-user'}</div>
  `;
  
  // Expected: Should not throw, should gracefully fall back to null
  const result = await container.renderToString(component, { request });
  expect(result).toContain('no-user');
});
```

## Required Files

### src/middleware.ts
```typescript
import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';
import { StackAuth } from '@stackframe/stack';

// Session cache to avoid duplicate API calls within the same request
const sessionCache = new Map<string, { user: User | null; session: Session | null }>();

export function createAuthMiddleware(config: {
  projectId: string;
  publishableClientKey: string;
  secretServerKey: string;
}) {
  const stackAuth = new StackAuth({
    projectId: config.projectId,
    publishableClientKey: config.publishableClientKey,
    secretServerKey: config.secretServerKey
  });

  return async function authMiddleware(context: APIContext, next: () => Promise<Response>) {
    try {
      // Extract session token from request
      const sessionToken = extractSessionToken(context.request);
      
      if (!sessionToken) {
        // No session token - set locals to null
        context.locals.user = null;
        context.locals.session = null;
        return next();
      }

      // Check cache first
      const cached = sessionCache.get(sessionToken);
      if (cached) {
        context.locals.user = cached.user;
        context.locals.session = cached.session;
        return next();
      }

      // Validate session with Stack Auth
      const authData = await validateSession(stackAuth, sessionToken);
      
      // Cache the result
      sessionCache.set(sessionToken, authData);
      
      // Populate locals
      context.locals.user = authData.user;
      context.locals.session = authData.session;
      
    } catch (error) {
      // Log error in development, fail silently in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('Stack Auth middleware error:', error);
      }
      
      // Always set to null on error to avoid breaking the app
      context.locals.user = null;
      context.locals.session = null;
    }
    
    return next();
  };
}

function extractSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  // Parse cookies and extract Stack Auth session token
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('stack-session='));
  
  return sessionCookie ? sessionCookie.split('=')[1] : null;
}

async function validateSession(
  stackAuth: StackAuth, 
  sessionToken: string
): Promise<{ user: User | null; session: Session | null }> {
  try {
    // Use Stack Auth SDK to validate session and get user
    const session = await stackAuth.validateSession(sessionToken);
    
    if (!session || !session.userId) {
      return { user: null, session: null };
    }
    
    const user = await stackAuth.getUser(session.userId);
    
    return { user, session };
  } catch (error) {
    // Invalid session or API error
    return { user: null, session: null };
  }
}

// Clear cache periodically to prevent memory leaks
setInterval(() => {
  sessionCache.clear();
}, 5 * 60 * 1000); // Clear every 5 minutes
```

### Updated src/index.ts integration hook
```typescript
import { createAuthMiddleware } from './middleware';

export default function stackAuth(options: StackAuthOptions = {}): AstroIntegration {
  const config = validateConfig(options);

  return {
    name: 'astro-stack-auth',
    hooks: {
      'astro:config:setup': async ({ addMiddleware, injectRoute, updateConfig }) => {
        // Add authentication middleware
        const authMiddleware = createAuthMiddleware({
          projectId: config.projectId,
          publishableClientKey: config.publishableClientKey,
          secretServerKey: config.secretServerKey
        });
        
        addMiddleware({
          entrypoint: '@stackframe/astro/middleware',
          order: 'pre' // Run before other middleware
        });
        
        console.log('Stack Auth middleware registered');
      }
    }
  };
}
```

### tests/middleware.test.ts
```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createAuthMiddleware } from '../src/middleware';
import type { APIContext } from 'astro';

describe('Auth Middleware', () => {
  const mockConfig = {
    projectId: 'test_project',
    publishableClientKey: 'test_key',
    secretServerKey: 'test_secret'
  };
  
  let middleware: ReturnType<typeof createAuthMiddleware>;
  let mockContext: APIContext;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    middleware = createAuthMiddleware(mockConfig);
    mockNext = vi.fn(() => Promise.resolve(new Response('OK')));
    mockContext = {
      request: new Request('http://localhost/'),
      locals: {},
    } as APIContext;
  });

  test('populates locals with null for unauthenticated requests', async () => {
    await middleware(mockContext, mockNext);
    
    expect(mockContext.locals.user).toBeNull();
    expect(mockContext.locals.session).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  test('handles session tokens from cookies', async () => {
    mockContext.request = new Request('http://localhost/', {
      headers: {
        cookie: 'stack-session=test-token; other=value'
      }
    });

    // Mock Stack Auth validation
    global.fetch = vi.fn(() => 
      Promise.resolve(new Response(JSON.stringify({
        user: { id: '123', displayName: 'Test User' },
        session: { id: 'session123', userId: '123' }
      })))
    );

    await middleware(mockContext, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  test('gracefully handles Stack Auth API errors', async () => {
    mockContext.request = new Request('http://localhost/', {
      headers: { cookie: 'stack-session=invalid-token' }
    });

    global.fetch = vi.fn(() => Promise.reject(new Error('API Error')));

    await middleware(mockContext, mockNext);
    
    expect(mockContext.locals.user).toBeNull();
    expect(mockContext.locals.session).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });
});
```

## Validation Commands

```bash
# Test middleware functionality
npm run test -- middleware.test.ts

# Test middleware integration with Astro
npm run test:integration

# Test middleware performance
npm run test -- --reporter=verbose middleware.test.ts
```

## Definition of Done

- [ ] Middleware populates `Astro.locals` correctly
- [ ] Handles both authenticated and unauthenticated requests
- [ ] Error handling prevents application crashes
- [ ] Session caching improves performance
- [ ] Integration with Astro hooks working
- [ ] All middleware tests pass
- [ ] Doctests pass for this task