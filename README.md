# astro-stack-auth

Community Astro integration for [Stack Auth](https://stack-auth.com) - Server-side authentication for Astro projects.

> **🚧 Current Status**: This integration provides **server-side authentication** (Sprint 003 complete). Client-side functions and React components coming in Sprint 004.

## 5-Minute Quick Start

Get working server-side authentication in under 5 minutes:

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

# 3. Configure environment variables
# Get these from your Stack Auth Dashboard: https://app.stack-auth.com
# .env
STACK_PROJECT_ID=your_project_id
STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key
STACK_SECRET_SERVER_KEY=your_secret_server_key

# 4. Test with a protected page
# src/pages/protected.astro
---
import { requireAuth } from 'astro-stack-auth/server';
const user = await requireAuth(Astro);
---
<html>
  <body>
    <h1>Welcome, {user.displayName}!</h1>
    <p>User ID: {user.id}</p>
  </body>
</html>

# 5. Start your dev server
npm run dev
# Visit /protected - you'll be redirected to Stack Auth sign-in
```

## What Works Right Now ✅

**Server-Side Authentication (Sprint 003 Complete)**
- ✅ `getUser(context)` - Get authenticated user in pages/API routes
- ✅ `getSession(context)` - Get current session information  
- ✅ `requireAuth(context)` - Enforce authentication with automatic redirects
- ✅ `Astro.locals.user` and `Astro.locals.session` - Middleware-populated auth state
- ✅ Environment variable configuration with validation
- ✅ Custom authentication endpoint prefixes
- ✅ Automatic Stack Auth route injection (`/handler/*` by default)
- ✅ TypeScript support with full type safety
- ✅ Production-ready with performance monitoring

## Coming in Sprint 004 🚧

**Client-Side & React Components (In Development)**
- 🚧 `signIn()`, `signOut()` - Browser authentication functions  
- 🚧 `<SignIn />`, `<SignUp />`, `<UserButton />` - React UI components
- 🚧 Client-side authentication state management
- 🚧 Cross-tab authentication synchronization

## Environment Configuration

### Required Environment Variables

Get these from your [Stack Auth Dashboard](https://app.stack-auth.com/dashboard):

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

## Working Examples

### Basic Protected Page

```astro
---
// src/pages/dashboard.astro
import { requireAuth } from 'astro-stack-auth/server';

// This automatically redirects unauthenticated users to sign-in
const user = await requireAuth(Astro);
---
<html>
  <head>
    <title>Dashboard - {user.displayName}</title>
  </head>
  <body>
    <h1>Welcome back, {user.displayName}!</h1>
    <p>Email: {user.primaryEmail}</p>
    <p>Signed in at: {new Date().toLocaleString()}</p>
  </body>
</html>
```

### Optional Authentication (Public Page)

```astro
---
// src/pages/welcome.astro
import { getUser } from 'astro-stack-auth/server';

// Optional - won't redirect if not authenticated
const user = await getUser(Astro);
---
<html>
  <body>
    {user ? (
      <h1>Welcome back, {user.displayName}!</h1>
    ) : (
      <h1>Welcome! Please sign in to continue.</h1>
    )}
  </body>
</html>
```

### Protected API Route

```typescript
// src/pages/api/user-data.ts
import type { APIRoute } from 'astro';
import { requireAuth } from 'astro-stack-auth/server';

export const GET: APIRoute = async (context) => {
  // Returns 401 JSON response if not authenticated
  const user = await requireAuth(context);
  
  return new Response(JSON.stringify({
    success: true,
    user: {
      id: user.id,
      name: user.displayName,
      email: user.primaryEmail
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Using Middleware Data

```astro
---
// src/pages/profile.astro
// Access user data populated by middleware (no async needed)
const { user, session } = Astro.locals;

if (!user) {
  return Astro.redirect('/signin');
}
---
<html>
  <body>
    <h1>Profile: {user.displayName}</h1>
    <p>Session ID: {session.id}</p>
    <p>Last active: {new Date(session.lastActiveAt).toLocaleString()}</p>
  </body>
</html>
```

## User Testing Guide

### What You Can Test Right Now ✅

1. **Server-Side Authentication**
   - Create protected pages using `requireAuth()`
   - Build public pages with optional auth using `getUser()`
   - Create protected API endpoints
   - Test automatic redirects to Stack Auth sign-in
   - Verify user data access in pages and API routes

2. **Environment Configuration**
   - Test with your Stack Auth project credentials
   - Try custom endpoint prefixes with `STACK_AUTH_PREFIX`
   - Validate environment variable error handling

3. **Integration Features**
   - Middleware population of `Astro.locals.user` and `Astro.locals.session`
   - TypeScript support and type safety
   - Production deployment with your hosting platform

### What to Skip for Now 🚧

- Don't try to use `signIn()` or `signOut()` functions (Sprint 004)
- Don't try to import React components like `<SignIn />` (Sprint 004)
- Don't expect client-side authentication state management (Sprint 004)

### How to Provide Feedback

**Found an issue or have suggestions?**
1. **GitHub Issues**: [Report bugs or request features](https://github.com/johnhkchen/stack-auth-astro/issues)
2. **Documentation Issues**: If setup instructions don't work, please let us know
3. **Feature Requests**: What client-side features are most important for Sprint 004?

### Quick Test Checklist

```bash
# 1. Clone or copy the basic example
cp -r examples/minimal-astro my-test-app
cd my-test-app && npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your Stack Auth credentials

# 3. Test basic functionality
npm run dev
# Visit /protected - should redirect to Stack Auth
# Sign in and verify you see user data

# 4. Test API endpoint
curl http://localhost:4321/api/user
# Should return 401 when not authenticated
```


## Project Status & Roadmap

### Current Status: Sprint 003 Complete ✅

**What's Production-Ready:**
- ✅ Server-side authentication functions (`getUser`, `getSession`, `requireAuth`)
- ✅ Middleware integration with `Astro.locals`
- ✅ Environment configuration and validation
- ✅ TypeScript support with full type safety
- ✅ Performance monitoring and security features
- ✅ Production deployment support

### Sprint 004: Client-Side & React Components 🚧

**Coming Soon:**
- 🚧 Client-side authentication functions (`signIn`, `signOut`)
- 🚧 React UI components (`<SignIn />`, `<SignUp />`, `<UserButton />`)
- 🚧 Browser authentication state management
- 🚧 Cross-tab authentication synchronization

**Expected Timeline:** Sprint 004 features coming soon

### Contributing to Testing

**Help us improve by testing Sprint 003 features:**
1. Try the server-side authentication in your projects
2. Test with different Astro adapters (Vercel, Netlify, etc.)
3. Report any issues or suggest improvements
4. Share feedback on what Sprint 004 features are most important

**GitHub Repository:** [stack-auth-astro](https://github.com/johnhkchen/stack-auth-astro)

This integration is built by the community, inspired by auth-astro patterns, and designed to provide the best Stack Auth experience for Astro developers.

## Troubleshooting Common Issues

### Setup Issues

#### "Stack Auth configuration error: STACK_PROJECT_ID is required"

**Cause**: Missing or incorrect environment variables

**Solution**:
```bash
# 1. Check your .env file exists in project root
ls -la .env

# 2. Verify all required variables are set
cat .env | grep STACK_

# 3. Restart dev server after adding variables
npm run dev
```

#### "Cannot resolve module 'astro-stack-auth/server'"

**Cause**: TypeScript module resolution issues

**Solution**:
```json
// tsconfig.json - Use bundler resolution (recommended)
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

#### "User is null" or authentication not working

**Possible causes & solutions**:

1. **Wrong credentials**: Double-check your Stack Auth dashboard keys
2. **Environment variables not loaded**: Restart dev server after changes
3. **HTTPS issues in production**: Ensure your site uses HTTPS
4. **Custom prefix conflicts**: If using `STACK_AUTH_PREFIX`, ensure no conflicts

```bash
# Test your configuration
echo $STACK_PROJECT_ID  # Should output your project ID
echo $STACK_SECRET_SERVER_KEY  # Should output your secret key
```

### Development vs Production

**Development:**
- Uses `.env` file automatically
- Detailed error messages
- Stack Auth dashboard shows "Development" environment

**Production:**
- Set environment variables in your hosting platform:
  - **Vercel**: Environment Variables tab
  - **Netlify**: Site settings → Environment variables
  - **Railway**: Environment tab
  - **Render**: Environment tab
- Stack Auth dashboard shows "Production" environment

### Getting Help

1. **Check error messages**: Development mode provides detailed guidance
2. **Verify Stack Auth setup**: Ensure your project is configured correctly
3. **Test with minimal example**: Use `examples/minimal-astro` to isolate issues
4. **GitHub Issues**: Report bugs with error details and configuration

```bash
# Helpful diagnostic commands
npx astro --version
node --version
npm list astro-stack-auth
cat .env | grep STACK_  # Don't include in bug reports!
```

## Examples

### Available Examples

```bash
# Minimal working example (recommended for testing)
cp -r examples/minimal-astro my-app
cd my-app && npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your Stack Auth credentials

# Start development
npm run dev
```

**What's included in minimal-astro:**
- ✅ Basic Astro configuration with Stack Auth
- ✅ Protected page example (`/protected`)
- ✅ Optional auth page example (`/welcome`)
- ✅ Protected API route example (`/api/user`)
- ✅ Middleware demonstration (`/middleware-demo`)
- ✅ Working TypeScript configuration

### File Structure

```
examples/minimal-astro/
├── astro.config.mjs        # Stack Auth integration setup
├── src/
│   ├── pages/
│   │   ├── protected.astro # requireAuth() example
│   │   ├── welcome.astro   # getUser() example  
│   │   └── api/user.ts     # Protected API route
│   └── middleware.ts       # Auth middleware setup
├── .env.example           # Environment template
└── package.json          # Dependencies
```

### Testing Your Setup

1. **Start the example**: `npm run dev`
2. **Visit `/protected`**: Should redirect to Stack Auth sign-in
3. **Sign in with Stack Auth**: Use any provider (Google, GitHub, etc.)
4. **Return to `/protected`**: Should show your user information
5. **Test API route**: `curl http://localhost:4321/api/user` (requires auth)
6. **Check `/welcome`**: Shows optional authentication pattern

## Requirements

### Astro Version
- **Astro 5.0+** is required
- Compatible with all Astro adapters (Vercel, Netlify, Node.js, etc.)
- Works with SSR and SSG modes

### Stack Auth Compatibility
This integration works with Stack Auth version `^2.8.36`:
- `@stackframe/stack`: ^2.8.36 - Core Stack Auth SDK
- `@stackframe/stack-ui`: ^2.8.36 - UI components (Sprint 004)

### TypeScript Support
- **TypeScript 5.0+** required
- **Module resolution**: `"bundler"` recommended
- Full type safety for `Astro.locals.user` and `Astro.locals.session`

### Node.js & Browser Support
- **Node.js 18+** for development and SSR
- **Modern browsers** with ES2020+ support
- Works with all major bundlers
