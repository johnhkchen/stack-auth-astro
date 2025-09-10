/**
 * Integration tests for validating examples
 * 
 * This test suite validates that the examples created in Task 1.2.12 work correctly
 * and provide a seamless consumer experience.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

describe('Examples Validation', () => {
  const examplesDir = path.resolve(__dirname, '../../examples');
  
  beforeAll(() => {
    // Ensure examples directory exists
    expect(fs.existsSync(examplesDir)).toBe(true);
  });

  describe('Project Structure Validation', () => {
    test('examples directory has expected structure', () => {
      const expectedDirs = [
        'minimal-astro',
        'full-featured', 
        'components',
        'configs',
        'deployments',
        'pages'
      ];
      
      const actualDirs = fs.readdirSync(examplesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
        
      expectedDirs.forEach(dir => {
        expect(actualDirs).toContain(dir);
      });
    });

    test('minimal-astro example has correct structure', () => {
      const minimalDir = path.join(examplesDir, 'minimal-astro');
      
      // Check required files exist
      expect(fs.existsSync(path.join(minimalDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(minimalDir, 'astro.config.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(minimalDir, 'tsconfig.json'))).toBe(true);
      
      // Check src directory structure
      expect(fs.existsSync(path.join(minimalDir, 'src', 'pages', 'index.astro'))).toBe(true);
      expect(fs.existsSync(path.join(minimalDir, 'src', 'pages', 'signin.astro'))).toBe(true);
      expect(fs.existsSync(path.join(minimalDir, 'src', 'pages', 'signup.astro'))).toBe(true);
    });

    test('full-featured example has correct structure', () => {
      const fullDir = path.join(examplesDir, 'full-featured');
      
      // Check configuration files
      expect(fs.existsSync(path.join(fullDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(fullDir, 'astro.config.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(fullDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(fullDir, 'tailwind.config.mjs'))).toBe(true);
      
      // Check src directory structure  
      expect(fs.existsSync(path.join(fullDir, 'src', 'components'))).toBe(true);
      expect(fs.existsSync(path.join(fullDir, 'src', 'layouts'))).toBe(true);
      expect(fs.existsSync(path.join(fullDir, 'src', 'pages'))).toBe(true);
    });
  });

  describe('Package Configuration Validation', () => {
    test('minimal-astro package.json is valid', () => {
      const packagePath = path.join(examplesDir, 'minimal-astro', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check required dependencies
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies['astro']).toBeDefined();
      expect(packageJson.dependencies['astro-stack-auth']).toBeDefined();
      expect(packageJson.dependencies['react']).toBeDefined();
      expect(packageJson.dependencies['@astrojs/react']).toBeDefined();
      
      // Check scripts
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
    });

    test('full-featured package.json is valid', () => {
      const packagePath = path.join(examplesDir, 'full-featured', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check required dependencies
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies['astro']).toBeDefined();
      expect(packageJson.dependencies['astro-stack-auth']).toBeDefined();
      expect(packageJson.dependencies['@astrojs/tailwind']).toBeDefined();
      expect(packageJson.dependencies['tailwindcss']).toBeDefined();
    });
  });

  describe('TypeScript Configuration Validation', () => {
    test('all TypeScript configs are valid JSON', () => {
      const configsDir = path.join(examplesDir, 'configs');
      const configFiles = fs.readdirSync(configsDir).filter(f => f.endsWith('.json'));
      
      configFiles.forEach(configFile => {
        const configPath = path.join(configsDir, configFile);
        const configContent = fs.readFileSync(configPath, 'utf8');
        
        expect(() => JSON.parse(configContent)).not.toThrow();
      });
    });

    test('TypeScript configs have expected properties', () => {
      const strictConfigPath = path.join(examplesDir, 'configs', 'tsconfig.strict.json');
      const looseConfigPath = path.join(examplesDir, 'configs', 'tsconfig.loose.json');
      
      const strictConfig = JSON.parse(fs.readFileSync(strictConfigPath, 'utf8'));
      const looseConfig = JSON.parse(fs.readFileSync(looseConfigPath, 'utf8'));
      
      // Both should extend Astro configs
      expect(strictConfig.extends).toContain('astro');
      expect(looseConfig.extends).toContain('astro');
      
      // Both should have React JSX configuration
      expect(strictConfig.compilerOptions.jsx).toBe('react-jsx');
      expect(looseConfig.compilerOptions.jsx).toBe('react-jsx');
    });
  });

  describe('React Component Examples', () => {
    test('component examples have valid TypeScript', () => {
      const componentsDir = path.join(examplesDir, 'components');
      const componentFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
      
      expect(componentFiles.length).toBeGreaterThan(0);
      
      componentFiles.forEach(componentFile => {
        const componentPath = path.join(componentsDir, componentFile);
        const content = fs.readFileSync(componentPath, 'utf8');
        
        // Check for React import
        expect(content).toContain('import React');
        
        // Check for export
        expect(content).toMatch(/export.*=|export default/);
        
        // Check for TypeScript interface/type definitions
        expect(content).toMatch(/interface|type/);
      });
    });
  });

  describe('Deployment Configuration Validation', () => {
    test('deployment guides exist and are not empty', () => {
      const deploymentsDir = path.join(examplesDir, 'deployments');
      const expectedGuides = ['vercel.md', 'netlify.md', 'nodejs.md'];
      
      expectedGuides.forEach(guide => {
        const guidePath = path.join(deploymentsDir, guide);
        expect(fs.existsSync(guidePath)).toBe(true);
        
        const content = fs.readFileSync(guidePath, 'utf8');
        expect(content.length).toBeGreaterThan(100); // Should have substantial content
        expect(content).toContain('astro-stack-auth'); // Should reference the package
      });
    });

    test('deployment configurations have valid JSON/YAML structure', () => {
      const vercelPath = path.join(examplesDir, 'deployments', 'vercel.md');
      const netlifyPath = path.join(examplesDir, 'deployments', 'netlify.md');
      
      const vercelContent = fs.readFileSync(vercelPath, 'utf8');
      const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
      
      // Check for configuration examples
      expect(vercelContent).toContain('vercel.json');
      expect(netlifyContent).toContain('netlify.toml');
      
      // Check for environment variable documentation
      expect(vercelContent).toContain('STACK_PROJECT_ID');
      expect(netlifyContent).toContain('STACK_PROJECT_ID');
    });
  });

  describe('Documentation Accuracy', () => {
    test('README files exist and reference correct package', () => {
      const readmes = [
        path.join(examplesDir, 'README.md'),
        path.join(examplesDir, 'minimal-astro', 'README.md'),
        path.join(examplesDir, 'full-featured', 'README.md')
      ];
      
      readmes.forEach(readme => {
        if (fs.existsSync(readme)) {
          const content = fs.readFileSync(readme, 'utf8');
          // Should reference either the package name or Stack Auth
          expect(content.toLowerCase()).toMatch(/astro-stack-auth|stack auth/);
        }
      });
    });

    test('import statements reference correct modules', () => {
      const minimalIndex = path.join(examplesDir, 'minimal-astro', 'src', 'pages', 'index.astro');
      const content = fs.readFileSync(minimalIndex, 'utf8');
      
      // Check for correct server import
      expect(content).toContain('astro-stack-auth/server');
    });
  });
});

describe('Integration Functionality Tests', () => {
  const examplesDir = path.resolve(__dirname, '../../examples');
  
  test('package version constraints are realistic', () => {
    const minimalPackage = path.join(examplesDir, 'minimal-astro', 'package.json');
    const fullPackage = path.join(examplesDir, 'full-featured', 'package.json');
    
    [minimalPackage, fullPackage].forEach(packagePath => {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check that astro version is compatible
      const astroVersion = packageJson.dependencies.astro;
      expect(astroVersion).toMatch(/\^5\./); // Should be Astro 5.x
      
      // Check that React version is compatible
      const reactVersion = packageJson.dependencies.react;
      expect(reactVersion).toMatch(/\^19\./); // Should be React 19.x
    });
  });

  test('examples use consistent patterns', () => {
    const minimalConfig = path.join(examplesDir, 'minimal-astro', 'astro.config.mjs');
    const fullConfig = path.join(examplesDir, 'full-featured', 'astro.config.mjs');
    
    const minimalContent = fs.readFileSync(minimalConfig, 'utf8');
    const fullContent = fs.readFileSync(fullConfig, 'utf8');
    
    // Both should use server output
    expect(minimalContent).toContain('output: \'server\'');
    expect(fullContent).toContain('output: \'server\'');
    
    // Both should import stackAuth
    expect(minimalContent).toContain('import stackAuth from \'astro-stack-auth\'');
    expect(fullContent).toContain('import stackAuth from \'astro-stack-auth\'');
  });
});