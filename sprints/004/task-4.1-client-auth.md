# Task 4.1: Client-side Authentication Functions

**Sprint**: 004  
**Estimated Time**: 3-4 hours  
**Blockers**: Sprint 003 Complete

## Objective

Implement client-side authentication functions (`signIn`, `signOut`, redirect functions) that work with Astro's client-side architecture.

## Acceptance Criteria

- [ ] `signIn()` function with provider and redirect support
- [ ] `signOut()` function with redirect and cleanup options
- [ ] Redirect helper functions for Stack Auth pages
- [ ] Error handling for network failures
- [ ] Works with Astro's client-side hydration

## Test Specification

### Sign In Function Test

```javascript
// Test: signIn function works correctly
const { signIn } = require('astro-stack-auth/client');
const { vi } = require('vitest');

global.fetch = vi.fn(() => Promise.resolve(new Response()));
global.window = { location: { href: '' } };

await signIn('google', { redirectTo: '/dashboard' });

console.assert(global.fetch.called, 'Should make API request');
```

### Sign Out Function Test

```javascript
// Test: signOut function works correctly
const { signOut } = require('astro-stack-auth/client');

global.localStorage = {
  removeItem: vi.fn(),
  clear: vi.fn()
};

await signOut({ 
  redirectTo: '/goodbye',
  clearLocalStorage: true 
});

console.assert(global.localStorage.clear.called, 'Should clear local storage');
```

## Required Files

### src/client.ts
```typescript
export interface SignInOptions {
  redirectTo?: string;
  provider?: string;
}

export interface SignOutOptions {
  redirectTo?: string;
  clearLocalStorage?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export async function signIn(provider?: string, options: SignInOptions = {}): Promise<void> {
  try {
    const body = JSON.stringify({
      provider,
      redirectTo: options.redirectTo
    });

    const response = await fetch('/handler/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Sign in failed: ${response.statusText}`);
    }

    // Redirect after successful sign in
    if (options.redirectTo) {
      window.location.href = options.redirectTo;
    } else {
      window.location.reload();
    }
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function signOut(options: SignOutOptions = {}): Promise<void> {
  try {
    const response = await fetch('/handler/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Sign out failed: ${response.statusText}`);
    }

    // Clear local storage if requested
    if (options.clearLocalStorage) {
      localStorage.clear();
      sessionStorage.clear();
    }

    // Call success callback
    if (options.onSuccess) {
      options.onSuccess();
    }

    // Redirect after successful sign out
    if (options.redirectTo) {
      window.location.href = options.redirectTo;
    } else {
      window.location.reload();
    }
  } catch (error) {
    console.error('Sign out error:', error);
    
    if (options.onError) {
      options.onError(error as Error);
    }
    
    throw error;
  }
}

export function redirectToSignIn(callbackUrl?: string): void {
  const url = callbackUrl 
    ? `/handler/signin?redirect=${encodeURIComponent(callbackUrl)}`
    : '/handler/signin';
  window.location.href = url;
}

export function redirectToSignUp(callbackUrl?: string): void {
  const url = callbackUrl
    ? `/handler/signup?redirect=${encodeURIComponent(callbackUrl)}`
    : '/handler/signup';
  window.location.href = url;
}

export function redirectToAccount(callbackUrl?: string): void {
  const url = callbackUrl
    ? `/handler/account?redirect=${encodeURIComponent(callbackUrl)}`
    : '/handler/account';
  window.location.href = url;
}
```

## Definition of Done

- [ ] All client functions implemented
- [ ] Error handling for network failures
- [ ] Redirect functionality working
- [ ] Local storage cleanup options
- [ ] Tests pass for all functions