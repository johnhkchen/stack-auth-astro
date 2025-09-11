# AccountSettings Component

> 📝 **Static Type Specification**: Active  
> ⚠️ **Dynamic Extraction**: Failed - Extracted types failed validation  
> 🕒 **Last Attempted**: 9/11/2025, 7:22:17 AM

*Using static type specifications. Install @stackframe/stack-ui for automatic synchronization.*

> ✅ **Interface Change Detection**: No changes detected  
> 📊 **Version**: unknown → unknown  
> 🕒 **Last Checked**: 9/11/2025, 7:22:17 AM

*No interface changes detected since last update.*

## Overview

The AccountSettings component is a Stack Auth UI component that provides comprehensive account management interface.



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
| fullPage | `boolean | undefined` | ❌ | Whether to render as a full-page component or inline | 📝 Static |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | className, style, sections | None | 📝 Static |


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

⚠️ **Dynamic type extraction failed, using static fallback**  
Ensure @stackframe/stack-ui is properly installed and accessible



---

*This documentation is generated from static type specifications. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
