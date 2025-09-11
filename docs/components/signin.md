# SignIn Component

> 📝 **Static Type Specification**: Active  
> ⚠️ **Dynamic Extraction**: Failed - Extracted types failed validation  
> 🕒 **Last Attempted**: 9/11/2025, 7:02:15 AM

*Using static type specifications. Install @stackframe/stack-ui for automatic synchronization.*

> ✅ **Interface Change Detection**: No changes detected  
> 📊 **Version**: unknown → unknown  
> 🕒 **Last Checked**: 9/11/2025, 7:02:15 AM

*No interface changes detected since last update.*

## Overview

The SignIn component is a Stack Auth UI component that provides user authentication with support for multiple providers.



## Props

| Prop | Type | Required | Description | Source |
|------|------|----------|-------------|--------|
| onSuccess | `function | undefined` | ❌ | Callback function called on successful authentication with the authenticated user | 📝 Static |
| onError | `function | undefined` | ❌ | Callback function called when authentication fails with error details | 📝 Static |
| redirectTo | `string | undefined` | ❌ | URL to redirect to after successful authentication | 📝 Static |
| providers | `array | undefined` | ❌ | Array of authentication providers to display (e.g., ["google", "github"]) | 📝 Static |
| showTerms | `boolean | undefined` | ❌ | Whether to show terms of service and privacy policy links | 📝 Static |
| termsUrl | `string | undefined` | ❌ | URL to terms of service page | 📝 Static |
| privacyUrl | `string | undefined` | ❌ | URL to privacy policy page | 📝 Static |
| style | `object | undefined` | ❌ | Custom CSS styles for the component | 📝 Static |
| className | `string | undefined` | ❌ | CSS class name for custom styling | 📝 Static |
| fullPage | `boolean | undefined` | ❌ | Whether to render as a full-page component or inline | 📝 Static |

## Usage Examples

### Basic Usage

```astro
---
// src/pages/auth/signin.astro
---
<html>
<body>
  <SignIn client:load />
</body>
</html>
```

### With Props

```astro
---
// src/pages/auth/signin.astro
---
<html>
<body>
  <SignIn 
    client:load
    redirectTo="/dashboard"
    providers={["google", "github"]}
    showTerms={true}
    termsUrl="/terms"
    privacyUrl="/privacy"
  />
</body>
</html>
```

### With Event Handlers

```astro
---
// src/pages/auth/signin.astro
---
<html>
<body>
  <SignIn 
    client:load
    onSuccess={(user) => {
      console.log('User signed in:', user.displayName);
      window.location.href = '/dashboard';
    }}
    onError={(error) => {
      console.error('Sign in failed:', error.message);
    }}
  />
</body>
</html>
```



## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | className, style, onSuccess, onError, redirectUri | None | 📝 Static |
| 2.9.x | className, style, onSuccess, onError, redirectUri, theme | None | 📝 Static |
| 3.0.x | className, style, onSuccess, onError, redirectUri, theme, customization | onError | 📝 Static |


## TypeScript Integration

The SignIn component is fully typed and provides comprehensive TypeScript support:

```typescript
import type { SignInProps } from 'astro-stack-auth/components';

// Component props are automatically validated at runtime
const props: SignInProps = {
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
  <SignIn client:load />
)}
```

### Error Handling

```astro
---
// src/pages/auth.astro
---
<SignIn
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

- `onError`: This prop is deprecated in newer versions. Check version compatibility matrix for details.


## Recommendations

⚠️ **Dynamic type extraction failed, using static fallback**  
Ensure @stackframe/stack-ui is properly installed and accessible



---

*This documentation is generated from static type specifications. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
