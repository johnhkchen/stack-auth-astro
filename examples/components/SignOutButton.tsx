import React from 'react';
import { signOut } from 'astro-stack-auth/client';

interface SignOutButtonProps {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Example component showing client-side sign-out functionality
 * Hydration: Use with client:load or client:visible
 */
export const SignOutButton: React.FC<SignOutButtonProps> = ({ 
  redirectTo = '/', 
  className = 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
  children = 'Sign Out'
}) => {
  const handleSignOut = async () => {
    try {
      await signOut({ redirectTo });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      className={className}
      type="button"
    >
      {children}
    </button>
  );
};

export default SignOutButton;