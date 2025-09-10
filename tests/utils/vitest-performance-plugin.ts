/**
 * Vitest Performance Monitoring Plugin
 * 
 * Integrates performance monitoring into the test execution flow,
 * automatically collecting dependency resolution metrics during test runs.
 */

import type { Plugin } from 'vitest/config';
import type { TestCase, TestSuite, TaskContext, TaskMeta } from 'vitest';
import { 
  getDependencyMetrics, 
  generateDependencyPerformanceReport,
  clearDependencyCaches,
  exportPerformanceMetricsForCI 
} from './dependency-helpers.js';
import { 
  getFileOperationMetrics, 
  clearFileOperationMetrics 
} from './file-helpers.js';

interface PerformanceTestResult {
  testFile: string;
  testName: string;
  duration: number;
  dependencyMetrics: ReturnType<typeof getDependencyMetrics>;
  fileMetrics: ReturnType<typeof getFileOperationMetrics>;
  timestamp: number;
}

interface PerformanceBaseline {
  testFile: string;
  averageDuration: number;
  dependencyResolutionTime: number;
  fileOperationTime: number;
  timestamp: number;
  runs: number;
}

/**
 * Global performance collector for test runs
 */
class TestPerformanceCollector {
  private testResults: PerformanceTestResult[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private currentTestStart: Map<string, number> = new Map();
  private enabled: boolean;
  
  constructor() {
    this.enabled = process.env.STACK_AUTH_PERF_DEBUG === 'true' || 
                   process.env.VITEST_PERF === 'true' ||
                   process.env.NODE_ENV === 'test';
  }

  startTest(testFile: string, testName: string): void {
    if (!this.enabled) return;
    
    const testKey = `${testFile}::${testName}`;
    this.currentTestStart.set(testKey, performance.now());
    
    // Clear metrics at the start of each test to isolate measurements
    clearDependencyCaches();
    clearFileOperationMetrics();
  }

  endTest(testFile: string, testName: string): void {
    if (!this.enabled) return;
    
    const testKey = `${testFile}::${testName}`;
    const startTime = this.currentTestStart.get(testKey);
    
    if (startTime) {
      const duration = performance.now() - startTime;
      
      const result: PerformanceTestResult = {
        testFile,
        testName,
        duration,
        dependencyMetrics: getDependencyMetrics(),
        fileMetrics: getFileOperationMetrics(),
        timestamp: Date.now()
      };
      
      this.testResults.push(result);
      this.currentTestStart.delete(testKey);
      
      // Update baseline for this test
      this.updateBaseline(testFile, result);
    }
  }

  private updateBaseline(testFile: string, result: PerformanceTestResult): void {
    const existing = this.baselines.get(testFile);
    
    if (existing) {
      // Update running average
      const totalRuns = existing.runs + 1;
      const newAvgDuration = ((existing.averageDuration * existing.runs) + result.duration) / totalRuns;
      const newDepTime = ((existing.dependencyResolutionTime * existing.runs) + 
                         result.dependencyMetrics.performance.totalDuration) / totalRuns;
      const newFileTime = ((existing.fileOperationTime * existing.runs) + 
                          result.fileMetrics.totalDuration) / totalRuns;
      
      this.baselines.set(testFile, {
        testFile,
        averageDuration: newAvgDuration,
        dependencyResolutionTime: newDepTime,
        fileOperationTime: newFileTime,
        timestamp: Date.now(),
        runs: totalRuns
      });
    } else {
      // Create new baseline
      this.baselines.set(testFile, {
        testFile,
        averageDuration: result.duration,
        dependencyResolutionTime: result.dependencyMetrics.performance.totalDuration,
        fileOperationTime: result.fileMetrics.totalDuration,
        timestamp: Date.now(),
        runs: 1
      });
    }
  }

  getResults(): PerformanceTestResult[] {
    return [...this.testResults];
  }

  getBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  generateSummaryReport(): {
    totalTests: number;
    totalDuration: number;
    averageTestDuration: number;
    dependencyPerformance: ReturnType<typeof generateDependencyPerformanceReport>;
    regressions: Array<{
      testFile: string;
      testName: string;
      currentDuration: number;
      baselineDuration: number;
      regressionPercent: number;
    }>;
    ciMetrics: ReturnType<typeof exportPerformanceMetricsForCI>;
  } {
    const regressions = this.detectRegressions();
    const dependencyPerformance = generateDependencyPerformanceReport();
    const ciMetrics = exportPerformanceMetricsForCI();
    
    return {
      totalTests: this.testResults.length,
      totalDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0),
      averageTestDuration: this.testResults.length > 0 
        ? this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length 
        : 0,
      dependencyPerformance,
      regressions,
      ciMetrics
    };
  }

  private detectRegressions(threshold: number = 1.5): Array<{
    testFile: string;
    testName: string;
    currentDuration: number;
    baselineDuration: number;
    regressionPercent: number;
  }> {
    const regressions = [];
    
    for (const result of this.testResults) {
      const baseline = this.baselines.get(result.testFile);
      
      if (baseline && baseline.runs > 1) { // Only check if we have historical data
        const regressionRatio = result.duration / baseline.averageDuration;
        
        if (regressionRatio > threshold) {
          regressions.push({
            testFile: result.testFile,
            testName: result.testName,
            currentDuration: result.duration,
            baselineDuration: baseline.averageDuration,
            regressionPercent: ((regressionRatio - 1) * 100)
          });
        }
      }
    }
    
    return regressions;
  }

  clear(): void {
    this.testResults = [];
    this.currentTestStart.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Global collector instance
const performanceCollector = new TestPerformanceCollector();

/**
 * Vitest plugin for performance monitoring
 */
export function vitestPerformancePlugin(): Plugin {
  return {
    name: 'vitest-performance-monitor',
    configureServer() {
      // Plugin setup - no server configuration needed
    },
    config(config) {
      // Ensure performance debugging is enabled if the plugin is loaded
      if (!config.define) {
        config.define = {};
      }
      
      // Add performance environment variables
      config.define['process.env.VITEST_PERF'] = '"true"';
      
      return config;
    }
  };
}

/**
 * Vitest test hooks for performance monitoring
 * These should be called from the test setup
 */
export const performanceHooks = {
  beforeEach(context: TaskContext) {
    if (!performanceCollector.isEnabled()) return;
    
    const task = context.task;
    const testFile = task.file?.name || 'unknown';
    const testName = task.name || 'unknown';
    
    performanceCollector.startTest(testFile, testName);
  },

  afterEach(context: TaskContext) {
    if (!performanceCollector.isEnabled()) return;
    
    const task = context.task;
    const testFile = task.file?.name || 'unknown';
    const testName = task.name || 'unknown';
    
    performanceCollector.endTest(testFile, testName);
  },

  afterAll() {
    if (!performanceCollector.isEnabled()) return;
    
    // Generate and optionally log performance summary
    const summary = performanceCollector.generateSummaryReport();
    
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true') {
      console.log('\n🚀 Test Performance Summary');
      console.log('='.repeat(50));
      console.log(`Total Tests: ${summary.totalTests}`);
      console.log(`Total Duration: ${summary.totalDuration.toFixed(2)}ms`);
      console.log(`Average Test Duration: ${summary.averageTestDuration.toFixed(2)}ms`);
      
      if (summary.regressions.length > 0) {
        console.log('\n⚠️  Performance Regressions:');
        for (const regression of summary.regressions) {
          console.log(`  • ${regression.testName}: ${regression.regressionPercent.toFixed(1)}% slower (${regression.currentDuration.toFixed(2)}ms vs ${regression.baselineDuration.toFixed(2)}ms)`);
        }
      }
      
      console.log('\n📊 Dependency Performance:');
      console.log(`  • Total Operations: ${summary.dependencyPerformance.summary.totalOperations}`);
      console.log(`  • Success Rate: ${(summary.dependencyPerformance.summary.successRate * 100).toFixed(1)}%`);
      console.log(`  • Cache Hit Rate: ${(summary.dependencyPerformance.summary.cacheHitRate * 100).toFixed(1)}%`);
      
      console.log('\n🎯 CI Status:', summary.ciMetrics.status.toUpperCase());
      if (summary.ciMetrics.issues.length > 0) {
        console.log('Issues:');
        for (const issue of summary.ciMetrics.issues) {
          console.log(`  • ${issue}`);
        }
      }
      
      console.log('='.repeat(50) + '\n');
    }
  }
};

/**
 * Export the collector for external access
 */
export { performanceCollector };

/**
 * Direct access functions for manual performance tracking
 */
export function getTestPerformanceResults(): PerformanceTestResult[] {
  return performanceCollector.getResults();
}

export function getTestPerformanceSummary() {
  return performanceCollector.generateSummaryReport();
}

export function clearTestPerformanceData(): void {
  performanceCollector.clear();
}

/**
 * Performance assertion helpers for tests
 */
export function expectPerformanceWithinThreshold(
  testName: string, 
  maxDuration: number
): void {
  const results = performanceCollector.getResults();
  const testResult = results.find(r => r.testName === testName);
  
  if (!testResult) {
    throw new Error(`Performance data not found for test: ${testName}`);
  }
  
  if (testResult.duration > maxDuration) {
    throw new Error(
      `Performance regression: ${testName} took ${testResult.duration.toFixed(2)}ms, ` +
      `exceeding threshold of ${maxDuration}ms`
    );
  }
}

export function expectNoDependencyRegressions(): void {
  const summary = performanceCollector.generateSummaryReport();
  
  if (summary.ciMetrics.status === 'fail') {
    throw new Error(
      `Dependency performance regression detected: ${summary.ciMetrics.issues.join(', ')}`
    );
  }
}