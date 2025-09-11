/**
 * Comprehensive Performance Integration Test
 * 
 * Tests the complete integration between the existing performance monitoring system
 * and the new Astro-specific performance monitoring, demonstrating unified reporting
 * and regression detection across all performance metrics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createBasicStackAuthIntegration } from '../../src/integration.js';
import { createTestContainer } from '../utils/astro-container.js';
import {
  withAstroPerformanceMonitoring,
  withContainerPerformanceMonitoring,
  instrumentMiddleware,
  clearAstroPerformanceData
} from '../utils/astro-performance-monitoring.js';
import {
  getTestPerformanceSummary,
  clearTestPerformanceData,
  performanceHooks
} from '../utils/vitest-performance-plugin.js';
import { checkDependency, clearDependencyCaches } from '../utils/dependency-helpers.js';
import { fileExists, clearFileOperationMetrics } from '../utils/file-helpers.js';

describe('Comprehensive Performance Integration', () => {
  beforeEach(() => {
    // Enable all performance monitoring
    process.env.STACK_AUTH_PERF_DEBUG = 'true';
    process.env.VITEST_PERF = 'true';
    process.env.STACK_PROJECT_ID = 'test-project';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'test-key';
    process.env.STACK_SECRET_SERVER_KEY = 'test-secret';
    
    // Clear all performance data
    clearAstroPerformanceData();
    clearTestPerformanceData();
    clearDependencyCaches();
    clearFileOperationMetrics();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.STACK_AUTH_PERF_DEBUG;
    delete process.env.VITEST_PERF;
    clearAstroPerformanceData();
    clearTestPerformanceData();
  });

  it('should collect and integrate all performance metrics types', async () => {
    // Simulate test start
    performanceHooks.beforeEach({
      task: {
        file: { name: 'comprehensive-test.ts' },
        name: 'integration performance test'
      }
    } as any);

    // 1. Test dependency operations (existing system)
    checkDependency('@stackframe/stack');
    checkDependency('@stackframe/stack-ui');
    checkDependency('path');
    checkDependency('non-existent-package-xyz'); // This should fail

    // 2. Test file operations (existing system)
    fileExists(__filename);
    fileExists('/non/existent/path'); // This should fail

    // 3. Test Astro integration performance (new system)
    const baseIntegration = createBasicStackAuthIntegration({
      addReactRenderer: true,
      injectRoutes: true,
      addMiddleware: true
    });
    const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
    
    const container = await createTestContainer({
      integrations: [instrumentedIntegration]
    });
    
    // 4. Test container rendering performance (new system)
    const instrumentedContainer = withContainerPerformanceMonitoring(container);
    await instrumentedContainer.renderToString('AuthComponent', { userId: 'test-123' });
    await instrumentedContainer.renderToResponse('UserProfile', { profile: { name: 'Test User' } });

    // 5. Test middleware performance (new system)
    const authMiddleware = async (request: Request) => {
      // Simulate auth middleware work
      await new Promise(resolve => setTimeout(resolve, 2));
      return { 
        user: { id: 'test-user', email: 'test@example.com' }, 
        session: { id: 'test-session', userId: 'test-user' } 
      };
    };
    const instrumentedMiddleware = instrumentMiddleware(authMiddleware);
    await instrumentedMiddleware(new Request('http://localhost:3000/protected'));
    await instrumentedMiddleware(new Request('http://localhost:3000/api/user'));

    // Simulate test end
    performanceHooks.afterEach({
      task: {
        file: { name: 'comprehensive-test.ts' },
        name: 'integration performance test'
      }
    } as any);

    // Generate comprehensive report
    const comprehensiveReport = getTestPerformanceSummary();
    
    // Verify all performance data types are collected
    expect(comprehensiveReport.totalTests).toBeGreaterThan(0);
    expect(comprehensiveReport.dependencyPerformance).toBeDefined();
    expect(comprehensiveReport.astroPerformance).toBeDefined();
    
    // Verify dependency performance data
    expect(comprehensiveReport.dependencyPerformance.summary.totalOperations).toBeGreaterThan(0);
    expect(comprehensiveReport.dependencyPerformance.summary.successRate).toBeGreaterThanOrEqual(0);
    expect(comprehensiveReport.dependencyPerformance.summary.cacheHitRate).toBeGreaterThanOrEqual(0);
    
    // Verify Astro performance data
    expect(comprehensiveReport.astroPerformance.summary.integrationSetupTime).toBeGreaterThanOrEqual(0);
    expect(comprehensiveReport.astroPerformance.summary.renderOperationCount).toBe(2);
    expect(comprehensiveReport.astroPerformance.summary.middlewareEfficiency).toContain('executions');
    
    // Verify middleware data
    expect(comprehensiveReport.astroPerformance.summary.middlewareEfficiency).toContain('2 executions');
    
    // Verify recommendations are provided
    expect(Array.isArray(comprehensiveReport.astroPerformance.recommendations)).toBe(true);
  });

  it('should detect performance regressions across all monitoring systems', async () => {
    // Set up a comprehensive performance scenario
    performanceHooks.beforeEach({
      task: {
        file: { name: 'regression-test.ts' },
        name: 'regression detection test'
      }
    } as any);

    // Perform operations that should be tracked
    checkDependency('@stackframe/stack');
    fileExists(__filename);

    const baseIntegration = createBasicStackAuthIntegration();
    const instrumentedIntegration = withAstroPerformanceMonitoring(baseIntegration);
    const container = await createTestContainer({
      integrations: [instrumentedIntegration]
    });
    const instrumentedContainer = withContainerPerformanceMonitoring(container);
    
    await instrumentedContainer.renderToString('TestComponent');
    
    const middleware = () => ({ user: null, session: null });
    const instrumentedMiddleware = instrumentMiddleware(middleware);
    instrumentedMiddleware(new Request('http://localhost:3000/'));

    performanceHooks.afterEach({
      task: {
        file: { name: 'regression-test.ts' },
        name: 'regression detection test'
      }
    } as any);

    const report = getTestPerformanceSummary();
    
    // Verify regression detection structures exist
    expect(report.regressions).toBeDefined();
    expect(Array.isArray(report.regressions)).toBe(true);
    expect(report.astroPerformance.regressions).toBeDefined();
    expect(report.astroPerformance.regressions.integrationRegressions).toBeDefined();
    expect(report.astroPerformance.regressions.middlewareRegressions).toBeDefined();
    expect(report.astroPerformance.regressions.renderingRegressions).toBeDefined();
  });

  it('should provide unified performance reporting and recommendations', async () => {
    // Simulate a complete performance testing scenario
    performanceHooks.beforeEach({
      task: {
        file: { name: 'unified-reporting-test.ts' },
        name: 'unified reporting test'
      }
    } as any);

    // Mix of different performance operations
    checkDependency('path');
    checkDependency('@stackframe/stack');
    fileExists(__filename);

    const integration = withAstroPerformanceMonitoring(
      createBasicStackAuthIntegration({ addReactRenderer: true, injectRoutes: true })
    );
    const container = withContainerPerformanceMonitoring(
      await createTestContainer({ integrations: [integration] })
    );

    await container.renderToString('SignInComponent');
    
    const authMiddleware = (req: Request) => ({ 
      user: { id: 'user-123', email: 'user@example.com' }, 
      session: { id: 'session-123' } 
    });
    instrumentMiddleware(authMiddleware)(new Request('http://localhost:3000/'));

    performanceHooks.afterEach({
      task: {
        file: { name: 'unified-reporting-test.ts' },
        name: 'unified reporting test'
      }
    } as any);

    const unifiedReport = getTestPerformanceSummary();
    
    // Verify complete report structure
    expect(unifiedReport).toMatchObject({
      totalTests: expect.any(Number),
      totalDuration: expect.any(Number),
      averageTestDuration: expect.any(Number),
      dependencyPerformance: {
        summary: {
          totalOperations: expect.any(Number),
          successRate: expect.any(Number),
          cacheHitRate: expect.any(Number)
        },
        recommendations: expect.any(Array)
      },
      astroPerformance: {
        summary: {
          integrationSetupTime: expect.any(Number),
          middlewareEfficiency: expect.any(String),
          routeInjectionCount: expect.any(Number),
          renderOperationCount: expect.any(Number),
          averageRenderTime: expect.any(Number)
        },
        regressions: {
          integrationRegressions: expect.any(Array),
          middlewareRegressions: expect.any(Array),
          renderingRegressions: expect.any(Array)
        },
        recommendations: expect.any(Array)
      },
      regressions: expect.any(Array),
      ciMetrics: {
        status: expect.any(String),
        issues: expect.any(Array)
      }
    });
    
    // Verify that performance data is meaningful
    expect(unifiedReport.dependencyPerformance.summary.totalOperations).toBeGreaterThan(0);
    expect(unifiedReport.astroPerformance.summary.renderOperationCount).toBe(1);
    expect(unifiedReport.astroPerformance.summary.routeInjectionCount).toBeGreaterThanOrEqual(0);
  });

  it('should work correctly when performance monitoring is disabled', () => {
    // Disable all performance monitoring
    delete process.env.STACK_AUTH_PERF_DEBUG;
    delete process.env.VITEST_PERF;
    
    // Clear data and test that operations still work
    clearAstroPerformanceData();
    clearTestPerformanceData();
    
    // These operations should not throw even with monitoring disabled
    expect(() => {
      checkDependency('path');
      fileExists(__filename);
      
      const middleware = () => ({ user: null, session: null });
      instrumentMiddleware(middleware)(new Request('http://localhost:3000/'));
      
      // Generate report should work even when disabled
      const report = getTestPerformanceSummary();
      expect(report).toBeDefined();
    }).not.toThrow();
  });

  it('should handle performance monitoring in different environments', async () => {
    // Test different environment configurations
    const environments = [
      { STACK_AUTH_PERF_DEBUG: 'true' },
      { VITEST_PERF: 'true' },
      { NODE_ENV: 'test' },
      { STACK_AUTH_PERF_DEBUG: 'true', VITEST_PERF: 'true', NODE_ENV: 'test' }
    ];

    for (const env of environments) {
      // Set environment
      Object.entries(env).forEach(([key, value]) => {
        process.env[key] = value;
      });
      
      // Clear and test
      clearAstroPerformanceData();
      clearTestPerformanceData();
      
      // Perform operations
      checkDependency('path');
      
      const integration = withAstroPerformanceMonitoring(
        createBasicStackAuthIntegration()
      );
      await createTestContainer({ integrations: [integration] });
      
      // Should not throw
      expect(() => {
        const report = getTestPerformanceSummary();
        expect(report).toBeDefined();
      }).not.toThrow();
      
      // Clean up environment
      Object.keys(env).forEach(key => {
        delete process.env[key];
      });
    }
  });
});