# Feature: Astro Integration Setup

**GitHub Issue:** #2  
**Title:** Integration registers properly with Astro build system

## Description

As a developer, I want the Stack Auth integration to register seamlessly with Astro's integration system so that it automatically configures middleware, routes, and React renderer.

## Acceptance Criteria

- [ ] Integration registers via Astro's `astro:config:setup` hook
- [ ] Automatically adds React renderer if not present  
- [ ] Injects Stack Auth API routes via `injectRoute()`
- [ ] Registers authentication middleware via `addMiddleware()`
- [ ] Configures environment variables and validation

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Integration Registration Test

```javascript
// Test: Integration hooks are properly registered
const { defineConfig } = require('astro/config');
const stackAuth = require('astro-stack-auth');

let setupHookCalled = false;
let mockOptions = {
  updateConfig: (config) => config,
  addRenderer: (renderer) => { console.log('Renderer added:', renderer.name); },
  injectRoute: (route) => { console.log('Route injected:', route.pattern); },
  addMiddleware: (middleware) => { console.log('Middleware added'); },
  logger: { info: console.log, warn: console.warn, error: console.error }
};

// Mock the integration setup
const integration = stackAuth();
if (integration.hooks && integration.hooks['astro:config:setup']) {
  integration.hooks['astro:config:setup'](mockOptions);
  setupHookCalled = true;
}

// Expected: Setup hook executed
console.assert(setupHookCalled, 'Setup hook should be called');
console.assert(integration.name === 'astro-stack-auth', 'Integration should have correct name');
```

### Route Injection Test

```javascript
// Test: API routes are properly injected
const stackAuth = require('astro-stack-auth');

let injectedRoutes = [];
const mockInjectRoute = (route) => {
  injectedRoutes.push(route);
};

const integration = stackAuth({ prefix: '/auth' });
if (integration.hooks && integration.hooks['astro:config:setup']) {
  integration.hooks['astro:config:setup']({
    injectRoute: mockInjectRoute,
    addRenderer: () => {},
    addMiddleware: () => {},
    logger: { info: () => {}, warn: () => {}, error: () => {} }
  });
}

// Expected: Route injected with correct pattern
console.assert(injectedRoutes.length > 0, 'Should inject at least one route');
console.assert(
  injectedRoutes.some(route => route.pattern.includes('[...stack]')), 
  'Should inject catch-all route pattern'
);
```

### Middleware Registration Test

```javascript
// Test: Auth middleware is registered
const stackAuth = require('astro-stack-auth');

let middlewareAdded = false;
const mockAddMiddleware = (middleware) => {
  middlewareAdded = true;
  console.assert(middleware.order === 'pre', 'Middleware should run pre-order');
};

const integration = stackAuth();
if (integration.hooks && integration.hooks['astro:config:setup']) {
  integration.hooks['astro:config:setup']({
    injectRoute: () => {},
    addRenderer: () => {},
    addMiddleware: mockAddMiddleware,
    logger: { info: () => {}, warn: () => {}, error: () => {} }
  });
}

// Expected: Middleware registered
console.assert(middlewareAdded, 'Auth middleware should be registered');
```

## Dependencies

- Astro Integration API
- `@stackframe/stack` SDK
- React renderer capability

## Implementation Notes

- Integration must validate environment variables during setup
- Should provide helpful error messages for missing configuration
- Must handle both development and production environments
- Should support custom configuration options

## Definition of Done

- [ ] Integration properly implements Astro hooks
- [ ] Routes are injected and accessible
- [ ] Middleware processes requests correctly  
- [ ] React renderer is conditionally added
- [ ] Tests pass validating integration functionality