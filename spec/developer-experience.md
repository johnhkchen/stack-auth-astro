# Developer Experience Specification

## Installation & Setup

### Quick Start (Under 5 Minutes)

```bash
# 1. Install the integration
npm install astro-stack-auth

# 2. Add to astro.config.mjs
# No additional setup needed if env vars are configured
```

```javascript
// astro.config.mjs - Minimal configuration
import { defineConfig } from 'astro/config';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  integrations: [stackAuth()]  // Uses environment variables
});
```

```bash
# 3. Set environment variables
# .env
STACK_PROJECT_ID=your_project_id
STACK_PUBLISHABLE_CLIENT_KEY=your_client_key
STACK_SECRET_SERVER_KEY=your_server_key
```

### Advanced Configuration

```javascript
// astro.config.mjs - Custom configuration
export default defineConfig({
  integrations: [stackAuth({
    prefix: '/api/auth',        // Custom endpoint prefix
    injectRoutes: true,         // Auto-inject Stack Auth routes
    addReactRenderer: true      // Add React for components
  })]
});
```

## Usage Patterns

### 1. Server-Side Auth State

```astro
---
// pages/dashboard.astro
// Auth state automatically available
const user = Astro.locals.user;
const session = Astro.locals.session;
---

<html>
<body>
  {user ? (
    <div>
      <h1>Welcome, {user.displayName}!</h1>
      <p>Email: {user.primaryEmail}</p>
      <p>Session expires: {session.expiresAt.toLocaleDateString()}</p>
    </div>
  ) : (
    <div>
      <h1>Please Sign In</h1>
      <p>You need to be authenticated to view this page.</p>
    </div>
  )}
</body>
</html>
```

### 2. Protected Pages

```astro
---
// pages/admin.astro
import { requireAuth } from 'astro-stack-auth/server';

// Automatically redirects if not authenticated
const user = await requireAuth(Astro);
---

<h1>Admin Dashboard</h1>
<p>Welcome, {user.displayName}! You have admin access.</p>
```

### 3. Client-Side Authentication

```astro
---
// pages/auth.astro  
---

<html>
<body>
  <h1>Authentication Demo</h1>
  
  <script>
    import { signIn, signOut } from 'astro-stack-auth/client';
    
    window.handleSignIn = async (provider) => {
      try {
        await signIn(provider, { redirectTo: '/dashboard' });
      } catch (error) {
        alert('Sign in failed: ' + error.message);
      }
    };
    
    window.handleSignOut = async () => {
      try {
        await signOut({ redirectTo: '/' });
      } catch (error) {
        alert('Sign out failed: ' + error.message);
      }
    };
  </script>
  
  <button onclick="handleSignIn('google')">Sign In with Google</button>
  <button onclick="handleSignIn('github')">Sign In with GitHub</button>
  <button onclick="handleSignOut()">Sign Out</button>
</body>
</html>
```

### 4. React Components in Islands

```astro
---
// pages/signup.astro
import { SignIn, SignUp, UserButton } from 'astro-stack-auth/components';
---

<html>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <!-- User button in header -->
      <UserButton client:load showUserInfo={true} />
    </nav>
  </header>
  
  <main>
    <h1>Welcome!</h1>
    
    <!-- Sign-in component -->
    <SignIn 
      client:load 
      callbackUrl="/dashboard"
      providers={['google', 'github', 'email']}
    />
    
    <!-- Or sign-up component -->
    <SignUp 
      client:idle
      callbackUrl="/welcome"
    />
  </main>
</body>
</html>
```

### 5. Protected API Routes

```javascript
// pages/api/user-data.js
import { requireAuth } from 'astro-stack-auth/server';

export async function GET(context) {
  try {
    const user = await requireAuth(context);
    
    return new Response(JSON.stringify({
      id: user.id,
      name: user.displayName,
      email: user.primaryEmail,
      message: 'This is protected data'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Authentication required'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(context) {
  const user = await requireAuth(context);
  const data = await context.request.json();
  
  // Handle authenticated POST request
  return new Response(JSON.stringify({
    message: `Data received from ${user.displayName}`,
    data
  }));
}
```

### 6. Conditional Rendering

```astro
---
// components/AuthStatus.astro
const user = Astro.locals.user;
---

<div class="auth-status">
  {user ? (
    <div class="user-info">
      <img src={user.profileImageUrl} alt={user.displayName} />
      <span>Hello, {user.displayName}</span>
      <button onclick="signOut()">Sign Out</button>
    </div>
  ) : (
    <div class="sign-in-prompt">
      <p>Sign in to access your account</p>
      <a href="/signin">Sign In</a>
    </div>
  )}
</div>

<script>
  import { signOut } from 'astro-stack-auth/client';
  
  window.signOut = async () => {
    await signOut({ redirectTo: '/' });
  };
</script>
```

## TypeScript Experience

### Type Safety Out of the Box

```typescript
// pages/profile.astro
---
import { requireAuth } from 'astro-stack-auth/server';
import type { User } from '@stackframe/stack';

// TypeScript knows user is never null here
const user: User = await requireAuth(Astro);

// Astro.locals is properly typed
const localUser: User | null = Astro.locals.user;
const session = Astro.locals.session; // Session | null
---

<h1>Profile for {user.displayName}</h1>
<p>Email: {user.primaryEmail}</p>

{localUser && (
  <p>Local user ID: {localUser.id}</p>
)}
```

### API Route Types

```typescript  
// pages/api/profile.ts
import type { APIContext } from 'astro';
import { getUser } from 'astro-stack-auth/server';

export async function GET(context: APIContext) {
  const user = await getUser(context);
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401
    });
  }
  
  // TypeScript knows user properties
  return new Response(JSON.stringify({
    id: user.id,
    name: user.displayName,
    email: user.primaryEmail
  }));
}
```

## Error Handling Examples

### Development-Friendly Errors

```javascript
// Missing environment variables
// Error: Stack Auth configuration missing
// 
// Required environment variables:
// - STACK_PROJECT_ID
// - STACK_PUBLISHABLE_CLIENT_KEY  
// - STACK_SECRET_SERVER_KEY
//
// Get these from your Stack Auth dashboard:
// https://app.stack-auth.com/dashboard
//
// Add them to your .env file:
// STACK_PROJECT_ID=your_project_id
// STACK_PUBLISHABLE_CLIENT_KEY=your_client_key
// STACK_SECRET_SERVER_KEY=your_server_key
```

### Runtime Error Handling

```astro
---
// pages/protected-with-fallback.astro
import { getUser } from 'astro-stack-auth/server';

let user;
let authError = null;

try {
  user = await getUser(Astro);
} catch (error) {
  authError = error.message;
}
---

{authError ? (
  <div class="error">
    <h2>Authentication Error</h2>
    <p>{authError}</p>
    <a href="/signin">Try signing in again</a>
  </div>
) : user ? (
  <div>Welcome, {user.displayName}!</div>
) : (
  <div>
    <p>Please sign in to continue</p>
    <a href="/signin">Sign In</a>
  </div>
)}
```

## Performance Best Practices

### Server-Side First Approach

```astro
---
// Resolve auth state on server for best performance
const user = Astro.locals.user;
---

<!-- Server-rendered content -->
{user ? (
  <div>Welcome back, {user.displayName}!</div>
) : (
  <div>Welcome, guest!</div>
)}

<!-- Only hydrate interactive components -->
<UserButton client:visible />
```

### Lazy Loading Components

```astro
---
import { SignIn } from 'astro-stack-auth/components';
---

<!-- Load sign-in component only when needed -->
<SignIn client:idle />

<!-- Or load when visible -->
<SignIn client:visible />
```

## Migration from Manual Setup

### Before (Manual Setup)

```javascript
// Lots of manual configuration
import { StackApp } from '@stackframe/stack';

// Manual API routes
// Manual middleware 
// Manual environment setup
// Manual TypeScript setup
```

### After (astro-stack-auth)

```javascript
// Simple integration
export default defineConfig({
  integrations: [stackAuth()]
});

// Everything else is automatic
```

## Common Patterns

### Auth-Aware Navigation

```astro
---
// components/Navigation.astro
import { UserButton } from 'astro-stack-auth/components';
const user = Astro.locals.user;
---

<nav>
  <a href="/">Home</a>
  
  {user ? (
    <>
      <a href="/dashboard">Dashboard</a>
      <a href="/profile">Profile</a>
      <UserButton client:load />
    </>
  ) : (
    <>
      <a href="/signin">Sign In</a>
      <a href="/signup">Sign Up</a>
    </>
  )}
</nav>
```

### Route Guards

```astro
---
// layouts/AuthLayout.astro
import { requireAuth } from 'astro-stack-auth/server';

const user = await requireAuth(Astro);
---

<html>
<body>
  <header>
    <h1>Authenticated Area</h1>
    <p>Logged in as: {user.displayName}</p>
  </header>
  
  <main>
    <slot />
  </main>
</body>
</html>
```

This developer experience specification ensures that Stack Auth integration with Astro is intuitive, performant, and follows Astro's best practices while leveraging Stack Auth's powerful features.