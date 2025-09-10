/**
 * Astro Development Tools Integration for Component Prop Validation
 * 
 * This module integrates Stack Auth component prop validation with Astro's
 * development server, error overlay, and build process to provide real-time
 * feedback during development.
 * 
 * Sprint: 001
 * Task: 1.2.27 - Add Component Prop Validation Integration with Astro Dev Tools
 */

import type { AstroIntegration } from 'astro';

// Component prop validation schema from generate-prop-docs.js
const COMPONENT_PROP_SPECS = {
  SignIn: {
    onSuccess: { type: 'function', required: false },
    onError: { type: 'function', required: false },
    redirectTo: { type: 'string', required: false },
    providers: { type: 'array', required: false },
    showTerms: { type: 'boolean', required: false },
    termsUrl: { type: 'string', required: false },
    privacyUrl: { type: 'string', required: false },
    style: { type: 'object', required: false },
    className: { type: 'string', required: false },
    fullPage: { type: 'boolean', required: false }
  },
  SignUp: {
    onSuccess: { type: 'function', required: false },
    onError: { type: 'function', required: false },
    redirectTo: { type: 'string', required: false },
    providers: { type: 'array', required: false },
    showTerms: { type: 'boolean', required: false },
    termsUrl: { type: 'string', required: false },
    privacyUrl: { type: 'string', required: false },
    style: { type: 'object', required: false },
    className: { type: 'string', required: false },
    fullPage: { type: 'boolean', required: false }
  },
  UserButton: {
    showDisplayName: { type: 'boolean', required: false },
    showAvatar: { type: 'boolean', required: false },
    colorModeToggle: { type: 'boolean', required: false },
    showSignOutButton: { type: 'boolean', required: false },
    onSignOut: { type: 'function', required: false },
    style: { type: 'object', required: false },
    className: { type: 'string', required: false }
  },
  AccountSettings: {
    onUpdateSuccess: { type: 'function', required: false },
    onUpdateError: { type: 'function', required: false },
    onDeleteAccount: { type: 'function', required: false },
    showProfile: { type: 'boolean', required: false },
    showSecurity: { type: 'boolean', required: false },
    showPreferences: { type: 'boolean', required: false },
    style: { type: 'object', required: false },
    className: { type: 'string', required: false },
    fullPage: { type: 'boolean', required: false }
  },
  StackProvider: {
    projectId: { type: 'string', required: true },
    publishableClientKey: { type: 'string', required: true },
    children: { type: 'react-node', required: true },
    baseUrl: { type: 'string', required: false },
    lang: { type: 'string', required: false },
    theme: { type: 'string', required: false }
  }
} as const;

/**
 * Version compatibility data for deprecation warnings
 */
const VERSION_COMPATIBILITY = {
  SignIn: {
    '2.8.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri'],
      deprecated: []
    },
    '3.0.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme', 'customization'],
      deprecated: ['onError']
    }
  }
} as const;

/**
 * Prop validation error types
 */
export interface PropValidationError {
  component: string;
  prop: string;
  received: any;
  expected: string;
  message: string;
  suggestion?: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Prop validation warning types
 */
export interface PropValidationWarning {
  component: string;
  prop: string;
  message: string;
  suggestion?: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Development context for prop validation
 */
export interface DevValidationContext {
  isDevMode: boolean;
  config: any; // Generic config object
  logger: any;
  errorOverlay?: any;
}

/**
 * Validate a single prop value against its specification
 */
export function validateProp(
  componentName: string, 
  propName: string, 
  propValue: any,
  context?: DevValidationContext
): PropValidationError | null {
  const componentSpec = (COMPONENT_PROP_SPECS as any)[componentName];
  if (!componentSpec) {
    return null; // Unknown component, skip validation
  }

  const propSpec = componentSpec[propName];
  if (!propSpec) {
    // Unknown prop warning
    if (context?.isDevMode) {
      return {
        component: componentName,
        prop: propName,
        received: propValue,
        expected: 'unknown',
        message: `Unknown prop "${propName}" for ${componentName} component`,
        suggestion: `Did you mean: ${suggestSimilarProp(propName, Object.keys(componentSpec))}?`
      };
    }
    return null;
  }

  // Check required props
  if (propSpec.required && (propValue === undefined || propValue === null)) {
    return {
      component: componentName,
      prop: propName,
      received: propValue,
      expected: propSpec.type,
      message: `Required prop "${propName}" is missing for ${componentName} component`,
      suggestion: `Add the ${propName} prop with type ${propSpec.type}`
    };
  }

  // Check prop type
  if (propValue !== undefined && propValue !== null) {
    const isValidType = validatePropType(propValue, propSpec.type);
    if (!isValidType) {
      return {
        component: componentName,
        prop: propName,
        received: typeof propValue,
        expected: propSpec.type,
        message: `Invalid type for prop "${propName}" in ${componentName} component. Expected ${propSpec.type}, got ${typeof propValue}`,
        suggestion: getTypeSuggestion(propSpec.type, propValue)
      };
    }
  }

  return null;
}

/**
 * Validate all props for a component
 */
export function validateComponentProps(
  componentName: string,
  props: Record<string, any>,
  context?: DevValidationContext
): { errors: PropValidationError[], warnings: PropValidationWarning[] } {
  const errors: PropValidationError[] = [];
  const warnings: PropValidationWarning[] = [];

  const componentSpec = (COMPONENT_PROP_SPECS as any)[componentName];
  if (!componentSpec) {
    return { errors, warnings };
  }

  // Validate each provided prop
  for (const [propName, propValue] of Object.entries(props)) {
    const error = validateProp(componentName, propName, propValue, context);
    if (error) {
      errors.push(error);
    }
  }

  // Check for missing required props
  for (const [propName, propSpec] of Object.entries(componentSpec)) {
    const spec = propSpec as any;
    if (spec.required && !(propName in props)) {
      errors.push({
        component: componentName,
        prop: propName,
        received: undefined,
        expected: spec.type,
        message: `Required prop "${propName}" is missing for ${componentName} component`,
        suggestion: `Add the ${propName} prop with type ${spec.type}`
      });
    }
  }

  // Check for deprecated props
  const deprecationWarning = checkDeprecatedProps(componentName, props);
  if (deprecationWarning) {
    warnings.push(deprecationWarning);
  }

  return { errors, warnings };
}

/**
 * Validate prop type
 */
function validatePropType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'function':
      return typeof value === 'function';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'react-node':
      return true; // React nodes can be various types
    default:
      return true; // Unknown type, assume valid
  }
}

/**
 * Suggest similar prop name for typos
 */
function suggestSimilarProp(propName: string, validProps: string[]): string {
  // Simple suggestion based on string similarity
  const suggestions = validProps.filter(validProp => 
    validProp.toLowerCase().includes(propName.toLowerCase()) ||
    propName.toLowerCase().includes(validProp.toLowerCase())
  );
  
  if (suggestions.length > 0) {
    return suggestions[0];
  }
  
  return validProps[0] || 'valid prop';
}

/**
 * Get type conversion suggestion
 */
function getTypeSuggestion(expectedType: string, receivedValue: any): string {
  const receivedType = typeof receivedValue;
  
  switch (expectedType) {
    case 'string':
      if (receivedType === 'number') {
        return `Convert to string: "${receivedValue}"`;
      }
      if (receivedType === 'boolean') {
        return `Convert to string: "${receivedValue.toString()}"`;
      }
      return `Wrap in quotes: "${receivedValue}"`;
    case 'boolean':
      if (receivedType === 'string') {
        return `Use boolean value: ${receivedValue.toLowerCase() === 'true'}`;
      }
      return `Use boolean: true or false`;
    case 'function':
      return 'Provide a function: () => { /* your code */ }';
    case 'array':
      return 'Use array syntax: [item1, item2]';
    case 'object':
      return 'Use object syntax: { key: value }';
    default:
      return `Convert to ${expectedType}`;
  }
}

/**
 * Check for deprecated props
 */
function checkDeprecatedProps(componentName: string, props: Record<string, any>): PropValidationWarning | null {
  const compatibility = (VERSION_COMPATIBILITY as any)[componentName];
  if (!compatibility) return null;

  const deprecatedProps = new Set<string>();
  
  // Collect all deprecated props across versions
  for (const versionData of Object.values(compatibility)) {
    const data = versionData as any;
    if (data.deprecated) {
      data.deprecated.forEach((prop: string) => deprecatedProps.add(prop));
    }
  }

  // Find any deprecated props being used
  for (const propName of Object.keys(props)) {
    if (deprecatedProps.has(propName)) {
      return {
        component: componentName,
        prop: propName,
        message: `Prop "${propName}" is deprecated in ${componentName} component`,
        suggestion: `Check the migration guide for alternatives. This prop may be removed in future versions.`
      };
    }
  }

  return null;
}

/**
 * Development middleware for real-time prop validation
 */
export function createDevValidationMiddleware(context: DevValidationContext) {
  return async (req: Request, next: Function) => {
    // Only run in development mode
    if (!context.isDevMode) {
      return next();
    }

    // Hook into component rendering pipeline
    // This would be integrated with Astro's component rendering system
    const response = await next();
    
    // In a real implementation, this would intercept component props
    // during server-side rendering and validate them
    
    return response;
  };
}

/**
 * Create error overlay integration
 */
export function createErrorOverlayIntegration(context: DevValidationContext) {
  return {
    displayPropValidationError(error: PropValidationError) {
      if (!context.isDevMode || !context.errorOverlay) {
        return;
      }

      const errorMessage = formatErrorForOverlay(error);
      context.errorOverlay.show(errorMessage);
    },

    displayPropValidationWarning(warning: PropValidationWarning) {
      if (!context.isDevMode || !context.logger) {
        return;
      }

      const warningMessage = formatWarningForConsole(warning);
      context.logger.warn(warningMessage);
    }
  };
}

/**
 * Format error for Astro's error overlay
 */
function formatErrorForOverlay(error: PropValidationError): string {
  return `
Stack Auth Component Prop Error

Component: ${error.component}
Prop: ${error.prop}
Expected: ${error.expected}
Received: ${error.received}

${error.message}

${error.suggestion ? `💡 Suggestion: ${error.suggestion}` : ''}

${error.location ? `📍 Location: ${error.location.file}:${error.location.line}:${error.location.column}` : ''}
`.trim();
}

/**
 * Format warning for console
 */
function formatWarningForConsole(warning: PropValidationWarning): string {
  return `⚠️  Stack Auth: ${warning.message}${warning.suggestion ? ` (${warning.suggestion})` : ''}`;
}

/**
 * Build-time validation integration
 */
export function createBuildValidation(context: DevValidationContext) {
  return {
    async validateBuildProps(componentUsages: Array<{ component: string, props: Record<string, any>, location?: any }>) {
      const allErrors: PropValidationError[] = [];
      const allWarnings: PropValidationWarning[] = [];

      for (const usage of componentUsages) {
        const { errors, warnings } = validateComponentProps(usage.component, usage.props, context);
        
        // Add location information if available
        const errorsWithLocation = errors.map(error => ({
          ...error,
          location: usage.location
        }));
        
        const warningsWithLocation = warnings.map(warning => ({
          ...warning,
          location: usage.location
        }));

        allErrors.push(...errorsWithLocation);
        allWarnings.push(...warningsWithLocation);
      }

      // Report errors and warnings
      if (allErrors.length > 0) {
        context.logger?.error('❌ Stack Auth component prop validation failed:');
        for (const error of allErrors) {
          context.logger?.error(`   ${formatErrorForOverlay(error)}`);
        }
      }

      if (allWarnings.length > 0) {
        context.logger?.warn('⚠️  Stack Auth component prop warnings:');
        for (const warning of allWarnings) {
          context.logger?.warn(`   ${formatWarningForConsole(warning)}`);
        }
      }

      return {
        hasErrors: allErrors.length > 0,
        hasWarnings: allWarnings.length > 0,
        errors: allErrors,
        warnings: allWarnings
      };
    }
  };
}

/**
 * Development experience enhancements
 */
export function createDevExperience(context: DevValidationContext) {
  return {
    generatePropAutocompletion() {
      // Generate autocompletion data for IDEs
      return Object.entries(COMPONENT_PROP_SPECS).map(([componentName, props]) => ({
        component: componentName,
        props: Object.entries(props).map(([propName, spec]) => ({
          name: propName,
          type: spec.type,
          required: spec.required,
          description: getComponentPropDescription(componentName, propName)
        }))
      }));
    },

    createValidationSummary() {
      // Create validation summary for development console
      const componentCount = Object.keys(COMPONENT_PROP_SPECS).length;
      const totalProps = Object.values(COMPONENT_PROP_SPECS)
        .reduce((sum, specs) => sum + Object.keys(specs).length, 0);
      
      return {
        componentCount,
        totalProps,
        validatedComponents: Object.keys(COMPONENT_PROP_SPECS),
        lastUpdated: new Date().toISOString()
      };
    },

    generateQuickFixSuggestions(error: PropValidationError) {
      const quickFixes: string[] = [];

      if (error.expected === 'string' && typeof error.received === 'number') {
        quickFixes.push(`Convert to string: ${error.prop}="${error.received}"`);
      }
      
      if (error.expected === 'boolean' && typeof error.received === 'string') {
        quickFixes.push(`Convert to boolean: ${error.prop}={${error.received === 'true'}}`);
      }

      if (error.message.includes('Required prop') && error.received === undefined) {
        quickFixes.push(`Add required prop: ${error.prop}={/* ${error.expected} value */}`);
      }

      return quickFixes;
    }
  };
}

/**
 * Get description for component prop (would come from documentation)
 */
function getComponentPropDescription(componentName: string, propName: string): string {
  // This would ideally come from the documentation generator
  const descriptions: Record<string, Record<string, string>> = {
    SignIn: {
      onSuccess: 'Callback function called on successful authentication',
      onError: 'Callback function called when authentication fails',
      redirectTo: 'URL to redirect to after successful authentication',
      providers: 'Array of authentication providers to display'
    },
    UserButton: {
      showDisplayName: 'Whether to display the user\'s name next to the avatar',
      showAvatar: 'Whether to display the user\'s avatar image'
    }
  };

  return descriptions[componentName]?.[propName] || `${propName} prop for ${componentName} component`;
}

/**
 * Export type definitions and constants for external use
 */
export { COMPONENT_PROP_SPECS, VERSION_COMPATIBILITY };