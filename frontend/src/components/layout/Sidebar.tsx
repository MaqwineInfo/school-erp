import React, { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { School, X, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { getNavForRole, type NavItem, type NavAction } from '../../config/portalNav';

function canSeeNavItem(
  item: NavItem,
  can: (module: string, action?: NavAction) => boolean,
  canAccessModule: (module: string) => boolean,
  hasModule: (module: string) => boolean,
): boolean {
  if (item.module) {
    if (!hasModule(item.module)) return false;
    const action = item.action || 'view';
    if (action === 'view') return canAccessModule(item.module);
    return can(item.module, action);
  }
  return true;
}

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation();
  const can = useAuthStore(s => s.can);
  const canAccessModule = useAuthStore(s => s.canAccessModule);
  const hasModule = useAuthStore(s => s.hasModule);
  const user = useAuthStore(s => s.user);

  if (item.superAdminOnly && !(user?.role === 'super_admin' || (user as { isSuperAdmin?: boolean })?.isSuperAdmin)) {
    return null;
  }

  if (!canSeeNavItem(item, can, canAccessModule, hasModule)) return null;

  const [open, setOpen] = useState(() => {
    if (item.children) return item.children.some(c => c.path && location.pathname.startsWith(c.path));
    return false;
  });

  if (item.children) {
    const visibleChildren = item.children.filter(c => canSeeNavItem(c, can, canAccessModule, hasModule));
    if (visibleChildren.length === 0) return null;

    const isActive = visibleChildren.some(c => c.path && location.pathname.startsWith(c.path));
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
            isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <span className="flex items-center gap-2.5">
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </span>
          <span className="text-gray-400 text-xs">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
            {visibleChildren.map(child => (
              <NavItemComponent key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path!}
      end={item.path === '/'}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-blue-600 text-white font-medium shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );
}

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobile, onClose }) => {
  const { user, logout } = useAuthStore();
  const navItems = getNavForRole(user?.role);

  const tenantName = typeof user?.tenantId === 'object' && user?.tenantId !== null
    ? (user.tenantId as { name: string }).name
    : 'School ERP';

  const roleLabel = user?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

  const roleColors: Record<string, string> = {
    super_admin: 'bg-gray-800 text-white',
    principal: 'bg-blue-600 text-white',
    vice_principal: 'bg-indigo-600 text-white',
    hod: 'bg-violet-600 text-white',
    class_teacher: 'bg-emerald-600 text-white',
    teacher: 'bg-green-600 text-white',
    accountant: 'bg-yellow-600 text-white',
    cashier: 'bg-amber-500 text-white',
    hr_manager: 'bg-orange-600 text-white',
    admission_officer: 'bg-cyan-600 text-white',
    librarian: 'bg-teal-600 text-white',
    transport_incharge: 'bg-sky-600 text-white',
    hostel_warden: 'bg-rose-600 text-white',
    receptionist: 'bg-pink-600 text-white',
    driver: 'bg-stone-600 text-white',
    parent: 'bg-purple-600 text-white',
    student: 'bg-lime-600 text-white',
    staff: 'bg-slate-600 text-white',
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{tenantName}</p>
            <p className="text-xs text-gray-400">School ERP</p>
          </div>
        </Link>
        {mobile && onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {user?.role && (
        <div className="px-4 py-2 border-b border-gray-100">
          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', roleColors[user.role] || 'bg-gray-200 text-gray-700')}>
            {roleLabel}
          </span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
        {navItems.map(item => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', roleColors[user?.role || ''] || 'bg-blue-100')}>
            <span className="text-xs font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={logout} title="Logout" className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
