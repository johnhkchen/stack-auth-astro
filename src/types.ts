/**
 * TypeScript definitions for astro-stack-auth
 */

import type { User, Session } from '@stackframe/stack';

/**
 * Stack Auth configuration options
 */
export interface StackAuthConfig {
  projectId: string;
  publishableClientKey: string;
  secretServerKey: string;
  baseUrl?: string;
  prefix?: string;
}

/**
 * Options for requireAuth function
 */
export interface RequireAuthOptions {
  redirectTo?: string;
  throwOnUnauthenticated?: boolean;
}

/**
 * Sign in options
 */
export interface SignInOptions {
  provider?: string;
  redirectTo?: string;
  email?: string;
}

/**
 * Sign out options
 */
export interface SignOutOptions {
  redirectTo?: string;
}

/**
 * Extend Astro's locals with Stack Auth user and session
 */
declare global {
  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
    }
  }
}

export {};