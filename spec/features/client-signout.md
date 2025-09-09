# Feature: Client-Side Sign Out

**GitHub Issue:** #5  
**Title:** User can sign out using client-side signOut() function

## Description

As a developer, I want to provide a client-side signOut function so that users can sign out from anywhere in my application with a simple function call.

## Acceptance Criteria

- [ ] `signOut()` function available on client-side
- [ ] Clears Stack Auth session
- [ ] Optionally redirects to specified URL
- [ ] Handles sign-out errors gracefully
- [ ] Works with Astro's client-side hydration

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Basic Sign Out Test

```javascript
// Test: signOut function clears session
// Client-side test
import { signOut } from 'astro-stack-auth/client';

// Mock authenticated state
const originalUser = await getCurrentUser();
console.assert(originalUser !== null, 'Should start authenticated');

// Call signOut
await signOut();

// Expected: User session cleared
const currentUser = await getCurrentUser();  
console.assert(currentUser === null, 'User should be signed out');
```

### Redirect After Sign Out Test

```javascript
// Test: signOut with redirect URL
import { signOut } from 'astro-stack-auth/client';

// Mock location.href
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true
});

await signOut({ redirectTo: '/goodbye' });

// Expected: Redirects to specified URL
console.assert(window.location.href.includes('/goodbye'), 
  'Should redirect to specified URL');
```

### Component Integration Test

```astro
---
// Test: signOut works in Astro components
// components/UserMenu.astro
import { signOut } from 'astro-stack-auth/client';
---

<script>
  async function handleSignOut() {
    try {
      await signOut({ redirectTo: '/' });
      // Expected: User signed out and redirected
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }
</script>

<button onclick="handleSignOut()">Sign Out</button>
```

### Error Handling Test

```javascript
// Test: signOut handles network errors
import { test, expect, vi } from 'vitest';
import { signOut } from 'astro-stack-auth/client';

test('signOut handles network errors gracefully', async () => {
  // Mock network failure
  global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

  // Expected: Error should be thrown and handled
  await expect(signOut()).rejects.toThrow('Network error');
  
  expect(global.fetch).toHaveBeenCalled();
});
```

### Options Configuration Test

```javascript
// Test: signOut accepts configuration options
import { signOut } from 'astro-stack-auth/client';

// Test with various options
await signOut({
  redirectTo: '/home',
  clearLocalStorage: true,
  onSuccess: () => console.log('Signed out successfully'),
  onError: (error) => console.error('Sign out error:', error)
});

// Expected: All options respected
```

### Astro Islands Test

```astro
---
// Test: signOut works with Astro islands
// components/SignOutButton.jsx (React component)
import { signOut } from 'astro-stack-auth/client';

export default function SignOutButton() {
  const handleSignOut = async () => {
    await signOut();
    // Expected: Works in React component island
  };
  
  return <button onClick={handleSignOut}>Sign Out</button>;
}
---

<!-- In .astro file -->
<SignOutButton client:load />
```

### Session Cleanup Test

```javascript
// Test: signOut clears all session data
import { signOut } from 'astro-stack-auth/client';

// Mock session storage
const mockStorage = {
  clear: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

await signOut({ clearLocalStorage: true });

// Expected: Local storage cleared
console.assert(mockStorage.clear.called || mockStorage.removeItem.called,
  'Should clear local session data');
```

## Dependencies

- Stack Auth client SDK for session management
- Browser fetch API for sign-out requests
- Astro client-side runtime compatibility
- Session storage management

## Implementation Notes

- Should use Stack Auth's existing sign-out mechanism
- Must handle browser environment detection
- Should clear all client-side session data
- Error handling for network failures
- Support for callback functions
- Integration with Astro's hydration system

## Definition of Done

- [ ] `signOut()` function exported from client module
- [ ] Clears Stack Auth session completely
- [ ] Supports redirect options
- [ ] Works in Astro islands and components  
- [ ] Proper error handling and reporting
- [ ] Tests validate all sign-out scenarios