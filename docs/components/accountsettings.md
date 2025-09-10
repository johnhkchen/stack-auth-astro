# AccountSettings Component

> Auto-generated documentation from validation schema - Last updated: 2025-09-10

## Overview

The AccountSettings component is a Stack Auth UI component that provides comprehensive account management interface.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| onUpdateSuccess | `function | undefined` | ❌ | Callback function called when profile update succeeds |
| onUpdateError | `function | undefined` | ❌ | Callback function called when profile update fails |
| onDeleteAccount | `function | undefined` | ❌ | Callback function called when user deletes their account |
| showProfile | `boolean | undefined` | ❌ | Whether to show the profile settings section |
| showSecurity | `boolean | undefined` | ❌ | Whether to show the security settings section |
| showPreferences | `boolean | undefined` | ❌ | Whether to show the preferences section |
| style | `object | undefined` | ❌ | Custom CSS styles for the component |
| className | `string | undefined` | ❌ | CSS class name for custom styling |
| fullPage | `boolean | undefined` | ❌ | Whether to render as a full-page component or inline |

## Usage Examples

### Basic Usage

```astro
---
// src/pages/account.astro
---
<html>
<body>
  <AccountSettings client:load />
</body>
</html>
```

### With Props

```astro
---
// src/pages/account.astro
---
<html>
<body>
  <AccountSettings 
    client:load
    showProfile={true}
    showSecurity={true}
    onUpdateSuccess={(user) => {
      console.log('Profile updated for:', user.displayName);
    }}
  />
</body>
</html>
```



## Version Compatibility

| Version | Supported Props | Deprecated Props |
|---------|-----------------|------------------|
| 2.8.x | className, style, sections | None |


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

---

*This documentation is automatically generated from the runtime validation schema. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
