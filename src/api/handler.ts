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
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log detailed error in development, minimal in production
  if (isDevelopment) {
    console.error(`Stack Auth API proxy error for ${method} ${stackPath}:`, error);
  } else {
    console.error(`Stack Auth API error: ${method} ${stackPath}`);
  }
  
  // Classify the error type for better troubleshooting
  let errorType = 'UNKNOWN_ERROR';
  let specificSteps: string[] = [];
  
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('enotfound')) {
      errorType = 'NETWORK_ERROR';
      specificSteps = [
        '🌐 Check your internet connection',
        '🔍 Verify Stack Auth API is accessible: curl https://api.stack-auth.com/health',
        '🔥 Check if a firewall or proxy is blocking the connection',
        '📋 Stack Auth service status: https://status.stack-auth.com'
      ];
    } else if (errorMessage.includes('timeout') || errorMessage.includes('timedout')) {
      errorType = 'TIMEOUT_ERROR';
      specificSteps = [
        '⏱️ Connection timed out - this could indicate network issues',
        '🌐 Check your internet connection speed',
        '🔄 Try again in a few moments',
        '📋 Check Stack Auth service status: https://status.stack-auth.com'
      ];
    } else if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
      errorType = 'INVALID_REQUEST';
      specificSteps = [
        '🔍 Check that your request data is properly formatted',
        '✅ Verify all required fields are present',
        '📖 Review the Stack Auth API documentation',
        '🔧 If using custom code, check for syntax errors'
      ];
    }
  }
  
  // Check for missing configuration
  if (!process.env.STACK_PROJECT_ID || !process.env.STACK_PUBLISHABLE_CLIENT_KEY || !process.env.STACK_SECRET_SERVER_KEY) {
    errorType = 'MISSING_CONFIGURATION';
    specificSteps = [
      '🔑 Missing required environment variables:',
      !process.env.STACK_PROJECT_ID ? '   ❌ STACK_PROJECT_ID is not set' : '',
      !process.env.STACK_PUBLISHABLE_CLIENT_KEY ? '   ❌ STACK_PUBLISHABLE_CLIENT_KEY is not set' : '',
      !process.env.STACK_SECRET_SERVER_KEY ? '   ❌ STACK_SECRET_SERVER_KEY is not set' : '',
      '',
      '📚 To fix: Add missing variables to your .env file',
      '🔗 Dashboard: https://app.stack-auth.com'
    ].filter(step => step !== '');
  }
  
  // Build response based on environment
  const responseBody = isDevelopment ? {
    error: errorType,
    message: 'Failed to communicate with Stack Auth API',
    endpoint: stackPath,
    method: method,
    timestamp: new Date().toISOString(),
    details: error instanceof Error ? error.message : 'Unknown error',
    troubleshooting: {
      description: `Error type: ${errorType}`,
      steps: specificSteps.length > 0 ? specificSteps : [
        '🔍 Verify your Stack Auth environment variables are correct',
        '🌐 Check your network connection',
        '✅ Ensure Stack Auth service is available',
        '📱 Check the browser console for more details'
      ],
      documentation: 'https://docs.stack-auth.com/troubleshooting'
    }
  } : {
    error: 'SERVICE_UNAVAILABLE',
    message: 'Authentication service temporarily unavailable'
  };
  
  return new Response(
    JSON.stringify(responseBody),
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
    // Get Stack Auth configuration with error handling
    let config;
    try {
      config = getConfig();
    } catch (configError) {
      // Handle missing configuration gracefully
      const isDevelopment = process.env.NODE_ENV === 'development';
      const missingVars = [];
      if (!process.env.STACK_PROJECT_ID) missingVars.push('STACK_PROJECT_ID');
      if (!process.env.STACK_PUBLISHABLE_CLIENT_KEY) missingVars.push('STACK_PUBLISHABLE_CLIENT_KEY'); 
      if (!process.env.STACK_SECRET_SERVER_KEY) missingVars.push('STACK_SECRET_SERVER_KEY');
      
      return new Response(
        JSON.stringify({
          error: 'CONFIGURATION_ERROR',
          message: 'Stack Auth is not configured properly',
          ...(isDevelopment && {
            missingVariables: missingVars,
            troubleshooting: [
              '🔑 Add the missing environment variables to your .env file:',
              ...missingVars.map(v => `   ${v}=your_value_here`),
              '',
              '📚 Get your keys from: https://app.stack-auth.com',
              '🔄 After adding variables, restart your dev server'
            ]
          }),
          ...(!isDevelopment && {
            message: 'Authentication service is not configured. Contact your administrator.'
          })
        }),
        {
          status: 503, // Service Unavailable
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
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