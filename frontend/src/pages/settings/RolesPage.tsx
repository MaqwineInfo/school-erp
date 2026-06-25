import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Permission = { module: string; actions: string[] };
type Role = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  isActive: boolean;
};

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve'];
const ACTION_LABELS: Record<string, string> = {
  view: '👁 View', create: '➕ Create', edit: '✏️ Edit',
  delete: '🗑 Delete', export: '📤 Export', approve: '✅ Approve',
};

const MODULE_GROUPS: Record<string, string[]> = {
  'Core': ['students', 'academics', 'attendance', 'fees', 'exams'],
  'Administration': ['admissions', 'hr', 'payroll', 'expense', 'inventory'],
  'Student Services': ['homework', 'library', 'transport', 'hostel', 'health'],
  'Communication': ['communication', 'events', 'visitors', 'certificates'],
  'Analytics': ['reports', 'discipline', 'alumni'],
};

const MODULE_LABELS: Record<string, string> = {
  admissions: 'Admissions', students: 'Students', academics: 'Academics', attendance: 'Attendance',
  fees: 'Fee Management', exams: 'Exams & Results', homework: 'Homework', library: 'Library',
  transport: 'Transport', hostel: 'Hostel', hr: 'HR', payroll: 'Payroll',
  communication: 'Communication', events: 'Events', visitors: 'Visitors',
  certificates: 'Certificates', reports: 'Reports', discipline: 'Discipline',
  health: 'Health', expense: 'Expense', inventory: 'Inventory', alumni: 'Alumni',
};

function PermissionMatrix({ permissions, onChange }: { permissions: Permission[]; onChange: (p: Permission[]) => void }) {
  const toggle = (module: string, action: string) => {
    const updated = [...permissions];
    const idx = updated.findIndex(p => p.module === module);
    if (idx === -1) {
      updated.push({ module, actions: [action] });
    } else {
      const actions = updated[idx].actions.includes(action)
        ? updated[idx].actions.filter(a => a !== action)
        : [...updated[idx].actions, action];
      if (actions.length === 0) updated.splice(idx, 1);
      else updated[idx] = { ...updated[idx], actions };
    }
    onChange(updated);
  };

  const hasAction = (module: string, action: string) =>
    permissions.some(p => p.module === module && p.actions.includes(action));

  const toggleAll = (module: string) => {
    const current = permissions.find(p => p.module === module);
    const allGranted = current?.actions.length === ACTIONS.length;
    const updated = permissions.filter(p => p.module !== module);
    if (!allGranted) updated.push({ module, actions: [...ACTIONS] });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {Object.entries(MODULE_GROUPS).map(([group, modules]) => (
        <div key={group}>
          <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">{group}</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Module</th>
                  {ACTIONS.map(a => (
                    <th key={a} className="text-center px-2 py-2 font-medium text-gray-500 text-xs">{ACTION_LABELS[a]}</th>
                  ))}
                  <th className="text-center px-2 py-2 font-medium text-gray-500 text-xs">All</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {modules.map(mod => {
                  const modPerms = permissions.find(p => p.module === mod);
                  const allGranted = modPerms?.actions.length === ACTIONS.length;
                  return (
                    <tr key={mod} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2 font-medium text-gray-700">{MODULE_LABELS[mod] || mod}</td>
                      {ACTIONS.map(action => (
                        <td key={action} className="text-center px-2 py-2">
                          <input type="checkbox" checked={hasAction(mod, action)} onChange={() => toggle(mod, action)}
                            className="rounded text-blue-600 cursor-pointer w-4 h-4" />
                        </td>
                      ))}
                      <td className="text-center px-2 py-2">
                        <input type="checkbox" checked={!!allGranted} onChange={() => toggleAll(mod)}
                          className="rounded text-purple-600 cursor-pointer w-4 h-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RolesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Role | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPerms, setEditPerms] = useState<Permission[]>([]);

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => axios.get('/roles').then(r => r.data.data),
  });

  const { register, handleSubmit, reset } = useForm<{ name: string; description: string }>();

  const createRole = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      axios.post('/roles', { ...data, permissions: [] }).then(r => r.data.data),
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setShowCreate(false);
      setSelected(role);
      setEditPerms(role.permissions);
      reset();
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Permission[] }) =>
      axios.put(`/roles/${id}`, { permissions }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const deleteRole = useMutation({
    mutationFn: (id: string) => axios.delete(`/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setSelected(null); },
  });

  const handleSelectRole = (role: Role) => {
    setSelected(role);
    setEditPerms(role.permissions || []);
  };

  const handleSave = () => {
    if (selected) updateRole.mutate({ id: selected._id, permissions: editPerms });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Define what each role can access across modules</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Role</button>
      </div>

      <div className="flex gap-6">
        {/* Role list */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-xl border overflow-hidden">
            {roles.map(role => (
              <button key={role._id} onClick={() => handleSelectRole(role)}
                className={`w-full text-left px-4 py-3 border-b last:border-0 transition-colors ${selected?._id === role._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">{role.name}</span>
                  {role.isSystem && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">System</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{role.permissions?.length || 0} modules</div>
              </button>
            ))}
            {roles.length === 0 && <div className="px-4 py-6 text-gray-400 text-sm text-center">No roles yet</div>}
          </div>
        </div>

        {/* Permission editor */}
        <div className="flex-1">
          {selected ? (
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                    {selected.isSystem && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">System Role</span>}
                  </div>
                  <p className="text-sm text-gray-500">{selected.description || 'No description'}</p>
                </div>
                <div className="flex gap-2">
                  {!selected.isSystem && (
                    <button onClick={() => deleteRole.mutate(selected._id)} className="text-red-600 hover:text-red-700 text-sm">Delete Role</button>
                  )}
                  <button onClick={handleSave} disabled={updateRole.isPending} className="btn-primary">
                    {updateRole.isPending ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </div>

              <PermissionMatrix permissions={editPerms} onChange={setEditPerms} />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">🔐</div>
              <p>Select a role to view and edit its permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Create role modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => createRole.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create New Role</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                <input {...register('name', { required: true })} placeholder="e.g. Sports Coordinator" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea {...register('description')} rows={2} placeholder="What does this role do?" className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={createRole.isPending} className="btn-primary flex-1">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
