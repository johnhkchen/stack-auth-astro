/**
 * Server-side Performance Monitoring for Stack Auth Helpers
 * 
 * Tracks performance metrics for authentication helpers to optimize
 * authentication performance in production environments.
 */

import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';

export interface AuthPerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  userId?: string;
  sessionId?: string;
  cacheHit?: boolean;
  errorCode?: string;
  timestamp: string;
  endpoint: string;
  userAgent?: string;
}

export interface AuthPerformanceStats {
  getUser: {
    totalCalls: number;
    averageDuration: number;
    successRate: number;
    recentCalls: AuthPerformanceMetrics[];
  };
  requireAuth: {
    totalCalls: number;
    averageDuration: number;
    successRate: number;
    redirectCount: number;
    apiErrorCount: number;
    recentCalls: AuthPerformanceMetrics[];
  };
  getSession: {
    totalCalls: number;
    averageDuration: number;
    successRate: number;
    cacheHitRate: number;
    recentCalls: AuthPerformanceMetrics[];
  };
  provider: {
    apiResponseTimes: number[];
    averageResponseTime: number;
    healthCheckResults: Array<{
      timestamp: string;
      responseTime: number;
      success: boolean;
    }>;
  };
}

/**
 * Performance monitoring collector for auth operations
 */
class AuthPerformanceCollector {
  private metrics: AuthPerformanceMetrics[] = [];
  private stats: AuthPerformanceStats = {
    getUser: {
      totalCalls: 0,
      averageDuration: 0,
      successRate: 0,
      recentCalls: []
    },
    requireAuth: {
      totalCalls: 0,
      averageDuration: 0,
      successRate: 0,
      redirectCount: 0,
      apiErrorCount: 0,
      recentCalls: []
    },
    getSession: {
      totalCalls: 0,
      averageDuration: 0,
      successRate: 0,
      cacheHitRate: 0,
      recentCalls: []
    },
    provider: {
      apiResponseTimes: [],
      averageResponseTime: 0,
      healthCheckResults: []
    }
  };

  private enabled: boolean;
  private maxRecentCalls = 100; // Keep last 100 calls for each operation

  constructor() {
    this.enabled = process.env.STACK_AUTH_PERF_DEBUG === 'true' || 
                   process.env.NODE_ENV === 'development' ||
                   process.env.STACK_AUTH_MONITOR === 'true';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Start performance tracking for an operation
   */
  startOperation(operation: string, context: APIContext): PerformanceTracker {
    if (!this.enabled) {
      return new NoOpTracker();
    }

    return new PerformanceTracker(operation, context, this);
  }

  /**
   * Record completed operation metrics
   */
  recordMetric(metric: AuthPerformanceMetrics): void {
    if (!this.enabled) return;

    this.metrics.push(metric);

    // Update stats based on operation type
    switch (metric.operation) {
      case 'getUser':
        this.updateGetUserStats(metric);
        break;
      case 'requireAuth':
        this.updateRequireAuthStats(metric);
        break;
      case 'getSession':
        this.updateGetSessionStats(metric);
        break;
    }

    // Keep metrics array from growing too large
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  private updateGetUserStats(metric: AuthPerformanceMetrics): void {
    const stats = this.stats.getUser;
    stats.totalCalls++;
    stats.recentCalls.push(metric);
    
    if (stats.recentCalls.length > this.maxRecentCalls) {
      stats.recentCalls = stats.recentCalls.slice(-this.maxRecentCalls);
    }

    // Recalculate average duration
    const durations = stats.recentCalls.map(m => m.duration);
    stats.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // Recalculate success rate
    const successes = stats.recentCalls.filter(m => m.success).length;
    stats.successRate = (successes / stats.recentCalls.length) * 100;
  }

  private updateRequireAuthStats(metric: AuthPerformanceMetrics): void {
    const stats = this.stats.requireAuth;
    stats.totalCalls++;
    stats.recentCalls.push(metric);
    
    if (stats.recentCalls.length > this.maxRecentCalls) {
      stats.recentCalls = stats.recentCalls.slice(-this.maxRecentCalls);
    }

    // Count redirects and API errors
    if (metric.errorCode === 'REDIRECT') {
      stats.redirectCount++;
    } else if (metric.errorCode && metric.errorCode !== 'REDIRECT') {
      stats.apiErrorCount++;
    }

    // Recalculate metrics
    const durations = stats.recentCalls.map(m => m.duration);
    stats.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    const successes = stats.recentCalls.filter(m => m.success).length;
    stats.successRate = (successes / stats.recentCalls.length) * 100;
  }

  private updateGetSessionStats(metric: AuthPerformanceMetrics): void {
    const stats = this.stats.getSession;
    stats.totalCalls++;
    stats.recentCalls.push(metric);
    
    if (stats.recentCalls.length > this.maxRecentCalls) {
      stats.recentCalls = stats.recentCalls.slice(-this.maxRecentCalls);
    }

    // Recalculate metrics
    const durations = stats.recentCalls.map(m => m.duration);
    stats.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    const successes = stats.recentCalls.filter(m => m.success).length;
    stats.successRate = (successes / stats.recentCalls.length) * 100;

    const cacheHits = stats.recentCalls.filter(m => m.cacheHit).length;
    stats.cacheHitRate = (cacheHits / stats.recentCalls.length) * 100;
  }

  /**
   * Record Stack Auth provider API response time
   */
  recordProviderApiTime(responseTime: number): void {
    if (!this.enabled) return;

    this.stats.provider.apiResponseTimes.push(responseTime);
    
    // Keep only recent response times
    if (this.stats.provider.apiResponseTimes.length > 100) {
      this.stats.provider.apiResponseTimes = this.stats.provider.apiResponseTimes.slice(-100);
    }

    // Recalculate average
    this.stats.provider.averageResponseTime = 
      this.stats.provider.apiResponseTimes.reduce((sum, time) => sum + time, 0) / 
      this.stats.provider.apiResponseTimes.length;
  }

  /**
   * Record provider health check result
   */
  recordProviderHealthCheck(responseTime: number, success: boolean): void {
    if (!this.enabled) return;

    this.stats.provider.healthCheckResults.push({
      timestamp: new Date().toISOString(),
      responseTime,
      success
    });

    // Keep only recent health checks
    if (this.stats.provider.healthCheckResults.length > 50) {
      this.stats.provider.healthCheckResults = this.stats.provider.healthCheckResults.slice(-50);
    }
  }

  /**
   * Get current performance statistics
   */
  getStats(): AuthPerformanceStats {
    return { ...this.stats };
  }

  /**
   * Get performance summary for logging/reporting
   */
  getPerformanceSummary(): {
    summary: {
      totalOperations: number;
      averageResponseTime: number;
      overallSuccessRate: number;
      cacheEffectiveness: number;
    };
    alerts: string[];
    recommendations: string[];
  } {
    const totalCalls = this.stats.getUser.totalCalls + 
                      this.stats.requireAuth.totalCalls + 
                      this.stats.getSession.totalCalls;

    const overallAvg = totalCalls > 0 ? 
      (this.stats.getUser.averageDuration * this.stats.getUser.totalCalls +
       this.stats.requireAuth.averageDuration * this.stats.requireAuth.totalCalls +
       this.stats.getSession.averageDuration * this.stats.getSession.totalCalls) / totalCalls : 0;

    const overallSuccessRate = totalCalls > 0 ?
      ((this.stats.getUser.successRate * this.stats.getUser.totalCalls +
        this.stats.requireAuth.successRate * this.stats.requireAuth.totalCalls +
        this.stats.getSession.successRate * this.stats.getSession.totalCalls) / totalCalls) : 100;

    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Performance alerts
    if (this.stats.getUser.averageDuration > 100) {
      alerts.push(`getUser() average response time is high: ${this.stats.getUser.averageDuration.toFixed(2)}ms`);
    }

    if (this.stats.requireAuth.averageDuration > 150) {
      alerts.push(`requireAuth() average response time is high: ${this.stats.requireAuth.averageDuration.toFixed(2)}ms`);
    }

    if (this.stats.getSession.cacheHitRate < 70) {
      alerts.push(`Session cache hit rate is low: ${this.stats.getSession.cacheHitRate.toFixed(1)}%`);
      recommendations.push('Consider increasing session cache TTL or reviewing cache key generation');
    }

    if (this.stats.provider.averageResponseTime > 500) {
      alerts.push(`Stack Auth provider response time is high: ${this.stats.provider.averageResponseTime.toFixed(2)}ms`);
      recommendations.push('Monitor Stack Auth service status and network connectivity');
    }

    // Success rate alerts
    if (this.stats.getUser.successRate < 95) {
      alerts.push(`getUser() success rate is low: ${this.stats.getUser.successRate.toFixed(1)}%`);
    }

    if (this.stats.requireAuth.successRate < 90) {
      alerts.push(`requireAuth() success rate is low: ${this.stats.requireAuth.successRate.toFixed(1)}%`);
    }

    return {
      summary: {
        totalOperations: totalCalls,
        averageResponseTime: overallAvg,
        overallSuccessRate,
        cacheEffectiveness: this.stats.getSession.cacheHitRate
      },
      alerts,
      recommendations
    };
  }

  /**
   * Clear all collected metrics and stats
   */
  clear(): void {
    this.metrics = [];
    this.stats = {
      getUser: {
        totalCalls: 0,
        averageDuration: 0,
        successRate: 0,
        recentCalls: []
      },
      requireAuth: {
        totalCalls: 0,
        averageDuration: 0,
        successRate: 0,
        redirectCount: 0,
        apiErrorCount: 0,
        recentCalls: []
      },
      getSession: {
        totalCalls: 0,
        averageDuration: 0,
        successRate: 0,
        cacheHitRate: 0,
        recentCalls: []
      },
      provider: {
        apiResponseTimes: [],
        averageResponseTime: 0,
        healthCheckResults: []
      }
    };
  }
}

/**
 * Performance tracker for individual operations
 */
class PerformanceTracker {
  public startTime: number;
  public operation: string;
  public context: APIContext;
  public collector: AuthPerformanceCollector;

  constructor(operation: string, context: APIContext, collector: AuthPerformanceCollector) {
    this.operation = operation;
    this.context = context;
    this.collector = collector;
    this.startTime = performance.now();
  }

  /**
   * Complete the operation tracking with success result
   */
  success(user?: User | null, session?: Session | null, cacheHit?: boolean): void {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    const metric: AuthPerformanceMetrics = {
      operation: this.operation,
      startTime: this.startTime,
      endTime,
      duration,
      success: true,
      userId: user?.id,
      sessionId: (session as any)?.id || undefined,
      cacheHit,
      timestamp: new Date().toISOString(),
      endpoint: this.context.url.pathname,
      userAgent: this.context.request.headers.get('user-agent') || undefined
    };

    this.collector.recordMetric(metric);
  }

  /**
   * Complete the operation tracking with error result
   */
  error(errorCode?: string, errorMessage?: string): void {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    const metric: AuthPerformanceMetrics = {
      operation: this.operation,
      startTime: this.startTime,
      endTime,
      duration,
      success: false,
      errorCode,
      timestamp: new Date().toISOString(),
      endpoint: this.context.url.pathname,
      userAgent: this.context.request.headers.get('user-agent') || undefined
    };

    this.collector.recordMetric(metric);
  }

  /**
   * Record API response time for provider calls
   */
  recordApiTime(responseTime: number): void {
    this.collector.recordProviderApiTime(responseTime);
  }
}

/**
 * No-op tracker when performance monitoring is disabled
 */
class NoOpTracker implements PerformanceTracker {
  public startTime: number = 0;
  public operation: string = '';
  public context: any = null;
  public collector: any = null;

  constructor() {}

  success(): void {}
  error(): void {}
  recordApiTime(): void {}
}

// Global collector instance
const authPerformanceCollector = new AuthPerformanceCollector();

/**
 * Export collector and utilities
 */
export {
  authPerformanceCollector,
  PerformanceTracker
};

/**
 * Get current auth performance stats
 */
export function getAuthPerformanceStats(): AuthPerformanceStats {
  return authPerformanceCollector.getStats();
}

/**
 * Get auth performance summary
 */
export function getAuthPerformanceSummary() {
  return authPerformanceCollector.getPerformanceSummary();
}

/**
 * Record Stack Auth provider API response time
 */
export function recordProviderApiTime(responseTime: number): void {
  authPerformanceCollector.recordProviderApiTime(responseTime);
}

/**
 * Record provider health check
 */
export function recordProviderHealthCheck(responseTime: number, success: boolean): void {
  authPerformanceCollector.recordProviderHealthCheck(responseTime, success);
}

/**
 * Clear all performance data
 */
export function clearAuthPerformanceData(): void {
  authPerformanceCollector.clear();
}

/**
 * Helper to start performance tracking for auth operations
 */
export function startAuthPerformanceTracking(operation: string, context: APIContext): PerformanceTracker {
  return authPerformanceCollector.startOperation(operation, context);
}