# Feature: SignIn React Component

**GitHub Issue:** #3  
**Title:** User can sign in using Stack Auth SignIn React component

## Description

As a developer, I want to use Stack Auth's SignIn React component in my Astro project so that users can authenticate using Stack Auth's pre-built UI components.

## Acceptance Criteria

- [ ] Stack Auth SignIn component works in Astro islands
- [ ] Component handles sign-in flow automatically
- [ ] Supports all Stack Auth sign-in methods (OAuth, email, etc.)
- [ ] Redirects appropriately after successful sign-in
- [ ] TypeScript support

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Component Import Test

```astro
---
// Test: SignIn component can be imported and used
// pages/signin.astro
import { SignIn } from 'astro-stack-auth/components';
---

<html>
<body>
  <h1>Sign In</h1>
  <!-- Expected: Component renders Stack Auth sign-in UI -->
  <SignIn client:load />
</body>
</html>
```

### Sign-In Flow Test

```javascript
// Test: SignIn component handles authentication flow
// Integration test - component should:
// 1. Render sign-in form
// 2. Handle form submission
// 3. Communicate with Stack Auth API
// 4. Redirect on success

// Mock test setup
const signInComponent = await import('astro-stack-auth/components');
console.assert(typeof signInComponent.SignIn === 'function', 'SignIn should be a React component');
```

### Client Hydration Test

```astro
---
// Test: Component hydrates properly with client directives
import { SignIn } from 'astro-stack-auth/components';
---

<!-- Test different hydration strategies -->
<SignIn client:load />
<SignIn client:idle />  
<SignIn client:visible />

<!-- Expected: All hydration modes work correctly -->
```

### Callback URL Test

```astro
---
// Test: Component accepts callback URL configuration
import { SignIn } from 'astro-stack-auth/components';
---

<SignIn 
  client:load 
  callbackUrl="/dashboard"
  onSignIn={() => {
    // Expected: Callback fires on successful sign-in
    console.log('Sign-in successful');
  }}
/>
```

### Provider Configuration Test

```astro
---
// Test: Component supports OAuth providers
import { SignIn } from 'astro-stack-auth/components';
---

<SignIn 
  client:load
  providers={['google', 'github', 'email']}
/>

<!-- Expected: Only specified providers shown -->
```

### Error Handling Test

```javascript
// Test: Component handles sign-in errors gracefully
import { render, fireEvent, screen } from '@testing-library/react';
import { SignIn } from 'astro-stack-auth/components';

// Mock failed sign-in
const onError = jest.fn();
render(<SignIn onError={onError} />);

// Simulate sign-in failure
// Expected: onError callback called with error details
console.assert(typeof onError === 'function', 'Error handler should be called');
```

## Dependencies

- Re-exports Stack Auth's SignIn component from `@stackframe/stack-ui`
- Requires React integration in Astro
- Stack Auth client configuration
- Proper API endpoints for authentication

## Implementation Notes

- Should wrap/re-export Stack Auth's existing SignIn component
- Must work with Astro's island architecture
- Component should inherit Stack Auth's styling and behavior
- Need to handle Astro-specific routing for redirects
- Should work with both SSR and client-side rendering

## Definition of Done

- [ ] SignIn component exported from package
- [ ] Works with all Astro client hydration directives
- [ ] Supports all Stack Auth sign-in providers
- [ ] Handles errors and success callbacks
- [ ] Redirects work correctly in Astro context
- [ ] Tests validate component functionality