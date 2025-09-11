/**
 * Node.js Adapter Astro Configuration Fixture
 * 
 * This fixture represents an Astro configuration using the Node.js adapter
 * for server-side rendering and API routes.
 */

import { vi } from 'vitest';
import type { AstroConfig } from 'astro';

export const astroConfigNode: Partial<AstroConfig> = {
  root: new URL('file:///test/fixtures/node/'),
  srcDir: new URL('file:///test/fixtures/node/src/'),
  publicDir: new URL('file:///test/fixtures/node/public/'),
  outDir: new URL('file:///test/fixtures/node/dist/'),
  build: {
    format: 'directory',
    client: new URL('file:///test/fixtures/node/dist/client/'),
    server: new URL('file:///test/fixtures/node/dist/server/'),
    assets: '_astro',
    serverEntry: 'entry.mjs',
    redirects: true,
    inlineStylesheets: 'auto',
    split: false
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
    headers: {}
  },
  integrations: [],
  adapter: {
    name: '@astrojs/node',
    serverEntrypoint: '@astrojs/node/server.js',
    exports: ['handler']
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    },
    remarkPlugins: [],
    rehypePlugins: []
  },
  vite: {
    ssr: {
      noExternal: ['@stackframe/stack', '@stackframe/stack-ui']
    }
  },
  experimental: {
    contentCollectionCache: false,
    serverIslands: false
  },
  legacy: {}
};

export const astroIntegrationContextNode = {
  config: astroConfigNode,
  command: 'build' as const,
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
    label: 'astro-stack-auth',
    fork: vi.fn()
  }
};