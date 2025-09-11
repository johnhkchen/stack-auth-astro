#!/usr/bin/env node
/**
 * Build Performance Monitor
 * 
 * Tracks build performance metrics including TypeScript compilation,
 * TSUP bundling, dependency resolution, and caching effectiveness.
 * Integrates with the performance baseline manager for historical tracking.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { PerformanceBaselineManager } from '../tests/utils/performance-baseline-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

class BuildPerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || process.env.BUILD_PERF_VERBOSE === 'true',
      baselineTracking: options.baselineTracking !== false,
      reportToCI: options.reportToCI || process.env.CI === 'true',
      ...options
    };
    
    this.metrics = {
      totalBuildTime: 0,
      typescriptCompileTime: 0,
      tsupBundleTime: 0,
      dependencyResolutionTime: 0,
      fileOperationTime: 0,
      cacheStats: {
        typescriptCacheHits: 0,
        typescriptCacheMisses: 0,
        tsupCacheHits: 0,
        tsupCacheMisses: 0,
        cacheEffectiveness: 0
      },
      buildSteps: [],
      memoryUsage: {
        peak: 0,
        average: 0,
        samples: []
      }
    };
    
    this.performanceMonitor = this.options.baselineTracking 
      ? new PerformanceBaselineManager({
          baselineDir: '.performance/build',
          enableTrendAnalysis: true
        })
      : null;
    
    this.startTime = Date.now();
    this.stepStartTime = null;
    this.memoryMonitorInterval = null;
  }

  /**
   * Start monitoring memory usage during build
   */
  startMemoryMonitoring() {
    this.memoryMonitorInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      this.metrics.memoryUsage.samples.push(heapUsedMB);
      this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, heapUsedMB);
    }, 500);
  }

  /**
   * Stop monitoring memory usage
   */
  stopMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      
      if (this.metrics.memoryUsage.samples.length > 0) {
        this.metrics.memoryUsage.average = 
          this.metrics.memoryUsage.samples.reduce((sum, val) => sum + val, 0) / 
          this.metrics.memoryUsage.samples.length;
      }
    }
  }

  /**
   * Start timing a build step
   */
  startStep(stepName, description = '') {
    this.stepStartTime = Date.now();
    
    if (this.options.verbose) {
      console.log(chalk.blue(`🔧 Starting: ${stepName}${description ? ` - ${description}` : ''}`));
    }
    
    return {
      stepName,
      description,
      startTime: this.stepStartTime
    };
  }

  /**
   * End timing a build step and record metrics
   */
  endStep(stepContext, additionalMetrics = {}) {
    const endTime = Date.now();
    const duration = endTime - stepContext.startTime;
    
    const stepMetrics = {
      name: stepContext.stepName,
      description: stepContext.description,
      duration,
      startTime: stepContext.startTime,
      endTime,
      ...additionalMetrics
    };
    
    this.metrics.buildSteps.push(stepMetrics);
    
    // Update categorized metrics
    switch (stepContext.stepName) {
      case 'typescript-compile':
        this.metrics.typescriptCompileTime = duration;
        break;
      case 'tsup-bundle':
        this.metrics.tsupBundleTime = duration;
        break;
      case 'dependency-resolution':
        this.metrics.dependencyResolutionTime = duration;
        break;
      case 'file-operations':
        this.metrics.fileOperationTime = duration;
        break;
    }
    
    if (this.options.verbose) {
      const durationFormatted = this.formatDuration(duration);
      const status = duration > 10000 ? chalk.yellow('⚠️ ') : chalk.green('✅');
      console.log(`${status} Completed: ${stepContext.stepName} (${durationFormatted})`);
    }
    
    return stepMetrics;
  }

  /**
   * Check TypeScript incremental build cache effectiveness
   */
  async checkTypeScriptCache() {
    const tsBuildInfoPath = path.join(projectRoot, 'tsconfig.build.tsbuildinfo');
    
    try {
      const stats = await fs.stat(tsBuildInfoPath);
      const ageMs = Date.now() - stats.mtime.getTime();
      const isStale = ageMs > 5 * 60 * 1000; // 5 minutes
      
      if (stats.size > 0 && !isStale) {
        this.metrics.cacheStats.typescriptCacheHits++;
        return { hit: true, age: ageMs, size: stats.size };
      } else {
        this.metrics.cacheStats.typescriptCacheMisses++;
        return { hit: false, reason: isStale ? 'stale' : 'empty', age: ageMs };
      }
    } catch (error) {
      this.metrics.cacheStats.typescriptCacheMisses++;
      return { hit: false, reason: 'missing', error: error.message };
    }
  }

  /**
   * Check TSUP cache effectiveness
   */
  async checkTsupCache() {
    const tsupCachePath = path.join(projectRoot, 'node_modules', '.tsup');
    
    try {
      const files = await fs.readdir(tsupCachePath);
      const cacheFiles = files.filter(f => f.endsWith('.cache') || f.includes('cache'));
      
      if (cacheFiles.length > 0) {
        // Get total cache size
        let totalSize = 0;
        for (const file of cacheFiles) {
          try {
            const stats = await fs.stat(path.join(tsupCachePath, file));
            totalSize += stats.size;
          } catch (e) {
            // Ignore individual file errors
          }
        }
        
        this.metrics.cacheStats.tsupCacheHits++;
        return { hit: true, files: cacheFiles.length, totalSize };
      } else {
        this.metrics.cacheStats.tsupCacheMisses++;
        return { hit: false, reason: 'no-cache-files' };
      }
    } catch (error) {
      this.metrics.cacheStats.tsupCacheMisses++;
      return { hit: false, reason: 'cache-dir-missing', error: error.message };
    }
  }

  /**
   * Calculate overall cache effectiveness
   */
  calculateCacheEffectiveness() {
    const totalCacheAttempts = 
      this.metrics.cacheStats.typescriptCacheHits + 
      this.metrics.cacheStats.typescriptCacheMisses +
      this.metrics.cacheStats.tsupCacheHits + 
      this.metrics.cacheStats.tsupCacheMisses;
    
    if (totalCacheAttempts === 0) {
      this.metrics.cacheStats.cacheEffectiveness = 0;
      return;
    }
    
    const totalCacheHits = 
      this.metrics.cacheStats.typescriptCacheHits + 
      this.metrics.cacheStats.tsupCacheHits;
    
    this.metrics.cacheStats.cacheEffectiveness = 
      (totalCacheHits / totalCacheAttempts) * 100;
  }

  /**
   * Monitor a command execution and capture performance data
   */
  async monitorCommand(command, args, options = {}) {
    const stepContext = this.startStep(options.stepName || 'command', `${command} ${args.join(' ')}`);
    
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        cwd: options.cwd || projectRoot,
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      if (!this.options.verbose) {
        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      childProcess.on('close', (code) => {
        const stepMetrics = this.endStep(stepContext, {
          exitCode: code,
          stdout: stdout.slice(-1000), // Keep last 1000 chars
          stderr: stderr.slice(-1000)
        });

        if (code === 0) {
          resolve(stepMetrics);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        this.endStep(stepContext, { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Run a full build with performance monitoring
   */
  async runMonitoredBuild(buildType = 'production') {
    console.log(chalk.blue('🚀 Starting monitored build...'));
    this.startMemoryMonitoring();
    
    try {
      // Check initial cache state
      const initialTsCache = await this.checkTypeScriptCache();
      const initialTsupCache = await this.checkTsupCache();
      
      if (this.options.verbose) {
        console.log(chalk.cyan('📊 Initial cache state:'));
        console.log(`  TypeScript cache: ${initialTsCache.hit ? '✅ Hit' : '❌ Miss'} (${initialTsCache.reason || 'available'})`);
        console.log(`  TSUP cache: ${initialTsupCache.hit ? '✅ Hit' : '❌ Miss'} (${initialTsupCache.reason || 'available'})`);
      }

      // Monitor TypeScript compilation
      await this.monitorCommand('npx', ['tsc', '--noEmit'], {
        stepName: 'typescript-compile',
        env: { NODE_ENV: buildType }
      });

      // Monitor TSUP bundling
      const tsupArgs = buildType === 'development' ? ['--watch', '--no-dts'] : [];
      if (buildType !== 'development') {
        await this.monitorCommand('npx', ['tsup', ...tsupArgs], {
          stepName: 'tsup-bundle',
          env: { NODE_ENV: buildType }
        });
      }

      // Check final cache state
      const finalTsCache = await this.checkTypeScriptCache();
      const finalTsupCache = await this.checkTsupCache();
      
      this.calculateCacheEffectiveness();
      this.metrics.totalBuildTime = Date.now() - this.startTime;

      // Record baseline if enabled
      if (this.performanceMonitor) {
        await this.recordPerformanceBaseline(buildType);
      }

      // Generate report
      await this.generateReport(buildType);
      
    } catch (error) {
      console.error(chalk.red('❌ Build monitoring failed:'), error.message);
      throw error;
    } finally {
      this.stopMemoryMonitoring();
    }
  }

  /**
   * Record performance metrics in baseline manager
   */
  async recordPerformanceBaseline(buildType) {
    const cacheHitRate = this.metrics.cacheStats.cacheEffectiveness / 100;
    
    this.performanceMonitor.updateBaseline(
      'build-system',
      `${buildType}-build`,
      {
        duration: this.metrics.totalBuildTime,
        dependencyTime: this.metrics.dependencyResolutionTime,
        fileOperationTime: this.metrics.fileOperationTime,
        memoryUsage: this.metrics.memoryUsage.peak,
        success: true,
        cacheHit: cacheHitRate > 0.5,
        buildType,
        typescriptTime: this.metrics.typescriptCompileTime,
        tsupTime: this.metrics.tsupBundleTime
      }
    );
  }

  /**
   * Generate performance report
   */
  async generateReport(buildType) {
    const report = {
      timestamp: new Date().toISOString(),
      buildType,
      performance: {
        totalBuildTime: this.metrics.totalBuildTime,
        totalBuildTimeFormatted: this.formatDuration(this.metrics.totalBuildTime),
        breakdown: {
          typescript: {
            duration: this.metrics.typescriptCompileTime,
            durationFormatted: this.formatDuration(this.metrics.typescriptCompileTime),
            percentage: ((this.metrics.typescriptCompileTime / this.metrics.totalBuildTime) * 100).toFixed(1)
          },
          tsup: {
            duration: this.metrics.tsupBundleTime,
            durationFormatted: this.formatDuration(this.metrics.tsupBundleTime),
            percentage: ((this.metrics.tsupBundleTime / this.metrics.totalBuildTime) * 100).toFixed(1)
          },
          dependencies: {
            duration: this.metrics.dependencyResolutionTime,
            durationFormatted: this.formatDuration(this.metrics.dependencyResolutionTime),
            percentage: ((this.metrics.dependencyResolutionTime / this.metrics.totalBuildTime) * 100).toFixed(1)
          }
        }
      },
      cache: {
        effectiveness: this.metrics.cacheStats.cacheEffectiveness.toFixed(1),
        typescript: {
          hits: this.metrics.cacheStats.typescriptCacheHits,
          misses: this.metrics.cacheStats.typescriptCacheMisses
        },
        tsup: {
          hits: this.metrics.cacheStats.tsupCacheHits,
          misses: this.metrics.cacheStats.tsupCacheMisses
        }
      },
      memory: {
        peak: this.metrics.memoryUsage.peak.toFixed(2),
        average: this.metrics.memoryUsage.average.toFixed(2),
        unit: 'MB'
      },
      buildSteps: this.metrics.buildSteps.map(step => ({
        name: step.name,
        duration: step.duration,
        durationFormatted: this.formatDuration(step.duration),
        percentage: ((step.duration / this.metrics.totalBuildTime) * 100).toFixed(1)
      }))
    };

    // Console output
    console.log('\n' + chalk.blue('📊 Build Performance Report:'));
    console.log(chalk.green(`⏱️  Total build time: ${report.performance.totalBuildTimeFormatted}`));
    
    console.log('\n📝 Build step breakdown:');
    if (report.performance.breakdown.typescript.duration > 0) {
      console.log(`  TypeScript: ${report.performance.breakdown.typescript.durationFormatted} (${report.performance.breakdown.typescript.percentage}%)`);
    }
    if (report.performance.breakdown.tsup.duration > 0) {
      console.log(`  TSUP bundling: ${report.performance.breakdown.tsup.durationFormatted} (${report.performance.breakdown.tsup.percentage}%)`);
    }
    if (report.performance.breakdown.dependencies.duration > 0) {
      console.log(`  Dependency resolution: ${report.performance.breakdown.dependencies.durationFormatted} (${report.performance.breakdown.dependencies.percentage}%)`);
    }

    console.log('\n🗄️  Cache effectiveness:');
    console.log(`  Overall: ${report.cache.effectiveness}%`);
    console.log(`  TypeScript: ${report.cache.typescript.hits} hits, ${report.cache.typescript.misses} misses`);
    console.log(`  TSUP: ${report.cache.tsup.hits} hits, ${report.cache.tsup.misses} misses`);

    console.log('\n🧠 Memory usage:');
    console.log(`  Peak: ${report.memory.peak} MB`);
    console.log(`  Average: ${report.memory.average} MB`);

    // Generate optimization recommendations
    this.generateOptimizationRecommendations(report);

    // Output JSON for CI if needed
    if (this.options.reportToCI) {
      console.log('\n📊 JSON Report:');
      console.log(JSON.stringify(report, null, 2));
    }

    // Save report to file
    const reportPath = path.join(projectRoot, '.performance', 'build', `build-report-${Date.now()}.json`);
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      if (this.options.verbose) {
        console.log(chalk.gray(`📄 Report saved to: ${reportPath}`));
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to save report: ${error.message}`));
    }

    return report;
  }

  /**
   * Generate optimization recommendations based on performance data
   */
  generateOptimizationRecommendations(report) {
    console.log('\n💡 Optimization Recommendations:');
    
    const recommendations = [];
    
    // Check build time
    if (this.metrics.totalBuildTime > 30000) { // 30 seconds
      recommendations.push('Build time is high - consider using --no-dts flag for development builds');
    }
    
    // Check TypeScript compilation time
    if (this.metrics.typescriptCompileTime > 15000) { // 15 seconds
      recommendations.push('TypeScript compilation is slow - enable incremental builds and check tsconfig');
    }
    
    // Check cache effectiveness
    if (this.metrics.cacheStats.cacheEffectiveness < 50) {
      recommendations.push('Cache effectiveness is low - ensure cache directories are preserved between builds');
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage.peak > 1000) { // 1GB
      recommendations.push('High memory usage detected - consider reducing concurrent processes');
    }
    
    // Check step balance
    const tsupPercentage = (this.metrics.tsupBundleTime / this.metrics.totalBuildTime) * 100;
    if (tsupPercentage > 70) {
      recommendations.push('TSUP bundling dominates build time - check bundle splitting and external deps');
    }

    if (recommendations.length === 0) {
      console.log(chalk.green('  ✅ Build performance looks good!'));
    } else {
      recommendations.forEach((rec, index) => {
        console.log(chalk.yellow(`  ${index + 1}. ${rec}`));
      });
    }
  }

  /**
   * Format duration in human readable format
   */
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Get performance trends if baseline tracking is enabled
   */
  async getPerformanceTrends() {
    if (!this.performanceMonitor) {
      return null;
    }
    
    return this.performanceMonitor.analyzeTrends('build-system');
  }

  /**
   * Detect performance regressions
   */
  async detectRegressions() {
    if (!this.performanceMonitor) {
      return null;
    }
    
    return this.performanceMonitor.detectGradualRegressions({
      gradualRegressionPercent: 20, // 20% regression threshold
      timeWindowDays: 7,
      minDataPoints: 3
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const buildType = args.includes('--dev') ? 'development' : 'production';
  const verbose = args.includes('--verbose') || process.env.BUILD_PERF_VERBOSE === 'true';
  const skipBaseline = args.includes('--no-baseline');
  
  const monitor = new BuildPerformanceMonitor({
    verbose,
    baselineTracking: !skipBaseline,
    reportToCI: args.includes('--ci') || process.env.CI === 'true'
  });

  try {
    await monitor.runMonitoredBuild(buildType);
    
    // Show trends if available
    if (!skipBaseline) {
      const trends = await monitor.getPerformanceTrends();
      if (trends && trends.length > 0) {
        console.log('\n📈 Performance Trends:');
        trends.forEach(trend => {
          const icon = trend.trendType === 'improving' ? '📈' : 
                      trend.trendType === 'degrading' ? '📉' : '📊';
          console.log(`  ${icon} ${trend.testKey}: ${trend.trendType} (${trend.trendPercentage.toFixed(1)}%)`);
        });
      }
      
      // Check for regressions
      const regressions = await monitor.detectRegressions();
      if (regressions && regressions.length > 0) {
        console.log(chalk.yellow('\n⚠️  Performance Regressions Detected:'));
        regressions.forEach(reg => {
          console.log(chalk.yellow(`  • ${reg.testKey}: ${reg.severity} ${reg.regressionType} regression (${reg.totalChange.toFixed(1)}%)`));
          console.log(chalk.gray(`    ${reg.recommendation}`));
        });
      }
    }
    
    console.log(chalk.green('\n✅ Build performance monitoring complete!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Build performance monitoring failed:'), error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BuildPerformanceMonitor };