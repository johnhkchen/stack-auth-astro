import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  displayName?: string;
  primaryEmail: string;
}

interface ProtectedContentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedContent: React.FC<ProtectedContentProps> = ({ 
  children, 
  fallback = <div>Please sign in to view this content.</div> 
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
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <>{fallback}</>;
};

export default ProtectedContent;