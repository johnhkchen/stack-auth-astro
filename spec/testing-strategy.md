# Testing Strategy

## Overview

Comprehensive testing approach using markdown-doctest for executable specifications, Vitest for unit/integration tests, and Astro's container API for testing Astro-specific functionality.

## Test Categories

### 1. Unit Tests

#### Integration Configuration
```javascript
// Test: Integration options validation
import { describe, test, expect, beforeEach } from 'vitest';
import stackAuth from 'astro-stack-auth';

describe('Integration Configuration', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.STACK_PROJECT_ID;
    delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
    delete process.env.STACK_SECRET_SERVER_KEY;
  });
  
  test('validates required environment variables', () => {
    expect(() => stackAuth()).toThrow('STACK_PROJECT_ID is required');
  });
  
  test('accepts valid configuration', () => {
    process.env.STACK_PROJECT_ID = 'test-id';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret';
    
    expect(() => stackAuth({
      prefix: '/auth',
      injectRoutes: true
    })).not.toThrow();
  });
  
  test('validates prefix format', () => {
    expect(() => stackAuth({ prefix: 'invalid' }))
      .toThrow('prefix must start with /');
  });
});
```

#### Server-Side Helpers
```javascript
// Test: getUser and requireAuth functions
import { describe, test, expect, vi } from 'vitest';
import { getUser, requireAuth } from 'astro-stack-auth/server';

describe('Server Helpers', () => {
  const mockContext = {
    locals: {},
    request: new Request('http://localhost/'),
    redirect: vi.fn()
  };
  
  test('getUser returns null for unauthenticated', async () => {
    const user = await getUser(mockContext);
    expect(user).toBeNull();
  });
  
  test('requireAuth redirects unauthenticated users', async () => {
    await expect(requireAuth(mockContext)).rejects.toThrow();
    expect(mockContext.redirect).toHaveBeenCalledWith('/signin');
  });
  
  test('requireAuth returns user when authenticated', async () => {
    mockContext.locals.user = { id: '123', displayName: 'Test' };
    
    const user = await requireAuth(mockContext);
    expect(user.id).toBe('123');
  });
});
```

#### Client-Side Functions
```javascript
// Test: Client-side authentication functions
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { signIn, signOut } from 'astro-stack-auth/client';

describe('Client Functions', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });
  });
  
  test('signOut calls Stack Auth API', async () => {
    global.fetch.mockResolvedValue(new Response());
    
    await signOut();
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/handler/signout'),
      expect.any(Object)
    );
  });
  
  test('signOut redirects on success', async () => {
    global.fetch.mockResolvedValue(new Response());
    
    await signOut({ redirectTo: '/goodbye' });
    
    expect(window.location.href).toContain('/goodbye');
  });
});
```

### 2. Integration Tests

#### Astro Integration Lifecycle
```javascript
// Test: Integration properly registers with Astro
import { describe, test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import stackAuth from 'astro-stack-auth';

describe('Astro Integration', () => {
  test('integration registers correctly', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth()]
    });
    
    // Test that middleware is registered
    expect(container.middleware).toBeDefined();
    
    // Test that routes are injected
    const routes = container.internalAPI.routes;
    expect(routes.some(route => route.route.includes('handler'))).toBe(true);
  });

  test('middleware populates locals', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth()]
    });
    
    // Mock authenticated request
    const request = new Request('http://localhost/', {
      headers: {
        'cookie': 'stack-session=mock-token'
      }
    });
    
    // Render component that uses Astro.locals
    const TestComponent = `
      ---
      const user = Astro.locals.user;
      ---
      <div data-testid="user-name">{user?.displayName || 'No user'}</div>
    `;
    
    const result = await container.renderToString(TestComponent, {
      request
    });
    
    expect(result).toContain('data-testid="user-name"');
  });
});
```

#### Route Injection
```javascript
// Test: Stack Auth routes are properly injected
import { describe, test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import stackAuth from 'astro-stack-auth';

describe('Route Injection', () => {
  test('default routes are injected', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth()]
    });
    
    // Test that Stack Auth routes are injected
    const routes = container.internalAPI.routes;
    const stackRoutes = routes.filter(route => 
      route.route.includes('handler')
    );
    
    expect(stackRoutes.length).toBeGreaterThan(0);
    
    // Test specific route patterns
    const routePatterns = stackRoutes.map(r => r.route);
    expect(routePatterns.some(p => p.includes('[...stack]'))).toBe(true);
  });

  test('custom prefix routes work', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth({ prefix: '/api/auth' })]
    });
    
    const routes = container.internalAPI.routes;
    const authRoutes = routes.filter(route => 
      route.route.includes('api/auth')
    );
    
    expect(authRoutes.length).toBeGreaterThan(0);
  });

  test('routes handle requests correctly', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth()]
    });
    
    // Test unauthenticated request to user endpoint
    const request = new Request('http://localhost/handler/user');
    const response = await container.renderToResponse(request);
    
    expect(response.status).toBe(401);
  });
});
```

#### Component Integration
```javascript
// Test: Stack Auth components work in Astro
import { describe, test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getViteConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';

describe('Component Integration', () => {
  test('SignIn component renders in Astro', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth()],
      vite: getViteConfig({ react: {} })
    });
    
    const component = `
      ---
      import { SignIn } from 'astro-stack-auth/components';
      ---
      <SignIn client:load />
    `;
    
    const result = await container.renderToString(component);
    expect(result).toContain('astro-island');
  });

  test('UserButton renders with auth state', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth()],
      vite: getViteConfig({ react: {} })
    });
    
    const component = `
      ---
      import { UserButton } from 'astro-stack-auth/components';
      // Mock authenticated user in locals
      Astro.locals.user = { 
        id: '123', 
        displayName: 'John Doe',
        primaryEmail: 'john@example.com'
      };
      ---
      <UserButton client:load />
    `;
    
    const result = await container.renderToString(component);
    expect(result).toContain('astro-island');
    expect(result).toContain('UserButton');
  });

  test('components work with different hydration strategies', async () => {
    const container = await AstroContainer.create({
      integrations: [stackAuth()],
      vite: getViteConfig({ react: {} })
    });
    
    const strategies = ['load', 'idle', 'visible'];
    
    for (const strategy of strategies) {
      const component = `
        ---
        import { SignIn } from 'astro-stack-auth/components';
        ---
        <SignIn client:${strategy} />
      `;
      
      const result = await container.renderToString(component);
      expect(result).toContain(`astro-island`);
      expect(result).toContain(`client:${strategy}`);
    }
  });
});
```

### 3. End-to-End Tests

#### Complete Authentication Flow
```javascript
// Test: Full sign-in flow
import { expect, test } from '@playwright/test';

test('complete sign-in flow', async ({ page }) => {
  // Start on protected page
  await page.goto('/dashboard');
  
  // Should redirect to sign-in
  await expect(page).toHaveURL('/signin');
  
  // Fill sign-in form
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="sign-in-button"]');
  
  // Should redirect back to dashboard
  await expect(page).toHaveURL('/dashboard');
  
  // Should show user content
  await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
});
```

#### Protected Route Access
```javascript
// Test: Protected routes enforce authentication
import { expect, test } from '@playwright/test';

test('protected pages require authentication', async ({ page }) => {
  await page.goto('/admin');
  
  // Should redirect to sign-in with return URL
  await expect(page).toHaveURL('/signin?redirect=/admin');
});

test('API routes return 401 for unauthenticated', async ({ page }) => {
  const response = await page.request.get('/api/user-data');
  expect(response.status()).toBe(401);
});
```

#### Session Management
```javascript
// Test: Session handling and persistence
import { expect, test } from '@playwright/test';

test('session persists across page reloads', async ({ page }) => {
  // Sign in user
  await signInUser(page);
  
  // Reload page
  await page.reload();
  
  // Should still be authenticated
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});

test('sign-out clears session', async ({ page }) => {
  await signInUser(page);
  
  // Sign out
  await page.click('[data-testid="sign-out-button"]');
  
  // Should redirect to home
  await expect(page).toHaveURL('/');
  
  // Session should be cleared
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/signin');
});
```

### 4. Markdown-Doctest Integration

#### Feature Specification Tests
```markdown
<!-- Each feature spec includes executable tests -->

## Zero Configuration Test

```javascript
// Test: Integration works with just environment variables
process.env.STACK_PROJECT_ID = 'test-project';

const config = await import('astro-stack-auth');
// Expected: No configuration errors
console.assert(typeof config.default === 'function');
```

## Component Test

```astro
<!-- Test: Components render correctly -->
---
import { SignIn } from 'astro-stack-auth/components';
---

<SignIn client:load />
<!-- Expected: Component renders without errors -->
```
```

#### Running Doctest
```bash
# Run markdown-doctest on feature specifications
npx markdown-doctest spec/features/*.md

# Expected output: All tests pass
✓ zero-config-installation.md
✓ auth-state-locals.md  
✓ signin-component.md
✓ protected-pages.md
✓ client-signout.md
✓ protected-api-routes.md
✓ userbutton-component.md
✓ signup-component.md
✓ custom-endpoint-prefix.md
✓ helpful-error-messages.md
```

## Test Data Management

### Mock Stack Auth Responses
```javascript
// Setup mock Stack Auth API responses
export const mockStackAuth = {
  user: {
    id: 'user_123',
    displayName: 'Test User',
    primaryEmail: 'test@example.com',
    profileImageUrl: 'https://example.com/avatar.jpg'
  },
  
  session: {
    id: 'session_456',
    userId: 'user_123',
    expiresAt: new Date(Date.now() + 86400000) // 24 hours
  }
};

// Mock fetch responses
global.fetch = vi.fn((url) => {
  if (url.includes('/user')) {
    return Promise.resolve(new Response(JSON.stringify(mockStackAuth.user)));
  }
  if (url.includes('/session')) {
    return Promise.resolve(new Response(JSON.stringify(mockStackAuth.session)));
  }
  return Promise.resolve(new Response('', { status: 404 }));
});
```

### Test Environment Setup
```javascript
// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.STACK_PROJECT_ID = 'test_project_id';
process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test_publishable_key';
process.env.STACK_SECRET_SERVER_KEY = 'test_secret_key';

// Clean up between tests
afterEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
});
```

## Continuous Integration

### Test Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      # Unit tests
      - run: npm run test
      
      # Integration tests  
      - run: npm run test:integration
      
      # Markdown doctests
      - run: npx markdown-doctest spec/features/*.md
      
      # E2E tests
      - run: npm run test:e2e
```

### Coverage Requirements
- Unit tests: >90% code coverage
- Integration tests: All major user flows
- E2E tests: Critical authentication paths
- Markdown-doctest: All feature specifications

## Test Organization

### File Structure
```
tests/
├── unit/
│   ├── integration.test.js
│   ├── server-helpers.test.js
│   ├── client-functions.test.js
│   └── components.test.js
├── integration/
│   ├── astro-lifecycle.test.js
│   ├── route-injection.test.js
│   └── middleware.test.js
├── e2e/
│   ├── auth-flow.spec.js
│   ├── protected-routes.spec.js
│   └── session-management.spec.js
└── fixtures/
    ├── astro-project/
    └── mock-responses/
```

## Vitest Configuration

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // For client-side tests
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
});
```

### Test Setup File
```typescript
// tests/setup.ts
import { vi } from 'vitest';

// Setup environment variables
process.env.STACK_PROJECT_ID = 'test_project_id';
process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test_publishable_key';
process.env.STACK_SECRET_SERVER_KEY = 'test_secret_key';

// Mock browser APIs
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000' },
  writable: true
});

// Mock fetch globally
global.fetch = vi.fn();
```

### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:doctest": "markdown-doctest spec/features/*.md"
  }
}
```

This comprehensive testing strategy ensures that the integration works correctly across all scenarios while maintaining the executable documentation approach through markdown-doctest and leveraging Vitest for fast, modern testing with Astro's container API.