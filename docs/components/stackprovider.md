# StackProvider Component

> Auto-generated documentation from validation schema - Last updated: 2025-09-10

## Overview

The StackProvider component is a Stack Auth UI component that provides authentication context for Stack Auth integration.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| projectId | `string` | ✅ | Your Stack Auth project ID from the Stack Auth dashboard |
| publishableClientKey | `string` | ✅ | Your Stack Auth publishable client key for browser use |
| children | `ReactNode` | ✅ | React components that need access to Stack Auth context |
| baseUrl | `string | undefined` | ❌ | Custom base URL for Stack Auth API (defaults to Stack Auth servers) |
| lang | `string | undefined` | ❌ | Language code for localization (e.g., "en", "es", "fr") |
| theme | `string | undefined` | ❌ | UI theme preference ("light", "dark", "auto") |

## Usage Examples

### Basic Usage

```astro
---
// src/layouts/Layout.astro
---
<html>
<body>
  <StackProvider 
    client:load
    projectId={import.meta.env.PUBLIC_STACK_PROJECT_ID}
    publishableClientKey={import.meta.env.PUBLIC_STACK_PUBLISHABLE_KEY}
  >
    <slot />
  </StackProvider>
</body>
</html>
```



## Version Compatibility

| Version | Supported Props | Deprecated Props |
|---------|-----------------|------------------|
| 2.8.x | app, children | None |


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

---

*This documentation is automatically generated from the runtime validation schema. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
