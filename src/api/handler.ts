/**
 * Stack Auth API Handler
 * 
 * This handler proxies API requests to Stack Auth's backend service.
 * It handles all HTTP methods and forwards requests with proper authentication
 * headers, cookies, and CORS handling.
 * 
 * Endpoints handled:
 * - /handler/signin - Sign in flows
 * - /handler/signup - Sign up flows  
 * - /handler/callback - OAuth callbacks
 * - /handler/signout - Sign out
 * - /handler/user - User info
 * - /handler/session - Session management
 * - /handler/me - Current user data
 * - And all other Stack Auth API endpoints
 */

import type { APIContext } from 'astro';
import { getConfig } from '../config.js';

/**
 * Stack Auth API base URL - the official hosted service
 * This is where we proxy all requests to
 */
const STACK_AUTH_API_BASE = 'https://api.stack-auth.com';

/**
 * Headers that should be forwarded from client to Stack Auth API
 */
const FORWARDED_HEADERS = [
  'authorization',
  'content-type',
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'x-requested-with',
  'x-forwarded-for',
  'x-real-ip',
  'x-stack-project-id',
  'x-stack-publishable-client-key'
];

/**
 * Headers that should be forwarded from Stack Auth API back to client
 */
const RESPONSE_HEADERS = [
  'content-type',
  'cache-control',
  'set-cookie',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'location',
  'vary'
];

/**
 * Create the Stack Auth API URL for proxying requests
 */
function createApiUrl(context: APIContext): string {
  const { url } = context;
  
  // Extract the path after /handler/
  const stackPath = url.pathname.replace(/^.*\/handler\//, '');
  
  // Build the full Stack Auth API URL
  const apiUrl = `${STACK_AUTH_API_BASE}/api/v1/${stackPath}`;
  
  // Add query parameters if present
  if (url.search) {
    return `${apiUrl}${url.search}`;
  }
  
  return apiUrl;
}

/**
 * Forward headers from the incoming request to Stack Auth API
 */
function forwardRequestHeaders(request: Request, config: ReturnType<typeof getConfig>): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Forward allowed headers from the request
  FORWARDED_HEADERS.forEach(headerName => {
    const value = request.headers.get(headerName);
    if (value) {
      headers[headerName] = value;
    }
  });
  
  // Add Stack Auth configuration headers
  headers['x-stack-project-id'] = config.projectId;
  headers['x-stack-publishable-client-key'] = config.publishableClientKey;
  headers['x-stack-secret-server-key'] = config.secretServerKey;
  
  // Add custom base URL if configured
  if (config.baseUrl) {
    headers['x-stack-base-url'] = config.baseUrl;
  }
  
  return headers;
}

/**
 * Forward headers from Stack Auth API response back to client
 */
function forwardResponseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  
  RESPONSE_HEADERS.forEach(headerName => {
    const value = response.headers.get(headerName);
    if (value) {
      headers[headerName] = value;
    }
  });
  
  return headers;
}

/**
 * Handle errors during API proxying with helpful debugging info
 */
function handleProxyError(error: unknown, context: APIContext): Response {
  const { url, request } = context;
  const method = request.method;
  const stackPath = url.pathname.replace(/^.*\/handler\//, '');
  
  console.error(`Stack Auth API proxy error for ${method} ${stackPath}:`, error);
  
  // Return user-friendly error response
  return new Response(
    JSON.stringify({
      error: 'Proxy Error',
      message: 'Failed to communicate with Stack Auth API',
      details: {
        path: stackPath,
        method: method,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      troubleshooting: {
        description: 'This error occurred while proxying to Stack Auth API',
        steps: [
          'Verify your Stack Auth environment variables are correct',
          'Check your network connection',
          'Ensure Stack Auth service is available',
          'Check the browser console for more details'
        ],
        documentation: 'https://docs.stack-auth.com/troubleshooting'
      }
    }),
    {
      status: 502, // Bad Gateway
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  );
}

/**
 * Main proxy handler that forwards requests to Stack Auth API
 */
async function proxyToStackAuth(context: APIContext): Promise<Response> {
  try {
    // Get Stack Auth configuration
    const config = getConfig();
    
    // Create the target API URL
    const apiUrl = createApiUrl(context);
    
    // Get request body if present
    const { request } = context;
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
    
    // Forward the request to Stack Auth API
    const response = await fetch(apiUrl, {
      method: request.method,
      headers: forwardRequestHeaders(request, config),
      body,
      // Don't follow redirects - let the client handle them
      redirect: 'manual'
    });
    
    // Forward the response back to client
    const responseBody = await response.text();
    const responseHeaders = forwardResponseHeaders(response);
    
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    return handleProxyError(error, context);
  }
}

/**
 * Handle GET requests to Stack Auth endpoints
 * Used for: signin pages, user info, session checks, OAuth callbacks
 */
export const GET = async (context: APIContext): Promise<Response> => {
  return proxyToStackAuth(context);
};

/**
 * Handle POST requests to Stack Auth endpoints  
 * Used for: authentication submissions, user creation, password resets
 */
export const POST = async (context: APIContext): Promise<Response> => {
  return proxyToStackAuth(context);
};

/**
 * Handle PUT requests to Stack Auth endpoints
 * Used for: user profile updates, settings changes
 */
export const PUT = async (context: APIContext): Promise<Response> => {
  return proxyToStackAuth(context);
};

/**
 * Handle PATCH requests to Stack Auth endpoints
 * Used for: partial user updates, preference changes
 */
export const PATCH = async (context: APIContext): Promise<Response> => {
  return proxyToStackAuth(context);
};

/**
 * Handle DELETE requests to Stack Auth endpoints
 * Used for: account deletion, session termination, data cleanup
 */
export const DELETE = async (context: APIContext): Promise<Response> => {
  return proxyToStackAuth(context);
};

/**
 * Handle OPTIONS requests for CORS preflight
 * Required for browser-based requests to Stack Auth endpoints
 */
export const OPTIONS = async (context: APIContext): Promise<Response> => {
  // For OPTIONS requests, we need to handle CORS preflight
  const { request } = context;
  
  // Get CORS headers from the request
  const origin = request.headers.get('origin');
  const requestHeaders = request.headers.get('access-control-request-headers');
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': requestHeaders || 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'Origin'
  };
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
};