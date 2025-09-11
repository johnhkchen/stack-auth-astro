#!/usr/bin/env node

/**
 * Performance Dashboard Generator
 * 
 * Generates HTML dashboard reports for long-term performance analysis,
 * including trends, regressions, and historical data visualization.
 */

import { PerformanceBaselineManager } from '../tests/utils/performance-baseline-manager.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { program } from 'commander';

// Initialize baseline manager
const manager = new PerformanceBaselineManager({
  baselineDir: '.performance',
  archiveDir: '.performance/archives',
  environmentSeparation: true,
  enableTrendAnalysis: true
});

// Dashboard template
const dashboardTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Dashboard - Stack Auth Astro</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #2d3748;
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        
        .card h3 {
            color: #4a5568;
            margin-bottom: 1rem;
            font-size: 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            color: #718096;
            font-size: 0.9rem;
        }
        
        .metric-value {
            font-weight: bold;
            font-size: 1.1rem;
        }
        
        .status-good { color: #38a169; }
        .status-warning { color: #d69e2e; }
        .status-error { color: #e53e3e; }
        
        .chart-container {
            position: relative;
            height: 400px;
            width: 100%;
        }
        
        .regression-list {
            list-style: none;
        }
        
        .regression-item {
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            border-left: 4px solid;
        }
        
        .regression-severe {
            background: #fed7d7;
            border-color: #e53e3e;
        }
        
        .regression-moderate {
            background: #fefcbf;
            border-color: #d69e2e;
        }
        
        .regression-minor {
            background: #c6f6d5;
            border-color: #38a169;
        }
        
        .regression-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .regression-meta {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .trend-icon {
            font-size: 1.2rem;
            margin-right: 0.5rem;
        }
        
        .footer {
            text-align: center;
            padding: 2rem;
            color: #718096;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .container {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Performance Dashboard</h1>
        <p>Stack Auth Astro Integration - Long-term Performance Analysis</p>
        <p><small>Generated on {{timestamp}}</small></p>
    </div>
    
    <div class="container">
        <!-- Summary Cards -->
        <div class="grid">
            <div class="card">
                <h3>📈 Overview</h3>
                <div class="metric">
                    <span class="metric-label">Total Baselines</span>
                    <span class="metric-value">{{totalBaselines}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Test Files</span>
                    <span class="metric-value">{{totalTestFiles}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Runs</span>
                    <span class="metric-value">{{totalRuns}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Environments</span>
                    <span class="metric-value">{{totalEnvironments}}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>⚡ Performance</h3>
                <div class="metric">
                    <span class="metric-label">Average Duration</span>
                    <span class="metric-value">{{avgDuration}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">P95 Duration</span>
                    <span class="metric-value">{{p95Duration}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Success Rate</span>
                    <span class="metric-value {{successRateClass}}">{{avgSuccessRate}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Cache Hit Rate</span>
                    <span class="metric-value {{cacheHitClass}}">{{avgCacheHitRate}}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🔍 Regressions</h3>
                <div class="metric">
                    <span class="metric-label">Severe</span>
                    <span class="metric-value status-error">{{severeRegressions}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Moderate</span>
                    <span class="metric-value status-warning">{{moderateRegressions}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Minor</span>
                    <span class="metric-value status-good">{{minorRegressions}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total</span>
                    <span class="metric-value">{{totalRegressions}}</span>
                </div>
            </div>
        </div>
        
        <!-- Trends Chart -->
        <div class="card">
            <h3>📊 Performance Trends</h3>
            <div class="chart-container">
                <canvas id="trendsChart"></canvas>
            </div>
        </div>
        
        <!-- Regression Details -->
        <div class="card">
            <h3>⚠️ Recent Regressions</h3>
            <ul class="regression-list">
                {{regressionsList}}
            </ul>
        </div>
        
        <!-- Top Performers -->
        <div class="grid">
            <div class="card">
                <h3>🏆 Fastest Tests</h3>
                <ul style="list-style: none;">
                    {{fastestTests}}
                </ul>
            </div>
            
            <div class="card">
                <h3>🐌 Slowest Tests</h3>
                <ul style="list-style: none;">
                    {{slowestTests}}
                </ul>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>Performance data is stored in <code>.performance/</code> directory</p>
        <p>Dashboard generated by Stack Auth Astro Performance Monitoring System</p>
    </div>
    
    <script>
        // Performance trends chart
        const ctx = document.getElementById('trendsChart').getContext('2d');
        const trendsChart = new Chart(ctx, {
            type: 'line',
            data: {{chartData}},
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Performance Trends Over Time'
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Duration (ms)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
`;

function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPercentage(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function generateDashboard(options = {}) {
  const outputDir = options.outputDir || 'performance-dashboard';
  const outputFile = options.outputFile || 'index.html';
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all performance data
  const baselines = manager.getAllBaselines();
  const trends = manager.analyzeTrends();
  const regressions = manager.detectGradualRegressions({
    gradualRegressionPercent: 10,
    timeWindowDays: 7,
    minDataPoints: 3
  });
  
  if (baselines.length === 0) {
    console.warn('No baseline data available for dashboard generation');
    return;
  }
  
  // Calculate summary statistics
  const totalBaselines = baselines.length;
  const totalTestFiles = new Set(baselines.map(b => b.testFile)).size;
  const totalRuns = baselines.reduce((sum, b) => sum + b.metadata.totalRuns, 0);
  const totalEnvironments = new Set(baselines.map(b => b.environmentInfo.fingerprint)).size;
  
  const avgDuration = baselines.reduce((sum, b) => sum + b.metrics.averageDuration, 0) / baselines.length;
  const p95Duration = baselines.reduce((sum, b) => sum + b.metrics.p95Duration, 0) / baselines.length;
  const avgSuccessRate = baselines.reduce((sum, b) => sum + b.qualityMetrics.successRate, 0) / baselines.length;
  const avgCacheHitRate = baselines.reduce((sum, b) => sum + b.qualityMetrics.cacheHitRate, 0) / baselines.length;
  
  // Regression counts
  const severeRegressions = regressions.filter(r => r.severity === 'severe').length;
  const moderateRegressions = regressions.filter(r => r.severity === 'moderate').length;
  const minorRegressions = regressions.filter(r => r.severity === 'minor').length;
  
  // Generate regressions list HTML
  const regressionsList = regressions.slice(0, 10).map(reg => {
    const severityClass = `regression-${reg.severity}`;
    const typeIcon = reg.regressionType === 'sudden' ? '⚡' :
                    reg.regressionType === 'volatile' ? '📈' : '📊';
    
    return `
      <li class="regression-item ${severityClass}">
        <div class="regression-title">${typeIcon} ${reg.testKey}</div>
        <div class="regression-meta">
          ${reg.severity} • +${reg.totalChange.toFixed(1)}% change • ${reg.confidence.toFixed(0)}% confidence<br>
          <em>${reg.recommendation}</em>
        </div>
      </li>
    `;
  }).join('');
  
  // Generate top/bottom performers
  const sortedByDuration = [...baselines].sort((a, b) => a.metrics.averageDuration - b.metrics.averageDuration);
  const fastestTests = sortedByDuration.slice(0, 5).map((b, i) => 
    `<li><strong>${i + 1}.</strong> ${b.testName} - ${formatDuration(b.metrics.averageDuration)}</li>`
  ).join('');
  
  const slowestTests = sortedByDuration.slice(-5).reverse().map((b, i) => 
    `<li><strong>${i + 1}.</strong> ${b.testName} - ${formatDuration(b.metrics.averageDuration)}</li>`
  ).join('');
  
  // Generate chart data for trends
  const chartDatasets = [];
  const timeSeriesData = new Map();
  
  // Collect time series data from all baselines
  baselines.forEach(baseline => {
    baseline.history.forEach(point => {
      const date = new Date(point.timestamp).toISOString().split('T')[0];
      if (!timeSeriesData.has(date)) {
        timeSeriesData.set(date, []);
      }
      timeSeriesData.get(date).push(point.duration);
    });
  });
  
  // Create average duration dataset
  const sortedDates = Array.from(timeSeriesData.keys()).sort();
  const avgDurationData = sortedDates.map(date => {
    const durations = timeSeriesData.get(date);
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return { x: date, y: avg };
  });
  
  chartDatasets.push({
    label: 'Average Duration',
    data: avgDurationData,
    borderColor: 'rgb(75, 192, 192)',
    backgroundColor: 'rgba(75, 192, 192, 0.2)',
    tension: 0.1
  });
  
  const chartData = {
    datasets: chartDatasets
  };
  
  // Generate HTML
  let html = dashboardTemplate
    .replace('{{timestamp}}', new Date().toLocaleString())
    .replace('{{totalBaselines}}', totalBaselines)
    .replace('{{totalTestFiles}}', totalTestFiles)
    .replace('{{totalRuns}}', totalRuns.toLocaleString())
    .replace('{{totalEnvironments}}', totalEnvironments)
    .replace('{{avgDuration}}', formatDuration(avgDuration))
    .replace('{{p95Duration}}', formatDuration(p95Duration))
    .replace('{{avgSuccessRate}}', formatPercentage(avgSuccessRate))
    .replace('{{avgCacheHitRate}}', formatPercentage(avgCacheHitRate))
    .replace('{{successRateClass}}', avgSuccessRate >= 0.95 ? 'status-good' : avgSuccessRate >= 0.8 ? 'status-warning' : 'status-error')
    .replace('{{cacheHitClass}}', avgCacheHitRate >= 0.8 ? 'status-good' : avgCacheHitRate >= 0.5 ? 'status-warning' : 'status-error')
    .replace('{{severeRegressions}}', severeRegressions)
    .replace('{{moderateRegressions}}', moderateRegressions)
    .replace('{{minorRegressions}}', minorRegressions)
    .replace('{{totalRegressions}}', regressions.length)
    .replace('{{regressionsList}}', regressionsList || '<li style="color: #38a169;">No recent regressions detected 🎉</li>')
    .replace('{{fastestTests}}', fastestTests)
    .replace('{{slowestTests}}', slowestTests)
    .replace('{{chartData}}', JSON.stringify(chartData));
  
  // Write the dashboard file
  const dashboardPath = resolve(join(outputDir, outputFile));
  writeFileSync(dashboardPath, html);
  
  return dashboardPath;
}

// CLI interface
program
  .name('perf-dashboard')
  .description('Generate performance dashboard for Stack Auth Astro integration')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate performance dashboard HTML report')
  .option('-o, --output-dir <dir>', 'Output directory', 'performance-dashboard')
  .option('-f, --output-file <file>', 'Output HTML file name', 'index.html')
  .option('--open', 'Open dashboard in browser after generation')
  .action((options) => {
    try {
      console.log('🔄 Generating performance dashboard...');
      
      const dashboardPath = generateDashboard({
        outputDir: options.outputDir,
        outputFile: options.outputFile
      });
      
      console.log(`✅ Dashboard generated successfully at: ${dashboardPath}`);
      
      if (options.open) {
        const { spawn } = require('child_process');
        const open = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' : 'xdg-open';
        
        spawn(open, [dashboardPath], { detached: true, stdio: 'ignore' });
        console.log('🌐 Opening dashboard in browser...');
      } else {
        console.log(`📖 Open ${dashboardPath} in your browser to view the dashboard`);
      }
    } catch (error) {
      console.error('❌ Failed to generate dashboard:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

export { generateDashboard };