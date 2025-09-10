/**
 * Dynamic Type Extraction Validation Tests
 * 
 * This test suite validates the dynamic type extraction system to ensure
 * it correctly extracts component prop specifications from @stackframe/stack-ui
 * and falls back gracefully when extraction fails.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Import the enhanced generator components
import { generateDocumentation, STATIC_COMPONENT_PROP_SPECS, STATIC_VERSION_COMPATIBILITY } from '../../scripts/generate-prop-docs-enhanced.js';
import { extractDynamicTypes, createExtractionResult } from '../../scripts/dynamic-type-extraction.js';
import { detectSDKVersions, getVersionCompatibility } from '../../scripts/sdk-version-detector.js';

const DOCS_DIR = join(process.cwd(), 'docs', 'components');

describe('Dynamic Type Extraction System', () => {
  let extractionResult: any;
  
  beforeAll(async () => {
    // Run the dynamic type extraction process
    const dynamicResult = await extractDynamicTypes();
    extractionResult = createExtractionResult(
      dynamicResult, 
      STATIC_COMPONENT_PROP_SPECS, 
      STATIC_VERSION_COMPATIBILITY
    );
  });

  describe('SDK Detection', () => {
    it('should detect Stack Auth SDK versions', () => {
      const versions = detectSDKVersions();
      
      // At minimum, we should attempt detection
      expect(versions).toBeDefined();
      expect(typeof versions).toBe('object');
      
      // Check that we attempted to find both packages
      expect(versions).toHaveProperty('@stackframe/stack');
      expect(versions).toHaveProperty('@stackframe/stack-ui');
    });

    it('should provide version compatibility information', () => {
      const versions = detectSDKVersions();
      const compatibility = getVersionCompatibility(versions);
      
      expect(compatibility).toBeDefined();
      expect(compatibility).toHaveProperty('version');
      expect(compatibility).toHaveProperty('supportsDynamicTypes');
      expect(compatibility).toHaveProperty('components');
      expect(typeof compatibility.fallbackRequired).toBe('boolean');
    });
  });

  describe('Type Extraction', () => {
    it('should attempt dynamic type extraction', async () => {
      const result = await extractDynamicTypes();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('extractedTypes');
      expect(result).toHaveProperty('report');
      
      // Either should succeed with types or fail with a reason
      if (!result.success) {
        expect(result.reason).toBeDefined();
        expect(typeof result.reason).toBe('string');
      } else {
        expect(result.extractedTypes).toBeDefined();
        expect(typeof result.extractedTypes).toBe('object');
      }
    });

    it('should validate extraction result structure', () => {
      expect(extractionResult).toBeDefined();
      expect(extractionResult).toHaveProperty('timestamp');
      expect(extractionResult).toHaveProperty('dynamicExtractionSucceeded');
      expect(extractionResult).toHaveProperty('componentSpecs');
      expect(extractionResult).toHaveProperty('versionCompatibility');
      expect(extractionResult).toHaveProperty('recommendations');
      
      expect(typeof extractionResult.dynamicExtractionSucceeded).toBe('boolean');
      expect(typeof extractionResult.componentSpecs).toBe('object');
      expect(Array.isArray(extractionResult.recommendations)).toBe(true);
    });

    it('should have component specifications for core components', () => {
      const requiredComponents = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
      
      for (const componentName of requiredComponents) {
        expect(extractionResult.componentSpecs).toHaveProperty(componentName);
        
        const componentSpec = extractionResult.componentSpecs[componentName];
        expect(typeof componentSpec).toBe('object');
        
        // Should have at least some properties
        const propNames = Object.keys(componentSpec);
        expect(propNames.length).toBeGreaterThan(0);
        
        // Each prop should have required structure
        for (const [propName, propSpec] of Object.entries(componentSpec)) {
          expect(propSpec).toHaveProperty('type');
          expect(propSpec).toHaveProperty('required');
          expect(propSpec).toHaveProperty('description');
          
          expect(typeof propSpec.type).toBe('string');
          expect(typeof propSpec.required).toBe('boolean');
          expect(typeof propSpec.description).toBe('string');
        }
      }
    });
  });

  describe('Documentation Generation', () => {
    it('should generate enhanced documentation', async () => {
      const result = await generateDocumentation();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('componentSpecs');
      expect(result).toHaveProperty('dynamicExtractionSucceeded');
    });

    it('should create documentation files with extraction status', async () => {
      await generateDocumentation();
      
      const components = Object.keys(extractionResult.componentSpecs);
      
      for (const componentName of components) {
        const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
        expect(existsSync(docPath), `Documentation file should exist for ${componentName}`).toBe(true);
        
        const content = readFileSync(docPath, 'utf-8');
        
        // Should contain extraction status information
        expect(content).toContain('Dynamic Extraction');
        expect(content).toContain('Last Attempted');
        
        // Should contain enhanced prop table with source column
        expect(content).toContain('| Prop | Type | Required | Description | Source |');
        
        // Should indicate whether props are dynamic or static
        const hasDynamicIndicator = content.includes('🔄 Dynamic');
        const hasStaticIndicator = content.includes('📝 Static');
        expect(hasDynamicIndicator || hasStaticIndicator).toBe(true);
      }
    });

    it('should include enhanced index with extraction status', async () => {
      await generateDocumentation();
      
      const indexPath = join(DOCS_DIR, 'README.md');
      expect(existsSync(indexPath)).toBe(true);
      
      const content = readFileSync(indexPath, 'utf-8');
      
      // Should contain extraction status banner
      if (extractionResult.dynamicExtractionSucceeded) {
        expect(content).toContain('Dynamic Extraction**: ✅ Active');
        expect(content).toContain('automatically synchronized');
      } else {
        expect(content).toContain('Static Type Specification**: Active');
        expect(content).toContain('Dynamic Extraction**: Failed');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with static specifications', () => {
      // The system should work even if dynamic extraction fails
      expect(extractionResult.componentSpecs).toBeDefined();
      
      // Should have all required components regardless of extraction success
      const requiredComponents = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
      for (const componentName of requiredComponents) {
        expect(extractionResult.componentSpecs).toHaveProperty(componentName);
      }
    });

    it('should preserve existing documentation format', async () => {
      await generateDocumentation();
      
      const components = Object.keys(extractionResult.componentSpecs);
      
      for (const componentName of components) {
        const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
        const content = readFileSync(docPath, 'utf-8');
        
        // Should still have all the standard sections
        expect(content).toContain(`# ${componentName} Component`);
        expect(content).toContain('## Overview');
        expect(content).toContain('## Props');
        expect(content).toContain('## Usage Examples');
        expect(content).toContain('## Version Compatibility');
        expect(content).toContain('## TypeScript Integration');
        expect(content).toContain('## Common Patterns');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing @stackframe/stack-ui gracefully', () => {
      // The detection system should not crash if packages are missing
      const versions = detectSDKVersions();
      expect(versions).toBeDefined();
      
      // Should handle null values for missing packages
      if (versions['@stackframe/stack-ui'] === null) {
        expect(extractionResult.dynamicExtractionSucceeded).toBe(false);
        expect(extractionResult.fallbackReason).toContain('not found');
      }
    });

    it('should provide helpful error messages', () => {
      if (!extractionResult.dynamicExtractionSucceeded) {
        expect(extractionResult.fallbackReason).toBeDefined();
        expect(extractionResult.fallbackReason.length).toBeGreaterThan(0);
      }
      
      // Should have recommendations for users
      expect(Array.isArray(extractionResult.recommendations)).toBe(true);
      if (extractionResult.recommendations.length > 0) {
        for (const rec of extractionResult.recommendations) {
          expect(rec).toHaveProperty('type');
          expect(rec).toHaveProperty('message');
          expect(rec).toHaveProperty('action');
        }
      }
    });
  });

  describe('Performance', () => {
    it('should complete type extraction within reasonable time', async () => {
      const start = Date.now();
      await extractDynamicTypes();
      const duration = Date.now() - start;
      
      // Should complete within 30 seconds (generous for CI environments)
      expect(duration).toBeLessThan(30000);
    });

    it('should generate documentation efficiently', async () => {
      const start = Date.now();
      await generateDocumentation();
      const duration = Date.now() - start;
      
      // Documentation generation should be reasonably fast
      expect(duration).toBeLessThan(10000);
    });
  });
});

describe('CLI Integration', () => {
  it('should work with npm scripts', () => {
    // Test that the npm script executes without error
    expect(() => {
      execSync('npm run docs:generate', { stdio: 'pipe', timeout: 30000 });
    }).not.toThrow();
  });

  it('should validate types extraction script', () => {
    // Test the standalone type extraction script
    expect(() => {
      execSync('npm run docs:extract-types', { stdio: 'pipe', timeout: 30000 });
    }).not.toThrow();
  });
});