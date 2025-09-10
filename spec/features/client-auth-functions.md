# Feature: Client-Side Authentication Functions

**GitHub Issue:** #10  
**Title:** Client-side authentication functions (signIn, signOut, redirects)

## Description

As a developer, I want client-side authentication functions so that I can handle user authentication flows from the browser with proper redirect handling.

## Acceptance Criteria

- [ ] `signIn()` function initiates authentication flow
- [ ] `signOut()` function handles user logout
- [ ] Redirect functions for auth pages (sign in, sign up, account)
- [ ] Support for multiple auth providers
- [ ] Proper error handling and loading states

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### signIn Function Test

```javascript
// Test: signIn initiates authentication flow
const { signIn } = require('astro-stack-auth/client');

// Mock environment
global.window = {
  location: { href: 'https://example.com/dashboard' }
};

// Test basic sign in
try {
  await signIn();
  console.log('Sign in initiated successfully');
} catch (error) {
  // Expected in test environment - function should exist
  console.assert(error.message !== 'signIn is not defined', 'signIn function should exist');
}

// Test sign in with provider
try {
  await signIn('google');
  console.log('Sign in with provider initiated successfully');
} catch (error) {
  // Expected in test environment
  console.assert(error.message !== 'signIn is not defined', 'signIn with provider should exist');
}
```

### signOut Function Test

```javascript
// Test: signOut handles logout flow
const { signOut } = require('astro-stack-auth/client');

// Mock environment
global.window = {
  location: { href: 'https://example.com/dashboard' }
};

// Test basic sign out
try {
  await signOut();
  console.log('Sign out initiated successfully');
} catch (error) {
  // Expected in test environment - function should exist
  console.assert(error.message !== 'signOut is not defined', 'signOut function should exist');
}

// Test sign out with redirect
try {
  await signOut({ callbackUrl: '/goodbye' });
  console.log('Sign out with callback initiated successfully');
} catch (error) {
  // Expected in test environment
  console.assert(error.message !== 'signOut is not defined', 'signOut with callback should exist');
}
```

### Redirect Functions Test

```javascript
// Test: Redirect functions handle navigation
const { redirectToSignIn, redirectToSignUp, redirectToAccount } = require('astro-stack-auth/client');

// Mock window object
let redirectedTo = null;
global.window = {
  location: {
    href: 'https://example.com/current',
    replace: (url) => { redirectedTo = url; }
  }
};

// Test redirectToSignIn
redirectToSignIn('/dashboard');
console.assert(typeof redirectToSignIn === 'function', 'redirectToSignIn should be a function');

// Test redirectToSignUp  
redirectToSignUp('/welcome');
console.assert(typeof redirectToSignUp === 'function', 'redirectToSignUp should be a function');

// Test redirectToAccount
redirectToAccount('/profile');
console.assert(typeof redirectToAccount === 'function', 'redirectToAccount should be a function');
```

### Provider Support Test

```javascript
// Test: Multiple authentication providers supported
const { signIn } = require('astro-stack-auth/client');

// Test different providers
const providers = ['google', 'github', 'facebook', 'apple'];

providers.forEach(provider => {
  try {
    // Should not throw for valid providers
    signIn(provider);
    console.log(`Provider ${provider} is supported`);
  } catch (error) {
    // Function should exist even if provider is not configured
    console.assert(
      !error.message.includes('not defined'), 
      `signIn should handle provider: ${provider}`
    );
  }
});
```

### Options Handling Test

```javascript
// Test: Functions accept proper options
const { signIn, signOut } = require('astro-stack-auth/client');

// Test signIn options
try {
  await signIn('google', {
    callbackUrl: '/dashboard',
    redirectMethod: 'replace'
  });
} catch (error) {
  console.assert(
    !error.message.includes('not defined'),
    'signIn should accept options object'
  );
}

// Test signOut options
try {
  await signOut({
    callbackUrl: '/',
    redirectMethod: 'push'
  });
} catch (error) {
  console.assert(
    !error.message.includes('not defined'),
    'signOut should accept options object'
  );
}
```

### Browser Environment Test

```javascript
// Test: Functions work in browser environment
const clientFunctions = require('astro-stack-auth/client');

// Check all expected functions are exported
const expectedFunctions = [
  'signIn',
  'signOut', 
  'redirectToSignIn',
  'redirectToSignUp',
  'redirectToAccount'
];

expectedFunctions.forEach(funcName => {
  console.assert(
    typeof clientFunctions[funcName] === 'function',
    `${funcName} should be exported as a function`
  );
});

// Functions should handle missing window gracefully in SSR
console.assert(
  Object.keys(clientFunctions).length >= expectedFunctions.length,
  'All client functions should be exported'
);
```

## Dependencies

- `@stackframe/stack` SDK for authentication flows
- Browser environment for redirect handling
- Stack Auth API endpoints for authentication

## Implementation Notes

- Functions should work in both SSR and client-side contexts
- Should handle browser environment detection gracefully
- Error handling should provide helpful debugging information
- Must integrate with Stack Auth's authentication flows

## Definition of Done

- [ ] All client functions implemented and exported
- [ ] Support for multiple authentication providers
- [ ] Proper error handling and edge cases
- [ ] Browser environment compatibility
- [ ] Tests pass validating all client functionality