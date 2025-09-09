# Task 1.2: TypeScript Configuration

**Sprint**: 001  
**Estimated Time**: 1-2 hours  
**Blockers**: Task 1.1 (Package Structure)

## Objective

Set up TypeScript configuration optimized for Astro integration development with proper type definitions and compilation settings.

## Acceptance Criteria

- [ ] tsconfig.json with Astro-compatible settings
- [ ] TypeScript compiles without errors
- [ ] Proper type definitions for Astro integration
- [ ] Support for both Node.js and browser environments

## Implementation Steps

1. **Create tsconfig.json with Astro integration settings**
2. **Set up type definitions for Astro namespace extension**
3. **Configure module resolution for Stack Auth types**
4. **Validate TypeScript compilation**
5. **Create type declarations for package exports**

## Test Specification

### TypeScript Compilation Test

```javascript
// Test: TypeScript configuration is valid
const { execSync } = require('child_process');

try {
  // Expected: TypeScript compiles without errors
  const result = execSync('npx tsc --noEmit', { encoding: 'utf-8' });
  console.assert(true, 'TypeScript compilation should succeed');
} catch (error) {
  console.assert(false, `TypeScript compilation failed: ${error.message}`);
}
```

### Type Resolution Test

```typescript
// Test: Astro types are properly resolved
// This should compile without errors
import type { AstroIntegration, APIContext } from 'astro';
import type { User } from '@stackframe/stack';

// Expected: Types should be available
const testIntegration: AstroIntegration = {
  name: 'test',
  hooks: {}
};

const testContext: APIContext = {} as APIContext;
const testUser: User = {} as User;
```

### Namespace Extension Test

```typescript
// Test: Astro namespace is properly extended
// src/types.ts content validation

declare namespace App {
  interface Locals {
    user: import('@stackframe/stack').User | null;
    session: import('@stackframe/stack').Session | null;
  }
}

// Expected: Should compile without errors
const locals: App.Locals = {
  user: null,
  session: null
};
```

### Module Export Types Test

```typescript
// Test: Package exports have proper types
import type stackAuth from 'astro-stack-auth';
import type { getUser, requireAuth } from 'astro-stack-auth/server';
import type { signIn, signOut } from 'astro-stack-auth/client';

// Expected: All exports should have types
const integration: typeof stackAuth = {} as typeof stackAuth;
const getUserFn: typeof getUser = {} as typeof getUser;
const signInFn: typeof signIn = {} as typeof signIn;
```

## Required Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext", 
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM"],
    "types": ["node", "vite/client"],
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": [
    "src/**/*",
    "env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
```

### env.d.ts
```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('@stackframe/stack').User | null;
    session: import('@stackframe/stack').Session | null;
  }
}

// Extend Astro's global types if needed
declare module 'astro' {
  interface AstroGlobal {
    locals: App.Locals;
  }
}
```

### src/types.ts
```typescript
import type { AstroIntegration, APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';

export interface StackAuthOptions {
  projectId?: string;
  publishableClientKey?: string;
  secretServerKey?: string;
  prefix?: string;
  injectRoutes?: boolean;
  addReactRenderer?: boolean;
}

export interface RequireAuthOptions {
  signInUrl?: string;
  redirectTo?: string;
}

export interface SignInOptions {
  redirectTo?: string;
  provider?: string;
}

export interface SignOutOptions {
  redirectTo?: string;
  clearLocalStorage?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// Re-export Stack Auth types for convenience
export type { User, Session };
```

## Validation Commands

```bash
# Check TypeScript configuration
npx tsc --showConfig

# Validate types without emitting files
npx tsc --noEmit

# Check for type errors in specific files
npx tsc --noEmit src/types.ts

# Validate Astro types are available
node -p "require('astro/client')"
```

## Definition of Done

- [ ] `npx tsc --noEmit` runs without errors
- [ ] All type definitions compile correctly
- [ ] Astro namespace extension works
- [ ] Stack Auth types are properly imported
- [ ] IDE/editor provides proper type checking
- [ ] Doctests pass for this task