import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8', none: '' };

export const Card: React.FC<CardProps> = ({ children, className, padding = 'md' }) => (
  <div className={clsx('bg-white rounded-xl border border-gray-200 shadow-sm', paddings[padding], className)}>
    {children}
  </div>
);

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  description?: string;
}

const colors = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
  red: 'bg-red-50 text-red-600',
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeType, color = 'blue', description }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        {change && (
          <p className={clsx('text-xs mt-2', changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-500')}>
            {change}
          </p>
        )}
      </div>
      <div className={clsx('p-3 rounded-xl', colors[color])}>
        {icon}
      </div>
    </div>
  </Card>
);
