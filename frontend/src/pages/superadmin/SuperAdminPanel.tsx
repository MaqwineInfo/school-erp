import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';

type Tenant = {
  _id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  board: string;
  planName: string;
  status: string;
  studentCount: number;
  onboardingCompleted: boolean;
  createdAt: string;
  subscriptionEndDate?: string;
};

type Stats = {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  byPlan: Array<{ _id: string; count: number }>;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  onboarding: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-50 text-blue-700',
  growth: 'bg-purple-50 text-purple-700',
  enterprise: 'bg-amber-50 text-amber-700',
  trial: 'bg-gray-50 text-gray-600',
};

export default function SuperAdminPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const { data: stats } = useQuery<Stats>({
    queryKey: ['saas-stats'],
    queryFn: () => axios.get('/plans/saas-stats').then(r => r.data.data),
  });

  const { data: tenantsData } = useQuery<{ data: Tenant[]; total: number; totalPages: number }>({
    queryKey: ['tenants', page, search, statusFilter],
    queryFn: () => axios.get('/plans/tenants', { params: { page, limit: 20, search, status: statusFilter } }).then(r => r.data),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`/plans/tenants/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const tenants = tenantsData?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin — Tenant Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all schools on the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{stats?.total || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total Schools</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{stats?.active || 0}</div>
          <div className="text-xs text-green-600 mt-1">Active</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">{stats?.trial || 0}</div>
          <div className="text-xs text-yellow-600 mt-1">Trial</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{stats?.suspended || 0}</div>
          <div className="text-xs text-red-600 mt-1">Suspended</div>
        </div>
        <div className="bg-gray-50 rounded-xl border p-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">By Plan</div>
          {stats?.byPlan?.map(p => (
            <div key={p._id} className="flex justify-between text-sm">
              <span className="capitalize text-gray-600">{p._id}</span>
              <span className="font-semibold">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by school name, city..." className="input-field flex-1 max-w-xs" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-40">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="onboarding">Onboarding</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">School</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Board</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Students</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Expires</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.map(t => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.city}, {t.state}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.board}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[t.planName] || ''}`}>
                    {t.planName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[t.status] || ''}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.studentCount || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(t.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {t.subscriptionEndDate ? new Date(t.subscriptionEndDate).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedTenant(t)} className="text-blue-600 hover:underline text-xs">View</button>
                    {t.status === 'active' ? (
                      <button onClick={() => toggleStatus.mutate({ id: t._id, status: 'suspended' })} className="text-red-600 hover:underline text-xs">Suspend</button>
                    ) : t.status === 'suspended' ? (
                      <button onClick={() => toggleStatus.mutate({ id: t._id, status: 'active' })} className="text-green-600 hover:underline text-xs">Activate</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No schools found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(tenantsData?.totalPages || 0) > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: tenantsData!.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold">{selectedTenant.name}</h2>
              <button onClick={() => setSelectedTenant(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Slug</dt><dd className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{selectedTenant.slug}</dd>
              <dt className="text-gray-500">Board</dt><dd>{selectedTenant.board}</dd>
              <dt className="text-gray-500">Plan</dt><dd className="capitalize">{selectedTenant.planName}</dd>
              <dt className="text-gray-500">Status</dt><dd className="capitalize">{selectedTenant.status}</dd>
              <dt className="text-gray-500">Location</dt><dd>{selectedTenant.city}, {selectedTenant.state}</dd>
              <dt className="text-gray-500">Onboarding</dt><dd>{selectedTenant.onboardingCompleted ? '✅ Complete' : '⏳ In Progress'}</dd>
            </dl>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary flex-1">Edit Plan</button>
              <button className="btn-primary flex-1">Impersonate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
