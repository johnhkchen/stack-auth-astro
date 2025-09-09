# Stack Auth Astro Integration - Project Context

## Project Overview

**Package Name**: `astro-stack-auth` (Community Integration)  
**Purpose**: Community-built Stack Auth integration for Astro projects following auth-astro patterns  
**Architecture**: Bridge pattern wrapping Stack Auth's official SDK for Astro compatibility  

## Key Project Invariants

### 1. Architecture Philosophy
- **Bridge Pattern**: Wrap `@stackframe/stack` SDK for seamless Astro integration
- **Zero-config defaults** with environment variable auto-detection
- **Progressive enhancement** from server-only to full React UI
- **Minimal overhead** for performance-conscious applications
- **Community integration** following auth-astro architectural patterns

### 2. Core Dependencies
- `@stackframe/stack` - Stack Auth client SDK
- `@stackframe/stack-ui` - Stack Auth React components  
- **Astro Integration API** - For seamless integration lifecycle
- **Peer dependencies**: Astro 5+, React (for components)

### 3. Package Structure & Entry Points
```
astro-stack-auth/
├── index.js              # Main integration export
├── server.js             # Server-side auth helpers (getUser, requireAuth)
├── client.js             # Client-side auth functions (signIn, signOut)
├── components.js         # React component re-exports from @stackframe/stack-ui
└── middleware.js         # Auth middleware (internal)
```

### 4. Astro Integration Hooks
- **`astro:config:setup`**: Primary integration point
  - Add React renderer for Stack Auth components
  - Inject Stack Auth API route handler via `injectRoute()`
  - Register authentication middleware via `addMiddleware()`
  - Configure environment variables

### 5. Route Injection Pattern
```javascript
injectRoute({
  pattern: `${prefix}/[...stack]`,
  entrypoint: "astro-stack-auth/api/handler", 
  prerender: false
})
```
- Default prefix: `/handler`
- Configurable via options or `STACK_AUTH_PREFIX` env var
- Handles all Stack Auth endpoints (signin, callback, user, session, etc.)

### 6. Middleware Architecture
- **Purpose**: Populate `Astro.locals.user` and `Astro.locals.session`
- **Integration**: Uses `addMiddleware()` with `order: 'pre'`
- **Performance**: Minimal overhead for non-auth requests
- **Caching**: Efficient session resolution and caching

### 7. TypeScript Support
```typescript
declare namespace App {
  interface Locals {
    user: import('@stackframe/stack').User | null;
    session: import('@stackframe/stack').Session | null;
  }
}
```

### 8. Environment Variables
**Required:**
- `STACK_PROJECT_ID`
- `STACK_PUBLISHABLE_CLIENT_KEY`
- `STACK_SECRET_SERVER_KEY`

**Optional:**
- `STACK_AUTH_PREFIX` - Custom endpoint prefix

### 9. API Design Patterns

#### Server-Side Helpers (server.js)
```typescript
getUser(context: APIContext): Promise<User | null>
requireAuth(context: APIContext, options?: RequireAuthOptions): Promise<User>  
getSession(context: APIContext): Promise<Session | null>
```

#### Client-Side Functions (client.js)
```typescript
signIn(provider?: string, options?: SignInOptions): Promise<void>
signOut(options?: SignOutOptions): Promise<void>
redirectToSignIn(callbackUrl?: string): void
redirectToSignUp(callbackUrl?: string): void
redirectToAccount(callbackUrl?: string): void
```

#### Component Re-exports (components.js)
```typescript
export { SignIn, SignUp, UserButton, AccountSettings } from '@stackframe/stack-ui'
export { StackProvider } from '@stackframe/stack'
```

### 10. React Component Integration
- **Island Architecture**: Components work with all Astro hydration directives
- **Auto-renderer**: Integration adds React renderer automatically if `addReactRenderer: true`
- **Usage Pattern**: `<SignIn client:load />`, `<UserButton client:visible />`
- **Provider Context**: Components work within Stack Auth's context automatically

### 11. Development Experience Goals
- **5-minute setup**: From `npm install` to working auth
- **Intuitive API**: Follows Astro conventions and patterns
- **Clear errors**: Helpful messages for missing env vars and config issues
- **TypeScript first**: Full type safety throughout

### 12. Sprint Organization
**4 Sprints planned:**
1. **Sprint 001**: Foundation & Setup (Package structure, TypeScript, build system)
2. **Sprint 002**: Core Integration (Middleware, routes, config system)  
3. **Sprint 003**: Server-side Authentication (getUser, requireAuth, protected routes)
4. **Sprint 004**: Client-side & Components (signIn/signOut, React components)

### 13. GitHub Issue Organization
**18 total issues** organized as:
- **10 Feature issues** (#1-#10): User stories for each feature
- **8 Sprint/Task issues** (#11-#18): Implementation tasks

### 14. Testing Strategy
- **Markdown-doctest**: Executable specifications in `/spec/features/*.md`
- **Vitest**: Unit and integration tests
- **Astro Container API**: Testing Astro-specific functionality
- **Playwright**: End-to-end authentication flows

### 15. Inspired by auth-astro Architecture
- **Similar patterns**: Integration wrapping, route injection, middleware
- **Differences**: Targets Stack Auth instead of Auth.js/NextAuth
- **Learnings**: Environment configuration, TypeScript support, developer experience

### 16. Stack Auth Integration Points
- **SDK Wrapping**: Directly uses `@stackframe/stack` SDK methods
- **UI Components**: Re-exports `@stackframe/stack-ui` React components  
- **Session Management**: Leverages Stack Auth's built-in session handling
- **Security**: Uses Stack Auth's CSRF protection and secure defaults

### 17. Key Success Metrics
- **Installation**: Working auth in under 5 minutes
- **Performance**: Minimal bundle impact and runtime overhead
- **Compatibility**: Works with all Astro adapters and rendering modes
- **Type Safety**: Full TypeScript support throughout

### 18. Build & Development
- **Package.json scripts**: test, build, dev tooling configured
- **TypeScript**: Proper configuration with Astro types
- **Vitest**: Modern testing setup with coverage requirements
- **ESLint**: Code quality and consistency

## Current Project Status
- **Phase**: Specifications and planning complete
- **Ready for**: Sprint 001 implementation  
- **Repository**: Initialized with comprehensive specs and sprint planning
- **Issues**: All features and tasks mapped as GitHub issues

## Key Relationships

**auth-astro → astro-stack-auth**: Architectural pattern inspiration  
**@stackframe/stack → astro-stack-auth**: SDK dependency and wrapping  
**@stackframe/stack-ui → astro-stack-auth**: Component re-exports  
**Astro Integration API → astro-stack-auth**: Core integration mechanics  

This integration bridges Stack Auth's powerful authentication platform with Astro's performance-focused architecture, following proven patterns from the auth-astro community while providing Stack Auth's unique features like multi-tenancy, RBAC, and comprehensive dashboard.