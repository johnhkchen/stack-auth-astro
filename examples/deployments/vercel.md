# Deploying Astro + Stack Auth to Vercel

This guide shows how to deploy your Astro + Stack Auth application to Vercel.

## Prerequisites

- Vercel account
- Stack Auth project configured
- Git repository with your Astro project

## Configuration Files

### astro.config.mjs
```javascript
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import react from '@astrojs/react';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true }, // Optional: Enable Vercel Analytics
    speedInsights: { enabled: true }, // Optional: Enable Speed Insights
  }),
  integrations: [
    react(),
    stackAuth({
      // Environment variables will be configured in Vercel dashboard
    })
  ]
});
```

### vercel.json (Optional)
```json
{
  "functions": {
    "src/pages/api/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/handler/(.*)",
      "destination": "/api/handler/$1"
    }
  ]
}
```

## Environment Variables

Set these in your Vercel dashboard under **Settings > Environment Variables**:

### Required Variables
```bash
STACK_PROJECT_ID=your-project-id
STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-client-key
STACK_SECRET_SERVER_KEY=your-secret-server-key
```

### Optional Variables
```bash
STACK_AUTH_PREFIX=/handler
NODE_ENV=production
VERCEL_ENV=production
```

## Deployment Steps

### 1. Install Dependencies
```bash
npm install @astrojs/vercel
```

### 2. Update package.json
```json
{
  "scripts": {
    "build": "astro check && astro build",
    "preview": "astro preview",
    "dev": "astro dev"
  },
  "dependencies": {
    "@astrojs/vercel": "^7.8.2",
    "astro": "^5.13.7",
    "astro-stack-auth": "^0.1.0"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 3. Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### 4. Deploy via Git Integration
1. Connect your repository to Vercel
2. Configure build settings:
   - **Framework Preset**: Astro
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

## URL Configuration

### Stack Auth Dashboard
Update your Stack Auth project settings:
- **Sign-in URL**: `https://your-project.vercel.app/signin`
- **Callback URLs**: `https://your-project.vercel.app/handler/callback`
- **Sign-out URL**: `https://your-project.vercel.app/`

### Custom Domain
If using a custom domain:
1. Add domain in Vercel dashboard
2. Update Stack Auth URLs to use your custom domain
3. Configure DNS records as instructed by Vercel

## Advanced Configuration

### Edge Runtime (Optional)
For better performance in some regions:

```javascript
// astro.config.mjs
export default defineConfig({
  output: 'server',
  adapter: vercel({
    edgeMiddleware: true, // Enable edge middleware
    functionPerRoute: false, // Use single function for better cold start
  }),
  // ... rest of config
});
```

### Custom API Routes
```typescript
// src/pages/api/custom-auth.ts
import type { APIRoute } from 'astro';
import { getUser } from 'astro-stack-auth/server';

export const runtime = 'edge'; // Optional: Use edge runtime

export const GET: APIRoute = async (context) => {
  const user = await getUser(context);
  
  return new Response(JSON.stringify({
    authenticated: !!user,
    userId: user?.id || null
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
```

### Performance Optimization
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'server',
  adapter: vercel({
    analytics: true,
    speedInsights: true,
    webAnalytics: { enabled: true },
    isr: {
      // Incremental Static Regeneration for public pages
      expiration: 60,
      bypassToken: process.env.ISR_BYPASS_TOKEN,
    }
  }),
  // ... rest of config
});
```

## Troubleshooting

### Common Issues

#### 1. 404 Errors on Authentication Routes
**Problem**: `/handler/*` routes return 404

**Solution**: Ensure Astro config uses serverless adapter and routes are properly handled:
```javascript
// Verify adapter configuration
adapter: vercel({
  functionPerRoute: false // Important for auth routes
})
```

#### 2. Cold Start Performance
**Problem**: Slow authentication responses

**Solutions**:
- Use `functionPerRoute: false` to reduce cold starts
- Consider edge runtime for auth endpoints
- Implement proper caching strategies

#### 3. Environment Variables
**Problem**: Variables not available during build/runtime

**Solutions**:
- Set variables in Vercel dashboard for all environments (Development, Preview, Production)
- Use `VERCEL_ENV` to detect environment
- Redeploy after adding new variables

#### 4. Build Timeouts
**Problem**: Build exceeds time limits

**Solutions**:
```json
// vercel.json
{
  "functions": {
    "src/pages/**/*.astro": {
      "maxDuration": 30
    }
  },
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ]
}
```

## Security Configuration

### Headers and Security
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://api.stack-auth.com; connect-src 'self' https://api.stack-auth.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
        }
      ]
    }
  ]
}
```

### Environment Security
- Use Vercel's encrypted environment variables
- Enable branch protection for production deployments
- Use preview deployments for testing
- Monitor function logs for security events

## Monitoring and Performance

### Vercel Analytics Integration
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  adapter: vercel({
    webAnalytics: { enabled: true },
    speedInsights: { enabled: true },
    analytics: true,
  }),
  // ... rest of config
});
```

### Custom Monitoring
```typescript
// src/middleware.ts
import type { MiddlewareResponseHandler } from 'astro';

export const onRequest: MiddlewareResponseHandler = async (context, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  
  // Log performance metrics for authentication routes
  if (context.url.pathname.startsWith('/handler/')) {
    console.log(`Auth route ${context.url.pathname}: ${duration}ms`);
  }
  
  return response;
};
```

## Cost Optimization

### Function Configuration
```json
{
  "functions": {
    "src/pages/handler/*.ts": {
      "memory": 128,
      "maxDuration": 10
    },
    "src/pages/api/*.ts": {
      "memory": 256,
      "maxDuration": 30
    }
  }
}
```

### Caching Strategy
```typescript
// Cache static authentication pages
export const prerender = true; // For sign-in/sign-up pages

// Cache API responses appropriately
export const GET: APIRoute = async (context) => {
  const response = new Response(data);
  response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  return response;
};
```

## Example Repository Structure
```
your-astro-project/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   └── custom-auth.ts
│   │   ├── signin.astro
│   │   └── dashboard.astro
│   └── middleware.ts
├── astro.config.mjs
├── vercel.json
├── package.json
└── README.md
```

This configuration provides a scalable, secure, and cost-effective deployment of your Astro + Stack Auth application on Vercel with optimal performance and monitoring capabilities.