# Feature: Helpful Error Messages

**GitHub Issue:** #10  
**Title:** User gets helpful error messages for common configuration issues

## Description

As a developer, I want to receive clear, actionable error messages when I misconfigure the Stack Auth integration so that I can quickly identify and fix issues.

## Acceptance Criteria

- [ ] Clear error messages for missing environment variables
- [ ] Helpful suggestions for common configuration mistakes
- [ ] Stack traces point to relevant configuration locations
- [ ] Errors include links to documentation
- [ ] Different error handling for development vs production

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Missing Environment Variables Test

```javascript
// Test: Clear error for missing required env vars
// Remove required environment variables
delete process.env.STACK_PROJECT_ID;
delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
delete process.env.STACK_SECRET_SERVER_KEY;

try {
  const stackAuth = await import('astro-stack-auth');
  stackAuth.default();
  console.assert(false, 'Should throw error for missing env vars');
} catch (error) {
  // Expected: Clear error message with instructions
  console.assert(error.message.includes('STACK_PROJECT_ID'), 
    'Should mention missing STACK_PROJECT_ID');
  console.assert(error.message.includes('environment variables'), 
    'Should mention environment variables');
  console.assert(error.message.includes('dashboard'), 
    'Should mention Stack Auth dashboard');
}
```

### Invalid Configuration Test

```javascript
// Test: Helpful error for invalid config options
import stackAuth from 'astro-stack-auth';

try {
  stackAuth({
    prefix: 'invalid-prefix', // Missing leading slash
    tokenStore: 'invalid-store' // Invalid option
  });
  console.assert(false, 'Should throw error for invalid config');
} catch (error) {
  // Expected: Specific error about invalid options
  console.assert(error.message.includes('prefix must start with'), 
    'Should explain prefix format requirement');
  console.assert(error.message.includes('tokenStore must be one of'), 
    'Should list valid tokenStore options');
}
```

### Stack Auth Connection Error Test

```javascript
// Test: Helpful error when Stack Auth API is unreachable
// Mock network failure
global.fetch = jest.fn(() => Promise.reject(new Error('Network Error')));

try {
  const { getUser } = await import('astro-stack-auth/server');
  await getUser(mockContext);
  console.assert(false, 'Should throw error for network failure');
} catch (error) {
  // Expected: User-friendly error with troubleshooting steps
  console.assert(error.message.includes('Stack Auth'), 
    'Should mention Stack Auth service');
  console.assert(error.message.includes('check your internet connection'), 
    'Should suggest checking connection');
  console.assert(error.message.includes('verify your credentials'), 
    'Should suggest checking credentials');
}
```

### Development vs Production Errors Test

```javascript
// Test: Different error handling based on environment
process.env.NODE_ENV = 'development';

try {
  // Trigger configuration error in development
  const stackAuth = await import('astro-stack-auth');
  // Expected: Detailed error with suggestions
} catch (devError) {
  console.assert(devError.stack, 'Development should include stack trace');
  console.assert(devError.message.includes('documentation'), 
    'Development should include doc links');
}

process.env.NODE_ENV = 'production';

try {
  // Same error in production
  const stackAuth = await import('astro-stack-auth');
  // Expected: User-friendly error without stack trace
} catch (prodError) {
  console.assert(!prodError.stack || prodError.stack.length < 200, 
    'Production should have minimal stack trace');
  console.assert(prodError.message.length < 500, 
    'Production errors should be concise');
}
```

### Configuration Validation Test

```javascript
// Test: Validation errors with specific guidance
import stackAuth from 'astro-stack-auth';

const invalidConfigs = [
  {
    config: { projectId: '' },
    expectedError: 'projectId cannot be empty'
  },
  {
    config: { prefix: '//' },
    expectedError: 'prefix cannot contain double slashes'
  },
  {
    config: { injectRoutes: 'yes' },
    expectedError: 'injectRoutes must be a boolean'
  }
];

invalidConfigs.forEach(({ config, expectedError }) => {
  try {
    stackAuth(config);
    console.assert(false, `Should reject config: ${JSON.stringify(config)}`);
  } catch (error) {
    console.assert(error.message.includes(expectedError), 
      `Should include specific error: ${expectedError}`);
  }
});
```

### Runtime Error Handling Test

```astro
---
// Test: Runtime errors with context
// pages/protected.astro
import { requireAuth } from 'astro-stack-auth/server';

try {
  const user = await requireAuth(Astro);
} catch (error) {
  // Expected: Error includes page context
  console.assert(error.message.includes('protected.astro'), 
    'Should mention which page had the error');
  console.assert(error.message.includes('requireAuth'), 
    'Should mention which function failed');
}
---
```

### Documentation Links Test

```javascript
// Test: Errors include helpful documentation links
try {
  const stackAuth = await import('astro-stack-auth');
  stackAuth.default({ invalidOption: true });
} catch (error) {
  // Expected: Error includes documentation URL
  console.assert(error.message.includes('https://'), 
    'Should include documentation URL');
  console.assert(error.message.includes('astro-stack-auth'), 
    'Should link to relevant documentation');
}
```

### Build Time Errors Test

```javascript
// Test: Clear errors during Astro build process
// When integration fails during build
try {
  // Simulate build-time error
  const buildResult = await build();
  console.assert(false, 'Build should fail with misconfiguration');
} catch (buildError) {
  // Expected: Clear indication of where the problem is
  console.assert(buildError.message.includes('astro.config'), 
    'Should reference configuration file');
  console.assert(buildError.message.includes('integration'), 
    'Should mention integration setup');
}
```

### Error Recovery Suggestions Test

```javascript
// Test: Errors include actionable recovery steps
const error = new Error('STACK_PROJECT_ID not found');
enhanceError(error);

// Expected: Error enhanced with recovery steps
console.assert(error.message.includes('1.'), 
  'Should include numbered recovery steps');
console.assert(error.message.includes('Stack Auth dashboard'), 
  'Should mention where to find credentials');
console.assert(error.message.includes('.env'), 
  'Should mention environment file');
```

## Dependencies

- Environment variable validation
- Configuration schema validation
- Error enhancement utilities
- Documentation link generation

## Implementation Notes

- Should validate configuration at integration setup time
- Runtime errors should include contextual information
- Development mode should provide more detailed errors
- Production mode should have user-friendly errors
- Include links to relevant documentation sections
- Consider error codes for programmatic handling
- Validate Stack Auth connectivity during setup

## Definition of Done

- [ ] Clear error messages for all common misconfigurations
- [ ] Environment-appropriate error detail levels
- [ ] Documentation links included in errors
- [ ] Actionable recovery suggestions provided
- [ ] Build-time and runtime error handling
- [ ] Tests validate error message quality