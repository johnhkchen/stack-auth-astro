# Task 1.3: Build System Setup

**Sprint**: 001  
**Estimated Time**: 2-3 hours  
**Blockers**: Task 1.2 (TypeScript Configuration)

## Objective

Set up a modern build system using tsup to compile TypeScript source into distributable JavaScript with proper module formats and type declarations.

## Acceptance Criteria

- [ ] tsup configured for multiple output formats (CJS, ESM)
- [ ] Type declarations generated correctly
- [ ] Build produces files matching package.json exports
- [ ] Source maps generated for debugging
- [ ] Watch mode working for development

## Implementation Steps

1. **Configure tsup for multiple output formats**
2. **Set up build scripts in package.json**
3. **Configure output to match package.json exports**
4. **Test build produces correct files**
5. **Validate built package can be consumed**

## Test Specification

### Build Output Test

```javascript
// Test: Build produces expected files
const fs = require('fs');
const path = require('path');

// Expected: Main distribution files exist
const requiredFiles = [
  'dist/index.js',
  'dist/index.mjs', 
  'dist/index.d.ts',
  'dist/server.js',
  'dist/server.mjs',
  'dist/server.d.ts',
  'dist/client.js',
  'dist/client.mjs', 
  'dist/client.d.ts',
  'dist/components.js',
  'dist/components.mjs',
  'dist/components.d.ts'
];

requiredFiles.forEach(file => {
  console.assert(fs.existsSync(file), `${file} should exist after build`);
});
```

### Module Format Test

```javascript  
// Test: Output files have correct module formats
const fs = require('fs');

// Check CJS format
const cjsContent = fs.readFileSync('dist/index.js', 'utf-8');
console.assert(cjsContent.includes('module.exports') || cjsContent.includes('exports.'), 
  'CJS file should have CommonJS exports');

// Check ESM format  
const esmContent = fs.readFileSync('dist/index.mjs', 'utf-8');
console.assert(esmContent.includes('export'), 
  'ESM file should have ES module exports');
```

### Type Declarations Test

```javascript
// Test: Type declarations are valid
const fs = require('fs');

const typeFiles = [
  'dist/index.d.ts',
  'dist/server.d.ts', 
  'dist/client.d.ts',
  'dist/components.d.ts'
];

typeFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  console.assert(content.includes('export'), 
    `${file} should contain type exports`);
});
```

### Package Consumption Test

```javascript
// Test: Built package can be imported
const { execSync } = require('child_process');

// Test CJS import
try {
  const result = execSync('node -e "const pkg = require(\'./dist/index.js\'); console.log(typeof pkg)"', 
    { encoding: 'utf-8' });
  console.assert(result.trim() === 'function' || result.trim() === 'object', 
    'CJS import should work');
} catch (error) {
  console.assert(false, `CJS import failed: ${error.message}`);
}
```

### Watch Mode Test  

```bash
# Test: Watch mode works for development
# This test needs to be run manually
npm run dev &
PID=$!

# Make a change to a source file
echo "// test change" >> src/index.ts

# Wait for rebuild
sleep 3

# Check if files were rebuilt
test -f dist/index.js && echo "Watch mode working"

# Clean up
kill $PID
```

## Required Files

### tsup.config.ts
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts', 
    client: 'src/client.ts',
    components: 'src/components.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false, // Keep readable for debugging
  external: [
    'astro',
    '@stackframe/stack',
    '@stackframe/stack-ui'
  ],
  esbuildOptions: {
    banner: {
      js: '"use strict";'
    }
  }
});
```

### Updated package.json scripts
```json
{
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "dev": "tsup --watch",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run build"
  }
}
```

### .gitignore additions
```
# Build output
dist/
lib/

# Source maps  
*.map
```

## Validation Commands

```bash
# Clean and rebuild
npm run clean && npm run build

# Check build output
ls -la dist/

# Validate package structure
npm pack --dry-run

# Test imports work
node -e "console.log(require('./dist/index.js'))"

# Test watch mode
npm run dev
```

## Definition of Done

- [ ] `npm run build` completes without errors
- [ ] All expected output files are generated
- [ ] Package.json exports match built files
- [ ] Type declarations are valid and complete
- [ ] Built package can be imported in both CJS and ESM
- [ ] Watch mode rebuilds on file changes
- [ ] Doctests pass for this task