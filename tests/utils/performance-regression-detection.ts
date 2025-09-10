/**
 * Performance Regression Detection
 * 
 * Utilities for detecting performance regressions in test runs,
 * managing performance baselines, and providing CI/CD integration.
 */

import { readFileContent, fileExists, writeFileContent } from './file-helpers.js';
import { getTestPerformanceSummary } from './vitest-performance-plugin.js';
import path from 'path';

interface PerformanceBaseline {
  testFile: string;
  testName: string;
  averageDuration: number;
  dependencyResolutionTime: number;
  fileOperationTime: number;
  successRate: number;
  cacheHitRate: number;
  timestamp: number;
  runs: number;
  environmentFingerprint: string;
}

interface RegressionThresholds {
  testDurationMultiplier: number; // e.g., 1.5 = 50% slower than baseline
  dependencyResolutionMultiplier: number;
  fileOperationMultiplier: number;
  successRateThreshold: number; // e.g., 0.95 = 95% minimum success rate
  cacheHitRateThreshold: number; // e.g., 0.8 = 80% minimum cache hit rate
  minimumRuns: number; // Minimum baseline runs before regression detection
}

interface RegressionResult {
  testFile: string;
  testName: string;
  regressionType: 'duration' | 'dependency' | 'file_ops' | 'success_rate' | 'cache_hit_rate';
  currentValue: number;
  baselineValue: number;
  regressionPercent: number;
  severity: 'minor' | 'moderate' | 'severe';
  threshold: number;
}

interface PerformanceReport {
  regressions: RegressionResult[];
  newBaselines: PerformanceBaseline[];
  updatedBaselines: PerformanceBaseline[];
  summary: {
    totalTests: number;
    regressedTests: number;
    regressionRate: number;
    averageRegression: number;
    severeConcerns: number;
  };
  ciRecommendation: 'pass' | 'warn' | 'fail';
}

export class PerformanceRegressionDetector {
  private baselineFile: string;
  private thresholds: RegressionThresholds;
  private baselines: Map<string, PerformanceBaseline> = new Map();

  constructor(
    baselineFile: string = 'performance-baselines.json',
    thresholds: Partial<RegressionThresholds> = {}
  ) {
    this.baselineFile = path.resolve(baselineFile);
    this.thresholds = {
      testDurationMultiplier: 1.5, // 50% slower
      dependencyResolutionMultiplier: 2.0, // 100% slower
      fileOperationMultiplier: 2.0, // 100% slower
      successRateThreshold: 0.95, // 95% minimum
      cacheHitRateThreshold: 0.8, // 80% minimum
      minimumRuns: 3, // Need at least 3 runs for stable baseline
      ...thresholds
    };
    
    this.loadBaselines();
  }

  private loadBaselines(): void {
    if (!fileExists(this.baselineFile)) {
      return;
    }

    try {
      const content = readFileContent(this.baselineFile);
      const data = JSON.parse(content || '{"baselines": []}');
      
      for (const baseline of data.baselines || []) {
        const key = this.getBaselineKey(baseline.testFile, baseline.testName);
        this.baselines.set(key, baseline);
      }
    } catch (error) {
      console.warn(`Failed to load performance baselines: ${error}`);
    }
  }

  private saveBaselines(): void {
    try {
      const data = {
        lastUpdated: new Date().toISOString(),
        baselines: Array.from(this.baselines.values())
      };
      
      writeFileContent(this.baselineFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to save performance baselines: ${error}`);
    }
  }

  private getBaselineKey(testFile: string, testName: string): string {
    return `${testFile}::${testName}`;
  }

  private getEnvironmentFingerprint(): string {
    // Create a fingerprint of the test environment for comparison
    return [
      process.version,
      process.platform,
      process.arch,
      process.env.CI ? 'ci' : 'local'
    ].join('-');
  }

  private calculateSeverity(regressionPercent: number, threshold: number): 'minor' | 'moderate' | 'severe' {
    const normalizedRegression = regressionPercent / (threshold * 100);
    
    if (normalizedRegression < 1.2) return 'minor';
    if (normalizedRegression < 2.0) return 'moderate';
    return 'severe';
  }

  updateBaselines(testResults: ReturnType<typeof getTestPerformanceSummary>): PerformanceBaseline[] {
    const newBaselines: PerformanceBaseline[] = [];
    const environmentFingerprint = this.getEnvironmentFingerprint();
    
    // For now, we'll create synthetic test results since the actual test results
    // structure needs to be determined based on the real implementation
    // This is a placeholder that should be updated when test results are available
    
    for (let i = 0; i < testResults.totalTests; i++) {
      const testFile = `test-file-${i}`;
      const testName = `test-${i}`;
      const key = this.getBaselineKey(testFile, testName);
      
      const currentBaseline = this.baselines.get(key);
      const averageDuration = testResults.averageTestDuration;
      const dependencyTime = testResults.dependencyPerformance.summary.totalDuration;
      const successRate = testResults.dependencyPerformance.summary.successRate;
      const cacheHitRate = testResults.dependencyPerformance.summary.cacheHitRate;
      
      if (currentBaseline && currentBaseline.environmentFingerprint === environmentFingerprint) {
        // Update existing baseline with running average
        const totalRuns = currentBaseline.runs + 1;
        const updatedBaseline: PerformanceBaseline = {
          ...currentBaseline,
          averageDuration: ((currentBaseline.averageDuration * currentBaseline.runs) + averageDuration) / totalRuns,
          dependencyResolutionTime: ((currentBaseline.dependencyResolutionTime * currentBaseline.runs) + dependencyTime) / totalRuns,
          fileOperationTime: currentBaseline.fileOperationTime, // Placeholder
          successRate: ((currentBaseline.successRate * currentBaseline.runs) + successRate) / totalRuns,
          cacheHitRate: ((currentBaseline.cacheHitRate * currentBaseline.runs) + cacheHitRate) / totalRuns,
          timestamp: Date.now(),
          runs: totalRuns
        };
        
        this.baselines.set(key, updatedBaseline);
      } else {
        // Create new baseline
        const newBaseline: PerformanceBaseline = {
          testFile,
          testName,
          averageDuration,
          dependencyResolutionTime: dependencyTime,
          fileOperationTime: 0, // Placeholder
          successRate,
          cacheHitRate,
          timestamp: Date.now(),
          runs: 1,
          environmentFingerprint
        };
        
        this.baselines.set(key, newBaseline);
        newBaselines.push(newBaseline);
      }
    }
    
    this.saveBaselines();
    return newBaselines;
  }

  detectRegressions(testResults: ReturnType<typeof getTestPerformanceSummary>): RegressionResult[] {
    const regressions: RegressionResult[] = [];
    const environmentFingerprint = this.getEnvironmentFingerprint();
    
    // Check existing regressions from the test results
    for (const regression of testResults.regressions) {
      const key = this.getBaselineKey(regression.testFile, regression.testName);
      const baseline = this.baselines.get(key);
      
      if (baseline && 
          baseline.environmentFingerprint === environmentFingerprint && 
          baseline.runs >= this.thresholds.minimumRuns) {
        
        const regressionPercent = regression.regressionPercent;
        const threshold = this.thresholds.testDurationMultiplier;
        
        if (regressionPercent > (threshold - 1) * 100) {
          regressions.push({
            testFile: regression.testFile,
            testName: regression.testName,
            regressionType: 'duration',
            currentValue: regression.currentDuration,
            baselineValue: regression.baselineDuration,
            regressionPercent,
            severity: this.calculateSeverity(regressionPercent, threshold),
            threshold: threshold * 100
          });
        }
      }
    }
    
    // Check dependency resolution regressions
    const depPerf = testResults.dependencyPerformance;
    if (depPerf.summary.averageDuration > 0) {
      // For overall dependency performance, we'd compare against a global baseline
      // This is a simplified check - in practice you'd want per-test baselines
      const globalKey = 'global::dependency-resolution';
      const globalBaseline = this.baselines.get(globalKey);
      
      if (globalBaseline && 
          globalBaseline.runs >= this.thresholds.minimumRuns &&
          globalBaseline.environmentFingerprint === environmentFingerprint) {
        
        const currentAvg = depPerf.summary.averageDuration;
        const baselineAvg = globalBaseline.dependencyResolutionTime;
        const regressionRatio = currentAvg / baselineAvg;
        
        if (regressionRatio > this.thresholds.dependencyResolutionMultiplier) {
          regressions.push({
            testFile: 'global',
            testName: 'dependency-resolution',
            regressionType: 'dependency',
            currentValue: currentAvg,
            baselineValue: baselineAvg,
            regressionPercent: (regressionRatio - 1) * 100,
            severity: this.calculateSeverity((regressionRatio - 1) * 100, this.thresholds.dependencyResolutionMultiplier),
            threshold: this.thresholds.dependencyResolutionMultiplier * 100
          });
        }
      }
    }
    
    // Check success rate regressions
    if (depPerf.summary.successRate < this.thresholds.successRateThreshold) {
      regressions.push({
        testFile: 'global',
        testName: 'success-rate',
        regressionType: 'success_rate',
        currentValue: depPerf.summary.successRate,
        baselineValue: this.thresholds.successRateThreshold,
        regressionPercent: ((this.thresholds.successRateThreshold - depPerf.summary.successRate) / this.thresholds.successRateThreshold) * 100,
        severity: depPerf.summary.successRate < 0.8 ? 'severe' : 'moderate',
        threshold: this.thresholds.successRateThreshold * 100
      });
    }
    
    // Check cache hit rate regressions
    if (depPerf.summary.cacheHitRate < this.thresholds.cacheHitRateThreshold) {
      regressions.push({
        testFile: 'global',
        testName: 'cache-hit-rate',
        regressionType: 'cache_hit_rate',
        currentValue: depPerf.summary.cacheHitRate,
        baselineValue: this.thresholds.cacheHitRateThreshold,
        regressionPercent: ((this.thresholds.cacheHitRateThreshold - depPerf.summary.cacheHitRate) / this.thresholds.cacheHitRateThreshold) * 100,
        severity: depPerf.summary.cacheHitRate < 0.5 ? 'severe' : 'minor',
        threshold: this.thresholds.cacheHitRateThreshold * 100
      });
    }
    
    return regressions;
  }

  generateReport(testResults: ReturnType<typeof getTestPerformanceSummary>): PerformanceReport {
    const regressions = this.detectRegressions(testResults);
    const newBaselines = this.updateBaselines(testResults);
    
    const severeConcerns = regressions.filter(r => r.severity === 'severe').length;
    const moderateConcerns = regressions.filter(r => r.severity === 'moderate').length;
    
    let ciRecommendation: 'pass' | 'warn' | 'fail' = 'pass';
    
    if (severeConcerns > 0) {
      ciRecommendation = 'fail';
    } else if (moderateConcerns > 2 || regressions.length > 5) {
      ciRecommendation = 'fail';
    } else if (regressions.length > 0) {
      ciRecommendation = 'warn';
    }
    
    const averageRegression = regressions.length > 0 
      ? regressions.reduce((sum, r) => sum + r.regressionPercent, 0) / regressions.length
      : 0;
    
    return {
      regressions,
      newBaselines,
      updatedBaselines: [], // Would track which baselines were updated
      summary: {
        totalTests: testResults.totalTests,
        regressedTests: regressions.length,
        regressionRate: testResults.totalTests > 0 ? regressions.length / testResults.totalTests : 0,
        averageRegression,
        severeConcerns
      },
      ciRecommendation
    };
  }

  getThresholds(): RegressionThresholds {
    return { ...this.thresholds };
  }

  updateThresholds(newThresholds: Partial<RegressionThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  clearBaselines(): void {
    this.baselines.clear();
    this.saveBaselines();
  }

  exportBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  importBaselines(baselines: PerformanceBaseline[]): void {
    this.baselines.clear();
    for (const baseline of baselines) {
      const key = this.getBaselineKey(baseline.testFile, baseline.testName);
      this.baselines.set(key, baseline);
    }
    this.saveBaselines();
  }
}

/**
 * Default regression detector instance
 */
export const defaultRegressionDetector = new PerformanceRegressionDetector();

/**
 * Utility functions for CI/CD integration
 */
export function checkPerformanceForCI(): {
  passed: boolean;
  report: PerformanceReport;
  exitCode: number;
} {
  const testResults = getTestPerformanceSummary();
  const report = defaultRegressionDetector.generateReport(testResults);
  
  let exitCode = 0;
  let passed = true;
  
  switch (report.ciRecommendation) {
    case 'fail':
      exitCode = 1;
      passed = false;
      break;
    case 'warn':
      exitCode = process.env.STRICT_PERFORMANCE === 'true' ? 1 : 0;
      passed = process.env.STRICT_PERFORMANCE !== 'true';
      break;
    case 'pass':
    default:
      exitCode = 0;
      passed = true;
      break;
  }
  
  return { passed, report, exitCode };
}

/**
 * CLI command for performance regression checking
 */
export function runPerformanceCheck(): void {
  const { passed, report, exitCode } = checkPerformanceForCI();
  
  console.log('\n🔍 Performance Regression Check');
  console.log('='.repeat(40));
  
  if (report.regressions.length === 0) {
    console.log('✅ No performance regressions detected');
  } else {
    console.log(`⚠️  ${report.regressions.length} regression(s) detected:`);
    
    for (const regression of report.regressions) {
      const severityIcon = regression.severity === 'severe' ? '🔴' : 
                          regression.severity === 'moderate' ? '🟡' : '🟢';
      console.log(`  ${severityIcon} ${regression.testName} (${regression.regressionType}): +${regression.regressionPercent.toFixed(1)}%`);
    }
  }
  
  console.log(`\nCI Recommendation: ${report.ciRecommendation.toUpperCase()}`);
  console.log(`Exit Code: ${exitCode}\n`);
  
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}