// Import our custom types instead of SDK types
import type { User, Session } from './rest-api/types.js';

export interface StackAuthOptions {
  projectId?: string;
  publishableClientKey?: string;
  secretServerKey?: string;
  prefix?: string;
  injectRoutes?: boolean;
  addReactRenderer?: boolean;
  addMiddleware?: boolean;
  skipValidation?: boolean;
}

export interface StackAuthConfig {
  projectId: string;
  publishableClientKey: string;
  secretServerKey: string;
  baseUrl?: string;
  prefix?: string;
}

export interface RequireAuthOptions {
  signInUrl?: string;
  redirectTo?: string;
  throwOnUnauthenticated?: boolean;
}

export interface SignInOptions {
  redirectTo?: string;
  provider?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface SignOutOptions {
  redirectTo?: string;
  clearLocalStorage?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// Connection validation types
export interface ConnectionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  responseTime: number;
  timestamp: Date;
  projectExists?: boolean;
  credentialsValid?: boolean;
  apiReachable?: boolean;
}

export interface ValidationOptions {
  validateConnection?: boolean;
  timeout?: number;
  skipCache?: boolean;
  developmentMode?: boolean;
}

export interface ConnectionCacheEntry {
  result: ConnectionValidationResult;
  timestamp: number;
  ttl: number;
}

// Client-side authentication state management types
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

export interface StorageOptions {
  prefix?: string;
  encrypt?: boolean;
  ttl?: number;
}

export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
}

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

export interface UseAuthStateOptions {
  autoRefresh?: boolean;
  syncAcrossTabs?: boolean;
}

export interface UseAuthStateReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  lastUpdated: number;
}

export interface UseAuthActionsReturn {
  signIn: (provider?: string, options?: any) => Promise<void>;
  signOut: (options?: any) => Promise<void>;
  refreshSession: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

// Re-export our custom types for convenience
export type { User, Session };