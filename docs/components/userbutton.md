# UserButton Component

> 🔄 **Dynamic Type Extraction**: ✅ Active  
> 📊 **SDK Version**: 2.8.36  
> 🕒 **Last Updated**: 9/12/2025, 12:04:01 AM  
> 📈 **Components**: 5 components with live type data

*This documentation is automatically synchronized with your installed Stack Auth SDK version.*

> ✅ **Interface Change Detection**: No changes detected  
> 📊 **Version**: 2.8.36 → 2.8.36  
> 🕒 **Last Checked**: 9/12/2025, 12:04:01 AM

*No interface changes detected since last update.*

## Overview

The UserButton component is a Stack Auth UI component that provides a user profile button with avatar and dropdown menu.



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
> 🕒 **Last Updated**: 9/12/2025, 12:04:01 AM


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
