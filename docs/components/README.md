# Stack Auth Components Documentation

> Auto-generated component documentation - Last updated: 2025-09-10

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

This documentation is automatically generated from the runtime validation schema using:

```bash
npm run docs:generate
```

The generator extracts:
- **Prop specifications** from component validation schema
- **Type information** from TypeScript interfaces  
- **Version compatibility** data from Stack Auth SDK versions
- **Usage examples** tailored for Astro projects

## Contributing

When adding new components or updating existing ones:

1. Update the validation schema in `tests/helpers/runtime-validation.ts`
2. Add usage examples in the documentation generator
3. Run `npm run docs:generate` to update documentation
4. Verify the generated docs are accurate and complete

---

*Generated from runtime validation schema on 2025-09-10*
