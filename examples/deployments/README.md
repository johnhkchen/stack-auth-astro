# Deployment Examples

This directory contains comprehensive deployment guides for deploying Astro + Stack Auth applications to various platforms and environments.

## Available Deployment Guides

### ☁️ Cloud Platforms

#### [Netlify](./netlify.md)
Complete guide for deploying to Netlify with serverless functions.

**Key Features:**
- Automatic Git deployments
- Environment variable management
- Custom domain configuration
- CDN and edge optimization
- Build optimization strategies

**Best For:**
- JAMstack applications
- Static site generation with dynamic auth
- Teams wanting simple Git-based deployments
- Projects needing global CDN distribution

#### [Vercel](./vercel.md)
Comprehensive guide for Vercel deployment with edge functions.

**Key Features:**
- Edge runtime optimization
- Advanced analytics integration
- Preview deployments
- Function performance tuning
- Custom domain management

**Best For:**
- Next.js-like deployment experience
- Teams using Vercel ecosystem
- Applications requiring edge computing
- Performance-critical applications

#### [Node.js](./nodejs.md)
Complete guide for self-hosted Node.js deployments.

**Key Features:**
- VPS/dedicated server deployment
- Docker containerization
- Process management (PM2, systemd)
- Reverse proxy configuration (Nginx, Apache)
- Security hardening

**Best For:**
- Self-hosted infrastructure
- Enterprise environments
- Custom server configurations
- Cost-sensitive deployments

## Quick Comparison

| Platform | Complexity | Cost | Performance | Scalability | Control |
|----------|------------|------|-------------|-------------|---------|
| **Netlify** | 🟢 Low | 🟡 Medium | 🟢 Good | 🟢 Auto | 🟡 Medium |
| **Vercel** | 🟢 Low | 🟡 Medium | 🟢 Excellent | 🟢 Auto | 🟡 Medium |
| **Node.js** | 🔴 High | 🟢 Low | 🟡 Variable | 🟡 Manual | 🟢 Full |

## Common Configuration

### Required Environment Variables
All platforms require these Stack Auth environment variables:

```bash
STACK_PROJECT_ID=your-project-id
STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-client-key
STACK_SECRET_SERVER_KEY=your-secret-server-key
```

### Optional Environment Variables
```bash
STACK_AUTH_PREFIX=/handler          # Custom auth endpoint prefix
NODE_ENV=production                 # Production environment
DEBUG=false                         # Disable debug logging
```

### Base Astro Configuration
```javascript
// astro.config.mjs - Base configuration for all platforms
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  output: 'server', // Required for all deployments
  integrations: [
    react(),
    stackAuth({
      // Environment variables auto-detected
    })
  ]
});
```

## Platform-Specific Adapters

### Netlify
```javascript
import netlify from '@astrojs/netlify';

export default defineConfig({
  adapter: netlify(),
  // ... rest of config
});
```

### Vercel
```javascript
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  adapter: vercel(),
  // ... rest of config
});
```

### Node.js
```javascript
import node from '@astrojs/node';

export default defineConfig({
  adapter: node({
    mode: 'standalone'
  }),
  // ... rest of config
});
```

## Security Considerations

### Environment Variables
- ✅ Use platform-provided environment variable encryption
- ✅ Never commit secrets to version control
- ✅ Rotate API keys regularly
- ✅ Use different keys for development/staging/production

### Headers Configuration
All platforms should implement security headers:

```javascript
// Common security headers for all platforms
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
```

### SSL/HTTPS
- ✅ All platforms provide automatic HTTPS
- ✅ Update Stack Auth URLs to use HTTPS
- ✅ Configure HSTS headers
- ✅ Use secure cookie settings

## Performance Optimization

### Build Optimization
```json
{
  "scripts": {
    "build": "astro check && astro build",
    "build:analyze": "astro build --analyze",
    "build:production": "NODE_ENV=production astro build"
  }
}
```

### Caching Strategies
```javascript
// Static asset caching (adapt per platform)
const cacheConfig = {
  '*.js': 'public, max-age=31536000, immutable',
  '*.css': 'public, max-age=31536000, immutable',
  '*.png': 'public, max-age=2592000',
  '/api/*': 'no-cache, no-store, must-revalidate'
};
```

### Bundle Size Optimization
```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    minify: true,
    target: 'es2020'
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'auth': ['astro-stack-auth'],
            'react': ['react', 'react-dom']
          }
        }
      }
    }
  }
});
```

## Monitoring and Analytics

### Health Checks
Implement health check endpoints for all platforms:

```typescript
// src/pages/api/health.ts
export const GET = () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Error Tracking
Consider integrating error tracking:

```javascript
// Common error tracking setup
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 0.1,
});
```

## Deployment Checklist

### Pre-deployment
- [ ] Test authentication flows locally
- [ ] Verify environment variables are set
- [ ] Run type checking: `npm run astro check`
- [ ] Test build process: `npm run build`
- [ ] Verify Stack Auth configuration

### Platform Setup
- [ ] Configure deployment platform account
- [ ] Set up Git integration (if applicable)
- [ ] Configure environment variables
- [ ] Set up custom domain (if needed)
- [ ] Configure SSL certificates

### Stack Auth Configuration
- [ ] Update callback URLs in Stack Auth dashboard
- [ ] Verify redirect URLs match deployment domain
- [ ] Test authentication flows on deployed site
- [ ] Configure OAuth providers (if used)
- [ ] Set up webhook endpoints (if needed)

### Post-deployment
- [ ] Test all authentication flows
- [ ] Verify environment-specific configurations
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategies
- [ ] Document deployment process

## Troubleshooting

### Common Issues

#### Authentication Callback Errors
**Problem**: Authentication redirects fail after deployment

**Solutions**:
1. Verify callback URLs in Stack Auth dashboard match deployed domain
2. Check HTTPS configuration
3. Ensure auth endpoints are properly configured

#### Environment Variable Issues
**Problem**: Authentication fails with credential errors

**Solutions**:
1. Verify all required environment variables are set
2. Check for typos in variable names
3. Ensure variables are available in the correct environment (production/preview)

#### Build Failures
**Problem**: Deployment fails during build process

**Solutions**:
1. Test build locally: `npm run build`
2. Check for TypeScript errors: `npm run astro check`
3. Verify all dependencies are in package.json
4. Check platform-specific build logs

#### Performance Issues
**Problem**: Slow authentication or page loads

**Solutions**:
1. Implement proper caching strategies
2. Optimize bundle size
3. Use appropriate hydration strategies
4. Consider platform-specific optimizations

## Migration Between Platforms

### From Development to Production
1. Update environment variables for production Stack Auth project
2. Configure production domain in Stack Auth dashboard
3. Test authentication flows thoroughly
4. Set up monitoring and error tracking

### Between Cloud Platforms
1. Export environment variables from current platform
2. Set up new platform with same configuration
3. Update DNS records for custom domains
4. Test thoroughly before switching traffic

Each deployment guide provides detailed, platform-specific instructions with security best practices, performance optimizations, and troubleshooting guidance to ensure successful deployment of your Astro + Stack Auth application.