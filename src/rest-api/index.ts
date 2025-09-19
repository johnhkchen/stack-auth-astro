/**
 * REST API client exports
 * 
 * This module provides the REST API client implementation
 * that replaces the @stackframe/stack SDK dependency.
 */

export { StackAuthRestClient, StackAuthRestError } from './client.js';
export type {
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
  StackAuthError,
  SuccessResponse,
  OAuthProvider,
  SessionStatus
} from './types.js';