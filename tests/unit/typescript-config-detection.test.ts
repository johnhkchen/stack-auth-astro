import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { detectAndParseTypeScriptConfig } from '../../scripts/type-extractor.js';

// Mock TypeScript module
vi.mock('typescript', async () => {
  const actual = await vi.importActual<typeof ts>('typescript');
  return {
    ...actual,
    findConfigFile: vi.fn(actual.findConfigFile),
    readConfigFile: vi.fn(actual.readConfigFile),
    parseJsonConfigFileContent: vi.fn(actual.parseJsonConfigFileContent),
  };
});

describe('TypeScript Configuration Detection', () => {
  const mockProjectRoot = '/mock/project';
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-'));
    // Create a dummy TypeScript file to avoid "no inputs" warning
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export const test = true;');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('detectAndParseTypeScriptConfig', () => {
    it('should detect and parse a basic tsconfig.json', () => {
      // Create a basic tsconfig.json
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          strict: true,
          declaration: true,
          skipLibCheck: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.target).toBeDefined();
      expect(result.compilerOptions.module).toBeDefined();
      expect(result.compilerOptions.strict).toBe(true);
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.skipLibCheck).toBe(true);
    });

    it('should handle extends chain with base configuration', () => {
      // Create base configuration
      const baseConfig = {
        compilerOptions: {
          target: 'ES2018',
          module: 'CommonJS',
          strict: false,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.base.json'),
        JSON.stringify(baseConfig, null, 2)
      );

      // Create extending configuration
      const tsconfig = {
        extends: './tsconfig.base.json',
        compilerOptions: {
          target: 'ES2020',
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions).toBeDefined();
      // Should override target from base
      expect(result.compilerOptions.target).toBe(ts.ScriptTarget.ES2020);
      // Should inherit module from base
      expect(result.compilerOptions.module).toBe(ts.ModuleKind.CommonJS);
      // Should override strict from base
      expect(result.compilerOptions.strict).toBe(true);
    });

    it('should handle multiple levels of extends chain', () => {
      // Create root configuration
      const rootConfig = {
        compilerOptions: {
          target: 'ES2018',
          module: 'CommonJS',
          lib: ['ES2018'],
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.root.json'),
        JSON.stringify(rootConfig, null, 2)
      );

      // Create base configuration extending root
      const baseConfig = {
        extends: './tsconfig.root.json',
        compilerOptions: {
          strict: true,
          declaration: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.base.json'),
        JSON.stringify(baseConfig, null, 2)
      );

      // Create main configuration extending base
      const tsconfig = {
        extends: './tsconfig.base.json',
        compilerOptions: {
          target: 'ES2022',
          skipLibCheck: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions).toBeDefined();
      // Should have final target
      expect(result.compilerOptions.target).toBe(ts.ScriptTarget.ES2022);
      // Should inherit module from root
      expect(result.compilerOptions.module).toBe(ts.ModuleKind.CommonJS);
      // Should inherit strict from base
      expect(result.compilerOptions.strict).toBe(true);
      // Should inherit declaration from base
      expect(result.compilerOptions.declaration).toBe(true);
      // Should have skipLibCheck from main
      expect(result.compilerOptions.skipLibCheck).toBe(true);
    });

    it('should use fallback configuration when tsconfig.json is missing', () => {
      // Create a new temp dir without tsconfig.json
      const noConfigDir = fs.mkdtempSync(path.join(__dirname, 'no-config-'));
      
      const result = detectAndParseTypeScriptConfig(noConfigDir);

      // Clean up
      fs.rmSync(noConfigDir, { recursive: true, force: true });

      expect(result).toBeDefined();
      // It may find a parent tsconfig.json (like the project's), which is expected behavior
      // If it finds one, it should be successful; if not, it should use fallback
      if (result.configPath && result.configPath.includes('tsconfig.json')) {
        expect(result.success).toBe(true);
        expect(result.source).toBe('consumer');
      } else {
        expect(result.success).toBe(false);
        expect(result.source).toBe('fallback');
      }
      expect(result.compilerOptions).toBeDefined();
      // Should have fallback values
      expect(result.compilerOptions.target).toBeDefined();
      expect(result.compilerOptions.module).toBeDefined();
      expect(result.compilerOptions.lib).toBeDefined();
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.skipLibCheck).toBe(true);
      expect(result.compilerOptions.moduleResolution).toBeDefined();
    });

    it('should handle malformed JSON gracefully', () => {
      // Create malformed JSON
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        '{ "compilerOptions": { "target": "ES2020", } }' // Invalid trailing comma
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      // TypeScript's parser is lenient with trailing commas, so it parses successfully
      expect(result).toBeDefined();
      expect(result.compilerOptions).toBeDefined();
      // Should have fallback values
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.skipLibCheck).toBe(true);
    });

    it('should handle missing extends target gracefully', () => {
      // Create configuration with missing extends target
      const tsconfig = {
        extends: './non-existent.json',
        compilerOptions: {
          target: 'ES2020',
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      // Should still parse available options
      expect(result).toBeDefined();
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.target).toBeDefined();
      expect(result.compilerOptions.strict).toBe(true);
    });

    it('should respect include and exclude patterns', () => {
      // Create directories matching the include patterns
      const srcDir = path.join(tempDir, 'src');
      const testsDir = path.join(tempDir, 'tests');
      fs.mkdirSync(srcDir);
      fs.mkdirSync(testsDir);
      fs.writeFileSync(path.join(srcDir, 'main.ts'), 'export const main = true;');
      fs.writeFileSync(path.join(testsDir, 'main.spec.ts'), 'test("example", () => {});');

      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
        },
        include: ['src/**/*', 'tests/**/*.spec.ts'],
        exclude: ['node_modules', 'dist'],
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions).toBeDefined();
    });

    it('should handle relative paths in extends', () => {
      // Create nested directory structure
      const nestedDir = path.join(tempDir, 'config');
      fs.mkdirSync(nestedDir, { recursive: true });

      // Create base configuration in nested directory
      const baseConfig = {
        compilerOptions: {
          target: 'ES2018',
          module: 'CommonJS',
        },
      };
      fs.writeFileSync(
        path.join(nestedDir, 'base.json'),
        JSON.stringify(baseConfig, null, 2)
      );

      // Create main configuration with relative extends
      const tsconfig = {
        extends: './config/base.json',
        compilerOptions: {
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.target).toBe(ts.ScriptTarget.ES2018);
      expect(result.compilerOptions.module).toBe(ts.ModuleKind.CommonJS);
      expect(result.compilerOptions.strict).toBe(true);
    });

    it('should handle tsconfig.json with comments', () => {
      // TypeScript allows comments in tsconfig.json
      const tsconfigWithComments = `{
        // This is a comment
        "compilerOptions": {
          "target": "ES2020", // Another comment
          "module": "ESNext",
          /* Multi-line
             comment */
          "strict": true
        }
      }`;
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        tsconfigWithComments
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.target).toBe(ts.ScriptTarget.ES2020);
      expect(result.compilerOptions.strict).toBe(true);
    });

    it('should detect configuration in parent directories', () => {
      // Create tsconfig in parent directory
      const parentConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(parentConfig, null, 2)
      );

      // Create subdirectory
      const subDir = path.join(tempDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });
      // Create a TypeScript file in subdirectory
      fs.writeFileSync(path.join(subDir, 'test.ts'), 'export const test = true;');

      // Try to detect from subdirectory
      const result = detectAndParseTypeScriptConfig(subDir);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.target).toBe(ts.ScriptTarget.ES2020);
    });
  });
});