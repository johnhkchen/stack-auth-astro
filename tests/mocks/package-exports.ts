/**
 * Mock Package Exports for Runtime Validation
 * 
 * This module defines the expected exports from astro-stack-auth package
 * for runtime validation testing. It mirrors the actual package structure
 * defined in package.json exports field.
 */

import type { User, Session, StackClientApp } from '@stackframe/stack';
import type { APIContext } from 'astro';
import * as React from 'react';

// Mock component exports (astro-stack-auth/components)
export const mockComponentExports = {
  // React components
  SignIn: {} as React.ComponentType<any>,
  SignUp: {} as React.ComponentType<any>,
  UserButton: {} as React.ComponentType<any>,
  AccountSettings: {} as React.ComponentType<any>,
  StackProvider: {} as React.ComponentType<any>,
  
  // Component prop types
  StackAuthComponentProps: {} as any,
  StackProviderProps: {} as any,
  StackAuthFC: {} as any,
  ReactFC: {} as any,
  ReactElement: {} as any,
  ReactComponent: {} as any,
  UseStackAuthHook: {} as any,
  StackAuthContextType: {} as any,
  StackAuthRef: {} as any,
  StackAuthEvent: {} as any,
  StackAuthMouseEvent: {} as any,
  StackAuthChangeEvent: {} as any,
  ForwardRefStackComponentProps: {} as any,
} as const;

// Mock server exports (astro-stack-auth/server)
export const mockServerExports = {
  getUser: {} as (context: APIContext) => Promise<User | null>,
  getSession: {} as (context: APIContext) => Promise<Session | null>,
  requireAuth: {} as (context: APIContext, options?: any) => Promise<User>,
} as const;

// Mock client exports (astro-stack-auth/client)
export const mockClientExports = {
  signIn: {} as (provider?: string, options?: any) => Promise<void>,
  signOut: {} as (options?: any) => Promise<void>,
  redirectToSignIn: {} as (callbackUrl?: string) => void,
  redirectToSignUp: {} as (callbackUrl?: string) => void,
  redirectToAccount: {} as (callbackUrl?: string) => void,
} as const;

// Mock main integration exports (astro-stack-auth)
export const mockMainExports = {
  default: {} as any, // Default export (integration function)
  // Additional named exports if any
} as const;

// Mock middleware exports (astro-stack-auth/middleware)
export const mockMiddlewareExports = {
  // Middleware-related exports
  sequence: {} as any,
  defineMiddleware: {} as any,
} as const;

// Complete export map for validation
export const EXPECTED_PACKAGE_EXPORTS = {
  'astro-stack-auth': mockMainExports,
  'astro-stack-auth/components': mockComponentExports,
  'astro-stack-auth/server': mockServerExports,
  'astro-stack-auth/client': mockClientExports,
  'astro-stack-auth/middleware': mockMiddlewareExports,
} as const;

// Helper functions for runtime validation
export function getExpectedExports(modulePath: string) {
  return EXPECTED_PACKAGE_EXPORTS[modulePath as keyof typeof EXPECTED_PACKAGE_EXPORTS];
}

export function isValidExport(modulePath: string, exportName: string): boolean {
  const expectedExports = getExpectedExports(modulePath);
  return expectedExports && exportName in expectedExports;
}

export function getValidExportNames(modulePath: string): string[] {
  const expectedExports = getExpectedExports(modulePath);
  return expectedExports ? Object.keys(expectedExports) : [];
}

// Export lists for easier testing
export const VALID_COMPONENT_EXPORTS = Object.keys(mockComponentExports);
export const VALID_SERVER_EXPORTS = Object.keys(mockServerExports);
export const VALID_CLIENT_EXPORTS = Object.keys(mockClientExports);
export const VALID_MAIN_EXPORTS = Object.keys(mockMainExports);
export const VALID_MIDDLEWARE_EXPORTS = Object.keys(mockMiddlewareExports);

// Type definitions for runtime validation
export interface PackageExportValidationResult {
  isValid: boolean;
  missingExports: string[];
  unexpectedExports: string[];
  modulePath: string;
}

export interface ComponentExportValidationResult extends PackageExportValidationResult {
  invalidComponentTypes: string[];
  missingReactComponents: string[];
}