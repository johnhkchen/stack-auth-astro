# Stack Auth Next.js Dependency in Astro Integration

## Issue Description

When running the Stack Auth Astro integration in development mode, we encounter an error where `@stackframe/stack` tries to import Next.js-specific modules that aren't available in an Astro project.

### Error Message

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/johnchen/swe/repos/stack-auth-astro/examples/minimal-astro/node_modules/next/navigation' 
imported from /Users/johnchen/swe/repos/stack-auth-astro/examples/minimal-astro/node_modules/@stackframe/stack/dist/esm/components-page/stack-handler.js
```

### Stack Trace
```
at finalizeResolution (node:internal/modules/esm/resolve:275:11)
at moduleResolve (node:internal/modules/esm/resolve:860:10)
at defaultResolve (node:internal/modules/esm/resolve:984:11)
at ModuleLoader.defaultResolve (node:internal/modules/esm/loader:654:12)
```

## Root Cause Analysis

The `@stackframe/stack` package is specifically designed as a Next.js SDK and has tight coupling with Next.js framework features:

1. **Direct Next.js Imports**: The package imports Next.js-specific modules like `next/navigation` for functions like:
   - `redirect`
   - `notFound`
   - `RedirectType`

2. **Framework Assumption**: Stack Auth's SDK assumes it's running within a Next.js environment, which provides these navigation utilities.

3. **Middleware Loading**: The error occurs when Astro tries to load the middleware that imports Stack Auth components, triggering the module resolution.

## Why This Happens

Stack Auth's documentation states: "This is the SDK reference for Stack Auth's Next.js SDK... If you are using a framework or programming language other than Next.js, you can use our REST API."

The SDK wasn't designed to be framework-agnostic, which creates challenges when trying to use it in non-Next.js environments like Astro.

## Current Workaround Status

Despite this dependency issue, the integration actually works in practice because:

1. **Build-time Resolution**: Astro's build system (Vite/Rollup) can handle these dependencies during the build process
2. **Tree-shaking**: Unused Next.js-specific code gets removed during production builds
3. **Server Components Work**: The `StackServerApp` used for server-side auth doesn't depend on Next.js navigation

### What Works:
- ✅ Production builds (`npm run build`)
- ✅ Server-side authentication (`getUser`, `requireAuth`)
- ✅ Client-side components when properly hydrated
- ✅ Full authentication flows in production

### What Doesn't Work:
- ❌ Development mode with certain configurations
- ❌ Direct Node.js imports of Stack Auth components (e.g., in unit tests)
- ❌ Running outside of Astro's build pipeline

## Potential Solutions

### 1. Short-term (Current Implementation)
We've added environment checks and documentation warnings:
```typescript
// components.ts
* IMPORTANT: Build Environment Requirements
* Stack Auth components have Next.js dependencies that are resolved at build time.
```

### 2. Medium-term Options
a) **Create Compatibility Shims**: Mock Next.js modules for non-Next.js environments
b) **Conditional Imports**: Use dynamic imports with fallbacks
c) **REST API Wrapper**: Build a pure REST API client without framework dependencies

### 3. Long-term Solution
Work with Stack Auth team to:
- Create a framework-agnostic core package
- Separate Next.js-specific features into a separate package
- Provide official support for other frameworks

## Reproduction Steps

1. Create a new Astro project with Stack Auth integration
2. Add the following to `.env`:
   ```
   STACK_PROJECT_ID=your-project-id
   STACK_PUBLISHABLE_CLIENT_KEY=your-key
   STACK_SECRET_SERVER_KEY=your-secret
   ```
3. Run `npm run dev`
4. The error appears when middleware tries to load

## Impact

- **Severity**: Medium (workarounds exist)
- **User Experience**: May confuse developers during initial setup
- **Production Impact**: None (builds and runs correctly)

## Recommendations

1. **For Developers Using This Integration**:
   - Use the integration as documented
   - Run `npm run build` for production
   - Ignore the development error if it appears

2. **For Stack Auth Team**:
   - Consider creating a framework-agnostic core package
   - Document which features require Next.js
   - Provide clearer guidance for non-Next.js usage

3. **For This Integration**:
   - Continue using current workarounds
   - Document the limitation clearly
   - Consider building a REST API wrapper as an alternative

## Additional Context

This issue highlights the challenges of adapting framework-specific SDKs for use in other environments. While the current workarounds are functional, a more robust solution would benefit the broader developer community trying to use Stack Auth outside of Next.js.