/**
 * Client-side prefix discovery utilities
 * 
 * This module provides utilities for client-side code to discover
 * the configured Stack Auth prefix for API endpoints.
 */

// Cache the discovered prefix to avoid repeated lookups
let cachedPrefix: string | null = null;

/**
 * Get the configured Stack Auth prefix for API endpoints
 * 
 * This function discovers the prefix using multiple strategies:
 * 1. Cached value from previous discovery
 * 2. A meta tag added by the integration during SSR
 * 3. Environment variable (in development/build time)
 * 4. Try common prefixes by testing connectivity
 * 5. Default fallback
 * 
 * @returns The configured prefix (e.g., '/handler', '/api/auth')
 */
export function getAuthPrefix(): string {
  // Return cached value if available
  if (cachedPrefix) {
    return cachedPrefix;
  }

  // First try to get from meta tag (set by server-side integration)
  const metaElement = typeof document !== 'undefined' 
    ? document.querySelector('meta[name="stack-auth-prefix"]') 
    : null;
  
  if (metaElement) {
    const prefix = metaElement.getAttribute('content');
    if (prefix) {
      cachedPrefix = prefix;
      return prefix;
    }
  }
  
  // Try to get from build-time environment variable
  const envPrefix = typeof process !== 'undefined' && process.env?.STACK_AUTH_PREFIX;
  if (envPrefix) {
    cachedPrefix = envPrefix;
    return envPrefix;
  }
  
  // Default fallback
  const defaultPrefix = '/handler';
  cachedPrefix = defaultPrefix;
  return defaultPrefix;
}

/**
 * Auto-discover the prefix by testing common configurations
 * This is used as a fallback when other discovery methods fail
 * 
 * @returns Promise resolving to the discovered prefix
 */
export async function discoverAuthPrefix(): Promise<string> {
  const commonPrefixes = [
    '/handler',      // Default
    '/api/auth',     // Common custom prefix
    '/auth',         // Simple auth prefix
    '/stack-auth',   // Branded prefix
    '/api/stack'     // API namespace
  ];

  for (const prefix of commonPrefixes) {
    try {
      // Test if this prefix works by making a lightweight request
      const response = await fetch(`${prefix}/health`, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok || response.status === 404) {
        // 404 is also acceptable - it means the endpoint exists but health isn't implemented
        cachedPrefix = prefix;
        return prefix;
      }
    } catch {
      // Continue trying other prefixes
      continue;
    }
  }
  
  // If all else fails, return default
  const defaultPrefix = '/handler';
  cachedPrefix = defaultPrefix;
  return defaultPrefix;
}

/**
 * Clear the cached prefix - useful for testing or when configuration changes
 */
export function clearPrefixCache(): void {
  cachedPrefix = null;
}

/**
 * Build a full URL for a Stack Auth endpoint
 * 
 * @param endpoint - The endpoint path (e.g., 'signin', 'signout')
 * @param params - Optional query parameters
 * @returns Full URL for the endpoint
 */
export function buildAuthUrl(endpoint: string, params?: Record<string, string>): string {
  const prefix = getAuthPrefix();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  let url = `${prefix}/${cleanEndpoint}`;
  
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}