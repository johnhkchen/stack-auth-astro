/**
 * Custom type definitions for Stack Auth REST API
 * 
 * These types replace the ones imported from @stackframe/stack SDK
 * and are based on the Stack Auth REST API documentation.
 */

/**
 * User object returned by Stack Auth API
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
  
  // Additional properties that may be included
  updatedAt?: string;
  lastActiveAt?: string;
  signedUpAt?: string;
  
  // For compatibility with SDK types
  currentSession?: Session;
}

/**
 * Session object returned by Stack Auth API
 */
export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  isActive: boolean;
  
  // Additional properties that may be included
  createdAt?: string;
  lastActiveAt?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Token response from OAuth token endpoint
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  
  // Additional properties
  scope?: string;
  id_token?: string;
}

/**
 * Error response from Stack Auth API
 */
export interface StackAuthError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Success response wrapper used by some endpoints
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Sign in request payload
 */
export interface SignInRequest {
  email: string;
  password: string;
}

/**
 * Sign up request payload
 */
export interface SignUpRequest {
  email: string;
  password: string;
  displayName?: string;
  metadata?: Record<string, any>;
}

/**
 * Sign in/up response
 */
export interface AuthResponse {
  user: User;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
}

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  id: string;
  name: string;
  type: 'oauth' | 'oidc';
  enabled: boolean;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset completion
 */
export interface PasswordResetComplete {
  email: string;
  code: string;
  newPassword: string;
}

/**
 * OTP sign in request
 */
export interface OTPSignInRequest {
  email: string;
  code?: string;
}

/**
 * Email verification request
 */
export interface EmailVerificationRequest {
  email: string;
  code?: string;
}

/**
 * User update request
 */
export interface UserUpdateRequest {
  displayName?: string;
  profileImageUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Session status
 */
export interface SessionStatus {
  valid: boolean;
  user?: User;
  session?: Session;
  expiresAt?: string;
}