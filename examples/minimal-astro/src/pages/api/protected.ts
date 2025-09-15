/**
 * Example protected API route using getUser() pattern
 * 
 * This demonstrates the exact pattern described in issue #6:
 * - Use getUser() helper in API route handlers
 * - Return 401 status for unauthenticated requests
 * - Return user data and allow API logic for authenticated requests
 * - Works with all HTTP methods (GET, POST, etc.)
 */

import type { APIRoute } from 'astro';
import { getUser } from 'astro-stack-auth/server';

export const GET: APIRoute = async (context) => {
  const user = await getUser(context);
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return new Response(JSON.stringify({ 
    message: 'Access granted',
    user: {
      id: user.id,
      email: user.primaryEmail,
      displayName: user.displayName
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async (context) => {
  const user = await getUser(context);
  
  if (!user) {
    return new Response(JSON.stringify({
      error: 'Authentication required',
      message: 'You must be signed in to access this resource'
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Parse request data
  let requestData;
  try {
    requestData = await context.request.json();
  } catch {
    return new Response(JSON.stringify({
      error: 'Invalid request',
      message: 'Request body must be valid JSON'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Process authenticated request
  return new Response(JSON.stringify({
    success: true,
    message: 'Data processed successfully',
    userId: user.id,
    receivedData: requestData
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};