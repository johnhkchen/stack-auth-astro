/**
 * Basic Astro Stack Auth Integration Stub
 * 
 * This provides the foundational integration structure and lifecycle hooks
 * required for Sprint 002 core integration development.
 * 
 * Sprint: 001
 * Task: 1.5 - Basic Integration Stub Implementation
 */

import type { AstroIntegration } from 'astro';

/**
 * Basic options interface for Stack Auth integration configuration
 */
export interface BasicStackAuthOptions {
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
   * Whether to inject API routes
   * @default true
   */
  injectRoutes?: boolean;

  /**
   * Whether to add authentication middleware
   * @default true
   */
  addMiddleware?: boolean;

  /**
   * Skip validation in development (not recommended)
   * @default false
   */
  skipValidation?: boolean;
}

/**
 * Basic environment variable validation
 */
function validateBasicEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.STACK_PROJECT_ID) {
    errors.push('STACK_PROJECT_ID environment variable is required');
  }
  
  if (!process.env.STACK_PUBLISHABLE_CLIENT_KEY) {
    errors.push('STACK_PUBLISHABLE_CLIENT_KEY environment variable is required');
  }
  
  if (!process.env.STACK_SECRET_SERVER_KEY) {
    errors.push('STACK_SECRET_SERVER_KEY environment variable is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Basic Astro Stack Auth Integration Stub
 * 
 * Provides foundational integration structure for Stack Auth authentication
 * with basic validation and error handling. This is a minimal implementation
 * that establishes the integration API pattern for Sprint 002 development.
 */
export function createBasicStackAuthIntegration(
  options: BasicStackAuthOptions = {}
): AstroIntegration {
  const {
    prefix = '/handler',
    addReactRenderer = true,
    injectRoutes = true,
    addMiddleware = true,
    skipValidation = false
  } = options;

  return {
    name: 'astro-stack-auth-basic',
    hooks: {
      'astro:config:setup': ({ injectRoute, addMiddleware: addAstroMiddleware, addRenderer, logger }) => {
        try {
          logger.info('🔐 Setting up basic Stack Auth integration...');

          // Basic environment variable validation unless skipped
          if (!skipValidation) {
            const validation = validateBasicEnvironment();
            if (!validation.isValid) {
              const errorMessage = [
                'Stack Auth configuration is invalid or missing:',
                ...validation.errors,
                '',
                'Required environment variables:',
                '  - STACK_PROJECT_ID',
                '  - STACK_PUBLISHABLE_CLIENT_KEY', 
                '  - STACK_SECRET_SERVER_KEY',
                '',
                'Please set these variables in your .env file or environment.'
              ].join('\n');
              
              throw new Error(errorMessage);
            }
            logger.info('✅ Environment variables validated');
          } else {
            logger.warn('⚠️  Validation skipped - ensure configuration is valid');
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
          }

          // Inject Stack Auth API route handler if requested
          if (injectRoutes) {
            const routePattern = `${prefix}/[...stack]`;
            injectRoute({
              pattern: routePattern,
              entrypoint: 'astro-stack-auth/api/handler',
              prerender: false
            });
            logger.info(`✅ Injected Stack Auth routes at ${routePattern}`);
          }

          // Add authentication middleware if requested
          if (addMiddleware) {
            addAstroMiddleware({
              entrypoint: 'astro-stack-auth/middleware',
              order: 'pre'
            });
            logger.info('✅ Added Stack Auth middleware');
          }

          logger.info('🎉 Basic Stack Auth integration configured successfully');

        } catch (error) {
          if (error instanceof Error) {
            logger.error(`❌ Stack Auth integration setup failed: ${error.message}`);
            throw error;
          }
          
          logger.error('❌ Unknown error during Stack Auth integration setup');
          throw error;
        }
      }
    }
  };
}

/**
 * Default export - basic integration factory function
 */
export default function basicStackAuth(options?: BasicStackAuthOptions): AstroIntegration {
  return createBasicStackAuthIntegration(options);
}