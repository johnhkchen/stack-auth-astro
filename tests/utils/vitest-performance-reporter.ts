/**
 * Vitest Performance Reporter
 * 
 * Custom Vitest reporter that integrates performance monitoring data
 * into test output and CI reporting.
 */

import type { File, Reporter, Task, TaskResult } from 'vitest';
import { getTestPerformanceSummary } from './vitest-performance-plugin.js';

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
  }

  onFinished(files?: File[]) {
    this.endTime = performance.now();
    
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.VITEST_PERF === 'true') {
      this.generatePerformanceReport(files);
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
      console.log(`  • Tests monitored: ${performanceSummary.totalTests}`);
      console.log(`  • Average test duration: ${performanceSummary.averageTestDuration.toFixed(2)}ms`);
      
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

  constructor(outputFile: string = 'performance-report.json') {
    this.outputFile = outputFile;
  }

  onFinished() {
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.VITEST_PERF === 'true') {
      this.generateJSONReport();
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
          totalTests: summary.totalTests,
          totalDuration: summary.totalDuration,
          averageTestDuration: summary.averageTestDuration
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
  onFinished() {
    if (process.env.STACK_AUTH_PERF_DEBUG === 'true' || process.env.VITEST_PERF === 'true') {
      this.showMinimalReport();
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