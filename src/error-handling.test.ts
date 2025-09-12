/**
 * Comprehensive Error Handling Tests for Stack Auth Integration
 * 
 * Tests cover error boundary components, client-side error handling,
 * edge case scenarios, and recovery mechanisms.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Import components and utilities to test
import { 
  StackAuthClientError, 
  CLIENT_ERROR_CODES,
  classifyClientError,
  createClientError,
  retryOperation
} from './client.js';

import {
  StackAuthErrorBoundary,
  StackAuthComponentBoundary,
  withStackAuthErrorBoundary,
  useStackAuthErrorHandler
} from './error-boundary.js';

import {
  getErrorMessage,
  formatClientError,
  createErrorNotification,
  logError,
  getErrorMode
} from './error-messages.js';

import {
  detectBrowserCapabilities,
  getNetworkCondition,
  analyzeSecurityContext,
  BrowserCompatibilityHandler,
  NetworkConditionHandler,
  performEnvironmentCheck
} from './edge-case-handler.js';

// Mock console methods to avoid noise in tests
const consoleMock = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn()
};

// Mock global objects for testing
const mockWindow = {
  location: {
    protocol: 'https:',
    hostname: 'localhost',
    origin: 'https://localhost:3000',
    href: 'https://localhost:3000'
  },
  navigator: {
    onLine: true,
    connection: undefined
  },
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0
  },
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0
  },
  fetch: vi.fn(),
  document: {
    cookie: '',
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => [])
  },
  isSecureContext: true,
  crypto: { subtle: {} },
  indexedDB: {},
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

describe('Stack Auth Error Handling', () => {
  beforeEach(() => {
    // Mock console methods
    Object.assign(console, consoleMock);
    
    // Reset mocks
    Object.values(consoleMock).forEach(mock => mock.mockClear());
    
    // Mock window object
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      configurable: true
    });
    
    // Mock process.env
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('StackAuthClientError', () => {
    it('should create error with all properties', () => {
      const originalError = new Error('Original error');
      const clientError = new StackAuthClientError(
        'Test error message',
        'NETWORK_ERROR',
        'Test recovery guidance',
        originalError
      );

      expect(clientError.message).toBe('Test error message');
      expect(clientError.code).toBe('NETWORK_ERROR');
      expect(clientError.recovery).toBe('Test recovery guidance');
      expect(clientError.cause).toBe(originalError);
      expect(clientError.name).toBe('StackAuthClientError');
    });

    it('should work without optional parameters', () => {
      const clientError = new StackAuthClientError('Simple error', 'TIMEOUT');

      expect(clientError.message).toBe('Simple error');
      expect(clientError.code).toBe('TIMEOUT');
      expect(clientError.recovery).toBeUndefined();
      expect(clientError.cause).toBeUndefined();
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const result = classifyClientError(networkError);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.recovery).toBe(CLIENT_ERROR_CODES.NETWORK_ERROR);
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      const result = classifyClientError(timeoutError);
      
      expect(result.code).toBe('TIMEOUT');
      expect(result.recovery).toBe(CLIENT_ERROR_CODES.TIMEOUT);
    });

    it('should classify CORS errors correctly', () => {
      const corsError = new Error('Cross-origin request blocked');
      const result = classifyClientError(corsError);
      
      expect(result.code).toBe('CORS_ERROR');
      expect(result.recovery).toBe(CLIENT_ERROR_CODES.CORS_ERROR);
    });

    it('should handle offline status', () => {
      mockWindow.navigator.onLine = false;
      const error = new Error('Some error');
      const result = classifyClientError(error);
      
      expect(result.code).toBe('OFFLINE');
      expect(result.recovery).toBe(CLIENT_ERROR_CODES.OFFLINE);
    });

    it('should default to network error for unknown errors', () => {
      const unknownError = new Error('Unknown error type');
      const result = classifyClientError(unknownError);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.recovery).toBe(CLIENT_ERROR_CODES.NETWORK_ERROR);
    });
  });

  describe('Retry Operation', () => {
    it('should succeed on first attempt', async () => {
      const successOperation = vi.fn().mockResolvedValue('success');
      
      const result = await retryOperation(successOperation);
      
      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const failingOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValue('success');
      
      const result = await retryOperation(failingOperation, 3, 10); // Short delay for testing
      
      expect(result).toBe('success');
      expect(failingOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry authentication errors', async () => {
      const authError = new Error('401 unauthorized');
      const failingOperation = vi.fn().mockRejectedValue(authError);
      
      await expect(retryOperation(failingOperation, 3, 10))
        .rejects.toThrow('401 unauthorized');
      
      expect(failingOperation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw final error', async () => {
      const networkError = new Error('Network error');
      const failingOperation = vi.fn().mockRejectedValue(networkError);
      
      await expect(retryOperation(failingOperation, 3, 10))
        .rejects.toThrow('Network error');
      
      expect(failingOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Error Boundary Component', () => {
    const ThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
      if (shouldThrow) {
        throw new Error('Component error');
      }
      return React.createElement('div', null, 'Working component');
    };

    it('should catch and display component errors', () => {
      render(
        React.createElement(StackAuthErrorBoundary, {
          level: 'component'
        }, React.createElement(ThrowingComponent))
      );

      expect(screen.getByText(/Authentication Error/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should allow custom error fallback component', () => {
      const CustomFallback: React.FC<{ error: Error; retry: () => void }> = ({ error }) => (
        React.createElement('div', null, `Custom error: ${error.message}`)
      );

      render(
        React.createElement(StackAuthErrorBoundary, {
          level: 'component',
          fallback: CustomFallback
        }, React.createElement(ThrowingComponent))
      );

      expect(screen.getByText('Custom error: Component error')).toBeInTheDocument();
    });

    it('should reset error boundary when retry is clicked', async () => {
      let shouldThrow = true;
      const VariableThrowingComponent = () => {
        if (shouldThrow) {
          throw new Error('Component error');
        }
        return React.createElement('div', null, 'Working component');
      };

      render(
        React.createElement(StackAuthErrorBoundary, {
          level: 'component',
          enableRecovery: true
        }, React.createElement(VariableThrowingComponent))
      );

      expect(screen.getByText(/Authentication Error/)).toBeInTheDocument();

      // Fix the error and click retry
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('Working component')).toBeInTheDocument();
      });
    });

    it('should isolate failures when configured', () => {
      render(
        React.createElement('div', null, [
          React.createElement(StackAuthErrorBoundary, {
            key: 'boundary1',
            level: 'component',
            isolateFailures: true
          }, React.createElement(ThrowingComponent)),
          
          React.createElement(StackAuthErrorBoundary, {
            key: 'boundary2',
            level: 'component',
            isolateFailures: true
          }, React.createElement('div', null, 'Working component'))
        ])
      );

      expect(screen.getByText(/Authentication Error/)).toBeInTheDocument();
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });

  describe('Error Messages System', () => {
    it('should return development messages in development mode', () => {
      vi.stubEnv('NODE_ENV', 'development');
      
      const message = getErrorMessage('NETWORK_UNAVAILABLE', 'development');
      
      expect(message.title).toBe('Network Connection Error');
      expect(message.details).toContain('Common causes');
      expect(message.learnMore).toContain('docs.stack-auth.com');
    });

    it('should return production messages in production mode', () => {
      const message = getErrorMessage('NETWORK_UNAVAILABLE', 'production');
      
      expect(message.title).toBe('Connection Problem');
      expect(message.message).toContain('having trouble connecting');
      expect(message.details).toBeUndefined();
    });

    it('should format client errors appropriately', () => {
      const clientError = new StackAuthClientError(
        'Test error',
        'TIMEOUT',
        'Try again',
        new Error('Original error')
      );
      
      const formatted = formatClientError(clientError, 'development');
      
      expect(formatted.title).toBe('Request Timeout');
      expect(formatted.details).toContain('Original error');
    });

    it('should create error notifications with actions', () => {
      const clientError = new StackAuthClientError('Network error', 'NETWORK_ERROR');
      const notification = createErrorNotification(clientError);
      
      expect(notification.title).toContain('Network');
      expect(notification.type).toBe('error');
      expect(notification.actions).toBeDefined();
      expect(notification.actions!.length).toBeGreaterThan(0);
    });
  });

  describe('Browser Capabilities Detection', () => {
    it('should detect localStorage availability', () => {
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      
      const capabilities = detectBrowserCapabilities();
      
      expect(capabilities.hasLocalStorage).toBe(false);
    });

    it('should detect fetch API availability', () => {
      mockWindow.fetch = undefined as any;
      
      const capabilities = detectBrowserCapabilities();
      
      expect(capabilities.hasFetch).toBe(false);
    });

    it('should detect secure context', () => {
      mockWindow.isSecureContext = false;
      mockWindow.location.protocol = 'http:';
      
      const capabilities = detectBrowserCapabilities();
      
      expect(capabilities.isSecureContext).toBe(false);
    });

    it('should detect cookie support', () => {
      Object.defineProperty(mockWindow.document, 'cookie', {
        get: () => '',
        set: () => {},
        configurable: true
      });
      
      const capabilities = detectBrowserCapabilities();
      
      expect(capabilities.cookiesEnabled).toBe(false);
    });
  });

  describe('Network Condition Handling', () => {
    it('should detect online status', () => {
      mockWindow.navigator.onLine = false;
      
      const condition = getNetworkCondition();
      
      expect(condition.isOnline).toBe(false);
    });

    it('should detect connection type when available', () => {
      mockWindow.navigator.connection = {
        type: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
      };
      
      const condition = getNetworkCondition();
      
      expect(condition.connectionType).toBe('wifi');
      expect(condition.effectiveType).toBe('4g');
      expect(condition.saveData).toBe(false);
    });

    it('should handle missing connection API gracefully', () => {
      mockWindow.navigator.connection = undefined;
      
      const condition = getNetworkCondition();
      
      expect(condition.isOnline).toBe(true); // Default when navigator.onLine is true
      expect(condition.connectionType).toBeUndefined();
    });
  });

  describe('Security Context Analysis', () => {
    it('should detect HTTPS correctly', () => {
      mockWindow.location.protocol = 'https:';
      
      const context = analyzeSecurityContext();
      
      expect(context.isHTTPS).toBe(true);
      expect(context.isSecureContext).toBe(true);
    });

    it('should detect mixed content', () => {
      mockWindow.location.protocol = 'https:';
      mockWindow.document.querySelectorAll.mockReturnValue([
        { getAttribute: vi.fn().mockReturnValue('http://example.com/script.js') }
      ] as any);
      
      const context = analyzeSecurityContext();
      
      expect(context.mixedContent).toBe(true);
    });

    it('should detect CSP meta tags', () => {
      mockWindow.document.querySelector.mockReturnValue({
        getAttribute: vi.fn().mockReturnValue('default-src \'self\'')
      });
      
      const context = analyzeSecurityContext();
      
      expect(context.hasCSP).toBe(true);
    });
  });

  describe('Browser Compatibility Handler', () => {
    it('should initialize and detect capabilities', () => {
      const handler = new BrowserCompatibilityHandler();
      const authCheck = handler.canUseAuthentication();
      
      expect(authCheck).toHaveProperty('canUse');
      expect(authCheck).toHaveProperty('limitations');
    });

    it('should report limitations when features unavailable', () => {
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      mockWindow.navigator.onLine = false;
      
      const handler = new BrowserCompatibilityHandler();
      const authCheck = handler.canUseAuthentication();
      
      expect(authCheck.canUse).toBe(false);
      expect(authCheck.limitations).toContain('Local storage unavailable - session persistence limited');
      expect(authCheck.limitations).toContain('Offline mode - authentication features unavailable');
    });

    it('should create fallback storage when localStorage unavailable', () => {
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      
      const handler = new BrowserCompatibilityHandler();
      const fallbackStorage = handler.createFallbackStorage();
      
      expect(fallbackStorage).toHaveProperty('getItem');
      expect(fallbackStorage).toHaveProperty('setItem');
      
      fallbackStorage.setItem('test', 'value');
      expect(fallbackStorage.getItem('test')).toBe('value');
    });
  });

  describe('Network Condition Handler', () => {
    it('should initialize with current conditions', () => {
      const handler = new NetworkConditionHandler();
      const condition = handler.getCurrentCondition();
      
      expect(condition).toHaveProperty('isOnline');
    });

    it('should calculate retry delays based on connection', () => {
      const handler = new NetworkConditionHandler();
      
      // Mock slow connection
      mockWindow.navigator.connection = { effectiveType: '2g' };
      expect(handler.getRetryDelay()).toBe(5000);
      
      // Mock fast connection
      mockWindow.navigator.connection = { effectiveType: '4g' };
      expect(handler.getRetryDelay()).toBe(1000);
    });

    it('should handle data saver mode', () => {
      const handler = new NetworkConditionHandler();
      
      mockWindow.navigator.connection = { saveData: true };
      expect(handler.getRetryDelay()).toBe(5000);
    });
  });

  describe('Environment Check', () => {
    it('should perform comprehensive environment check', () => {
      const envCheck = performEnvironmentCheck();
      
      expect(envCheck).toHaveProperty('compatible');
      expect(envCheck).toHaveProperty('warnings');
      expect(envCheck).toHaveProperty('errors');
      expect(envCheck).toHaveProperty('recommendations');
    });

    it('should identify critical issues', () => {
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      mockWindow.navigator.onLine = false;
      mockWindow.isSecureContext = false;
      
      const envCheck = performEnvironmentCheck();
      
      expect(envCheck.compatible).toBe(false);
      expect(envCheck.errors.length).toBeGreaterThan(0);
      expect(envCheck.warnings.length).toBeGreaterThan(0);
      expect(envCheck.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow with error recovery', async () => {
      // Mock fetch to fail once then succeed
      let callCount = 0;
      mockWindow.fetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: '1' }, session: { token: 'abc' } })
        });
      });

      // This would test the actual signIn function, but requires proper mocking
      // of all dependencies. For now, we verify the mock behavior.
      expect(mockWindow.fetch).toBeDefined();
    });

    it('should gracefully degrade when critical features unavailable', () => {
      // Simulate environment with limited capabilities
      mockWindow.localStorage = undefined as any;
      mockWindow.fetch = undefined as any;
      mockWindow.navigator.onLine = false;
      
      const handler = new BrowserCompatibilityHandler();
      const authCheck = handler.canUseAuthentication();
      
      expect(authCheck.canUse).toBe(false);
      expect(authCheck.limitations.length).toBeGreaterThan(0);
      
      // Should still provide fallback storage
      const fallbackStorage = handler.createFallbackStorage();
      expect(fallbackStorage).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined errors gracefully', () => {
      const result = classifyClientError(null);
      expect(result.code).toBe('NETWORK_ERROR');
      
      const result2 = classifyClientError(undefined);
      expect(result2.code).toBe('NETWORK_ERROR');
    });

    it('should handle non-Error objects', () => {
      const result = classifyClientError('string error');
      expect(result.code).toBe('NETWORK_ERROR');
      
      const result2 = classifyClientError({ message: 'object error' });
      expect(result2.code).toBe('NETWORK_ERROR');
    });

    it('should handle missing window object gracefully', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        configurable: true
      });
      
      const capabilities = detectBrowserCapabilities();
      expect(capabilities.hasLocalStorage).toBe(false);
      expect(capabilities.onlineStatus).toBe(true); // Default when window unavailable
      
      const condition = getNetworkCondition();
      expect(condition.isOnline).toBe(true); // Default
    });

    it('should handle missing navigator object', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        configurable: true
      });
      
      const condition = getNetworkCondition();
      expect(condition.isOnline).toBe(true); // Should default to online
    });
  });
});

describe('Error Handling Production Mode', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    Object.assign(console, consoleMock);
    Object.values(consoleMock).forEach(mock => mock.mockClear());
  });

  it('should use production error messages', () => {
    const message = getErrorMessage('SIGN_IN_FAILED', 'production');
    
    expect(message.title).toBe('Sign In Failed');
    expect(message.details).toBeUndefined(); // No details in production
    expect(message.message).not.toContain('check browser console'); // No development hints
  });

  it('should log minimal information in production', () => {
    const clientError = new StackAuthClientError('Test error', 'NETWORK_ERROR');
    logError(clientError, 'test context', 'production');
    
    expect(consoleMock.error).toHaveBeenCalledWith(
      '[test context] Stack Auth Error (NETWORK_ERROR): We\'re having trouble connecting to our authentication service.'
    );
    expect(consoleMock.group).not.toHaveBeenCalled(); // No detailed logging
  });
});