# Stack Auth Astro Integration - Technical Specification

## Project Overview
**Package Name:** `@stackframe/astro`  
**Purpose:** Official Stack Auth integration for Astro projects  
**Pattern:** Community integration following `auth-astro` architecture  

## Core Architecture

### **Integration Philosophy**
- **Single integration handles all authentication plumbing**
- **Zero-config defaults with environment variable detection**
- **Progressive enhancement from server-only to full React UI**
- **Type-safe auth state throughout the application**

### **Problem Statement**
Currently, developers must manually:
- Set up Stack Auth API routes
- Configure middleware for auth state
- Handle environment variables and configuration
- Integrate React components with Astro's islands
- Manage CSRF tokens and session handling

### **Solution Approach**
Provide a single integration that:
- Automatically injects authentication endpoints
- Populates `Astro.locals` with auth state
- Provides helper functions for common auth operations
- Optionally includes pre-configured React components

## Package Structure

### **Entry Points**
```
@stackframe/astro/
├── index.ts              # Main integration export
├── server.ts             # Server-side auth methods
├── client.ts             # Client-side auth methods
├── components.ts         # React component exports (optional)
└── middleware.ts         # Auth middleware (internal)
```

### **Internal Architecture**
```
src/
├── integration.ts        # Core Astro integration logic
├── config.ts            # Virtual config module and env handling
├── middleware.ts        # Auth state middleware
├── types.ts            # TypeScript definitions
├── api/
│   └── handler.ts      # Stack Auth endpoint implementation
└── components/         # Pre-configured React components
    ├── SignIn.tsx
    ├── SignUp.tsx
    ├── UserButton.tsx
    └── AccountSettings.tsx
```

## Core API Design

### **Integration Options**
```typescript
interface StackAuthOptions {
  // Environment variables take precedence
  projectId?: string;
  publishableClientKey?: string;
  secretServerKey?: string;
  
  // Configuration options
  prefix?: string;              // Default: "/handler"
  tokenStore?: TokenStoreType;  // Default: "memory"
  injectRoutes?: boolean;       // Default: true
  addReactRenderer?: boolean;   // Default: true
}
```

### **Server-Side Methods**
```typescript
// Get current user (returns null if not authenticated)
getUser(context: APIContext): Promise<User | null>

// Require authentication (throws/redirects if not authenticated)
requireAuth(context: APIContext): Promise<User>

// Get session information
getSession(context: APIContext): Promise<Session | null>

// Handle Stack Auth endpoints (internal)
StackAuthHandler(context: APIContext): Promise<Response>
```

### **Client-Side Methods**
```typescript
// Sign in with provider
signIn(provider?: string, options?: SignInOptions): Promise<void>

// Sign out current user
signOut(options?: SignOutOptions): Promise<void>

// Redirect to Stack Auth pages
redirectToSignIn(callbackUrl?: string): void
redirectToSignUp(callbackUrl?: string): void
redirectToAccount(callbackUrl?: string): void
```

### **Component Exports**
```typescript
// Pre-configured Stack Auth React components
export { SignIn } from './components/SignIn'
export { SignUp } from './components/SignUp'
export { UserButton } from './components/UserButton'
export { AccountSettings } from './components/AccountSettings'
export { StackProvider } from './components/StackProvider'
```

## Technical Requirements

### **Environment Variable Handling**
- **Auto-detection**: Read from standard Stack Auth environment variables
- **Validation**: Clear error messages for missing required variables
- **Fallback**: Support both runtime options and environment variables
- **Security**: Never expose secret keys to client-side

### **Astro Integration Hooks**
- **`astro:config:setup`**: Main setup logic
  - Add React renderer if components are used
  - Inject Stack Auth API routes
  - Add authentication middleware
  - Configure Vite virtual modules
- **Environment compatibility**: Work with all Astro adapters and rendering modes

### **Route Injection**
```typescript
// Automatically inject Stack Auth handler
injectRoute({
  pattern: `${prefix}/[...stack]`,
  entrypoint: "@stackframe/astro/api/handler",
  prerender: false
})
```

### **Middleware Integration**
- **Auth state population**: Automatically populate `Astro.locals.user`
- **Session handling**: Manage Stack Auth sessions
- **CSRF protection**: Built-in security for auth operations
- **Performance**: Minimal overhead for non-auth requests

### **TypeScript Support**
```typescript
// Extend Astro's locals interface
declare namespace App {
  interface Locals {
    user: User | null;
    session: Session | null;
  }
}
```

## Developer Experience Goals

### **Installation and Setup**
```bash
# Single command installation
npm install @stackframe/astro

# Automatic peer dependency handling
# Auto-installs @astrojs/react if components are used
```

### **Configuration**
```javascript
// Minimal configuration
export default defineConfig({
  integrations: [stackAuth()]  // Uses environment variables
});

// Custom configuration
export default defineConfig({
  integrations: [stackAuth({
    prefix: "/api/auth",        // Custom endpoint prefix
    tokenStore: "cookie",       // Custom token storage
    injectRoutes: false         // Manual route handling
  })]
});
```

### **Usage Patterns**

#### **Server-Side Auth State**
```astro
---
// Automatic auth state in all pages
const user = Astro.locals.user;
const session = Astro.locals.session;
---

{user ? (
  <p>Welcome, {user.displayName}!</p>
) : (
  <p>Please sign in</p>
)}
```

#### **Protected Pages**
```astro
---
import { requireAuth } from '@stackframe/astro/server';

const user = await requireAuth(Astro);
// Automatically redirects if not authenticated
---

<h1>Protected Content for {user.displayName}</h1>
```

#### **Client-Side Actions**
```astro
---
import { signIn, signOut } from '@stackframe/astro/client';
---

<button onclick="signIn()">Sign In</button>
<button onclick="signOut()">Sign Out</button>
```

#### **React Components**
```astro
---
import { SignIn, UserButton } from '@stackframe/astro/components';
---

<SignIn client:load />
<UserButton client:load showUserInfo={true} />
```

## Security Requirements

### **CSRF Protection**
- All authentication operations must include CSRF tokens
- Automatic token generation and validation
- Secure token storage and transmission

### **Session Security**
- Secure session handling via Stack Auth
- Automatic session refresh
- Proper session cleanup on signout

### **Environment Variable Security**
- Server keys never exposed to client
- Proper environment variable validation
- Clear security warnings for misconfiguration

## Performance Requirements

### **Minimal Client-Side JavaScript**
- Server-side auth state resolution
- Optional client-side hydration
- Lazy loading of React components

### **Build-Time Optimization**
- Tree-shakeable exports
- Minimal bundle impact
- Efficient Vite plugin integration

### **Runtime Performance**
- Fast auth state resolution
- Cached session handling
- Minimal middleware overhead

## Testing Strategy

### **Unit Tests**
- All helper functions
- Environment variable handling
- Auth state management
- Component rendering

### **Integration Tests**
- Astro integration lifecycle
- Route injection and handling
- Middleware functionality
- Client-server interaction

### **End-to-End Tests**
- Complete authentication flows
- Protected route access
- Session management
- Component interactions

## Documentation Requirements

### **Getting Started Guide**
- Installation instructions
- Basic configuration
- First authentication flow
- Common patterns

### **API Reference**
- All exported functions
- Configuration options
- TypeScript definitions
- Error handling

### **Advanced Usage**
- Custom configurations
- Advanced patterns
- Troubleshooting
- Migration guides

### **Examples**
- Basic authentication
- Protected routes
- Custom components
- Multiple providers

## Success Criteria

### **Developer Experience**
- Developers can add authentication in under 5 minutes
- Clear error messages for common issues
- Intuitive API that follows Astro conventions
- Comprehensive TypeScript support

### **Performance**
- Minimal impact on build times
- Fast runtime authentication checks
- Efficient client-side JavaScript delivery
- Optimal caching strategies

### **Reliability**
- Works with all Astro adapters
- Stable across Astro version updates
- Handles edge cases gracefully
- Comprehensive error handling

### **Community Adoption**
- Clear migration path from manual Stack Auth setup
- Pattern replicable for other auth providers
- Active community contributions
- Positive developer feedback