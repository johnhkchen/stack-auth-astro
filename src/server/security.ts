/**
 * Security utilities and validation functions for server-side authentication
 * 
 * Provides input validation, sanitization, token generation, and security
 * utilities to protect against common web application vulnerabilities.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import type { APIContext } from 'astro';

// Security configuration constants
export const SECURITY_CONFIG = {
  // CSRF token settings
  CSRF_TOKEN_LENGTH: 32,
  CSRF_COOKIE_NAME: 'stack-auth-csrf-token',
  CSRF_HEADER_NAME: 'x-csrf-token',
  
  // Rate limiting settings
  DEFAULT_RATE_LIMIT: 100, // requests per window
  DEFAULT_RATE_WINDOW: 15 * 60 * 1000, // 15 minutes
  
  // Input validation limits
  MAX_INPUT_LENGTH: 1000,
  MAX_URL_LENGTH: 2048,
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
} as const;

/**
 * Input validation error types
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(length: number = SECURITY_CONFIG.CSRF_TOKEN_LENGTH): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate CSRF token for the current session
 */
export function generateCSRFToken(): string {
  return generateSecureToken(SECURITY_CONFIG.CSRF_TOKEN_LENGTH);
}

/**
 * Validate CSRF token using timing-safe comparison
 */
export function validateCSRFToken(providedToken: string, expectedToken: string): boolean {
  if (!providedToken || !expectedToken) {
    return false;
  }
  
  if (providedToken.length !== expectedToken.length) {
    return false;
  }
  
  try {
    const providedBuffer = Buffer.from(providedToken, 'hex');
    const expectedBuffer = Buffer.from(expectedToken, 'hex');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  if (input.length > SECURITY_CONFIG.MAX_INPUT_LENGTH) {
    throw new ValidationError(`Input length exceeds maximum of ${SECURITY_CONFIG.MAX_INPUT_LENGTH} characters`);
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>&"'/\\]/g, '') // Remove HTML/script injection chars
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
    .trim();
}

/**
 * Validate and sanitize URL for redirects
 */
export function validateRedirectURL(url: string, allowedOrigins: string[] = []): string {
  if (!url || typeof url !== 'string') {
    throw new ValidationError('Redirect URL must be a non-empty string');
  }
  
  if (url.length > SECURITY_CONFIG.MAX_URL_LENGTH) {
    throw new ValidationError(`URL length exceeds maximum of ${SECURITY_CONFIG.MAX_URL_LENGTH} characters`);
  }
  
  // Check for dangerous schemes first (both absolute and relative)
  if (['javascript:', 'data:', 'vbscript:', 'file:'].some(scheme => 
      url.toLowerCase().startsWith(scheme))) {
    throw new ValidationError('Unsafe URL scheme detected');
  }
  
  try {
    const parsedUrl = new URL(url, 'https://localhost'); // Use base for relative URLs
    
    // Allow relative URLs (same origin)
    if (!url.startsWith('http')) {
      // Sanitize URL but preserve URL-safe characters
      return url
        .replace(/[<>"'\\]/g, '') // Remove HTML/script injection chars but keep URL chars
        .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
        .trim();
    }
    
    // For absolute URLs, validate against allowed origins
    if (allowedOrigins.length > 0) {
      const isAllowed = allowedOrigins.some(origin => 
        parsedUrl.origin === origin || parsedUrl.origin.endsWith('.' + origin)
      );
      
      if (!isAllowed) {
        throw new ValidationError('Redirect URL origin not allowed');
      }
    }
    
    // Dangerous schemes are already checked above before URL parsing
    
    return parsedUrl.toString();
    
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Invalid URL format');
  }
}

/**
 * Validate request origin against CSRF attacks
 */
export function validateOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // For non-browser requests, origin may not be present
  if (!origin && !referer) {
    return true; // Allow API requests without origin
  }
  
  const requestOrigin = origin || (referer ? new URL(referer).origin : null);
  
  if (!requestOrigin) {
    return false;
  }
  
  return allowedOrigins.some(allowed => 
    requestOrigin === allowed || requestOrigin.endsWith('.' + allowed)
  );
}

/**
 * Extract client IP address from request, considering proxies
 */
export function getClientIP(request: Request): string {
  // Check various headers for real IP (in order of preference)
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // nginx
    'x-forwarded-for', // Standard proxy header
    'x-client-ip',
    'x-forwarded',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded'
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, use the first one
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  
  // Fallback to a default value - in production this should be extracted from connection
  return '127.0.0.1';
}

/**
 * Validate IP address format (IPv4 and IPv6)
 */
function isValidIP(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // Basic IPv6 validation
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Generate secure hash of sensitive data for logging/comparison
 */
export function generateSecureHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(headers: Headers, additionalHeaders?: Record<string, string>): void {
  // Add default security headers
  Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });
  
  // Add any additional security headers
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
}

/**
 * Validate request method for authentication endpoints
 */
export function validateAuthMethod(request: Request, allowedMethods: string[] = ['POST']): void {
  if (!allowedMethods.includes(request.method)) {
    throw new SecurityError(
      `Method ${request.method} not allowed for authentication endpoints`,
      'METHOD_NOT_ALLOWED'
    );
  }
}

/**
 * Check if request is from a known bot or crawler
 */
export function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /facebook/i, /twitter/i, /linkedin/i,
    /google/i, /bing/i, /yahoo/i, /baidu/i,
    /curl/i, /wget/i, /python-requests/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Security utilities for API context validation
 */
export interface SecurityValidationOptions {
  requireCSRF?: boolean;
  validateOrigin?: boolean;
  allowedOrigins?: string[];
  maxInputLength?: number;
  requireSecureTransport?: boolean;
}

/**
 * Validate API context for security requirements
 */
export function validateAPIContext(
  context: APIContext, 
  options: SecurityValidationOptions = {}
): void {
  const { request } = context;
  
  // Validate secure transport in production
  if (options.requireSecureTransport && process.env.NODE_ENV === 'production') {
    if (!request.url.startsWith('https://') && !request.headers.get('x-forwarded-proto')?.includes('https')) {
      throw new SecurityError('HTTPS required for authentication endpoints', 'INSECURE_TRANSPORT');
    }
  }
  
  // Validate request origin
  if (options.validateOrigin && options.allowedOrigins) {
    if (!validateOrigin(request, options.allowedOrigins)) {
      throw new SecurityError('Request origin not allowed', 'ORIGIN_NOT_ALLOWED');
    }
  }
  
  // Validate CSRF token for state-changing operations
  if (options.requireCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfToken = request.headers.get(SECURITY_CONFIG.CSRF_HEADER_NAME) || 
                      new URL(request.url).searchParams.get('csrf_token');
    const expectedToken = context.cookies.get(SECURITY_CONFIG.CSRF_COOKIE_NAME)?.value;
    
    if (!csrfToken || !expectedToken || !validateCSRFToken(csrfToken, expectedToken)) {
      throw new SecurityError('Invalid or missing CSRF token', 'CSRF_TOKEN_INVALID');
    }
  }
}

/**
 * Rate limiting key generation for different scenarios
 */
export function generateRateLimitKey(request: Request, type: 'ip' | 'user' | 'endpoint', identifier?: string): string {
  const clientIP = getClientIP(request);
  const endpoint = new URL(request.url).pathname;
  
  switch (type) {
    case 'ip':
      return `ip:${clientIP}`;
    case 'user':
      return `user:${identifier || 'anonymous'}:${clientIP}`;
    case 'endpoint':
      return `endpoint:${endpoint}:${clientIP}`;
    default:
      return `general:${clientIP}`;
  }
}