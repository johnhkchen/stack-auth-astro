/**
 * Astro Container Test Utilities
 * 
 * Utilities for testing with the Astro Container API to simulate
 * real Astro integration behavior and component rendering.
 */

import { vi } from 'vitest';
import type { AstroConfig, AstroIntegration } from 'astro';

// Mock Astro Container API - This would use the real one when available
export interface MockAstroContainer {
  renderToString(component: string, props?: Record<string, any>): Promise<string>;
  renderToResponse(component: string, props?: Record<string, any>): Promise<Response>;
  addClientDirective(directive: { name: string; entrypoint: string }): void;
  addRenderer(renderer: { name: string; clientEntrypoint: string; serverEntrypoint: string }): void;
  addMiddleware(middleware: { entrypoint: string; order?: 'pre' | 'post' }): void;
  injectRoute(route: { pattern: string; entrypoint: string; prerender?: boolean }): void;
  close(): Promise<void>;
}

/**
 * Creates a mock Astro container for testing
 */
export function createMockAstroContainer(): MockAstroContainer {
  const mockRenderers: any[] = [];
  const mockMiddlewares: any[] = [];
  const mockRoutes: any[] = [];
  const mockDirectives: any[] = [];

  return {
    async renderToString(component: string, props?: Record<string, any>): Promise<string> {
      // Mock rendering - would use real Astro rendering
      return `<div data-component="${component}" data-props="${JSON.stringify(props || {})}">Mock rendered component</div>`;
    },

    async renderToResponse(component: string, props?: Record<string, any>): Promise<Response> {
      const html = await this.renderToString(component, props);
      return new Response(html, {
        headers: { 'content-type': 'text/html' }
      });
    },

    addClientDirective(directive: { name: string; entrypoint: string }): void {
      mockDirectives.push(directive);
    },

    addRenderer(renderer: { name: string; clientEntrypoint: string; serverEntrypoint: string }): void {
      mockRenderers.push(renderer);
    },

    addMiddleware(middleware: { entrypoint: string; order?: 'pre' | 'post' }): void {
      mockMiddlewares.push(middleware);
    },

    injectRoute(route: { pattern: string; entrypoint: string; prerender?: boolean }): void {
      mockRoutes.push(route);
    },

    async close(): Promise<void> {
      // Cleanup mock resources
    }
  };
}

/**
 * Creates a test container with specific configuration
 */
export async function createTestContainer(config: Partial<AstroConfig> = {}) {
  const container = createMockAstroContainer();
  
  // Apply configuration to container if needed
  if (config.integrations) {
    for (const integration of config.integrations) {
      if (typeof integration === 'object' && integration.hooks) {
        // Simulate running integration hooks
        if (integration.hooks['astro:config:setup']) {
          const context = {
            config,
            command: 'dev' as const,
            isRestart: false,
            addRenderer: container.addRenderer.bind(container),
            addWatchFile: vi.fn(),
            addClientDirective: container.addClientDirective.bind(container),
            addMiddleware: container.addMiddleware.bind(container),
            addDevToolbarApp: vi.fn(),
            injectRoute: container.injectRoute.bind(container),
            injectScript: vi.fn(),
            logger: {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
              debug: vi.fn(),
              level: 'info' as const,
              label: 'test',
              fork: vi.fn()
            }
          };

          integration.hooks['astro:config:setup'](context);
        }
      }
    }
  }
  
  return container;
}

/**
 * Mock implementation of Astro's experimental Container API
 */
export class MockContainerAPI {
  private config: Partial<AstroConfig>;
  private integrations: AstroIntegration[] = [];

  constructor(config: Partial<AstroConfig> = {}) {
    this.config = config;
  }

  addIntegration(integration: AstroIntegration): void {
    this.integrations.push(integration);
  }

  async create(): Promise<MockAstroContainer> {
    const container = createMockAstroContainer();
    
    // Run integration setup hooks
    for (const integration of this.integrations) {
      if (integration.hooks?.['astro:config:setup']) {
        const context = {
          config: this.config,
          command: 'dev' as const,
          isRestart: false,
          addRenderer: vi.fn(),
          addWatchFile: vi.fn(),
          addClientDirective: vi.fn(),
          addMiddleware: vi.fn(),
          addDevToolbarApp: vi.fn(),
          injectRoute: vi.fn(),
          injectScript: vi.fn(),
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            level: 'info' as const,
            label: integration.name,
            fork: vi.fn()
          }
        };

        integration.hooks['astro:config:setup'](context);
      }
    }
    
    return container;
  }
}

/**
 * Utilities for testing component rendering with Stack Auth
 */
export const containerTestUtils = {
  /**
   * Tests that a component can be rendered without errors
   */
  async testComponentRenders(container: MockAstroContainer, component: string, props?: Record<string, any>): Promise<string> {
    const html = await container.renderToString(component, props);
    
    if (!html || html.length === 0) {
      throw new Error(`Component ${component} rendered empty content`);
    }
    
    return html;
  },

  /**
   * Tests that a component renders with expected content
   */
  async testComponentContent(container: MockAstroContainer, component: string, expectedContent: string, props?: Record<string, any>): Promise<void> {
    const html = await this.testComponentRenders(container, component, props);
    
    if (!html.includes(expectedContent)) {
      throw new Error(`Component ${component} does not contain expected content: ${expectedContent}`);
    }
  },

  /**
   * Tests that a component responds correctly
   */
  async testComponentResponse(container: MockAstroContainer, component: string, props?: Record<string, any>): Promise<Response> {
    const response = await container.renderToResponse(component, props);
    
    if (!response.ok) {
      throw new Error(`Component ${component} returned non-OK response: ${response.status}`);
    }
    
    return response;
  },

  /**
   * Mock authenticated request context
   */
  createAuthenticatedContext(user?: any, session?: any) {
    return {
      locals: {
        user: user || {
          id: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User'
        },
        session: session || {
          id: 'test-session-123',
          userId: 'test-user-123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }
      },
      request: new Request('http://localhost:3000/'),
      params: {},
      url: new URL('http://localhost:3000/')
    };
  },

  /**
   * Mock unauthenticated request context
   */
  createUnauthenticatedContext() {
    return {
      locals: {
        user: null,
        session: null
      },
      request: new Request('http://localhost:3000/'),
      params: {},
      url: new URL('http://localhost:3000/')
    };
  }
};

/**
 * Adapter-specific container utilities
 */
export const adapterTestUtils = {
  /**
   * Create container with static site generation configuration
   */
  async createStaticContainer(): Promise<MockAstroContainer> {
    return createTestContainer({
      output: 'static',
      adapter: undefined
    });
  },

  /**
   * Create container with Node.js adapter configuration
   */
  async createNodeContainer(): Promise<MockAstroContainer> {
    return createTestContainer({
      output: 'server',
      adapter: {
        name: '@astrojs/node',
        serverEntrypoint: '@astrojs/node/server.js',
        exports: ['handler']
      }
    });
  },

  /**
   * Create container with Vercel adapter configuration
   */
  async createVercelContainer(): Promise<MockAstroContainer> {
    return createTestContainer({
      output: 'server',
      adapter: {
        name: '@astrojs/vercel',
        serverEntrypoint: '@astrojs/vercel/serverless',
        exports: ['default']
      }
    });
  },

  /**
   * Create container with Cloudflare adapter configuration
   */
  async createCloudflareContainer(): Promise<MockAstroContainer> {
    return createTestContainer({
      output: 'server',
      adapter: {
        name: '@astrojs/cloudflare',
        serverEntrypoint: '@astrojs/cloudflare/server.advanced.js',
        exports: ['default']
      }
    });
  }
};

export { MockAstroContainer };