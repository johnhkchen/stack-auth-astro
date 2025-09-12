/**
 * Performance Testing Utilities
 * 
 * Helper functions for measuring and analyzing component performance
 * across different hydration strategies and scenarios.
 */

/**
 * Measures component render time
 */
export function measureRenderTime(renderFn) {
  const startTime = performance.now();
  const result = renderFn();
  const endTime = performance.now();
  
  return {
    result,
    renderTime: endTime - startTime
  };
}

/**
 * Measures hydration time using performance observers
 */
export function measureHydrationTime(callback) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'data-hydrated' &&
            mutation.target.getAttribute('data-hydrated') === 'true') {
          const hydrationTime = performance.now() - startTime;
          observer.disconnect();
          resolve(hydrationTime);
        }
      });
    });
    
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-hydrated']
    });
    
    callback();
    
    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(performance.now() - startTime);
    }, 5000);
  });
}

/**
 * Measures memory usage
 */
export function measureMemoryUsage() {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
  }
  
  return {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  };
}

/**
 * Measures interaction response time
 */
export function measureInteractionTime(element, interaction) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    const observer = new MutationObserver((mutations) => {
      if (mutations.length > 0) {
        const interactionTime = performance.now() - startTime;
        observer.disconnect();
        resolve(interactionTime);
      }
    });
    
    observer.observe(element, {
      childList: true,
      attributes: true,
      subtree: true
    });
    
    interaction();
    
    // Fallback timeout
    setTimeout(() => {
      observer.disconnect();
      resolve(performance.now() - startTime);
    }, 1000);
  });
}

/**
 * Creates a performance observer for custom metrics
 */
export function createPerformanceObserver(entryTypes, callback) {
  if (typeof PerformanceObserver !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });
    
    try {
      observer.observe({ entryTypes });
      return observer;
    } catch (e) {
      console.warn('PerformanceObserver not supported:', e);
      return null;
    }
  }
  
  return null;
}

/**
 * Performance analysis utilities
 */
export const PerformanceAnalyzer = {
  /**
   * Calculates performance statistics
   */
  calculateStats(measurements) {
    if (!measurements.length) {
      return { min: 0, max: 0, average: 0, median: 0, p95: 0 };
    }
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((total, value) => total + value, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  },

  /**
   * Detects performance regressions
   */
  detectRegressions(baseline, current, threshold = 0.2) {
    const regressions = [];
    
    Object.keys(baseline).forEach(key => {
      if (current[key] && baseline[key]) {
        const increase = (current[key] - baseline[key]) / baseline[key];
        if (increase > threshold) {
          regressions.push({
            metric: key,
            baseline: baseline[key],
            current: current[key],
            increase: increase * 100
          });
        }
      }
    });
    
    return regressions;
  },

  /**
   * Formats performance data for reporting
   */
  formatResults(data) {
    return {
      ...data,
      formattedTime: `${data.time?.toFixed(2)}ms`,
      formattedMemory: data.memory ? `${(data.memory / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    };
  }
};

/**
 * Performance budget validation
 */
export function validatePerformanceBudget(metrics, budgets) {
  const violations = [];
  
  Object.keys(budgets).forEach(key => {
    if (metrics[key] && metrics[key] > budgets[key]) {
      violations.push({
        metric: key,
        actual: metrics[key],
        budget: budgets[key],
        violation: metrics[key] - budgets[key]
      });
    }
  });
  
  return violations;
}

/**
 * Mock performance API for testing
 */
export function createMockPerformanceAPI() {
  const marks = new Map();
  const measures = new Map();
  
  return {
    now: () => Date.now() + Math.random(),
    mark: (name) => {
      marks.set(name, Date.now());
    },
    measure: (name, startMark, endMark) => {
      const start = marks.get(startMark) || 0;
      const end = marks.get(endMark) || Date.now();
      measures.set(name, end - start);
    },
    getEntriesByName: (name) => {
      return measures.has(name) ? [{ name, duration: measures.get(name) }] : [];
    },
    getEntriesByType: (type) => {
      if (type === 'measure') {
        return Array.from(measures.entries()).map(([name, duration]) => ({
          name,
          duration,
          entryType: 'measure'
        }));
      }
      return [];
    }
  };
}

export default {
  measureRenderTime,
  measureHydrationTime,
  measureMemoryUsage,
  measureInteractionTime,
  createPerformanceObserver,
  PerformanceAnalyzer,
  validatePerformanceBudget,
  createMockPerformanceAPI
};