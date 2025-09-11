# StackProvider Component

> 🔄 **Dynamic Type Extraction**: ✅ Active  
> 📊 **SDK Version**: 2.8.36  
> 🕒 **Last Updated**: 9/11/2025, 11:58:52 AM  
> 📈 **Components**: 5 components with live type data

*This documentation is automatically synchronized with your installed Stack Auth SDK version.*

> ✅ **Interface Change Detection**: No changes detected  
> 📊 **Version**: 2.8.36 → 2.8.36  
> 🕒 **Last Checked**: 9/11/2025, 11:58:52 AM

*No interface changes detected since last update.*

## Overview

The StackProvider component is a Stack Auth UI component that provides authentication context for Stack Auth integration.



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
> 🕒 **Last Updated**: 9/11/2025, 11:58:52 AM


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
