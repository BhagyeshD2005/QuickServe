import React from 'react';
import { UserRole } from '../../types';

interface RoleBadgeProps {
  role: UserRole | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm', className = '' }) => {
  const normalized = (role || '').toUpperCase();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-xs px-3 py-1 font-semibold',
  }[size];

  // ADMIN: administrator badge
  if (normalized === 'ADMIN') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 ${sizeClasses} ${className}`}
        title="Administrator: Full administrative control"
      >
        Administrator
      </span>
    );
  }

  // AGENT: service-agent badge
  if (normalized === 'AGENT') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 ${sizeClasses} ${className}`}
        title="Service Agent: Certified field agent"
      >
        Service Agent
      </span>
    );
  }

  // CUSTOMER: neutral customer badge
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200/70 ${sizeClasses} ${className}`}
      title="Customer: Standard client account"
    >
      Customer
    </span>
  );
};

export default RoleBadge;
