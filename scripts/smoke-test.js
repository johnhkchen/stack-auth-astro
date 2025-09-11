#!/usr/bin/env node
/**
 * Build Output Smoke Tests
 * 
 * Lightweight tests that verify critical functionality of build outputs
 * works as expected. These are fast tests that catch major regressions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Build output configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

// Entry points to test
const ENTRY_POINTS = [
  'index',
  'server', 
  'client',
  'components',
  'middleware'
];

let errors = [];
let passed = 0;
let total = 0;

/**
 * Log test results
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

/**
 * Run a smoke test with error handling
 */
function smokeTest(name, testFn) {
  total++;
  try {
    testFn();
    log('info', `✅ ${name}`);
    passed++;
  } catch (error) {
    log('error', `❌ ${name}: ${error.message}`);
    errors.push(`${name}: ${error.message}`);
  }
}

/**
 * Test that all required build files exist
 */
function testBuildFilesExist() {
  log('info', 'Running build files existence tests...');
  
  smokeTest('Dist directory exists', () => {
    if (!fs.existsSync(DIST_DIR)) {
      throw new Error('Build output directory does not exist');
    }
  });
  
  for (const entryPoint of ENTRY_POINTS) {
    smokeTest(`${entryPoint}.cjs exists`, () => {
      const filePath = path.join(DIST_DIR, `${entryPoint}.cjs`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing CommonJS build output: ${entryPoint}.cjs`);
      }
    });
    
    smokeTest(`${entryPoint}.mjs exists`, () => {
      const filePath = path.join(DIST_DIR, `${entryPoint}.mjs`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing ESM build output: ${entryPoint}.mjs`);
      }
    });
    
    smokeTest(`${entryPoint}.d.ts exists`, () => {
      const filePath = path.join(DIST_DIR, `${entryPoint}.d.ts`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing TypeScript declaration: ${entryPoint}.d.ts`);
      }
    });
  }
  
  log('info', 'Build files existence tests completed');
}

/**
 * Test that modules can be imported
 */
function testModuleImports() {
  log('info', 'Running module import tests...');
  
  for (const entryPoint of ENTRY_POINTS) {
    smokeTest(`Can require ${entryPoint}.cjs`, () => {
      const modulePath = path.join(DIST_DIR, `${entryPoint}.cjs`);
      delete require.cache[path.resolve(modulePath)];
      const module = require(modulePath);
      
      if (!module) {
        throw new Error('Module is null or undefined');
      }
      
      // For index module, we expect a function (the integration function)
      // For other modules, we expect an object with named exports
      if (entryPoint === 'index') {
        if (typeof module !== 'function') {
          throw new Error(`Index module is not a function (got ${typeof module})`);
        }
      } else {
        if (typeof module !== 'object') {
          throw new Error(`Module is not an object (got ${typeof module})`);
        }
      }
    });
  }
  
  log('info', 'Module import tests completed');
}

/**
 * Test basic functionality of each module
 */
function testModuleFunctionality() {
  log('info', 'Running module functionality tests...');
  
  // Test index module
  smokeTest('Index module exports integration function', () => {
    const modulePath = path.join(DIST_DIR, 'index.cjs');
    delete require.cache[path.resolve(modulePath)];
    const module = require(modulePath);
    
    // With named exports only, the module itself is the integration function
    if (typeof module !== 'function') {
      throw new Error('Index module does not export integration function (expected function)');
    }
  });
  
  // Test server module
  smokeTest('Server module exports auth functions', () => {
    const modulePath = path.join(DIST_DIR, 'server.cjs');
    delete require.cache[path.resolve(modulePath)];
    const module = require(modulePath);
    
    const expectedFunctions = ['getUser', 'requireAuth', 'getSession'];
    for (const funcName of expectedFunctions) {
      if (typeof module[funcName] !== 'function') {
        throw new Error(`Server module missing function: ${funcName}`);
      }
    }
  });
  
  // Test client module
  smokeTest('Client module exports auth functions', () => {
    const modulePath = path.join(DIST_DIR, 'client.cjs');
    delete require.cache[path.resolve(modulePath)];
    const module = require(modulePath);
    
    const expectedFunctions = ['signIn', 'signOut', 'redirectToSignIn', 'redirectToSignUp', 'redirectToAccount'];
    for (const funcName of expectedFunctions) {
      if (typeof module[funcName] !== 'function') {
        throw new Error(`Client module missing function: ${funcName}`);
      }
    }
  });
  
  // Test components module 
  smokeTest('Components module has valid exports', () => {
    const modulePath = path.join(DIST_DIR, 'components.cjs');
    delete require.cache[path.resolve(modulePath)];
    const module = require(modulePath);
    
    // Components module uses named exports only - check for expected component exports
    const expectedComponents = ['UserButton', 'SignIn', 'SignUp', 'AccountSettings', 'StackProvider'];
    for (const componentName of expectedComponents) {
      if (typeof module[componentName] !== 'function' && typeof module[componentName] !== 'object') {
        throw new Error(`Components module missing component: ${componentName}`);
      }
    }
  });

  // Test middleware module 
  smokeTest('Middleware module has valid exports', () => {
    const modulePath = path.join(DIST_DIR, 'middleware.cjs');
    delete require.cache[path.resolve(modulePath)];
    const module = require(modulePath);
    
    // Middleware module uses named exports - check for onRequest function
    if (typeof module.onRequest !== 'function') {
      throw new Error('Middleware module missing onRequest function');
    }
  });
  
  log('info', 'Module functionality tests completed');
}

/**
 * Test file sizes are reasonable 
 */
function testFileSizes() {
  log('info', 'Running file size tests...');
  
  for (const entryPoint of ENTRY_POINTS) {
    smokeTest(`${entryPoint}.cjs has reasonable size`, () => {
      const filePath = path.join(DIST_DIR, `${entryPoint}.cjs`);
      const stats = fs.statSync(filePath);
      
      if (stats.size === 0) {
        throw new Error('File is empty');
      }
      
      if (stats.size > 100000) { // 100KB
        throw new Error(`File is suspiciously large: ${stats.size} bytes`);
      }
    });
    
    smokeTest(`${entryPoint}.d.ts has reasonable size`, () => {
      const filePath = path.join(DIST_DIR, `${entryPoint}.d.ts`);
      const stats = fs.statSync(filePath);
      
      if (stats.size === 0) {
        throw new Error('Declaration file is empty');
      }
      
      if (stats.size > 50000) { // 50KB
        throw new Error(`Declaration file is suspiciously large: ${stats.size} bytes`);
      }
    });
  }
  
  log('info', 'File size tests completed');
}

/**
 * Test package.json configuration is valid
 */
function testPackageConfig() {
  log('info', 'Running package configuration tests...');
  
  smokeTest('package.json exists and is valid', () => {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    if (!fs.existsSync(packagePath)) {
      throw new Error('package.json does not exist');
    }
    
    try {
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (!packageData.name) {
        throw new Error('package.json missing name field');
      }
      
      if (!packageData.version) {
        throw new Error('package.json missing version field');
      }
      
      if (!packageData.main) {
        throw new Error('package.json missing main field');
      }
      
      if (!packageData.exports) {
        throw new Error('package.json missing exports field');
      }
      
    } catch (error) {
      throw new Error(`Invalid package.json: ${error.message}`);
    }
  });
  
  smokeTest('package.json exports match build outputs', () => {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check main export
    if (!fs.existsSync(path.join(PROJECT_ROOT, packageData.main))) {
      throw new Error(`Main file does not exist: ${packageData.main}`);
    }
    
    // Check exports map
    for (const [exportName, exportConfig] of Object.entries(packageData.exports)) {
      if (typeof exportConfig === 'object') {
        for (const [condition, filePath] of Object.entries(exportConfig)) {
          const fullPath = path.join(PROJECT_ROOT, filePath);
          if (!fs.existsSync(fullPath)) {
            throw new Error(`Export file does not exist: ${exportName}[${condition}] -> ${filePath}`);
          }
        }
      }
    }
  });
  
  log('info', 'Package configuration tests completed');
}

/**
 * Test basic integration functionality
 */
function testIntegrationSmoke() {
  log('info', 'Running integration smoke tests...');
  
  smokeTest('Integration can be called with options', () => {
    const modulePath = path.join(DIST_DIR, 'index.cjs');
    delete require.cache[path.resolve(modulePath)];
    const module = require(modulePath);
    
    // With named exports only, the module itself is the integration function
    const integrationFn = module;
    
    if (typeof integrationFn !== 'function') {
      throw new Error('integrationFn is not a function');
    }
    
    // Test that we can call the integration with basic options
    const result = integrationFn({
      prefix: '/test-auth',
      addReactRenderer: false
    });
    
    if (!result) {
      throw new Error('Integration function returned null/undefined');
    }
    
    if (typeof result !== 'object') {
      throw new Error(`Integration function returned ${typeof result}, expected object`);
    }
    
    // Should look like an Astro integration
    if (typeof result.name !== 'string') {
      throw new Error('Integration result missing name field');
    }
    
    if (typeof result.hooks !== 'object') {
      throw new Error('Integration result missing hooks field');
    }
  });
  
  log('info', 'Integration smoke tests completed');
}

/**
 * Main smoke test runner
 */
function runSmokeTests() {
  log('info', 'Starting build output smoke tests...');
  
  // Check prerequisites
  if (!fs.existsSync(DIST_DIR)) {
    log('error', 'Build output directory does not exist. Run npm run build first.');
    return 1;
  }
  
  // Run all test suites
  testBuildFilesExist();
  testModuleImports();
  testModuleFunctionality();
  testFileSizes();
  testPackageConfig();
  testIntegrationSmoke();
  
  // Report results
  log('info', '=== SMOKE TEST RESULTS ===');
  
  if (errors.length > 0) {
    log('error', `Failed tests: ${errors.length}/${total}`);
    errors.forEach((error, index) => {
      log('error', `  ${index + 1}. ${error}`);
    });
  }
  
  const passRate = ((passed / total) * 100).toFixed(1);
  
  if (passed === total) {
    log('info', `✅ All ${total} smoke tests passed! (${passRate}%)`);
    return 0;
  } else {
    log('error', `❌ ${passed}/${total} smoke tests passed (${passRate}%)`);
    return 1;
  }
}

// Run smoke tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = runSmokeTests();
  process.exit(exitCode);
}

export { runSmokeTests };