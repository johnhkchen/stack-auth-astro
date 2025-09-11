/**
 * Development Environment Astro Configuration Fixture
 * 
 * This fixture represents an Astro configuration optimized for development
 * with hot module replacement and development tools.
 */

import { vi } from 'vitest';
import type { AstroConfig } from 'astro';

export const astroConfigDevelopment: Partial<AstroConfig> = {
  root: new URL('file:///test/fixtures/dev/'),
  srcDir: new URL('file:///test/fixtures/dev/src/'),
  publicDir: new URL('file:///test/fixtures/dev/public/'),
  outDir: new URL('file:///test/fixtures/dev/dist/'),
  build: {
    format: 'directory',
    client: new URL('file:///test/fixtures/dev/dist/client/'),
    server: new URL('file:///test/fixtures/dev/dist/server/'),
    assets: '_astro',
    serverEntry: 'entry.mjs',
    redirects: true,
    inlineStylesheets: 'never', // Better for development debugging
    split: false
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  integrations: [
    // Development integrations that might conflict
    {
      name: 'dev-integration',
      hooks: {
        'astro:config:setup': () => {}
      }
    }
  ],
  adapter: undefined,
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    },
    remarkPlugins: [],
    rehypePlugins: []
  },
  vite: {
    server: {
      hmr: true
    },
    optimizeDeps: {
      include: ['@stackframe/stack', '@stackframe/stack-ui']
    },
    define: {
      'import.meta.env.DEV': 'true'
    }
  },
  experimental: {
    contentCollectionCache: true, // Enabled for dev performance
    serverIslands: false,
    directRenderScript: true
  },
  legacy: {},
  // Development-specific configurations
  devToolbar: {
    enabled: true
  }
};

export const astroIntegrationContextDevelopment = {
  config: astroConfigDevelopment,
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
    level: 'debug' as const, // More verbose logging in dev
    label: 'astro-stack-auth',
    fork: vi.fn()
  }
};