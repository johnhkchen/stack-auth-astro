/**
 * Performance tests for optimized runtime validation
 * 
 * These tests verify that the caching and performance optimizations
 * implemented in Task 1.2.24 provide measurable speed improvements.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  validateRuntimeExport,
  validateReactComponent,
  validateModuleExports,
  clearValidationCaches,
  getValidationMetrics
} from '../helpers/runtime-validation.js';
import {
  validateVersionCompatibility,
  getCurrentStackVersion,
  clearVersionCaches
} from '../helpers/version-compatibility.js';

describe('Runtime Validation Performance', () => {
  beforeEach(() => {
    // Clear caches before each test to ensure clean state
    clearValidationCaches();
    clearVersionCaches();
  });

  test('validation caching provides performance benefits', async () => {
    const modulePath = 'astro-stack-auth/components';
    const componentName = 'SignIn';

    // First run (cold cache)
    const start1 = performance.now();
    const result1 = await validateRuntimeExport(modulePath, componentName);
    const duration1 = performance.now() - start1;

    // Second run (warm cache)
    const start2 = performance.now();
    const result2 = await validateRuntimeExport(modulePath, componentName);
    const duration2 = performance.now() - start2;

    // Results should be identical
    expect(result1).toEqual(result2);

    // Second run should be faster (though we don't enforce strict timing)
    console.log(`First validation: ${duration1.toFixed(2)}ms, Second validation: ${duration2.toFixed(2)}ms`);
    
    // Get performance metrics
    const metrics = getValidationMetrics();
    console.log('Performance metrics:', metrics);

    // Verify we have cache hits
    expect(metrics.totalOperations).toBeGreaterThan(0);
    expect(metrics.cacheHitRate).toBeGreaterThan(0);
  });

  test('component validation caching works correctly', async () => {
    const modulePath = 'astro-stack-auth/components';
    const components = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings'];

    // Validate each component twice
    const results: Array<{ component: string; firstDuration: number; secondDuration: number }> = [];

    for (const component of components) {
      // First validation (cold cache)
      const start1 = performance.now();
      const result1 = await validateReactComponent(modulePath, component);
      const firstDuration = performance.now() - start1;

      // Second validation (warm cache)
      const start2 = performance.now();
      const result2 = await validateReactComponent(modulePath, component);
      const secondDuration = performance.now() - start2;

      // Results should be identical
      expect(result1).toEqual(result2);

      results.push({
        component,
        firstDuration,
        secondDuration
      });
    }

    // Log performance results
    results.forEach(({ component, firstDuration, secondDuration }) => {
      console.log(`${component}: ${firstDuration.toFixed(2)}ms -> ${secondDuration.toFixed(2)}ms`);
    });

    // Get final metrics
    const metrics = getValidationMetrics();
    expect(metrics.cacheHitRate).toBeGreaterThan(0);
  });

  test('module exports validation is cached', async () => {
    const modulePath = 'astro-stack-auth/components';

    // First validation
    const start1 = performance.now();
    const result1 = await validateModuleExports(modulePath);
    const duration1 = performance.now() - start1;

    // Second validation (should be cached)
    const start2 = performance.now();
    const result2 = await validateModuleExports(modulePath);
    const duration2 = performance.now() - start2;

    // Results should be identical
    expect(result1).toEqual(result2);

    console.log(`Module exports validation: ${duration1.toFixed(2)}ms -> ${duration2.toFixed(2)}ms`);

    // Second call should be significantly faster
    expect(duration2).toBeLessThan(duration1);
  });

  test('version compatibility validation is cached', async () => {
    const imports = [
      {
        specifiers: ['SignIn', 'SignUp'],
        source: 'astro-stack-auth/components',
        line: 1
      },
      {
        specifiers: ['getUser', 'requireAuth'],
        source: 'astro-stack-auth/server',
        line: 2
      }
    ];

    // First validation
    const start1 = performance.now();
    const result1 = await validateVersionCompatibility(imports);
    const duration1 = performance.now() - start1;

    // Second validation (should be cached)
    const start2 = performance.now();
    const result2 = await validateVersionCompatibility(imports);
    const duration2 = performance.now() - start2;

    // Results should be identical
    expect(result1).toEqual(result2);

    console.log(`Version compatibility: ${duration1.toFixed(2)}ms -> ${duration2.toFixed(2)}ms`);

    // Second call should be faster
    expect(duration2).toBeLessThan(duration1);
  });

  test('getCurrentStackVersion is cached efficiently', async () => {
    // First call
    const start1 = performance.now();
    const version1 = await getCurrentStackVersion();
    const duration1 = performance.now() - start1;

    // Second call (should be cached)
    const start2 = performance.now();
    const version2 = await getCurrentStackVersion();
    const duration2 = performance.now() - start2;

    // Results should be identical
    expect(version1).toBe(version2);

    console.log(`Stack version lookup: ${duration1.toFixed(2)}ms -> ${duration2.toFixed(2)}ms`);

    // Second call should be much faster (no file I/O)
    expect(duration2).toBeLessThan(duration1);
  });

  test('performance metrics provide useful insights', async () => {
    // Run several validation operations
    await validateRuntimeExport('astro-stack-auth/components', 'SignIn');
    await validateRuntimeExport('astro-stack-auth/components', 'SignIn'); // Cache hit
    await validateRuntimeExport('astro-stack-auth/server', 'getUser');
    await validateReactComponent('astro-stack-auth/components', 'UserButton');
    await validateReactComponent('astro-stack-auth/components', 'UserButton'); // Cache hit

    const metrics = getValidationMetrics();

    // Verify metrics structure
    expect(metrics).toHaveProperty('totalOperations');
    expect(metrics).toHaveProperty('totalDuration');
    expect(metrics).toHaveProperty('cacheHitRate');
    expect(metrics).toHaveProperty('operationStats');

    // Should have recorded operations
    expect(metrics.totalOperations).toBeGreaterThan(0);
    expect(metrics.cacheHitRate).toBeGreaterThan(0);

    // Should have operation-specific stats
    expect(Object.keys(metrics.operationStats)).toContain('validateRuntimeExport');

    console.log('Full performance report:', JSON.stringify(metrics, null, 2));
  });

  test('cache invalidation works correctly', async () => {
    const modulePath = 'astro-stack-auth/components';
    const componentName = 'SignIn';

    // First validation
    const result1 = await validateRuntimeExport(modulePath, componentName);

    // Clear caches
    clearValidationCaches();
    clearVersionCaches();

    // Get fresh metrics (should be cleared)
    const metricsAfterClear = getValidationMetrics();
    expect(metricsAfterClear.totalOperations).toBe(0);

    // Second validation after cache clear
    const result2 = await validateRuntimeExport(modulePath, componentName);

    // Results should still be identical
    expect(result1).toEqual(result2);

    // But no cache hits should be recorded in new metrics
    const finalMetrics = getValidationMetrics();
    expect(finalMetrics.cacheHitRate).toBe(0); // No cache hits since we cleared
  });

  test('caching handles different input variations', async () => {
    const components = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
    const modules = ['astro-stack-auth/components', 'astro-stack-auth/server'];

    // Test various combinations to ensure caching keys work correctly
    for (const module of modules) {
      for (const component of components) {
        // Each unique combination should be cached separately
        await validateRuntimeExport(module, component);
        await validateRuntimeExport(module, component); // Cache hit for same combination
      }
    }

    const metrics = getValidationMetrics();
    
    // Should have significant cache hit rate
    expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0.5);
    // Note: Operations may be higher due to internal validation calls
    expect(metrics.totalOperations).toBeGreaterThanOrEqual(components.length * modules.length * 2);
    
    console.log(`Cache efficiency: ${(metrics.cacheHitRate * 100).toFixed(1)}% hit rate`);
  });
});

describe('Performance Regression Prevention', () => {
  test('validation functions complete within reasonable time bounds', async () => {
    const maxDuration = 1000; // 1 second max for any single validation

    // Test validateRuntimeExport
    const start1 = performance.now();
    await validateRuntimeExport('astro-stack-auth/components', 'SignIn');
    const duration1 = performance.now() - start1;
    expect(duration1).toBeLessThan(maxDuration);

    // Test validateReactComponent
    const start2 = performance.now();
    await validateReactComponent('astro-stack-auth/components', 'SignUp');
    const duration2 = performance.now() - start2;
    expect(duration2).toBeLessThan(maxDuration);

    // Test validateModuleExports
    const start3 = performance.now();
    await validateModuleExports('astro-stack-auth/server');
    const duration3 = performance.now() - start3;
    expect(duration3).toBeLessThan(maxDuration);

    console.log('Performance bounds check passed:', {
      validateRuntimeExport: `${duration1.toFixed(2)}ms`,
      validateReactComponent: `${duration2.toFixed(2)}ms`,
      validateModuleExports: `${duration3.toFixed(2)}ms`
    });
  });
});