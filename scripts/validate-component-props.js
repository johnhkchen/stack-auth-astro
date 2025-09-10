#!/usr/bin/env node
/**
 * Build-time Component Prop Validation Script
 * 
 * Validates Stack Auth component usage across all Astro, JSX, and TSX files
 * in the project to catch prop validation errors before deployment.
 * 
 * Sprint: 001
 * Task: 1.2.28 - Implement Build-time Component Prop Validation Pipeline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateBuildComponents } from '../dist/build-time-validation.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration from command line arguments and environment
 */
function getConfiguration() {
  const args = process.argv.slice(2);
  
  const config = {
    include: ['**/*.astro', '**/*.jsx', '**/*.tsx'],
    exclude: ['node_modules/**', 'dist/**', '.astro/**', 'tests/**'],
    failOnError: true,
    showWarnings: true,
    enableCache: true,
    cacheMaxAge: 24,
    verbose: false
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-fail':
        config.failOnError = false;
        break;
      case '--no-warnings':
        config.showWarnings = false;
        break;
      case '--no-cache':
        config.enableCache = false;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--include':
        if (args[i + 1]) {
          config.include = args[i + 1].split(',');
          i++;
        }
        break;
      case '--exclude':
        if (args[i + 1]) {
          config.exclude = args[i + 1].split(',');
          i++;
        }
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Stack Auth Build-time Component Validation

Usage: node scripts/validate-component-props.js [options]

Options:
  --no-fail         Don't fail build on validation errors (default: fail)
  --no-warnings     Don't show validation warnings (default: show)  
  --no-cache        Disable validation result caching (default: enabled)
  --verbose         Show verbose output
  --include <glob>  Comma-separated list of file patterns to include
  --exclude <glob>  Comma-separated list of file patterns to exclude
  --help           Show this help message

Examples:
  # Run with default settings
  node scripts/validate-component-props.js
  
  # Run without failing on errors
  node scripts/validate-component-props.js --no-fail
  
  # Run only on Astro files
  node scripts/validate-component-props.js --include "**/*.astro"
  
  # Run with verbose output
  node scripts/validate-component-props.js --verbose

Environment Variables:
  STACK_AUTH_VALIDATION_CACHE_DIR   Cache directory (default: .astro/stack-auth-cache)
  NODE_ENV                         Environment mode
`);
}

/**
 * Log validation results with timestamps
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const levelColors = {
    info: '\x1b[36m',    // Cyan
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    success: '\x1b[32m'  // Green
  };
  const reset = '\x1b[0m';
  const color = levelColors[level] || '';
  
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`);
}

/**
 * Check if build system is available
 */
async function checkBuildSystem() {
  const distDir = path.join(__dirname, '../dist');
  const buildValidationFile = path.join(distDir, 'build-time-validation.mjs');
  
  if (!fs.existsSync(buildValidationFile)) {
    log('error', 'Build-time validation module not found. Please run "npm run build" first.');
    log('info', 'Expected file: ' + buildValidationFile);
    return false;
  }
  
  return true;
}

/**
 * Main validation function
 */
async function runValidation() {
  const config = getConfiguration();
  
  log('info', 'Starting Stack Auth component prop validation...');
  
  if (config.verbose) {
    log('info', 'Configuration:');
    console.log(JSON.stringify(config, null, 2));
  }
  
  try {
    // Check if build system is available
    if (!(await checkBuildSystem())) {
      process.exit(1);
    }
    
    // Run validation
    const startTime = Date.now();
    const { success, result } = await validateBuildComponents(config);
    const endTime = Date.now();
    
    // Performance info
    if (config.verbose) {
      log('info', `Validation completed in ${endTime - startTime}ms`);
      log('info', `Cache enabled: ${config.enableCache}`);
      log('info', `Processed files: ${result.processedFiles.length}`);
    }
    
    // Determine exit code based on success
    let exitCode = success ? 0 : 1;
    
    if (result.hasErrors) {
      if (config.failOnError) {
        log('error', `Build validation failed with ${result.errors.length} error(s)`);
      } else {
        log('warn', `Build validation found ${result.errors.length} error(s) but continuing (--no-fail)`);
        exitCode = 0;
      }
    }
    
    if (result.hasWarnings && config.showWarnings) {
      log('warn', `Build validation found ${result.warnings.length} warning(s)`);
    }
    
    if (!result.hasErrors && !result.hasWarnings) {
      log('success', 'All Stack Auth component validations passed! ✅');
    }
    
    return exitCode;
    
  } catch (error) {
    log('error', 'Validation failed with error:');
    console.error(error);
    
    if (config.verbose) {
      console.error(error.stack);
    }
    
    return config.failOnError ? 1 : 0;
  }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  log('info', 'Validation interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('info', 'Validation terminated');
  process.exit(1);
});

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      log('error', 'Unexpected error during validation:');
      console.error(error);
      process.exit(1);
    });
}

export { runValidation, getConfiguration };