/**
 * Vitest Performance Reporter
 * 
 * Custom Vitest reporter that integrates performance monitoring data
 * into test output and CI reporting.
 */

import type { File, Reporter, Task, TaskResult, TaskResultPack } from 'vitest';
import { getTestPerformanceSummary, performanceCollector } from './vitest-performance-plugin.js';

interface PerformanceReportOptions {
  outputFile?: string;
  includeDetailedStats?: boolean;
  regressionThreshold?: number;
  showSlowTests?: boolean;
  slowTestThreshold?: number;
}

export class PerformanceReporter implements Reporter {
  private options: PerformanceReportOptions;
  private startTime: number = 0;
  private endTime: number = 0;
  private testCount: number = 0;
  private testDurations: Map<string, number> = new Map();
  private files: File[] = [];

  constructor(options: PerformanceReportOptions = {}) {
    this.options = {
      outputFile: undefined,
      includeDetailedStats: false,
      regressionThreshold: 1.5, // 50% slower than baseline
      showSlowTests: true,
      slowTestThreshold: 1000, // 1 second
      ...options
    };
  }

  onInit() {
    this.startTime = performance.now();
    // Clear any previous test data
    this.testCount = 0;
    this.testDurations.clear();
    this.files = [];
  }

  onCollected(files?: File[]) {
    // Store files for later processing
    if (files) {
      this.files = files;
    }
  }

  onTaskUpdate(packs: TaskResultPack[]) {
    // Capture test execution data from task updates
    for (const pack of packs) {
      const [taskId, result, meta] = pack;
      
      // Track completed tests
      if (result?.state === 'pass' || result?.state === 'fail') {
        // Find the actual task from our stored files
        const task = this.findTaskInFiles(taskId);
        
        if (task && task.type === 'test') {
          this.testCount++;
          
          // Capture test duration if available
          if (result.duration !== undefined && result.duration !== null) {
            const fileName = task.file?.name || 'unknown';
            const testName = task.name || 'unknown';
            const testKey = `${fileName}::${testName}`;
            
            this.testDurations.set(testKey, result.duration);
            
            // Update the performance collector with actual test metrics
            if (performanceCollector.isEnabled()) {
              // Register the test with its actual duration
              performanceCollector.startTest(fileName, testName);
              // Use a microtask to ensure proper async handling
              Promise.resolve().then(() => {
                performanceCollector.endTest(fileName, testName);
              });
            }
          }
        }
      }
    }
  }

  private findTaskInFiles(taskId: string): Task | undefined {
    // Search through all files to find the task with matching ID
    for (const file of this.files) {
      const task = this.findTaskRecursive(file.tasks, taskId);
      if (task) {
        return task;
      }
    }
    return undefined;
  }

  private findTaskRecursive(tasks: Task[], taskId: string): Task | undefined {
    for (const task of tasks) {
      if (task.id === taskId) {
        return task;
      }
      // Recursively search in subtasks/suites
      if (task.tasks && task.tasks.length > 0) {
        const found = this.findTaskRecursive(task.tasks, taskId);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  onFinished(files?: File[]) {
    this.endTime = performance.now();
    
    // Update files if provided
    if (files) {
      this.files = files;
    }
    
    // Process all test results from files to ensure we capture everything
    this.processTestResults();
    
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.VITEST_PERF === 'true') {
      this.generatePerformanceReport(this.files);
    }
  }

  private processTestResults() {
    // Walk through all files and capture test metrics
    for (const file of this.files) {
      this.processTasksRecursive(file.tasks, file.name);
    }
  }

  private processTasksRecursive(tasks: Task[], fileName?: string) {
    for (const task of tasks) {
      // Process test tasks
      if (task.type === 'test' && task.result) {
        const testName = task.name || 'unknown';
        const testFileName = fileName || task.file?.name || 'unknown';
        
        // Only count if not already tracked
        const testKey = `${testFileName}::${testName}`;
        if (!this.testDurations.has(testKey) && task.result.duration !== undefined) {
          this.testCount++;
          this.testDurations.set(testKey, task.result.duration);
          
          // Update performance collector
          if (performanceCollector.isEnabled()) {
            performanceCollector.startTest(testFileName, testName);
            performanceCollector.endTest(testFileName, testName);
          }
        }
      }
      
      // Recursively process subtasks
      if (task.tasks && task.tasks.length > 0) {
        this.processTasksRecursive(task.tasks, fileName);
      }
    }
  }

  private generatePerformanceReport(files?: File[]) {
    try {
      const performanceSummary = getTestPerformanceSummary();
      const testRunDuration = this.endTime - this.startTime;
      
      console.log('\n' + '='.repeat(80));
      console.log('🚀 PERFORMANCE MONITORING REPORT');
      console.log('='.repeat(80));
      
      // Overall test run metrics
      console.log('\n📊 Test Run Overview:');
      console.log(`  • Total test run time: ${testRunDuration.toFixed(2)}ms`);
      console.log(`  • Tests executed: ${this.testCount}`);
      console.log(`  • Tests monitored: ${performanceSummary.totalTests || this.testCount}`);
      
      // Calculate average from our collected durations if plugin data is empty
      let avgDuration = performanceSummary.averageTestDuration;
      if (this.testDurations.size > 0 && avgDuration === 0) {
        const totalDuration = Array.from(this.testDurations.values()).reduce((sum, d) => sum + d, 0);
        avgDuration = totalDuration / this.testDurations.size;
      }
      console.log(`  • Average test duration: ${avgDuration.toFixed(2)}ms`);
      
      // Performance regressions
      if (performanceSummary.regressions.length > 0) {
        console.log('\n⚠️  PERFORMANCE REGRESSIONS DETECTED:');
        for (const regression of performanceSummary.regressions) {
          const indicator = regression.regressionPercent > 100 ? '🔴' : '🟡';
          console.log(`  ${indicator} ${regression.testName}`);
          console.log(`    • Current: ${regression.currentDuration.toFixed(2)}ms`);
          console.log(`    • Baseline: ${regression.baselineDuration.toFixed(2)}ms`);
          console.log(`    • Regression: +${regression.regressionPercent.toFixed(1)}%`);
        }
      } else {
        console.log('\n✅ No performance regressions detected');
      }
      
      // Dependency resolution performance
      const depPerf = performanceSummary.dependencyPerformance;
      console.log('\n🔗 Dependency Resolution Performance:');
      console.log(`  • Total operations: ${depPerf.summary.totalOperations}`);
      console.log(`  • Total duration: ${depPerf.summary.totalDuration.toFixed(2)}ms`);
      console.log(`  • Average duration: ${depPerf.summary.averageDuration.toFixed(2)}ms`);
      console.log(`  • Success rate: ${(depPerf.summary.successRate * 100).toFixed(1)}%`);
      console.log(`  • Cache hit rate: ${(depPerf.summary.cacheHitRate * 100).toFixed(1)}%`);
      
      // Show slowest operations if enabled
      if (this.options.showSlowTests && depPerf.summary.slowestOperations.length > 0) {
        console.log('\n🐌 Slowest Dependency Operations:');
        depPerf.summary.slowestOperations.slice(0, 5).forEach((op, index) => {
          console.log(`  ${index + 1}. ${op.operation}: ${op.avgDuration.toFixed(2)}ms`);
        });
      }
      
      // CI Status
      const ciStatus = performanceSummary.ciMetrics;
      const statusIcon = ciStatus.status === 'pass' ? '✅' : 
                        ciStatus.status === 'warn' ? '⚠️' : '❌';
      console.log(`\n${statusIcon} CI Performance Status: ${ciStatus.status.toUpperCase()}`);
      
      if (ciStatus.issues.length > 0) {
        console.log('  Issues:');
        ciStatus.issues.forEach(issue => {
          console.log(`    • ${issue}`);
        });
      }
      
      // Performance recommendations
      if (depPerf.recommendations.length > 0) {
        console.log('\n💡 Performance Recommendations:');
        depPerf.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }
      
      // Detailed stats if requested
      if (this.options.includeDetailedStats) {
        this.logDetailedStats(depPerf);
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
      
      // Write to file if specified
      if (this.options.outputFile) {
        this.writeReportToFile(performanceSummary, testRunDuration);
      }
      
    } catch (error) {
      console.error('Failed to generate performance report:', error);
    }
  }

  private logDetailedStats(depPerf: any) {
    console.log('\n📈 Detailed Operation Statistics:');
    
    const operations = Object.entries(depPerf.detailedStats.operationStats);
    if (operations.length === 0) {
      console.log('  No detailed statistics available');
      return;
    }
    
    console.log('  ┌─────────────────────────────────────────────────────────────────┐');
    console.log('  │ Operation                    │ Count │ Avg (ms) │ Success │ Cache │');
    console.log('  ├─────────────────────────────────────────────────────────────────┤');
    
    operations.forEach(([operation, stats]: [string, any]) => {
      const operationName = operation.length > 28 ? operation.slice(0, 25) + '...' : operation;
      const count = stats.count.toString().padStart(5);
      const avgDuration = stats.avgDuration.toFixed(1).padStart(8);
      const successRate = (stats.successRate * 100).toFixed(0).padStart(6) + '%';
      const cacheRate = (stats.cacheHitRate * 100).toFixed(0).padStart(4) + '%';
      
      console.log(`  │ ${operationName.padEnd(28)} │ ${count} │ ${avgDuration} │ ${successRate} │ ${cacheRate} │`);
    });
    
    console.log('  └─────────────────────────────────────────────────────────────────┘');
  }

  private writeReportToFile(summary: any, testRunDuration: number) {
    const fs = require('fs');
    const path = require('path');
    
    const report = {
      timestamp: new Date().toISOString(),
      testRunDuration,
      performanceSummary: summary,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI
      }
    };
    
    try {
      const outputPath = path.resolve(this.options.outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Performance report written to: ${outputPath}`);
    } catch (error) {
      console.error('Failed to write performance report to file:', error);
    }
  }
}

/**
 * Factory function to create the performance reporter
 */
export function createPerformanceReporter(options?: PerformanceReportOptions): PerformanceReporter {
  return new PerformanceReporter(options);
}

/**
 * JSON reporter that outputs performance metrics in JSON format for CI integration
 */
export class JSONPerformanceReporter implements Reporter {
  private outputFile: string;
  private files: File[] = [];
  private testCount: number = 0;
  private testDurations: Map<string, number> = new Map();

  constructor(outputFile: string = 'performance-report.json') {
    this.outputFile = outputFile;
  }

  onCollected(files?: File[]) {
    if (files) {
      this.files = files;
    }
  }

  onTaskUpdate(packs: TaskResultPack[]) {
    // Track test completions for accurate metrics
    for (const pack of packs) {
      const [taskId, result] = pack;
      if (result?.state === 'pass' || result?.state === 'fail') {
        this.testCount++;
      }
    }
  }

  onFinished(files?: File[]) {
    if (files) {
      this.files = files;
    }
    
    // Process test results to ensure accurate counts
    this.processTestResults();
    
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.VITEST_PERF === 'true') {
      this.generateJSONReport();
    }
  }

  private processTestResults() {
    for (const file of this.files) {
      this.processTasksRecursive(file.tasks);
    }
  }

  private processTasksRecursive(tasks: Task[]) {
    for (const task of tasks) {
      if (task.type === 'test' && task.result?.duration !== undefined) {
        const testKey = `${task.file?.name || 'unknown'}::${task.name}`;
        if (!this.testDurations.has(testKey)) {
          this.testDurations.set(testKey, task.result.duration);
        }
      }
      if (task.tasks && task.tasks.length > 0) {
        this.processTasksRecursive(task.tasks);
      }
    }
  }

  private generateJSONReport() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const summary = getTestPerformanceSummary();
      
      const jsonReport = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTests: summary.totalTests || this.testDurations.size,
          totalDuration: summary.totalDuration || Array.from(this.testDurations.values()).reduce((s, d) => s + d, 0),
          averageTestDuration: summary.averageTestDuration || 
            (this.testDurations.size > 0 ? Array.from(this.testDurations.values()).reduce((s, d) => s + d, 0) / this.testDurations.size : 0)
        },
        regressions: summary.regressions,
        dependencyPerformance: {
          totalOperations: summary.dependencyPerformance.summary.totalOperations,
          averageDuration: summary.dependencyPerformance.summary.averageDuration,
          successRate: summary.dependencyPerformance.summary.successRate,
          cacheHitRate: summary.dependencyPerformance.summary.cacheHitRate
        },
        ciMetrics: summary.ciMetrics,
        recommendations: summary.dependencyPerformance.recommendations
      };
      
      const outputPath = path.resolve(this.outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2));
      
    } catch (error) {
      console.error('Failed to write JSON performance report:', error);
    }
  }
}

/**
 * Minimal reporter that only shows performance issues/regressions
 */
export class MinimalPerformanceReporter implements Reporter {
  private files: File[] = [];
  private testCount: number = 0;

  onCollected(files?: File[]) {
    if (files) {
      this.files = files;
    }
  }

  onFinished(files?: File[]) {
    if (files) {
      this.files = files;
    }
    
    // Count actual tests
    this.countTests();
    
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.VITEST_PERF === 'true') {
      this.showMinimalReport();
    }
  }

  private countTests() {
    for (const file of this.files) {
      this.countTasksRecursive(file.tasks);
    }
  }

  private countTasksRecursive(tasks: Task[]) {
    for (const task of tasks) {
      if (task.type === 'test') {
        this.testCount++;
      }
      if (task.tasks && task.tasks.length > 0) {
        this.countTasksRecursive(task.tasks);
      }
    }
  }

  private showMinimalReport() {
    try {
      const summary = getTestPerformanceSummary();
      
      // Only show output if there are issues
      const hasRegressions = summary.regressions.length > 0;
      const hasIssues = summary.ciMetrics.status !== 'pass';
      
      if (!hasRegressions && !hasIssues) {
        return; // Silent success
      }
      
      console.log('\n⚠️  Performance Issues Detected:');
      
      if (hasRegressions) {
        console.log(`  • ${summary.regressions.length} test(s) with performance regressions`);
        summary.regressions.forEach(reg => {
          console.log(`    - ${reg.testName}: +${reg.regressionPercent.toFixed(1)}% slower`);
        });
      }
      
      if (hasIssues) {
        console.log(`  • Dependency performance: ${summary.ciMetrics.status}`);
        summary.ciMetrics.issues.forEach(issue => {
          console.log(`    - ${issue}`);
        });
      }
      
      console.log('');
    } catch (error) {
      // Silent failure for minimal reporter
    }
  }
}

/**
 * Export factory functions for easy use in vitest config
 */
export const performanceReporters = {
  detailed: (options?: PerformanceReportOptions) => new PerformanceReporter(options),
  json: (outputFile?: string) => new JSONPerformanceReporter(outputFile),
  minimal: () => new MinimalPerformanceReporter()
};