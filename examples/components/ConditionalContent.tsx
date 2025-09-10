import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  displayName?: string;
  primaryEmail: string;
}

interface ConditionalContentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  loadingComponent?: React.ReactNode;
  className?: string;
}

/**
 * Example component showing conditional rendering based on auth state
 * Hydration: Use with client:idle for non-critical content
 */
export const ConditionalContent: React.FC<ConditionalContentProps> = ({ 
  children,
  fallback = <div className="text-gray-600">Please sign in to view this content.</div>,
  requireAuth = true,
  loadingComponent = (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    </div>
  ),
  className = ''
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div className={className}>{loadingComponent}</div>;
  }

  const isAuthenticated = user !== null;
  const shouldShowContent = requireAuth ? isAuthenticated : true;
  const shouldShowFallback = requireAuth && !isAuthenticated;

  return (
    <div className={className}>
      {shouldShowContent && children}
      {shouldShowFallback && fallback}
    </div>
  );
};

export default ConditionalContent;