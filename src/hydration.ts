/**
 * Server-to-client hydration utilities for Stack Auth in Astro
 * 
 * This module provides utilities for passing authentication state from
 * server-side rendering to client-side components in Astro applications.
 */

import * as React from 'react';
import type { User, Session } from '@stackframe/stack';
import type { APIContext } from 'astro';
import { getServerAuthState, createHydrationScript } from './auth-state.js';

// Hydration data structure
export interface HydrationData {
  user: User | null;
  session: Session | null;
  timestamp: number;
  islandId?: string;
}

// Options for hydration behavior
export interface HydrationConfig {
  includeUserData?: boolean;
  includeSessionData?: boolean;
  sanitizeUserData?: boolean;
  sanitizeSessionData?: boolean;
  inlineScript?: boolean;
  scriptId?: string;
  strategy?: 'immediate' | 'defer' | 'module';
}

/**
 * Extract authentication data from Astro locals for hydration
 * 
 * This function safely extracts user and session data from Astro.locals
 * and prepares it for client-side hydration.
 */
export function extractAuthDataForHydration(locals: any, config: HydrationConfig = {}): HydrationData {
  const {
    includeUserData = true,
    includeSessionData = true,
    sanitizeUserData = true,
    sanitizeSessionData = true
  } = config;
  
  const serverAuth = getServerAuthState(locals);
  
  let userData: User | null = null;
  let sessionData: Session | null = null;
  
  // Process user data
  if (includeUserData && serverAuth.user) {
    if (sanitizeUserData) {
      // Only include safe user properties for client hydration
      userData = {
        id: serverAuth.user.id,
        primaryEmail: serverAuth.user.primaryEmail,
        displayName: serverAuth.user.displayName,
        profileImageUrl: serverAuth.user.profileImageUrl,
        // Add other properties that are safe to expose to client
        ...(serverAuth.user.primaryEmailVerified !== undefined && { 
          primaryEmailVerified: serverAuth.user.primaryEmailVerified 
        }),
        ...(serverAuth.user.clientMetadata && { 
          clientMetadata: serverAuth.user.clientMetadata 
        })
      } as User;
    } else {
      userData = serverAuth.user;
    }
  }
  
  // Process session data
  if (includeSessionData && serverAuth.session) {
    if (sanitizeSessionData) {
      // Only include safe session properties for client hydration
      sessionData = serverAuth.session; // Use the actual session object
    } else {
      sessionData = serverAuth.session;
    }
  }
  
  return {
    user: userData,
    session: sessionData,
    timestamp: Date.now()
  };
}

/**
 * Create hydration script tag for Astro pages
 * 
 * This function generates a script tag that can be included in Astro pages
 * to pass authentication state to client components.
 */
export function createAuthHydrationScript(locals: any, config: HydrationConfig = {}): string {
  const hydrationData = extractAuthDataForHydration(locals, config);
  const {
    inlineScript = true,
    scriptId = 'astro-stack-auth-hydration',
    strategy = 'immediate'
  } = config;
  
  const scriptContent = `
    window.__ASTRO_STACK_AUTH__ = ${JSON.stringify(hydrationData)};
    window.__ASTRO_STACK_AUTH_READY__ = true;
    
    // Dispatch ready event for components waiting for hydration data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('astro-stack-auth-ready', {
        detail: window.__ASTRO_STACK_AUTH__
      }));
    }
  `.trim();
  
  if (inlineScript) {
    const scriptTag = strategy === 'defer' 
      ? `<script id="${scriptId}" defer>${scriptContent}</script>`
      : strategy === 'module'
      ? `<script id="${scriptId}" type="module">${scriptContent}</script>`
      : `<script id="${scriptId}">${scriptContent}</script>`;
    
    return scriptTag;
  } else {
    // For non-inline, return just the content (useful for external script files)
    return scriptContent;
  }
}

/**
 * Create hydration meta tags with authentication state
 * 
 * Alternative to script-based hydration using meta tags.
 */
export function createAuthHydrationMeta(locals: any, config: HydrationConfig = {}): string {
  const hydrationData = extractAuthDataForHydration(locals, config);
  
  const metaTags = [
    `<meta name="astro-stack-auth:user" content="${encodeURIComponent(JSON.stringify(hydrationData.user))}" />`,
    `<meta name="astro-stack-auth:session" content="${encodeURIComponent(JSON.stringify(hydrationData.session))}" />`,
    `<meta name="astro-stack-auth:timestamp" content="${hydrationData.timestamp}" />`
  ];
  
  return metaTags.join('\n');
}

/**
 * Astro component helper for auth hydration
 * 
 * This helper can be used in Astro components to easily add hydration support.
 */
export function withAuthHydration(context: APIContext, config: HydrationConfig = {}) {
  const hydrationScript = createAuthHydrationScript(context.locals, config);
  const hydrationMeta = createAuthHydrationMeta(context.locals, config);
  const hydrationData = extractAuthDataForHydration(context.locals, config);
  
  return {
    script: hydrationScript,
    meta: hydrationMeta,
    data: hydrationData,
    
    // Helper to check if user is authenticated
    isAuthenticated: !!(hydrationData.user && hydrationData.session),
    
    // Helper to get safe props for components
    getComponentProps() {
      return {
        initialUser: hydrationData.user,
        initialSession: hydrationData.session,
        isAuthenticated: !!(hydrationData.user && hydrationData.session)
      };
    },
    
    // Helper to create AstroStackProvider props
    getProviderProps(overrides: Partial<HydrationConfig> = {}) {
      return {
        initialUser: hydrationData.user,
        initialSession: hydrationData.session,
        hydrationStrategy: overrides.strategy || 'immediate',
        enableSync: true,
        syncAcrossTabs: true,
        autoRefresh: true
      };
    }
  };
}

/**
 * Client-side hydration data getter with fallbacks
 * 
 * This function can be called from client components to get hydration data
 * with multiple fallback strategies.
 */
export function getClientHydrationData(): HydrationData | null {
  if (typeof window === 'undefined') return null;
  
  // Try window global first
  try {
    const data = (window as any).__ASTRO_STACK_AUTH__;
    if (data && typeof data === 'object') {
      return data;
    }
  } catch (error) {
    console.warn('Failed to get hydration data from window:', error);
  }
  
  // Try meta tags as fallback
  try {
    const userMeta = document.querySelector('meta[name="astro-stack-auth:user"]');
    const sessionMeta = document.querySelector('meta[name="astro-stack-auth:session"]');
    const timestampMeta = document.querySelector('meta[name="astro-stack-auth:timestamp"]');
    
    if (userMeta || sessionMeta) {
      const user = userMeta ? JSON.parse(decodeURIComponent(userMeta.getAttribute('content') || '')) : null;
      const session = sessionMeta ? JSON.parse(decodeURIComponent(sessionMeta.getAttribute('content') || '')) : null;
      const timestamp = timestampMeta ? parseInt(timestampMeta.getAttribute('content') || '0') : Date.now();
      
      // Convert date strings back to Date objects if needed
      if (session && session.expiresAt && typeof session.expiresAt === 'string') {
        session.expiresAt = new Date(session.expiresAt);
      }
      if (session && session.createdAt && typeof session.createdAt === 'string') {
        session.createdAt = new Date(session.createdAt);
      }
      
      return { user, session, timestamp };
    }
  } catch (error) {
    console.warn('Failed to parse hydration data from meta tags:', error);
  }
  
  return null;
}

/**
 * Wait for hydration data to be ready
 * 
 * This function returns a promise that resolves when hydration data is available.
 */
export function waitForHydrationData(timeout = 5000): Promise<HydrationData | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    
    // Check if data is already available
    const existingData = getClientHydrationData();
    if (existingData) {
      resolve(existingData);
      return;
    }
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Hydration data not ready within ${timeout}ms`));
    }, timeout);
    
    // Listen for ready event
    function handleReady(event: CustomEvent) {
      clearTimeout(timeoutId);
      window.removeEventListener('astro-stack-auth-ready', handleReady as EventListener);
      resolve(event.detail);
    }
    
    window.addEventListener('astro-stack-auth-ready', handleReady as EventListener);
    
    // Also check periodically in case the event was missed
    const checkInterval = setInterval(() => {
      const data = getClientHydrationData();
      if (data) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        window.removeEventListener('astro-stack-auth-ready', handleReady as EventListener);
        resolve(data);
      }
    }, 100);
  });
}

/**
 * Create hydration boundary component
 * 
 * This creates a wrapper component that handles hydration boundary detection
 * for Astro islands.
 */
export function createHydrationBoundary() {
  return function HydrationBoundary({ 
    children, 
    fallback = null,
    onHydrationStart,
    onHydrationComplete,
    onHydrationError
  }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onHydrationStart?: () => void;
    onHydrationComplete?: (data: HydrationData) => void;
    onHydrationError?: (error: Error) => void;
  }) {
    const [isHydrated, setIsHydrated] = React.useState(false);
    const [hydrationData, setHydrationData] = React.useState<HydrationData | null>(null);
    const [error, setError] = React.useState<Error | null>(null);
    
    React.useEffect(() => {
      onHydrationStart?.();
      
      waitForHydrationData()
        .then((data) => {
          setHydrationData(data);
          setIsHydrated(true);
          onHydrationComplete?.(data);
        })
        .catch((err) => {
          setError(err);
          onHydrationError?.(err);
        });
    }, [onHydrationStart, onHydrationComplete, onHydrationError]);
    
    if (error) {
      console.error('Hydration boundary error:', error);
      return React.createElement(React.Fragment, null, fallback);
    }
    
    if (!isHydrated && fallback) {
      return React.createElement(React.Fragment, null, fallback);
    }
    
    return React.createElement(React.Fragment, null, children);
  };
}

// Re-export auth state utilities for convenience
export {
  getServerAuthState,
  createHydrationScript,
  getHydrationData
} from './auth-state.js';