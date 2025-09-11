/**
 * Static Site Generation (SSG) Astro Configuration Fixture
 * 
 * This fixture represents a typical Astro configuration for static site generation,
 * which is the default behavior when no adapter is configured.
 */

import { vi } from 'vitest';
import type { AstroConfig } from 'astro';

export const astroConfigStatic: Partial<AstroConfig> = {
  root: new URL('file:///test/fixtures/static/'),
  srcDir: new URL('file:///test/fixtures/static/src/'),
  publicDir: new URL('file:///test/fixtures/static/public/'),
  outDir: new URL('file:///test/fixtures/static/dist/'),
  build: {
    format: 'directory',
    client: new URL('file:///test/fixtures/static/dist/client/'),
    server: new URL('file:///test/fixtures/static/dist/server/'),
    assets: '_astro',
    serverEntry: 'entry.mjs',
    redirects: true,
    inlineStylesheets: 'auto',
    split: false
  },
  server: {
    host: false,
    port: 3000,
    open: false,
    headers: {}
  },
  integrations: [],
  adapter: undefined, // No adapter = static generation
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    },
    remarkPlugins: [],
    rehypePlugins: []
  },
  vite: {},
  experimental: {
    contentCollectionCache: false
  },
  legacy: {}
};

export const astroIntegrationContextStatic = {
  config: astroConfigStatic,
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