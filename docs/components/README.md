# Stack Auth Components Documentation

> 🔄 **Dynamic Type Extraction**: ✅ Active  
> 📊 **SDK Version**: 2.8.36  
> 🕒 **Last Updated**: 9/11/2025, 3:09:37 PM  
> 📈 **Components**: 5 components with live type data

*This documentation is automatically synchronized with your installed Stack Auth SDK version.*

> ✅ **Interface Change Detection**: No changes detected  
> 📊 **Version**: 2.8.36 → 2.8.36  
> 🕒 **Last Checked**: 9/11/2025, 3:09:37 PM

*No interface changes detected since last update.*

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

This documentation is dynamically generated from your installed @stackframe/stack-ui types using:

```bash
npm run docs:generate
```

The generator extracts:
- **Prop specifications** from live SDK TypeScript types
- **Type information** from installed SDK version
- **Version compatibility** data from Stack Auth SDK versions
- **Usage examples** tailored for Astro projects


## Recommendations

✅ **Successfully extracted types for 5 components**  
Documentation will automatically reflect the exact SDK types you have installed



## Contributing

When adding new components or updating existing ones:

1. Install/update @stackframe/stack-ui to get latest types
2. Add usage examples in the documentation generator
3. Run `npm run docs:generate` to update documentation
4. Verify the generated docs are accurate and complete

---

*Generated from @stackframe/stack-ui@2.8.36 on 2025-09-11*
