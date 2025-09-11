/**
 * Astro-Specific Performance Monitoring Integration Test
 * 
 * Tests that the Astro performance monitoring system integrates correctly
 * with the existing performance infrastructure and tracks Astro-specific operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createBasicStackAuthIntegration } from '../../src/integration.js';
import { createTestContainer, containerTestUtils } from '../utils/astro-container.js';
import {
  withAstroPerformanceMonitoring,
  withContainerPerformanceMonitoring,
  instrumentMiddleware,
  astroPerformanceCollector,
  expectAstroIntegrationPerformance,
  expectMiddlewarePerformance,
  expectRenderPerformance,
  getAstroPerformanceResults,
  getAstroPerformanceSummary,
  clearAstroPerformanceData
} from '../utils/astro-performance-monitoring.js';

describe('Astro Performance Monitoring Integration', () => {
  beforeEach(() => {
    // Enable performance monitoring for tests
    process.env.STACK_AUTH_PERF_DEBUG = 'true';
    process.env.STACK_PROJECT_ID = 'test-project';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret';
    
    // Clear metrics before each test
    clearAstroPerformanceData();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.STACK_AUTH_PERF_DEBUG;
    clearAstroPerformanceData();
  });

  describe('Integration Lifecycle Performance', () => {
    it('should track integration setup performance', async () => {
      const baseIntegration = createBasicStackAuthIntegration({
        addReactRenderer: true,
        injectRoutes: true,
        addMiddleware: true
      });

      const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
      
      // Create test container to trigger integration setup
      await createTestContainer({
        integrations: [instrumentedIntegration]
      });

      const metrics = getAstroPerformanceResults();
      
      // Verify integration setup was tracked
      expect(metrics.integrationLifecycle.setupDuration).toBeGreaterThan(0);
      expect(metrics.integrationLifecycle.setupStart).toBeGreaterThan(0);
      expect(metrics.integrationLifecycle.setupEnd).toBeGreaterThan(0);
      expect(metrics.integrationLifecycle.setupEnd).toBeGreaterThan(
        metrics.integrationLifecycle.setupStart
      );
    });

    it('should track individual integration operations', async () => {
      const baseIntegration = createBasicStackAuthIntegration({
        addReactRenderer: true,
        injectRoutes: true,
        addMiddleware: true
      });

      const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
      
      await createTestContainer({
        integrations: [instrumentedIntegration]
      });

      const metrics = getAstroPerformanceResults();
      
      // Should track renderer addition
      expect(metrics.integrationLifecycle.rendererAddTime).toBeGreaterThanOrEqual(0);
      
      // Should track middleware addition
      expect(metrics.integrationLifecycle.middlewareAddTime).toBeGreaterThanOrEqual(0);
      
      // Should track route injection
      expect(metrics.integrationLifecycle.routeInjectionTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect integration performance regressions', async () => {
      const baseIntegration = createBasicStackAuthIntegration();
      const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
      
      await createTestContainer({
        integrations: [instrumentedIntegration]
      });

      // Should not throw for normal performance
      expect(() => {
        expectAstroIntegrationPerformance(100); // 100ms threshold
      }).not.toThrow();

      // Should throw if we set an unreasonably low threshold
      expect(() => {
        expectAstroIntegrationPerformance(0.01); // 0.01ms threshold - impossible
      }).toThrow(/performance regression/i);
    });
  });

  describe('Container API Performance', () => {
    it('should track component rendering performance', async () => {
      const container = await createTestContainer();
      const instrumentedContainer = withContainerPerformanceMonitoring(container);

      // Perform some render operations
      await instrumentedContainer.renderToString('TestComponent', { prop1: 'value1' });
      await instrumentedContainer.renderToString('AnotherComponent', { prop2: 'value2' });

      const metrics = getAstroPerformanceResults();
      
      // Should have tracked render operations
      expect(metrics.containerAPI.totalRenders).toBe(2);
      expect(metrics.containerAPI.renderOperations).toHaveLength(2);
      expect(metrics.containerAPI.averageRenderTime).toBeGreaterThan(0);
      
      // Verify individual operations
      const [render1, render2] = metrics.containerAPI.renderOperations;
      expect(render1.component).toBe('TestComponent');
      expect(render1.props).toEqual({ prop1: 'value1' });
      expect(render1.renderTime).toBeGreaterThan(0);
      
      expect(render2.component).toBe('AnotherComponent');
      expect(render2.props).toEqual({ prop2: 'value2' });
      expect(render2.renderTime).toBeGreaterThan(0);
    });

    it('should track renderToResponse performance', async () => {
      const container = await createTestContainer();
      const instrumentedContainer = withContainerPerformanceMonitoring(container);

      await instrumentedContainer.renderToResponse('ResponseComponent');

      const metrics = getAstroPerformanceResults();
      
      expect(metrics.containerAPI.totalRenders).toBe(1);
      expect(metrics.containerAPI.renderOperations[0].component).toBe('ResponseComponent');
    });

    it('should detect render performance regressions', async () => {
      const container = await createTestContainer();
      const instrumentedContainer = withContainerPerformanceMonitoring(container);

      await instrumentedContainer.renderToString('FastComponent');

      // Should not throw for normal render performance
      expect(() => {
        expectRenderPerformance(100); // 100ms threshold
      }).not.toThrow();

      // Test with unreasonably low threshold
      expect(() => {
        expectRenderPerformance(0.001); // 0.001ms threshold
      }).toThrow(/performance regression/i);
    });
  });

  describe('Middleware Performance', () => {
    it('should track middleware execution performance', () => {
      const testMiddleware = (request: Request, response: Response) => {
        // Simulate middleware work
        return { request, response, user: null, session: null };
      };

      const instrumentedMiddleware = instrumentMiddleware(testMiddleware);
      
      // Execute middleware multiple times
      const mockRequest = new Request('http://localhost:3000/');
      const mockResponse = new Response();
      
      instrumentedMiddleware(mockRequest, mockResponse);
      instrumentedMiddleware(mockRequest, mockResponse);
      instrumentedMiddleware(mockRequest, mockResponse);

      const metrics = getAstroPerformanceResults();
      
      expect(metrics.middleware.totalExecutions).toBe(3);
      expect(metrics.middleware.executions).toHaveLength(3);
      expect(metrics.middleware.averageDuration).toBeGreaterThan(0);
      expect(metrics.middleware.totalDuration).toBeGreaterThan(0);
      
      // Verify each execution was tracked
      metrics.middleware.executions.forEach(execution => {
        expect(execution.start).toBeGreaterThan(0);
        expect(execution.end).toBeGreaterThan(execution.start);
        expect(execution.duration).toBeGreaterThan(0);
      });
    });

    it('should handle async middleware performance tracking', async () => {
      const asyncMiddleware = async (request: Request) => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 1));
        return { user: null, session: null };
      };

      const instrumentedMiddleware = instrumentMiddleware(asyncMiddleware);
      
      const mockRequest = new Request('http://localhost:3000/');
      await instrumentedMiddleware(mockRequest);
      await instrumentedMiddleware(mockRequest);

      const metrics = getAstroPerformanceResults();
      
      expect(metrics.middleware.totalExecutions).toBe(2);
      expect(metrics.middleware.averageDuration).toBeGreaterThan(0);
    });

    it('should detect middleware performance regressions', () => {
      const fastMiddleware = () => ({ user: null, session: null });
      const instrumentedMiddleware = instrumentMiddleware(fastMiddleware);
      
      const mockRequest = new Request('http://localhost:3000/');
      instrumentedMiddleware(mockRequest);

      // Should not throw for normal middleware performance
      expect(() => {
        expectMiddlewarePerformance(50); // 50ms threshold
      }).not.toThrow();

      // Test with unreasonably low threshold
      expect(() => {
        expectMiddlewarePerformance(0.001); // 0.001ms threshold
      }).toThrow(/performance regression/i);
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive Astro performance report', async () => {
      // Set up complete performance scenario
      const baseIntegration = createBasicStackAuthIntegration();
      const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
      
      const container = await createTestContainer({
        integrations: [instrumentedIntegration]
      });
      const instrumentedContainer = withContainerPerformanceMonitoring(container);

      // Perform various operations
      await instrumentedContainer.renderToString('Component1');
      await instrumentedContainer.renderToString('Component2');

      const testMiddleware = () => ({ user: null, session: null });
      const instrumentedMiddleware = instrumentMiddleware(testMiddleware);
      instrumentedMiddleware(new Request('http://localhost:3000/'));

      // Generate report
      const report = getAstroPerformanceSummary();
      
      // Verify report structure
      expect(report.summary).toBeDefined();
      expect(report.summary.integrationSetupTime).toBeGreaterThanOrEqual(0);
      expect(report.summary.middlewareEfficiency).toContain('executions');
      expect(report.summary.renderOperationCount).toBe(2);
      expect(report.summary.routeInjectionCount).toBeGreaterThanOrEqual(0);
      
      expect(report.regressions).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should provide performance recommendations', async () => {
      const baseIntegration = createBasicStackAuthIntegration();
      const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
      
      await createTestContainer({
        integrations: [instrumentedIntegration]
      });

      const report = getAstroPerformanceSummary();
      
      // Should provide recommendations array
      expect(Array.isArray(report.recommendations)).toBe(true);
      
      // Recommendations should be strings
      report.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration with Existing Performance System', () => {
    it('should work alongside existing performance monitoring', () => {
      // Verify Astro performance monitoring is enabled when existing system is enabled
      expect(astroPerformanceCollector.isEnabled()).toBe(true);

      // Verify it doesn't interfere with existing performance collection
      const testMiddleware = () => ({ user: null, session: null });
      const instrumentedMiddleware = instrumentMiddleware(testMiddleware);
      instrumentedMiddleware(new Request('http://localhost:3000/'));

      const astroMetrics = getAstroPerformanceResults();
      expect(astroMetrics).toBeDefined();
      expect(astroMetrics.middleware.totalExecutions).toBe(1);
    });

    it('should respect performance monitoring disabled state', () => {
      // Disable performance monitoring
      delete process.env.STACK_AUTH_PERF_DEBUG;
      delete process.env.VITEST_PERF;
      
      // Clear and check collector is disabled
      clearAstroPerformanceData();
      
      // Create new collector instance for this test
      const testMiddleware = () => ({ user: null, session: null });
      instrumentMiddleware(testMiddleware); // Should be a no-op
      
      // Should handle disabled state gracefully
      expect(() => {
        getAstroPerformanceResults();
      }).not.toThrow();
    });
  });

  describe('Regression Detection', () => {
    it('should detect performance regressions across different operation types', async () => {
      // Set up integration and operations
      const baseIntegration = createBasicStackAuthIntegration();
      const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
      
      const container = await createTestContainer({
        integrations: [instrumentedIntegration]
      });
      const instrumentedContainer = withContainerPerformanceMonitoring(container);

      await instrumentedContainer.renderToString('SlowComponent');

      const middleware = () => ({ user: null, session: null });
      const instrumentedMiddleware = instrumentMiddleware(middleware);
      instrumentedMiddleware(new Request('http://localhost:3000/'));

      const report = getAstroPerformanceSummary();
      
      // Verify regression detection structure
      expect(report.regressions.integrationRegressions).toBeDefined();
      expect(report.regressions.middlewareRegressions).toBeDefined();
      expect(report.regressions.renderingRegressions).toBeDefined();
      
      // All should be arrays
      expect(Array.isArray(report.regressions.integrationRegressions)).toBe(true);
      expect(Array.isArray(report.regressions.middlewareRegressions)).toBe(true);
      expect(Array.isArray(report.regressions.renderingRegressions)).toBe(true);
    });

    it('should provide detailed regression information', async () => {
      const baseIntegration = createBasicStackAuthIntegration();
      const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
      
      await createTestContainer({
        integrations: [instrumentedIntegration]
      });

      const report = getAstroPerformanceSummary();
      
      // Check for regression format if any are detected
      report.regressions.integrationRegressions.forEach(regression => {
        expect(regression.component).toBeDefined();
        expect(regression.issue).toBeDefined();
        expect(typeof regression.currentValue).toBe('number');
        expect(typeof regression.baselineValue).toBe('number');
      });
    });
  });
});