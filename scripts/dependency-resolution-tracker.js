#!/usr/bin/env node
/**
 * Dependency Resolution Tracker
 * 
 * Monitors and tracks dependency resolution performance during builds,
 * including module resolution time, cache effectiveness, and bottlenecks.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

class DependencyResolutionTracker {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || process.env.DEP_RESOLUTION_VERBOSE === 'true',
      trackNodeModules: options.trackNodeModules !== false,
      trackTypeResolution: options.trackTypeResolution !== false,
      ...options
    };
    
    this.metrics = {
      totalResolutionTime: 0,
      moduleResolutions: [],
      typeResolutions: [],
      cacheHits: 0,
      cacheMisses: 0,
      slowResolutions: [],
      resolutionErrors: [],
      packageStats: new Map(),
      resolutionPaths: new Set()
    };
    
    this.resolutionStartTime = null;
    this.activeResolutions = new Map();
  }

  /**
   * Start tracking dependency resolution
   */
  startTracking() {
    this.resolutionStartTime = Date.now();
    
    if (this.options.verbose) {
      console.log(chalk.blue('🔍 Starting dependency resolution tracking...'));
    }
  }

  /**
   * Stop tracking and calculate final metrics
   */
  stopTracking() {
    if (this.resolutionStartTime) {
      this.metrics.totalResolutionTime = Date.now() - this.resolutionStartTime;
    }
    
    // Calculate cache hit rate
    const totalResolutions = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = totalResolutions > 0 
      ? (this.metrics.cacheHits / totalResolutions) * 100 
      : 0;
    
    // Identify slow resolutions (top 10% slowest)
    const allResolutions = [...this.metrics.moduleResolutions, ...this.metrics.typeResolutions];
    if (allResolutions.length > 0) {
      const sortedByDuration = allResolutions.sort((a, b) => b.duration - a.duration);
      const slowThreshold = Math.ceil(sortedByDuration.length * 0.1); // Top 10%
      this.metrics.slowResolutions = sortedByDuration.slice(0, slowThreshold);
    }
    
    if (this.options.verbose) {
      console.log(chalk.green('✅ Dependency resolution tracking complete'));
    }
  }

  /**
   * Track a single module resolution
   */
  async trackModuleResolution(moduleName, resolutionPath, startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const resolution = {
      type: 'module',
      name: moduleName,
      path: resolutionPath,
      duration,
      startTime,
      endTime,
      cached: await this.isResolutionCached(moduleName, resolutionPath)
    };
    
    this.metrics.moduleResolutions.push(resolution);
    this.metrics.resolutionPaths.add(resolutionPath);
    
    // Update package stats
    const packageName = this.extractPackageName(moduleName);
    if (packageName) {
      const stats = this.metrics.packageStats.get(packageName) || {
        resolutions: 0,
        totalDuration: 0,
        averageDuration: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
      
      stats.resolutions++;
      stats.totalDuration += duration;
      stats.averageDuration = stats.totalDuration / stats.resolutions;
      
      if (resolution.cached) {
        stats.cacheHits++;
        this.metrics.cacheHits++;
      } else {
        stats.cacheMisses++;
        this.metrics.cacheMisses++;
      }
      
      this.metrics.packageStats.set(packageName, stats);
    }
    
    if (this.options.verbose && duration > 100) {
      console.log(chalk.yellow(`⚠️  Slow resolution: ${moduleName} (${duration}ms)`));
    }
    
    return resolution;
  }

  /**
   * Track TypeScript type resolution
   */
  async trackTypeResolution(typeName, resolutionPath, startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const resolution = {
      type: 'type',
      name: typeName,
      path: resolutionPath,
      duration,
      startTime,
      endTime,
      cached: await this.isTypeResolutionCached(typeName, resolutionPath)
    };
    
    this.metrics.typeResolutions.push(resolution);
    
    if (resolution.cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    return resolution;
  }

  /**
   * Track resolution error
   */
  trackResolutionError(moduleName, error, duration = 0) {
    const resolutionError = {
      name: moduleName,
      error: error.message,
      code: error.code,
      duration,
      timestamp: Date.now()
    };
    
    this.metrics.resolutionErrors.push(resolutionError);
    
    if (this.options.verbose) {
      console.log(chalk.red(`❌ Resolution error: ${moduleName} - ${error.message}`));
    }
    
    return resolutionError;
  }

  /**
   * Check if module resolution was cached
   */
  async isResolutionCached(moduleName, resolutionPath) {
    try {
      // Check if it's in node_modules (likely cached by npm/pnpm/yarn)
      if (resolutionPath.includes('node_modules')) {
        return true;
      }
      
      // Check for TypeScript module resolution cache
      const tsBuildInfo = path.join(projectRoot, 'tsconfig.build.tsbuildinfo');
      if (await this.fileExists(tsBuildInfo)) {
        const buildInfo = JSON.parse(await fs.readFile(tsBuildInfo, 'utf8'));
        if (buildInfo.program?.options?.moduleResolution) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if type resolution was cached
   */
  async isTypeResolutionCached(typeName, resolutionPath) {
    try {
      // Check for .d.ts files in node_modules (cached type definitions)
      if (resolutionPath.includes('node_modules') && resolutionPath.includes('.d.ts')) {
        return true;
      }
      
      // Check TypeScript compiler cache
      const tsBuildInfo = path.join(projectRoot, 'tsconfig.build.tsbuildinfo');
      return await this.fileExists(tsBuildInfo);
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract package name from module specifier
   */
  extractPackageName(moduleName) {
    if (moduleName.startsWith('@')) {
      // Scoped package: @scope/package
      const parts = moduleName.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : moduleName;
    } else if (moduleName.includes('/')) {
      // Regular package with subpath: package/subpath
      return moduleName.split('/')[0];
    } else {
      // Simple package name
      return moduleName;
    }
  }

  /**
   * Analyze package.json dependencies for resolution insights
   */
  async analyzePackageDependencies() {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };
      
      const analysis = {
        totalDependencies: Object.keys(allDeps).length,
        scopedPackages: Object.keys(allDeps).filter(name => name.startsWith('@')).length,
        localPackages: Object.keys(allDeps).filter(name => 
          allDeps[name].startsWith('file:') || allDeps[name].startsWith('link:')
        ).length,
        externalPackages: Object.keys(allDeps).filter(name => 
          !allDeps[name].startsWith('file:') && 
          !allDeps[name].startsWith('link:') &&
          !allDeps[name].startsWith('workspace:')
        ).length
      };
      
      return { dependencies: allDeps, analysis };
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not analyze package dependencies: ${error.message}`));
      return null;
    }
  }

  /**
   * Analyze node_modules structure for resolution performance insights
   */
  async analyzeNodeModulesStructure() {
    if (!this.options.trackNodeModules) return null;
    
    try {
      const nodeModulesPath = path.join(projectRoot, 'node_modules');
      const analysis = {
        totalPackages: 0,
        nestedLevels: 0,
        duplicatePackages: new Map(),
        largePackages: [],
        symlinkCount: 0
      };
      
      await this.scanNodeModulesRecursive(nodeModulesPath, analysis, 0);
      
      return analysis;
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not analyze node_modules: ${error.message}`));
      return null;
    }
  }

  /**
   * Recursively scan node_modules directory
   */
  async scanNodeModulesRecursive(dir, analysis, level) {
    if (level > 10) return; // Prevent infinite recursion
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      analysis.nestedLevels = Math.max(analysis.nestedLevels, level);
      
      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          analysis.symlinkCount++;
        }
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const packagePath = path.join(dir, entry.name);
          analysis.totalPackages++;
          
          // Track duplicate packages
          const packageName = entry.name.startsWith('@') && level === 0
            ? entry.name // Scoped package root
            : path.basename(packagePath);
          
          if (analysis.duplicatePackages.has(packageName)) {
            analysis.duplicatePackages.set(packageName, analysis.duplicatePackages.get(packageName) + 1);
          } else {
            analysis.duplicatePackages.set(packageName, 1);
          }
          
          // Check package size (if it has a package.json)
          try {
            const packageJsonPath = path.join(packagePath, 'package.json');
            if (await this.fileExists(packageJsonPath)) {
              const stats = await fs.stat(packagePath);
              if (stats.size > 10 * 1024 * 1024) { // 10MB
                analysis.largePackages.push({
                  name: packageName,
                  path: packagePath,
                  size: stats.size
                });
              }
            }
          } catch (e) {
            // Skip packages without readable package.json
          }
          
          // Recurse into nested node_modules
          const nestedNodeModules = path.join(packagePath, 'node_modules');
          if (await this.fileExists(nestedNodeModules)) {
            await this.scanNodeModulesRecursive(nestedNodeModules, analysis, level + 1);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Generate comprehensive dependency resolution report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      performance: {
        totalResolutionTime: this.metrics.totalResolutionTime,
        totalResolutionTimeFormatted: this.formatDuration(this.metrics.totalResolutionTime),
        cacheHitRate: this.metrics.cacheHitRate.toFixed(1),
        totalResolutions: this.metrics.moduleResolutions.length + this.metrics.typeResolutions.length,
        moduleResolutions: this.metrics.moduleResolutions.length,
        typeResolutions: this.metrics.typeResolutions.length,
        resolutionErrors: this.metrics.resolutionErrors.length,
        uniquePaths: this.metrics.resolutionPaths.size
      },
      slowResolutions: this.metrics.slowResolutions.map(res => ({
        name: res.name,
        type: res.type,
        duration: res.duration,
        durationFormatted: this.formatDuration(res.duration),
        path: res.path.length > 100 ? '...' + res.path.slice(-97) : res.path
      })),
      packageStats: Array.from(this.metrics.packageStats.entries()).map(([name, stats]) => ({
        package: name,
        resolutions: stats.resolutions,
        averageDuration: Math.round(stats.averageDuration),
        averageDurationFormatted: this.formatDuration(stats.averageDuration),
        cacheHitRate: ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1),
        totalDuration: stats.totalDuration,
        totalDurationFormatted: this.formatDuration(stats.totalDuration)
      })).sort((a, b) => b.totalDuration - a.totalDuration).slice(0, 10), // Top 10 by total time
      errors: this.metrics.resolutionErrors.map(err => ({
        module: err.name,
        error: err.error,
        code: err.code,
        duration: err.duration
      }))
    };

    // Add package dependency analysis
    const packageAnalysis = await this.analyzePackageDependencies();
    if (packageAnalysis) {
      report.dependencies = packageAnalysis.analysis;
    }

    // Add node_modules analysis
    const nodeModulesAnalysis = await this.analyzeNodeModulesStructure();
    if (nodeModulesAnalysis) {
      report.nodeModules = {
        totalPackages: nodeModulesAnalysis.totalPackages,
        nestedLevels: nodeModulesAnalysis.nestedLevels,
        symlinkCount: nodeModulesAnalysis.symlinkCount,
        duplicateCount: Array.from(nodeModulesAnalysis.duplicatePackages.values())
          .filter(count => count > 1).length,
        largePackageCount: nodeModulesAnalysis.largePackages.length
      };
    }

    return report;
  }

  /**
   * Display dependency resolution report
   */
  displayReport(report) {
    console.log('\n' + chalk.blue('📦 Dependency Resolution Report:'));
    
    // Performance summary
    console.log(chalk.green(`⏱️  Total resolution time: ${report.performance.totalResolutionTimeFormatted}`));
    console.log(`📊 Cache hit rate: ${report.performance.cacheHitRate}%`);
    console.log(`🔍 Total resolutions: ${report.performance.totalResolutions}`);
    console.log(`   • Module resolutions: ${report.performance.moduleResolutions}`);
    console.log(`   • Type resolutions: ${report.performance.typeResolutions}`);
    
    if (report.performance.resolutionErrors > 0) {
      console.log(chalk.red(`❌ Resolution errors: ${report.performance.resolutionErrors}`));
    }

    // Slow resolutions
    if (report.slowResolutions.length > 0) {
      console.log('\n⚠️  Slowest resolutions:');
      report.slowResolutions.slice(0, 5).forEach((res, index) => {
        console.log(`   ${index + 1}. ${res.name} (${res.type}): ${res.durationFormatted}`);
      });
    }

    // Package statistics
    if (report.packageStats.length > 0) {
      console.log('\n📈 Top packages by resolution time:');
      report.packageStats.slice(0, 5).forEach((pkg, index) => {
        console.log(`   ${index + 1}. ${pkg.package}: ${pkg.totalDurationFormatted} (${pkg.resolutions} resolutions, ${pkg.cacheHitRate}% cached)`);
      });
    }

    // Node modules insights
    if (report.nodeModules) {
      console.log('\n🗂️  Node modules structure:');
      console.log(`   Total packages: ${report.nodeModules.totalPackages}`);
      console.log(`   Nested levels: ${report.nodeModules.nestedLevels}`);
      console.log(`   Symlinks: ${report.nodeModules.symlinkCount}`);
      
      if (report.nodeModules.duplicateCount > 0) {
        console.log(chalk.yellow(`   Duplicate packages: ${report.nodeModules.duplicateCount}`));
      }
      
      if (report.nodeModules.largePackageCount > 0) {
        console.log(chalk.yellow(`   Large packages (>10MB): ${report.nodeModules.largePackageCount}`));
      }
    }

    // Generate recommendations
    this.generateRecommendations(report);
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(report) {
    console.log('\n💡 Optimization Recommendations:');
    
    const recommendations = [];
    
    // Cache hit rate recommendations
    if (parseFloat(report.performance.cacheHitRate) < 70) {
      recommendations.push('Low cache hit rate - ensure TypeScript incremental builds are enabled');
    }
    
    // Resolution time recommendations
    if (report.performance.totalResolutionTime > 5000) {
      recommendations.push('High total resolution time - consider using path mapping in tsconfig.json');
    }
    
    // Package-specific recommendations
    const slowPackages = report.packageStats.filter(pkg => pkg.averageDuration > 100);
    if (slowPackages.length > 0) {
      recommendations.push(`Slow resolving packages detected: ${slowPackages.map(p => p.package).join(', ')}`);
    }
    
    // Node modules recommendations
    if (report.nodeModules) {
      if (report.nodeModules.duplicateCount > 5) {
        recommendations.push('Multiple duplicate packages found - consider using pnpm or yarn with hoisting');
      }
      
      if (report.nodeModules.nestedLevels > 5) {
        recommendations.push('Deep nesting in node_modules - consider flattening dependencies');
      }
    }
    
    // Error-based recommendations
    if (report.performance.resolutionErrors > 0) {
      recommendations.push('Resolution errors detected - check missing dependencies and type definitions');
    }

    if (recommendations.length === 0) {
      console.log(chalk.green('  ✅ Dependency resolution performance looks good!'));
    } else {
      recommendations.forEach((rec, index) => {
        console.log(chalk.yellow(`  ${index + 1}. ${rec}`));
      });
    }
  }

  /**
   * Helper: Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Format duration in human readable format
   */
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Get metrics for external consumption
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHitRate,
      packageStats: Array.from(this.metrics.packageStats.entries())
    };
  }
}

export { DependencyResolutionTracker };