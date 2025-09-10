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
 * Create TypeScript program with proper module resolution
 */
function createTypeScriptProgram(entry) {
  const configPath = ts.findConfigFile(
    process.cwd(),
    ts.sys.fileExists,
    'tsconfig.json'
  );
  
  let compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    declaration: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
  };

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      dirname(configPath)
    );
    compilerOptions = { ...compilerOptions, ...parsed.options };
  }

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

  const program = ts.createProgram({
    rootNames: [entry],
    options: compilerOptions,
    host: {
      ...ts.createCompilerHost(compilerOptions),
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
    
    // Get the source file
    const sourceFile = program.getSourceFile(virtualEntry);
    if (!sourceFile) {
      throw new Error('Could not create virtual source file');
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
  extractInterfaceProperties
};