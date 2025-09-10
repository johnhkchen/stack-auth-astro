/**
 * Tests for Dependency Management Helpers
 * 
 * Validates that our enhanced dependency management utilities
 * work correctly in various scenarios.
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  checkDependency, 
  safeImport,
  importWithBuildFallback,
  validateTestEnvironment,
  isTestEnvironment,
  createMockModule
} from './dependency-helpers.js';

describe('Dependency Helpers', () => {
  describe('checkDependency', () => {
    it('should detect available dependencies', () => {
      // Node.js built-in modules should be available
      const result = checkDependency('path');
      expect(result.isAvailable).toBe(true);
    });

    it('should handle missing dependencies gracefully', () => {
      const result = checkDependency('non-existent-package-xyz-123');
      expect(result.isAvailable).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should get version information when available', () => {
      // Try vitest since it's definitely available in test environment
      const result = checkDependency('vitest');
      if (result.isAvailable) {
        expect(result.version).toBeDefined();
        expect(typeof result.version).toBe('string');
      }
    });
  });

  describe('safeImport', () => {
    it('should import available modules successfully', async () => {
      const result = await safeImport('path');
      expect(result.success).toBe(true);
      expect(result.module).toBeDefined();
      expect(result.source).toBe('actual');
    });

    it('should handle missing modules gracefully', async () => {
      const result = await safeImport('non-existent-module-xyz-123');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should try fallbacks when main import fails', async () => {
      const result = await safeImport(
        'non-existent-module-xyz-123',
        ['path'] // path should exist as fallback
      );
      expect(result.success).toBe(true);
      expect(result.source).toBe('fallback');
    });
  });

  describe('createMockModule', () => {
    it('should create mock modules with expected exports', () => {
      const mock = createMockModule(['default', 'getUser', 'SignIn', 'useAuth']);
      
      expect(mock.default).toBeDefined();
      expect(typeof mock.default).toBe('function');
      expect(typeof mock.getUser).toBe('function');
      expect(typeof mock.SignIn).toBe('function');
      expect(typeof mock.useAuth).toBe('function');
    });

    it('should create appropriate mocks based on naming patterns', () => {
      const mock = createMockModule(['useCustomHook', 'MyComponent', 'regularFunction']);
      
      // Hooks should return something when called
      expect(mock.useCustomHook()).toBe(null);
      // Components should return null (React components)
      expect(mock.MyComponent()).toBe(null);
      // Regular functions should be async and return promises
      expect(mock.regularFunction()).toBeInstanceOf(Promise);
    });
  });

  describe('isTestEnvironment', () => {
    it('should correctly detect test environment', () => {
      // We're running in vitest, so this should be true
      expect(isTestEnvironment()).toBe(true);
    });
  });

  describe('validateTestEnvironment', () => {
    it('should validate test environment and return results', () => {
      const validation = validateTestEnvironment();
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('warnings');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('stackAuth');
      
      expect(Array.isArray(validation.warnings)).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(typeof validation.stackAuth).toBe('object');
    });

    it('should check Stack Auth dependencies', () => {
      const validation = validateTestEnvironment();
      
      expect(validation.stackAuth).toHaveProperty('@stackframe/stack');
      expect(validation.stackAuth).toHaveProperty('@stackframe/stack-ui');
      
      // Each should have availability information
      expect(validation.stackAuth['@stackframe/stack']).toHaveProperty('isAvailable');
      expect(validation.stackAuth['@stackframe/stack-ui']).toHaveProperty('isAvailable');
    });
  });

  describe('importWithBuildFallback', () => {
    it('should handle non-existent modules gracefully', async () => {
      const result = await importWithBuildFallback('non-existent-module');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      const result = await importWithBuildFallback('non-existent-module');
      expect(result.error).toContain('Module non-existent-module not found');
    });
  });
});