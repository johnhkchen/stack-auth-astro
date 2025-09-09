# Task 2.3: Stack Auth API Route Handler

**Sprint**: 002  
**Estimated Time**: 3-4 hours  
**Blockers**: Task 2.1 (Environment Configuration)

## Objective

Create an API route handler that proxies Stack Auth endpoints, handling authentication requests, callbacks, and session management within Astro's routing system.

## Acceptance Criteria

- [ ] Handles all Stack Auth API endpoints (signin, signout, callback, user, session)
- [ ] Properly proxies requests to Stack Auth service
- [ ] Manages cookies and session data correctly
- [ ] Supports all HTTP methods (GET, POST, PUT, DELETE)
- [ ] Error handling with appropriate HTTP status codes

## Implementation Steps

1. **Create dynamic API route handler for Stack Auth endpoints**
2. **Implement request proxying to Stack Auth service**
3. **Handle cookie management and session data**
4. **Add proper error handling and HTTP status codes**
5. **Support CSRF protection and security headers**

## Test Specification

### API Route Handler Test

```javascript
// Test: API route handles Stack Auth endpoints
const { test, expect } = require('vitest');
const { experimental_AstroContainer as AstroContainer } = require('astro/container');
const stackAuth = require('astro-stack-auth');

test('API route handler responds to Stack Auth endpoints', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth({
      projectId: 'test',
      publishableClientKey: 'test',
      secretServerKey: 'test'
    })]
  });
  
  // Test user endpoint
  const request = new Request('http://localhost/handler/user');
  const response = await container.renderToResponse(request);
  
  // Expected: Should respond (might be 401 for unauthenticated)
  expect(response.status).toBeDefined();
  expect(response.status).not.toBe(404);
});
```

### Request Proxying Test

```javascript
// Test: Handler properly proxies requests to Stack Auth
const { vi } = require('vitest');

test('handler proxies requests to Stack Auth service', async () => {
  global.fetch = vi.fn(() => 
    Promise.resolve(new Response(JSON.stringify({ success: true })))
  );
  
  const handler = require('astro-stack-auth/api/handler');
  
  const request = new Request('http://localhost/handler/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com' })
  });
  
  const context = {
    request,
    params: { stack: 'signin' },
    url: new URL('http://localhost/handler/signin')
  };
  
  await handler.POST(context);
  
  // Expected: Should make request to Stack Auth API
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('stack-auth.com'),
    expect.objectContaining({
      method: 'POST',
      headers: expect.any(Object),
      body: expect.any(String)
    })
  );
});
```

### Cookie Management Test

```javascript
// Test: Handler manages cookies correctly
test('handler manages Stack Auth cookies', async () => {
  global.fetch = vi.fn(() => 
    Promise.resolve(new Response(JSON.stringify({ success: true }), {
      headers: {
        'Set-Cookie': 'stack-session=abc123; HttpOnly; Path=/; SameSite=Lax'
      }
    }))
  );
  
  const handler = require('astro-stack-auth/api/handler');
  
  const request = new Request('http://localhost/handler/signin', {
    method: 'POST'
  });
  
  const context = {
    request,
    params: { stack: 'signin' },
    url: new URL('http://localhost/handler/signin')
  };
  
  const response = await handler.POST(context);
  
  // Expected: Should forward Set-Cookie headers
  expect(response.headers.get('Set-Cookie')).toContain('stack-session=');
});
```

### Error Handling Test

```javascript
// Test: Handler provides appropriate error responses
test('handler handles Stack Auth API errors', async () => {
  global.fetch = vi.fn(() => 
    Promise.resolve(new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401
    }))
  );
  
  const handler = require('astro-stack-auth/api/handler');
  
  const request = new Request('http://localhost/handler/signin', {
    method: 'POST'
  });
  
  const context = {
    request,
    params: { stack: 'signin' },
    url: new URL('http://localhost/handler/signin')
  };
  
  const response = await handler.POST(context);
  
  // Expected: Should forward error status and message
  expect(response.status).toBe(401);
});
```

## Required Files

### src/api/handler.ts
```typescript
import type { APIContext } from 'astro';

const STACK_AUTH_BASE_URL = 'https://api.stack-auth.com';

export async function GET(context: APIContext) {
  return handleStackAuthRequest(context, 'GET');
}

export async function POST(context: APIContext) {
  return handleStackAuthRequest(context, 'POST');
}

export async function PUT(context: APIContext) {
  return handleStackAuthRequest(context, 'PUT');
}

export async function DELETE(context: APIContext) {
  return handleStackAuthRequest(context, 'DELETE');
}

async function handleStackAuthRequest(
  context: APIContext, 
  method: string
): Promise<Response> {
  try {
    const { request, params } = context;
    
    // Extract the Stack Auth endpoint from the catch-all route
    const endpoint = Array.isArray(params.stack) 
      ? params.stack.join('/') 
      : params.stack || '';
    
    // Build the Stack Auth API URL
    const stackAuthUrl = `${STACK_AUTH_BASE_URL}/${endpoint}`;
    
    // Prepare headers for proxying
    const headers = prepareHeaders(request);
    
    // Prepare request body
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.text();
    
    // Make request to Stack Auth API
    const stackAuthResponse = await fetch(stackAuthUrl, {
      method,
      headers,
      body
    });
    
    // Prepare response headers
    const responseHeaders = new Headers();
    
    // Forward important headers from Stack Auth
    const headersToForward = [
      'Content-Type',
      'Set-Cookie',
      'Cache-Control',
      'Location'
    ];
    
    headersToForward.forEach(headerName => {
      const headerValue = stackAuthResponse.headers.get(headerName);
      if (headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    });
    
    // Add security headers
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    
    const responseBody = await stackAuthResponse.text();
    
    return new Response(responseBody, {
      status: stackAuthResponse.status,
      statusText: stackAuthResponse.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('Stack Auth API handler error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Authentication service unavailable',
      message: 'Please try again later'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

function prepareHeaders(request: Request): Headers {
  const headers = new Headers();
  
  // Forward important headers
  const headersToForward = [
    'Content-Type',
    'Authorization', 
    'Cookie',
    'User-Agent',
    'Accept',
    'Accept-Language'
  ];
  
  headersToForward.forEach(headerName => {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  });
  
  // Add Stack Auth specific headers
  headers.set('X-Stack-Auth-Integration', 'astro');
  headers.set('X-Forwarded-For', getClientIP(request));
  
  return headers;
}

function getClientIP(request: Request): string {
  // Try to get client IP from various headers
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }
  
  // Fallback
  return 'unknown';
}
```

### tests/api-handler.test.ts
```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GET, POST, PUT, DELETE } from '../src/api/handler';
import type { APIContext } from 'astro';

describe('Stack Auth API Handler', () => {
  let mockContext: APIContext;

  beforeEach(() => {
    mockContext = {
      request: new Request('http://localhost/handler/signin'),
      params: { stack: 'signin' },
      url: new URL('http://localhost/handler/signin')
    } as APIContext;
    
    global.fetch = vi.fn();
  });

  test('GET handler proxies to Stack Auth API', async () => {
    global.fetch = vi.fn(() => 
      Promise.resolve(new Response('{"success": true}'))
    );

    await GET(mockContext);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.stack-auth.com/signin',
      expect.objectContaining({
        method: 'GET'
      })
    );
  });

  test('POST handler forwards request body', async () => {
    const requestBody = JSON.stringify({ email: 'test@example.com' });
    mockContext.request = new Request('http://localhost/handler/signin', {
      method: 'POST',
      body: requestBody,
      headers: { 'Content-Type': 'application/json' }
    });

    global.fetch = vi.fn(() => 
      Promise.resolve(new Response('{"success": true}'))
    );

    await POST(mockContext);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.stack-auth.com/signin',
      expect.objectContaining({
        method: 'POST',
        body: requestBody
      })
    );
  });

  test('handler forwards Set-Cookie headers', async () => {
    global.fetch = vi.fn(() => 
      Promise.resolve(new Response('{"success": true}', {
        headers: {
          'Set-Cookie': 'stack-session=token123; HttpOnly'
        }
      }))
    );

    const response = await GET(mockContext);

    expect(response.headers.get('Set-Cookie')).toBe('stack-session=token123; HttpOnly');
  });

  test('handler handles API errors gracefully', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const response = await GET(mockContext);

    expect(response.status).toBe(503);
    
    const body = await response.json();
    expect(body.error).toBe('Authentication service unavailable');
  });

  test('handler supports catch-all routes', async () => {
    mockContext.params = { stack: ['oauth', 'callback'] };
    
    global.fetch = vi.fn(() => 
      Promise.resolve(new Response('{"success": true}'))
    );

    await GET(mockContext);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.stack-auth.com/oauth/callback',
      expect.any(Object)
    );
  });
});
```

## Validation Commands

```bash
# Test API handler functionality
npm run test -- api-handler.test.ts

# Test handler with different HTTP methods
npm run test -- --reporter=verbose api-handler.test.ts

# Test error handling
npm run test -- api-handler.test.ts --grep="error"
```

## Definition of Done

- [ ] API handler responds to all Stack Auth endpoints
- [ ] Request proxying works for all HTTP methods
- [ ] Cookie management preserves session data
- [ ] Error handling provides appropriate status codes
- [ ] Security headers are properly set
- [ ] All API handler tests pass
- [ ] Doctests pass for this task