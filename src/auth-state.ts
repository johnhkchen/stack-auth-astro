/**
 * Auth state bridge for Astro islands
 * 
 * This module provides authentication state management specifically designed
 * for Astro's island architecture, enabling Stack Auth components to access
 * authentication state across isolated component islands.
 */

import type { User, Session } from './rest-api/types.js';
import { getAuthStateManager, getAuthState as getClientAuthState, subscribeToAuthState as subscribeToClientAuthState } from './client/state.js';
import { broadcastAuthChange } from './client/sync.js';

// Auth state interface for Astro islands
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  lastUpdated: number;
}

// Hydration options for different Astro rendering strategies
export interface HydrationOptions {
  strategy?: 'immediate' | 'lazy' | 'onVisible' | 'onIdle';
  initialUser?: User | null;
  initialSession?: Session | null;
  enableSync?: boolean;
  syncAcrossTabs?: boolean;
  autoRefresh?: boolean;
}

// Island-specific auth state manager
interface IslandAuthState {
  state: AuthState;
  subscribers: Set<(state: AuthState) => void>;
  hydrated: boolean;
  hydratingPromise?: Promise<void>;
}

// Global registry for island auth states
const islandStates = new Map<string, IslandAuthState>();
let globalStateManager: any = null;

/**
 * Initialize the auth state bridge for browser environment
 */
function initAuthStateBridge() {
  if (typeof window === 'undefined') return;
  
  if (!globalStateManager) {
    globalStateManager = getAuthStateManager();
  }
}

/**
 * Generate a unique island ID for component isolation
 */
function generateIslandId(): string {
  return `island-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create auth state bridge for an Astro island
 * 
 * This function provides authentication state management for individual
 * Astro islands, allowing components to access user and session data
 * independently while maintaining synchronization across islands.
 */
export function createAuthStateBridge(options: HydrationOptions = {}): {
  getAuthState(): Promise<AuthState>;
  subscribeToAuthState(callback: (state: AuthState) => void): () => void;
  hydrateWithServerData(user: User | null, session: Session | null): void;
  getIslandId(): string;
} {
  initAuthStateBridge();
  
  const islandId = generateIslandId();
  const {
    strategy = 'immediate',
    initialUser = null,
    initialSession = null,
    enableSync = true,
    syncAcrossTabs = true,
    autoRefresh = true
  } = options;
  
  // Initialize island state
  const initialState: AuthState = {
    user: initialUser,
    session: initialSession,
    isLoading: false,
    isAuthenticated: !!(initialUser && initialSession),
    error: null,
    lastUpdated: Date.now()
  };
  
  const islandState: IslandAuthState = {
    state: initialState,
    subscribers: new Set(),
    hydrated: false
  };
  
  islandStates.set(islandId, islandState);
  
  /**
   * Update island state and notify subscribers
   */
  function updateIslandState(newState: Partial<AuthState>) {
    const currentState = islandStates.get(islandId);
    if (!currentState) return;
    
    currentState.state = {
      ...currentState.state,
      ...newState,
      lastUpdated: Date.now()
    };
    
    // Notify all subscribers in this island
    currentState.subscribers.forEach(callback => {
      try {
        callback(currentState.state);
      } catch (error) {
        console.error('Error in auth state subscriber:', error);
      }
    });
    
    // Broadcast changes to other islands if sync is enabled
    if (enableSync) {
      broadcastAuthStateChange(currentState.state);
    }
  }
  
  /**
   * Hydrate island with fresh auth state from global state manager
   */
  async function hydrateIsland(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const currentState = islandStates.get(islandId);
    if (!currentState || currentState.hydrated) return;
    
    // Prevent multiple hydration attempts
    if (currentState.hydratingPromise) {
      return currentState.hydratingPromise;
    }
    
    currentState.hydratingPromise = (async () => {
      try {
        updateIslandState({ isLoading: true });
        
        // Get current auth state from global manager (imported from client/state)
        const globalState = await getClientAuthState();
        
        updateIslandState({
          user: globalState.user,
          session: globalState.session,
          isAuthenticated: globalState.isAuthenticated,
          isLoading: false,
          error: globalState.error
        });
        
        currentState.hydrated = true;
        
        // Subscribe to global state changes if sync is enabled
        if (enableSync) {
          subscribeToClientAuthState((globalState) => {
            updateIslandState({
              user: globalState.user,
              session: globalState.session,
              isAuthenticated: globalState.isAuthenticated,
              isLoading: globalState.isLoading,
              error: globalState.error
            });
          });
        }
        
      } catch (error) {
        console.error('Failed to hydrate island auth state:', error);
        updateIslandState({ 
          isLoading: false, 
          error: error instanceof Error ? error : new Error('Hydration failed') 
        });
      }
    })();
    
    return currentState.hydratingPromise;
  }
  
  /**
   * Get current auth state for this island
   */
  async function getAuthState(): Promise<AuthState> {
    const currentState = islandStates.get(islandId);
    if (!currentState) {
      throw new Error(`Island state not found for ID: ${islandId}`);
    }
    
    // Hydrate based on strategy
    if (!currentState.hydrated) {
      if (strategy === 'immediate') {
        await hydrateIsland();
      } else if (strategy === 'lazy') {
        // Start hydration but don't wait
        hydrateIsland().catch(console.error);
      }
      // For 'onVisible' and 'onIdle', hydration will be triggered externally
    }
    
    return currentState.state;
  }
  
  /**
   * Subscribe to auth state changes for this island
   */
  function subscribeToAuthState(callback: (state: AuthState) => void): () => void {
    const currentState = islandStates.get(islandId);
    if (!currentState) {
      throw new Error(`Island state not found for ID: ${islandId}`);
    }
    
    currentState.subscribers.add(callback);
    
    // Trigger hydration if not yet hydrated and strategy allows
    if (!currentState.hydrated && (strategy === 'immediate' || strategy === 'lazy')) {
      hydrateIsland().catch(console.error);
    }
    
    // Return cleanup function
    return () => {
      currentState.subscribers.delete(callback);
    };
  }
  
  /**
   * Manually hydrate with server-provided data
   * 
   * This is called when server-side rendered data is available
   * and should be used to initialize the island state.
   */
  function hydrateWithServerData(user: User | null, session: Session | null): void {
    updateIslandState({
      user,
      session,
      isAuthenticated: !!(user && session),
      isLoading: false,
      error: null
    });
    
    const currentState = islandStates.get(islandId);
    if (currentState) {
      currentState.hydrated = true;
    }
  }
  
  /**
   * Get the unique island ID
   */
  function getIslandId(): string {
    return islandId;
  }
  
  // Auto-cleanup when island is removed
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      islandStates.delete(islandId);
    });
  }
  
  return {
    getAuthState,
    subscribeToAuthState,
    hydrateWithServerData,
    getIslandId
  };
}

/**
 * Broadcast auth state changes to all islands
 */
function broadcastAuthStateChange(state: AuthState) {
  // Update all registered islands with the new state
  islandStates.forEach((islandState, islandId) => {
    if (islandState.hydrated) {
      islandState.state = {
        ...state,
        lastUpdated: Date.now()
      };
      
      // Notify subscribers in this island
      islandState.subscribers.forEach(callback => {
        try {
          callback(islandState.state);
        } catch (error) {
          console.error(`Error notifying subscriber in island ${islandId}:`, error);
        }
      });
    }
  });
  
  // Also broadcast via the existing sync mechanism if in browser
  if (typeof window !== 'undefined') {
    broadcastAuthChange({
      type: 'AUTH_STATE_CHANGE',
      payload: state,
      timestamp: Date.now(),
      tabId: window?.crypto?.randomUUID?.() || 'unknown'
    } as any);
  }
}

/**
 * Get auth state for server-side rendering
 * 
 * This function extracts auth state from Astro.locals for use
 * in server-side rendering and hydration.
 */
export function getServerAuthState(locals: any): {
  user: User | null;
  session: Session | null;
} {
  return {
    user: locals?.user || null,
    session: locals?.session || null
  };
}

/**
 * Create hydration script for passing server data to client
 * 
 * This generates a script tag that can be included in Astro pages
 * to pass server-side auth state to client components.
 */
export function createHydrationScript(user: User | null, session: Session | null): string {
  const authData = {
    user: user ? {
      id: (user as any).id,
      primaryEmail: (user as any).primaryEmail,
      displayName: (user as any).displayName,
      // Include other safe user properties as needed
    } : null,
    session: session ? {
      // Use any for session properties since Stack Auth Session interface varies
      ...(session as any)
    } : null
  };
  
  return `<script>
    window.__ASTRO_STACK_AUTH__ = ${JSON.stringify(authData)};
  </script>`;
}

/**
 * Get hydration data from window global (client-side)
 */
export function getHydrationData(): { user: User | null; session: Session | null } {
  if (typeof window === 'undefined') {
    return { user: null, session: null };
  }
  
  const data = (window as any).__ASTRO_STACK_AUTH__;
  return data || { user: null, session: null };
}

// Export for external hydration triggers
export { hydrateAllIslands };

/**
 * Trigger hydration for all islands with specific strategies
 */
async function hydrateAllIslands(strategy?: 'onVisible' | 'onIdle') {
  const promises: Promise<void>[] = [];
  
  islandStates.forEach((islandState, islandId) => {
    if (!islandState.hydrated && islandState.hydratingPromise) {
      promises.push(islandState.hydratingPromise);
    }
  });
  
  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}

// Auto-hydrate based on Intersection Observer for onVisible strategy
if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        const islandId = element.dataset.islandId;
        
        if (islandId) {
          const islandState = islandStates.get(islandId);
          if (islandState && !islandState.hydrated) {
            islandState.hydratingPromise = hydrateAllIslands('onVisible');
          }
        }
      }
    });
  });
  
  // Auto-hydrate on idle for onIdle strategy
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      hydrateAllIslands('onIdle').catch(console.error);
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      hydrateAllIslands('onIdle').catch(console.error);
    }, 1000);
  }
}