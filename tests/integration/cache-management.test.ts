import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCacheManager,
  getCacheStats,
  validateCacheHealth,
  warmValidationCaches,
  getCacheDashboard,
  inspectValidationCache,
  clearValidationCaches
} from '../helpers/runtime-validation.js';

describe('Cache Management API', () => {
  beforeEach(() => {
    // Clear caches before each test to ensure clean state
    clearValidationCaches();
  });

  it('provides cache statistics for all cache types', () => {
    const stats = getCacheStats();
    
    expect(stats).toHaveProperty('moduleValidation');
    expect(stats).toHaveProperty('componentValidation');
    expect(stats).toHaveProperty('moduleExports');
    expect(stats).toHaveProperty('dynamicImport');
    
    // Each cache should have proper stats structure
    Object.values(stats).forEach(cacheStats => {
      expect(cacheStats).toHaveProperty('hits');
      expect(cacheStats).toHaveProperty('misses');
      expect(cacheStats).toHaveProperty('evictions');
      expect(cacheStats).toHaveProperty('size');
      expect(cacheStats).toHaveProperty('maxSize');
      expect(cacheStats).toHaveProperty('hitRate');
      expect(cacheStats).toHaveProperty('avgTtl');
      expect(cacheStats).toHaveProperty('lastAccess');
      expect(cacheStats).toHaveProperty('createdAt');
    });
  });

  it('validates cache health correctly', () => {
    const health = validateCacheHealth();
    
    expect(health).toHaveProperty('overall');
    expect(health).toHaveProperty('individual');
    
    expect(health.overall).toHaveProperty('isHealthy');
    expect(health.overall).toHaveProperty('issues');
    expect(typeof health.overall.isHealthy).toBe('boolean');
    expect(Array.isArray(health.overall.issues)).toBe(true);
    
    expect(health.individual).toHaveProperty('moduleValidation');
    expect(health.individual).toHaveProperty('componentValidation');
    expect(health.individual).toHaveProperty('moduleExports');
    expect(health.individual).toHaveProperty('dynamicImport');
  });

  it('warms cache with common validation patterns', async () => {
    const statsBefore = getCacheStats();
    expect(statsBefore.moduleValidation.size).toBe(0);
    expect(statsBefore.componentValidation.size).toBe(0);
    
    await warmValidationCaches();
    
    const statsAfter = getCacheStats();
    expect(statsAfter.moduleValidation.size).toBeGreaterThan(0);
    expect(statsAfter.componentValidation.size).toBeGreaterThan(0);
    expect(statsAfter.moduleExports.size).toBeGreaterThan(0);
    expect(statsAfter.dynamicImport.size).toBeGreaterThan(0);
  });

  it('provides cache dashboard with comprehensive information', () => {
    const dashboard = getCacheDashboard();
    
    expect(dashboard).toHaveProperty('config');
    expect(dashboard).toHaveProperty('performance');
    expect(dashboard).toHaveProperty('stats');
    expect(dashboard).toHaveProperty('health');
    expect(dashboard).toHaveProperty('environment');
    
    expect(dashboard.config).toHaveProperty('maxSize');
    expect(dashboard.config).toHaveProperty('ttl');
    expect(dashboard.config).toHaveProperty('warmupEnabled');
    expect(dashboard.config).toHaveProperty('statsEnabled');
    
    expect(typeof dashboard.environment).toBe('string');
  });

  it('allows inspection of individual caches', async () => {
    // Add some data to inspect
    await warmValidationCaches();
    
    const inspection = inspectValidationCache('moduleValidation');
    
    expect(inspection).toHaveProperty('keys');
    expect(inspection).toHaveProperty('sampleEntries');
    expect(Array.isArray(inspection.keys)).toBe(true);
    expect(Array.isArray(inspection.sampleEntries)).toBe(true);
    
    if (inspection.sampleEntries.length > 0) {
      const entry = inspection.sampleEntries[0];
      expect(entry).toHaveProperty('key');
      expect(entry).toHaveProperty('value');
      expect(entry).toHaveProperty('age');
      expect(typeof entry.age).toBe('number');
      expect(entry.age).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports individual cache clearing', async () => {
    const cacheManager = getCacheManager();
    
    // Warm up the cache first
    await warmValidationCaches();
    
    const statsAfterWarmup = getCacheStats();
    expect(statsAfterWarmup.moduleValidation.size).toBeGreaterThan(0);
    expect(statsAfterWarmup.componentValidation.size).toBeGreaterThan(0);
    
    // Clear only module validation cache
    cacheManager.clearCache('moduleValidation');
    
    const statsAfterClear = getCacheStats();
    expect(statsAfterClear.moduleValidation.size).toBe(0);
    expect(statsAfterClear.componentValidation.size).toBeGreaterThan(0); // Should remain
  });

  it('handles cache configuration from environment variables', () => {
    const dashboard = getCacheDashboard();
    
    // Should use default values or environment values
    expect(dashboard.config.maxSize).toBeGreaterThan(0);
    expect(dashboard.config.ttl).toBeGreaterThan(0);
    expect(typeof dashboard.config.warmupEnabled).toBe('boolean');
    expect(typeof dashboard.config.statsEnabled).toBe('boolean');
  });

  it('provides accurate hit rate calculations', async () => {
    const cacheManager = getCacheManager();
    
    // Warm cache with some data
    await warmValidationCaches({
      moduleValidations: ['test-key-1', 'test-key-2']
    });
    
    const statsAfterWarmup = getCacheStats();
    expect(statsAfterWarmup.moduleValidation.size).toBeGreaterThan(0);
    
    // Hit rates should be properly calculated (0-1 range)
    Object.values(statsAfterWarmup).forEach(stats => {
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });

  it('detects cache health issues appropriately', async () => {
    // This test verifies that the health checking logic works
    // In a real scenario with poor cache performance, it would detect issues
    const health = validateCacheHealth();
    
    // With empty/new caches, should generally be healthy
    expect(typeof health.overall.isHealthy).toBe('boolean');
    expect(Array.isArray(health.overall.issues)).toBe(true);
    
    // Individual cache health should be consistent with overall
    const allIndividualHealthy = Object.values(health.individual).every(h => h.isHealthy);
    if (allIndividualHealthy && health.overall.issues.length === 0) {
      expect(health.overall.isHealthy).toBe(true);
    }
  });
});

describe('Environment-based Cache Configuration', () => {
  it('respects NODE_ENV for cache sizing', () => {
    const dashboard = getCacheDashboard();
    const currentEnv = process.env.NODE_ENV || 'development';
    
    // Configuration should be appropriate for environment
    if (currentEnv === 'test') {
      expect(dashboard.config.maxSize).toBeLessThanOrEqual(50);
    }
    
    expect(dashboard.environment).toBe(currentEnv);
  });

  it('provides development-friendly cache inspection', () => {
    const dashboard = getCacheDashboard();
    
    // Development tools should be available
    expect(dashboard.config).toBeDefined();
    expect(dashboard.performance).toBeDefined();
    expect(dashboard.stats).toBeDefined();
    expect(dashboard.health).toBeDefined();
  });
});