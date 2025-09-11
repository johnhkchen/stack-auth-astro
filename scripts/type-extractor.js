#!/usr/bin/env node

/**
 * TypeScript Type Extraction System
 * 
 * Uses the TypeScript Compiler API to extract prop interfaces from
 * @stackframe/stack components at build time for dynamic documentation generation.
 */

import * as ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { 
  analyzeTypeScriptDiagnostics, 
  generateDiagnosticReport, 
  formatDiagnosticReport,
  validateDependencies,
  setVerboseMode 
} from './enhanced-diagnostics.js';
import { 
  EnhancedModuleResolver, 
  ResolutionError 
} from './package-resolution-diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Enhanced TypeScript configuration detection and parsing
 */
function detectAndParseTypeScriptConfig(projectRoot = process.cwd()) {
  console.log('🔍 Detecting consumer project TypeScript configuration...');
  
  try {
    // Find tsconfig.json in consumer project
    const configPath = ts.findConfigFile(
      projectRoot,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!configPath) {
      console.warn('⚠️ No tsconfig.json found, using fallback configuration');
      return {
        success: false,
        configPath: null,
        compilerOptions: getFallbackCompilerOptions(),
        warnings: ['No tsconfig.json found in consumer project'],
        source: 'fallback'
      };
    }

    console.log(`📁 Found tsconfig.json at: ${configPath}`);

    // Read and parse the configuration file with extends chain support
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    
    if (configFile.error) {
      console.warn(`⚠️ Error reading tsconfig.json: ${configFile.error.messageText}`);
      return {
        success: false,
        configPath,
        compilerOptions: getFallbackCompilerOptions(),
        warnings: [`Failed to read tsconfig.json: ${configFile.error.messageText}`],
        source: 'fallback'
      };
    }

    // Parse JSON config file content (handles extends chains automatically)
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      dirname(configPath)
    );

    if (parsed.errors && parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(error => 
        typeof error.messageText === 'string' 
          ? error.messageText 
          : error.messageText.messageText
      );
      
      console.warn('⚠️ TypeScript config parsing errors:', errorMessages);
      return {
        success: false,
        configPath,
        compilerOptions: getFallbackCompilerOptions(),
        warnings: errorMessages,
        source: 'fallback'
      };
    }

    // Validate and enhance compiler options for type extraction
    const validatedOptions = validateAndEnhanceCompilerOptions(parsed.options);
    
    console.log('✅ Successfully parsed consumer TypeScript configuration');
    console.log(`   Target: ${ts.ScriptTarget[validatedOptions.target]}`);
    console.log(`   Module: ${ts.ModuleKind[validatedOptions.module]}`);
    console.log(`   Module Resolution: ${ts.ModuleResolutionKind[validatedOptions.moduleResolution]}`);
    console.log(`   Strict: ${validatedOptions.strict}`);

    return {
      success: true,
      configPath,
      compilerOptions: validatedOptions,
      warnings: validatedOptions._validationWarnings || [],
      source: 'consumer'
    };

  } catch (error) {
    console.error(`❌ Error detecting TypeScript configuration: ${error.message}`);
    return {
      success: false,
      configPath: null,
      compilerOptions: getFallbackCompilerOptions(),
      warnings: [`Unexpected error: ${error.message}`],
      source: 'fallback'
    };
  }
}

/**
 * Get fallback compiler options when tsconfig.json is missing or invalid
 */
function getFallbackCompilerOptions() {
  return {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    declaration: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['ES2020', 'DOM'],
    types: ['node'],
    noEmit: true,
    isolatedModules: true
  };
}

/**
 * Validate and enhance compiler options for type extraction compatibility
 */
function validateAndEnhanceCompilerOptions(options) {
  const warnings = [];
  const enhanced = { ...options };

  // Critical options for type extraction
  const criticalOptions = {
    // Ensure we can process declarations
    declaration: true,
    skipLibCheck: true,
    noEmit: true,
    
    // Essential for module resolution
    esModuleInterop: enhanced.esModuleInterop !== false,
    allowSyntheticDefaultImports: enhanced.allowSyntheticDefaultImports !== false,
    
    // Ensure we can process JSX if needed
    jsx: enhanced.jsx || ts.JsxEmit.ReactJSX
  };

  // Apply critical options
  Object.assign(enhanced, criticalOptions);

  // Validate target compatibility
  if (enhanced.target && enhanced.target < ts.ScriptTarget.ES2018) {
    warnings.push(`Target ${ts.ScriptTarget[enhanced.target]} may cause issues with modern TypeScript features. Consider ES2018 or higher.`);
  }

  // Validate module resolution
  if (enhanced.moduleResolution === ts.ModuleResolutionKind.Classic) {
    warnings.push('Classic module resolution may cause import resolution issues. Consider using Node or NodeNext.');
  }

  // Validate module format
  const validModules = [
    ts.ModuleKind.ESNext, 
    ts.ModuleKind.ES2020, 
    ts.ModuleKind.ES2022,
    ts.ModuleKind.CommonJS,
    ts.ModuleKind.NodeNext
  ];
  
  if (enhanced.module && !validModules.includes(enhanced.module)) {
    warnings.push(`Module format ${ts.ModuleKind[enhanced.module]} may not be fully supported.`);
  }

  // Ensure lib includes necessary libraries
  if (!enhanced.lib || enhanced.lib.length === 0) {
    enhanced.lib = ['ES2020', 'DOM'];
    warnings.push('No lib specified, defaulting to ES2020 and DOM');
  }

  // Validate strict mode settings
  if (enhanced.strict === false) {
    warnings.push('Strict mode is disabled, which may affect type extraction accuracy.');
  }

  // Store warnings for reporting
  enhanced._validationWarnings = warnings;

  return enhanced;
}

/**
 * Create TypeScript program with enhanced configuration detection
 */
function createTypeScriptProgram(entry) {
  // Detect and parse consumer's TypeScript configuration
  const configResult = detectAndParseTypeScriptConfig();
  
  // Log configuration source and any warnings
  console.log(`🔧 Using TypeScript configuration from: ${configResult.source}`);
  if (configResult.warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    configResult.warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  const compilerOptions = configResult.compilerOptions;

  // Create a virtual entry file that imports the components
  const virtualEntry = `
    import { 
      SignIn as SignInComponent,
      SignUp as SignUpComponent, 
      UserButton as UserButtonComponent,
      AccountSettings as AccountSettingsComponent,
      StackProvider as StackProviderComponent
    } from '@stackframe/stack';
    import React from 'react';
    
    export type SignInProps = React.ComponentProps<typeof SignInComponent>;
    export type SignUpProps = React.ComponentProps<typeof SignUpComponent>;  
    export type UserButtonProps = React.ComponentProps<typeof UserButtonComponent>;
    export type AccountSettingsProps = React.ComponentProps<typeof AccountSettingsComponent>;
    export type StackProviderProps = React.ComponentProps<typeof StackProviderComponent>;
  `;

  const baseHost = ts.createCompilerHost(compilerOptions);
  
  const program = ts.createProgram({
    rootNames: [entry],
    options: compilerOptions,
    host: {
      ...baseHost,
      readFile: (fileName) => {
        if (fileName === entry) {
          return virtualEntry;
        }
        return ts.sys.readFile(fileName);
      },
      fileExists: (fileName) => {
        if (fileName === entry) {
          return true;
        }
        return ts.sys.fileExists(fileName);
      },
      getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (fileName === entry) {
          return ts.createSourceFile(fileName, virtualEntry, languageVersion);
        }
        return baseHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
      }
    }
  });

  return program;
}

/**
 * Extract interface properties from TypeScript type
 */
function extractInterfaceProperties(type, checker) {
  const props = {};
  
  if (!type.symbol) {
    return props;
  }
  
  // Get all properties of the type
  const properties = checker.getPropertiesOfType(type);
  
  for (const prop of properties) {
    const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
    const propTypeString = checker.typeToString(propType);
    
    // Check if property is optional
    const isOptional = prop.valueDeclaration && 
      prop.valueDeclaration.questionToken !== undefined;
    
    // Extract JSDoc comment if available
    const jsDocComment = getJSDocComment(prop);
    
    props[prop.getName()] = {
      type: simplifyTypeString(propTypeString),
      required: !isOptional,
      description: jsDocComment || `${prop.getName()} property`
    };
  }
  
  return props;
}

/**
 * Simplify complex TypeScript type strings for documentation
 */
function simplifyTypeString(typeString) {
  // Map complex types to simpler documentation-friendly types
  const typeMap = {
    'string | undefined': 'string',
    'number | undefined': 'number', 
    'boolean | undefined': 'boolean',
    'React.ReactNode': 'react-node',
    'ReactNode': 'react-node',
    'React.CSSProperties': 'object',
    'CSSProperties': 'object',
    '(...args: any[]) => any': 'function',
    '() => void': 'function',
    '(event: any) => void': 'function'
  };
  
  // Handle array types
  if (typeString.endsWith('[]')) {
    return 'array';
  }
  
  // Handle union types with undefined (optional types)
  if (typeString.includes(' | undefined')) {
    const baseType = typeString.replace(' | undefined', '');
    return simplifyTypeString(baseType);
  }
  
  // Handle complex function signatures
  if (typeString.includes('=>') || typeString.includes('Function')) {
    return 'function';
  }
  
  // Handle React types
  if (typeString.includes('React.') || typeString.includes('ReactNode')) {
    return typeMap[typeString] || 'react-node';
  }
  
  return typeMap[typeString] || typeString.toLowerCase();
}

/**
 * Extract JSDoc comment from symbol
 */
function getJSDocComment(symbol) {
  if (!symbol.valueDeclaration) {
    return null;
  }
  
  const jsDoc = ts.getJSDocCommentsAndTags(symbol.valueDeclaration);
  if (jsDoc.length > 0) {
    const comment = jsDoc[0];
    if (comment.comment) {
      return typeof comment.comment === 'string' 
        ? comment.comment 
        : comment.comment.map(c => c.text).join('');
    }
  }
  
  return null;
}

/**
 * Extract component props from @stackframe/stack
 */
async function extractComponentProps() {
  console.log('🔍 Extracting component props from @stackframe/stack...');
  
  // Check for verbose mode
  const verboseMode = process.env.STACK_AUTH_VERBOSE === 'true' || process.argv.includes('--verbose');
  setVerboseMode(verboseMode);
  
  try {
    // Pre-flight dependency validation
    console.log('🔍 Validating dependencies...');
    const dependencyValidation = validateDependencies();
    
    if (!dependencyValidation.valid) {
      console.error('❌ Dependency validation failed:');
      dependencyValidation.missing.forEach(pkg => {
        console.error(`   Missing: ${pkg}`);
      });
      
      const report = generateDiagnosticReport(
        new Error('Required dependencies are missing'), 
        { dependencies: dependencyValidation }
      );
      
      if (verboseMode) {
        console.error('\n' + formatDiagnosticReport(report));
      } else {
        console.error('💡 Run with --verbose or set STACK_AUTH_VERBOSE=true for detailed diagnostics');
      }
      
      return null;
    }
    
    // Check if @stackframe/stack is available with enhanced diagnostics
    const stackPath = await resolveModulePath('@stackframe/stack');
    if (!stackPath) {
      const error = new Error('@stackframe/stack not found');
      const report = generateDiagnosticReport(error, { 
        moduleName: '@stackframe/stack',
        stackPath 
      });
      
      console.warn('⚠️ @stackframe/stack not found, falling back to static types');
      if (verboseMode) {
        console.warn('\n' + formatDiagnosticReport(report));
      }
      
      return null;
    }
    
    // Create virtual entry file path
    const virtualEntry = join(process.cwd(), '__virtual_type_extraction__.ts');
    
    // Create TypeScript program
    const program = createTypeScriptProgram(virtualEntry);
    const checker = program.getTypeChecker();
    
    // Get all diagnostics
    const syntacticDiagnostics = program.getSyntacticDiagnostics();
    const semanticDiagnostics = program.getSemanticDiagnostics();
    const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];
    
    // Get the source file with enhanced diagnostics
    const sourceFile = program.getSourceFile(virtualEntry);
    if (!sourceFile) {
      const error = new Error('Could not create virtual source file for type extraction');
      const report = generateDiagnosticReport(error, {
        virtualEntry,
        program,
        diagnostics: allDiagnostics,
        rootFileNames: program.getRootFileNames()
      });
      
      console.error('❌ Failed to create virtual source file');
      console.error(`   Virtual entry path: ${virtualEntry}`);
      console.error(`   Program root names: ${program.getRootFileNames().join(', ')}`);
      
      if (allDiagnostics.length > 0) {
        const diagnosticAnalysis = analyzeTypeScriptDiagnostics(allDiagnostics, program);
        console.error(`❌ Found ${diagnosticAnalysis.summary.total} TypeScript errors:`);
        console.error(`   Actionable: ${diagnosticAnalysis.summary.actionable}`);
        console.error(`   Critical: ${diagnosticAnalysis.summary.critical}`);
        
        if (verboseMode) {
          console.error('\n📊 Detailed Analysis:');
          diagnosticAnalysis.categorizedErrors.slice(0, 5).forEach(error => {
            console.error(`   ${error.category}: ${error.message.substring(0, 100)}...`);
          });
          
          console.error('\n💡 Top Suggestions:');
          diagnosticAnalysis.suggestions.slice(0, 3).forEach(suggestion => {
            console.error(`   ${suggestion.title}: ${suggestion.description}`);
          });
        }
      }
      
      if (verboseMode) {
        console.error('\n' + formatDiagnosticReport(report));
      } else {
        console.error('💡 Run with --verbose for detailed diagnostic information');
      }
      
      throw error;
    }
    
    const extractedProps = {};
    
    // Component names we want to extract
    const componentNames = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
    
    // Visit all nodes in the source file
    ts.forEachChild(sourceFile, function visit(node) {
      if (ts.isTypeAliasDeclaration(node)) {
        const typeName = node.name.text;
        
        // Check if this is one of our component prop types
        const componentName = componentNames.find(name => 
          typeName === `${name}Props`
        );
        
        if (componentName) {
          const type = checker.getTypeAtLocation(node);
          const props = extractInterfaceProperties(type, checker);
          extractedProps[componentName] = props;
          console.log(`✅ Extracted ${Object.keys(props).length} props for ${componentName}`);
        }
      }
      
      ts.forEachChild(node, visit);
    });
    
    return extractedProps;
    
  } catch (error) {
    const verboseMode = process.env.STACK_AUTH_VERBOSE === 'true' || process.argv.includes('--verbose');
    
    console.warn(`⚠️ Type extraction failed: ${error.message}`);
    console.warn('Falling back to static prop specifications');
    
    // Generate comprehensive diagnostic report
    const report = generateDiagnosticReport(error, {
      extractionPhase: 'component_extraction',
      dependencies: validateDependencies()
    });
    
    if (verboseMode) {
      console.warn('\n📋 Enhanced Error Diagnostics:');
      console.warn(formatDiagnosticReport(report));
    } else {
      console.warn('💡 For detailed error diagnostics, run with --verbose or set STACK_AUTH_VERBOSE=true');
      
      // Show only the most critical suggestions
      const criticalSuggestions = report.suggestions.filter(s => s.priority === 'high').slice(0, 2);
      if (criticalSuggestions.length > 0) {
        console.warn('💡 Quick fixes:');
        criticalSuggestions.forEach(suggestion => {
          console.warn(`   • ${suggestion.title}: ${suggestion.action}`);
          if (suggestion.commands.length > 0) {
            console.warn(`     Run: ${suggestion.commands[0]}`);
          }
        });
      }
    }
    
    return null;
  }
}

/**
 * Resolve module path in node_modules with enhanced diagnostics
 */
async function resolveModulePath(moduleName) {
  const verboseMode = process.env.STACK_AUTH_VERBOSE === 'true' || process.argv.includes('--verbose');
  
  try {
    // Use the enhanced resolver with diagnostics
    const resolver = new EnhancedModuleResolver({
      debug: verboseMode || process.env.STACK_AUTH_DEBUG === 'true',
      cache: true
    });
    
    const result = await resolver.resolveModule(moduleName);
    
    if (verboseMode) {
      console.log(`✅ Module resolved using strategy: ${result.strategy}`);
      console.log(`   Path: ${result.path}`);
      console.log(`   Time: ${result.timing.toFixed(2)}ms`);
      console.log(`   Cached: ${result.cached || false}`);
    }
    
    return result.path;
  } catch (error) {
    if (error instanceof ResolutionError) {
      if (verboseMode) {
        console.error('📊 Resolution Diagnostic Report:');
        console.error(error.toString());
        console.error('\nDetailed attempts:');
        error.report.attemptDetails.forEach((attempt, i) => {
          const status = attempt.success ? '✅' : '❌';
          console.error(`   ${i + 1}. ${status} ${attempt.strategy} (${attempt.timing?.toFixed(2)}ms)`);
          if (attempt.error) {
            console.error(`      Error: ${attempt.error}`);
          }
        });
      } else {
        console.warn(`⚠️ Failed to resolve ${moduleName}. Run with --verbose for diagnostics.`);
        if (error.report.recommendations.length > 0) {
          console.warn('💡 Quick fix:');
          console.warn(`   ${error.report.recommendations[0].suggestion}`);
          if (error.report.recommendations[0].command) {
            console.warn(`   Run: ${error.report.recommendations[0].command}`);
          }
        }
      }
    } else {
      console.error(`❌ Unexpected error resolving ${moduleName}: ${error.message}`);
    }
    
    return null;
  }
}

/**
 * Synchronous wrapper for backward compatibility
 */
function resolveModulePathSync(moduleName) {
  // For synchronous usage, fall back to simple resolution
  try {
    return require.resolve(moduleName);
  } catch {
    // Try basic fallback paths
    const possiblePaths = [
      join(process.cwd(), 'node_modules', moduleName),
      join(process.cwd(), 'node_modules', moduleName, 'package.json'),
      join(__dirname, '..', 'node_modules', moduleName)
    ];
    
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        if (path.endsWith('package.json')) {
          try {
            const pkg = JSON.parse(readFileSync(path, 'utf-8'));
            const baseDir = dirname(path);
            
            if (pkg.main) {
              const mainPath = join(baseDir, pkg.main);
              if (existsSync(mainPath)) return mainPath;
            }
          } catch {
            // Continue
          }
        }
        return path;
      }
    }
    
    return null;
  }
}

/**
 * Resolve package exports field (handles modern package.json exports)
 */
function resolvePackageExports(exports, packageDir) {
  if (!exports) return null;
  
  // Handle string exports
  if (typeof exports === 'string') {
    const path = join(packageDir, exports);
    if (existsSync(path)) return path;
  }
  
  // Handle object exports
  if (typeof exports === 'object') {
    // Try different export conditions in priority order
    const conditions = ['.', 'import', 'require', 'default', 'node', 'types'];
    
    for (const condition of conditions) {
      if (exports[condition]) {
        const resolved = resolvePackageExports(exports[condition], packageDir);
        if (resolved) return resolved;
      }
    }
  }
  
  return null;
}

/**
 * Get Stack Auth SDK version information
 */
async function getSDKVersion() {
  try {
    // Instead of trying to access package.json directly, resolve the main entry point
    const basePath = await resolveModulePath('@stackframe/stack');
    if (!basePath) {
      return null;
    }
    
    // Walk up the directory tree from the resolved module to find package.json
    let currentDir = dirname(basePath);
    let packageJsonPath = null;
    
    // Safety limit to prevent infinite loops
    for (let i = 0; i < 10; i++) {
      const candidatePath = join(currentDir, 'package.json');
      if (existsSync(candidatePath)) {
        packageJsonPath = candidatePath;
        break;
      }
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) break; // Reached filesystem root
      currentDir = parentDir;
    }
    
    if (packageJsonPath) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return {
        version: packageJson.version || 'unknown',
        name: packageJson.name || '@stackframe/stack',
        description: packageJson.description || 'Stack Auth SDK'
      };
    }
    
    // Fallback: return basic info without version if package.json can't be found
    return {
      version: 'unknown',
      name: '@stackframe/stack',
      description: 'Stack Auth SDK'
    };
  } catch (error) {
    console.warn(`⚠️ Could not read Stack Auth SDK version: ${error.message}`);
    // Return fallback info instead of null to avoid breaking the system
    return {
      version: 'unknown',
      name: '@stackframe/stack',
      description: 'Stack Auth SDK'
    };
  }
}

/**
 * Validate extracted types against expected structure
 */
function validateExtractedTypes(extractedProps) {
  const requiredComponents = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
  const validatedProps = {};
  
  for (const componentName of requiredComponents) {
    if (extractedProps[componentName]) {
      const props = extractedProps[componentName];
      
      // Ensure we have at least some props
      if (Object.keys(props).length > 0) {
        validatedProps[componentName] = props;
        console.log(`✅ Validated ${componentName} with ${Object.keys(props).length} props`);
      } else {
        console.warn(`⚠️ ${componentName} has no props, this may indicate extraction issues`);
      }
    } else {
      console.warn(`⚠️ ${componentName} not found in extracted types`);
    }
  }
  
  return validatedProps;
}

export {
  extractComponentProps,
  getSDKVersion,
  validateExtractedTypes,
  createTypeScriptProgram,
  extractInterfaceProperties,
  detectAndParseTypeScriptConfig,
  getFallbackCompilerOptions,
  validateAndEnhanceCompilerOptions
};