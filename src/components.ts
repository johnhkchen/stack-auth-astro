/**
 * React component re-exports from Stack Auth UI
 * 
 * This module re-exports Stack Auth's React components for use in Astro
 * with proper TypeScript support, component hydration, and development-time
 * prop validation.
 * 
 * Note: Real Stack Auth components now imported in Sprint 004
 */

import * as React from 'react';

// Import real Stack Auth types and components
export type { User, Session, StackClientApp } from '@stackframe/stack';

// Re-export Stack Auth components
export {
  // Core auth components
  SignIn,
  SignUp,
  UserButton, 
  AccountSettings,
  StackProvider,
} from '@stackframe/stack';

// Re-export error handling types and constants from client
export { StackAuthClientError, CLIENT_ERROR_CODES } from './client.js';

// All components and types are now re-exported from the real Stack Auth packages.
// The components work seamlessly in Astro with proper hydration support.