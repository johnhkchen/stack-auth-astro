/**
 * Configuration handling for Stack Auth integration
 * 
 * Loads configuration from environment variables and provides
 * validated config object for the integration.
 */

import type { StackAuthConfig } from './types.js';

/**
 * Get Stack Auth configuration from environment variables
 * 
 * @returns Validated Stack Auth configuration
 * @throws Error if required environment variables are missing
 */
export function getConfig(): StackAuthConfig {
  const projectId = process.env.STACK_PROJECT_ID;
  const publishableClientKey = process.env.STACK_PUBLISHABLE_CLIENT_KEY;
  const secretServerKey = process.env.STACK_SECRET_SERVER_KEY;
  const baseUrl = process.env.STACK_BASE_URL;
  const prefix = process.env.STACK_AUTH_PREFIX || '/handler';

  if (!projectId) {
    throw new Error('STACK_PROJECT_ID environment variable is required');
  }

  if (!publishableClientKey) {
    throw new Error('STACK_PUBLISHABLE_CLIENT_KEY environment variable is required');
  }

  if (!secretServerKey) {
    throw new Error('STACK_SECRET_SERVER_KEY environment variable is required');
  }

  return {
    projectId,
    publishableClientKey,
    secretServerKey,
    baseUrl,
    prefix
  };
}

/**
 * Validate that required environment variables are set
 * 
 * @returns true if configuration is valid
 * @throws Error with helpful message if configuration is invalid
 */
export function validateConfig(): boolean {
  try {
    getConfig();
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Stack Auth configuration error: ${error.message}\n\n` +
        'Required environment variables:\n' +
        '- STACK_PROJECT_ID\n' +
        '- STACK_PUBLISHABLE_CLIENT_KEY\n' +
        '- STACK_SECRET_SERVER_KEY\n\n' +
        'Optional environment variables:\n' +
        '- STACK_BASE_URL (defaults to Stack Auth API)\n' +
        '- STACK_AUTH_PREFIX (defaults to /handler)'
      );
    }
    throw error;
  }
}