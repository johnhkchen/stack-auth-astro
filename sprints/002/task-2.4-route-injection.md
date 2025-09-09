# Task 2.4: Route Injection System

**Sprint**: 002  
**Estimated Time**: 2-3 hours  
**Blockers**: Task 2.3 (API Handler)

## Objective

Implement automatic injection of Stack Auth API routes into Astro's routing system using the configured prefix.

## Acceptance Criteria

- [ ] Routes automatically injected at configured prefix
- [ ] Catch-all route handles all Stack Auth endpoints
- [ ] Works with custom prefixes (e.g., `/api/auth`, `/auth`)
- [ ] Routes are not pre-rendered (SSR only)
- [ ] Integration with Astro's route system

## Test Specification

### Route Injection Test

```javascript
// Test: Routes are properly injected into Astro
const { test, expect } = require('vitest');
const { experimental_AstroContainer as AstroContainer } = require('astro/container');
const stackAuth = require('astro-stack-auth');

test('routes are injected with default prefix', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth({
      projectId: 'test',
      publishableClientKey: 'test',
      secretServerKey: 'test'
    })]
  });
  
  const routes = container.internalAPI.routes;
  const stackRoutes = routes.filter(route => route.route.includes('handler'));
  
  expect(stackRoutes.length).toBeGreaterThan(0);
});
```

### Custom Prefix Test

```javascript
// Test: Custom prefix routes work
test('routes are injected with custom prefix', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth({
      projectId: 'test',
      publishableClientKey: 'test',
      secretServerKey: 'test',
      prefix: '/api/auth'
    })]
  });
  
  const routes = container.internalAPI.routes;
  const authRoutes = routes.filter(route => route.route.includes('api/auth'));
  
  expect(authRoutes.length).toBeGreaterThan(0);
});
```

## Required Files

### Updated src/index.ts
```typescript
export default function stackAuth(options: StackAuthOptions = {}): AstroIntegration {
  const config = validateConfig(options);

  return {
    name: 'astro-stack-auth',
    hooks: {
      'astro:config:setup': async ({ addMiddleware, injectRoute }) => {
        // Inject Stack Auth API route
        if (config.injectRoutes) {
          injectRoute({
            pattern: `${config.prefix}/[...stack]`,
            entrypoint: 'astro-stack-auth/api/handler',
            prerender: false
          });
        }
        
        // Add authentication middleware
        const authMiddleware = createAuthMiddleware(config);
        addMiddleware(authMiddleware);
        
        console.log(`Stack Auth routes injected at ${config.prefix}`);
      }
    }
  };
}
```

## Definition of Done

- [ ] Routes injected at configured prefix
- [ ] Catch-all pattern handles all endpoints
- [ ] Custom prefixes work correctly
- [ ] Routes are SSR-only (not pre-rendered)
- [ ] Integration tests pass