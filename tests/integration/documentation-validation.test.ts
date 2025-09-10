/**
 * Documentation Generation Validation Tests
 * 
 * This test suite ensures that the automated prop documentation generation
 * stays synchronized with the runtime validation schema and produces
 * accurate, up-to-date documentation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { generateDocumentation, COMPONENT_PROP_SPECS, VERSION_COMPATIBILITY } from '../../scripts/generate-prop-docs.js';

const DOCS_DIR = join(process.cwd(), 'docs', 'components');

describe('Documentation Generation Validation', () => {
  beforeAll(() => {
    // Ensure documentation is generated before tests
    generateDocumentation();
  });

  it('should generate documentation for all components', () => {
    const components = Object.keys(COMPONENT_PROP_SPECS);
    
    for (const componentName of components) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      expect(existsSync(docPath), `Documentation file should exist for ${componentName}`).toBe(true);
      
      const content = readFileSync(docPath, 'utf-8');
      expect(content.length, `Documentation should not be empty for ${componentName}`).toBeGreaterThan(0);
      
      // Check that it contains the component name as title
      expect(content, `Should contain component name as title`).toContain(`# ${componentName} Component`);
    }
  });

  it('should include props table for each component', () => {
    const components = Object.keys(COMPONENT_PROP_SPECS);
    
    for (const componentName of components) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      const content = readFileSync(docPath, 'utf-8');
      
      // Check for props table headers
      expect(content, `Should contain props table headers for ${componentName}`).toContain('| Prop | Type | Required | Description |');
      expect(content, `Should contain props table separator for ${componentName}`).toContain('|------|------|----------|-------------|');
      
      // Check that each prop is documented
      const componentProps = COMPONENT_PROP_SPECS[componentName];
      for (const propName of Object.keys(componentProps)) {
        expect(content, `Should document prop '${propName}' for ${componentName}`).toContain(`| ${propName} |`);
      }
    }
  });

  it('should include version compatibility matrix', () => {
    const componentsWithVersionInfo = Object.keys(VERSION_COMPATIBILITY);
    
    for (const componentName of componentsWithVersionInfo) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content, `Should contain version compatibility section for ${componentName}`).toContain('## Version Compatibility');
      expect(content, `Should contain version table headers for ${componentName}`).toContain('| Version | Supported Props | Deprecated Props |');
    }
  });

  it('should include usage examples', () => {
    const components = Object.keys(COMPONENT_PROP_SPECS);
    
    for (const componentName of components) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content, `Should contain usage examples section for ${componentName}`).toContain('## Usage Examples');
      expect(content, `Should contain code examples for ${componentName}`).toContain('```astro');
    }
  });

  it('should generate index documentation', () => {
    const indexPath = join(DOCS_DIR, 'README.md');
    expect(existsSync(indexPath), 'Index documentation should exist').toBe(true);
    
    const content = readFileSync(indexPath, 'utf-8');
    expect(content, 'Should contain main title').toContain('# Stack Auth Components Documentation');
    expect(content, 'Should contain component list').toContain('## Available Components');
    
    // Check that all components are listed
    const components = Object.keys(COMPONENT_PROP_SPECS);
    for (const componentName of components) {
      expect(content, `Should list ${componentName} component`).toContain(`- [${componentName}]`);
    }
  });

  it('should include TypeScript integration examples', () => {
    const components = Object.keys(COMPONENT_PROP_SPECS);
    
    for (const componentName of components) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content, `Should contain TypeScript section for ${componentName}`).toContain('## TypeScript Integration');
      expect(content, `Should contain TypeScript code example for ${componentName}`).toContain('```typescript');
    }
  });

  it('should mark required vs optional props correctly', () => {
    for (const [componentName, propSpecs] of Object.entries(COMPONENT_PROP_SPECS)) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      const content = readFileSync(docPath, 'utf-8');
      
      for (const [propName, spec] of Object.entries(propSpecs)) {
        const requiredIcon = spec.required ? '✅' : '❌';
        
        // Look for the prop row in the table
        const propRowRegex = new RegExp(`\\| ${propName} \\|.*\\| ${requiredIcon} \\|`, 'm');
        expect(content, `Prop '${propName}' should be marked as ${spec.required ? 'required' : 'optional'} for ${componentName}`).toMatch(propRowRegex);
      }
    }
  });

  it('should validate that docs are up-to-date with schema', () => {
    // This test ensures documentation stays in sync by verifying
    // that all props from the schema are documented
    
    const components = Object.keys(COMPONENT_PROP_SPECS);
    
    for (const componentName of components) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      const content = readFileSync(docPath, 'utf-8');
      
      const propSpecs = COMPONENT_PROP_SPECS[componentName];
      
      // Check that each prop from the schema is documented in the props table
      for (const propName of Object.keys(propSpecs)) {
        expect(content, `Prop '${propName}' should be documented for ${componentName}`).toMatch(
          new RegExp(`\\| ${propName} \\|`, 'm')
        );
      }
      
      // Verify the documentation contains key sections
      expect(content, `Should contain props section for ${componentName}`).toContain('## Props');
      expect(content, `Should contain usage examples for ${componentName}`).toContain('## Usage Examples');
    }
  });

  it('should include migration guidance for deprecated props', () => {
    // Find components that have deprecated props in any version
    const componentsWithDeprecated = Object.entries(VERSION_COMPATIBILITY)
      .filter(([, compatibility]) => 
        Object.values(compatibility).some(versionData => 
          versionData.deprecated && versionData.deprecated.length > 0
        )
      )
      .map(([name]) => name);
    
    for (const componentName of componentsWithDeprecated) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content, `Should contain migration guide section for ${componentName}`).toContain('## Migration Guide');
      expect(content, `Should contain deprecated props section for ${componentName}`).toContain('### Deprecated Props');
    }
  });

  it('should be generated with npm script', () => {
    // Test that the npm script works correctly
    expect(() => {
      execSync('npm run docs:generate', { stdio: 'pipe' });
    }, 'npm run docs:generate should execute without error').not.toThrow();
    
    // Verify all files still exist after npm script run
    const components = Object.keys(COMPONENT_PROP_SPECS);
    for (const componentName of components) {
      const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
      expect(existsSync(docPath), `Documentation should exist after npm script for ${componentName}`).toBe(true);
    }
  });

  describe('Documentation Content Quality', () => {
    it('should have descriptive prop descriptions', () => {
      for (const [componentName, propSpecs] of Object.entries(COMPONENT_PROP_SPECS)) {
        for (const [propName, spec] of Object.entries(propSpecs)) {
          expect(spec.description, `Prop '${propName}' in ${componentName} should have a description`).toBeTruthy();
          expect(spec.description.length, `Prop '${propName}' in ${componentName} should have a meaningful description`).toBeGreaterThan(10);
        }
      }
    });

    it('should include Astro-specific usage patterns', () => {
      const components = Object.keys(COMPONENT_PROP_SPECS);
      
      for (const componentName of components) {
        const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
        const content = readFileSync(docPath, 'utf-8');
        
        // Should mention client-side hydration
        expect(content, `Should mention client:load directive for ${componentName}`).toContain('client:load');
        
        // Should include Astro file structure
        expect(content, `Should show Astro file structure for ${componentName}`).toContain('.astro');
      }
    });

    it('should provide common patterns section', () => {
      const components = Object.keys(COMPONENT_PROP_SPECS);
      
      for (const componentName of components) {
        const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
        const content = readFileSync(docPath, 'utf-8');
        
        expect(content, `Should contain common patterns section for ${componentName}`).toContain('## Common Patterns');
      }
    });

    it('should reference Stack Auth documentation', () => {
      const components = Object.keys(COMPONENT_PROP_SPECS);
      
      for (const componentName of components) {
        const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
        const content = readFileSync(docPath, 'utf-8');
        
        expect(content, `Should reference Stack Auth docs for ${componentName}`).toContain('Stack Auth Documentation');
      }
    });
  });
});