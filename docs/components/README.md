# Stack Auth Components Documentation

> 📝 **Static Type Specification**: Active  
> ⚠️ **Dynamic Extraction**: Failed - TypeScript compilation or type extraction failed  
> 🕒 **Last Attempted**: 9/10/2025, 12:56:39 PM

*Using static type specifications. Install @stackframe/stack-ui for automatic synchronization.*

This directory contains automatically generated documentation for all Stack Auth components available in the `astro-stack-auth` integration.

## Available Components

- [SignIn](./signin.md) - user authentication with support for multiple providers
- [SignUp](./signup.md) - user registration with customizable provider options
- [UserButton](./userbutton.md) - a user profile button with avatar and dropdown menu
- [AccountSettings](./accountsettings.md) - comprehensive account management interface
- [StackProvider](./stackprovider.md) - authentication context for Stack Auth integration

## Getting Started

1. **Install astro-stack-auth**: `npm install astro-stack-auth`
2. **Configure your project**: Add Stack Auth environment variables
3. **Wrap your app**: Use `StackProvider` in your layout
4. **Add components**: Import and use authentication components

### Quick Setup

```astro
---
// src/layouts/Layout.astro
import { StackProvider } from 'astro-stack-auth/components';
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

## Documentation Generation

This documentation is generated from static type specifications using:

```bash
npm run docs:generate
```

The generator extracts:
- **Prop specifications** from static validation schema
- **Type information** from predefined TypeScript interfaces
- **Version compatibility** data from Stack Auth SDK versions
- **Usage examples** tailored for Astro projects


## Recommendations

⚠️ **Dynamic type extraction failed, using static fallback**  
Ensure @stackframe/stack-ui is properly installed and accessible



## Contributing

When adding new components or updating existing ones:

1. Update the validation schema in the documentation generator
2. Add usage examples in the documentation generator
3. Run `npm run docs:generate` to update documentation
4. Verify the generated docs are accurate and complete

---

*Generated from static specifications on 2025-09-10*
