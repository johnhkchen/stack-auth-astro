import type { User, Session } from '@stackframe/stack';

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

// Re-export Stack Auth types for convenience
export type { User, Session };