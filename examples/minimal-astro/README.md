# Minimal Astro + Stack Auth Example

This is a minimal example showing how to integrate Stack Auth with an Astro project.

## 🚀 Quick Start (Automatic Setup)

For the fastest setup experience, run the automated setup script:

```bash
# One-command setup
./scripts/setup-example.sh
```

This will:
- Install dependencies automatically
- Create and configure your `.env` file
- Guide you through Stack Auth credential setup
- Provide helpful next steps

## 📝 Manual Setup

If you prefer manual setup:

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

## ⚡ Zero-Config Testing

**New!** This example now works out-of-the-box without any manual setup:

```bash
npm install
npm run build    # Works immediately with test defaults!
```

When no `.env` file exists, the integration automatically:
- ✅ Provides test environment variables
- ✅ Enables test mode to bypass validation
- ✅ Allows building and development without configuration

Perfect for:
- 📦 Fresh repository clones
- 🔄 CI/CD pipelines  
- 👀 Quick evaluation and testing

## Testing

For CI/CD or testing purposes, you can build the project with mock Stack Auth environment variables:

```bash
npm run build:test
```

This uses the mock credentials from `.env.test` and enables test mode to skip validation of unimplemented Sprint 002 features. Production builds still require real environment variables.

## Performance Monitoring

This example includes build performance analysis and budget monitoring to ensure optimal bundle sizes:

### Build Analysis

Run build analysis to examine bundle sizes and get optimization recommendations:

```bash
npm run build:analyze
```

This will:
- Build the project with test credentials
- Analyze the build output (HTML, JavaScript, CSS, assets)
- Compare against performance budgets
- Provide Astro-specific optimization recommendations

### Performance Budgets

The example has configured performance budgets in `performance-budgets.json`:

- **Total Size**: 2MB max (1.5MB warning)
- **Client JavaScript**: 800KB max (600KB warning)
- **HTML Pages**: 500KB max (300KB warning)
- **CSS**: 200KB max (150KB warning)
- **Assets**: 500KB max (300KB warning)

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

## Features Demonstrated

- ✅ Basic Stack Auth integration with Astro
- ✅ Server-side authentication with `getUser()` and `requireAuth()`
- ✅ Sign in and sign up pages with Stack Auth components
- ✅ Protected routes that require authentication
- ✅ Account settings page
- ✅ Client-side component hydration

## Key Files

- `astro.config.mjs` - Astro configuration with Stack Auth integration
- `src/pages/index.astro` - Homepage with authentication state
- `src/pages/signin.astro` - Sign in page using Stack Auth components
- `src/pages/signup.astro` - Sign up page using Stack Auth components
- `src/pages/protected.astro` - Protected page requiring authentication
- `src/pages/account.astro` - Account settings page

## Authentication Flow

1. Users visit the homepage and see their authentication state
2. Unauthenticated users can click "Sign In" or "Sign Up"
3. Stack Auth components handle the authentication process
4. Authenticated users can access protected pages and account settings
5. Users can sign out using the sign out button

## Next Steps

- Customize the UI styling to match your brand
- Add more protected pages and features
- Configure additional Stack Auth options
- Deploy to your preferred hosting platform

For a more comprehensive example, see the `full-featured` example in this repository.