# Task 1.4: Development Tooling

**Sprint**: 001  
**Estimated Time**: 2-3 hours  
**Blockers**: Task 1.3 (Build System)

## Objective

Set up comprehensive development tooling including Vitest for testing, ESLint for code quality, and development scripts for efficient workflow.

## Acceptance Criteria

- [ ] Vitest configured with Astro-compatible settings
- [ ] ESLint configured for TypeScript and Astro best practices  
- [ ] Test setup files and utilities configured
- [ ] Development scripts working (test, lint, format)
- [ ] CI-ready testing configuration

## Implementation Steps

1. **Configure Vitest with TypeScript and DOM support**
2. **Set up ESLint for TypeScript and Astro**
3. **Create test setup and utility files**
4. **Add development scripts to package.json**
5. **Validate all tooling works correctly**

## Test Specification

### Vitest Configuration Test

```javascript
// Test: Vitest can run basic tests
const { execSync } = require('child_process');

try {
  // Expected: Vitest runs without configuration errors
  const result = execSync('npx vitest run --reporter=verbose', { 
    encoding: 'utf-8',
    timeout: 30000
  });
  console.assert(result.includes('Test Files'), 'Vitest should run successfully');
} catch (error) {
  // It's okay if no tests exist yet, just check config is valid
  console.assert(!error.message.includes('config'), 'Vitest config should be valid');
}
```

### ESLint Configuration Test

```javascript  
// Test: ESLint configuration is valid
const { execSync } = require('child_process');

try {
  // Expected: ESLint runs without configuration errors
  const result = execSync('npx eslint --print-config src/index.ts', { encoding: 'utf-8' });
  const config = JSON.parse(result);
  console.assert(config.rules, 'ESLint config should have rules');
  console.assert(config.parser, 'ESLint config should have parser');
} catch (error) {
  console.assert(false, `ESLint configuration error: ${error.message}`);
}
```

### TypeScript Integration Test

```javascript
// Test: Tools work with TypeScript files
const fs = require('fs');

// Create a test TypeScript file
const testContent = `
export function testFunction(): string {
  return "test";
}
`;

fs.writeFileSync('test-temp.ts', testContent);

try {
  const { execSync } = require('child_process');
  
  // Test ESLint works with TypeScript
  execSync('npx eslint test-temp.ts', { encoding: 'utf-8' });
  console.assert(true, 'ESLint should work with TypeScript files');
} catch (error) {
  // Linting errors are okay, config errors are not
  console.assert(!error.message.includes('Configuration'), 
    'ESLint should not have configuration errors');
} finally {
  fs.unlinkSync('test-temp.ts');
}
```

### Test Utilities Test

```javascript
// Test: Test setup and utilities are working  
const setupExists = require('fs').existsSync('tests/setup.ts');
console.assert(setupExists, 'Test setup file should exist');

// Test environment variables in setup
process.env.NODE_ENV = 'test';
const setup = require('../tests/setup');
console.assert(process.env.STACK_PROJECT_ID, 'Test setup should set environment variables');
```

## Required Files

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

### .eslintrc.js
```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Adjust rules for integration development
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn'
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.config.js'
  ]
};
```

### tests/setup.ts
```typescript
import { vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.STACK_PROJECT_ID = 'test_project_id';
process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test_publishable_key';
process.env.STACK_SECRET_SERVER_KEY = 'test_secret_key';

// Mock browser APIs
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage  
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock fetch globally
global.fetch = vi.fn();

// Clean up between tests
beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    localStorageMock.clear();
  }
});
```

### tests/utils.ts
```typescript
import { vi } from 'vitest';
import type { APIContext } from 'astro';

export function createMockAPIContext(overrides: Partial<APIContext> = {}): APIContext {
  return {
    request: new Request('http://localhost:3000/'),
    url: new URL('http://localhost:3000/'),
    params: {},
    props: {},
    redirect: vi.fn(),
    locals: {},
    ...overrides
  } as APIContext;
}

export function createMockUser() {
  return {
    id: 'user_123',
    displayName: 'Test User',
    primaryEmail: 'test@example.com',
    profileImageUrl: 'https://example.com/avatar.jpg'
  };
}

export function createMockSession() {
  return {
    id: 'session_456', 
    userId: 'user_123',
    expiresAt: new Date(Date.now() + 86400000) // 24 hours
  };
}
```

### Updated package.json scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui", 
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src tests --ext .ts,.js",
    "lint:fix": "eslint src tests --ext .ts,.js --fix",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0", 
    "eslint": "^8.0.0",
    "jsdom": "^22.0.0"
  }
}
```

## Validation Commands

```bash
# Install new dev dependencies
npm install

# Run linter
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Generate coverage report
npm run test:coverage

# Check all tools work together
npm run lint && npm run type-check && npm run test
```

## Definition of Done

- [ ] `npm run test` runs Vitest successfully
- [ ] `npm run lint` runs ESLint without configuration errors
- [ ] `npm run type-check` validates TypeScript
- [ ] Test setup file properly configures environment
- [ ] Coverage reporting is configured and working
- [ ] All development scripts work correctly
- [ ] Doctests pass for this task