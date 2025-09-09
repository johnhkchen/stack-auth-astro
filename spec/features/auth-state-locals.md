# Feature: Auth State in Astro.locals

**GitHub Issue:** #2  
**Title:** User can access auth state in any Astro page via Astro.locals.user

## Description

As a developer, I want to access the current user's authentication state in any Astro page through `Astro.locals.user` so that I can conditionally render content based on authentication status.

## Acceptance Criteria

- [ ] `Astro.locals.user` contains user object when authenticated
- [ ] `Astro.locals.user` is `null` when not authenticated
- [ ] Available in all Astro pages (.astro files)
- [ ] Available in API routes
- [ ] TypeScript support with proper types

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Authenticated User Test

```astro
---
// Test: Authenticated user data available in Astro.locals
// pages/profile.astro
const user = Astro.locals.user;

// Expected: User object when authenticated
if (user) {
  console.assert(typeof user.id === 'string', 'User should have ID');
  console.assert(typeof user.displayName === 'string', 'User should have display name');
  console.assert(typeof user.primaryEmail === 'string', 'User should have email');
}
---

{user ? (
  <div>
    <h1>Welcome, {user.displayName}!</h1>
    <p>Email: {user.primaryEmail}</p>
  </div>
) : (
  <p>Please sign in</p>
)}
```

### Unauthenticated User Test  

```astro
---
// Test: Unauthenticated state
// When no valid session exists
const user = Astro.locals.user;

// Expected: user should be null
console.assert(user === null, 'Unauthenticated user should be null');
---

{user === null && <p>Not signed in</p>}
```

### API Route Access Test

```javascript
// Test: Auth state available in API routes
// pages/api/user.js
export async function GET({ locals }) {
  const user = locals.user;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Expected: User data accessible
  console.assert(user.id, 'User ID should be available');
  
  return new Response(JSON.stringify({
    id: user.id,
    displayName: user.displayName,
    primaryEmail: user.primaryEmail
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### TypeScript Support Test

```typescript
// Test: TypeScript definitions
// env.d.ts additions
declare namespace App {
  interface Locals {
    user: import('@stackframe/stack').User | null;
  }
}

// Usage with type safety
const user: App.Locals['user'] = Astro.locals.user;
// Expected: TypeScript should recognize user type
if (user) {
  // user.id, user.displayName should be typed
  const name: string = user.displayName;
}
```

### Middleware Population Test

```javascript
// Test: Middleware correctly populates locals using Astro Container
import { test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import stackAuth from 'astro-stack-auth';

test('middleware populates locals correctly', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth()]
  });
  
  // Mock authenticated request
  const request = new Request('http://localhost/', {
    headers: { 'cookie': 'stack-session=valid-token' }
  });
  
  const component = `
    ---
    // Test that locals are populated by middleware
    const user = Astro.locals.user;
    const session = Astro.locals.session;
    ---
    <div data-testid="auth-state">
      User: {user?.displayName || 'null'}
      Session: {session?.id || 'null'}  
    </div>
  `;
  
  const result = await container.renderToString(component, { request });
  
  // Expected: locals.user and locals.session populated by middleware
  expect(result).toContain('data-testid="auth-state"');
});
```

## Dependencies

- Integration must register auth middleware
- Depends on `@stackframe/stack` for user session handling
- Requires TypeScript type definitions
- Session validation logic

## Implementation Notes

- Middleware should run on every request
- Should handle session refresh/validation
- Performance considerations for auth state resolution
- Proper error handling for invalid sessions
- Cache session data appropriately

## Definition of Done

- [ ] `Astro.locals.user` populated on every request
- [ ] Null when unauthenticated, User object when authenticated  
- [ ] TypeScript definitions exported
- [ ] Available in both pages and API routes
- [ ] Performance optimized (cached appropriately)
- [ ] Tests validate all scenarios