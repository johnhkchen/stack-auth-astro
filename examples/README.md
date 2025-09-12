# Examples and Templates

This directory contains comprehensive examples and templates to help you quickly get started with `astro-stack-auth` in your projects.

## 📁 Directory Structure

```
examples/
├── minimal-astro/          # Basic integration example
├── full-featured/          # Complete authentication flows
├── components/             # React component examples
├── pages/                  # Astro page examples
├── configs/                # TypeScript configuration templates
├── deployments/            # Platform deployment guides
└── README.md              # This file
```

## 🚀 Quick Start Examples

### 1. Minimal Astro Project
**Perfect for**: Getting started, understanding basics, simple projects

```bash
# Copy the minimal example
cp -r examples/minimal-astro my-astro-auth-app
cd my-astro-auth-app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Stack Auth credentials

# Start development
npm run dev
```

**Features:**
- ✅ Basic Stack Auth integration
- ✅ Sign-in/sign-up pages
- ✅ Protected routes
- ✅ Server-side authentication
- ✅ Simple, clean implementation

### 2. Full-Featured Example
**Perfect for**: Production applications, learning advanced patterns, comprehensive features

```bash
# Copy the full-featured example
cp -r examples/full-featured my-production-app
cd my-production-app

# Install dependencies (includes Tailwind CSS)
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Stack Auth credentials

# Start development
npm run dev
```

**Features:**
- ✅ Complete authentication flows
- ✅ Styled UI with Tailwind CSS
- ✅ Dashboard and user management
- ✅ Custom React components
- ✅ Advanced hydration patterns
- ✅ Production-ready structure

## 🧩 Component Library

### React Components with Hydration Examples
Located in [`components/`](./components/)

```tsx
// Authentication buttons
import { SignInButton, SignOutButton } from './examples/components';

<SignInButton client:load provider="google" />
<SignOutButton client:visible redirectTo="/goodbye" />

// Status and conditional content
import { AuthStatus, ConditionalContent } from './examples/components';

<AuthStatus client:visible showDetails={true} />
<ConditionalContent client:idle requireAuth={true}>
  <ProtectedFeature />
</ConditionalContent>
```

**Available Components:**
- `SignInButton` - Customizable sign-in with provider support
- `SignOutButton` - Sign-out with redirect options
- `AuthStatus` - Display authentication state with loading
- `ConditionalContent` - Render content based on auth state

## 📄 Page Examples

### Astro Pages with Authentication Patterns
Located in [`pages/`](./pages/)

**Available Examples:**
- `middleware-example.astro` - Comparing `Astro.locals` vs `getUser()`
- `api-integration.astro` - Custom API routes and Stack Auth endpoints
- `hydration-patterns.astro` - Complete guide to React component hydration

```astro
---
// Copy any page to your project
import { getUser, requireAuth } from 'astro-stack-auth/server';

// Optional authentication
const user = await getUser(Astro);

// Required authentication (redirects if not authenticated)
const user = await requireAuth(Astro);

// Middleware-populated data
const user = Astro.locals.user;
const session = Astro.locals.session;
---
```

## ⚙️ Configuration Templates

### TypeScript Configurations
Located in [`configs/`](./configs/)

Choose the TypeScript configuration that matches your project needs:

```bash
# Recommended for most projects
cp examples/configs/tsconfig.recommended.json tsconfig.json

# Maximum type safety for production
cp examples/configs/tsconfig.strict.json tsconfig.json

# Rapid prototyping with minimal type checking
cp examples/configs/tsconfig.loose.json tsconfig.json

# Modern bundler optimization
cp examples/configs/tsconfig.bundler.json tsconfig.json

# Node.js 16+ compatibility
cp examples/configs/tsconfig.node16.json tsconfig.json
```

| Configuration | Type Safety | Performance | Use Case |
|---------------|-------------|-------------|----------|
| `recommended` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Most projects |
| `strict` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Production apps |
| `loose` | ⭐⭐ | ⭐⭐⭐⭐⭐ | Prototyping |
| `bundler` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Modern tooling |
| `node16` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Node.js compat |

## 🚀 Deployment Guides

### Platform-Specific Deployment
Located in [`deployments/`](./deployments/)

**Available Platforms:**
- [**Netlify**](./deployments/netlify.md) - Serverless with automatic Git deployments
- [**Vercel**](./deployments/vercel.md) - Edge functions with analytics integration
- [**Node.js**](./deployments/nodejs.md) - Self-hosted with Docker, PM2, systemd

```bash
# Quick deployment setup
# 1. Choose your platform
# 2. Follow the specific deployment guide
# 3. Configure environment variables
# 4. Deploy and test
```

| Platform | Complexity | Cost | Auto-scaling | Best For |
|----------|------------|------|--------------|----------|
| **Netlify** | 🟢 Simple | 💰 Medium | ✅ Yes | JAMstack |
| **Vercel** | 🟢 Simple | 💰 Medium | ✅ Yes | Performance |
| **Node.js** | 🔴 Complex | 💚 Low | ❌ Manual | Enterprise |

## 🛠️ Integration Patterns

### Common Integration Scenarios

#### 1. Adding Auth to Existing Astro Project
```bash
# Install astro-stack-auth
npm install astro-stack-auth

# Copy configuration from examples
cp examples/minimal-astro/astro.config.mjs .
cp examples/minimal-astro/.env.example .env

# Copy pages you need
cp examples/minimal-astro/src/pages/signin.astro src/pages/
cp examples/minimal-astro/src/pages/signup.astro src/pages/
```

#### 2. Custom Component Integration
```tsx
// Use example components as starting points
import { AuthStatus } from '../examples/components/AuthStatus';

// Customize for your needs
export const CustomAuthWidget = () => (
  <div className="my-custom-styles">
    <AuthStatus showDetails={true} />
  </div>
);
```

#### 3. API Route Patterns
```typescript
// Copy API patterns from examples
// src/pages/api/protected.ts
import type { APIRoute } from 'astro';
import { getUser } from 'astro-stack-auth/server';

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
  
  return new Response(JSON.stringify({ 
    message: 'Protected data',
    userId: user.id 
  }));
};
```

## 🔧 Customization Guide

### Adapting Examples for Your Project

#### 1. Styling and Theming
```bash
# For Tailwind CSS projects
cp -r examples/full-featured/* your-project/
# Customize tailwind.config.mjs for your design system

# For custom CSS projects
cp -r examples/minimal-astro/* your-project/
# Replace classes with your CSS framework
```

#### 2. Authentication Flows
```astro
---
// Customize redirect URLs
const user = await requireAuth(Astro, {
  redirectTo: '/custom-signin',
  callbackUrl: '/custom-dashboard'
});
---
```

#### 3. Component Hydration
```astro
<!-- Adjust hydration based on your performance needs -->

<!-- Critical auth components -->
<SignIn client:load />

<!-- Above-the-fold UI -->
<UserButton client:visible />

<!-- Enhancement features -->
<AccountSettings client:idle />

<!-- Responsive components -->
<DesktopNav client:media="(min-width: 768px)" />
```

## 📋 Testing with Examples

### Development Testing
```bash
# Test minimal example
cd examples/minimal-astro
npm install
npm run dev

# Test full-featured example
cd examples/full-featured
npm install
npm run dev

# Test deployment configurations
# Follow deployment guides in examples/deployments/
```

### Production Testing
```bash
# Build and preview
npm run build
npm run preview

# Test authentication flows
curl http://localhost:4321/handler/user
curl http://localhost:4321/api/protected
```

## 🔍 Example Use Cases

### Small Business Website
**Recommended**: `minimal-astro` + `configs/tsconfig.recommended.json` + `deployments/netlify.md`

```bash
cp -r examples/minimal-astro business-site
cp examples/configs/tsconfig.recommended.json business-site/tsconfig.json
# Follow Netlify deployment guide
```

### SaaS Application
**Recommended**: `full-featured` + `configs/tsconfig.strict.json` + `deployments/vercel.md`

```bash
cp -r examples/full-featured saas-app
cp examples/configs/tsconfig.strict.json saas-app/tsconfig.json
# Follow Vercel deployment guide
```

### Enterprise Application
**Recommended**: `full-featured` + `configs/tsconfig.strict.json` + `deployments/nodejs.md`

```bash
cp -r examples/full-featured enterprise-app
cp examples/configs/tsconfig.strict.json enterprise-app/tsconfig.json
# Follow Node.js deployment guide with Docker
```

### Rapid Prototype
**Recommended**: `minimal-astro` + `configs/tsconfig.loose.json` + local development

```bash
cp -r examples/minimal-astro prototype
cp examples/configs/tsconfig.loose.json prototype/tsconfig.json
cd prototype && npm install && npm run dev
```

## 📚 Learning Path

### Beginner
1. Start with `minimal-astro` example
2. Read `pages/middleware-example.astro`
3. Try `components/` examples
4. Deploy to Netlify

### Intermediate
1. Explore `full-featured` example
2. Study `pages/hydration-patterns.astro`
3. Customize TypeScript configuration
4. Deploy to Vercel with custom domain

### Advanced
1. Build custom components using examples as reference
2. Implement custom API routes
3. Set up Node.js deployment with Docker
4. Add monitoring and analytics

## 🤝 Contributing Examples

Found an issue or want to add an example?

1. **Bug Reports**: Open an issue with the specific example
2. **New Examples**: Submit a PR with documentation
3. **Improvements**: Suggest enhancements to existing examples

### Example Contribution Template
```
examples/
├── your-example/
│   ├── README.md           # Clear documentation
│   ├── package.json        # Complete dependencies
│   ├── astro.config.mjs    # Astro configuration
│   ├── .env.example        # Environment template
│   └── src/                # Source code
```

These examples provide a comprehensive foundation for implementing authentication in your Astro applications with Stack Auth, covering everything from basic integration to production deployment.