# Getting Started with astro-stack-auth

## Quick Start

### 1. Install the package

```bash
npm install astro-stack-auth @stackframe/stack
```

### 2. Set up environment variables

Create a `.env` file in your project root:

```env
STACK_PROJECT_ID=your_project_id
STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
STACK_SECRET_SERVER_KEY=your_secret_key
```

You can get these credentials from your [Stack Auth Dashboard](https://app.stack-auth.com/).

### 3. Add the integration to your Astro config

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [
    react(), // Required for Stack Auth components
    stackAuth()
  ]
});
```

### 4. Use authentication in your pages

#### Server-side authentication

```astro
---
// src/pages/protected.astro
import { requireAuth } from 'astro-stack-auth/server';

const user = await requireAuth(Astro);
---

<h1>Welcome, {user.displayName || user.primaryEmail}!</h1>
```

#### Client-side components

```astro
---
// src/pages/index.astro
import { SignIn, UserButton } from 'astro-stack-auth/components';
---

<SignIn client:load />
<UserButton client:visible />
```

## Configuration Options

The Stack Auth integration accepts the following options:

```javascript
stackAuth({
  // Custom auth handler prefix (default: '/handler')
  prefix: '/auth',
  
  // Auto-add React renderer (default: true)
  addReactRenderer: true,
  
  // Enable debug logging (default: false)
  debug: false
})
```

## Next Steps

- [API Reference](./api-reference.md) - Detailed API documentation
- [TypeScript Support](./typescript.md) - Type definitions and usage
- [Testing Guide](./testing.md) - Testing your authentication
- [Development Guide](./development.md) - Contributing to the project

## Examples

Check out our example projects:
- [Minimal Astro Integration](../examples/minimal-astro/) - Basic setup
- [Alpha Test Project](../examples/alpha-test-project/) - Advanced features