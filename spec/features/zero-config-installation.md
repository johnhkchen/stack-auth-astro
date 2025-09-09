# Feature: Zero Configuration Installation

**GitHub Issue:** #1  
**Title:** User can install the integration with zero configuration

## Description

As a developer, I want to install the Stack Auth Astro integration with zero configuration so that I can get authentication working quickly without manual setup.

## Acceptance Criteria

- [ ] Package installs via npm/pnpm/yarn
- [ ] Integration auto-detects Stack Auth environment variables
- [ ] Integration works with default settings
- [ ] No manual configuration required for basic usage

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Installation Test

```javascript
// Test: Package can be installed
const { execSync } = require('child_process');

// Should install without errors
const result = execSync('npm install astro-stack-auth', { encoding: 'utf-8' });
// Expected: No installation errors
console.assert(!result.includes('error'), 'Installation should succeed');
```

### Zero Config Integration Test

```javascript
// Test: Integration works with just environment variables
const { defineConfig } = require('astro/config');
const stackAuth = require('astro-stack-auth');

const config = defineConfig({
  integrations: [stackAuth()] // No configuration object needed
});

// Expected: Configuration created without errors
console.assert(typeof config === 'object', 'Config should be an object');
console.assert(Array.isArray(config.integrations), 'Should have integrations array');
```

### Environment Variable Detection Test

```javascript
// Test: Auto-detects required Stack Auth environment variables
process.env.STACK_PROJECT_ID = 'test-project-id';
process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-publishable-key';  
process.env.STACK_SECRET_SERVER_KEY = 'test-secret-key';

const config = require('astro-stack-auth/config');
// Expected: Configuration auto-populated from env vars
console.assert(config.projectId === 'test-project-id', 'Should detect project ID');
console.assert(config.publishableClientKey === 'test-publishable-key', 'Should detect client key');
console.assert(config.secretServerKey === 'test-secret-key', 'Should detect server key');
```

### Build Success Test

```bash
# Test: Project builds successfully with zero config
npm run build
# Expected: Build completes without errors
echo $? # Should be 0
```

## Dependencies

- Depends on `@stackframe/stack` for Stack Auth SDK
- Requires Astro integration API
- Environment variable detection logic

## Implementation Notes

- Must validate required environment variables on startup
- Should provide clear error messages for missing configuration
- Integration should register middleware automatically
- Should inject required API routes automatically

## Definition of Done

- [ ] Package published to npm
- [ ] Integration registers with single function call
- [ ] Environment variables auto-detected
- [ ] Build succeeds with zero manual configuration
- [ ] Tests pass validating zero-config functionality
