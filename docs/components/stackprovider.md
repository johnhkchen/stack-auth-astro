# StackProvider Component

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

The StackProvider component is a Stack Auth UI component that provides authentication context for Stack Auth integration.


## Recent Changes

> 📅 **Version 2.8.36 → 2.8.36**

### ✨ New Features

- **lang**: New prop 'lang' added
  - **Usage**: Optional prop 'lang' of type '"de-de" | "en-us" | "es-419" | "es-es" | "fr-ca" | "fr-fr" | "it-it" | "ja-jp" | "ko-kr" | "pt-br" | "pt-pt" | "zh-cn" | "zh-tw"' is now available

- **translationOverrides**: New prop 'translationOverrides' added
  - **Usage**: Optional prop 'translationOverrides' of type 'record<string, string>' is now available

- **children**: New prop 'children' added
  - **Usage**: Add required prop 'children' of type 'react-node' to all children components

- **app**: New prop 'app' added
  - **Usage**: Add required prop 'app' of type 'stackclientapp<true, string> | stackserverapp<true, string> | stackadminapp<true, string>' to all app components



## Props

| Prop | Type | Required | Description | Source |
|------|------|----------|-------------|--------|
| projectId | `string` | ✅ | Your Stack Auth project ID from the Stack Auth dashboard | 📝 Static |
| publishableClientKey | `string` | ✅ | Your Stack Auth publishable client key for browser use | 📝 Static |
| children | `ReactNode` | ✅ | children property | 🔄 Dynamic |
| baseUrl | `string | undefined` | ❌ | Custom base URL for Stack Auth API (defaults to Stack Auth servers) | 📝 Static |
| lang | `"de-de" | "en-us" | "es-419" | "es-es" | "fr-ca" | "fr-fr" | "it-it" | "ja-jp" | "ko-kr" | "pt-br" | "pt-pt" | "zh-cn" | "zh-tw" | undefined` | ❌ | lang property | 🔄 Dynamic |
| theme | `string | undefined` | ❌ | UI theme preference ("light", "dark", "auto") | 📝 Static |
| translationOverrides | `record<string, string> | undefined` | ❌ | A mapping of English translations to translated equivalents.

These will take priority over the translations from the language specified in the `lang` property. Note that the
keys are case-sensitive. | 🔄 Dynamic |
| app | `stackclientapp<true, string> | stackserverapp<true, string> | stackadminapp<true, string>` | ✅ | app property | 🔄 Dynamic |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | app, children | None | 📝 Static |

> 📊 **Current SDK Version**: 2.8.36
> 🕒 **Last Updated**: 9/10/2025, 1:51:06 PM


## TypeScript Integration

The StackProvider component is fully typed and provides comprehensive TypeScript support:

```typescript
import type { StackProviderProps } from 'astro-stack-auth/components';

// Component props are automatically validated at runtime
const props: StackProviderProps = {
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
  <StackProvider client:load />
)}
```

### Error Handling

```astro
---
// src/pages/auth.astro
---
<StackProvider
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
