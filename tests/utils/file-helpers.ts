/**
 * File Operation Helpers for Tests
 * 
 * Provides cross-platform, reliable file operations for the test suite,
 * replacing direct glob usage and providing better error handling.
 * Includes performance monitoring for file operations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance tracking for file operations
 */
interface FileOperationMetric {
  operation: string;
  filePath: string;
  duration: number;
  success: boolean;
  fileSize?: number;
  timestamp: number;
}

class FileOperationTracker {
  private metrics: FileOperationMetric[] = [];
  private enabled: boolean;

  constructor(enabled: boolean = process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.NODE_ENV === 'test') {
    this.enabled = enabled;
  }

  time<T>(operation: string, filePath: string, fn: () => T): T {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    // Try to get file size for context
    let fileSize: number | undefined;
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        fileSize = fs.statSync(filePath).size;
      }
    } catch {
      // Ignore errors getting file size
    }

    this.recordMetric({
      operation,
      filePath,
      duration,
      success: result !== null && result !== false,
      fileSize,
      timestamp: Date.now()
    });

    return result;
  }

  private recordMetric(metric: FileOperationMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 200 metrics
    if (this.metrics.length > 200) {
      this.metrics = this.metrics.slice(-200);
    }
  }

  getMetrics(): FileOperationMetric[] {
    return [...this.metrics];
  }

  generateReport(): {
    totalOperations: number;
    totalDuration: number;
    averageDuration: number;
    operationStats: Record<string, {
      count: number;
      totalDuration: number;
      avgDuration: number;
      successRate: number;
      totalFileSize: number;
      avgFileSize: number;
    }>;
  } {
    const stats: Record<string, {
      count: number;
      totalDuration: number;
      avgDuration: number;
      successRate: number;
      totalFileSize: number;
      avgFileSize: number;
    }> = {};

    for (const metric of this.metrics) {
      if (!stats[metric.operation]) {
        stats[metric.operation] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          successRate: 0,
          totalFileSize: 0,
          avgFileSize: 0
        };
      }

      const stat = stats[metric.operation];
      stat.count++;
      stat.totalDuration += metric.duration;
      if (metric.fileSize) {
        stat.totalFileSize += metric.fileSize;
      }
    }

    // Calculate averages and rates
    for (const [operationName, stat] of Object.entries(stats)) {
      stat.avgDuration = stat.count > 0 ? stat.totalDuration / stat.count : 0;
      stat.avgFileSize = stat.count > 0 ? stat.totalFileSize / stat.count : 0;
      
      // Calculate success rate for this specific operation
      const operationMetrics = this.metrics.filter(m => m.operation === operationName);
      const successCount = operationMetrics.filter(m => m.success).length;
      stat.successRate = stat.count > 0 ? successCount / stat.count : 0;
    }

    return {
      totalOperations: this.metrics.length,
      totalDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0),
      averageDuration: this.metrics.length > 0 ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length : 0,
      operationStats: stats
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// Global file operation tracker
const fileOpTracker = new FileOperationTracker();

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
 * Safe file existence check (with performance monitoring)
 */
export function fileExists(filePath: string): boolean {
  return fileOpTracker.time('fileExists', filePath, () => {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  });
}

/**
 * Safe directory existence check (with performance monitoring)
 */
export function directoryExists(dirPath: string): boolean {
  return fileOpTracker.time('directoryExists', dirPath, () => {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  });
}

/**
 * Safe file content reading (with performance monitoring)
 */
export function readFileContent(filePath: string): string | null {
  return fileOpTracker.time('readFileContent', filePath, () => {
    try {
      if (!fileExists(filePath)) {
        return null;
      }
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}:`, error);
      return null;
    }
  });
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
 * Safe file writing (with performance monitoring)
 */
export function writeFileContent(filePath: string, content: string): boolean {
  return fileOpTracker.time('writeFileContent', filePath, () => {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.warn(`Warning: Could not write file ${filePath}:`, error);
      return false;
    }
  });
}

/**
 * Safe directory creation
 */
export function createDirectory(dirPath: string): boolean {
  return fileOpTracker.time('createDirectory', dirPath, () => {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.warn(`Warning: Could not create directory ${dirPath}:`, error);
      return false;
    }
  });
}

/**
 * Safe file removal
 */
export function removeFile(filePath: string): boolean {
  return fileOpTracker.time('removeFile', filePath, () => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error) {
      console.warn(`Warning: Could not remove file ${filePath}:`, error);
      return false;
    }
  });
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

/**
 * Get file operation performance metrics
 */
export function getFileOperationMetrics() {
  return fileOpTracker.generateReport();
}

/**
 * Clear file operation performance metrics
 */
export function clearFileOperationMetrics(): void {
  fileOpTracker.clear();
}

/**
 * Log file operation performance (for debugging)
 */
export function logFileOperationPerformance(): void {
  const report = fileOpTracker.generateReport();
  
  if (report.totalOperations === 0) {
    console.log('No file operations recorded');
    return;
  }
  
  console.log('\n📁 File Operation Performance Report');
  console.log('='.repeat(45));
  console.log(`Total Operations: ${report.totalOperations}`);
  console.log(`Total Duration: ${report.totalDuration.toFixed(2)}ms`);
  console.log(`Average Duration: ${report.averageDuration.toFixed(2)}ms`);
  
  console.log('\n📈 Operation Breakdown:');
  for (const [operation, stats] of Object.entries(report.operationStats)) {
    console.log(`  • ${operation}: ${stats.count} ops, ${stats.avgDuration.toFixed(2)}ms avg, ${(stats.successRate * 100).toFixed(1)}% success`);
    if (stats.avgFileSize > 0) {
      console.log(`    Average file size: ${(stats.avgFileSize / 1024).toFixed(1)}KB`);
    }
  }
  
  console.log('='.repeat(45) + '\n');
}