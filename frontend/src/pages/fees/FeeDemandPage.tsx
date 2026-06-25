import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type FeeDemand = { _id: string; installmentName?: string; totalAmount: number; totalPaid: number; totalDue: number; dueDate?: string; status: string; studentId?: { name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string } };

const STATUS_COLOR: Record<string, string> = { pending: 'badge-yellow', partial: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', waived: 'badge-gray' };

export default function FeeDemandPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', academicYearId: '', search: '' });
  const { register, handleSubmit, reset } = useForm();

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: () => axios.get('/academics/years').then(r => r.data.data) });
  const { data: structures = [] } = useQuery({ queryKey: ['fee-structures'], queryFn: () => axios.get('/fees/structures').then(r => r.data.data) });
  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });

  const params = new URLSearchParams({ page: String(page), limit: '20', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery({
    queryKey: ['fee-demands', filters, page],
    queryFn: () => axios.get(`/fees/demands?${params}`).then(r => r.data),
  });

  const demands: FeeDemand[] = Array.isArray(data?.data) ? data.data : data?.data?.demands || [];
  const pagination = data?.pagination || data?.meta;

  // Summary stats
  const totalDue = demands.reduce((s, d) => s + d.totalDue, 0);
  const totalPaid = demands.reduce((s, d) => s + d.totalPaid, 0);
  const overdueCount = demands.filter(d => d.status === 'overdue').length;

  const createDemand = useMutation({
    mutationFn: (d: object) => axios.post('/fees/demands', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-demands'] }); setShowCreate(false); reset(); },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Demands</h1>
          <p className="text-sm text-gray-500">Manage fee installments and demands for students</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Demand</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{demands.length}</div><div className="text-xs text-gray-500">Total Demands</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Total Collected</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Total Pending</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-orange-600">{overdueCount}</div><div className="text-xs text-gray-500">Overdue</div></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field w-36">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={filters.academicYearId} onChange={e => setFilters(f => ({ ...f, academicYearId: e.target.value }))} className="input-field w-44">
          <option value="">All Years</option>
          {(Array.isArray(years) ? years : []).map((y: { _id: string; name: string }) => <option key={y._id} value={y._id}>{y.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Installment</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3 text-left">Due Date</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
            ) : demands.map(d => (
              <tr key={d._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.studentId?.name}<div className="text-xs text-gray-400">{d.studentId?.admissionNo}</div></td>
                <td className="px-4 py-3 text-gray-500">{d.studentId?.standardId?.name} {d.studentId?.divisionName}</td>
                <td className="px-4 py-3">{d.installmentName || '—'}</td>
                <td className="px-4 py-3 text-right font-medium">₹{d.totalAmount?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-green-600">₹{d.totalPaid?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-red-600 font-semibold">₹{d.totalDue?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">{d.dueDate ? new Date(d.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLOR[d.status] || 'badge-gray'}`}>{d.status}</span></td>
              </tr>
            ))}
            {!isLoading && demands.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No fee demands found</td></tr>}
          </tbody>
        </table>
        {pagination && (
          <div className="px-4 py-3 border-t flex justify-between items-center text-sm text-gray-500">
            <span>Total: {pagination.total} records</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3">←</button>
              <span className="px-3 py-1">Page {page} of {pagination.pages || Math.ceil(pagination.total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.pages || page >= pagination.pages} className="btn-secondary py-1 px-3">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => createDemand.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold">Create Fee Demand</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Student ID *</label>
                <input {...register('studentId', { required: true })} placeholder="Student ID" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Academic Year</label>
                <select {...register('academicYearId')} className="input-field">
                  {(Array.isArray(years) ? years : []).map((y: { _id: string; name: string }) => <option key={y._id} value={y._id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fee Structure</label>
                <select {...register('feeStructureId')} className="input-field">
                  <option value="">Select</option>
                  {(Array.isArray(structures) ? structures : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Installment Name</label>
                <input {...register('installmentName')} placeholder="e.g. Term 1" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input {...register('dueDate')} type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Amount</label>
                <input {...register('totalAmount')} type="number" placeholder="0" className="input-field" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={createDemand.isPending} className="btn-primary flex-1">{createDemand.isPending ? 'Saving...' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
