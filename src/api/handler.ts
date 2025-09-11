/**
 * Stack Auth API Handler Stub
 * 
 * This is a stub implementation that provides helpful setup guidance and prevents 
 * 404 errors when Stack Auth routes are accessed before full implementation.
 * 
 * Returns 501 Not Implemented for all methods with guidance on setting up 
 * the complete Stack Auth integration.
 */

import type { APIContext } from 'astro';

/**
 * Creates a consistent 501 Not Implemented response for all HTTP methods
 */
const createStubResponse = (context: APIContext) => {
  const { request, url } = context;
  const stackPath = url.pathname.replace(/^.*\/handler\//, '');
  const method = request.method;

  return new Response(
    JSON.stringify({
      error: 'Not Implemented',
      message: `Stack Auth integration is not yet fully implemented`,
      details: {
        path: stackPath,
        method: method,
        timestamp: new Date().toISOString(),
        status: 'stub_implementation'
      },
      setup_guidance: {
        description: 'This is a stub handler preventing 404 errors during development',
        next_steps: [
          'Complete Sprint 002 Task 2.3 for full API handler implementation',
          'Configure Stack Auth environment variables',
          'Set up your Stack Auth project dashboard'
        ],
        documentation: 'https://docs.stackauth.com/',
        progress_tracking: 'https://github.com/johnhkchen/stack-auth-astro/issues/53',
        expected_endpoints: [
          '/handler/signin',
          '/handler/callback',
          '/handler/signout', 
          '/handler/user',
          '/handler/session'
        ]
      },
      environment_check: {
        required_variables: [
          'STACK_PROJECT_ID',
          'STACK_PUBLISHABLE_CLIENT_KEY', 
          'STACK_SECRET_SERVER_KEY'
        ],
        note: 'These will be validated in the full implementation'
      }
    }),
    {
      status: 501, // Not Implemented
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  );
};

/**
 * Handle GET requests to Stack Auth endpoints
 * Used for: signin pages, user info, session checks
 */
export const GET = async (context: APIContext) => {
  return createStubResponse(context);
};

/**
 * Handle POST requests to Stack Auth endpoints  
 * Used for: authentication submissions, user updates
 */
export const POST = async (context: APIContext) => {
  return createStubResponse(context);
};

/**
 * Handle PUT requests to Stack Auth endpoints
 * Used for: user profile updates, settings changes
 */
export const PUT = async (context: APIContext) => {
  return createStubResponse(context);
};

/**
 * Handle DELETE requests to Stack Auth endpoints
 * Used for: account deletion, session termination
 */
export const DELETE = async (context: APIContext) => {
  return createStubResponse(context);
};