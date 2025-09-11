/**
 * Vercel Adapter Astro Configuration Fixture
 * 
 * This fixture represents an Astro configuration using the Vercel adapter
 * for serverless deployment with edge functions and API routes.
 */

import { vi } from 'vitest';
import type { AstroConfig } from 'astro';

export const astroConfigVercel: Partial<AstroConfig> = {
  root: new URL('file:///test/fixtures/vercel/'),
  srcDir: new URL('file:///test/fixtures/vercel/src/'),
  publicDir: new URL('file:///test/fixtures/vercel/public/'),
  outDir: new URL('file:///test/fixtures/vercel/.vercel/output/'),
  build: {
    format: 'directory',
    client: new URL('file:///test/fixtures/vercel/.vercel/output/static/'),
    server: new URL('file:///test/fixtures/vercel/.vercel/output/functions/'),
    assets: '_astro',
    serverEntry: '_render.js',
    redirects: true,
    inlineStylesheets: 'auto',
    split: true // Vercel benefits from split builds
  },
  server: {
    host: false,
    port: 3000,
    open: false,
    headers: {}
  },
  integrations: [],
  adapter: {
    name: '@astrojs/vercel',
    serverEntrypoint: '@astrojs/vercel/serverless',
    exports: ['default'],
    supportedAstroFeatures: {
      hybridOutput: 'stable',
      staticOutput: 'stable',
      serverOutput: 'stable',
      assets: {
        supportKind: 'stable',
        isSharpCompatible: true,
        isSquooshCompatible: true
      }
    }
  },
  output: 'server', // Vercel supports hybrid and server output
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
    },
    define: {
      'process.env.VERCEL': '"1"'
    }
  },
  experimental: {
    contentCollectionCache: false,
    serverIslands: true // Vercel supports server islands
  },
  legacy: {}
};

export const astroIntegrationContextVercel = {
  config: astroConfigVercel,
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