# Full-Featured Astro + Stack Auth Example

This is a comprehensive example showcasing advanced Stack Auth integration with Astro, including styled components, protected routes, and various authentication patterns.

## Features

- ✅ Complete authentication flow with styled UI (Tailwind CSS)
- ✅ Navigation with authentication state
- ✅ Dashboard with user information
- ✅ Profile page with user data display
- ✅ Account settings with Stack Auth components
- ✅ Protected routes and middleware
- ✅ Custom React components with proper hydration
- ✅ Responsive design and modern UI patterns

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Stack Auth credentials:
   - `STACK_PROJECT_ID` - Your project ID from Stack Auth dashboard
   - `STACK_PUBLISHABLE_CLIENT_KEY` - Your publishable client key
   - `STACK_SECRET_SERVER_KEY` - Your secret server key

## Testing

For CI/CD or testing purposes, you can build the project with mock Stack Auth environment variables:

```bash
npm run build:test
```

This uses the mock credentials from `.env.test` and enables test mode to skip validation of unimplemented Sprint 002 features. Production builds still require real environment variables.

## Performance Monitoring

This example includes comprehensive build performance analysis with budgets optimized for a full-featured application with Tailwind CSS:

### Build Analysis

Run build analysis to examine bundle sizes and get optimization recommendations:

```bash
npm run build:analyze
```

This will:
- Build the project with test credentials
- Analyze the build output (HTML, JavaScript, CSS, assets)
- Compare against performance budgets for full-featured apps
- Provide Astro-specific optimization recommendations

### Performance Budgets

The example has configured performance budgets in `performance-budgets.json` for larger applications:

- **Total Size**: 3MB max (2.5MB warning) - accounts for Tailwind CSS
- **Client JavaScript**: 1.2MB max (1MB warning) - includes React components
- **HTML Pages**: 600KB max (400KB warning)
- **CSS**: 400KB max (300KB warning) - includes Tailwind CSS
- **Assets**: 800KB max (600KB warning)

### Optimization Recommendations

The analyzer provides specific recommendations for Astro + Tailwind applications:

- Using `client:idle` or `client:visible` directives to reduce initial JS bundle
- CSS optimization with Tailwind's purge/JIT features
- Image optimization with `@astrojs/image`
- Code splitting strategies for larger applications

### CI Integration

For continuous integration, the build analysis outputs JSON metrics:

```bash
OUTPUT_JSON=true npm run build:analyze
```

Use `build:budget:strict` for strict budget enforcement in CI/CD:

```bash
npm run build:budget:strict
```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── layouts/
│   └── Layout.astro          # Main layout with navigation
├── pages/
│   ├── index.astro          # Homepage with auth state
│   ├── signin.astro         # Sign in page
│   ├── signup.astro         # Sign up page
│   ├── dashboard.astro      # Protected dashboard
│   ├── profile.astro        # User profile page
│   └── settings.astro       # Account settings
├── components/
│   ├── UserButton.tsx       # Custom user button component
│   └── ProtectedContent.tsx # Client-side protected content
```

## Key Features Demonstrated

### 1. Server-Side Authentication
- `getUser()` for optional authentication checks
- `requireAuth()` for required authentication with automatic redirects
- Middleware integration for populating `Astro.locals`

### 2. React Component Integration
- Stack Auth components with proper hydration
- Custom React components with TypeScript
- Client-side authentication state management

### 3. Styling and UI
- Tailwind CSS for modern, responsive design
- Consistent navigation and layout
- Professional authentication flows

### 4. Protected Routes
- Server-side protection with `requireAuth()`
- Client-side protection with React components
- Graceful handling of unauthenticated users

### 5. User Experience
- Intuitive navigation based on auth state
- Clear feedback for authentication status
- Responsive design for all screen sizes

## Configuration Options

The `astro.config.mjs` demonstrates advanced configuration:

```javascript
stackAuth({
  authPrefix: '/auth',        // Custom auth endpoint prefix
  addReactRenderer: true,     // Auto-add React renderer
  // Additional Stack Auth options...
})
```

## Deployment

This example works with all Astro adapters that support server-side rendering:

- **Node.js**: `@astrojs/node`
- **Netlify**: `@astrojs/netlify`
- **Vercel**: `@astrojs/vercel`
- **Cloudflare**: `@astrojs/cloudflare`

See the deployment examples in the `examples/configs/` directory.

## Next Steps

- Customize the styling to match your brand
- Add role-based access control (RBAC)
- Implement team/organization features
- Add more protected routes and features
- Configure additional OAuth providers
- Set up email templates and branding

For a simpler starting point, see the `minimal-astro` example in this repository.