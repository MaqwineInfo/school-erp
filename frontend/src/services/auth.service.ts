import { post, get } from '../lib/api';
import type { User } from '../types';
import type { PermissionMap } from '../stores/auth.store';

export interface LoginResponse {
  token: string;
  user: User;
  permissionMap: PermissionMap;
  enabledModules: string[];
}

export const authService = {
  login: (email: string, password: string, tenantSlug?: string) =>
    post<LoginResponse>('/auth/login', { email, password, tenantSlug }),

  register: (name: string, email: string, password: string, tenantSlug?: string, role?: string) =>
    post<{ token: string; user: User }>('/auth/register', { name, email, password, tenantSlug, role }),

  me: () => get<User>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    post('/auth/change-password', { currentPassword, newPassword }),
};
