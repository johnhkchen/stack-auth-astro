/**
 * Performance Monitoring Integration Tests
 * 
 * Verifies that the performance monitoring and caching functionality
 * added to dependency helpers and file helpers is working correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkDependency,
  safeImport,
  clearDependencyCaches,
  getDependencyMetrics,
  generateDependencyPerformanceReport,
  logDependencyTiming,
  exportPerformanceMetricsForCI,
  validateTestEnvironment
} from './dependency-helpers.js';
import {
  fileExists,
  readFileContent,
  getFileOperationMetrics,
  clearFileOperationMetrics,
  logFileOperationPerformance
} from './file-helpers.js';

describe('Performance Monitoring', () => {
  beforeEach(() => {
    // Clear caches and metrics before each test
    clearDependencyCaches();
    clearFileOperationMetrics();
  });

  describe('Dependency Resolution Performance', () => {
    it('should track performance metrics for dependency checks', () => {
      // Enable performance tracking
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      // Perform some operations
      checkDependency('path'); // Should succeed
      checkDependency('non-existent-package'); // Should fail
      
      // Check metrics
      const metrics = getDependencyMetrics();
      expect(metrics.performance.totalOperations).toBeGreaterThan(0);
      expect(metrics.cacheStats.dependencyCheck.hits + metrics.cacheStats.dependencyCheck.misses).toBeGreaterThan(0);
    });

    it('should demonstrate caching behavior', () => {
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      // First call - should be cache miss
      checkDependency('path');
      let metrics = getDependencyMetrics();
      const firstCallOperations = metrics.performance.totalOperations;
      
      // Second call - should be cache hit (and faster)
      checkDependency('path');
      metrics = getDependencyMetrics();
      
      expect(metrics.performance.totalOperations).toBe(firstCallOperations + 1);
      expect(metrics.cacheStats.dependencyCheck.hits).toBeGreaterThan(0);
    });

    it('should generate comprehensive performance reports', () => {
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      // Perform various operations
      checkDependency('path');
      checkDependency('fs');
      
      const report = generateDependencyPerformanceReport();
      
      expect(report.summary.totalOperations).toBeGreaterThan(0);
      expect(report.summary.averageDuration).toBeGreaterThanOrEqual(0);
      expect(report.summary.successRate).toBeGreaterThan(0);
      expect(report.detailedStats).toBeDefined();
      expect(report.cacheStats).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should export CI-compatible metrics', () => {
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      checkDependency('path');
      
      const ciMetrics = exportPerformanceMetricsForCI();
      
      expect(ciMetrics.metrics).toBeDefined();
      expect(ciMetrics.status).toMatch(/^(pass|warn|fail)$/);
      expect(Array.isArray(ciMetrics.issues)).toBe(true);
      expect(typeof ciMetrics.metrics.dependency_resolution_total_duration_ms).toBe('number');
      expect(typeof ciMetrics.metrics.dependency_resolution_success_rate).toBe('number');
    });

    it('should track test environment validation performance', () => {
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      const result = validateTestEnvironment();
      
      expect(result.isValid).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.cacheStats).toBeDefined();
    });
  });

  describe('File Operation Performance', () => {
    it('should track file operation metrics', () => {
      // Test file existence checks
      fileExists(__filename); // This file should exist
      fileExists('/non/existent/file'); // Should not exist
      
      const metrics = getFileOperationMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.operationStats.fileExists).toBeDefined();
      expect(metrics.operationStats.fileExists.count).toBeGreaterThan(0);
    });

    it('should track file content reading performance', () => {
      // Read this test file
      const content = readFileContent(__filename);
      expect(content).toContain('Performance Monitoring Integration Tests');
      
      const metrics = getFileOperationMetrics();
      expect(metrics.operationStats.readFileContent).toBeDefined();
      expect(metrics.operationStats.readFileContent.avgFileSize).toBeGreaterThan(0);
    });

    it('should provide meaningful performance data', () => {
      // Perform several file operations
      fileExists(__filename);
      readFileContent(__filename);
      fileExists(__dirname);
      
      const metrics = getFileOperationMetrics();
      
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
      expect(Object.keys(metrics.operationStats).length).toBeGreaterThan(0);
      
      // Check that we have detailed stats per operation
      for (const [operation, stats] of Object.entries(metrics.operationStats)) {
        expect(stats.count).toBeGreaterThan(0);
        expect(stats.avgDuration).toBeGreaterThanOrEqual(0);
        expect(stats.successRate).toBeGreaterThanOrEqual(0);
        expect(stats.successRate).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Debug Logging', () => {
    it('should not throw when logging dependency timing', () => {
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      checkDependency('path');
      
      // This should not throw
      expect(() => logDependencyTiming(true)).not.toThrow();
    });

    it('should not throw when logging file operation performance', () => {
      fileExists(__filename);
      
      // This should not throw
      expect(() => logFileOperationPerformance()).not.toThrow();
    });

    it('should respect debug environment variables', () => {
      // Disable debug logging
      delete process.env.STACK_AUTH_PERF_DEBUG;
      delete process.env.STACK_AUTH_DEBUG;
      
      // Should not throw and should handle no data gracefully
      expect(() => logDependencyTiming()).not.toThrow();
      expect(() => logFileOperationPerformance()).not.toThrow();
    });
  });

  describe('Performance Thresholds', () => {
    it('should provide reasonable performance for basic operations', () => {
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      const start = performance.now();
      
      // Perform basic operations
      checkDependency('path');
      fileExists(__filename);
      
      const duration = performance.now() - start;
      
      // Basic operations should complete quickly (under 100ms in most environments)
      expect(duration).toBeLessThan(100);
    });

    it('should show cache benefits on repeated operations', () => {
      process.env.STACK_AUTH_PERF_DEBUG = 'true';
      
      // First call (cache miss)
      const start1 = performance.now();
      checkDependency('path');
      const duration1 = performance.now() - start1;
      
      // Second call (cache hit) - should be faster
      const start2 = performance.now();
      checkDependency('path');
      const duration2 = performance.now() - start2;
      
      // Cache hit should be faster (allowing some margin for variance)
      expect(duration2).toBeLessThanOrEqual(duration1 * 2); // At most 2x the first call
      
      const metrics = getDependencyMetrics();
      expect(metrics.cacheStats.dependencyCheck.hits).toBeGreaterThan(0);
    });
  });
});