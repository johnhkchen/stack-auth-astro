# Task 3.4: Custom Endpoint Prefix Support

**Sprint**: 003  
**Estimated Time**: 2-3 hours  
**Blockers**: Task 3.3 (Protected API Routes)

## Objective

Ensure custom endpoint prefixes work throughout the entire system, including redirects and client-side functions.

## Acceptance Criteria

- [ ] Custom prefixes work for all Stack Auth endpoints
- [ ] Redirects use correct prefix for sign-in URLs
- [ ] Client-side functions auto-detect prefix
- [ ] Configuration validation for prefix format
- [ ] No conflicts with existing routes

## Test Specification

### Custom Prefix Integration Test

```javascript
// Test: Custom prefix works end-to-end
const stackAuth = require('astro-stack-auth');

const integration = stackAuth({
  projectId: 'test',
  publishableClientKey: 'test',
  secretServerKey: 'test',
  prefix: '/api/auth'
});

// Routes should be injected with custom prefix
console.assert(integration.name === 'astro-stack-auth');
```

### Redirect URL Test

```javascript
// Test: Redirects use custom prefix
const { requireAuth } = require('astro-stack-auth/server');

const mockContext = {
  locals: { user: null },
  url: new URL('http://localhost/dashboard'),
  redirect: vi.fn()
};

// Mock the configuration to use custom prefix
global.__STACK_AUTH_CONFIG__ = { prefix: '/api/auth' };

try {
  await requireAuth(mockContext);
} catch (error) {
  // Should redirect to custom prefix
  console.assert(mockContext.redirect.calledWith('/api/auth/signin?redirect=/dashboard'));
}
```

## Definition of Done

- [ ] Custom prefixes work for all endpoints
- [ ] Redirects use correct URLs
- [ ] No route conflicts
- [ ] Configuration properly validated
- [ ] Integration tests pass