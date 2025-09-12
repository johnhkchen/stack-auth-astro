/**
 * Protected API route demonstrating Sprint 003 server-side authentication
 * 
 * This API endpoint shows how to:
 * - Use requireAuth() to protect API routes
 * - Handle authentication failures with proper JSON responses
 * - Access user data from authenticated requests
 * - Return user information in API format
 */

import type { APIRoute } from 'astro';
import { requireAuth, getSession } from 'astro-stack-auth/server';

export const GET: APIRoute = async (context) => {
  try {
    // Require authentication - will throw 401 Response for unauthenticated requests
    const user = await requireAuth(context);
    
    // Optional: Get session information
    const session = await getSession(context);
    
    // Return user data as JSON
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.primaryEmail,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
        signedUpAt: new Date(user.signedUpAtMillis).toISOString(),
        metadata: {
          client: user.clientMetadata,
          server: user.serverMetadata
        }
      },
      session: session ? {
        id: session.id,
        expiresAt: new Date(session.expiresAtMillis).toISOString(),
        createdAt: new Date(session.createdAtMillis).toISOString()
      } : null,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache'
      }
    });
    
  } catch (error) {
    // requireAuth() automatically throws proper 401 Response for API routes
    // This catch block handles any other unexpected errors
    if (error instanceof Response) {
      return error; // Re-throw authentication response
    }
    
    // Handle unexpected errors
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    // Demonstrate POST request with authentication
    const user = await requireAuth(context);
    
    // Parse request body
    let requestData;
    try {
      requestData = await context.request.json();
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Example: Update user preferences (simplified)
    return new Response(JSON.stringify({
      success: true,
      message: 'User data updated successfully',
      userId: user.id,
      updatedData: requestData,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache'
      }
    });
    
  } catch (error) {
    if (error instanceof Response) {
      return error; // Re-throw authentication response
    }
    
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};