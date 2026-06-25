import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

type Leave = { _id: string; type: string; from: string; to: string; reason?: string; status: string; staffId?: { name: string; employeeId: string; designation: string }; approvedBy?: { name: string }; appliedAt: string };

const TYPE_LABELS: Record<string, string> = { cl: 'Casual Leave', sl: 'Sick Leave', el: 'Earned Leave', ml: 'Maternity Leave', pl: 'Paternity Leave', lop: 'Loss of Pay', comp_off: 'Comp Off', on_duty: 'On Duty' };
const STATUS_COLOR: Record<string, string> = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', cancelled: 'badge-gray' };

function ApprovalModal({ leave, onClose }: { leave: Leave; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const approve = useMutation({
    mutationFn: (status: string) => axios.patch(`/leaves/${leave._id}/approve`, { status, rejectionReason: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); onClose(); },
  });
  const days = Math.ceil((new Date(leave.to).getTime() - new Date(leave.from).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-bold text-lg mb-4">Review Leave Application</h3>
        <div className="space-y-2 text-sm mb-4">
          <div><span className="text-gray-500">Staff:</span> <strong>{leave.staffId?.name}</strong></div>
          <div><span className="text-gray-500">Type:</span> <strong>{TYPE_LABELS[leave.type]}</strong></div>
          <div><span className="text-gray-500">Period:</span> <strong>{new Date(leave.from).toLocaleDateString('en-IN')} – {new Date(leave.to).toLocaleDateString('en-IN')} ({days} days)</strong></div>
          <div><span className="text-gray-500">Reason:</span> {leave.reason}</div>
        </div>
        {leave.status === 'pending' && (
          <>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Rejection reason (if rejecting)" className="input-field text-sm" rows={2} />
            <div className="flex gap-3 mt-4">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => approve.mutate('rejected')} disabled={approve.isPending} className="btn-danger flex-1">Reject</button>
              <button onClick={() => approve.mutate('approved')} disabled={approve.isPending} className="btn-primary flex-1">Approve</button>
            </div>
          </>
        )}
        {leave.status !== 'pending' && <button onClick={onClose} className="btn-secondary w-full mt-4">Close</button>}
      </div>
    </div>
  );
}

export default function LeavePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showApply, setShowApply] = useState(false);
  const [approving, setApproving] = useState<Leave | null>(null);
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [page, setPage] = useState(1);
  const { register, handleSubmit, reset } = useForm();

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-all'],
    queryFn: () => axios.get('/hr/staff?limit=200').then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.staff || []; }),
  });

  const params = new URLSearchParams({ page: String(page), limit: '20', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery({
    queryKey: ['leaves', filters, page],
    queryFn: () => axios.get(`/leaves?${params}`).then(r => r.data),
  });
  const leaves: Leave[] = Array.isArray(data?.data) ? data.data : data?.data?.leaves || [];
  const pagination = data?.pagination || data?.meta;

  const apply = useMutation({
    mutationFn: (d: object) => axios.post('/leaves', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setShowApply(false); reset(); },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500">Apply for, approve, and track staff leave requests</p>
        </div>
        <button onClick={() => setShowApply(true)} className="btn-primary">+ Apply Leave</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['pending', 'approved', 'rejected', 'cancelled'].map(s => (
          <div key={s} className="card p-4 text-center">
            <div className={`text-2xl font-bold ${s === 'pending' ? 'text-yellow-500' : s === 'approved' ? 'text-green-600' : s === 'rejected' ? 'text-red-600' : 'text-gray-500'}`}>
              {leaves.filter(l => l.status === s).length}
            </div>
            <div className="text-xs text-gray-500 capitalize">{s}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field w-36">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="input-field w-40">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Staff</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">From</th>
              <th className="px-4 py-3 text-left">To</th>
              <th className="px-4 py-3 text-center">Days</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Applied</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
            ) : leaves.map(l => {
              const days = Math.ceil((new Date(l.to).getTime() - new Date(l.from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return (
                <tr key={l._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{l.staffId?.name}<div className="text-xs text-gray-400">{l.staffId?.designation}</div></td>
                  <td className="px-4 py-3"><span className="badge badge-blue text-xs">{TYPE_LABELS[l.type] || l.type}</span></td>
                  <td className="px-4 py-3">{new Date(l.from).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">{new Date(l.to).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-center font-semibold">{days}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(l.appliedAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLOR[l.status]}`}>{l.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setApproving(l)} className="text-blue-500 hover:text-blue-700 text-xs">{l.status === 'pending' ? 'Review' : 'View'}</button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && leaves.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-gray-400">No leave applications found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Apply Modal */}
      {showApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => apply.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Apply for Leave</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Staff Member *</label>
              <select {...register('staffId', { required: true })} className="input-field">
                <option value="">Select Staff</option>
                {(Array.isArray(staff) ? staff : []).map((s: { _id: string; name: string; employeeId: string }) => <option key={s._id} value={s._id}>{s.name} ({s.employeeId})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Leave Type *</label>
                <select {...register('type', { required: true })} className="input-field">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div></div>
              <div>
                <label className="block text-sm font-medium mb-1">From *</label>
                <input {...register('from', { required: true })} type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To *</label>
                <input {...register('to', { required: true })} type="date" className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea {...register('reason')} rows={2} className="input-field" placeholder="Reason for leave..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowApply(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={apply.isPending} className="btn-primary flex-1">{apply.isPending ? 'Submitting...' : 'Submit'}</button>
            </div>
          </form>
        </div>
      )}

      {approving && <ApprovalModal leave={approving} onClose={() => setApproving(null)} />}
    </div>
  );
}
