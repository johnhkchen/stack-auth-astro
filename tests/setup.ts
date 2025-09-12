/**
 * Vitest Test Setup File
 * 
 * This file sets up testing utilities, mocks, and global configurations
 * for the Stack Auth Astro integration tests.
 */

import { vi, beforeEach, afterEach, afterAll } from 'vitest';
import type { AstroIntegration } from 'astro';
import * as React from 'react';
import { validateTestEnvironment } from './utils/dependency-helpers.js';
import { cleanupTempFiles } from './utils/file-helpers.js';
import { performanceHooks } from './utils/vitest-performance-plugin.js';

// DOM testing utilities
let isDOMEnvironment = false;

// Detect if we're running in jsdom environment
try {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    isDOMEnvironment = true;
    
    // Set up DOM-specific globals for testing
    global.ResizeObserver = global.ResizeObserver || class ResizeObserver {
      constructor(callback: ResizeObserverCallback) {}
      observe(target: Element, options?: ResizeObserverOptions): void {}
      unobserve(target: Element): void {}
      disconnect(): void {}
    };
    
    global.IntersectionObserver = global.IntersectionObserver || class IntersectionObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
      observe(target: Element): void {}
      unobserve(target: Element): void {}
      disconnect(): void {}
    };
  }
} catch (e) {
  // Running in Node.js environment
  isDOMEnvironment = false;
}

// Global test utilities available in all tests
declare global {
  var __TEST_UTILS__: typeof testUtils;
}

/**
 * Test utilities for Stack Auth and Astro integration testing
 */
export const testUtils = {
  /**
   * Creates a mock Astro context for testing
   */
  createMockAstroContext(overrides: Partial<any> = {}) {
    return {
      locals: {
        user: null,
        session: null,
        ...overrides.locals
      },
      request: new Request('http://localhost:3000/', overrides.request),
      params: overrides.params || {},
      url: new URL(overrides.url || 'http://localhost:3000/'),
      ...overrides
    };
  },

  /**
   * Creates a mock Stack Auth user for testing
   */
  createMockUser(overrides: Partial<any> = {}) {
    return {
      id: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      profileImageUrl: null,
      signedUpAt: new Date(),
      ...overrides
    };
  },

  /**
   * Creates a mock Stack Auth session for testing
   */
  createMockSession(overrides: Partial<any> = {}) {
    return {
      id: 'test-session-123',
      userId: 'test-user-123',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      ...overrides
    };
  },

  /**
   * Creates a mock Astro integration config for testing
   */
  createMockIntegrationConfig(overrides: Partial<any> = {}) {
    return {
      stackProjectId: 'test-project-id',
      stackPublishableClientKey: 'test-publishable-key',
      stackSecretServerKey: 'test-secret-key',
      prefix: '/handler',
      addReactRenderer: true,
      ...overrides
    };
  },

  /**
   * Mocks environment variables for Stack Auth
   */
  mockStackAuthEnv(config: Partial<{
    STACK_PROJECT_ID: string;
    STACK_PUBLISHABLE_CLIENT_KEY: string;
    STACK_SECRET_SERVER_KEY: string;
    STACK_AUTH_PREFIX: string;
  }> = {}) {
    vi.stubEnv('STACK_PROJECT_ID', config.STACK_PROJECT_ID || 'test-project-id');
    vi.stubEnv('STACK_PUBLISHABLE_CLIENT_KEY', config.STACK_PUBLISHABLE_CLIENT_KEY || 'test-publishable-key');
    vi.stubEnv('STACK_SECRET_SERVER_KEY', config.STACK_SECRET_SERVER_KEY || 'test-secret-key');
    if (config.STACK_AUTH_PREFIX) {
      vi.stubEnv('STACK_AUTH_PREFIX', config.STACK_AUTH_PREFIX);
    }
  },

  /**
   * Clears all environment variable mocks
   */
  clearEnvMocks() {
    vi.unstubAllEnvs();
  },

  /**
   * DOM testing utilities - only available in jsdom environment
   */
  dom: {
    /**
     * Creates a DOM container for React component testing
     */
    createContainer(): HTMLDivElement {
      if (typeof document === 'undefined') {
        throw new Error('DOM utilities can only be used in jsdom environment');
      }
      const container = document.createElement('div');
      container.setAttribute('data-testid', 'test-container');
      document.body.appendChild(container);
      return container;
    },

    /**
     * Cleans up DOM containers and elements
     */
    cleanup() {
      if (typeof document !== 'undefined') {
        const containers = document.querySelectorAll('[data-testid="test-container"]');
        containers.forEach(container => container.remove());
        
        // Clear document body children if needed
        while (document.body.firstChild) {
          document.body.removeChild(document.body.firstChild);
        }
      }
    },

    /**
     * Simulates user interactions
     */
    simulate: {
      click(element: Element) {
        if (typeof element.dispatchEvent === 'function') {
          element.dispatchEvent(new Event('click', { bubbles: true }));
        }
      },
      
      change(element: Element, value: string) {
        if (element instanceof HTMLInputElement) {
          element.value = value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    },

    /**
     * DOM assertion helpers
     */
    expect: {
      elementToBeInDocument(element: Element | null) {
        if (!element) {
          throw new Error('Expected element to be in document, but element was null');
        }
        if (typeof document === 'undefined') {
          throw new Error('DOM expectations can only be used in jsdom environment');
        }
        if (!document.body.contains(element)) {
          throw new Error('Expected element to be in document');
        }
      },

      elementToHaveTextContent(element: Element | null, text: string) {
        if (!element) {
          throw new Error('Expected element to have text content, but element was null');
        }
        if (element.textContent !== text) {
          throw new Error(`Expected element to have text content "${text}", but got "${element.textContent}"`);
        }
      }
    }
  }
};

// Stack Auth SDK mocks
export const stackAuthMocks = {
  /**
   * Mock Stack Auth SDK with components
   */
  createStackMock() {
    // Create mock React components that return proper JSX
    const createMockComponent = (name: string) => {
      const Component = vi.fn((props: any) => {
        // Return a proper React element for testing
        return React.createElement('div', {
          'data-testid': props['data-testid'] || name.toLowerCase(),
          'data-stack-component': name,
          'data-mock': 'true',
          children: props.children || `Mock ${name}`
        });
      });
      Component.displayName = `Mock${name}`;
      return Component;
    };

    return {
      // Core SDK functions
      getUser: vi.fn().mockResolvedValue(null),
      getSession: vi.fn().mockResolvedValue(null),
      signIn: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
      middleware: vi.fn(),
      handler: vi.fn(),
      
      // Component exports (these are imported from @stackframe/stack in components.ts)
      UserButton: createMockComponent('UserButton'),
      SignIn: createMockComponent('SignIn'),
      SignUp: createMockComponent('SignUp'),
      AccountSettings: createMockComponent('AccountSettings'),
      StackProvider: vi.fn(({ children }: { children: any }) => {
        return React.createElement('div', {
          'data-testid': 'stack-provider',
          'data-stack-component': 'StackProvider',
          'data-mock': 'true'
        }, children);
      }),
      
      // Additional Stack Auth exports that might be imported
      StackClientApp: vi.fn(),
      StackServerApp: vi.fn(),
    };
  },

  /**
   * Mock Stack Auth UI components (for @stackframe/stack-ui if used separately)
   */
  createStackUIMocks() {
    // Create mock React components that return proper JSX
    const createMockComponent = (name: string) => {
      const Component = vi.fn((props: any) => {
        return React.createElement('div', {
          'data-testid': props['data-testid'] || `ui-${name.toLowerCase()}`,
          'data-stack-ui-component': name,
          'data-mock': 'true',
          children: props.children || `Mock UI ${name}`
        });
      });
      Component.displayName = `MockUI${name}`;
      return Component;
    };

    return {
      SignIn: createMockComponent('SignIn'),
      SignUp: createMockComponent('SignUp'),
      UserButton: createMockComponent('UserButton'),
      AccountSettings: createMockComponent('AccountSettings'),
      StackProvider: vi.fn(({ children }: { children: any }) => {
        return React.createElement('div', {
          'data-testid': 'ui-stack-provider',
          'data-stack-ui-component': 'StackProvider',
          'data-mock': 'true'
        }, children);
      })
    };
  }
};

// Astro Container API testing utilities
export const astroTestUtils = {
  /**
   * Creates a test container for Astro components
   * Note: This will be expanded when we implement actual Astro integration
   */
  async createContainer() {
    // Will use Astro Container API once integration is implemented
    return {
      renderToString: vi.fn(),
      renderToResponse: vi.fn()
    };
  },

  /**
   * Mock Astro integration context
   */
  createIntegrationContext(): Parameters<AstroIntegration['hooks']['astro:config:setup']>[0] {
    return {
      config: {
        root: new URL('file:///test/'),
        srcDir: new URL('file:///test/src/'),
        publicDir: new URL('file:///test/public/'),
        outDir: new URL('file:///test/dist/'),
        build: {
          format: 'directory' as const,
          client: new URL('file:///test/dist/client/'),
          server: new URL('file:///test/dist/server/'),
          assets: '_astro'
        },
        server: { host: false, port: 3000 },
        integrations: [],
        adapter: undefined,
        markdown: {},
        vite: {},
        experimental: {},
        legacy: {}
      } as any,
      command: 'dev' as const,
      isRestart: false,
      addRenderer: vi.fn(),
      addWatchFile: vi.fn(),
      addClientDirective: vi.fn(),
      addMiddleware: vi.fn(),
      addDevToolbarApp: vi.fn(),
      injectRoute: vi.fn(),
      injectScript: vi.fn(),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info' as const,
        label: 'test',
        fork: vi.fn()
      }
    };
  }
};

// Global setup
globalThis.__TEST_UTILS__ = testUtils;

// Validate test environment on startup
const envValidation = validateTestEnvironment();
if (envValidation.warnings.length > 0) {
  console.warn('⚠️  Test environment warnings:');
  envValidation.warnings.forEach(warning => console.warn(`  • ${warning}`));
}
if (envValidation.errors.length > 0) {
  console.error('❌ Test environment errors:');
  envValidation.errors.forEach(error => console.error(`  • ${error}`));
}

// Mock Stack Auth modules by default
vi.mock('@stackframe/stack', () => stackAuthMocks.createStackMock());
vi.mock('@stackframe/stack-ui', () => stackAuthMocks.createStackUIMocks());

// Setup and teardown hooks
beforeEach((context) => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  testUtils.clearEnvMocks();
  
  // Start performance monitoring for this test
  performanceHooks.beforeEach(context);
});

afterEach((context) => {
  // End performance monitoring for this test
  performanceHooks.afterEach(context);
  
  // Clean up after each test
  vi.restoreAllMocks();
  cleanupTempFiles();
  
  // Clean up DOM if in jsdom environment
  testUtils.dom.cleanup();
});

afterAll(() => {
  // Generate final performance report
  performanceHooks.afterAll();
});

// Export default test utilities
export default testUtils;