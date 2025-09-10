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
  validateComplete
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
});