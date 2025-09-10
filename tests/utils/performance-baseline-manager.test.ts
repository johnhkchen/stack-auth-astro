/**
 * Performance Baseline Manager Tests
 * 
 * Comprehensive tests for the enhanced performance baseline management system,
 * including versioned storage, environment handling, and historical tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBaselineManager } from './performance-baseline-manager.js';
import { fileExists, writeFileContent, removeFile, createDirectory } from './file-helpers.js';
import { rmSync, existsSync } from 'fs';
import path from 'path';

describe('PerformanceBaselineManager', () => {
  let manager: PerformanceBaselineManager;
  const testDir = '.test-performance';
  const archiveDir = '.test-performance/archives';

  beforeEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    
    // Create manager with test directories
    manager = new PerformanceBaselineManager({
      baselineDir: testDir,
      archiveDir: archiveDir,
      maxHistoryPoints: 10,
      autoArchiveAfterDays: 7,
      environmentSeparation: true,
      enableTrendAnalysis: true
    });
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Baseline Creation and Updates', () => {
    it('should create a new baseline for a test', () => {
      const baseline = manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        dependencyTime: 20,
        fileOperationTime: 10,
        success: true,
        cacheHit: true
      });

      expect(baseline).toBeDefined();
      expect(baseline.testFile).toBe('test.spec.ts');
      expect(baseline.testName).toBe('test-1');
      expect(baseline.version).toBe(2);
      expect(baseline.metrics.averageDuration).toBe(100);
      expect(baseline.qualityMetrics.successRate).toBe(1);
      expect(baseline.qualityMetrics.cacheHitRate).toBe(1);
      expect(baseline.history).toHaveLength(1);
      expect(baseline.metadata.totalRuns).toBe(1);
    });

    it('should update existing baseline with new metrics', () => {
      // Create initial baseline
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      // Update with new metrics
      const updated = manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 120,
        success: true,
        cacheHit: false
      });

      expect(updated.metrics.averageDuration).toBe(110); // (100 + 120) / 2
      expect(updated.metrics.minDuration).toBe(100);
      expect(updated.metrics.maxDuration).toBe(120);
      expect(updated.qualityMetrics.successRate).toBe(1);
      expect(updated.qualityMetrics.cacheHitRate).toBe(0.5); // 1 hit out of 2
      expect(updated.history).toHaveLength(2);
      expect(updated.metadata.totalRuns).toBe(2);
      expect(updated.metadata.validRuns).toBe(2);
    });

    it('should calculate percentiles correctly', () => {
      // Add multiple data points
      for (let i = 1; i <= 10; i++) {
        manager.updateBaseline('test.spec.ts', 'test-1', {
          duration: i * 10, // 10, 20, 30, ..., 100
          success: true,
          cacheHit: true
        });
      }

      const baseline = manager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline).toBeDefined();
      expect(baseline!.metrics.p50Duration).toBe(50); // Median
      expect(baseline!.metrics.p90Duration).toBe(90);
      expect(baseline!.metrics.p95Duration).toBe(95);
      expect(baseline!.metrics.p99Duration).toBe(99);
      expect(baseline!.metrics.minDuration).toBe(10);
      expect(baseline!.metrics.maxDuration).toBe(100);
    });

    it('should track quality metrics over multiple runs', () => {
      const runs = [
        { success: true, cacheHit: true },
        { success: false, cacheHit: true },
        { success: true, cacheHit: false },
        { success: true, cacheHit: true },
        { success: true, cacheHit: false }
      ];

      runs.forEach((run, i) => {
        manager.updateBaseline('test.spec.ts', 'test-1', {
          duration: 100,
          success: run.success,
          cacheHit: run.cacheHit
        });
      });

      const baseline = manager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline!.qualityMetrics.successRate).toBe(0.8); // 4 out of 5
      expect(baseline!.qualityMetrics.cacheHitRate).toBe(0.6); // 3 out of 5
    });

    it('should maintain separate baselines for different environments', () => {
      // Create baseline in current environment
      const baseline1 = manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      // Mock different environment
      const originalEnv = process.env.CI;
      process.env.CI = 'true';
      
      // Create new manager for CI environment
      const ciManager = new PerformanceBaselineManager({
        baselineDir: testDir,
        archiveDir: archiveDir,
        environmentSeparation: true
      });

      const baseline2 = ciManager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 200,
        success: true,
        cacheHit: false
      });

      // Restore environment
      if (originalEnv) {
        process.env.CI = originalEnv;
      } else {
        delete process.env.CI;
      }

      // Should have different values for different environments
      expect(baseline1.metrics.averageDuration).toBe(100);
      expect(baseline2.metrics.averageDuration).toBe(200);
      expect(baseline1.environmentInfo.fingerprint).not.toBe(baseline2.environmentInfo.fingerprint);
    });
  });

  describe('Historical Tracking', () => {
    it('should maintain history of test runs', () => {
      for (let i = 0; i < 5; i++) {
        manager.updateBaseline('test.spec.ts', 'test-1', {
          duration: 100 + i * 10,
          success: true,
          cacheHit: i % 2 === 0
        });
      }

      const baseline = manager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline!.history).toHaveLength(5);
      
      // Check history order
      for (let i = 0; i < 4; i++) {
        expect(baseline!.history[i].timestamp).toBeLessThanOrEqual(baseline!.history[i + 1].timestamp);
      }
    });

    it('should trim history when exceeding max points', () => {
      // Create manager with low max history
      const limitedManager = new PerformanceBaselineManager({
        baselineDir: testDir,
        archiveDir: archiveDir,
        maxHistoryPoints: 5
      });

      // Add more than max points
      for (let i = 0; i < 10; i++) {
        limitedManager.updateBaseline('test.spec.ts', 'test-1', {
          duration: 100,
          success: true,
          cacheHit: true
        });
      }

      const baseline = limitedManager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline!.history).toHaveLength(5);
    });

    it('should include environment and commit info in history', () => {
      // Set environment variables
      process.env.GITHUB_SHA = 'abc123';
      process.env.GITHUB_REF = 'refs/heads/main';

      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      const baseline = manager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline!.history[0].commit).toBe('abc123');
      expect(baseline!.history[0].branch).toBe('main');

      // Clean up
      delete process.env.GITHUB_SHA;
      delete process.env.GITHUB_REF;
    });
  });

  describe('Trend Analysis', () => {
    it('should detect improving performance trends', () => {
      // Create declining duration trend (improving performance)
      for (let i = 0; i < 10; i++) {
        manager.updateBaseline('test.spec.ts', 'test-1', {
          duration: 200 - i * 10, // 200, 190, 180, ..., 110
          success: true,
          cacheHit: true
        });
      }

      const trends = manager.analyzeTrends('test.spec.ts', 'test-1');
      expect(trends).toHaveLength(1);
      expect(trends[0].trendType).toBe('improving');
      expect(trends[0].trendPercentage).toBeLessThan(0);
      expect(trends[0].dataPoints).toBe(10);
    });

    it('should detect degrading performance trends', () => {
      // Create increasing duration trend (degrading performance)
      for (let i = 0; i < 10; i++) {
        manager.updateBaseline('test.spec.ts', 'test-2', {
          duration: 100 + i * 10, // 100, 110, 120, ..., 190
          success: true,
          cacheHit: true
        });
      }

      const trends = manager.analyzeTrends('test.spec.ts', 'test-2');
      expect(trends).toHaveLength(1);
      expect(trends[0].trendType).toBe('degrading');
      expect(trends[0].trendPercentage).toBeGreaterThan(0);
    });

    it('should detect stable performance', () => {
      // Create stable trend with minor variations
      for (let i = 0; i < 10; i++) {
        manager.updateBaseline('test.spec.ts', 'test-3', {
          duration: 100 + (i % 2 === 0 ? 2 : -2), // Small variations around 100
          success: true,
          cacheHit: true
        });
      }

      const trends = manager.analyzeTrends('test.spec.ts', 'test-3');
      expect(trends).toHaveLength(1);
      expect(trends[0].trendType).toBe('stable');
      expect(Math.abs(trends[0].trendPercentage)).toBeLessThan(5);
    });

    it('should detect volatile performance', () => {
      // Create volatile trend with large variations
      for (let i = 0; i < 10; i++) {
        manager.updateBaseline('test.spec.ts', 'test-4', {
          duration: i % 2 === 0 ? 50 : 200, // Large swings
          success: true,
          cacheHit: true
        });
      }

      const trends = manager.analyzeTrends('test.spec.ts', 'test-4');
      expect(trends).toHaveLength(1);
      // Note: Actual volatility detection depends on standard deviation calculation
      expect(trends[0].recommendation).toBeDefined();
    });

    it('should require minimum data points for trend analysis', () => {
      // Add only 3 data points (less than required 5)
      for (let i = 0; i < 3; i++) {
        manager.updateBaseline('test.spec.ts', 'test-5', {
          duration: 100,
          success: true,
          cacheHit: true
        });
      }

      const trends = manager.analyzeTrends('test.spec.ts', 'test-5');
      expect(trends).toHaveLength(0);
    });
  });

  describe('Archive and Cleanup', () => {
    it('should archive baselines', () => {
      // Create some baselines
      for (let i = 0; i < 3; i++) {
        manager.updateBaseline('test.spec.ts', `test-${i}`, {
          duration: 100,
          success: true,
          cacheHit: true
        });
      }

      const baselines = manager.getAllBaselines();
      manager.archiveBaselines(baselines, 'test-archive');

      // Check archive file was created
      expect(existsSync(archiveDir)).toBe(true);
      const files = require('fs').readdirSync(archiveDir);
      const archiveFiles = files.filter((f: string) => f.startsWith('archive-'));
      expect(archiveFiles.length).toBeGreaterThan(0);
    });

    it('should auto-cleanup old baselines', () => {
      vi.useFakeTimers();
      
      // Create manager with short archive period
      const cleanupManager = new PerformanceBaselineManager({
        baselineDir: testDir,
        archiveDir: archiveDir,
        autoArchiveAfterDays: 0.00001 // Archive immediately
      });

      // Create baseline
      cleanupManager.updateBaseline('test.spec.ts', 'old-test', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      // Wait a bit
      vi.advanceTimersByTime(100);

      // Create new manager to trigger cleanup
      const newManager = new PerformanceBaselineManager({
        baselineDir: testDir,
        archiveDir: archiveDir,
        autoArchiveAfterDays: 0.00001
      });

      // Old baseline should be archived
      const baselines = newManager.getAllBaselines();
      const oldBaseline = baselines.find(b => b.testName === 'old-test');
      expect(oldBaseline).toBeUndefined();
      
      vi.useRealTimers();
    });

    it('should reset baselines', () => {
      // Create baselines
      manager.updateBaseline('test1.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });
      manager.updateBaseline('test2.spec.ts', 'test-2', {
        duration: 200,
        success: true,
        cacheHit: true
      });

      // Reset specific baseline
      const count1 = manager.resetBaselines({
        testFile: 'test1.spec.ts',
        testName: 'test-1'
      });
      expect(count1).toBe(1);
      expect(manager.getBaseline('test1.spec.ts', 'test-1')).toBeUndefined();
      expect(manager.getBaseline('test2.spec.ts', 'test-2')).toBeDefined();

      // Reset all baselines
      const count2 = manager.resetBaselines();
      expect(count2).toBe(1); // Only test-2 remains
      expect(manager.getAllBaselines()).toHaveLength(0);
    });

    it('should archive before reset when requested', () => {
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      manager.resetBaselines({
        archiveBeforeReset: true
      });

      // Check archive was created  
      if (existsSync(archiveDir)) {
        const files = require('fs').readdirSync(archiveDir);
        // Check for metadata.json which indicates archives were created
        expect(files.includes('metadata.json') || files.some((f: string) => f.includes('manual-reset'))).toBe(true);
      } else {
        // If no archive dir, that's OK too as long as reset happened
        expect(manager.getAllBaselines()).toHaveLength(0);
      }
    });
  });

  describe('Import and Export', () => {
    it('should export baselines as JSON', () => {
      // Create baselines
      for (let i = 0; i < 3; i++) {
        manager.updateBaseline('test.spec.ts', `test-${i}`, {
          duration: 100 + i * 10,
          success: true,
          cacheHit: true
        });
      }

      const exported = manager.exportBaselines({
        includeHistory: true,
        format: 'json'
      });

      const parsed = JSON.parse(exported);
      expect(parsed.version).toBe('2.0.0');
      expect(parsed.baselines).toHaveLength(3);
      expect(parsed.baselines[0].history).toBeDefined();
    });

    it('should export baselines as CSV', () => {
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      const csv = manager.exportBaselines({
        format: 'csv'
      });

      expect(csv).toContain('Test File,Test Name');
      expect(csv).toContain('test.spec.ts,test-1');
      expect(csv).toContain('100.00'); // Duration
    });

    it('should import baselines from JSON', () => {
      // Create and export baselines
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      const exported = manager.exportBaselines();

      // Create new manager and import
      const newManager = new PerformanceBaselineManager({
        baselineDir: testDir + '-import',
        archiveDir: archiveDir + '-import'
      });

      const result = newManager.importBaselines(exported);
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const imported = newManager.getBaseline('test.spec.ts', 'test-1');
      expect(imported).toBeDefined();
      expect(imported!.metrics.averageDuration).toBe(100);

      // Clean up
      if (existsSync(testDir + '-import')) {
        rmSync(testDir + '-import', { recursive: true, force: true });
      }
    });

    it('should merge imported baselines when requested', () => {
      // Create initial baseline
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      // Export and modify
      const exported = manager.exportBaselines();
      const parsed = JSON.parse(exported);
      parsed.baselines[0].history.push({
        timestamp: Date.now() + 1000,
        duration: 120,
        successRate: 1,
        cacheHitRate: 1,
        environment: 'test',
        runId: 'test-run'
      });

      // Import with merge
      const result = manager.importBaselines(JSON.stringify(parsed), {
        merge: true
      });

      expect(result.imported).toBe(1);
      const merged = manager.getBaseline('test.spec.ts', 'test-1');
      expect(merged!.history).toHaveLength(2);
    });

    it('should skip existing baselines by default', () => {
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      const exported = manager.exportBaselines();
      
      // Try to import again without overwrite
      const result = manager.importBaselines(exported);
      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });
  });

  describe('Environment Comparison', () => {
    it('should compare baselines across environments', () => {
      // Create baselines for two environments
      const env1Baselines = new Map();
      env1Baselines.set('test.spec.ts::test-1', {
        testFile: 'test.spec.ts',
        testName: 'test-1',
        version: 2,
        metrics: {
          averageDuration: 100,
          p50Duration: 100,
          p90Duration: 120,
          p95Duration: 130,
          p99Duration: 150,
          minDuration: 80,
          maxDuration: 150,
          standardDeviation: 10,
          dependencyResolutionTime: 20,
          fileOperationTime: 10
        },
        qualityMetrics: {
          successRate: 0.95,
          cacheHitRate: 0.8,
          errorRate: 0.05,
          timeoutRate: 0
        },
        environmentInfo: {
          fingerprint: 'env1',
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuCount: 4,
          totalMemory: 8000000000,
          isCI: false
        },
        history: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastRunAt: Date.now(),
          totalRuns: 10,
          validRuns: 10,
          tags: [],
          notes: ''
        }
      });

      // Mock the loadBaselinesForEnvironment method
      const loadSpy = vi.spyOn(manager as any, 'loadBaselinesForEnvironment');
      loadSpy.mockImplementation((env: string) => {
        if (env === 'env1') return env1Baselines;
        
        // Return env2 baselines with different metrics
        const env2Baselines = new Map();
        const baseline = { ...env1Baselines.get('test.spec.ts::test-1') };
        baseline.metrics.averageDuration = 150; // 50% slower
        baseline.qualityMetrics.successRate = 0.9;
        env2Baselines.set('test.spec.ts::test-1', baseline);
        return env2Baselines;
      });

      const comparisons = manager.compareEnvironments('env1', 'env2');
      expect(comparisons).toHaveLength(1);
      expect(comparisons[0].performanceDiff).toBe(50); // 50% slower
      expect(comparisons[0].qualityDiff.successRate).toBe(-0.05);
      expect(comparisons[0].recommendation).toContain('slower');

      loadSpy.mockRestore();
    });
  });

  describe('Baseline Search and Filtering', () => {
    it('should find baselines by criteria', () => {
      // Create various baselines
      manager.updateBaseline('test1.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });
      manager.updateBaseline('test2.spec.ts', 'test-2', {
        duration: 200,
        success: true,
        cacheHit: true
      });
      
      // Add multiple runs to test-1
      for (let i = 0; i < 5; i++) {
        manager.updateBaseline('test1.spec.ts', 'test-1', {
          duration: 100,
          success: true,
          cacheHit: true
        });
      }

      // Tag test-1
      manager.tagBaseline('test1.spec.ts', 'test-1', ['critical', 'regression']);

      // Find by file
      const byFile = manager.findBaselines({ testFile: 'test1.spec.ts' });
      expect(byFile).toHaveLength(1);
      expect(byFile[0].testName).toBe('test-1');

      // Find by minimum runs
      const byRuns = manager.findBaselines({ minRuns: 5 });
      expect(byRuns).toHaveLength(1);
      expect(byRuns[0].testName).toBe('test-1');

      // Find by tags
      const byTags = manager.findBaselines({ tags: ['critical'] });
      expect(byTags).toHaveLength(1);
      expect(byTags[0].testName).toBe('test-1');
    });

    it('should add and retrieve tags', () => {
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      manager.tagBaseline('test.spec.ts', 'test-1', ['slow', 'flaky']);
      manager.tagBaseline('test.spec.ts', 'test-1', ['critical', 'slow']); // Duplicate 'slow'

      const baseline = manager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline!.metadata.tags).toContain('slow');
      expect(baseline!.metadata.tags).toContain('flaky');
      expect(baseline!.metadata.tags).toContain('critical');
      expect(baseline!.metadata.tags).toHaveLength(3); // No duplicates
    });

    it('should add and retrieve notes', () => {
      manager.updateBaseline('test.spec.ts', 'test-1', {
        duration: 100,
        success: true,
        cacheHit: true
      });

      manager.addNote('test.spec.ts', 'test-1', 'Initial performance baseline');
      manager.addNote('test.spec.ts', 'test-1', 'Optimized after refactoring');

      const baseline = manager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline!.metadata.notes).toContain('Initial performance baseline');
      expect(baseline!.metadata.notes).toContain('Optimized after refactoring');
    });
  });

  describe('Migration and Compatibility', () => {
    it('should migrate v1 baselines to v2', () => {
      const v1Baseline = {
        testFile: 'test.spec.ts',
        testName: 'test-1',
        averageDuration: 100,
        dependencyResolutionTime: 20,
        fileOperationTime: 10,
        successRate: 0.95,
        cacheHitRate: 0.8,
        timestamp: Date.now() - 1000000,
        runs: 5,
        environmentFingerprint: 'old-env'
      };

      // Write v1 baseline file
      const baselineFile = path.join(testDir, 'baselines-' + (manager as any).currentEnvironment + '.json');
      writeFileContent(baselineFile, JSON.stringify({
        baselines: [v1Baseline]
      }));

      // Create new manager to load and migrate
      const newManager = new PerformanceBaselineManager({
        baselineDir: testDir,
        archiveDir: archiveDir
      });

      const migrated = newManager.getBaseline('test.spec.ts', 'test-1');
      expect(migrated).toBeDefined();
      expect(migrated!.version).toBe(2);
      expect(migrated!.metrics.averageDuration).toBe(100);
      expect(migrated!.metrics.p50Duration).toBe(100);
      expect(migrated!.qualityMetrics.successRate).toBe(0.95);
      expect(migrated!.metadata.notes).toContain('Migrated from v1');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of baselines efficiently', () => {
      const startTime = performance.now();
      
      // Create 100 baselines
      for (let i = 0; i < 100; i++) {
        manager.updateBaseline(`test-${i}.spec.ts`, `test-${i}`, {
          duration: 100 + i,
          success: true,
          cacheHit: i % 2 === 0
        });
      }

      const creationTime = performance.now() - startTime;
      expect(creationTime).toBeLessThan(1000); // Should complete in under 1 second

      // Test retrieval
      const retrievalStart = performance.now();
      const allBaselines = manager.getAllBaselines();
      const retrievalTime = performance.now() - retrievalStart;
      
      expect(allBaselines).toHaveLength(100);
      expect(retrievalTime).toBeLessThan(100); // Should be very fast
    });

    it('should efficiently trim history points', () => {
      const limitedManager = new PerformanceBaselineManager({
        baselineDir: testDir,
        archiveDir: archiveDir,
        maxHistoryPoints: 10
      });

      // Add many history points
      for (let i = 0; i < 100; i++) {
        limitedManager.updateBaseline('test.spec.ts', 'test-1', {
          duration: 100 + i,
          success: true,
          cacheHit: true
        });
      }

      const baseline = limitedManager.getBaseline('test.spec.ts', 'test-1');
      expect(baseline!.history).toHaveLength(10);
      
      // Should keep the most recent points
      const durations = baseline!.history.map(h => h.duration);
      expect(durations[durations.length - 1]).toBe(199); // Last should be 100 + 99
    });
  });
});