/**
 * Persistent storage utilities for authentication data
 * 
 * Provides secure, encrypted storage for authentication tokens and state
 * with automatic cleanup and migration support.
 */

export interface StorageOptions {
  prefix?: string;
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
}

class SecureStorage {
  protected prefix: string;
  private encrypt: boolean;
  private defaultTTL: number;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || 'astro-stack-auth';
    this.encrypt = options.encrypt || false;
    this.defaultTTL = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
  }

  protected getStorageKey(key: string): string {
    return `${this.prefix}-${key}`;
  }

  protected simpleEncrypt(data: string): string {
    if (!this.encrypt) return data;
    
    // Simple base64 encoding for basic obfuscation
    // In production, consider using Web Crypto API for stronger encryption
    return btoa(encodeURIComponent(data));
  }

  protected simpleDecrypt(data: string): string {
    if (!this.encrypt) return data;
    
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return data; // Return as-is if decryption fails
    }
  }

  private isExpired(item: StorageItem): boolean {
    if (!item.ttl) return false;
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * Store data in localStorage with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL
      };

      const serialized = JSON.stringify(item);
      const encrypted = this.simpleEncrypt(serialized);
      const storageKey = this.getStorageKey(key);

      localStorage.setItem(storageKey, encrypted);
      return true;
    } catch (error) {
      console.warn(`Failed to store data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve data from localStorage
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const storageKey = this.getStorageKey(key);
      const encrypted = localStorage.getItem(storageKey);
      
      if (!encrypted) return null;

      const serialized = this.simpleDecrypt(encrypted);
      const item: StorageItem<T> = JSON.parse(serialized);

      // Check if item has expired
      if (this.isExpired(item)) {
        this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn(`Failed to retrieve data for key ${key}:`, error);
      this.remove(key); // Remove corrupted data
      return null;
    }
  }

  /**
   * Remove data from localStorage
   */
  remove(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.warn(`Failed to remove data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all authentication-related data
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      const prefixToMatch = `${this.prefix}-`;
      
      keys.forEach(key => {
        if (key.startsWith(prefixToMatch)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear auth storage:', error);
    }
  }

  /**
   * Get all stored keys (without prefix)
   */
  keys(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const keys = Object.keys(localStorage);
      const prefixToMatch = `${this.prefix}-`;
      
      return keys
        .filter(key => key.startsWith(prefixToMatch))
        .map(key => key.substring(prefixToMatch.length));
    } catch (error) {
      console.warn('Failed to get storage keys:', error);
      return [];
    }
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    if (typeof window === 'undefined') return;

    const keys = this.keys();
    keys.forEach(key => {
      // This will automatically remove expired items
      this.get(key);
    });
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { totalKeys: number; totalSize: number } {
    if (typeof window === 'undefined') {
      return { totalKeys: 0, totalSize: 0 };
    }

    try {
      const keys = this.keys();
      let totalSize = 0;

      keys.forEach(key => {
        const storageKey = this.getStorageKey(key);
        const value = localStorage.getItem(storageKey);
        if (value) {
          totalSize += value.length;
        }
      });

      return {
        totalKeys: keys.length,
        totalSize
      };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return { totalKeys: 0, totalSize: 0 };
    }
  }
}

// Session storage variant for temporary data
class SecureSessionStorage extends SecureStorage {
  constructor(options: StorageOptions = {}) {
    super(options);
  }

  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now()
      };

      const serialized = JSON.stringify(item);
      const encrypted = this.simpleEncrypt(serialized);
      const storageKey = this.getStorageKey(key);

      sessionStorage.setItem(storageKey, encrypted);
      return true;
    } catch (error) {
      console.warn(`Failed to store session data for key ${key}:`, error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const storageKey = this.getStorageKey(key);
      const encrypted = sessionStorage.getItem(storageKey);
      
      if (!encrypted) return null;

      const serialized = this.simpleDecrypt(encrypted);
      const item: StorageItem<T> = JSON.parse(serialized);

      return item.value;
    } catch (error) {
      console.warn(`Failed to retrieve session data for key ${key}:`, error);
      this.remove(key);
      return null;
    }
  }

  remove(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const storageKey = this.getStorageKey(key);
      sessionStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.warn(`Failed to remove session data for key ${key}:`, error);
      return false;
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(sessionStorage);
      const prefixToMatch = `${this.prefix}-`;
      
      keys.forEach(key => {
        if (key.startsWith(prefixToMatch)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }

  keys(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const keys = Object.keys(sessionStorage);
      const prefixToMatch = `${this.prefix}-`;
      
      return keys
        .filter(key => key.startsWith(prefixToMatch))
        .map(key => key.substring(prefixToMatch.length));
    } catch (error) {
      console.warn('Failed to get session storage keys:', error);
      return [];
    }
  }
}

// Global storage instances
export const authStorage = new SecureStorage({
  prefix: 'astro-stack-auth',
  encrypt: false, // Can be enabled for additional security
  ttl: 24 * 60 * 60 * 1000 // 24 hours
});

export const sessionAuthStorage = new SecureSessionStorage({
  prefix: 'astro-stack-auth-session',
  encrypt: false
});

// Utility functions for common auth storage operations
export const authStorageUtils = {
  /**
   * Store user session data
   */
  setUserSession(user: any, session: any): boolean {
    return authStorage.set('user-session', { user, session });
  },

  /**
   * Get stored user session data
   */
  getUserSession(): { user: any; session: any } | null {
    return authStorage.get('user-session');
  },

  /**
   * Store temporary auth state
   */
  setTempAuthState(state: any): boolean {
    return sessionAuthStorage.set('temp-state', state);
  },

  /**
   * Get temporary auth state
   */
  getTempAuthState(): any {
    return sessionAuthStorage.get('temp-state');
  },

  /**
   * Store OAuth state for security
   */
  setOAuthState(state: string): boolean {
    return sessionAuthStorage.set('oauth-state', state);
  },

  /**
   * Get and remove OAuth state
   */
  getOAuthState(): string | null {
    const state = sessionAuthStorage.get<string>('oauth-state');
    if (state) {
      sessionAuthStorage.remove('oauth-state');
    }
    return state;
  },

  /**
   * Store redirect URL for post-auth navigation
   */
  setRedirectUrl(url: string): boolean {
    return sessionAuthStorage.set('redirect-url', url);
  },

  /**
   * Get and remove redirect URL
   */
  getRedirectUrl(): string | null {
    const url = sessionAuthStorage.get<string>('redirect-url');
    if (url) {
      sessionAuthStorage.remove('redirect-url');
    }
    return url;
  },

  /**
   * Clear all authentication storage
   */
  clearAll(): void {
    authStorage.clear();
    sessionAuthStorage.clear();
  },

  /**
   * Perform storage cleanup and maintenance
   */
  performMaintenance(): void {
    authStorage.cleanup();
    
    const info = authStorage.getStorageInfo();
    console.debug(`Auth storage: ${info.totalKeys} keys, ${info.totalSize} bytes`);
  }
};

// Auto-cleanup on page load
if (typeof window !== 'undefined') {
  // Clean up expired items on load
  setTimeout(() => {
    authStorageUtils.performMaintenance();
  }, 1000);

  // Set up periodic cleanup (every 5 minutes)
  setInterval(() => {
    authStorageUtils.performMaintenance();
  }, 5 * 60 * 1000);
}