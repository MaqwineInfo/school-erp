import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, breadcrumb }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      {breadcrumb && (
        <nav className="flex items-center gap-1 text-sm text-gray-400 mb-1">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-gray-600' : 'hover:text-gray-600 cursor-pointer'}>{b.label}</span>
            </span>
          ))}
        </nav>
      )}
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);
