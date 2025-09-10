# Consumer Project Compatibility Guide

This guide provides comprehensive information about TypeScript configurations, module resolution settings, and version compatibility for consumer projects using `astro-stack-auth`.

## Recommended TypeScript Configurations

### 1. **Recommended Configuration** (Works with all features)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext", 
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "lib": ["ES2022", "DOM"],
    "types": ["node", "react", "react-dom"],
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**Why this works:**
- `moduleResolution: "bundler"` provides the most flexible import resolution
- `target: "ES2022"` ensures modern language features are available
- `strict: true` enables type safety without breaking optional properties

### 2. **Loose Configuration** (For legacy projects)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler", 
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": false,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM"],
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**Use case:** Legacy projects that cannot enable strict mode

### 3. **Node.js Configuration** (For Node.js environments)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "Node16",
    "moduleResolution": "node16",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ES2020"],
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**Important:** When using `moduleResolution: "node16"`, you **must** use explicit file extensions:
```typescript
// ✅ Correct
import { getUser } from 'astro-stack-auth/server.js';
import { signIn } from 'astro-stack-auth/client.js';

// ❌ Incorrect (will fail with node16)
import { getUser } from 'astro-stack-auth/server';
import { signIn } from 'astro-stack-auth/client';
```

## Module Resolution Compatibility Matrix

| moduleResolution | Status | Notes |
|------------------|--------|-------|
| `bundler` | ✅ **Recommended** | Best compatibility, modern tooling |
| `node` | ✅ Compatible | Standard Node.js resolution |
| `node16` | ⚠️ **Requires .js extensions** | Explicit extensions required |
| `nodenext` | ⚠️ **Requires .js extensions** | Explicit extensions required |
| `classic` | ❌ **Not Compatible** | Conflicts with `resolveJsonModule` |

## TypeScript Strictness Compatibility

### Strict Mode Considerations

#### ✅ Compatible Strict Settings
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

#### ⚠️ Problematic Strict Settings
```json
{
  "exactOptionalPropertyTypes": true  // Can cause issues with Stack Auth types
}
```

**Why `exactOptionalPropertyTypes` causes issues:**
- Stack Auth types use `| undefined` for optional properties
- This conflicts with TypeScript's exact optional property matching
- **Solution:** Avoid this setting or use type assertions when needed

### Strict Mode Workarounds

If you must use `exactOptionalPropertyTypes: true`, use type assertions:

```typescript
// ✅ Workaround for exactOptionalPropertyTypes
const config: StackAuthConfig = {
  projectId: 'test-project',
  publishableClientKey: 'test-key', 
  secretServerKey: 'secret-key',
  baseUrl: process.env.STACK_BASE_URL as string | undefined
} as StackAuthConfig;
```

## React Version Compatibility

### Supported React Versions

| React Version | Status | Notes |
|---------------|--------|-------|
| React 18.0+ | ✅ **Fully Supported** | Recommended for production |
| React 19.0+ | ✅ **Fully Supported** | Latest features available |
| React 17.x | ❌ **Not Supported** | Missing required features |

### React TypeScript Configuration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["react", "react-dom"]
  }
}
```

## Bundler Compatibility

### Vite (Recommended)
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@stackframe/stack', '@stackframe/stack-ui']
  }
});
```

### Webpack
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};
```

### Rollup
```javascript
// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  plugins: [
    resolve(),
    typescript()
  ]
};
```

## Common Configuration Issues

### Issue 1: Import Resolution Failures

**Problem:**
```
Cannot resolve module 'astro-stack-auth/server'
```

**Solution:**
Check your `moduleResolution` setting:
- Use `"bundler"` for most projects
- Add `.js` extensions if using `"node16"` or `"nodenext"`

### Issue 2: Type Errors with Strict Mode

**Problem:**
```
Type 'undefined' is not assignable to type 'string'
```

**Solution:**
```typescript
// Use optional chaining and nullish coalescing
const config: StackAuthConfig = {
  projectId: process.env.STACK_PROJECT_ID!,
  publishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  baseUrl: process.env.STACK_BASE_URL ?? undefined
};
```

### Issue 3: React Component Type Errors

**Problem:**
```
Property 'app' is missing in type 'StackAuthContextType'
```

**Solution:**
```typescript
// Make app optional in your component
const contextValue: StackAuthContextType = {
  user: null,
  session: null,
  app: undefined as any // Type assertion for strict mode
};
```

## Testing Your Configuration

### 1. Type Check Your Project
```bash
npx tsc --noEmit
```

### 2. Test Import Resolution
```typescript
// test-imports.ts
import { getUser } from 'astro-stack-auth/server';
import { signIn } from 'astro-stack-auth/client';
import { SignIn } from 'astro-stack-auth/components';

console.log('Imports work!');
```

### 3. Validate Build
```bash
npm run build
```

## Environment-Specific Configurations

### Development
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "sourceMap": true,
    "declaration": false
  }
}
```

### Production
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext", 
    "moduleResolution": "bundler",
    "strict": true,
    "sourceMap": false,
    "declaration": true,
    "removeComments": true
  }
}
```

## Migration Guide

### From Classic to Modern Resolution

**Before (Classic):**
```json
{
  "compilerOptions": {
    "moduleResolution": "classic"
  }
}
```

**After (Bundler):**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

### From Node16 to Bundler

**Before (Node16 with explicit extensions):**
```typescript
import { getUser } from 'astro-stack-auth/server.js';
```

**After (Bundler without extensions):**
```typescript
import { getUser } from 'astro-stack-auth/server';
```

## Summary Recommendations

1. **Use `moduleResolution: "bundler"`** for best compatibility
2. **Enable strict mode** but avoid `exactOptionalPropertyTypes`
3. **Use React 18+** for full feature support
4. **Target ES2022** for modern JavaScript features
5. **Skip lib check** (`skipLibCheck: true`) to avoid dependency type conflicts
6. **Test your configuration** with `tsc --noEmit` before deploying

This configuration guide ensures your consumer project works seamlessly with `astro-stack-auth` across different environments and setups.