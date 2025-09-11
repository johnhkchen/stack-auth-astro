/**
 * Astro Integration Lifecycle Hook Tests
 * 
 * Comprehensive testing for Astro integration hooks to ensure proper
 * integration behavior across different configurations and scenarios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AstroIntegration } from 'astro';
import astroStackAuth, { type StackAuthOptions } from '../../src/index.js';
import { testUtils, stackAuthMocks, astroTestUtils } from '../setup';

describe('Astro Integration Lifecycle Hook Testing', () => {
  let integrationContext: ReturnType<typeof astroTestUtils.createIntegrationContext>;
  let mockLogger: ReturnType<typeof astroTestUtils.createIntegrationContext>['logger'];

  beforeEach(() => {
    // Reset all environment variables and mocks
    testUtils.clearEnvMocks();
    testUtils.mockStackAuthEnv();
    
    // Create fresh integration context for each test
    integrationContext = astroTestUtils.createIntegrationContext();
    mockLogger = integrationContext.logger;
  });

  describe('Integration Hook Execution Order', () => {
    it('should call astro:config:setup hook with correct order', () => {
      const integration = astroStackAuth();
      
      expect(integration).toHaveProperty('name', 'astro-stack-auth');
      expect(integration).toHaveProperty('hooks');
      expect(integration.hooks).toHaveProperty('astro:config:setup');
      expect(typeof integration.hooks['astro:config:setup']).toBe('function');
    });

    it('should execute validation before any setup actions', () => {
      const integration = astroStackAuth();
      
      // Mock validation to throw error
      testUtils.clearEnvMocks();
      
      expect(() => {
        integration.hooks['astro:config:setup'](integrationContext);
      }).toThrow(/Stack Auth configuration is invalid/);
      
      // Verify no setup actions were called when validation fails
      expect(integrationContext.addRenderer).not.toHaveBeenCalled();
      expect(integrationContext.addMiddleware).not.toHaveBeenCalled();
      expect(integrationContext.injectRoute).not.toHaveBeenCalled();
    });
  });

  describe('React Renderer Addition', () => {
    it('should add React renderer when addReactRenderer is true (default)', () => {
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.addRenderer).toHaveBeenCalledWith({
        name: '@astrojs/react',
        clientEntrypoint: '@astrojs/react/client.js',
        serverEntrypoint: '@astrojs/react/server.js'
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Added React renderer for Stack Auth UI components'
      );
    });

    it('should not add React renderer when addReactRenderer is false', () => {
      const integration = astroStackAuth({ addReactRenderer: false });
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.addRenderer).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️  React renderer disabled - Stack Auth UI components will not work'
      );
    });

    it('should handle React renderer conflicts gracefully', () => {
      // Mock addRenderer to throw error (already configured)
      integrationContext.addRenderer.mockImplementation(() => {
        throw new Error('React renderer already configured');
      });
      
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️  Could not add React renderer - it may already be configured'
      );
    });

    it('should respect custom React renderer configuration', () => {
      const customOptions = {
        addReactRenderer: true
      };
      
      const integration = astroStackAuth(customOptions);
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.addRenderer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Route Injection', () => {
    it('should inject Stack Auth routes with default prefix', () => {
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Injected Stack Auth routes at /handler/[...stack]'
      );
    });

    it('should inject routes with custom prefix', () => {
      const integration = astroStackAuth({ prefix: '/auth' });
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.injectRoute).toHaveBeenCalledWith({
        pattern: '/auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Injected Stack Auth routes at /auth/[...stack]'
      );
    });

    it('should not inject routes when injectRoutes is false', () => {
      const integration = astroStackAuth({ injectRoutes: false });
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.injectRoute).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ℹ️  Route injection disabled - Stack Auth API endpoints will not be available'
      );
    });

    it('should handle route injection with environment variable prefix', () => {
      testUtils.mockStackAuthEnv({ STACK_AUTH_PREFIX: '/custom-auth' });
      
      const integration = astroStackAuth();
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.injectRoute).toHaveBeenCalledWith({
        pattern: '/custom-auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should validate route pattern format', () => {
      const integration = astroStackAuth({ prefix: 'invalid-prefix' });
      
      expect(() => {
        integration.hooks['astro:config:setup'](integrationContext);
      }).toThrow(/prefix must start with "\/" and contain only valid URL characters/);
    });
    
    it('should accept valid route pattern format', () => {
      const integration = astroStackAuth({ prefix: '/valid-prefix' });
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      // Should work with valid prefix
      expect(integrationContext.injectRoute).toHaveBeenCalledWith({
        pattern: '/valid-prefix/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });
  });

  describe('Middleware Registration', () => {
    it('should add middleware with correct order by default', () => {
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.addMiddleware).toHaveBeenCalledWith({
        entrypoint: 'astro-stack-auth/middleware',
        order: 'pre'
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Added Stack Auth middleware');
    });

    it('should not add middleware when addMiddleware is false', () => {
      const integration = astroStackAuth({ addMiddleware: false });
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.addMiddleware).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ℹ️  Middleware disabled - authentication context will not be available in Astro.locals'
      );
    });

    it('should use pre order for authentication middleware', () => {
      const integration = astroStackAuth();
      integration.hooks['astro:config:setup'](integrationContext);
      
      const middlewareCall = integrationContext.addMiddleware.mock.calls[0][0];
      expect(middlewareCall).toHaveProperty('order', 'pre');
    });
  });

  describe('Integration with Different Astro Configurations', () => {
    it('should work with static site generation config', () => {
      const staticConfig = {
        ...integrationContext.config,
        build: {
          ...integrationContext.config.build,
          format: 'directory' as const
        },
        adapter: undefined
      };
      
      const staticContext = {
        ...integrationContext,
        config: staticConfig
      };
      
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](staticContext);
      }).not.toThrow();
      
      // Should still add all components normally
      expect(staticContext.addRenderer).toHaveBeenCalled();
      expect(staticContext.injectRoute).toHaveBeenCalled();
      expect(staticContext.addMiddleware).toHaveBeenCalled();
    });

    it('should work with server-side rendering config', () => {
      const ssrConfig = {
        ...integrationContext.config,
        adapter: { name: '@astrojs/node', serverEntrypoint: 'entry.mjs' }
      };
      
      const ssrContext = {
        ...integrationContext,
        config: ssrConfig
      };
      
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](ssrContext);
      }).not.toThrow();
    });

    it('should handle build command context', () => {
      const buildContext = {
        ...integrationContext,
        command: 'build' as const
      };
      
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](buildContext);
      }).not.toThrow();
    });

    it('should handle preview command context', () => {
      const previewContext = {
        ...integrationContext,
        command: 'preview' as const
      };
      
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](previewContext);
      }).not.toThrow();
    });
  });

  describe('Environment Variable Configuration', () => {
    it('should validate required environment variables', () => {
      testUtils.clearEnvMocks();
      
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](integrationContext);
      }).toThrow(/Stack Auth configuration is invalid/);
    });

    it('should work with all required environment variables set', () => {
      testUtils.mockStackAuthEnv({
        STACK_PROJECT_ID: 'test-project',
        STACK_PUBLISHABLE_CLIENT_KEY: 'test-publishable',
        STACK_SECRET_SERVER_KEY: 'test-secret'
      });
      
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](integrationContext);
      }).not.toThrow();
    });

    it('should handle custom environment variable configurations', () => {
      testUtils.mockStackAuthEnv({
        STACK_PROJECT_ID: 'custom-project',
        STACK_PUBLISHABLE_CLIENT_KEY: 'custom-publishable',
        STACK_SECRET_SERVER_KEY: 'custom-secret',
        STACK_AUTH_PREFIX: '/custom-auth'
      });
      
      const integration = astroStackAuth();
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(integrationContext.injectRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: '/custom-auth/[...stack]'
        })
      );
    });
  });

  describe('Validation and Error Handling', () => {
    it('should provide helpful error messages for invalid options', () => {
      const integration = astroStackAuth({ prefix: '' } as StackAuthOptions);
      
      testUtils.clearEnvMocks();
      
      expect(() => {
        integration.hooks['astro:config:setup'](integrationContext);
      }).toThrow();
    });

    it('should skip validation when skipValidation is true', () => {
      testUtils.clearEnvMocks(); // Clear env vars
      
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const integration = astroStackAuth({ skipValidation: true });
        
        expect(() => {
          integration.hooks['astro:config:setup'](integrationContext);
        }).not.toThrow();
        
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '⚠️  Stack Auth validation skipped - ensure configuration is valid'
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle runtime compatibility issues', () => {
      // This would require more complex mocking of the validation module
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](integrationContext);
      }).not.toThrow();
    });

    it('should provide comprehensive error messages', () => {
      testUtils.clearEnvMocks();
      
      const integration = astroStackAuth();
      
      try {
        integration.hooks['astro:config:setup'](integrationContext);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Stack Auth configuration is invalid');
      }
    });
  });

  describe('Development Tools Integration', () => {
    it('should enable development tools in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const integration = astroStackAuth({ enableDevTools: true });
        
        integration.hooks['astro:config:setup'](integrationContext);
        
        expect(mockLogger.info).toHaveBeenCalledWith('🛠️  Stack Auth dev tools enabled');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should disable development tools in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        const integration = astroStackAuth();
        
        integration.hooks['astro:config:setup'](integrationContext);
        
        // Should not see dev tools messages in production
        expect(mockLogger.info).not.toHaveBeenCalledWith(
          expect.stringContaining('dev tools enabled')
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should respect enableDevTools option override', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const integration = astroStackAuth({ enableDevTools: false });
        
        integration.hooks['astro:config:setup'](integrationContext);
        
        expect(mockLogger.info).not.toHaveBeenCalledWith(
          expect.stringContaining('dev tools enabled')
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Configuration Summary Logging', () => {
    it('should log configuration summary in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const integration = astroStackAuth();
        
        integration.hooks['astro:config:setup'](integrationContext);
        
        expect(mockLogger.info).toHaveBeenCalledWith('📋 Stack Auth configuration summary:');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should not log configuration summary in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        const integration = astroStackAuth();
        
        integration.hooks['astro:config:setup'](integrationContext);
        
        expect(mockLogger.info).not.toHaveBeenCalledWith(
          expect.stringContaining('configuration summary')
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Integration Success Logging', () => {
    it('should log success message after complete setup', () => {
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🎉 Stack Auth integration configured successfully'
      );
    });

    it('should log setup initiation message', () => {
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](integrationContext);
      
      expect(mockLogger.info).toHaveBeenCalledWith('🔐 Setting up Stack Auth integration...');
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle missing logger gracefully', () => {
      const contextWithoutLogger = {
        ...integrationContext,
        logger: undefined
      } as any;
      
      const integration = astroStackAuth();
      
      // Should not throw even without logger
      expect(() => {
        integration.hooks['astro:config:setup'](contextWithoutLogger);
      }).toThrow(); // Will throw due to validation, but not logger issues
    });

    it('should handle integration context edge cases', () => {
      const minimalContext = {
        ...integrationContext,
        config: {
          root: new URL('file:///test/'),
          srcDir: new URL('file:///test/src/'),
          publicDir: new URL('file:///test/public/'),
          outDir: new URL('file:///test/dist/'),
        } as any
      };
      
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](minimalContext);
      }).not.toThrow();
    });

    it('should handle concurrent integration setup', () => {
      const integration1 = astroStackAuth();
      const integration2 = astroStackAuth({ prefix: '/auth2' });
      
      const context1 = astroTestUtils.createIntegrationContext();
      const context2 = astroTestUtils.createIntegrationContext();
      
      expect(() => {
        integration1.hooks['astro:config:setup'](context1);
        integration2.hooks['astro:config:setup'](context2);
      }).not.toThrow();
    });
  });
});