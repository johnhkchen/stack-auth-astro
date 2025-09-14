# Alpha Test Project - Stack Auth for Astro

> 🚀 **Standalone testing environment** for the `astro-stack-auth` integration during alpha development.

This project provides a complete, self-contained environment for testing all Stack Auth features with Astro before the package is published to npm.

## Quick Start

### 1. Install astro-stack-auth

Choose one of these installation methods:

#### Option A: Install from GitHub (Recommended)
```bash
npm install github:johnhkchen/stack-auth-astro
```

#### Option B: Local Development (Contributors)
```bash
# In the main project root
cd ../..  # Go to stack-auth-astro root
npm run build
npm link

# Back to this project
cd examples/alpha-test-project
npm link astro-stack-auth
```

#### Option C: Local Tarball
```bash
# In the main project root  
cd ../..
npm run package  # Creates astro-stack-auth-0.1.0.tgz

# Back to this project
cd examples/alpha-test-project
npm install ../../astro-stack-auth-0.1.0.tgz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Stack Auth

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Get your Stack Auth credentials:**
   - Visit [Stack Auth Dashboard](https://app.stack-auth.com/dashboard)
   - Create a new project or select an existing one
   - Copy the API keys from your project settings

3. **Configure `.env` file:**
   ```bash
   # .env
   STACK_PROJECT_ID=your-project-id-here
   STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-key-here
   STACK_SECRET_SERVER_KEY=your-secret-key-here
   
   # Optional: Custom auth endpoint prefix
   # STACK_AUTH_PREFIX=/api/auth
   ```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:4321](http://localhost:4321) to start testing!

## What You Can Test

This alpha test project includes comprehensive examples for all Stack Auth features:

### 🏠 [Home Page](http://localhost:4321/) (`/`)
- **Purpose**: Overview and navigation
- **Features**: Authentication status, feature links, setup guide
- **Tests**: Optional authentication with `getUser()`

### 🛡️ [Protected Page](http://localhost:4321/protected) (`/protected`)
- **Purpose**: Server-side authentication enforcement
- **Features**: Automatic redirects, user data display
- **Tests**: `requireAuth()` function, Stack Auth sign-in flow

### ⚛️ [React Components](http://localhost:4321/components) (`/components`)
- **Purpose**: UI component testing
- **Features**: Sign in/up forms, user button, different hydration strategies
- **Tests**: `<SignIn />`, `<SignUp />`, `<UserButton />` components

### 🔌 [API Route](http://localhost:4321/api/user) (`/api/user`)
- **Purpose**: Protected API endpoint testing
- **Features**: JSON responses, authentication enforcement
- **Tests**: `requireAuth()` in API routes, 401 error handling

### 🚀 [Middleware Demo](http://localhost:4321/middleware-demo) (`/middleware-demo`)
- **Purpose**: Middleware functionality testing
- **Features**: Pre-populated authentication data
- **Tests**: `Astro.locals.user` and `Astro.locals.session`

## Testing Checklist

Use this checklist to validate all Stack Auth functionality:

### ✅ Initial Setup
- [ ] Environment variables configured correctly
- [ ] Dev server starts without errors
- [ ] Home page loads and shows authentication status

### ✅ Authentication Flow
- [ ] Protected page redirects to Stack Auth when not signed in
- [ ] Sign-in process completes successfully
- [ ] User is redirected back to original page after sign-in
- [ ] User data displays correctly on protected pages

### ✅ React Components
- [ ] SignIn component renders and functions
- [ ] SignUp component renders and functions  
- [ ] UserButton appears for authenticated users
- [ ] Components work with different hydration strategies

### ✅ API Testing
- [ ] `/api/user` returns 401 when not authenticated
- [ ] `/api/user` returns user data when authenticated
- [ ] JSON responses have correct format and status codes

### ✅ Middleware Integration
- [ ] `Astro.locals.user` populated automatically
- [ ] `Astro.locals.session` populated automatically
- [ ] Data available without additional API calls
- [ ] TypeScript support works correctly

### ✅ Cross-browser Testing
- [ ] Chrome/Edge: Full functionality
- [ ] Firefox: Full functionality
- [ ] Safari: Full functionality (if available)

### ✅ Error Handling
- [ ] Invalid credentials show helpful errors
- [ ] Missing environment variables show clear messages
- [ ] Network issues handled gracefully

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production testing
npm run build

# Preview production build
npm run preview

# Type checking
npm run astro check

# Get setup reminder
npm run setup
```

## Project Structure

```
alpha-test-project/
├── astro.config.mjs          # Astro + Stack Auth configuration
├── src/
│   ├── pages/
│   │   ├── index.astro       # Home page with status overview
│   │   ├── protected.astro   # requireAuth() demo
│   │   ├── components.astro  # React components demo  
│   │   ├── middleware-demo.astro  # Astro.locals demo
│   │   └── api/
│   │       └── user.ts       # Protected API endpoint
├── .env.example              # Environment template
├── .env                      # Your configuration (gitignored)
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Troubleshooting

### "Stack Auth configuration error"
- Check `.env` file exists and has all required variables
- Restart dev server after changing environment variables
- Verify credentials in Stack Auth dashboard

### "Cannot resolve 'astro-stack-auth'"
- Run the installation step for your chosen method
- For GitHub install: `npm install github:johnhkchen/stack-auth-astro`
- For local development: Ensure you ran `npm link` correctly

### Components not rendering
- Check browser console for hydration errors
- Ensure React dependencies are installed
- Try different hydration strategies (`client:load`, `client:visible`)

### API routes returning errors
- Verify authentication state in browser
- Check network tab for actual error responses
- Test with curl: `curl http://localhost:4321/api/user`

## Providing Feedback

Found issues or have suggestions?

1. **GitHub Issues**: [Report problems](https://github.com/johnhkchen/stack-auth-astro/issues)
2. **Include**: Error messages, browser info, steps to reproduce
3. **Test Environment**: Mention you're using the alpha test project

## What's Different from Production

This alpha test project differs from a typical installation:

- **Package Source**: Installs from GitHub/local instead of npm
- **Environment**: More detailed error messages and warnings
- **Examples**: Comprehensive test cases not needed in production
- **Dependencies**: All optional dependencies included for full testing

## Next Steps

After alpha testing:

1. **Verify all features work** with your Stack Auth project
2. **Test with your Astro project** using the same installation method
3. **Report any issues** you encounter
4. **Share feedback** on developer experience
5. **Try different deployment platforms** (Vercel, Netlify, etc.)

---

**Need help?** Check the [main project README](../../README.md) or [open an issue](https://github.com/johnhkchen/stack-auth-astro/issues).