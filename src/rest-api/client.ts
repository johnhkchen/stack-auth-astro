/**
 * REST API client for Stack Auth
 * 
 * Implements direct REST API calls to replace the @stackframe/stack SDK
 * and eliminate Next.js coupling issues.
 */

import type { StackAuthConfig } from '../types.js';
import type { User, Session, TokenResponse } from './types.js';

interface ClientOptions extends StackAuthConfig {
  timeout?: number;
}

export class StackAuthRestClient {
  private baseUrl: string;
  private projectId: string;
  private publishableClientKey: string;
  private secretServerKey: string;
  private timeout: number;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl || 'https://api.stack-auth.com/api/v1';
    this.projectId = options.projectId;
    this.publishableClientKey = options.publishableClientKey;
    this.secretServerKey = options.secretServerKey;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Extract access token from cookies or headers
   */
  private extractAccessToken(request: Request): string | null {
    // Check cookies first
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const stackAuthCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith('stack-auth-token='));
      
      if (stackAuthCookie) {
        const token = stackAuthCookie.split('=')[1];
        return token;
      }

      // Also check for stack-auth-access-token cookie
      const accessTokenCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith('stack-auth-access-token='));
      
      if (accessTokenCookie) {
        const token = accessTokenCookie.split('=')[1];
        return token;
      }
    }

    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-Stack-Access-Token header
    const stackTokenHeader = request.headers.get('x-stack-access-token');
    if (stackTokenHeader) {
      return stackTokenHeader;
    }

    return null;
  }

  /**
   * Extract refresh token from cookies
   */
  private extractRefreshToken(request: Request): string | null {
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const refreshTokenCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith('stack-auth-refresh-token='));
      
      if (refreshTokenCookie) {
        const token = refreshTokenCookie.split('=')[1];
        return token;
      }
    }

    // Check X-Stack-Refresh-Token header
    const refreshTokenHeader = request.headers.get('x-stack-refresh-token');
    if (refreshTokenHeader) {
      return refreshTokenHeader;
    }

    return null;
  }

  /**
   * Make an authenticated API request
   */
  private async makeRequest<T>(
    path: string,
    options: RequestInit & {
      accessToken?: string;
      refreshToken?: string;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { accessToken, refreshToken, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers || {});
    headers.set('X-Stack-Project-Id', this.projectId);
    headers.set('X-Stack-Access-Type', 'server');
    
    if (accessToken) {
      headers.set('X-Stack-Access-Token', accessToken);
    }
    
    if (refreshToken) {
      headers.set('X-Stack-Refresh-Token', refreshToken);
    }
    
    // Always include server key for server-side operations
    headers.set('X-Stack-Secret-Server-Key', this.secretServerKey);
    
    // Set content type for JSON requests
    if (fetchOptions.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Get current user from access token
   */
  async getUser(request: Request): Promise<User | null> {
    const accessToken = this.extractAccessToken(request);
    if (!accessToken) {
      return null;
    }

    try {
      const user = await this.makeRequest<User>('/users/me', {
        method: 'GET',
        accessToken
      });
      return user;
    } catch (error) {
      // Return null if user fetch fails (invalid/expired token)
      return null;
    }
  }

  /**
   * Get current session from access token
   */
  async getSession(request: Request): Promise<Session | null> {
    const accessToken = this.extractAccessToken(request);
    if (!accessToken) {
      return null;
    }

    try {
      const session = await this.makeRequest<Session>('/auth/session', {
        method: 'GET',
        accessToken
      });
      return session;
    } catch (error) {
      // Return null if session fetch fails (invalid/expired token)
      return null;
    }
  }

  /**
   * Get user and session in a single operation
   */
  async getUserAndSession(request: Request): Promise<{ user: User | null; session: Session | null }> {
    const accessToken = this.extractAccessToken(request);
    if (!accessToken) {
      return { user: null, session: null };
    }

    try {
      // Fetch user and session in parallel for performance
      const [user, session] = await Promise.all([
        this.getUser(request),
        this.getSession(request)
      ]);

      return { user, session };
    } catch (error) {
      return { user: null, session: null };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: Request): Promise<TokenResponse | null> {
    const refreshToken = this.extractRefreshToken(request);
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await this.makeRequest<TokenResponse>('/auth/oauth/token', {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      return response;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(request: Request): Promise<boolean> {
    const accessToken = this.extractAccessToken(request);
    if (!accessToken) {
      return false;
    }

    try {
      await this.makeRequest('/auth/signout', {
        method: 'POST',
        accessToken
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/health', {
        method: 'GET'
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}