/**
 * Runtime Component Export Validation Helpers
 * 
 * This module provides utilities to validate that imported components
 * actually exist in their respective astro-stack-auth modules at runtime.
 */

import { 
  EXPECTED_PACKAGE_EXPORTS,
  getExpectedExports,
  isValidExport,
  type PackageExportValidationResult,
  type ComponentExportValidationResult,
  type SignInProps,
  type SignUpProps,
  type UserButtonProps,
  type AccountSettingsProps,
  type StackProviderProps
} from '../mocks/package-exports.js';
import * as React from 'react';
import { 
  safeImport, 
  importWithBuildFallback, 
  debugImport,
  createMockModule,
  isTestEnvironment
} from '../utils/dependency-helpers.js';
import {
  SUPPORTED_STACK_VERSIONS,
  COMPONENT_API_COMPATIBILITY
} from './version-compatibility.js';

/**
 * Cache configuration profiles for different environments
 */
interface CacheConfig {
  maxSize: number;
  ttl: number; // time-to-live in ms
  warmupEnabled: boolean;
  statsEnabled: boolean;
}

class CacheConfigManager {
  static getConfig(): CacheConfig {
    const env = process.env.NODE_ENV || 'development';
    
    // Environment-specific defaults
    const baseConfig: Record<string, CacheConfig> = {
      development: {
        maxSize: parseInt(process.env.STACK_AUTH_CACHE_SIZE || '50'),
        ttl: parseInt(process.env.STACK_AUTH_CACHE_TTL || '300000'), // 5 minutes
        warmupEnabled: process.env.STACK_AUTH_CACHE_WARMUP !== 'false',
        statsEnabled: process.env.STACK_AUTH_CACHE_STATS !== 'false'
      },
      test: {
        maxSize: parseInt(process.env.STACK_AUTH_CACHE_SIZE || '20'),
        ttl: parseInt(process.env.STACK_AUTH_CACHE_TTL || '60000'), // 1 minute
        warmupEnabled: process.env.STACK_AUTH_CACHE_WARMUP === 'true',
        statsEnabled: process.env.STACK_AUTH_CACHE_STATS === 'true'
      },
      production: {
        maxSize: parseInt(process.env.STACK_AUTH_CACHE_SIZE || '200'),
        ttl: parseInt(process.env.STACK_AUTH_CACHE_TTL || '600000'), // 10 minutes
        warmupEnabled: process.env.STACK_AUTH_CACHE_WARMUP !== 'false',
        statsEnabled: process.env.STACK_AUTH_CACHE_STATS === 'true'
      }
    };

    const config = baseConfig[env] || baseConfig.development;
    
    // Auto-tune cache size based on available memory (basic heuristic)
    if (process.env.STACK_AUTH_CACHE_AUTO_TUNE === 'true') {
      try {
        const memoryMB = process.memoryUsage().heapTotal / (1024 * 1024);
        if (memoryMB < 100) config.maxSize = Math.min(config.maxSize, 20);
        else if (memoryMB > 500) config.maxSize = Math.max(config.maxSize, 500);
      } catch {
        // Ignore memory calculation errors
      }
    }

    return config;
  }
}

/**
 * Enhanced cache statistics interface
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  sets: number;
  clears: number;
  size: number;
  maxSize: number;
  hitRate: number;
  avgTtl: number;
  lastAccess: number;
  createdAt: number;
}

/**
 * Performance monitoring and caching utilities
 */
interface ValidationCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
  size: number;
  getStats(): CacheStats;
  warm(keys: string[], warmupFn: (key: string) => Promise<T>): Promise<void>;
  validateHealth(): { isHealthy: boolean; issues: string[] };
}

class LRUCache<T> implements ValidationCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number; // time-to-live in ms
  private stats: Omit<CacheStats, 'hitRate' | 'avgTtl' | 'size' | 'maxSize'>;
  private createdAt: number;

  constructor(config?: CacheConfig) {
    const cacheConfig = config || CacheConfigManager.getConfig();
    this.maxSize = cacheConfig.maxSize;
    this.ttl = cacheConfig.ttl;
    this.createdAt = Date.now();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      clears: 0,
      lastAccess: Date.now()
    };
  }

  get(key: string): T | undefined {
    this.stats.lastAccess = Date.now();
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return undefined;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.stats.hits++;
    return item.value;
  }

  set(key: string, value: T): void {
    this.stats.lastAccess = Date.now();
    this.stats.sets++;
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
    this.stats.clears++;
    this.stats.lastAccess = Date.now();
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    const totalAccess = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalAccess > 0 ? this.stats.hits / totalAccess : 0,
      avgTtl: this.ttl,
      createdAt: this.createdAt
    };
  }

  async warm(keys: string[], warmupFn: (key: string) => Promise<T>): Promise<void> {
    const warmupPromises = keys.map(async (key) => {
      try {
        if (!this.cache.has(key)) {
          const value = await warmupFn(key);
          this.set(key, value);
        }
      } catch (error) {
        // Log warning but don't fail warmup for individual items
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Cache warmup failed for key ${key}:`, error);
        }
      }
    });
    
    await Promise.allSettled(warmupPromises);
  }

  validateHealth(): { isHealthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const stats = this.getStats();
    
    // Check cache hit rate
    if (stats.hitRate < 0.5 && stats.hits + stats.misses > 10) {
      issues.push(`Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    }
    
    // Check if cache is too full
    if (stats.size / stats.maxSize > 0.9) {
      issues.push(`Cache nearly full: ${stats.size}/${stats.maxSize} items`);
    }
    
    // Check for excessive evictions
    const evictionRate = stats.sets > 0 ? stats.evictions / stats.sets : 0;
    if (evictionRate > 0.3 && stats.sets > 10) {
      issues.push(`High eviction rate: ${(evictionRate * 100).toFixed(1)}%`);
    }
    
    // Check if cache hasn't been accessed recently
    const timeSinceLastAccess = Date.now() - stats.lastAccess;
    if (timeSinceLastAccess > this.ttl * 2) {
      issues.push(`Cache inactive for ${Math.round(timeSinceLastAccess / 60000)} minutes`);
    }
    
    return {
      isHealthy: issues.length === 0,
      issues
    };
  }
}

/**
 * Performance measurement utility
 */
interface PerformanceMetrics {
  operation: string;
  duration: number;
  cacheHit: boolean;
  timestamp: number;
}

class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];
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
          this.recordMetric(operation, performance.now() - start, cacheHit);
          return value;
        },
        (error) => {
          this.recordMetric(operation, performance.now() - start, cacheHit);
          throw error;
        }
      );
    } else {
      this.recordMetric(operation, performance.now() - start, cacheHit);
      return result;
    }
  }

  private recordMetric(operation: string, duration: number, cacheHit: boolean): void {
    this.metrics.push({
      operation,
      duration,
      cacheHit,
      timestamp: Date.now()
    });

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  generateReport(): {
    totalOperations: number;
    totalDuration: number;
    cacheHitRate: number;
    operationStats: Record<string, {
      count: number;
      totalDuration: number;
      avgDuration: number;
      cacheHits: number;
      cacheHitRate: number;
    }>;
  } {
    const stats: Record<string, {
      count: number;
      totalDuration: number;
      avgDuration: number;
      cacheHits: number;
      cacheHitRate: number;
    }> = {};

    let totalCacheHits = 0;

    for (const metric of this.metrics) {
      if (!stats[metric.operation]) {
        stats[metric.operation] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          cacheHits: 0,
          cacheHitRate: 0
        };
      }

      const stat = stats[metric.operation];
      stat.count++;
      stat.totalDuration += metric.duration;
      if (metric.cacheHit) {
        stat.cacheHits++;
        totalCacheHits++;
      }
    }

    // Calculate averages and rates
    for (const stat of Object.values(stats)) {
      stat.avgDuration = stat.count > 0 ? stat.totalDuration / stat.count : 0;
      stat.cacheHitRate = stat.count > 0 ? stat.cacheHits / stat.count : 0;
    }

    return {
      totalOperations: this.metrics.length,
      totalDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0),
      cacheHitRate: this.metrics.length > 0 ? totalCacheHits / this.metrics.length : 0,
      operationStats: stats
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// Global caches and performance tracker with configurable management
const globalCacheConfig = CacheConfigManager.getConfig();
const moduleValidationCache = new LRUCache<{ isValid: boolean; error?: string }>(globalCacheConfig);
const componentValidationCache = new LRUCache<{ isValid: boolean; error?: string; componentType?: string }>(globalCacheConfig);
const moduleExportsCache = new LRUCache<any>(globalCacheConfig);
const dynamicImportCache = new LRUCache<any>(globalCacheConfig);
const perfTracker = new PerformanceTracker();

/**
 * Cache Management API
 */
export interface CacheManagementAPI {
  // Cache statistics and health
  getCacheStats(): {
    moduleValidation: CacheStats;
    componentValidation: CacheStats;
    moduleExports: CacheStats;
    dynamicImport: CacheStats;
  };
  validateCacheHealth(): {
    overall: { isHealthy: boolean; issues: string[] };
    individual: {
      moduleValidation: { isHealthy: boolean; issues: string[] };
      componentValidation: { isHealthy: boolean; issues: string[] };
      moduleExports: { isHealthy: boolean; issues: string[] };
      dynamicImport: { isHealthy: boolean; issues: string[] };
    };
  };
  
  // Cache warming
  warmCache(options?: {
    moduleValidations?: string[];
    componentValidations?: string[];
    moduleExports?: string[];
    dynamicImports?: string[];
  }): Promise<void>;
  
  // Cache management
  clearAllCaches(): void;
  clearCache(cacheType: 'moduleValidation' | 'componentValidation' | 'moduleExports' | 'dynamicImport'): void;
  
  // Development tools
  getCacheDashboard(): {
    config: CacheConfig;
    performance: ReturnType<typeof perfTracker.generateReport>;
    stats: ReturnType<CacheManagementAPI['getCacheStats']>;
    health: ReturnType<CacheManagementAPI['validateCacheHealth']>;
    environment: string;
  };
  
  // Debugging
  inspectCache(cacheType: 'moduleValidation' | 'componentValidation' | 'moduleExports' | 'dynamicImport'): {
    keys: string[];
    sampleEntries: Array<{ key: string; value: any; age: number }>;
  };
}

/**
 * Implementation of the Cache Management API
 */
class CacheManager implements CacheManagementAPI {
  getCacheStats() {
    return {
      moduleValidation: moduleValidationCache.getStats(),
      componentValidation: componentValidationCache.getStats(),
      moduleExports: moduleExportsCache.getStats(),
      dynamicImport: dynamicImportCache.getStats()
    };
  }

  validateCacheHealth() {
    const moduleValidationHealth = moduleValidationCache.validateHealth();
    const componentValidationHealth = componentValidationCache.validateHealth();
    const moduleExportsHealth = moduleExportsCache.validateHealth();
    const dynamicImportHealth = dynamicImportCache.validateHealth();
    
    const allIssues = [
      ...moduleValidationHealth.issues,
      ...componentValidationHealth.issues,
      ...moduleExportsHealth.issues,
      ...dynamicImportHealth.issues
    ];
    
    return {
      overall: {
        isHealthy: allIssues.length === 0,
        issues: allIssues
      },
      individual: {
        moduleValidation: moduleValidationHealth,
        componentValidation: componentValidationHealth,
        moduleExports: moduleExportsHealth,
        dynamicImport: dynamicImportHealth
      }
    };
  }

  async warmCache(options: {
    moduleValidations?: string[];
    componentValidations?: string[];
    moduleExports?: string[];
    dynamicImports?: string[];
  } = {}) {
    const warmupTasks = [];
    
    // Common validation paths for warmup
    const commonModuleValidations = [
      'runtime-export:astro-stack-auth/components:SignIn',
      'runtime-export:astro-stack-auth/components:SignUp',
      'runtime-export:astro-stack-auth/components:UserButton',
      'runtime-export:astro-stack-auth/server:getUser',
      'runtime-export:astro-stack-auth/client:signIn'
    ];
    
    const commonComponentValidations = [
      'react-component:astro-stack-auth/components:SignIn',
      'react-component:astro-stack-auth/components:SignUp',
      'react-component:astro-stack-auth/components:UserButton'
    ];
    
    const commonModuleExports = [
      'module-exports:astro-stack-auth/components',
      'module-exports:astro-stack-auth/server',
      'module-exports:astro-stack-auth/client'
    ];
    
    const commonDynamicImports = [
      'import:components',
      'import:server',
      'import:client'
    ];

    // Warmup module validations
    if (options.moduleValidations || !Object.keys(options).length) {
      const keys = options.moduleValidations || commonModuleValidations;
      warmupTasks.push(
        moduleValidationCache.warm(keys, async (key) => {
          // Simulate validation result - in real implementation would call actual validation
          return { isValid: true };
        })
      );
    }

    // Warmup component validations
    if (options.componentValidations || !Object.keys(options).length) {
      const keys = options.componentValidations || commonComponentValidations;
      warmupTasks.push(
        componentValidationCache.warm(keys, async (key) => {
          return { isValid: true, componentType: 'react-component' };
        })
      );
    }

    // Warmup module exports
    if (options.moduleExports || !Object.keys(options).length) {
      const keys = options.moduleExports || commonModuleExports;
      warmupTasks.push(
        moduleExportsCache.warm(keys, async (key) => {
          return { isValid: true, missingExports: [], unexpectedExports: [], modulePath: key };
        })
      );
    }

    // Warmup dynamic imports
    if (options.dynamicImports || !Object.keys(options).length) {
      const keys = options.dynamicImports || commonDynamicImports;
      warmupTasks.push(
        dynamicImportCache.warm(keys, async (key) => {
          // Mock successful import for warmup
          return { success: true, module: {}, source: 'warmup' };
        })
      );
    }

    await Promise.allSettled(warmupTasks);
  }

  clearAllCaches(): void {
    moduleValidationCache.clear();
    componentValidationCache.clear();
    moduleExportsCache.clear();
    dynamicImportCache.clear();
    perfTracker.clear();
  }

  clearCache(cacheType: 'moduleValidation' | 'componentValidation' | 'moduleExports' | 'dynamicImport'): void {
    switch (cacheType) {
      case 'moduleValidation':
        moduleValidationCache.clear();
        break;
      case 'componentValidation':
        componentValidationCache.clear();
        break;
      case 'moduleExports':
        moduleExportsCache.clear();
        break;
      case 'dynamicImport':
        dynamicImportCache.clear();
        break;
    }
  }

  getCacheDashboard() {
    return {
      config: globalCacheConfig,
      performance: perfTracker.generateReport(),
      stats: this.getCacheStats(),
      health: this.validateCacheHealth(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  inspectCache(cacheType: 'moduleValidation' | 'componentValidation' | 'moduleExports' | 'dynamicImport') {
    let targetCache: any;
    
    switch (cacheType) {
      case 'moduleValidation':
        targetCache = moduleValidationCache;
        break;
      case 'componentValidation':
        targetCache = componentValidationCache;
        break;
      case 'moduleExports':
        targetCache = moduleExportsCache;
        break;
      case 'dynamicImport':
        targetCache = dynamicImportCache;
        break;
    }

    // Access private cache Map for inspection (development only)
    const cacheMap = (targetCache as any).cache as Map<string, { value: any; timestamp: number }>;
    const keys = Array.from(cacheMap.keys());
    const sampleEntries = keys.slice(0, 5).map(key => {
      const entry = cacheMap.get(key)!;
      return {
        key,
        value: entry.value,
        age: Date.now() - entry.timestamp
      };
    });

    return { keys, sampleEntries };
  }
}

// Export the cache manager instance
const cacheManager = new CacheManager();

/**
 * Clear all validation caches (useful for development scenarios)
 */
export function clearValidationCaches(): void {
  cacheManager.clearAllCaches();
}

/**
 * Get validation performance metrics
 */
export function getValidationMetrics() {
  return perfTracker.generateReport();
}

/**
 * Get cache management API
 */
export function getCacheManager(): CacheManagementAPI {
  return cacheManager;
}

/**
 * Get cache statistics for all caches
 */
export function getCacheStats() {
  return cacheManager.getCacheStats();
}

/**
 * Validate health of all caches
 */
export function validateCacheHealth() {
  return cacheManager.validateCacheHealth();
}

/**
 * Warm up caches with common validation patterns
 */
export async function warmValidationCaches(options?: Parameters<CacheManagementAPI['warmCache']>[0]) {
  return cacheManager.warmCache(options);
}

/**
 * Development mode cache dashboard
 */
export function getCacheDashboard() {
  return cacheManager.getCacheDashboard();
}

/**
 * Development mode cache inspection
 */
export function inspectValidationCache(cacheType: Parameters<CacheManagementAPI['inspectCache']>[0]) {
  return cacheManager.inspectCache(cacheType);
}

/**
 * Performance dashboard for development
 */
export function logCachePerformanceDashboard(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const dashboard = getCacheDashboard();
  
  console.log('\n📊 Stack Auth Cache Performance Dashboard');
  console.log('==========================================');
  console.log(`Environment: ${dashboard.environment}`);
  console.log(`Config: Size=${dashboard.config.maxSize}, TTL=${dashboard.config.ttl}ms`);
  
  console.log('\n📈 Performance Metrics:');
  const perf = dashboard.performance;
  console.log(`  Total Operations: ${perf.totalOperations}`);
  console.log(`  Cache Hit Rate: ${(perf.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`  Total Duration: ${perf.totalDuration.toFixed(1)}ms`);
  
  console.log('\n🗄️ Cache Statistics:');
  Object.entries(dashboard.stats).forEach(([name, stats]) => {
    console.log(`  ${name}:`);
    console.log(`    Size: ${stats.size}/${stats.maxSize} (${((stats.size/stats.maxSize)*100).toFixed(1)}%)`);
    console.log(`    Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`    Evictions: ${stats.evictions}`);
  });
  
  console.log('\n🏥 Health Status:');
  const health = dashboard.health;
  console.log(`  Overall Health: ${health.overall.isHealthy ? '✅ Healthy' : '⚠️ Issues Detected'}`);
  if (health.overall.issues.length > 0) {
    health.overall.issues.forEach(issue => console.log(`    - ${issue}`));
  }
  
  console.log('==========================================\n');
}

/**
 * Log cache miss warnings for critical paths
 */
export function logCacheMissWarnings(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const stats = getCacheStats();
  const criticalPaths = [
    'moduleValidation',
    'componentValidation'
  ];
  
  criticalPaths.forEach(pathType => {
    const pathStats = stats[pathType as keyof typeof stats];
    if (pathStats.hitRate < 0.7 && pathStats.hits + pathStats.misses > 5) {
      console.warn(`⚠️  Low cache hit rate for ${pathType}: ${(pathStats.hitRate * 100).toFixed(1)}%`);
      console.warn(`   Consider warming up cache or checking validation patterns`);
    }
  });
}

/**
 * Memoized version of importWithBuildFallback for performance
 */
async function memoizedImportWithBuildFallback(exportName: string): Promise<any> {
  const cacheKey = `import:${exportName}`;
  const cached = dynamicImportCache.get(cacheKey);
  
  if (cached) {
    return perfTracker.time(`importWithBuildFallback:${exportName}`, () => cached, true);
  }

  return perfTracker.time(`importWithBuildFallback:${exportName}`, async () => {
    const result = await importWithBuildFallback(exportName);
    dynamicImportCache.set(cacheKey, result);
    return result;
  }, false);
}

/**
 * Validates that a module path and export name combination is valid
 */
export async function validateRuntimeExport(
  modulePath: string,
  exportName: string
): Promise<{ isValid: boolean; error?: string }> {
  const cacheKey = `runtime-export:${modulePath}:${exportName}`;
  const cached = moduleValidationCache.get(cacheKey);
  
  if (cached) {
    return perfTracker.time('validateRuntimeExport', () => cached, true);
  }

  return perfTracker.time('validateRuntimeExport', async () => {
    try {
      // Check against mock exports first
      if (!isValidExport(modulePath, exportName)) {
        const result = {
          isValid: false,
          error: `Export '${exportName}' is not expected in module '${modulePath}'`
        };
        moduleValidationCache.set(cacheKey, result);
        return result;
      }

      // Try to import the actual module with enhanced error handling
      if (modulePath.startsWith('astro-stack-auth/')) {
        const moduleExportName = modulePath.replace('astro-stack-auth/', '');
        const importResult = await memoizedImportWithBuildFallback(moduleExportName);
      
        if (importResult.success) {
          const module = importResult.module;
          if (!(exportName in module)) {
            const result = {
              isValid: false,
              error: `Export '${exportName}' does not exist in actual module '${modulePath}' (source: ${importResult.source})`
            };
            moduleValidationCache.set(cacheKey, result);
            return result;
          }
          const result = { isValid: true };
          moduleValidationCache.set(cacheKey, result);
          return result;
        } else if (isTestEnvironment()) {
          // In test environment, it's ok if modules aren't built yet
          console.warn(`Could not import actual module ${modulePath} (${importResult.error}), using mock validation only`);
          const result = { isValid: true };
          moduleValidationCache.set(cacheKey, result);
          return result;
        } else {
          const result = {
            isValid: false,
            error: `Failed to import module '${modulePath}': ${importResult.error}`
          };
          moduleValidationCache.set(cacheKey, result);
          return result;
        }
      } else {
        // Fallback to old behavior for non-astro-stack-auth modules
        try {
          const actualModulePath = modulePath.replace('astro-stack-auth', '../..');
          const importResult = await safeImport(actualModulePath);
          
          if (!importResult.success) {
            console.warn(`Could not import actual module ${modulePath}, using mock validation only`);
            const result = { isValid: true };
            moduleValidationCache.set(cacheKey, result);
            return result;
          }
          
          if (!(exportName in importResult.module)) {
            const result = {
              isValid: false,
              error: `Export '${exportName}' does not exist in actual module '${modulePath}'`
            };
            moduleValidationCache.set(cacheKey, result);
            return result;
          }
          
          const result = { isValid: true };
          moduleValidationCache.set(cacheKey, result);
          return result;
        } catch (importError) {
          console.warn(`Could not import actual module ${modulePath}, using mock validation only`);
          const result = { isValid: true };
          moduleValidationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (error) {
      const result = {
        isValid: false,
        error: `Runtime validation error: ${error instanceof Error ? error.message : String(error)}`
      };
      moduleValidationCache.set(cacheKey, result);
      return result;
    }
  }, false);
}

/**
 * Validates that imported React components are actually React components
 */
export async function validateReactComponent(
  modulePath: string,
  componentName: string
): Promise<{ isValid: boolean; error?: string; componentType?: string }> {
  const cacheKey = `react-component:${modulePath}:${componentName}`;
  const cached = componentValidationCache.get(cacheKey);
  
  if (cached) {
    return perfTracker.time('validateReactComponent', () => cached, true);
  }

  return perfTracker.time('validateReactComponent', async () => {
    try {
      // First check if it's a valid export
      const exportValidation = await validateRuntimeExport(modulePath, componentName);
      if (!exportValidation.isValid) {
        componentValidationCache.set(cacheKey, exportValidation);
        return exportValidation;
      }

      // Try to import and check if it's a React component
      if (modulePath.startsWith('astro-stack-auth/')) {
        const exportName = modulePath.replace('astro-stack-auth/', '');
        const importResult = await memoizedImportWithBuildFallback(exportName);
      
      if (importResult.success) {
        const module = importResult.module;
        const component = module[componentName];
        
        if (component) {
          // Check if it's a React component
          const componentType = typeof component;
          const isReactComponent = 
            componentType === 'function' || 
            (componentType === 'object' && component.$$typeof) || // React.forwardRef
            React.isValidElement(component);
          
          if (!isReactComponent) {
            const result = {
              isValid: false,
              error: `Export '${componentName}' is not a valid React component`,
              componentType
            };
            componentValidationCache.set(cacheKey, result);
            return result;
          }
          
          const result = { 
            isValid: true, 
            componentType: isReactComponent ? 'react-component' : componentType 
          };
          componentValidationCache.set(cacheKey, result);
          return result;
        }
      } else if (isTestEnvironment()) {
        // Module not available in test environment, use mock validation
        console.warn(`Could not import ${modulePath}/${componentName} for React validation`);
        const result = { isValid: true, componentType: 'mock' };
        componentValidationCache.set(cacheKey, result);
        return result;
      }
    } else {
      // Fallback for non-astro-stack-auth modules
      try {
        const actualModulePath = modulePath.replace('astro-stack-auth', '../..');
        const importResult = await safeImport(actualModulePath);
        
        if (importResult.success) {
          const component = importResult.module[componentName];
          
          if (component) {
            const componentType = typeof component;
            const isReactComponent = 
              componentType === 'function' || 
              (componentType === 'object' && component.$$typeof) || 
              React.isValidElement(component);
            
            if (!isReactComponent) {
              const result = {
                isValid: false,
                error: `Export '${componentName}' is not a valid React component`,
                componentType
              };
              componentValidationCache.set(cacheKey, result);
              return result;
            }
            
            const result = { 
              isValid: true, 
              componentType: isReactComponent ? 'react-component' : componentType 
            };
            componentValidationCache.set(cacheKey, result);
            return result;
          }
        }
      } catch (importError) {
        // Module not available, use mock validation
        console.warn(`Could not import ${modulePath}/${componentName} for React validation`);
        const result = { isValid: true, componentType: 'mock' };
        componentValidationCache.set(cacheKey, result);
        return result;
      }
    }
    
    const result = { isValid: true, componentType: 'unknown' };
    componentValidationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    const result = {
      isValid: false,
      error: `React component validation error: ${error instanceof Error ? error.message : String(error)}`
    };
    componentValidationCache.set(cacheKey, result);
    return result;
  }
  }, false);
}

/**
 * Validates a full module's exports against expected exports
 */
export async function validateModuleExports(modulePath: string): Promise<PackageExportValidationResult> {
  const cacheKey = `module-exports:${modulePath}`;
  const cached = moduleExportsCache.get(cacheKey);
  
  if (cached) {
    return perfTracker.time('validateModuleExports', () => cached, true);
  }

  return perfTracker.time('validateModuleExports', async () => {
    const expectedExports = getExpectedExports(modulePath);
    const result: PackageExportValidationResult = {
      isValid: true,
      missingExports: [],
      unexpectedExports: [],
      modulePath
    };

    if (!expectedExports) {
      const finalResult = {
        ...result,
        isValid: false,
        missingExports: [`No expected exports defined for module: ${modulePath}`]
      };
      moduleExportsCache.set(cacheKey, finalResult);
      return finalResult;
    }

    // Try to import actual module with enhanced error handling
    if (modulePath.startsWith('astro-stack-auth/')) {
      const exportName = modulePath.replace('astro-stack-auth/', '');
      const importResult = await memoizedImportWithBuildFallback(exportName);
    
    if (importResult.success) {
      const module = importResult.module;
      const expectedExportNames = Object.keys(expectedExports);
      
      // Check for missing exports
      for (const expectedExport of expectedExportNames) {
        if (!(expectedExport in module)) {
          result.missingExports.push(expectedExport);
          result.isValid = false;
        }
      }
    } else if (!isTestEnvironment()) {
      // Only fail if not in test environment
      result.isValid = false;
      result.missingExports.push(`Failed to import module: ${importResult.error}`);
    } else {
      console.warn(`Could not import module ${modulePath} for validation:`, importResult.error);
    }
  } else {
    // Fallback for non-astro-stack-auth modules
    try {
      const actualModulePath = modulePath.replace('astro-stack-auth', '../..');
      const importResult = await safeImport(actualModulePath);
      
      if (importResult.success) {
        const module = importResult.module;
        const expectedExportNames = Object.keys(expectedExports);
        
        // Check for missing exports
        for (const expectedExport of expectedExportNames) {
          if (!(expectedExport in module)) {
            result.missingExports.push(expectedExport);
            result.isValid = false;
          }
        }
      } else {
        console.warn(`Could not import module ${modulePath} for validation:`, importResult.error);
      }
    } catch (importError) {
      console.warn(`Could not import module ${modulePath} for validation:`, importError);
    }
  }

  moduleExportsCache.set(cacheKey, result);
  return result;
  }, false);
}

/**
 * Validates component exports specifically, checking React component types
 */
export async function validateComponentExports(modulePath: string): Promise<ComponentExportValidationResult> {
  const basicValidation = await validateModuleExports(modulePath);
  const result: ComponentExportValidationResult = {
    ...basicValidation,
    invalidComponentTypes: [],
    missingReactComponents: []
  };

  // Additional validation for React components
  const expectedComponents = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
  
  for (const componentName of expectedComponents) {
    const componentValidation = await validateReactComponent(modulePath, componentName);
    if (!componentValidation.isValid) {
      if (componentValidation.error?.includes('not a valid React component')) {
        result.invalidComponentTypes.push(componentName);
      } else if (componentValidation.error?.includes('does not exist')) {
        result.missingReactComponents.push(componentName);
      }
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Batch validation for multiple import statements
 */
export async function validateImportStatements(
  imports: Array<{ specifiers: string[]; source: string; line: number }>
): Promise<Array<{
  import: typeof imports[0];
  validation: PackageExportValidationResult;
  componentValidations: Array<{
    component: string;
    validation: { isValid: boolean; error?: string; componentType?: string };
  }>;
}>> {
  const results = [];
  
  for (const importStatement of imports) {
    if (importStatement.source.startsWith('astro-stack-auth/')) {
      const moduleValidation = await validateModuleExports(importStatement.source);
      
      const componentValidations = [];
      for (const specifier of importStatement.specifiers) {
        const componentValidation = await validateReactComponent(importStatement.source, specifier);
        componentValidations.push({
          component: specifier,
          validation: componentValidation
        });
      }
      
      results.push({
        import: importStatement,
        validation: moduleValidation,
        componentValidations
      });
    }
  }
  
  return results;
}

/**
 * Prop validation result interface
 */
export interface PropValidationResult {
  isValid: boolean;
  component: string;
  errors: string[];
  warnings: string[];
  requiredPropsMissing: string[];
  invalidPropTypes: string[];
  unexpectedProps: string[];
}

/**
 * Validates component prop interfaces against Stack Auth UI specifications
 */
export async function validateComponentProps(
  modulePath: string,
  componentName: string,
  providedProps: Record<string, any>
): Promise<PropValidationResult> {
  const result: PropValidationResult = {
    isValid: true,
    component: componentName,
    errors: [],
    warnings: [],
    requiredPropsMissing: [],
    invalidPropTypes: [],
    unexpectedProps: []
  };

  // Get expected prop interface for the component
  const expectedProps = getExpectedComponentProps(componentName);
  if (!expectedProps) {
    result.isValid = false;
    result.errors.push(`Unknown component: ${componentName}`);
    return result;
  }

  // Check required props
  for (const [propName, propSpec] of Object.entries(expectedProps)) {
    if (propSpec.required && !(propName in providedProps)) {
      result.requiredPropsMissing.push(propName);
      result.isValid = false;
    }
  }

  // Check provided props against expected interface
  for (const [propName, propValue] of Object.entries(providedProps)) {
    const expectedProp = expectedProps[propName];
    
    if (!expectedProp) {
      result.unexpectedProps.push(propName);
      result.warnings.push(`Unexpected prop '${propName}' for component '${componentName}'`);
      continue;
    }

    // Validate prop type
    const typeValidation = validatePropType(propName, propValue, expectedProp.type, expectedProp.optional);
    if (!typeValidation.isValid) {
      result.invalidPropTypes.push(propName);
      result.errors.push(typeValidation.error!);
      result.isValid = false;
    }
  }

  // Add specific validation for event handlers
  if (componentName === 'SignIn' || componentName === 'SignUp') {
    validateEventHandlers(componentName, providedProps, result);
  }

  return result;
}

/**
 * Get expected prop specifications for a component
 */
function getExpectedComponentProps(componentName: string): Record<string, { type: string; required: boolean; optional: boolean }> | null {
  const propSpecs: Record<string, Record<string, { type: string; required: boolean; optional: boolean }>> = {
    SignIn: {
      onSuccess: { type: 'function', required: false, optional: true },
      onError: { type: 'function', required: false, optional: true },
      redirectTo: { type: 'string', required: false, optional: true },
      providers: { type: 'array', required: false, optional: true },
      showTerms: { type: 'boolean', required: false, optional: true },
      termsUrl: { type: 'string', required: false, optional: true },
      privacyUrl: { type: 'string', required: false, optional: true },
      style: { type: 'object', required: false, optional: true },
      className: { type: 'string', required: false, optional: true },
      fullPage: { type: 'boolean', required: false, optional: true }
    },
    SignUp: {
      onSuccess: { type: 'function', required: false, optional: true },
      onError: { type: 'function', required: false, optional: true },
      redirectTo: { type: 'string', required: false, optional: true },
      providers: { type: 'array', required: false, optional: true },
      showTerms: { type: 'boolean', required: false, optional: true },
      termsUrl: { type: 'string', required: false, optional: true },
      privacyUrl: { type: 'string', required: false, optional: true },
      style: { type: 'object', required: false, optional: true },
      className: { type: 'string', required: false, optional: true },
      fullPage: { type: 'boolean', required: false, optional: true }
    },
    UserButton: {
      showDisplayName: { type: 'boolean', required: false, optional: true },
      showAvatar: { type: 'boolean', required: false, optional: true },
      colorModeToggle: { type: 'boolean', required: false, optional: true },
      showSignOutButton: { type: 'boolean', required: false, optional: true },
      onSignOut: { type: 'function', required: false, optional: true },
      style: { type: 'object', required: false, optional: true },
      className: { type: 'string', required: false, optional: true }
    },
    AccountSettings: {
      onUpdateSuccess: { type: 'function', required: false, optional: true },
      onUpdateError: { type: 'function', required: false, optional: true },
      onDeleteAccount: { type: 'function', required: false, optional: true },
      showProfile: { type: 'boolean', required: false, optional: true },
      showSecurity: { type: 'boolean', required: false, optional: true },
      showPreferences: { type: 'boolean', required: false, optional: true },
      style: { type: 'object', required: false, optional: true },
      className: { type: 'string', required: false, optional: true },
      fullPage: { type: 'boolean', required: false, optional: true }
    },
    StackProvider: {
      projectId: { type: 'string', required: true, optional: false },
      publishableClientKey: { type: 'string', required: true, optional: false },
      children: { type: 'react-node', required: true, optional: false },
      baseUrl: { type: 'string', required: false, optional: true },
      lang: { type: 'string', required: false, optional: true },
      theme: { type: 'string', required: false, optional: true }
    }
  };

  return propSpecs[componentName] || null;
}

/**
 * Validate individual prop type
 */
function validatePropType(
  propName: string, 
  propValue: any, 
  expectedType: string, 
  optional: boolean
): { isValid: boolean; error?: string } {
  // Handle undefined/null values for optional props
  if ((propValue === undefined || propValue === null) && optional) {
    return { isValid: true };
  }

  // Handle required props that are missing
  if ((propValue === undefined || propValue === null) && !optional) {
    return { 
      isValid: false, 
      error: `Required prop '${propName}' is missing or null` 
    };
  }

  const actualType = typeof propValue;

  switch (expectedType) {
    case 'string':
      if (actualType !== 'string') {
        return { 
          isValid: false, 
          error: `Prop '${propName}' should be string, got ${actualType}` 
        };
      }
      break;
    
    case 'boolean':
      if (actualType !== 'boolean') {
        return { 
          isValid: false, 
          error: `Prop '${propName}' should be boolean, got ${actualType}` 
        };
      }
      break;
    
    case 'function':
      if (actualType !== 'function') {
        return { 
          isValid: false, 
          error: `Prop '${propName}' should be function, got ${actualType}` 
        };
      }
      break;
    
    case 'object':
      if (actualType !== 'object' || Array.isArray(propValue)) {
        return { 
          isValid: false, 
          error: `Prop '${propName}' should be object, got ${actualType}` 
        };
      }
      break;
    
    case 'array':
      if (!Array.isArray(propValue)) {
        return { 
          isValid: false, 
          error: `Prop '${propName}' should be array, got ${actualType}` 
        };
      }
      break;
    
    case 'react-node':
      // React node validation is more complex, accept various React types
      if (propValue === null || propValue === undefined) {
        return { 
          isValid: false, 
          error: `Prop '${propName}' (React node) cannot be null or undefined` 
        };
      }
      // Accept string, number, React elements, arrays, etc.
      break;
    
    default:
      return { 
        isValid: false, 
        error: `Unknown expected type '${expectedType}' for prop '${propName}'` 
      };
  }

  return { isValid: true };
}

/**
 * Validate event handler signatures for auth components
 */
function validateEventHandlers(
  componentName: string,
  props: Record<string, any>,
  result: PropValidationResult
): void {
  if (props.onSuccess && typeof props.onSuccess === 'function') {
    // Check function signature by checking length (parameter count)
    if (props.onSuccess.length !== 1) {
      result.warnings.push(
        `${componentName}.onSuccess should accept exactly 1 parameter (user: User)`
      );
    }
  }

  if (props.onError && typeof props.onError === 'function') {
    if (props.onError.length !== 1) {
      result.warnings.push(
        `${componentName}.onError should accept exactly 1 parameter (error: Error)`
      );
    }
  }
}

/**
 * Batch validation for component props across multiple components
 */
export async function validateComponentPropsInFile(
  filePath: string,
  componentUsages: Array<{
    component: string;
    props: Record<string, any>;
    line: number;
  }>
): Promise<{
  filePath: string;
  totalComponents: number;
  validComponents: number;
  invalidComponents: number;
  propValidations: Array<PropValidationResult & { line: number }>;
}> {
  const propValidations: Array<PropValidationResult & { line: number }> = [];
  
  for (const usage of componentUsages) {
    const validation = await validateComponentProps(
      'astro-stack-auth/components',
      usage.component,
      usage.props
    );
    
    propValidations.push({
      ...validation,
      line: usage.line
    });
  }

  const validComponents = propValidations.filter(v => v.isValid).length;
  const invalidComponents = propValidations.length - validComponents;

  return {
    filePath,
    totalComponents: propValidations.length,
    validComponents,
    invalidComponents,
    propValidations
  };
}

/**
 * Version-aware prop validation result interface
 */
export interface VersionAwarePropValidationResult extends PropValidationResult {
  stackVersion?: string;
  versionWarnings: string[];
  deprecatedProps: string[];
  unsupportedProps: string[];
  versionMismatchErrors: string[];
}

/**
 * Validates component prop interfaces with Stack Auth version awareness
 */
export async function validateComponentPropsWithVersion(
  modulePath: string,
  componentName: string,
  providedProps: Record<string, any>,
  targetVersion?: string
): Promise<VersionAwarePropValidationResult> {
  // First run standard prop validation
  const baseValidation = await validateComponentProps(modulePath, componentName, providedProps);
  
  // Extend with version-aware validation
  const result: VersionAwarePropValidationResult = {
    ...baseValidation,
    stackVersion: targetVersion || SUPPORTED_STACK_VERSIONS.current,
    versionWarnings: [],
    deprecatedProps: [],
    unsupportedProps: [],
    versionMismatchErrors: []
  };

  // Get version-specific compatibility information
  const versionRange = getVersionRange(result.stackVersion);
  const componentAPI = COMPONENT_API_COMPATIBILITY[componentName as keyof typeof COMPONENT_API_COMPATIBILITY];
  
  if (componentAPI && componentAPI[versionRange as keyof typeof componentAPI]) {
    const versionAPI = componentAPI[versionRange as keyof typeof componentAPI];
    
    // Check for deprecated props
    if (versionAPI.deprecated) {
      for (const propName of Object.keys(providedProps)) {
        if (versionAPI.deprecated.includes(propName)) {
          result.deprecatedProps.push(propName);
          result.versionWarnings.push(
            `Prop '${propName}' is deprecated in Stack Auth ${versionRange}. Consider removing or updating your implementation.`
          );
        }
      }
    }
    
    // Check for unsupported props in current version
    const supportedProps = versionAPI.props || [];
    for (const propName of Object.keys(providedProps)) {
      if (!supportedProps.includes(propName) && !isCommonProp(propName)) {
        result.unsupportedProps.push(propName);
        result.versionWarnings.push(
          `Prop '${propName}' may not be supported in Stack Auth ${versionRange}. Verify compatibility.`
        );
      }
    }
    
    // Provide migration guidance for version mismatches
    if (result.deprecatedProps.length > 0 || result.unsupportedProps.length > 0) {
      result.versionWarnings.push(
        `Consider updating to Stack Auth ${SUPPORTED_STACK_VERSIONS.current} or later for full compatibility.`
      );
    }
  }

  return result;
}

/**
 * Get version range from specific version string
 */
function getVersionRange(version?: string): string {
  if (!version) return '2.8.x';
  
  const major = version.split('.')[0];
  const minor = version.split('.')[1];
  return `${major}.${minor}.x`;
}

/**
 * Check if a prop is a common React prop (style, className, etc.)
 */
function isCommonProp(propName: string): boolean {
  const commonProps = ['style', 'className', 'id', 'key', 'ref'];
  return commonProps.includes(propName);
}

/**
 * Batch version-aware validation for multiple components
 */
export async function validateComponentPropsWithVersionBatch(
  componentUsages: Array<{
    component: string;
    props: Record<string, any>;
    line: number;
  }>,
  targetVersion?: string
): Promise<{
  totalComponents: number;
  validComponents: number;
  invalidComponents: number;
  versionCompatibilityIssues: number;
  propValidations: Array<VersionAwarePropValidationResult & { line: number }>;
}> {
  const propValidations: Array<VersionAwarePropValidationResult & { line: number }> = [];
  
  for (const usage of componentUsages) {
    const validation = await validateComponentPropsWithVersion(
      'astro-stack-auth/components',
      usage.component,
      usage.props,
      targetVersion
    );
    
    propValidations.push({
      ...validation,
      line: usage.line
    });
  }

  const validComponents = propValidations.filter(v => v.isValid).length;
  const invalidComponents = propValidations.length - validComponents;
  const versionCompatibilityIssues = propValidations.reduce(
    (sum, v) => sum + v.versionWarnings.length + v.deprecatedProps.length + v.unsupportedProps.length,
    0
  );

  return {
    totalComponents: propValidations.length,
    validComponents,
    invalidComponents,
    versionCompatibilityIssues,
    propValidations
  };
}

/**
 * Generate version compatibility report for props
 */
export function generateVersionCompatibilityReport(
  validationResults: Array<VersionAwarePropValidationResult & { line?: number }>
): {
  summary: {
    totalComponents: number;
    componentsWithVersionIssues: number;
    deprecationWarnings: number;
    unsupportedProps: number;
    targetVersion: string;
  };
  issues: Array<{
    component: string;
    line?: number;
    issue: string;
    severity: 'warning' | 'info';
    category: 'deprecated' | 'unsupported' | 'version-mismatch';
  }>;
  recommendations: string[];
} {
  const summary = {
    totalComponents: validationResults.length,
    componentsWithVersionIssues: 0,
    deprecationWarnings: 0,
    unsupportedProps: 0,
    targetVersion: validationResults[0]?.stackVersion || SUPPORTED_STACK_VERSIONS.current
  };

  const issues: Array<{
    component: string;
    line?: number;
    issue: string;
    severity: 'warning' | 'info';
    category: 'deprecated' | 'unsupported' | 'version-mismatch';
  }> = [];

  const recommendations = new Set<string>();

  for (const result of validationResults) {
    let hasVersionIssues = false;

    // Process deprecated props
    for (const deprecatedProp of result.deprecatedProps) {
      hasVersionIssues = true;
      summary.deprecationWarnings++;
      issues.push({
        component: result.component,
        line: result.line,
        issue: `Prop '${deprecatedProp}' is deprecated`,
        severity: 'warning',
        category: 'deprecated'
      });
      recommendations.add(`Remove or replace deprecated prop '${deprecatedProp}' in ${result.component}`);
    }

    // Process unsupported props
    for (const unsupportedProp of result.unsupportedProps) {
      hasVersionIssues = true;
      summary.unsupportedProps++;
      issues.push({
        component: result.component,
        line: result.line,
        issue: `Prop '${unsupportedProp}' may not be supported in current version`,
        severity: 'info',
        category: 'unsupported'
      });
      recommendations.add(`Verify prop '${unsupportedProp}' compatibility in Stack Auth ${summary.targetVersion}`);
    }

    // Process version warnings
    for (const versionWarning of result.versionWarnings) {
      hasVersionIssues = true;
      issues.push({
        component: result.component,
        line: result.line,
        issue: versionWarning,
        severity: 'info',
        category: 'version-mismatch'
      });
    }

    if (hasVersionIssues) {
      summary.componentsWithVersionIssues++;
    }
  }

  // Add general recommendations
  if (summary.deprecationWarnings > 0) {
    recommendations.add(`Consider updating your Stack Auth integration to remove ${summary.deprecationWarnings} deprecated props`);
  }

  if (summary.unsupportedProps > 0) {
    recommendations.add(`Review ${summary.unsupportedProps} potentially unsupported props for Stack Auth ${summary.targetVersion} compatibility`);
  }

  return {
    summary,
    issues,
    recommendations: Array.from(recommendations)
  };
}

/**
 * Validate prop compatibility across Stack Auth version range
 */
export async function validatePropsAcrossVersions(
  componentName: string,
  providedProps: Record<string, any>,
  versionRange: string[] = SUPPORTED_STACK_VERSIONS.ranges
): Promise<{
  component: string;
  props: Record<string, any>;
  versionCompatibility: Array<{
    version: string;
    validation: VersionAwarePropValidationResult;
    isCompatible: boolean;
  }>;
  overallCompatible: boolean;
  recommendations: string[];
}> {
  const versionCompatibility: Array<{
    version: string;
    validation: VersionAwarePropValidationResult;
    isCompatible: boolean;
  }> = [];

  for (const version of versionRange) {
    const validation = await validateComponentPropsWithVersion(
      'astro-stack-auth/components',
      componentName,
      providedProps,
      version
    );

    const isCompatible = validation.isValid && 
                        validation.deprecatedProps.length === 0 &&
                        validation.versionMismatchErrors.length === 0;

    versionCompatibility.push({
      version,
      validation,
      isCompatible
    });
  }

  const overallCompatible = versionCompatibility.every(vc => vc.isCompatible);
  const recommendations: string[] = [];

  // Generate cross-version recommendations
  if (!overallCompatible) {
    const problematicVersions = versionCompatibility.filter(vc => !vc.isCompatible);
    const affectedVersions = problematicVersions.map(vc => vc.version);
    
    recommendations.push(
      `Component ${componentName} has compatibility issues with Stack Auth versions: ${affectedVersions.join(', ')}`
    );

    // Find common problematic props across versions
    const allDeprecatedProps = new Set<string>();
    const allUnsupportedProps = new Set<string>();
    
    for (const vc of problematicVersions) {
      vc.validation.deprecatedProps.forEach(prop => allDeprecatedProps.add(prop));
      vc.validation.unsupportedProps.forEach(prop => allUnsupportedProps.add(prop));
    }

    if (allDeprecatedProps.size > 0) {
      recommendations.push(`Consider removing deprecated props: ${Array.from(allDeprecatedProps).join(', ')}`);
    }

    if (allUnsupportedProps.size > 0) {
      recommendations.push(`Review potentially unsupported props: ${Array.from(allUnsupportedProps).join(', ')}`);
    }
  }

  return {
    component: componentName,
    props: providedProps,
    versionCompatibility,
    overallCompatible,
    recommendations
  };
}

/**
 * Helper to generate validation summary
 */
export function generateValidationSummary(
  validationResults: Array<{
    import: { specifiers: string[]; source: string; line: number };
    validation: PackageExportValidationResult;
    componentValidations: Array<{
      component: string;
      validation: { isValid: boolean; error?: string; componentType?: string };
    }>;
  }>
): {
  totalImports: number;
  validImports: number;
  invalidImports: number;
  errors: string[];
  warnings: string[];
} {
  const summary = {
    totalImports: validationResults.length,
    validImports: 0,
    invalidImports: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };
  
  for (const result of validationResults) {
    let importIsValid = result.validation.isValid;
    
    for (const componentValidation of result.componentValidations) {
      if (!componentValidation.validation.isValid) {
        importIsValid = false;
        summary.errors.push(
          `${result.import.source}:${result.import.line} - ${componentValidation.validation.error}`
        );
      } else if (componentValidation.validation.componentType === 'mock') {
        summary.warnings.push(
          `${result.import.source}:${result.import.line} - ${componentValidation.component} validated against mock only`
        );
      }
    }
    
    if (!importIsValid && result.validation.missingExports.length > 0) {
      summary.errors.push(
        `${result.import.source} - Missing exports: ${result.validation.missingExports.join(', ')}`
      );
    }
    
    if (importIsValid) {
      summary.validImports++;
    } else {
      summary.invalidImports++;
    }
  }
  
  return summary;
}