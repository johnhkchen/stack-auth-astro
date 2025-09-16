# astro-stack-auth

Community Astro integration for [Stack Auth](https://stack-auth.com) - Server-side authentication for Astro projects.

> **✅ Production Ready**: All core features complete! Server-side authentication, client-side functions, and React components fully implemented and tested.

## Installation

The package is ready for production use and will be published to npm soon. For now, install directly from GitHub:

### Option 1: Install from GitHub (Recommended)
```bash
# Install directly from GitHub repository
npm install github:johnhkchen/stack-auth-astro
```

### Option 2: Local Development (Contributors)
```bash
# Clone and link for local development
git clone https://github.com/johnhkchen/stack-auth-astro.git
cd stack-auth-astro
npm install
npm run build
npm link

# In your Astro project directory
npm link astro-stack-auth
```

### Option 3: Local Tarball
```bash
# In the cloned repository
npm run package  # Creates astro-stack-auth-0.1.0.tgz

# In your Astro project directory
npm install /path/to/astro-stack-auth-0.1.0.tgz
```

### Option 4: Alpha Test Project (Easy Testing)
```bash
# Clone and use the standalone test project
git clone https://github.com/johnhkchen/stack-auth-astro.git
cd stack-auth-astro/examples/alpha-test-project
npm install
# Follow setup guide in README
```

## 5-Minute Quick Start

After installing with any method above:

```bash
# 1. Add to your Astro config
# astro.config.mjs
import { defineConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [stackAuth()] // Uses environment variables
});

# 2. Configure environment variables
# Get these from your Stack Auth Dashboard: https://app.stack-auth.com
# .env
STACK_PROJECT_ID=your_project_id
STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key
STACK_SECRET_SERVER_KEY=your_secret_server_key

# 3. Test with a protected page
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

# 4. Start your dev server
npm run dev
# Visit /protected - you'll be redirected to Stack Auth sign-in
```

## Features

### Server-Side Authentication
- `getUser(context)` - Get authenticated user in pages/API routes
- `getSession(context)` - Get current session information  
- `requireAuth(context)` - Enforce authentication with automatic redirects
- `Astro.locals.user` and `Astro.locals.session` - Middleware-populated auth state
- Automatic Stack Auth route injection (`/handler/*` by default)
- Custom authentication endpoint prefixes
- TypeScript support with full type safety

### Client-Side Functions & Components
- `signIn()`, `signOut()` - Browser authentication functions  
- `redirectToSignIn()`, `redirectToSignUp()`, `redirectToAccount()` - Navigation helpers
- `<SignIn />`, `<SignUp />`, `<UserButton />`, `<AccountSettings />` - React UI components
- Cross-tab authentication synchronization
- Astro island hydration support (`client:load`, `client:visible`, etc.)

### Advanced Features
- Session caching with 5-minute TTL for optimal performance
- Security validation (HTTPS, origin, CSRF protection)
- Performance monitoring and health checks
- Graceful error handling and service recovery
- Production deployment support with all major hosting platforms

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

### Advanced Configuration

You can also configure the integration directly in your `astro.config.mjs`:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [
    stackAuth({
      // Custom endpoint prefix - overrides STACK_AUTH_PREFIX
      prefix: '/api/auth',
      
      // Whether to add React renderer (default: true)
      addReactRenderer: true,
      
      // Whether to inject API routes (default: true) 
      injectRoutes: true,
      
      // Whether to add middleware (default: true)
      addMiddleware: true
    })
  ]
});
```

**Prefix Configuration:**
- **Default**: `/handler` - All Stack Auth endpoints available at `/handler/*`
- **Custom**: Set `prefix: '/api/auth'` or `STACK_AUTH_PREFIX=/api/auth`
- **Client Auto-Detection**: Client-side functions automatically discover and use the configured prefix
- **No Conflicts**: The integration validates that your custom prefix doesn't conflict with existing routes

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

### Using Client-Side Functions

```astro
---
// src/pages/custom-signin.astro
---
<html>
  <body>
    <h1>Custom Sign In</h1>
    <button id="github-signin">Sign in with GitHub</button>
    <button id="google-signin">Sign in with Google</button>
    <button id="signout-btn" style="display: none;">Sign Out</button>
    
    <script>
      import { signIn, signOut } from 'astro-stack-auth/client';
      
      // GitHub sign in
      document.getElementById('github-signin')?.addEventListener('click', () => {
        signIn('github', {
          redirectTo: '/dashboard',
          onError: (error) => console.error('Sign in failed:', error)
        });
      });
      
      // Google sign in  
      document.getElementById('google-signin')?.addEventListener('click', () => {
        signIn('google', { redirectTo: '/dashboard' });
      });
      
      // Sign out
      document.getElementById('signout-btn')?.addEventListener('click', () => {
        signOut({ 
          redirectTo: '/',
          clearLocalStorage: true 
        });
      });
    </script>
  </body>
</html>
```

### Using React Components

```astro
---
// src/pages/auth.astro
import { SignIn, SignUp, UserButton } from 'astro-stack-auth/components';
import { getUser } from 'astro-stack-auth/server';

const user = await getUser(Astro);
---
<html>
  <body>
    {user ? (
      <div>
        <h1>Welcome back!</h1>
        <UserButton user={user} client:load />
      </div>
    ) : (
      <div>
        <h1>Sign In or Sign Up</h1>
        <div style="display: flex; gap: 2rem;">
          <div>
            <h2>Sign In</h2>
            <SignIn client:visible />
          </div>
          <div>
            <h2>Sign Up</h2>
            <SignUp client:visible />
          </div>
        </div>
      </div>
    )}
  </body>
</html>
```

### Important: Build Environment Requirements

**Stack Auth components have Next.js dependencies and require an Astro/React build environment:**

Stack Auth's underlying `@stackframe/stack` SDK includes Next.js dependencies that are resolved at build time. This means:

- ✅ **Components work correctly** within Astro's build system and runtime
- ✅ **Full functionality** is available when using standard Astro development and production builds
- ❌ **Direct Node.js imports will fail** when attempting to import components outside of Astro's build context
- ❌ **Unit testing requires Astro's test infrastructure** - cannot import components directly in Node.js test files

**Error you might see in Node.js contexts:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'next/navigation' imported from @stackframe/stack
```

**Solution for testing:**
Use Astro's built-in testing infrastructure or test components through Astro Container API rather than direct Node.js imports. The components are designed to work within Astro's build pipeline where Next.js dependencies are properly resolved.

This is an expected limitation of Stack Auth's current architecture and does not affect normal usage within Astro applications.

## User Testing Guide

### What You Can Test Right Now ✅

1. **Server-Side Authentication**
   - Create protected pages using `requireAuth()`
   - Build public pages with optional auth using `getUser()`
   - Create protected API endpoints
   - Test automatic redirects to Stack Auth sign-in
   - Verify user data access in pages and API routes

2. **Client-Side Functions**
   - Use `signIn()` and `signOut()` functions in browser context
   - Test redirect functions (`redirectToSignIn()`, `redirectToSignUp()`, `redirectToAccount()`)
   - Implement custom sign-in/sign-out UI with client functions

3. **React Components**
   - Import and use `<SignIn />`, `<SignUp />`, `<UserButton />` components
   - Test different hydration strategies (`client:load`, `client:visible`, etc.)
   - Customize component styling and behavior

4. **Environment Configuration**
   - Test with your Stack Auth project credentials
   - Try custom endpoint prefixes with `STACK_AUTH_PREFIX`
   - Validate environment variable error handling

5. **Integration Features**
   - Middleware population of `Astro.locals.user` and `Astro.locals.session`
   - TypeScript support and full type safety
   - Production deployment with your hosting platform

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

### ✅ All Features Complete

**Production-Ready Features:**
- ✅ **Server-side authentication** - `getUser`, `getSession`, `requireAuth`
- ✅ **Client-side authentication** - `signIn`, `signOut`, redirect helpers
- ✅ **React UI components** - `<SignIn />`, `<SignUp />`, `<UserButton />`, `<AccountSettings />`
- ✅ **Middleware integration** - Automatic `Astro.locals` population
- ✅ **TypeScript support** - Full type safety and IntelliSense
- ✅ **Performance optimized** - Session caching, minimal overhead
- ✅ **Security features** - CSRF protection, origin validation, HTTPS enforcement
- ✅ **Cross-tab sync** - Authentication state synchronization
- ✅ **Error recovery** - Graceful handling of service interruptions

### Development Milestones Completed

All planned sprints have been successfully completed:
- **Sprint 001**: Foundation & package setup ✅
- **Sprint 002**: Core integration & configuration ✅
- **Sprint 003**: Server-side authentication ✅
- **Sprint 004**: Client-side functions & React components ✅

### Contributing to Testing

**Help us improve by testing all available features:**
1. Try both server-side and client-side authentication in your projects
2. Test React components with different hydration strategies
3. Test with different Astro adapters (Vercel, Netlify, etc.)
4. Report any issues or suggest improvements
5. Share feedback on developer experience and documentation

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
