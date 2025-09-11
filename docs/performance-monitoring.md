# Performance Monitoring & Historical Trending

## Overview

The Stack Auth Astro integration includes comprehensive performance monitoring with persistent baseline storage, historical trending, and automated regression detection. This system enables long-term performance analysis and prevents gradual degradation over time.

## Features

### 🏗️ Persistent Baseline Storage
- **GitHub Actions Artifacts**: Performance baselines are stored as CI artifacts with 90-day retention
- **Cross-build Persistence**: Baselines persist across CI runs and PR builds
- **Environment Separation**: Different environments maintain separate baseline files
- **Automatic Download**: Previous baselines are automatically retrieved in PR builds

### 📈 Historical Performance Trending
- **Time-series Analysis**: Track performance metrics over time with statistical analysis
- **Trend Detection**: Identify improving, degrading, stable, or volatile performance patterns
- **Confidence Scoring**: Statistical confidence levels for trend reliability
- **Multiple Metrics**: Duration, success rate, cache hit rate, and dependency resolution times

### 🔍 Gradual Regression Detection
- **Linear Regression Analysis**: Detect subtle performance degradation over time windows
- **Configurable Thresholds**: Customizable regression percentage and time window settings
- **Multi-metric Analysis**: Simultaneous analysis of duration, success rate, and cache efficiency
- **Severity Classification**: Minor, moderate, and severe regression categories

### 🎯 Branch Comparison
- **PR vs Main**: Automatic comparison of feature branch performance against main baseline
- **Markdown Reports**: Detailed comparison reports for PR review
- **Threshold Highlighting**: Significant differences highlighted in reports
- **Multi-environment Support**: Compare performance across different CI environments

### 📊 Performance Dashboard
- **HTML Dashboard**: Interactive dashboard with charts and trend visualization
- **Real-time Metrics**: Current performance status and historical trends
- **Regression Alerts**: Visual alerts for performance issues
- **Top/Bottom Performers**: Identify fastest and slowest tests

## Usage

### CLI Commands

```bash
# Basic baseline operations
npm run perf:baseline                    # Create/update baselines
npm run perf:baseline:list              # List all baselines
npm run perf:baseline:stats             # Show overall statistics
npm run perf:baseline:trends            # Analyze performance trends

# Advanced analysis
npm run perf:baseline:gradual           # Detect gradual regressions
npm run perf:baseline:compare-branches  # Compare branches
npm run perf:dashboard                  # Generate HTML dashboard
npm run perf:dashboard:open             # Generate and open dashboard

# Maintenance
npm run perf:baseline:clean             # Archive old baselines
npm run perf:baseline:export            # Export baselines to file
npm run perf:baseline:reset             # Reset baselines (with archive)
```

### Advanced CLI Options

```bash
# Gradual regression detection with custom settings
node scripts/performance-baseline-cli.js gradual-regressions \
  --days 14 \
  --threshold 20 \
  --min-points 10 \
  --format markdown

# Branch comparison with custom threshold
node scripts/performance-baseline-cli.js compare-branches \
  --format markdown \
  --threshold 15

# Dashboard with custom output
node scripts/performance-dashboard.js generate \
  --output-dir custom-dashboard \
  --output-file report.html \
  --open
```

## CI/CD Integration

### Automatic Processes

1. **Baseline Download**: Previous performance baselines are downloaded from artifacts
2. **Performance Monitoring**: Current build performance is measured and recorded
3. **Trend Analysis**: Historical trends are analyzed for patterns
4. **Regression Detection**: Both sudden and gradual regressions are detected
5. **Branch Comparison**: PR performance is compared against main branch
6. **Dashboard Generation**: Updated dashboard is generated for main branch
7. **Artifact Upload**: New baselines and reports are stored as artifacts

### Regression Alerts

When performance regressions are detected, the CI system will:
- ❌ **Fail the build** for severe regressions
- 💬 **Comment on PR** with detailed regression analysis
- 📊 **Generate reports** with optimization recommendations
- 📦 **Archive artifacts** for further investigation

### Configuration

Environment variables for CI customization:

```yaml
# In GitHub Actions workflow
env:
  STRICT_PERFORMANCE: 'true'        # Fail on moderate regressions
  STACK_AUTH_PERF_DEBUG: 'true'     # Enable detailed performance logging
  STACK_AUTH_PERF_JSON: 'true'      # Output JSON performance data
```

## Data Storage Structure

```
.performance/
├── baselines-{environment}.json     # Environment-specific baselines
├── archives/                       # Archived historical data
│   ├── archive-{timestamp}.json    # Archived baseline snapshots
│   └── metadata.json              # Archive metadata
└── dashboard-data/                 # Dashboard generation cache
```

## Performance Baseline Format

```typescript
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
```

## Analysis Methods

### Trend Analysis
- **Linear Regression**: Calculate performance trend over time
- **Volatility Assessment**: Measure performance consistency
- **Confidence Scoring**: Statistical reliability of trend data
- **Projection**: Estimate future performance based on trends

### Regression Detection
- **Statistical Significance**: R-squared confidence metrics
- **Threshold-based**: Configurable regression percentage thresholds
- **Time Window Analysis**: Configurable analysis periods
- **Multi-metric**: Simultaneous analysis of multiple performance dimensions

### Reporting
- **Markdown Reports**: Human-readable analysis for PR reviews
- **JSON Data**: Machine-readable data for automation
- **HTML Dashboard**: Interactive visualization for teams
- **CLI Tables**: Quick command-line summaries

## Best Practices

### Baseline Management
1. **Regular Archiving**: Archive old baselines to prevent data bloat
2. **Environment Consistency**: Maintain separate baselines per environment
3. **Meaningful Tags**: Use tags to categorize and filter baselines
4. **Documentation**: Add notes to baselines for context

### Regression Thresholds
1. **Conservative Defaults**: Start with conservative thresholds (10-15%)
2. **Gradual Tightening**: Tighten thresholds as performance stabilizes
3. **Test-specific Tuning**: Adjust thresholds per test characteristics
4. **Environment Factors**: Consider CI environment variability

### Dashboard Usage
1. **Regular Review**: Check dashboard weekly for trends
2. **Share Reports**: Include dashboard links in team updates
3. **Historical Context**: Use historical data for optimization planning
4. **Proactive Monitoring**: Address trends before they become regressions

## Troubleshooting

### Common Issues

**No baseline data available**
```bash
# Check if baselines exist
npm run perf:baseline:list

# Create initial baselines
npm run test && npm run perf:baseline
```

**Dashboard generation fails**
```bash
# Check baseline data
npm run perf:baseline:stats

# Generate with debug info
node scripts/performance-dashboard.js generate --verbose
```

**Regression false positives**
```bash
# Adjust thresholds
npm run perf:baseline:gradual --threshold 20 --days 14

# Check data quality
npm run perf:baseline:trends
```

### Debug Commands

```bash
# Enable detailed performance logging
export STACK_AUTH_PERF_DEBUG=true
npm test

# Export performance data for analysis
npm run perf:baseline:export performance-data.json

# Check baseline validity
npm run perf:baseline:list --min-runs 5
```

## Integration with Sprint 001

This performance monitoring system builds upon the foundation established in Sprint 001:

- **Task 1.3.4**: Enhanced existing performance monitoring with persistence
- **Task 1.3.5**: Added historical trending and dashboard capabilities
- **Future Sprints**: Provides performance data for optimization decisions

The system is designed to evolve with the integration, providing increasingly sophisticated performance insights as the codebase grows and matures.