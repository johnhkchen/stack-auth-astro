# UserButton Component

> Auto-generated documentation from validation schema - Last updated: 2025-09-10

## Overview

The UserButton component is a Stack Auth UI component that provides a user profile button with avatar and dropdown menu.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| showDisplayName | `boolean | undefined` | ❌ | Whether to display the user's name next to the avatar |
| showAvatar | `boolean | undefined` | ❌ | Whether to display the user's avatar image |
| colorModeToggle | `boolean | undefined` | ❌ | Whether to show dark/light mode toggle in dropdown |
| showSignOutButton | `boolean | undefined` | ❌ | Whether to display sign out button in dropdown menu |
| onSignOut | `function | undefined` | ❌ | Callback function called when user signs out |
| style | `object | undefined` | ❌ | Custom CSS styles for the component |
| className | `string | undefined` | ❌ | CSS class name for custom styling |

## Usage Examples

### Basic Usage

```astro
---
// src/components/Header.astro
---
<header>
  <nav>
    <UserButton client:load />
  </nav>
</header>
```

### With Props

```astro
---
// src/components/Header.astro
---
<header>
  <nav>
    <UserButton 
      client:load
      showDisplayName={true}
      showAvatar={true}
      colorModeToggle={true}
      onSignOut={() => {
        console.log('User signed out');
        window.location.href = '/';
      }}
    />
  </nav>
</header>
```



## Version Compatibility

| Version | Supported Props | Deprecated Props |
|---------|-----------------|------------------|
| 2.8.x | className, style, showDisplayName, showEmail | None |


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

---

*This documentation is automatically generated from the runtime validation schema. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
