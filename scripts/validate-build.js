#!/usr/bin/env node
/**
 * Build Output Validation and Testing Script
 * 
 * Validates that the build system produces correct and complete outputs
 * for the Astro Stack Auth integration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Build output configuration
const DIST_DIR = path.join(__dirname, '../dist');
const PACKAGE_JSON = path.join(__dirname, '../package.json');

// Expected entry points from package.json exports
const EXPECTED_ENTRY_POINTS = [
  'index',
  'server', 
  'client',
  'components'
];

// Expected file formats
const EXPECTED_FORMATS = [
  '.js',   // CommonJS
  '.mjs',  // ESM
  '.d.ts', // TypeScript declarations
  '.d.mts' // TypeScript ESM declarations
];

// Expected source map files
const EXPECTED_SOURCE_MAPS = [
  '.js.map',
  '.mjs.map'
];

let errors = [];
let warnings = [];

/**
 * Log validation results
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

/**
 * Validate that dist directory exists
 */
function validateDistDirectory() {
  log('info', 'Validating dist directory...');
  
  if (!fs.existsSync(DIST_DIR)) {
    errors.push('Build output directory (dist/) does not exist');
    return false;
  }
  
  const stats = fs.statSync(DIST_DIR);
  if (!stats.isDirectory()) {
    errors.push('dist/ exists but is not a directory');
    return false;
  }
  
  log('info', 'Dist directory validation passed');
  return true;
}

/**
 * Validate all expected entry point files exist
 */
function validateEntryPoints() {
  log('info', 'Validating entry point files...');
  
  const distFiles = fs.readdirSync(DIST_DIR);
  
  for (const entryPoint of EXPECTED_ENTRY_POINTS) {
    for (const format of EXPECTED_FORMATS) {
      const fileName = `${entryPoint}${format}`;
      if (!distFiles.includes(fileName)) {
        errors.push(`Missing build output: ${fileName}`);
      }
    }
    
    // Validate source maps
    for (const mapExt of EXPECTED_SOURCE_MAPS) {
      const mapFileName = `${entryPoint}${mapExt}`;
      if (!distFiles.includes(mapFileName)) {
        warnings.push(`Missing source map: ${mapFileName}`);
      }
    }
  }
  
  log('info', `Entry point validation completed for ${EXPECTED_ENTRY_POINTS.length} entry points`);
}

/**
 * Validate TypeScript declaration files are valid
 */
function validateTypeScriptDeclarations() {
  log('info', 'Validating TypeScript declaration files...');
  
  for (const entryPoint of EXPECTED_ENTRY_POINTS) {
    const dtsFile = path.join(DIST_DIR, `${entryPoint}.d.ts`);
    const dmtsFile = path.join(DIST_DIR, `${entryPoint}.d.mts`);
    
    // Check .d.ts files
    if (fs.existsSync(dtsFile)) {
      const content = fs.readFileSync(dtsFile, 'utf8');
      
      // Basic validation that the file has TypeScript declarations
      if (!content.includes('export') && !content.includes('declare')) {
        errors.push(`${entryPoint}.d.ts appears to be empty or invalid`);
      }
      
      // Check for syntax errors (basic check)
      if (content.includes('syntax error') || content.includes('Error:')) {
        errors.push(`${entryPoint}.d.ts contains apparent syntax errors`);
      }
    }
    
    // Check .d.mts files
    if (fs.existsSync(dmtsFile)) {
      const content = fs.readFileSync(dmtsFile, 'utf8');
      
      if (!content.includes('export') && !content.includes('declare')) {
        errors.push(`${entryPoint}.d.mts appears to be empty or invalid`);
      }
    }
  }
  
  log('info', 'TypeScript declaration validation completed');
}

/**
 * Validate ESM and CJS module compatibility
 */
function validateModuleFormats() {
  log('info', 'Validating ESM and CJS module formats...');
  
  for (const entryPoint of EXPECTED_ENTRY_POINTS) {
    const cjsFile = path.join(DIST_DIR, `${entryPoint}.js`);
    const esmFile = path.join(DIST_DIR, `${entryPoint}.mjs`);
    
    // Validate CJS format
    if (fs.existsSync(cjsFile)) {
      const cjsContent = fs.readFileSync(cjsFile, 'utf8');
      
      // Should contain CommonJS exports
      if (!cjsContent.includes('exports') && !cjsContent.includes('module.exports')) {
        errors.push(`${entryPoint}.js does not appear to be valid CommonJS (missing exports)`);
      }
    }
    
    // Validate ESM format
    if (fs.existsSync(esmFile)) {
      const esmContent = fs.readFileSync(esmFile, 'utf8');
      
      // Should contain ES modules exports
      if (!esmContent.includes('export') && esmContent.trim().length > 0) {
        warnings.push(`${entryPoint}.mjs may not contain valid ES module exports`);
      }
    }
  }
  
  log('info', 'Module format validation completed');
}

/**
 * Test that modules can be imported/required without errors
 */
function validateImportExports() {
  log('info', 'Validating imports and exports...');
  
  for (const entryPoint of EXPECTED_ENTRY_POINTS) {
    const cjsFile = path.join(DIST_DIR, `${entryPoint}.js`);
    
    if (fs.existsSync(cjsFile)) {
      try {
        // Try to require the CommonJS module
        const modulePath = path.resolve(cjsFile);
        delete require.cache[modulePath]; // Clear cache
        const module = require(modulePath);
        
        // Check that something was exported
        if (!module || (typeof module === 'object' && Object.keys(module).length === 0)) {
          warnings.push(`${entryPoint}.js exports appear to be empty`);
        }
        
        log('info', `Successfully imported ${entryPoint}.js`);
      } catch (error) {
        errors.push(`Failed to import ${entryPoint}.js: ${error.message}`);
      }
    }
  }
  
  log('info', 'Import/export validation completed');
}

/**
 * Validate package.json exports match built files
 */
function validatePackageExports() {
  log('info', 'Validating package.json exports...');
  
  if (!fs.existsSync(PACKAGE_JSON)) {
    errors.push('package.json not found');
    return;
  }
  
  const packageData = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const exports = packageData.exports || {};
  
  // Validate main entry point
  if (packageData.main && !fs.existsSync(path.join(__dirname, '..', packageData.main))) {
    errors.push(`package.json main field points to non-existent file: ${packageData.main}`);
  }
  
  if (packageData.module && !fs.existsSync(path.join(__dirname, '..', packageData.module))) {
    errors.push(`package.json module field points to non-existent file: ${packageData.module}`);
  }
  
  if (packageData.types && !fs.existsSync(path.join(__dirname, '..', packageData.types))) {
    errors.push(`package.json types field points to non-existent file: ${packageData.types}`);
  }
  
  // Validate exports map
  for (const [exportPath, exportConfig] of Object.entries(exports)) {
    if (typeof exportConfig === 'object') {
      for (const [condition, filePath] of Object.entries(exportConfig)) {
        const fullPath = path.join(__dirname, '..', filePath);
        if (!fs.existsSync(fullPath)) {
          errors.push(`package.json exports["${exportPath}"]["${condition}"] points to non-existent file: ${filePath}`);
        }
      }
    }
  }
  
  log('info', 'Package.json exports validation completed');
}

/**
 * Perform smoke tests on critical functionality
 */
function runSmokeTests() {
  log('info', 'Running smoke tests...');
  
  // Test main integration export
  try {
    const mainModule = require(path.join(DIST_DIR, 'index.js'));
    
    if (!mainModule.default && !mainModule.stackAuth) {
      warnings.push('Main module does not export expected integration function');
    }
    
    log('info', 'Main module smoke test passed');
  } catch (error) {
    errors.push(`Main module smoke test failed: ${error.message}`);
  }
  
  // Test server module exports
  try {
    const serverModule = require(path.join(DIST_DIR, 'server.js'));
    
    const expectedServerExports = ['getUser', 'requireAuth', 'getSession'];
    for (const exportName of expectedServerExports) {
      if (typeof serverModule[exportName] !== 'function') {
        warnings.push(`Server module missing or invalid export: ${exportName}`);
      }
    }
    
    log('info', 'Server module smoke test passed');
  } catch (error) {
    errors.push(`Server module smoke test failed: ${error.message}`);
  }
  
  // Test client module exports
  try {
    const clientModule = require(path.join(DIST_DIR, 'client.js'));
    
    const expectedClientExports = ['signIn', 'signOut', 'redirectToSignIn', 'redirectToSignUp'];
    for (const exportName of expectedClientExports) {
      if (typeof clientModule[exportName] !== 'function') {
        warnings.push(`Client module missing or invalid export: ${exportName}`);
      }
    }
    
    log('info', 'Client module smoke test passed');
  } catch (error) {
    errors.push(`Client module smoke test failed: ${error.message}`);
  }
  
  log('info', 'Smoke tests completed');
}

/**
 * Main validation function
 */
function validateBuild() {
  log('info', 'Starting build output validation...');
  
  // Run all validation checks
  const distExists = validateDistDirectory();
  
  if (distExists) {
    validateEntryPoints();
    validateTypeScriptDeclarations();
    validateModuleFormats();
    validateImportExports();
    validatePackageExports();
    runSmokeTests();
  }
  
  // Report results
  log('info', '=== BUILD VALIDATION RESULTS ===');
  
  if (errors.length > 0) {
    log('error', `Found ${errors.length} error(s):`);
    errors.forEach((error, index) => {
      log('error', `  ${index + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    log('warn', `Found ${warnings.length} warning(s):`);
    warnings.forEach((warning, index) => {
      log('warn', `  ${index + 1}. ${warning}`);
    });
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    log('info', '✅ All build validation checks passed!');
    return 0;
  }
  
  if (errors.length === 0) {
    log('info', '✅ Build validation passed with warnings');
    return 0;
  }
  
  log('error', '❌ Build validation failed');
  return 1;
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = validateBuild();
  process.exit(exitCode);
}

export { validateBuild };