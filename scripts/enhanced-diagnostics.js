#!/usr/bin/env node

/**
 * Enhanced Error Diagnostics for Type Extraction Failures
 * 
 * Provides detailed error analysis, categorization, and actionable troubleshooting
 * guidance when TypeScript compilation or type extraction fails.
 */

import * as ts from 'typescript';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

/**
 * Error categories for classification
 */
export const ERROR_CATEGORIES = {
  DEPENDENCY_MISSING: 'dependency_missing',
  COMPILATION_ERROR: 'compilation_error', 
  MODULE_RESOLUTION: 'module_resolution',
  TYPE_DEFINITION: 'type_definition',
  CONFIGURATION: 'configuration',
  VERSION_COMPATIBILITY: 'version_compatibility',
  PERMISSION: 'permission',
  NETWORK: 'network',
  UNKNOWN: 'unknown'
};

/**
 * Verbose logging state
 */
let verboseMode = process.env.STACK_AUTH_VERBOSE === 'true' || process.argv.includes('--verbose');

/**
 * Enable or disable verbose logging
 */
export function setVerboseMode(enabled) {
  verboseMode = enabled;
}

/**
 * Verbose logger
 */
function verboseLog(message, ...args) {
  if (verboseMode) {
    console.log(`[VERBOSE] ${message}`, ...args);
  }
}

/**
 * Enhanced TypeScript diagnostic analyzer
 */
export function analyzeTypeScriptDiagnostics(diagnostics, program) {
  verboseLog('Analyzing TypeScript diagnostics...', { diagnosticCount: diagnostics.length });
  
  const categorizedErrors = [];
  const suggestions = [];
  
  for (const diagnostic of diagnostics) {
    const analysis = categorizeDiagnostic(diagnostic, program);
    categorizedErrors.push(analysis);
    
    // Generate specific suggestions for this error
    const errorSuggestions = generateSuggestionsForDiagnostic(analysis);
    suggestions.push(...errorSuggestions);
  }
  
  return {
    categorizedErrors,
    suggestions: deduplicateSuggestions(suggestions),
    summary: generateDiagnosticSummary(categorizedErrors)
  };
}

/**
 * Categorize a single TypeScript diagnostic
 */
function categorizeDiagnostic(diagnostic, program) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const code = diagnostic.code;
  const fileName = diagnostic.file?.fileName;
  
  verboseLog('Categorizing diagnostic:', { code, message: message.substring(0, 100) });
  
  let category = ERROR_CATEGORIES.UNKNOWN;
  let specificType = 'unknown_error';
  let actionable = false;
  
  // Module resolution errors
  if (code === 2307 || code === 2792 || message.includes('Cannot find module')) {
    category = ERROR_CATEGORIES.MODULE_RESOLUTION;
    specificType = 'module_not_found';
    actionable = true;
  }
  // Missing type definitions
  else if (code === 7016 || message.includes('Try `npm i --save-dev @types/')) {
    category = ERROR_CATEGORIES.TYPE_DEFINITION;
    specificType = 'missing_types';
    actionable = true;
  }
  // Cannot find name (often missing imports)
  else if (code === 2304) {
    category = ERROR_CATEGORIES.DEPENDENCY_MISSING;
    specificType = 'missing_import';
    actionable = true;
  }
  // Type compatibility issues
  else if (code === 2322 || code === 2339 || code === 2345) {
    category = ERROR_CATEGORIES.TYPE_DEFINITION;
    specificType = 'type_mismatch';
    actionable = true;
  }
  // Configuration issues
  else if (fileName && fileName.includes('tsconfig')) {
    category = ERROR_CATEGORIES.CONFIGURATION;
    specificType = 'config_error';
    actionable = true;
  }
  // Generic compilation errors
  else if (code >= 1000 && code < 2000) {
    category = ERROR_CATEGORIES.COMPILATION_ERROR;
    specificType = 'syntax_error';
    actionable = false;
  }
  
  // Extract module name if it's a module resolution error
  let moduleName = null;
  const moduleMatch = message.match(/Cannot find module ['"]([^'"]+)['"]/);
  if (moduleMatch) {
    moduleName = moduleMatch[1];
  }
  
  return {
    category,
    specificType,
    code,
    message,
    fileName,
    moduleName,
    actionable,
    line: diagnostic.file ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0).line + 1 : null,
    character: diagnostic.file ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0).character + 1 : null
  };
}

/**
 * Generate specific suggestions for a diagnostic
 */
function generateSuggestionsForDiagnostic(diagnostic) {
  const suggestions = [];
  
  switch (diagnostic.category) {
    case ERROR_CATEGORIES.MODULE_RESOLUTION:
      suggestions.push(...generateModuleResolutionSuggestions(diagnostic));
      break;
      
    case ERROR_CATEGORIES.TYPE_DEFINITION:
      suggestions.push(...generateTypeDefinitionSuggestions(diagnostic));
      break;
      
    case ERROR_CATEGORIES.DEPENDENCY_MISSING:
      suggestions.push(...generateDependencySuggestions(diagnostic));
      break;
      
    case ERROR_CATEGORIES.CONFIGURATION:
      suggestions.push(...generateConfigurationSuggestions(diagnostic));
      break;
      
    case ERROR_CATEGORIES.COMPILATION_ERROR:
      suggestions.push(...generateCompilationSuggestions(diagnostic));
      break;
      
    default:
      suggestions.push({
        type: 'info',
        priority: 'low',
        title: 'General TypeScript Error',
        description: `TypeScript error ${diagnostic.code}: ${diagnostic.message}`,
        action: 'Review the TypeScript documentation for this error code',
        commands: [],
        links: [`https://typescript.tv/errors/#TS${diagnostic.code}`]
      });
  }
  
  return suggestions;
}

/**
 * Generate suggestions for module resolution errors
 */
function generateModuleResolutionSuggestions(diagnostic) {
  const suggestions = [];
  const { moduleName, message } = diagnostic;
  
  if (moduleName) {
    // Check if it's a Stack Auth package
    if (moduleName.includes('@stackframe/')) {
      suggestions.push({
        type: 'error',
        priority: 'high',
        title: 'Stack Auth Package Not Found',
        description: `The required Stack Auth package "${moduleName}" is not installed or not accessible.`,
        action: 'Install the missing Stack Auth package',
        commands: [
          `npm install ${moduleName}`,
          `npm install ${moduleName}@latest`
        ],
        links: [
          'https://docs.stack-auth.com/getting-started/installation',
          'https://www.npmjs.com/package/@stackframe/stack'
        ]
      });
    } else {
      // Generic module installation
      suggestions.push({
        type: 'warning',
        priority: 'high',
        title: 'Missing Node Module',
        description: `The module "${moduleName}" cannot be found.`,
        action: 'Install the missing package',
        commands: [
          `npm install ${moduleName}`,
          `npm install --save-dev ${moduleName}`
        ],
        links: [`https://www.npmjs.com/package/${moduleName}`]
      });
    }
    
    // Additional suggestion for path resolution
    suggestions.push({
      type: 'info',
      priority: 'medium',
      title: 'Check Module Resolution',
      description: 'Verify that the module path is correct and the package is in node_modules.',
      action: 'Validate installation and paths',
      commands: [
        `npm ls ${moduleName}`,
        'npm install',
        'rm -rf node_modules && npm install'
      ],
      links: []
    });
  }
  
  return suggestions;
}

/**
 * Generate suggestions for type definition errors
 */
function generateTypeDefinitionSuggestions(diagnostic) {
  const suggestions = [];
  const { message, moduleName } = diagnostic;
  
  // Check for @types package suggestions
  const typesMatch = message.match(/Try `npm i --save-dev (@types\/[^`]+)`/);
  if (typesMatch) {
    const typesPackage = typesMatch[1];
    suggestions.push({
      type: 'info',
      priority: 'high',
      title: 'Install Type Definitions',
      description: `TypeScript definitions are missing for a package.`,
      action: `Install the ${typesPackage} package`,
      commands: [`npm install --save-dev ${typesPackage}`],
      links: []
    });
  }
  
  // Generic type definition issues
  suggestions.push({
    type: 'info',
    priority: 'medium',
    title: 'Type Definition Issues',
    description: 'There are type compatibility or definition issues.',
    action: 'Review TypeScript configuration and type imports',
    commands: [
      'npx tsc --noEmit --listFiles',
      'npm install --save-dev typescript@latest'
    ],
    links: [
      'https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html'
    ]
  });
  
  return suggestions;
}

/**
 * Generate suggestions for dependency errors
 */
function generateDependencySuggestions(diagnostic) {
  const suggestions = [];
  
  suggestions.push({
    type: 'warning',
    priority: 'high',
    title: 'Missing Dependencies',
    description: 'Required dependencies or imports are missing.',
    action: 'Install missing dependencies and check imports',
    commands: [
      'npm install',
      'npm install @stackframe/stack @stackframe/stack-ui',
      'npm audit fix'
    ],
    links: [
      'https://docs.stack-auth.com/getting-started/installation'
    ]
  });
  
  return suggestions;
}

/**
 * Generate suggestions for configuration errors
 */
function generateConfigurationSuggestions(diagnostic) {
  const suggestions = [];
  
  suggestions.push({
    type: 'error',
    priority: 'high',
    title: 'TypeScript Configuration Error',
    description: 'There is an error in your TypeScript configuration file.',
    action: 'Fix the TypeScript configuration',
    commands: [
      'npx tsc --init',
      'npx tsc --showConfig'
    ],
    links: [
      'https://www.typescriptlang.org/docs/handbook/tsconfig-json.html'
    ]
  });
  
  return suggestions;
}

/**
 * Generate suggestions for compilation errors
 */
function generateCompilationSuggestions(diagnostic) {
  const suggestions = [];
  
  suggestions.push({
    type: 'info',
    priority: 'medium',
    title: 'TypeScript Compilation Error',
    description: 'There is a syntax or type error in the code.',
    action: 'Review and fix the TypeScript syntax error',
    commands: [
      'npx tsc --noEmit',
      'npx tsc --listFiles'
    ],
    links: [
      'https://www.typescriptlang.org/docs/handbook/basic-types.html'
    ]
  });
  
  return suggestions;
}

/**
 * Deduplicate suggestions based on title and priority
 */
function deduplicateSuggestions(suggestions) {
  const seen = new Set();
  return suggestions.filter(suggestion => {
    const key = `${suggestion.title}-${suggestion.priority}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Generate diagnostic summary
 */
function generateDiagnosticSummary(categorizedErrors) {
  const summary = {
    total: categorizedErrors.length,
    byCategory: {},
    actionable: 0,
    critical: 0
  };
  
  for (const error of categorizedErrors) {
    summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
    
    if (error.actionable) {
      summary.actionable++;
    }
    
    if (error.category === ERROR_CATEGORIES.DEPENDENCY_MISSING || 
        error.category === ERROR_CATEGORIES.MODULE_RESOLUTION) {
      summary.critical++;
    }
  }
  
  return summary;
}

/**
 * Enhanced dependency validation with installation suggestions
 */
export function validateDependencies() {
  verboseLog('Validating dependencies...');
  
  const results = {
    valid: true,
    missing: [],
    outdated: [],
    suggestions: []
  };
  
  // Check for required packages
  const requiredPackages = [
    '@stackframe/stack',
    '@stackframe/stack-ui',
    'typescript',
    'react',
    '@types/react'
  ];
  
  for (const packageName of requiredPackages) {
    const validation = validateSinglePackage(packageName);
    
    if (!validation.installed) {
      results.missing.push(packageName);
      results.valid = false;
      
      results.suggestions.push({
        type: 'error',
        priority: 'high',
        title: `Missing Required Package: ${packageName}`,
        description: `The package "${packageName}" is required for type extraction but is not installed.`,
        action: `Install ${packageName}`,
        commands: [`npm install ${packageName}`],
        links: []
      });
    } else if (validation.needsUpdate) {
      results.outdated.push({
        name: packageName,
        current: validation.currentVersion,
        latest: validation.latestVersion
      });
      
      results.suggestions.push({
        type: 'warning',
        priority: 'medium',
        title: `Outdated Package: ${packageName}`,
        description: `${packageName} v${validation.currentVersion} is installed, but v${validation.latestVersion} is available.`,
        action: `Update ${packageName}`,
        commands: [`npm install ${packageName}@latest`],
        links: []
      });
    }
  }
  
  return results;
}

/**
 * Validate a single package installation
 */
function validateSinglePackage(packageName) {
  verboseLog(`Validating package: ${packageName}`);
  
  try {
    // Try to resolve the package
    require.resolve(packageName);
    
    // Get current version
    let currentVersion = null;
    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      currentVersion = packageJson.version;
    } catch (error) {
      verboseLog(`Could not read version for ${packageName}:`, error.message);
    }
    
    // Check for updates (simplified - in real implementation might use npm API)
    let latestVersion = null;
    let needsUpdate = false;
    
    try {
      if (verboseMode) {
        const result = execSync(`npm view ${packageName} version`, { 
          encoding: 'utf-8', 
          stdio: 'pipe',
          timeout: 5000 
        });
        latestVersion = result.trim();
        needsUpdate = currentVersion && latestVersion && currentVersion !== latestVersion;
      }
    } catch (error) {
      verboseLog(`Could not check latest version for ${packageName}:`, error.message);
    }
    
    return {
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate
    };
    
  } catch (error) {
    return {
      installed: false,
      currentVersion: null,
      latestVersion: null,
      needsUpdate: false
    };
  }
}

/**
 * Generate comprehensive diagnostic report
 */
export function generateDiagnosticReport(error, context = {}) {
  verboseLog('Generating diagnostic report...', { errorType: typeof error });
  
  const report = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name || 'Error'
    },
    context,
    environment: gatherEnvironmentInfo(),
    diagnostics: null,
    dependencies: null,
    suggestions: [],
    troubleshootingSteps: []
  };
  
  // If we have TypeScript diagnostics, analyze them
  if (context.program && context.diagnostics) {
    report.diagnostics = analyzeTypeScriptDiagnostics(context.diagnostics, context.program);
    report.suggestions.push(...report.diagnostics.suggestions);
  }
  
  // Validate dependencies
  report.dependencies = validateDependencies();
  report.suggestions.push(...report.dependencies.suggestions);
  
  // Generate troubleshooting steps
  report.troubleshootingSteps = generateTroubleshootingSteps(report);
  
  return report;
}

/**
 * Gather environment information for debugging
 */
function gatherEnvironmentInfo() {
  const env = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    typescript: null,
    npm: null
  };
  
  try {
    const tsVersion = execSync('npx tsc --version', { encoding: 'utf-8', stdio: 'pipe', timeout: 3000 });
    env.typescript = tsVersion.trim();
  } catch (error) {
    env.typescript = 'Not available';
  }
  
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8', stdio: 'pipe', timeout: 3000 });
    env.npm = npmVersion.trim();
  } catch (error) {
    env.npm = 'Not available';
  }
  
  return env;
}

/**
 * Generate step-by-step troubleshooting guide
 */
function generateTroubleshootingSteps(report) {
  const steps = [];
  
  // Step 1: Check critical dependencies
  if (report.dependencies && !report.dependencies.valid) {
    steps.push({
      step: 1,
      title: 'Install Missing Dependencies',
      description: 'Install the required packages for Stack Auth type extraction.',
      commands: report.dependencies.missing.map(pkg => `npm install ${pkg}`),
      expected: 'All required packages should be installed successfully.'
    });
  }
  
  // Step 2: Check TypeScript configuration
  steps.push({
    step: steps.length + 1,
    title: 'Validate TypeScript Configuration', 
    description: 'Ensure TypeScript is properly configured for the project.',
    commands: [
      'npx tsc --showConfig',
      'npx tsc --noEmit'
    ],
    expected: 'TypeScript should compile without errors.'
  });
  
  // Step 3: Clear cache and reinstall
  steps.push({
    step: steps.length + 1,
    title: 'Clear Cache and Reinstall',
    description: 'Clear npm cache and reinstall dependencies to resolve potential corruption.',
    commands: [
      'rm -rf node_modules package-lock.json',
      'npm cache clean --force',
      'npm install'
    ],
    expected: 'Dependencies should install cleanly without errors.'
  });
  
  // Step 4: Run with verbose logging
  steps.push({
    step: steps.length + 1,
    title: 'Enable Verbose Logging',
    description: 'Run type extraction with verbose logging to get detailed error information.',
    commands: [
      'STACK_AUTH_VERBOSE=true npm run docs:extract-types',
      'npm run docs:extract-types -- --verbose'
    ],
    expected: 'Detailed logging should reveal the specific cause of the failure.'
  });
  
  return steps;
}

/**
 * Format diagnostic report for user display
 */
export function formatDiagnosticReport(report) {
  const output = [];
  
  output.push('🚨 Type Extraction Diagnostic Report');
  output.push('=' .repeat(50));
  output.push('');
  
  // Error summary
  output.push('📋 Error Summary:');
  output.push(`   ${report.error.name}: ${report.error.message}`);
  output.push('');
  
  // Environment info
  output.push('🖥️  Environment:');
  output.push(`   Node.js: ${report.environment.node}`);
  output.push(`   TypeScript: ${report.environment.typescript}`);
  output.push(`   Platform: ${report.environment.platform}`);
  output.push('');
  
  // Dependencies status
  if (report.dependencies) {
    output.push('📦 Dependencies:');
    if (report.dependencies.valid) {
      output.push('   ✅ All required dependencies are installed');
    } else {
      output.push('   ❌ Missing dependencies:');
      report.dependencies.missing.forEach(pkg => {
        output.push(`      - ${pkg}`);
      });
    }
    output.push('');
  }
  
  // TypeScript diagnostics
  if (report.diagnostics) {
    output.push('🔍 TypeScript Analysis:');
    output.push(`   Total errors: ${report.diagnostics.summary.total}`);
    output.push(`   Actionable errors: ${report.diagnostics.summary.actionable}`);
    output.push(`   Critical errors: ${report.diagnostics.summary.critical}`);
    output.push('');
  }
  
  // Top suggestions
  const highPrioritySuggestions = report.suggestions
    .filter(s => s.priority === 'high')
    .slice(0, 3);
  
  if (highPrioritySuggestions.length > 0) {
    output.push('💡 Immediate Actions:');
    highPrioritySuggestions.forEach((suggestion, index) => {
      output.push(`   ${index + 1}. ${suggestion.title}`);
      output.push(`      ${suggestion.description}`);
      if (suggestion.commands.length > 0) {
        output.push(`      Run: ${suggestion.commands[0]}`);
      }
      output.push('');
    });
  }
  
  // Troubleshooting steps
  if (report.troubleshootingSteps.length > 0) {
    output.push('🔧 Troubleshooting Steps:');
    report.troubleshootingSteps.forEach(step => {
      output.push(`   ${step.step}. ${step.title}`);
      output.push(`      ${step.description}`);
      output.push('');
    });
  }
  
  return output.join('\n');
}