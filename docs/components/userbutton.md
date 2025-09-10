# UserButton Component

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

The UserButton component is a Stack Auth UI component that provides a user profile button with avatar and dropdown menu.


## Recent Changes

> 📅 **Version 2.8.36 → 2.8.36**

### ✨ New Features

- **showUserInfo**: New prop 'showUserInfo' added
  - **Usage**: Optional prop 'showUserInfo' of type 'boolean' is now available

- **colorModeToggle**: New prop 'colorModeToggle' added
  - **Usage**: Optional prop 'colorModeToggle' of type 'function' is now available

- **extraItems**: New prop 'extraItems' added
  - **Usage**: Optional prop 'extraItems' of type 'array' is now available

- **mockUser**: New prop 'mockUser' added
  - **Usage**: Optional prop 'mockUser' of type '{ displayname?: string; primaryemail?: string; profileimageurl?: string; }' is now available



## Props

| Prop | Type | Required | Description | Source |
|------|------|----------|-------------|--------|
| showDisplayName | `boolean | undefined` | ❌ | Whether to display the user's name next to the avatar | 📝 Static |
| showAvatar | `boolean | undefined` | ❌ | Whether to display the user's avatar image | 📝 Static |
| colorModeToggle | `function | undefined` | ❌ | colorModeToggle property | 🔄 Dynamic |
| showSignOutButton | `boolean | undefined` | ❌ | Whether to display sign out button in dropdown menu | 📝 Static |
| onSignOut | `function | undefined` | ❌ | Callback function called when user signs out | 📝 Static |
| style | `object | undefined` | ❌ | Custom CSS styles for the component | 📝 Static |
| className | `string | undefined` | ❌ | CSS class name for custom styling | 📝 Static |
| showUserInfo | `boolean | undefined` | ❌ | showUserInfo property | 🔄 Dynamic |
| extraItems | `array | undefined` | ❌ | extraItems property | 🔄 Dynamic |
| mockUser | `{ displayname?: string; primaryemail?: string; profileimageurl?: string; } | undefined` | ❌ | mockUser property | 🔄 Dynamic |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | className, style, showDisplayName, showEmail | None | 📝 Static |

> 📊 **Current SDK Version**: 2.8.36
> 🕒 **Last Updated**: 9/10/2025, 1:51:06 PM


## TypeScript Integration

The UserButton component is fully typed and provides comprehensive TypeScript support:

```typescript
import type { UserButtonProps } from 'astro-stack-auth/components';

// Component props are automatically validated at runtime
const props: UserButtonProps = {
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
  <UserButton client:load />
)}
```

### Error Handling

```astro
---
// src/pages/auth.astro
---
<UserButton
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
