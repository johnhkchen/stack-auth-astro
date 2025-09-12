/**
 * Error Boundary Component for Stack Auth Integration
 * 
 * This module provides React error boundary components to catch and handle
 * component errors gracefully, with fallback UI and recovery mechanisms.
 */

import * as React from 'react';
import { StackAuthClientError, CLIENT_ERROR_CODES } from './client.js';

/**
 * Props for the default error fallback component
 */
export interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
  resetError: () => void;
  details?: {
    componentStack?: string;
    errorBoundary?: string;
    operation?: string;
  };
}

/**
 * Props for the Stack Auth error boundary
 */
export interface StackAuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo?: React.ErrorInfo) => void;
  isolateFailures?: boolean;
  enableRecovery?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  level?: 'component' | 'page' | 'app';
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  errorId: string;
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  return `stack-auth-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create Stack Auth specific error from caught error
 */
function createBoundaryError(error: Error, context: string): StackAuthClientError {
  // Check if it's already a Stack Auth error
  if (error instanceof StackAuthClientError) {
    return error;
  }
  
  // Classify the error based on common React error patterns
  let code: keyof typeof CLIENT_ERROR_CODES = 'COMPONENT_ERROR';
  let recovery = CLIENT_ERROR_CODES.COMPONENT_ERROR;
  
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    code = 'NETWORK_ERROR';
    recovery = CLIENT_ERROR_CODES.NETWORK_ERROR;
  } else if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
    code = 'CORS_ERROR';
    recovery = CLIENT_ERROR_CODES.CORS_ERROR;
  } else if (errorMessage.includes('timeout')) {
    code = 'TIMEOUT';
    recovery = CLIENT_ERROR_CODES.TIMEOUT;
  } else if (errorMessage.includes('storage') || errorMessage.includes('localstorage')) {
    code = 'STORAGE_ERROR';
    recovery = CLIENT_ERROR_CODES.STORAGE_ERROR;
  } else if (errorMessage.includes('hydration') || errorMessage.includes('mismatch')) {
    // React hydration errors - common in SSR/SSG
    recovery = 'This appears to be a hydration mismatch. Try refreshing the page or check for differences between server and client rendering';
  }
  
  return new StackAuthClientError(
    `${context}: ${error.message}`,
    code,
    recovery,
    error
  );
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  resetError,
  details
}) => {
  const stackAuthError = error instanceof StackAuthClientError ? error : null;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return React.createElement('div', {
    style: {
      padding: '20px',
      margin: '10px 0',
      border: '2px solid #f5c6cb',
      borderRadius: '8px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      fontFamily: 'system-ui, sans-serif'
    }
  }, [
    React.createElement('h3', {
      key: 'title',
      style: { margin: '0 0 10px 0', fontSize: '18px' }
    }, '🚨 Authentication Error'),
    
    React.createElement('p', {
      key: 'message',
      style: { margin: '0 0 10px 0', fontWeight: 'bold' }
    }, stackAuthError?.recovery || 'Something went wrong with the authentication component.'),
    
    isDevelopment && React.createElement('details', {
      key: 'details',
      style: { margin: '10px 0', fontSize: '14px' }
    }, [
      React.createElement('summary', { key: 'summary' }, 'Error Details'),
      React.createElement('div', {
        key: 'error-info',
        style: {
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#f1f1f1',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap'
        }
      }, [
        React.createElement('div', { key: 'error-msg' }, `Error: ${error.message}`),
        stackAuthError && React.createElement('div', { key: 'error-code' }, `Code: ${stackAuthError.code}`),
        details?.componentStack && React.createElement('div', { 
          key: 'component-stack' 
        }, `Component Stack:${details.componentStack}`),
        details?.errorBoundary && React.createElement('div', { 
          key: 'boundary' 
        }, `Boundary: ${details.errorBoundary}`)
      ].filter(Boolean))
    ]),
    
    React.createElement('div', {
      key: 'actions',
      style: { marginTop: '15px', display: 'flex', gap: '10px' }
    }, [
      React.createElement('button', {
        key: 'retry',
        onClick: retry,
        style: {
          padding: '8px 16px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }
      }, '🔄 Retry'),
      
      React.createElement('button', {
        key: 'reset',
        onClick: resetError,
        style: {
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }
      }, '↺ Reset'),
      
      React.createElement('button', {
        key: 'refresh',
        onClick: () => window.location.reload(),
        style: {
          padding: '8px 16px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }
      }, '🔄 Refresh Page')
    ])
  ].filter(Boolean));
};

/**
 * Stack Auth Error Boundary Component
 */
export class StackAuthErrorBoundary extends React.Component<
  StackAuthErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;
  
  constructor(props: StackAuthErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: ''
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId()
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Create Stack Auth specific error
    const boundaryError = createBoundaryError(error, `Error in ${level}`);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Log error appropriately for development vs production
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Stack Auth Error Boundary (${level})`);
      console.error('Original Error:', error);
      console.error('Enhanced Error:', boundaryError);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Boundary:', this.constructor.name);
      console.groupEnd();
    } else {
      console.error(`Stack Auth Error (${boundaryError.code}):`, boundaryError.message);
    }
    
    // Call error handler
    if (onError) {
      onError(boundaryError, errorInfo);
    }
    
    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(boundaryError);
    }
  }
  
  componentDidUpdate(prevProps: StackAuthErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset on props change if enabled
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
    
    // Reset on resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys![idx] !== resetKey
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }
  
  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };
  
  retryOperation = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      this.setState({ retryCount: retryCount + 1 });
      this.resetErrorBoundary();
    } else {
      // After max retries, refresh the page
      window.location.reload();
    }
  };
  
  render() {
    const { 
      hasError, 
      error, 
      errorInfo, 
      retryCount,
      errorId 
    } = this.state;
    
    const {
      children,
      fallback: FallbackComponent = DefaultErrorFallback,
      enableRecovery = true,
      level = 'component'
    } = this.props;
    
    if (hasError && error) {
      const boundaryError = createBoundaryError(error, `Error in ${level}`);
      
      return React.createElement(FallbackComponent, {
        error: boundaryError,
        retry: enableRecovery ? this.retryOperation : () => window.location.reload(),
        resetError: this.resetErrorBoundary,
        details: {
          componentStack: errorInfo?.componentStack,
          errorBoundary: this.constructor.name,
          operation: level
        }
      });
    }
    
    return children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withStackAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<StackAuthErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    return React.createElement(StackAuthErrorBoundary, {
      ...errorBoundaryProps,
      level: 'component'
    }, React.createElement(Component, { ...props, ref }));
  });
  
  WrappedComponent.displayName = `withStackAuthErrorBoundary(${
    Component.displayName || Component.name
  })`;
  
  return WrappedComponent;
}

/**
 * Hook to programmatically trigger error boundary
 */
export function useStackAuthErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  const captureError = React.useCallback((error: Error | string, context?: string) => {
    const finalError = typeof error === 'string' 
      ? createBoundaryError(new Error(error), context || 'Manual error trigger')
      : error instanceof StackAuthClientError 
        ? error 
        : createBoundaryError(error, context || 'Captured error');
    
    setError(finalError);
  }, []);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  return { captureError, resetError };
}

/**
 * Error boundary specifically for Stack Auth components
 */
export const StackAuthComponentBoundary: React.FC<{
  children: React.ReactNode;
  componentName?: string;
  onError?: (error: Error) => void;
}> = ({ children, componentName = 'Stack Auth Component', onError }) => {
  return React.createElement(StackAuthErrorBoundary, {
    level: 'component',
    isolateFailures: true,
    enableRecovery: true,
    resetOnPropsChange: true,
    onError: onError,
    fallback: ({ error, retry, resetError }) => {
      const stackAuthError = error instanceof StackAuthClientError ? error : null;
      
      return React.createElement('div', {
        style: {
          padding: '16px',
          border: '1px solid #e3342f',
          borderRadius: '4px',
          backgroundColor: '#fcf8f8',
          color: '#721c24',
          textAlign: 'center' as const,
          margin: '8px 0'
        }
      }, [
        React.createElement('h4', {
          key: 'title',
          style: { margin: '0 0 8px 0', fontSize: '14px' }
        }, `${componentName} Error`),
        
        React.createElement('p', {
          key: 'message',
          style: { margin: '0 0 12px 0', fontSize: '13px' }
        }, stackAuthError?.recovery || 'This component encountered an error'),
        
        React.createElement('button', {
          key: 'retry',
          onClick: retry,
          style: {
            padding: '6px 12px',
            backgroundColor: '#e3342f',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }
        }, 'Retry')
      ]);
    }
  }, children);
};

// Export types for external use
export type { ErrorFallbackProps, StackAuthErrorBoundaryProps };