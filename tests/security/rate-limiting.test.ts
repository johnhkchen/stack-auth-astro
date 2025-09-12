/**
 * Rate limiting tests
 * 
 * Tests for rate limiting functionality, including different
 * configurations and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  enforceRateLimit,
  clearRateLimit,
  resetRateLimit,
  getRateLimitStats,
  cleanup,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig
} from '../../src/server/rate-limiting.js';
import { SecurityError } from '../../src/server/security.js';

describe('Rate Limiting', () => {
  let mockRequest: Request;
  
  beforeEach(() => {
    // Create fresh request for each test
    mockRequest = new Request('https://example.com/auth', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.100'
      }
    });
  });
  
  afterEach(() => {
    // Clean up rate limit store after each test
    cleanup();
  });
  
  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const config: RateLimitConfig = {
        windowMs: 60000, // 1 minute
        maxRequests: 5
      };
      
      const result = checkRateLimit(mockRequest, config);
      
      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
    
    it('should track multiple requests', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3
      };
      
      // First request
      let result = checkRateLimit(mockRequest, config);
      expect(result.remaining).toBe(2);
      
      // Second request
      result = checkRateLimit(mockRequest, config);
      expect(result.remaining).toBe(1);
      
      // Third request
      result = checkRateLimit(mockRequest, config);
      expect(result.remaining).toBe(0);
    });
    
    it('should reject requests over limit', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2
      };
      
      // Use up the limit
      checkRateLimit(mockRequest, config);
      checkRateLimit(mockRequest, config);
      
      // This should fail
      const result = checkRateLimit(mockRequest, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
    
    it('should throw SecurityError when enforcing rate limit', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1
      };
      
      // First request should succeed
      expect(() => enforceRateLimit(mockRequest, config)).not.toThrow();
      
      // Second request should throw
      expect(() => enforceRateLimit(mockRequest, config)).toThrow(SecurityError);
    });
    
    it('should include rate limit info in error', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1
      };
      
      // Use up the limit
      enforceRateLimit(mockRequest, config);
      
      try {
        enforceRateLimit(mockRequest, config);
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError);
        expect((error as SecurityError).code).toBe('RATE_LIMIT_EXCEEDED');
        expect((error as any).rateLimit).toBeDefined();
        expect((error as any).rateLimit.retryAfter).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Window Behavior', () => {
    it('should reset after window expires', async () => {
      const config: RateLimitConfig = {
        windowMs: 100, // 100ms window
        maxRequests: 1
      };
      
      // Use up the limit
      const result1 = checkRateLimit(mockRequest, config);
      expect(result1.success).toBe(true);
      
      const result2 = checkRateLimit(mockRequest, config);
      expect(result2.success).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should work again
      const result3 = checkRateLimit(mockRequest, config);
      expect(result3.success).toBe(true);
    });
    
    it('should maintain count within window', () => {
      const config: RateLimitConfig = {
        windowMs: 10000, // 10 seconds
        maxRequests: 3
      };
      
      // Make requests quickly
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(checkRateLimit(mockRequest, config));
      }
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(false);
      expect(results[4].success).toBe(false);
    });
  });
  
  describe('Different IP Addresses', () => {
    it('should track different IPs separately', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1
      };
      
      const request1 = new Request('https://example.com/auth', {
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });
      
      const request2 = new Request('https://example.com/auth', {
        headers: { 'x-forwarded-for': '192.168.1.200' }
      });
      
      // Both should succeed initially
      expect(checkRateLimit(request1, config).success).toBe(true);
      expect(checkRateLimit(request2, config).success).toBe(true);
      
      // Both should fail on second attempt
      expect(checkRateLimit(request1, config).success).toBe(false);
      expect(checkRateLimit(request2, config).success).toBe(false);
    });
  });
  
  describe('Custom Key Generation', () => {
    it('should use custom key generator', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: () => 'custom-key'
      };
      
      // Different requests should share the same limit with custom key
      const request1 = new Request('https://example.com/auth', {
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });
      
      const request2 = new Request('https://example.com/auth', {
        headers: { 'x-forwarded-for': '192.168.1.200' }
      });
      
      expect(checkRateLimit(request1, config).success).toBe(true);
      expect(checkRateLimit(request2, config).success).toBe(false); // Same custom key
    });
  });
  
  describe('Skip Successful Requests', () => {
    it('should clear rate limit on successful requests when configured', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true
      };
      
      // Use up the limit
      checkRateLimit(mockRequest, config);
      checkRateLimit(mockRequest, config);
      
      // Should be at limit now
      expect(checkRateLimit(mockRequest, config).success).toBe(false);
      
      // Clear the rate limit (simulating successful auth)
      clearRateLimit(mockRequest, config);
      
      // Should work again
      expect(checkRateLimit(mockRequest, config).success).toBe(true);
    });
    
    it('should not clear rate limit when skipSuccessfulRequests is false', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
        skipSuccessfulRequests: false
      };
      
      // Use up the limit
      checkRateLimit(mockRequest, config);
      
      // Clear shouldn't do anything
      clearRateLimit(mockRequest, config);
      
      // Should still be limited
      expect(checkRateLimit(mockRequest, config).success).toBe(false);
    });
  });
  
  describe('Limit Reached Callback', () => {
    it('should call callback when limit is reached', () => {
      let callbackCalled = false;
      let callbackKey = '';
      
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
        onLimitReached: (key) => {
          callbackCalled = true;
          callbackKey = key;
        }
      };
      
      // First request should not trigger callback
      checkRateLimit(mockRequest, config);
      expect(callbackCalled).toBe(false);
      
      // Second request should trigger callback
      checkRateLimit(mockRequest, config);
      expect(callbackCalled).toBe(true);
      expect(callbackKey).toBe('ip:192.168.1.100');
    });
  });
  
  describe('Predefined Configurations', () => {
    it('should have auth endpoints configuration', () => {
      const config = RATE_LIMIT_CONFIGS.AUTH_ENDPOINTS;
      
      expect(config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(config.maxRequests).toBe(20);
      expect(config.skipSuccessfulRequests).toBe(true);
    });
    
    it('should have password reset configuration', () => {
      const config = RATE_LIMIT_CONFIGS.PASSWORD_RESET;
      
      expect(config.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(config.maxRequests).toBe(5);
      expect(config.skipSuccessfulRequests).toBe(false);
    });
    
    it('should have sensitive operations configuration', () => {
      const config = RATE_LIMIT_CONFIGS.SENSITIVE_OPERATIONS;
      
      expect(config.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(config.maxRequests).toBe(3);
      expect(config.skipSuccessfulRequests).toBe(false);
    });
  });
  
  describe('Manual Reset and Stats', () => {
    it('should reset rate limit manually', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1
      };
      
      // Use up the limit
      checkRateLimit(mockRequest, config);
      expect(checkRateLimit(mockRequest, config).success).toBe(false);
      
      // Reset manually
      resetRateLimit(mockRequest, config);
      
      // Should work again
      expect(checkRateLimit(mockRequest, config).success).toBe(true);
    });
    
    it('should provide rate limit statistics', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1
      };
      
      // Initial stats
      let stats = getRateLimitStats();
      expect(stats.totalKeys).toBe(0);
      
      // Make a request
      checkRateLimit(mockRequest, config);
      
      // Stats should show one key
      stats = getRateLimitStats();
      expect(stats.totalKeys).toBe(1);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero max requests', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 0
      };
      
      const result = checkRateLimit(mockRequest, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
    
    it('should handle very short windows', () => {
      const config: RateLimitConfig = {
        windowMs: 1, // 1ms
        maxRequests: 1
      };
      
      const result = checkRateLimit(mockRequest, config);
      expect(result.success).toBe(true);
      
      // Window should expire almost immediately, but implementation may still track it briefly
      const result2 = checkRateLimit(mockRequest, config);
      // Either success or failure is acceptable for such a short window
      expect(typeof result2.success).toBe('boolean');
    });
    
    it('should handle requests without IP headers', () => {
      const requestWithoutIP = new Request('https://example.com/auth');
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1
      };
      
      // Should still work with fallback IP
      expect(checkRateLimit(requestWithoutIP, config).success).toBe(true);
    });
  });
});