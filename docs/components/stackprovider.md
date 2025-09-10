# StackProvider Component

> 📝 **Static Type Specification**: Active  
> ⚠️ **Dynamic Extraction**: Failed - TypeScript compilation or type extraction failed  
> 🕒 **Last Attempted**: 9/10/2025, 12:56:39 PM

*Using static type specifications. Install @stackframe/stack-ui for automatic synchronization.*

## Overview

The StackProvider component is a Stack Auth UI component that provides authentication context for Stack Auth integration.

## Props

| Prop | Type | Required | Description | Source |
|------|------|----------|-------------|--------|
| projectId | `string` | ✅ | Your Stack Auth project ID from the Stack Auth dashboard | 📝 Static |
| publishableClientKey | `string` | ✅ | Your Stack Auth publishable client key for browser use | 📝 Static |
| children | `ReactNode` | ✅ | React components that need access to Stack Auth context | 📝 Static |
| baseUrl | `string | undefined` | ❌ | Custom base URL for Stack Auth API (defaults to Stack Auth servers) | 📝 Static |
| lang | `string | undefined` | ❌ | Language code for localization (e.g., "en", "es", "fr") | 📝 Static |
| theme | `string | undefined` | ❌ | UI theme preference ("light", "dark", "auto") | 📝 Static |

## Usage Examples

```astro
// Basic usage example not available
```

## Version Compatibility

| Version | Supported Props | Deprecated Props | Source |
|---------|-----------------|------------------|--------|
| 2.8.x | app, children | None | 📝 Static |


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

⚠️ **Dynamic type extraction failed, using static fallback**  
Ensure @stackframe/stack-ui is properly installed and accessible



---

*This documentation is generated from static type specifications. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
