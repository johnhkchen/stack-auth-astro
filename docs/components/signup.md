# SignUp Component

> Auto-generated documentation from validation schema - Last updated: 2025-09-10

## Overview

The SignUp component is a Stack Auth UI component that provides user registration with customizable provider options.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| onSuccess | `function | undefined` | ❌ | Callback function called on successful registration with the new user |
| onError | `function | undefined` | ❌ | Callback function called when registration fails with error details |
| redirectTo | `string | undefined` | ❌ | URL to redirect to after successful registration |
| providers | `array | undefined` | ❌ | Array of authentication providers to display (e.g., ["google", "github"]) |
| showTerms | `boolean | undefined` | ❌ | Whether to show terms of service and privacy policy links |
| termsUrl | `string | undefined` | ❌ | URL to terms of service page |
| privacyUrl | `string | undefined` | ❌ | URL to privacy policy page |
| style | `object | undefined` | ❌ | Custom CSS styles for the component |
| className | `string | undefined` | ❌ | CSS class name for custom styling |
| fullPage | `boolean | undefined` | ❌ | Whether to render as a full-page component or inline |

## Usage Examples

### Basic Usage

```astro
---
// src/pages/auth/signup.astro
---
<html>
<body>
  <SignUp client:load />
</body>
</html>
```

### With Props

```astro
---
// src/pages/auth/signup.astro
---
<html>
<body>
  <SignUp 
    client:load
    redirectTo="/welcome"
    providers={["google", "github"]}
    showTerms={true}
    termsUrl="/terms"
    privacyUrl="/privacy"
  />
</body>
</html>
```



## Version Compatibility

| Version | Supported Props | Deprecated Props |
|---------|-----------------|------------------|
| 2.8.x | className, style, onSuccess, onError, redirectUri | None |


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

---

*This documentation is automatically generated from the runtime validation schema. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
