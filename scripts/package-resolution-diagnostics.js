#!/usr/bin/env node

/**
 * Package Resolution Diagnostics and Recovery System
 * 
 * Provides comprehensive diagnostics when package resolution fails,
 * with detailed logging, recovery strategies, and performance tracking.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname, resolve, isAbsolute } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Debug logging levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

/**
 * Resolution strategy types
 */
const RESOLUTION_STRATEGIES = {
  NODE_RESOLVE: 'node_resolve',
  PACKAGE_JSON: 'package_json',
  DIRECT_PATH: 'direct_path',
  EXPORTS_FIELD: 'exports_field',
  PNPM_SYMLINK: 'pnpm_symlink',
  YARN_PNP: 'yarn_pnp',
  WORKSPACE: 'workspace',
  PACKAGE_MANAGER_LIST: 'package_manager_list',
  FALLBACK: 'fallback'
};

/**
 * Resolution cache for successful paths
 */
const resolutionCache = new Map();

/**
 * Debug logger class with structured logging
 */
class ResolutionLogger {
  constructor(enabled = false, level = LOG_LEVELS.INFO) {
    this.enabled = enabled || process.env.STACK_AUTH_DEBUG === 'true';
    this.level = level;
    this.attempts = [];
    this.timings = new Map();
  }

  log(level, message, data = {}) {
    if (!this.enabled || level > this.level) return;
    
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    
    console.log(`[${timestamp}] [${levelName}] ${message}`, 
      Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
  }

  error(message, data) { this.log(LOG_LEVELS.ERROR, message, data); }
  warn(message, data) { this.log(LOG_LEVELS.WARN, message, data); }
  info(message, data) { this.log(LOG_LEVELS.INFO, message, data); }
  debug(message, data) { this.log(LOG_LEVELS.DEBUG, message, data); }
  trace(message, data) { this.log(LOG_LEVELS.TRACE, message, data); }

  recordAttempt(strategy, path, success, error = null, timing = null) {
    const attempt = {
      strategy,
      path,
      success,
      error: error ? error.message : null,
      timing,
      timestamp: Date.now()
    };
    
    this.attempts.push(attempt);
    this.debug(`Resolution attempt: ${strategy}`, attempt);
  }

  startTiming(key) {
    this.timings.set(key, performance.now());
  }

  endTiming(key) {
    const start = this.timings.get(key);
    if (start) {
      const duration = performance.now() - start;
      this.timings.delete(key);
      return duration;
    }
    return null;
  }

  generateReport() {
    const successfulAttempts = this.attempts.filter(a => a.success);
    const failedAttempts = this.attempts.filter(a => !a.success);
    
    const report = {
      totalAttempts: this.attempts.length,
      successful: successfulAttempts.length,
      failed: failedAttempts.length,
      strategiesUsed: [...new Set(this.attempts.map(a => a.strategy))],
      attemptDetails: this.attempts,
      recommendations: this.generateRecommendations(failedAttempts)
    };
    
    return report;
  }

  generateRecommendations(failedAttempts) {
    const recommendations = [];
    
    // Check for common failure patterns
    const hasNodeResolveFailure = failedAttempts.some(a => a.strategy === RESOLUTION_STRATEGIES.NODE_RESOLVE);
    const hasExportsFailure = failedAttempts.some(a => a.strategy === RESOLUTION_STRATEGIES.EXPORTS_FIELD);
    const hasPnpmFailure = failedAttempts.some(a => a.strategy === RESOLUTION_STRATEGIES.PNPM_SYMLINK);
    
    if (hasNodeResolveFailure) {
      recommendations.push({
        issue: 'Standard Node.js resolution failed',
        suggestion: 'Check if the package is installed: npm ls <package-name>',
        command: 'npm install'
      });
    }
    
    if (hasExportsFailure) {
      recommendations.push({
        issue: 'Package exports field resolution failed',
        suggestion: 'The package may have complex exports configuration',
        command: 'npm update <package-name>'
      });
    }
    
    if (hasPnpmFailure) {
      recommendations.push({
        issue: 'PNPM symlink resolution failed',
        suggestion: 'Try reinstalling with pnpm',
        command: 'pnpm install --shamefully-hoist'
      });
    }
    
    return recommendations;
  }
}

/**
 * Enhanced module resolver with diagnostics
 */
export class EnhancedModuleResolver {
  constructor(options = {}) {
    this.logger = new ResolutionLogger(
      options.debug || process.env.STACK_AUTH_DEBUG === 'true',
      options.logLevel || LOG_LEVELS.INFO
    );
    this.enableCache = options.cache !== false;
    this.cacheTimeout = options.cacheTimeout || 5 * 60 * 1000; // 5 minutes
    this.packageManager = this.detectPackageManager();
  }

  /**
   * Detect which package manager is being used
   */
  detectPackageManager() {
    if (existsSync(join(process.cwd(), 'pnpm-lock.yaml'))) {
      this.logger.info('Detected package manager: pnpm');
      return 'pnpm';
    }
    if (existsSync(join(process.cwd(), 'yarn.lock'))) {
      this.logger.info('Detected package manager: yarn');
      return 'yarn';
    }
    if (existsSync(join(process.cwd(), 'package-lock.json'))) {
      this.logger.info('Detected package manager: npm');
      return 'npm';
    }
    
    this.logger.info('No lock file detected, defaulting to npm');
    return 'npm';
  }

  /**
   * Main resolution method with comprehensive diagnostics
   */
  async resolveModule(moduleName, options = {}) {
    const startTime = performance.now();
    this.logger.info(`Starting resolution for: ${moduleName}`);
    
    // Check cache first
    if (this.enableCache) {
      const cached = this.getCachedPath(moduleName);
      if (cached) {
        const timing = performance.now() - startTime;
        this.logger.info(`Resolved from cache in ${timing.toFixed(2)}ms`, { moduleName, path: cached });
        return { path: cached, cached: true, timing };
      }
    }
    
    // Try resolution strategies in order
    const strategies = [
      () => this.tryNodeResolve(moduleName),
      () => this.tryPackageJson(moduleName),
      () => this.tryDirectPaths(moduleName),
      () => this.tryExportsField(moduleName),
      () => this.tryPnpmResolution(moduleName),
      () => this.tryYarnPnPResolution(moduleName),
      () => this.tryWorkspaceResolution(moduleName),
      () => this.tryPackageManagerList(moduleName),
      () => this.tryFallbackResolution(moduleName)
    ];
    
    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          const timing = performance.now() - startTime;
          this.logger.info(`Successfully resolved in ${timing.toFixed(2)}ms`, { 
            moduleName, 
            path: result.path,
            strategy: result.strategy 
          });
          
          // Cache successful resolution
          if (this.enableCache) {
            this.setCachedPath(moduleName, result.path);
          }
          
          return { ...result, timing };
        }
      } catch (error) {
        this.logger.debug(`Strategy failed: ${error.message}`);
      }
    }
    
    // All strategies failed
    const timing = performance.now() - startTime;
    const report = this.logger.generateReport();
    
    throw new ResolutionError(moduleName, report, timing);
  }

  /**
   * Try standard Node.js require.resolve
   */
  tryNodeResolve(moduleName) {
    this.logger.startTiming('node_resolve');
    
    try {
      const resolved = require.resolve(moduleName);
      const timing = this.logger.endTiming('node_resolve');
      
      this.logger.recordAttempt(RESOLUTION_STRATEGIES.NODE_RESOLVE, resolved, true, null, timing);
      
      return {
        path: resolved,
        strategy: RESOLUTION_STRATEGIES.NODE_RESOLVE
      };
    } catch (error) {
      const timing = this.logger.endTiming('node_resolve');
      this.logger.recordAttempt(RESOLUTION_STRATEGIES.NODE_RESOLVE, moduleName, false, error, timing);
      return null;
    }
  }

  /**
   * Try resolving via package.json lookup
   */
  tryPackageJson(moduleName) {
    this.logger.startTiming('package_json');
    
    const possiblePaths = [
      join(process.cwd(), 'node_modules', moduleName, 'package.json'),
      join(__dirname, '..', 'node_modules', moduleName, 'package.json')
    ];
    
    for (const pkgPath of possiblePaths) {
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          const baseDir = dirname(pkgPath);
          
          // Try to resolve the main entry
          const mainPath = this.resolvePackageMain(pkg, baseDir);
          if (mainPath) {
            const timing = this.logger.endTiming('package_json');
            this.logger.recordAttempt(RESOLUTION_STRATEGIES.PACKAGE_JSON, mainPath, true, null, timing);
            
            return {
              path: mainPath,
              strategy: RESOLUTION_STRATEGIES.PACKAGE_JSON
            };
          }
        } catch (error) {
          this.logger.debug(`Failed to parse package.json: ${pkgPath}`, { error: error.message });
        }
      }
    }
    
    const timing = this.logger.endTiming('package_json');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.PACKAGE_JSON, moduleName, false, null, timing);
    return null;
  }

  /**
   * Try direct file paths
   */
  tryDirectPaths(moduleName) {
    this.logger.startTiming('direct_path');
    
    const extensions = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '/index.js', '/index.mjs', '/index.ts'];
    const basePaths = [
      join(process.cwd(), 'node_modules', moduleName),
      join(__dirname, '..', 'node_modules', moduleName)
    ];
    
    for (const basePath of basePaths) {
      for (const ext of extensions) {
        const fullPath = basePath + ext;
        if (existsSync(fullPath) && statSync(fullPath).isFile()) {
          const timing = this.logger.endTiming('direct_path');
          this.logger.recordAttempt(RESOLUTION_STRATEGIES.DIRECT_PATH, fullPath, true, null, timing);
          
          return {
            path: fullPath,
            strategy: RESOLUTION_STRATEGIES.DIRECT_PATH
          };
        }
      }
    }
    
    const timing = this.logger.endTiming('direct_path');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.DIRECT_PATH, moduleName, false, null, timing);
    return null;
  }

  /**
   * Try resolving via exports field with validation
   */
  tryExportsField(moduleName) {
    this.logger.startTiming('exports_field');
    
    const pkgPath = join(process.cwd(), 'node_modules', moduleName, 'package.json');
    
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        
        if (pkg.exports) {
          const validation = this.validateExportsField(pkg.exports);
          if (!validation.valid) {
            this.logger.warn('Invalid exports field structure', validation);
          }
          
          const baseDir = dirname(pkgPath);
          const resolved = this.resolveExportsField(pkg.exports, baseDir);
          
          if (resolved) {
            const timing = this.logger.endTiming('exports_field');
            this.logger.recordAttempt(RESOLUTION_STRATEGIES.EXPORTS_FIELD, resolved, true, null, timing);
            
            return {
              path: resolved,
              strategy: RESOLUTION_STRATEGIES.EXPORTS_FIELD
            };
          }
        }
      } catch (error) {
        this.logger.debug(`Exports field resolution failed`, { error: error.message });
      }
    }
    
    const timing = this.logger.endTiming('exports_field');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.EXPORTS_FIELD, moduleName, false, null, timing);
    return null;
  }

  /**
   * Try PNPM-specific resolution
   */
  async tryPnpmResolution(moduleName) {
    if (this.packageManager !== 'pnpm') return null;
    
    this.logger.startTiming('pnpm_symlink');
    
    try {
      // PNPM uses a complex symlink structure
      const pnpmStore = join(process.cwd(), 'node_modules', '.pnpm');
      
      if (existsSync(pnpmStore)) {
        // Try to find the package in PNPM's store
        const output = execSync(`pnpm list ${moduleName} --json`, { 
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        const result = JSON.parse(output);
        if (result && result[0] && result[0].dependencies) {
          const dep = result[0].dependencies[moduleName];
          if (dep && dep.path) {
            const timing = this.logger.endTiming('pnpm_symlink');
            this.logger.recordAttempt(RESOLUTION_STRATEGIES.PNPM_SYMLINK, dep.path, true, null, timing);
            
            return {
              path: dep.path,
              strategy: RESOLUTION_STRATEGIES.PNPM_SYMLINK
            };
          }
        }
      }
    } catch (error) {
      this.logger.debug(`PNPM resolution failed`, { error: error.message });
    }
    
    const timing = this.logger.endTiming('pnpm_symlink');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.PNPM_SYMLINK, moduleName, false, null, timing);
    return null;
  }

  /**
   * Try Yarn PnP resolution
   */
  async tryYarnPnPResolution(moduleName) {
    if (this.packageManager !== 'yarn') return null;
    
    this.logger.startTiming('yarn_pnp');
    
    try {
      // Check if Yarn PnP is enabled
      const pnpPath = join(process.cwd(), '.pnp.cjs');
      
      if (existsSync(pnpPath)) {
        // Try to use Yarn's resolution
        const output = execSync(`yarn info ${moduleName} --json`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        const lines = output.trim().split('\n');
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'inspect' && data.data) {
              // Extract path from Yarn info
              const timing = this.logger.endTiming('yarn_pnp');
              this.logger.recordAttempt(RESOLUTION_STRATEGIES.YARN_PNP, moduleName, true, null, timing);
              
              return {
                path: moduleName, // Yarn PnP uses virtual paths
                strategy: RESOLUTION_STRATEGIES.YARN_PNP
              };
            }
          } catch (e) {
            // Continue to next line
          }
        }
      }
    } catch (error) {
      this.logger.debug(`Yarn PnP resolution failed`, { error: error.message });
    }
    
    const timing = this.logger.endTiming('yarn_pnp');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.YARN_PNP, moduleName, false, null, timing);
    return null;
  }

  /**
   * Try workspace/monorepo resolution
   */
  async tryWorkspaceResolution(moduleName) {
    this.logger.startTiming('workspace');
    
    try {
      // Check for workspace configuration
      const rootPkg = join(process.cwd(), 'package.json');
      
      if (existsSync(rootPkg)) {
        const pkg = JSON.parse(readFileSync(rootPkg, 'utf-8'));
        
        if (pkg.workspaces) {
          // Try to find the package in workspaces
          for (const workspace of pkg.workspaces) {
            const workspacePath = join(process.cwd(), workspace.replace('/*', ''), moduleName);
            
            if (existsSync(workspacePath)) {
              const timing = this.logger.endTiming('workspace');
              this.logger.recordAttempt(RESOLUTION_STRATEGIES.WORKSPACE, workspacePath, true, null, timing);
              
              return {
                path: workspacePath,
                strategy: RESOLUTION_STRATEGIES.WORKSPACE
              };
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(`Workspace resolution failed`, { error: error.message });
    }
    
    const timing = this.logger.endTiming('workspace');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.WORKSPACE, moduleName, false, null, timing);
    return null;
  }

  /**
   * Try using package manager list command as fallback
   */
  async tryPackageManagerList(moduleName) {
    this.logger.startTiming('package_manager_list');
    
    try {
      let command;
      switch (this.packageManager) {
        case 'pnpm':
          command = `pnpm list ${moduleName} --depth=0 --json`;
          break;
        case 'yarn':
          command = `yarn list --pattern ${moduleName} --depth=0 --json`;
          break;
        default:
          command = `npm list ${moduleName} --depth=0 --json`;
      }
      
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      const result = JSON.parse(output);
      
      // Parse the output based on package manager
      let packagePath = null;
      
      if (this.packageManager === 'npm' && result.dependencies && result.dependencies[moduleName]) {
        packagePath = join(process.cwd(), 'node_modules', moduleName);
      } else if (this.packageManager === 'yarn' && result.data && result.data.trees) {
        const tree = result.data.trees.find(t => t.name.startsWith(moduleName));
        if (tree) {
          packagePath = join(process.cwd(), 'node_modules', moduleName);
        }
      } else if (this.packageManager === 'pnpm' && result[0] && result[0].dependencies) {
        const dep = result[0].dependencies[moduleName];
        if (dep) {
          packagePath = dep.path || join(process.cwd(), 'node_modules', moduleName);
        }
      }
      
      if (packagePath && existsSync(packagePath)) {
        const timing = this.logger.endTiming('package_manager_list');
        this.logger.recordAttempt(RESOLUTION_STRATEGIES.PACKAGE_MANAGER_LIST, packagePath, true, null, timing);
        
        return {
          path: packagePath,
          strategy: RESOLUTION_STRATEGIES.PACKAGE_MANAGER_LIST
        };
      }
    } catch (error) {
      this.logger.debug(`Package manager list failed`, { error: error.message });
    }
    
    const timing = this.logger.endTiming('package_manager_list');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.PACKAGE_MANAGER_LIST, moduleName, false, null, timing);
    return null;
  }

  /**
   * Final fallback resolution attempts
   */
  async tryFallbackResolution(moduleName) {
    this.logger.startTiming('fallback');
    
    // Try some last-ditch efforts
    const fallbackPaths = [
      // Global node_modules
      join(process.env.NODE_PATH || '/usr/local/lib/node_modules', moduleName),
      // Parent directories
      join(process.cwd(), '..', 'node_modules', moduleName),
      join(process.cwd(), '../..', 'node_modules', moduleName),
      // Home directory global modules
      join(process.env.HOME || '', '.npm', moduleName)
    ];
    
    for (const path of fallbackPaths) {
      if (existsSync(path)) {
        const timing = this.logger.endTiming('fallback');
        this.logger.recordAttempt(RESOLUTION_STRATEGIES.FALLBACK, path, true, null, timing);
        
        return {
          path,
          strategy: RESOLUTION_STRATEGIES.FALLBACK
        };
      }
    }
    
    const timing = this.logger.endTiming('fallback');
    this.logger.recordAttempt(RESOLUTION_STRATEGIES.FALLBACK, moduleName, false, null, timing);
    return null;
  }

  /**
   * Resolve package main entry from package.json
   */
  resolvePackageMain(pkg, baseDir) {
    // Try different entry fields in order of preference
    const fields = ['main', 'module', 'browser', 'types', 'typings'];
    
    for (const field of fields) {
      if (pkg[field]) {
        const mainPath = join(baseDir, pkg[field]);
        if (existsSync(mainPath)) {
          return mainPath;
        }
      }
    }
    
    // Try default index files
    const indexFiles = ['index.js', 'index.mjs', 'index.cjs', 'index.ts'];
    for (const index of indexFiles) {
      const indexPath = join(baseDir, index);
      if (existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }

  /**
   * Resolve exports field with comprehensive handling
   */
  resolveExportsField(exports, baseDir, conditions = ['import', 'require', 'default']) {
    if (!exports) return null;
    
    // Handle string exports
    if (typeof exports === 'string') {
      const path = join(baseDir, exports);
      return existsSync(path) ? path : null;
    }
    
    // Handle object exports
    if (typeof exports === 'object' && !Array.isArray(exports)) {
      // Try conditions in order
      for (const condition of conditions) {
        if (exports[condition]) {
          const resolved = this.resolveExportsField(exports[condition], baseDir, conditions);
          if (resolved) return resolved;
        }
      }
      
      // Try dot export
      if (exports['.']) {
        const resolved = this.resolveExportsField(exports['.'], baseDir, conditions);
        if (resolved) return resolved;
      }
      
      // Try nested conditions
      for (const key of Object.keys(exports)) {
        if (!key.startsWith('.') && !conditions.includes(key)) {
          const resolved = this.resolveExportsField(exports[key], baseDir, conditions);
          if (resolved) return resolved;
        }
      }
    }
    
    // Handle array exports (multiple fallbacks)
    if (Array.isArray(exports)) {
      for (const exp of exports) {
        const resolved = this.resolveExportsField(exp, baseDir, conditions);
        if (resolved) return resolved;
      }
    }
    
    return null;
  }

  /**
   * Validate exports field structure
   */
  validateExportsField(exports) {
    const validation = {
      valid: true,
      issues: [],
      suggestions: []
    };
    
    if (!exports) {
      validation.valid = false;
      validation.issues.push('Exports field is missing');
      return validation;
    }
    
    // Check for common issues
    if (typeof exports === 'object' && !Array.isArray(exports)) {
      // Check for missing dot export
      if (!exports['.'] && !exports.import && !exports.require) {
        validation.issues.push('No root export defined (., import, or require)');
        validation.suggestions.push('Add a "." export for the main entry point');
      }
      
      // Check for conflicting conditions
      if (exports.import && exports.require && exports.default) {
        validation.issues.push('Multiple condition exports may cause resolution conflicts');
      }
      
      // Check for invalid paths
      for (const [key, value] of Object.entries(exports)) {
        if (typeof value === 'string' && value.startsWith('../')) {
          validation.issues.push(`Export "${key}" references parent directory, which may cause issues`);
          validation.valid = false;
        }
      }
    }
    
    return validation;
  }

  /**
   * Cache management
   */
  getCachedPath(moduleName) {
    const cached = resolutionCache.get(moduleName);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.cacheTimeout) {
        this.logger.debug(`Cache hit for ${moduleName}`, { age: `${(age / 1000).toFixed(1)}s` });
        return cached.path;
      } else {
        this.logger.debug(`Cache expired for ${moduleName}`, { age: `${(age / 1000).toFixed(1)}s` });
        resolutionCache.delete(moduleName);
      }
    }
    
    return null;
  }

  setCachedPath(moduleName, path) {
    resolutionCache.set(moduleName, {
      path,
      timestamp: Date.now()
    });
    
    this.logger.debug(`Cached resolution for ${moduleName}`, { path });
  }

  /**
   * Clear resolution cache
   */
  clearCache() {
    const size = resolutionCache.size;
    resolutionCache.clear();
    this.logger.info(`Cleared resolution cache`, { entries: size });
  }

  /**
   * Get diagnostic summary
   */
  getDiagnosticSummary() {
    return this.logger.generateReport();
  }
}

/**
 * Custom error class for resolution failures
 */
export class ResolutionError extends Error {
  constructor(moduleName, report, timing) {
    const message = `Failed to resolve module: ${moduleName}`;
    super(message);
    
    this.name = 'ResolutionError';
    this.moduleName = moduleName;
    this.report = report;
    this.timing = timing;
    
    // Generate detailed error message
    this.detailedMessage = this.generateDetailedMessage();
  }

  generateDetailedMessage() {
    const lines = [
      `Failed to resolve module: ${this.moduleName}`,
      `Resolution took: ${this.timing.toFixed(2)}ms`,
      `Strategies attempted: ${this.report.strategiesUsed.join(', ')}`,
      `Total attempts: ${this.report.totalAttempts}`,
      '',
      'Recommendations:'
    ];
    
    for (const rec of this.report.recommendations) {
      lines.push(`  - ${rec.suggestion}`);
      if (rec.command) {
        lines.push(`    Run: ${rec.command}`);
      }
    }
    
    return lines.join('\n');
  }

  toString() {
    return this.detailedMessage;
  }
}

/**
 * Export convenience function for direct use
 */
export async function resolveWithDiagnostics(moduleName, options = {}) {
  const resolver = new EnhancedModuleResolver(options);
  return resolver.resolveModule(moduleName, options);
}

// Make it available for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const moduleName = process.argv[2];
  
  if (!moduleName) {
    console.error('Usage: node package-resolution-diagnostics.js <module-name>');
    process.exit(1);
  }
  
  const resolver = new EnhancedModuleResolver({
    debug: true,
    logLevel: LOG_LEVELS.DEBUG
  });
  
  resolver.resolveModule(moduleName)
    .then(result => {
      console.log('\n✅ Resolution successful!');
      console.log(`Path: ${result.path}`);
      console.log(`Strategy: ${result.strategy}`);
      console.log(`Time: ${result.timing.toFixed(2)}ms`);
      console.log(`Cached: ${result.cached || false}`);
      
      const summary = resolver.getDiagnosticSummary();
      console.log('\nDiagnostic Summary:');
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch(error => {
      console.error('\n❌ Resolution failed!');
      console.error(error.toString());
      
      if (error instanceof ResolutionError) {
        console.error('\nFull diagnostic report:');
        console.error(JSON.stringify(error.report, null, 2));
      }
      
      process.exit(1);
    });
}