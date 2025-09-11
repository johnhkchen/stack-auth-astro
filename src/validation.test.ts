/**
 * Tests for validation and error handling functionality
 * 
 * Tests error scenarios, edge cases, and validation logic
 * to ensure robust integration operation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateEnvironmentVariables,
  validateConfiguration,
  validateStackAuthOptions,
  validateRuntimeCompatibility,
  validateComplete,
  validateCriticalDependencies,
  validateCompleteWithDependencies
} from './validation.js';
import {
  StackAuthConfigurationError,
  StackAuthEnvironmentError,
  ERROR_MESSAGES
} from './errors.js';
import { getConfig, validateConfig, tryGetConfig, hasValidConfig } from './config.js';

describe('Environment Variable Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.STACK_PROJECT_ID;
    delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
    delete process.env.STACK_SECRET_SERVER_KEY;
    delete process.env.STACK_BASE_URL;
    delete process.env.STACK_AUTH_PREFIX;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should fail validation when required environment variables are missing', () => {
    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('STACK_PROJECT_ID is required');
    expect(result.errors).toContain('STACK_PUBLISHABLE_CLIENT_KEY is required');
    expect(result.errors).toContain('STACK_SECRET_SERVER_KEY is required');
  });

  it('should pass validation when all required variables are present', () => {
    process.env.STACK_PROJECT_ID = 'test_project_id_12345';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_test_key_12345';

    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn about missing optional variables', () => {
    process.env.STACK_PROJECT_ID = 'test_project_id_12345';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_test_key_12345';

    const result = validateEnvironmentVariables();
    
    expect(result.warnings).toContain('STACK_BASE_URL not set, using Stack Auth default API endpoint');
  });

  it('should validate environment variable formats', () => {
    process.env.STACK_PROJECT_ID = 'invalid';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_test_key_12345';

    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('STACK_PROJECT_ID format appears invalid (should be a UUID or similar identifier)');
  });

  it('should warn about using live keys in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.STACK_PROJECT_ID = 'test_project_id_12345';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_live_key_12345';

    const result = validateEnvironmentVariables();
    
    expect(result.warnings).toContain('Using live secret key in development environment - consider using test keys');
  });
});

describe('Configuration Validation', () => {
  it('should validate required configuration fields', () => {
    const config = {};
    const result = validateConfiguration(config);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('projectId is required');
    expect(result.errors).toContain('publishableClientKey is required');
    expect(result.errors).toContain('secretServerKey is required');
  });

  it('should pass validation with valid configuration', () => {
    const config = {
      projectId: 'test_project_id_12345',
      publishableClientKey: 'pk_test_key_12345',
      secretServerKey: 'sk_test_key_12345'
    };
    
    const result = validateConfiguration(config);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate base URL format', () => {
    const config = {
      projectId: 'test_project_id_12345',
      publishableClientKey: 'pk_test_key_12345',
      secretServerKey: 'sk_test_key_12345',
      baseUrl: 'invalid-url'
    };
    
    const result = validateConfiguration(config);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('baseUrl must be a valid URL');
  });

  it('should validate prefix format', () => {
    const config = {
      projectId: 'test_project_id_12345',
      publishableClientKey: 'pk_test_key_12345',
      secretServerKey: 'sk_test_key_12345',
      prefix: 'invalid-prefix'
    };
    
    const result = validateConfiguration(config);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('prefix must start with "/" and contain only valid URL characters');
  });
});

describe('Stack Auth Options Validation', () => {
  it('should validate prefix option', () => {
    const options = {
      prefix: 'invalid-prefix'
    };
    
    const result = validateStackAuthOptions(options);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('prefix must start with "/" and contain only valid URL characters');
  });

  it('should validate boolean options', () => {
    const options = {
      addReactRenderer: 'true' as any // Should be boolean
    };
    
    const result = validateStackAuthOptions(options);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('addReactRenderer must be a boolean');
  });

  it('should validate addMiddleware boolean option', () => {
    const options = {
      addMiddleware: 'false' as any // Should be boolean
    };
    
    const result = validateStackAuthOptions(options);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('addMiddleware must be a boolean');
  });

  it('should validate options with config fields', () => {
    const options = {
      projectId: '',
      publishableClientKey: 'pk_test_key',
      secretServerKey: 'sk_test_key'
    };
    
    const result = validateStackAuthOptions(options);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('projectId is required');
  });
});

describe('Runtime Compatibility Validation', () => {
  it('should check Node.js version', () => {
    const result = validateRuntimeCompatibility();
    
    // Should not fail on Node 18+ (current environment)
    expect(result.isValid).toBe(true);
  });
});

describe('Configuration Loading', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STACK_PROJECT_ID;
    delete process.env.STACK_PUBLISHABLE_CLIENT_KEY;
    delete process.env.STACK_SECRET_SERVER_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw StackAuthEnvironmentError when environment variables are missing', () => {
    expect(() => getConfig()).toThrow(StackAuthEnvironmentError);
  });

  it('should return valid configuration when environment is set', () => {
    process.env.STACK_PROJECT_ID = 'test_project_id_12345';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_test_key_12345';

    const config = getConfig();
    
    expect(config.projectId).toBe('test_project_id_12345');
    expect(config.publishableClientKey).toBe('pk_test_key_12345');
    expect(config.secretServerKey).toBe('sk_test_key_12345');
    expect(config.prefix).toBe('/handler');
  });

  it('should use custom prefix from environment', () => {
    process.env.STACK_PROJECT_ID = 'test_project_id_12345';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_test_key_12345';
    process.env.STACK_AUTH_PREFIX = '/auth';

    const config = getConfig();
    
    expect(config.prefix).toBe('/auth');
  });

  it('should safely try to get configuration', () => {
    const { config, validation } = tryGetConfig();
    
    expect(config).toBeNull();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should correctly report configuration status', () => {
    expect(hasValidConfig()).toBe(false);

    process.env.STACK_PROJECT_ID = 'test_project_id_12345';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_test_key_12345';

    expect(hasValidConfig()).toBe(true);
  });
});

describe('Critical Dependencies Validation', () => {
  it('should pass validation when skipValidation is true', () => {
    const result = validateCriticalDependencies({ skipValidation: true });
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toContain('⚠️  Dependency validation skipped - ensure all required files exist');
  });

  it('should detect stub API handler implementation', () => {
    const result = validateCriticalDependencies({ 
      injectRoutes: true,
      addMiddleware: true 
    });
    
    // Since we know the current handler is a stub, this should generate warnings
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(warning => 
      warning.includes('stub implementation') || warning.includes('Sprint 002')
    )).toBe(true);
  });

  it('should detect stub middleware implementation', () => {
    const result = validateCriticalDependencies({ 
      injectRoutes: true,
      addMiddleware: true 
    });
    
    // Since we know the current middleware is a stub, this should generate warnings
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(warning => 
      warning.includes('stub implementation') || warning.includes('Sprint 002')
    )).toBe(true);
  });

  it('should skip API handler validation when route injection is disabled', () => {
    const result = validateCriticalDependencies({ 
      injectRoutes: false,
      addMiddleware: true 
    });
    
    // Should not contain API handler errors
    expect(result.errors.every(error => !error.includes('API handler'))).toBe(true);
  });

  it('should skip middleware validation when middleware is disabled', () => {
    const result = validateCriticalDependencies({ 
      injectRoutes: true,
      addMiddleware: false 
    });
    
    // Should not contain middleware errors
    expect(result.errors.every(error => !error.includes('middleware'))).toBe(true);
  });

  it('should provide helpful error messages for missing files', () => {
    // This test assumes the files exist but are stubs
    // In a real scenario where files don't exist, we would get the missing file errors
    const result = validateCriticalDependencies({ 
      injectRoutes: true,
      addMiddleware: true 
    });
    
    // Check that stub warnings contain Sprint references
    result.warnings.forEach(warning => {
      if (warning.includes('stub implementation')) {
        expect(warning).toContain('Sprint 002');
      }
    });
  });
});

describe('Complete Validation with Dependencies', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STACK_PROJECT_ID = 'test_project_id_12345';
    process.env.STACK_PUBLISHABLE_CLIENT_KEY = 'pk_test_key_12345';
    process.env.STACK_SECRET_SERVER_KEY = 'sk_test_key_12345';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should combine environment and dependency validation', () => {
    const result = validateCompleteWithDependencies({
      injectRoutes: true,
      addMiddleware: true
    });
    
    // Should be valid since environment is set and files exist (even if stubs)
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0); // Should have stub warnings
  });

  it('should fail when environment is missing', () => {
    delete process.env.STACK_PROJECT_ID;
    
    const result = validateCompleteWithDependencies({
      injectRoutes: true,
      addMiddleware: true
    });
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('STACK_PROJECT_ID'))).toBe(true);
  });

  it('should respect skipValidation option', () => {
    delete process.env.STACK_PROJECT_ID; // This would normally cause failure
    
    const result = validateCompleteWithDependencies({
      skipValidation: true,
      injectRoutes: true,
      addMiddleware: true
    });
    
    // Should still fail due to missing environment variables (base validation)
    expect(result.isValid).toBe(false);
    // But should have dependency validation warning
    expect(result.warnings.some(warning => 
      warning.includes('Dependency validation skipped')
    )).toBe(true);
  });

  it('should respect addMiddleware: false option in dependency validation', () => {
    const result = validateCompleteWithDependencies({
      injectRoutes: true,
      addMiddleware: false
    });
    
    // Should be valid since environment is set and middleware validation is skipped
    expect(result.isValid).toBe(true);
    // Should not contain middleware-specific validation errors
    const hasMiddlewareValidationErrors = [...result.errors, ...result.warnings]
      .some(message => 
        message.includes('Missing implementation: src/middleware.ts') ||
        message.includes('Stack Auth middleware is required')
      );
    expect(hasMiddlewareValidationErrors).toBe(false);
  });
});

describe('Error Message Quality', () => {
  it('should provide helpful error messages', () => {
    expect(ERROR_MESSAGES.MISSING_PROJECT_ID).toContain('STACK_PROJECT_ID');
    expect(ERROR_MESSAGES.MISSING_PROJECT_ID).toContain('https://app.stack-auth.com');
    expect(ERROR_MESSAGES.MISSING_PUBLISHABLE_KEY).toContain('STACK_PUBLISHABLE_CLIENT_KEY');
    expect(ERROR_MESSAGES.MISSING_SECRET_KEY).toContain('STACK_SECRET_SERVER_KEY');
  });

  it('should include setup instructions', () => {
    expect(ERROR_MESSAGES.DEVELOPMENT_SETUP_GUIDE).toContain('npm install astro-stack-auth');
    expect(ERROR_MESSAGES.DEVELOPMENT_SETUP_GUIDE).toContain('astroStackAuth()');
  });

  it('should provide helpful dependency error messages', () => {
    expect(ERROR_MESSAGES.MISSING_API_HANDLER).toContain('src/api/handler.ts');
    expect(ERROR_MESSAGES.MISSING_API_HANDLER).toContain('Sprint 002');
    expect(ERROR_MESSAGES.MISSING_API_HANDLER).toContain('skipValidation: true');
    
    expect(ERROR_MESSAGES.MISSING_MIDDLEWARE).toContain('src/middleware.ts');
    expect(ERROR_MESSAGES.MISSING_MIDDLEWARE).toContain('Sprint 002');
    expect(ERROR_MESSAGES.MISSING_MIDDLEWARE).toContain('skipValidation: true');
    
    expect(ERROR_MESSAGES.STUB_IMPLEMENTATION_WARNING).toContain('Sprint 001');
    expect(ERROR_MESSAGES.STUB_IMPLEMENTATION_WARNING).toContain('Sprint 002');
  });
});