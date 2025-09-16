/**
 * Stack Auth SDK Connection Validation
 * 
 * Provides connection testing, credential validation, and API health checks
 * for Stack Auth integration with caching and performance monitoring.
 */

import type { 
  StackAuthConfig, 
  ConnectionValidationResult, 
  ValidationOptions,
  ConnectionCacheEntry 
} from './types.js';

// Connection validation cache
const connectionCache = new Map<string, ConnectionCacheEntry>();

// Default validation options
const DEFAULT_VALIDATION_OPTIONS: Required<ValidationOptions> = {
  validateConnection: true,
  timeout: 5000,
  skipCache: false,
  developmentMode: process.env.NODE_ENV === 'development'
};

/**
 * Validate Stack Auth SDK connection with comprehensive testing
 */
export async function validateStackAuthConnection(
  config: StackAuthConfig,
  options: ValidationOptions = {}
): Promise<ConnectionValidationResult> {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const startTime = Date.now();

  // Generate cache key
  const cacheKey = generateCacheKey(config);
  
  // Check cache first unless skipped
  if (!opts.skipCache) {
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result: ConnectionValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    responseTime: 0,
    timestamp: new Date(),
    projectExists: false,
    credentialsValid: false,
    apiReachable: false
  };

  try {
    // Test 1: Basic API reachability
    await testApiReachability(config, result, opts.timeout);
    
    // Test 2: Project validation
    await testProjectValidation(config, result, opts.timeout);
    
    // Test 3: Credential authentication
    await testCredentialValidation(config, result, opts.timeout);
    
    // Test 4: Permission checks
    await testPermissionValidation(config, result, opts.timeout);
    
    // Calculate overall validity
    result.isValid = (result.apiReachable === true) && 
                     (result.projectExists === true) && 
                     (result.credentialsValid === true) &&
                     result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  result.responseTime = Date.now() - startTime;

  // Add development mode warnings
  if (opts.developmentMode) {
    addDevelopmentModeWarnings(config, result);
  }

  // Cache successful results
  if (result.isValid && !opts.skipCache) {
    cacheResult(cacheKey, result);
  }

  return result;
}

/**
 * Test basic API reachability
 */
async function testApiReachability(
  config: StackAuthConfig, 
  result: ConnectionValidationResult,
  timeout: number
): Promise<void> {
  try {
    const baseUrl = config.baseUrl || 'https://api.stack-auth.com';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Test basic connectivity with a simple endpoint
      const response = await fetch(`${baseUrl}/v1/projects/${config.projectId}`, {
        method: 'GET',
        headers: {
          'X-Stack-Publishable-Client-Key': config.publishableClientKey,
          'X-Stack-Secret-Server-Key': config.secretServerKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      result.apiReachable = true;
      
      // Check if response indicates valid connection
      if (response.ok || response.status === 401 || response.status === 403) {
        // API is reachable (even if auth fails, that's tested separately)
        result.apiReachable = true;
      } else {
        result.warnings.push(`API responded with status ${response.status}`);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        result.errors.push(
          `🕑 Connection timeout after ${timeout}ms\n` +
          `   Possible causes:\n` +
          `   • Slow internet connection\n` +
          `   • Stack Auth API is temporarily slow\n` +
          `   • Network latency issues\n` +
          `   Try: Increasing timeout in integration options`
        );
        result.apiReachable = false;
      } else if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('ENOTFOUND'))) {
        result.errors.push(
          `🌐 Cannot reach Stack Auth API\n` +
          `   Error: ${error.message}\n` +
          `   Troubleshooting:\n` +
          `   • Check internet connection\n` +
          `   • Verify firewall settings\n` +
          `   • Test: curl https://api.stack-auth.com/health\n` +
          `   • Check proxy configuration if applicable`
        );
        result.apiReachable = false;
      } else {
        result.warnings.push(`Network test inconclusive: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.apiReachable = true; // Assume reachable for now
      }
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    result.errors.push(`Unable to reach Stack Auth API: ${error instanceof Error ? error.message : 'Network error'}`);
    result.apiReachable = false;
  }
}

/**
 * Test project ID validation
 */
async function testProjectValidation(
  config: StackAuthConfig,
  result: ConnectionValidationResult,
  timeout: number
): Promise<void> {
  if (!result.apiReachable) {
    result.errors.push('Cannot validate project - API unreachable');
    return;
  }

  try {
    const baseUrl = config.baseUrl || 'https://api.stack-auth.com';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}/v1/projects/${config.projectId}`, {
        method: 'GET',
        headers: {
          'X-Stack-Publishable-Client-Key': config.publishableClientKey,
          'X-Stack-Secret-Server-Key': config.secretServerKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data && data.id === config.projectId) {
          result.projectExists = true;
        } else {
          result.warnings.push('Project data structure unexpected');
        }
      } else if (response.status === 404) {
        result.errors.push(
          `🏗️ Project not found: '${config.projectId}'\n` +
          `   Possible issues:\n` +
          `   • Project ID is incorrect or has typos\n` +
          `   • Project was deleted\n` +
          `   • Using wrong environment (test vs production)\n` +
          `   Fix: Verify project ID in Stack Auth dashboard`
        );
      } else if (response.status === 403 || response.status === 401) {
        result.errors.push(
          `🔒 Authentication failed for project '${config.projectId}'\n` +
          `   HTTP ${response.status}: Access denied\n` +
          `   Likely causes:\n` +
          `   • Invalid or expired API keys\n` +
          `   • Keys don't match this project\n` +
          `   • Using client key instead of server key\n` +
          `   Fix: Regenerate keys in Stack Auth dashboard`
        );
      } else {
        result.warnings.push(`Could not validate project: HTTP ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        result.errors.push(
          `⏱️ Project validation timeout (${timeout}ms)\n` +
          `   The request to validate your project timed out.\n` +
          `   Try: Increasing timeout or checking network speed`
        );
      } else {
        result.warnings.push(`Could not validate project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    result.errors.push(`Project validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test credential validation
 */
async function testCredentialValidation(
  config: StackAuthConfig,
  result: ConnectionValidationResult,
  timeout: number
): Promise<void> {
  if (!result.apiReachable) {
    result.errors.push('Cannot validate credentials - API unreachable');
    return;
  }

  try {
    const baseUrl = config.baseUrl || 'https://api.stack-auth.com';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Test server key by trying to access a server-side endpoint like users
      const response = await fetch(`${baseUrl}/v1/users`, {
        method: 'GET',
        headers: {
          'X-Stack-Secret-Server-Key': config.secretServerKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      if (response.status === 200) {
        result.credentialsValid = true;
      } else if (response.status === 401) {
        result.errors.push('Invalid server credentials - check STACK_SECRET_SERVER_KEY');
      } else if (response.status === 403) {
        result.errors.push('Server key lacks required permissions');
      } else {
        result.warnings.push(`Credential validation inconclusive: HTTP ${response.status}`);
        // If we get other status codes, credentials might still be valid
        result.credentialsValid = true;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        result.errors.push(`Credential validation timeout after ${timeout}ms`);
      } else {
        result.warnings.push(`Credential validation inconclusive: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Network issues don't necessarily mean invalid credentials
        result.credentialsValid = true;
      }
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    result.errors.push(`Credential validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test permission validation
 */
async function testPermissionValidation(
  config: StackAuthConfig,
  result: ConnectionValidationResult,
  timeout: number
): Promise<void> {
  if (!result.credentialsValid) {
    return; // Skip if credentials are invalid
  }

  try {
    const baseUrl = config.baseUrl || 'https://api.stack-auth.com';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Test various permissions by checking different endpoints
      const permissionTests = [
        { name: 'Read users', endpoint: `${baseUrl}/v1/users` },
        { name: 'Read project', endpoint: `${baseUrl}/v1/projects/${config.projectId}` }
      ];

      let hasRequiredPermissions = true;
      
      for (const { name, endpoint } of permissionTests) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'X-Stack-Secret-Server-Key': config.secretServerKey,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });

          if (response.status === 403) {
            result.warnings.push(`Missing permission: ${name}`);
            hasRequiredPermissions = false;
          }
        } catch (error) {
          // Ignore network errors for permission testing
        }
      }

      if (!hasRequiredPermissions) {
        result.warnings.push('Some Stack Auth permissions may be missing - verify your project settings');
      }

    } catch (error) {
      result.warnings.push(`Permission validation inconclusive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    result.warnings.push(`Permission validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add development mode specific warnings
 */
function addDevelopmentModeWarnings(config: StackAuthConfig, result: ConnectionValidationResult): void {
  // Check for production keys in development
  if (config.secretServerKey.includes('sk_live_')) {
    result.warnings.push('Using live/production secret key in development - consider using test keys');
  }

  // Check for missing base URL in development
  if (!config.baseUrl) {
    result.warnings.push('No custom base URL configured - using Stack Auth defaults');
  }

  // Add performance warning for slow connections
  if (result.responseTime > 3000) {
    result.warnings.push(`Slow API response (${result.responseTime}ms) - this may affect user experience`);
  }
}

/**
 * Generate cache key for connection validation results
 */
function generateCacheKey(config: StackAuthConfig): string {
  // Create a hash of the sensitive config data
  const keyData = `${config.projectId}:${config.publishableClientKey}:${config.secretServerKey}:${config.baseUrl || 'default'}`;
  
  // Simple hash function for cache key (in production, consider using a proper hash)
  let hash = 0;
  for (let i = 0; i < keyData.length; i++) {
    const char = keyData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `connection_${Math.abs(hash)}`;
}

/**
 * Get cached validation result if available and not expired
 */
function getCachedResult(cacheKey: string): ConnectionValidationResult | null {
  const cached = connectionCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }

  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    connectionCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

/**
 * Cache validation result with TTL
 */
function cacheResult(cacheKey: string, result: ConnectionValidationResult): void {
  const ttl = process.env.STACK_AUTH_CACHE_TTL ? 
    parseInt(process.env.STACK_AUTH_CACHE_TTL) : 
    300000; // Default 5 minutes

  const cacheEntry: ConnectionCacheEntry = {
    result,
    timestamp: Date.now(),
    ttl
  };

  connectionCache.set(cacheKey, cacheEntry);

  // Clean up old cache entries to prevent memory leaks
  if (connectionCache.size > 100) {
    const entries = Array.from(connectionCache.entries());
    const sortedByAge = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20 entries
    for (let i = 0; i < 20; i++) {
      connectionCache.delete(sortedByAge[i][0]);
    }
  }
}

/**
 * Clear connection validation cache
 */
export function clearConnectionValidationCache(): void {
  connectionCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getConnectionValidationCacheStats(): { size: number; keys: string[] } {
  return {
    size: connectionCache.size,
    keys: Array.from(connectionCache.keys())
  };
}