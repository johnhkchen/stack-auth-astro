/**
 * Comprehensive validation utilities for Stack Auth integration
 * 
 * Provides environment validation, configuration checking, and runtime
 * compatibility validation with helpful error messages.
 */

import type { StackAuthConfig, StackAuthOptions } from './types.js';
import {
  StackAuthConfigurationError,
  StackAuthEnvironmentError,
  StackAuthCompatibilityError,
  ERROR_MESSAGES,
  createErrorWithGuide,
  createValidationSummary
} from './errors.js';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Environment variable validation
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (!process.env.STACK_PROJECT_ID) {
    errors.push('STACK_PROJECT_ID is required');
  }

  if (!process.env.STACK_PUBLISHABLE_CLIENT_KEY) {
    errors.push('STACK_PUBLISHABLE_CLIENT_KEY is required');
  }

  if (!process.env.STACK_SECRET_SERVER_KEY) {
    errors.push('STACK_SECRET_SERVER_KEY is required');
  }

  // Check optional but recommended variables
  if (!process.env.STACK_BASE_URL) {
    warnings.push('STACK_BASE_URL not set, using Stack Auth default API endpoint');
  }

  // Check cache configuration variables (optional)
  if (process.env.STACK_AUTH_CACHE_SIZE && isNaN(parseInt(process.env.STACK_AUTH_CACHE_SIZE))) {
    warnings.push('STACK_AUTH_CACHE_SIZE should be a numeric value');
  }

  if (process.env.STACK_AUTH_CACHE_TTL && isNaN(parseInt(process.env.STACK_AUTH_CACHE_TTL))) {
    warnings.push('STACK_AUTH_CACHE_TTL should be a numeric value (milliseconds)');
  }

  // Validate environment variable formats
  if (process.env.STACK_PROJECT_ID && !isValidProjectId(process.env.STACK_PROJECT_ID)) {
    errors.push('STACK_PROJECT_ID format appears invalid (should be a UUID or similar identifier)');
  }

  if (process.env.STACK_PUBLISHABLE_CLIENT_KEY && !isValidPublishableKey(process.env.STACK_PUBLISHABLE_CLIENT_KEY)) {
    warnings.push('STACK_PUBLISHABLE_CLIENT_KEY format may be invalid');
  }

  if (process.env.STACK_SECRET_SERVER_KEY && !isValidSecretKey(process.env.STACK_SECRET_SERVER_KEY)) {
    warnings.push('STACK_SECRET_SERVER_KEY format may be invalid');
  }

  // Check for common mistakes
  if (process.env.STACK_SECRET_SERVER_KEY && process.env.STACK_SECRET_SERVER_KEY.includes('sk_live_') && 
      process.env.NODE_ENV === 'development') {
    warnings.push('Using live secret key in development environment - consider using test keys');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Configuration object validation
 */
export function validateConfiguration(config: Partial<StackAuthConfig>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.projectId) {
    errors.push('projectId is required');
  }

  if (!config.publishableClientKey) {
    errors.push('publishableClientKey is required');
  }

  if (!config.secretServerKey) {
    errors.push('secretServerKey is required');
  }

  // Validate field formats
  if (config.projectId && !isValidProjectId(config.projectId)) {
    errors.push('projectId format appears invalid');
  }

  if (config.publishableClientKey && !isValidPublishableKey(config.publishableClientKey)) {
    warnings.push('publishableClientKey format may be invalid');
  }

  if (config.secretServerKey && !isValidSecretKey(config.secretServerKey)) {
    warnings.push('secretServerKey format may be invalid');
  }

  // Validate base URL if provided
  if (config.baseUrl && !isValidUrl(config.baseUrl)) {
    errors.push('baseUrl must be a valid URL');
  }

  // Validate prefix if provided
  if (config.prefix && !isValidPrefix(config.prefix)) {
    errors.push('prefix must start with "/" and contain only valid URL characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Stack Auth options validation
 */
export function validateStackAuthOptions(options: StackAuthOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate prefix
  if (options.prefix !== undefined && !isValidPrefix(options.prefix)) {
    errors.push('prefix must start with "/" and contain only valid URL characters');
  }

  // Validate boolean options
  if (options.addReactRenderer !== undefined && typeof options.addReactRenderer !== 'boolean') {
    errors.push('addReactRenderer must be a boolean');
  }

  if (options.injectRoutes !== undefined && typeof options.injectRoutes !== 'boolean') {
    errors.push('injectRoutes must be a boolean');
  }

  if (options.addMiddleware !== undefined && typeof options.addMiddleware !== 'boolean') {
    errors.push('addMiddleware must be a boolean');
  }

  // Validate the options as a config-like object
  if (options.projectId || options.publishableClientKey || options.secretServerKey) {
    const configValidation = validateConfiguration(options);
    errors.push(...configValidation.errors);
    warnings.push(...configValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Runtime compatibility checks
 */
export function validateRuntimeCompatibility(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersionString = nodeVersion.slice(1).split('.')[0];
    const majorVersion = parseInt(majorVersionString || '0');
    
    if (majorVersion < 18) {
      errors.push(`Node.js ${majorVersion} is not supported. Please upgrade to Node.js 18 or higher.`);
    }

    // Check if we're in a supported environment
    if (typeof process === 'undefined') {
      errors.push('Stack Auth server-side functionality requires Node.js environment');
    }

    // Check for Astro environment (this is a heuristic check)
    if (typeof globalThis !== 'undefined' && !(globalThis as any).astro && process.env.NODE_ENV !== 'test') {
      warnings.push('Could not detect Astro environment - ensure this integration is used with Astro');
    }

    // Check for potential conflicts with other auth libraries
    const potentialConflicts = [
      '@auth/astro',
      'next-auth', 
      '@supabase/auth-helpers-nextjs',
      'firebase/auth'
    ];

    // This is a basic check - in a real implementation you'd check package.json
    for (const conflict of potentialConflicts) {
      try {
        require.resolve(conflict);
        warnings.push(`Detected ${conflict} - ensure there are no conflicts with Stack Auth`);
      } catch {
        // Package not installed, which is fine
      }
    }

  } catch (error) {
    warnings.push('Could not perform complete runtime compatibility check');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive validation that checks everything
 */
export function validateComplete(options?: StackAuthOptions): ValidationResult {
  const envValidation = validateEnvironmentVariables();
  const runtimeValidation = validateRuntimeCompatibility();
  
  let optionsValidation: ValidationResult = { isValid: true, errors: [], warnings: [] };
  if (options) {
    optionsValidation = validateStackAuthOptions(options);
  }

  const allErrors = [
    ...envValidation.errors,
    ...runtimeValidation.errors,
    ...optionsValidation.errors
  ];

  const allWarnings = [
    ...envValidation.warnings,
    ...runtimeValidation.warnings,
    ...optionsValidation.warnings
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Throws detailed error with helpful guidance if validation fails
 */
export function validateAndThrow(options?: StackAuthOptions): void {
  const validation = validateComplete(options);
  
  if (!validation.isValid) {
    const summary = createValidationSummary(validation.errors);
    throw new StackAuthConfigurationError(summary);
  }

  // Log warnings in development
  if (validation.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Stack Auth warnings:');
    validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
}

/**
 * Format validation helpers
 */
function isValidProjectId(projectId: string): boolean {
  // Basic UUID or identifier pattern - Stack Auth may have specific formats
  return /^[a-zA-Z0-9_-]{8,}$/.test(projectId);
}

function isValidPublishableKey(key: string): boolean {
  // Publishable keys typically have a specific prefix
  return key.length > 20 && (key.startsWith('pk_') || key.includes('_'));
}

function isValidSecretKey(key: string): boolean {
  // Secret keys typically have a specific prefix and should never be empty
  return key.length > 20 && (key.startsWith('sk_') || key.includes('_'));
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidPrefix(prefix: string): boolean {
  // Must start with "/" and contain only valid URL path characters
  return /^\/[a-zA-Z0-9_/-]*$/.test(prefix);
}

/**
 * Dependency validation options
 */
export interface DependencyValidationOptions {
  /** Skip validation for development/testing */
  skipValidation?: boolean;
  /** Whether route injection is enabled */
  injectRoutes?: boolean;
  /** Whether middleware registration is enabled */
  addMiddleware?: boolean;
}

/**
 * Critical dependency validation
 */
export function validateCriticalDependencies(options: DependencyValidationOptions = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (options.skipValidation) {
    return {
      isValid: true,
      errors: [],
      warnings: ['⚠️  Dependency validation skipped - ensure all required files exist']
    };
  }

  // Check API handler when route injection is enabled
  if (options.injectRoutes !== false) { // Default is true
    try {
      const path = require('path');
      const fs = require('fs');
      
      // Try multiple possible paths for the handler
      const possiblePaths = [
        path.resolve(__dirname, './api/handler.js'),
        path.resolve(__dirname, './api/handler.ts'),
        path.resolve(process.cwd(), 'src/api/handler.ts'),
        path.resolve(process.cwd(), 'src/api/handler.js')
      ];
      
      let handlerContent = '';
      let foundHandler = false;
      
      for (const handlerPath of possiblePaths) {
        try {
          if (fs.existsSync(handlerPath)) {
            handlerContent = fs.readFileSync(handlerPath, 'utf8');
            foundHandler = true;
            break;
          }
        } catch {}
      }
      
      if (!foundHandler) {
        errors.push(ERROR_MESSAGES.MISSING_API_HANDLER);
      } else {
        // Check if it's just a stub implementation
        if (handlerContent.includes('stub implementation') || handlerContent.includes('Not Implemented')) {
          warnings.push(ERROR_MESSAGES.STUB_IMPLEMENTATION_WARNING);
        }
      }
    } catch (error) {
      errors.push(ERROR_MESSAGES.MISSING_API_HANDLER);
    }
  }

  // Check middleware when middleware registration is enabled  
  if (options.addMiddleware !== false) { // Default is true
    try {
      const path = require('path');
      const fs = require('fs');
      
      // Try multiple possible paths for the middleware
      const possiblePaths = [
        path.resolve(__dirname, './middleware.js'),
        path.resolve(__dirname, './middleware.ts'),
        path.resolve(process.cwd(), 'src/middleware.ts'),
        path.resolve(process.cwd(), 'src/middleware.js')
      ];
      
      let middlewareContent = '';
      let foundMiddleware = false;
      
      for (const middlewarePath of possiblePaths) {
        try {
          if (fs.existsSync(middlewarePath)) {
            middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
            foundMiddleware = true;
            break;
          }
        } catch {}
      }
      
      if (!foundMiddleware) {
        errors.push(ERROR_MESSAGES.MISSING_MIDDLEWARE);
      } else {
        // Check if middleware is empty or stub
        if (middlewareContent.includes('export default {}') || 
            middlewareContent.length < 100 ||
            middlewareContent.includes('TODO: Sprint 002') ||
            middlewareContent.includes('stub mode') ||
            middlewareContent.includes('Sprint 002 Task 2.2')) {
          warnings.push(ERROR_MESSAGES.STUB_IMPLEMENTATION_WARNING);
        }
      }
    } catch (error) {
      errors.push(ERROR_MESSAGES.MISSING_MIDDLEWARE);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Enhanced complete validation that includes dependency validation
 */
export function validateCompleteWithDependencies(options?: StackAuthOptions): ValidationResult {
  const baseValidation = validateComplete(options);
  
  const dependencyValidation = validateCriticalDependencies({
    skipValidation: options?.skipValidation ?? false,
    injectRoutes: options?.injectRoutes !== false,
    addMiddleware: options?.addMiddleware !== false // Middleware defaults to enabled but can be disabled
  });

  const allErrors = [
    ...baseValidation.errors,
    ...dependencyValidation.errors
  ];

  const allWarnings = [
    ...baseValidation.warnings,
    ...dependencyValidation.warnings
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Throws detailed error with helpful guidance if validation fails including dependencies
 */
export function validateAndThrowWithDependencies(options?: StackAuthOptions): void {
  const validation = validateCompleteWithDependencies(options);
  
  if (!validation.isValid) {
    const summary = createValidationSummary(validation.errors);
    throw new StackAuthConfigurationError(summary);
  }

  // Log warnings in development
  if (validation.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Stack Auth warnings:');
    validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
}

/**
 * Development mode helpers
 */
export function createSetupGuide(): string {
  return ERROR_MESSAGES.DEVELOPMENT_SETUP_GUIDE;
}

export function createMissingConfigHelp(missingVars: string[]): string {
  const guides = [];

  if (missingVars.includes('STACK_PROJECT_ID')) {
    guides.push(ERROR_MESSAGES.MISSING_PROJECT_ID);
  }

  if (missingVars.includes('STACK_PUBLISHABLE_CLIENT_KEY')) {
    guides.push(ERROR_MESSAGES.MISSING_PUBLISHABLE_KEY);
  }

  if (missingVars.includes('STACK_SECRET_SERVER_KEY')) {
    guides.push(ERROR_MESSAGES.MISSING_SECRET_KEY);
  }

  return guides.join('\n\n');
}