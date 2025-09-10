# SignUp Component

> 📝 **Static Type Specification**: Active  
> ⚠️ **Dynamic Extraction**: Failed - TypeScript compilation or type extraction failed  
> 🕒 **Last Attempted**: 9/10/2025, 1:28:50 PM

*Using static type specifications. Install @stackframe/stack-ui for automatic synchronization.*



## Overview

The SignUp component is a Stack Auth UI component that provides user registration with customizable provider options.



## Props

| Prop | Type | Required | Description | Source |
|------|------|----------|-------------|--------|
| onSuccess | `function | undefined` | ❌ | Callback function called on successful registration with the new user | 📝 Static |
| onError | `function | undefined` | ❌ | Callback function called when registration fails with error details | 📝 Static |
| redirectTo | `string | undefined` | ❌ | URL to redirect to after successful registration | 📝 Static |
| providers | `array | undefined` | ❌ | Array of authentication providers to display (e.g., ["google", "github"]) | 📝 Static |
| showTerms | `boolean | undefined` | ❌ | Whether to show terms of service and privacy policy links | 📝 Static |
| termsUrl | `string | undefined` | ❌ | URL to terms of service page | 📝 Static |
| privacyUrl | `string | undefined` | ❌ | URL to privacy policy page | 📝 Static |
| style | `object | undefined` | ❌ | Custom CSS styles for the component | 📝 Static |
| className | `string | undefined` | ❌ | CSS class name for custom styling | 📝 Static |
| fullPage | `boolean | undefined` | ❌ | Whether to render as a full-page component or inline | 📝 Static |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | className, style, onSuccess, onError, redirectUri | None | 📝 Static |


## TypeScript Integration

The SignUp component is fully typed and provides comprehensive TypeScript support:

```typescript
import type { SignUpProps } from 'astro-stack-auth/components';

// Component props are automatically validated at runtime
const props: SignUpProps = {
  // TypeScript will provide autocomplete and validation
};
```

## Common Patterns

### Conditional Rendering

```astro
---
// src/components/ConditionalAuth.astro
const user = Astro.locals.user;
---

{user ? (
  <p>Welcome back, {user.displayName}!</p>
) : (
  <SignUp client:load />
)}
```

### Error Handling

```astro
---
// src/pages/auth.astro
---
<SignUp
  client:load
  onError={(error) => {
    // Handle authentication errors
    console.error('Auth error:', error);
    
    // Show user-friendly message
    alert('Authentication failed. Please try again.');
  }}
/>
```

## Migration Guide

When updating Stack Auth versions, refer to the version compatibility matrix above. 

### Deprecated Props

> No deprecated props for this component.


## Recommendations

⚠️ **Dynamic type extraction failed, using static fallback**  
Ensure @stackframe/stack-ui is properly installed and accessible



---

*This documentation is generated from static type specifications. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
