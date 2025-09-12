/**
 * Tests for client-side storage utilities
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authStorage, sessionAuthStorage, authStorageUtils } from '../../src/client/storage.js';

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

// Mock keys for testing cleanup
Object.defineProperty(mockLocalStorage, 'keys', {
  value: vi.fn().mockReturnValue([
    'astro-stack-auth-test-key',
    'astro-stack-auth-another-key',
    'some-other-key'
  ]),
  writable: true
});

Object.defineProperty(mockSessionStorage, 'keys', {
  value: vi.fn().mockReturnValue([
    'astro-stack-auth-session-test-key',
    'some-other-session-key'
  ]),
  writable: true
});

describe('SecureStorage (localStorage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock Object.keys for localStorage
    Object.keys = vi.fn().mockImplementation((obj) => {
      if (obj === mockLocalStorage) {
        return [
          'astro-stack-auth-test-key',
          'astro-stack-auth-another-key',
          'some-other-key'
        ];
      }
      return [];
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic operations', () => {
    it('should store and retrieve data', () => {
      const testData = { name: 'test', value: 123 };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        value: testData,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000
      }));

      const result = authStorage.set('test-key', testData);
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-test-key',
        expect.stringContaining('"name":"test"')
      );

      const retrieved = authStorage.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should handle storage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = authStorage.set('test-key', { data: 'test' });
      expect(result).toBe(false);
    });

    it('should remove data correctly', () => {
      const result = authStorage.remove('test-key');
      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-test-key');
    });

    it('should check existence correctly', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        value: { test: true },
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000
      }));

      const exists = authStorage.has('test-key');
      expect(exists).toBe(true);
    });
  });

  describe('TTL expiration', () => {
    it('should return null for expired data', () => {
      const expiredTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        value: { data: 'test' },
        timestamp: expiredTime,
        ttl: 24 * 60 * 60 * 1000 // 24 hours TTL
      }));

      const result = authStorage.get('test-key');
      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-test-key');
    });

    it('should return data that has not expired', () => {
      const recentTime = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      const testData = { data: 'test' };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        value: testData,
        timestamp: recentTime,
        ttl: 24 * 60 * 60 * 1000 // 24 hours TTL
      }));

      const result = authStorage.get('test-key');
      expect(result).toEqual(testData);
    });
  });

  describe('bulk operations', () => {
    it('should clear all auth-related data', () => {
      authStorage.clear();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-test-key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-another-key');
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('some-other-key');
    });

    it('should return all auth-related keys', () => {
      const keys = authStorage.keys();
      expect(keys).toContain('test-key');
      expect(keys).toContain('another-key');
      expect(keys).not.toContain('some-other-key');
    });

    it('should perform cleanup of expired items', () => {
      // Mock expired and valid items
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify({
          value: { data: 'expired' },
          timestamp: Date.now() - 25 * 60 * 60 * 1000,
          ttl: 24 * 60 * 60 * 1000
        }))
        .mockReturnValueOnce(JSON.stringify({
          value: { data: 'valid' },
          timestamp: Date.now() - 1 * 60 * 60 * 1000,
          ttl: 24 * 60 * 60 * 1000
        }));

      authStorage.cleanup();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-test-key');
    });

    it('should get storage info', () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('{"test": "data1"}')
        .mockReturnValueOnce('{"test": "data2"}');

      const info = authStorage.getStorageInfo();
      expect(info.totalKeys).toBe(2);
      expect(info.totalSize).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const result = authStorage.get('test-key');
      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-test-key');
    });

    it('should handle missing localStorage', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const result = authStorage.set('test-key', { data: 'test' });
      expect(result).toBe(false);

      const retrieved = authStorage.get('test-key');
      expect(retrieved).toBeNull();

      global.window = originalWindow;
    });
  });
});

describe('SecureSessionStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Object.keys for sessionStorage
    Object.keys = vi.fn().mockImplementation((obj) => {
      if (obj === mockSessionStorage) {
        return [
          'astro-stack-auth-session-test-key',
          'some-other-session-key'
        ];
      }
      return [];
    });
  });

  describe('basic operations', () => {
    it('should store and retrieve data from session storage', () => {
      const testData = { session: 'data' };
      
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        value: testData,
        timestamp: Date.now()
      }));

      const result = sessionAuthStorage.set('test-key', testData);
      expect(result).toBe(true);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-session-test-key',
        expect.stringContaining('"session":"data"')
      );

      const retrieved = sessionAuthStorage.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should clear session storage data', () => {
      sessionAuthStorage.clear();
      
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-session-test-key');
      expect(mockSessionStorage.removeItem).not.toHaveBeenCalledWith('some-other-session-key');
    });
  });
});

describe('authStorageUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('user session management', () => {
    it('should store and retrieve user session', () => {
      const user = { id: 'user-123', name: 'Test User' };
      const session = { id: 'session-123', userId: 'user-123' };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        value: { user, session },
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000
      }));

      const result = authStorageUtils.setUserSession(user, session);
      expect(result).toBe(true);

      const retrieved = authStorageUtils.getUserSession();
      expect(retrieved).toEqual({ user, session });
    });
  });

  describe('OAuth state management', () => {
    it('should store and retrieve OAuth state', () => {
      const oauthState = 'random-oauth-state';
      
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        value: oauthState,
        timestamp: Date.now()
      }));

      const result = authStorageUtils.setOAuthState(oauthState);
      expect(result).toBe(true);

      const retrieved = authStorageUtils.getOAuthState();
      expect(retrieved).toBe(oauthState);
      
      // Should be removed after retrieval
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-session-oauth-state');
    });
  });

  describe('redirect URL management', () => {
    it('should store and retrieve redirect URL', () => {
      const redirectUrl = 'https://example.com/protected';
      
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        value: redirectUrl,
        timestamp: Date.now()
      }));

      const result = authStorageUtils.setRedirectUrl(redirectUrl);
      expect(result).toBe(true);

      const retrieved = authStorageUtils.getRedirectUrl();
      expect(retrieved).toBe(redirectUrl);
      
      // Should be removed after retrieval
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-session-redirect-url');
    });
  });

  describe('maintenance operations', () => {
    it('should clear all storage', () => {
      authStorageUtils.clearAll();
      
      // Should clear both localStorage and sessionStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
      expect(mockSessionStorage.removeItem).toHaveBeenCalled();
    });

    it('should perform maintenance', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        value: { data: 'test' },
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000
      }));

      authStorageUtils.performMaintenance();
      
      // Should call cleanup and get storage info
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    });
  });
});