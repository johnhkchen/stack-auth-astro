/**
 * Custom Prefix Integration Tests
 * 
 * Tests to verify that custom authentication endpoint prefixes work
 * throughout the entire system including client-side functions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testUtils, astroTestUtils } from '../setup';
import astroStackAuth from '../../src/index';
import { getAuthPrefix, buildAuthUrl, clearPrefixCache } from '../../src/client/prefix';

describe('Custom Prefix Integration', () => {
  beforeEach(() => {
    testUtils.mockStackAuthEnv();
    clearPrefixCache(); // Clear any cached prefix from previous tests
    vi.clearAllMocks();
  });

  describe('Integration Setup', () => {
    it('should inject routes at custom prefix when configured', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const customPrefix = '/api/auth';
      const integration = astroStackAuth({ prefix: customPrefix });

      // Execute the integration hook
      await integration.hooks['astro:config:setup']!(context);

      // Verify injectRoute was called with custom prefix
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: `${customPrefix}/[...stack]`,
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should use environment variable prefix when no option provided', async () => {
      testUtils.mockStackAuthEnv({ STACK_AUTH_PREFIX: '/custom-env' });
      
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth(); // No prefix option

      // Execute the integration hook
      await integration.hooks['astro:config:setup']!(context);

      // Verify injectRoute was called with environment variable prefix
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/custom-env/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should use default prefix when no configuration provided', async () => {
      // Ensure no environment variable is set
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      delete process.env.STACK_AUTH_PREFIX;
      
      try {
        const context = astroTestUtils.createIntegrationContext();
        const integration = astroStackAuth(); // No prefix option or env var

        // Execute the integration hook
        await integration.hooks['astro:config:setup']!(context);

        // Verify injectRoute was called with default prefix
        expect(context.injectRoute).toHaveBeenCalledWith({
          pattern: '/handler/[...stack]',
          entrypoint: 'astro-stack-auth/api/handler',
          prerender: false
        });
      } finally {
        // Restore environment
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        }
      }
    });
  });

  describe('Client-side Prefix Discovery', () => {
    it('should return default prefix when no configuration available', () => {
      // Clear any environment variables that might affect the test
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      delete process.env.STACK_AUTH_PREFIX;
      
      try {
        const prefix = getAuthPrefix();
        expect(prefix).toBe('/handler');
      } finally {
        // Restore environment
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        }
      }
    });

    it('should return environment variable prefix when available', () => {
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      process.env.STACK_AUTH_PREFIX = '/api/custom';
      
      try {
        clearPrefixCache();
        const prefix = getAuthPrefix();
        expect(prefix).toBe('/api/custom');
      } finally {
        // Restore environment
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        } else {
          delete process.env.STACK_AUTH_PREFIX;
        }
      }
    });

    it('should cache the discovered prefix', () => {
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      process.env.STACK_AUTH_PREFIX = '/cached-test';
      
      try {
        clearPrefixCache();
        
        // First call should discover and cache
        const prefix1 = getAuthPrefix();
        expect(prefix1).toBe('/cached-test');
        
        // Change environment but cache should still return original
        process.env.STACK_AUTH_PREFIX = '/changed';
        const prefix2 = getAuthPrefix();
        expect(prefix2).toBe('/cached-test'); // Should be cached value
        
      } finally {
        // Restore environment
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        } else {
          delete process.env.STACK_AUTH_PREFIX;
        }
        clearPrefixCache();
      }
    });
  });

  describe('URL Building Utilities', () => {
    it('should build correct URLs with custom prefix', () => {
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      process.env.STACK_AUTH_PREFIX = '/api/auth';
      
      try {
        clearPrefixCache();
        
        const signInUrl = buildAuthUrl('signin');
        expect(signInUrl).toBe('/api/auth/signin');
        
        const signOutUrl = buildAuthUrl('signout');
        expect(signOutUrl).toBe('/api/auth/signout');
        
      } finally {
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        } else {
          delete process.env.STACK_AUTH_PREFIX;
        }
        clearPrefixCache();
      }
    });

    it('should build URLs with query parameters', () => {
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      process.env.STACK_AUTH_PREFIX = '/auth';
      
      try {
        clearPrefixCache();
        
        const urlWithParams = buildAuthUrl('signin', { 
          redirectTo: '/dashboard',
          provider: 'google'
        });
        
        expect(urlWithParams).toBe('/auth/signin?redirectTo=%2Fdashboard&provider=google');
        
      } finally {
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        } else {
          delete process.env.STACK_AUTH_PREFIX;
        }
        clearPrefixCache();
      }
    });

    it('should handle endpoint paths with leading slashes', () => {
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      process.env.STACK_AUTH_PREFIX = '/custom';
      
      try {
        clearPrefixCache();
        
        const url1 = buildAuthUrl('signin');
        const url2 = buildAuthUrl('/signin');
        
        expect(url1).toBe('/custom/signin');
        expect(url2).toBe('/custom/signin'); // Should handle leading slash
        
      } finally {
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        } else {
          delete process.env.STACK_AUTH_PREFIX;
        }
        clearPrefixCache();
      }
    });
  });

  describe('Acceptance Criteria Validation', () => {
    it('should allow configuring prefix option in integration config', async () => {
      const customPrefix = '/api/auth';
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth({ prefix: customPrefix });

      await integration.hooks['astro:config:setup']!(context);

      // Verify the custom prefix is used
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: `${customPrefix}/[...stack]`,
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should ensure default behavior unchanged when no prefix specified', async () => {
      const context = astroTestUtils.createIntegrationContext();
      const integration = astroStackAuth({});

      await integration.hooks['astro:config:setup']!(context);

      // Verify default prefix is used
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should demonstrate client-side functions automatically use custom prefix', () => {
      const originalEnv = process.env.STACK_AUTH_PREFIX;
      process.env.STACK_AUTH_PREFIX = '/api/auth';
      
      try {
        clearPrefixCache();
        
        // Test that client utility functions use the custom prefix
        const prefix = getAuthPrefix();
        expect(prefix).toBe('/api/auth');
        
        const signInUrl = buildAuthUrl('signin', { redirectTo: '/dashboard' });
        expect(signInUrl).toBe('/api/auth/signin?redirectTo=%2Fdashboard');
        
      } finally {
        if (originalEnv) {
          process.env.STACK_AUTH_PREFIX = originalEnv;
        } else {
          delete process.env.STACK_AUTH_PREFIX;
        }
        clearPrefixCache();
      }
    });
  });
});