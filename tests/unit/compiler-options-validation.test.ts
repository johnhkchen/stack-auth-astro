import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as ts from 'typescript';
import { validateAndEnhanceCompilerOptions, getFallbackCompilerOptions } from '../../scripts/type-extractor.js';

describe('Compiler Options Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console mocks
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('validateAndEnhanceCompilerOptions', () => {
    it('should validate target compatibility', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2015,
        module: ts.ModuleKind.ESNext,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      // Should have validation warnings about old target
      expect(result._validationWarnings).toBeDefined();
      expect(result._validationWarnings.some(w => w.includes('Target'))).toBe(true);
      // Should maintain the target but enhance other options
      expect(result.target).toBe(ts.ScriptTarget.ES2015);
      expect(result.declaration).toBe(true);
      expect(result.skipLibCheck).toBe(true);
    });

    it('should validate module resolution settings', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Classic,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      // Should have validation warnings about classic module resolution
      expect(result._validationWarnings).toBeDefined();
      expect(result._validationWarnings.some(w => w.includes('Classic module resolution'))).toBe(true);
      // Should suggest modern module resolution
      expect(result.moduleResolution).toBeDefined();
    });

    it('should enforce critical options for type extraction', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        declaration: false,
        skipLibCheck: false,
        emitDeclarationOnly: false,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      // Should enforce declaration generation
      expect(result.declaration).toBe(true);
      // Should enable skipLibCheck for performance
      expect(result.skipLibCheck).toBe(true);
      // Should enable noEmit for type extraction
      expect(result.noEmit).toBe(true);
    });

    it('should handle lib configuration', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        lib: ['ES2015', 'DOM'],
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      expect(result.lib).toBeDefined();
      expect(Array.isArray(result.lib)).toBe(true);
      // Should preserve user's lib configuration
      expect(result.lib).toContain('ES2015');
      expect(result.lib).toContain('DOM');
    });

    it('should add default lib when missing', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      expect(result.lib).toBeDefined();
      expect(Array.isArray(result.lib)).toBe(true);
      // Should add appropriate default libs
      expect(result.lib.length).toBeGreaterThan(0);
    });

    it('should validate strict mode settings', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        strict: false,
        noImplicitAny: false,
        strictNullChecks: false,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      // Should have validation warnings about non-strict mode
      expect(result._validationWarnings).toBeDefined();
      expect(result._validationWarnings.some(w => w.includes('Strict mode'))).toBe(true);
      // Should preserve user's choice but add necessary options
      expect(result.strict).toBe(false);
      expect(result.declaration).toBe(true);
    });

    it('should handle JSX configuration', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      expect(result.jsx).toBe(ts.JsxEmit.React);
      // Should add React types to lib if not present
      expect(result.lib).toBeDefined();
    });

    it('should validate esModuleInterop and allowSyntheticDefaultImports', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: false,
        allowSyntheticDefaultImports: false,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      // The function only keeps them false if explicitly set to false
      // Since we set them to false, they should remain false
      expect(result.esModuleInterop).toBe(false);
      expect(result.allowSyntheticDefaultImports).toBe(false);
    });

    it('should handle paths and baseUrl configuration', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@components/*': ['src/components/*'],
        },
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      expect(result.baseUrl).toBe('.');
      expect(result.paths).toBeDefined();
      expect(result.paths['@/*']).toEqual(['src/*']);
    });

    it('should validate incremental compilation settings', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        incremental: true,
        tsBuildInfoFile: '.tsbuildinfo',
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result).toBeDefined();
      expect(result.incremental).toBe(true);
      expect(result.tsBuildInfoFile).toBe('.tsbuildinfo');
    });
  });

  describe('getFallbackCompilerOptions', () => {
    it('should provide sensible defaults', () => {
      const options = getFallbackCompilerOptions();

      expect(options).toBeDefined();
      expect(options.target).toBeDefined();
      expect(options.module).toBeDefined();
      expect(options.lib).toBeDefined();
      expect(options.declaration).toBe(true);
      expect(options.skipLibCheck).toBe(true);
      expect(options.moduleResolution).toBeDefined();
      expect(options.noEmit).toBe(true);
      expect(options.esModuleInterop).toBe(true);
      expect(options.allowSyntheticDefaultImports).toBe(true);
    });

    it('should include modern JavaScript features', () => {
      const options = getFallbackCompilerOptions();

      expect(options.target).toBeGreaterThanOrEqual(ts.ScriptTarget.ES2018);
      expect(options.lib).toBeDefined();
      expect(Array.isArray(options.lib)).toBe(true);
    });

    it('should enable type extraction requirements', () => {
      const options = getFallbackCompilerOptions();

      expect(options.declaration).toBe(true);
      expect(options.noEmit).toBe(true);
      expect(options.skipLibCheck).toBe(true);
    });

    it('should have appropriate module settings', () => {
      const options = getFallbackCompilerOptions();

      expect(options.module).toBeDefined();
      expect(options.moduleResolution).toBeDefined();
      expect(options.isolatedModules).toBe(true);
    });
  });

  describe('Compiler Options Warnings', () => {
    it('should warn about ES5 target', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result._validationWarnings).toBeDefined();
      expect(result._validationWarnings.some(w => w.includes('ES5'))).toBe(true);
    });

    it('should warn about missing declaration option', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        declaration: false,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      // Declaration should be enforced to true
      expect(result.declaration).toBe(true);
    });

    it('should warn about AMD module format', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.AMD,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result._validationWarnings).toBeDefined();
      expect(result._validationWarnings.some(w => w.includes('AMD'))).toBe(true);
    });

    it('should warn about UMD module format', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.UMD,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result._validationWarnings).toBeDefined();
      expect(result._validationWarnings.some(w => w.includes('UMD'))).toBe(true);
    });

    it('should not warn for modern configurations', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        declaration: true,
        skipLibCheck: true,
        strict: true,
        esModuleInterop: true,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      // Modern config might still have warnings (e.g., no lib specified)
      expect(result._validationWarnings).toBeDefined();
      // Check that there are no critical warnings
      const hasSeriousWarnings = result._validationWarnings.some(w => 
        w.includes('ES5') || w.includes('Classic') || w.includes('AMD') || w.includes('UMD')
      );
      expect(hasSeriousWarnings).toBe(false);
    });
  });

  describe('Performance Optimizations', () => {
    it('should enable skipLibCheck for performance', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        skipLibCheck: false,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      expect(result.skipLibCheck).toBe(true);
    });

    it('should suggest incremental compilation for large projects', () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        incremental: false,
      };

      const result = validateAndEnhanceCompilerOptions(options);

      // Should preserve user's choice but could suggest incremental
      expect(result).toBeDefined();
    });
  });
});