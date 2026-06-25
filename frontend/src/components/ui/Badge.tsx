import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-xs' };

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md' }) => (
  <span className={clsx('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size])}>
    {children}
  </span>
);

export const statusBadge = (status: string) => {
  const map: Record<string, BadgeProps['variant']> = {
    active: 'success', admitted: 'success', paid: 'success', approved: 'success', returned: 'success',
    pending: 'warning', partial: 'warning', processing: 'warning',
    inactive: 'default', draft: 'default', new: 'info',
    overdue: 'danger', failed: 'danger', rejected: 'danger', suspended: 'danger',
    transferred: 'purple', alumni: 'purple',
  };
  return map[status] || 'default';
};
