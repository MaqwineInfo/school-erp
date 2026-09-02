import React from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { ForbiddenState, ModuleDisabledState } from '../states/SystemStates';

type PermAction = 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export';

interface ModuleRouteProps {
  module: string;
  action?: PermAction;
  children: React.ReactNode;
}

/**
 * Route guard.
 *
 * Two changes from the previous version, both closing defect A12:
 *
 *  1. It no longer redirects to the dashboard. A silent bounce is indistinguishable from
 *     a broken link; the user is now told which of the two things is wrong — their plan
 *     does not include the module (WF-0281), or their role does not permit the action
 *     (WF-0280). This also mirrors the API, which returns MODULE_DISABLED and FORBIDDEN
 *     as distinct codes.
 *
 *  2. It is applied by the route registry to EVERY route rather than by hand to seven of
 *     them, so a route cannot ship unguarded.
 */
export function ModuleRoute({ module, action = 'view', children }: ModuleRouteProps) {
  const can = useAuthStore((s) => s.can);
  const hasModule = useAuthStore((s) => s.hasModule);
  const user = useAuthStore((s) => s.user);

  // Platform administrators bypass module gating.
  const isSuperAdmin = (user as { isSuperAdmin?: boolean } | null)?.isSuperAdmin || user?.role === 'super_admin';

  if (!isSuperAdmin && !hasModule(module)) {
    return <ModuleDisabledState module={module} />;
  }

  if (!can(module, action)) {
    return <ForbiddenState module={module} action={action} />;
  }

  return <>{children}</>;
}
