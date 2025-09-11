/**
 * Configuration handling for Stack Auth integration
 * 
 * Loads configuration from environment variables and provides
 * validated config object for the integration with comprehensive
 * error handling and helpful guidance.
 */

import type { StackAuthConfig, ValidationOptions } from './types.js';
import {
  StackAuthEnvironmentError,
  StackAuthConfigurationError,
  createValidationSummary
} from './errors.js';
import { 
  validateEnvironmentVariables,
  validateConfiguration,
  createMissingConfigHelp,
  type ValidationResult
} from './validation.js';
import { validateStackAuthConnection } from './connection-validation.js';

/**
 * Get Stack Auth configuration from environment variables with comprehensive validation
 * 
 * @returns Validated Stack Auth configuration
 * @throws StackAuthEnvironmentError if required environment variables are missing
 * @throws StackAuthConfigurationError if configuration is invalid
 */
export function getConfig(): StackAuthConfig {
  // First validate environment variables
  const envValidation = validateEnvironmentVariables();
  
  if (!envValidation.isValid) {
    const missingVars = [];
    
    if (!process.env.STACK_PROJECT_ID) missingVars.push('STACK_PROJECT_ID');
    if (!process.env.STACK_PUBLISHABLE_CLIENT_KEY) missingVars.push('STACK_PUBLISHABLE_CLIENT_KEY');
    if (!process.env.STACK_SECRET_SERVER_KEY) missingVars.push('STACK_SECRET_SERVER_KEY');
    
    const helpMessage = createMissingConfigHelp(missingVars);
    const summary = createValidationSummary(envValidation.errors);
    
    throw new StackAuthEnvironmentError(
      `Missing required Stack Auth environment variables\n${summary}\n${helpMessage}`,
      missingVars
    );
  }

  // Extract and validate configuration
  const config: StackAuthConfig = {
    projectId: process.env.STACK_PROJECT_ID!,
    publishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY!,
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
    prefix: process.env.STACK_AUTH_PREFIX || '/handler',
    ...(process.env.STACK_BASE_URL && { baseUrl: process.env.STACK_BASE_URL })
  };

  // Validate the configuration object
  const configValidation = validateConfiguration(config);
  
  if (!configValidation.isValid) {
    const summary = createValidationSummary(configValidation.errors);
    throw new StackAuthConfigurationError(`Invalid Stack Auth configuration\n${summary}`);
  }

  // Log warnings in development
  if (configValidation.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Stack Auth configuration warnings:');
    configValidation.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }

  if (envValidation.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Stack Auth environment warnings:');
    envValidation.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }

  return config;
}

/**
 * Validate that required environment variables are set with detailed error reporting
 * 
 * @returns ValidationResult with detailed error and warning information
 */
export function validateConfig(): ValidationResult {
  return validateEnvironmentVariables();
}

/**
 * Safely get configuration without throwing errors
 * 
 * @returns Configuration object and validation result, or null if invalid
 */
export function tryGetConfig(): { config: StackAuthConfig | null; validation: ValidationResult } {
  try {
    const validation = validateEnvironmentVariables();
    
    if (!validation.isValid) {
      return { config: null, validation };
    }

    const config: StackAuthConfig = {
      projectId: process.env.STACK_PROJECT_ID!,
      publishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY!,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
      prefix: process.env.STACK_AUTH_PREFIX || '/handler',
      ...(process.env.STACK_BASE_URL && { baseUrl: process.env.STACK_BASE_URL })
    };

    const configValidation = validateConfiguration(config);
    
    return {
      config: configValidation.isValid ? config : null,
      validation: {
        isValid: validation.isValid && configValidation.isValid,
        errors: [...validation.errors, ...configValidation.errors],
        warnings: [...validation.warnings, ...configValidation.warnings]
      }
    };
  } catch (error) {
    return {
      config: null,
      validation: {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown configuration error'],
        warnings: []
      }
    };
  }
}

/**
 * Check if the current environment has valid Stack Auth configuration
 * 
 * @returns true if configuration is valid and ready to use
 */
export function hasValidConfig(): boolean {
  const { config } = tryGetConfig();
  return config !== null;
}

/**
 * Get Stack Auth configuration with optional connection validation
 * 
 * @param options Validation options including connection testing
 * @returns Validated Stack Auth configuration
 * @throws StackAuthEnvironmentError if required environment variables are missing
 * @throws StackAuthConfigurationError if configuration is invalid
 */
export async function getConfigWithValidation(options: ValidationOptions = {}): Promise<StackAuthConfig> {
  // Get basic config first
  const config = getConfig();

  // Skip connection validation if explicitly disabled
  if (options.validateConnection === false) {
    return config;
  }

  try {
    // Validate connection if requested
    if (options.validateConnection === true) {
      const connectionResult = await validateStackAuthConnection(config, options);
      
      if (!connectionResult.isValid) {
        const summary = createValidationSummary(connectionResult.errors);
        throw new StackAuthConfigurationError(
          `Stack Auth connection validation failed\n${summary}\n\nConnection issues detected:\n${connectionResult.errors.map(e => `  • ${e}`).join('\n')}`
        );
      }

      // Log warnings in development
      if (connectionResult.warnings.length > 0 && options.developmentMode !== false && process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Stack Auth connection warnings:');
        connectionResult.warnings.forEach(warning => console.warn(`  • ${warning}`));
      }

      // Log connection success in development
      if (options.developmentMode !== false && process.env.NODE_ENV === 'development') {
        console.log(`✅ Stack Auth connection validated (${connectionResult.responseTime}ms)`);
      }
    }

    return config;
  } catch (error) {
    if (error instanceof StackAuthConfigurationError || error instanceof StackAuthEnvironmentError) {
      throw error;
    }
    
    throw new StackAuthConfigurationError(
      `Stack Auth connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate configuration with optional connection testing
 * 
 * @param options Validation options including connection testing
 * @returns Enhanced validation result including connection status
 */
export async function validateConfigWithConnection(options: ValidationOptions = {}): Promise<ValidationResult & { connectionValid?: boolean }> {
  const baseValidation = validateConfig();
  
  if (!baseValidation.isValid || options.validateConnection === false) {
    return baseValidation;
  }

  try {
    const config = {
      projectId: process.env.STACK_PROJECT_ID!,
      publishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY!,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
      prefix: process.env.STACK_AUTH_PREFIX || '/handler',
      ...(process.env.STACK_BASE_URL && { baseUrl: process.env.STACK_BASE_URL })
    };

    const connectionResult = await validateStackAuthConnection(config, options);
    
    return {
      ...baseValidation,
      errors: [...baseValidation.errors, ...connectionResult.errors],
      warnings: [...baseValidation.warnings, ...connectionResult.warnings],
      connectionValid: connectionResult.isValid
    };
  } catch (error) {
    return {
      ...baseValidation,
      errors: [...baseValidation.errors, `Connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      connectionValid: false
    };
  }
}

/**
 * Safely get configuration with optional connection validation
 * 
 * @param options Validation options
 * @returns Configuration object and validation result, or null if invalid
 */
export async function tryGetConfigWithValidation(options: ValidationOptions = {}): Promise<{ 
  config: StackAuthConfig | null; 
  validation: ValidationResult & { connectionValid?: boolean } 
}> {
  try {
    const validation = await validateConfigWithConnection(options);
    
    if (!validation.isValid) {
      return { config: null, validation };
    }

    const config: StackAuthConfig = {
      projectId: process.env.STACK_PROJECT_ID!,
      publishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY!,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
      prefix: process.env.STACK_AUTH_PREFIX || '/handler',
      ...(process.env.STACK_BASE_URL && { baseUrl: process.env.STACK_BASE_URL })
    };

    return {
      config: validation.isValid && (validation.connectionValid !== false) ? config : null,
      validation
    };
  } catch (error) {
    return {
      config: null,
      validation: {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown configuration error'],
        warnings: [],
        connectionValid: false
      }
    };
  }
}

/**
 * Get configuration summary for debugging and development
 * 
 * @returns Configuration summary with sensitive data redacted
 */
export function getConfigSummary(): Record<string, string | boolean> {
  const summary: Record<string, string | boolean> = {
    hasProjectId: !!process.env.STACK_PROJECT_ID,
    hasPublishableKey: !!process.env.STACK_PUBLISHABLE_CLIENT_KEY,
    hasSecretKey: !!process.env.STACK_SECRET_SERVER_KEY,
    hasBaseUrl: !!process.env.STACK_BASE_URL,
    prefix: process.env.STACK_AUTH_PREFIX || '/handler'
  };

  // Add redacted values for debugging (first 8 chars + '...')
  if (process.env.STACK_PROJECT_ID) {
    summary.projectIdPreview = process.env.STACK_PROJECT_ID.slice(0, 8) + '...';
  }

  if (process.env.STACK_PUBLISHABLE_CLIENT_KEY) {
    summary.publishableKeyPreview = process.env.STACK_PUBLISHABLE_CLIENT_KEY.slice(0, 8) + '...';
  }

  if (process.env.STACK_SECRET_SERVER_KEY) {
    summary.secretKeyPreview = process.env.STACK_SECRET_SERVER_KEY.slice(0, 8) + '...';
  }

  return summary;
}