# AccountSettings Component

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

The AccountSettings component is a Stack Auth UI component that provides comprehensive account management interface.


## Recent Changes

> 📅 **Version 2.8.36 → 2.8.36**

### ✨ New Features

- **fullPage**: New prop 'fullPage' added
  - **Usage**: Optional prop 'fullPage' of type 'boolean' is now available

- **extraItems**: New prop 'extraItems' added
  - **Usage**: Optional prop 'extraItems' of type 'array' is now available

- **mockUser**: New prop 'mockUser' added
  - **Usage**: Optional prop 'mockUser' of type '{ displayname?: string; profileimageurl?: string; }' is now available

- **mockApiKeys**: New prop 'mockApiKeys' added
  - **Usage**: Optional prop 'mockApiKeys' of type 'array' is now available

- **mockProject**: New prop 'mockProject' added
  - **Usage**: Optional prop 'mockProject' of type '{ config: { allowuserapikeys: boolean; clientteamcreationenabled: boolean; }; }' is now available

- **mockSessions**: New prop 'mockSessions' added
  - **Usage**: Optional prop 'mockSessions' of type 'array' is now available



## Props

| Prop | Type | Required | Description | Source |
|------|------|----------|-------------|--------|
| onUpdateSuccess | `function | undefined` | ❌ | Callback function called when profile update succeeds | 📝 Static |
| onUpdateError | `function | undefined` | ❌ | Callback function called when profile update fails | 📝 Static |
| onDeleteAccount | `function | undefined` | ❌ | Callback function called when user deletes their account | 📝 Static |
| showProfile | `boolean | undefined` | ❌ | Whether to show the profile settings section | 📝 Static |
| showSecurity | `boolean | undefined` | ❌ | Whether to show the security settings section | 📝 Static |
| showPreferences | `boolean | undefined` | ❌ | Whether to show the preferences section | 📝 Static |
| style | `object | undefined` | ❌ | Custom CSS styles for the component | 📝 Static |
| className | `string | undefined` | ❌ | CSS class name for custom styling | 📝 Static |
| fullPage | `boolean | undefined` | ❌ | fullPage property | 🔄 Dynamic |
| extraItems | `array | undefined` | ❌ | extraItems property | 🔄 Dynamic |
| mockUser | `{ displayname?: string; profileimageurl?: string; } | undefined` | ❌ | mockUser property | 🔄 Dynamic |
| mockApiKeys | `array | undefined` | ❌ | mockApiKeys property | 🔄 Dynamic |
| mockProject | `{ config: { allowuserapikeys: boolean; clientteamcreationenabled: boolean; }; } | undefined` | ❌ | mockProject property | 🔄 Dynamic |
| mockSessions | `array | undefined` | ❌ | mockSessions property | 🔄 Dynamic |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | className, style, sections | None | 📝 Static |

> 📊 **Current SDK Version**: 2.8.36
> 🕒 **Last Updated**: 9/10/2025, 1:51:06 PM


## TypeScript Integration

The AccountSettings component is fully typed and provides comprehensive TypeScript support:

```typescript
import type { AccountSettingsProps } from 'astro-stack-auth/components';

// Component props are automatically validated at runtime
const props: AccountSettingsProps = {
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
  <AccountSettings client:load />
)}
```

### Error Handling

```astro
---
// src/pages/auth.astro
---
<AccountSettings
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
