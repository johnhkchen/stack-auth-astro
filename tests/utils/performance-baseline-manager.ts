/**
 * Enhanced Performance Baseline Manager
 * 
 * Provides versioned baseline storage, environment-aware management,
 * historical tracking, and team collaboration features for performance baselines.
 */

import { readFileContent, fileExists, writeFileContent, createDirectory } from './file-helpers.js';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Version 2 baseline with enhanced tracking capabilities
 */
interface PerformanceBaselineV2 {
  testFile: string;
  testName: string;
  version: number;
  metrics: {
    averageDuration: number;
    p50Duration: number;
    p90Duration: number;
    p95Duration: number;
    p99Duration: number;
    minDuration: number;
    maxDuration: number;
    standardDeviation: number;
    dependencyResolutionTime: number;
    fileOperationTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  qualityMetrics: {
    successRate: number;
    cacheHitRate: number;
    errorRate: number;
    timeoutRate: number;
  };
  environmentInfo: {
    fingerprint: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuCount: number;
    totalMemory: number;
    isCI: boolean;
    ciProvider?: string;
    branch?: string;
    commit?: string;
  };
  history: HistoricalDataPoint[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    lastRunAt: number;
    totalRuns: number;
    validRuns: number;
    tags: string[];
    notes?: string;
  };
}

interface HistoricalDataPoint {
  timestamp: number;
  duration: number;
  successRate: number;
  cacheHitRate: number;
  environment: string;
  commit?: string;
  branch?: string;
  runId: string;
}

interface BaselineArchive {
  version: string;
  archivedAt: number;
  reason: string;
  baselines: PerformanceBaselineV2[];
  metadata: {
    totalTests: number;
    environments: string[];
    dateRange: {
      from: number;
      to: number;
    };
  };
}

interface PerformanceTrend {
  testKey: string;
  trendType: 'improving' | 'degrading' | 'stable' | 'volatile';
  trendPercentage: number;
  confidence: number;
  dataPoints: number;
  recommendation: string;
  projectedValue?: number;
}

interface BaselineComparison {
  testKey: string;
  environment1: string;
  environment2: string;
  performanceDiff: number;
  qualityDiff: {
    successRate: number;
    cacheHitRate: number;
  };
  recommendation: string;
}

interface BaselineManagementOptions {
  baselineDir?: string;
  archiveDir?: string;
  maxHistoryPoints?: number;
  autoArchiveAfterDays?: number;
  environmentSeparation?: boolean;
  enableTrendAnalysis?: boolean;
  compressionEnabled?: boolean;
}

export class PerformanceBaselineManager {
  private options: Required<BaselineManagementOptions>;
  private baselines: Map<string, PerformanceBaselineV2> = new Map();
  private archives: BaselineArchive[] = [];
  private currentEnvironment: string;

  constructor(options: BaselineManagementOptions = {}) {
    this.options = {
      baselineDir: options.baselineDir || '.performance',
      archiveDir: options.archiveDir || '.performance/archives',
      maxHistoryPoints: options.maxHistoryPoints || 100,
      autoArchiveAfterDays: options.autoArchiveAfterDays || 30,
      environmentSeparation: options.environmentSeparation ?? true,
      enableTrendAnalysis: options.enableTrendAnalysis ?? true,
      compressionEnabled: options.compressionEnabled ?? false
    };

    this.currentEnvironment = this.getEnvironmentFingerprint();
    this.initialize();
  }

  private initialize(): void {
    // Create directories if they don't exist
    createDirectory(this.options.baselineDir);
    createDirectory(this.options.archiveDir);

    // Load baselines for current environment
    this.loadBaselines();
    
    // Load archives metadata
    this.loadArchiveMetadata();

    // Perform auto-cleanup if needed
    this.performAutoCleanup();
  }

  private getEnvironmentFingerprint(): string {
    const os = require('os');
    const components = [
      process.version,
      process.platform,
      process.arch,
      os.cpus().length.toString(),
      Math.floor(os.totalmem() / (1024 * 1024 * 1024)).toString() + 'GB',
      process.env.CI ? 'ci' : 'local',
      process.env.CI_PROVIDER || process.env.GITHUB_ACTIONS ? 'github' : 
        process.env.CIRCLECI ? 'circle' :
        process.env.TRAVIS ? 'travis' : 
        'unknown'
    ].filter(Boolean);

    return createHash('sha256')
      .update(components.join('-'))
      .digest('hex')
      .substring(0, 12);
  }

  private getBaselineFilePath(environment?: string): string {
    const env = environment || this.currentEnvironment;
    if (this.options.environmentSeparation) {
      return path.join(this.options.baselineDir, `baselines-${env}.json`);
    }
    return path.join(this.options.baselineDir, 'baselines.json');
  }

  private loadBaselines(): void {
    const filePath = this.getBaselineFilePath();
    
    if (!fileExists(filePath)) {
      return;
    }

    try {
      const content = readFileContent(filePath);
      const data = JSON.parse(content || '{"baselines": []}');
      
      for (const baseline of data.baselines || []) {
        const key = this.getBaselineKey(baseline.testFile, baseline.testName);
        
        // Migrate old baselines to v2 format if needed
        const v2Baseline = this.migrateBaselineToV2(baseline);
        this.baselines.set(key, v2Baseline);
      }
    } catch (error) {
      console.warn(`Failed to load baselines from ${filePath}: ${error}`);
    }
  }

  private migrateBaselineToV2(baseline: any): PerformanceBaselineV2 {
    // If already v2, return as is
    if (baseline.version === 2) {
      return baseline;
    }

    // Migrate from v1 to v2
    const os = require('os');
    return {
      testFile: baseline.testFile,
      testName: baseline.testName,
      version: 2,
      metrics: {
        averageDuration: baseline.averageDuration || 0,
        p50Duration: baseline.averageDuration || 0,
        p90Duration: baseline.averageDuration * 1.2 || 0,
        p95Duration: baseline.averageDuration * 1.3 || 0,
        p99Duration: baseline.averageDuration * 1.5 || 0,
        minDuration: baseline.averageDuration * 0.8 || 0,
        maxDuration: baseline.averageDuration * 1.5 || 0,
        standardDeviation: 0,
        dependencyResolutionTime: baseline.dependencyResolutionTime || 0,
        fileOperationTime: baseline.fileOperationTime || 0
      },
      qualityMetrics: {
        successRate: baseline.successRate || 1,
        cacheHitRate: baseline.cacheHitRate || 0,
        errorRate: 0,
        timeoutRate: 0
      },
      environmentInfo: {
        fingerprint: baseline.environmentFingerprint || this.currentEnvironment,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        isCI: !!process.env.CI,
        ciProvider: process.env.CI_PROVIDER
      },
      history: [],
      metadata: {
        createdAt: baseline.timestamp || Date.now(),
        updatedAt: Date.now(),
        lastRunAt: baseline.timestamp || Date.now(),
        totalRuns: baseline.runs || 1,
        validRuns: baseline.runs || 1,
        tags: [],
        notes: 'Migrated from v1 baseline'
      }
    };
  }

  private saveBaselines(): void {
    const filePath = this.getBaselineFilePath();
    
    try {
      const data = {
        version: '2.0.0',
        environment: this.currentEnvironment,
        lastUpdated: new Date().toISOString(),
        baselines: Array.from(this.baselines.values())
      };
      
      const content = this.options.compressionEnabled 
        ? this.compressData(JSON.stringify(data))
        : JSON.stringify(data, null, 2);
      
      writeFileContent(filePath, content);
    } catch (error) {
      console.error(`Failed to save baselines to ${filePath}: ${error}`);
    }
  }

  private compressData(data: string): string {
    // Simple compression placeholder - in production use zlib
    return data;
  }

  private decompressData(data: string): string {
    // Simple decompression placeholder - in production use zlib
    return data;
  }

  private getBaselineKey(testFile: string, testName: string): string {
    return `${testFile}::${testName}`;
  }

  private loadArchiveMetadata(): void {
    const metadataPath = path.join(this.options.archiveDir, 'metadata.json');
    
    if (!fileExists(metadataPath)) {
      return;
    }

    try {
      const content = readFileContent(metadataPath);
      const data = JSON.parse(content || '{"archives": []}');
      this.archives = data.archives || [];
    } catch (error) {
      console.warn(`Failed to load archive metadata: ${error}`);
    }
  }

  private saveArchiveMetadata(): void {
    const metadataPath = path.join(this.options.archiveDir, 'metadata.json');
    
    try {
      const data = {
        lastUpdated: new Date().toISOString(),
        archives: this.archives
      };
      
      writeFileContent(metadataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to save archive metadata: ${error}`);
    }
  }

  private performAutoCleanup(): void {
    const now = Date.now();
    const archiveThreshold = now - (this.options.autoArchiveAfterDays * 24 * 60 * 60 * 1000);
    
    const toArchive: PerformanceBaselineV2[] = [];
    
    for (const [key, baseline] of this.baselines.entries()) {
      // Archive old baselines
      if (baseline.metadata.lastRunAt < archiveThreshold) {
        toArchive.push(baseline);
        this.baselines.delete(key);
      }
      
      // Trim history if too long
      if (baseline.history.length > this.options.maxHistoryPoints) {
        baseline.history = baseline.history.slice(-this.options.maxHistoryPoints);
      }
    }
    
    if (toArchive.length > 0) {
      this.archiveBaselines(toArchive, 'auto-cleanup');
    }
  }

  /**
   * Update or create a baseline with new test results
   */
  public updateBaseline(
    testFile: string,
    testName: string,
    metrics: {
      duration: number;
      dependencyTime?: number;
      fileOperationTime?: number;
      memoryUsage?: number;
      cpuUsage?: number;
      success: boolean;
      cacheHit?: boolean;
      error?: boolean;
      timeout?: boolean;
    }
  ): PerformanceBaselineV2 {
    const key = this.getBaselineKey(testFile, testName);
    const existing = this.baselines.get(key);
    
    if (existing && existing.environmentInfo.fingerprint === this.currentEnvironment) {
      // Update existing baseline
      return this.updateExistingBaseline(existing, metrics);
    } else {
      // Create new baseline
      return this.createNewBaseline(testFile, testName, metrics);
    }
  }

  private updateExistingBaseline(
    baseline: PerformanceBaselineV2,
    metrics: any
  ): PerformanceBaselineV2 {
    const runId = createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8);

    // Add to history
    baseline.history.push({
      timestamp: Date.now(),
      duration: metrics.duration,
      successRate: metrics.success ? 1 : 0,
      cacheHitRate: metrics.cacheHit ? 1 : 0,
      environment: this.currentEnvironment,
      commit: process.env.GITHUB_SHA,
      branch: process.env.GITHUB_REF?.replace('refs/heads/', ''),
      runId
    });

    // Trim history if needed
    if (baseline.history.length > this.options.maxHistoryPoints) {
      baseline.history = baseline.history.slice(-this.options.maxHistoryPoints);
    }

    // Update metrics with running statistics
    const validRuns = baseline.metadata.validRuns;
    const newValidRuns = validRuns + 1;

    // Update duration metrics
    baseline.metrics.averageDuration = 
      (baseline.metrics.averageDuration * validRuns + metrics.duration) / newValidRuns;
    
    baseline.metrics.minDuration = Math.min(baseline.metrics.minDuration, metrics.duration);
    baseline.metrics.maxDuration = Math.max(baseline.metrics.maxDuration, metrics.duration);

    // Update percentiles (simplified - in production use proper percentile calculation)
    const sortedDurations = baseline.history
      .map(h => h.duration)
      .sort((a, b) => a - b);
    
    baseline.metrics.p50Duration = this.calculatePercentile(sortedDurations, 50);
    baseline.metrics.p90Duration = this.calculatePercentile(sortedDurations, 90);
    baseline.metrics.p95Duration = this.calculatePercentile(sortedDurations, 95);
    baseline.metrics.p99Duration = this.calculatePercentile(sortedDurations, 99);
    baseline.metrics.standardDeviation = this.calculateStandardDeviation(sortedDurations);

    // Update dependency and file operation times
    if (metrics.dependencyTime !== undefined) {
      baseline.metrics.dependencyResolutionTime = 
        (baseline.metrics.dependencyResolutionTime * validRuns + metrics.dependencyTime) / newValidRuns;
    }
    
    if (metrics.fileOperationTime !== undefined) {
      baseline.metrics.fileOperationTime = 
        (baseline.metrics.fileOperationTime * validRuns + metrics.fileOperationTime) / newValidRuns;
    }

    // Update quality metrics
    baseline.qualityMetrics.successRate = 
      (baseline.qualityMetrics.successRate * validRuns + (metrics.success ? 1 : 0)) / newValidRuns;
    
    if (metrics.cacheHit !== undefined) {
      baseline.qualityMetrics.cacheHitRate = 
        (baseline.qualityMetrics.cacheHitRate * validRuns + (metrics.cacheHit ? 1 : 0)) / newValidRuns;
    }

    // Update metadata
    baseline.metadata.updatedAt = Date.now();
    baseline.metadata.lastRunAt = Date.now();
    baseline.metadata.totalRuns++;
    baseline.metadata.validRuns = newValidRuns;

    this.baselines.set(this.getBaselineKey(baseline.testFile, baseline.testName), baseline);
    this.saveBaselines();
    
    return baseline;
  }

  private createNewBaseline(
    testFile: string,
    testName: string,
    metrics: any
  ): PerformanceBaselineV2 {
    const os = require('os');
    const runId = createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8);

    const baseline: PerformanceBaselineV2 = {
      testFile,
      testName,
      version: 2,
      metrics: {
        averageDuration: metrics.duration,
        p50Duration: metrics.duration,
        p90Duration: metrics.duration,
        p95Duration: metrics.duration,
        p99Duration: metrics.duration,
        minDuration: metrics.duration,
        maxDuration: metrics.duration,
        standardDeviation: 0,
        dependencyResolutionTime: metrics.dependencyTime || 0,
        fileOperationTime: metrics.fileOperationTime || 0,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage
      },
      qualityMetrics: {
        successRate: metrics.success ? 1 : 0,
        cacheHitRate: metrics.cacheHit ? 1 : 0,
        errorRate: metrics.error ? 1 : 0,
        timeoutRate: metrics.timeout ? 1 : 0
      },
      environmentInfo: {
        fingerprint: this.currentEnvironment,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        isCI: !!process.env.CI,
        ciProvider: process.env.CI_PROVIDER,
        branch: process.env.GITHUB_REF?.replace('refs/heads/', ''),
        commit: process.env.GITHUB_SHA
      },
      history: [{
        timestamp: Date.now(),
        duration: metrics.duration,
        successRate: metrics.success ? 1 : 0,
        cacheHitRate: metrics.cacheHit ? 1 : 0,
        environment: this.currentEnvironment,
        commit: process.env.GITHUB_SHA,
        branch: process.env.GITHUB_REF?.replace('refs/heads/', ''),
        runId
      }],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastRunAt: Date.now(),
        totalRuns: 1,
        validRuns: 1,
        tags: [],
        notes: 'Auto-created baseline'
      }
    };

    this.baselines.set(this.getBaselineKey(testFile, testName), baseline);
    this.saveBaselines();
    
    return baseline;
  }

  /**
   * Calculate percentile using the nearest-rank method with interpolation
   * This method ensures that common percentiles return intuitive values:
   * - For P50 of [10,20,30,40,50,60,70,80,90,100], returns 50
   * - For P90 of [10,20,30,40,50,60,70,80,90,100], returns 90
   * Uses the formula: index = (percentile/100) * n, then takes the value at that index (1-based)
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];
    
    // Calculate the rank (1-based position)
    const rank = (percentile / 100) * sortedValues.length;
    
    // If rank is exactly an integer, use that value
    if (Number.isInteger(rank)) {
      return sortedValues[rank - 1]; // Convert to 0-based index
    }
    
    // Otherwise, interpolate between floor and ceiling
    const lower = Math.floor(rank) - 1; // Convert to 0-based index
    const upper = Math.ceil(rank) - 1;  // Convert to 0-based index
    
    // Ensure indices are within bounds
    const lowerIndex = Math.max(0, Math.min(lower, sortedValues.length - 1));
    const upperIndex = Math.max(0, Math.min(upper, sortedValues.length - 1));
    
    if (lowerIndex === upperIndex) {
      return sortedValues[lowerIndex];
    }
    
    // Linear interpolation
    const weight = rank - Math.floor(rank);
    return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Archive baselines for long-term storage
   */
  public archiveBaselines(baselines: PerformanceBaselineV2[], reason: string): void {
    if (baselines.length === 0) return;

    const archive: BaselineArchive = {
      version: '2.0.0',
      archivedAt: Date.now(),
      reason,
      baselines,
      metadata: {
        totalTests: baselines.length,
        environments: [...new Set(baselines.map(b => b.environmentInfo.fingerprint))],
        dateRange: {
          from: Math.min(...baselines.map(b => b.metadata.createdAt)),
          to: Math.max(...baselines.map(b => b.metadata.lastRunAt))
        }
      }
    };

    const archiveFile = path.join(
      this.options.archiveDir,
      `archive-${Date.now()}-${createHash('sha256')
        .update(reason)
        .digest('hex')
        .substring(0, 8)}.json`
    );

    try {
      writeFileContent(archiveFile, JSON.stringify(archive, null, 2));
      this.archives.push({
        ...archive,
        baselines: [] // Don't store full baselines in metadata
      });
      this.saveArchiveMetadata();
    } catch (error) {
      console.error(`Failed to archive baselines: ${error}`);
    }
  }

  /**
   * Analyze performance trends over time with enhanced gradual regression detection
   */
  public analyzeTrends(testFile?: string, testName?: string): PerformanceTrend[] {
    if (!this.options.enableTrendAnalysis) {
      return [];
    }

    const trends: PerformanceTrend[] = [];
    const baselinestoAnalyze = testFile && testName 
      ? [this.baselines.get(this.getBaselineKey(testFile, testName))].filter(Boolean)
      : Array.from(this.baselines.values());

    for (const baseline of baselinestoAnalyze) {
      if (!baseline || baseline.history.length < 5) {
        continue; // Need enough data points for trend analysis
      }

      const trend = this.calculateTrend(baseline);
      trends.push(trend);
    }

    return trends;
  }

  /**
   * Detect gradual regression patterns over time
   */
  public detectGradualRegressions(thresholds: {
    gradualRegressionPercent?: number;
    timeWindowDays?: number;
    minDataPoints?: number;
    confidenceThreshold?: number;
  } = {}): Array<{
    testKey: string;
    regressionType: 'gradual' | 'sudden' | 'volatile';
    severity: 'minor' | 'moderate' | 'severe';
    timespan: number;
    totalChange: number;
    averageChangePerDay: number;
    confidence: number;
    affectedMetrics: string[];
    recommendation: string;
  }> {
    const config = {
      gradualRegressionPercent: thresholds.gradualRegressionPercent || 15, // 15% over time window
      timeWindowDays: thresholds.timeWindowDays || 7, // Look at last 7 days
      minDataPoints: thresholds.minDataPoints || 5,
      confidenceThreshold: thresholds.confidenceThreshold || 70
    };

    const regressions = [];
    const timeWindowMs = config.timeWindowDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeWindowMs;

    for (const [testKey, baseline] of this.baselines.entries()) {
      if (baseline.history.length < config.minDataPoints) {
        continue;
      }

      // Filter to recent history within time window
      const recentHistory = baseline.history
        .filter(h => h.timestamp >= cutoffTime)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (recentHistory.length < config.minDataPoints) {
        continue;
      }

      // Check for gradual duration regression
      const durationRegression = this.analyzeMetricRegression(
        recentHistory.map(h => ({ timestamp: h.timestamp, value: h.duration })),
        config
      );

      // Check for success rate degradation
      const successRateRegression = this.analyzeMetricRegression(
        recentHistory.map(h => ({ timestamp: h.timestamp, value: h.successRate })),
        { ...config, invertTrend: true } // Lower success rate is worse
      );

      // Check for cache hit rate degradation  
      const cacheHitRegression = this.analyzeMetricRegression(
        recentHistory.map(h => ({ timestamp: h.timestamp, value: h.cacheHitRate })),
        { ...config, invertTrend: true } // Lower cache hit rate is worse
      );

      const affectedMetrics = [];
      let worstRegression = null;

      if (durationRegression.isRegression) {
        affectedMetrics.push('duration');
        worstRegression = durationRegression;
      }
      if (successRateRegression.isRegression) {
        affectedMetrics.push('success_rate');
        if (!worstRegression || successRateRegression.severity > worstRegression.severity) {
          worstRegression = successRateRegression;
        }
      }
      if (cacheHitRegression.isRegression) {
        affectedMetrics.push('cache_hit_rate');
        if (!worstRegression || cacheHitRegression.severity > worstRegression.severity) {
          worstRegression = cacheHitRegression;
        }
      }

      if (affectedMetrics.length > 0 && worstRegression) {
        regressions.push({
          testKey,
          regressionType: worstRegression.regressionType,
          severity: this.mapSeverityScore(worstRegression.severity),
          timespan: timeWindowMs,
          totalChange: worstRegression.totalChange,
          averageChangePerDay: worstRegression.averageChangePerDay,
          confidence: worstRegression.confidence,
          affectedMetrics,
          recommendation: this.generateRegressionRecommendation(affectedMetrics, worstRegression)
        });
      }
    }

    return regressions.sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeMetricRegression(
    dataPoints: Array<{ timestamp: number; value: number }>,
    config: { gradualRegressionPercent: number; timeWindowDays: number; invertTrend?: boolean }
  ): {
    isRegression: boolean;
    regressionType: 'gradual' | 'sudden' | 'volatile';
    severity: number;
    totalChange: number;
    averageChangePerDay: number;
    confidence: number;
  } {
    if (dataPoints.length < 3) {
      return {
        isRegression: false,
        regressionType: 'gradual',
        severity: 0,
        totalChange: 0,
        averageChangePerDay: 0,
        confidence: 0
      };
    }

    // Calculate linear trend
    const n = dataPoints.length;
    const timestamps = dataPoints.map(d => d.timestamp);
    const values = dataPoints.map(d => d.value);

    // Normalize timestamps to days from first point
    const firstTimestamp = timestamps[0];
    const dayTimestamps = timestamps.map(t => (t - firstTimestamp) / (24 * 60 * 60 * 1000));

    // Linear regression calculation
    const sumX = dayTimestamps.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = dayTimestamps.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = dayTimestamps.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssRes = dayTimestamps.reduce((sum, x, i) => {
      const predicted = slope * x + intercept;
      return sum + Math.pow(values[i] - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssRes / ssTotal);

    // Calculate total change percentage
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const totalChangePercent = ((lastValue - firstValue) / firstValue) * 100;

    // Invert trend direction if needed (for success rate, cache hit rate)
    const adjustedChange = config.invertTrend ? -totalChangePercent : totalChangePercent;
    const adjustedSlope = config.invertTrend ? -slope : slope;

    // Determine if this is a regression
    const isRegression = adjustedChange > config.gradualRegressionPercent;
    
    // Calculate volatility
    const volatility = Math.sqrt(values.reduce((sum, v, i) => {
      const expected = slope * dayTimestamps[i] + intercept;
      return sum + Math.pow(v - expected, 2);
    }, 0) / n) / (sumY / n) * 100;

    // Determine regression type
    let regressionType: 'gradual' | 'sudden' | 'volatile' = 'gradual';
    if (volatility > 30) {
      regressionType = 'volatile';
    } else if (adjustedChange > config.gradualRegressionPercent * 2) {
      regressionType = 'sudden';
    }

    // Calculate severity score (0-100)
    const severityScore = Math.min(100, 
      (Math.abs(adjustedChange) / config.gradualRegressionPercent) * 50 + 
      Math.max(0, (rSquared * 50))
    );

    return {
      isRegression,
      regressionType,
      severity: severityScore,
      totalChange: adjustedChange,
      averageChangePerDay: adjustedSlope,
      confidence: rSquared * 100
    };
  }

  private mapSeverityScore(score: number): 'minor' | 'moderate' | 'severe' {
    if (score >= 75) return 'severe';
    if (score >= 50) return 'moderate';
    return 'minor';
  }

  private generateRegressionRecommendation(
    affectedMetrics: string[],
    regression: { regressionType: string; totalChange: number; averageChangePerDay: number }
  ): string {
    const recommendations = [];

    if (affectedMetrics.includes('duration')) {
      if (regression.regressionType === 'sudden') {
        recommendations.push('Recent changes may have introduced performance bottlenecks - review latest commits');
      } else {
        recommendations.push('Gradual performance degradation detected - profile and optimize slow operations');
      }
    }

    if (affectedMetrics.includes('success_rate')) {
      recommendations.push('Success rate declining - investigate failing tests and error patterns');
    }

    if (affectedMetrics.includes('cache_hit_rate')) {
      recommendations.push('Cache efficiency dropping - review cache configuration and invalidation patterns');
    }

    if (regression.regressionType === 'volatile') {
      recommendations.push('Performance is unstable - consider environmental factors and test consistency');
    }

    return recommendations.length > 0 
      ? recommendations.join('; ')
      : 'Monitor performance closely and consider optimization efforts';
  }

  private calculateTrend(baseline: PerformanceBaselineV2): PerformanceTrend {
    const recentHistory = baseline.history.slice(-20); // Last 20 data points
    const durations = recentHistory.map(h => h.duration);
    
    // Simple linear regression for trend
    const n = durations.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = durations.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * durations[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate trend percentage (change over the period)
    const firstValue = intercept;
    const lastValue = slope * (n - 1) + intercept;
    const trendPercentage = ((lastValue - firstValue) / firstValue) * 100;
    
    // Calculate volatility (coefficient of variation)
    const mean = sumY / n;
    const stdDev = baseline.metrics.standardDeviation;
    const volatility = (stdDev / mean) * 100;
    
    // Determine trend type
    let trendType: PerformanceTrend['trendType'];
    if (Math.abs(trendPercentage) < 5) {
      trendType = 'stable';
    } else if (volatility > 30) {
      trendType = 'volatile';
    } else if (trendPercentage > 0) {
      trendType = 'degrading';
    } else {
      trendType = 'improving';
    }
    
    // Calculate confidence based on data points and volatility
    const confidence = Math.max(0, Math.min(100, 
      (n / 20) * 100 * (1 - volatility / 100)
    ));
    
    // Generate recommendation
    let recommendation = '';
    if (trendType === 'degrading' && confidence > 70) {
      recommendation = 'Performance is degrading. Investigate recent changes.';
    } else if (trendType === 'volatile') {
      recommendation = 'Performance is unstable. Consider environmental factors.';
    } else if (trendType === 'improving') {
      recommendation = 'Performance is improving. Recent optimizations are working.';
    } else {
      recommendation = 'Performance is stable.';
    }
    
    return {
      testKey: this.getBaselineKey(baseline.testFile, baseline.testName),
      trendType,
      trendPercentage,
      confidence,
      dataPoints: n,
      recommendation,
      projectedValue: lastValue + slope * 5 // Project 5 runs into the future
    };
  }

  /**
   * Compare baselines across environments
   */
  public compareEnvironments(environment1: string, environment2: string): BaselineComparison[] {
    const comparisons: BaselineComparison[] = [];
    
    // Load baselines for both environments
    const baselines1 = this.loadBaselinesForEnvironment(environment1);
    const baselines2 = this.loadBaselinesForEnvironment(environment2);
    
    // Find common tests
    for (const [key, baseline1] of baselines1.entries()) {
      const baseline2 = baselines2.get(key);
      
      if (!baseline2) continue;
      
      const performanceDiff = 
        ((baseline2.metrics.averageDuration - baseline1.metrics.averageDuration) / 
         baseline1.metrics.averageDuration) * 100;
      
      const qualityDiff = {
        successRate: baseline2.qualityMetrics.successRate - baseline1.qualityMetrics.successRate,
        cacheHitRate: baseline2.qualityMetrics.cacheHitRate - baseline1.qualityMetrics.cacheHitRate
      };
      
      let recommendation = '';
      if (Math.abs(performanceDiff) > 20) {
        recommendation = `Significant performance difference (${performanceDiff.toFixed(1)}%). `;
        if (performanceDiff > 0) {
          recommendation += `${environment2} is slower than ${environment1}.`;
        } else {
          recommendation += `${environment2} is faster than ${environment1}.`;
        }
      } else {
        recommendation = 'Performance is consistent across environments.';
      }
      
      comparisons.push({
        testKey: key,
        environment1,
        environment2,
        performanceDiff,
        qualityDiff,
        recommendation
      });
    }
    
    return comparisons;
  }

  private loadBaselinesForEnvironment(environment: string): Map<string, PerformanceBaselineV2> {
    const baselines = new Map<string, PerformanceBaselineV2>();
    const filePath = this.getBaselineFilePath(environment);
    
    if (!fileExists(filePath)) {
      return baselines;
    }

    try {
      const content = readFileContent(filePath);
      const data = JSON.parse(content || '{"baselines": []}');
      
      for (const baseline of data.baselines || []) {
        const key = this.getBaselineKey(baseline.testFile, baseline.testName);
        baselines.set(key, this.migrateBaselineToV2(baseline));
      }
    } catch (error) {
      console.warn(`Failed to load baselines for environment ${environment}: ${error}`);
    }
    
    return baselines;
  }

  /**
   * Export baselines for team sharing
   */
  public exportBaselines(options: {
    environment?: string;
    testFilter?: (baseline: PerformanceBaselineV2) => boolean;
    includeHistory?: boolean;
    format?: 'json' | 'csv';
  } = {}): string {
    const baselinestoExport = options.environment 
      ? Array.from(this.loadBaselinesForEnvironment(options.environment).values())
      : Array.from(this.baselines.values());
    
    const filtered = options.testFilter 
      ? baselinestoExport.filter(options.testFilter)
      : baselinestoExport;
    
    if (!options.includeHistory) {
      // Remove history for smaller export
      filtered.forEach(b => {
        b.history = b.history.slice(-10); // Keep only last 10 entries
      });
    }
    
    if (options.format === 'csv') {
      return this.exportAsCSV(filtered);
    }
    
    return JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      environment: options.environment || this.currentEnvironment,
      baselines: filtered
    }, null, 2);
  }

  private exportAsCSV(baselines: PerformanceBaselineV2[]): string {
    const headers = [
      'Test File',
      'Test Name',
      'Average Duration (ms)',
      'P50 Duration (ms)',
      'P90 Duration (ms)',
      'P95 Duration (ms)',
      'Success Rate (%)',
      'Cache Hit Rate (%)',
      'Environment',
      'Total Runs',
      'Last Run'
    ];
    
    const rows = baselines.map(b => [
      b.testFile,
      b.testName,
      b.metrics.averageDuration.toFixed(2),
      b.metrics.p50Duration.toFixed(2),
      b.metrics.p90Duration.toFixed(2),
      b.metrics.p95Duration.toFixed(2),
      (b.qualityMetrics.successRate * 100).toFixed(1),
      (b.qualityMetrics.cacheHitRate * 100).toFixed(1),
      b.environmentInfo.fingerprint,
      b.metadata.totalRuns.toString(),
      new Date(b.metadata.lastRunAt).toISOString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Import baselines from export
   */
  public importBaselines(data: string, options: {
    merge?: boolean;
    overwrite?: boolean;
    environment?: string;
  } = {}): { imported: number; skipped: number; errors: string[] } {
    const result = { imported: 0, skipped: 0, errors: [] as string[] };
    
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.baselines || !Array.isArray(parsed.baselines)) {
        result.errors.push('Invalid baseline export format');
        return result;
      }
      
      for (const baseline of parsed.baselines) {
        try {
          const key = this.getBaselineKey(baseline.testFile, baseline.testName);
          const existing = this.baselines.get(key);
          
          if (existing && !options.overwrite && !options.merge) {
            result.skipped++;
            continue;
          }
          
          if (existing && options.merge) {
            // Merge histories and update metrics - avoid duplicates
            const existingTimestamps = new Set(existing.history.map(h => h.timestamp));
            const newHistoryPoints = baseline.history.filter(h => !existingTimestamps.has(h.timestamp));
            existing.history.push(...newHistoryPoints);
            existing.history = existing.history
              .slice(-this.options.maxHistoryPoints)
              .sort((a, b) => a.timestamp - b.timestamp);
            
            // Recalculate metrics based on merged history
            this.recalculateMetrics(existing);
            result.imported++;
          } else {
            // Import as new or overwrite
            this.baselines.set(key, this.migrateBaselineToV2(baseline));
            result.imported++;
          }
        } catch (error) {
          result.errors.push(`Failed to import ${baseline.testFile}::${baseline.testName}: ${error}`);
        }
      }
      
      this.saveBaselines();
    } catch (error) {
      result.errors.push(`Failed to parse import data: ${error}`);
    }
    
    return result;
  }

  private recalculateMetrics(baseline: PerformanceBaselineV2): void {
    if (baseline.history.length === 0) return;
    
    const durations = baseline.history.map(h => h.duration).sort((a, b) => a - b);
    
    baseline.metrics.averageDuration = 
      durations.reduce((sum, d) => sum + d, 0) / durations.length;
    baseline.metrics.minDuration = durations[0];
    baseline.metrics.maxDuration = durations[durations.length - 1];
    baseline.metrics.p50Duration = this.calculatePercentile(durations, 50);
    baseline.metrics.p90Duration = this.calculatePercentile(durations, 90);
    baseline.metrics.p95Duration = this.calculatePercentile(durations, 95);
    baseline.metrics.p99Duration = this.calculatePercentile(durations, 99);
    baseline.metrics.standardDeviation = this.calculateStandardDeviation(durations);
    
    // Recalculate quality metrics
    const successCount = baseline.history.filter(h => h.successRate === 1).length;
    const cacheHitCount = baseline.history.filter(h => h.cacheHitRate === 1).length;
    
    baseline.qualityMetrics.successRate = successCount / baseline.history.length;
    baseline.qualityMetrics.cacheHitRate = cacheHitCount / baseline.history.length;
  }

  /**
   * Reset baselines for specific tests or all
   */
  public resetBaselines(options: {
    testFile?: string;
    testName?: string;
    environment?: string;
    archiveBeforeReset?: boolean;
  } = {}): number {
    let resetCount = 0;
    
    if (options.archiveBeforeReset) {
      const toArchive = options.testFile && options.testName
        ? [this.baselines.get(this.getBaselineKey(options.testFile, options.testName))].filter(Boolean)
        : Array.from(this.baselines.values());
      
      this.archiveBaselines(toArchive, 'manual-reset');
    }
    
    if (options.testFile && options.testName) {
      const key = this.getBaselineKey(options.testFile, options.testName);
      if (this.baselines.delete(key)) {
        resetCount = 1;
      }
    } else if (options.testFile) {
      // Reset all tests in a file
      for (const [key, baseline] of this.baselines.entries()) {
        if (baseline.testFile === options.testFile) {
          this.baselines.delete(key);
          resetCount++;
        }
      }
    } else {
      // Reset all baselines
      resetCount = this.baselines.size;
      this.baselines.clear();
    }
    
    this.saveBaselines();
    return resetCount;
  }

  /**
   * Get baseline for a specific test
   */
  public getBaseline(testFile: string, testName: string): PerformanceBaselineV2 | undefined {
    return this.baselines.get(this.getBaselineKey(testFile, testName));
  }

  /**
   * Get all baselines
   */
  public getAllBaselines(): PerformanceBaselineV2[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Get baselines matching criteria
   */
  public findBaselines(criteria: {
    testFile?: string;
    environment?: string;
    tags?: string[];
    minRuns?: number;
    maxAge?: number;
  }): PerformanceBaselineV2[] {
    let results = Array.from(this.baselines.values());
    
    if (criteria.testFile) {
      results = results.filter(b => b.testFile === criteria.testFile);
    }
    
    if (criteria.environment) {
      results = results.filter(b => b.environmentInfo.fingerprint === criteria.environment);
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(b => 
        criteria.tags!.some(tag => b.metadata.tags.includes(tag))
      );
    }
    
    if (criteria.minRuns) {
      results = results.filter(b => b.metadata.totalRuns >= criteria.minRuns);
    }
    
    if (criteria.maxAge) {
      const cutoff = Date.now() - criteria.maxAge;
      results = results.filter(b => b.metadata.lastRunAt >= cutoff);
    }
    
    return results;
  }

  /**
   * Add tags to baselines for categorization
   */
  public tagBaseline(testFile: string, testName: string, tags: string[]): void {
    const baseline = this.baselines.get(this.getBaselineKey(testFile, testName));
    
    if (baseline) {
      baseline.metadata.tags = [...new Set([...baseline.metadata.tags, ...tags])];
      baseline.metadata.updatedAt = Date.now();
      this.saveBaselines();
    }
  }

  /**
   * Add notes to a baseline
   */
  public addNote(testFile: string, testName: string, note: string): void {
    const baseline = this.baselines.get(this.getBaselineKey(testFile, testName));
    
    if (baseline) {
      baseline.metadata.notes = baseline.metadata.notes 
        ? `${baseline.metadata.notes}\n${new Date().toISOString()}: ${note}`
        : `${new Date().toISOString()}: ${note}`;
      baseline.metadata.updatedAt = Date.now();
      this.saveBaselines();
    }
  }
}

/**
 * Default baseline manager instance
 */
export const defaultBaselineManager = new PerformanceBaselineManager();