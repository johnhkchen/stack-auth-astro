/**
 * Adapter Compatibility Tests
 * 
 * Tests to ensure Stack Auth integration works correctly across different
 * Astro adapters and deployment scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import astroStackAuth from '../../src/index.js';
import { testUtils } from '../setup';
import {
  astroIntegrationContextStatic,
  astroIntegrationContextNode,
  astroIntegrationContextVercel,
  astroIntegrationContextCloudflare,
  astroIntegrationContextDevelopment
} from '../fixtures/index.js';
import { adapterTestUtils } from '../utils/astro-container.js';

// Import fixtures with vi for mocking
import { vi } from 'vitest';

describe('Adapter Compatibility Tests', () => {
  beforeEach(() => {
    testUtils.clearEnvMocks();
    testUtils.mockStackAuthEnv();
  });

  describe('Static Site Generation (SSG)', () => {
    it('should work with static site generation configuration', () => {
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](astroIntegrationContextStatic);
      }).not.toThrow();
      
      // Verify all components are added for static sites
      expect(astroIntegrationContextStatic.addRenderer).toHaveBeenCalledWith({
        name: '@astrojs/react',
        clientEntrypoint: '@astrojs/react/client.js',
        serverEntrypoint: '@astrojs/react/server.js'
      });
      
      expect(astroIntegrationContextStatic.injectRoute).toHaveBeenCalledWith({
        pattern: '/handler/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
      
      expect(astroIntegrationContextStatic.addMiddleware).toHaveBeenCalledWith({
        entrypoint: 'astro-stack-auth/middleware',
        order: 'pre'
      });
    });

    it('should handle static generation with custom prefix', () => {
      const integration = astroStackAuth({ prefix: '/auth' });
      
      integration.hooks['astro:config:setup'](astroIntegrationContextStatic);
      
      expect(astroIntegrationContextStatic.injectRoute).toHaveBeenCalledWith({
        pattern: '/auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should work with static container API', async () => {
      const container = await adapterTestUtils.createStaticContainer();
      
      expect(container).toBeDefined();
      expect(typeof container.renderToString).toBe('function');
      expect(typeof container.renderToResponse).toBe('function');
    });
  });

  describe('Node.js Adapter', () => {
    it('should work with Node.js adapter configuration', () => {
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](astroIntegrationContextNode);
      }).not.toThrow();
      
      // Verify all server-side features work
      expect(astroIntegrationContextNode.addRenderer).toHaveBeenCalled();
      expect(astroIntegrationContextNode.injectRoute).toHaveBeenCalled();
      expect(astroIntegrationContextNode.addMiddleware).toHaveBeenCalled();
    });

    it('should handle Node.js specific server configuration', () => {
      const integration = astroStackAuth({
        prefix: '/api/auth',
        addReactRenderer: true,
        addMiddleware: true
      });
      
      integration.hooks['astro:config:setup'](astroIntegrationContextNode);
      
      expect(astroIntegrationContextNode.injectRoute).toHaveBeenCalledWith({
        pattern: '/api/auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should work with Node.js container API', async () => {
      const container = await adapterTestUtils.createNodeContainer();
      
      expect(container).toBeDefined();
      expect(typeof container.renderToString).toBe('function');
      expect(typeof container.renderToResponse).toBe('function');
    });

    it('should handle Node.js middleware order correctly', () => {
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](astroIntegrationContextNode);
      
      const middlewareCall = astroIntegrationContextNode.addMiddleware.mock.calls[0][0];
      expect(middlewareCall).toHaveProperty('order', 'pre');
    });
  });

  describe('Vercel Adapter', () => {
    it('should work with Vercel adapter configuration', () => {
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](astroIntegrationContextVercel);
      }).not.toThrow();
      
      // Verify serverless compatibility
      expect(astroIntegrationContextVercel.addRenderer).toHaveBeenCalled();
      expect(astroIntegrationContextVercel.injectRoute).toHaveBeenCalled();
      expect(astroIntegrationContextVercel.addMiddleware).toHaveBeenCalled();
    });

    it('should handle Vercel edge functions configuration', () => {
      const integration = astroStackAuth({
        prefix: '/api/stack-auth',
        addReactRenderer: true
      });
      
      integration.hooks['astro:config:setup'](astroIntegrationContextVercel);
      
      expect(astroIntegrationContextVercel.injectRoute).toHaveBeenCalledWith({
        pattern: '/api/stack-auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should work with Vercel container API', async () => {
      const container = await adapterTestUtils.createVercelContainer();
      
      expect(container).toBeDefined();
      expect(typeof container.renderToString).toBe('function');
      expect(typeof container.renderToResponse).toBe('function');
    });

    it('should handle Vercel serverless constraints', () => {
      // Test that integration doesn't add incompatible features
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](astroIntegrationContextVercel);
      
      // Should not throw and should configure correctly
      expect(astroIntegrationContextVercel.logger.info).toHaveBeenCalledWith(
        '🎉 Stack Auth integration configured successfully'
      );
    });
  });

  describe('Cloudflare Adapter', () => {
    it('should work with Cloudflare adapter configuration', () => {
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](astroIntegrationContextCloudflare);
      }).not.toThrow();
      
      // Verify Workers compatibility
      expect(astroIntegrationContextCloudflare.addRenderer).toHaveBeenCalled();
      expect(astroIntegrationContextCloudflare.injectRoute).toHaveBeenCalled();
      expect(astroIntegrationContextCloudflare.addMiddleware).toHaveBeenCalled();
    });

    it('should handle Cloudflare Workers environment', () => {
      const integration = astroStackAuth({
        prefix: '/cf-auth',
        addReactRenderer: true
      });
      
      integration.hooks['astro:config:setup'](astroIntegrationContextCloudflare);
      
      expect(astroIntegrationContextCloudflare.injectRoute).toHaveBeenCalledWith({
        pattern: '/cf-auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
    });

    it('should work with Cloudflare container API', async () => {
      const container = await adapterTestUtils.createCloudflareContainer();
      
      expect(container).toBeDefined();
      expect(typeof container.renderToString).toBe('function');
      expect(typeof container.renderToResponse).toBe('function');
    });

    it('should handle Cloudflare Workers runtime constraints', () => {
      // Cloudflare Workers have specific limitations
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](astroIntegrationContextCloudflare);
      
      // Should configure correctly despite runtime constraints
      expect(astroIntegrationContextCloudflare.logger.info).toHaveBeenCalledWith(
        '✅ Added Stack Auth middleware'
      );
    });
  });

  describe('Development Environment', () => {
    it('should work with development configuration', () => {
      const integration = astroStackAuth({ enableDevTools: true });
      
      // Set development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        expect(() => {
          integration.hooks['astro:config:setup'](astroIntegrationContextDevelopment);
        }).not.toThrow();
        
        expect(astroIntegrationContextDevelopment.logger.info).toHaveBeenCalledWith(
          '🛠️  Stack Auth dev tools enabled'
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle development server configuration', () => {
      const integration = astroStackAuth();
      
      integration.hooks['astro:config:setup'](astroIntegrationContextDevelopment);
      
      // Should work with HMR and development features
      expect(astroIntegrationContextDevelopment.addRenderer).toHaveBeenCalled();
      expect(astroIntegrationContextDevelopment.injectRoute).toHaveBeenCalled();
    });

    it('should handle development with conflicting integrations', () => {
      // Development config has a mock integration that might conflict
      const integration = astroStackAuth();
      
      expect(() => {
        integration.hooks['astro:config:setup'](astroIntegrationContextDevelopment);
      }).not.toThrow();
    });
  });

  describe('Cross-Adapter Configuration Consistency', () => {
    const adapters = [
      { name: 'Static', context: astroIntegrationContextStatic },
      { name: 'Node.js', context: astroIntegrationContextNode },
      { name: 'Vercel', context: astroIntegrationContextVercel },
      { name: 'Cloudflare', context: astroIntegrationContextCloudflare }
    ];

    it.each(adapters)('should configure consistently across $name adapter', ({ context }) => {
      const integration = astroStackAuth({
        prefix: '/auth',
        addReactRenderer: true,
        addMiddleware: true
      });
      
      integration.hooks['astro:config:setup'](context);
      
      // All adapters should get the same basic configuration
      expect(context.addRenderer).toHaveBeenCalledWith({
        name: '@astrojs/react',
        clientEntrypoint: '@astrojs/react/client.js',
        serverEntrypoint: '@astrojs/react/server.js'
      });
      
      expect(context.injectRoute).toHaveBeenCalledWith({
        pattern: '/auth/[...stack]',
        entrypoint: 'astro-stack-auth/api/handler',
        prerender: false
      });
      
      expect(context.addMiddleware).toHaveBeenCalledWith({
        entrypoint: 'astro-stack-auth/middleware',
        order: 'pre'
      });
    });

    it.each(adapters)('should handle custom options consistently across $name adapter', ({ context }) => {
      const integration = astroStackAuth({
        prefix: '/custom',
        addReactRenderer: false,
        addMiddleware: false,
        injectRoutes: false
      });
      
      integration.hooks['astro:config:setup'](context);
      
      // All adapters should respect disabled options
      expect(context.addRenderer).not.toHaveBeenCalled();
      expect(context.addMiddleware).not.toHaveBeenCalled();
      expect(context.injectRoute).not.toHaveBeenCalled();
    });
  });

  describe('Deployment Scenario Testing', () => {
    it('should handle production build scenarios', () => {
      const adapters = [
        astroIntegrationContextStatic,
        astroIntegrationContextNode,
        astroIntegrationContextVercel,
        astroIntegrationContextCloudflare
      ];
      
      // Set production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        for (const context of adapters) {
          const integration = astroStackAuth();
          
          expect(() => {
            integration.hooks['astro:config:setup'](context);
          }).not.toThrow();
          
          // Should not enable dev tools in production
          expect(context.logger.info).not.toHaveBeenCalledWith(
            expect.stringContaining('dev tools enabled')
          );
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle preview deployment scenarios', () => {
      const previewContexts = [
        { ...astroIntegrationContextNode, command: 'preview' as const },
        { ...astroIntegrationContextVercel, command: 'preview' as const }
      ];
      
      for (const context of previewContexts) {
        const integration = astroStackAuth();
        
        expect(() => {
          integration.hooks['astro:config:setup'](context);
        }).not.toThrow();
      }
    });

    it('should handle edge runtime deployments', () => {
      // Test with Vercel and Cloudflare which support edge runtimes
      const edgeContexts = [astroIntegrationContextVercel, astroIntegrationContextCloudflare];
      
      for (const context of edgeContexts) {
        const integration = astroStackAuth();
        
        integration.hooks['astro:config:setup'](context);
        
        // Should configure correctly for edge runtime
        expect(context.logger.info).toHaveBeenCalledWith(
          '🎉 Stack Auth integration configured successfully'
        );
      }
    });
  });
});