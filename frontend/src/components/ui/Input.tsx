import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, leftIcon, className, id, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">{leftIcon}</div>}
        <input
          id={inputId}
          {...props}
          className={clsx(
            'w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors',
            leftIcon ? 'pl-9 pr-3 py-2.5' : 'px-3 py-2.5',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, options, placeholder, className, id, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        id={inputId}
        {...props}
        className={clsx(
          'w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-900',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors',
          'px-3 py-2.5',
          error && 'border-red-500',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
