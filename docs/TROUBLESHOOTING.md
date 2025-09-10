# Stack Auth Astro Integration - Troubleshooting Guide

This guide helps you resolve common issues when setting up and using the Stack Auth integration with Astro.

## Quick Diagnostics

If you're experiencing issues, start here:

### 1. Check Configuration Status

Add this to any `.astro` file to check your configuration:

```astro
---
import { getConfigSummary } from 'astro-stack-auth/config';
console.log('Stack Auth Config:', getConfigSummary());
---
```

### 2. Verify Environment Variables

Ensure these environment variables are set:

```bash
# Required
STACK_PROJECT_ID=your_project_id_here
STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key_here  
STACK_SECRET_SERVER_KEY=your_secret_key_here

# Optional
STACK_BASE_URL=https://your-custom-domain.com  # Default: Stack Auth API
STACK_AUTH_PREFIX=/auth                         # Default: /handler
```

### 3. Test Integration Setup

Create a test page to verify the integration:

```astro
---
// src/pages/auth-test.astro
import { getUser } from 'astro-stack-auth/server';

try {
  const user = await getUser(Astro);
  console.log('User:', user ? 'Authenticated' : 'Not authenticated');
} catch (error) {
  console.error('Auth test failed:', error.message);
}
---

<html>
  <body>
    <h1>Stack Auth Test Page</h1>
    <p>Check the console for authentication status.</p>
  </body>
</html>
```

## Common Issues

### Environment Variable Issues

#### "STACK_PROJECT_ID environment variable is required"

**Problem**: Missing required environment variables.

**Solution**:
1. Create a `.env` file in your project root
2. Add your Stack Auth credentials:
   ```
   STACK_PROJECT_ID=your_project_id_here
   STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key_here
   STACK_SECRET_SERVER_KEY=your_secret_key_here
   ```
3. Get your credentials from the [Stack Auth Dashboard](https://app.stack-auth.com)

#### "projectId format appears invalid"

**Problem**: Environment variable format is incorrect.

**Solution**:
- Ensure `STACK_PROJECT_ID` is at least 8 characters long
- Use the exact value from your Stack Auth dashboard
- Don't add quotes or extra characters

#### "Using live secret key in development environment"

**Problem**: Using production keys in development.

**Solution**:
- Use test/development keys for local development
- Create separate projects in Stack Auth for development and production
- Keep live keys for production deployments only

### Integration Setup Issues

#### "React renderer already configured"

**Problem**: Conflicting React renderer configuration.

**Solution**: Choose one approach:

Option 1 - Use existing React renderer:
```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [
    react(),
    astroStackAuth({ addReactRenderer: false })
  ]
});
```

Option 2 - Let Stack Auth add React renderer:
```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [
    astroStackAuth({ addReactRenderer: true })
    // Remove react() integration
  ]
});
```

#### "Stack Auth routes not working"

**Problem**: API routes not responding.

**Solution**:
1. Check your integration configuration:
   ```javascript
   // astro.config.mjs
   export default defineConfig({
     integrations: [astroStackAuth()]
   });
   ```

2. Verify the route prefix in browser:
   - Default: `http://localhost:4321/handler/signin`
   - Custom: `http://localhost:4321/your-prefix/signin`

3. Check server logs for errors during startup

#### "Could not detect Astro environment"

**Problem**: Integration running outside Astro context.

**Solution**:
- Only use this integration within Astro projects
- Ensure you're importing from the correct package paths
- Check that Astro is properly installed and configured

### Runtime Issues

#### "Cannot resolve @stackframe/stack"

**Problem**: Missing Stack Auth SDK dependency.

**Solution**:
```bash
npm install @stackframe/stack @stackframe/stack-ui
```

#### "Node.js version not supported"

**Problem**: Using unsupported Node.js version.

**Solution**:
- Upgrade to Node.js 18 or higher
- Check your Node.js version: `node --version`
- Use a Node.js version manager like nvm if needed

#### "Module resolution errors"

**Problem**: TypeScript or module import issues.

**Solution**:
1. Ensure proper TypeScript configuration:
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "moduleResolution": "bundler",
       "allowImportingTsExtensions": true
     }
   }
   ```

2. Use proper import paths:
   ```typescript
   // Correct
   import { getUser } from 'astro-stack-auth/server';
   import { SignIn } from 'astro-stack-auth/components';
   
   // Incorrect
   import { getUser } from 'astro-stack-auth/dist/server';
   ```

### Component Issues

#### "Stack Auth components not rendering"

**Problem**: React components not working in Astro.

**Solution**:
1. Ensure React renderer is configured:
   ```javascript
   astroStackAuth({ addReactRenderer: true })
   ```

2. Use proper hydration directives:
   ```astro
   ---
   import { SignIn } from 'astro-stack-auth/components';
   ---
   
   <SignIn client:load />
   ```

3. Check browser console for React-related errors

#### "SignIn component not found"

**Problem**: Component import path incorrect.

**Solution**:
```astro
---
// Correct imports
import { SignIn, SignUp, UserButton } from 'astro-stack-auth/components';
---

<SignIn client:load />
<UserButton client:visible />
```

### Development Issues

#### Integration fails during build

**Problem**: Build-time validation errors.

**Solution**:
1. Disable validation temporarily:
   ```javascript
   astroStackAuth({ skipValidation: true })
   ```

2. Check environment variables are available during build
3. Ensure all required dependencies are installed

#### Slow development server startup

**Problem**: Validation checks slowing down development.

**Solution**:
- Validation only runs in development mode with warnings
- For production builds, validation errors will fail the build
- Consider using `.env.local` for faster local development

## Advanced Troubleshooting

### Enable Debug Logging

Add this to see detailed configuration information:

```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [astroStackAuth()],
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify('development')
    }
  }
});
```

### Verify Network Connectivity

Test Stack Auth API connectivity:

```javascript
// Test API connectivity
fetch('https://api.stack-auth.com/api/v1/projects')
  .then(res => console.log('Stack Auth API:', res.status))
  .catch(err => console.error('Network error:', err));
```

### Check Browser Console

Common browser console errors and solutions:

1. **CORS errors**: Check your Stack Auth project configuration
2. **Network errors**: Verify API endpoints and network connectivity  
3. **JavaScript errors**: Check React component hydration issues

### Performance Issues

If experiencing slow authentication:

1. Check network connectivity to Stack Auth API
2. Verify proper caching configuration
3. Monitor server logs for repeated API calls
4. Consider implementing client-side session caching

## Getting Help

If you're still experiencing issues:

1. **Check the documentation**: [Stack Auth Docs](https://docs.stack-auth.com)
2. **Search existing issues**: [GitHub Issues](https://github.com/your-repo/astro-stack-auth/issues)
3. **Create a new issue**: Include:
   - Error messages (with sensitive data redacted)
   - Your configuration (astro.config.mjs)
   - Environment (Node.js version, Astro version)
   - Steps to reproduce the issue

## Configuration Examples

### Basic Setup
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import astroStackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [astroStackAuth()]
});
```

### Custom Configuration
```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [
    astroStackAuth({
      prefix: '/auth',
      addReactRenderer: true,
      config: {
        // Optional: override environment variables
        baseUrl: 'https://your-api.com'
      }
    })
  ]
});
```

### Production Setup
```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [
    astroStackAuth({
      skipValidation: false, // Always validate in production
      prefix: '/api/auth'
    })
  ],
  output: 'server' // or 'hybrid'
});
```