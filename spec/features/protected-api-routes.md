# Feature: Protected API Routes

**GitHub Issue:** #6  
**Title:** User can create protected API routes that require authentication

## Description

As a developer, I want to protect API routes so that only authenticated users can access them, with automatic 401 responses for unauthenticated requests.

## Acceptance Criteria

- [ ] API routes can require authentication
- [ ] Returns 401 status for unauthenticated requests
- [ ] Provides user data to authenticated API routes
- [ ] Works with all HTTP methods (GET, POST, PUT, DELETE)
- [ ] TypeScript support for API handlers

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Basic Protected Route Test

```javascript
// Test: Protected API route requires authentication
// pages/api/protected.js
import { requireAuth } from 'astro-stack-auth/server';

export async function GET(context) {
  const user = await requireAuth(context);
  
  // Expected: Only reached if authenticated
  return new Response(JSON.stringify({
    message: 'Protected data',
    userId: user.id
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Unauthenticated Access Test

```javascript
// Test: Returns 401 for unauthenticated requests
const response = await fetch('/api/protected');

// Expected: 401 status code
console.assert(response.status === 401, 'Should return 401 for unauthenticated');

const data = await response.json();
console.assert(data.error === 'Authentication required', 
  'Should include error message');
```

### Multiple HTTP Methods Test

```javascript
// Test: Protection works for all HTTP methods
// pages/api/user-data.js
import { requireAuth } from 'astro-stack-auth/server';

export async function GET(context) {
  const user = await requireAuth(context);
  return new Response(JSON.stringify(user));
}

export async function POST(context) {
  const user = await requireAuth(context);
  // Handle authenticated POST request
  return new Response(JSON.stringify({ updated: true }));
}

export async function DELETE(context) {
  const user = await requireAuth(context);
  // Handle authenticated DELETE request
  return new Response(JSON.stringify({ deleted: true }));
}
```

### Optional Authentication Test

```javascript
// Test: Optional authentication in API routes
// pages/api/public-with-user.js
import { getUser } from 'astro-stack-auth/server';

export async function GET(context) {
  const user = await getUser(context);
  
  // Expected: Returns user if authenticated, null if not
  return new Response(JSON.stringify({
    message: user ? `Hello ${user.displayName}` : 'Hello guest',
    authenticated: !!user
  }));
}
```

### Error Response Format Test

```javascript
// Test: Consistent error response format
const response = await fetch('/api/protected', {
  headers: { 'Authorization': 'invalid-token' }
});

// Expected: Standard error format
console.assert(response.status === 401);
const error = await response.json();
console.assert(error.error === 'Authentication required');
console.assert(typeof error.message === 'string');
```

### User Data Access Test

```javascript
// Test: Authenticated API routes receive user data
// pages/api/user-profile.js  
import { requireAuth } from 'astro-stack-auth/server';

export async function GET(context) {
  const user = await requireAuth(context);
  
  // Expected: User object with all properties
  console.assert(typeof user.id === 'string');
  console.assert(typeof user.displayName === 'string');
  console.assert(typeof user.primaryEmail === 'string');
  
  return new Response(JSON.stringify({
    id: user.id,
    name: user.displayName,
    email: user.primaryEmail
  }));
}
```

### TypeScript Support Test

```typescript
// Test: TypeScript definitions for API handlers
// pages/api/typed-protected.ts
import type { APIContext } from 'astro';
import { requireAuth } from 'astro-stack-auth/server';

export async function GET(context: APIContext) {
  const user = await requireAuth(context);
  
  // Expected: user should be typed as User (not User | null)
  const name: string = user.displayName; // Should not need null check
  
  return new Response(JSON.stringify({ name }));
}
```

### Custom Error Handling Test

```javascript
// Test: Custom error responses
// pages/api/custom-protected.js
import { getUser } from 'astro-stack-auth/server';

export async function GET(context) {
  const user = await getUser(context);
  
  if (!user) {
    return new Response(JSON.stringify({
      error: 'Custom auth error',
      redirectTo: '/signin'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ data: 'protected' }));
}
```

## Dependencies

- Auth middleware for session resolution
- Stack Auth session validation
- Astro API route context handling
- Proper error response formatting

## Implementation Notes

- `requireAuth` should throw/return 401 for API routes (not redirect)
- Should distinguish between page and API route contexts
- Error responses should be JSON formatted
- Must work with Astro's API route patterns
- Consider CORS headers if needed
- Proper TypeScript typing for different contexts

## Definition of Done

- [ ] API routes can require authentication
- [ ] 401 responses for unauthenticated access
- [ ] User data available to authenticated routes
- [ ] Works with all HTTP methods
- [ ] TypeScript support with proper typing
- [ ] Tests validate all API protection scenarios