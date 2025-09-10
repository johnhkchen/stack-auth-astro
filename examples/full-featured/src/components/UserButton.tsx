import React from 'react';
import { UserButton as StackUserButton } from 'astro-stack-auth/components';

interface UserButtonProps {
  className?: string;
}

export const UserButton: React.FC<UserButtonProps> = ({ className }) => {
  return (
    <div className={className}>
      <StackUserButton />
    </div>
  );
};

export default UserButton;