import React from 'react';
import { useAuthStore } from '../../stores/auth.store';

interface CanProps {
  module: string;
  action?: 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Renders children only if the current user has permission for module+action */
export function Can({ module, action = 'view', children, fallback = null }: CanProps) {
  const can = useAuthStore(s => s.can);
  if (!can(module, action)) return <>{fallback}</>;
  return <>{children}</>;
}
