#!/usr/bin/env node

/**
 * Performance Baseline Management CLI
 * 
 * Command-line interface for managing performance baselines,
 * analyzing trends, and performing maintenance operations.
 */

import { program } from 'commander';
import { PerformanceBaselineManager } from '../tests/utils/performance-baseline-manager.ts';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';

// Initialize baseline manager
const manager = new PerformanceBaselineManager({
  baselineDir: '.performance',
  archiveDir: '.performance/archives',
  environmentSeparation: true,
  enableTrendAnalysis: true
});

// Helper function to format duration
function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Helper function to format percentage
function formatPercentage(value) {
  return `${(value * 100).toFixed(1)}%`;
}

// Helper function to print success message
function success(message) {
  console.log(chalk.green('✓'), message);
}

// Helper function to print error message
function error(message) {
  console.error(chalk.red('✗'), message);
}

// Helper function to print warning message
function warning(message) {
  console.warn(chalk.yellow('⚠'), message);
}

// Helper function to print info message
function info(message) {
  console.log(chalk.blue('ℹ'), message);
}

program
  .name('perf-baseline')
  .description('Performance baseline management for Stack Auth Astro integration tests')
  .version('1.0.0');

// List command - show all baselines
program
  .command('list')
  .description('List all performance baselines')
  .option('-e, --environment <env>', 'Filter by environment')
  .option('-f, --file <file>', 'Filter by test file')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('--min-runs <n>', 'Minimum number of runs', parseInt)
  .option('--format <format>', 'Output format (table|json|csv)', 'table')
  .action((options) => {
    const criteria = {
      testFile: options.file,
      environment: options.environment,
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
      minRuns: options.minRuns
    };

    const baselines = options.environment || options.file || options.tags || options.minRuns
      ? manager.findBaselines(criteria)
      : manager.getAllBaselines();

    if (baselines.length === 0) {
      info('No baselines found matching criteria');
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(baselines, null, 2));
      return;
    }

    if (options.format === 'csv') {
      const csv = manager.exportBaselines({ 
        testFilter: () => true, 
        format: 'csv' 
      });
      console.log(csv);
      return;
    }

    // Table format
    const table = new Table({
      head: [
        'Test',
        'Avg Duration',
        'P95',
        'Success Rate',
        'Cache Hit',
        'Runs',
        'Environment',
        'Last Run'
      ],
      style: {
        head: ['cyan']
      }
    });

    baselines.forEach(baseline => {
      table.push([
        `${baseline.testFile}::${baseline.testName}`.substring(0, 40),
        formatDuration(baseline.metrics.averageDuration),
        formatDuration(baseline.metrics.p95Duration),
        formatPercentage(baseline.qualityMetrics.successRate),
        formatPercentage(baseline.qualityMetrics.cacheHitRate),
        baseline.metadata.totalRuns,
        baseline.environmentInfo.fingerprint.substring(0, 8),
        new Date(baseline.metadata.lastRunAt).toLocaleDateString()
      ]);
    });

    console.log(table.toString());
    info(`Total baselines: ${baselines.length}`);
  });

// Show command - detailed view of a specific baseline
program
  .command('show <testFile> <testName>')
  .description('Show detailed information about a specific baseline')
  .action((testFile, testName) => {
    const baseline = manager.getBaseline(testFile, testName);

    if (!baseline) {
      error(`Baseline not found for ${testFile}::${testName}`);
      process.exit(1);
    }

    console.log(chalk.bold('\n📊 Performance Baseline Details\n'));
    console.log(chalk.cyan('Test:'), `${baseline.testFile}::${baseline.testName}`);
    console.log(chalk.cyan('Version:'), baseline.version);
    console.log(chalk.cyan('Environment:'), baseline.environmentInfo.fingerprint);
    
    console.log(chalk.bold('\n⏱️  Performance Metrics'));
    const metricsTable = new Table();
    metricsTable.push(
      ['Average Duration', formatDuration(baseline.metrics.averageDuration)],
      ['P50 (Median)', formatDuration(baseline.metrics.p50Duration)],
      ['P90', formatDuration(baseline.metrics.p90Duration)],
      ['P95', formatDuration(baseline.metrics.p95Duration)],
      ['P99', formatDuration(baseline.metrics.p99Duration)],
      ['Min', formatDuration(baseline.metrics.minDuration)],
      ['Max', formatDuration(baseline.metrics.maxDuration)],
      ['Std Deviation', formatDuration(baseline.metrics.standardDeviation)]
    );
    console.log(metricsTable.toString());

    console.log(chalk.bold('\n✅ Quality Metrics'));
    const qualityTable = new Table();
    qualityTable.push(
      ['Success Rate', formatPercentage(baseline.qualityMetrics.successRate)],
      ['Cache Hit Rate', formatPercentage(baseline.qualityMetrics.cacheHitRate)],
      ['Error Rate', formatPercentage(baseline.qualityMetrics.errorRate)],
      ['Timeout Rate', formatPercentage(baseline.qualityMetrics.timeoutRate)]
    );
    console.log(qualityTable.toString());

    console.log(chalk.bold('\n🖥️  Environment Info'));
    const envTable = new Table();
    envTable.push(
      ['Node Version', baseline.environmentInfo.nodeVersion],
      ['Platform', baseline.environmentInfo.platform],
      ['Architecture', baseline.environmentInfo.arch],
      ['CPU Count', baseline.environmentInfo.cpuCount],
      ['Total Memory', `${(baseline.environmentInfo.totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`],
      ['CI Environment', baseline.environmentInfo.isCI ? 'Yes' : 'No']
    );
    if (baseline.environmentInfo.ciProvider) {
      envTable.push(['CI Provider', baseline.environmentInfo.ciProvider]);
    }
    console.log(envTable.toString());

    console.log(chalk.bold('\n📝 Metadata'));
    const metaTable = new Table();
    metaTable.push(
      ['Created', new Date(baseline.metadata.createdAt).toLocaleString()],
      ['Updated', new Date(baseline.metadata.updatedAt).toLocaleString()],
      ['Last Run', new Date(baseline.metadata.lastRunAt).toLocaleString()],
      ['Total Runs', baseline.metadata.totalRuns],
      ['Valid Runs', baseline.metadata.validRuns],
      ['History Points', baseline.history.length]
    );
    if (baseline.metadata.tags.length > 0) {
      metaTable.push(['Tags', baseline.metadata.tags.join(', ')]);
    }
    if (baseline.metadata.notes) {
      metaTable.push(['Notes', baseline.metadata.notes.substring(0, 100)]);
    }
    console.log(metaTable.toString());
  });

// Trends command - analyze performance trends
program
  .command('trends')
  .description('Analyze performance trends')
  .option('-f, --file <file>', 'Analyze specific test file')
  .option('-t, --test <test>', 'Analyze specific test')
  .action((options) => {
    const trends = manager.analyzeTrends(options.file, options.test);

    if (trends.length === 0) {
      info('No trend data available (need at least 5 data points per test)');
      return;
    }

    console.log(chalk.bold('\n📈 Performance Trends Analysis\n'));

    const table = new Table({
      head: ['Test', 'Trend', 'Change', 'Confidence', 'Data Points', 'Recommendation'],
      style: { head: ['cyan'] }
    });

    trends.forEach(trend => {
      const trendIcon = {
        'improving': chalk.green('↓'),
        'degrading': chalk.red('↑'),
        'stable': chalk.blue('→'),
        'volatile': chalk.yellow('↕')
      }[trend.trendType];

      const changeColor = trend.trendPercentage > 0 ? chalk.red : chalk.green;

      table.push([
        trend.testKey.substring(0, 30),
        `${trendIcon} ${trend.trendType}`,
        changeColor(`${trend.trendPercentage > 0 ? '+' : ''}${trend.trendPercentage.toFixed(1)}%`),
        `${trend.confidence.toFixed(0)}%`,
        trend.dataPoints,
        trend.recommendation.substring(0, 40)
      ]);
    });

    console.log(table.toString());

    // Summary
    const degrading = trends.filter(t => t.trendType === 'degrading');
    const improving = trends.filter(t => t.trendType === 'improving');
    const volatile = trends.filter(t => t.trendType === 'volatile');

    console.log('\n' + chalk.bold('Summary:'));
    if (degrading.length > 0) {
      warning(`${degrading.length} tests showing performance degradation`);
    }
    if (improving.length > 0) {
      success(`${improving.length} tests showing performance improvement`);
    }
    if (volatile.length > 0) {
      warning(`${volatile.length} tests showing volatile performance`);
    }
  });

// Compare command - compare baselines across environments
program
  .command('compare <env1> <env2>')
  .description('Compare baselines between two environments')
  .option('--threshold <percent>', 'Difference threshold for highlighting', parseFloat, 10)
  .action((env1, env2, options) => {
    const comparisons = manager.compareEnvironments(env1, env2);

    if (comparisons.length === 0) {
      info('No common tests found between environments');
      return;
    }

    console.log(chalk.bold(`\n🔄 Environment Comparison: ${env1} vs ${env2}\n`));

    const table = new Table({
      head: ['Test', 'Perf Diff', 'Success Diff', 'Cache Diff', 'Recommendation'],
      style: { head: ['cyan'] }
    });

    comparisons.forEach(comp => {
      const perfColor = Math.abs(comp.performanceDiff) > options.threshold
        ? (comp.performanceDiff > 0 ? chalk.red : chalk.green)
        : chalk.white;

      table.push([
        comp.testKey.substring(0, 30),
        perfColor(`${comp.performanceDiff > 0 ? '+' : ''}${comp.performanceDiff.toFixed(1)}%`),
        `${comp.qualityDiff.successRate > 0 ? '+' : ''}${(comp.qualityDiff.successRate * 100).toFixed(1)}%`,
        `${comp.qualityDiff.cacheHitRate > 0 ? '+' : ''}${(comp.qualityDiff.cacheHitRate * 100).toFixed(1)}%`,
        comp.recommendation.substring(0, 40)
      ]);
    });

    console.log(table.toString());

    // Summary statistics
    const avgPerfDiff = comparisons.reduce((sum, c) => sum + c.performanceDiff, 0) / comparisons.length;
    const significantDiffs = comparisons.filter(c => Math.abs(c.performanceDiff) > options.threshold);

    console.log('\n' + chalk.bold('Summary:'));
    info(`Average performance difference: ${avgPerfDiff.toFixed(1)}%`);
    if (significantDiffs.length > 0) {
      warning(`${significantDiffs.length} tests with significant differences (>${options.threshold}%)`);
    }
  });

// Export command - export baselines for sharing
program
  .command('export <output>')
  .description('Export baselines to a file')
  .option('-e, --environment <env>', 'Export specific environment')
  .option('-f, --format <format>', 'Export format (json|csv)', 'json')
  .option('--include-history', 'Include full history in export')
  .action((output, options) => {
    try {
      const exportData = manager.exportBaselines({
        environment: options.environment,
        includeHistory: options.includeHistory,
        format: options.format
      });

      writeFileSync(resolve(output), exportData);
      success(`Baselines exported to ${output}`);
    } catch (err) {
      error(`Failed to export baselines: ${err.message}`);
      process.exit(1);
    }
  });

// Import command - import baselines from file
program
  .command('import <input>')
  .description('Import baselines from a file')
  .option('--merge', 'Merge with existing baselines')
  .option('--overwrite', 'Overwrite existing baselines')
  .action((input, options) => {
    try {
      if (!existsSync(input)) {
        error(`File not found: ${input}`);
        process.exit(1);
      }

      const data = readFileSync(resolve(input), 'utf-8');
      const result = manager.importBaselines(data, {
        merge: options.merge,
        overwrite: options.overwrite
      });

      success(`Imported ${result.imported} baselines`);
      if (result.skipped > 0) {
        info(`Skipped ${result.skipped} existing baselines`);
      }
      if (result.errors.length > 0) {
        warning('Import errors:');
        result.errors.forEach(err => console.log('  ', err));
      }
    } catch (err) {
      error(`Failed to import baselines: ${err.message}`);
      process.exit(1);
    }
  });

// Reset command - reset baselines
program
  .command('reset')
  .description('Reset performance baselines')
  .option('-f, --file <file>', 'Reset specific test file')
  .option('-t, --test <test>', 'Reset specific test')
  .option('--archive', 'Archive before resetting')
  .option('--force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      console.log(chalk.yellow('\n⚠️  Warning: This will delete baseline data!\n'));
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Are you sure? (y/N): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y') {
        info('Reset cancelled');
        return;
      }
    }

    const count = manager.resetBaselines({
      testFile: options.file,
      testName: options.test,
      archiveBeforeReset: options.archive
    });

    if (options.archive) {
      info('Baselines archived before reset');
    }
    success(`Reset ${count} baseline(s)`);
  });

// Archive command - manually archive baselines
program
  .command('archive')
  .description('Archive current baselines')
  .option('-r, --reason <reason>', 'Archive reason', 'manual')
  .action((options) => {
    const baselines = manager.getAllBaselines();
    
    if (baselines.length === 0) {
      info('No baselines to archive');
      return;
    }

    manager.archiveBaselines(baselines, options.reason);
    success(`Archived ${baselines.length} baselines`);
  });

// Tag command - add tags to baselines
program
  .command('tag <testFile> <testName> <tags...>')
  .description('Add tags to a baseline')
  .action((testFile, testName, tags) => {
    manager.tagBaseline(testFile, testName, tags);
    success(`Added ${tags.length} tag(s) to ${testFile}::${testName}`);
  });

// Note command - add notes to baselines
program
  .command('note <testFile> <testName> <note>')
  .description('Add a note to a baseline')
  .action((testFile, testName, note) => {
    manager.addNote(testFile, testName, note);
    success(`Added note to ${testFile}::${testName}`);
  });

// Stats command - show overall statistics
program
  .command('stats')
  .description('Show overall baseline statistics')
  .action(() => {
    const baselines = manager.getAllBaselines();
    
    if (baselines.length === 0) {
      info('No baselines available');
      return;
    }

    console.log(chalk.bold('\n📊 Overall Statistics\n'));

    // Calculate statistics
    const totalRuns = baselines.reduce((sum, b) => sum + b.metadata.totalRuns, 0);
    const avgDuration = baselines.reduce((sum, b) => sum + b.metrics.averageDuration, 0) / baselines.length;
    const avgSuccessRate = baselines.reduce((sum, b) => sum + b.qualityMetrics.successRate, 0) / baselines.length;
    const avgCacheHitRate = baselines.reduce((sum, b) => sum + b.qualityMetrics.cacheHitRate, 0) / baselines.length;
    
    const environments = new Set(baselines.map(b => b.environmentInfo.fingerprint));
    const testFiles = new Set(baselines.map(b => b.testFile));
    
    const oldestBaseline = baselines.reduce((oldest, b) => 
      b.metadata.createdAt < oldest.metadata.createdAt ? b : oldest
    );
    const newestBaseline = baselines.reduce((newest, b) => 
      b.metadata.lastRunAt > newest.metadata.lastRunAt ? b : newest
    );

    const table = new Table();
    table.push(
      [chalk.cyan('Total Baselines'), baselines.length],
      [chalk.cyan('Total Test Runs'), totalRuns],
      [chalk.cyan('Test Files'), testFiles.size],
      [chalk.cyan('Environments'), environments.size],
      ['', ''],
      [chalk.cyan('Average Duration'), formatDuration(avgDuration)],
      [chalk.cyan('Average Success Rate'), formatPercentage(avgSuccessRate)],
      [chalk.cyan('Average Cache Hit Rate'), formatPercentage(avgCacheHitRate)],
      ['', ''],
      [chalk.cyan('Oldest Baseline'), new Date(oldestBaseline.metadata.createdAt).toLocaleDateString()],
      [chalk.cyan('Most Recent Run'), new Date(newestBaseline.metadata.lastRunAt).toLocaleDateString()]
    );

    console.log(table.toString());

    // Top performers
    const topPerformers = baselines
      .sort((a, b) => a.metrics.averageDuration - b.metrics.averageDuration)
      .slice(0, 5);

    console.log(chalk.bold('\n🏆 Top 5 Fastest Tests'));
    topPerformers.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.testName} - ${formatDuration(b.metrics.averageDuration)}`);
    });

    // Bottom performers
    const bottomPerformers = baselines
      .sort((a, b) => b.metrics.averageDuration - a.metrics.averageDuration)
      .slice(0, 5);

    console.log(chalk.bold('\n🐌 Top 5 Slowest Tests'));
    bottomPerformers.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.testName} - ${formatDuration(b.metrics.averageDuration)}`);
    });
  });

// Gradual regression detection command
program
  .command('gradual-regressions')
  .alias('gradual')
  .description('Detect gradual performance regressions over time')
  .option('--days <days>', 'Time window in days to analyze', parseInt, 7)
  .option('--threshold <percent>', 'Regression threshold percentage', parseFloat, 15)
  .option('--min-points <n>', 'Minimum data points required', parseInt, 5)
  .option('--format <format>', 'Output format (table|json|markdown)', 'table')
  .action((options) => {
    const regressions = manager.detectGradualRegressions({
      gradualRegressionPercent: options.threshold,
      timeWindowDays: options.days,
      minDataPoints: options.minPoints,
      confidenceThreshold: 70
    });

    if (regressions.length === 0) {
      success('No gradual regressions detected');
      return;
    }

    console.log(chalk.bold(`\n🔍 Gradual Regression Analysis (${options.days} days)\n`));

    if (options.format === 'markdown') {
      console.log('# Gradual Regression Report\n');
      console.log(`**Analysis Period:** ${options.days} days`);
      console.log(`**Regression Threshold:** ${options.threshold}%`);
      console.log(`**Generated:** ${new Date().toISOString()}\n`);
      
      console.log('## Detected Regressions\n');
      console.log('| Test | Type | Severity | Total Change | Daily Change | Confidence | Affected Metrics |');
      console.log('|------|------|----------|--------------|--------------|------------|------------------|');
      
      regressions.forEach(reg => {
        const severityIcon = reg.severity === 'severe' ? '🔴' : 
                           reg.severity === 'moderate' ? '🟡' : '🟢';
        console.log(`| ${reg.testKey.substring(0, 25)} | ${reg.regressionType} | ${severityIcon} ${reg.severity} | +${reg.totalChange.toFixed(1)}% | +${reg.averageChangePerDay.toFixed(2)}%/day | ${reg.confidence.toFixed(0)}% | ${reg.affectedMetrics.join(', ')} |`);
      });
      
      const severeRegressions = regressions.filter(r => r.severity === 'severe');
      const moderateRegressions = regressions.filter(r => r.severity === 'moderate');
      
      console.log('\n## Summary\n');
      console.log(`- **Total regressions detected:** ${regressions.length}`);
      console.log(`- **Severe regressions:** ${severeRegressions.length}`);
      console.log(`- **Moderate regressions:** ${moderateRegressions.length}`);
      
      if (severeRegressions.length > 0) {
        console.log('\n### 🔴 Severe Regressions\n');
        severeRegressions.slice(0, 3).forEach(reg => {
          console.log(`**${reg.testKey}**`);
          console.log(`- Change: +${reg.totalChange.toFixed(1)}% over ${options.days} days`);
          console.log(`- Type: ${reg.regressionType}`);
          console.log(`- Recommendation: ${reg.recommendation}\n`);
        });
      }
      
    } else if (options.format === 'json') {
      console.log(JSON.stringify({
        analysis: {
          timeWindowDays: options.days,
          threshold: options.threshold,
          timestamp: new Date().toISOString(),
          regressions
        }
      }, null, 2));
    } else {
      // Table format
      const table = new Table({
        head: ['Test', 'Type', 'Severity', 'Change', 'Confidence', 'Metrics'],
        style: { head: ['cyan'] }
      });

      regressions.forEach(reg => {
        const severityColor = reg.severity === 'severe' ? chalk.red :
                             reg.severity === 'moderate' ? chalk.yellow :
                             chalk.green;
        
        const typeIcon = reg.regressionType === 'sudden' ? '⚡' :
                        reg.regressionType === 'volatile' ? '📈' : '📊';

        table.push([
          reg.testKey.substring(0, 25),
          `${typeIcon} ${reg.regressionType}`,
          severityColor(reg.severity),
          `+${reg.totalChange.toFixed(1)}%`,
          `${reg.confidence.toFixed(0)}%`,
          reg.affectedMetrics.join(', ')
        ]);
      });

      console.log(table.toString());
      
      // Recommendations
      console.log(chalk.bold('\n💡 Recommendations:\n'));
      const uniqueRecommendations = [...new Set(regressions.map(r => r.recommendation))];
      uniqueRecommendations.slice(0, 3).forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  });

// Compare branches command - compare current branch against main
program
  .command('compare-branches')
  .description('Compare performance between current branch and main baseline')
  .option('--format <format>', 'Output format (table|json|markdown)', 'markdown')
  .option('--threshold <percent>', 'Difference threshold for highlighting', parseFloat, 10)
  .action((options) => {
    // Try to get current branch from environment or git
    const currentBranch = process.env.GITHUB_HEAD_REF || 
                         process.env.GITHUB_REF?.replace('refs/heads/', '') || 
                         'current';
    const baseBranch = process.env.GITHUB_BASE_REF || 'main';
    
    // Load current branch baselines (from current environment)
    const currentBaselines = manager.getAllBaselines();
    
    // Try to load main branch baselines from artifacts or previous runs
    const mainManager = new PerformanceBaselineManager({
      baselineDir: '.performance',
      environmentSeparation: true
    });
    
    // Get main baseline environment fingerprint (simplified for comparison)
    const mainBaselines = mainManager.getAllBaselines();
    
    if (currentBaselines.length === 0 && mainBaselines.length === 0) {
      info('No baselines available for comparison');
      return;
    }
    
    console.log(chalk.bold(`\n🔄 Branch Performance Comparison: ${currentBranch} vs ${baseBranch}\n`));
    
    if (options.format === 'markdown') {
      console.log(`# Performance Comparison Report`);
      console.log(`\n**Branch:** \`${currentBranch}\` vs \`${baseBranch}\``);
      console.log(`**Generated:** ${new Date().toISOString()}\n`);
    }
    
    // Create comparison map
    const comparisons = [];
    const currentMap = new Map(currentBaselines.map(b => [
      `${b.testFile}::${b.testName}`, b
    ]));
    const mainMap = new Map(mainBaselines.map(b => [
      `${b.testFile}::${b.testName}`, b
    ]));
    
    // Compare common tests
    for (const [testKey, currentBaseline] of currentMap.entries()) {
      const mainBaseline = mainMap.get(testKey);
      if (mainBaseline) {
        const perfDiff = ((currentBaseline.metrics.averageDuration - mainBaseline.metrics.averageDuration) / mainBaseline.metrics.averageDuration) * 100;
        const successDiff = currentBaseline.qualityMetrics.successRate - mainBaseline.qualityMetrics.successRate;
        const cacheDiff = currentBaseline.qualityMetrics.cacheHitRate - mainBaseline.qualityMetrics.cacheHitRate;
        
        comparisons.push({
          testKey,
          currentDuration: currentBaseline.metrics.averageDuration,
          mainDuration: mainBaseline.metrics.averageDuration,
          perfDiff,
          successDiff,
          cacheDiff,
          significant: Math.abs(perfDiff) > options.threshold
        });
      }
    }
    
    if (comparisons.length === 0) {
      if (options.format === 'markdown') {
        console.log('## No Common Tests Found\n');
        console.log('No tests were found in both branches for comparison.');
      } else {
        info('No common tests found for comparison');
      }
      return;
    }
    
    // Sort by performance difference (worst first)
    comparisons.sort((a, b) => Math.abs(b.perfDiff) - Math.abs(a.perfDiff));
    
    if (options.format === 'markdown') {
      console.log('## Performance Changes\n');
      console.log('| Test | Current Duration | Main Duration | Change | Success Rate | Cache Hit Rate |');
      console.log('|------|------------------|---------------|---------|--------------|----------------|');
      
      comparisons.forEach(comp => {
        const changeIcon = comp.perfDiff > 0 ? '🔴' : '🟢';
        const changeText = comp.significant ? 
          `${changeIcon} **${comp.perfDiff > 0 ? '+' : ''}${comp.perfDiff.toFixed(1)}%**` :
          `${comp.perfDiff > 0 ? '+' : ''}${comp.perfDiff.toFixed(1)}%`;
        
        console.log(`| ${comp.testKey.substring(0, 30)} | ${formatDuration(comp.currentDuration)} | ${formatDuration(comp.mainDuration)} | ${changeText} | ${comp.successDiff > 0 ? '+' : ''}${(comp.successDiff * 100).toFixed(1)}% | ${comp.cacheDiff > 0 ? '+' : ''}${(comp.cacheDiff * 100).toFixed(1)}% |`);
      });
      
      const significantRegressions = comparisons.filter(c => c.perfDiff > options.threshold);
      const significantImprovements = comparisons.filter(c => c.perfDiff < -options.threshold);
      
      console.log('\n## Summary\n');
      console.log(`- **Total tests compared:** ${comparisons.length}`);
      console.log(`- **Significant regressions (>${options.threshold}%):** ${significantRegressions.length}`);
      console.log(`- **Significant improvements (>${options.threshold}%):** ${significantImprovements.length}`);
      
      if (significantRegressions.length > 0) {
        console.log('\n### 🔴 Performance Regressions\n');
        significantRegressions.slice(0, 5).forEach(comp => {
          console.log(`- **${comp.testKey}**: ${formatDuration(comp.currentDuration)} (+${comp.perfDiff.toFixed(1)}% vs main)`);
        });
      }
      
      if (significantImprovements.length > 0) {
        console.log('\n### 🟢 Performance Improvements\n');
        significantImprovements.slice(0, 5).forEach(comp => {
          console.log(`- **${comp.testKey}**: ${formatDuration(comp.currentDuration)} (${comp.perfDiff.toFixed(1)}% vs main)`);
        });
      }
      
    } else if (options.format === 'json') {
      console.log(JSON.stringify({
        comparison: {
          currentBranch,
          baseBranch,
          timestamp: new Date().toISOString(),
          summary: {
            totalTests: comparisons.length,
            significantRegressions: comparisons.filter(c => c.perfDiff > options.threshold).length,
            significantImprovements: comparisons.filter(c => c.perfDiff < -options.threshold).length
          },
          details: comparisons
        }
      }, null, 2));
    } else {
      // Table format
      const table = new Table({
        head: ['Test', 'Current', 'Main', 'Change %', 'Status'],
        style: { head: ['cyan'] }
      });
      
      comparisons.forEach(comp => {
        const statusIcon = comp.perfDiff > options.threshold ? chalk.red('🔴') :
                          comp.perfDiff < -options.threshold ? chalk.green('🟢') :
                          chalk.blue('⚪');
        
        const changeColor = Math.abs(comp.perfDiff) > options.threshold
          ? (comp.perfDiff > 0 ? chalk.red : chalk.green)
          : chalk.white;
        
        table.push([
          comp.testKey.substring(0, 30),
          formatDuration(comp.currentDuration),
          formatDuration(comp.mainDuration),
          changeColor(`${comp.perfDiff > 0 ? '+' : ''}${comp.perfDiff.toFixed(1)}%`),
          statusIcon
        ]);
      });
      
      console.log(table.toString());
    }
  });

// Clean command - cleanup old baselines
program
  .command('clean')
  .description('Clean up old baselines and archives')
  .option('--days <days>', 'Archive baselines older than N days', parseInt, 30)
  .option('--dry-run', 'Show what would be cleaned without doing it')
  .action((options) => {
    const baselines = manager.getAllBaselines();
    const cutoff = Date.now() - (options.days * 24 * 60 * 60 * 1000);
    
    const toClean = baselines.filter(b => b.metadata.lastRunAt < cutoff);
    
    if (toClean.length === 0) {
      info('No baselines to clean');
      return;
    }

    console.log(chalk.bold(`\n🧹 Baselines to clean (older than ${options.days} days):\n`));
    toClean.forEach(b => {
      console.log(`  - ${b.testFile}::${b.testName} (last run: ${new Date(b.metadata.lastRunAt).toLocaleDateString()})`);
    });

    if (options.dryRun) {
      info(`Would archive ${toClean.length} baseline(s)`);
    } else {
      manager.archiveBaselines(toClean, `auto-cleanup-${options.days}days`);
      toClean.forEach(b => {
        manager.resetBaselines({
          testFile: b.testFile,
          testName: b.testName
        });
      });
      success(`Archived and cleaned ${toClean.length} baseline(s)`);
    }
  });

program.parse(process.argv);