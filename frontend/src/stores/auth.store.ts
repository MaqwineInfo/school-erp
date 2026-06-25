import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { TENANT_MODULE_ALIASES } from '../config/moduleAliases';

/** Full RBAC permission for one module — returned by the backend on login */
export interface ModulePermission {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  branchScope: 'all_branches' | 'own_branch' | 'assigned_branches' | 'none';
  dataScope: 'group' | 'school' | 'department' | 'division' | 'own' | 'none';
  studentScope: 'all' | 'assigned_students' | 'own_children' | 'own' | 'none';
}

/** map of module → ModulePermission returned by login */
export type PermissionMap = Record<string, ModulePermission>;

// Legacy type kept for backward compat
type LegacyPermission = { module: string; actions: string[] };

interface AuthState {
  token: string | null;
  user: User | null;
  /** Legacy role-based permissions array */
  permissions: LegacyPermission[];
  /** New granular permission map from DB */
  permissionMap: PermissionMap;
  enabledModules: string[];
  isAuthenticated: boolean;

  setAuth: (token: string, user: User, permissionMap?: PermissionMap, enabledModules?: string[]) => void;
  setPermissions: (permissions: LegacyPermission[]) => void;
  setPermissionMap: (map: PermissionMap) => void;
  setEnabledModules: (modules: string[]) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;

  /**
   * can(module, action?)
   * Checks if the current user has the specified action on a module.
   * Uses the new DB-driven permissionMap first; falls back to legacy permissions.
   *
   * Actions: 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export'
   */
  can: (module: string, action?: 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export') => boolean;

  /** Returns true if the module has at least canView: true */
  canAccessModule: (module: string) => boolean;

  /** Is module enabled for this tenant? */
  hasModule: (module: string) => boolean;

  /** Get full permission object for a module */
  getModulePerm: (module: string) => ModulePermission | null;
}

const SUPER_ADMIN_PERM: ModulePermission = {
  canView: true, canAdd: true, canEdit: true, canDelete: true,
  canApprove: true, canExport: true,
  branchScope: 'all_branches', dataScope: 'group', studentScope: 'all',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permissions: [],
      permissionMap: {},
      enabledModules: [],
      isAuthenticated: false,

      setAuth: (token, user, permissionMap = {}, enabledModules = []) => {
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true, permissionMap, enabledModules });
      },

      setPermissions: (permissions) => set({ permissions }),
      setPermissionMap: (permissionMap) => set({ permissionMap }),
      setEnabledModules: (enabledModules) => set({ enabledModules }),

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false, permissions: [], permissionMap: {}, enabledModules: [] });
      },

      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),

      can: (module, action = 'view') => {
        const { user, permissionMap } = get();
        if (!user) return false;
        if ((user as any).isSuperAdmin || user.role === 'super_admin') return true;
        if (!get().hasModule(module)) return false;

        const perm = permissionMap[module];
        if (!perm) return false;

        const fieldMap: Record<string, keyof ModulePermission> = {
          view: 'canView', add: 'canAdd', edit: 'canEdit', delete: 'canDelete',
          approve: 'canApprove', export: 'canExport',
        };
        return !!(perm[fieldMap[action]]);
      },

      canAccessModule: (module) => {
        const { user, permissionMap } = get();
        if (!user) return false;
        if ((user as any).isSuperAdmin || user.role === 'super_admin') return true;
        if (!get().hasModule(module)) return false;
        return !!permissionMap[module]?.canView;
      },

      hasModule: (module) => {
        const { user, enabledModules } = get();
        if (!user) return false;
        if ((user as any).isSuperAdmin || user.role === 'super_admin') return true;
        if (enabledModules.length === 0) return true;
        const aliases = TENANT_MODULE_ALIASES[module] || [module];
        return aliases.some(a => enabledModules.includes(a));
      },

      getModulePerm: (module) => {
        const { user, permissionMap } = get();
        if (!user) return null;
        if ((user as any).isSuperAdmin || user.role === 'super_admin') return SUPER_ADMIN_PERM;
        return permissionMap[module] || null;
      },
    }),
    {
      name: 'erp-auth',
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        permissions: s.permissions,
        permissionMap: s.permissionMap,
        enabledModules: s.enabledModules,
      }),
    }
  )
);
