# API Design Specification

## Integration Configuration

### Basic Integration Options

```typescript
interface StackAuthIntegrationOptions {
  // Stack Auth credentials (environment variables take precedence)
  projectId?: string;
  publishableClientKey?: string;
  secretServerKey?: string;
  
  // Integration configuration
  prefix?: string;              // Default: "/handler"
  injectRoutes?: boolean;       // Default: true
  addReactRenderer?: boolean;   // Default: true
}

// Usage in astro.config.mjs
export default defineConfig({
  integrations: [stackAuth(options)]
});
```

### Environment Variable Support

Required environment variables (auto-detected):
- `STACK_PROJECT_ID`
- `STACK_PUBLISHABLE_CLIENT_KEY` 
- `STACK_SECRET_SERVER_KEY`

Optional environment variables:
- `STACK_AUTH_PREFIX` - Custom endpoint prefix

## Server-Side API

### Authentication Helpers

```typescript
// Get current user (returns null if not authenticated)
function getUser(context: APIContext): Promise<User | null>

// Require authentication (throws/redirects if not authenticated)
function requireAuth(context: APIContext, options?: RequireAuthOptions): Promise<User>

// Get session information  
function getSession(context: APIContext): Promise<Session | null>

interface RequireAuthOptions {
  signInUrl?: string;     // Custom sign-in URL
  redirectTo?: string;    // Post-auth redirect URL
}
```

### Usage Examples

```astro
---
// In .astro pages
import { getUser, requireAuth } from 'astro-stack-auth/server';

// Optional authentication
const user = await getUser(Astro);

// Required authentication (auto-redirects)
const authenticatedUser = await requireAuth(Astro);
---
```

```javascript
// In API routes  
export async function GET(context) {
  const user = await getUser(context);
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401
    });
  }
  
  return new Response(JSON.stringify({ user }));
}
```

## Client-Side API

### Authentication Actions

```typescript
// Sign in with redirect
function signIn(provider?: string, options?: SignInOptions): Promise<void>

// Sign out current user
function signOut(options?: SignOutOptions): Promise<void>

// Redirect to Stack Auth pages
function redirectToSignIn(callbackUrl?: string): void
function redirectToSignUp(callbackUrl?: string): void
function redirectToAccount(callbackUrl?: string): void

interface SignInOptions {
  redirectTo?: string;
  provider?: string;
}

interface SignOutOptions {
  redirectTo?: string;
  clearLocalStorage?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
```

### Usage Examples

```astro
---
// Client-side authentication actions
---

<script>
  import { signIn, signOut } from 'astro-stack-auth/client';
  
  async function handleSignIn() {
    await signIn('google', { redirectTo: '/dashboard' });
  }
  
  async function handleSignOut() {
    await signOut({ redirectTo: '/' });
  }
</script>

<button onclick="handleSignIn()">Sign In with Google</button>
<button onclick="handleSignOut()">Sign Out</button>
```

## Component Exports

### Stack Auth React Components

```typescript
// Re-export Stack Auth's pre-built components
export { SignIn } from '@stackframe/stack-ui'
export { SignUp } from '@stackframe/stack-ui'  
export { UserButton } from '@stackframe/stack-ui'
export { AccountSettings } from '@stackframe/stack-ui'

// Stack Auth provider context
export { StackProvider } from '@stackframe/stack'
```

### Usage in Astro

```astro
---
// Import Stack Auth components
import { SignIn, SignUp, UserButton } from 'astro-stack-auth/components';
---

<!-- Use with Astro's client directives -->
<SignIn client:load />
<SignUp client:idle />
<UserButton client:visible showUserInfo={true} />
```

## Astro.locals Integration

### Type Definitions

```typescript
declare namespace App {
  interface Locals {
    user: User | null;
    session: Session | null;
  }
}

// Stack Auth User type (from @stackframe/stack)
interface User {
  id: string;
  displayName: string;
  primaryEmail: string;
  profileImageUrl?: string;
  // ... other Stack Auth user properties
}

interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  // ... other Stack Auth session properties
}
```

### Automatic Population

The integration automatically populates `Astro.locals` via middleware:

```astro
---
// Available in all pages automatically
const user = Astro.locals.user;
const session = Astro.locals.session;
---

{user ? (
  <p>Welcome, {user.displayName}!</p>
) : (
  <p>Please sign in</p>
)}
```

## API Route Handling

### Stack Auth Endpoints

The integration automatically provides these endpoints:

- `{prefix}/signin` - Sign in page/API
- `{prefix}/signout` - Sign out handling
- `{prefix}/callback` - OAuth callback handling  
- `{prefix}/user` - Current user API
- `{prefix}/session` - Session management

### Custom Prefix Support

```javascript
// Custom prefix configuration
export default defineConfig({
  integrations: [stackAuth({
    prefix: '/api/auth'  // All endpoints under /api/auth/*
  })]
});
```

## Error Handling

### Server-Side Errors

```typescript
// Authentication errors in pages trigger redirects
try {
  const user = await requireAuth(Astro);
} catch (error) {
  // Automatically redirects to sign-in
  // Error only thrown in API routes
}

// API routes receive error responses
export async function GET(context) {
  try {
    const user = await requireAuth(context);
    return new Response(JSON.stringify({ user }));
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Authentication required' 
    }), { status: 401 });
  }
}
```

### Client-Side Errors

```javascript
// Client functions handle errors gracefully
try {
  await signOut();
} catch (error) {
  console.error('Sign out failed:', error);
  // Handle error appropriately
}
```

## Configuration Validation

### Build-Time Validation

The integration validates configuration during Astro's build process:

- Required environment variables present
- Valid configuration options
- No route conflicts with custom prefix
- Stack Auth connectivity (optional)

### Runtime Validation  

- Session validation on each request
- Environment variable format checking
- Stack Auth API connectivity
- Graceful fallback for auth failures