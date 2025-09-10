# Module Resolution & Import Troubleshooting Guide

This guide provides solutions for common module resolution and import issues when using `astro-stack-auth` in consumer projects.

## Quick Diagnostics

### Step 1: Check Your Configuration
```bash
# Display your TypeScript configuration
npx tsc --showConfig

# Check installed versions
npm list astro react typescript @stackframe/stack
```

### Step 2: Test Basic Import
```typescript
// test-import.ts
try {
  const auth = require('astro-stack-auth');
  console.log('CommonJS import works');
} catch (e) {
  console.log('CommonJS import failed:', e.message);
}

try {
  import('astro-stack-auth').then(() => {
    console.log('ESM import works');
  });
} catch (e) {
  console.log('ESM import failed:', e.message);
}
```

## Common Module Resolution Issues

### Issue 1: Cannot Resolve Module

#### Symptoms
```
Error: Cannot resolve module 'astro-stack-auth/server'
Module not found: Can't resolve 'astro-stack-auth/client'
```

#### Diagnosis
```bash
# Check if package is installed
npm list astro-stack-auth

# Check if dist files exist
ls node_modules/astro-stack-auth/dist/

# Check package.json exports
cat node_modules/astro-stack-auth/package.json | grep -A 20 '"exports"'
```

#### Solutions

**Solution A: Fix moduleResolution Setting**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"  // ✅ Recommended
    // "moduleResolution": "node"  // ✅ Also works  
    // "moduleResolution": "classic" // ❌ Will fail
  }
}
```

**Solution B: Use Explicit Extensions (for node16/nodenext)**
```typescript
// ❌ Wrong (node16/nodenext)
import { getUser } from 'astro-stack-auth/server';

// ✅ Correct (node16/nodenext)
import { getUser } from 'astro-stack-auth/server.js';
```

**Solution C: Check Package Installation**
```bash
# Reinstall the package
npm uninstall astro-stack-auth
npm install astro-stack-auth

# Or force reinstall
npm ci
```

### Issue 2: TypeScript Cannot Find Declarations

#### Symptoms
```
Could not find a declaration file for module 'astro-stack-auth'
```

#### Diagnosis
```bash
# Check if .d.ts files exist
ls node_modules/astro-stack-auth/dist/*.d.ts

# Check TypeScript can find types
npx tsc --traceResolution | grep astro-stack-auth
```

#### Solutions

**Solution A: Ensure Types Are Built**
```bash
# Check if types exist in dist
ls node_modules/astro-stack-auth/dist/

# Expected files:
# index.d.ts, server.d.ts, client.d.ts, components.d.ts, middleware.d.ts
```

**Solution B: Fix TypeScript Configuration**
```json
{
  "compilerOptions": {
    "skipLibCheck": true,        // Skip type checking of dependencies
    "moduleResolution": "bundler", // Ensure proper resolution
    "types": ["node", "react"]   // Include necessary types
  }
}
```

**Solution C: Force Type Generation**
```bash
# If types are missing, report to package maintainer
# Temporary workaround:
echo 'declare module "astro-stack-auth" { export * from "astro-stack-auth/index.js"; }' > astro-stack-auth.d.ts
echo 'declare module "astro-stack-auth/server" { export * from "astro-stack-auth/server.js"; }' >> astro-stack-auth.d.ts
```

### Issue 3: Exact Optional Property Types Error

#### Symptoms
```
Type '{ app: undefined }' is not assignable to type 'StackAuthContextType' 
with 'exactOptionalPropertyTypes: true'
```

#### Diagnosis
```bash
# Check if exactOptionalPropertyTypes is enabled
npx tsc --showConfig | grep exactOptionalPropertyTypes
```

#### Solutions

**Solution A: Disable exactOptionalPropertyTypes (Recommended)**
```json
{
  "compilerOptions": {
    "strict": true,
    // "exactOptionalPropertyTypes": true  // ❌ Remove this
  }
}
```

**Solution B: Use Type Assertions**
```typescript
// ✅ Type assertion workaround
const contextValue: StackAuthContextType = {
  user: null,
  session: null,
  app: undefined
} as StackAuthContextType;
```

**Solution C: Proper Optional Handling**
```typescript
// ✅ Better approach - don't include undefined properties
const contextValue: StackAuthContextType = {
  user: null,
  session: null
  // Don't include app if it's undefined
};

// Only add app if it exists
if (app) {
  contextValue.app = app;
}
```

### Issue 4: Import Extensions with Node16/NodeNext

#### Symptoms
```
Relative import paths need explicit file extensions in ECMAScript imports 
when '--moduleResolution' is 'node16' or 'nodenext'
```

#### Solutions

**Solution A: Add .js Extensions**
```typescript
// ✅ Correct for node16/nodenext
import { getUser } from 'astro-stack-auth/server.js';
import { signIn } from 'astro-stack-auth/client.js';
import { SignIn } from 'astro-stack-auth/components.js';
```

**Solution B: Switch to Bundler Resolution**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"  // ✅ No extensions needed
  }
}
```

### Issue 5: Cannot Resolve JSON Modules

#### Symptoms
```
Cannot resolve module './package.json'
Option '--resolveJsonModule' cannot be specified when 'moduleResolution' is set to 'classic'
```

#### Solutions

**Solution A: Fix Module Resolution**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",  // ✅ Supports JSON modules
    "resolveJsonModule": true
  }
}
```

**Solution B: Alternative Resolution**
```json
{
  "compilerOptions": {
    "moduleResolution": "node",    // ✅ Also supports JSON modules
    "resolveJsonModule": true
  }
}
```

### Issue 6: React Component Import Errors

#### Symptoms
```
Module '"astro-stack-auth/components"' has no exported member 'SignIn'
```

#### Diagnosis
```bash
# Check if React is installed
npm list react react-dom

# Check component exports
cat node_modules/astro-stack-auth/dist/components.d.ts
```

#### Solutions

**Solution A: Install React Dependencies**
```bash
npm install react react-dom
npm install --save-dev @types/react @types/react-dom
```

**Solution B: Check Import Syntax**
```typescript
// ✅ Correct imports
import { SignIn, SignUp, UserButton } from 'astro-stack-auth/components';

// ❌ Wrong - these are React components, not server functions
import { SignIn } from 'astro-stack-auth/server';
```

**Solution C: Ensure React Renderer**
```typescript
// astro.config.mjs
export default defineConfig({
  integrations: [
    stackAuth({
      addReactRenderer: true  // ✅ Ensure React support
    })
  ]
});
```

## Build-Time Issues

### Issue 7: Build Fails with Module Errors

#### Symptoms
```
Build failed: Cannot resolve 'astro-stack-auth'
Rollup failed to resolve import
```

#### Solutions

**Solution A: Check Build Configuration**
```json
{
  "compilerOptions": {
    "skipLibCheck": true,      // Skip dependency type checking
    "isolatedModules": true,   // Ensure each file can be processed separately
    "esModuleInterop": true,   // Improve CommonJS/ESM interop
    "allowSyntheticDefaultImports": true
  }
}
```

**Solution B: Vite Configuration**
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: [
      'astro-stack-auth',
      '@stackframe/stack',
      '@stackframe/stack-ui'
    ]
  },
  ssr: {
    noExternal: ['astro-stack-auth']
  }
});
```

**Solution C: Webpack Configuration**
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      'astro-stack-auth': path.resolve(__dirname, 'node_modules/astro-stack-auth')
    }
  }
};
```

### Issue 8: Type Checking Fails in CI/CD

#### Symptoms
```
Type error in CI but works locally
Cannot find module in production build
```

#### Solutions

**Solution A: Consistent Node Versions**
```yaml
# .github/workflows/build.yml
- uses: actions/setup-node@v3
  with:
    node-version: '18'  # Use same version as local
```

**Solution B: Clean Install**
```yaml
- name: Install dependencies
  run: |
    npm ci                    # Clean install
    npm run stack:validate    # Validate Stack Auth packages
```

**Solution C: TypeScript Cache**
```bash
# Add to CI script
npm run type:check || (npm run build:clean && npm run type:check)
```

## Runtime Issues

### Issue 9: Module Not Found at Runtime

#### Symptoms
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'astro-stack-auth/server'
```

#### Solutions

**Solution A: Check Package.json Exports**
```json
{
  "exports": {
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.mjs",
      "require": "./dist/server.cjs"
    }
  }
}
```

**Solution B: Runtime Import Check**
```typescript
// Debug import resolution
try {
  const serverModule = await import('astro-stack-auth/server');
  console.log('Server module loaded:', Object.keys(serverModule));
} catch (error) {
  console.error('Import failed:', error);
}
```

### Issue 10: Stack Auth Package Version Conflicts

#### Symptoms
```
TypeError: Cannot read properties of undefined (reading 'getUser')
Version conflict between @stackframe/stack versions
```

#### Solutions

**Solution A: Validate Stack Auth Packages**
```bash
npm run stack:validate
```

**Solution B: Reinstall Stack Auth**
```bash
npm run stack:reinstall
```

**Solution C: Lock Versions**
```json
{
  "dependencies": {
    "@stackframe/stack": "^2.8.36",
    "@stackframe/stack-ui": "^2.8.36"
  },
  "overrides": {
    "@stackframe/stack": "^2.8.36",
    "@stackframe/stack-ui": "^2.8.36"
  }
}
```

## Advanced Debugging

### Debug Environment Setup
```bash
# Set debug environment
export DEBUG=astro-stack-auth:*
export NODE_ENV=development

# Enable TypeScript tracing
npx tsc --traceResolution --noEmit | grep astro-stack-auth

# Check module resolution
node -e "console.log(require.resolve('astro-stack-auth'))"
node -e "console.log(require.resolve('astro-stack-auth/server'))"
```

### Create Test Project
```bash
# Create minimal test case
mkdir test-astro-stack-auth
cd test-astro-stack-auth
npm init -y
npm install astro astro-stack-auth react typescript

# Test basic import
echo 'import "astro-stack-auth";' > test.ts
npx tsc --noEmit test.ts
```

### Report Issues
When reporting issues, include:

1. **Environment info:**
   ```bash
   npx astro info
   npx tsc --version
   npm list astro-stack-auth
   ```

2. **Configuration:**
   ```bash
   cat tsconfig.json
   cat astro.config.mjs
   ```

3. **Error output:**
   ```bash
   npm run build 2>&1 | tee build-error.log
   npm run type:check 2>&1 | tee type-error.log
   ```

This guide covers the most common module resolution issues. If you encounter an issue not covered here, check the [compatibility matrix](./compatibility-matrix.md) or create a minimal reproduction case.