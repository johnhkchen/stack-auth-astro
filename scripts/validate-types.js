#!/usr/bin/env node
/**
 * TypeScript Declaration Validation Script
 * 
 * Validates that generated TypeScript declaration files are syntactically
 * correct and can be properly imported by TypeScript consumers.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Build output configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const TEMP_DIR = path.join(PROJECT_ROOT, 'temp-type-validation');

// Entry points to validate
const ENTRY_POINTS = [
  'index',
  'server',
  'client',
  'components'
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
 * Clean up temporary files
 */
function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

/**
 * Create temporary test files for type checking
 */
function createTypeTestFiles() {
  log('info', 'Creating temporary type test files...');
  
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  // Create test files for each entry point
  const testFiles = [];
  
  // Test main integration import
  const indexTest = `
// Type validation test for main integration
import astroStackAuth, { type StackAuthConfig, type StackAuthOptions } from '../dist/index';

// Test integration options type
const options: StackAuthOptions = {
  prefix: '/auth',
  addReactRenderer: true,
  config: {
    projectId: 'test',
    publishableClientKey: 'test-key',
    secretServerKey: 'test-secret'
  }
};

// Test integration function
const integration = astroStackAuth(options);

export { integration, options };
`;
  
  const indexTestPath = path.join(TEMP_DIR, 'test-index.ts');
  fs.writeFileSync(indexTestPath, indexTest);
  testFiles.push(indexTestPath);
  
  // Test server-side imports
  const serverTest = `
// Type validation test for server module
import { getUser, requireAuth, getSession } from '../dist/server';
import type { APIContext } from 'astro';

// Test server function types
async function testServerFunctions(context: APIContext) {
  const user = await getUser(context);
  const session = await getSession(context);
  
  if (user) {
    const requiredUser = await requireAuth(context);
    return { user, session, requiredUser };
  }
  
  return { user: null, session };
}

export { testServerFunctions };
`;
  
  const serverTestPath = path.join(TEMP_DIR, 'test-server.ts');
  fs.writeFileSync(serverTestPath, serverTest);
  testFiles.push(serverTestPath);
  
  // Test client-side imports
  const clientTest = `
// Type validation test for client module  
import { signIn, signOut, redirectToSignIn, redirectToSignUp, redirectToAccount } from '../dist/client';

// Test client function types
async function testClientFunctions() {
  await signIn('google');
  await signOut();
  redirectToSignIn('/callback');
  redirectToSignUp('/signup-callback');
  redirectToAccount('/account-callback');
}

export { testClientFunctions };
`;
  
  const clientTestPath = path.join(TEMP_DIR, 'test-client.ts');
  fs.writeFileSync(clientTestPath, clientTest);
  testFiles.push(clientTestPath);
  
  // Test component imports (Sprint 001 - types only, no actual components yet)
  const componentsTest = `
// Type validation test for components module
import componentsModule, { 
  type StackAuthComponentProps,
  type StackProviderProps,
  type StackAuthFC,
  type ReactFC 
} from '../dist/components';
import React from 'react';

// Test that we can import the default export
const components = componentsModule;

// Test component type definitions 
type TestComponentProps = StackAuthComponentProps & {
  title: string;
};

const TestComponent: StackAuthFC<TestComponentProps> = ({ children, user, session, title }) => {
  return React.createElement('div', { title }, children);
};

// Test provider props type
type TestProviderProps = StackProviderProps;

export { TestComponent, components, type TestProviderProps };
`;
  
  const componentsTestPath = path.join(TEMP_DIR, 'test-components.tsx');
  fs.writeFileSync(componentsTestPath, componentsTest);
  testFiles.push(componentsTestPath);
  
  log('info', `Created ${testFiles.length} type test files`);
  return testFiles;
}

/**
 * Run TypeScript compiler on test files
 */
async function runTypeScriptValidation(testFiles) {
  log('info', 'Running TypeScript compiler validation...');
  
  try {
    // Create a temporary tsconfig for validation
    const tempTsConfig = {
      compilerOptions: {
        target: 'es2020',
        module: 'esnext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: true,
        noEmit: true
      },
      include: testFiles.map(f => path.relative(TEMP_DIR, f)),
      exclude: ['node_modules', 'dist']
    };
    
    const tempTsConfigPath = path.join(TEMP_DIR, 'tsconfig.json');
    fs.writeFileSync(tempTsConfigPath, JSON.stringify(tempTsConfig, null, 2));
    
    // Run TypeScript compiler
    const { stdout, stderr } = await execAsync(
      `npx tsc --project "${tempTsConfigPath}" --pretty`,
      { cwd: PROJECT_ROOT }
    );
    
    if (stderr && stderr.trim()) {
      // Parse TypeScript errors
      const tsErrors = stderr.split('\n').filter(line => 
        line.includes('error TS') || line.includes('Found ')
      );
      
      if (tsErrors.length > 0) {
        tsErrors.forEach(error => {
          errors.push(`TypeScript compilation error: ${error.trim()}`);
        });
      } else {
        warnings.push(`TypeScript compiler warnings: ${stderr.trim()}`);
      }
    }
    
    log('info', 'TypeScript compiler validation completed');
    
  } catch (error) {
    errors.push(`TypeScript compilation failed: ${error.message}`);
    if (error.stdout) {
      log('error', `TypeScript stdout: ${error.stdout}`);
    }
    if (error.stderr) {
      log('error', `TypeScript stderr: ${error.stderr}`);
    }
  }
}

/**
 * Validate individual declaration files syntax
 */
function validateDeclarationFileSyntax() {
  log('info', 'Validating declaration file syntax...');
  
  for (const entryPoint of ENTRY_POINTS) {
    const dtsFile = path.join(DIST_DIR, `${entryPoint}.d.ts`);
    const dmtsFile = path.join(DIST_DIR, `${entryPoint}.d.mts`);
    
    // Validate .d.ts file
    if (fs.existsSync(dtsFile)) {
      try {
        const content = fs.readFileSync(dtsFile, 'utf8');
        
        // Basic syntax checks
        if (!content.trim()) {
          warnings.push(`${entryPoint}.d.ts is empty`);
          continue;
        }
        
        // Check for common syntax issues
        const syntaxIssues = [];
        
        if (content.includes('undefined') && !content.includes('| undefined')) {
          syntaxIssues.push('Contains bare undefined types');
        }
        
        if (content.includes('any;') && !content.includes(': any')) {
          syntaxIssues.push('Contains bare any types');
        }
        
        // Check for unterminated declarations
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
          syntaxIssues.push('Mismatched braces');
        }
        
        if (syntaxIssues.length > 0) {
          warnings.push(`${entryPoint}.d.ts syntax issues: ${syntaxIssues.join(', ')}`);
        }
        
      } catch (error) {
        errors.push(`Failed to read ${entryPoint}.d.ts: ${error.message}`);
      }
    } else {
      errors.push(`Missing declaration file: ${entryPoint}.d.ts`);
    }
    
    // Validate .d.mts file
    if (fs.existsSync(dmtsFile)) {
      try {
        const content = fs.readFileSync(dmtsFile, 'utf8');
        if (!content.trim()) {
          warnings.push(`${entryPoint}.d.mts is empty`);
        }
      } catch (error) {
        errors.push(`Failed to read ${entryPoint}.d.mts: ${error.message}`);
      }
    } else {
      errors.push(`Missing ESM declaration file: ${entryPoint}.d.mts`);
    }
  }
  
  log('info', 'Declaration file syntax validation completed');
}

/**
 * Validate that declarations match package.json exports
 */
function validatePackageExportsTypeMapping() {
  log('info', 'Validating package.json exports type mapping...');
  
  try {
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const exports = packageData.exports || {};
    
    for (const [exportPath, exportConfig] of Object.entries(exports)) {
      if (typeof exportConfig === 'object' && exportConfig.types) {
        const typeFile = path.join(PROJECT_ROOT, exportConfig.types);
        if (!fs.existsSync(typeFile)) {
          errors.push(`package.json exports["${exportPath}"].types points to non-existent file: ${exportConfig.types}`);
        }
      }
    }
    
    // Check main types field
    if (packageData.types) {
      const mainTypeFile = path.join(PROJECT_ROOT, packageData.types);
      if (!fs.existsSync(mainTypeFile)) {
        errors.push(`package.json types field points to non-existent file: ${packageData.types}`);
      }
    }
    
  } catch (error) {
    errors.push(`Failed to validate package.json exports: ${error.message}`);
  }
  
  log('info', 'Package.json exports validation completed');
}

/**
 * Main validation function
 */
async function validateTypes() {
  log('info', 'Starting TypeScript declaration validation...');
  
  // Ensure cleanup on exit
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  try {
    // Basic validation
    validateDeclarationFileSyntax();
    validatePackageExportsTypeMapping();
    
    // Create and run comprehensive type tests
    const testFiles = createTypeTestFiles();
    await runTypeScriptValidation(testFiles);
    
  } catch (error) {
    errors.push(`Validation failed: ${error.message}`);
  } finally {
    cleanup();
  }
  
  // Report results
  log('info', '=== TYPESCRIPT VALIDATION RESULTS ===');
  
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
    log('info', '✅ All TypeScript declaration validation checks passed!');
    return 0;
  }
  
  if (errors.length === 0) {
    log('info', '✅ TypeScript declaration validation passed with warnings');
    return 0;
  }
  
  log('error', '❌ TypeScript declaration validation failed');
  return 1;
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = await validateTypes();
  process.exit(exitCode);
}

export { validateTypes };