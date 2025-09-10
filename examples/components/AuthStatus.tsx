import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  displayName?: string;
  primaryEmail: string;
  profileImageUrl?: string;
}

interface AuthStatusProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * Example component showing client-side authentication status
 * Hydration: Use with client:visible for better performance
 */
export const AuthStatus: React.FC<AuthStatusProps> = ({ 
  showDetails = false,
  className = 'p-4 border rounded'
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else if (response.status !== 401) {
          setError('Failed to check authentication status');
        }
      } catch (err) {
        setError('Network error while checking authentication');
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} border-red-200 bg-red-50`}>
        <div className="text-red-600">
          ❌ {error}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${className} border-gray-200 bg-gray-50`}>
        <div className="text-gray-600">
          🔓 Not authenticated
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} border-green-200 bg-green-50`}>
      <div className="flex items-center space-x-3">
        {user.profileImageUrl ? (
          <img 
            src={user.profileImageUrl} 
            alt="Profile" 
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
            {(user.displayName || user.primaryEmail).charAt(0).toUpperCase()}
          </div>
        )}
        
        <div>
          <div className="text-green-800 font-medium">
            ✅ Authenticated
          </div>
          {showDetails && (
            <div className="text-green-700 text-sm">
              {user.displayName || user.primaryEmail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthStatus;