/**
 * Stack Auth API Handler Stub
 * 
 * This is a minimal stub implementation for the Stack Auth API handler.
 * The full implementation will be completed in Sprint 002.
 * 
 * This handler provides the basic structure expected by Astro's route injection
 * and prevents build errors while the core integration is being developed.
 */

import type { APIContext } from 'astro';

/**
 * Generic API handler for all Stack Auth endpoints
 * 
 * This handler will eventually process all Stack Auth API routes including:
 * - /handler/signin
 * - /handler/callback  
 * - /handler/signout
 * - /handler/user
 * - /handler/session
 * - etc.
 */
export const ALL = async (context: APIContext) => {
  const { request, url } = context;
  
  // Extract the Stack Auth specific path from the catch-all route
  const stackPath = url.pathname.replace(/^.*\/handler\//, '');
  
  // TODO: Sprint 002 - Implement actual Stack Auth SDK integration
  // This should delegate to Stack Auth's request handler
  
  return new Response(
    JSON.stringify({
      error: 'Stack Auth API handler not yet implemented',
      message: 'This is a stub implementation. Full Stack Auth integration coming in Sprint 002.',
      path: stackPath,
      method: request.method,
      timestamp: new Date().toISOString()
    }),
    {
      status: 501, // Not Implemented
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );
};

// Export the handler as the default export as well for flexibility
export default ALL;