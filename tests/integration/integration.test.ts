/**
 * Basic Integration Tests
 * 
 * These tests verify that the Vitest configuration and test utilities
 * are working correctly for Stack Auth Astro integration testing.
 */

import { describe, it, expect, vi } from 'vitest';
import { testUtils, stackAuthMocks, astroTestUtils } from '../setup';

describe('Stack Auth Astro Integration - Test Setup', () => {
  describe('Test Utilities', () => {
    it('should create mock Astro context', () => {
      const context = testUtils.createMockAstroContext();
      
      expect(context).toHaveProperty('locals');
      expect(context).toHaveProperty('request');
      expect(context).toHaveProperty('params');
      expect(context).toHaveProperty('url');
      expect(context.locals.user).toBeNull();
      expect(context.locals.session).toBeNull();
    });

    it('should create mock user with defaults', () => {
      const user = testUtils.createMockUser();
      
      expect(user).toHaveProperty('id', 'test-user-123');
      expect(user).toHaveProperty('email', 'test@example.com');
      expect(user).toHaveProperty('displayName', 'Test User');
      expect(user).toHaveProperty('signedUpAt');
      expect(user.signedUpAt).toBeInstanceOf(Date);
    });

    it('should create mock user with overrides', () => {
      const user = testUtils.createMockUser({
        id: 'custom-user-id',
        email: 'custom@example.com',
        displayName: 'Custom User'
      });
      
      expect(user.id).toBe('custom-user-id');
      expect(user.email).toBe('custom@example.com');
      expect(user.displayName).toBe('Custom User');
    });

    it('should create mock session', () => {
      const session = testUtils.createMockSession();
      
      expect(session).toHaveProperty('id', 'test-session-123');
      expect(session).toHaveProperty('userId', 'test-user-123');
      expect(session).toHaveProperty('expiresAt');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create mock integration config', () => {
      const config = testUtils.createMockIntegrationConfig();
      
      expect(config).toHaveProperty('stackProjectId', 'test-project-id');
      expect(config).toHaveProperty('stackPublishableClientKey', 'test-publishable-key');
      expect(config).toHaveProperty('stackSecretServerKey', 'test-secret-key');
      expect(config).toHaveProperty('prefix', '/handler');
      expect(config).toHaveProperty('addReactRenderer', true);
    });
  });

  describe('Environment Variable Mocking', () => {
    it('should mock Stack Auth environment variables', () => {
      testUtils.mockStackAuthEnv();
      
      expect(process.env.STACK_PROJECT_ID).toBe('test-project-id');
      expect(process.env.STACK_PUBLISHABLE_CLIENT_KEY).toBe('test-publishable-key');
      expect(process.env.STACK_SECRET_SERVER_KEY).toBe('test-secret-key');
    });

    it('should mock custom environment variables', () => {
      testUtils.mockStackAuthEnv({
        STACK_PROJECT_ID: 'custom-project',
        STACK_AUTH_PREFIX: '/auth'
      });
      
      expect(process.env.STACK_PROJECT_ID).toBe('custom-project');
      expect(process.env.STACK_AUTH_PREFIX).toBe('/auth');
    });

    it('should clear environment mocks', () => {
      testUtils.mockStackAuthEnv();
      testUtils.clearEnvMocks();
      
      // Should not have test values after clearing
      expect(process.env.STACK_PROJECT_ID).not.toBe('test-project-id');
    });
  });

  describe('Stack Auth Mocking', () => {
    it('should create Stack SDK mock', () => {
      const stackMock = stackAuthMocks.createStackMock();
      
      expect(stackMock).toHaveProperty('getUser');
      expect(stackMock).toHaveProperty('getSession');
      expect(stackMock).toHaveProperty('signIn');
      expect(stackMock).toHaveProperty('signOut');
      expect(vi.isMockFunction(stackMock.getUser)).toBe(true);
      expect(vi.isMockFunction(stackMock.getSession)).toBe(true);
    });

    it('should create Stack UI mocks', () => {
      const uiMocks = stackAuthMocks.createStackUIMocks();
      
      expect(uiMocks).toHaveProperty('SignIn');
      expect(uiMocks).toHaveProperty('SignUp');
      expect(uiMocks).toHaveProperty('UserButton');
      expect(uiMocks).toHaveProperty('AccountSettings');
      expect(uiMocks).toHaveProperty('StackProvider');
      expect(vi.isMockFunction(uiMocks.SignIn)).toBe(true);
    });
  });

  describe('Astro Testing Utilities', () => {
    it('should create integration context', () => {
      const context = astroTestUtils.createIntegrationContext();
      
      expect(context).toHaveProperty('config');
      expect(context).toHaveProperty('command', 'dev');
      expect(context).toHaveProperty('addRenderer');
      expect(context).toHaveProperty('addMiddleware');
      expect(context).toHaveProperty('injectRoute');
      expect(vi.isMockFunction(context.addRenderer)).toBe(true);
      expect(vi.isMockFunction(context.addMiddleware)).toBe(true);
      expect(vi.isMockFunction(context.injectRoute)).toBe(true);
    });

    it('should create test container', async () => {
      const container = await astroTestUtils.createContainer();
      
      expect(container).toHaveProperty('renderToString');
      expect(container).toHaveProperty('renderToResponse');
      expect(vi.isMockFunction(container.renderToString)).toBe(true);
    });
  });

  describe('Global Test Utilities', () => {
    it('should have global test utilities available', () => {
      expect(globalThis.__TEST_UTILS__).toBeDefined();
      expect(globalThis.__TEST_UTILS__).toBe(testUtils);
    });
  });

  describe('TypeScript Support', () => {
    it('should support TypeScript imports and types', () => {
      // This test verifies TypeScript compilation works
      const user: ReturnType<typeof testUtils.createMockUser> = testUtils.createMockUser();
      const session: ReturnType<typeof testUtils.createMockSession> = testUtils.createMockSession();
      
      expect(user.id).toBe('test-user-123');
      expect(session.id).toBe('test-session-123');
    });
  });
});