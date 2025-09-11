#!/usr/bin/env node
/**
 * CI Build Performance Integration
 * 
 * Integrates build performance monitoring with CI/CD pipelines,
 * providing performance reporting, regression detection, and optimization recommendations.
 */

import { BuildPerformanceMonitor } from './build-performance-monitor.js';
import { BuildCacheAnalyzer } from './build-cache-analyzer.js';
import { DependencyResolutionTracker } from './dependency-resolution-tracker.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

class CIBuildPerformanceIntegration {
  constructor(options = {}) {
    this.options = {
      enableGitHubActions: options.enableGitHubActions !== false && !!process.env.GITHUB_ACTIONS,
      enableBaselineTracking: options.enableBaselineTracking !== false,
      failOnRegression: options.failOnRegression || process.env.FAIL_ON_PERF_REGRESSION === 'true',
      regressionThreshold: options.regressionThreshold || 20, // 20% regression threshold
      outputFormat: options.outputFormat || 'console', // 'console', 'json', 'both'
      artifactPath: options.artifactPath || '.performance/ci',
      ...options
    };

    this.performanceData = {
      buildPerformance: null,
      cacheAnalysis: null,
      dependencyAnalysis: null,
      overallScore: 0,
      regressions: [],
      recommendations: [],
      ciMetadata: this.getCIMetadata()
    };
  }

  /**
   * Extract CI metadata from environment
   */
  getCIMetadata() {
    return {
      isCI: !!process.env.CI,
      provider: this.detectCIProvider(),
      buildNumber: process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER,
      buildId: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
      branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME,
      commit: process.env.COMMIT_SHA || process.env.GITHUB_SHA,
      pullRequest: process.env.PULL_REQUEST_NUMBER || this.extractPRNumber(),
      buildUrl: this.getBuildUrl(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    };
  }

  /**
   * Detect CI provider from environment variables
   */
  detectCIProvider() {
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.CIRCLECI) return 'circleci';
    if (process.env.TRAVIS) return 'travis';
    if (process.env.JENKINS_URL) return 'jenkins';
    if (process.env.GITLAB_CI) return 'gitlab';
    return 'unknown';
  }

  /**
   * Extract PR number from GitHub ref
   */
  extractPRNumber() {
    if (process.env.GITHUB_REF && process.env.GITHUB_REF.includes('pull/')) {
      const match = process.env.GITHUB_REF.match(/pull\/(\d+)\//);
      return match ? match[1] : null;
    }
    return null;
  }

  /**
   * Get build URL for CI provider
   */
  getBuildUrl() {
    const { provider, buildId, buildNumber } = this.performanceData.ciMetadata;
    
    switch (provider) {
      case 'github-actions':
        return process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
          ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
          : null;
      case 'circleci':
        return process.env.CIRCLE_BUILD_URL;
      case 'travis':
        return process.env.TRAVIS_BUILD_WEB_URL;
      default:
        return null;
    }
  }

  /**
   * Run comprehensive build performance analysis
   */
  async runPerformanceAnalysis() {
    console.log(chalk.blue('🚀 Starting CI build performance analysis...'));

    try {
      // Step 1: Analyze build cache
      console.log('📋 Step 1: Analyzing build cache...');
      const cacheAnalyzer = new BuildCacheAnalyzer({ 
        verbose: false,
        enableCacheWarming: false 
      });
      
      await cacheAnalyzer.analyzeBuildCaches();
      cacheAnalyzer.generateCacheOptimizations();
      this.performanceData.cacheAnalysis = cacheAnalyzer.generateReport();

      // Step 2: Run monitored build
      console.log('📋 Step 2: Running monitored build...');
      const buildMonitor = new BuildPerformanceMonitor({
        verbose: false,
        baselineTracking: this.options.enableBaselineTracking,
        reportToCI: true
      });

      await buildMonitor.runMonitoredBuild(this.performanceData.ciMetadata.environment);
      this.performanceData.buildPerformance = await buildMonitor.generateReport(this.performanceData.ciMetadata.environment);

      // Step 3: Analyze dependency resolution (simulated for this example)
      console.log('📋 Step 3: Analyzing dependency resolution...');
      const depTracker = new DependencyResolutionTracker({ verbose: false });
      depTracker.startTracking();
      
      // Simulate some dependency analysis
      await new Promise(resolve => setTimeout(resolve, 100));
      
      depTracker.stopTracking();
      this.performanceData.dependencyAnalysis = await depTracker.generateReport();

      // Step 4: Calculate overall performance score
      this.calculateOverallPerformanceScore();

      // Step 5: Detect regressions if baseline tracking is enabled
      if (this.options.enableBaselineTracking) {
        await this.detectPerformanceRegressions(buildMonitor);
      }

      // Step 6: Generate recommendations
      this.generateCIRecommendations();

      // Step 7: Output results
      await this.outputResults();

      // Step 8: Save artifacts
      await this.savePerformanceArtifacts();

      console.log(chalk.green('✅ CI build performance analysis complete!'));

      // Step 9: Handle failures
      this.handlePerformanceFailures();

    } catch (error) {
      console.error(chalk.red('❌ CI build performance analysis failed:'), error.message);
      
      // Save error information
      this.performanceData.error = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      await this.savePerformanceArtifacts();
      process.exit(1);
    }
  }

  /**
   * Calculate overall performance score (0-100)
   */
  calculateOverallPerformanceScore() {
    const weights = {
      buildTime: 0.3,      // Build time performance
      cacheEffectiveness: 0.25,  // Cache hit rate
      dependencyPerformance: 0.2, // Dependency resolution
      memoryEfficiency: 0.15,    // Memory usage
      stability: 0.1       // Error rate and stability
    };

    let score = 0;
    let totalWeight = 0;

    // Build time score (faster = better, normalize to reasonable range)
    if (this.performanceData.buildPerformance?.performance?.totalBuildTime) {
      const buildTimeMs = this.performanceData.buildPerformance.performance.totalBuildTime;
      const idealBuildTime = 30000; // 30 seconds
      const buildTimeScore = Math.max(0, Math.min(100, 100 - (buildTimeMs - idealBuildTime) / 1000));
      score += buildTimeScore * weights.buildTime;
      totalWeight += weights.buildTime;
    }

    // Cache effectiveness score
    if (this.performanceData.cacheAnalysis?.overall?.cacheHitRate !== undefined) {
      score += this.performanceData.cacheAnalysis.overall.cacheHitRate * weights.cacheEffectiveness;
      totalWeight += weights.cacheEffectiveness;
    }

    // Dependency performance score
    if (this.performanceData.dependencyAnalysis?.performance?.cacheHitRate !== undefined) {
      const depScore = parseFloat(this.performanceData.dependencyAnalysis.performance.cacheHitRate);
      score += depScore * weights.dependencyPerformance;
      totalWeight += weights.dependencyPerformance;
    }

    // Memory efficiency score
    if (this.performanceData.buildPerformance?.memory?.peak) {
      const memoryMB = parseFloat(this.performanceData.buildPerformance.memory.peak);
      const idealMemory = 500; // 500MB
      const memoryScore = Math.max(0, Math.min(100, 100 - Math.max(0, (memoryMB - idealMemory) / 10)));
      score += memoryScore * weights.memoryEfficiency;
      totalWeight += weights.memoryEfficiency;
    }

    // Stability score (based on error rates)
    const errorCount = this.performanceData.dependencyAnalysis?.performance?.resolutionErrors || 0;
    const stabilityScore = Math.max(0, 100 - errorCount * 10);
    score += stabilityScore * weights.stability;
    totalWeight += weights.stability;

    this.performanceData.overallScore = totalWeight > 0 ? Math.round(score / totalWeight) : 0;
  }

  /**
   * Detect performance regressions
   */
  async detectPerformanceRegressions(buildMonitor) {
    try {
      const regressions = await buildMonitor.detectRegressions();
      
      if (regressions && regressions.length > 0) {
        this.performanceData.regressions = regressions.map(reg => ({
          testKey: reg.testKey,
          type: reg.regressionType,
          severity: reg.severity,
          changePercent: reg.totalChange,
          confidence: reg.confidence,
          recommendation: reg.recommendation,
          affectedMetrics: reg.affectedMetrics
        }));

        console.log(chalk.yellow(`⚠️  Detected ${regressions.length} performance regression(s)`));
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not detect regressions: ${error.message}`));
    }
  }

  /**
   * Generate CI-specific recommendations
   */
  generateCIRecommendations() {
    const recommendations = [];

    // Overall score recommendations
    if (this.performanceData.overallScore < 70) {
      recommendations.push({
        category: 'overall',
        priority: 'high',
        title: 'Low overall performance score',
        description: `Performance score is ${this.performanceData.overallScore}/100`,
        action: 'Review build performance, cache configuration, and dependency management'
      });
    }

    // Build time recommendations
    const buildTime = this.performanceData.buildPerformance?.performance?.totalBuildTime;
    if (buildTime && buildTime > 60000) {
      recommendations.push({
        category: 'build-time',
        priority: 'medium',
        title: 'Build time is high',
        description: `Build took ${Math.round(buildTime / 1000)}s`,
        action: 'Consider parallel builds, cache optimization, or build splitting'
      });
    }

    // Cache recommendations
    const cacheHitRate = this.performanceData.cacheAnalysis?.overall?.cacheHitRate;
    if (cacheHitRate !== undefined && cacheHitRate < 60) {
      recommendations.push({
        category: 'cache',
        priority: 'high',
        title: 'Cache hit rate is low',
        description: `Cache effectiveness is ${cacheHitRate}%`,
        action: 'Review cache configuration and ensure cache persistence in CI'
      });
    }

    // Memory recommendations
    const memoryPeak = this.performanceData.buildPerformance?.memory?.peak;
    if (memoryPeak && parseFloat(memoryPeak) > 1000) {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        title: 'High memory usage',
        description: `Peak memory usage: ${memoryPeak}MB`,
        action: 'Consider reducing concurrent processes or increasing CI memory limits'
      });
    }

    // Regression recommendations
    if (this.performanceData.regressions.length > 0) {
      const severeRegressions = this.performanceData.regressions.filter(r => r.severity === 'severe');
      if (severeRegressions.length > 0) {
        recommendations.push({
          category: 'regression',
          priority: 'critical',
          title: 'Severe performance regressions detected',
          description: `${severeRegressions.length} severe regression(s) found`,
          action: 'Review recent changes and consider reverting problematic commits'
        });
      }
    }

    this.performanceData.recommendations = recommendations;
  }

  /**
   * Output results based on configuration
   */
  async outputResults() {
    if (this.options.outputFormat === 'console' || this.options.outputFormat === 'both') {
      this.outputConsoleResults();
    }

    if (this.options.outputFormat === 'json' || this.options.outputFormat === 'both') {
      this.outputJSONResults();
    }

    if (this.options.enableGitHubActions) {
      await this.outputGitHubActions();
    }
  }

  /**
   * Output console-friendly results
   */
  outputConsoleResults() {
    console.log('\n' + chalk.blue('📊 CI Build Performance Report'));
    console.log('═'.repeat(50));

    // Overall score
    const scoreColor = this.performanceData.overallScore >= 80 ? 'green' : 
                      this.performanceData.overallScore >= 60 ? 'yellow' : 'red';
    console.log(chalk[scoreColor](`🎯 Overall Score: ${this.performanceData.overallScore}/100`));

    // Build performance summary
    if (this.performanceData.buildPerformance) {
      const bp = this.performanceData.buildPerformance.performance;
      console.log(`⏱️  Build Time: ${bp.totalBuildTimeFormatted}`);
      console.log(`🧠 Memory Peak: ${this.performanceData.buildPerformance.memory.peak}MB`);
    }

    // Cache effectiveness
    if (this.performanceData.cacheAnalysis) {
      console.log(`🗄️  Cache Effectiveness: ${this.performanceData.cacheAnalysis.overall.cacheHitRate}%`);
    }

    // Regressions
    if (this.performanceData.regressions.length > 0) {
      console.log(chalk.red(`⚠️  Regressions: ${this.performanceData.regressions.length} detected`));
      this.performanceData.regressions.forEach(reg => {
        console.log(`   • ${reg.testKey}: ${reg.severity} ${reg.type} regression (${reg.changePercent.toFixed(1)}%)`);
      });
    }

    // Top recommendations
    const highPriorityRecs = this.performanceData.recommendations.filter(r => 
      r.priority === 'critical' || r.priority === 'high'
    );
    
    if (highPriorityRecs.length > 0) {
      console.log(chalk.yellow('\n💡 Priority Recommendations:'));
      highPriorityRecs.forEach(rec => {
        console.log(`   • ${rec.title}: ${rec.action}`);
      });
    }
  }

  /**
   * Output JSON results
   */
  outputJSONResults() {
    const jsonReport = {
      ...this.performanceData,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        ci: this.performanceData.ciMetadata
      }
    };

    console.log('\n📊 JSON Performance Report:');
    console.log(JSON.stringify(jsonReport, null, 2));
  }

  /**
   * Output GitHub Actions specific annotations
   */
  async outputGitHubActions() {
    if (!this.options.enableGitHubActions) return;

    // Performance score annotation
    const scoreLevel = this.performanceData.overallScore >= 80 ? 'notice' : 
                      this.performanceData.overallScore >= 60 ? 'warning' : 'error';
    
    console.log(`::${scoreLevel}::Performance Score: ${this.performanceData.overallScore}/100`);

    // Regression annotations
    this.performanceData.regressions.forEach(reg => {
      const level = reg.severity === 'severe' ? 'error' : 'warning';
      console.log(`::${level}::Performance Regression: ${reg.testKey} - ${reg.changePercent.toFixed(1)}% ${reg.type} regression`);
    });

    // High priority recommendation annotations
    this.performanceData.recommendations
      .filter(rec => rec.priority === 'critical' || rec.priority === 'high')
      .forEach(rec => {
        const level = rec.priority === 'critical' ? 'error' : 'warning';
        console.log(`::${level}::${rec.title}: ${rec.action}`);
      });

    // Set outputs for other steps
    console.log(`::set-output name=performance-score::${this.performanceData.overallScore}`);
    console.log(`::set-output name=regressions-count::${this.performanceData.regressions.length}`);
    console.log(`::set-output name=build-time::${this.performanceData.buildPerformance?.performance?.totalBuildTime || 0}`);
    console.log(`::set-output name=cache-hit-rate::${this.performanceData.cacheAnalysis?.overall?.cacheHitRate || 0}`);
  }

  /**
   * Save performance artifacts
   */
  async savePerformanceArtifacts() {
    try {
      await fs.mkdir(this.options.artifactPath, { recursive: true });

      // Save comprehensive report
      const reportPath = path.join(this.options.artifactPath, 'performance-report.json');
      await fs.writeFile(reportPath, JSON.stringify(this.performanceData, null, 2));

      // Save individual components
      if (this.performanceData.buildPerformance) {
        const buildPerfPath = path.join(this.options.artifactPath, 'build-performance.json');
        await fs.writeFile(buildPerfPath, JSON.stringify(this.performanceData.buildPerformance, null, 2));
      }

      if (this.performanceData.cacheAnalysis) {
        const cachePath = path.join(this.options.artifactPath, 'cache-analysis.json');
        await fs.writeFile(cachePath, JSON.stringify(this.performanceData.cacheAnalysis, null, 2));
      }

      // Save summary for dashboards
      const summary = {
        timestamp: new Date().toISOString(),
        overallScore: this.performanceData.overallScore,
        buildTime: this.performanceData.buildPerformance?.performance?.totalBuildTime || 0,
        cacheHitRate: this.performanceData.cacheAnalysis?.overall?.cacheHitRate || 0,
        regressionsCount: this.performanceData.regressions.length,
        ci: this.performanceData.ciMetadata
      };

      const summaryPath = path.join(this.options.artifactPath, 'performance-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

      console.log(chalk.gray(`📄 Performance artifacts saved to: ${this.options.artifactPath}`));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to save performance artifacts: ${error.message}`));
    }
  }

  /**
   * Handle performance failures and exit codes
   */
  handlePerformanceFailures() {
    let shouldFail = false;
    const failures = [];

    // Check for severe regressions
    const severeRegressions = this.performanceData.regressions.filter(r => r.severity === 'severe');
    if (severeRegressions.length > 0 && this.options.failOnRegression) {
      shouldFail = true;
      failures.push(`Severe performance regressions detected: ${severeRegressions.length}`);
    }

    // Check for significant performance degradation
    if (this.performanceData.overallScore < 50) {
      shouldFail = true;
      failures.push(`Performance score is critically low: ${this.performanceData.overallScore}/100`);
    }

    // Check for critical recommendations
    const criticalRecs = this.performanceData.recommendations.filter(r => r.priority === 'critical');
    if (criticalRecs.length > 0) {
      shouldFail = true;
      failures.push(`Critical performance issues detected: ${criticalRecs.length}`);
    }

    if (shouldFail) {
      console.error(chalk.red('\n❌ Build failed due to performance issues:'));
      failures.forEach(failure => {
        console.error(chalk.red(`   • ${failure}`));
      });
      console.error(chalk.red('\nReview the performance report and address the issues above.'));
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    outputFormat: args.includes('--json') ? 'json' : 
                 args.includes('--both') ? 'both' : 'console',
    failOnRegression: args.includes('--fail-on-regression'),
    enableBaselineTracking: !args.includes('--no-baseline'),
    enableGitHubActions: !args.includes('--no-github-actions'),
    regressionThreshold: parseInt(args.find(arg => arg.startsWith('--threshold='))?.split('=')[1]) || 20
  };

  const integration = new CIBuildPerformanceIntegration(options);
  await integration.runPerformanceAnalysis();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CIBuildPerformanceIntegration };