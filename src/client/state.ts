/**
 * Client-side authentication state management
 * 
 * Provides robust authentication state management with persistent storage,
 * automatic token refresh, and cross-tab synchronization support.
 */

import type { User, Session } from '@stackframe/stack';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  lastUpdated: number;
}

export interface AuthStateOptions {
  persistStorage?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStateChange?: (state: AuthState) => void;
  onError?: (error: Error) => void;
}

type AuthStateListener = (state: AuthState) => void;

class AuthStateManager {
  private state: AuthState = {
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    lastUpdated: Date.now()
  };

  private listeners = new Set<AuthStateListener>();
  private refreshTimer: NodeJS.Timeout | null = null;
  private options: Required<AuthStateOptions>;

  constructor(options: AuthStateOptions = {}) {
    this.options = {
      persistStorage: true,
      autoRefresh: true,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      onStateChange: () => {},
      onError: () => {},
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
        const restoredState = JSON.parse(stored);
        
        // Validate restored state is not too old (1 hour)
        if (Date.now() - restoredState.lastUpdated < 60 * 60 * 1000) {
          this.setState({
            ...restoredState,
            isLoading: false,
            error: null,
            lastUpdated: Date.now()
          });
        } else {
          // Clear old state
          localStorage.removeItem('astro-stack-auth-state');
        }
      }
    } catch (error) {
      console.warn('Failed to restore auth state from storage:', error);
      localStorage.removeItem('astro-stack-auth-state');
    }
  }

  private async persistToStorage(): Promise<void> {
    if (!this.options.persistStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const stateToStore = {
        user: this.state.user,
        session: this.state.session,
        isAuthenticated: this.state.isAuthenticated,
        lastUpdated: this.state.lastUpdated
      };
      
      localStorage.setItem('astro-stack-auth-state', JSON.stringify(stateToStore));
    } catch (error) {
      console.warn('Failed to persist auth state to storage:', error);
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
    this.setState({ isLoading });
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

    try {
      this.setLoading(true);

      const response = await fetch('/handler/session', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthData(data.user, data.session);
      } else if (response.status === 401) {
        // Session expired
        this.clearAuth();
      } else {
        throw new Error(`Session refresh failed: ${response.status}`);
      }
    } catch (error) {
      // Don't clear auth on network errors, just log the error
      console.warn('Session refresh failed:', error);
      this.setError(error instanceof Error ? error : new Error('Session refresh failed'));
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Check current authentication status from server
   */
  async checkAuthStatus(): Promise<void> {
    try {
      this.setLoading(true);

      const response = await fetch('/handler/user', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthData(data.user, data.session);
      } else if (response.status === 401) {
        this.clearAuth();
      } else {
        throw new Error(`Auth check failed: ${response.status}`);
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Authentication check failed'));
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Clean up resources and stop timers
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.listeners.clear();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
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