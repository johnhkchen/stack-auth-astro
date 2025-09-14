# Minimal Astro + Stack Auth Example

A simple 5-page example demonstrating Stack Auth integration with Astro.

## 🚀 5-Minute Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Test immediately (no configuration needed):**
   ```bash
   npm run dev
   ```
   The example works out-of-the-box with test credentials!

3. **For production, add your Stack Auth credentials:**
   Create a `.env` file:
   ```env
   STACK_PROJECT_ID=your-project-id
   STACK_PUBLISHABLE_CLIENT_KEY=pk_your-client-key  
   STACK_SECRET_SERVER_KEY=sk_your-secret-key
   ```

## Pages Included

- **Homepage** (`/`) - Shows auth state and navigation
- **Sign In** (`/signin`) - Simple sign in form
- **Sign Up** (`/signup`) - Simple sign up form  
- **Protected** (`/protected`) - Requires authentication
- **Account** (`/account`) - User info and sign out

## Features Demonstrated

✅ Server-side auth with `getUser()` and `requireAuth()`  
✅ Stack Auth React components (`SignIn`, `SignUp`)  
✅ Protected routes with automatic redirects  
✅ Client-side sign out functionality  
✅ Clean, minimal UI  

## Build & Test

```bash
# Test build (uses mock credentials)
npm run build:test

# Development server
npm run dev
```

That's it! You now have working authentication in under 5 minutes.
