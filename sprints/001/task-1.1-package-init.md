# Task 1.1: Package Initialization

**Sprint**: 001  
**Estimated Time**: 2-3 hours  
**Blockers**: None

## Objective

Create a proper npm package structure with correct dependencies and metadata for the astro-stack-auth integration.

## Acceptance Criteria

- [ ] package.json with correct name, version, and dependencies
- [ ] Proper entry points for different module formats
- [ ] Stack Auth dependencies correctly installed
- [ ] Package can be installed locally via `npm pack`

## Implementation Steps

1. **Create package.json with proper metadata**
2. **Install Stack Auth dependencies**
3. **Set up entry points for different imports**
4. **Create basic directory structure**
5. **Validate package can be built and installed**

## Test Specification

### Package Installation Test

```javascript
// Test: Package has correct structure and dependencies
const packageJson = require('../../package.json');

// Expected: Correct package name
console.assert(packageJson.name === 'astro-stack-auth', 
  'Package name should be astro-stack-auth');

// Expected: Has required Stack Auth dependencies
console.assert(packageJson.dependencies['@stackframe/stack'], 
  'Should depend on @stackframe/stack');
console.assert(packageJson.peerDependencies['astro'], 
  'Should have astro as peer dependency');
```

### Entry Points Test

```javascript
// Test: Package exports are correctly configured
const packageJson = require('../../package.json');

// Expected: Main entry point
console.assert(packageJson.main, 'Should have main entry point');

// Expected: Module entry point  
console.assert(packageJson.module, 'Should have module entry point');

// Expected: TypeScript types
console.assert(packageJson.types, 'Should have types entry point');

// Expected: Exports map for Node.js
console.assert(packageJson.exports, 'Should have exports configuration');
```

### Local Installation Test

```bash
# Test: Package can be built and installed locally
npm pack
# Expected: Creates .tgz file without errors
ls *.tgz | wc -l | grep -q "1"
```

### Directory Structure Test

```javascript
// Test: Required directories exist
const fs = require('fs');

// Expected: Source directory
console.assert(fs.existsSync('src'), 'Should have src directory');

// Expected: Distribution directory after build
console.assert(fs.existsSync('dist') || fs.existsSync('lib'), 
  'Should have build output directory');
```

## Required Files

### package.json
```json
{
  "name": "astro-stack-auth",
  "version": "0.1.0",
  "description": "Stack Auth integration for Astro",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./server": {
      "types": "./dist/server.d.ts", 
      "import": "./dist/server.mjs",
      "require": "./dist/server.js"
    },
    "./client": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.mjs", 
      "require": "./dist/client.js"
    },
    "./components": {
      "types": "./dist/components.d.ts",
      "import": "./dist/components.mjs",
      "require": "./dist/components.js"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "docs:test": "markdown-doctest spec/features/*.md"
  },
  "keywords": [
    "astro",
    "authentication",
    "stack-auth",
    "integration"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@stackframe/stack": "^0.2.0",
    "@stackframe/stack-ui": "^0.2.0"
  },
  "peerDependencies": {
    "astro": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "astro": "^4.0.0",
    "markdown-doctest": "^1.1.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Directory Structure
```
src/
├── index.ts          # Main integration export
├── server.ts         # Server-side helpers
├── client.ts         # Client-side functions  
├── components.ts     # Component re-exports
├── middleware.ts     # Internal middleware
├── config.ts         # Configuration handling
└── types.ts          # TypeScript definitions
```

## Validation Commands

```bash
# Install dependencies
npm install

# Validate package structure
npm pack --dry-run

# Check for missing peer dependencies
npm ls

# Validate exports
node -e "console.log(require('./package.json').exports)"
```

## Definition of Done

- [ ] package.json validates with `npm pack --dry-run`
- [ ] All dependencies install without errors
- [ ] Required directories exist
- [ ] Entry points are correctly configured
- [ ] Package metadata is complete and accurate
- [ ] Doctests pass for this task