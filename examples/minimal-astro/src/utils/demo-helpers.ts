/**
 * Reusable utilities for Stack Auth component demos
 * This file provides standardized patterns for dynamic imports, error handling, and component initialization
 */

import type { 
  ComponentConfig, 
  ErrorDisplayConfig, 
  PerformanceMetrics,
  SignOutOptions 
} from '../types/demo-types';

/**
 * Standardized dynamic import utility for Stack Auth components
 */
export async function importStackAuth() {
  try {
    const [components, client] = await Promise.all([
      import('astro-stack-auth/components'),
      import('astro-stack-auth/client')
    ]);
    
    return {
      // Components
      UserButton: components.UserButton,
      SignIn: components.SignIn,
      SignUp: components.SignUp,
      StackProvider: components.StackProvider,
      StackAuthClientError: components.StackAuthClientError,
      CLIENT_ERROR_CODES: components.CLIENT_ERROR_CODES,
      
      // Client functions
      signOut: client.signOut,
      signIn: client.signIn,
      // Note: broadcastSignInEvent may not be available in all versions
      broadcastSignInEvent: client.broadcastSignInEvent || (() => console.log('broadcastSignInEvent not available'))
    };
  } catch (error) {
    console.error('Failed to import Stack Auth modules:', error);
    throw new Error('Stack Auth components are not available');
  }
}

/**
 * Standardized dynamic import for React DOM
 */
export async function importReactDOM() {
  try {
    const { createRoot } = await import('react-dom/client');
    return { createRoot };
  } catch (error) {
    console.error('Failed to import React DOM:', error);
    throw new Error('React DOM is not available');
  }
}

/**
 * Initialize performance metrics tracking
 */
export function createPerformanceMetrics(): PerformanceMetrics {
  return {
    hydrationStartTime: performance.now(),
    componentCount: 0,
    syncEvents: 0,
    errorsHandled: 0
  };
}

/**
 * Update performance display elements
 */
export function updatePerformanceDisplay(metrics: PerformanceMetrics) {
  const hydrationTime = Math.round(performance.now() - metrics.hydrationStartTime);
  
  const updates = [
    { id: 'perf-hydration', value: hydrationTime },
    { id: 'perf-components', value: metrics.componentCount },
    { id: 'perf-sync-events', value: metrics.syncEvents },
    { id: 'perf-errors', value: metrics.errorsHandled }
  ];

  updates.forEach(({ id, value }) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value.toString();
    }
  });
}

/**
 * Standardized error display utility
 */
export function displayError(config: ErrorDisplayConfig, targetId: string = 'error-display') {
  const errorDisplay = document.getElementById(targetId);
  if (!errorDisplay) return;

  errorDisplay.innerHTML = `
    <div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-start">
        <svg class="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <div class="flex-1">
          <h4 class="text-sm font-medium text-red-800">${config.type} Error</h4>
          <p class="text-sm text-red-700 mt-1">${config.message}</p>
          <p class="text-sm text-red-600 mt-2 font-medium">Recovery: ${config.recovery}</p>
          <button 
            onclick="document.getElementById('${targetId}').innerHTML = ''"
            class="mt-3 px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200 transition-colors"
          >
            Clear Error
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize a React component in a container with standardized error handling
 * Note: This is a simplified version for demo purposes. Complex React integration
 * should be handled through Astro's standard client:* directives.
 */
export async function initializeComponent(
  config: ComponentConfig,
  _user?: any,
  metrics?: PerformanceMetrics
) {
  try {
    const container = document.getElementById(config.id);
    if (!container) {
      throw new Error(`Container element with id "${config.id}" not found`);
    }

    // For demo purposes, just update the container with a placeholder
    container.innerHTML = `
      <div style="padding: 1rem; background: #f3f4f6; border-radius: 6px; text-align: center;">
        <p style="margin: 0; color: #374151;">
          ${config.component} Component
        </p>
        <small style="color: #6b7280;">Strategy: ${config.strategy || 'immediate'}</small>
      </div>
    `;

    if (metrics) {
      metrics.componentCount++;
      updatePerformanceDisplay(metrics);
    }

    return { unmount: () => { container.innerHTML = ''; } };
  } catch (error) {
    console.error(`Failed to initialize component ${config.component}:`, error);
    if (metrics) {
      metrics.errorsHandled++;
      updatePerformanceDisplay(metrics);
    }
    throw error;
  }
}

/**
 * Standardized sign-out function with consistent options
 */
export async function handleSignOut(options: SignOutOptions = {}) {
  try {
    const { signOut } = await importStackAuth();
    
    await signOut({
      clearLocalStorage: options.clearLocalStorage,
      redirectTo: options.redirectTo,
      onSuccess: options.onSuccess || (() => {
        console.log('Sign out successful');
        window.location.reload();
      }),
      onError: options.onError
    });
  } catch (error) {
    console.error('Sign out error:', error);
    if (options.onError) {
      options.onError(error as Error);
    } else {
      alert(`❌ Sign out error: ${(error as Error).message}`);
    }
  }
}

/**
 * Standardized window function setup
 */
export function setupWindowFunctions(metrics: PerformanceMetrics) {
  // Basic sign out function
  window.signOut = () => handleSignOut();
  
  // Performance display update
  window.updatePerformanceDisplay = () => updatePerformanceDisplay(metrics);
  
  // Error display function
  window.displayError = (type: string, message: string, recovery: string) => {
    displayError({ type, message, recovery });
    metrics.errorsHandled++;
    updatePerformanceDisplay(metrics);
  };
}

/**
 * Utility to initialize multiple components with consistent patterns
 */
export async function initializeMultipleComponents(
  configs: ComponentConfig[],
  user?: any,
  metrics?: PerformanceMetrics
) {
  const results = [];
  
  for (const config of configs) {
    try {
      const result = await initializeComponent(config, user, metrics);
      results.push(result);
    } catch (error) {
      console.error(`Failed to initialize component ${config.id}:`, error);
      // Continue with other components even if one fails
    }
  }
  
  return results;
}