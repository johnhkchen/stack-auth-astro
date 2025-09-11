/**
 * Main Astro Stack Auth integration export
 * 
 * This is the primary entry point for the astro-stack-auth integration
 * following the auth-astro community pattern but wrapping Stack Auth
 * with comprehensive validation and error handling.
 */

import type { AstroIntegration } from 'astro';
import type { StackAuthConfig } from './types.js';
import { 
  validateAndThrow,
  validateRuntimeCompatibility,
  validateStackAuthOptions,
  createSetupGuide
} from './validation.js';
import {
  StackAuthIntegrationError,
  StackAuthCompatibilityError,
  ERROR_MESSAGES,
  createErrorWithGuide
} from './errors.js';
import { hasValidConfig, getConfigSummary } from './config.js';
import { 
  createDevValidationMiddleware, 
  createErrorOverlayIntegration,
  createDevExperience,
  type DevValidationContext 
} from './dev-tools.js';

export interface StackAuthOptions {
  /**
   * Custom prefix for auth endpoints
   * @default '/handler'
   */
  prefix?: string;
  
  /**
   * Whether to automatically add React renderer
   * @default true
   */
  addReactRenderer?: boolean;

  /**
   * Stack Auth configuration
   */
  config?: Partial<StackAuthConfig>;

  /**
   * Skip validation in development (not recommended)
   * @default false
   */
  skipValidation?: boolean;

  /**
   * Enable development tools integration for component prop validation
   * @default true in development, false in production
   */
  enableDevTools?: boolean;
}

/**
 * Astro Stack Auth integration
 * 
 * Creates an Astro integration that provides Stack Auth authentication
 * with route injection, middleware, and React component support.
 * Includes comprehensive validation and error handling.
 */
export default function astroStackAuth(options: StackAuthOptions = {}): AstroIntegration {
  const {
    prefix = '/handler',
    addReactRenderer = true,
    config = {},
    skipValidation = false,
    enableDevTools = process.env.NODE_ENV === 'development'
  } = options;

  return {
    name: 'astro-stack-auth',
    hooks: {
      'astro:config:setup': ({ injectRoute, addMiddleware, addRenderer, logger }) => {
        try {
          logger.info('🔐 Setting up Stack Auth integration...');

          // Validate options first
          const optionsValidation = validateStackAuthOptions(options);
          if (!optionsValidation.isValid) {
            throw new StackAuthIntegrationError(
              `Invalid Stack Auth options: ${optionsValidation.errors.join(', ')}`
            );
          }

          // Runtime compatibility checks
          const runtimeValidation = validateRuntimeCompatibility();
          if (!runtimeValidation.isValid) {
            const errors = runtimeValidation.errors.join('\n');
            throw new StackAuthCompatibilityError(
              `Runtime compatibility issues detected:\n${errors}`
            );
          }

          // Warn about runtime warnings
          if (runtimeValidation.warnings.length > 0) {
            runtimeValidation.warnings.forEach(warning => {
              logger.warn(`⚠️  ${warning}`);
            });
          }

          // Validate configuration unless explicitly skipped
          if (!skipValidation) {
            if (!hasValidConfig()) {
              const setupGuide = createSetupGuide();
              throw new StackAuthIntegrationError(
                `Stack Auth configuration is invalid or missing.\n\n${setupGuide}`
              );
            }

            // Validate complete setup
            try {
              validateAndThrow(options);
            } catch (error) {
              if (error instanceof Error) {
                throw new StackAuthIntegrationError(
                  `Configuration validation failed:\n${error.message}`
                );
              }
              throw error;
            }
          } else if (process.env.NODE_ENV === 'development') {
            logger.warn('⚠️  Stack Auth validation skipped - ensure configuration is valid');
          }

          // Add React renderer for Stack Auth UI components if requested
          if (addReactRenderer) {
            try {
              addRenderer({
                name: '@astrojs/react',
                clientEntrypoint: '@astrojs/react/client.js',
                serverEntrypoint: '@astrojs/react/server.js'
              });
              logger.info('✅ Added React renderer for Stack Auth UI components');
            } catch (error) {
              // React renderer might already be configured
              logger.warn('⚠️  Could not add React renderer - it may already be configured');
            }
          } else {
            logger.warn('⚠️  React renderer disabled - Stack Auth UI components will not work');
          }

          // Inject Stack Auth API route handler
          const routePattern = `${prefix}/[...stack]`;
          injectRoute({
            pattern: routePattern,
            entrypoint: 'astro-stack-auth/api/handler',
            prerender: false
          });
          logger.info(`✅ Injected Stack Auth routes at ${routePattern}`);

          // Add authentication middleware
          addMiddleware({
            entrypoint: 'astro-stack-auth/middleware',
            order: 'pre'
          });
          logger.info('✅ Added Stack Auth middleware');

          // Development tools integration
          if (enableDevTools && process.env.NODE_ENV === 'development') {
            const devContext: DevValidationContext = {
              isDevMode: true,
              config: {}, // This would be passed from Astro
              logger
            };

            // Initialize dev tools
            const errorOverlay = createErrorOverlayIntegration(devContext);
            const devExperience = createDevExperience(devContext);

            // Log dev tools initialization
            logger.info('🛠️  Stack Auth dev tools enabled');
            
            const validationSummary = devExperience.createValidationSummary();
            logger.info(`📊 Validating ${validationSummary.componentCount} components with ${validationSummary.totalProps} total props`);
            
            // Generate autocompletion data for IDEs
            const autocompletionData = devExperience.generatePropAutocompletion();
            logger.info(`💡 Generated prop autocompletion for ${autocompletionData.length} components`);
          }

          // Development mode debugging info
          if (process.env.NODE_ENV === 'development') {
            const configSummary = getConfigSummary();
            logger.info('📋 Stack Auth configuration summary:');
            Object.entries(configSummary).forEach(([key, value]) => {
              logger.info(`   ${key}: ${value}`);
            });
          }

          logger.info('🎉 Stack Auth integration configured successfully');

        } catch (error) {
          // Enhanced error reporting
          if (error instanceof StackAuthIntegrationError || 
              error instanceof StackAuthCompatibilityError) {
            logger.error(`❌ ${error.message}`);
            throw error;
          }

          if (error instanceof Error) {
            const enhancedError = createErrorWithGuide(
              'Stack Auth Integration Failed',
              error.message,
              [
                'Check your environment variables are correctly set',
                'Ensure you have the latest version of Astro and Stack Auth',
                'Review the Stack Auth documentation',
                'Check for conflicting authentication integrations'
              ]
            );
            logger.error(enhancedError);
            throw new StackAuthIntegrationError(enhancedError);
          }

          logger.error('❌ Unknown error during Stack Auth integration setup');
          throw error;
        }
      }
    }
  };
}

// Re-export types for convenience  
export type { StackAuthConfig } from './types.js';
