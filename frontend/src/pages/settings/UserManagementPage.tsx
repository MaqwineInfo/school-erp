import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';
import type { UserRole } from '../../types';

type User = { _id: string; name: string; email: string; phone?: string; role: UserRole; isActive: boolean; lastLoginAt?: string };

const ROLE_LABELS: Record<string, string> = {
  principal: 'Principal', vice_principal: 'Vice Principal', hod: 'HOD', class_teacher: 'Class Teacher',
  teacher: 'Teacher', admission_officer: 'Admission Officer', accountant: 'Accountant',
  librarian: 'Librarian', transport_incharge: 'Transport In-charge', hostel_warden: 'Hostel Warden',
  hr_manager: 'HR Manager', receptionist: 'Receptionist', driver: 'Driver', parent: 'Parent', student: 'Student', staff: 'Staff',
};

export default function UserManagementPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [filters, setFilters] = useState({ role: '', isActive: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const params = new URLSearchParams({ page: String(page), limit: '20', search, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery({
    queryKey: ['users', filters, search, page],
    queryFn: () => axios.get(`/settings/users?${params}`).then(r => r.data),
  });
  const users: User[] = Array.isArray(data?.data) ? data.data : data?.data?.users || [];
  const pagination = data?.meta || data?.pagination;

  const save = useMutation({
    mutationFn: (d: object) => editing ? axios.put(`/settings/users/${editing._id}`, d) : axios.post('/settings/users', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); setEditing(null); reset(); },
  });

  const toggle = useMutation({
    mutationFn: (id: string) => axios.patch(`/settings/users/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => axios.delete(`/settings/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Manage login accounts for staff, teachers, and other users</p>
        </div>
        <button onClick={() => { setEditing(null); reset({}); setShowModal(true); }} className="btn-primary">+ Create User</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..." className="input-field w-64" />
        <select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))} className="input-field w-44">
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filters.isActive} onChange={e => setFilters(f => ({ ...f, isActive: e.target.value }))} className="input-field w-32">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Last Login</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
              users.map(u => (
                <tr key={u._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className="badge badge-blue text-xs">{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td className="px-4 py-3"><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-center flex gap-2 justify-center">
                    <button onClick={() => { setEditing(u); reset(u); setShowModal(true); }} className="text-blue-500 text-xs">Edit</button>
                    <button onClick={() => toggle.mutate(u._id)} className={`text-xs ${u.isActive ? 'text-orange-400' : 'text-green-500'}`}>{u.isActive ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => { if (confirm('Delete this user?')) remove.mutate(u._id); }} className="text-red-400 text-xs">Delete</button>
                  </td>
                </tr>
              ))
            }
            {!isLoading && users.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-400">No users found</td></tr>}
          </tbody>
        </table>
        {pagination && (
          <div className="px-4 py-3 border-t flex justify-between text-sm text-gray-500">
            <span>Total: {pagination.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3">←</button>
              <span className="px-2 py-1">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary py-1 px-3">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">{editing ? 'Edit' : 'Create'} User</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input {...register('name', { required: true })} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input {...register('email', { required: true })} type="email" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input {...register('phone')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select {...register('role', { required: true })} className="input-field">
                  <option value="">Select role</option>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{editing ? 'New Password' : 'Password *'}</label>
                <input {...register('password', { required: !editing })} type="password" className="input-field" placeholder={editing ? 'Leave blank to keep' : 'Min 6 chars'} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); setEditing(null); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
