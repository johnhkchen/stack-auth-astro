import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { detectAndParseTypeScriptConfig } from '../../scripts/type-extractor.js';

describe('TypeScript Configuration Edge Cases', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(__dirname, 'edge-cases-'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('Circular Extends References', () => {
    it('should handle direct circular reference', () => {
      // Create config A that extends B
      const configA = {
        extends: './tsconfig.b.json',
        compilerOptions: {
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(configA, null, 2)
      );

      // Create config B that extends A (circular)
      const configB = {
        extends: './tsconfig.json',
        compilerOptions: {
          target: 'ES2020',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.b.json'),
        JSON.stringify(configB, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      // Should handle circular reference gracefully
      expect(result).toBeDefined();
      expect(result.options).toBeDefined();
      // Should have picked up some options despite circular reference
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('circular')
      );
    });

    it('should handle indirect circular reference', () => {
      // Create config A -> B -> C -> A (circular)
      const configA = {
        extends: './tsconfig.b.json',
        compilerOptions: {
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(configA, null, 2)
      );

      const configB = {
        extends: './tsconfig.c.json',
        compilerOptions: {
          target: 'ES2020',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.b.json'),
        JSON.stringify(configB, null, 2)
      );

      const configC = {
        extends: './tsconfig.json',
        compilerOptions: {
          module: 'ESNext',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.c.json'),
        JSON.stringify(configC, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.options).toBeDefined();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('circular')
      );
    });

    it('should handle self-reference', () => {
      // Create config that extends itself
      const config = {
        extends: './tsconfig.json',
        compilerOptions: {
          target: 'ES2020',
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.options).toBeDefined();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('circular')
      );
    });
  });

  describe('Invalid JSON Syntax', () => {
    it('should handle JSON with trailing commas', () => {
      const invalidJson = `{
        "compilerOptions": {
          "target": "ES2020",
          "module": "ESNext",
        },
      }`;
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), invalidJson);

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // Should fall back to defaults
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.skipLibCheck).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle JSON with single quotes', () => {
      const invalidJson = `{
        'compilerOptions': {
          'target': 'ES2020',
          'module': 'ESNext'
        }
      }`;
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), invalidJson);

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // Should fall back to defaults
      expect(result.options).toBeDefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle completely malformed JSON', () => {
      const malformedJson = 'this is not json at all { ] }';
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), malformedJson);

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // Should use fallback configuration
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.skipLibCheck).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle JSON with BOM', () => {
      // UTF-8 BOM
      const bom = '\uFEFF';
      const jsonWithBom = bom + JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
        },
      });
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), jsonWithBom);

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.target).toBe(ts.ScriptTarget.ES2020);
    });

    it('should handle empty JSON file', () => {
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '');

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // Should use fallback configuration
      expect(result.compilerOptions.declaration).toBe(true);
      expect(result.compilerOptions.skipLibCheck).toBe(true);
    });

    it('should handle JSON with only whitespace', () => {
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '   \n\t\r\n   ');

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // Should use fallback configuration
      expect(result.options).toBeDefined();
    });
  });

  describe('File System Issues', () => {
    it('should handle permission denied errors', () => {
      const config = {
        compilerOptions: {
          target: 'ES2020',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      // Make file unreadable (Unix-like systems)
      if (process.platform !== 'win32') {
        fs.chmodSync(path.join(tempDir, 'tsconfig.json'), 0o000);

        const result = detectAndParseTypeScriptConfig(tempDir);

        // Restore permissions for cleanup
        fs.chmodSync(path.join(tempDir, 'tsconfig.json'), 0o644);

        expect(result).toBeDefined();
        // Should use fallback configuration
        expect(result.options).toBeDefined();
      }
    });

    it('should handle symlink loops', () => {
      // Create symlink loop
      const linkPath = path.join(tempDir, 'tsconfig.json');
      const targetPath = path.join(tempDir, 'tsconfig.link.json');

      if (process.platform !== 'win32') {
        try {
          fs.symlinkSync(targetPath, linkPath);
          fs.symlinkSync(linkPath, targetPath);
        } catch (e) {
          // Symlink creation might fail on some systems
        }

        const result = detectAndParseTypeScriptConfig(tempDir);

        expect(result).toBeDefined();
        // Should use fallback configuration
        expect(result.options).toBeDefined();
      }
    });

    it('should handle very long file paths', () => {
      // Create deeply nested directory structure
      let currentPath = tempDir;
      for (let i = 0; i < 20; i++) {
        currentPath = path.join(currentPath, `very_long_directory_name_${i}`);
        fs.mkdirSync(currentPath);
      }

      const config = {
        compilerOptions: {
          target: 'ES2020',
        },
      };
      fs.writeFileSync(
        path.join(currentPath, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(currentPath);

      expect(result).toBeDefined();
      expect(result.options).toBeDefined();
    });
  });

  describe('Network and Remote Paths', () => {
    it('should handle extends with URL (should fail gracefully)', () => {
      const config = {
        extends: 'https://example.com/tsconfig.json',
        compilerOptions: {
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      // Should handle network path failure gracefully
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.strict).toBe(true);
    });

    it('should handle extends with UNC path (Windows)', () => {
      if (process.platform === 'win32') {
        const config = {
          extends: '\\\\server\\share\\tsconfig.json',
          compilerOptions: {
            strict: true,
          },
        };
        fs.writeFileSync(
          path.join(tempDir, 'tsconfig.json'),
          JSON.stringify(config, null, 2)
        );

        const result = detectAndParseTypeScriptConfig(tempDir);

        expect(result).toBeDefined();
        expect(result.options).toBeDefined();
      }
    });
  });

  describe('Deeply Nested Configurations', () => {
    it('should handle very deep extends chain', () => {
      // Create a chain of 20 configs
      for (let i = 0; i < 20; i++) {
        const config = i === 0
          ? { compilerOptions: { target: 'ES2018' } }
          : { extends: `./config${i - 1}.json`, compilerOptions: { [`option${i}`]: true } };
        
        fs.writeFileSync(
          path.join(tempDir, `config${i}.json`),
          JSON.stringify(config, null, 2)
        );
      }

      const finalConfig = {
        extends: './config19.json',
        compilerOptions: {
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(finalConfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions).toBeDefined();
      expect(result.compilerOptions.strict).toBe(true);
      // Should have inherited from the chain
      expect(result.compilerOptions.target).toBe(ts.ScriptTarget.ES2018);
    });

    it('should handle deeply nested compiler options', () => {
      const config = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          paths: {
            '@very/deeply/nested/path/to/module/*': [
              'src/very/deeply/nested/path/to/implementation/*',
            ],
            '@another/very/deeply/nested/path/*': [
              'src/another/implementation/*',
            ],
          },
          lib: [
            'ES2020',
            'ES2020.Promise',
            'ES2020.String',
            'ES2020.Symbol.WellKnown',
            'DOM',
            'DOM.Iterable',
            'WebWorker',
            'WebWorker.ImportScripts',
          ],
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.paths).toBeDefined();
      expect(result.compilerOptions.lib).toBeDefined();
      expect(result.compilerOptions.lib.length).toBeGreaterThan(5);
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle Unicode characters in paths', () => {
      const config = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@компоненты/*': ['src/components/*'],
            '@组件/*': ['src/components/*'],
            '@コンポーネント/*': ['src/components/*'],
          },
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.paths).toBeDefined();
      expect(Object.keys(result.compilerOptions.paths).length).toBe(3);
    });

    it('should handle special characters in file names', () => {
      const specialName = 'tsconfig.test-@#$%.json';
      const config = {
        compilerOptions: {
          target: 'ES2020',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, specialName),
        JSON.stringify(config, null, 2)
      );

      const mainConfig = {
        extends: `./${specialName}`,
        compilerOptions: {
          strict: true,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(mainConfig, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.strict).toBe(true);
    });
  });

  describe('Conflicting Options', () => {
    it('should handle conflicting module and target combinations', () => {
      const config = {
        compilerOptions: {
          target: 'ES3', // Very old
          module: 'ES2022', // Very new
          lib: ['ESNext'],
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(console.warn).toHaveBeenCalled();
      // Should handle mismatch gracefully
      expect(result.options).toBeDefined();
    });

    it('should handle incompatible jsx and module settings', () => {
      const config = {
        compilerOptions: {
          module: 'AMD',
          jsx: 'react-native', // Not compatible with AMD
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.options).toBeDefined();
    });
  });

  describe('Large Scale Configurations', () => {
    it('should handle configuration with hundreds of path mappings', () => {
      const paths: Record<string, string[]> = {};
      for (let i = 0; i < 200; i++) {
        paths[`@module${i}/*`] = [`src/modules/module${i}/*`];
      }

      const config = {
        compilerOptions: {
          target: 'ES2020',
          paths,
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.compilerOptions.paths).toBeDefined();
      expect(Object.keys(result.compilerOptions.paths).length).toBe(200);
    });

    it('should handle configuration with many include/exclude patterns', () => {
      const include = [];
      const exclude = [];
      
      for (let i = 0; i < 100; i++) {
        include.push(`src/feature${i}/**/*.ts`);
        exclude.push(`src/feature${i}/**/*.test.ts`);
      }

      const config = {
        compilerOptions: {
          target: 'ES2020',
        },
        include,
        exclude,
      };
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectAndParseTypeScriptConfig(tempDir);

      expect(result).toBeDefined();
      expect(result.options).toBeDefined();
    });
  });
});