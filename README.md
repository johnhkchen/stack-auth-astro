# astro-stack-auth

Community Astro integration for [Stack Auth](https://stack-auth.com) - Complete authentication for Astro projects.

## Quick Start

```bash
# 1. Install the integration
npm install astro-stack-auth

# 2. Add to your Astro config
# astro.config.mjs
import { defineConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [stackAuth()] // Uses environment variables
});

# 3. Configure environment variables (see below)
```

## Environment Configuration

### Required Environment Variables

To use this integration, you must set these environment variables from your [Stack Auth Dashboard](https://app.stack-auth.com/dashboard):

```bash
# .env
STACK_PROJECT_ID=your_project_id
STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key  
STACK_SECRET_SERVER_KEY=your_secret_server_key
```

**Where to get these values:**
1. Sign up at [Stack Auth](https://app.stack-auth.com)
2. Create a new project or select an existing one
3. Navigate to your project dashboard
4. Copy the keys from the "API Keys" section

### Optional Environment Variables

```bash
# Optional: Custom endpoint prefix (default: /handler)
STACK_AUTH_PREFIX=/api/auth

# Optional: Node environment (auto-detected)
NODE_ENV=development
```

### Zero Configuration Setup

The integration works with **zero configuration** when environment variables are properly set:

```javascript
// astro.config.mjs - Minimal setup
export default defineConfig({
  integrations: [stackAuth()] // That's it!
});
```

### Advanced Configuration

```javascript
// astro.config.mjs - Custom configuration
export default defineConfig({
  integrations: [stackAuth({
    prefix: '/api/auth',        // Custom endpoint prefix
    injectRoutes: true,         // Auto-inject Stack Auth routes (default: true)
    addReactRenderer: true      // Add React renderer for components (default: true)
  })]
});
```

## Setup Guides

### Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install astro-stack-auth
   ```

2. **Create environment file:**
   ```bash
   # Create .env file in your project root
   touch .env
   ```

3. **Add Stack Auth credentials:**
   ```bash
   # .env
   STACK_PROJECT_ID=your_project_id
   STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key
   STACK_SECRET_SERVER_KEY=your_secret_server_key
   
   # Optional: Custom auth endpoint
   STACK_AUTH_PREFIX=/api/auth
   ```

4. **Configure Astro:**
   ```javascript
   // astro.config.mjs
   import { defineConfig } from 'astro/config';
   import stackAuth from 'astro-stack-auth';

   export default defineConfig({
     integrations: [stackAuth()]
   });
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

### Production Deployment

#### Vercel

```bash
# Set environment variables in Vercel dashboard
vercel env add STACK_PROJECT_ID
vercel env add STACK_PUBLISHABLE_CLIENT_KEY  
vercel env add STACK_SECRET_SERVER_KEY
```

#### Netlify

```bash
# Set environment variables in Netlify dashboard or netlify.toml
[build.environment]
STACK_PROJECT_ID = "your_project_id"
STACK_PUBLISHABLE_CLIENT_KEY = "your_publishable_client_key"
STACK_SECRET_SERVER_KEY = "your_secret_server_key"
```

#### Docker

```dockerfile
# Dockerfile
ENV STACK_PROJECT_ID=your_project_id
ENV STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key
ENV STACK_SECRET_SERVER_KEY=your_secret_server_key
```

#### Other Platforms

For other deployment platforms, set the environment variables in your platform's configuration:
- **Railway**: Environment tab in project settings
- **Render**: Environment tab in service settings  
- **Heroku**: Config Vars in app settings
- **Digital Ocean**: Environment Variables in app settings

## Requirements

### TypeScript Support

This package includes full TypeScript support out of the box:

```typescript
// Automatically extends Astro.locals with auth state
declare namespace App {
  interface Locals {
    user: import('@stackframe/stack').User | null;
    session: import('@stackframe/stack').Session | null;
  }
}
```

**TypeScript version requirement:** TypeScript 5.0+

### React Requirements

React components are available but optional:

```bash
# Peer dependencies (install if using React components)
npm install react react-dom
```

**React version requirements:**
- React 18.0+ or React 19.0+
- React DOM 18.0+ or React DOM 19.0+

**Note:** React is only required if you use the pre-built UI components from `astro-stack-auth/components`. Server-side auth functionality works without React.

### Astro Requirements

- **Astro 5.0+** is required
- Compatible with all Astro adapters (static, Node.js, Vercel, Netlify, etc.)
- Works with SSR and SSG modes

## Troubleshooting

### Common Configuration Issues

#### Missing Environment Variables

**Error:** `Stack Auth configuration error: STACK_PROJECT_ID is required`

**Solution:**
1. Verify your `.env` file exists in your project root
2. Check that all required environment variables are set:
   ```bash
   # .env
   STACK_PROJECT_ID=your_project_id
   STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key
   STACK_SECRET_SERVER_KEY=your_secret_server_key
   ```
3. Restart your development server after adding environment variables
4. Verify credentials are correct in your [Stack Auth Dashboard](https://app.stack-auth.com/dashboard)

#### Invalid Credentials

**Error:** `Authentication failed` or `Invalid API key`

**Solution:**
1. Double-check your API keys in the Stack Auth Dashboard
2. Ensure you're using the correct project ID
3. Verify the secret server key matches your project
4. Check if your Stack Auth project is properly configured

#### Build Errors

**Error:** TypeScript errors or build failures

**Solution:**
1. Ensure TypeScript version is 5.0+:
   ```bash
   npm install typescript@^5.0.0
   ```
2. Verify Astro version is 5.0+:
   ```bash
   npm install astro@^5.0.0
   ```
3. Check that peer dependencies are installed if using React components:
   ```bash
   npm install react react-dom
   ```

#### Import Errors with Stack Auth Packages

**Error:** `Cannot resolve module '@stackframe/stack'`

**Solution:**
1. Validate Stack Auth packages:
   ```bash
   npm run stack:validate
   ```
2. Reinstall Stack Auth packages if needed:
   ```bash
   npm run stack:reinstall
   ```
3. Clear npm cache and reinstall:
   ```bash
   npm cache clean --force
   npm ci
   ```

#### Development vs Production Issues

**Development:**
- More detailed error messages
- `.env` file detection
- Hot reload support

**Production:**
- Concise error messages
- Environment variables from hosting platform
- Optimized builds

### Getting Help

1. **Check the error message** - Development mode provides detailed guidance
2. **Verify environment variables** - Use `npm run stack:validate` to check package installation
3. **Check Stack Auth Dashboard** - Ensure your project is properly configured
4. **Update dependencies** - Ensure you're using compatible versions

## Stack Auth Compatibility

This integration is compatible with Stack Auth version `^2.8.36`.

### Dependencies
- `@stackframe/stack`: ^2.8.36 - Core Stack Auth SDK
- `@stackframe/stack-ui`: ^2.8.36 - Stack Auth React UI components

### Development Commands
- `npm run stack:validate` - Validate Stack Auth packages are properly installed
- `npm run stack:reinstall` - Reinstall Stack Auth packages if needed
