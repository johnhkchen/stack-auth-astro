/**
 * Consumer Integration Type Validation Test
 * 
 * This test validates that all exported types and APIs work correctly
 * from a consumer perspective by testing the built dist files.
 * 
 * Sprint: 001  
 * Task: 1.2.6 - Consumer Project Type Integration Validation
 */

import { describe, test, expect } from 'vitest';
import * as React from 'react';

// Import from dist files to simulate consumer usage
import type { StackAuthConfig, StackAuthOptions } from '../../dist/index.js';
import type { 
  StackAuthComponentProps,
  StackProviderProps,
  StackAuthFC,
  ReactFC,
  ReactElement,
  ReactComponent,
  UseStackAuthHook,
  StackAuthContextType
} from '../../dist/components.js';
import type { User, Session, StackClientApp } from '@stackframe/stack';

describe('Consumer Type Integration Validation', () => {
  test('configuration types are properly exported and usable', () => {
    // Test that configuration types work with all valid properties
    const fullConfig: StackAuthConfig = {
      projectId: 'test-project',
      publishableClientKey: 'test-key',
      secretServerKey: 'secret-key',
      baseUrl: 'https://api.example.com',
      prefix: '/auth'
    };

    const minimalConfig: StackAuthConfig = {
      projectId: 'test-project', 
      publishableClientKey: 'test-key',
      secretServerKey: 'secret-key'
    };

    expect(fullConfig.projectId).toBe('test-project');
    expect(minimalConfig.projectId).toBe('test-project');
    expect(fullConfig.baseUrl).toBe('https://api.example.com');
    expect(minimalConfig.baseUrl).toBeUndefined();
  });

  test('integration options type includes all expected properties', () => {
    // Test StackAuthOptions type structure
    const options: StackAuthOptions = {
      prefix: '/auth',
      injectRoutes: true,
      addReactRenderer: true
    };

    expect(typeof options.prefix).toBe('string');
    expect(typeof options.injectRoutes).toBe('boolean');
    expect(typeof options.addReactRenderer).toBe('boolean');
  });

  test('component prop types are correctly structured', () => {
    // Test component props type
    const mockUser: User = {
      id: 'test-id',
      displayName: 'Test User',
      primaryEmail: 'test@example.com',
      primaryEmailVerified: true,
      profileImageUrl: null,
      signedUpAt: new Date(),
      clientMetadata: {},
      clientReadOnlyMetadata: {},
      hasPassword: true,
      otpAuthEnabled: false,
      passkeyAuthEnabled: false,
      isMultiFactorRequired: false,
      isAnonymous: false,
      emailAuthEnabled: true,
      oauthProviders: [],
      toClientJson: () => ({} as any)
    } as User;

    const mockSession: Session = {
      getTokens: async () => ({
        accessToken: 'test-token',
        refreshToken: 'refresh-token'
      })
    } as Session;

    const componentProps: StackAuthComponentProps = {
      user: mockUser,
      session: mockSession,
      children: React.createElement('span', null, 'Test'),
      className: 'test-class'
    };

    expect(componentProps.user?.id).toBe('test-id');
    expect(componentProps.session?.getTokens).toBeTypeOf('function');
    expect(componentProps.className).toBe('test-class');
  });

  test('StackAuthFC type works with custom props', () => {
    interface CustomProps {
      title: string;
      isVisible?: boolean;
    }

    // Test that StackAuthFC can be used to type a component
    const TestComponent: StackAuthFC<CustomProps> = ({ 
      title, 
      isVisible = true, 
      user, 
      session, 
      children 
    }) => {
      if (!isVisible) return null;
      
      return React.createElement('div', null, [
        React.createElement('h1', { key: 'title' }, title),
        user ? React.createElement('p', { key: 'user' }, user.displayName) : null,
        children
      ]);
    };

    expect(TestComponent).toBeTypeOf('function');
  });

  test('provider props type is correctly structured', () => {
    const mockApp = {} as StackClientApp;
    const children = React.createElement('div', null, 'Provider content');

    const providerProps: StackProviderProps = {
      app: mockApp,
      children: children
    };

    expect(providerProps.app).toBeDefined();
    expect(providerProps.children).toBeDefined();
  });

  test('hook return type is properly typed', () => {
    // Test UseStackAuthHook type structure
    const mockHookResult: ReturnType<UseStackAuthHook> = {
      user: null,
      session: null,  
      isLoading: false
    };

    expect(mockHookResult.user).toBeNull();
    expect(mockHookResult.session).toBeNull();
    expect(mockHookResult.isLoading).toBe(false);
  });

  test('context type allows all expected properties', () => {
    // Test StackAuthContextType structure
    const contextValue: StackAuthContextType = {
      user: null,
      session: null
    };

    const contextWithApp: StackAuthContextType = {
      user: null,
      session: null,
      app: {} as StackClientApp
    };

    expect(contextValue.user).toBeNull();
    expect(contextValue.session).toBeNull();
    expect(contextValue.app).toBeUndefined();
    
    expect(contextWithApp.app).toBeDefined();
  });

  test('ReactFC and other React types are exported correctly', () => {
    // Test that React utility types are available
    const TestReactFC: ReactFC<{ message: string }> = ({ message }) => {
      return React.createElement('p', null, message);
    };

    const testElement: ReactElement = React.createElement('div', null, 'Test');
    
    expect(TestReactFC).toBeTypeOf('function');
    expect(testElement).toBeDefined();
  });

  test('all component prop combinations work correctly', () => {
    // Test various prop combinations that consumers might use
    const propsWithUserOnly: StackAuthComponentProps = {
      user: {
        id: 'user-123',
        displayName: 'John Doe',
        primaryEmail: 'john@example.com',
        primaryEmailVerified: true,
        profileImageUrl: null,
        signedUpAt: new Date(),
        clientMetadata: {},
        clientReadOnlyMetadata: {},
        hasPassword: true,
        otpAuthEnabled: false,
        passkeyAuthEnabled: false,
        isMultiFactorRequired: false,
        isAnonymous: false,
        emailAuthEnabled: true,
        oauthProviders: [],
        toClientJson: () => ({} as any)
      } as User
    };

    const propsWithSessionOnly: StackAuthComponentProps = {
      session: {
        getTokens: async () => ({
          accessToken: 'token',
          refreshToken: 'refresh'
        })
      } as Session
    };

    const propsWithBoth: StackAuthComponentProps = {
      user: propsWithUserOnly.user,
      session: propsWithSessionOnly.session,
      className: 'combined-props'
    };

    const propsMinimal: StackAuthComponentProps = {};

    expect(propsWithUserOnly.user?.id).toBe('user-123');
    expect(propsWithSessionOnly.session?.getTokens).toBeTypeOf('function');
    expect(propsWithBoth.user).toBeDefined();
    expect(propsWithBoth.session).toBeDefined();
    expect(propsWithBoth.className).toBe('combined-props');
    expect(propsMinimal.user).toBeUndefined();
    expect(propsMinimal.session).toBeUndefined();
  });

  test('type exports are accessible from all entry points', () => {
    // This test validates that imports work (if this test compiles, imports work)
    
    // Main exports should be available
    const configTest: StackAuthConfig = {
      projectId: 'test',
      publishableClientKey: 'key',
      secretServerKey: 'secret'
    };

    // Component exports should be available  
    const componentPropsTest: StackAuthComponentProps = {};
    const providerPropsTest: StackProviderProps = {
      app: {} as StackClientApp,
      children: null
    };

    expect(configTest.projectId).toBe('test');
    expect(componentPropsTest).toBeDefined();
    expect(providerPropsTest.app).toBeDefined();
  });

  test('type compatibility with Stack Auth SDK types', () => {
    // Test that our types are compatible with Stack Auth's types
    const stackUser: User = {
      id: 'stack-user',
      displayName: 'Stack User',
      primaryEmail: 'stack@example.com',
      primaryEmailVerified: true,
      profileImageUrl: null,
      signedUpAt: new Date(),
      clientMetadata: {},
      clientReadOnlyMetadata: {},
      hasPassword: false,
      otpAuthEnabled: false,
      passkeyAuthEnabled: false,
      isMultiFactorRequired: false,
      isAnonymous: false,
      emailAuthEnabled: true,
      oauthProviders: [],
      toClientJson: () => ({} as any)
    } as User;

    const stackSession: Session = {
      getTokens: async () => ({
        accessToken: 'stack-access-token',
        refreshToken: 'stack-refresh-token'
      })
    } as Session;

    // Test that Stack Auth types can be used as our component props
    const propsWithStackTypes: StackAuthComponentProps = {
      user: stackUser,
      session: stackSession
    };

    expect(propsWithStackTypes.user?.displayName).toBe('Stack User');
    expect(propsWithStackTypes.session?.getTokens).toBeTypeOf('function');
  });
});

// Type-only tests (these validate at compile time)
describe('Compile-time Type Validation', () => {
  test('function type compatibility', () => {
    // These type assignments will fail compilation if types don't match
    type ServerFunction = (context: any) => Promise<User | null>;
    type ClientFunction = () => Promise<void>;
    
    const serverFnTest: ServerFunction = async () => null;
    const clientFnTest: ClientFunction = async () => undefined;

    expect(serverFnTest).toBeTypeOf('function');
    expect(clientFnTest).toBeTypeOf('function');
  });

  test('complex type combinations', () => {
    // Test complex combinations of types that consumers might use
    type ComplexComponentProps = StackAuthComponentProps & {
      onUserChange?: (user: User | null) => void;
      onSessionChange?: (session: Session | null) => void;
    };

    const complexProps: ComplexComponentProps = {
      user: null,
      session: null,
      onUserChange: (user) => {
        console.log('User changed:', user);
      },
      onSessionChange: (session) => {
        console.log('Session changed:', session);
      }
    };

    expect(complexProps.onUserChange).toBeTypeOf('function');
    expect(complexProps.onSessionChange).toBeTypeOf('function');
  });
});