# Task 3.3: Protected API Routes

**Sprint**: 003  
**Estimated Time**: 2-3 hours  
**Blockers**: Task 3.2 (Authentication Requirements)

## Objective

Enhance API route protection to work seamlessly with all HTTP methods and provide consistent error responses.

## Acceptance Criteria

- [ ] Works with GET, POST, PUT, DELETE methods
- [ ] Consistent 401 error response format
- [ ] Proper JSON error messages
- [ ] User data available in protected routes
- [ ] Error handling for malformed requests

## Test Specification

### Protected Route Test

```javascript
// Test: Protected API routes work with all methods
const { requireAuth } = require('astro-stack-auth/server');

const methods = ['GET', 'POST', 'PUT', 'DELETE'];

methods.forEach(async (method) => {
  const mockContext = {
    locals: { user: { id: '123', displayName: 'Test' } },
    url: new URL('http://localhost/api/protected'),
    request: { method, headers: { accept: 'application/json' } }
  };
  
  const user = await requireAuth(mockContext);
  console.assert(user.id === '123', `Should work with ${method}`);
});
```

### Error Response Format Test

```javascript
// Test: 401 responses have consistent format
const mockContext = {
  locals: { user: null },
  url: new URL('http://localhost/api/protected'),
  request: { headers: { accept: 'application/json' } }
};

try {
  await requireAuth(mockContext);
} catch (response) {
  const body = await response.json();
  console.assert(body.error === 'Authentication required');
  console.assert(typeof body.message === 'string');
  console.assert(response.headers.get('Content-Type') === 'application/json');
}
```

## Definition of Done

- [ ] All HTTP methods supported
- [ ] Consistent error response format
- [ ] User data accessible in protected routes
- [ ] Error handling tests pass