/**
 * Custom StackProvider component for client-side state management
 * 
 * This replaces the StackProvider from @stackframe/stack SDK
 * and provides authentication context for Stack Auth UI components.
 */

import * as React from 'react';
import type { User, Session } from '../rest-api/types.js';

interface StackAuthConfig {
  projectId: string;
  publishableClientKey: string;
  baseUrl?: string;
}

interface StackAuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

interface StackAuthContextValue extends StackAuthState {
  config: StackAuthConfig;
  signIn: (provider?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (user: User | null) => void;
  updateSession: (session: Session | null) => void;
}

const StackAuthContext = React.createContext<StackAuthContextValue | null>(null);

export interface StackProviderProps {
  children: React.ReactNode;
  app?: {
    projectId: string;
    publishableClientKey: string;
    baseUrl?: string;
  };
  config?: StackAuthConfig;
  lang?: string;
  translationOverrides?: Record<string, any>;
}

export function StackProvider({ 
  children, 
  app, 
  config: providedConfig,
  lang,
  translationOverrides 
}: StackProviderProps) {
  // Use app prop for config (for compatibility) or config prop
  const config = React.useMemo(() => {
    if (app) return app;
    if (providedConfig) return providedConfig;
    
    // Try to get from environment/window
    if (typeof window !== 'undefined') {
      const win = window as any;
      return {
        projectId: win.STACK_PROJECT_ID || '',
        publishableClientKey: win.STACK_PUBLISHABLE_CLIENT_KEY || '',
        baseUrl: win.STACK_BASE_URL
      };
    }
    
    return {
      projectId: '',
      publishableClientKey: '',
      baseUrl: undefined
    };
  }, [app, providedConfig]);

  const [state, setState] = React.useState<StackAuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null
  });

  // Check authentication status on mount
  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get current user from session endpoint
      const response = await fetch('/handler/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Stack-Project-Id': config.projectId,
          'X-Stack-Publishable-Client-Key': config.publishableClientKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user || null,
          session: data.session || null,
          isLoading: false,
          error: null
        });
      } else {
        setState({
          user: null,
          session: null,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      setState({
        user: null,
        session: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to check auth status')
      });
    }
  };

  const signIn = async (provider?: string) => {
    // This will be handled by the SignIn component which makes its own API calls
    // This method is here for compatibility
    throw new Error('signIn should be handled by SignIn component');
  };

  const signOut = async () => {
    try {
      const response = await fetch('/handler/auth/signout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Stack-Project-Id': config.projectId,
          'X-Stack-Publishable-Client-Key': config.publishableClientKey
        }
      });

      if (response.ok) {
        setState({
          user: null,
          session: null,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to sign out')
      }));
    }
  };

  const refreshSession = async () => {
    await checkAuthStatus();
  };

  const updateUser = (user: User | null) => {
    setState(prev => ({ ...prev, user }));
  };

  const updateSession = (session: Session | null) => {
    setState(prev => ({ ...prev, session }));
  };

  const contextValue: StackAuthContextValue = {
    ...state,
    config,
    signIn,
    signOut,
    refreshSession,
    updateUser,
    updateSession
  };

  return (
    <StackAuthContext.Provider value={contextValue}>
      {children}
    </StackAuthContext.Provider>
  );
}

// Hook to use Stack Auth context
export function useStackAuth() {
  const context = React.useContext(StackAuthContext);
  if (!context) {
    throw new Error('useStackAuth must be used within a StackProvider');
  }
  return context;
}

// Export context for advanced use cases
export { StackAuthContext };