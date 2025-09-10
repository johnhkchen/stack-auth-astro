/**
 * Tests for File Operation Helpers
 * 
 * Validates that our file helpers work correctly and provide
 * reliable cross-platform file operations.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { 
  findFiles, 
  getTestFiles,
  getSourceFiles,
  getBuildFiles,
  fileExists,
  directoryExists,
  readFileContent,
  createTempFile,
  cleanupTempFiles,
  PROJECT_ROOT,
  SRC_DIR,
  TESTS_DIR
} from './file-helpers.js';
import fs from 'fs';
import path from 'path';

describe('File Helpers', () => {
  afterEach(() => {
    cleanupTempFiles();
  });

  describe('findFiles', () => {
    it('should find files matching patterns', () => {
      const files = findFiles(TESTS_DIR, /\.test\.ts$/, {
        extensions: ['.ts'],
        maxDepth: 3
      });
      
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      
      // All found files should match the pattern
      files.forEach(file => {
        expect(file).toMatch(/\.test\.ts$/);
      });
    });

    it('should respect exclude patterns', () => {
      const files = findFiles(PROJECT_ROOT, /\.js$/, {
        excludePatterns: ['node_modules', 'dist'],
        maxDepth: 2
      });
      
      // Should not include any files from node_modules or dist
      files.forEach(file => {
        expect(file).not.toMatch(/node_modules/);
        expect(file).not.toMatch(/dist/);
      });
    });

    it('should respect depth limits', () => {
      const files = findFiles(PROJECT_ROOT, /.*/, {
        maxDepth: 1,
        recursive: true
      });
      
      // With maxDepth: 1, should only find files at root level
      files.forEach(file => {
        const relativePath = path.relative(PROJECT_ROOT, file);
        const depth = relativePath.split(path.sep).length - 1;
        expect(depth).toBeLessThanOrEqual(1);
      });
    });

    it('should handle non-existent directories', () => {
      const files = findFiles('/non/existent/directory', /.*/, {});
      expect(files).toEqual([]);
    });
  });

  describe('getTestFiles', () => {
    it('should find test files', () => {
      const files = getTestFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      
      // All should be test files
      files.forEach(file => {
        expect(file).toMatch(/\.test\.(ts|js|tsx|jsx)$/);
      });
    });
  });

  describe('getSourceFiles', () => {
    it('should find source files if src directory exists', () => {
      if (directoryExists(SRC_DIR)) {
        const files = getSourceFiles();
        expect(Array.isArray(files)).toBe(true);
        
        files.forEach(file => {
          expect(file).toMatch(/\.(ts|tsx)$/);
          expect(file).not.toMatch(/\.d\.ts$/);
        });
      }
    });
  });

  describe('getBuildFiles', () => {
    it('should find build files if dist directory exists', () => {
      const files = getBuildFiles();
      expect(Array.isArray(files)).toBe(true);
      
      // If dist exists, should find various formats
      if (files.length > 0) {
        const extensions = files.map(f => path.extname(f));
        const hasValidExtensions = extensions.some(ext => 
          ['.js', '.mjs', '.cjs', '.d.ts', '.d.mts', '.d.cts'].includes(ext)
        );
        expect(hasValidExtensions).toBe(true);
      }
    });
  });

  describe('fileExists', () => {
    it('should correctly identify existing files', () => {
      // This test file should exist
      const thisFile = __filename;
      expect(fileExists(thisFile)).toBe(true);
    });

    it('should correctly identify non-existent files', () => {
      expect(fileExists('/non/existent/file.txt')).toBe(false);
    });

    it('should return false for directories', () => {
      expect(fileExists(PROJECT_ROOT)).toBe(false);
    });
  });

  describe('directoryExists', () => {
    it('should correctly identify existing directories', () => {
      expect(directoryExists(PROJECT_ROOT)).toBe(true);
      expect(directoryExists(TESTS_DIR)).toBe(true);
    });

    it('should correctly identify non-existent directories', () => {
      expect(directoryExists('/non/existent/directory')).toBe(false);
    });

    it('should return false for files', () => {
      const thisFile = __filename;
      expect(directoryExists(thisFile)).toBe(false);
    });
  });

  describe('readFileContent', () => {
    it('should read existing files', () => {
      // Create a temp file to test reading
      const content = 'test content';
      const tempFile = createTempFile(content, '.txt');
      
      const readContent = readFileContent(tempFile);
      expect(readContent).toBe(content);
    });

    it('should return null for non-existent files', () => {
      const content = readFileContent('/non/existent/file.txt');
      expect(content).toBe(null);
    });
  });

  describe('createTempFile and cleanupTempFiles', () => {
    it('should create temporary files', () => {
      const content = 'temporary test content';
      const tempFile = createTempFile(content, '.test');
      
      expect(fileExists(tempFile)).toBe(true);
      expect(readFileContent(tempFile)).toBe(content);
      expect(tempFile).toMatch(/\.test$/);
    });

    it('should create files in temp directory', () => {
      const tempFile = createTempFile('content', '.txt');
      expect(tempFile).toContain('temp');
    });

    it('should cleanup temporary files', () => {
      const tempFile1 = createTempFile('content1', '.txt');
      const tempFile2 = createTempFile('content2', '.js');
      
      expect(fileExists(tempFile1)).toBe(true);
      expect(fileExists(tempFile2)).toBe(true);
      
      cleanupTempFiles();
      
      expect(fileExists(tempFile1)).toBe(false);
      expect(fileExists(tempFile2)).toBe(false);
    });
  });

  describe('constants', () => {
    it('should provide correct project paths', () => {
      expect(directoryExists(PROJECT_ROOT)).toBe(true);
      expect(directoryExists(TESTS_DIR)).toBe(true);
      
      // These may or may not exist depending on project state
      expect(typeof PROJECT_ROOT).toBe('string');
      expect(typeof SRC_DIR).toBe('string');
    });

    it('should have correct path relationships', () => {
      expect(TESTS_DIR.startsWith(PROJECT_ROOT)).toBe(true);
      expect(SRC_DIR.startsWith(PROJECT_ROOT)).toBe(true);
    });
  });
});