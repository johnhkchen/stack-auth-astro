/**
 * Graceful Degradation System for Stack Auth Integration
 * 
 * This module provides fallback mechanisms and graceful degradation strategies
 * when Stack Auth services are unavailable or when errors occur.
 */

import * as React from 'react';
import { StackAuthClientError, CLIENT_ERROR_CODES } from './client.js';
import { getBrowserHandler, getNetworkHandler } from './edge-case-handler.js';
import { getErrorMessage, getErrorMode } from './error-messages.js';

/**
 * Degradation levels from full functionality to basic fallbacks
 */
export enum DegradationLevel {
  FULL = 'full',           // All features available
  LIMITED = 'limited',     // Some features disabled
  FALLBACK = 'fallback',   // Basic functionality only
  OFFLINE = 'offline'      // Local-only mode
}

/**
 * Feature availability status
 */
export interface FeatureStatus {
  authentication: boolean;
  sessionPersistence: boolean;
  crossTabSync: boolean;
  realTimeUpdates: boolean;
  oauthProviders: boolean;
  userManagement: boolean;
}

/**
 * Degradation context for components
 */
export interface DegradationContext {
  level: DegradationLevel;
  features: FeatureStatus;
  limitations: string[];
  fallbackStrategies: Map<string, () => void>;
  retryMechanism?: () => Promise<boolean>;
}

/**
 * Options for degradation behavior
 */
export interface DegradationOptions {
  enableOfflineMode?: boolean;
  enableFallbackUI?: boolean;
  enableRetryMechanisms?: boolean;
  maxRetryAttempts?: number;
  retryDelayMs?: number;
  fallbackStorageKey?: string;
}

/**
 * Default degradation options
 */
const DEFAULT_DEGRADATION_OPTIONS: Required<DegradationOptions> = {
  enableOfflineMode: true,
  enableFallbackUI: true,
  enableRetryMechanisms: true,
  maxRetryAttempts: 3,
  retryDelayMs: 2000,
  fallbackStorageKey: 'stack-auth-fallback-state'
};

/**
 * Analyze current system capabilities and determine degradation level
 */
export function analyzeDegradationLevel(): DegradationContext {
  const browserHandler = getBrowserHandler();
  const networkHandler = getNetworkHandler();
  const authCapabilities = browserHandler.canUseAuthentication();
  const networkCondition = networkHandler.getCurrentCondition();
  
  let level = DegradationLevel.FULL;
  const limitations: string[] = [];
  const fallbackStrategies = new Map<string, () => void>();
  
  // Determine base feature availability
  const features: FeatureStatus = {
    authentication: authCapabilities.canUse && networkCondition.isOnline,
    sessionPersistence: browserHandler.capabilities?.hasLocalStorage ?? false,
    crossTabSync: (browserHandler.capabilities?.hasLocalStorage ?? false) && 
                 (browserHandler.capabilities?.hasSessionStorage ?? false),
    realTimeUpdates: networkCondition.isOnline,
    oauthProviders: authCapabilities.canUse && networkCondition.isOnline,
    userManagement: authCapabilities.canUse && networkCondition.isOnline
  };
  
  // Analyze degradation level based on available features
  if (!networkCondition.isOnline) {
    level = DegradationLevel.OFFLINE;
    limitations.push('Offline mode - authentication services unavailable');
    limitations.push('Real-time updates disabled');
    limitations.push('OAuth providers unavailable');
    
    // Setup offline fallbacks
    fallbackStrategies.set('signIn', () => {
      showOfflineMessage('Sign in requires internet connection');
    });
    
    fallbackStrategies.set('signOut', () => {
      clearLocalAuthState();
    });
    
  } else if (!authCapabilities.canUse) {
    level = DegradationLevel.FALLBACK;
    limitations.push(...authCapabilities.limitations);
    
    // Setup basic fallbacks
    fallbackStrategies.set('authentication', () => {
      showBasicAuthForm();
    });
    
  } else if (authCapabilities.limitations.length > 0) {
    level = DegradationLevel.LIMITED;
    limitations.push(...authCapabilities.limitations);
    
    // Setup limited functionality
    if (!features.sessionPersistence) {
      fallbackStrategies.set('persistence', () => {
        useSessionOnlyStorage();
      });
    }
  }
  
  return {
    level,
    features,
    limitations,
    fallbackStrategies,
    retryMechanism: createRetryMechanism(networkHandler)
  };
}

/**
 * Create retry mechanism based on network conditions
 */
function createRetryMechanism(networkHandler: ReturnType<typeof getNetworkHandler>) {
  return async (): Promise<boolean> => {
    const condition = networkHandler.getCurrentCondition();
    
    if (!condition.isOnline) {
      return false;
    }
    
    try {
      // Test connectivity with a simple request
      const testResponse = await fetch('/handler/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      return testResponse.ok;
    } catch {
      return false;
    }
  };
}

/**
 * Fallback implementations for offline/degraded scenarios
 */

function showOfflineMessage(message: string): void {
  if (getErrorMode() === 'development') {
    console.warn('🚫 Stack Auth Offline:', message);
  }
  
  // Could trigger UI notification in a real implementation
  if (typeof window !== 'undefined' && (window as any).showNotification) {
    (window as any).showNotification({
      type: 'warning',
      title: 'Offline Mode',
      message,
      duration: 5000
    });
  }
}

function clearLocalAuthState(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('stack-') || key.startsWith('auth-')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    if (typeof sessionStorage !== 'undefined') {
      const keysToRemove = Object.keys(sessionStorage).filter(key => 
        key.startsWith('stack-') || key.startsWith('auth-')
      );
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }
    
    if (getErrorMode() === 'development') {
      console.info('🧹 Stack Auth: Local authentication state cleared');
    }
  } catch (error) {
    if (getErrorMode() === 'development') {
      console.error('Failed to clear local auth state:', error);
    }
  }
}

function showBasicAuthForm(): void {
  if (getErrorMode() === 'development') {
    console.info('📝 Stack Auth: Showing basic authentication fallback');
  }
  
  // In a real implementation, this would show a basic HTML form
  // or redirect to a simple authentication page
}

function useSessionOnlyStorage(): void {
  if (getErrorMode() === 'development') {
    console.warn('💾 Stack Auth: Using session-only storage (no persistence)');
  }
  
  // Implementation would switch to sessionStorage or in-memory storage
}

/**
 * React hook for accessing degradation context
 */
export function useDegradationContext(): DegradationContext {
  const [context, setContext] = React.useState<DegradationContext>(() => 
    analyzeDegradationLevel()
  );
  
  React.useEffect(() => {
    // Re-analyze degradation level on network changes
    const networkHandler = getNetworkHandler();
    
    const unsubscribe = networkHandler.subscribe(() => {
      setContext(analyzeDegradationLevel());
    });
    
    // Re-analyze periodically
    const intervalId = setInterval(() => {
      setContext(analyzeDegradationLevel());
    }, 30000); // Check every 30 seconds
    
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);
  
  return context;
}

/**
 * Higher-order component that provides degradation-aware functionality
 */
export function withGracefulDegradation<P extends object>(
  Component: React.ComponentType<P>,
  options: DegradationOptions = {}
) {
  const finalOptions = { ...DEFAULT_DEGRADATION_OPTIONS, ...options };
  
  return React.forwardRef<any, P & { degradationContext?: DegradationContext }>((props, ref) => {
    const degradationContext = useDegradationContext();
    const [isRetrying, setIsRetrying] = React.useState(false);
    const [retryCount, setRetryCount] = React.useState(0);
    
    const handleRetry = React.useCallback(async () => {
      if (!finalOptions.enableRetryMechanisms || 
          retryCount >= finalOptions.maxRetryAttempts ||
          !degradationContext.retryMechanism) {
        return;
      }
      
      setIsRetrying(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, finalOptions.retryDelayMs));
        const success = await degradationContext.retryMechanism();
        
        if (success) {
          setRetryCount(0);
          // Force re-analysis of degradation level
          window.location.reload();
        } else {
          setRetryCount(prev => prev + 1);
        }
      } catch (error) {
        setRetryCount(prev => prev + 1);
      } finally {
        setIsRetrying(false);
      }
    }, [retryCount, degradationContext.retryMechanism]);
    
    // Show fallback UI for severe degradation
    if (degradationContext.level === DegradationLevel.OFFLINE && finalOptions.enableFallbackUI) {
      return React.createElement(OfflineFallback, {
        limitations: degradationContext.limitations,
        onRetry: handleRetry,
        isRetrying,
        retryCount,
        maxRetries: finalOptions.maxRetryAttempts
      });
    }
    
    if (degradationContext.level === DegradationLevel.FALLBACK && finalOptions.enableFallbackUI) {
      return React.createElement(DegradedFallback, {
        limitations: degradationContext.limitations,
        features: degradationContext.features,
        onRetry: handleRetry,
        isRetrying,
        children: React.createElement(Component, { ...props, degradationContext, ref })
      });
    }
    
    // Render normally with degradation context
    return React.createElement(Component, { 
      ...props, 
      degradationContext, 
      ref 
    });
  });
}

/**
 * Offline fallback component
 */
const OfflineFallback: React.FC<{
  limitations: string[];
  onRetry: () => void;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
}> = ({ limitations, onRetry, isRetrying, retryCount, maxRetries }) => {
  return React.createElement('div', {
    style: {
      padding: '20px',
      textAlign: 'center' as const,
      border: '2px solid #ffc107',
      borderRadius: '8px',
      backgroundColor: '#fff3cd',
      color: '#856404',
      margin: '10px 0'
    }
  }, [
    React.createElement('h3', {
      key: 'title',
      style: { margin: '0 0 10px 0' }
    }, '📱 Offline Mode'),
    
    React.createElement('p', {
      key: 'message',
      style: { margin: '0 0 15px 0' }
    }, 'Authentication services are not available while offline.'),
    
    React.createElement('div', {
      key: 'limitations',
      style: { marginBottom: '15px' }
    }, limitations.map((limitation, index) => 
      React.createElement('div', {
        key: index,
        style: { fontSize: '14px', marginBottom: '5px' }
      }, `• ${limitation}`)
    )),
    
    retryCount < maxRetries && React.createElement('button', {
      key: 'retry',
      onClick: onRetry,
      disabled: isRetrying,
      style: {
        padding: '8px 16px',
        backgroundColor: '#ffc107',
        color: '#212529',
        border: 'none',
        borderRadius: '4px',
        cursor: isRetrying ? 'not-allowed' : 'pointer',
        opacity: isRetrying ? 0.6 : 1
      }
    }, isRetrying ? '🔄 Checking...' : '🔄 Try Again'),
    
    retryCount >= maxRetries && React.createElement('div', {
      key: 'max-retries',
      style: { fontSize: '14px', fontStyle: 'italic' }
    }, 'Please check your connection and refresh the page.')
  ].filter(Boolean));
};

/**
 * Degraded functionality fallback component
 */
const DegradedFallback: React.FC<{
  limitations: string[];
  features: FeatureStatus;
  onRetry: () => void;
  isRetrying: boolean;
  children: React.ReactNode;
}> = ({ limitations, features, onRetry, isRetrying, children }) => {
  const [showWarning, setShowWarning] = React.useState(true);
  
  return React.createElement(React.Fragment, null, [
    showWarning && React.createElement('div', {
      key: 'warning',
      style: {
        padding: '12px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        margin: '0 0 15px 0',
        fontSize: '14px',
        color: '#856404'
      }
    }, [
      React.createElement('div', {
        key: 'warning-content',
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
      }, [
        React.createElement('div', { key: 'message' }, [
          React.createElement('strong', { key: 'title' }, '⚠️ Limited Functionality'),
          React.createElement('div', { key: 'text', style: { marginTop: '5px' } }, 
            'Some authentication features are not available.')
        ]),
        React.createElement('div', { key: 'actions' }, [
          React.createElement('button', {
            key: 'retry',
            onClick: onRetry,
            disabled: isRetrying,
            style: {
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: '#856404',
              border: '1px solid #856404',
              borderRadius: '3px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              marginRight: '5px',
              fontSize: '12px'
            }
          }, isRetrying ? 'Retrying...' : 'Retry'),
          React.createElement('button', {
            key: 'dismiss',
            onClick: () => setShowWarning(false),
            style: {
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: '#856404',
              border: '1px solid #856404',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }
          }, '×')
        ])
      ])
    ]),
    
    React.createElement('div', { key: 'content' }, children)
  ]);
};

/**
 * Create fallback authentication state for offline scenarios
 */
export function createFallbackAuthState(): {
  user: null;
  session: null;
  isLoading: false;
  error: null;
  isAuthenticated: false;
} {
  return {
    user: null,
    session: null,
    isLoading: false,
    error: null,
    isAuthenticated: false
  };
}

/**
 * Storage fallback for when localStorage/sessionStorage is unavailable
 */
export function createFallbackStorage(): Storage {
  const storage = new Map<string, string>();
  
  return {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    },
    get length() {
      return storage.size;
    }
  };
}

/**
 * Check if a feature is available in current degradation context
 */
export function isFeatureAvailable(
  feature: keyof FeatureStatus,
  context?: DegradationContext
): boolean {
  const currentContext = context || analyzeDegradationLevel();
  return currentContext.features[feature];
}

/**
 * Execute operation with graceful degradation
 */
export async function executeWithDegradation<T>(
  operation: () => Promise<T>,
  fallback: () => T,
  options: { 
    feature?: keyof FeatureStatus;
    requiresOnline?: boolean;
    maxRetries?: number;
  } = {}
): Promise<T> {
  const context = analyzeDegradationLevel();
  
  // Check if required feature is available
  if (options.feature && !context.features[options.feature]) {
    if (getErrorMode() === 'development') {
      console.warn(`🚫 Feature ${options.feature} not available, using fallback`);
    }
    return fallback();
  }
  
  // Check online requirement
  if (options.requiresOnline && context.level === DegradationLevel.OFFLINE) {
    if (getErrorMode() === 'development') {
      console.warn('🚫 Operation requires online connectivity, using fallback');
    }
    return fallback();
  }
  
  try {
    return await operation();
  } catch (error) {
    if (getErrorMode() === 'development') {
      console.warn('⚠️ Operation failed, using fallback:', error);
    }
    return fallback();
  }
}

// Export types for external use
export type { FeatureStatus, DegradationContext, DegradationOptions };