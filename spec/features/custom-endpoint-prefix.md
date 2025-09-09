# Feature: Custom Authentication Endpoint Prefix

**GitHub Issue:** #9  
**Title:** User can customize authentication endpoint prefix

## Description

As a developer, I want to customize the URL prefix for Stack Auth endpoints so that I can integrate with existing routing patterns and avoid conflicts.

## Acceptance Criteria

- [ ] Default prefix configurable (default: `/handler`)
- [ ] All Stack Auth endpoints use custom prefix
- [ ] Integration automatically updates endpoint references
- [ ] Works with existing Astro routing patterns
- [ ] Validation for valid prefix formats

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Default Prefix Test

```javascript
// Test: Default endpoint prefix is /handler
// astro.config.mjs
import { defineConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [stackAuth()] // No prefix specified
});

// Expected: Stack Auth endpoints available at /handler/*
const response = await fetch('/handler/signin');
console.assert(response.status !== 404, 'Default /handler endpoint should exist');
```

### Custom Prefix Test

```javascript
// Test: Custom endpoint prefix configuration
// astro.config.mjs
import { defineConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [stackAuth({
    prefix: '/api/auth'
  })]
});

// Expected: Stack Auth endpoints available at /api/auth/*
const response = await fetch('/api/auth/signin');
console.assert(response.status !== 404, 'Custom prefix endpoint should exist');

// Old prefix should not work
const oldResponse = await fetch('/handler/signin');
console.assert(oldResponse.status === 404, 'Old prefix should not work');
```

### Prefix Validation Test

```javascript
// Test: Invalid prefix formats are rejected
import stackAuth from 'astro-stack-auth';

// Expected: These should throw configuration errors
const invalidPrefixes = [
  '', // Empty string
  'no-leading-slash', // Missing leading slash
  '/trailing/', // Trailing slash
  '/spaces in path', // Invalid characters
  '//', // Double slashes
];

invalidPrefixes.forEach(prefix => {
  try {
    stackAuth({ prefix });
    console.assert(false, `Should reject invalid prefix: ${prefix}`);
  } catch (error) {
    console.assert(error.message.includes('Invalid prefix'), 
      `Should throw validation error for: ${prefix}`);
  }
});
```

### Endpoint Discovery Test

```javascript
// Test: All Stack Auth endpoints use custom prefix
const customPrefix = '/auth';

// Expected endpoints with custom prefix
const expectedEndpoints = [
  `/auth/signin`,
  `/auth/signout`, 
  `/auth/callback`,
  `/auth/user`,
  `/auth/session`
];

for (const endpoint of expectedEndpoints) {
  const response = await fetch(endpoint);
  console.assert(response.status !== 404, 
    `Endpoint ${endpoint} should exist with custom prefix`);
}
```

### Client Configuration Update Test

```javascript
// Test: Client automatically uses custom prefix
// When prefix is configured as /api/auth
import { signIn } from 'astro-stack-auth/client';

// Mock fetch to capture requests
global.fetch = jest.fn(() => Promise.resolve(new Response()));

await signIn();

// Expected: Client functions use custom prefix
const fetchCalls = global.fetch.mock.calls;
const authCall = fetchCalls.find(call => 
  call[0].includes('/api/auth/'));

console.assert(authCall, 'Client should use custom prefix for API calls');
```

### Astro Route Integration Test

```javascript
// Test: Custom prefix works with Astro's routing
// Should not conflict with existing routes
const routes = [
  '/api/users', // Existing API route
  '/auth/signin', // Custom Stack Auth prefix
  '/auth/callback', // Stack Auth callback
  '/api/posts' // Another existing route
];

// Expected: All routes should be accessible
for (const route of routes) {
  const response = await fetch(route);
  console.assert(response.status !== 500, 
    `Route ${route} should not have conflicts`);
}
```

### Build Time Validation Test

```javascript
// Test: Build fails with helpful error for conflicts
// If custom prefix conflicts with existing routes
// astro.config.mjs
export default defineConfig({
  integrations: [stackAuth({ prefix: '/api' })] // Conflicts with existing /api routes
});

// Expected: Build should warn or fail with helpful message
// about potential route conflicts
```

### Dynamic Prefix Test

```javascript
// Test: Prefix can be set from environment variables
process.env.STACK_AUTH_PREFIX = '/custom-auth';

// astro.config.mjs
export default defineConfig({
  integrations: [stackAuth({
    prefix: process.env.STACK_AUTH_PREFIX || '/handler'
  })]
});

// Expected: Uses environment variable prefix
const response = await fetch('/custom-auth/signin');
console.assert(response.status !== 404, 'Should use environment prefix');
```

## Dependencies

- Astro integration route injection system
- Stack Auth client configuration
- URL path validation utilities
- Build-time route conflict detection

## Implementation Notes

- Should validate prefix format (must start with `/`, no trailing `/`)
- Must update all Stack Auth endpoint references
- Client-side functions should automatically use configured prefix
- Should check for route conflicts at build time
- Consider environment variable support
- Proper error messages for configuration issues

## Definition of Done

- [ ] Prefix configuration option in integration
- [ ] All Stack Auth endpoints use custom prefix
- [ ] Client functions automatically use configured prefix
- [ ] Validation prevents invalid prefix formats
- [ ] Build-time conflict detection
- [ ] Tests validate prefix customization works