/**
 * Custom Performance Reporter for Vitest
 * 
 * This file exports a Vitest reporter that integrates performance monitoring
 * into the test output based on environment variables.
 */

import { PerformanceReporter, JSONPerformanceReporter, MinimalPerformanceReporter } from './vitest-performance-reporter.js';

// Export the appropriate reporter based on environment configuration
function createReporter() {
  // Check if we need JSON output for CI
  if (process.env.CI || process.env.STACK_AUTH_PERF_JSON === 'true') {
    const outputFile = process.env.STACK_AUTH_PERF_OUTPUT || 'performance-report.json';
    // Return a composite reporter that does both console and JSON output
    return class CompositePerformanceReporter {
      constructor() {
        this.consoleReporter = new PerformanceReporter({
          includeDetailedStats: process.env.STACK_AUTH_PERF_DETAILED === 'true',
          showSlowTests: true,
          slowTestThreshold: 1000
        });
        this.jsonReporter = new JSONPerformanceReporter(outputFile);
      }
      
      onInit(...args) {
        this.consoleReporter.onInit?.(...args);
        this.jsonReporter.onInit?.(...args);
      }
      
      onFinished(...args) {
        this.consoleReporter.onFinished?.(...args);
        this.jsonReporter.onFinished?.(...args);
      }
      
      onTaskUpdate(...args) {
        this.consoleReporter.onTaskUpdate?.(...args);
        this.jsonReporter.onTaskUpdate?.(...args);
      }
      
      onTestUpdate(...args) {
        this.consoleReporter.onTestUpdate?.(...args);
        this.jsonReporter.onTestUpdate?.(...args);
      }
      
      onWatcherStart(...args) {
        this.consoleReporter.onWatcherStart?.(...args);
        this.jsonReporter.onWatcherStart?.(...args);
      }
      
      onWatcherRerun(...args) {
        this.consoleReporter.onWatcherRerun?.(...args);
        this.jsonReporter.onWatcherRerun?.(...args);
      }
      
      onTestRemoved(...args) {
        this.consoleReporter.onTestRemoved?.(...args);
        this.jsonReporter.onTestRemoved?.(...args);
      }
      
      onCollected(...args) {
        this.consoleReporter.onCollected?.(...args);
        this.jsonReporter.onCollected?.(...args);
      }
    };
  }
  
  // Check if minimal output is requested
  if (process.env.STACK_AUTH_PERF_MINIMAL === 'true') {
    return MinimalPerformanceReporter;
  }
  
  // Default: detailed performance reporter
  return class ConfiguredPerformanceReporter extends PerformanceReporter {
    constructor() {
      super({
        includeDetailedStats: process.env.STACK_AUTH_PERF_DETAILED === 'true',
        showSlowTests: true,
        slowTestThreshold: 1000
      });
    }
  };
}

// Export the configured reporter as default
export default createReporter();