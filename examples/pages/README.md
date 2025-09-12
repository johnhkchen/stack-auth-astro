# Example Astro Pages

This directory contains example Astro pages demonstrating various authentication patterns and integration techniques with Stack Auth.

## Available Examples

### 🔧 middleware-example.astro
Demonstrates how Stack Auth middleware populates `Astro.locals` and compares different methods of accessing authentication data.

**Key Features:**
- Side-by-side comparison of `Astro.locals.user` vs `getUser()`
- Session data access via `Astro.locals.session`
- Performance and usage recommendations
- Data consistency verification

**Usage:**
```astro
---
// Method 1: Via middleware (recommended for multiple uses)
const user = Astro.locals.user;
const session = Astro.locals.session;

// Method 2: Via function (recommended for single use)
const user = await getUser(Astro);
---
```

### 🔌 api-integration.astro
Comprehensive guide to integrating with Stack Auth APIs and creating custom API routes.

**Key Features:**
- Built-in Stack Auth endpoint documentation
- Interactive API testing interface
- Custom API route examples (protected and public)
- Frontend integration patterns
- Security best practices

**Usage:**
```typescript
// Custom protected API route
export const GET: APIRoute = async (context) => {
  const user = await getUser(context);
  if (!user) {
    return new Response(JSON.stringify({
      error: 'Authentication required',
      message: 'You must be signed in to access this resource',
      statusCode: 401
    }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
  
  return new Response(JSON.stringify({ data: "protected" }));
};
```

### 🏝️ hydration-patterns.astro
Detailed exploration of React component hydration strategies with Stack Auth components.

**Key Features:**
- Complete guide to `client:load`, `client:visible`, `client:idle`, `client:media`
- Performance comparison and recommendations
- Real-world usage examples
- Best practices and anti-patterns
- Interactive demonstrations

**Usage:**
```astro
<!-- Critical authentication components -->
<SignIn client:load />

<!-- Navigation and UI elements -->
<UserButton client:visible />

<!-- Enhancement features -->
<AccountSettings client:idle />

<!-- Responsive components -->
<DesktopNav client:media="(min-width: 768px)" />
```

## Integration Patterns

### Server-Side Authentication
All examples demonstrate proper server-side authentication patterns:

```astro
---
import { getUser, requireAuth } from 'astro-stack-auth/server';

// Optional authentication
const user = await getUser(Astro);

// Required authentication (redirects if not authenticated)
const user = await requireAuth(Astro);

// Middleware-populated (available after integration setup)
const user = Astro.locals.user;
const session = Astro.locals.session;
---
```

### Client-Side Integration
Examples show proper client-side integration with React components:

```astro
---
import { SignIn, UserButton, AccountSettings } from 'astro-stack-auth/components';
import { AuthStatus } from '../components/AuthStatus';
---

<!-- Stack Auth components with hydration -->
<SignIn client:load />
<UserButton client:visible />
<AccountSettings client:idle />

<!-- Custom components with hydration -->
<AuthStatus client:visible showDetails={true} />
```

### API Route Patterns
Examples include comprehensive API integration patterns:

```typescript
// Protected API route
export const GET: APIRoute = async (context) => {
  const user = await getUser(context);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ 
    message: 'Protected data',
    userId: user.id 
  }));
};

// Public API route with optional auth
export const GET: APIRoute = async (context) => {
  const user = await getUser(context);
  
  return new Response(JSON.stringify({
    message: 'Public data',
    authenticated: !!user,
    userId: user?.id || null
  }));
};
```

## Performance Considerations

### Hydration Strategy Guide

| Strategy | Use Case | Performance Impact |
|----------|----------|-------------------|
| `client:load` | Critical auth components | ⚠️ High - loads immediately |
| `client:visible` | Navigation, UI elements | ✅ Good - deferred until visible |
| `client:idle` | Enhancement features | ✅ Best - lowest impact |
| `client:media` | Responsive components | ✅ Good - conditional loading |

### Best Practices

1. **Minimize `client:load` usage** - Only for truly critical components
2. **Prefer `client:visible`** for most interactive elements
3. **Use `client:idle`** for secondary features
4. **Consider `client:media`** for responsive designs
5. **Measure performance impact** of hydration choices

## Usage in Your Project

### 1. Copy Relevant Examples
```bash
# Copy specific patterns you need
cp examples/pages/middleware-example.astro src/pages/
cp examples/pages/api-integration.astro src/pages/
```

### 2. Adapt for Your Use Case
- Modify styling to match your design system
- Adjust hydration strategies based on your performance needs
- Customize authentication flows for your application logic

### 3. Extend with Your Features
- Add role-based access control
- Implement team/organization features
- Create custom authentication workflows

## Testing Examples

These examples can be used for testing and validation:

```bash
# Test server-side authentication
curl http://localhost:4321/middleware-example

# Test API endpoints
curl http://localhost:4321/handler/user

# Test custom API routes
curl http://localhost:4321/api/protected
```

## Security Notes

All examples follow security best practices:
- ✅ Proper authentication validation
- ✅ Graceful error handling
- ✅ No sensitive data exposure
- ✅ CSRF protection via Stack Auth
- ✅ Secure session management

These examples provide a solid foundation for implementing authentication in your Astro + Stack Auth application while maintaining security and performance best practices.