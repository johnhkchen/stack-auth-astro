/**
 * Version Compatibility Testing for Stack Auth SDK
 * 
 * This module provides utilities to test component and function compatibility
 * across different versions of the Stack Auth SDK (@stackframe/stack and @stackframe/stack-ui).
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Supported Stack Auth SDK version ranges for compatibility testing
 */
export const SUPPORTED_STACK_VERSIONS = {
  // Current version used in development
  current: '2.8.36',
  
  // Minimum supported version
  minimum: '2.8.0',
  
  // Version ranges to test
  ranges: [
    '2.8.x',
    '2.9.x',
    '3.0.x' // Future compatibility planning
  ]
} as const;

/**
 * Component APIs that may change between Stack Auth versions
 */
export const COMPONENT_API_COMPATIBILITY = {
  'SignIn': {
    '2.8.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri'],
      methods: [],
      deprecated: []
    },
    '2.9.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme'],
      methods: [],
      deprecated: []
    },
    '3.0.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme', 'customization'],
      methods: [],
      deprecated: ['onError'] // Hypothetical future deprecation
    }
  },
  'SignUp': {
    '2.8.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri'],
      methods: [],
      deprecated: []
    }
  },
  'UserButton': {
    '2.8.x': {
      props: ['className', 'style', 'showDisplayName', 'showEmail'],
      methods: [],
      deprecated: []
    }
  },
  'AccountSettings': {
    '2.8.x': {
      props: ['className', 'style', 'sections'],
      methods: [],
      deprecated: []
    }
  },
  'StackProvider': {
    '2.8.x': {
      props: ['app', 'children'],
      methods: [],
      deprecated: []
    }
  }
} as const;

/**
 * Server function APIs that may change between Stack Auth versions
 */
export const SERVER_API_COMPATIBILITY = {
  'getUser': {
    '2.8.x': {
      signature: '(context: APIContext) => Promise<User | null>',
      parameters: ['context'],
      returnType: 'Promise<User | null>',
      deprecated: false
    }
  },
  'getSession': {
    '2.8.x': {
      signature: '(context: APIContext) => Promise<Session | null>',
      parameters: ['context'],
      returnType: 'Promise<Session | null>',
      deprecated: false
    }
  },
  'requireAuth': {
    '2.8.x': {
      signature: '(context: APIContext, options?: RequireAuthOptions) => Promise<User>',
      parameters: ['context', 'options?'],
      returnType: 'Promise<User>',
      deprecated: false
    }
  }
} as const;

/**
 * Get the currently installed Stack Auth version
 */
export async function getCurrentStackVersion(): Promise<string | null> {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    
    // Check dependencies first, then devDependencies
    const stackVersion = 
      packageJson.dependencies?.['@stackframe/stack'] ||
      packageJson.devDependencies?.['@stackframe/stack'];
    
    if (stackVersion) {
      // Remove version prefix characters (^, ~, etc.)
      return stackVersion.replace(/^[\^~>=<]/, '');
    }
    
    return null;
  } catch (error) {
    console.warn('Could not determine Stack Auth version:', error);
    return null;
  }
}

/**
 * Check if a component API is compatible with a specific version
 */
export function isComponentCompatible(
  componentName: keyof typeof COMPONENT_API_COMPATIBILITY,
  version: string,
  propName?: string
): {
  isCompatible: boolean;
  isDeprecated: boolean;
  availableProps: string[];
  deprecatedProps: string[];
} {
  const versionRange = getVersionRange(version);
  const componentApi = COMPONENT_API_COMPATIBILITY[componentName];
  
  if (!componentApi) {
    return {
      isCompatible: false,
      isDeprecated: false,
      availableProps: [],
      deprecatedProps: []
    };
  }
  
  const apiForVersion = componentApi[versionRange as keyof typeof componentApi] || componentApi['2.8.x'];
  
  if (!apiForVersion) {
    return {
      isCompatible: false,
      isDeprecated: false,
      availableProps: [],
      deprecatedProps: []
    };
  }
  
  const isCompatible = propName ? apiForVersion.props.includes(propName) : true;
  const isDeprecated = propName ? apiForVersion.deprecated.includes(propName) : false;
  
  return {
    isCompatible,
    isDeprecated,
    availableProps: apiForVersion.props,
    deprecatedProps: apiForVersion.deprecated
  };
}

/**
 * Check if a server function API is compatible with a specific version
 */
export function isServerFunctionCompatible(
  functionName: keyof typeof SERVER_API_COMPATIBILITY,
  version: string
): {
  isCompatible: boolean;
  isDeprecated: boolean;
  signature: string;
  parameters: string[];
  returnType: string;
} {
  const versionRange = getVersionRange(version);
  const functionApi = SERVER_API_COMPATIBILITY[functionName];
  
  if (!functionApi) {
    return {
      isCompatible: false,
      isDeprecated: false,
      signature: '',
      parameters: [],
      returnType: 'unknown'
    };
  }
  
  const apiForVersion = functionApi[versionRange as keyof typeof functionApi] || functionApi['2.8.x'];
  
  return {
    isCompatible: true,
    isDeprecated: apiForVersion.deprecated,
    signature: apiForVersion.signature,
    parameters: apiForVersion.parameters,
    returnType: apiForVersion.returnType
  };
}

/**
 * Get version range (2.8.x, 2.9.x, etc.) from specific version
 */
function getVersionRange(version: string): string {
  const [major, minor] = version.split('.');
  return `${major}.${minor}.x`;
}

/**
 * Validate component usage against Stack Auth version compatibility
 */
export async function validateVersionCompatibility(
  imports: Array<{ specifiers: string[]; source: string; line: number }>
): Promise<{
  currentVersion: string | null;
  compatibilityIssues: Array<{
    line: number;
    component: string;
    issue: string;
    severity: 'error' | 'warning' | 'deprecated';
  }>;
  summary: {
    totalChecks: number;
    errors: number;
    warnings: number;
    deprecated: number;
  };
}> {
  const currentVersion = await getCurrentStackVersion();
  const compatibilityIssues: Array<{
    line: number;
    component: string;
    issue: string;
    severity: 'error' | 'warning' | 'deprecated';
  }> = [];

  let totalChecks = 0;
  let errors = 0;
  let warnings = 0;
  let deprecated = 0;

  for (const importStatement of imports) {
    if (importStatement.source === 'astro-stack-auth/components') {
      for (const specifier of importStatement.specifiers) {
        totalChecks++;
        
        if (specifier in COMPONENT_API_COMPATIBILITY) {
          const compatibility = isComponentCompatible(
            specifier as keyof typeof COMPONENT_API_COMPATIBILITY,
            currentVersion || SUPPORTED_STACK_VERSIONS.current
          );
          
          if (!compatibility.isCompatible) {
            compatibilityIssues.push({
              line: importStatement.line,
              component: specifier,
              issue: `Component ${specifier} is not compatible with Stack Auth version ${currentVersion}`,
              severity: 'error'
            });
            errors++;
          } else if (compatibility.deprecatedProps.length > 0) {
            compatibilityIssues.push({
              line: importStatement.line,
              component: specifier,
              issue: `Component ${specifier} has deprecated props: ${compatibility.deprecatedProps.join(', ')}`,
              severity: 'deprecated'
            });
            deprecated++;
          }
        } else {
          compatibilityIssues.push({
            line: importStatement.line,
            component: specifier,
            issue: `Unknown component ${specifier} - compatibility cannot be verified`,
            severity: 'warning'
          });
          warnings++;
        }
      }
    }
    
    if (importStatement.source === 'astro-stack-auth/server') {
      for (const specifier of importStatement.specifiers) {
        totalChecks++;
        
        if (specifier in SERVER_API_COMPATIBILITY) {
          const compatibility = isServerFunctionCompatible(
            specifier as keyof typeof SERVER_API_COMPATIBILITY,
            currentVersion || SUPPORTED_STACK_VERSIONS.current
          );
          
          if (!compatibility.isCompatible) {
            compatibilityIssues.push({
              line: importStatement.line,
              component: specifier,
              issue: `Server function ${specifier} is not compatible with Stack Auth version ${currentVersion}`,
              severity: 'error'
            });
            errors++;
          } else if (compatibility.isDeprecated) {
            compatibilityIssues.push({
              line: importStatement.line,
              component: specifier,
              issue: `Server function ${specifier} is deprecated in Stack Auth version ${currentVersion}`,
              severity: 'deprecated'
            });
            deprecated++;
          }
        } else {
          compatibilityIssues.push({
            line: importStatement.line,
            component: specifier,
            issue: `Unknown server function ${specifier} - compatibility cannot be verified`,
            severity: 'warning'
          });
          warnings++;
        }
      }
    }
  }

  return {
    currentVersion,
    compatibilityIssues,
    summary: {
      totalChecks,
      errors,
      warnings,
      deprecated
    }
  };
}

/**
 * Check if current Stack Auth version meets minimum requirements
 */
export async function checkMinimumVersionRequirement(): Promise<{
  meets: boolean;
  current: string | null;
  minimum: string;
  recommendation?: string;
}> {
  const currentVersion = await getCurrentStackVersion();
  
  if (!currentVersion) {
    return {
      meets: false,
      current: null,
      minimum: SUPPORTED_STACK_VERSIONS.minimum,
      recommendation: 'Install Stack Auth SDK: npm install @stackframe/stack @stackframe/stack-ui'
    };
  }
  
  const meets = compareVersions(currentVersion, SUPPORTED_STACK_VERSIONS.minimum) >= 0;
  
  return {
    meets,
    current: currentVersion,
    minimum: SUPPORTED_STACK_VERSIONS.minimum,
    recommendation: meets ? undefined : `Upgrade to Stack Auth ${SUPPORTED_STACK_VERSIONS.minimum} or later`
  };
}

/**
 * Simple version comparison (major.minor.patch)
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(x => parseInt(x, 10));
  const bParts = b.split('.').map(x => parseInt(x, 10));
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;
    
    if (aPart < bPart) return -1;
    if (aPart > bPart) return 1;
  }
  
  return 0;
}

/**
 * Generate a compatibility report for documentation
 */
export function generateCompatibilityReport(
  compatibilityResults: Awaited<ReturnType<typeof validateVersionCompatibility>>
): string {
  const { currentVersion, compatibilityIssues, summary } = compatibilityResults;
  
  let report = `# Stack Auth Version Compatibility Report\n\n`;
  report += `**Current Version:** ${currentVersion || 'Unknown'}\n`;
  report += `**Minimum Required:** ${SUPPORTED_STACK_VERSIONS.minimum}\n\n`;
  
  report += `## Summary\n`;
  report += `- Total checks: ${summary.totalChecks}\n`;
  report += `- Errors: ${summary.errors}\n`;
  report += `- Warnings: ${summary.warnings}\n`;
  report += `- Deprecated: ${summary.deprecated}\n\n`;
  
  if (compatibilityIssues.length > 0) {
    report += `## Issues Found\n\n`;
    
    for (const issue of compatibilityIssues) {
      const emoji = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : '⚡';
      report += `${emoji} **Line ${issue.line}**: ${issue.issue}\n`;
    }
  } else {
    report += `✅ No compatibility issues found!\n`;
  }
  
  return report;
}