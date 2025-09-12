/**
 * User-Friendly Error Messages for Stack Auth Runtime Operations
 * 
 * This module provides user-friendly error messages with development vs production modes,
 * actionable recovery guidance, and helpful context for all runtime authentication scenarios.
 */

import type { StackAuthClientError } from './client.js';

/**
 * Error message structure for consistent user communication
 */
export interface ErrorMessage {
  title: string;
  message: string;
  action: string;
  details?: string;
  learnMore?: string;
}

/**
 * Development vs Production error modes
 */
export type ErrorMode = 'development' | 'production';

/**
 * Get current error mode based on environment
 */
export function getErrorMode(): ErrorMode {
  return process.env.NODE_ENV === 'development' ? 'development' : 'production';
}

/**
 * Runtime error messages for user-facing scenarios
 */
export const RUNTIME_ERROR_MESSAGES = {
  // Network and connectivity errors
  NETWORK_UNAVAILABLE: {
    development: {
      title: 'Network Connection Error',
      message: 'Unable to connect to Stack Auth authentication service. This could be due to network issues, service downtime, or firewall restrictions.',
      action: 'Check your internet connection and try again. If the problem persists, verify that your firewall allows connections to *.stack-auth.com',
      details: 'Common causes: No internet connection, Stack Auth service outage, corporate firewall blocking HTTPS requests, DNS resolution issues',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/network-issues'
    },
    production: {
      title: 'Connection Problem',
      message: 'We\'re having trouble connecting to our authentication service.',
      action: 'Please check your internet connection and try again in a moment.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  SIGN_IN_FAILED: {
    development: {
      title: 'Sign In Failed',
      message: 'The sign-in request failed. This could be due to invalid credentials, expired session, network issues, or server problems.',
      action: 'Try signing in again. If using OAuth, ensure the provider is properly configured. Check browser console for detailed error information.',
      details: 'Possible causes: Invalid credentials, OAuth provider issues, expired authentication tokens, Stack Auth API errors, network connectivity problems',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/sign-in-issues'
    },
    production: {
      title: 'Sign In Failed',
      message: 'We couldn\'t sign you in right now.',
      action: 'Please check your credentials and try again, or contact support if the problem continues.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  SIGN_OUT_FAILED: {
    development: {
      title: 'Sign Out Failed',
      message: 'The sign-out request failed, but your local authentication state has been cleared. The server-side session may still be active.',
      action: 'Try refreshing the page or clearing your browser cookies. Check network connectivity and server status.',
      details: 'Your browser has been signed out locally, but the server session cleanup may have failed due to network issues',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/sign-out-issues'
    },
    production: {
      title: 'Sign Out Issue',
      message: 'There was a problem signing you out completely.',
      action: 'For security, please close all browser tabs and clear your cookies, then visit the site again.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  COMPONENT_LOAD_FAILED: {
    development: {
      title: 'Component Loading Error',
      message: 'Stack Auth React component failed to load or render properly. This could be due to missing dependencies, hydration mismatches, or JavaScript errors.',
      action: 'Check browser console for detailed error information. Ensure React is properly configured and all Stack Auth dependencies are installed.',
      details: 'Common causes: Missing @stackframe/stack-ui dependency, React version mismatch, hydration errors in SSR/SSG setup, JavaScript bundle errors',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/component-issues'
    },
    production: {
      title: 'Loading Error',
      message: 'The authentication interface failed to load properly.',
      action: 'Please refresh the page or try using a different browser. Contact support if the issue persists.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  STATE_SYNC_FAILED: {
    development: {
      title: 'Authentication State Sync Error',
      message: 'Failed to synchronize authentication state between browser tabs or with the server. This may cause inconsistent login status across your application.',
      action: 'Check localStorage/sessionStorage permissions and browser console. Consider refreshing all tabs or restarting the browser.',
      details: 'This affects cross-tab authentication sync and may result in some tabs showing different login states',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/state-sync-issues'
    },
    production: {
      title: 'Sync Issue',
      message: 'Your authentication status may not be synchronized across browser tabs.',
      action: 'Please refresh all open tabs or restart your browser to ensure consistent login status.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  RATE_LIMITED: {
    development: {
      title: 'Rate Limit Exceeded',
      message: 'Too many authentication requests have been made from this location. Stack Auth has temporarily limited further requests to prevent abuse.',
      action: 'Wait a few minutes before trying again. Check your application for request loops or excessive API calls. Consider implementing exponential backoff.',
      details: 'Rate limiting protects against brute force attacks and API abuse. Limits typically reset within 5-15 minutes',
      learnMore: 'https://docs.stack-auth.com/api/rate-limits'
    },
    production: {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests recently.',
      action: 'Please wait a few minutes before trying again.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  TIMEOUT: {
    development: {
      title: 'Request Timeout',
      message: 'The authentication request took too long to complete. This could be due to slow network conditions, server overload, or connectivity issues.',
      action: 'Try again with a more stable internet connection. Check Stack Auth service status if timeouts persist.',
      details: 'Timeout occurred after waiting for server response. May indicate network congestion or service performance issues',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/timeout-issues'
    },
    production: {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
      action: 'Please check your connection and try again.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  CORS_ERROR: {
    development: {
      title: 'Cross-Origin Request Blocked',
      message: 'Browser blocked the authentication request due to CORS (Cross-Origin Resource Sharing) policy. This typically occurs when the origin is not configured in Stack Auth.',
      action: 'Add your domain to the allowed origins in Stack Auth dashboard. Ensure HTTPS is used in production. Check browser console for specific CORS error details.',
      details: 'CORS errors prevent browsers from making cross-origin requests for security reasons. Origin must be whitelisted in Stack Auth configuration',
      learnMore: 'https://docs.stack-auth.com/configuration/cors-settings'
    },
    production: {
      title: 'Access Blocked',
      message: 'Your browser blocked this request for security reasons.',
      action: 'Please contact support to resolve this access issue.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  OFFLINE: {
    development: {
      title: 'Offline Mode Detected',
      message: 'Your browser appears to be offline. Authentication requires an active internet connection to communicate with Stack Auth servers.',
      action: 'Check your internet connection and try again when back online. Authentication state will be preserved locally where possible.',
      details: 'Browser navigator.onLine indicates offline status. Some authentication features may be cached but new operations require connectivity',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/offline-handling'
    },
    production: {
      title: 'Offline',
      message: 'You appear to be offline.',
      action: 'Please check your internet connection and try again when connected.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  STORAGE_ERROR: {
    development: {
      title: 'Browser Storage Error',
      message: 'Unable to access browser localStorage or sessionStorage. This may be due to private browsing mode, storage quota exceeded, or browser settings.',
      action: 'Check if private browsing is enabled, clear browser storage, or adjust browser privacy settings. Some features may not work without storage access.',
      details: 'Stack Auth uses localStorage for session persistence and cross-tab sync. Functionality will be limited without storage access',
      learnMore: 'https://docs.stack-auth.com/troubleshooting/storage-issues'
    },
    production: {
      title: 'Storage Access Required',
      message: 'This application needs to store authentication information in your browser.',
      action: 'Please ensure browser storage is enabled and try again. Disable private browsing if necessary.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  SECURITY_ERROR: {
    development: {
      title: 'Security Policy Violation',
      message: 'Browser security policy blocked the authentication request. This may be due to Content Security Policy (CSP) restrictions, mixed content warnings, or HTTPS requirements.',
      action: 'Check browser console for CSP violations. Ensure HTTPS is used. Verify Stack Auth domains are allowed in your CSP policy.',
      details: 'Common causes: CSP blocking Stack Auth domains, mixed content (HTTP/HTTPS), insecure context restrictions',
      learnMore: 'https://docs.stack-auth.com/configuration/security-policy'
    },
    production: {
      title: 'Security Error',
      message: 'A security policy prevented this action.',
      action: 'Please ensure you\'re using a secure connection (HTTPS) and contact support if needed.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  },

  SERVICE_UNAVAILABLE: {
    development: {
      title: 'Stack Auth Service Unavailable',
      message: 'Stack Auth authentication service is temporarily unavailable. This could be due to scheduled maintenance, service outage, or high traffic.',
      action: 'Check Stack Auth status page for service announcements. Try again in a few minutes. Consider implementing offline fallbacks for critical flows.',
      details: 'Service returned 503 or 502 status. May be temporary due to deployments, maintenance, or infrastructure issues',
      learnMore: 'https://status.stack-auth.com'
    },
    production: {
      title: 'Service Temporarily Unavailable',
      message: 'Our authentication service is temporarily unavailable.',
      action: 'Please try again in a few minutes. We apologize for the inconvenience.',
      learnMore: 'https://status.stack-auth.com'
    }
  },

  INVALID_CREDENTIALS: {
    development: {
      title: 'Invalid Authentication Credentials',
      message: 'The authentication credentials are invalid or have expired. This could be due to incorrect API keys, expired tokens, or mismatched project configuration.',
      action: 'Verify STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY, and STACK_SECRET_SERVER_KEY in your environment variables. Check Stack Auth dashboard for correct values.',
      details: 'API returned 401 Unauthorized. Usually indicates incorrect or expired authentication tokens',
      learnMore: 'https://docs.stack-auth.com/getting-started/api-keys'
    },
    production: {
      title: 'Authentication Error',
      message: 'There was a problem with your authentication credentials.',
      action: 'Please try signing in again or contact support if the issue persists.',
      learnMore: 'https://docs.stack-auth.com/help'
    }
  }
} as const;

/**
 * Get user-friendly error message for a specific error code
 */
export function getErrorMessage(
  code: keyof typeof RUNTIME_ERROR_MESSAGES,
  mode: ErrorMode = getErrorMode()
): ErrorMessage {
  const messageConfig = RUNTIME_ERROR_MESSAGES[code];
  if (!messageConfig) {
    // Fallback for unknown error codes
    return mode === 'development' ? {
      title: 'Unknown Error',
      message: `An unexpected error occurred with code: ${code}`,
      action: 'Check the browser console for more details and contact support if needed',
      details: 'This error code is not recognized by the error message system',
      learnMore: 'https://docs.stack-auth.com/troubleshooting'
    } : {
      title: 'Unexpected Error',
      message: 'Something unexpected happened.',
      action: 'Please try again or contact support if the problem persists.',
      learnMore: 'https://docs.stack-auth.com/help'
    };
  }
  
  return messageConfig[mode];
}

/**
 * Create formatted error message from Stack Auth client error
 */
export function formatClientError(
  error: StackAuthClientError,
  mode: ErrorMode = getErrorMode()
): ErrorMessage {
  const baseMessage = getErrorMessage(error.code as keyof typeof RUNTIME_ERROR_MESSAGES, mode);
  
  // Add specific error details if available
  if (mode === 'development' && error.cause) {
    return {
      ...baseMessage,
      details: baseMessage.details 
        ? `${baseMessage.details}\n\nOriginal error: ${error.cause.message}`
        : `Original error: ${error.cause.message}`
    };
  }
  
  return baseMessage;
}

/**
 * Create user-friendly error notification
 */
export function createErrorNotification(
  error: StackAuthClientError,
  options: {
    mode?: ErrorMode;
    includeDetails?: boolean;
    includeActions?: boolean;
  } = {}
): {
  title: string;
  message: string;
  actions?: Array<{ label: string; action: () => void }>;
  details?: string;
  type: 'error' | 'warning' | 'info';
} {
  const mode = options.mode || getErrorMode();
  const includeDetails = options.includeDetails ?? (mode === 'development');
  const includeActions = options.includeActions ?? true;
  
  const errorMessage = formatClientError(error, mode);
  
  const notification: any = {
    title: errorMessage.title,
    message: errorMessage.message,
    type: 'error' as const
  };
  
  if (includeDetails && errorMessage.details) {
    notification.details = errorMessage.details;
  }
  
  if (includeActions) {
    const actions: Array<{ label: string; action: () => void }> = [];
    
    // Add retry action for retryable errors
    const retryableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
    if (retryableErrors.includes(error.code)) {
      actions.push({
        label: 'Retry',
        action: () => window.location.reload()
      });
    }
    
    // Add refresh action
    actions.push({
      label: 'Refresh Page',
      action: () => window.location.reload()
    });
    
    // Add help action
    if (errorMessage.learnMore) {
      actions.push({
        label: 'Get Help',
        action: () => window.open(errorMessage.learnMore, '_blank')
      });
    }
    
    notification.actions = actions;
  }
  
  return notification;
}

/**
 * Log error with appropriate detail level
 */
export function logError(
  error: StackAuthClientError,
  context?: string,
  mode: ErrorMode = getErrorMode()
): void {
  const errorMessage = formatClientError(error, mode);
  const contextPrefix = context ? `[${context}] ` : '';
  
  if (mode === 'development') {
    console.group(`🚨 ${contextPrefix}Stack Auth Error: ${errorMessage.title}`);
    console.error('Message:', errorMessage.message);
    console.error('Code:', error.code);
    console.error('Recovery:', error.recovery);
    console.error('Action:', errorMessage.action);
    if (errorMessage.details) {
      console.error('Details:', errorMessage.details);
    }
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    if (errorMessage.learnMore) {
      console.info('Learn more:', errorMessage.learnMore);
    }
    console.groupEnd();
  } else {
    // Production: minimal logging
    console.error(`${contextPrefix}Stack Auth Error (${error.code}): ${errorMessage.message}`);
  }
}

/**
 * Display error message in UI (helper for creating error components)
 */
export function createErrorDisplay(
  error: StackAuthClientError,
  options: {
    mode?: ErrorMode;
    showActions?: boolean;
    onRetry?: () => void;
    onDismiss?: () => void;
    className?: string;
  } = {}
): React.ReactElement {
  const mode = options.mode || getErrorMode();
  const showActions = options.showActions ?? true;
  const errorMessage = formatClientError(error, mode);
  
  // This would be implemented as actual React JSX in a real component
  // For now, returning a structure that can be used to create elements
  return {
    type: 'div',
    props: {
      className: `stack-auth-error ${options.className || ''}`,
      children: [
        {
          type: 'h3',
          props: { children: errorMessage.title }
        },
        {
          type: 'p',
          props: { children: errorMessage.message }
        },
        mode === 'development' && errorMessage.details && {
          type: 'details',
          props: {
            children: [
              { type: 'summary', props: { children: 'Technical Details' } },
              { type: 'p', props: { children: errorMessage.details } }
            ]
          }
        },
        showActions && {
          type: 'div',
          props: {
            className: 'stack-auth-error-actions',
            children: [
              options.onRetry && {
                type: 'button',
                props: {
                  onClick: options.onRetry,
                  children: 'Retry'
                }
              },
              {
                type: 'button',
                props: {
                  onClick: () => window.location.reload(),
                  children: 'Refresh Page'
                }
              },
              options.onDismiss && {
                type: 'button',
                props: {
                  onClick: options.onDismiss,
                  children: 'Dismiss'
                }
              }
            ].filter(Boolean)
          }
        }
      ].filter(Boolean)
    }
  } as any;
}