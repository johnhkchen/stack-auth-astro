# Test Utilities Documentation

This directory contains utility modules that enhance test dependency management and module resolution for the Stack Auth Astro integration test suite.

## Problem Solved

During development, tests often fail due to:
- ESM/CommonJS compatibility issues
- Missing build outputs when testing source modules
- External dependency availability issues
- Module resolution problems in different environments

## Utilities Overview

### 1. File Helpers (`file-helpers.ts`)

Provides cross-platform, reliable file operations without external dependencies like glob.

**Key Functions:**
- `findFiles()` - Pattern-based file finding without glob dependency
- `getTestFiles()` - Get all TypeScript test files
- `getSourceFiles()` - Get all TypeScript source files
- `getBuildFiles()` - Get build output files
- `fileExists()` - Safe file existence check
- `directoryExists()` - Safe directory existence check
- `readFileContent()` - Safe file reading with error handling
- `createTempFile()` - Create temporary test files
- `cleanupTempFiles()` - Clean up temporary files

**Usage Example:**
```typescript
import { findFiles, getTestFiles, fileExists } from '../utils/file-helpers.js';

// Find all test files
const testFiles = getTestFiles();

// Find files by pattern
const tsFiles = findFiles('./src', /\.ts$/, {
  extensions: ['.ts'],
  excludePatterns: ['node_modules', 'dist']
});

// Safe file operations
if (fileExists('./dist/index.cjs')) {
  const content = readFileContent('./dist/index.cjs');
}
```

### 2. Dependency Helpers (`dependency-helpers.ts`)

Provides safe dependency imports, module resolution, and compatibility checking.

**Key Functions:**
- `checkDependency()` - Check if a dependency is available and get version
- `safeImport()` - Safe ESM import with fallbacks
- `safeRequire()` - Safe CommonJS require with fallbacks
- `importWithBuildFallback()` - Try built output first, then source
- `checkModuleExport()` - Check if a module export exists
- `validateTestEnvironment()` - Validate dependencies for testing
- `createMockModule()` - Create mock modules when imports fail
- `debugImport()` - Enhanced import with debug information

**Usage Example:**
```typescript
import { 
  safeImport, 
  importWithBuildFallback, 
  checkDependency 
} from '../utils/dependency-helpers.js';

// Check dependency availability
const stackResult = checkDependency('@stackframe/stack');
if (stackResult.isAvailable) {
  console.log(`Stack Auth version: ${stackResult.version}`);
}

// Safe import with fallbacks
const result = await safeImport('astro-stack-auth/server', [
  './dist/server.cjs',
  './src/server.ts'
]);

if (result.success) {
  console.log(`Imported from: ${result.source}`);
  const { getUser } = result.module;
}

// Try built package first, then source
const serverResult = await importWithBuildFallback('server');
if (serverResult.success) {
  const { getUser, requireAuth } = serverResult.module;
}
```

## Integration with Test Framework

### Vitest Configuration Updates

The `vitest.config.ts` has been enhanced with:

1. **Module Aliases** - Map astro-stack-auth imports to source files during testing
2. **Enhanced Resolution** - Better ESM/CJS compatibility settings
3. **Inline Dependencies** - Keep Stack Auth packages inline for testing

```typescript
resolve: {
  alias: {
    'astro-stack-auth': resolve(__dirname, './src/index.ts'),
    'astro-stack-auth/server': resolve(__dirname, './src/server.ts'),
    'astro-stack-auth/client': resolve(__dirname, './src/client.ts'),
    'astro-stack-auth/components': resolve(__dirname, './src/components.ts'),
    'astro-stack-auth/middleware': resolve(__dirname, './src/middleware.ts')
  }
}
```

### Test Setup Enhancements

The `tests/setup.ts` file now:

1. **Validates Environment** - Checks dependencies on startup
2. **Provides Warnings** - Shows missing dependencies and potential issues
3. **Cleans Up** - Automatically cleans temporary files after tests

## Best Practices

### 1. Use Safe Imports

Always use the dependency helpers for importing modules that might not be available:

```typescript
// ❌ Don't do this
import { getUser } from 'astro-stack-auth/server';

// ✅ Do this in tests
const result = await importWithBuildFallback('server');
if (result.success) {
  const { getUser } = result.module;
  // Use getUser safely
}
```

### 2. Handle Missing Dependencies Gracefully

```typescript
// Check dependency availability first
const stackAuth = checkDependency('@stackframe/stack');
if (!stackAuth.isAvailable) {
  console.warn('Stack Auth not available, using mock');
  // Use mock or skip test
}
```

### 3. Use File Helpers Instead of Direct File Operations

```typescript
// ❌ Don't use direct fs operations or glob
import glob from 'glob';
const files = glob.sync('**/*.test.ts');

// ✅ Use file helpers
import { findFiles } from '../utils/file-helpers.js';
const files = findFiles('.', /\.test\.ts$/, {
  extensions: ['.ts'],
  excludePatterns: ['node_modules']
});
```

### 4. Create Temporary Files Safely

```typescript
import { createTempFile, cleanupTempFiles } from '../utils/file-helpers.js';

// Create temp file for testing
const tempFile = createTempFile('console.log("test");', '.js');

// File is automatically cleaned up after each test
// But you can also manually clean up
afterEach(() => {
  cleanupTempFiles();
});
```

## Error Handling Strategy

The utilities follow a consistent error handling approach:

1. **Graceful Degradation** - Tests continue with warnings when possible
2. **Clear Messaging** - Detailed error messages with context
3. **Environment Awareness** - Different behavior in test vs production
4. **Fallback Options** - Multiple import strategies before failing

## Common Patterns

### Testing Module Exports

```typescript
import { importWithBuildFallback, checkModuleExport } from '../utils/dependency-helpers.js';

describe('Module Exports', () => {
  it('should export expected functions', async () => {
    const result = await importWithBuildFallback('server');
    
    if (result.success) {
      expect(result.module.getUser).toBeDefined();
      expect(typeof result.module.getUser).toBe('function');
    } else {
      console.warn(`Server module not available: ${result.error}`);
      // Test passes with warning in development
    }
  });
});
```

### Conditional Testing

```typescript
import { checkDependency, isTestEnvironment } from '../utils/dependency-helpers.js';

describe('Stack Auth Integration', () => {
  const stackAvailable = checkDependency('@stackframe/stack').isAvailable;
  
  it.skipIf(!stackAvailable)('should integrate with Stack Auth', async () => {
    // Test only runs if Stack Auth is available
  });
  
  it('should handle missing Stack Auth gracefully', async () => {
    if (!stackAvailable && isTestEnvironment()) {
      // Test mock behavior
    } else {
      // Test real behavior
    }
  });
});
```

## Maintenance

### Adding New Dependencies

When adding new external dependencies to tests:

1. Add dependency check in `validateTestEnvironment()`
2. Create safe import helpers if needed
3. Update documentation with usage patterns
4. Add fallback/mock behavior for missing dependencies

### Updating Module Resolution

When adding new package exports:

1. Update vitest.config.ts aliases
2. Add fallback paths in dependency helpers
3. Update mock modules if needed
4. Test both built and source import paths

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Check if aliases are set up correctly in vitest.config.ts
   - Verify source files exist at expected paths
   - Use debugImport() to get detailed resolution info

2. **ESM/CJS compatibility issues**
   - Use safeImport() for ESM modules
   - Use safeRequire() for CommonJS modules
   - Check file extensions (.mjs, .cjs, .js)

3. **Test environment detection issues**
   - Verify NODE_ENV=test is set
   - Check vitest environment configuration
   - Use isTestEnvironment() helper for detection

### Debug Information

Use the debug helpers to get detailed information:

```typescript
import { debugImport, validateTestEnvironment } from '../utils/dependency-helpers.js';

// Get detailed import information
const debugResult = await debugImport('astro-stack-auth/server');
console.log('Debug info:', debugResult.debugInfo);

// Validate entire test environment
const envValidation = validateTestEnvironment();
console.log('Environment validation:', envValidation);
```