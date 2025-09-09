# Feature: Protected Pages

**GitHub Issue:** #4  
**Title:** User can protect pages by redirecting unauthenticated users

## Description

As a developer, I want to protect certain pages by automatically redirecting unauthenticated users to the sign-in page so that I can control access to sensitive content.

## Acceptance Criteria

- [ ] Helper function to require authentication
- [ ] Automatic redirect to sign-in page when not authenticated
- [ ] Preserves original URL for post-login redirect
- [ ] Works in both SSR and SSG contexts
- [ ] TypeScript support with proper return types

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Basic Protection Test

```astro
---
// Test: requireAuth redirects unauthenticated users
// pages/dashboard.astro
import { requireAuth } from 'astro-stack-auth/server';

const user = await requireAuth(Astro);
// Expected: Function either returns user or redirects
// If not authenticated, user never gets here due to redirect
---

<h1>Dashboard for {user.displayName}</h1>
<p>This content is protected</p>
```

### Redirect Preservation Test

```javascript
// Test: Original URL preserved for post-login redirect using Astro Container
import { test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import stackAuth from 'astro-stack-auth';

test('preserves original URL for post-login redirect', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth()]
  });
  
  // Test protected page that should redirect
  const component = `
    ---
    import { requireAuth } from 'astro-stack-auth/server';
    const user = await requireAuth(Astro);
    ---
    <h1>Protected Content</h1>
  `;
  
  // Mock unauthenticated request to /dashboard
  const request = new Request('http://localhost:3000/dashboard');
  
  // Expected: Should redirect with return URL
  const response = await container.renderToResponse(component, { request });
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toContain('redirect=/dashboard');
});
```

### Custom Sign-In URL Test

```astro
---
// Test: Custom sign-in URL configuration
import { requireAuth } from 'astro-stack-auth/server';

const user = await requireAuth(Astro, {
  signInUrl: '/auth/signin',
  redirectTo: '/success'
});
---

<!-- Expected: Custom URLs used for redirect -->
```

### API Route Protection Test

```javascript
// Test: Protect API routes
// pages/api/protected.js
import { requireAuth } from 'astro-stack-auth/server';

export async function GET(context) {
  const user = await requireAuth(context);
  
  // Expected: Returns 401 with redirect URL instead of HTML redirect
  return new Response(JSON.stringify({
    id: user.id,
    message: 'Protected API data'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Optional Protection Test

```astro
---
// Test: Optional authentication (doesn't redirect)
import { getUser } from 'astro-stack-auth/server';

const user = await getUser(Astro);
// Expected: Returns user or null, never redirects
---

{user ? (
  <p>Welcome, {user.displayName}!</p>
) : (
  <p>Please <a href="/signin">sign in</a> to continue</p>
)}
```

### SSG Compatibility Test

```astro
---
// Test: Works with static generation
export const prerender = true;

import { requireAuth } from 'astro-stack-auth/server';

// Expected: Appropriate handling for static generation
// Should either build-time error or runtime redirect
const user = await requireAuth(Astro);
---

<h1>Static Protected Page</h1>
```

### Type Safety Test

```typescript
// Test: TypeScript return types
import { requireAuth, getUser } from 'astro-stack-auth/server';
import type { APIContext } from 'astro';

async function testTypes(context: APIContext) {
  // requireAuth should return User (never null)
  const user1 = await requireAuth(context);
  const name1: string = user1.displayName; // Should not need null check
  
  // getUser should return User | null
  const user2 = await getUser(context);
  const name2: string = user2?.displayName || 'Guest'; // Should need null check
}
```

## Dependencies

- Auth state resolution from middleware
- Stack Auth session validation
- Astro's redirect functionality
- URL parsing for redirect preservation

## Implementation Notes

- `requireAuth` should throw/redirect if not authenticated
- `getUser` should return null if not authenticated (no redirect)
- Handle both page and API route contexts
- Preserve query parameters in redirect URLs
- Consider SSG/SSR compatibility
- Proper TypeScript return type inference

## Definition of Done

- [ ] `requireAuth` function implemented and exported
- [ ] Automatic redirect with URL preservation
- [ ] Works in both pages and API routes
- [ ] TypeScript definitions with correct return types
- [ ] SSG compatibility handled appropriately
- [ ] Tests cover all authentication scenarios