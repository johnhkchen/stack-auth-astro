# UserButton Component

> 📝 **Static Type Specification**: Active  
> ⚠️ **Dynamic Extraction**: Failed - Extracted types failed validation  
> 🕒 **Last Attempted**: 9/11/2025, 7:02:15 AM

*Using static type specifications. Install @stackframe/stack-ui for automatic synchronization.*

> ✅ **Interface Change Detection**: No changes detected  
> 📊 **Version**: unknown → unknown  
> 🕒 **Last Checked**: 9/11/2025, 7:02:15 AM

*No interface changes detected since last update.*

## Overview

The UserButton component is a Stack Auth UI component that provides a user profile button with avatar and dropdown menu.



## Props

| Prop | Type | Required | Description | Source |
|------|------|----------|-------------|--------|
| showDisplayName | `boolean | undefined` | ❌ | Whether to display the user's name next to the avatar | 📝 Static |
| showAvatar | `boolean | undefined` | ❌ | Whether to display the user's avatar image | 📝 Static |
| colorModeToggle | `boolean | undefined` | ❌ | Whether to show dark/light mode toggle in dropdown | 📝 Static |
| showSignOutButton | `boolean | undefined` | ❌ | Whether to display sign out button in dropdown menu | 📝 Static |
| onSignOut | `function | undefined` | ❌ | Callback function called when user signs out | 📝 Static |
| style | `object | undefined` | ❌ | Custom CSS styles for the component | 📝 Static |
| className | `string | undefined` | ❌ | CSS class name for custom styling | 📝 Static |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | className, style, showDisplayName, showEmail | None | 📝 Static |


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

⚠️ **Dynamic type extraction failed, using static fallback**  
Ensure @stackframe/stack-ui is properly installed and accessible



---

*This documentation is generated from static type specifications. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
