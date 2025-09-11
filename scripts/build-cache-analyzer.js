#!/usr/bin/env node
/**
 * Build Cache Analyzer
 * 
 * Analyzes and optimizes build cache effectiveness for TypeScript incremental builds,
 * TSUP bundling cache, and overall build performance caching strategies.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

class BuildCacheAnalyzer {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || process.env.CACHE_ANALYZER_VERBOSE === 'true',
      enableCacheWarming: options.enableCacheWarming !== false,
      trackCacheFiles: options.trackCacheFiles !== false,
      ...options
    };
    
    this.cacheAnalysis = {
      typescript: {
        enabled: false,
        buildInfoExists: false,
        buildInfoSize: 0,
        buildInfoAge: 0,
        incrementalEnabled: false,
        lastBuildTime: null,
        cacheEffectiveness: 0
      },
      tsup: {
        enabled: false,
        cacheDir: null,
        cacheSize: 0,
        cacheFiles: 0,
        lastCacheUpdate: null,
        cacheEffectiveness: 0
      },
      nodeModules: {
        exists: false,
        size: 0,
        packageCount: 0,
        lastModified: null,
        cacheAge: 0
      },
      overall: {
        totalCacheSize: 0,
        cacheHitRate: 0,
        cacheMissRate: 0,
        recommendedOptimizations: []
      }
    };
    
    this.cachePaths = {
      tsBuildInfo: path.join(projectRoot, 'tsconfig.build.tsbuildinfo'),
      tsupCache: path.join(projectRoot, 'node_modules', '.tsup'),
      nodeModules: path.join(projectRoot, 'node_modules'),
      packageLock: path.join(projectRoot, 'package-lock.json'),
      pnpmLock: path.join(projectRoot, 'pnpm-lock.yaml'),
      yarnLock: path.join(projectRoot, 'yarn.lock'),
    };
  }

  /**
   * Analyze all build caches
   */
  async analyzeBuildCaches() {
    if (this.options.verbose) {
      console.log(chalk.blue('🗄️  Analyzing build caches...'));
    }

    await Promise.all([
      this.analyzeTypeScriptCache(),
      this.analyzeTsupCache(),
      this.analyzeNodeModulesCache(),
      this.analyzePackageManagerCache()
    ]);

    this.calculateOverallCacheEffectiveness();
    
    return this.cacheAnalysis;
  }

  /**
   * Analyze TypeScript incremental build cache
   */
  async analyzeTypeScriptCache() {
    try {
      const buildInfoPath = this.cachePaths.tsBuildInfo;
      
      if (await this.fileExists(buildInfoPath)) {
        const stats = await fs.stat(buildInfoPath);
        const buildInfoContent = await fs.readFile(buildInfoPath, 'utf8');
        
        let buildInfo;
        try {
          buildInfo = JSON.parse(buildInfoContent);
        } catch (e) {
          buildInfo = {};
        }
        
        this.cacheAnalysis.typescript = {
          enabled: true,
          buildInfoExists: true,
          buildInfoSize: stats.size,
          buildInfoAge: Date.now() - stats.mtime.getTime(),
          incrementalEnabled: !!buildInfo.program?.options?.incremental,
          lastBuildTime: stats.mtime,
          files: buildInfo.program?.fileNames?.length || 0,
          affectedFiles: buildInfo.program?.affectedFilesPendingEmit?.length || 0,
          version: buildInfo.version,
          cacheEffectiveness: this.calculateTsCacheEffectiveness(buildInfo, stats)
        };
        
        if (this.options.verbose) {
          const age = this.formatDuration(this.cacheAnalysis.typescript.buildInfoAge);
          console.log(`  TypeScript cache: ✅ Available (${this.formatBytes(stats.size)}, ${age} old)`);
        }
      } else {
        this.cacheAnalysis.typescript.enabled = false;
        this.cacheAnalysis.typescript.buildInfoExists = false;
        
        if (this.options.verbose) {
          console.log('  TypeScript cache: ❌ No build info found');
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Error analyzing TypeScript cache: ${error.message}`));
    }
  }

  /**
   * Calculate TypeScript cache effectiveness
   */
  calculateTsCacheEffectiveness(buildInfo, stats) {
    if (!buildInfo.program) return 0;
    
    const totalFiles = buildInfo.program.fileNames?.length || 0;
    const affectedFiles = buildInfo.program.affectedFilesPendingEmit?.length || 0;
    const age = Date.now() - stats.mtime.getTime();
    
    // Cache is more effective when fewer files are affected and cache is recent
    let effectiveness = 0;
    
    if (totalFiles > 0) {
      const unaffectedRatio = Math.max(0, (totalFiles - affectedFiles) / totalFiles);
      effectiveness = unaffectedRatio * 100;
    }
    
    // Reduce effectiveness based on age (older cache is less effective)
    const maxAge = 30 * 60 * 1000; // 30 minutes
    if (age > maxAge) {
      effectiveness *= Math.max(0.1, 1 - (age - maxAge) / (24 * 60 * 60 * 1000)); // Decay over 24 hours
    }
    
    return Math.round(effectiveness);
  }

  /**
   * Analyze TSUP bundler cache
   */
  async analyzeTsupCache() {
    try {
      const tsupCachePath = this.cachePaths.tsupCache;
      
      if (await this.fileExists(tsupCachePath)) {
        const cacheFiles = await fs.readdir(tsupCachePath);
        let totalSize = 0;
        let lastUpdate = 0;
        
        for (const file of cacheFiles) {
          try {
            const filePath = path.join(tsupCachePath, file);
            const stats = await fs.stat(filePath);
            totalSize += stats.size;
            lastUpdate = Math.max(lastUpdate, stats.mtime.getTime());
          } catch (e) {
            // Skip files we can't read
          }
        }
        
        this.cacheAnalysis.tsup = {
          enabled: true,
          cacheDir: tsupCachePath,
          cacheSize: totalSize,
          cacheFiles: cacheFiles.length,
          lastCacheUpdate: new Date(lastUpdate),
          cacheAge: Date.now() - lastUpdate,
          cacheEffectiveness: this.calculateTsupCacheEffectiveness(totalSize, Date.now() - lastUpdate)
        };
        
        if (this.options.verbose) {
          const age = this.formatDuration(Date.now() - lastUpdate);
          console.log(`  TSUP cache: ✅ Available (${this.formatBytes(totalSize)}, ${cacheFiles.length} files, ${age} old)`);
        }
      } else {
        this.cacheAnalysis.tsup.enabled = false;
        this.cacheAnalysis.tsup.cacheDir = null;
        
        if (this.options.verbose) {
          console.log('  TSUP cache: ❌ Cache directory not found');
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Error analyzing TSUP cache: ${error.message}`));
    }
  }

  /**
   * Calculate TSUP cache effectiveness
   */
  calculateTsupCacheEffectiveness(cacheSize, age) {
    if (cacheSize === 0) return 0;
    
    // Base effectiveness on cache size (larger cache = more effective)
    let effectiveness = Math.min(100, (cacheSize / (1024 * 1024)) * 20); // 20% per MB, cap at 100%
    
    // Reduce effectiveness based on age (older cache is less effective)
    const maxAge = 60 * 60 * 1000; // 1 hour
    if (age > maxAge) {
      effectiveness *= Math.max(0.1, 1 - (age - maxAge) / (24 * 60 * 60 * 1000)); // Decay over 24 hours
    }
    
    return Math.round(effectiveness);
  }

  /**
   * Analyze node_modules cache
   */
  async analyzeNodeModulesCache() {
    try {
      const nodeModulesPath = this.cachePaths.nodeModules;
      
      if (await this.fileExists(nodeModulesPath)) {
        const stats = await fs.stat(nodeModulesPath);
        const packageCount = await this.countPackages(nodeModulesPath);
        
        this.cacheAnalysis.nodeModules = {
          exists: true,
          size: await this.getDirectorySize(nodeModulesPath),
          packageCount,
          lastModified: stats.mtime,
          cacheAge: Date.now() - stats.mtime.getTime()
        };
        
        if (this.options.verbose) {
          const age = this.formatDuration(Date.now() - stats.mtime.getTime());
          console.log(`  node_modules: ✅ Available (${this.formatBytes(this.cacheAnalysis.nodeModules.size)}, ${packageCount} packages, ${age} old)`);
        }
      } else {
        this.cacheAnalysis.nodeModules.exists = false;
        
        if (this.options.verbose) {
          console.log('  node_modules: ❌ Directory not found');
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Error analyzing node_modules cache: ${error.message}`));
    }
  }

  /**
   * Analyze package manager lock file cache
   */
  async analyzePackageManagerCache() {
    const lockFiles = [
      { path: this.cachePaths.packageLock, name: 'package-lock.json', manager: 'npm' },
      { path: this.cachePaths.pnpmLock, name: 'pnpm-lock.yaml', manager: 'pnpm' },
      { path: this.cachePaths.yarnLock, name: 'yarn.lock', manager: 'yarn' }
    ];

    for (const lockFile of lockFiles) {
      if (await this.fileExists(lockFile.path)) {
        const stats = await fs.stat(lockFile.path);
        
        this.cacheAnalysis.packageManager = {
          manager: lockFile.manager,
          lockFile: lockFile.name,
          exists: true,
          size: stats.size,
          lastModified: stats.mtime,
          age: Date.now() - stats.mtime.getTime()
        };
        
        if (this.options.verbose) {
          const age = this.formatDuration(Date.now() - stats.mtime.getTime());
          console.log(`  ${lockFile.manager} lock: ✅ Available (${this.formatBytes(stats.size)}, ${age} old)`);
        }
        
        break;
      }
    }
  }

  /**
   * Calculate overall cache effectiveness
   */
  calculateOverallCacheEffectiveness() {
    const weights = {
      typescript: 0.4,
      tsup: 0.3,
      nodeModules: 0.2,
      packageManager: 0.1
    };

    let weightedSum = 0;
    let totalWeight = 0;

    if (this.cacheAnalysis.typescript.enabled) {
      weightedSum += this.cacheAnalysis.typescript.cacheEffectiveness * weights.typescript;
      totalWeight += weights.typescript;
    }

    if (this.cacheAnalysis.tsup.enabled) {
      weightedSum += this.cacheAnalysis.tsup.cacheEffectiveness * weights.tsup;
      totalWeight += weights.tsup;
    }

    if (this.cacheAnalysis.nodeModules.exists) {
      const nodeModulesEffectiveness = this.cacheAnalysis.nodeModules.cacheAge < 24 * 60 * 60 * 1000 ? 80 : 40;
      weightedSum += nodeModulesEffectiveness * weights.nodeModules;
      totalWeight += weights.nodeModules;
    }

    if (this.cacheAnalysis.packageManager?.exists) {
      const packageManagerEffectiveness = this.cacheAnalysis.packageManager.age < 24 * 60 * 60 * 1000 ? 90 : 50;
      weightedSum += packageManagerEffectiveness * weights.packageManager;
      totalWeight += weights.packageManager;
    }

    this.cacheAnalysis.overall.cacheHitRate = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    this.cacheAnalysis.overall.cacheMissRate = 100 - this.cacheAnalysis.overall.cacheHitRate;

    // Calculate total cache size
    this.cacheAnalysis.overall.totalCacheSize = 
      this.cacheAnalysis.typescript.buildInfoSize +
      this.cacheAnalysis.tsup.cacheSize +
      (this.cacheAnalysis.nodeModules.size || 0);
  }

  /**
   * Generate cache optimization recommendations
   */
  generateCacheOptimizations() {
    const recommendations = [];

    // TypeScript cache recommendations
    if (!this.cacheAnalysis.typescript.enabled) {
      recommendations.push({
        category: 'typescript',
        priority: 'high',
        title: 'Enable TypeScript incremental builds',
        description: 'Add "incremental": true to tsconfig.json to enable build caching',
        action: 'Add "incremental": true to tsconfig.json compilerOptions'
      });
    } else if (this.cacheAnalysis.typescript.cacheEffectiveness < 50) {
      recommendations.push({
        category: 'typescript',
        priority: 'medium',
        title: 'Optimize TypeScript cache effectiveness',
        description: 'TypeScript cache is not very effective, consider cleaning and rebuilding',
        action: 'Delete tsconfig.build.tsbuildinfo and run a full build'
      });
    }

    // TSUP cache recommendations
    if (!this.cacheAnalysis.tsup.enabled) {
      recommendations.push({
        category: 'tsup',
        priority: 'medium',
        title: 'Enable TSUP caching',
        description: 'TSUP caching is not active, ensure cache directory is writable',
        action: 'Check node_modules/.tsup directory permissions'
      });
    } else if (this.cacheAnalysis.tsup.cacheAge > 24 * 60 * 60 * 1000) {
      recommendations.push({
        category: 'tsup',
        priority: 'low',
        title: 'TSUP cache is stale',
        description: 'TSUP cache is older than 24 hours and may be less effective',
        action: 'Consider clearing TSUP cache: rm -rf node_modules/.tsup'
      });
    }

    // Node modules recommendations
    if (!this.cacheAnalysis.nodeModules.exists) {
      recommendations.push({
        category: 'dependencies',
        priority: 'high',
        title: 'Install dependencies',
        description: 'node_modules directory is missing',
        action: 'Run npm install, pnpm install, or yarn install'
      });
    } else if (this.cacheAnalysis.nodeModules.cacheAge > 7 * 24 * 60 * 60 * 1000) {
      recommendations.push({
        category: 'dependencies',
        priority: 'low',
        title: 'Dependencies may be outdated',
        description: 'node_modules is older than 7 days',
        action: 'Consider updating dependencies'
      });
    }

    // Overall cache recommendations
    if (this.cacheAnalysis.overall.cacheHitRate < 60) {
      recommendations.push({
        category: 'overall',
        priority: 'medium',
        title: 'Improve overall cache effectiveness',
        description: 'Overall cache hit rate is low, consider cache warming strategies',
        action: 'Run a full build to warm up all caches'
      });
    }

    this.cacheAnalysis.overall.recommendedOptimizations = recommendations;
    return recommendations;
  }

  /**
   * Warm up build caches
   */
  async warmUpCaches() {
    if (!this.options.enableCacheWarming) {
      return;
    }

    console.log(chalk.blue('🔥 Warming up build caches...'));

    try {
      // Warm up TypeScript cache by running type check
      if (!this.cacheAnalysis.typescript.enabled || this.cacheAnalysis.typescript.cacheEffectiveness < 50) {
        console.log('  Warming TypeScript cache...');
        const { spawn } = await import('child_process');
        await new Promise((resolve, reject) => {
          const tsc = spawn('npx', ['tsc', '--noEmit'], { stdio: 'ignore' });
          tsc.on('close', resolve);
          tsc.on('error', reject);
        });
      }

      // Warm up TSUP cache by running a quick build
      if (!this.cacheAnalysis.tsup.enabled || this.cacheAnalysis.tsup.cacheEffectiveness < 50) {
        console.log('  Warming TSUP cache...');
        const { spawn } = await import('child_process');
        await new Promise((resolve, reject) => {
          const tsup = spawn('npx', ['tsup', '--no-dts'], { stdio: 'ignore' });
          tsup.on('close', resolve);
          tsup.on('error', reject);
        });
      }

      console.log(chalk.green('✅ Cache warming complete'));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Cache warming failed: ${error.message}`));
    }
  }

  /**
   * Generate comprehensive cache report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        cacheHitRate: this.cacheAnalysis.overall.cacheHitRate,
        totalCacheSize: this.cacheAnalysis.overall.totalCacheSize,
        totalCacheSizeFormatted: this.formatBytes(this.cacheAnalysis.overall.totalCacheSize)
      },
      caches: {
        typescript: {
          enabled: this.cacheAnalysis.typescript.enabled,
          effectiveness: this.cacheAnalysis.typescript.cacheEffectiveness,
          size: this.cacheAnalysis.typescript.buildInfoSize,
          sizeFormatted: this.formatBytes(this.cacheAnalysis.typescript.buildInfoSize),
          age: this.cacheAnalysis.typescript.buildInfoAge,
          ageFormatted: this.formatDuration(this.cacheAnalysis.typescript.buildInfoAge)
        },
        tsup: {
          enabled: this.cacheAnalysis.tsup.enabled,
          effectiveness: this.cacheAnalysis.tsup.cacheEffectiveness,
          size: this.cacheAnalysis.tsup.cacheSize,
          sizeFormatted: this.formatBytes(this.cacheAnalysis.tsup.cacheSize),
          files: this.cacheAnalysis.tsup.cacheFiles,
          age: this.cacheAnalysis.tsup.cacheAge,
          ageFormatted: this.formatDuration(this.cacheAnalysis.tsup.cacheAge)
        },
        nodeModules: {
          exists: this.cacheAnalysis.nodeModules.exists,
          size: this.cacheAnalysis.nodeModules.size,
          sizeFormatted: this.formatBytes(this.cacheAnalysis.nodeModules.size || 0),
          packages: this.cacheAnalysis.nodeModules.packageCount,
          age: this.cacheAnalysis.nodeModules.cacheAge,
          ageFormatted: this.formatDuration(this.cacheAnalysis.nodeModules.cacheAge || 0)
        }
      },
      optimizations: this.cacheAnalysis.overall.recommendedOptimizations
    };

    return report;
  }

  /**
   * Display cache analysis report
   */
  displayReport() {
    const report = this.generateReport();

    console.log('\n' + chalk.blue('🗄️  Build Cache Analysis Report:'));
    console.log(chalk.green(`📊 Overall cache effectiveness: ${report.overall.cacheHitRate}%`));
    console.log(`💾 Total cache size: ${report.overall.totalCacheSizeFormatted}`);

    console.log('\n📋 Cache breakdown:');
    
    // TypeScript cache
    const tsIcon = report.caches.typescript.enabled ? '✅' : '❌';
    const tsStatus = report.caches.typescript.enabled ? 
      `${report.caches.typescript.effectiveness}% effective, ${report.caches.typescript.sizeFormatted}, ${report.caches.typescript.ageFormatted} old` :
      'Not enabled';
    console.log(`  ${tsIcon} TypeScript: ${tsStatus}`);

    // TSUP cache
    const tsupIcon = report.caches.tsup.enabled ? '✅' : '❌';
    const tsupStatus = report.caches.tsup.enabled ?
      `${report.caches.tsup.effectiveness}% effective, ${report.caches.tsup.sizeFormatted} (${report.caches.tsup.files} files), ${report.caches.tsup.ageFormatted} old` :
      'Not available';
    console.log(`  ${tsupIcon} TSUP: ${tsupStatus}`);

    // Node modules cache
    const nmIcon = report.caches.nodeModules.exists ? '✅' : '❌';
    const nmStatus = report.caches.nodeModules.exists ?
      `${report.caches.nodeModules.sizeFormatted} (${report.caches.nodeModules.packages} packages), ${report.caches.nodeModules.ageFormatted} old` :
      'Not available';
    console.log(`  ${nmIcon} node_modules: ${nmStatus}`);

    // Recommendations
    if (report.optimizations.length > 0) {
      console.log('\n💡 Cache Optimization Recommendations:');
      
      const highPriority = report.optimizations.filter(opt => opt.priority === 'high');
      const mediumPriority = report.optimizations.filter(opt => opt.priority === 'medium');
      const lowPriority = report.optimizations.filter(opt => opt.priority === 'low');

      if (highPriority.length > 0) {
        console.log(chalk.red('  🔴 High Priority:'));
        highPriority.forEach(opt => {
          console.log(`    • ${opt.title}: ${opt.action}`);
        });
      }

      if (mediumPriority.length > 0) {
        console.log(chalk.yellow('  🟡 Medium Priority:'));
        mediumPriority.forEach(opt => {
          console.log(`    • ${opt.title}: ${opt.action}`);
        });
      }

      if (lowPriority.length > 0) {
        console.log(chalk.blue('  🔵 Low Priority:'));
        lowPriority.forEach(opt => {
          console.log(`    • ${opt.title}: ${opt.action}`);
        });
      }
    } else {
      console.log(chalk.green('\n✅ Cache configuration looks optimal!'));
    }

    return report;
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
   * Helper: Get directory size
   */
  async getDirectorySize(dirPath, maxDepth = 2) {
    if (maxDepth <= 0) return 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      let size = 0;

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            size += stats.size;
          } catch {
            // Skip files we can't read
          }
        } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
          size += await this.getDirectorySize(fullPath, maxDepth - 1);
        }
      }

      return size;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Count packages in node_modules
   */
  async countPackages(nodeModulesPath) {
    try {
      const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true });
      let count = 0;

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          if (entry.name.startsWith('@')) {
            // Scoped package - count subdirectories
            try {
              const scopedPath = path.join(nodeModulesPath, entry.name);
              const scopedEntries = await fs.readdir(scopedPath, { withFileTypes: true });
              count += scopedEntries.filter(e => e.isDirectory()).length;
            } catch {
              // Skip if we can't read the scoped directory
            }
          } else {
            count++;
          }
        }
      }

      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Format bytes in human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Helper: Format duration in human readable format
   */
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    } else if (ms < 86400000) {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      return `${days}d ${hours}h`;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const skipWarming = args.includes('--no-warm');
  const jsonOutput = args.includes('--json');

  const analyzer = new BuildCacheAnalyzer({
    verbose,
    enableCacheWarming: !skipWarming
  });

  try {
    await analyzer.analyzeBuildCaches();
    analyzer.generateCacheOptimizations();

    if (jsonOutput) {
      const report = analyzer.generateReport();
      console.log(JSON.stringify(report, null, 2));
    } else {
      analyzer.displayReport();
    }

    if (!skipWarming && analyzer.cacheAnalysis.overall.cacheHitRate < 60) {
      await analyzer.warmUpCaches();
    }

  } catch (error) {
    console.error(chalk.red('❌ Cache analysis failed:'), error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BuildCacheAnalyzer };