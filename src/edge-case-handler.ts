/**
 * Edge Case Handling for Stack Auth Integration
 * 
 * This module handles browser compatibility issues, network conditions,
 * security edge cases, and other exceptional scenarios gracefully.
 */

import { StackAuthClientError, CLIENT_ERROR_CODES } from './client.js';
import { logError, getErrorMode } from './error-messages.js';

/**
 * Browser capability detection results
 */
export interface BrowserCapabilities {
  hasLocalStorage: boolean;
  hasSessionStorage: boolean;
  hasFetch: boolean;
  hasPromise: boolean;
  hasWebCrypto: boolean;
  hasIndexedDB: boolean;
  supportsModules: boolean;
  isSecureContext: boolean;
  onlineStatus: boolean;
  cookiesEnabled: boolean;
  javascriptEnabled: boolean;
  thirdPartyCookies: boolean;
}

/**
 * Network condition information
 */
export interface NetworkCondition {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Security context information
 */
export interface SecurityContext {
  isSecureContext: boolean;
  isHTTPS: boolean;
  hasCSP: boolean;
  mixedContent: boolean;
  thirdPartyRestricted: boolean;
  storageBlocked: boolean;
}

/**
 * Detect browser capabilities
 */
export function detectBrowserCapabilities(): BrowserCapabilities {
  const capabilities: BrowserCapabilities = {
    hasLocalStorage: false,
    hasSessionStorage: false,
    hasFetch: false,
    hasPromise: false,
    hasWebCrypto: false,
    hasIndexedDB: false,
    supportsModules: false,
    isSecureContext: false,
    onlineStatus: true,
    cookiesEnabled: false,
    javascriptEnabled: true, // If this runs, JS is enabled
    thirdPartyCookies: false
  };

  if (typeof window === 'undefined') {
    return capabilities;
  }

  // Local Storage
  try {
    const testKey = '__stack_auth_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    capabilities.hasLocalStorage = true;
  } catch {
    capabilities.hasLocalStorage = false;
  }

  // Session Storage
  try {
    const testKey = '__stack_auth_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    capabilities.hasSessionStorage = true;
  } catch {
    capabilities.hasSessionStorage = false;
  }

  // Fetch API
  capabilities.hasFetch = typeof fetch === 'function';

  // Promises
  capabilities.hasPromise = typeof Promise === 'function';

  // Web Crypto API
  capabilities.hasWebCrypto = typeof crypto !== 'undefined' && !!crypto.subtle;

  // IndexedDB
  capabilities.hasIndexedDB = typeof indexedDB !== 'undefined';

  // ES6 Modules
  try {
    capabilities.supportsModules = typeof Symbol !== 'undefined' && 'for' in Symbol;
  } catch {
    capabilities.supportsModules = false;
  }

  // Secure Context
  capabilities.isSecureContext = typeof isSecureContext !== 'undefined' ? isSecureContext : 
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

  // Online Status
  capabilities.onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Cookies
  try {
    document.cookie = '__stack_auth_test__=test; path=/';
    capabilities.cookiesEnabled = document.cookie.includes('__stack_auth_test__');
    // Clean up test cookie
    document.cookie = '__stack_auth_test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  } catch {
    capabilities.cookiesEnabled = false;
  }

  // Third-party cookies (simplified check)
  capabilities.thirdPartyCookies = capabilities.cookiesEnabled;

  return capabilities;
}

/**
 * Get network condition information
 */
export function getNetworkCondition(): NetworkCondition {
  const condition: NetworkCondition = {
    isOnline: true
  };

  if (typeof navigator === 'undefined') {
    return condition;
  }

  condition.isOnline = navigator.onLine;

  // Network Information API (experimental)
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;

  if (connection) {
    condition.connectionType = connection.type;
    condition.effectiveType = connection.effectiveType;
    condition.downlink = connection.downlink;
    condition.rtt = connection.rtt;
    condition.saveData = connection.saveData;
  }

  return condition;
}

/**
 * Analyze security context
 */
export function analyzeSecurityContext(): SecurityContext {
  const context: SecurityContext = {
    isSecureContext: false,
    isHTTPS: false,
    hasCSP: false,
    mixedContent: false,
    thirdPartyRestricted: false,
    storageBlocked: false
  };

  if (typeof window === 'undefined') {
    return context;
  }

  // HTTPS detection
  context.isHTTPS = window.location.protocol === 'https:';
  context.isSecureContext = typeof isSecureContext !== 'undefined' ? 
    isSecureContext : (context.isHTTPS || window.location.hostname === 'localhost');

  // CSP detection
  try {
    // Try to access meta CSP tag
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    context.hasCSP = !!cspMeta;
  } catch {
    context.hasCSP = false;
  }

  // Mixed content (HTTPS page loading HTTP resources)
  context.mixedContent = context.isHTTPS && 
    Array.from(document.querySelectorAll('script, link, img')).some(el => {
      const src = el.getAttribute('src') || el.getAttribute('href');
      return src && src.startsWith('http:');
    });

  // Storage blocked detection
  try {
    localStorage.setItem('__test__', 'test');
    localStorage.removeItem('__test__');
    context.storageBlocked = false;
  } catch {
    context.storageBlocked = true;
  }

  // Third-party restrictions (simplified)
  context.thirdPartyRestricted = context.storageBlocked;

  return context;
}

/**
 * Handle browser compatibility issues
 */
export class BrowserCompatibilityHandler {
  private capabilities: BrowserCapabilities;
  private polyfillsLoaded: Set<string> = new Set();

  constructor() {
    this.capabilities = detectBrowserCapabilities();
    this.logCompatibilityWarnings();
  }

  /**
   * Log compatibility warnings in development
   */
  private logCompatibilityWarnings(): void {
    if (getErrorMode() !== 'development') return;

    const warnings: string[] = [];

    if (!this.capabilities.hasLocalStorage) {
      warnings.push('LocalStorage not available - session persistence disabled');
    }
    if (!this.capabilities.hasFetch) {
      warnings.push('Fetch API not available - will use XMLHttpRequest fallback');
    }
    if (!this.capabilities.hasPromise) {
      warnings.push('Promises not supported - async operations may fail');
    }
    if (!this.capabilities.isSecureContext) {
      warnings.push('Not running in secure context - some features may be limited');
    }
    if (!this.capabilities.cookiesEnabled) {
      warnings.push('Cookies disabled - authentication may not work properly');
    }

    if (warnings.length > 0) {
      console.group('⚠️ Stack Auth Browser Compatibility Warnings');
      warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }
  }

  /**
   * Load polyfills for missing features
   */
  async loadPolyfills(): Promise<void> {
    const polyfillsNeeded: string[] = [];

    if (!this.capabilities.hasFetch) {
      polyfillsNeeded.push('fetch');
    }
    if (!this.capabilities.hasPromise) {
      polyfillsNeeded.push('promise');
    }

    for (const polyfill of polyfillsNeeded) {
      if (!this.polyfillsLoaded.has(polyfill)) {
        await this.loadPolyfill(polyfill);
        this.polyfillsLoaded.add(polyfill);
      }
    }
  }

  /**
   * Load individual polyfill
   */
  private async loadPolyfill(polyfill: string): Promise<void> {
    switch (polyfill) {
      case 'fetch':
        if (typeof fetch === 'undefined') {
          // Minimal fetch polyfill using XMLHttpRequest
          (window as any).fetch = this.createFetchPolyfill();
        }
        break;
      case 'promise':
        if (typeof Promise === 'undefined') {
          throw new StackAuthClientError(
            'Promises are required but not supported by this browser',
            'SECURITY_ERROR',
            'Please upgrade your browser or use a Promise polyfill'
          );
        }
        break;
    }
  }

  /**
   * Create minimal fetch polyfill
   */
  private createFetchPolyfill() {
    return function(url: string, options: RequestInit = {}): Promise<Response> {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const method = options.method || 'GET';
        
        xhr.open(method, url);
        
        // Set headers
        if (options.headers) {
          const headers = options.headers as Record<string, string>;
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }

        // Handle credentials
        if (options.credentials === 'include' || options.credentials === 'same-origin') {
          xhr.withCredentials = true;
        }

        xhr.onload = () => {
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Map(), // Simplified headers
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            text: () => Promise.resolve(xhr.responseText)
          } as any;
          resolve(response);
        };

        xhr.onerror = () => {
          reject(new Error('Network error'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Request timeout'));
        };

        // Send request - convert body to proper XMLHttpRequest format
        let body: Document | XMLHttpRequestBodyInit | null = null;
        if (options.body) {
          if (typeof options.body === 'string' || 
              options.body instanceof FormData || 
              options.body instanceof ArrayBuffer ||
              options.body instanceof Blob) {
            body = options.body as XMLHttpRequestBodyInit;
          } else if (options.body instanceof ReadableStream) {
            // For ReadableStream, we need to read and convert to string
            // This is a fallback scenario, so we can be conservative
            console.warn('ReadableStream body not supported in XHR fallback, converting to string');
            body = '[Stream]'; // Simple fallback
          } else {
            // Handle other BodyInit types by converting to string
            body = String(options.body);
          }
        }
        xhr.send(body);
      });
    };
  }

  /**
   * Create fallback storage when localStorage is unavailable
   */
  createFallbackStorage(): Storage {
    if (this.capabilities.hasSessionStorage) {
      return sessionStorage;
    }

    // In-memory storage fallback
    const storage = new Map<string, string>();
    
    return {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      key: (index: number) => Array.from(storage.keys())[index] || null,
      get length() { return storage.size; }
    } as Storage;
  }

  /**
   * Check if authentication features are available
   */
  canUseAuthentication(): { canUse: boolean; limitations: string[] } {
    const limitations: string[] = [];

    if (!this.capabilities.isSecureContext) {
      limitations.push('Secure context required for full authentication features');
    }
    if (!this.capabilities.cookiesEnabled) {
      limitations.push('Cookies required for session management');
    }
    if (!this.capabilities.hasLocalStorage) {
      limitations.push('Local storage unavailable - session persistence limited');
    }
    if (!this.capabilities.onlineStatus) {
      limitations.push('Offline mode - authentication features unavailable');
    }

    const canUse = limitations.length === 0;
    return { canUse, limitations };
  }
}

/**
 * Handle network condition changes
 */
export class NetworkConditionHandler {
  private listeners: Array<(condition: NetworkCondition) => void> = [];
  private currentCondition: NetworkCondition;

  constructor() {
    this.currentCondition = getNetworkCondition();
    this.setupListeners();
  }

  /**
   * Setup network condition listeners
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    // Online/offline events
    window.addEventListener('online', () => {
      this.currentCondition = getNetworkCondition();
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.currentCondition = getNetworkCondition();
      this.notifyListeners();
    });

    // Network Information API changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.currentCondition = getNetworkCondition();
        this.notifyListeners();
      });
    }
  }

  /**
   * Notify all listeners of condition changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentCondition);
      } catch (error) {
        console.error('Error in network condition listener:', error);
      }
    });
  }

  /**
   * Subscribe to network condition changes
   */
  subscribe(listener: (condition: NetworkCondition) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current network condition
   */
  getCurrentCondition(): NetworkCondition {
    return this.currentCondition;
  }

  /**
   * Check if network is suitable for authentication
   */
  canPerformAuthentication(): boolean {
    return this.currentCondition.isOnline;
  }

  /**
   * Get recommended retry delay based on network condition
   */
  getRetryDelay(): number {
    if (!this.currentCondition.isOnline) {
      return 10000; // 10 seconds when offline
    }

    // Adjust delay based on connection quality
    if (this.currentCondition.saveData) {
      return 5000; // 5 seconds for data saver mode
    }

    if (this.currentCondition.effectiveType) {
      switch (this.currentCondition.effectiveType) {
        case 'slow-2g': return 8000;
        case '2g': return 5000;
        case '3g': return 3000;
        case '4g': return 1000;
        default: return 2000;
      }
    }

    return 2000; // Default 2 seconds
  }
}

/**
 * Global instances for easy access
 */
let browserHandler: BrowserCompatibilityHandler | null = null;
let networkHandler: NetworkConditionHandler | null = null;

/**
 * Get browser compatibility handler instance
 */
export function getBrowserHandler(): BrowserCompatibilityHandler {
  if (!browserHandler) {
    browserHandler = new BrowserCompatibilityHandler();
  }
  return browserHandler;
}

/**
 * Get network condition handler instance
 */
export function getNetworkHandler(): NetworkConditionHandler {
  if (!networkHandler) {
    networkHandler = new NetworkConditionHandler();
  }
  return networkHandler;
}

/**
 * Perform comprehensive environment check
 */
export function performEnvironmentCheck(): {
  compatible: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
} {
  const browserHandler = getBrowserHandler();
  const networkCondition = getNetworkHandler().getCurrentCondition();
  const securityContext = analyzeSecurityContext();
  
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  // Check critical requirements
  const authCheck = browserHandler.canUseAuthentication();
  if (!authCheck.canUse) {
    errors.push(...authCheck.limitations);
  }

  // Security warnings
  if (!securityContext.isSecureContext) {
    warnings.push('Running in insecure context - some features may be limited');
    recommendations.push('Use HTTPS in production for full security features');
  }

  if (securityContext.mixedContent) {
    warnings.push('Mixed content detected - may cause security issues');
    recommendations.push('Ensure all resources are loaded over HTTPS');
  }

  // Network warnings
  if (!networkCondition.isOnline) {
    warnings.push('Currently offline - authentication unavailable');
    recommendations.push('Connect to the internet to use authentication features');
  }

  // Browser capability warnings
  const capabilities = detectBrowserCapabilities();
  if (!capabilities.hasLocalStorage) {
    warnings.push('LocalStorage unavailable - session persistence limited');
    recommendations.push('Enable localStorage or disable private browsing for better experience');
  }

  const compatible = errors.length === 0;

  return {
    compatible,
    warnings,
    errors,
    recommendations
  };
}

/**
 * Initialize edge case handling
 */
export function initializeEdgeCaseHandling(): void {
  // Initialize handlers
  getBrowserHandler();
  getNetworkHandler();

  // Load polyfills in development
  if (getErrorMode() === 'development') {
    getBrowserHandler().loadPolyfills().catch(error => {
      console.error('Failed to load polyfills:', error);
    });
  }

  // Perform initial environment check
  const envCheck = performEnvironmentCheck();
  if (!envCheck.compatible || envCheck.warnings.length > 0) {
    if (getErrorMode() === 'development') {
      console.group('🔍 Stack Auth Environment Check');
      if (!envCheck.compatible) {
        console.error('❌ Critical issues found:');
        envCheck.errors.forEach(error => console.error(`  • ${error}`));
      }
      if (envCheck.warnings.length > 0) {
        console.warn('⚠️ Warnings:');
        envCheck.warnings.forEach(warning => console.warn(`  • ${warning}`));
      }
      if (envCheck.recommendations.length > 0) {
        console.info('💡 Recommendations:');
        envCheck.recommendations.forEach(rec => console.info(`  • ${rec}`));
      }
      console.groupEnd();
    }
  }
}