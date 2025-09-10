/**
 * Dependency Management Helpers for Tests
 * 
 * Provides safe dependency imports, module resolution, and compatibility
 * checking for the test environment with performance monitoring and caching.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { readFileContent, fileExists, PROJECT_ROOT } from './file-helpers.js';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);

/**
 * Performance monitoring interfaces
 */
interface PerformanceMetric {
  operation: string;
  duration: number;
  cacheHit: boolean;
  timestamp: number;
  success: boolean;
  errorType?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Generic cache interface with TTL support
 */
interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
  size: number;
  getStats(): CacheStats;
}

/**
 * LRU Cache with TTL for dependency resolution
 */
class DependencyCache<T> implements Cache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 50, ttl: number = 2 * 60 * 1000) { // 2 minutes default
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return undefined;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;
    return item.value;
  }

  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }
}

/**
 * Performance tracker for dependency operations
 */
class DependencyPerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private enabled: boolean;

  constructor(enabled: boolean = process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.NODE_ENV === 'test') {
    this.enabled = enabled;
  }

  time<T>(operation: string, fn: () => T | Promise<T>, cacheHit: boolean = false): T | Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.then(
        (value) => {
          this.recordMetric(operation, performance.now() - start, cacheHit, true);
          return value;
        },
        (error) => {
          this.recordMetric(operation, performance.now() - start, cacheHit, false, error.constructor.name);
          throw error;
        }
      );
    } else {
      this.recordMetric(operation, performance.now() - start, cacheHit, true);
      return result;
    }
  }

  private recordMetric(operation: string, duration: number, cacheHit: boolean, success: boolean, errorType?: string): void {
    this.metrics.push({
      operation,
      duration,
      cacheHit,
      timestamp: Date.now(),
      success,
      errorType
    });

    // Keep only last 500 metrics
    if (this.metrics.length > 500) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  generateReport(): {
    totalOperations: number;
    totalDuration: number;
    successRate: number;
    cacheHitRate: number;
    operationStats: Record<string, {
      count: number;
      successCount: number;
      failureCount: number;
      totalDuration: number;
      avgDuration: number;
      cacheHits: number;
      cacheHitRate: number;
      successRate: number;
      errorTypes: Record<string, number>;
    }>;
  } {
    const stats: Record<string, {
      count: number;
      successCount: number;
      failureCount: number;
      totalDuration: number;
      avgDuration: number;
      cacheHits: number;
      cacheHitRate: number;
      successRate: number;
      errorTypes: Record<string, number>;
    }> = {};

    let totalCacheHits = 0;
    let totalSuccesses = 0;

    for (const metric of this.metrics) {
      if (!stats[metric.operation]) {
        stats[metric.operation] = {
          count: 0,
          successCount: 0,
          failureCount: 0,
          totalDuration: 0,
          avgDuration: 0,
          cacheHits: 0,
          cacheHitRate: 0,
          successRate: 0,
          errorTypes: {}
        };
      }

      const stat = stats[metric.operation];
      stat.count++;
      stat.totalDuration += metric.duration;
      
      if (metric.success) {
        stat.successCount++;
        totalSuccesses++;
      } else {
        stat.failureCount++;
        if (metric.errorType) {
          stat.errorTypes[metric.errorType] = (stat.errorTypes[metric.errorType] || 0) + 1;
        }
      }
      
      if (metric.cacheHit) {
        stat.cacheHits++;
        totalCacheHits++;
      }
    }

    // Calculate averages and rates
    for (const stat of Object.values(stats)) {
      stat.avgDuration = stat.count > 0 ? stat.totalDuration / stat.count : 0;
      stat.cacheHitRate = stat.count > 0 ? stat.cacheHits / stat.count : 0;
      stat.successRate = stat.count > 0 ? stat.successCount / stat.count : 0;
    }

    return {
      totalOperations: this.metrics.length,
      totalDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0),
      successRate: this.metrics.length > 0 ? totalSuccesses / this.metrics.length : 0,
      cacheHitRate: this.metrics.length > 0 ? totalCacheHits / this.metrics.length : 0,
      operationStats: stats
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// Global caches and performance tracker for dependency operations
const dependencyCheckCache = new DependencyCache<DependencyCheckResult>();
const moduleImportCache = new DependencyCache<any>();
const fileExistsCache = new DependencyCache<boolean>();
const perfTracker = new DependencyPerformanceTracker();

/**
 * Dependency availability result
 */
export interface DependencyCheckResult {
  isAvailable: boolean;
  version?: string;
  error?: string;
  fallbackUsed?: boolean;
}

/**
 * Module import result
 */
export interface ModuleImportResult<T = any> {
  success: boolean;
  module?: T;
  error?: string;
  source: 'actual' | 'built' | 'mock' | 'fallback';
}

/**
 * Check if a dependency is available and get its version (with caching)
 */
export function checkDependency(packageName: string): DependencyCheckResult {
  const cacheKey = `dependency:${packageName}`;
  const cached = dependencyCheckCache.get(cacheKey);
  
  if (cached) {
    return perfTracker.time(`checkDependency:${packageName}`, () => cached, true);
  }

  return perfTracker.time(`checkDependency:${packageName}`, () => {
    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      const packageJson = JSON.parse(readFileContent(packageJsonPath) || '{}');
      
      const result: DependencyCheckResult = {
        isAvailable: true,
        version: packageJson.version
      };
      
      dependencyCheckCache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result: DependencyCheckResult = {
        isAvailable: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      dependencyCheckCache.set(cacheKey, result);
      return result;
    }
  }, false);
}

/**
 * Safe module import with fallbacks (with caching and performance monitoring)
 */
export async function safeImport<T = any>(
  modulePath: string,
  fallbacks: string[] = []
): Promise<ModuleImportResult<T>> {
  const cacheKey = `import:${modulePath}:${fallbacks.join(',')}`;
  const cached = moduleImportCache.get(cacheKey);
  
  if (cached) {
    return perfTracker.time(`safeImport:${modulePath}`, () => cached, true);
  }

  return perfTracker.time(`safeImport:${modulePath}`, async () => {
    // Try original module path first
    try {
      const module = await import(modulePath);
      const result: ModuleImportResult<T> = {
        success: true,
        module,
        source: 'actual'
      };
      
      moduleImportCache.set(cacheKey, result);
      return result;
    } catch (originalError) {
      const originalErrorMsg = originalError instanceof Error ? originalError.message : String(originalError);
      
      // Try fallback paths
      for (const fallbackPath of fallbacks) {
        try {
          const module = await import(fallbackPath);
          const result: ModuleImportResult<T> = {
            success: true,
            module,
            source: 'fallback'
          };
          
          moduleImportCache.set(cacheKey, result);
          return result;
        } catch {
          // Continue to next fallback
        }
      }
      
      const result: ModuleImportResult<T> = {
        success: false,
        error: `Failed to import ${modulePath}: ${originalErrorMsg}`,
        source: 'actual'
      };
      
      moduleImportCache.set(cacheKey, result);
      return result;
    }
  }, false);
}

/**
 * Cached file existence check for performance
 */
function cachedFileExists(filePath: string): boolean {
  const cacheKey = `fileExists:${filePath}`;
  const cached = fileExistsCache.get(cacheKey);
  
  if (cached !== undefined) {
    return perfTracker.time(`fileExists:${path.basename(filePath)}`, () => cached, true);
  }

  return perfTracker.time(`fileExists:${path.basename(filePath)}`, () => {
    const result = fileExists(filePath);
    fileExistsCache.set(cacheKey, result);
    return result;
  }, false);
}

/**
 * Safe require with fallbacks for CommonJS modules (with performance monitoring)
 */
export function safeRequire<T = any>(
  modulePath: string,
  fallbacks: string[] = []
): ModuleImportResult<T> {
  return perfTracker.time(`safeRequire:${modulePath}`, () => {
    // Try original module path first
    try {
      // Clear cache to ensure fresh import
      const resolvedPath = require.resolve(modulePath);
      delete require.cache[resolvedPath];
      const module = require(modulePath);
      
      return {
        success: true,
        module,
        source: 'actual'
      };
    } catch (originalError) {
      const originalErrorMsg = originalError instanceof Error ? originalError.message : String(originalError);
      
      // Try fallback paths
      for (const fallbackPath of fallbacks) {
        try {
          const resolvedPath = require.resolve(fallbackPath);
          delete require.cache[resolvedPath];
          const module = require(fallbackPath);
          return {
            success: true,
            module,
            source: 'fallback'
          };
        } catch {
          // Continue to next fallback
        }
      }
      
      return {
        success: false,
        error: `Failed to require ${modulePath}: ${originalErrorMsg}`,
        source: 'actual'
      };
    }
  }, false);
}

/**
 * Try to import from built package first, then source (with caching and performance monitoring)
 */
export async function importWithBuildFallback<T = any>(
  packageExport: string
): Promise<ModuleImportResult<T>> {
  const cacheKey = `buildFallback:${packageExport}`;
  const cached = moduleImportCache.get(cacheKey);
  
  if (cached) {
    return perfTracker.time(`importWithBuildFallback:${packageExport}`, () => cached, true);
  }

  return perfTracker.time(`importWithBuildFallback:${packageExport}`, async () => {
    const builtPath = path.join(PROJECT_ROOT, 'dist', `${packageExport}.cjs`);
    const builtPathMjs = path.join(PROJECT_ROOT, 'dist', `${packageExport}.mjs`);
    const srcPath = path.join(PROJECT_ROOT, 'src', `${packageExport}.ts`);
    
    // Try built CommonJS version first
    if (cachedFileExists(builtPath)) {
      const result = safeRequire<T>(builtPath);
      if (result.success) {
        const finalResult = { ...result, source: 'built' as const };
        moduleImportCache.set(cacheKey, finalResult);
        return finalResult;
      }
    }
    
    // Try built ESM version
    if (cachedFileExists(builtPathMjs)) {
      try {
        const module = await import(builtPathMjs);
        const result: ModuleImportResult<T> = {
          success: true,
          module,
          source: 'built'
        };
        
        moduleImportCache.set(cacheKey, result);
        return result;
      } catch {
        // Continue to source fallback
      }
    }
    
    // Try source version as fallback
    if (cachedFileExists(srcPath)) {
      try {
        const module = await import(srcPath);
        const result: ModuleImportResult<T> = {
          success: true,
          module,
          source: 'actual'
        };
        
        moduleImportCache.set(cacheKey, result);
        return result;
      } catch (error) {
        const result: ModuleImportResult<T> = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          source: 'actual'
        };
        
        moduleImportCache.set(cacheKey, result);
        return result;
      }
    }
    
    const result: ModuleImportResult<T> = {
      success: false,
      error: `Module ${packageExport} not found in built output or source`,
      source: 'actual'
    };
    
    moduleImportCache.set(cacheKey, result);
    return result;
  }, false);
}

/**
 * Check if a module export exists
 */
export async function checkModuleExport(
  modulePath: string, 
  exportName: string
): Promise<{ exists: boolean; type?: string; error?: string }> {
  try {
    const importResult = await safeImport(modulePath);
    if (!importResult.success) {
      return { 
        exists: false, 
        error: importResult.error 
      };
    }
    
    const module = importResult.module;
    if (!(exportName in module)) {
      return { 
        exists: false, 
        error: `Export '${exportName}' not found in module` 
      };
    }
    
    const exportValue = module[exportName];
    return {
      exists: true,
      type: typeof exportValue
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get all available Stack Auth dependencies
 */
export function getStackAuthDependencies(): Record<string, DependencyCheckResult> {
  const stackPackages = [
    '@stackframe/stack',
    '@stackframe/stack-ui'
  ];
  
  const results: Record<string, DependencyCheckResult> = {};
  
  for (const packageName of stackPackages) {
    results[packageName] = checkDependency(packageName);
  }
  
  return results;
}

/**
 * Check if we're in a test environment where modules might not be built
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.VITEST === 'true' ||
         typeof globalThis.vi !== 'undefined';
}

/**
 * Create a mock module when actual import fails
 */
export function createMockModule(exportNames: string[]): any {
  const mock: any = {};
  
  for (const exportName of exportNames) {
    if (exportName === 'default') {
      mock.default = () => null;
    } else {
      // Create appropriate mock based on common patterns
      if (exportName.startsWith('use') || exportName.endsWith('Hook')) {
        // React hook mock
        mock[exportName] = () => null;
      } else if (/^[A-Z]/.test(exportName)) {
        // Component mock (starts with capital letter)
        mock[exportName] = () => null;
      } else {
        // Function mock
        mock[exportName] = () => Promise.resolve(null);
      }
    }
  }
  
  return mock;
}

/**
 * Enhanced import that provides detailed feedback
 */
export async function debugImport<T = any>(
  modulePath: string
): Promise<ModuleImportResult<T> & { 
  debugInfo: {
    resolvedPath?: string;
    fileExists?: boolean;
    isBuilt?: boolean;
    alternatives?: string[];
  }
}> {
  const debugInfo: any = {
    alternatives: []
  };
  
  try {
    // Try to resolve the module
    try {
      const resolvedPath = require.resolve(modulePath);
      debugInfo.resolvedPath = resolvedPath;
      debugInfo.fileExists = fileExists(resolvedPath);
    } catch {
      debugInfo.fileExists = false;
    }
    
    // Check if this is a built module
    debugInfo.isBuilt = modulePath.includes('/dist/');
    
    // Suggest alternatives
    if (modulePath.startsWith('astro-stack-auth/')) {
      const exportName = modulePath.replace('astro-stack-auth/', '');
      debugInfo.alternatives = [
        path.join(PROJECT_ROOT, 'dist', `${exportName}.cjs`),
        path.join(PROJECT_ROOT, 'dist', `${exportName}.mjs`),
        path.join(PROJECT_ROOT, 'src', `${exportName}.ts`)
      ];
    }
    
    const result = await safeImport<T>(modulePath);
    return { ...result, debugInfo };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      source: 'actual',
      debugInfo
    };
  }
}

/**
 * Validate environment and dependencies for testing (with performance monitoring)
 */
export function validateTestEnvironment(): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  stackAuth: Record<string, DependencyCheckResult>;
  performanceMetrics?: {
    duration: number;
    cacheStats: {
      dependencyCheck: CacheStats;
      moduleImport: CacheStats;
      fileExists: CacheStats;
    };
  };
} {
  return perfTracker.time('validateTestEnvironment', () => {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check Stack Auth dependencies
    const stackAuth = getStackAuthDependencies();
    
    for (const [packageName, result] of Object.entries(stackAuth)) {
      if (!result.isAvailable) {
        warnings.push(`Stack Auth package ${packageName} not available: ${result.error}`);
      }
    }
    
    // Check if build output exists
    const distExists = cachedFileExists(path.join(PROJECT_ROOT, 'dist', 'index.cjs'));
    if (!distExists && !isTestEnvironment()) {
      warnings.push('Built package output not found - some tests may fail');
    }
    
    const result = {
      isValid: errors.length === 0,
      warnings,
      errors,
      stackAuth
    };

    // Add performance metrics in debug mode
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true') {
      return {
        ...result,
        performanceMetrics: {
          duration: 0, // Will be filled by perfTracker
          cacheStats: {
            dependencyCheck: dependencyCheckCache.getStats(),
            moduleImport: moduleImportCache.getStats(),
            fileExists: fileExistsCache.getStats()
          }
        }
      };
    }

    return result;
  }, false);
}

/**
 * Clear all dependency caches (useful for testing and development)
 */
export function clearDependencyCaches(): void {
  dependencyCheckCache.clear();
  moduleImportCache.clear();
  fileExistsCache.clear();
  perfTracker.clear();
}

/**
 * Get dependency resolution performance metrics
 */
export function getDependencyMetrics() {
  return {
    performance: perfTracker.generateReport(),
    cacheStats: {
      dependencyCheck: dependencyCheckCache.getStats(),
      moduleImport: moduleImportCache.getStats(),
      fileExists: fileExistsCache.getStats()
    }
  };
}

/**
 * Generate dependency resolution performance report
 */
export function generateDependencyPerformanceReport(): {
  summary: {
    totalOperations: number;
    totalDuration: number;
    averageDuration: number;
    successRate: number;
    cacheHitRate: number;
    slowestOperations: Array<{ operation: string; avgDuration: number }>;
    errorSummary: Record<string, number>;
  };
  detailedStats: ReturnType<typeof perfTracker.generateReport>;
  cacheStats: {
    dependencyCheck: CacheStats;
    moduleImport: CacheStats;
    fileExists: CacheStats;
  };
  recommendations: string[];
} {
  const detailedStats = perfTracker.generateReport();
  const cacheStats = {
    dependencyCheck: dependencyCheckCache.getStats(),
    moduleImport: moduleImportCache.getStats(),
    fileExists: fileExistsCache.getStats()
  };

  const recommendations: string[] = [];

  // Calculate summary metrics
  const operations = Object.entries(detailedStats.operationStats);
  const slowestOperations = operations
    .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
    .slice(0, 5)
    .map(([operation, stats]) => ({ operation, avgDuration: stats.avgDuration }));

  const errorSummary: Record<string, number> = {};
  for (const [, stats] of operations) {
    for (const [errorType, count] of Object.entries(stats.errorTypes)) {
      errorSummary[errorType] = (errorSummary[errorType] || 0) + count;
    }
  }

  // Generate recommendations
  if (detailedStats.cacheHitRate < 0.7) {
    recommendations.push('Consider increasing cache TTL or size to improve cache hit rate');
  }

  if (detailedStats.successRate < 0.9) {
    recommendations.push('High failure rate detected - check dependency availability and module paths');
  }

  const avgDuration = detailedStats.totalOperations > 0 
    ? detailedStats.totalDuration / detailedStats.totalOperations 
    : 0;

  if (avgDuration > 100) { // More than 100ms average
    recommendations.push('Consider optimizing slow dependency resolution operations');
  }

  if (slowestOperations.length > 0 && slowestOperations[0].avgDuration > 200) {
    recommendations.push(`Consider optimizing '${slowestOperations[0].operation}' operation (${slowestOperations[0].avgDuration.toFixed(2)}ms avg)`);
  }

  return {
    summary: {
      totalOperations: detailedStats.totalOperations,
      totalDuration: detailedStats.totalDuration,
      averageDuration: avgDuration,
      successRate: detailedStats.successRate,
      cacheHitRate: detailedStats.cacheHitRate,
      slowestOperations,
      errorSummary
    },
    detailedStats,
    cacheStats,
    recommendations
  };
}

/**
 * Debug logging for dependency resolution timing
 */
export function logDependencyTiming(enabled: boolean = process.env.STACK_AUTH_DEBUG === 'true'): void {
  if (!enabled) return;

  const report = generateDependencyPerformanceReport();
  
  console.log('\n🔍 Dependency Resolution Performance Report');
  console.log('='.repeat(50));
  console.log(`Total Operations: ${report.summary.totalOperations}`);
  console.log(`Total Duration: ${report.summary.totalDuration.toFixed(2)}ms`);
  console.log(`Average Duration: ${report.summary.averageDuration.toFixed(2)}ms`);
  console.log(`Success Rate: ${(report.summary.successRate * 100).toFixed(1)}%`);
  console.log(`Cache Hit Rate: ${(report.summary.cacheHitRate * 100).toFixed(1)}%`);
  
  console.log('\n🐌 Slowest Operations:');
  for (const op of report.summary.slowestOperations) {
    console.log(`  • ${op.operation}: ${op.avgDuration.toFixed(2)}ms`);
  }
  
  console.log('\n📊 Cache Statistics:');
  for (const [cacheType, stats] of Object.entries(report.cacheStats)) {
    console.log(`  • ${cacheType}: ${stats.hits}/${stats.hits + stats.misses} hits (${(stats.hitRate * 100).toFixed(1)}%)`);
  }
  
  if (Object.keys(report.summary.errorSummary).length > 0) {
    console.log('\n❌ Error Summary:');
    for (const [errorType, count] of Object.entries(report.summary.errorSummary)) {
      console.log(`  • ${errorType}: ${count}`);
    }
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    for (const rec of report.recommendations) {
      console.log(`  • ${rec}`);
    }
  }
  
  console.log('='.repeat(50) + '\n');
}

/**
 * Export performance metrics for CI/CD integration
 */
export function exportPerformanceMetricsForCI(): {
  metrics: {
    dependency_resolution_total_duration_ms: number;
    dependency_resolution_avg_duration_ms: number;
    dependency_resolution_success_rate: number;
    dependency_resolution_cache_hit_rate: number;
    dependency_check_cache_hit_rate: number;
    module_import_cache_hit_rate: number;
    file_exists_cache_hit_rate: number;
  };
  status: 'pass' | 'warn' | 'fail';
  issues: string[];
} {
  const report = generateDependencyPerformanceReport();
  const issues: string[] = [];
  
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  
  // Set performance thresholds
  const thresholds = {
    maxAvgDuration: 150, // 150ms
    minSuccessRate: 0.95, // 95%
    minCacheHitRate: 0.8  // 80%
  };
  
  if (report.summary.averageDuration > thresholds.maxAvgDuration) {
    issues.push(`Average dependency resolution time (${report.summary.averageDuration.toFixed(2)}ms) exceeds threshold (${thresholds.maxAvgDuration}ms)`);
    status = 'warn';
  }
  
  if (report.summary.successRate < thresholds.minSuccessRate) {
    issues.push(`Dependency resolution success rate (${(report.summary.successRate * 100).toFixed(1)}%) below threshold (${thresholds.minSuccessRate * 100}%)`);
    status = 'fail';
  }
  
  if (report.summary.cacheHitRate < thresholds.minCacheHitRate) {
    issues.push(`Cache hit rate (${(report.summary.cacheHitRate * 100).toFixed(1)}%) below threshold (${thresholds.minCacheHitRate * 100}%)`);
    status = 'warn';
  }
  
  return {
    metrics: {
      dependency_resolution_total_duration_ms: report.summary.totalDuration,
      dependency_resolution_avg_duration_ms: report.summary.averageDuration,
      dependency_resolution_success_rate: report.summary.successRate,
      dependency_resolution_cache_hit_rate: report.summary.cacheHitRate,
      dependency_check_cache_hit_rate: report.cacheStats.dependencyCheck.hitRate,
      module_import_cache_hit_rate: report.cacheStats.moduleImport.hitRate,
      file_exists_cache_hit_rate: report.cacheStats.fileExists.hitRate
    },
    status,
    issues
  };
}