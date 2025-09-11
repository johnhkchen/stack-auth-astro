/**
 * Authentication middleware for Astro
 * 
 * This middleware runs on every request to populate Astro.locals
 * with the current user and session information from Stack Auth.
 * 
 * This is a validation stub that ensures proper configuration and 
 * provides helpful setup guidance before full implementation.
 */

import type { APIContext } from 'astro';
import { tryGetConfig } from './config.js';
import { createSetupGuide } from './validation.js';
import { 
  StackAuthEnvironmentError, 
  StackAuthConfigurationError,
  createErrorWithGuide 
} from './errors.js';

/**
 * Stack Auth middleware stub with configuration validation
 * 
 * This validates the Stack Auth setup and provides helpful error messages
 * if configuration is invalid. Full session management will be implemented
 * in Sprint 002 Task 2.2.
 */
export async function onRequest(context: APIContext, next: any) {
  try {
    // Validate Stack Auth configuration
    const { config, validation } = tryGetConfig(); // eslint-disable-line @typescript-eslint/no-unused-vars
    
    if (!validation.isValid) {
      // In development, provide detailed error guidance
      if (process.env.NODE_ENV === 'development') {
        const setupGuide = createSetupGuide();
        const errorMessage = createErrorWithGuide(
          'Stack Auth Configuration Invalid',
          `Missing or invalid configuration:\n${validation.errors.join('\n')}`,
          [
            'Check your environment variables are set correctly',
            'Ensure STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY, and STACK_SECRET_SERVER_KEY are defined',
            'Refer to the setup guide below'
          ]
        );
        
        console.error(`❌ ${errorMessage}\n\n${setupGuide}`);
        
        // Set locals to null with helpful development context
        context.locals.user = null;
        context.locals.session = null;
        
        // Add debugging context in development
        if (context.url.searchParams.has('debug-auth')) {
          console.log('🔍 Stack Auth Debug Info:', {
            hasProjectId: !!process.env.STACK_PROJECT_ID,
            hasPublishableKey: !!process.env.STACK_PUBLISHABLE_CLIENT_KEY,
            hasSecretKey: !!process.env.STACK_SECRET_SERVER_KEY,
            validationErrors: validation.errors,
            validationWarnings: validation.warnings
          });
        }
      } else {
        // In production, log errors but don't expose configuration details
        console.error('❌ Stack Auth configuration invalid - authentication disabled');
        context.locals.user = null;
        context.locals.session = null;
      }
    } else {
      // Configuration is valid - show development warnings
      if (process.env.NODE_ENV === 'development') {
        // Log warnings if any
        if (validation.warnings.length > 0) {
          console.warn('⚠️  Stack Auth configuration warnings:');
          validation.warnings.forEach(warning => 
            console.warn(`   • ${warning}`)
          );
        }
        
        // Warn about stub implementation
        if (!context.url.pathname.startsWith('/handler/')) {
          console.warn('🚧 Stack Auth middleware is running in stub mode');
          console.warn('   Full session management will be available in Sprint 002');
          console.warn('   Currently setting user and session to null');
        }
      }
      
      // TODO: Sprint 002 Task 2.2 - Implement actual Stack Auth session management
      // For now, set defaults with proper typing
      context.locals.user = null;
      context.locals.session = null;
    }
    
    // Continue with request processing
    return await next();
    
  } catch (error) {
    // Handle unexpected errors gracefully
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Stack Auth middleware error:', error);
      
      // Provide helpful debugging information
      if (error instanceof StackAuthEnvironmentError) {
        console.error('Environment configuration issue:', error.missingVariables);
      } else if (error instanceof StackAuthConfigurationError) {
        console.error('Configuration validation failed');
      }
    } else {
      console.error('❌ Stack Auth middleware encountered an error - authentication disabled');
    }
    
    // Ensure locals are set even on error
    context.locals.user = null;
    context.locals.session = null;
    
    // Continue processing - don't let middleware errors break the application
    return await next();
  }
}