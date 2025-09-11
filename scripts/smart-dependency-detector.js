#!/usr/bin/env node

/**
 * Smart Optional Dependency Detection System
 * 
 * Intelligently detects when optional dependencies (like React) are actually needed
 * based on the consumer's usage patterns, configuration, and project structure.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * Detection confidence levels
 */
const CONFIDENCE_LEVELS = {
  CERTAIN: 'certain',      // 100% sure the dependency is needed
  LIKELY: 'likely',        // Strong indicators present
  POSSIBLE: 'possible',    // Some indicators present
  UNLIKELY: 'unlikely',    // No indicators found
};

/**
 * Detection result for a specific dependency
 */
class DependencyDetectionResult {
  constructor(name, confidence, reasons = [], suggestions = []) {
    this.name = name;
    this.confidence = confidence;
    this.reasons = reasons;
    this.suggestions = suggestions;
    this.required = confidence === CONFIDENCE_LEVELS.CERTAIN || confidence === CONFIDENCE_LEVELS.LIKELY;
  }

  addReason(reason, confidence = null) {
    this.reasons.push(reason);
    if (confidence && this.getConfidenceValue(confidence) > this.getConfidenceValue(this.confidence)) {
      this.confidence = confidence;
    }
    this.updateRequired();
  }

  addSuggestion(suggestion) {
    this.suggestions.push(suggestion);
  }

  updateRequired() {
    this.required = this.confidence === CONFIDENCE_LEVELS.CERTAIN || 
                   this.confidence === CONFIDENCE_LEVELS.LIKELY;
  }

  getConfidenceValue(level) {
    const values = {
      [CONFIDENCE_LEVELS.CERTAIN]: 4,
      [CONFIDENCE_LEVELS.LIKELY]: 3,
      [CONFIDENCE_LEVELS.POSSIBLE]: 2,
      [CONFIDENCE_LEVELS.UNLIKELY]: 1,
    };
    return values[level] || 0;
  }

  toJSON() {
    return {
      name: this.name,
      confidence: this.confidence,
      required: this.required,
      reasons: this.reasons,
      suggestions: this.suggestions
    };
  }
}

/**
 * Smart dependency detector class
 */
export class SmartDependencyDetector {
  constructor(projectPath = process.cwd(), options = {}) {
    this.projectPath = projectPath;
    this.options = {
      verbose: options.verbose || process.env.STACK_AUTH_DEBUG === 'true',
      deep: options.deep !== false,
      excludeDirs: options.excludeDirs || ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'],
      fileExtensions: options.fileExtensions || ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.astro'],
      maxDepth: options.maxDepth || 5,
      ...options
    };
    
    this.detectionResults = new Map();
    this.fileCache = new Map();
    this.configCache = new Map();
  }

  /**
   * Main detection method
   */
  async detect() {
    this.log('Starting smart dependency detection...');
    
    // Initialize results for known optional dependencies
    this.detectionResults.set('react', new DependencyDetectionResult(
      'react',
      CONFIDENCE_LEVELS.UNLIKELY
    ));
    
    this.detectionResults.set('@types/react', new DependencyDetectionResult(
      '@types/react',
      CONFIDENCE_LEVELS.UNLIKELY
    ));

    // Run detection strategies
    await this.detectReactUsage();
    await this.detectTypeScriptReactUsage();
    await this.analyzeConfiguration();
    await this.checkExplicitConfiguration();
    
    return this.generateReport();
  }

  /**
   * Detect React usage in the project
   */
  async detectReactUsage() {
    const reactResult = this.detectionResults.get('react');
    
    // 1. Check for React imports in source files
    const sourceFiles = this.findSourceFiles();
    let hasJsxFiles = false;
    let hasReactImports = false;
    let hasStackUIImports = false;
    let hasClientComponents = false;
    
    for (const file of sourceFiles) {
      const ext = extname(file);
      
      // Check for JSX/TSX files
      if (ext === '.jsx' || ext === '.tsx') {
        hasJsxFiles = true;
        reactResult.addReason(
          `Found JSX/TSX file: ${relative(this.projectPath, file)}`,
          CONFIDENCE_LEVELS.LIKELY
        );
      }
      
      // Analyze file content
      const content = this.readFile(file);
      if (!content) continue;
      
      // Check for React imports
      if (this.hasReactImport(content)) {
        hasReactImports = true;
        reactResult.addReason(
          `React import found in: ${relative(this.projectPath, file)}`,
          CONFIDENCE_LEVELS.CERTAIN
        );
      }
      
      // Check for Stack UI component imports
      if (this.hasStackUIImport(content)) {
        hasStackUIImports = true;
        reactResult.addReason(
          `Stack UI components used in: ${relative(this.projectPath, file)}`,
          CONFIDENCE_LEVELS.CERTAIN
        );
      }
      
      // Check for Astro client components
      if (this.hasClientDirective(content)) {
        hasClientComponents = true;
        reactResult.addReason(
          `Client-side components found in: ${relative(this.projectPath, file)}`,
          CONFIDENCE_LEVELS.LIKELY
        );
      }
    }
    
    // 2. Check package.json for React in dependencies
    const packageJson = this.readPackageJson();
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps['@astrojs/react']) {
        reactResult.addReason(
          '@astrojs/react integration is installed',
          CONFIDENCE_LEVELS.CERTAIN
        );
      }
      
      if (deps['react']) {
        reactResult.addReason(
          'React is already in dependencies',
          CONFIDENCE_LEVELS.CERTAIN
        );
      }
    }
    
    // 3. Add suggestions based on findings
    if (hasStackUIImports && !hasReactImports) {
      reactResult.addSuggestion(
        'Stack UI components require React. Install with: npm install react react-dom @astrojs/react'
      );
    }
    
    if (hasJsxFiles && !hasReactImports) {
      reactResult.addSuggestion(
        'JSX/TSX files detected but no React imports found. You may need React for these files.'
      );
    }
    
    this.log(`React detection complete. Confidence: ${reactResult.confidence}`);
  }

  /**
   * Detect TypeScript React usage
   */
  async detectTypeScriptReactUsage() {
    const typesResult = this.detectionResults.get('@types/react');
    const reactResult = this.detectionResults.get('react');
    
    // If React is certainly needed, types are likely needed too
    if (reactResult.confidence === CONFIDENCE_LEVELS.CERTAIN) {
      typesResult.addReason(
        'React is required, TypeScript types recommended',
        CONFIDENCE_LEVELS.LIKELY
      );
    }
    
    // Check for TypeScript configuration
    const tsConfig = this.readTsConfig();
    if (tsConfig) {
      // Check JSX settings
      const jsx = tsConfig.compilerOptions?.jsx;
      if (jsx && jsx !== 'preserve') {
        typesResult.addReason(
          `TypeScript JSX mode is set to '${jsx}'`,
          CONFIDENCE_LEVELS.LIKELY
        );
        
        // Also increase React confidence
        reactResult.addReason(
          `TypeScript JSX compilation requires React (jsx: '${jsx}')`,
          CONFIDENCE_LEVELS.LIKELY
        );
      }
      
      // Check for React types in lib
      const lib = tsConfig.compilerOptions?.lib;
      if (lib && lib.some(l => l.toLowerCase().includes('react'))) {
        typesResult.addReason(
          'React types detected in TypeScript lib configuration',
          CONFIDENCE_LEVELS.CERTAIN
        );
      }
      
      // Check if strict mode is enabled (suggests type checking is important)
      if (tsConfig.compilerOptions?.strict) {
        if (reactResult.required) {
          typesResult.addReason(
            'Strict TypeScript mode enabled and React is used',
            CONFIDENCE_LEVELS.LIKELY
          );
        }
      }
    }
    
    // Check for .tsx files
    const hasTsxFiles = this.findSourceFiles().some(f => extname(f) === '.tsx');
    if (hasTsxFiles) {
      typesResult.addReason(
        'TSX files found in project',
        CONFIDENCE_LEVELS.LIKELY
      );
      
      typesResult.addSuggestion(
        'TSX files require @types/react for proper TypeScript support'
      );
    }
    
    this.log(`TypeScript React detection complete. Confidence: ${typesResult.confidence}`);
  }

  /**
   * Analyze project configuration files
   */
  async analyzeConfiguration() {
    // Check Astro config
    const astroConfig = this.readAstroConfig();
    if (astroConfig) {
      const configContent = this.readFile(astroConfig);
      
      // Check for React integration
      if (configContent && configContent.includes('@astrojs/react')) {
        const reactResult = this.detectionResults.get('react');
        reactResult.addReason(
          'Astro config includes @astrojs/react integration',
          CONFIDENCE_LEVELS.CERTAIN
        );
      }
      
      // Check for Stack Auth integration with component options
      if (configContent && configContent.includes('addReactRenderer')) {
        const reactResult = this.detectionResults.get('react');
        reactResult.addReason(
          'Stack Auth integration configured with React renderer',
          CONFIDENCE_LEVELS.LIKELY
        );
      }
    }
    
    // Check for other framework configs that might conflict
    const packageJson = this.readPackageJson();
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for other UI frameworks
      const hasVue = deps['@astrojs/vue'] || deps['vue'];
      const hasSvelte = deps['@astrojs/svelte'] || deps['svelte'];
      const hasSolid = deps['@astrojs/solid-js'] || deps['solid-js'];
      
      if (hasVue || hasSvelte || hasSolid) {
        const reactResult = this.detectionResults.get('react');
        if (reactResult.confidence === CONFIDENCE_LEVELS.UNLIKELY) {
          reactResult.addReason(
            'Other UI frameworks detected, React might not be needed',
            CONFIDENCE_LEVELS.UNLIKELY
          );
          
          reactResult.addSuggestion(
            'Consider using Stack Auth without React components if using another framework'
          );
        }
      }
    }
  }

  /**
   * Check for explicit configuration
   */
  async checkExplicitConfiguration() {
    // Check environment variables
    const useReact = process.env.STACK_AUTH_USE_REACT;
    if (useReact !== undefined) {
      const reactResult = this.detectionResults.get('react');
      const typesResult = this.detectionResults.get('@types/react');
      
      if (useReact === 'true' || useReact === '1') {
        reactResult.addReason(
          'STACK_AUTH_USE_REACT environment variable is set to true',
          CONFIDENCE_LEVELS.CERTAIN
        );
        typesResult.addReason(
          'React usage explicitly enabled via environment variable',
          CONFIDENCE_LEVELS.LIKELY
        );
      } else if (useReact === 'false' || useReact === '0') {
        reactResult.confidence = CONFIDENCE_LEVELS.UNLIKELY;
        reactResult.reasons = ['React usage explicitly disabled via STACK_AUTH_USE_REACT'];
        typesResult.confidence = CONFIDENCE_LEVELS.UNLIKELY;
        typesResult.reasons = ['React usage explicitly disabled'];
      }
    }
    
    // Check for .stackauthrc or similar config file
    const configFile = join(this.projectPath, '.stackauthrc');
    if (existsSync(configFile)) {
      try {
        const config = JSON.parse(readFileSync(configFile, 'utf-8'));
        if (config.useReact !== undefined) {
          const reactResult = this.detectionResults.get('react');
          const typesResult = this.detectionResults.get('@types/react');
          
          if (config.useReact) {
            reactResult.addReason(
              'React usage enabled in .stackauthrc configuration',
              CONFIDENCE_LEVELS.CERTAIN
            );
            typesResult.addReason(
              'React enabled via configuration',
              CONFIDENCE_LEVELS.LIKELY
            );
          } else {
            reactResult.confidence = CONFIDENCE_LEVELS.UNLIKELY;
            reactResult.reasons = ['React usage disabled in .stackauthrc'];
            typesResult.confidence = CONFIDENCE_LEVELS.UNLIKELY;
            typesResult.reasons = ['React disabled in configuration'];
          }
        }
      } catch (error) {
        this.log(`Failed to parse .stackauthrc: ${error.message}`);
      }
    }
  }

  /**
   * Find all source files in the project
   */
  findSourceFiles(dir = this.projectPath, depth = 0) {
    if (depth > this.options.maxDepth) return [];
    
    const files = [];
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (!this.options.excludeDirs.includes(entry)) {
            files.push(...this.findSourceFiles(fullPath, depth + 1));
          }
        } else if (stat.isFile()) {
          // Include files with relevant extensions
          if (this.options.fileExtensions.includes(extname(entry))) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.log(`Error reading directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Read and cache file content
   */
  readFile(path) {
    if (this.fileCache.has(path)) {
      return this.fileCache.get(path);
    }
    
    try {
      const content = readFileSync(path, 'utf-8');
      this.fileCache.set(path, content);
      return content;
    } catch (error) {
      this.log(`Error reading file ${path}: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if content has React imports
   */
  hasReactImport(content) {
    const patterns = [
      /import\s+.*from\s+['"]react['"]/,
      /import\s+['"]react['"]/,
      /require\(['"]react['"]\)/,
      /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/,
      /import\s+React/
    ];
    
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content has Stack UI imports
   */
  hasStackUIImport(content) {
    const patterns = [
      /@stackframe\/stack-ui/,
      /astro-stack-auth\/components/,
      /SignIn|SignUp|UserButton|AccountSettings/
    ];
    
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content has Astro client directives
   */
  hasClientDirective(content) {
    const patterns = [
      /client:load/,
      /client:idle/,
      /client:visible/,
      /client:media/,
      /client:only/
    ];
    
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Read package.json
   */
  readPackageJson() {
    const path = join(this.projectPath, 'package.json');
    if (this.configCache.has('package.json')) {
      return this.configCache.get('package.json');
    }
    
    try {
      const content = JSON.parse(readFileSync(path, 'utf-8'));
      this.configCache.set('package.json', content);
      return content;
    } catch (error) {
      this.log(`Failed to read package.json: ${error.message}`);
      return null;
    }
  }

  /**
   * Read tsconfig.json
   */
  readTsConfig() {
    const path = join(this.projectPath, 'tsconfig.json');
    if (this.configCache.has('tsconfig.json')) {
      return this.configCache.get('tsconfig.json');
    }
    
    try {
      const content = JSON.parse(readFileSync(path, 'utf-8'));
      this.configCache.set('tsconfig.json', content);
      return content;
    } catch (error) {
      this.log(`Failed to read tsconfig.json: ${error.message}`);
      return null;
    }
  }

  /**
   * Find and read Astro config
   */
  readAstroConfig() {
    const possibleConfigs = [
      'astro.config.mjs',
      'astro.config.js',
      'astro.config.ts'
    ];
    
    for (const config of possibleConfigs) {
      const path = join(this.projectPath, config);
      if (existsSync(path)) {
        return path;
      }
    }
    
    return null;
  }

  /**
   * Generate detection report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      projectPath: this.projectPath,
      detectedDependencies: {},
      summary: {
        reactNeeded: false,
        typesNeeded: false,
        confidence: CONFIDENCE_LEVELS.UNLIKELY
      },
      recommendations: []
    };
    
    // Process each detection result
    for (const [name, result] of this.detectionResults) {
      report.detectedDependencies[name] = result.toJSON();
      
      if (name === 'react' && result.required) {
        report.summary.reactNeeded = true;
        report.summary.confidence = result.confidence;
      }
      
      if (name === '@types/react' && result.required) {
        report.summary.typesNeeded = true;
      }
    }
    
    // Generate overall recommendations
    if (report.summary.reactNeeded) {
      report.recommendations.push({
        priority: 'high',
        action: 'Install React dependencies',
        command: 'npm install react react-dom @astrojs/react',
        reason: 'React components or JSX files detected in your project'
      });
    }
    
    if (report.summary.typesNeeded) {
      report.recommendations.push({
        priority: 'medium',
        action: 'Install React type definitions',
        command: 'npm install --save-dev @types/react @types/react-dom',
        reason: 'TypeScript with React usage detected'
      });
    }
    
    if (!report.summary.reactNeeded && !report.summary.typesNeeded) {
      report.recommendations.push({
        priority: 'info',
        action: 'No React dependencies needed',
        reason: 'Your project does not appear to use React features',
        note: 'Stack Auth can work without React for server-side authentication'
      });
    }
    
    return report;
  }

  /**
   * Log messages if verbose mode is enabled
   */
  log(message) {
    if (this.options.verbose) {
      console.log(`[SmartDetector] ${message}`);
    }
  }

  /**
   * Print formatted report to console
   */
  printReport(report) {
    console.log('\n📊 Smart Dependency Detection Report');
    console.log('=' .repeat(50));
    
    console.log('\n📦 Detected Dependencies:');
    for (const [name, details] of Object.entries(report.detectedDependencies)) {
      const icon = details.required ? '✅' : '❌';
      console.log(`  ${icon} ${name}: ${details.confidence} confidence`);
      
      if (details.reasons.length > 0) {
        console.log('     Reasons:');
        details.reasons.slice(0, 3).forEach(reason => {
          console.log(`       • ${reason}`);
        });
        if (details.reasons.length > 3) {
          console.log(`       ... and ${details.reasons.length - 3} more`);
        }
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log(`  React needed: ${report.summary.reactNeeded ? 'Yes' : 'No'}`);
    console.log(`  TypeScript types needed: ${report.summary.typesNeeded ? 'Yes' : 'No'}`);
    console.log(`  Overall confidence: ${report.summary.confidence}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const rec of report.recommendations) {
        console.log(`\n  [${rec.priority.toUpperCase()}] ${rec.action}`);
        if (rec.command) {
          console.log(`  Command: ${rec.command}`);
        }
        if (rec.reason) {
          console.log(`  Reason: ${rec.reason}`);
        }
        if (rec.note) {
          console.log(`  Note: ${rec.note}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

/**
 * Export convenience function
 */
export async function detectOptionalDependencies(projectPath, options) {
  const detector = new SmartDependencyDetector(projectPath, options);
  return detector.detect();
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectPath = process.argv[2] || process.cwd();
  
  console.log(`\n🔍 Analyzing project: ${projectPath}\n`);
  
  const detector = new SmartDependencyDetector(projectPath, {
    verbose: process.env.STACK_AUTH_DEBUG === 'true' || process.argv.includes('--verbose')
  });
  
  detector.detect()
    .then(report => {
      detector.printReport(report);
      
      // Exit with appropriate code
      if (report.summary.reactNeeded && !detector.readPackageJson()?.dependencies?.react) {
        process.exit(1); // Missing required dependency
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Detection failed:', error);
      process.exit(1);
    });
}