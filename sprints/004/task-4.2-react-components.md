# Task 4.2: React Component Integration

**Sprint**: 004  
**Estimated Time**: 3-4 hours  
**Blockers**: Task 4.1 (Client-side Functions)

## Objective

Re-export Stack Auth's React components and ensure they work correctly within Astro's island architecture.

## Acceptance Criteria

- [ ] SignIn, SignUp, UserButton components exported
- [ ] Components work with all Astro client directives
- [ ] Proper TypeScript types for component props
- [ ] Components inherit Stack Auth styling
- [ ] Integration with Astro's hydration system

## Test Specification

### Component Export Test

```javascript
// Test: Components can be imported
const components = require('astro-stack-auth/components');

console.assert(typeof components.SignIn === 'function', 'SignIn should be exported');
console.assert(typeof components.SignUp === 'function', 'SignUp should be exported'); 
console.assert(typeof components.UserButton === 'function', 'UserButton should be exported');
```

### Astro Island Test

```javascript
// Test: Components work in Astro islands
const { test, expect } = require('vitest');
const { experimental_AstroContainer as AstroContainer } = require('astro/container');

test('SignIn component renders in Astro', async () => {
  const container = await AstroContainer.create({
    integrations: [stackAuth()],
    vite: { react: {} }
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
```

## Required Files

### src/components.ts
```typescript
// Re-export Stack Auth React components
export { SignIn } from '@stackframe/stack-ui';
export { SignUp } from '@stackframe/stack-ui';
export { UserButton } from '@stackframe/stack-ui';
export { AccountSettings } from '@stackframe/stack-ui';

// Re-export Stack Auth provider
export { StackProvider } from '@stackframe/stack';

// Re-export types for convenience
export type { 
  SignInProps,
  SignUpProps, 
  UserButtonProps 
} from '@stackframe/stack-ui';
```

## Definition of Done

- [ ] All components properly re-exported
- [ ] Work with Astro client directives
- [ ] TypeScript types available
- [ ] Integration tests pass