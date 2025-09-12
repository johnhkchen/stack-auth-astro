/**
 * Security utilities tests
 * 
 * Tests for input validation, sanitization, CSRF protection,
 * and other security utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSecureToken,
  generateCSRFToken,
  validateCSRFToken,
  sanitizeInput,
  validateRedirectURL,
  validateOrigin,
  getClientIP,
  addSecurityHeaders,
  validateAuthMethod,
  isBot,
  generateRateLimitKey,
  ValidationError,
  SecurityError,
  SECURITY_CONFIG
} from '../../src/server/security.js';

describe('Security Utilities', () => {
  describe('Token Generation', () => {
    it('should generate secure tokens of correct length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
    
    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
    
    it('should generate CSRF tokens', () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(SECURITY_CONFIG.CSRF_TOKEN_LENGTH * 2); // hex encoding doubles length
    });
  });
  
  describe('CSRF Token Validation', () => {
    it('should validate matching CSRF tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });
    
    it('should reject mismatched CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });
    
    it('should reject empty tokens', () => {
      expect(validateCSRFToken('', 'valid-token')).toBe(false);
      expect(validateCSRFToken('valid-token', '')).toBe(false);
    });
    
    it('should reject tokens of different lengths', () => {
      const shortToken = generateSecureToken(16);
      const longToken = generateSecureToken(32);
      expect(validateCSRFToken(shortToken, longToken)).toBe(false);
    });
    
    it('should reject invalid hex tokens', () => {
      const validToken = generateCSRFToken();
      const invalidToken = 'invalid-hex-token';
      expect(validateCSRFToken(invalidToken, validToken)).toBe(false);
    });
  });
  
  describe('Input Sanitization', () => {
    it('should sanitize clean input', () => {
      const clean = 'valid input text';
      expect(sanitizeInput(clean)).toBe(clean);
    });
    
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)script');
      expect(sanitizeInput('user@example.com')).toBe('user@example.com'); // @ is safe
      expect(sanitizeInput('test & validation')).toBe('test  validation');
    });
    
    it('should remove control characters', () => {
      expect(sanitizeInput('test\x00\x1f\x7f')).toBe('test');
      expect(sanitizeInput('line1\nline2')).toBe('line1line2'); // \n is control char
    });
    
    it('should trim whitespace', () => {
      expect(sanitizeInput('  spaced  ')).toBe('spaced');
    });
    
    it('should reject non-string input', () => {
      expect(() => sanitizeInput(123)).toThrow(ValidationError);
      expect(() => sanitizeInput(null)).toThrow(ValidationError);
      expect(() => sanitizeInput(undefined)).toThrow(ValidationError);
    });
    
    it('should reject overly long input', () => {
      const longInput = 'a'.repeat(SECURITY_CONFIG.MAX_INPUT_LENGTH + 1);
      expect(() => sanitizeInput(longInput)).toThrow(ValidationError);
    });
    
    it('should handle edge case input sanitization', () => {
      // Test mixed dangerous and safe characters
      expect(sanitizeInput('Hello<world>&test')).toBe('Helloworldtest');
      
      // Test Unicode characters (should be preserved)
      expect(sanitizeInput('café ümlaut 日本語')).toBe('café ümlaut 日本語');
      
      // Test empty string after sanitization
      expect(sanitizeInput('<>&"\'/\\')).toBe('');
      
      // Test input with only control characters
      expect(sanitizeInput('\x00\x01\x1f')).toBe('');
      
      // Test boundary length input (exactly at max length)
      const maxInput = 'a'.repeat(SECURITY_CONFIG.MAX_INPUT_LENGTH);
      expect(sanitizeInput(maxInput)).toBe(maxInput);
    });
  });
  
  describe('URL Validation', () => {
    it('should validate safe relative URLs', () => {
      expect(validateRedirectURL('/dashboard')).toBe('/dashboard');
      expect(validateRedirectURL('/auth/callback')).toBe('/auth/callback');
    });
    
    it('should validate absolute URLs with allowed origins', () => {
      const allowedOrigins = ['https://example.com'];
      expect(validateRedirectURL('https://example.com/dashboard', allowedOrigins))
        .toBe('https://example.com/dashboard');
    });
    
    it('should reject absolute URLs with disallowed origins', () => {
      const allowedOrigins = ['https://example.com'];
      expect(() => validateRedirectURL('https://evil.com/steal', allowedOrigins))
        .toThrow(ValidationError);
    });
    
    it('should reject dangerous URL schemes', () => {
      expect(() => validateRedirectURL('javascript:alert("xss")'))
        .toThrow(ValidationError);
      expect(() => validateRedirectURL('data:text/html,<script>alert("xss")</script>'))
        .toThrow(ValidationError);
      expect(() => validateRedirectURL('vbscript:msgbox("xss")'))
        .toThrow(ValidationError);
      expect(() => validateRedirectURL('file:///etc/passwd'))
        .toThrow(ValidationError);
    });
    
    it('should reject empty URLs but allow invalid formats', () => {
      expect(() => validateRedirectURL('')).toThrow(ValidationError);
      expect(validateRedirectURL('not-a-url')).toBe('not-a-url');
    });
    
    it('should reject overly long URLs', () => {
      const longURL = '/' + 'a'.repeat(SECURITY_CONFIG.MAX_URL_LENGTH);
      expect(() => validateRedirectURL(longURL)).toThrow(ValidationError);
    });
    
    it('should handle edge case URLs', () => {
      // Test URLs with multiple slashes
      expect(validateRedirectURL('//example.com')).toBe('//example.com');
      
      // Test URLs with query parameters and fragments
      expect(validateRedirectURL('/path?param=value#fragment')).toBe('/path?param=value#fragment');
      
      // Test URLs with encoded characters  
      expect(validateRedirectURL('/path%20with%20spaces')).toBe('/path%20with%20spaces');
      
      // Test URLs with port numbers
      expect(validateRedirectURL('/dashboard:8080')).toBe('/dashboard:8080');
    });
    
    it('should handle whitespace-only URLs', () => {
      expect(validateRedirectURL('   ')).toBe('');
      expect(validateRedirectURL('\t\n')).toBe('');
    });
  });
  
  describe('Origin Validation', () => {
    let mockRequest: Request;
    
    beforeEach(() => {
      mockRequest = new Request('https://example.com/test', {
        headers: {
          'origin': 'https://example.com'
        }
      });
    });
    
    it('should validate matching origins', () => {
      const allowedOrigins = ['https://example.com'];
      expect(validateOrigin(mockRequest, allowedOrigins)).toBe(true);
    });
    
    it('should reject non-matching origins', () => {
      const allowedOrigins = ['https://trusted.com'];
      expect(validateOrigin(mockRequest, allowedOrigins)).toBe(false);
    });
    
    it('should allow subdomain origins', () => {
      const request = new Request('https://app.example.com/test', {
        headers: { 'origin': 'https://app.example.com' }
      });
      const allowedOrigins = ['example.com'];
      expect(validateOrigin(request, allowedOrigins)).toBe(true);
    });
    
    it('should allow requests without origin for API calls', () => {
      const request = new Request('https://example.com/api/test');
      const allowedOrigins = ['https://trusted.com'];
      expect(validateOrigin(request, allowedOrigins)).toBe(true);
    });
    
    it('should validate referer when origin is missing', () => {
      const request = new Request('https://example.com/test', {
        headers: { 'referer': 'https://example.com/page' }
      });
      const allowedOrigins = ['https://example.com'];
      expect(validateOrigin(request, allowedOrigins)).toBe(true);
    });
  });
  
  describe('Client IP Extraction', () => {
    it('should extract IP from x-forwarded-for', () => {
      const request = new Request('https://example.com/test', {
        headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' }
      });
      expect(getClientIP(request)).toBe('192.168.1.100');
    });
    
    it('should extract IP from x-real-ip', () => {
      const request = new Request('https://example.com/test', {
        headers: { 'x-real-ip': '192.168.1.200' }
      });
      expect(getClientIP(request)).toBe('192.168.1.200');
    });
    
    it('should extract IP from cloudflare header', () => {
      const request = new Request('https://example.com/test', {
        headers: { 'cf-connecting-ip': '203.0.113.1' }
      });
      expect(getClientIP(request)).toBe('203.0.113.1');
    });
    
    it('should fallback to default IP when no headers', () => {
      const request = new Request('https://example.com/test');
      expect(getClientIP(request)).toBe('127.0.0.1');
    });
    
    it('should reject invalid IP addresses', () => {
      const request = new Request('https://example.com/test', {
        headers: { 'x-forwarded-for': 'invalid-ip' }
      });
      expect(getClientIP(request)).toBe('127.0.0.1');
    });
  });
  
  describe('Security Headers', () => {
    it('should add security headers to response', () => {
      const headers = new Headers();
      addSecurityHeaders(headers);
      
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headers.get('X-Frame-Options')).toBe('DENY');
      expect(headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
    
    it('should not override existing headers', () => {
      const headers = new Headers();
      headers.set('X-Frame-Options', 'SAMEORIGIN');
      
      addSecurityHeaders(headers);
      expect(headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    });
    
    it('should add additional headers', () => {
      const headers = new Headers();
      addSecurityHeaders(headers, { 'Custom-Security': 'test' });
      
      expect(headers.get('Custom-Security')).toBe('test');
    });
  });
  
  describe('Authentication Method Validation', () => {
    it('should allow POST requests by default', () => {
      const request = new Request('https://example.com/auth', { method: 'POST' });
      expect(() => validateAuthMethod(request)).not.toThrow();
    });
    
    it('should reject GET requests by default', () => {
      const request = new Request('https://example.com/auth', { method: 'GET' });
      expect(() => validateAuthMethod(request)).toThrow(SecurityError);
    });
    
    it('should allow custom allowed methods', () => {
      const request = new Request('https://example.com/auth', { method: 'PATCH' });
      expect(() => validateAuthMethod(request, ['PATCH', 'PUT'])).not.toThrow();
    });
  });
  
  describe('Bot Detection', () => {
    it('should detect common bots', () => {
      expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1;')).toBe(true);
      expect(isBot('facebookexternalhit/1.1')).toBe(true);
      expect(isBot('Twitterbot/1.0')).toBe(true);
      expect(isBot('python-requests/2.28.1')).toBe(true);
      expect(isBot('curl/7.68.0')).toBe(true);
    });
    
    it('should not detect regular browsers as bots', () => {
      expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
      expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
    });
    
    it('should handle empty user agent', () => {
      expect(isBot('')).toBe(false);
      expect(isBot(undefined as any)).toBe(false);
    });
  });
  
  describe('Rate Limit Key Generation', () => {
    let mockRequest: Request;
    
    beforeEach(() => {
      mockRequest = new Request('https://example.com/auth', {
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });
    });
    
    it('should generate IP-based keys', () => {
      const key = generateRateLimitKey(mockRequest, 'ip');
      expect(key).toBe('ip:192.168.1.100');
    });
    
    it('should generate user-based keys', () => {
      const key = generateRateLimitKey(mockRequest, 'user', 'user123');
      expect(key).toBe('user:user123:192.168.1.100');
    });
    
    it('should generate endpoint-based keys', () => {
      const key = generateRateLimitKey(mockRequest, 'endpoint');
      expect(key).toBe('endpoint:/auth:192.168.1.100');
    });
    
    it('should handle anonymous users', () => {
      const key = generateRateLimitKey(mockRequest, 'user');
      expect(key).toBe('user:anonymous:192.168.1.100');
    });
  });
});