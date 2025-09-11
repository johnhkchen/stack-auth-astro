# Basic Stack Auth Integration Usage Example

This example shows how to use the basic Stack Auth integration stub in an Astro project.

## 1. Install the Package

```bash
npm install astro-stack-auth
```

## 2. Set Environment Variables

Create a `.env` file in your project root:

```env
STACK_PROJECT_ID=your-project-id
STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-key
STACK_SECRET_SERVER_KEY=your-secret-key
```

## 3. Configure Astro Integration

### Option A: Using the Basic Integration (Recommended for Sprint 002 development)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { basicIntegration } from 'astro-stack-auth';

export default defineConfig({
  integrations: [
    basicIntegration({
      prefix: '/auth',           // Custom endpoint prefix (default: '/handler')
      addReactRenderer: true,    // Add React renderer for UI components (default: true)
      injectRoutes: true,        // Inject Stack Auth API routes (default: true)
      addMiddleware: true,       // Add authentication middleware (default: true)
      skipValidation: false      // Skip environment validation (default: false)
    })
  ]
});
```

### Option B: Using the Factory Function

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { createBasicStackAuthIntegration } from 'astro-stack-auth';

export default defineConfig({
  integrations: [
    createBasicStackAuthIntegration({
      prefix: '/handler',
      addReactRenderer: true,
      injectRoutes: true,
      addMiddleware: true
    })
  ]
});
```

### Option C: Using the Full Integration (for production use)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import astroStackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [
    astroStackAuth({
      prefix: '/handler',
      addReactRenderer: true,
      injectRoutes: true,
      addMiddleware: true,
      skipValidation: false
    })
  ]
});
```

## 4. Integration Features

### Environment Variable Validation

The basic integration validates required environment variables:
- `STACK_PROJECT_ID`
- `STACK_PUBLISHABLE_CLIENT_KEY`
- `STACK_SECRET_SERVER_KEY`

### React Renderer Setup

Automatically adds React renderer for Stack Auth UI components:
```js
// The integration adds this automatically
addRenderer({
  name: '@astrojs/react',
  clientEntrypoint: '@astrojs/react/client.js',
  serverEntrypoint: '@astrojs/react/server.js'
});
```

### Route Injection

Injects Stack Auth API routes at the configured prefix:
```js
// Routes are injected at: /your-prefix/[...stack]
// Default: /handler/[...stack]
injectRoute({
  pattern: `/handler/[...stack]`,
  entrypoint: 'astro-stack-auth/api/handler',
  prerender: false
});
```

### Middleware Integration

Adds authentication middleware to populate `Astro.locals`:
```js
addMiddleware({
  entrypoint: 'astro-stack-auth/middleware',
  order: 'pre'
});
```

## 5. Development Mode Features

In development mode, the integration provides helpful logging:

```
🔐 Setting up basic Stack Auth integration...
✅ Environment variables validated
✅ Added React renderer for Stack Auth UI components
✅ Injected Stack Auth routes at /handler/[...stack]
✅ Added Stack Auth middleware
🎉 Basic Stack Auth integration configured successfully
```

## 6. Error Handling

The integration provides clear error messages for common issues:

### Missing Environment Variables
```
Stack Auth configuration is invalid or missing:
STACK_PROJECT_ID environment variable is required
STACK_PUBLISHABLE_CLIENT_KEY environment variable is required

Required environment variables:
  - STACK_PROJECT_ID
  - STACK_PUBLISHABLE_CLIENT_KEY
  - STACK_SECRET_SERVER_KEY

Please set these variables in your .env file or environment.
```

## 7. TypeScript Support

The basic integration includes full TypeScript support:

```typescript
import type { BasicStackAuthOptions } from 'astro-stack-auth';

const options: BasicStackAuthOptions = {
  prefix: '/auth',
  addReactRenderer: true,
  injectRoutes: true,
  addMiddleware: true,
  skipValidation: false
};
```

## Next Steps

This basic integration provides the foundation for Sprint 002 development, which will add:
- Complete authentication middleware
- Server-side authentication helpers
- Client-side authentication functions
- React component integration
- Enhanced error handling and validation

For production use, consider using the full `astroStackAuth` integration which includes all these features.