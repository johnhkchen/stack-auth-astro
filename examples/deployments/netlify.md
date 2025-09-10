# Deploying Astro + Stack Auth to Netlify

This guide shows how to deploy your Astro + Stack Auth application to Netlify.

## Prerequisites

- Netlify account
- Stack Auth project configured
- Git repository with your Astro project

## Configuration Files

### astro.config.mjs
```javascript
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [
    react(),
    stackAuth({
      // Environment variables will be configured in Netlify dashboard
    })
  ]
});
```

### netlify.toml
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/handler/*"
  to = "/.netlify/functions/entry"
  status = 200
  force = true

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Environment Variables

Set these in your Netlify dashboard under **Site settings > Environment variables**:

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
```

## Deployment Steps

### 1. Install Dependencies
```bash
npm install @astrojs/netlify
```

### 2. Update package.json
```json
{
  "scripts": {
    "build": "astro check && astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/netlify": "^5.5.3",
    "astro": "^5.13.7",
    "astro-stack-auth": "^0.1.0"
  }
}
```

### 3. Deploy via Git
```bash
# Connect your repository to Netlify
# Build settings:
# - Build command: npm run build
# - Publish directory: dist
# - Node version: 18
```

### 4. Configure Environment Variables
In Netlify dashboard:
1. Go to **Site settings > Environment variables**
2. Add your Stack Auth credentials
3. Trigger a new build

## URL Configuration

### Stack Auth Dashboard
Update your Stack Auth project settings:
- **Sign-in URL**: `https://your-site.netlify.app/signin`
- **Callback URLs**: `https://your-site.netlify.app/handler/callback`
- **Sign-out URL**: `https://your-site.netlify.app/`

### Custom Domain (Optional)
If using a custom domain:
1. Configure domain in Netlify
2. Update Stack Auth URLs to use your custom domain
3. Ensure SSL certificate is active

## Advanced Configuration

### Edge Functions (Optional)
For enhanced performance, you can use Netlify Edge Functions:

```javascript
// netlify/edge-functions/auth.js
export default async (request, context) => {
  // Custom auth logic that runs at the edge
  // Useful for A/B testing auth flows or geo-specific redirects
  return context.next();
};

export const config = {
  path: "/handler/*"
};
```

### Build Optimization
```toml
# netlify.toml
[build]
  command = "npm run build"
  
[build.processing]
  skip_processing = false

[build.processing.css]
  bundle = true
  minify = true

[build.processing.js]
  bundle = true
  minify = true
```

## Troubleshooting

### Common Issues

#### 1. 404 Errors on Authentication Routes
**Problem**: `/handler/*` routes return 404

**Solution**: Ensure redirect rules in `netlify.toml` are correct:
```toml
[[redirects]]
  from = "/handler/*"
  to = "/.netlify/functions/entry"
  status = 200
  force = true
```

#### 2. Environment Variables Not Working
**Problem**: Authentication fails with invalid credentials

**Solutions**:
- Verify variables are set in Netlify dashboard
- Check variable names match exactly
- Redeploy after adding variables

#### 3. Build Failures
**Problem**: Build fails during deployment

**Solutions**:
- Ensure Node.js version is 18+
- Check for TypeScript errors: `npm run build` locally
- Verify all dependencies are in `package.json`

#### 4. CORS Issues
**Problem**: Authentication callbacks fail due to CORS

**Solution**: Update Stack Auth project URLs to match your Netlify domain exactly

## Performance Optimization

### Caching Strategy
```toml
# netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Function Optimization
```toml
[functions]
  node_bundler = "esbuild"
  
[build.environment]
  AWS_LAMBDA_JS_RUNTIME = "nodejs18.x"
```

## Security Considerations

### Headers Configuration
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

### Environment Security
- Use Netlify's encrypted environment variables
- Never commit secrets to your repository
- Rotate API keys regularly
- Monitor access logs for suspicious activity

## Monitoring and Analytics

### Build Notifications
Configure build notifications in Netlify to monitor deployment status.

### Error Tracking
Consider integrating error tracking services:
```javascript
// In your Astro components
import * as Sentry from '@sentry/astro';

// Configure error tracking for authentication flows
```

## Example Repository Structure
```
your-astro-project/
├── src/
│   ├── pages/
│   │   ├── signin.astro
│   │   └── dashboard.astro
│   └── layouts/
├── astro.config.mjs
├── netlify.toml
├── package.json
└── README.md
```

This configuration provides a robust, secure, and performant deployment of your Astro + Stack Auth application on Netlify.