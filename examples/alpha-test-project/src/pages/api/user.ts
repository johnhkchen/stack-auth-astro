import type { APIRoute } from 'astro';
import { requireAuth } from 'astro-stack-auth/server';

export const GET: APIRoute = async (context) => {
  try {
    // This will return 401 JSON response if not authenticated
    const user = await requireAuth(context);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
        profileImageUrl: user.profileImageUrl,
        hasPassword: user.hasPassword,
        // Add timestamp for testing
        timestamp: new Date().toISOString()
      },
      apiInfo: {
        endpoint: '/api/user',
        method: 'GET',
        authentication: 'required',
        responseType: 'JSON'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    // Handle authentication or other errors
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      apiInfo: {
        endpoint: '/api/user',
        method: 'GET',
        authentication: 'required',
        responseType: 'JSON'
      }
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};