/**
 * Runtime Component Wrapper for Development-time Prop Validation
 * 
 * This module provides runtime prop validation for Stack Auth components
 * when used in .astro files during development mode.
 * 
 * Sprint: 001
 * Task: 1.2.27 - Add Component Prop Validation Integration with Astro Dev Tools
 */

import * as React from 'react';
import { 
  validateComponentProps, 
  createErrorOverlayIntegration,
  createDevExperience,
  type PropValidationError,
  type PropValidationWarning,
  type DevValidationContext 
} from './dev-tools.js';

/**
 * Development context for component validation
 */
const devContext: DevValidationContext = {
  isDevMode: process.env.NODE_ENV === 'development',
  config: {} as any, // Would be populated by Astro
  logger: console
};

/**
 * Create a wrapped component with prop validation
 */
export function createValidatedComponent<P extends Record<string, any>>(
  componentName: string,
  OriginalComponent: React.ComponentType<P>,
  isDevMode: boolean = process.env.NODE_ENV === 'development'
): React.ComponentType<P> {
  
  if (!isDevMode) {
    // In production, return the original component without validation
    return OriginalComponent;
  }

  // Create wrapped component with validation
  const ValidatedComponent = (props: P) => {
    // Validate props at runtime
    const { errors, warnings } = validateComponentProps(componentName, props, devContext);
    
    // Handle validation errors
    if (errors.length > 0) {
      const errorOverlay = createErrorOverlayIntegration(devContext);
      const devExperience = createDevExperience(devContext);
      
      // Display errors in development
      for (const error of errors) {
        console.error(`🚨 Stack Auth Prop Error in ${componentName}:`, {
          prop: error.prop,
          expected: error.expected,
          received: error.received,
          message: error.message,
          suggestion: error.suggestion,
          quickFixes: devExperience.generateQuickFixSuggestions(error)
        });
        
        // Try to display in error overlay if available
        try {
          errorOverlay.displayPropValidationError(error);
        } catch {
          // Error overlay might not be available in all contexts
        }
      }
    }
    
    // Handle validation warnings
    if (warnings.length > 0) {
      const errorOverlay = createErrorOverlayIntegration(devContext);
      
      for (const warning of warnings) {
        console.warn(`⚠️  Stack Auth Prop Warning in ${componentName}:`, {
          prop: warning.prop,
          message: warning.message,
          suggestion: warning.suggestion
        });
        
        // Try to display in console
        try {
          errorOverlay.displayPropValidationWarning(warning);
        } catch {
          // Console warning might not be available in all contexts
        }
      }
    }
    
    // Render the original component
    return React.createElement(OriginalComponent, props);
  };
  
  ValidatedComponent.displayName = `Validated(${componentName})`;
  
  return ValidatedComponent;
}

/**
 * Enhanced development wrapper with additional debugging info
 */
export function createEnhancedValidatedComponent<P extends Record<string, any>>(
  componentName: string,
  OriginalComponent: React.ComponentType<P>,
  isDevMode: boolean = process.env.NODE_ENV === 'development'
): React.ComponentType<P> {
  
  if (!isDevMode) {
    return OriginalComponent;
  }

  const EnhancedValidatedComponent = (props: P) => {
    // Track component usage for debugging
    React.useEffect(() => {
      if (isDevMode) {
        console.log(`📊 Stack Auth ${componentName} rendered with props:`, {
          propCount: Object.keys(props).length,
          propNames: Object.keys(props),
          timestamp: new Date().toISOString()
        });
      }
    }, []);
    
    // Validate props
    const { errors, warnings } = validateComponentProps(componentName, props, devContext);
    
    // Create development overlay with detailed information
    const createDevOverlay = () => {
      if (!isDevMode || (errors.length === 0 && warnings.length === 0)) {
        return null;
      }
      
      return React.createElement('div', {
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 9999,
          background: errors.length > 0 ? 'rgba(220, 53, 69, 0.9)' : 'rgba(255, 193, 7, 0.9)',
          color: 'white',
          padding: '8px 12px',
          fontSize: '12px',
          fontFamily: 'monospace',
          borderBottom: '2px solid',
          borderColor: errors.length > 0 ? '#dc3545' : '#ffc107'
        }
      }, `Stack Auth ${componentName}: ${errors.length} errors, ${warnings.length} warnings`);
    };
    
    // Enhanced error reporting
    if (errors.length > 0) {
      const devExperience = createDevExperience(devContext);
      
      console.group(`🚨 Stack Auth ${componentName} Validation Errors`);
      for (const error of errors) {
        console.error(`❌ ${error.message}`, {
          prop: error.prop,
          expected: error.expected,
          received: error.received,
          quickFixes: devExperience.generateQuickFixSuggestions(error)
        });
      }
      console.groupEnd();
    }
    
    // Enhanced warning reporting
    if (warnings.length > 0) {
      console.group(`⚠️  Stack Auth ${componentName} Validation Warnings`);
      for (const warning of warnings) {
        console.warn(`⚠️  ${warning.message}`, {
          prop: warning.prop,
          suggestion: warning.suggestion
        });
      }
      console.groupEnd();
    }
    
    // Render with development overlay
    return React.createElement('div', {
      style: { position: 'relative' }
    }, [
      createDevOverlay(),
      React.createElement(OriginalComponent, { ...props, key: 'component' })
    ]);
  };
  
  EnhancedValidatedComponent.displayName = `EnhancedValidated(${componentName})`;
  
  return EnhancedValidatedComponent;
}

/**
 * Create validation wrapper for multiple components
 */
export function createValidatedComponents<T extends Record<string, React.ComponentType<any>>>(
  components: T,
  options: {
    enhanced?: boolean;
    isDevMode?: boolean;
  } = {}
): T {
  const { enhanced = false, isDevMode = process.env.NODE_ENV === 'development' } = options;
  
  const validatedComponents = {} as T;
  
  for (const [componentName, Component] of Object.entries(components)) {
    validatedComponents[componentName as keyof T] = enhanced
      ? createEnhancedValidatedComponent(componentName, Component, isDevMode) as T[keyof T]
      : createValidatedComponent(componentName, Component, isDevMode) as T[keyof T];
  }
  
  return validatedComponents;
}

/**
 * Runtime prop validation hook for use in .astro files
 */
export function useStackAuthPropValidation(
  componentName: string,
  props: Record<string, any>
): {
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: PropValidationError[];
  warnings: PropValidationWarning[];
} {
  const [validationResult, setValidationResult] = React.useState({
    hasErrors: false,
    hasWarnings: false,
    errors: [] as PropValidationError[],
    warnings: [] as PropValidationWarning[]
  });
  
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const { errors, warnings } = validateComponentProps(componentName, props, devContext);
      
      setValidationResult({
        hasErrors: errors.length > 0,
        hasWarnings: warnings.length > 0,
        errors,
        warnings
      });
      
      // Log validation results
      if (errors.length > 0 || warnings.length > 0) {
        console.log(`🔍 Stack Auth ${componentName} validation:`, {
          errors: errors.length,
          warnings: warnings.length,
          props: Object.keys(props)
        });
      }
    }
  }, [componentName, props]);
  
  return validationResult;
}

/**
 * Development-time component inspector
 */
export function StackAuthDevInspector({
  componentName,
  props,
  children
}: {
  componentName: string;
  props: Record<string, any>;
  children: React.ReactNode;
}) {
  const validation = useStackAuthPropValidation(componentName, props);
  
  if (process.env.NODE_ENV !== 'development') {
    return React.createElement(React.Fragment, null, children);
  }
  
  return React.createElement('div', {
    style: {
      position: 'relative',
      border: validation.hasErrors 
        ? '2px solid #dc3545' 
        : validation.hasWarnings 
        ? '2px solid #ffc107' 
        : '1px dashed #28a745',
      borderRadius: '4px',
      padding: validation.hasErrors || validation.hasWarnings ? '4px' : '0'
    }
  }, [
    validation.hasErrors || validation.hasWarnings 
      ? React.createElement('div', {
          key: 'validation-info',
          style: {
            fontSize: '11px',
            color: validation.hasErrors ? '#dc3545' : '#ffc107',
            marginBottom: '4px',
            fontFamily: 'monospace'
          }
        }, `${componentName}: ${validation.errors.length} errors, ${validation.warnings.length} warnings`)
      : null,
    React.createElement('div', { key: 'children' }, children)
  ]);
}

export default {
  createValidatedComponent,
  createEnhancedValidatedComponent,
  createValidatedComponents,
  useStackAuthPropValidation,
  StackAuthDevInspector
};