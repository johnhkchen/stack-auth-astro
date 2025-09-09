# Feature: UserButton Component

**GitHub Issue:** #7  
**Title:** User can display user profile with UserButton component

## Description

As a developer, I want to use Stack Auth's UserButton component in my Astro project so that authenticated users can access their profile and account settings through a pre-built UI component.

## Acceptance Criteria

- [ ] UserButton component works in Astro islands
- [ ] Shows user avatar and name when authenticated
- [ ] Provides dropdown with profile/settings options
- [ ] Handles sign-out functionality
- [ ] Customizable appearance and options

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Component Import Test

```astro
---
// Test: UserButton component can be imported and used
// components/Header.astro
import { UserButton } from 'astro-stack-auth/components';
---

<header>
  <nav>
    <a href="/">Home</a>
    <!-- Expected: Component renders user profile button -->
    <UserButton client:load />
  </nav>
</header>
```

### Authenticated Display Test

```javascript
// Test: UserButton shows user info when authenticated
// Mock authenticated state
const mockUser = {
  id: 'user123',
  displayName: 'John Doe',
  primaryEmail: 'john@example.com',
  profileImageUrl: 'https://example.com/avatar.jpg'
};

// Expected: Component displays user avatar and name
import { render, screen } from '@testing-library/react';
import { UserButton } from 'astro-stack-auth/components';

render(<UserButton />);

// Should show user avatar
console.assert(screen.getByAltText(mockUser.displayName));
// Should show user name in dropdown
console.assert(screen.getByText(mockUser.displayName));
```

### Unauthenticated State Test

```javascript
// Test: UserButton handles unauthenticated state
// When no user is signed in
import { render, screen } from '@testing-library/react';
import { UserButton } from 'astro-stack-auth/components';

render(<UserButton />);

// Expected: Component either hidden or shows sign-in option
const signInButton = screen.queryByText('Sign In');
console.assert(signInButton !== null, 'Should show sign-in option when unauthenticated');
```

### Dropdown Functionality Test

```astro
---
// Test: UserButton dropdown with profile options
import { UserButton } from 'astro-stack-auth/components';
---

<UserButton 
  client:load
  showUserInfo={true}
  showAccountSettings={true}
  onSignOut={() => console.log('Signed out')}
/>

<!-- Expected: Dropdown includes profile and settings options -->
```

### Customization Test

```astro
---
// Test: UserButton customization options
import { UserButton } from 'astro-stack-auth/components';
---

<UserButton 
  client:load
  appearance={{
    elements: {
      avatarBox: 'w-8 h-8 rounded-full',
      userButtonPopoverCard: 'shadow-lg border rounded-md'
    }
  }}
  userProfileUrl="/profile"
  accountSettingsUrl="/settings"
/>

<!-- Expected: Custom styling and URLs applied -->
```

### Sign Out Integration Test

```javascript
// Test: UserButton sign-out functionality
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserButton } from 'astro-stack-auth/components';

const onSignOut = jest.fn();
render(<UserButton onSignOut={onSignOut} />);

// Click user button to open dropdown
const userButton = screen.getByRole('button');
fireEvent.click(userButton);

// Click sign out option
const signOutButton = screen.getByText('Sign Out');
fireEvent.click(signOutButton);

// Expected: onSignOut callback called
await waitFor(() => {
  console.assert(onSignOut.called, 'Should call onSignOut handler');
});
```

### Hydration Test

```astro
---
// Test: UserButton works with different hydration strategies
import { UserButton } from 'astro-stack-auth/components';
---

<!-- Test different client directives -->
<UserButton client:load />
<UserButton client:idle />
<UserButton client:visible />

<!-- Expected: All hydration modes work correctly -->
```

### Profile Link Test

```astro
---
// Test: UserButton profile navigation
import { UserButton } from 'astro-stack-auth/components';
---

<UserButton 
  client:load
  userProfileMode="navigation"
  userProfileUrl="/profile"
/>

<!-- Expected: Clicking profile option navigates to /profile -->
```

## Dependencies

- Re-exports Stack Auth's UserButton from `@stackframe/stack-ui`
- Requires React integration in Astro
- Stack Auth client configuration for user data
- Auth state from middleware

## Implementation Notes

- Should wrap/re-export Stack Auth's existing UserButton component
- Must work with Astro's island architecture
- Component should inherit Stack Auth's styling and behavior
- Need to handle Astro-specific routing for profile/settings links
- Should integrate with client-side auth state
- Handle both modal and navigation modes for user profile

## Definition of Done

- [ ] UserButton component exported from package
- [ ] Works with all Astro client hydration directives
- [ ] Shows appropriate UI for auth/unauth states
- [ ] Dropdown includes profile and sign-out options
- [ ] Customization options work correctly
- [ ] Tests validate component functionality