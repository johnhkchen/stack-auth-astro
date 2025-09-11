/**
 * Astro-Specific Performance Monitoring
 * 
 * Extends the existing performance monitoring system to track Astro integration
 * lifecycle, middleware execution, route injection, and Container API performance.
 */

import type { AstroIntegration, AstroConfig } from 'astro';
import type { MockAstroContainer } from './astro-container.js';

export interface AstroPerformanceMetrics {
  integrationLifecycle: {
    setupStart: number;
    setupEnd: number;
    setupDuration: number;
    rendererAddTime?: number;
    middlewareAddTime?: number;
    routeInjectionTime?: number;
  };
  middleware: {
    executions: Array<{
      start: number;
      end: number;
      duration: number;
      userLookupTime?: number;
      sessionResolutionTime?: number;
    }>;
    totalExecutions: number;
    averageDuration: number;
    totalDuration: number;
  };
  routePerformance: {
    injections: Array<{
      pattern: string;
      injectionTime: number;
      registrationTime: number;
    }>;
    handlerExecutions: Array<{
      endpoint: string;
      executionTime: number;
      responseTime: number;
    }>;
  };
  containerAPI: {
    renderOperations: Array<{
      component: string;
      renderTime: number;
      ssrTime?: number;
      props?: Record<string, any>;
    }>;
    totalRenders: number;
    averageRenderTime: number;
  };
}

/**
 * Astro Performance Collector
 */
class AstroPerformanceCollector {
  private metrics: AstroPerformanceMetrics = {
    integrationLifecycle: {
      setupStart: 0,
      setupEnd: 0,
      setupDuration: 0
    },
    middleware: {
      executions: [],
      totalExecutions: 0,
      averageDuration: 0,
      totalDuration: 0
    },
    routePerformance: {
      injections: [],
      handlerExecutions: []
    },
    containerAPI: {
      renderOperations: [],
      totalRenders: 0,
      averageRenderTime: 0
    }
  };

  private enabled: boolean;
  private currentMiddlewareStart?: number;
  private currentRenderStart?: number;

  constructor() {
    this.enabled = process.env.STACK_AUTH_PERF_DEBUG === 'true' || 
                   process.env.VITEST_PERF === 'true' ||
                   process.env.NODE_ENV === 'test';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Integration Lifecycle Performance Tracking
   */
  startIntegrationSetup(): void {
    if (!this.enabled) return;
    this.metrics.integrationLifecycle.setupStart = performance.now();
  }

  endIntegrationSetup(): void {
    if (!this.enabled) return;
    this.metrics.integrationLifecycle.setupEnd = performance.now();
    this.metrics.integrationLifecycle.setupDuration = 
      this.metrics.integrationLifecycle.setupEnd - this.metrics.integrationLifecycle.setupStart;
  }

  recordRendererAdd(duration: number): void {
    if (!this.enabled) return;
    this.metrics.integrationLifecycle.rendererAddTime = duration;
  }

  recordMiddlewareAdd(duration: number): void {
    if (!this.enabled) return;
    this.metrics.integrationLifecycle.middlewareAddTime = duration;
  }

  recordRouteInjection(duration: number): void {
    if (!this.enabled) return;
    this.metrics.integrationLifecycle.routeInjectionTime = duration;
  }

  /**
   * Middleware Performance Tracking
   */
  startMiddlewareExecution(): void {
    if (!this.enabled) return;
    this.currentMiddlewareStart = performance.now();
  }

  endMiddlewareExecution(userLookupTime?: number, sessionResolutionTime?: number): void {
    if (!this.enabled || !this.currentMiddlewareStart) return;

    const end = performance.now();
    const duration = end - this.currentMiddlewareStart;

    this.metrics.middleware.executions.push({
      start: this.currentMiddlewareStart,
      end,
      duration,
      userLookupTime,
      sessionResolutionTime
    });

    this.metrics.middleware.totalExecutions++;
    this.metrics.middleware.totalDuration += duration;
    this.metrics.middleware.averageDuration = 
      this.metrics.middleware.totalDuration / this.metrics.middleware.totalExecutions;

    this.currentMiddlewareStart = undefined;
  }

  /**
   * Route Performance Tracking
   */
  recordRouteInjectionPerformance(pattern: string, injectionTime: number, registrationTime: number): void {
    if (!this.enabled) return;

    this.metrics.routePerformance.injections.push({
      pattern,
      injectionTime,
      registrationTime
    });
  }

  recordHandlerExecution(endpoint: string, executionTime: number, responseTime: number): void {
    if (!this.enabled) return;

    this.metrics.routePerformance.handlerExecutions.push({
      endpoint,
      executionTime,
      responseTime
    });
  }

  /**
   * Container API Performance Tracking
   */
  startRenderOperation(): void {
    if (!this.enabled) return;
    this.currentRenderStart = performance.now();
  }

  endRenderOperation(component: string, props?: Record<string, any>, ssrTime?: number): void {
    if (!this.enabled || !this.currentRenderStart) return;

    const renderTime = performance.now() - this.currentRenderStart;

    this.metrics.containerAPI.renderOperations.push({
      component,
      renderTime,
      ssrTime,
      props
    });

    this.metrics.containerAPI.totalRenders++;
    this.metrics.containerAPI.averageRenderTime = 
      this.metrics.containerAPI.renderOperations.reduce((sum, op) => sum + op.renderTime, 0) / 
      this.metrics.containerAPI.totalRenders;

    this.currentRenderStart = undefined;
  }

  /**
   * Get collected metrics
   */
  getMetrics(): AstroPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Performance regression detection specific to Astro operations
   */
  detectAstroRegressions(baselines?: Partial<AstroPerformanceMetrics>): {
    integrationRegressions: Array<{ component: string; issue: string; currentValue: number; baselineValue: number }>;
    middlewareRegressions: Array<{ issue: string; currentValue: number; baselineValue: number }>;
    renderingRegressions: Array<{ component: string; issue: string; currentValue: number; baselineValue: number }>;
  } {
    const regressions = {
      integrationRegressions: [],
      middlewareRegressions: [],
      renderingRegressions: []
    };

    if (!baselines) return regressions;

    // Integration lifecycle regressions (setup should be under 100ms)
    if (this.metrics.integrationLifecycle.setupDuration > 100) {
      regressions.integrationRegressions.push({
        component: 'integration-setup',
        issue: 'Setup duration exceeds 100ms threshold',
        currentValue: this.metrics.integrationLifecycle.setupDuration,
        baselineValue: 100
      });
    }

    // Middleware performance regressions (should average under 10ms per execution)
    if (this.metrics.middleware.averageDuration > 10) {
      regressions.middlewareRegressions.push({
        issue: 'Average middleware execution exceeds 10ms threshold',
        currentValue: this.metrics.middleware.averageDuration,
        baselineValue: 10
      });
    }

    // Container API rendering regressions (should average under 50ms per render)
    if (this.metrics.containerAPI.averageRenderTime > 50) {
      regressions.renderingRegressions.push({
        component: 'container-api-render',
        issue: 'Average render time exceeds 50ms threshold',
        currentValue: this.metrics.containerAPI.averageRenderTime,
        baselineValue: 50
      });
    }

    // Compare with baselines if provided
    if (baselines.middleware?.averageDuration) {
      const regressionThreshold = baselines.middleware.averageDuration * 1.5; // 50% increase
      if (this.metrics.middleware.averageDuration > regressionThreshold) {
        regressions.middlewareRegressions.push({
          issue: 'Middleware performance regression detected',
          currentValue: this.metrics.middleware.averageDuration,
          baselineValue: baselines.middleware.averageDuration
        });
      }
    }

    return regressions;
  }

  /**
   * Generate comprehensive Astro performance report
   */
  generateAstroPerformanceReport(): {
    summary: {
      integrationSetupTime: number;
      middlewareEfficiency: string;
      routeInjectionCount: number;
      renderOperationCount: number;
      averageRenderTime: number;
    };
    regressions: ReturnType<typeof this.detectAstroRegressions>;
    recommendations: string[];
  } {
    const regressions = this.detectAstroRegressions();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (this.metrics.integrationLifecycle.setupDuration > 50) {
      recommendations.push('Consider optimizing integration setup - current duration is high');
    }

    if (this.metrics.middleware.averageDuration > 5) {
      recommendations.push('Middleware execution time could be optimized');
    }

    if (this.metrics.containerAPI.averageRenderTime > 25) {
      recommendations.push('Component rendering performance could be improved');
    }

    if (this.metrics.routePerformance.injections.length === 0) {
      recommendations.push('No route injections detected - verify integration configuration');
    }

    return {
      summary: {
        integrationSetupTime: this.metrics.integrationLifecycle.setupDuration,
        middlewareEfficiency: `${this.metrics.middleware.totalExecutions} executions, avg ${this.metrics.middleware.averageDuration.toFixed(2)}ms`,
        routeInjectionCount: this.metrics.routePerformance.injections.length,
        renderOperationCount: this.metrics.containerAPI.totalRenders,
        averageRenderTime: this.metrics.containerAPI.averageRenderTime
      },
      regressions,
      recommendations
    };
  }

  /**
   * Clear all collected metrics
   */
  clear(): void {
    this.metrics = {
      integrationLifecycle: {
        setupStart: 0,
        setupEnd: 0,
        setupDuration: 0
      },
      middleware: {
        executions: [],
        totalExecutions: 0,
        averageDuration: 0,
        totalDuration: 0
      },
      routePerformance: {
        injections: [],
        handlerExecutions: []
      },
      containerAPI: {
        renderOperations: [],
        totalRenders: 0,
        averageRenderTime: 0
      }
    };
  }
}

// Global collector instance
const astroPerformanceCollector = new AstroPerformanceCollector();

/**
 * Performance-instrumented wrapper for Astro integration testing
 */
export function withAstroPerformanceMonitoring<T extends AstroIntegration>(
  integration: T
): T {
  if (!astroPerformanceCollector.isEnabled()) {
    return integration;
  }

  const wrappedIntegration = { ...integration };

  if (wrappedIntegration.hooks?.['astro:config:setup']) {
    const originalSetup = wrappedIntegration.hooks['astro:config:setup'];
    
    wrappedIntegration.hooks['astro:config:setup'] = (context) => {
      astroPerformanceCollector.startIntegrationSetup();

      // Wrap context methods to track performance
      const originalAddRenderer = context.addRenderer;
      const originalAddMiddleware = context.addMiddleware;
      const originalInjectRoute = context.injectRoute;

      context.addRenderer = (renderer) => {
        const start = performance.now();
        const result = originalAddRenderer(renderer);
        const duration = performance.now() - start;
        astroPerformanceCollector.recordRendererAdd(duration);
        return result;
      };

      context.addMiddleware = (middleware) => {
        const start = performance.now();
        const result = originalAddMiddleware(middleware);
        const duration = performance.now() - start;
        astroPerformanceCollector.recordMiddlewareAdd(duration);
        return result;
      };

      context.injectRoute = (route) => {
        const start = performance.now();
        const result = originalInjectRoute(route);
        const duration = performance.now() - start;
        astroPerformanceCollector.recordRouteInjection(duration);
        return result;
      };

      const result = originalSetup(context);
      astroPerformanceCollector.endIntegrationSetup();
      return result;
    };
  }

  return wrappedIntegration;
}

/**
 * Performance-instrumented container for testing
 */
export function withContainerPerformanceMonitoring(container: MockAstroContainer): MockAstroContainer {
  if (!astroPerformanceCollector.isEnabled()) {
    return container;
  }

  const originalRenderToString = container.renderToString.bind(container);
  const originalRenderToResponse = container.renderToResponse.bind(container);

  container.renderToString = async (component: string, props?: Record<string, any>) => {
    astroPerformanceCollector.startRenderOperation();
    const result = await originalRenderToString(component, props);
    astroPerformanceCollector.endRenderOperation(component, props);
    return result;
  };

  container.renderToResponse = async (component: string, props?: Record<string, any>) => {
    astroPerformanceCollector.startRenderOperation();
    const result = await originalRenderToResponse(component, props);
    astroPerformanceCollector.endRenderOperation(component, props);
    return result;
  };

  return container;
}

/**
 * Middleware performance instrumentation
 */
export function instrumentMiddleware<T extends Function>(middleware: T): T {
  if (!astroPerformanceCollector.isEnabled()) {
    return middleware;
  }

  return ((...args: any[]) => {
    astroPerformanceCollector.startMiddlewareExecution();
    const result = middleware(...args);
    
    // If result is a Promise, instrument the completion
    if (result && typeof result.then === 'function') {
      return result.finally(() => {
        astroPerformanceCollector.endMiddlewareExecution();
      });
    }
    
    astroPerformanceCollector.endMiddlewareExecution();
    return result;
  }) as T;
}

/**
 * Export collector and utilities
 */
export {
  astroPerformanceCollector,
  type AstroPerformanceMetrics
};

/**
 * Performance assertion helpers specific to Astro
 */
export function expectAstroIntegrationPerformance(maxSetupTime: number = 100): void {
  const metrics = astroPerformanceCollector.getMetrics();
  
  if (metrics.integrationLifecycle.setupDuration > maxSetupTime) {
    throw new Error(
      `Astro integration setup performance regression: ${metrics.integrationLifecycle.setupDuration.toFixed(2)}ms exceeds threshold of ${maxSetupTime}ms`
    );
  }
}

export function expectMiddlewarePerformance(maxAverageDuration: number = 10): void {
  const metrics = astroPerformanceCollector.getMetrics();
  
  if (metrics.middleware.averageDuration > maxAverageDuration) {
    throw new Error(
      `Middleware performance regression: average ${metrics.middleware.averageDuration.toFixed(2)}ms exceeds threshold of ${maxAverageDuration}ms`
    );
  }
}

export function expectRenderPerformance(maxAverageTime: number = 50): void {
  const metrics = astroPerformanceCollector.getMetrics();
  
  if (metrics.containerAPI.averageRenderTime > maxAverageTime) {
    throw new Error(
      `Render performance regression: average ${metrics.containerAPI.averageRenderTime.toFixed(2)}ms exceeds threshold of ${maxAverageTime}ms`
    );
  }
}

export function getAstroPerformanceResults(): AstroPerformanceMetrics {
  return astroPerformanceCollector.getMetrics();
}

export function getAstroPerformanceSummary() {
  return astroPerformanceCollector.generateAstroPerformanceReport();
}

export function clearAstroPerformanceData(): void {
  astroPerformanceCollector.clear();
}