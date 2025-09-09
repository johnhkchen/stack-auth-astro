# Task 3.2: Authentication Requirements

**Sprint**: 003  
**Estimated Time**: 3-4 hours  
**Blockers**: Task 3.1 (User Resolution)

## Objective

Implement `requireAuth()` function that redirects unauthenticated users in pages and returns 401 in API routes.

## Acceptance Criteria

- [ ] `requireAuth()` returns User (never null)
- [ ] Redirects to sign-in for unauthenticated pages
- [ ] Returns 401 for unauthenticated API routes
- [ ] Preserves original URL for post-login redirect
- [ ] Supports custom sign-in URLs

## Test Specification

### Page Redirect Test

```javascript
// Test: requireAuth redirects unauthenticated pages
const { requireAuth } = require('astro-stack-auth/server');

const mockContext = {
  locals: { user: null },
  url: new URL('http://localhost/dashboard'),
  redirect: vi.fn()
};

try {
  await requireAuth(mockContext);
  console.assert(false, 'Should throw redirect error');
} catch (error) {
  console.assert(mockContext.redirect.calledWith('/signin?redirect=/dashboard'));
}
```

### API Route 401 Test

```javascript
// Test: requireAuth returns 401 for API routes
const mockContext = {
  locals: { user: null },
  url: new URL('http://localhost/api/protected'),
  request: { headers: { accept: 'application/json' } }
};

try {
  await requireAuth(mockContext);
} catch (response) {
  console.assert(response.status === 401);
}
```

## Required Files

### Updated src/server.ts
```typescript
export interface RequireAuthOptions {
  signInUrl?: string;
  redirectTo?: string;
}

export async function requireAuth(
  context: APIContext, 
  options: RequireAuthOptions = {}
): Promise<User> {
  const user = context.locals.user;
  
  if (user) {
    return user;
  }
  
  // Determine if this is an API route
  const isApiRoute = context.url.pathname.startsWith('/api/') || 
                    context.request.headers.get('accept')?.includes('application/json');
  
  if (isApiRoute) {
    // Return 401 for API routes
    throw new Response(JSON.stringify({
      error: 'Authentication required',
      message: 'You must be signed in to access this resource'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    // Redirect for pages
    const signInUrl = options.signInUrl || '/signin';
    const returnUrl = options.redirectTo || context.url.pathname;
    const redirectUrl = `${signInUrl}?redirect=${encodeURIComponent(returnUrl)}`;
    
    return context.redirect(redirectUrl);
  }
}
```

## Definition of Done

- [ ] Function handles both pages and API routes correctly
- [ ] URL preservation works for redirects
- [ ] 401 responses for API routes
- [ ] Custom sign-in URL support
- [ ] Tests pass