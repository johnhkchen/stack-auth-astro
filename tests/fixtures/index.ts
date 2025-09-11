/**
 * Test Fixtures Index
 * 
 * Exports all Astro configuration fixtures for testing different
 * deployment scenarios and adapter configurations.
 */

import { vi } from 'vitest';

// Import all configuration fixtures
export { astroConfigStatic, astroIntegrationContextStatic } from './astro-config-static.js';
export { astroConfigNode, astroIntegrationContextNode } from './astro-config-node.js';
export { astroConfigVercel, astroIntegrationContextVercel } from './astro-config-vercel.js';
export { astroConfigCloudflare, astroIntegrationContextCloudflare } from './astro-config-cloudflare.js';
export { astroConfigDevelopment, astroIntegrationContextDevelopment } from './astro-config-development.js';

// Global vi import to ensure it's available in fixture files
declare global {
  const vi: typeof import('vitest').vi;
}

// Make vi globally available for fixture files
(globalThis as any).vi = vi;