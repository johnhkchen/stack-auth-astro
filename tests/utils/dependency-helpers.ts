/**
 * Dependency Management Helpers for Tests
 * 
 * Provides safe dependency imports, module resolution, and compatibility
 * checking for the test environment.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { readFileContent, fileExists, PROJECT_ROOT } from './file-helpers.js';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);

/**
 * Dependency availability result
 */
export interface DependencyCheckResult {
  isAvailable: boolean;
  version?: string;
  error?: string;
  fallbackUsed?: boolean;
}

/**
 * Module import result
 */
export interface ModuleImportResult<T = any> {
  success: boolean;
  module?: T;
  error?: string;
  source: 'actual' | 'built' | 'mock' | 'fallback';
}

/**
 * Check if a dependency is available and get its version
 */
export function checkDependency(packageName: string): DependencyCheckResult {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageJson = JSON.parse(readFileContent(packageJsonPath) || '{}');
    
    return {
      isAvailable: true,
      version: packageJson.version
    };
  } catch (error) {
    return {
      isAvailable: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Safe module import with fallbacks
 */
export async function safeImport<T = any>(
  modulePath: string,
  fallbacks: string[] = []
): Promise<ModuleImportResult<T>> {
  // Try original module path first
  try {
    const module = await import(modulePath);
    return {
      success: true,
      module,
      source: 'actual'
    };
  } catch (originalError) {
    const originalErrorMsg = originalError instanceof Error ? originalError.message : String(originalError);
    
    // Try fallback paths
    for (const fallbackPath of fallbacks) {
      try {
        const module = await import(fallbackPath);
        return {
          success: true,
          module,
          source: 'fallback'
        };
      } catch {
        // Continue to next fallback
      }
    }
    
    return {
      success: false,
      error: `Failed to import ${modulePath}: ${originalErrorMsg}`,
      source: 'actual'
    };
  }
}

/**
 * Safe require with fallbacks for CommonJS modules
 */
export function safeRequire<T = any>(
  modulePath: string,
  fallbacks: string[] = []
): ModuleImportResult<T> {
  // Try original module path first
  try {
    // Clear cache to ensure fresh import
    const resolvedPath = require.resolve(modulePath);
    delete require.cache[resolvedPath];
    const module = require(modulePath);
    
    return {
      success: true,
      module,
      source: 'actual'
    };
  } catch (originalError) {
    const originalErrorMsg = originalError instanceof Error ? originalError.message : String(originalError);
    
    // Try fallback paths
    for (const fallbackPath of fallbacks) {
      try {
        const resolvedPath = require.resolve(fallbackPath);
        delete require.cache[resolvedPath];
        const module = require(fallbackPath);
        return {
          success: true,
          module,
          source: 'fallback'
        };
      } catch {
        // Continue to next fallback
      }
    }
    
    return {
      success: false,
      error: `Failed to require ${modulePath}: ${originalErrorMsg}`,
      source: 'actual'
    };
  }
}

/**
 * Try to import from built package first, then source
 */
export async function importWithBuildFallback<T = any>(
  packageExport: string
): Promise<ModuleImportResult<T>> {
  const builtPath = path.join(PROJECT_ROOT, 'dist', `${packageExport}.cjs`);
  const builtPathMjs = path.join(PROJECT_ROOT, 'dist', `${packageExport}.mjs`);
  const srcPath = path.join(PROJECT_ROOT, 'src', `${packageExport}.ts`);
  
  // Try built CommonJS version first
  if (fileExists(builtPath)) {
    const result = safeRequire<T>(builtPath);
    if (result.success) {
      return { ...result, source: 'built' };
    }
  }
  
  // Try built ESM version
  if (fileExists(builtPathMjs)) {
    try {
      const module = await import(builtPathMjs);
      return {
        success: true,
        module,
        source: 'built'
      };
    } catch {
      // Continue to source fallback
    }
  }
  
  // Try source version as fallback
  if (fileExists(srcPath)) {
    try {
      const module = await import(srcPath);
      return {
        success: true,
        module,
        source: 'actual'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        source: 'actual'
      };
    }
  }
  
  return {
    success: false,
    error: `Module ${packageExport} not found in built output or source`,
    source: 'actual'
  };
}

/**
 * Check if a module export exists
 */
export async function checkModuleExport(
  modulePath: string, 
  exportName: string
): Promise<{ exists: boolean; type?: string; error?: string }> {
  try {
    const importResult = await safeImport(modulePath);
    if (!importResult.success) {
      return { 
        exists: false, 
        error: importResult.error 
      };
    }
    
    const module = importResult.module;
    if (!(exportName in module)) {
      return { 
        exists: false, 
        error: `Export '${exportName}' not found in module` 
      };
    }
    
    const exportValue = module[exportName];
    return {
      exists: true,
      type: typeof exportValue
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get all available Stack Auth dependencies
 */
export function getStackAuthDependencies(): Record<string, DependencyCheckResult> {
  const stackPackages = [
    '@stackframe/stack',
    '@stackframe/stack-ui'
  ];
  
  const results: Record<string, DependencyCheckResult> = {};
  
  for (const packageName of stackPackages) {
    results[packageName] = checkDependency(packageName);
  }
  
  return results;
}

/**
 * Check if we're in a test environment where modules might not be built
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.VITEST === 'true' ||
         typeof globalThis.vi !== 'undefined';
}

/**
 * Create a mock module when actual import fails
 */
export function createMockModule(exportNames: string[]): any {
  const mock: any = {};
  
  for (const exportName of exportNames) {
    if (exportName === 'default') {
      mock.default = () => null;
    } else {
      // Create appropriate mock based on common patterns
      if (exportName.startsWith('use') || exportName.endsWith('Hook')) {
        // React hook mock
        mock[exportName] = () => null;
      } else if (/^[A-Z]/.test(exportName)) {
        // Component mock (starts with capital letter)
        mock[exportName] = () => null;
      } else {
        // Function mock
        mock[exportName] = () => Promise.resolve(null);
      }
    }
  }
  
  return mock;
}

/**
 * Enhanced import that provides detailed feedback
 */
export async function debugImport<T = any>(
  modulePath: string
): Promise<ModuleImportResult<T> & { 
  debugInfo: {
    resolvedPath?: string;
    fileExists?: boolean;
    isBuilt?: boolean;
    alternatives?: string[];
  }
}> {
  const debugInfo: any = {
    alternatives: []
  };
  
  try {
    // Try to resolve the module
    try {
      const resolvedPath = require.resolve(modulePath);
      debugInfo.resolvedPath = resolvedPath;
      debugInfo.fileExists = fileExists(resolvedPath);
    } catch {
      debugInfo.fileExists = false;
    }
    
    // Check if this is a built module
    debugInfo.isBuilt = modulePath.includes('/dist/');
    
    // Suggest alternatives
    if (modulePath.startsWith('astro-stack-auth/')) {
      const exportName = modulePath.replace('astro-stack-auth/', '');
      debugInfo.alternatives = [
        path.join(PROJECT_ROOT, 'dist', `${exportName}.cjs`),
        path.join(PROJECT_ROOT, 'dist', `${exportName}.mjs`),
        path.join(PROJECT_ROOT, 'src', `${exportName}.ts`)
      ];
    }
    
    const result = await safeImport<T>(modulePath);
    return { ...result, debugInfo };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      source: 'actual',
      debugInfo
    };
  }
}

/**
 * Validate environment and dependencies for testing
 */
export function validateTestEnvironment(): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  stackAuth: Record<string, DependencyCheckResult>;
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check Stack Auth dependencies
  const stackAuth = getStackAuthDependencies();
  
  for (const [packageName, result] of Object.entries(stackAuth)) {
    if (!result.isAvailable) {
      warnings.push(`Stack Auth package ${packageName} not available: ${result.error}`);
    }
  }
  
  // Check if build output exists
  const distExists = fileExists(path.join(PROJECT_ROOT, 'dist', 'index.cjs'));
  if (!distExists && !isTestEnvironment()) {
    warnings.push('Built package output not found - some tests may fail');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    stackAuth
  };
}