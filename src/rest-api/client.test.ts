import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StackAuthRestClient, StackAuthRestError } from './client.js';
import type { 
  User, 
  Session, 
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  UserUpdateRequest
} from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('StackAuthRestClient', () => {
  let client: StackAuthRestClient;
  const mockConfig = {
    projectId: 'test-project-id',
    publishableClientKey: 'test-client-key',
    secretServerKey: 'test-server-key',
    baseUrl: 'https://api.stack-auth.com/api/v1',
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 100
  };

  beforeEach(() => {
    client = new StackAuthRestClient(mockConfig);
    mockFetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const minimalClient = new StackAuthRestClient({
        projectId: 'test',
        publishableClientKey: 'client-key',
        secretServerKey: 'server-key'
      });
      expect(minimalClient).toBeDefined();
    });
  });

  describe('signIn', () => {
    it('should successfully sign in with email and password', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        session: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: '2024-01-01T01:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: SignInRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await client.signIn(request);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/auth/signin',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          body: JSON.stringify(request),
          signal: expect.any(AbortSignal)
        })
      );

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.get('X-Stack-Project-Id')).toBe('test-project-id');
      expect(headers.get('X-Stack-Publishable-Client-Key')).toBe('test-client-key');
      expect(headers.get('X-Stack-Access-Type')).toBe('client');
      expect(headers.get('Content-Type')).toBe('application/json');

      expect(result).toEqual(mockResponse);
    });

    it('should handle sign in errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      });

      const request: SignInRequest = {
        email: 'test@example.com',
        password: 'wrong-password'
      };

      await expect(client.signIn(request)).rejects.toThrow(StackAuthRestError);
      await expect(client.signIn(request)).rejects.toMatchObject({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        status: 401
      });
    });
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: 'user-456',
          email: 'newuser@example.com',
          displayName: 'New User',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00Z'
        },
        session: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: '2024-01-01T01:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: SignUpRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User'
      };

      const result = await client.signUp(request);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUser', () => {
    it('should get user from access token in cookie', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const request = new Request('https://example.com', {
        headers: {
          cookie: 'stack-auth-access-token=test-access-token'
        }
      });

      const result = await client.getUser(request);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/users/me',
        expect.objectContaining({
          method: 'GET'
        })
      );

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.get('X-Stack-Access-Token')).toBe('test-access-token');
      expect(headers.get('X-Stack-Access-Type')).toBe('server');
      expect(headers.get('X-Stack-Secret-Server-Key')).toBe('test-server-key');

      expect(result).toEqual(mockUser);
    });

    it('should return null when no access token is found', async () => {
      const request = new Request('https://example.com');
      const result = await client.getUser(request);
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null when user fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } })
      });

      const request = new Request('https://example.com', {
        headers: {
          'X-Stack-Access-Token': 'invalid-token'
        }
      });

      const result = await client.getUser(request);
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const updatedUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Updated Name',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser
      });

      const request = new Request('https://example.com', {
        headers: {
          cookie: 'stack-auth-access-token=test-access-token'
        }
      });

      const updateData: UserUpdateRequest = {
        displayName: 'Updated Name'
      };

      const result = await client.updateUser(request, updateData);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/users/me',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData)
        })
      );

      expect(result).toEqual(updatedUser);
    });

    it('should throw error when no access token', async () => {
      const request = new Request('https://example.com');
      const updateData: UserUpdateRequest = {
        displayName: 'Updated Name'
      };

      await expect(client.updateUser(request, updateData)).rejects.toThrow(StackAuthRestError);
      await expect(client.updateUser(request, updateData)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401
      });
    });
  });

  describe('password reset flow', () => {
    it('should send password reset code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await client.sendPasswordResetCode({ email: 'test@example.com' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/auth/password/send-reset-code',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should reset password with code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await client.resetPassword({
        email: 'test@example.com',
        code: '123456',
        newPassword: 'newPassword123'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/auth/password/reset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            code: '123456',
            newPassword: 'newPassword123'
          })
        })
      );
    });
  });

  describe('email verification', () => {
    it('should send email verification code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const request = new Request('https://example.com', {
        headers: {
          cookie: 'stack-auth-access-token=test-access-token'
        }
      });

      await client.sendEmailVerificationCode(request, 'test@example.com');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/contact-channels/send-verification-code',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should verify email with code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await client.verifyEmail({
        email: 'test@example.com',
        code: '123456'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/contact-channels/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            code: '123456'
          })
        })
      );
    });
  });

  describe('OTP authentication', () => {
    it('should send OTP code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await client.sendOTPCode('test@example.com');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/auth/otp/send-sign-in-code',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should sign in with OTP', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        session: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: '2024-01-01T01:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.signInWithOTP({
        email: 'test@example.com',
        code: '123456'
      });
      
      expect(result).toEqual(mockResponse);
    });
  });

  describe('OAuth support', () => {
    it('should generate OAuth authorization URL', () => {
      const url = client.getOAuthAuthorizationUrl('google', 'https://example.com/callback');
      
      expect(url).toBe(
        'https://api.stack-auth.com/handler/authorize?' +
        'client_id=test-client-key&' +
        'project_id=test-project-id&' +
        'provider=google&' +
        'redirect_uri=https%3A%2F%2Fexample.com%2Fcallback'
      );
    });

    it('should handle OAuth callback', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: 'user-123',
          email: 'oauth@example.com',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        session: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: '2024-01-01T01:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.handleOAuthCallback('auth-code-123', 'state-123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stack-auth.com/api/v1/auth/oauth/callback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'auth-code-123', state: 'state-123' })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('retry logic', () => {
    it('should retry on rate limiting', async () => {
      // First attempt: rate limited
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests'
          }
        })
      });

      // Second attempt: success
      const mockResponse: AuthResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        session: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: '2024-01-01T01:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const resultPromise = client.signIn({
        email: 'test@example.com',
        password: 'password123'
      });

      // Fast-forward through the retry delay
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retriable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Bad request'
          }
        })
      });

      await expect(client.signIn({
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(StackAuthRestError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry with exponential backoff', async () => {
      // Mock all retries to fail
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Service temporarily unavailable'
            }
          })
        });
      }

      const startTime = Date.now();
      const resultPromise = client.signIn({
        email: 'test@example.com',
        password: 'password123'
      });

      // Run through all retries
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(StackAuthRestError);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('token extraction', () => {
    it('should extract token from stack-auth-token cookie', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const request = new Request('https://example.com', {
        headers: {
          cookie: 'other-cookie=value; stack-auth-token=token-from-cookie; another=value'
        }
      });

      await client.getUser(request);
      
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.get('X-Stack-Access-Token')).toBe('token-from-cookie');
    });

    it('should extract token from Authorization header', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const request = new Request('https://example.com', {
        headers: {
          'Authorization': 'Bearer token-from-header'
        }
      });

      await client.getUser(request);
      
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.get('X-Stack-Access-Token')).toBe('token-from-header');
    });

    it('should extract token from X-Stack-Access-Token header', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const request = new Request('https://example.com', {
        headers: {
          'X-Stack-Access-Token': 'token-from-x-header'
        }
      });

      await client.getUser(request);
      
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.get('X-Stack-Access-Token')).toBe('token-from-x-header');
    });
  });

  describe('error handling', () => {
    it('should map status codes to error codes', async () => {
      const statusToCode = [
        { status: 400, code: 'INVALID_REQUEST' },
        { status: 401, code: 'UNAUTHORIZED' },
        { status: 403, code: 'FORBIDDEN' },
        { status: 404, code: 'NOT_FOUND' },
        { status: 429, code: 'RATE_LIMITED' },
        { status: 500, code: 'SERVER_ERROR' },
        { status: 503, code: 'SERVICE_UNAVAILABLE' },
        { status: 999, code: 'UNKNOWN_ERROR' }
      ];

      for (const { status, code } of statusToCode) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          statusText: 'Error',
          json: async () => ({ message: 'Error message' })
        });

        try {
          await client.signIn({ email: 'test@example.com', password: 'password' });
        } catch (error) {
          expect(error).toBeInstanceOf(StackAuthRestError);
          expect((error as StackAuthRestError).code).toBe(code);
          expect((error as StackAuthRestError).status).toBe(status);
        }
      }
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });
});