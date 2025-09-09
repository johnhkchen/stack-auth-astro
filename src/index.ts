/**
 * Main Astro Stack Auth integration export
 * 
 * This is the primary entry point for the astro-stack-auth integration
 * following the auth-astro community pattern but wrapping Stack Auth.
 */

import type { AstroIntegration } from 'astro';
import type { StackAuthConfig } from './types.js';

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
}

/**
 * Astro Stack Auth integration
 * 
 * Creates an Astro integration that provides Stack Auth authentication
 * with route injection, middleware, and React component support.
 */
export default function astroStackAuth(options: StackAuthOptions = {}): AstroIntegration {
  const {
    prefix = '/handler',
    addReactRenderer = true,
    config = {}
  } = options;

  return {
    name: 'astro-stack-auth',
    hooks: {
      'astro:config:setup': ({ injectRoute, addMiddleware, addRenderer, logger }) => {
        logger.info('Setting up Stack Auth integration');

        // Inject Stack Auth API route handler
        injectRoute({
          pattern: `${prefix}/[...stack]`,
          entrypoint: 'astro-stack-auth/api/handler',
          prerender: false
        });

        // Add authentication middleware
        addMiddleware({
          entrypoint: 'astro-stack-auth/middleware',
          order: 'pre'
        });

        // Optionally add React renderer for Stack Auth UI components
        if (addReactRenderer) {
          addRenderer({
            name: '@astrojs/react',
            clientEntrypoint: '@astrojs/react/client.js',
            serverEntrypoint: '@astrojs/react/server.js'
          });
        }

        logger.info('Stack Auth integration configured successfully');
      }
    }
  };
}

// Re-export types for convenience  
export type { StackAuthConfig } from './types.js';