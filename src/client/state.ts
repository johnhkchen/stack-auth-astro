/**
 * Client-side authentication state management
 * 
 * Provides robust authentication state management with persistent storage,
 * automatic token refresh, and cross-tab synchronization support.
 */

import type { User, Session } from '@stackframe/stack';
import { buildAuthUrl } from './prefix.js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  lastUpdated: number;
  isOnline: boolean;
  networkStatus: 'online' | 'offline' | 'reconnecting' | 'degraded';
  loadingState: {
    type: 'idle' | 'signing-in' | 'signing-out' | 'refreshing' | 'checking-auth' | 'syncing';
    message: string;
    progress?: number;
    startTime: number;
  };
  operationHistory: Array<{
    operation: string;
    timestamp: number;
    success: boolean;
    duration: number;
    error?: string;
  }>;
}

export interface AuthStateOptions {
  persistStorage?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNetworkDetection?: boolean;
  offlineRetryInterval?: number;
  onStateChange?: (state: AuthState) => void;
  onError?: (error: Error) => void;
  onNetworkStatusChange?: (status: 'online' | 'offline' | 'reconnecting' | 'degraded') => void;
}

type AuthStateListener = (state: AuthState) => void;

class AuthStateManager {
  private state: AuthState = {
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    lastUpdated: Date.now(),
    isOnline: true,
    networkStatus: 'online',
    loadingState: {
      type: 'idle',
      message: '',
      startTime: Date.now()
    },
    operationHistory: []
  };

  private listeners = new Set<AuthStateListener>();
  private refreshTimer: NodeJS.Timeout | null = null;
  private networkRetryTimer: NodeJS.Timeout | null = null;
  private onlineCheckTimer: NodeJS.Timeout | null = null;
  private options: Required<AuthStateOptions>;

  constructor(options: AuthStateOptions = {}) {
    this.options = {
      persistStorage: true,
      autoRefresh: true,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      enableNetworkDetection: true,
      offlineRetryInterval: 30 * 1000, // 30 seconds
      onStateChange: () => {},
      onError: () => {},
      onNetworkStatusChange: () => {},
      ...options
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Restore state from storage if enabled
      if (this.options.persistStorage && typeof window !== 'undefined') {
        await this.restoreFromStorage();
      }

      // Start auto-refresh if enabled
      if (this.options.autoRefresh) {
        this.startAutoRefresh();
      }

      // Listen for storage changes from other tabs
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', this.handleStorageChange);
      }

      // Initialize network detection
      if (this.options.enableNetworkDetection) {
        this.initializeNetworkDetection();
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to initialize auth state'));
    }
  }

  private handleStorageChange = (event: StorageEvent): void => {
    if (event.key === 'astro-stack-auth-state' && event.newValue) {
      try {
        const restoredState = JSON.parse(event.newValue);
        this.setState({
          ...restoredState,
          isLoading: false,
          lastUpdated: Date.now()
        });
      } catch (error) {
        console.warn('Failed to sync auth state from storage:', error);
      }
    }
  };

  private async restoreFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('astro-stack-auth-state');
      if (stored) {
        const restoredState = this.validateStoredState(JSON.parse(stored));
        
        if (restoredState) {
          // Validate restored state is not too old and has required fields
          const maxAge = 2 * 60 * 60 * 1000; // 2 hours
          const isValid = restoredState.lastUpdated && (Date.now() - restoredState.lastUpdated < maxAge);
          
          if (isValid) {
            // Additional validation - check if session looks authentic
            const sessionValid = this.validateSessionData(restoredState);
            
            if (sessionValid) {
              this.setState({
                ...restoredState,
                isLoading: false,
                error: null,
                lastUpdated: Date.now(),
                // Ensure network status is current
                isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
                networkStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
              });
              
              // Schedule validation check
              if (this.options.enableNetworkDetection) {
                setTimeout(() => this.validateRestoredSession(), 1000);
              }
            } else {
              console.warn('Restored auth state failed validation, clearing');
              localStorage.removeItem('astro-stack-auth-state');
            }
          } else {
            // Clear old state
            console.log('Stored auth state expired, clearing');
            localStorage.removeItem('astro-stack-auth-state');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore auth state from storage:', error);
      localStorage.removeItem('astro-stack-auth-state');
    }
  }

  /**
   * Validate stored state structure and data integrity
   */
  private validateStoredState(stored: any): Partial<AuthState> | null {
    try {
      // Check required fields
      if (!stored || typeof stored !== 'object') {
        return null;
      }

      // Validate structure
      const requiredFields = ['lastUpdated', 'isAuthenticated'];
      for (const field of requiredFields) {
        if (!(field in stored)) {
          console.warn(`Missing required field in stored state: ${field}`);
          return null;
        }
      }

      // Validate data types
      if (typeof stored.lastUpdated !== 'number' || 
          typeof stored.isAuthenticated !== 'boolean') {
        console.warn('Invalid data types in stored state');
        return null;
      }

      // Validate user object structure if present
      if (stored.user !== null && stored.user !== undefined) {
        if (typeof stored.user !== 'object' || !stored.user.id) {
          console.warn('Invalid user object in stored state');
          return null;
        }
      }

      // Validate session object structure if present
      if (stored.session !== null && stored.session !== undefined) {
        if (typeof stored.session !== 'object' || !(stored.session as any).id) {
          console.warn('Invalid session object in stored state');
          return null;
        }
      }

      return stored as Partial<AuthState>;
    } catch (error) {
      console.warn('Error validating stored state:', error);
      return null;
    }
  }

  /**
   * Validate session data integrity
   */
  private validateSessionData(state: Partial<AuthState>): boolean {
    try {
      // If authenticated, must have both user and session
      if (state.isAuthenticated) {
        if (!state.user || !state.session) {
          console.warn('Authenticated state missing user or session data');
          return false;
        }

        // Basic user validation
        if (!state.user.id || typeof state.user.id !== 'string') {
          console.warn('Invalid user ID in stored state');
          return false;
        }

        // Basic session validation
        if (!(state.session as any).id || typeof (state.session as any).id !== 'string') {
          console.warn('Invalid session ID in stored state');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Error validating session data:', error);
      return false;
    }
  }

  /**
   * Validate restored session against server
   */
  private async validateRestoredSession(): Promise<void> {
    if (!this.state.isAuthenticated || !this.state.isOnline) {
      return;
    }

    try {
      // Quick validation call to ensure session is still valid
      const response = await fetch(buildAuthUrl('session'), {
        method: 'HEAD', // Use HEAD for lightweight check
        credentials: 'same-origin',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.status === 401) {
        console.warn('Restored session is no longer valid, clearing auth state');
        this.clearAuth();
      } else if (!response.ok) {
        // Session might be valid but server had an issue
        console.warn('Could not validate restored session, server error:', response.status);
      }
    } catch (error) {
      // Network error, don't clear the session
      console.warn('Could not validate restored session due to network error:', error);
    }
  }

  private async persistToStorage(): Promise<void> {
    if (!this.options.persistStorage || typeof window === 'undefined') {
      return;
    }

    try {
      // Create sanitized state for storage
      const stateToStore = this.createStorableState();
      
      // Validate state before storing
      if (!this.validateStateForStorage(stateToStore)) {
        console.warn('Auth state failed validation, not persisting');
        return;
      }
      
      // Add integrity check
      const stateWithIntegrity = this.addIntegrityCheck(stateToStore);
      const serialized = JSON.stringify(stateWithIntegrity);
      
      // Check storage quota
      if (this.checkStorageQuota(serialized)) {
        localStorage.setItem('astro-stack-auth-state', serialized);
      } else {
        console.warn('Storage quota exceeded, clearing old auth state');
        localStorage.removeItem('astro-stack-auth-state');
      }
    } catch (error) {
      console.warn('Failed to persist auth state to storage:', error);
      
      // Try to clear corrupted storage
      try {
        localStorage.removeItem('astro-stack-auth-state');
      } catch (clearError) {
        console.warn('Could not clear corrupted storage:', clearError);
      }
    }
  }

  /**
   * Create state object suitable for storage
   */
  private createStorableState(): any {
    return {
      user: this.state.user,
      session: this.state.session,
      isAuthenticated: this.state.isAuthenticated,
      lastUpdated: this.state.lastUpdated,
      isOnline: this.state.isOnline,
      networkStatus: this.state.networkStatus,
      // Add metadata
      version: '1.0',
      origin: window.location.origin,
      userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
    };
  }

  /**
   * Validate state before storage
   */
  private validateStateForStorage(state: any): boolean {
    try {
      // Check basic structure
      if (!state || typeof state !== 'object') {
        return false;
      }

      // Validate timestamp
      if (!state.lastUpdated || typeof state.lastUpdated !== 'number') {
        return false;
      }

      // Validate authentication consistency
      if (state.isAuthenticated && (!state.user || !state.session)) {
        return false;
      }

      // Check for circular references or non-serializable data
      JSON.stringify(state);
      
      return true;
    } catch (error) {
      console.warn('State validation failed:', error);
      return false;
    }
  }

  /**
   * Add integrity check to stored data
   */
  private addIntegrityCheck(state: any): any {
    try {
      // Simple checksum for data integrity
      const dataString = JSON.stringify({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated
      });
      
      // Basic hash function (not cryptographic, just for integrity)
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return {
        ...state,
        integrity: hash.toString(36)
      };
    } catch (error) {
      console.warn('Could not add integrity check:', error);
      return state;
    }
  }

  /**
   * Check storage quota availability
   */
  private checkStorageQuota(data: string): boolean {
    try {
      // Estimate storage usage
      const currentUsage = JSON.stringify(localStorage).length;
      const dataSize = data.length;
      const estimatedTotal = currentUsage + dataSize;
      
      // Common localStorage quota is 5-10MB, be conservative
      const quotaLimit = 4 * 1024 * 1024; // 4MB
      
      return estimatedTotal < quotaLimit;
    } catch (error) {
      // If we can't check, assume it's okay
      return true;
    }
  }

  private setState(newState: Partial<AuthState>): void {
    const prevState = { ...this.state };
    this.state = {
      ...this.state,
      ...newState,
      lastUpdated: Date.now()
    };

    // Persist to storage if state changed significantly
    if (
      prevState.user !== this.state.user ||
      prevState.session !== this.state.session ||
      prevState.isAuthenticated !== this.state.isAuthenticated
    ) {
      this.persistToStorage();
    }

    // Notify listeners
    this.notifyListeners();
    
    // Call state change callback
    this.options.onStateChange(this.state);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  private handleError(error: Error): void {
    this.setState({
      error,
      isLoading: false
    });
    
    this.options.onError(error);
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      if (this.state.isAuthenticated && !this.state.isLoading) {
        this.refreshSession();
      }
    }, this.options.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Initialize network status detection
   */
  private initializeNetworkDetection(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    // Set initial network status
    this.updateNetworkStatus(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', this.handleNetworkOnline);
    window.addEventListener('offline', this.handleNetworkOffline);

    // Periodic connectivity check for more reliable detection
    this.startConnectivityCheck();
  }

  /**
   * Handle network online event
   */
  private handleNetworkOnline = (): void => {
    this.setNetworkStatus('reconnecting');
    this.verifyConnectivity().then(isConnected => {
      if (isConnected) {
        this.setNetworkStatus('online');
        this.onNetworkReconnect();
      } else {
        this.setNetworkStatus('degraded');
      }
    });
  };

  /**
   * Handle network offline event
   */
  private handleNetworkOffline = (): void => {
    this.setNetworkStatus('offline');
    this.startOfflineRetry();
  };

  /**
   * Start connectivity check timer
   */
  private startConnectivityCheck(): void {
    this.onlineCheckTimer = setInterval(() => {
      this.verifyConnectivity().then(isConnected => {
        if (isConnected && this.state.networkStatus === 'offline') {
          this.handleNetworkOnline();
        } else if (!isConnected && this.state.networkStatus === 'online') {
          this.handleNetworkOffline();
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Verify actual connectivity (not just browser online status)
   */
  private async verifyConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(buildAuthUrl('health'), {
        method: 'HEAD',
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      return response.ok;
    } catch {
      // Fallback to basic connectivity check
      try {
        const response = await fetch('data:,', { method: 'HEAD' });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Update network status
   */
  private updateNetworkStatus(isOnline: boolean): void {
    const networkStatus = isOnline ? 'online' : 'offline';
    this.setState({
      isOnline,
      networkStatus
    });
  }

  /**
   * Set network status with callback
   */
  private setNetworkStatus(status: 'online' | 'offline' | 'reconnecting' | 'degraded'): void {
    this.setState({
      networkStatus: status,
      isOnline: status === 'online' || status === 'degraded'
    });
    this.options.onNetworkStatusChange(status);
  }

  /**
   * Handle network reconnection
   */
  private onNetworkReconnect(): void {
    // Stop offline retry timer
    if (this.networkRetryTimer) {
      clearInterval(this.networkRetryTimer);
      this.networkRetryTimer = null;
    }

    // Refresh auth status if authenticated
    if (this.state.isAuthenticated) {
      this.refreshSession();
    }
  }

  /**
   * Start offline retry mechanism
   */
  private startOfflineRetry(): void {
    if (this.networkRetryTimer) {
      return; // Already running
    }

    this.networkRetryTimer = setInterval(() => {
      this.verifyConnectivity().then(isConnected => {
        if (isConnected) {
          this.handleNetworkOnline();
        }
      });
    }, this.options.offlineRetryInterval);
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set user and session data
   */
  setAuthData(user: User | null, session: Session | null): void {
    this.setState({
      user,
      session,
      isAuthenticated: !!(user && session),
      error: null
    });
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    if (isLoading && this.state.loadingState.type === 'idle') {
      this.setLoadingState('checking-auth', 'Checking authentication status...');
    } else if (!isLoading) {
      this.setLoadingState('idle', '');
    }
    
    this.setState({ isLoading });
  }

  /**
   * Set detailed loading state with message and type
   */
  setLoadingState(
    type: 'idle' | 'signing-in' | 'signing-out' | 'refreshing' | 'checking-auth' | 'syncing',
    message: string,
    progress?: number
  ): void {
    this.setState({
      loadingState: {
        type,
        message,
        progress,
        startTime: type !== 'idle' ? Date.now() : this.state.loadingState.startTime
      },
      isLoading: type !== 'idle'
    });
  }

  /**
   * Record operation in history for analytics and debugging
   */
  private recordOperation(
    operation: string,
    success: boolean,
    startTime: number,
    error?: Error
  ): void {
    const operationRecord = {
      operation,
      timestamp: startTime,
      success,
      duration: Date.now() - startTime,
      error: error?.message
    };

    // Keep only last 10 operations to avoid memory issues
    const history = [...this.state.operationHistory, operationRecord].slice(-10);
    
    this.setState({
      operationHistory: history
    });
  }

  /**
   * Start operation tracking
   */
  private startOperation(operation: string, message: string): number {
    const startTime = Date.now();
    
    let loadingType: AuthState['loadingState']['type'] = 'idle';
    switch (operation) {
      case 'sign-in':
        loadingType = 'signing-in';
        break;
      case 'sign-out':
        loadingType = 'signing-out';
        break;
      case 'refresh':
        loadingType = 'refreshing';
        break;
      case 'auth-check':
        loadingType = 'checking-auth';
        break;
      case 'sync':
        loadingType = 'syncing';
        break;
      default:
        loadingType = 'checking-auth';
    }
    
    this.setLoadingState(loadingType, message);
    return startTime;
  }

  /**
   * Complete operation tracking
   */
  private completeOperation(operation: string, startTime: number, success: boolean, error?: Error): void {
    this.recordOperation(operation, success, startTime, error);
    this.setLoadingState('idle', '');
  }

  /**
   * Set error state
   */
  setError(error: Error | null): void {
    this.setState({
      error,
      isLoading: false
    });
  }

  /**
   * Clear authentication state
   */
  clearAuth(): void {
    this.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      error: null,
      isLoading: false
    });

    // Clear from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('astro-stack-auth-state');
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<void> {
    if (!this.state.isAuthenticated || this.state.isLoading) {
      return;
    }

    // Skip refresh if offline
    if (!this.state.isOnline) {
      console.log('Skipping session refresh while offline');
      return;
    }

    const startTime = this.startOperation('refresh', 'Refreshing session...');

    try {
      const response = await fetch(buildAuthUrl('session'), {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthData(data.user, data.session);
        this.completeOperation('refresh', startTime, true);
      } else if (response.status === 401) {
        // Session expired
        this.clearAuth();
        this.completeOperation('refresh', startTime, false, new Error('Session expired'));
      } else {
        throw new Error(`Session refresh failed: ${response.status}`);
      }
    } catch (error) {
      // Check if this is a network error
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      const authError = error instanceof Error ? error : new Error('Session refresh failed');
      
      if (isNetworkError) {
        // Don't clear auth on network errors, just update network status
        console.warn('Session refresh failed due to network issue:', error);
        this.setNetworkStatus('degraded');
      } else {
        // Other errors might indicate auth issues
        console.warn('Session refresh failed:', error);
        this.setError(authError);
      }
      
      this.completeOperation('refresh', startTime, false, authError);
    }
  }

  /**
   * Check current authentication status from server
   */
  async checkAuthStatus(): Promise<void> {
    // Return early if offline and we have cached auth state
    if (!this.state.isOnline && this.state.isAuthenticated) {
      console.log('Using cached auth state while offline');
      return;
    }

    const startTime = this.startOperation('auth-check', 'Checking authentication status...');

    try {
      const response = await fetch(buildAuthUrl('user'), {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthData(data.user, data.session);
        this.completeOperation('auth-check', startTime, true);
      } else if (response.status === 401) {
        this.clearAuth();
        this.completeOperation('auth-check', startTime, true); // Not authenticated is a valid state
      } else {
        throw new Error(`Auth check failed: ${response.status}`);
      }
    } catch (error) {
      // Check if this is a network error
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      const authError = error instanceof Error ? error : new Error('Authentication check failed');
      
      if (isNetworkError) {
        console.warn('Auth check failed due to network issue:', error);
        this.setNetworkStatus('degraded');
        
        // Don't clear auth if we have cached state and it's a network error
        if (!this.state.isAuthenticated) {
          this.handleError(authError);
        }
      } else {
        this.handleError(authError);
      }
      
      this.completeOperation('auth-check', startTime, false, authError);
    }
  }

  /**
   * Clean up resources and stop timers
   */
  destroy(): void {
    this.stopAutoRefresh();
    
    // Stop network detection timers
    if (this.networkRetryTimer) {
      clearInterval(this.networkRetryTimer);
      this.networkRetryTimer = null;
    }
    
    if (this.onlineCheckTimer) {
      clearInterval(this.onlineCheckTimer);
      this.onlineCheckTimer = null;
    }
    
    this.listeners.clear();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
      window.removeEventListener('online', this.handleNetworkOnline);
      window.removeEventListener('offline', this.handleNetworkOffline);
    }
  }
}

// Global auth state manager instance
let globalAuthState: AuthStateManager | null = null;

/**
 * Get or create the global auth state manager
 */
export function getAuthStateManager(options?: AuthStateOptions): AuthStateManager {
  if (!globalAuthState) {
    globalAuthState = new AuthStateManager(options);
  }
  return globalAuthState;
}

/**
 * Initialize authentication state management
 */
export function initAuthState(options?: AuthStateOptions): AuthStateManager {
  if (globalAuthState) {
    globalAuthState.destroy();
  }
  
  globalAuthState = new AuthStateManager(options);
  return globalAuthState;
}

/**
 * Get current authentication state
 */
export function getAuthState(): AuthState {
  return getAuthStateManager().getState();
}

/**
 * Subscribe to authentication state changes
 */
export function subscribeToAuthState(listener: AuthStateListener): () => void {
  return getAuthStateManager().subscribe(listener);
}