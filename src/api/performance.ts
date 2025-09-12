/**
 * Performance monitoring API endpoint for Stack Auth operations
 * 
 * Provides runtime performance statistics and health information
 * for authentication operations, useful for monitoring and debugging.
 */

import type { APIRoute, APIContext } from 'astro';
import { getAuthPerformanceStats, getAuthPerformanceSummary } from '../server/performance.js';

/**
 * GET /handler/performance - Get authentication performance statistics
 * 
 * Returns comprehensive performance data for all auth operations including:
 * - Response times for getUser, requireAuth, getSession
 * - Success rates and error counts
 * - Cache hit rates for session operations
 * - Stack Auth provider API response times
 * - Performance alerts and recommendations
 */
export const GET: APIRoute = async ({ url, request }: APIContext) => {
  try {
    // Check if this is an authorized request (basic protection)
    const authHeader = request.headers.get('authorization');
    const debugParam = url.searchParams.get('debug');
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Only allow access in development or with proper authorization
    if (!isDevelopment && !authHeader?.startsWith('Bearer ') && debugParam !== 'true') {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Performance monitoring requires authorization'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Get performance data
    const stats = getAuthPerformanceStats();
    const summary = getAuthPerformanceSummary();

    // Determine response format
    const format = url.searchParams.get('format') || 'json';
    
    if (format === 'summary') {
      // Return just the summary for dashboards
      return new Response(JSON.stringify(summary, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, max-age=30'
        }
      });
    }

    if (format === 'health') {
      // Return health check format
      const isHealthy = summary.alerts.length === 0;
      const healthStatus = {
        status: isHealthy ? 'healthy' : 'warning',
        timestamp: new Date().toISOString(),
        checks: {
          responseTime: summary.summary.averageResponseTime < 100 ? 'pass' : 'warn',
          successRate: summary.summary.overallSuccessRate > 95 ? 'pass' : 'warn',
          cacheEffectiveness: summary.summary.cacheEffectiveness > 70 ? 'pass' : 'warn'
        },
        metrics: summary.summary,
        alerts: summary.alerts,
        recommendations: summary.recommendations
      };

      return new Response(JSON.stringify(healthStatus, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, max-age=10'
        }
      });
    }

    // Default: return full statistics
    const response = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      monitoring: {
        enabled: process.env.STACK_AUTH_PERF_DEBUG === 'true' || 
                 process.env.NODE_ENV === 'development' ||
                 process.env.STACK_AUTH_MONITOR === 'true'
      },
      statistics: stats,
      summary,
      metadata: {
        collectionPeriod: '5 minutes (default cache TTL)',
        metricsRetention: '100 recent calls per operation',
        lastUpdated: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, max-age=60' // Cache for 1 minute
      }
    });

  } catch (error) {
    console.error('❌ Error in performance monitoring endpoint:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Unable to retrieve performance statistics',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};

/**
 * DELETE /handler/performance - Clear performance statistics
 * 
 * Clears all collected performance data. Useful for testing
 * or when starting fresh monitoring periods.
 */
export const DELETE: APIRoute = async ({ request }: APIContext) => {
  try {
    // Check authorization for destructive operations
    const authHeader = request.headers.get('authorization');
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && !authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Clearing performance data requires authorization'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Import the clear function
    const { clearAuthPerformanceData } = await import('../server/performance.js');
    
    // Clear all performance data
    clearAuthPerformanceData();

    return new Response(JSON.stringify({
      message: 'Performance data cleared successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('❌ Error clearing performance data:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Unable to clear performance data',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};