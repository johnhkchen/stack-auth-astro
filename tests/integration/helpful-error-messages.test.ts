/**
 * Tests for helpful error messages in common configuration scenarios
 * 
 * Ensures users get clear, actionable error messages when they
 * misconfigure Stack Auth, helping them quickly identify and fix issues.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnvironmentVariables } from '../../src/validation.js';
import { tryGetConfig } from '../../src/config.js';
import { validateStackAuthConnection } from '../../src/connection-validation.js';
import { ERROR_MESSAGES } from '../../src/errors.js';
import type { StackAuthConfig } from '../../src/types.js';

describe('Helpful Error Messages', () => {
  // Store original env vars
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Missing Environment Variables', () => {
    it('should provide specific error for missing STACK_PROJECT_ID', () => {
      delete process.env.STACK_PROJECT_ID;
      process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_123';
      process.env.STACK_SECRET_SERVER_KEY = 'sk_test_123';

      const validation = validateEnvironmentVariables();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('STACK_PROJECT_ID is required');
    });

    it('should provide specific error for missing STACK_PUBLISHABLE_CLIENT_KEY', () => {
      process.env.STACK_PROJECT_ID = 'test-project-id';
      delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
      process.env.STACK_SECRET_SERVER_KEY = 'sk_test_123';

      const validation = validateEnvironmentVariables();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('STACK_PUBLISHABLE_CLIENT_KEY is required');
    });

    it('should provide specific error for missing STACK_SECRET_SERVER_KEY', () => {
      process.env.STACK_PROJECT_ID = 'test-project-id';
      process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_123';
      delete process.env.STACK_SECRET_SERVER_KEY;

      const validation = validateEnvironmentVariables();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('STACK_SECRET_SERVER_KEY is required');
    });

    it('should list all missing environment variables', () => {
      delete process.env.STACK_PROJECT_ID;
      delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
      delete process.env.STACK_SECRET_SERVER_KEY;

      const validation = validateEnvironmentVariables();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors).toContain('STACK_PROJECT_ID is required');
      expect(validation.errors).toContain('STACK_PUBLISHABLE_CLIENT_KEY is required');
      expect(validation.errors).toContain('STACK_SECRET_SERVER_KEY is required');
    });
  });

  describe('Invalid Credentials Format', () => {
    it('should warn about invalid project ID format', () => {
      process.env.STACK_PROJECT_ID = 'invalid project id with spaces';
      process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_123';
      process.env.STACK_SECRET_SERVER_KEY = 'sk_test_123';

      const validation = validateEnvironmentVariables();
      
      expect(validation.errors).toContain('STACK_PROJECT_ID format appears invalid (should be a UUID or similar identifier)');
    });

    it('should warn about using live keys in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.STACK_PROJECT_ID = 'test-project-id';
      process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_live_123';
      process.env.STACK_SECRET_SERVER_KEY = 'sk_live_123';

      const validation = validateEnvironmentVariables();
      
      expect(validation.warnings).toContain('Using live secret key in development environment - consider using test keys');
    });
  });

  describe('Network and Connection Issues', () => {
    it('should provide helpful message for connection timeout', async () => {
      const mockConfig: StackAuthConfig = {
        projectId: 'test-project',
        publishableClientKey: 'pk_test_123',
        secretServerKey: 'sk_test_123',
        prefix: '/handler'
      };

      // Test with very short timeout to simulate timeout
      const result = await validateStackAuthConnection(mockConfig, {
        timeout: 1, // 1ms timeout to force failure
        skipCache: true
      });

      expect(result.isValid).toBe(false);
      // Check for any timeout-related error
      const hasTimeoutError = result.errors.some(e => 
        e.includes('timeout') || e.includes('Timeout') || e.includes('timed out')
      );
      expect(hasTimeoutError).toBe(true);
      
      // Find the actual timeout error for further checks
      const timeoutError = result.errors.find(e => 
        e.includes('timeout') || e.includes('Timeout')
      );
      if (timeoutError) {
        expect(timeoutError).toContain('timeout');
      }
    });

    it('should provide helpful message for unreachable API', async () => {
      const mockConfig: StackAuthConfig = {
        projectId: 'test-project',
        publishableClientKey: 'pk_test_123',
        secretServerKey: 'sk_test_123',
        prefix: '/handler',
        baseUrl: 'https://invalid-domain-that-does-not-exist-12345.com' // Invalid domain
      };

      const result = await validateStackAuthConnection(mockConfig, {
        timeout: 5000,
        skipCache: true
      });

      expect(result.isValid).toBe(false);
      // Check for any network-related error
      const hasNetworkError = result.errors.some(e => 
        e.includes('reach') || e.includes('network') || e.includes('fetch') || e.includes('ENOTFOUND')
      );
      expect(hasNetworkError).toBe(true);
      
      // The error messages should be present somewhere in the errors
      const allErrors = result.errors.join(' ');
      expect(allErrors.toLowerCase()).toContain('api');
    });
  });

  describe('Development vs Production Error Detail', () => {
    it('should provide detailed errors in development mode', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.STACK_PROJECT_ID;
      delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
      delete process.env.STACK_SECRET_SERVER_KEY;

      const { config, validation } = tryGetConfig();
      
      expect(config).toBe(null);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      // In development, we get specific error messages
      expect(validation.errors.some(e => e.includes('required'))).toBe(true);
    });

    it('should provide minimal errors in production mode', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.STACK_PROJECT_ID;
      
      const { config, validation } = tryGetConfig();
      
      expect(config).toBe(null);
      expect(validation.isValid).toBe(false);
      // Production mode still reports errors but without detailed messages in some contexts
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Object Validation', () => {
    it('should validate configuration with all required fields', () => {
      process.env.STACK_PROJECT_ID = 'test-project-id';
      process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_123';
      process.env.STACK_SECRET_SERVER_KEY = 'sk_test_123';

      const { config, validation } = tryGetConfig();
      
      expect(config).not.toBe(null);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle invalid base URL gracefully', () => {
      process.env.STACK_PROJECT_ID = 'test-project-id';
      process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_123';
      process.env.STACK_SECRET_SERVER_KEY = 'sk_test_123';
      process.env.STACK_BASE_URL = 'not-a-valid-url';

      const { config, validation } = tryGetConfig();
      
      // Base URL validation happens in validateConfiguration
      expect(config).toBe(null);
      expect(validation.errors.some(e => e.includes('baseUrl'))).toBe(true);
    });

    it('should handle invalid prefix format', () => {
      process.env.STACK_PROJECT_ID = 'test-project-id';
      process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_123';
      process.env.STACK_SECRET_SERVER_KEY = 'sk_test_123';
      process.env.STACK_AUTH_PREFIX = 'invalid-prefix-without-slash';

      const { config, validation } = tryGetConfig();
      
      expect(config).toBe(null);
      expect(validation.errors.some(e => e.includes('prefix'))).toBe(true);
    });
  });

  describe('Actionable Next Steps', () => {
    it('should include dashboard links for missing credentials', () => {
      expect(ERROR_MESSAGES.MISSING_PROJECT_ID).toContain('https://app.stack-auth.com');
      expect(ERROR_MESSAGES.MISSING_PROJECT_ID).toContain('Copy your Project ID');
      
      expect(ERROR_MESSAGES.MISSING_PUBLISHABLE_KEY).toContain('https://app.stack-auth.com');
      expect(ERROR_MESSAGES.MISSING_PUBLISHABLE_KEY).toContain('Copy your Publishable Client Key');
      
      expect(ERROR_MESSAGES.MISSING_SECRET_KEY).toContain('https://app.stack-auth.com');
      expect(ERROR_MESSAGES.MISSING_SECRET_KEY).toContain('Keep this key secret');
    });

    it('should include troubleshooting steps for network issues', () => {
      expect(ERROR_MESSAGES.CONNECTION_TIMEOUT).toContain('Check your internet connection');
      expect(ERROR_MESSAGES.CONNECTION_TIMEOUT).toContain('https://status.stack-auth.com');
      
      expect(ERROR_MESSAGES.API_UNREACHABLE).toContain('Check internet connectivity');
      expect(ERROR_MESSAGES.API_UNREACHABLE).toContain('curl https://api.stack-auth.com/health');
    });

    it('should include fix steps for invalid credentials', () => {
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toContain('Go to your Stack Auth dashboard');
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toContain('Regenerate your Secret Server Key');
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toContain('Double-check your environment variables');
    });
  });
});