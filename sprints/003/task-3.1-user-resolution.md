# Task 3.1: User Resolution Functions

**Sprint**: 003  
**Estimated Time**: 2-3 hours  
**Blockers**: Sprint 002 Complete

## Objective

Implement `getUser()` and `getSession()` server-side functions that work in both Astro pages and API routes.

## Acceptance Criteria

- [ ] `getUser()` returns User | null
- [ ] `getSession()` returns Session | null
- [ ] Works in both .astro pages and API routes
- [ ] TypeScript support with correct return types
- [ ] Uses auth state from middleware

## Test Specification

### Get User Test

```javascript
// Test: getUser function works correctly
const { getUser } = require('astro-stack-auth/server');

const mockContext = {
  locals: {
    user: { id: '123', displayName: 'Test User' }
  }
};

const user = await getUser(mockContext);
console.assert(user.id === '123', 'Should return user from locals');
```

### Get Session Test

```javascript
// Test: getSession function works correctly
const { getSession } = require('astro-stack-auth/server');

const mockContext = {
  locals: {
    session: { id: 'session123', userId: '123' }
  }
};

const session = await getSession(mockContext);
console.assert(session.id === 'session123', 'Should return session from locals');
```

## Required Files

### src/server.ts
```typescript
import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';

export async function getUser(context: APIContext): Promise<User | null> {
  return context.locals.user || null;
}

export async function getSession(context: APIContext): Promise<Session | null> {
  return context.locals.session || null;
}
```

## Definition of Done

- [ ] Functions implemented and exported
- [ ] Work in pages and API routes
- [ ] TypeScript types correct
- [ ] Tests pass