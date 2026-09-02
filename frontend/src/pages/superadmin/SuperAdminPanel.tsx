import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

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

type Plan = {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  pricePerStudentPerYear: number;
  maxStudents: number;
  maxBranches: number;
  isActive: boolean;
  includedModules: string[];
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
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-50 text-blue-700',
  growth: 'bg-purple-50 text-purple-700',
  enterprise: 'bg-amber-50 text-amber-700',
  trial: 'bg-gray-50 text-gray-600',
};

type PanelTab = 'schools' | 'plans';

export default function SuperAdminPanel({ defaultTab = 'schools' }: { defaultTab?: PanelTab }) {
  const qc = useQueryClient();
  const [panelTab, setPanelTab] = useState<PanelTab>(defaultTab);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ planName: '', status: '' });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['saas-stats'],
    queryFn: () => axios.get('/plans/saas-stats').then(r => r.data.data),
  });

  const { data: tenantsData } = useQuery<{ data: Tenant[]; total: number; totalPages: number }>({
    queryKey: ['tenants', page, search, statusFilter],
    queryFn: () => axios.get('/plans/tenants', { params: { page, limit: 20, search, status: statusFilter } }).then(r => r.data),
    enabled: panelTab === 'schools',
  });

  const { data: plansData } = useQuery<{ data: Plan[] }>({
    queryKey: ['saas-plans'],
    queryFn: () => axios.get('/plans').then(r => r.data),
    enabled: panelTab === 'plans',
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`/plans/tenants/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      qc.invalidateQueries({ queryKey: ['saas-stats'] });
    },
  });

  const updateTenant = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      axios.put(`/plans/tenants/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      qc.invalidateQueries({ queryKey: ['saas-stats'] });
      setSelectedTenant(null);
    },
  });

  const tenants = tenantsData?.data || [];
  const plans = plansData?.data || [];

  const openTenantEdit = (t: Tenant) => {
    setSelectedTenant(t);
    setEditPlanForm({ planName: t.planName || 'starter', status: t.status });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Platform Administration"
        description="Manage all schools, subscription plans, and platform health"
        breadcrumb={[{ label: 'Super Admin' }, { label: panelTab === 'schools' ? 'All Schools' : 'Plans' }]}
      />

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
              <span className="capitalize text-gray-600">{p._id || 'unknown'}</span>
              <span className="font-semibold">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['schools', 'plans'] as PanelTab[]).map(t => (
          <button
            key={t}
            onClick={() => setPanelTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize ${panelTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            {t === 'schools' ? 'All Schools' : 'Subscription Plans'}
          </button>
        ))}
      </div>

      {panelTab === 'schools' && (
        <>
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
                    <td className="px-4 py-3 text-gray-600 font-medium">{t.studentCount ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(t.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openTenantEdit(t)} className="text-blue-600 hover:underline text-xs">Manage</button>
                        <Link to={`/super/tenants/${t._id}/modules`} className="text-purple-600 hover:underline text-xs">Modules</Link>
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
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No schools found</td></tr>
                )}
              </tbody>
            </table>
          </div>

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
        </>
      )}

      {panelTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan._id} className="bg-white rounded-xl border p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold">{plan.displayName}</h3>
                <Badge variant={plan.isActive ? 'success' : 'default'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">{plan.description || `Plan: ${plan.name}`}</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>₹{plan.pricePerStudentPerYear}/student/year</p>
                <p>Max students: {plan.maxStudents || 'Unlimited'}</p>
                <p>Max branches: {plan.maxBranches}</p>
                <p className="text-xs text-gray-400 mt-2">{plan.includedModules?.length || 0} modules included</p>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">No plans configured. Run seed script to create default plans.</div>
          )}
        </div>
      )}

      {/* Tenant Manage Modal */}
      <Modal
        isOpen={!!selectedTenant}
        onClose={() => setSelectedTenant(null)}
        title={selectedTenant?.name || 'School Details'}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSelectedTenant(null)}>Close</Button>
            <Button loading={updateTenant.isPending} onClick={() => selectedTenant && updateTenant.mutate({ id: selectedTenant._id, data: editPlanForm })}>
              Save Changes
            </Button>
          </div>
        }
      >
        {selectedTenant && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Slug</dt><dd className="font-mono text-xs">{selectedTenant.slug}</dd>
              <dt className="text-gray-500">Board</dt><dd>{selectedTenant.board}</dd>
              <dt className="text-gray-500">Location</dt><dd>{selectedTenant.city}, {selectedTenant.state}</dd>
              <dt className="text-gray-500">Students</dt><dd className="font-semibold">{selectedTenant.studentCount ?? 0}</dd>
              <dt className="text-gray-500">Onboarding</dt><dd>{selectedTenant.onboardingCompleted ? 'Complete' : 'In Progress'}</dd>
            </dl>
            <Select
              label="Subscription Plan"
              value={editPlanForm.planName}
              onChange={e => setEditPlanForm(f => ({ ...f, planName: e.target.value }))}
              options={[
                { value: 'starter', label: 'Starter' },
                { value: 'growth', label: 'Growth' },
                { value: 'enterprise', label: 'Enterprise' },
                { value: 'trial', label: 'Trial' },
              ]}
            />
            <Select
              label="Account Status"
              value={editPlanForm.status}
              onChange={e => setEditPlanForm(f => ({ ...f, status: e.target.value }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'trial', label: 'Trial' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'onboarding', label: 'Onboarding' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
