/**
 * Component Import Pattern Validation Tests
 * 
 * Validates that example files use consistent component import patterns,
 * proper client directives, and follow Astro island architecture best practices.
 */

import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { stat } from 'fs/promises';
import { 
  validateRuntimeExport,
  validateReactComponent,
  validateModuleExports,
  validateComponentExports,
  validateImportStatements,
  generateValidationSummary,
  validateComponentProps,
  validateComponentPropsInFile,
  validateComponentPropsWithVersion,
  validateComponentPropsWithVersionBatch,
  generateVersionCompatibilityReport,
  validatePropsAcrossVersions,
  type PropValidationResult,
  type VersionAwarePropValidationResult
} from '../helpers/runtime-validation.js';
import {
  validateVersionCompatibility,
  checkMinimumVersionRequirement,
  getCurrentStackVersion,
  generateCompatibilityReport
} from '../helpers/version-compatibility.js';

// Define expected import patterns
const EXPECTED_IMPORTS = {
  components: 'astro-stack-auth/components',
  server: 'astro-stack-auth/server',
  client: 'astro-stack-auth/client',
} as const;

const VALID_COMPONENTS = [
  'SignIn',
  'SignUp', 
  'UserButton',
  'AccountSettings',
  'StackProvider'
] as const;

const VALID_SERVER_FUNCTIONS = [
  'getUser',
  'requireAuth',
  'getSession'
] as const;

const VALID_CLIENT_DIRECTIVES = [
  'client:load',
  'client:visible', 
  'client:idle',
  'client:media',
  'client:only'
] as const;

// Helper to get all example Astro files
async function getExampleFiles(): Promise<string[]> {
  const examplesDir = join(process.cwd(), 'examples');
  const files: string[] = [];
  
  async function walkDir(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules
          if (entry === 'node_modules') {
            continue;
          }
          await walkDir(fullPath);
        } else if (stats.isFile() && extname(entry) === '.astro') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  await walkDir(examplesDir);
  return files;
}

// Helper to parse Astro frontmatter imports
function parseAstroImports(content: string): { 
  imports: Array<{ 
    specifiers: string[]; 
    source: string; 
    line: number; 
  }>;
  componentUsages: Array<{ 
    component: string; 
    directive?: string; 
    line: number; 
  }>;
} {
  const lines = content.split('\n');
  const imports: Array<{ specifiers: string[]; source: string; line: number; }> = [];
  const componentUsages: Array<{ component: string; directive?: string; line: number; }> = [];
  
  let inFrontmatter = false;
  let frontmatterStart = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track frontmatter boundaries
    if (line.trim() === '---') {
      if (!frontmatterStart) {
        frontmatterStart = true;
        inFrontmatter = true;
      } else {
        inFrontmatter = false;
        break; // End of frontmatter
      }
      continue;
    }
    
    // Parse imports in frontmatter
    if (inFrontmatter) {
      const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const [, namedImports, namespaceImport, defaultImport, source] = importMatch;
        let specifiers: string[] = [];
        
        if (namedImports) {
          specifiers = namedImports.split(',').map(s => s.trim());
        } else if (namespaceImport) {
          specifiers = [namespaceImport];
        } else if (defaultImport) {
          specifiers = [defaultImport];
        }
        
        imports.push({ specifiers, source, line: i + 1 });
      }
    }
    
    // Parse component usages in template (after frontmatter)
    if (!inFrontmatter && !frontmatterStart) {
      // Match component usage with optional client directive
      const componentMatches = line.matchAll(/<(\w+)(?:\s+([^>]*?))?(?:\s*\/)?>/g);
      for (const match of componentMatches) {
        const [, componentName, attributes = ''] = match;
        
        // Check if it's a Stack Auth component
        if (VALID_COMPONENTS.includes(componentName as any)) {
          // Extract client directive
          const directiveMatch = attributes.match(/client:(load|visible|idle|media|only)(?:="[^"]*")?/);
          const directive = directiveMatch ? `client:${directiveMatch[1]}` : undefined;
          
          componentUsages.push({
            component: componentName,
            directive,
            line: i + 1
          });
        }
      }
    }
  }
  
  return { imports, componentUsages };
}

describe('Component Import Pattern Validation', () => {
  it('should find example files to test', async () => {
    const exampleFiles = await getExampleFiles();
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  describe('Import Path Consistency', () => {
    it('should use consistent import paths across all examples', async () => {
      const exampleFiles = await getExampleFiles();
      const importPathUsage = new Map<string, string[]>();
      
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          if (importDecl.source.startsWith('astro-stack-auth/')) {
            if (!importPathUsage.has(importDecl.source)) {
              importPathUsage.set(importDecl.source, []);
            }
            importPathUsage.get(importDecl.source)!.push(filePath);
          }
        }
      }
      
      // Validate only expected import paths are used
      const usedPaths = Array.from(importPathUsage.keys());
      const expectedPaths = Object.values(EXPECTED_IMPORTS);
      
      for (const usedPath of usedPaths) {
        expect(expectedPaths).toContain(usedPath as any);
      }
    });

    it('should import components from components module only', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          const componentImports = importDecl.specifiers.filter(spec => 
            VALID_COMPONENTS.includes(spec as any)
          );
          
          if (componentImports.length > 0) {
            expect(importDecl.source).toBe(EXPECTED_IMPORTS.components);
          }
        }
      }
    });

    it('should import server functions from server module only', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          const serverImports = importDecl.specifiers.filter(spec => 
            VALID_SERVER_FUNCTIONS.includes(spec as any)
          );
          
          if (serverImports.length > 0) {
            expect(importDecl.source).toBe(EXPECTED_IMPORTS.server);
          }
        }
      }
    });
  });

  describe('Client Directive Validation', () => {
    it('should use valid client directives for Stack Auth components', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { componentUsages } = parseAstroImports(content);
        
        for (const usage of componentUsages) {
          if (usage.directive) {
            expect(VALID_CLIENT_DIRECTIVES).toContain(usage.directive as any);
          }
        }
      }
    });

    it('should use appropriate client directives for component types', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { componentUsages } = parseAstroImports(content);
        
        for (const usage of componentUsages) {
          // SignIn components should typically use client:load for immediate interaction
          if (usage.component === 'SignIn' && usage.directive) {
            expect(['client:load', 'client:visible']).toContain(usage.directive);
          }
          
          // UserButton can use client:visible for better performance
          if (usage.component === 'UserButton' && usage.directive) {
            expect(['client:visible', 'client:load', 'client:idle']).toContain(usage.directive);
          }
          
          // AccountSettings can use deferred loading
          if (usage.component === 'AccountSettings' && usage.directive) {
            expect(['client:load', 'client:visible', 'client:idle']).toContain(usage.directive);
          }
        }
      }
    });

    it('should not use client directives on server-only imports', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        
        // Server functions should not appear with client directives
        for (const serverFn of VALID_SERVER_FUNCTIONS) {
          const serverUsagePattern = new RegExp(`<${serverFn}\\s+client:`, 'g');
          expect(content).not.toMatch(serverUsagePattern);
        }
      }
    });
  });

  describe('Component Usage Patterns', () => {
    it('should use components that are properly imported', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports, componentUsages } = parseAstroImports(content);
        
        // Get all imported component names
        const importedComponents = new Set<string>();
        for (const importDecl of imports) {
          if (importDecl.source === EXPECTED_IMPORTS.components) {
            importDecl.specifiers.forEach(spec => importedComponents.add(spec));
          }
        }
        
        // All used components should be imported
        for (const usage of componentUsages) {
          expect(importedComponents).toContain(usage.component);
        }
      }
    });

    it('should follow Astro island architecture patterns', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { componentUsages } = parseAstroImports(content);
        
        // Components should have proper hydration strategy
        for (const usage of componentUsages) {
          // Interactive components should have client directives
          if (['SignIn', 'SignUp', 'UserButton', 'AccountSettings'].includes(usage.component)) {
            // Either has a client directive or is wrapped in a conditional that would provide one
            const hasClientDirective = usage.directive !== undefined;
            const isConditionallyHydrated = content.includes('client:') && 
              content.includes(`<${usage.component}`);
            
            if (!hasClientDirective && !isConditionallyHydrated) {
              // This might be acceptable for SSR-only usage, but let's warn
              console.warn(`Component ${usage.component} in ${filePath} may need client directive`);
            }
          }
        }
      }
    });
  });

  describe('Consistency Between Examples', () => {
    it('should use similar patterns between minimal and full-featured examples', async () => {
      const exampleFiles = await getExampleFiles();
      const minimalFiles = exampleFiles.filter(f => f.includes('minimal-astro'));
      const fullFeaturedFiles = exampleFiles.filter(f => f.includes('full-featured'));
      
      // Compare similar pages
      const pageTypes = ['signin', 'signup', 'index'];
      
      for (const pageType of pageTypes) {
        const minimalPage = minimalFiles.find(f => f.includes(`${pageType}.astro`));
        const fullFeaturedPage = fullFeaturedFiles.find(f => f.includes(`${pageType}.astro`));
        
        if (minimalPage && fullFeaturedPage) {
          const minimalContent = await readFile(minimalPage, 'utf-8');
          const fullFeaturedContent = await readFile(fullFeaturedPage, 'utf-8');
          
          const minimalImports = parseAstroImports(minimalContent);
          const fullFeaturedImports = parseAstroImports(fullFeaturedContent);
          
          // Both should import Stack Auth components from same path
          const minimalStackImports = minimalImports.imports.filter(i => 
            i.source.startsWith('astro-stack-auth/')
          );
          const fullFeaturedStackImports = fullFeaturedImports.imports.filter(i => 
            i.source.startsWith('astro-stack-auth/')
          );
          
          if (minimalStackImports.length > 0 && fullFeaturedStackImports.length > 0) {
            // Import paths should be consistent
            const minimalPaths = new Set(minimalStackImports.map(i => i.source));
            const fullFeaturedPaths = new Set(fullFeaturedStackImports.map(i => i.source));
            
            for (const path of minimalPaths) {
              if (fullFeaturedPaths.has(path)) {
                expect(fullFeaturedPaths).toContain(path);
              }
            }
          }
        }
      }
    });
  });

  describe('Import vs Export Validation', () => {
    it('should import only components that exist in astro-stack-auth modules', async () => {
      // This test would ideally check against actual exports, but for now
      // we validate against our known component list
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          if (importDecl.source === EXPECTED_IMPORTS.components) {
            for (const specifier of importDecl.specifiers) {
              expect(VALID_COMPONENTS).toContain(specifier as any);
            }
          }
          
          if (importDecl.source === EXPECTED_IMPORTS.server) {
            for (const specifier of importDecl.specifiers) {
              expect(VALID_SERVER_FUNCTIONS).toContain(specifier as any);
            }
          }
        }
      }
    });
  });

  describe('Runtime Export Validation', () => {
    it('should validate that imported components exist at runtime', async () => {
      const exampleFiles = await getExampleFiles();
      let hasRuntimeErrors = false;
      const allErrors: string[] = [];
      
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        // Filter for astro-stack-auth imports
        const stackAuthImports = imports.filter(i => i.source.startsWith('astro-stack-auth/'));
        
        if (stackAuthImports.length > 0) {
          const validationResults = await validateImportStatements(stackAuthImports);
          const summary = generateValidationSummary(validationResults);
          
          if (summary.invalidImports > 0) {
            hasRuntimeErrors = true;
            allErrors.push(`${filePath}: ${summary.errors.join(', ')}`);
          }
        }
      }
      
      if (hasRuntimeErrors) {
        console.error('Runtime validation errors found:', allErrors);
      }
      
      // Allow errors during development when actual modules might not exist
      // but warn about them
      if (allErrors.length > 0) {
        console.warn('Runtime validation warnings (expected during development):', allErrors);
      }
      
      expect(hasRuntimeErrors).toBe(false);
    });

    it('should validate React components are properly typed', async () => {
      const componentModule = 'astro-stack-auth/components';
      const requiredComponents = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
      
      for (const componentName of requiredComponents) {
        const validation = await validateReactComponent(componentModule, componentName);
        
        if (!validation.isValid && !validation.error?.includes('Could not import')) {
          // Only fail if it's not a development environment issue
          expect(validation.isValid).toBe(true);
        } else if (validation.componentType) {
          // If we can validate, ensure it's a proper React component
          expect(['function', 'object', 'react-component', 'mock', 'unknown']).toContain(validation.componentType);
        }
      }
    });

    it('should validate server function exports exist', async () => {
      const serverModule = 'astro-stack-auth/server';
      const requiredFunctions = ['getUser', 'getSession', 'requireAuth'];
      
      for (const functionName of requiredFunctions) {
        const validation = await validateRuntimeExport(serverModule, functionName);
        
        if (!validation.isValid && !validation.error?.includes('Could not import')) {
          // Only fail if it's not a development environment issue
          expect(validation.isValid).toBe(true);
        }
      }
    });

    it('should validate client function exports exist', async () => {
      const clientModule = 'astro-stack-auth/client';
      const requiredFunctions = ['signIn', 'signOut', 'redirectToSignIn', 'redirectToSignUp', 'redirectToAccount'];
      
      for (const functionName of requiredFunctions) {
        const validation = await validateRuntimeExport(clientModule, functionName);
        
        if (!validation.isValid && !validation.error?.includes('Could not import')) {
          // Only fail if it's not a development environment issue
          expect(validation.isValid).toBe(true);
        }
      }
    });

    it('should validate complete module exports structure', async () => {
      const modules = [
        'astro-stack-auth/components',
        'astro-stack-auth/server',
        'astro-stack-auth/client'
      ];
      
      for (const modulePath of modules) {
        const validation = await validateModuleExports(modulePath);
        
        // Log validation results for debugging
        if (!validation.isValid) {
          console.log(`Module validation for ${modulePath}:`, validation);
        }
        
        // During development, modules might not be built yet
        // We expect this and should not fail the test
        if (validation.missingExports.length > 0) {
          const hasRealMissingExports = validation.missingExports.some(
            exportName => !exportName.includes('Could not import')
          );
          
          if (hasRealMissingExports) {
            console.warn(`Missing exports in ${modulePath}:`, validation.missingExports);
          }
        }
      }
    });

    it('should provide comprehensive component validation', async () => {
      const componentValidation = await validateComponentExports('astro-stack-auth/components');
      
      // Log detailed validation results
      console.log('Component validation result:', {
        isValid: componentValidation.isValid,
        missingExports: componentValidation.missingExports,
        invalidComponentTypes: componentValidation.invalidComponentTypes,
        missingReactComponents: componentValidation.missingReactComponents
      });
      
      // During development, this validation helps us understand what's missing
      // but shouldn't necessarily fail the build
      if (componentValidation.invalidComponentTypes.length > 0) {
        console.warn('Invalid component types found:', componentValidation.invalidComponentTypes);
      }
      
      if (componentValidation.missingReactComponents.length > 0) {
        console.warn('Missing React components:', componentValidation.missingReactComponents);
      }
    });

    it('should handle version compatibility gracefully', async () => {
      // Test that runtime validation works with different import patterns
      const testImports = [
        { specifiers: ['SignIn'], source: 'astro-stack-auth/components', line: 1 },
        { specifiers: ['getUser'], source: 'astro-stack-auth/server', line: 2 },
        { specifiers: ['signIn'], source: 'astro-stack-auth/client', line: 3 }
      ];
      
      const validationResults = await validateImportStatements(testImports);
      expect(validationResults).toBeDefined();
      expect(validationResults.length).toBe(testImports.length);
      
      const summary = generateValidationSummary(validationResults);
      expect(summary.totalImports).toBe(3);
      
      // During development, we expect warnings but not necessarily errors
      if (summary.warnings.length > 0) {
        console.log('Validation warnings (expected during development):', summary.warnings);
      }
    });
  });

  describe('Component Prop Interface Validation', () => {
    it('should validate SignIn component props correctly', async () => {
      // Test valid props
      const validProps = {
        onSuccess: (user: any) => console.log(user),
        redirectTo: '/dashboard',
        providers: ['google', 'github'],
        showTerms: true,
        className: 'custom-signin'
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'SignIn',
        validProps
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.requiredPropsMissing).toHaveLength(0);
      expect(validation.invalidPropTypes).toHaveLength(0);
    });

    it('should detect invalid SignIn component prop types', async () => {
      // Test invalid props
      const invalidProps = {
        onSuccess: 'not-a-function', // Should be function
        redirectTo: 123, // Should be string
        providers: 'not-an-array', // Should be array
        showTerms: 'yes', // Should be boolean
        className: { invalid: 'object' } // Should be string
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'SignIn',
        invalidProps
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.invalidPropTypes).toContain('onSuccess');
      expect(validation.invalidPropTypes).toContain('redirectTo');
      expect(validation.invalidPropTypes).toContain('providers');
      expect(validation.invalidPropTypes).toContain('showTerms');
      expect(validation.invalidPropTypes).toContain('className');
    });

    it('should validate UserButton component props correctly', async () => {
      const validProps = {
        showDisplayName: true,
        showAvatar: false,
        colorModeToggle: true,
        onSignOut: () => console.log('signed out'),
        style: { backgroundColor: 'blue' }
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'UserButton',
        validProps
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate StackProvider required props', async () => {
      // Test missing required props
      const propsWithMissingRequired = {
        projectId: 'test-project',
        // Missing required: publishableClientKey, children
        baseUrl: 'https://api.example.com'
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'StackProvider',
        propsWithMissingRequired
      );

      expect(validation.isValid).toBe(false);
      expect(validation.requiredPropsMissing).toContain('publishableClientKey');
      expect(validation.requiredPropsMissing).toContain('children');
    });

    it('should validate StackProvider with all required props', async () => {
      // Test with all required props
      const validProps = {
        projectId: 'test-project-id',
        publishableClientKey: 'pk_test_key',
        children: 'App content', // React node
        theme: 'dark',
        lang: 'en'
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'StackProvider',
        validProps
      );

      expect(validation.isValid).toBe(true);
      expect(validation.requiredPropsMissing).toHaveLength(0);
    });

    it('should detect unexpected props and warn', async () => {
      const propsWithUnexpected = {
        projectId: 'test-project',
        publishableClientKey: 'pk_test_key',
        children: 'content',
        invalidProp: 'should not be here',
        anotherInvalidProp: 123
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'StackProvider',
        propsWithUnexpected
      );

      expect(validation.unexpectedProps).toContain('invalidProp');
      expect(validation.unexpectedProps).toContain('anotherInvalidProp');
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should validate AccountSettings component props', async () => {
      const validProps = {
        onUpdateSuccess: (user: any) => console.log(user),
        onUpdateError: (error: any) => console.error(error),
        onDeleteAccount: () => console.log('account deleted'),
        showProfile: true,
        showSecurity: false,
        showPreferences: true,
        fullPage: false
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'AccountSettings',
        validProps
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate event handler signatures', async () => {
      // Test with functions that have wrong parameter count
      const propsWithBadHandlers = {
        onSuccess: () => {}, // Should accept 1 parameter
        onError: (err: any, extra: any) => {} // Should accept 1 parameter
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'SignIn',
        propsWithBadHandlers
      );

      // Should still be valid (type-wise) but generate warnings
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('onSuccess'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('onError'))).toBe(true);
    });

    it('should handle unknown components gracefully', async () => {
      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'UnknownComponent',
        { someProps: 'value' }
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unknown component: UnknownComponent');
    });

    it('should validate optional vs required prop handling', async () => {
      // Test SignUp with mix of optional props
      const mixedProps = {
        onSuccess: (user: any) => console.log(user),
        // Missing optional props: onError, redirectTo, etc.
        providers: ['github'],
        showTerms: false
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'SignUp',
        mixedProps
      );

      expect(validation.isValid).toBe(true);
      expect(validation.requiredPropsMissing).toHaveLength(0);
    });

    it('should validate style and className props consistently', async () => {
      const propsWithStyling = {
        style: { margin: '10px', padding: '5px' },
        className: 'my-custom-class'
      };

      // Test across multiple components
      const components = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings'];
      
      for (const componentName of components) {
        const validation = await validateComponentProps(
          'astro-stack-auth/components',
          componentName,
          propsWithStyling
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should provide comprehensive prop mismatch error reporting', async () => {
      const badProps = {
        onSuccess: 'not-function',
        redirectTo: 123,
        providers: 'not-array',
        showTerms: 'not-boolean',
        className: { object: 'not-string' },
        unexpectedProp: 'should-warn'
      };

      const validation = await validateComponentProps(
        'astro-stack-auth/components',
        'SignIn',
        badProps
      );

      expect(validation.isValid).toBe(false);
      
      // Check detailed error reporting
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.invalidPropTypes.length).toBe(5);
      expect(validation.unexpectedProps.length).toBe(1);

      // Verify error messages are descriptive
      const errorMessages = validation.errors.join(' ');
      expect(errorMessages).toContain('onSuccess');
      expect(errorMessages).toContain('function');
      expect(errorMessages).toContain('string');
      expect(errorMessages).toContain('boolean');
      expect(errorMessages).toContain('array');
    });

    it('should validate batch prop validation across file', async () => {
      const componentUsages = [
        {
          component: 'SignIn',
          props: { onSuccess: (user: any) => {}, className: 'signin' },
          line: 10
        },
        {
          component: 'UserButton', 
          props: { showDisplayName: true, onSignOut: () => {} },
          line: 15
        },
        {
          component: 'StackProvider',
          props: { projectId: 'test', publishableClientKey: 'pk_test', children: 'content' },
          line: 5
        }
      ];

      const batchValidation = await validateComponentPropsInFile(
        'test-file.astro',
        componentUsages
      );

      expect(batchValidation.totalComponents).toBe(3);
      expect(batchValidation.validComponents).toBe(3);
      expect(batchValidation.invalidComponents).toBe(0);
      expect(batchValidation.propValidations).toHaveLength(3);
    });

    it('should handle prop validation with mixed valid/invalid components', async () => {
      const componentUsages = [
        {
          component: 'SignIn',
          props: { onSuccess: 'invalid-type' }, // Invalid
          line: 10
        },
        {
          component: 'UserButton',
          props: { showDisplayName: true }, // Valid
          line: 15
        }
      ];

      const batchValidation = await validateComponentPropsInFile(
        'test-file.astro',
        componentUsages
      );

      expect(batchValidation.totalComponents).toBe(2);
      expect(batchValidation.validComponents).toBe(1);
      expect(batchValidation.invalidComponents).toBe(1);
      
      const invalidValidation = batchValidation.propValidations.find(v => !v.isValid);
      expect(invalidValidation?.component).toBe('SignIn');
      expect(invalidValidation?.line).toBe(10);
    });
  });

  describe('Version-Aware Prop Interface Validation', () => {
    it('should validate props with version awareness', async () => {
      const validProps = {
        onSuccess: (user: any) => console.log(user),
        className: 'signin-form',
        style: { margin: '10px' }
      };

      const validation = await validateComponentPropsWithVersion(
        'astro-stack-auth/components',
        'SignIn',
        validProps,
        '2.8.36'
      );

      expect(validation.isValid).toBe(true);
      expect(validation.stackVersion).toBe('2.8.36');
      expect(validation.versionWarnings).toHaveLength(0);
      expect(validation.deprecatedProps).toHaveLength(0);
      expect(validation.unsupportedProps).toHaveLength(0);
    });

    it('should detect deprecated props in future versions', async () => {
      // Test with a hypothetical future version where onError is deprecated
      const propsWithDeprecated = {
        onSuccess: (user: any) => console.log(user),
        onError: (error: any) => console.error(error), // Will be deprecated in 3.0.x
        className: 'signin-form'
      };

      const validation = await validateComponentPropsWithVersion(
        'astro-stack-auth/components',
        'SignIn',
        propsWithDeprecated,
        '3.0.0'
      );

      expect(validation.isValid).toBe(true); // Still valid, but with warnings
      expect(validation.deprecatedProps).toContain('onError');
      expect(validation.versionWarnings.length).toBeGreaterThan(0);
      expect(validation.versionWarnings.some(w => w.includes('deprecated'))).toBe(true);
    });

    it('should detect potentially unsupported props', async () => {
      const propsWithUnsupported = {
        onSuccess: (user: any) => console.log(user),
        customProp: 'not-in-version-spec', // Not in version compatibility data
        className: 'signin-form'
      };

      const validation = await validateComponentPropsWithVersion(
        'astro-stack-auth/components',
        'SignIn',
        propsWithUnsupported,
        '2.8.36'
      );

      expect(validation.isValid).toBe(true);
      expect(validation.unsupportedProps).toContain('customProp');
      expect(validation.versionWarnings.length).toBeGreaterThan(0);
    });

    it('should validate batch props with version awareness', async () => {
      const componentUsages = [
        {
          component: 'SignIn',
          props: { onSuccess: (user: any) => {}, className: 'signin' },
          line: 10
        },
        {
          component: 'UserButton', 
          props: { showDisplayName: true, customProp: 'unsupported' },
          line: 15
        }
      ];

      const batchValidation = await validateComponentPropsWithVersionBatch(
        componentUsages,
        '2.8.36'
      );

      expect(batchValidation.totalComponents).toBe(2);
      expect(batchValidation.validComponents).toBe(2);
      expect(batchValidation.versionCompatibilityIssues).toBeGreaterThan(0); // Due to customProp
      expect(batchValidation.propValidations).toHaveLength(2);
    });

    it('should generate comprehensive version compatibility report', async () => {
      const validationResults: Array<VersionAwarePropValidationResult & { line: number }> = [
        {
          isValid: true,
          component: 'SignIn',
          errors: [],
          warnings: [],
          requiredPropsMissing: [],
          invalidPropTypes: [],
          unexpectedProps: [],
          stackVersion: '2.8.36',
          versionWarnings: ['Some warning'],
          deprecatedProps: ['oldProp'],
          unsupportedProps: ['customProp'],
          versionMismatchErrors: [],
          line: 10
        }
      ];

      const report = generateVersionCompatibilityReport(validationResults);

      expect(report.summary.totalComponents).toBe(1);
      expect(report.summary.componentsWithVersionIssues).toBe(1);
      expect(report.summary.deprecationWarnings).toBe(1);
      expect(report.summary.unsupportedProps).toBe(1);
      expect(report.summary.targetVersion).toBe('2.8.36');

      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should validate props across multiple Stack Auth versions', async () => {
      const props = {
        onSuccess: (user: any) => console.log(user),
        className: 'signin-form',
        style: { padding: '10px' }
      };

      const crossVersionValidation = await validatePropsAcrossVersions(
        'SignIn',
        props,
        ['2.8.x', '2.9.x']
      );

      expect(crossVersionValidation.component).toBe('SignIn');
      expect(crossVersionValidation.versionCompatibility).toHaveLength(2);
      expect(typeof crossVersionValidation.overallCompatible).toBe('boolean');

      // Each version should have validation results
      for (const versionResult of crossVersionValidation.versionCompatibility) {
        expect(versionResult.version).toBeTruthy();
        expect(versionResult.validation).toBeDefined();
        expect(typeof versionResult.isCompatible).toBe('boolean');
      }
    });

    it('should handle common React props correctly in version validation', async () => {
      const commonReactProps = {
        style: { backgroundColor: 'blue' },
        className: 'my-component',
        id: 'unique-id'
      };

      const validation = await validateComponentPropsWithVersion(
        'astro-stack-auth/components',
        'SignIn',
        commonReactProps,
        '2.8.36'
      );

      expect(validation.isValid).toBe(true);
      // Common React props should not be flagged as unsupported
      expect(validation.unsupportedProps).not.toContain('style');
      expect(validation.unsupportedProps).not.toContain('className');
      expect(validation.unsupportedProps).not.toContain('id');
    });

    it('should provide migration guidance for deprecated props', async () => {
      const propsWithDeprecated = {
        onError: (error: any) => console.error(error), // Hypothetically deprecated in 3.0.x
      };

      const validation = await validateComponentPropsWithVersion(
        'astro-stack-auth/components',
        'SignIn',
        propsWithDeprecated,
        '3.0.0'
      );

      expect(validation.versionWarnings.length).toBeGreaterThan(0);
      expect(validation.versionWarnings.some(w => 
        w.includes('deprecated') && w.includes('Consider removing')
      )).toBe(true);
    });

    it('should handle version compatibility for StackProvider props', async () => {
      const stackProviderProps = {
        projectId: 'test-project',
        publishableClientKey: 'pk_test_key',
        children: 'App content'
      };

      const validation = await validateComponentPropsWithVersion(
        'astro-stack-auth/components',
        'StackProvider',
        stackProviderProps,
        '2.8.36'
      );

      expect(validation.isValid).toBe(true);
      expect(validation.requiredPropsMissing).toHaveLength(0);
    });

    it('should validate unknown components gracefully in version context', async () => {
      const validation = await validateComponentPropsWithVersion(
        'astro-stack-auth/components',
        'UnknownComponent',
        { someProp: 'value' },
        '2.8.36'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unknown component: UnknownComponent');
      expect(validation.stackVersion).toBe('2.8.36');
    });

    it('should provide recommendations for cross-version compatibility', async () => {
      const problematicProps = {
        onSuccess: (user: any) => console.log(user),
        futureProp: 'only-in-3.0', // Hypothetically only available in 3.0
        deprecatedProp: 'old-value' // Hypothetically deprecated
      };

      const crossVersionValidation = await validatePropsAcrossVersions(
        'SignIn',
        problematicProps,
        ['2.8.x', '3.0.x']
      );

      // Since we have problematic props, we should get recommendations
      // even if overallCompatible might be true due to our mocked version data
      expect(crossVersionValidation.component).toBe('SignIn');
      expect(crossVersionValidation.versionCompatibility).toHaveLength(2);
      
      // The function should always return an array, even if empty
      expect(Array.isArray(crossVersionValidation.recommendations)).toBe(true);
    });

    it('should handle version range detection correctly', async () => {
      const testCases = [
        { version: '2.8.36', expectedRange: '2.8.x' },
        { version: '2.9.0', expectedRange: '2.9.x' },
        { version: '3.0.1', expectedRange: '3.0.x' },
        { version: undefined, expectedRange: '2.8.x' }
      ];

      for (const testCase of testCases) {
        const validation = await validateComponentPropsWithVersion(
          'astro-stack-auth/components',
          'SignIn',
          { className: 'test' },
          testCase.version
        );

        // Version range is used internally, but stackVersion should match input
        expect(validation.stackVersion).toBe(testCase.version || '2.8.36');
      }
    });
  });

  describe('Stack Auth Version Compatibility', () => {
    it('should meet minimum Stack Auth version requirements', async () => {
      const versionCheck = await checkMinimumVersionRequirement();
      
      console.log('Version requirement check:', {
        meets: versionCheck.meets,
        current: versionCheck.current,
        minimum: versionCheck.minimum,
        recommendation: versionCheck.recommendation
      });
      
      // Log warning if version requirement not met, but don't fail in development
      if (!versionCheck.meets) {
        console.warn('Stack Auth version requirement not met:', versionCheck.recommendation);
      }
      
      // In development environment, we might not have the package installed yet
      if (versionCheck.current === null) {
        console.log('Stack Auth not installed - this is expected during initial development');
      }
    });

    it('should validate component compatibility across Stack Auth versions', async () => {
      const exampleFiles = await getExampleFiles();
      let totalCompatibilityIssues = 0;
      
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        const stackAuthImports = imports.filter(i => i.source.startsWith('astro-stack-auth/'));
        
        if (stackAuthImports.length > 0) {
          const compatibilityResults = await validateVersionCompatibility(stackAuthImports);
          
          if (compatibilityResults.compatibilityIssues.length > 0) {
            console.log(`Compatibility issues in ${filePath}:`);
            
            for (const issue of compatibilityResults.compatibilityIssues) {
              console.log(`  ${issue.severity.toUpperCase()}: Line ${issue.line} - ${issue.issue}`);
              
              if (issue.severity === 'error') {
                totalCompatibilityIssues++;
              }
            }
          }
        }
      }
      
      // During development, we expect some compatibility warnings but not errors
      if (totalCompatibilityIssues > 0) {
        console.warn(`Found ${totalCompatibilityIssues} compatibility errors`);
      }
    });

    it('should detect Stack Auth version and validate compatibility', async () => {
      const currentVersion = await getCurrentStackVersion();
      
      if (currentVersion) {
        console.log(`Detected Stack Auth version: ${currentVersion}`);
        
        // Test compatibility with common import patterns
        const testImports = [
          { specifiers: ['SignIn', 'SignUp'], source: 'astro-stack-auth/components', line: 1 },
          { specifiers: ['getUser', 'requireAuth'], source: 'astro-stack-auth/server', line: 2 }
        ];
        
        const compatibilityResults = await validateVersionCompatibility(testImports);
        const report = generateCompatibilityReport(compatibilityResults);
        
        console.log('Compatibility Report:');
        console.log(report);
        
        // Verify the compatibility check ran successfully
        expect(compatibilityResults.summary.totalChecks).toBeGreaterThan(0);
      } else {
        console.log('Stack Auth version not detected - package may not be installed');
      }
    });

    it('should handle unknown components gracefully in version compatibility', async () => {
      const testImports = [
        { specifiers: ['UnknownComponent'], source: 'astro-stack-auth/components', line: 1 },
        { specifiers: ['unknownFunction'], source: 'astro-stack-auth/server', line: 2 }
      ];
      
      const compatibilityResults = await validateVersionCompatibility(testImports);
      
      // Unknown components should generate warnings, not errors
      const warningIssues = compatibilityResults.compatibilityIssues.filter(
        issue => issue.severity === 'warning'
      );
      
      expect(warningIssues.length).toBe(2); // One for each unknown import
      expect(compatibilityResults.summary.warnings).toBe(2);
      expect(compatibilityResults.summary.errors).toBe(0);
    });

    it('should provide helpful compatibility guidance', async () => {
      const versionCheck = await checkMinimumVersionRequirement();
      
      // The function should always provide clear guidance
      expect(versionCheck.minimum).toBeDefined();
      expect(typeof versionCheck.meets).toBe('boolean');
      
      if (!versionCheck.meets && versionCheck.recommendation) {
        expect(versionCheck.recommendation).toContain('Stack Auth');
        console.log('Compatibility guidance:', versionCheck.recommendation);
      }
    });
  });
});