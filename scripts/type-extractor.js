#!/usr/bin/env node

/**
 * TypeScript Type Extraction System
 * 
 * Uses the TypeScript Compiler API to extract prop interfaces from
 * @stackframe/stack-ui components at build time for dynamic documentation generation.
 */

import * as ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

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
    import type { 
      SignIn as SignInComponent,
      SignUp as SignUpComponent, 
      UserButton as UserButtonComponent,
      AccountSettings as AccountSettingsComponent,
      StackProvider as StackProviderComponent
    } from '@stackframe/stack-ui';
    
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
 * Extract component props from @stackframe/stack-ui
 */
function extractComponentProps() {
  console.log('🔍 Extracting component props from @stackframe/stack-ui...');
  
  try {
    // Check if @stackframe/stack-ui is available
    const stackUIPath = resolveModulePath('@stackframe/stack-ui');
    if (!stackUIPath) {
      console.warn('⚠️ @stackframe/stack-ui not found, falling back to static types');
      return null;
    }
    
    // Create virtual entry file path
    const virtualEntry = join(process.cwd(), '__virtual_type_extraction__.ts');
    
    // Create TypeScript program
    const program = createTypeScriptProgram(virtualEntry);
    const checker = program.getTypeChecker();
    
    // Get the source file with enhanced diagnostics
    const sourceFile = program.getSourceFile(virtualEntry);
    if (!sourceFile) {
      console.error('❌ Failed to create virtual source file');
      console.error(`   Virtual entry path: ${virtualEntry}`);
      console.error(`   Program root names: ${program.getRootFileNames().join(', ')}`);
      
      // Check for compilation errors
      const syntacticDiagnostics = program.getSyntacticDiagnostics();
      const semanticDiagnostics = program.getSemanticDiagnostics();
      
      if (syntacticDiagnostics.length > 0) {
        console.error('❌ Syntactic diagnostics:');
        syntacticDiagnostics.forEach(diagnostic => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          console.error(`   ${message}`);
        });
      }
      
      if (semanticDiagnostics.length > 0) {
        console.error('❌ Semantic diagnostics:');
        semanticDiagnostics.forEach(diagnostic => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          console.error(`   ${message}`);
        });
      }
      
      // Check if @stackframe/stack-ui types are available
      try {
        const stackUIPath = require.resolve('@stackframe/stack-ui');
        console.error(`   @stackframe/stack-ui resolved to: ${stackUIPath}`);
      } catch (error) {
        console.error(`   @stackframe/stack-ui resolution failed: ${error.message}`);
      }
      
      throw new Error('Could not create virtual source file - check diagnostics above');
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
    console.warn(`⚠️ Type extraction failed: ${error.message}`);
    console.warn('Falling back to static prop specifications');
    return null;
  }
}

/**
 * Resolve module path in node_modules
 */
function resolveModulePath(moduleName) {
  try {
    return require.resolve(moduleName);
  } catch (error) {
    // Try alternative resolution paths
    const possiblePaths = [
      join(process.cwd(), 'node_modules', moduleName),
      join(process.cwd(), 'node_modules', moduleName, 'package.json'),
      join(__dirname, '..', 'node_modules', moduleName)
    ];
    
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }
    
    return null;
  }
}

/**
 * Get Stack Auth SDK version information
 */
function getSDKVersion() {
  try {
    const packagePath = resolveModulePath('@stackframe/stack-ui/package.json');
    if (!packagePath) {
      return null;
    }
    
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return {
      version: packageJson.version,
      name: packageJson.name,
      description: packageJson.description
    };
  } catch (error) {
    console.warn(`⚠️ Could not read Stack Auth SDK version: ${error.message}`);
    return null;
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