/**
 * Vitest Test Setup File
 * 
 * This file sets up testing utilities, mocks, and global configurations
 * for the Stack Auth Astro integration tests.
 */

import { vi } from 'vitest';
import type { AstroIntegration } from 'astro';
import { validateTestEnvironment } from './utils/dependency-helpers.js';
import { cleanupTempFiles } from './utils/file-helpers.js';

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
  }
};

// Stack Auth SDK mocks
export const stackAuthMocks = {
  /**
   * Mock Stack Auth SDK
   */
  createStackMock() {
    return {
      getUser: vi.fn().mockResolvedValue(null),
      getSession: vi.fn().mockResolvedValue(null),
      signIn: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
      middleware: vi.fn(),
      handler: vi.fn()
    };
  },

  /**
   * Mock Stack Auth UI components
   */
  createStackUIMocks() {
    return {
      SignIn: vi.fn(() => null),
      SignUp: vi.fn(() => null),
      UserButton: vi.fn(() => null),
      AccountSettings: vi.fn(() => null),
      StackProvider: vi.fn(({ children }: { children: any }) => children)
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
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  testUtils.clearEnvMocks();
});

afterEach(() => {
  // Clean up after each test
  vi.restoreAllMocks();
  cleanupTempFiles();
});

// Export default test utilities
export default testUtils;