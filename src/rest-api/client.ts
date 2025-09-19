/**
 * REST API client for Stack Auth
 * 
 * Implements direct REST API calls to replace the @stackframe/stack SDK
 * and eliminate Next.js coupling issues.
 */

import type { StackAuthConfig } from '../types.js';
import type { 
  User, 
  Session, 
  TokenResponse, 
  SignInRequest, 
  SignUpRequest, 
  AuthResponse,
  PasswordResetRequest,
  PasswordResetComplete,
  OTPSignInRequest,
  EmailVerificationRequest,
  UserUpdateRequest,
  StackAuthError
} from './types.js';

interface ClientOptions extends StackAuthConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class StackAuthRestError extends Error {
  constructor(
    message: string, 
    public code: string, 
    public status?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'StackAuthRestError';
  }
}

export class StackAuthRestClient {
  private baseUrl: string;
  private projectId: string;
  private publishableClientKey: string;
  private secretServerKey: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl || 'https://api.stack-auth.com/api/v1';
    this.projectId = options.projectId;
    this.publishableClientKey = options.publishableClientKey;
    this.secretServerKey = options.secretServerKey;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
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
      useClientKey?: boolean;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { accessToken, refreshToken, useClientKey, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers || {});
    headers.set('X-Stack-Project-Id', this.projectId);
    
    // Use client key for public endpoints, server key for protected endpoints
    if (useClientKey) {
      headers.set('X-Stack-Publishable-Client-Key', this.publishableClientKey);
      headers.set('X-Stack-Access-Type', 'client');
    } else {
      headers.set('X-Stack-Secret-Server-Key', this.secretServerKey);
      headers.set('X-Stack-Access-Type', 'server');
    }
    
    if (accessToken) {
      headers.set('X-Stack-Access-Token', accessToken);
    }
    
    if (refreshToken) {
      headers.set('X-Stack-Refresh-Token', refreshToken);
    }
    
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
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        // Extract error details from Stack Auth error format
        const errorCode = errorData.error?.code || this.mapStatusToErrorCode(response.status);
        const errorMessage = errorData.error?.message || errorData.message || `Request failed: ${response.status}`;
        const errorDetails = errorData.error?.details || {};

        throw new StackAuthRestError(
          errorMessage,
          errorCode,
          response.status,
          errorDetails
        );
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

  /**
   * Map HTTP status codes to error codes
   */
  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case 400: return 'INVALID_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 429: return 'RATE_LIMITED';
      case 500: return 'SERVER_ERROR';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Retry logic for transient failures
   */
  private async makeRequestWithRetry<T>(
    path: string,
    options: RequestInit & {
      accessToken?: string;
      refreshToken?: string;
      useClientKey?: boolean;
    } = {}
  ): Promise<T> {
    let lastError: Error | null = null;
    const isRetriableError = (error: any): boolean => {
      if (error instanceof StackAuthRestError) {
        // Retry on rate limiting or server errors
        return ['RATE_LIMITED', 'SERVER_ERROR', 'SERVICE_UNAVAILABLE'].includes(error.code);
      }
      // Retry on network errors
      return error instanceof Error && (
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError' ||
        error.message.includes('fetch failed')
      );
    };

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await this.makeRequest<T>(path, options);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retryAttempts - 1 && isRetriableError(error)) {
          // Exponential backoff with jitter
          const delay = this.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    return this.makeRequestWithRetry<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
      useClientKey: true
    });
  }

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    return this.makeRequestWithRetry<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      useClientKey: true
    });
  }

  /**
   * Update current user profile
   */
  async updateUser(request: Request, data: UserUpdateRequest): Promise<User> {
    const accessToken = this.extractAccessToken(request);
    if (!accessToken) {
      throw new StackAuthRestError('No access token found', 'UNAUTHORIZED', 401);
    }

    return this.makeRequestWithRetry<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
      accessToken
    });
  }

  /**
   * Send password reset code
   */
  async sendPasswordResetCode(data: PasswordResetRequest): Promise<void> {
    await this.makeRequestWithRetry('/auth/password/send-reset-code', {
      method: 'POST',
      body: JSON.stringify(data),
      useClientKey: true
    });
  }

  /**
   * Reset password with code
   */
  async resetPassword(data: PasswordResetComplete): Promise<void> {
    await this.makeRequestWithRetry('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
      useClientKey: true
    });
  }

  /**
   * Send email verification code
   */
  async sendEmailVerificationCode(request: Request, email: string): Promise<void> {
    const accessToken = this.extractAccessToken(request);
    if (!accessToken) {
      throw new StackAuthRestError('No access token found', 'UNAUTHORIZED', 401);
    }

    await this.makeRequestWithRetry('/contact-channels/send-verification-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
      accessToken
    });
  }

  /**
   * Verify email with code
   */
  async verifyEmail(data: EmailVerificationRequest): Promise<void> {
    await this.makeRequestWithRetry('/contact-channels/verify', {
      method: 'POST',
      body: JSON.stringify(data),
      useClientKey: true
    });
  }

  /**
   * Send OTP sign-in code
   */
  async sendOTPCode(email: string): Promise<void> {
    await this.makeRequestWithRetry('/auth/otp/send-sign-in-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
      useClientKey: true
    });
  }

  /**
   * Sign in with OTP code
   */
  async signInWithOTP(data: OTPSignInRequest): Promise<AuthResponse> {
    return this.makeRequestWithRetry<AuthResponse>('/auth/otp/signin', {
      method: 'POST',
      body: JSON.stringify(data),
      useClientKey: true
    });
  }

  /**
   * Get OAuth authorization URL
   */
  getOAuthAuthorizationUrl(provider: string, callbackUrl?: string): string {
    const params = new URLSearchParams({
      client_id: this.publishableClientKey,
      project_id: this.projectId,
      provider
    });

    if (callbackUrl) {
      params.append('redirect_uri', callbackUrl);
    }

    return `${this.baseUrl.replace('/api/v1', '')}/handler/authorize?${params.toString()}`;
  }

  /**
   * Validate OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(code: string, state?: string): Promise<AuthResponse> {
    return this.makeRequestWithRetry<AuthResponse>('/auth/oauth/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
      useClientKey: true
    });
  }
}