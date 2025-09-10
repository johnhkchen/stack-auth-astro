import React from 'react';
import { signIn } from 'astro-stack-auth/client';

interface SignInButtonProps {
  provider?: string;
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Example component showing client-side sign-in functionality
 * Hydration: Use with client:load or client:visible
 */
export const SignInButton: React.FC<SignInButtonProps> = ({ 
  provider, 
  redirectTo = '/', 
  className = 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
  children = 'Sign In'
}) => {
  const handleSignIn = async () => {
    try {
      await signIn(provider, { callbackUrl: redirectTo });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <button 
      onClick={handleSignIn}
      className={className}
      type="button"
    >
      {children}
    </button>
  );
};

export default SignInButton;