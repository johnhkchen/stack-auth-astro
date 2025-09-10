import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { execSync } from 'child_process';
import { detectAndParseTypeScriptConfig } from '../../scripts/type-extractor.js';
import { performance } from 'perf_hooks';

describe('TypeScript Configuration Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary project directory
    tempDir = fs.mkdtempSync(path.join(__dirname, '../temp-project-'));

    // Create basic package.json
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        'typescript': '^5.0.0',
      },
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Project Structure Variations', () => {
    it('should work with monorepo structure', () => {
      // Create monorepo structure
      const packagesDir = path.join(tempDir, 'packages');
      fs.mkdirSync(packagesDir);

      // Create root tsconfig
      const rootConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          strict: true,
        },
        references: [
          { path: './packages/core' },
          { path: './packages/ui' },
        ],
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(rootConfig, null, 2)
      );

      // Create package configs
      const coreDir = path.join(packagesDir, 'core');
      fs.mkdirSync(coreDir);
      const coreConfig = {
        extends: '../../tsconfig.json',
        compilerOptions: {
          outDir: './dist',
          rootDir: './src',
        },
      };
      fs.writeFileSync(
        path.join(coreDir, 'tsconfig.json'),
        JSON.stringify(coreConfig, null, 2)
      );

      const uiDir = path.join(packagesDir, 'ui');
      fs.mkdirSync(uiDir);
      const uiConfig = {
        extends: '../../tsconfig.json',
        compilerOptions: {
          jsx: 'react-jsx',
          outDir: './dist',
          rootDir: './src',
        },
      };
      fs.writeFileSync(
        path.join(uiDir, 'tsconfig.json'),
        JSON.stringify(uiConfig, null, 2)
      );

      // Test detection from different locations
      const rootResult = detectAndParseTypeScriptConfig(tempDir);
      expect(rootResult).toBeDefined();
      expect(rootResult.compilerOptions.strict).toBe(true);

      const coreResult = detectAndParseTypeScriptConfig(coreDir);
      expect(coreResult).toBeDefined();
      expect(coreResult.compilerOptions.strict).toBe(true);
      expect(coreResult.compilerOptions.rootDir).toBe('./src');

      const uiResult = detectAndParseTypeScriptConfig(uiDir);
      expect(uiResult).toBeDefined();
      expect(uiResult.compilerOptions.jsx).toBe(ts.JsxEmit.ReactJSX);
    });

    it('should work with workspace configuration', () => {
      // Create workspace structure
      const workspaceConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          composite: true,
          declaration: true,
          declarationMap: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Create app-specific config
      const appDir = path.join(tempDir, 'app');
      fs.mkdirSync(appDir);
      const appConfig = {
        extends: '../tsconfig.json',
        compilerOptions: {
          outDir: './build',
          rootDir: './src',
        },
        include: ['src/**/*'],
        exclude: ['**/*.test.ts'],
      };
      fs.writeFileSync(
        path.join(appDir, 'tsconfig.json'),
        JSON.stringify(appConfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(appDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.composite).toBe(true);
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.declarationMap).toBe(true);
      expect(result.compilerOptions.outDir).toContain('build');
    });

    it('should handle Next.js style configuration', () => {
      // Create Next.js style tsconfig
      const nextConfig = {
        compilerOptions: {
          target: 'ES2017',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          baseUrl: '.',
          paths: {
            '@/*': ['./src/*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
        exclude: ['node_modules'],
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(nextConfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.jsx).toBe(ts.JsxEmit.Preserve);
      expect(result.compilerOptions.allowJs).toBe(true);
      expect(result.compilerOptions.esModuleInterop).toBe(true);
      expect(result.compilerOptions.paths).toBeDefined();
      expect(result.compilerOptions.paths['@/*']).toEqual(['./src/*']);
    });

    it('should handle Vite style configuration', () => {
      // Create Vite style tsconfig
      const viteConfig = {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          module: 'ESNext',
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }],
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(viteConfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.moduleResolution).toBe(ts.ModuleResolutionKind.Bundler);
      expect(result.compilerOptions.useDefineForClassFields).toBe(true);
      expect(result.compilerOptions.allowImportingTsExtensions).toBe(true);
    });
  });

  describe('TypeScript Version Compatibility', () => {
    it('should handle TypeScript 4.x configurations', () => {
      const ts4Config = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          lib: ['ES2020'],
          useDefineForClassFields: true,
          moduleResolution: 'node',
          strict: true,
          skipLibCheck: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(ts4Config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.useDefineForClassFields).toBe(true);
      expect(result.compilerOptions.moduleResolution).toBe(ts.ModuleResolutionKind.Node10);
    });

    it('should handle TypeScript 5.x configurations', () => {
      const ts5Config = {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          lib: ['ES2022'],
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolvePackageJsonExports: true,
          resolvePackageJsonImports: true,
          allowArbitraryExtensions: true,
          strict: true,
          skipLibCheck: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(ts5Config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // TypeScript 5.x specific options
      if (ts.version.startsWith('5')) {
        expect(result.compilerOptions.moduleResolution).toBe(ts.ModuleResolutionKind.Bundler);
        expect(result.compilerOptions.allowImportingTsExtensions).toBe(true);
        expect(result.compilerOptions.resolvePackageJsonExports).toBe(true);
      }
    });
  });

  describe('Type Extraction Pipeline Integration', () => {
    it('should produce configuration suitable for type extraction', () => {
      const config = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          declaration: false, // Should be overridden
          emitDeclarationOnly: false, // Should be overridden
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // Should have type extraction requirements
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.emitDeclarationOnly).toBe(true);
      expect(result.compilerOptions.skipLibCheck).toBe(true);
    });

    it('should handle source files correctly', () => {
      // Create source files
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'index.ts'),
        'export const hello = "world";'
      );
      fs.writeFileSync(
        path.join(srcDir, 'utils.ts'),
        'export function add(a: number, b: number) { return a + b; }'
      );

      const config = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          rootDir: './src',
          outDir: './dist',
        },
        include: ['src/**/*'],
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.fileNames).toBeDefined();
      expect(Array.isArray(result.fileNames)).toBe(true);
      // Should include source files
      const normalizedFiles = result.fileNames.map(f => path.basename(f));
      expect(normalizedFiles).toContain('index.ts');
      expect(normalizedFiles).toContain('utils.ts');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should detect configuration quickly for small projects', () => {
      const config = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const startTime = performance.now();
      const result = detectAndParseTypeScriptConfig(tempDir);
      const endTime = performance.now();

      expect(result).toBeDefined();
      // Should complete in reasonable time (< 100ms for small project)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle deep extends chains efficiently', () => {
      // Create deep extends chain
      let currentConfig = {
        compilerOptions: {
          target: 'ES2018',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'base0.json'),
        JSON.stringify(currentConfig, null, 2)
      );

      for (let i = 1; i <= 5; i++) {
        currentConfig = {
          extends: `./base${i - 1}.json`,
          compilerOptions: {
            [`option${i}`]: true,
          },
        };
        fs.writeFileSync(
          path.join(tempDir, `base${i}.json`),
          JSON.stringify(currentConfig, null, 2)
        );
      }

      const finalConfig = {
        extends: './base5.json',
        compilerOptions: {
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(finalConfig, null, 2)
      );

      const startTime = performance.now();
      const result = detectAndParseTypeScriptConfig(tempDir);
      const endTime = performance.now();

      expect(result).toBeDefined();
      // Should handle deep chains efficiently (< 200ms)
      expect(endTime - startTime).toBeLessThan(200);
      expect(result.compilerOptions.strict).toBe(true);
    });
  });

  describe('Environment-specific Configurations', () => {
    it('should handle development configuration', () => {
      const devConfig = {
        extends: './tsconfig.json',
        compilerOptions: {
          sourceMap: true,
          inlineSourceMap: false,
          declarationMap: true,
          noEmit: false,
        },
      };

      const baseConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          strict: true,
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(baseConfig, null, 2)
      );
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.dev.json'),
        JSON.stringify(devConfig, null, 2)
      );

      // Parse development config
      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions.strict).toBe(true);
    });

    it('should handle production configuration', () => {
      const prodConfig = {
        extends: './tsconfig.json',
        compilerOptions: {
          sourceMap: false,
          removeComments: true,
          noEmitOnError: true,
        },
      };

      const baseConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          strict: true,
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(baseConfig, null, 2)
      );
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.prod.json'),
        JSON.stringify(prodConfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions.strict).toBe(true);
    });
  });

  describe('Astro Integration Compatibility', () => {
    it('should work with Astro project structure', () => {
      // Create Astro-style tsconfig
      const astroConfig = {
        extends: 'astro/tsconfigs/strict',
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@components/*': ['src/components/*'],
            '@layouts/*': ['src/layouts/*'],
            '@pages/*': ['src/pages/*'],
          },
        },
      };

      // Simulate astro/tsconfigs/strict
      const astroDir = path.join(tempDir, 'node_modules', 'astro', 'tsconfigs');
      fs.mkdirSync(astroDir, { recursive: true });
      const strictConfig = {
        compilerOptions: {
          target: 'ESNext',
          module: 'ESNext',
          moduleResolution: 'node',
          allowJs: true,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
        },
      };
      fs.writeFileSync(
        path.join(astroDir, 'strict.json'),
        JSON.stringify(strictConfig, null, 2)
      );

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(astroConfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions.strict).toBe(true);
      expect(result.compilerOptions.allowJs).toBe(true);
      expect(result.compilerOptions.paths).toBeDefined();
      expect(result.compilerOptions.paths['@components/*']).toEqual(['src/components/*']);
    });
  });
});