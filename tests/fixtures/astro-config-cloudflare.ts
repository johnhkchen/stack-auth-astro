/**
 * Cloudflare Adapter Astro Configuration Fixture
 * 
 * This fixture represents an Astro configuration using the Cloudflare adapter
 * for Cloudflare Pages and Workers deployment.
 */

import { vi } from 'vitest';
import type { AstroConfig } from 'astro';

export const astroConfigCloudflare: Partial<AstroConfig> = {
  root: new URL('file:///test/fixtures/cloudflare/'),
  srcDir: new URL('file:///test/fixtures/cloudflare/src/'),
  publicDir: new URL('file:///test/fixtures/cloudflare/public/'),
  outDir: new URL('file:///test/fixtures/cloudflare/dist/'),
  build: {
    format: 'directory',
    client: new URL('file:///test/fixtures/cloudflare/dist/'),
    server: new URL('file:///test/fixtures/cloudflare/dist/_worker.js/'),
    assets: '_astro',
    serverEntry: '_worker.js',
    redirects: true,
    inlineStylesheets: 'always', // Better for edge workers
    split: false
  },
  server: {
    host: false,
    port: 3000,
    open: false,
    headers: {}
  },
  integrations: [],
  adapter: {
    name: '@astrojs/cloudflare',
    serverEntrypoint: '@astrojs/cloudflare/server.advanced.js',
    exports: ['default'],
    supportedAstroFeatures: {
      hybridOutput: 'stable',
      staticOutput: 'stable',
      serverOutput: 'stable',
      assets: {
        supportKind: 'stable',
        isSharpCompatible: false, // Cloudflare doesn't support Sharp
        isSquooshCompatible: true
      }
    }
  },
  output: 'server',
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    },
    remarkPlugins: [],
    rehypePlugins: []
  },
  vite: {
    ssr: {
      noExternal: ['@stackframe/stack', '@stackframe/stack-ui'],
      // Cloudflare Workers have specific requirements
      target: 'webworker'
    },
    define: {
      'process.env.CLOUDFLARE': '"1"'
    }
  },
  experimental: {
    contentCollectionCache: false,
    serverIslands: false // Not supported on Cloudflare Workers
  },
  legacy: {}
};

export const astroIntegrationContextCloudflare = {
  config: astroConfigCloudflare,
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