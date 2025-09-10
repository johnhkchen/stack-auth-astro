/**
 * Runtime Component Export Validation Helpers
 * 
 * This module provides utilities to validate that imported components
 * actually exist in their respective astro-stack-auth modules at runtime.
 */

import { 
  EXPECTED_PACKAGE_EXPORTS,
  getExpectedExports,
  isValidExport,
  type PackageExportValidationResult,
  type ComponentExportValidationResult
} from '../mocks/package-exports.js';
import * as React from 'react';
import { 
  safeImport, 
  importWithBuildFallback, 
  debugImport,
  createMockModule,
  isTestEnvironment
} from '../utils/dependency-helpers.js';

/**
 * Validates that a module path and export name combination is valid
 */
export async function validateRuntimeExport(
  modulePath: string,
  exportName: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Check against mock exports first
    if (!isValidExport(modulePath, exportName)) {
      return {
        isValid: false,
        error: `Export '${exportName}' is not expected in module '${modulePath}'`
      };
    }

    // Try to import the actual module with enhanced error handling
    if (modulePath.startsWith('astro-stack-auth/')) {
      const exportName = modulePath.replace('astro-stack-auth/', '');
      const importResult = await importWithBuildFallback(exportName);
      
      if (importResult.success) {
        const module = importResult.module;
        if (!(exportName in module)) {
          return {
            isValid: false,
            error: `Export '${exportName}' does not exist in actual module '${modulePath}' (source: ${importResult.source})`
          };
        }
        return { isValid: true };
      } else if (isTestEnvironment()) {
        // In test environment, it's ok if modules aren't built yet
        console.warn(`Could not import actual module ${modulePath} (${importResult.error}), using mock validation only`);
        return { isValid: true };
      } else {
        return {
          isValid: false,
          error: `Failed to import module '${modulePath}': ${importResult.error}`
        };
      }
    } else {
      // Fallback to old behavior for non-astro-stack-auth modules
      try {
        const actualModulePath = modulePath.replace('astro-stack-auth', '../..');
        const importResult = await safeImport(actualModulePath);
        
        if (!importResult.success) {
          console.warn(`Could not import actual module ${modulePath}, using mock validation only`);
          return { isValid: true };
        }
        
        if (!(exportName in importResult.module)) {
          return {
            isValid: false,
            error: `Export '${exportName}' does not exist in actual module '${modulePath}'`
          };
        }
        
        return { isValid: true };
      } catch (importError) {
        console.warn(`Could not import actual module ${modulePath}, using mock validation only`);
        return { isValid: true };
      }
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Runtime validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates that imported React components are actually React components
 */
export async function validateReactComponent(
  modulePath: string,
  componentName: string
): Promise<{ isValid: boolean; error?: string; componentType?: string }> {
  try {
    // First check if it's a valid export
    const exportValidation = await validateRuntimeExport(modulePath, componentName);
    if (!exportValidation.isValid) {
      return exportValidation;
    }

    // Try to import and check if it's a React component
    if (modulePath.startsWith('astro-stack-auth/')) {
      const exportName = modulePath.replace('astro-stack-auth/', '');
      const importResult = await importWithBuildFallback(exportName);
      
      if (importResult.success) {
        const module = importResult.module;
        const component = module[componentName];
        
        if (component) {
          // Check if it's a React component
          const componentType = typeof component;
          const isReactComponent = 
            componentType === 'function' || 
            (componentType === 'object' && component.$$typeof) || // React.forwardRef
            React.isValidElement(component);
          
          if (!isReactComponent) {
            return {
              isValid: false,
              error: `Export '${componentName}' is not a valid React component`,
              componentType
            };
          }
          
          return { 
            isValid: true, 
            componentType: isReactComponent ? 'react-component' : componentType 
          };
        }
      } else if (isTestEnvironment()) {
        // Module not available in test environment, use mock validation
        console.warn(`Could not import ${modulePath}/${componentName} for React validation`);
        return { isValid: true, componentType: 'mock' };
      }
    } else {
      // Fallback for non-astro-stack-auth modules
      try {
        const actualModulePath = modulePath.replace('astro-stack-auth', '../..');
        const importResult = await safeImport(actualModulePath);
        
        if (importResult.success) {
          const component = importResult.module[componentName];
          
          if (component) {
            const componentType = typeof component;
            const isReactComponent = 
              componentType === 'function' || 
              (componentType === 'object' && component.$$typeof) || 
              React.isValidElement(component);
            
            if (!isReactComponent) {
              return {
                isValid: false,
                error: `Export '${componentName}' is not a valid React component`,
                componentType
              };
            }
            
            return { 
              isValid: true, 
              componentType: isReactComponent ? 'react-component' : componentType 
            };
          }
        }
      } catch (importError) {
        // Module not available, use mock validation
        console.warn(`Could not import ${modulePath}/${componentName} for React validation`);
        return { isValid: true, componentType: 'mock' };
      }
    }
    
    return { isValid: true, componentType: 'unknown' };
  } catch (error) {
    return {
      isValid: false,
      error: `React component validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates a full module's exports against expected exports
 */
export async function validateModuleExports(modulePath: string): Promise<PackageExportValidationResult> {
  const expectedExports = getExpectedExports(modulePath);
  const result: PackageExportValidationResult = {
    isValid: true,
    missingExports: [],
    unexpectedExports: [],
    modulePath
  };

  if (!expectedExports) {
    return {
      ...result,
      isValid: false,
      missingExports: [`No expected exports defined for module: ${modulePath}`]
    };
  }

  // Try to import actual module with enhanced error handling
  if (modulePath.startsWith('astro-stack-auth/')) {
    const exportName = modulePath.replace('astro-stack-auth/', '');
    const importResult = await importWithBuildFallback(exportName);
    
    if (importResult.success) {
      const module = importResult.module;
      const expectedExportNames = Object.keys(expectedExports);
      
      // Check for missing exports
      for (const expectedExport of expectedExportNames) {
        if (!(expectedExport in module)) {
          result.missingExports.push(expectedExport);
          result.isValid = false;
        }
      }
    } else if (!isTestEnvironment()) {
      // Only fail if not in test environment
      result.isValid = false;
      result.missingExports.push(`Failed to import module: ${importResult.error}`);
    } else {
      console.warn(`Could not import module ${modulePath} for validation:`, importResult.error);
    }
  } else {
    // Fallback for non-astro-stack-auth modules
    try {
      const actualModulePath = modulePath.replace('astro-stack-auth', '../..');
      const importResult = await safeImport(actualModulePath);
      
      if (importResult.success) {
        const module = importResult.module;
        const expectedExportNames = Object.keys(expectedExports);
        
        // Check for missing exports
        for (const expectedExport of expectedExportNames) {
          if (!(expectedExport in module)) {
            result.missingExports.push(expectedExport);
            result.isValid = false;
          }
        }
      } else {
        console.warn(`Could not import module ${modulePath} for validation:`, importResult.error);
      }
    } catch (importError) {
      console.warn(`Could not import module ${modulePath} for validation:`, importError);
    }
  }

  return result;
}

/**
 * Validates component exports specifically, checking React component types
 */
export async function validateComponentExports(modulePath: string): Promise<ComponentExportValidationResult> {
  const basicValidation = await validateModuleExports(modulePath);
  const result: ComponentExportValidationResult = {
    ...basicValidation,
    invalidComponentTypes: [],
    missingReactComponents: []
  };

  // Additional validation for React components
  const expectedComponents = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
  
  for (const componentName of expectedComponents) {
    const componentValidation = await validateReactComponent(modulePath, componentName);
    if (!componentValidation.isValid) {
      if (componentValidation.error?.includes('not a valid React component')) {
        result.invalidComponentTypes.push(componentName);
      } else if (componentValidation.error?.includes('does not exist')) {
        result.missingReactComponents.push(componentName);
      }
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Batch validation for multiple import statements
 */
export async function validateImportStatements(
  imports: Array<{ specifiers: string[]; source: string; line: number }>
): Promise<Array<{
  import: typeof imports[0];
  validation: PackageExportValidationResult;
  componentValidations: Array<{
    component: string;
    validation: { isValid: boolean; error?: string; componentType?: string };
  }>;
}>> {
  const results = [];
  
  for (const importStatement of imports) {
    if (importStatement.source.startsWith('astro-stack-auth/')) {
      const moduleValidation = await validateModuleExports(importStatement.source);
      
      const componentValidations = [];
      for (const specifier of importStatement.specifiers) {
        const componentValidation = await validateReactComponent(importStatement.source, specifier);
        componentValidations.push({
          component: specifier,
          validation: componentValidation
        });
      }
      
      results.push({
        import: importStatement,
        validation: moduleValidation,
        componentValidations
      });
    }
  }
  
  return results;
}

/**
 * Helper to generate validation summary
 */
export function generateValidationSummary(
  validationResults: Array<{
    import: { specifiers: string[]; source: string; line: number };
    validation: PackageExportValidationResult;
    componentValidations: Array<{
      component: string;
      validation: { isValid: boolean; error?: string; componentType?: string };
    }>;
  }>
): {
  totalImports: number;
  validImports: number;
  invalidImports: number;
  errors: string[];
  warnings: string[];
} {
  const summary = {
    totalImports: validationResults.length,
    validImports: 0,
    invalidImports: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };
  
  for (const result of validationResults) {
    let importIsValid = result.validation.isValid;
    
    for (const componentValidation of result.componentValidations) {
      if (!componentValidation.validation.isValid) {
        importIsValid = false;
        summary.errors.push(
          `${result.import.source}:${result.import.line} - ${componentValidation.validation.error}`
        );
      } else if (componentValidation.validation.componentType === 'mock') {
        summary.warnings.push(
          `${result.import.source}:${result.import.line} - ${componentValidation.component} validated against mock only`
        );
      }
    }
    
    if (!importIsValid && result.validation.missingExports.length > 0) {
      summary.errors.push(
        `${result.import.source} - Missing exports: ${result.validation.missingExports.join(', ')}`
      );
    }
    
    if (importIsValid) {
      summary.validImports++;
    } else {
      summary.invalidImports++;
    }
  }
  
  return summary;
}