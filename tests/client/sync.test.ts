/**
 * Tests for cross-tab synchronization
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSyncManager, initSync, type SyncMessage } from '../../src/client/sync.js';

// Mock BroadcastChannel
class MockBroadcastChannel {
  public name: string;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Set<(event: MessageEvent) => void> = new Set();

  constructor(name: string) {
    this.name = name;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  postMessage(message: any) {
    // Simulate message being received by other instances
    const event = new MessageEvent('message', { data: message });
    this.listeners.forEach(listener => {
      setTimeout(() => listener(event), 0);
    });
  }

  close() {
    this.listeners.clear();
  }
}

// Mock localStorage
const mockLocalStorage = {
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

// Mock BroadcastChannel globally
(global as any).BroadcastChannel = MockBroadcastChannel;

describe('CrossTabSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const syncManager = initSync();
      
      expect(syncManager).toBeDefined();
      expect(syncManager.isSupported()).toBe(true);
      
      const capabilities = syncManager.getCapabilities();
      expect(capabilities.broadcastChannel).toBe(true);
      expect(capabilities.localStorage).toBe(true);
    });

    it('should initialize with custom options', () => {
      const onSync = vi.fn();
      const onError = vi.fn();
      
      const syncManager = initSync({
        channelName: 'custom-channel',
        enableBroadcastSync: false,
        enableStorageSync: true,
        onSync,
        onError
      });
      
      expect(syncManager).toBeDefined();
      
      const capabilities = syncManager.getCapabilities();
      expect(capabilities.broadcastChannel).toBe(false);
      expect(capabilities.localStorage).toBe(true);
    });

    it('should handle missing BroadcastChannel gracefully', () => {
      const originalBroadcastChannel = (global as any).BroadcastChannel;
      delete (global as any).BroadcastChannel;
      
      const syncManager = initSync();
      const capabilities = syncManager.getCapabilities();
      
      expect(capabilities.broadcastChannel).toBe(false);
      expect(capabilities.localStorage).toBe(true);
      
      (global as any).BroadcastChannel = originalBroadcastChannel;
    });
  });

  describe('message broadcasting', () => {
    it('should broadcast auth state changes', () => {
      const syncManager = initSync();
      const listener = vi.fn();
      
      syncManager.subscribe(listener);
      
      const authState = {
        user: { id: 'user-123' },
        session: { id: 'session-123' },
        isAuthenticated: true
      };
      
      syncManager.broadcastAuthStateChange(authState);
      
      // Message should be sent via localStorage fallback
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-sync',
        expect.stringContaining('"type":"AUTH_STATE_CHANGE"')
      );
    });

    it('should broadcast sign in events', () => {
      const syncManager = initSync();
      const user = { id: 'user-123' };
      const session = { id: 'session-123' };
      
      syncManager.broadcastSignIn(user, session);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-sync',
        expect.stringContaining('"type":"SIGN_IN"')
      );
    });

    it('should broadcast sign out events', () => {
      const syncManager = initSync();
      
      syncManager.broadcastSignOut();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-sync',
        expect.stringContaining('"type":"SIGN_OUT"')
      );
    });

    it('should broadcast session refresh events', () => {
      const syncManager = initSync();
      const user = { id: 'user-123' };
      const session = { id: 'session-123' };
      
      syncManager.broadcastSessionRefresh(user, session);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-sync',
        expect.stringContaining('"type":"SESSION_REFRESH"')
      );
    });

    it('should send sync requests', () => {
      const syncManager = initSync();
      
      syncManager.sendSyncRequest();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-sync',
        expect.stringContaining('"type":"SYNC_REQUEST"')
      );
    });
  });

  describe('message receiving', () => {
    it('should receive and process messages from storage events', () => {
      const syncManager = initSync();
      const listener = vi.fn();
      
      syncManager.subscribe(listener);
      
      const message: SyncMessage = {
        type: 'SIGN_IN',
        payload: { user: { id: 'user-123' }, session: { id: 'session-123' } },
        timestamp: Date.now(),
        tabId: 'other-tab'
      };
      
      // Simulate storage event from another tab
      const storageEvent = new StorageEvent('storage', {
        key: 'astro-stack-auth-sync',
        newValue: JSON.stringify(message),
        oldValue: null
      });
      
      window.dispatchEvent(storageEvent);
      
      expect(listener).toHaveBeenCalledWith(message);
    });

    it('should ignore messages from the same tab', () => {
      const syncManager = initSync();
      const listener = vi.fn();
      
      syncManager.subscribe(listener);
      
      const tabId = syncManager.getTabId();
      const message: SyncMessage = {
        type: 'SIGN_IN',
        payload: null,
        timestamp: Date.now(),
        tabId // Same tab ID
      };
      
      // Simulate BroadcastChannel message from same tab
      const messageEvent = new MessageEvent('message', { data: message });
      window.dispatchEvent(messageEvent);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle auth state changes from storage', () => {
      const syncManager = initSync();
      const listener = vi.fn();
      
      syncManager.subscribe(listener);
      
      const authState = {
        user: { id: 'user-123' },
        session: { id: 'session-123' },
        isAuthenticated: true
      };
      
      // Simulate auth state change in localStorage
      const storageEvent = new StorageEvent('storage', {
        key: 'astro-stack-auth-state',
        newValue: JSON.stringify(authState),
        oldValue: null
      });
      
      window.dispatchEvent(storageEvent);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AUTH_STATE_CHANGE',
          payload: authState
        })
      );
    });

    it('should handle corrupted sync messages gracefully', () => {
      const syncManager = initSync();
      const listener = vi.fn();
      
      syncManager.subscribe(listener);
      
      // Simulate storage event with invalid JSON
      const storageEvent = new StorageEvent('storage', {
        key: 'astro-stack-auth-sync',
        newValue: 'invalid json',
        oldValue: null
      });
      
      // Should not throw
      expect(() => {
        window.dispatchEvent(storageEvent);
      }).not.toThrow();
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscription management', () => {
    it('should add and remove listeners correctly', () => {
      const syncManager = initSync();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      const unsubscribe1 = syncManager.subscribe(listener1);
      const unsubscribe2 = syncManager.subscribe(listener2);
      
      syncManager.broadcastSignOut();
      
      // Both listeners should be called
      vi.advanceTimersByTime(100);
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      // Unsubscribe first listener
      unsubscribe1();
      vi.clearAllMocks();
      
      syncManager.broadcastSignOut();
      
      // Only second listener should be called
      vi.advanceTimersByTime(100);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      unsubscribe2();
    });

    it('should handle listener errors gracefully', () => {
      const syncManager = initSync();
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      syncManager.subscribe(errorListener);
      syncManager.subscribe(normalListener);
      
      // Should not throw and should still call other listeners
      expect(() => {
        const message: SyncMessage = {
          type: 'SIGN_OUT',
          payload: null,
          timestamp: Date.now(),
          tabId: 'other-tab'
        };
        
        const storageEvent = new StorageEvent('storage', {
          key: 'astro-stack-auth-sync',
          newValue: JSON.stringify(message),
          oldValue: null
        });
        
        window.dispatchEvent(storageEvent);
      }).not.toThrow();
      
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const syncManager = initSync();
      const listener = vi.fn();
      
      syncManager.subscribe(listener);
      
      syncManager.destroy();
      
      // Should not receive messages after destroy
      const message: SyncMessage = {
        type: 'SIGN_OUT',
        payload: null,
        timestamp: Date.now(),
        tabId: 'other-tab'
      };
      
      const storageEvent = new StorageEvent('storage', {
        key: 'astro-stack-auth-sync',
        newValue: JSON.stringify(message),
        oldValue: null
      });
      
      window.dispatchEvent(storageEvent);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('tab identification', () => {
    it('should generate unique tab IDs', () => {
      const syncManager1 = initSync();
      const syncManager2 = initSync();
      
      const tabId1 = syncManager1.getTabId();
      const tabId2 = syncManager2.getTabId();
      
      expect(tabId1).not.toBe(tabId2);
      expect(tabId1).toMatch(/^tab-\d+-[a-z0-9]+$/);
      expect(tabId2).toMatch(/^tab-\d+-[a-z0-9]+$/);
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to localStorage when BroadcastChannel is not available', () => {
      const originalBroadcastChannel = (global as any).BroadcastChannel;
      delete (global as any).BroadcastChannel;
      
      const syncManager = initSync();
      
      syncManager.broadcastSignOut();
      
      // Should still work via localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-sync',
        expect.stringContaining('"type":"SIGN_OUT"')
      );
      
      (global as any).BroadcastChannel = originalBroadcastChannel;
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const syncManager = initSync();
      
      // Should not throw
      expect(() => {
        syncManager.broadcastSignOut();
      }).not.toThrow();
    });
  });
});