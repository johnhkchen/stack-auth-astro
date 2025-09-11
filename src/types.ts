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
}

export interface SignOutOptions {
  redirectTo?: string;
  clearLocalStorage?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// Re-export Stack Auth types for convenience
export type { User, Session };