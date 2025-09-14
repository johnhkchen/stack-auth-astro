/**
 * Cross-tab synchronization for authentication state
 * 
 * Uses BroadcastChannel API and storage events to keep authentication
 * state synchronized across multiple browser tabs and windows.
 */

import type { AuthState } from './state.js';

export interface SyncMessage {
  type: 'AUTH_STATE_CHANGE' | 'SIGN_IN' | 'SIGN_OUT' | 'SESSION_REFRESH' | 'SYNC_REQUEST' | 'SYNC_RESPONSE' | 'HEALTH_CHECK';
  payload?: any;
  timestamp: number;
  tabId: string;
  version?: string;
  sequenceId?: number;
}

export interface SyncOptions {
  channelName?: string;
  enableStorageSync?: boolean;
  enableBroadcastSync?: boolean;
  syncTimeout?: number;
  maxRetries?: number;
  heartbeatInterval?: number;
  onSync?: (message: SyncMessage) => void;
  onError?: (error: Error) => void;
  onTabsChanged?: (activeTabs: string[]) => void;
}

type SyncListener = (message: SyncMessage) => void;

class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<SyncListener>();
  private tabId: string;
  private options: Required<SyncOptions>;
  private isDestroyed = false;
  private activeTabs = new Set<string>();
  private sequenceCounter = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingSyncRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>(); 
  private lastSyncTime = 0;
  private syncRetryCount = 0;

  constructor(options: SyncOptions = {}) {
    this.options = {
      channelName: 'astro-stack-auth-sync',
      enableStorageSync: true,
      enableBroadcastSync: true,
      syncTimeout: 5000,
      maxRetries: 3,
      heartbeatInterval: 30000,
      onSync: () => {},
      onError: () => {},
      onTabsChanged: () => {},
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

      // Start heartbeat system
      this.startHeartbeat();

      // Add this tab to active tabs
      this.activeTabs.add(this.tabId);
      this.notifyTabsChanged();
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
    // Handle internal sync messages first
    switch (message.type) {
      case 'SYNC_REQUEST':
        this.handleSyncRequest(message);
        break;
      case 'SYNC_RESPONSE':
        this.handleSyncResponse(message);
        break;
      case 'HEALTH_CHECK':
        this.handleHealthCheck(message);
        break;
    }

    // Update tab tracking for heartbeat messages
    if (message.tabId && message.tabId !== this.tabId) {
      this.activeTabs.add(message.tabId);
      this.notifyTabsChanged();
    }

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
   * Handle sync request messages
   */
  private handleSyncRequest(message: SyncMessage): void {
    if (message.sequenceId) {
      // Respond with current auth state if we have it
      const authState = this.getCurrentAuthState();
      this.sendSyncResponse(message.sequenceId, authState);
    }
  }

  /**
   * Handle sync response messages
   */
  private handleSyncResponse(message: SyncMessage): void {
    if (message.sequenceId) {
      const pendingRequest = this.pendingSyncRequests.get(message.sequenceId);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingSyncRequests.delete(message.sequenceId);
        pendingRequest.resolve(message.payload);
      }
    }
  }

  /**
   * Handle health check messages (heartbeat)
   */
  private handleHealthCheck(message: SyncMessage): void {
    if (message.tabId !== this.tabId) {
      this.activeTabs.add(message.tabId);
      this.lastSyncTime = Date.now();
    }
  }

  /**
   * Start heartbeat system
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHealthCheck();
      this.cleanupInactiveTabs();
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat system
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send health check (heartbeat)
   */
  private sendHealthCheck(): void {
    this.sendMessage({
      type: 'HEALTH_CHECK',
      payload: null,
      timestamp: Date.now(),
      tabId: this.tabId
    });
  }

  /**
   * Clean up inactive tabs
   */
  private cleanupInactiveTabs(): void {
    const now = Date.now();
    const maxInactiveTime = this.options.heartbeatInterval * 2; // 2x heartbeat interval
    
    let hasChanges = false;
    for (const tabId of this.activeTabs) {
      if (tabId !== this.tabId && (now - this.lastSyncTime) > maxInactiveTime) {
        this.activeTabs.delete(tabId);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.notifyTabsChanged();
    }
  }

  /**
   * Notify listeners of tab changes
   */
  private notifyTabsChanged(): void {
    const tabIds = Array.from(this.activeTabs);
    this.options.onTabsChanged(tabIds);
  }

  /**
   * Get current auth state from auth state manager
   */
  private getCurrentAuthState(): any {
    try {
      // Import auth state manager dynamically to avoid circular dependencies
      const { getAuthStateManager } = require('./state.js');
      return getAuthStateManager().getState();
    } catch (error) {
      return null;
    }
  }

  /**
   * Send sync response with auth state
   */
  private sendSyncResponse(sequenceId: number, authState: any): void {
    this.sendMessage({
      type: 'SYNC_RESPONSE',
      payload: authState,
      timestamp: Date.now(),
      tabId: this.tabId,
      sequenceId
    });
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

  /**
   * Send sync request with promise return (reliable sync)
   */
  requestAuthStateSync(): Promise<any> {
    return new Promise((resolve, reject) => {
      const sequenceId = ++this.sequenceCounter;
      
      const timeout = setTimeout(() => {
        this.pendingSyncRequests.delete(sequenceId);
        reject(new Error('Sync request timeout'));
      }, this.options.syncTimeout);

      this.pendingSyncRequests.set(sequenceId, { resolve, reject, timeout });

      this.sendMessage({
        type: 'SYNC_REQUEST',
        payload: null,
        timestamp: Date.now(),
        tabId: this.tabId,
        sequenceId
      });
    });
  }

  /**
   * Ensure sync with retry mechanism
   */
  async ensureSync(): Promise<boolean> {
    if (this.syncRetryCount >= this.options.maxRetries) {
      this.syncRetryCount = 0;
      return false;
    }

    try {
      if (this.activeTabs.size <= 1) {
        return true; // Only this tab, nothing to sync
      }

      await this.requestAuthStateSync();
      this.syncRetryCount = 0;
      return true;
    } catch (error) {
      this.syncRetryCount++;
      this.handleError(error instanceof Error ? error : new Error('Sync failed'));
      
      // Exponential backoff for retries
      const delay = Math.min(1000 * Math.pow(2, this.syncRetryCount - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.ensureSync();
    }
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
   * Get active tab information
   */
  getActiveTabsInfo(): { 
    totalTabs: number; 
    activeTabs: string[]; 
    isLeaderTab: boolean;
    syncHealth: 'healthy' | 'degraded' | 'offline';
  } {
    const activeTabs = Array.from(this.activeTabs);
    const isLeaderTab = this.tabId === Math.min(...activeTabs.map(id => parseInt(id.split('-')[1]) || 0)).toString();
    
    let syncHealth: 'healthy' | 'degraded' | 'offline' = 'healthy';
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    
    if (activeTabs.length <= 1) {
      syncHealth = 'offline';
    } else if (timeSinceLastSync > this.options.heartbeatInterval * 1.5) {
      syncHealth = 'degraded';
    }

    return {
      totalTabs: activeTabs.length,
      activeTabs,
      isLeaderTab,
      syncHealth
    };
  }

  /**
   * Force sync all tabs to current state
   */
  async forceSyncAll(): Promise<boolean> {
    try {
      const currentState = this.getCurrentAuthState();
      this.broadcastAuthStateChange(currentState);
      return await this.ensureSync();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Force sync failed'));
      return false;
    }
  }

  /**
   * Clean up resources and stop listening
   */
  destroy(): void {
    this.isDestroyed = true;
    
    // Stop heartbeat system
    this.stopHeartbeat();
    
    // Clean up pending sync requests
    this.pendingSyncRequests.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(new Error('Sync destroyed'));
    });
    this.pendingSyncRequests.clear();
    
    // Clean up broadcast channel
    if (this.channel) {
      this.channel.removeEventListener('message', this.handleBroadcastMessage);
      this.channel.close();
      this.channel = null;
    }

    // Clean up storage listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }

    // Remove this tab from active tabs and notify
    this.activeTabs.delete(this.tabId);
    if (this.activeTabs.size > 0) {
      this.notifyTabsChanged();
    }

    this.listeners.clear();
    this.activeTabs.clear();
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