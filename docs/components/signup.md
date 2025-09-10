# SignUp Component

> 🔄 **Dynamic Type Extraction**: ✅ Active  
> 📊 **SDK Version**: 2.8.36  
> 🕒 **Last Updated**: 9/10/2025, 1:51:06 PM  
> 📈 **Components**: 5 components with live type data

*This documentation is automatically synchronized with your installed Stack Auth SDK version.*

> ✅ **Interface Change Detection**: Non-breaking changes detected  
> 📊 **Version**: 2.8.36 → 2.8.36  
> 🔢 **Changes**: 0 breaking, 0 non-breaking, 24 additions  
> 🕒 **Detected**: 9/10/2025, 1:51:06 PM

*Safe to upgrade - no breaking changes detected.*

## Overview

The SignUp component is a Stack Auth UI component that provides user registration with customizable provider options.


## Recent Changes

> 📅 **Version 2.8.36 → 2.8.36**

### ✨ New Features

- **fullPage**: New prop 'fullPage' added
  - **Usage**: Optional prop 'fullPage' of type 'boolean' is now available

- **automaticRedirect**: New prop 'automaticRedirect' added
  - **Usage**: Optional prop 'automaticRedirect' of type 'boolean' is now available

- **noPasswordRepeat**: New prop 'noPasswordRepeat' added
  - **Usage**: Optional prop 'noPasswordRepeat' of type 'boolean' is now available

- **extraInfo**: New prop 'extraInfo' added
  - **Usage**: Optional prop 'extraInfo' of type 'react-node' is now available

- **firstTab**: New prop 'firstTab' added
  - **Usage**: Optional prop 'firstTab' of type '"magic-link" | "password"' is now available



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
| fullPage | `boolean | undefined` | ❌ | fullPage property | 🔄 Dynamic |
| automaticRedirect | `boolean | undefined` | ❌ | automaticRedirect property | 🔄 Dynamic |
| noPasswordRepeat | `boolean | undefined` | ❌ | noPasswordRepeat property | 🔄 Dynamic |
| extraInfo | `ReactNode | undefined` | ❌ | extraInfo property | 🔄 Dynamic |
| firstTab | `"magic-link" | "password" | undefined` | ❌ | firstTab property | 🔄 Dynamic |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | className, style, onSuccess, onError, redirectUri | None | 📝 Static |

> 📊 **Current SDK Version**: 2.8.36
> 🕒 **Last Updated**: 9/10/2025, 1:51:06 PM


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

✅ **Successfully extracted types for 5 components**  
Documentation will automatically reflect the exact SDK types you have installed



---

*This documentation is automatically generated from your installed Stack Auth SDK types. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
