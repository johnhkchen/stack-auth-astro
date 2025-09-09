# Task 1.5: Basic Integration Stub

**Sprint**: 001  
**Estimated Time**: 2-3 hours  
**Blockers**: Task 1.4 (Development Tooling)

## Objective

Create a minimal Astro integration that can be imported and added to astro.config.mjs without errors, establishing the foundation for all future functionality.

## Acceptance Criteria

- [ ] Integration function exports correctly
- [ ] Can be added to astro.config.mjs without errors
- [ ] Validates basic configuration options
- [ ] Sets up integration name and hooks structure
- [ ] Includes basic environment variable validation

## Implementation Steps

1. **Create main integration function with basic structure**
2. **Implement configuration validation**
3. **Set up Astro integration hooks framework**
4. **Add environment variable detection**
5. **Create basic unit tests**

## Test Specification

### Integration Import Test

```javascript
// Test: Integration can be imported
const stackAuth = require('astro-stack-auth');

// Expected: Integration is a function
console.assert(typeof stackAuth === 'function', 'Integration should export a function');

// Expected: Integration returns integration object
const integration = stackAuth();
console.assert(typeof integration === 'object', 'Integration should return object');
console.assert(typeof integration.name === 'string', 'Integration should have name');
console.assert(typeof integration.hooks === 'object', 'Integration should have hooks');
```

### Configuration Validation Test

```javascript
// Test: Configuration validation works
const stackAuth = require('astro-stack-auth');

// Valid configuration should work
const validConfig = stackAuth({
  prefix: '/api/auth',
  injectRoutes: true
});
console.assert(validConfig.name === 'astro-stack-auth', 'Should accept valid config');

// Invalid configuration should throw
try {
  stackAuth({ prefix: 'invalid-prefix' });
  console.assert(false, 'Should reject invalid prefix');
} catch (error) {
  console.assert(error.message.includes('prefix'), 'Should mention prefix in error');
}
```

### Environment Variable Test

```javascript
// Test: Environment variable validation
process.env.STACK_PROJECT_ID = 'test-project';
process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-key';
process.env.STACK_SECRET_SERVER_KEY = 'test-secret';

const stackAuth = require('astro-stack-auth');

// Should work with env vars
const integration = stackAuth();
console.assert(integration, 'Should work with environment variables');

// Should fail without required env vars
delete process.env.STACK_PROJECT_ID;
try {
  stackAuth();
  console.assert(false, 'Should require STACK_PROJECT_ID');
} catch (error) {
  console.assert(error.message.includes('STACK_PROJECT_ID'), 
    'Should mention missing STACK_PROJECT_ID');
}
```

### Astro Integration Structure Test

```javascript
// Test: Integration follows Astro integration pattern
const stackAuth = require('astro-stack-auth');
const integration = stackAuth();

// Expected: Has required integration properties
console.assert(integration.name, 'Should have name property');
console.assert(integration.hooks, 'Should have hooks property');

// Expected: Hooks are functions or undefined
if (integration.hooks['astro:config:setup']) {
  console.assert(typeof integration.hooks['astro:config:setup'] === 'function',
    'astro:config:setup should be a function');
}
```

### Basic Unit Test

```javascript
// Test: Integration stub unit tests
const { describe, test, expect } = require('vitest');
const stackAuth = require('astro-stack-auth');

describe('Stack Auth Integration', () => {
  test('exports a function', () => {
    expect(typeof stackAuth).toBe('function');
  });

  test('returns integration object', () => {
    const integration = stackAuth({
      projectId: 'test',
      publishableClientKey: 'test', 
      secretServerKey: 'test'
    });
    
    expect(integration).toHaveProperty('name', 'astro-stack-auth');
    expect(integration).toHaveProperty('hooks');
  });

  test('validates configuration', () => {
    expect(() => stackAuth({ prefix: 'invalid' })).toThrow();
  });
});
```

## Required Files

### src/index.ts
```typescript
import type { AstroIntegration } from 'astro';
import { validateConfig } from './config';
import type { StackAuthOptions } from './types';

export default function stackAuth(options: StackAuthOptions = {}): AstroIntegration {
  // Validate configuration and environment variables
  const config = validateConfig(options);

  return {
    name: 'astro-stack-auth',
    hooks: {
      'astro:config:setup': async ({ config: astroConfig, addMiddleware, injectRoute, updateConfig }) => {
        // TODO: Implement in future sprints
        // - Add React renderer if needed
        // - Inject Stack Auth routes
        // - Add authentication middleware
        
        console.log(`Stack Auth integration initialized with prefix: ${config.prefix}`);
      }
    }
  };
}

// Re-export types for convenience
export type { StackAuthOptions } from './types';
```

### src/config.ts
```typescript
import type { StackAuthOptions } from './types';

export interface ValidatedConfig {
  projectId: string;
  publishableClientKey: string;
  secretServerKey: string;
  prefix: string;
  injectRoutes: boolean;
  addReactRenderer: boolean;
}

export function validateConfig(options: StackAuthOptions): ValidatedConfig {
  // Get values from options or environment variables
  const projectId = options.projectId || process.env.STACK_PROJECT_ID;
  const publishableClientKey = options.publishableClientKey || process.env.STACK_PUBLISHABLE_CLIENT_KEY;
  const secretServerKey = options.secretServerKey || process.env.STACK_SECRET_SERVER_KEY;

  // Validate required fields
  if (!projectId) {
    throw new Error(
      'STACK_PROJECT_ID is required. Set it as an environment variable or pass it as an option.\n' +
      'Get your project ID from the Stack Auth dashboard: https://app.stack-auth.com/'
    );
  }

  if (!publishableClientKey) {
    throw new Error(
      'STACK_PUBLISHABLE_CLIENT_KEY is required. Set it as an environment variable or pass it as an option.\n' +
      'Get your publishable client key from the Stack Auth dashboard: https://app.stack-auth.com/'
    );
  }

  if (!secretServerKey) {
    throw new Error(
      'STACK_SECRET_SERVER_KEY is required. Set it as an environment variable or pass it as an option.\n' +
      'Get your secret server key from the Stack Auth dashboard: https://app.stack-auth.com/'
    );
  }

  // Validate prefix format
  const prefix = options.prefix || '/handler';
  if (!prefix.startsWith('/')) {
    throw new Error('prefix must start with "/" (e.g., "/api/auth")');
  }
  if (prefix.endsWith('/')) {
    throw new Error('prefix must not end with "/" (e.g., "/api/auth", not "/api/auth/")');
  }

  return {
    projectId,
    publishableClientKey,
    secretServerKey,
    prefix,
    injectRoutes: options.injectRoutes ?? true,
    addReactRenderer: options.addReactRenderer ?? true
  };
}
```

### tests/integration.test.ts
```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import stackAuth from '../src/index';

describe('Stack Auth Integration', () => {
  beforeEach(() => {
    // Set up environment variables for tests
    process.env.STACK_PROJECT_ID = 'test_project';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test_key';
    process.env.STACK_SECRET_SERVER_KEY = 'test_secret';
  });

  test('exports a function', () => {
    expect(typeof stackAuth).toBe('function');
  });

  test('returns Astro integration object', () => {
    const integration = stackAuth();
    
    expect(integration).toHaveProperty('name', 'astro-stack-auth');
    expect(integration).toHaveProperty('hooks');
    expect(integration.hooks).toHaveProperty('astro:config:setup');
  });

  test('validates configuration options', () => {
    // Valid config should work
    expect(() => stackAuth({ prefix: '/api/auth' })).not.toThrow();
    
    // Invalid prefix should throw
    expect(() => stackAuth({ prefix: 'invalid' })).toThrow('prefix must start with');
    expect(() => stackAuth({ prefix: '/invalid/' })).toThrow('prefix must not end with');
  });

  test('requires environment variables', () => {
    delete process.env.STACK_PROJECT_ID;
    
    expect(() => stackAuth()).toThrow('STACK_PROJECT_ID is required');
  });

  test('accepts configuration overrides', () => {
    const integration = stackAuth({
      projectId: 'override_project',
      prefix: '/custom/auth'
    });
    
    expect(integration.name).toBe('astro-stack-auth');
  });
});
```

### Stub files for future implementation
```typescript
// src/server.ts - Empty stub
export function getUser() {
  throw new Error('Not implemented - will be added in Sprint 003');
}

export function requireAuth() {
  throw new Error('Not implemented - will be added in Sprint 003');
}

// src/client.ts - Empty stub  
export function signIn() {
  throw new Error('Not implemented - will be added in Sprint 004');
}

export function signOut() {
  throw new Error('Not implemented - will be added in Sprint 004');
}

// src/components.ts - Empty stub
throw new Error('Components not implemented - will be added in Sprint 004');
```

## Validation Commands

```bash
# Build the integration
npm run build

# Run tests
npm run test

# Test integration can be imported
node -e "console.log(require('./dist/index.js')())"

# Validate in Astro project (create test project)
mkdir test-astro && cd test-astro
npm create astro@latest . -- --template minimal --no-install --no-git
npm install
npm install ../astro-stack-auth-*.tgz

# Test integration in astro.config.mjs
echo "import stackAuth from 'astro-stack-auth'; export default { integrations: [stackAuth()] };" > astro.config.mjs
```

## Definition of Done

- [ ] Integration exports function correctly
- [ ] Configuration validation works with helpful errors
- [ ] Environment variable detection functional
- [ ] Can be added to astro.config.mjs without errors
- [ ] Unit tests pass
- [ ] Builds successfully and can be imported
- [ ] Validates against **Feature #1** zero-config installation requirements
- [ ] Doctests pass for this task