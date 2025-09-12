/**
 * Cross-tab synchronization for authentication state
 * 
 * Uses BroadcastChannel API and storage events to keep authentication
 * state synchronized across multiple browser tabs and windows.
 */

import type { AuthState } from './state.js';

export interface SyncMessage {
  type: 'AUTH_STATE_CHANGE' | 'SIGN_IN' | 'SIGN_OUT' | 'SESSION_REFRESH' | 'SYNC_REQUEST';
  payload?: any;
  timestamp: number;
  tabId: string;
}

export interface SyncOptions {
  channelName?: string;
  enableStorageSync?: boolean;
  enableBroadcastSync?: boolean;
  onSync?: (message: SyncMessage) => void;
  onError?: (error: Error) => void;
}

type SyncListener = (message: SyncMessage) => void;

class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<SyncListener>();
  private tabId: string;
  private options: Required<SyncOptions>;
  private isDestroyed = false;

  constructor(options: SyncOptions = {}) {
    this.options = {
      channelName: 'astro-stack-auth-sync',
      enableStorageSync: true,
      enableBroadcastSync: true,
      onSync: () => {},
      onError: () => {},
      ...options
    };

    this.tabId = this.generateTabId();
    this.initialize();
  }

  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Initialize BroadcastChannel if supported and enabled
      if (this.options.enableBroadcastSync && 'BroadcastChannel' in window) {
        this.initializeBroadcastChannel();
      }

      // Initialize storage event listeners if enabled
      if (this.options.enableStorageSync) {
        this.initializeStorageSync();
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to initialize sync'));
    }
  }

  private initializeBroadcastChannel(): void {
    try {
      this.channel = new BroadcastChannel(this.options.channelName);
      this.channel.addEventListener('message', this.handleBroadcastMessage);
      
      // Send sync request to get current state from other tabs
      this.sendSyncRequest();
    } catch (error) {
      console.warn('Failed to initialize BroadcastChannel:', error);
      this.channel = null;
    }
  }

  private initializeStorageSync(): void {
    window.addEventListener('storage', this.handleStorageEvent);
  }

  private handleBroadcastMessage = (event: MessageEvent<SyncMessage>): void => {
    if (this.isDestroyed) return;

    try {
      const message = event.data;
      
      // Ignore messages from the same tab
      if (message.tabId === this.tabId) {
        return;
      }

      this.processMessage(message);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to process broadcast message'));
    }
  };

  private handleStorageEvent = (event: StorageEvent): void => {
    if (this.isDestroyed) return;

    try {
      // Handle auth state changes from storage
      if (event.key === 'astro-stack-auth-state' && event.newValue !== event.oldValue) {
        const message: SyncMessage = {
          type: 'AUTH_STATE_CHANGE',
          payload: event.newValue ? JSON.parse(event.newValue) : null,
          timestamp: Date.now(),
          tabId: 'storage-event'
        };

        this.processMessage(message);
      }

      // Handle specific sync messages
      if (event.key === 'astro-stack-auth-sync' && event.newValue) {
        const message: SyncMessage = JSON.parse(event.newValue);
        this.processMessage(message);
        
        // Clean up the sync message immediately
        setTimeout(() => {
          localStorage.removeItem('astro-stack-auth-sync');
        }, 100);
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to process storage event'));
    }
  };

  private processMessage(message: SyncMessage): void {
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });

    // Call sync callback
    this.options.onSync(message);
  }

  private handleError(error: Error): void {
    console.error('CrossTabSync error:', error);
    this.options.onError(error);
  }

  /**
   * Subscribe to sync messages
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Broadcast authentication state change
   */
  broadcastAuthStateChange(authState: Partial<AuthState>): void {
    this.sendMessage({
      type: 'AUTH_STATE_CHANGE',
      payload: authState,
      timestamp: Date.now(),
      tabId: this.tabId
    });
  }

  /**
   * Broadcast sign in event
   */
  broadcastSignIn(user: any, session: any): void {
    this.sendMessage({
      type: 'SIGN_IN',
      payload: { user, session },
      timestamp: Date.now(),
      tabId: this.tabId
    });
  }

  /**
   * Broadcast sign out event
   */
  broadcastSignOut(): void {
    this.sendMessage({
      type: 'SIGN_OUT',
      payload: null,
      timestamp: Date.now(),
      tabId: this.tabId
    });
  }

  /**
   * Broadcast session refresh event
   */
  broadcastSessionRefresh(user: any, session: any): void {
    this.sendMessage({
      type: 'SESSION_REFRESH',
      payload: { user, session },
      timestamp: Date.now(),
      tabId: this.tabId
    });
  }

  /**
   * Send sync request to get current state from other tabs
   */
  sendSyncRequest(): void {
    this.sendMessage({
      type: 'SYNC_REQUEST',
      payload: null,
      timestamp: Date.now(),
      tabId: this.tabId
    });
  }

  private sendMessage(message: SyncMessage): void {
    if (this.isDestroyed) return;

    try {
      // Send via BroadcastChannel if available
      if (this.channel) {
        this.channel.postMessage(message);
      }

      // Fallback to localStorage for broader compatibility
      if (this.options.enableStorageSync) {
        this.sendViaStorage(message);
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to send sync message'));
    }
  }

  private sendViaStorage(message: SyncMessage): void {
    try {
      // Use a temporary storage key for sync messages
      const syncKey = 'astro-stack-auth-sync';
      localStorage.setItem(syncKey, JSON.stringify(message));
      
      // Clean up after a short delay to trigger storage events
      setTimeout(() => {
        try {
          localStorage.removeItem(syncKey);
        } catch (error) {
          // Ignore cleanup errors
        }
      }, 50);
    } catch (error) {
      console.warn('Failed to send message via storage:', error);
    }
  }

  /**
   * Get current tab ID
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * Check if sync is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && (
      ('BroadcastChannel' in window && this.options.enableBroadcastSync) ||
      this.options.enableStorageSync
    );
  }

  /**
   * Get sync capabilities
   */
  getCapabilities(): { broadcastChannel: boolean; localStorage: boolean } {
    return {
      broadcastChannel: !!(this.channel && this.options.enableBroadcastSync),
      localStorage: !!(typeof window !== 'undefined' && this.options.enableStorageSync)
    };
  }

  /**
   * Clean up resources and stop listening
   */
  destroy(): void {
    this.isDestroyed = true;
    
    if (this.channel) {
      this.channel.removeEventListener('message', this.handleBroadcastMessage);
      this.channel.close();
      this.channel = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }

    this.listeners.clear();
  }
}

// Global sync manager instance
let globalSyncManager: CrossTabSync | null = null;

/**
 * Get or create the global sync manager
 */
export function getSyncManager(options?: SyncOptions): CrossTabSync {
  if (!globalSyncManager) {
    globalSyncManager = new CrossTabSync(options);
  }
  return globalSyncManager;
}

/**
 * Initialize cross-tab synchronization
 */
export function initSync(options?: SyncOptions): CrossTabSync {
  if (globalSyncManager) {
    globalSyncManager.destroy();
  }
  
  globalSyncManager = new CrossTabSync(options);
  return globalSyncManager;
}

/**
 * Destroy global sync manager
 */
export function destroySync(): void {
  if (globalSyncManager) {
    globalSyncManager.destroy();
    globalSyncManager = null;
  }
}

/**
 * Broadcast authentication state change across tabs
 */
export function broadcastAuthChange(authState: Partial<AuthState>): void {
  getSyncManager().broadcastAuthStateChange(authState);
}

/**
 * Broadcast sign in event across tabs
 */
export function broadcastSignIn(user: any, session: any): void {
  getSyncManager().broadcastSignIn(user, session);
}

/**
 * Broadcast sign out event across tabs
 */
export function broadcastSignOut(): void {
  getSyncManager().broadcastSignOut();
}

/**
 * Subscribe to cross-tab sync events
 */
export function subscribeToSync(listener: SyncListener): () => void {
  return getSyncManager().subscribe(listener);
}