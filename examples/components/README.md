# Example React Components

This directory contains example React components demonstrating different patterns for using Stack Auth with Astro's hydration directives.

## Available Components

### 🔐 Authentication Components

#### SignInButton.tsx
Custom sign-in button with configurable providers and redirect URLs.
```tsx
import { SignInButton } from './SignInButton';

// Basic usage
<SignInButton client:load />

// With provider and custom styling
<SignInButton 
  provider="google" 
  redirectTo="/dashboard"
  className="custom-button-style"
  client:visible 
>
  Sign in with Google
</SignInButton>
```

#### SignOutButton.tsx
Custom sign-out button with configurable redirect URLs.
```tsx
import { SignOutButton } from './SignOutButton';

// Basic usage
<SignOutButton client:load />

// With custom redirect
<SignOutButton 
  redirectTo="/goodbye"
  className="custom-style"
  client:visible
>
  Sign Out
</SignOutButton>
```

### 📊 Status Components

#### AuthStatus.tsx
Displays current authentication status with loading states.
```tsx
import { AuthStatus } from './AuthStatus';

// Simple status indicator
<AuthStatus client:visible />

// With detailed user information
<AuthStatus 
  showDetails={true}
  className="custom-status-style"
  client:idle 
/>
```

#### ConditionalContent.tsx
Conditionally renders content based on authentication state.
```tsx
import { ConditionalContent } from './ConditionalContent';

// Protected content
<ConditionalContent client:idle>
  <SecretContent />
</ConditionalContent>

// Custom fallback
<ConditionalContent
  fallback={<SignInPrompt />}
  client:visible
>
  <ProtectedFeature />
</ConditionalContent>
```

## Hydration Strategy Guide

### client:load
**Use for critical authentication components that must work immediately**
- Sign-in/sign-out buttons on authentication pages
- Components that handle user interactions immediately

```tsx
<SignInButton client:load />
<SignOutButton client:load />
```

### client:visible
**Use for components that should load when they become visible**
- Status indicators in navigation
- Authentication-gated content above the fold

```tsx
<AuthStatus client:visible />
<ConditionalContent client:visible>
  <WelcomeMessage />
</ConditionalContent>
```

### client:idle
**Use for non-critical components that can load when the browser is idle**
- Secondary authentication indicators
- Optional enhancement components

```tsx
<ConditionalContent client:idle>
  <OptionalContent />
</ConditionalContent>
```

### client:media
**Use for responsive authentication components**
```tsx
<AuthStatus client:media="(min-width: 768px)" />
```

## Best Practices

### 1. Performance Optimization
- Use `client:visible` for components that might not be immediately seen
- Use `client:idle` for enhancement components
- Reserve `client:load` for critical authentication flows

### 2. Error Handling
All example components include proper error handling:
- Network error recovery
- Loading states
- Graceful fallbacks

### 3. Accessibility
Components follow accessibility best practices:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly loading states

### 4. Type Safety
All components are fully typed with TypeScript:
- Props interfaces
- User type definitions
- Event handler types

## Usage Examples

### Complete Authentication Flow
```tsx
---
// In an Astro component
import { SignInButton, SignOutButton, AuthStatus } from '../components';
---

<div>
  <AuthStatus client:visible showDetails={true} />
  
  <ConditionalContent client:visible requireAuth={false}>
    <SignInButton client:load />
  </ConditionalContent>
  
  <ConditionalContent client:visible requireAuth={true}>
    <SignOutButton client:load />
  </ConditionalContent>
</div>
```

### Dashboard Navigation
```tsx
---
import { AuthStatus, ConditionalContent } from '../components';
---

<nav>
  <AuthStatus client:visible />
  
  <ConditionalContent 
    client:idle
    fallback={<a href="/signin">Sign In</a>}
  >
    <a href="/dashboard">Dashboard</a>
    <a href="/profile">Profile</a>
  </ConditionalContent>
</nav>
```

## Customization

### Styling
All components accept a `className` prop for custom styling:
```tsx
<AuthStatus 
  className="bg-white shadow-lg rounded-lg p-4" 
  client:visible 
/>
```

### Extending Components
Components can be extended for project-specific needs:
```tsx
// CustomSignInButton.tsx
import { SignInButton } from './SignInButton';

export const CustomSignInButton = (props) => (
  <SignInButton 
    {...props}
    className="my-brand-button"
    provider="github"
  />
);
```

## Integration with Astro

These components are designed to work seamlessly with Astro's:
- 🏝️ Island architecture
- ⚡ Selective hydration
- 🎯 Performance optimization
- 🔧 Build-time rendering

Each component can be used independently or combined to create complex authentication flows while maintaining optimal performance through strategic hydration.