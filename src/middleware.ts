/**
 * Authentication middleware for Astro
 * 
 * This middleware runs on every request to populate Astro.locals
 * with the current user and session information from Stack Auth.
 * 
 * Note: Actual implementation will be done in Sprint 002
 */

import type { APIContext } from 'astro';

// Basic middleware implementation that allows builds to pass
// The full implementation will be completed in Sprint 002
export async function onRequest(context: APIContext, next: any) {
  // Basic pass-through middleware for build integration testing
  // TODO: Sprint 002 - Implement actual Stack Auth session management
  
  // Set default values for Astro.locals to prevent TypeScript errors
  context.locals.user = null;
  context.locals.session = null;
  
  return await next();
}