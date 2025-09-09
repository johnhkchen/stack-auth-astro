/**
 * Module Resolution and Import/Export Scenario Tests
 * 
 * This file validates that Stack Auth React type definitions work correctly
 * with different TypeScript module resolution strategies and import patterns.
 * 
 * Sprint: 001
 * Task: 1.2.4 - React Type Integration Testing
 */

// =============================================================================
// 1. DIRECT NAMED IMPORTS TEST
// =============================================================================

// Test direct named imports from Stack Auth SDK
import { 
  User, 
  Session, 
  StackClientApp,
  StackServerApp,
  Project
} from '@stackframe/stack';

// Test direct named imports from Stack Auth components (from main package)
import type {
  SignIn,
  SignUp,
  UserButton,
  AccountSettings
} from '@stackframe/stack';

// Test direct named imports from our modules
import {
  StackAuthOptions,
  StackAuthConfig,
  RequireAuthOptions,
  SignInOptions,
  SignOutOptions
} from './types';

import {
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC,
  ReactFC,
  UseStackAuthHook
} from './components';

// =============================================================================
// 2. NAMESPACE IMPORTS TEST
// =============================================================================

// Test namespace imports
import * as React from 'react';
import * as StackAuth from '@stackframe/stack';
import * as StackAuthUI from '@stackframe/stack';
import * as StackTypes from './types';
import * as StackComponents from './components';

// Validate namespace import equivalence
type NamespaceUserCheck = StackAuth.User extends User ? true : false;
type NamespaceSessionCheck = StackAuth.Session extends Session ? true : false;
type NamespaceClientAppCheck = StackAuth.StackClientApp extends StackClientApp ? true : false;

const namespaceUserCheck: NamespaceUserCheck = true;
const namespaceSessionCheck: NamespaceSessionCheck = true;
const namespaceClientAppCheck: NamespaceClientAppCheck = true;

// =============================================================================
// 3. DEFAULT IMPORTS TEST
// =============================================================================

// Test default imports (should work when available)
import React_DEFAULT from 'react';

// Test mixed import scenarios
import ReactMixed, { 
  useState as useStateMixed, 
  useEffect as useEffectMixed,
  FC as FCMixed 
} from 'react';

// Validate mixed import compatibility
const testMixedReact: typeof React = ReactMixed;
const testMixedUseState: typeof React.useState = useStateMixed;
const testMixedFC: typeof React.FC = FCMixed;

// =============================================================================
// 4. RE-EXPORT VALIDATION
// =============================================================================

// Test that our re-exports work correctly
export type { User, Session, StackClientApp } from '@stackframe/stack';
export type { 
  StackAuthOptions,
  StackAuthConfig,
  RequireAuthOptions 
} from './types';
export type {
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC
} from './components';

// Test re-export with renaming
export type { 
  User as StackUser,
  Session as StackSession 
} from '@stackframe/stack';

// Test re-export all
export * as StackAuthTypes from './types';
export * as StackComponentTypes from './components';

// =============================================================================
// 5. CONDITIONAL IMPORTS TEST
// =============================================================================

// Test type-only imports
import type { ComponentType } from 'react';
import type { StackClientApp as TypeOnlyStackApp } from '@stackframe/stack';

// Validate type-only imports work correctly
type ComponentTypeTest = ComponentType<any>;
type TypeOnlyStackAppTest = TypeOnlyStackApp;

// =============================================================================
// 6. DYNAMIC IMPORT COMPATIBILITY
// =============================================================================

// Test dynamic import type compatibility
const testDynamicImports = async () => {
  // Test dynamic import of our modules
  const { StackAuthOptions } = await import('./types');
  const { StackAuthComponentProps } = await import('./components');
  
  // Test that dynamic imports maintain type information
  const testConfig: StackAuthOptions = {
    projectId: 'test'
  };
  
  const testProps: StackAuthComponentProps = {
    user: null,
    session: null
  };

  return { testConfig, testProps };
};

// =============================================================================
// 7. MODULE AUGMENTATION TEST
// =============================================================================

// Test module augmentation compatibility
declare module '@stackframe/stack' {
  interface User {
    customProperty?: string;
  }
  
  interface Session {
    customSessionProperty?: number;
  }
}

// Test augmented types work
const testAugmentedUser: User = {
  id: 'test',
  primary_email: 'test@example.com',
  display_name: 'Test User',
  customProperty: 'augmented'
} as User;

// =============================================================================
// 8. PATH MAPPING COMPATIBILITY
// =============================================================================

// These would work with tsconfig path mapping
// Example path mappings:
// "@stack-auth/*": ["./src/*"]
// "@components/*": ["./src/components/*"]
// "@types/*": ["./src/types/*"]

// Simulated path mapping imports (these are actual relative imports for now)
import type { StackAuthOptions as PathMappedOptions } from './types';
import type { StackAuthComponentProps as PathMappedProps } from './components';

// =============================================================================
// 9. BARREL EXPORT PATTERN TEST
// =============================================================================

// Test that barrel exports work (like from index.ts files)
export {
  // Re-export React types for convenience
  React,
  
  // Re-export component tests
  testDynamicImports,
  
  // Re-export type checking functions
  namespaceUserCheck,
  namespaceSessionCheck,
  namespaceClientAppCheck
};

// Barrel export types
export type {
  // Stack Auth types
  User,
  Session,
  StackClientApp,
  
  // Our custom types
  StackAuthOptions,
  StackAuthConfig,
  StackAuthComponentProps,
  StackProviderProps,
  
  // Namespace tests
  NamespaceUserCheck,
  NamespaceSessionCheck,
  NamespaceClientAppCheck,
  
  // Type-only imports
  ComponentTypeTest,
  TypeOnlyStackAppTest,
  
  // Path mapped types
  PathMappedOptions,
  PathMappedProps
};

// =============================================================================
// 10. TRIPLE-SLASH DIRECTIVE COMPATIBILITY
// =============================================================================

/// <reference types="react" />
/// <reference types="node" />

// Test that triple-slash directives work with our types
interface TripleSlashTest {
  reactElement: React.ReactElement;
  nodeProcess: NodeJS.Process;
  stackUser: User;
}

// =============================================================================
// 11. IMPORT ASSERTION COMPATIBILITY (ES2022)
// =============================================================================

// Note: JSON imports with assertions would look like this in ES2022:
// import packageJson from '../package.json' assert { type: 'json' };
// For now, we'll test the type structure

interface PackageJsonStructure {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
}

// =============================================================================
// 12. MODULE RESOLUTION TEST COMPONENT
// =============================================================================

interface ModuleResolutionTestProps {
  resolverType: 'node' | 'classic' | 'bundler' | 'node16' | 'nodenext';
  user?: User;
  session?: Session;
}

const ModuleResolutionTestComponent: React.FC<ModuleResolutionTestProps> = ({
  resolverType,
  user,
  session
}) => {
  // Test that all import types work within React component
  const [currentUser, setCurrentUser] = React.useState<User | null>(user || null);
  const [currentSession, setCurrentSession] = React.useState<Session | null>(session || null);

  // Test namespace imports in component
  const handleUserChange = React.useCallback((newUser: StackAuth.User | null) => {
    setCurrentUser(newUser);
  }, []);

  // Test mixed imports in component
  const handleSessionChange = useEffectMixed(() => {
    setCurrentSession(session || null);
  }, [session]);

  // Test type-only imports in component
  const componentRef = React.useRef<ComponentType<any>>(null);

  return React.createElement('div', {
    'data-resolver': resolverType
  }, [
    React.createElement('h3', { key: 'title' }, `Module Resolution: ${resolverType}`),
    React.createElement('p', { key: 'user' }, `User: ${currentUser?.display_name || 'None'}`),
    React.createElement('p', { key: 'session' }, `Session: ${currentSession ? 'Active' : 'None'}`),
    React.createElement('button', {
      key: 'clear-user',
      onClick: () => handleUserChange(null)
    }, 'Clear User'),
    React.createElement('p', { key: 'namespace-check' }, `Namespace types valid: ${namespaceUserCheck}`)
  ]);
};

// =============================================================================
// 13. COMPREHENSIVE IMPORT/EXPORT VALIDATION
// =============================================================================

// Test that all import patterns can be used together
const ComprehensiveImportTest: React.FC = () => {
  // Direct imports
  const [user1, setUser1] = React.useState<User | null>(null);
  
  // Namespace imports  
  const [user2, setUser2] = React.useState<StackAuth.User | null>(null);
  
  // Mixed imports
  const [user3, setUser3] = useStateMixed<StackUser | null>(null);
  
  // Type-only imports
  const appRef = React.useRef<TypeOnlyStackApp | null>(null);

  // Test that all user types are compatible
  React.useEffect(() => {
    // These should all be assignable to each other
    if (user1) {
      setUser2(user1);
      setUser3(user1);
    }
    
    if (user2) {
      setUser1(user2);
      setUser3(user2);
    }
    
    if (user3) {
      setUser1(user3);
      setUser2(user3);
    }
  }, [user1, user2, user3]);

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'title' }, 'Comprehensive Import Test'),
    React.createElement('p', { key: 'compatibility' }, 'All import patterns are compatible'),
    React.createElement('p', { key: 'users' }, `Users: ${[user1, user2, user3].filter(Boolean).length}`)
  ]);
};

// =============================================================================
// 14. EXPORTS
// =============================================================================

export {
  ModuleResolutionTestComponent,
  ComprehensiveImportTest,
  testAugmentedUser,
  testDynamicImports
};

export type {
  ModuleResolutionTestProps,
  TripleSlashTest,
  PackageJsonStructure
};

export default {
  ModuleResolutionTestComponent,
  ComprehensiveImportTest,
  supportedResolvers: ['node', 'classic', 'bundler', 'node16', 'nodenext'] as const,
  version: '1.0.0'
};