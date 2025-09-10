/**
 * File Operation Helpers for Tests
 * 
 * Provides cross-platform, reliable file operations for the test suite,
 * replacing direct glob usage and providing better error handling.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File pattern matching without glob dependency
 */
export interface FileMatchOptions {
  extensions?: string[];
  recursive?: boolean;
  excludePatterns?: string[];
  maxDepth?: number;
}

/**
 * Find files matching patterns without using glob
 */
export function findFiles(
  directory: string, 
  pattern: string | RegExp, 
  options: FileMatchOptions = {}
): string[] {
  const {
    extensions = [],
    recursive = true,
    excludePatterns = [],
    maxDepth = 10
  } = options;

  const results: string[] = [];
  const patternRegex = typeof pattern === 'string' 
    ? new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'))
    : pattern;

  function searchDirectory(dir: string, currentDepth: number = 0): void {
    if (currentDepth > maxDepth || !fs.existsSync(dir)) {
      return;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(directory, fullPath);
        
        // Check exclude patterns
        if (excludePatterns.some(exclude => relativePath.includes(exclude))) {
          continue;
        }

        if (entry.isDirectory()) {
          if (recursive) {
            searchDirectory(fullPath, currentDepth + 1);
          }
        } else if (entry.isFile()) {
          // Check extensions
          if (extensions.length > 0) {
            const ext = path.extname(entry.name);
            if (!extensions.includes(ext)) {
              continue;
            }
          }

          // Check pattern
          if (patternRegex.test(entry.name) || patternRegex.test(relativePath)) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error);
    }
  }

  searchDirectory(directory);
  return results.sort();
}

/**
 * Get all TypeScript test files
 */
export function getTestFiles(testDir: string = path.join(__dirname, '..')): string[] {
  return findFiles(testDir, /\.test\.(ts|js|tsx|jsx)$/, {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    excludePatterns: ['node_modules', '.git', 'dist', 'build']
  });
}

/**
 * Get all TypeScript source files
 */
export function getSourceFiles(srcDir: string = path.join(__dirname, '../../src')): string[] {
  return findFiles(srcDir, /\.(ts|tsx)$/, {
    extensions: ['.ts', '.tsx'],
    excludePatterns: ['node_modules', '.git', 'dist', 'build', '*.d.ts']
  });
}

/**
 * Get build output files
 */
export function getBuildFiles(distDir: string = path.join(__dirname, '../../dist')): string[] {
  if (!fs.existsSync(distDir)) {
    return [];
  }

  return findFiles(distDir, /\.(js|mjs|cjs|d\.ts|d\.mts|d\.cts)$/, {
    extensions: ['.js', '.mjs', '.cjs', '.d.ts', '.d.mts', '.d.cts'],
    recursive: false
  });
}

/**
 * Safe file existence check
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Safe directory existence check
 */
export function directoryExists(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Safe file content reading
 */
export function readFileContent(filePath: string): string | null {
  try {
    if (!fileExists(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
    return null;
  }
}

/**
 * Get file modification time safely
 */
export function getFileModTime(filePath: string): Date | null {
  try {
    if (!fileExists(filePath)) {
      return null;
    }
    return fs.statSync(filePath).mtime;
  } catch {
    return null;
  }
}

/**
 * Create temporary test file
 */
export function createTempFile(content: string, extension: string = '.ts'): string {
  const tempDir = path.join(__dirname, '../temp');
  if (!directoryExists(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
  const filePath = path.join(tempDir, fileName);
  
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/**
 * Cleanup temporary files
 */
export function cleanupTempFiles(): void {
  const tempDir = path.join(__dirname, '../temp');
  if (directoryExists(tempDir)) {
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        fs.unlinkSync(filePath);
      }
      fs.rmdirSync(tempDir);
    } catch (error) {
      console.warn('Warning: Could not cleanup temp files:', error);
    }
  }
}

/**
 * Project root utilities
 */
export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const SRC_DIR = path.join(PROJECT_ROOT, 'src');
export const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
export const TESTS_DIR = path.join(PROJECT_ROOT, 'tests');
export const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

/**
 * Get relative path from project root
 */
export function getRelativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath);
}