# Feature: Server-Side Authentication Helpers

**GitHub Issue:** #7  
**Title:** Server-side authentication helpers (getUser, requireAuth, getSession)

## Description

As a developer, I want server-side authentication helpers so that I can protect API routes and server-rendered pages with type-safe authentication checks.

## Acceptance Criteria

- [ ] `getUser()` helper returns current user or null
- [ ] `requireAuth()` helper enforces authentication with configurable redirect
- [ ] `getSession()` helper returns session information
- [ ] All helpers work with Astro's APIContext
- [ ] Type-safe returns with proper TypeScript support

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### getUser Helper Test

```javascript
// Test: getUser returns user when authenticated
const { getUser } = require('astro-stack-auth/server');

// Mock authenticated context
const mockContext = {
  request: new Request('https://example.com/api/test'),
  locals: {
    user: { id: '123', displayName: 'Test User', email: 'test@example.com' },
    session: { sessionId: 'session123' }
  }
};

const user = await getUser(mockContext);

// Expected: User object returned
console.assert(user !== null, 'Should return user when authenticated');
console.assert(user.id === '123', 'Should return correct user ID');
console.assert(user.displayName === 'Test User', 'Should return correct display name');
```

### getUser Unauthenticated Test

```javascript
// Test: getUser returns null when not authenticated
const { getUser } = require('astro-stack-auth/server');

// Mock unauthenticated context
const mockContext = {
  request: new Request('https://example.com/api/test'),
  locals: {
    user: null,
    session: null
  }
};

const user = await getUser(mockContext);

// Expected: null returned for unauthenticated user
console.assert(user === null, 'Should return null when not authenticated');
```

### requireAuth Helper Test

```javascript
// Test: requireAuth returns user when authenticated
const { requireAuth } = require('astro-stack-auth/server');

// Mock authenticated context
const mockContext = {
  request: new Request('https://example.com/api/protected'),
  locals: {
    user: { id: '123', displayName: 'Test User' },
    session: { sessionId: 'session123' }
  }
};

const user = await requireAuth(mockContext);

// Expected: User object returned without redirect
console.assert(user !== null, 'Should return user when authenticated');
console.assert(user.id === '123', 'Should return correct user');
```

### requireAuth Redirect Test

```javascript
// Test: requireAuth throws when not authenticated
const { requireAuth } = require('astro-stack-auth/server');

// Mock unauthenticated context
const mockContext = {
  request: new Request('https://example.com/api/protected'),
  locals: {
    user: null,
    session: null
  }
};

try {
  await requireAuth(mockContext);
  console.assert(false, 'Should throw for unauthenticated user');
} catch (error) {
  // Expected: Authentication required error
  console.assert(error.message.includes('Authentication required'), 'Should throw auth error');
}
```

### getSession Helper Test

```javascript
// Test: getSession returns session information
const { getSession } = require('astro-stack-auth/server');

// Mock context with session
const mockContext = {
  request: new Request('https://example.com/api/session'),
  locals: {
    user: { id: '123', displayName: 'Test User' },
    session: { 
      sessionId: 'session123',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000) // 24 hours
    }
  }
};

const session = await getSession(mockContext);

// Expected: Session object returned
console.assert(session !== null, 'Should return session when available');
console.assert(session.sessionId === 'session123', 'Should return correct session ID');
```

### Type Safety Test

```javascript
// Test: Helpers provide proper TypeScript types
const { getUser, requireAuth, getSession } = require('astro-stack-auth/server');

// Mock context
const mockContext = {
  request: new Request('https://example.com/api/test'),
  locals: { user: null, session: null }
};

// Expected: Functions exist and are callable
console.assert(typeof getUser === 'function', 'getUser should be a function');
console.assert(typeof requireAuth === 'function', 'requireAuth should be a function');
console.assert(typeof getSession === 'function', 'getSession should be a function');
```

## Dependencies

- `@stackframe/stack` SDK for user/session types
- Astro APIContext for request handling
- Authentication middleware for populating locals

## Implementation Notes

- Helpers should work with both API routes and server-rendered pages
- Error messages should be helpful for debugging
- Should handle edge cases like expired sessions gracefully
- Must integrate with Stack Auth's session management

## Definition of Done

- [ ] All three helpers implemented and exported
- [ ] Proper TypeScript types and JSDoc documentation
- [ ] Error handling for unauthenticated requests
- [ ] Integration with Astro.locals populated by middleware
- [ ] Tests pass validating all helper functionality