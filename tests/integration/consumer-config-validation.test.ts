/**
 * Consumer Configuration Validation Test
 * 
 * This test validates that recommended TypeScript configurations work correctly
 * for consumer projects using astro-stack-auth.
 * 
 * Sprint: 001  
 * Task: 1.2.11 - Consumer Module Resolution and Compatibility Documentation
 */

import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

describe('Consumer Configuration Validation', () => {
  const testConfigsDir = path.join(process.cwd(), 'test-configs');

  test('recommended configuration passes type check', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.recommended.json');
    
    // Verify config file exists
    expect(() => {
      readFileSync(configPath, 'utf8');
    }).not.toThrow();

    // Test type checking with recommended config
    expect(() => {
      execSync(`npx tsc --noEmit --project ${configPath}`, {
        stdio: 'pipe',
        timeout: 30000
      });
    }).not.toThrow();
  });

  test('bundler configuration passes type check', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.bundler.json');
    
    // Verify config file exists
    expect(() => {
      readFileSync(configPath, 'utf8');
    }).not.toThrow();

    // Test type checking with bundler config
    expect(() => {
      execSync(`npx tsc --noEmit --project ${configPath}`, {
        stdio: 'pipe',
        timeout: 30000
      });
    }).not.toThrow();
  });

  test('loose configuration passes type check', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.loose.json');
    
    // Verify config file exists
    expect(() => {
      readFileSync(configPath, 'utf8');
    }).not.toThrow();

    // Test type checking with loose config
    expect(() => {
      execSync(`npx tsc --noEmit --project ${configPath}`, {
        stdio: 'pipe',
        timeout: 30000
      });
    }).not.toThrow();
  });

  test('recommended config has correct moduleResolution', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.recommended.json');
    const configContent = JSON.parse(readFileSync(configPath, 'utf8'));
    
    expect(configContent.compilerOptions.moduleResolution).toBe('bundler');
    expect(configContent.compilerOptions.target).toBe('ES2022');
    expect(configContent.compilerOptions.strict).toBe(true);
    expect(configContent.compilerOptions.skipLibCheck).toBe(true);
  });

  test('bundler config extends base configuration correctly', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.bundler.json');
    const configContent = JSON.parse(readFileSync(configPath, 'utf8'));
    
    expect(configContent.extends).toBe('../tsconfig.json');
    expect(configContent.compilerOptions.moduleResolution).toBe('bundler');
    expect(configContent.compilerOptions.target).toBe('ES2022');
  });

  test('consumer imports work with recommended configuration', async () => {
    // Test that basic imports can be resolved with recommended config
    const testCode = `
      // Test imports that consumers would use
      import type { StackAuthConfig } from 'astro-stack-auth';
      import type { User, Session } from '@stackframe/stack';
      
      // Test server imports
      declare const getUser: typeof import('astro-stack-auth/server').getUser;
      declare const requireAuth: typeof import('astro-stack-auth/server').requireAuth;
      
      // Test client imports  
      declare const signIn: typeof import('astro-stack-auth/client').signIn;
      declare const signOut: typeof import('astro-stack-auth/client').signOut;
      
      // Test component types import (available in Sprint 001)
      import type { StackAuthFC } from 'astro-stack-auth/components';
      
      // Test configuration
      const config: StackAuthConfig = {
        projectId: 'test',
        publishableClientKey: 'key',
        secretServerKey: 'secret'
      };
      
      // Test user/session types
      const user: User | null = null;
      const session: Session | null = null;
      
      console.log('All imports resolved successfully');
    `;

    // Write test file
    const testFilePath = path.join(process.cwd(), 'temp-consumer-test.ts');
    require('fs').writeFileSync(testFilePath, testCode);

    // Create a temporary tsconfig that extends the recommended config and includes our test file
    const tempConfigPath = path.join(process.cwd(), 'temp-tsconfig.json');
    const tempConfig = {
      extends: './test-configs/tsconfig.recommended.json',
      include: [
        './temp-consumer-test.ts'
      ]
    };
    require('fs').writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));

    try {
      // Test with temporary config that includes our test file
      execSync(`npx tsc --noEmit --project ${tempConfigPath}`, {
        stdio: 'pipe',
        timeout: 30000
      });
      
      // If we reach here, the test passed
      expect(true).toBe(true);
    } finally {
      // Clean up test files
      try {
        require('fs').unlinkSync(testFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
      try {
        require('fs').unlinkSync(tempConfigPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('strict mode configuration guidelines are followed', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.recommended.json');
    const configContent = JSON.parse(readFileSync(configPath, 'utf8'));
    
    // Verify strict mode is enabled
    expect(configContent.compilerOptions.strict).toBe(true);
    
    // Verify exactOptionalPropertyTypes is NOT enabled (causes issues)
    expect(configContent.compilerOptions.exactOptionalPropertyTypes).toBeUndefined();
    
    // Verify other recommended strict settings
    expect(configContent.compilerOptions.forceConsistentCasingInFileNames).toBe(true);
    expect(configContent.compilerOptions.isolatedModules).toBe(true);
  });

  test('lib configuration includes required libraries', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.recommended.json');
    const configContent = JSON.parse(readFileSync(configPath, 'utf8'));
    
    const libs = configContent.compilerOptions.lib;
    expect(libs).toContain('ES2022');
    expect(libs).toContain('DOM');
    
    const types = configContent.compilerOptions.types;
    expect(types).toContain('node');
    expect(types).toContain('react');
    expect(types).toContain('react-dom');
  });

  test('essential compiler options are set correctly', () => {
    const configPath = path.join(testConfigsDir, 'tsconfig.recommended.json');
    const configContent = JSON.parse(readFileSync(configPath, 'utf8'));
    
    const opts = configContent.compilerOptions;
    
    // Module settings
    expect(opts.module).toBe('ESNext');
    expect(opts.moduleResolution).toBe('bundler');
    
    // Import settings
    expect(opts.allowSyntheticDefaultImports).toBe(true);
    expect(opts.esModuleInterop).toBe(true);
    expect(opts.resolveJsonModule).toBe(true);
    
    // Type checking
    expect(opts.skipLibCheck).toBe(true);
    expect(opts.declaration).toBe(true);
    expect(opts.noEmit).toBe(true);
  });

  test('configuration matrix combinations work', async () => {
    const combinations = [
      { config: 'tsconfig.recommended.json', name: 'Recommended' },
      { config: 'tsconfig.bundler.json', name: 'Bundler' },
      { config: 'tsconfig.loose.json', name: 'Loose' }
    ];

    const results = [];

    for (const combo of combinations) {
      const configPath = path.join(testConfigsDir, combo.config);
      
      try {
        execSync(`npx tsc --noEmit --project ${configPath}`, {
          stdio: 'pipe',
          timeout: 30000
        });
        results.push({ name: combo.name, success: true });
      } catch (error) {
        results.push({ name: combo.name, success: false, error: error.message });
      }
    }

    // All recommended configurations should pass
    const failures = results.filter(r => !r.success);
    
    if (failures.length > 0) {
      console.log('Configuration test failures:', failures);
    }
    
    // At minimum, bundler and loose should pass
    const bundlerResult = results.find(r => r.name === 'Bundler');
    const looseResult = results.find(r => r.name === 'Loose');
    
    expect(bundlerResult?.success).toBe(true);
    expect(looseResult?.success).toBe(true);
  });

  test('problematic configurations are properly documented', () => {
    // Test that we properly document why classic resolution fails
    const classicConfigPath = path.join(testConfigsDir, 'tsconfig.classic.json');
    
    expect(() => {
      execSync(`npx tsc --noEmit --project ${classicConfigPath}`, {
        stdio: 'pipe',
        timeout: 30000
      });
    }).toThrow(); // This should fail as documented
    
    // Test that node16 requires explicit extensions (this should fail without .js)
    const node16ConfigPath = path.join(testConfigsDir, 'tsconfig.node16.json');
    
    expect(() => {
      execSync(`npx tsc --noEmit --project ${node16ConfigPath}`, {
        stdio: 'pipe',
        timeout: 30000
      });
    }).toThrow(); // This should fail due to missing .js extensions
  });
});

describe('Consumer Setup Validation', () => {
  test('package.json exports are correctly configured', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Verify all required exports exist
    const exports = packageJson.exports;
    expect(exports['.']).toBeDefined();
    expect(exports['./server']).toBeDefined();
    expect(exports['./client']).toBeDefined();
    expect(exports['./components']).toBeDefined();
    expect(exports['./middleware']).toBeDefined();
    
    // Verify each export has types, import, and require
    for (const [key, exportDef] of Object.entries(exports)) {
      expect(exportDef.types).toBeDefined();
      expect(exportDef.import).toBeDefined();
      expect(exportDef.require).toBeDefined();
    }
  });

  test('peer dependencies are correctly specified', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    const peerDeps = packageJson.peerDependencies;
    
    // Check Astro requirement
    expect(peerDeps.astro).toBe('^5.0.0');
    
    // Check React requirements support both 18 and 19
    expect(peerDeps.react).toBe('^18.0.0 || ^19.0.0');
    expect(peerDeps['react-dom']).toBe('^18.0.0 || ^19.0.0');
  });

  test('Stack Auth dependencies are correctly versioned', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    const deps = packageJson.dependencies;
    
    // Check Stack Auth SDK versions
    expect(deps['@stackframe/stack']).toBe('^2.8.36');
    expect(deps['@stackframe/stack-ui']).toBe('^2.8.36');
  });
});