# Task 2.1: Environment Configuration System

**Sprint**: 002  
**Estimated Time**: 2-3 hours  
**Blockers**: Sprint 001 Complete

## Objective

Create a robust environment variable handling system that validates Stack Auth credentials and provides clear error messages for misconfigurations.

## Acceptance Criteria

- [ ] Environment variable validation with helpful error messages
- [ ] Support for .env files and runtime environment variables
- [ ] Configuration precedence: options > env vars > defaults
- [ ] Clear guidance for obtaining missing credentials
- [ ] Development vs production environment handling

## Implementation Steps

1. **Enhance config validation with better error messages**
2. **Add .env file support detection**
3. **Implement configuration precedence logic**
4. **Add Stack Auth connection validation**
5. **Create configuration debugging utilities**

## Test Specification

### Environment Variable Validation Test

```javascript
// Test: Clear error messages for missing credentials
const { validateConfig } = require('astro-stack-auth/config');

// Clear all environment variables
delete process.env.STACK_PROJECT_ID;
delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
delete process.env.STACK_SECRET_SERVER_KEY;

try {
  validateConfig({});
  console.assert(false, 'Should throw error for missing credentials');
} catch (error) {
  // Expected: Helpful error message with instructions
  console.assert(error.message.includes('STACK_PROJECT_ID'), 'Should mention project ID');
  console.assert(error.message.includes('dashboard'), 'Should mention Stack Auth dashboard');
  console.assert(error.message.includes('https://'), 'Should include dashboard URL');
}
```

### Configuration Precedence Test

```javascript
// Test: Configuration precedence (options > env > defaults)
process.env.STACK_PROJECT_ID = 'env-project-id';
process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'env-client-key';
process.env.STACK_SECRET_SERVER_KEY = 'env-server-key';

const config = validateConfig({
  projectId: 'option-project-id',
  prefix: '/custom-auth'
});

// Expected: Options override environment variables
console.assert(config.projectId === 'option-project-id', 
  'Options should override environment variables');

// Expected: Environment variables used when options not provided
console.assert(config.publishableClientKey === 'env-client-key',
  'Should use env vars when options not provided');

// Expected: Defaults used when neither provided
console.assert(config.prefix === '/custom-auth',
  'Should use provided option');
```

### Development Environment Test

```javascript
// Test: Development-specific configuration
process.env.NODE_ENV = 'development';

const { validateConfig } = require('astro-stack-auth/config');

try {
  validateConfig({});
} catch (error) {
  // Expected: Development should have more detailed errors
  console.assert(error.message.length > 100, 
    'Development errors should be detailed');
  console.assert(error.message.includes('.env'),
    'Should mention .env file in development');
}
```

### Production Environment Test

```javascript
// Test: Production-specific configuration
process.env.NODE_ENV = 'production';

try {
  validateConfig({});
} catch (error) {
  // Expected: Production errors should be concise but helpful
  console.assert(error.message.length < 300,
    'Production errors should be concise');
  console.assert(!error.stack || error.stack.length < 500,
    'Production should have minimal stack traces');
}
```

## Required Files

### Enhanced src/config.ts
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

interface ValidationError extends Error {
  code: string;
  suggestions: string[];
}

export function validateConfig(options: StackAuthOptions): ValidatedConfig {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Get values with precedence: options > env vars > defaults
  const projectId = options.projectId || process.env.STACK_PROJECT_ID;
  const publishableClientKey = options.publishableClientKey || 
    process.env.STACK_PUBLISHABLE_CLIENT_KEY;
  const secretServerKey = options.secretServerKey || 
    process.env.STACK_SECRET_SERVER_KEY;

  // Validate required credentials
  if (!projectId) {
    errors.push('STACK_PROJECT_ID is required');
    suggestions.push('Get your Project ID from the Stack Auth dashboard');
  }

  if (!publishableClientKey) {
    errors.push('STACK_PUBLISHABLE_CLIENT_KEY is required');
    suggestions.push('Get your Publishable Client Key from the Stack Auth dashboard');
  }

  if (!secretServerKey) {
    errors.push('STACK_SECRET_SERVER_KEY is required');
    suggestions.push('Get your Secret Server Key from the Stack Auth dashboard');
  }

  if (errors.length > 0) {
    throw createConfigurationError(errors, suggestions);
  }

  // Validate prefix format
  const prefix = options.prefix || '/handler';
  validatePrefix(prefix);

  return {
    projectId: projectId!,
    publishableClientKey: publishableClientKey!,
    secretServerKey: secretServerKey!,
    prefix,
    injectRoutes: options.injectRoutes ?? true,
    addReactRenderer: options.addReactRenderer ?? true
  };
}

function validatePrefix(prefix: string): void {
  if (!prefix.startsWith('/')) {
    throw new Error('prefix must start with "/" (e.g., "/api/auth")');
  }
  if (prefix.endsWith('/')) {
    throw new Error('prefix must not end with "/" (e.g., "/api/auth", not "/api/auth/")');
  }
  if (prefix.includes('//')) {
    throw new Error('prefix cannot contain double slashes');
  }
}

function createConfigurationError(errors: string[], suggestions: string[]): ValidationError {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let message = 'Stack Auth configuration error:\n\n';
  
  // List missing requirements
  errors.forEach((error, index) => {
    message += `${index + 1}. ${error}\n`;
  });
  
  if (isDevelopment) {
    message += '\nTo fix this:\n';
    suggestions.forEach((suggestion, index) => {
      message += `${index + 1}. ${suggestion}\n`;
    });
    
    message += '\nStack Auth Dashboard: https://app.stack-auth.com/\n';
    message += '\nAdd credentials to your .env file:\n';
    message += 'STACK_PROJECT_ID=your_project_id\n';
    message += 'STACK_PUBLISHABLE_CLIENT_KEY=your_client_key\n';
    message += 'STACK_SECRET_SERVER_KEY=your_server_key\n';
  } else {
    message += '\nVisit https://app.stack-auth.com/ to get your credentials';
  }

  const error = new Error(message) as ValidationError;
  error.code = 'STACK_AUTH_CONFIG_ERROR';
  error.suggestions = suggestions;
  
  return error;
}

export function debugConfiguration(options: StackAuthOptions = {}): void {
  console.log('Stack Auth Configuration Debug:');
  console.log('==============================');
  
  const envVars = {
    STACK_PROJECT_ID: process.env.STACK_PROJECT_ID,
    STACK_PUBLISHABLE_CLIENT_KEY: process.env.STACK_PUBLISHABLE_CLIENT_KEY,
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`${key}: ${value ? '✓ Set' : '✗ Missing'}`);
  });
  
  console.log('\nOptions provided:');
  Object.entries(options).forEach(([key, value]) => {
    console.log(`${key}: ${value !== undefined ? '✓ Provided' : '✗ Not provided'}`);
  });
}
```

## Validation Commands

```bash
# Test configuration validation
npm run test -- config.test.ts

# Test environment variable handling
STACK_PROJECT_ID=test npm run test

# Debug configuration
node -e "require('./dist/config').debugConfiguration()"
```

## Definition of Done

- [ ] Environment variables validated with helpful errors
- [ ] Configuration precedence works correctly
- [ ] Development vs production error handling
- [ ] .env file detection and guidance
- [ ] All configuration tests pass
- [ ] Doctests pass for this task