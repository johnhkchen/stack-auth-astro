# Task 4.3: Component Hydration & State Management

**Sprint**: 004  
**Estimated Time**: 2-3 hours  
**Blockers**: Task 4.2 (React Components)

## Objective

Ensure Stack Auth React components properly hydrate with authentication state and work correctly with Astro's island architecture.

## Acceptance Criteria

- [ ] Components receive auth state during hydration
- [ ] Server-rendered auth state matches client state
- [ ] Components work with all hydration strategies
- [ ] Proper error boundaries for component failures
- [ ] State synchronization between server and client

## Test Specification

### Hydration Test

```javascript
// Test: Components hydrate with correct auth state
const { test, expect } = require('vitest');

test('UserButton hydrates with auth state', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth()]
  });
  
  const component = `
    ---
    import { UserButton } from 'astro-stack-auth/components';
    Astro.locals.user = { displayName: 'Test User' };
    ---
    <UserButton client:load />
  `;
  
  const result = await container.renderToString(component);
  expect(result).toContain('astro-island');
});
```

## Definition of Done

- [ ] Components hydrate correctly
- [ ] Auth state synchronized
- [ ] Error boundaries working
- [ ] All hydration strategies supported