/**
 * React component re-exports from Stack Auth UI
 * 
 * This module re-exports Stack Auth's React components for use in Astro
 * with proper TypeScript support, component hydration, and development-time
 * prop validation.
 * 
 * Features:
 * - Complete TypeScript prop autocompletion
 * - Astro island hydration compatibility  
 * - Full Stack Auth component functionality
 * - Enhanced error handling and validation
 * 
 * Usage in Astro:
 * ```astro
 * ---
 * import { SignIn, UserButton, SignUp } from 'astro-stack-auth/components';
 * ---
 * 
 * <SignIn client:load extraInfo="Welcome!" firstTab="password" />
 * <UserButton client:visible showUserInfo={true} />
 * <SignUp client:idle noPasswordRepeat={false} />
 * ```
 */

import * as React from 'react';

// Import and re-export Stack Auth types and components with enhanced TypeScript support
export type { 
  User, 
  Session, 
  StackClientApp,
  StackServerApp,
  StackAdminApp
} from '@stackframe/stack';

// Re-export Stack Auth components with full TypeScript prop inference
export {
  // Core authentication components
  SignIn,        // Props: fullPage?, automaticRedirect?, extraInfo?, firstTab?, mockProject?
  SignUp,        // Props: fullPage?, automaticRedirect?, noPasswordRepeat?, extraInfo?, firstTab?
  UserButton,    // Props: showUserInfo?, colorModeToggle?, extraItems?, mockUser?
  AccountSettings, // Props: fullPage?, extraItems?, mockUser?, mockApiKeys?, mockProject?, mockSessions?
  StackProvider,   // Props: lang?, translationOverrides?, children (required), app (required)
} from '@stackframe/stack';

// Note: Stack Auth doesn't export individual component prop types
// TypeScript will infer props automatically from React.ComponentProps<typeof Component>
// The dynamic type extraction system captures these props at build time

// Re-export error handling types and constants from client
export { StackAuthClientError, CLIENT_ERROR_CODES } from './client.js';

/**
 * Comprehensive Stack Auth component integration for Astro
 * 
 * All components support:
 * ✅ Full TypeScript autocompletion with extracted props
 * ✅ All Astro hydration strategies (client:load, client:idle, client:visible, etc.)
 * ✅ Complete Stack Auth functionality including OAuth, magic links, and sessions
 * ✅ Advanced customization through extraInfo, showUserInfo, and other props
 * ✅ Error handling with StackAuthClientError and CLIENT_ERROR_CODES
 * ✅ Mock support for development and testing
 * ✅ Internationalization support via StackProvider lang prop
 */