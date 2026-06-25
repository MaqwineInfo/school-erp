import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

type PermAction = 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export';

interface ModuleRouteProps {
  module: string;
  action?: PermAction;
  children: React.ReactNode;
}

/** Redirects to dashboard if user lacks module permission (URL bar protection). */
export function ModuleRoute({ module, action = 'view', children }: ModuleRouteProps) {
  const can = useAuthStore(s => s.can);
  const canAccessModule = useAuthStore(s => s.canAccessModule);
  const hasModule = useAuthStore(s => s.hasModule);

  if (!hasModule(module)) return <Navigate to="/" replace />;
  const allowed = action === 'view' ? canAccessModule(module) : can(module, action);
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
