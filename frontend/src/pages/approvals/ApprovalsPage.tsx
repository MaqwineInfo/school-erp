import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '../../lib/api';
import { CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { Can } from '../../components/auth/Can';

interface Approval {
  _id: string;
  type: string;
  module: string;
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
  requestedBy?: { name: string; email: string; role: string };
  reviewedBy?: { name: string };
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

const TYPE_LABELS: Record<string, string> = {
  leave: 'Leave Request',
  fee_concession: 'Fee Concession',
  expense: 'Expense',
  mark_correction: 'Mark Correction',
  certificate: 'Certificate',
  admission: 'Admission',
  payroll: 'Payroll',
  inventory: 'Inventory',
  student_transfer: 'Student Transfer',
};

export default function ApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', statusFilter],
    queryFn: () => get<{ data: Approval[] }>(`/approvals?status=${statusFilter}&limit=50`),
  });

  const { data: statsData } = useQuery({
    queryKey: ['approvals-stats'],
    queryFn: () => get<{ data: { pending: number; approved: number; rejected: number } }>('/approvals/stats'),
  });

  const items: Approval[] = (data?.data as any)?.data || (data?.data as any) || [];
  const stats = (statsData?.data as any)?.data || statsData?.data || {};

  const approveMut = useMutation({
    mutationFn: (id: string) => patch(`/approvals/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); qc.invalidateQueries({ queryKey: ['approvals-stats'] }); },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => patch(`/approvals/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); qc.invalidateQueries({ queryKey: ['approvals-stats'] }); },
  });

  const handleReject = (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') || 'Rejected';
    rejectMut.mutate({ id, reason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-orange-600 text-white p-2.5 rounded-xl"><Clock className="w-6 h-6" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Approval Queue</h1>
          <p className="text-sm text-gray-500">Review and action pending requests</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: stats.pending ?? 0, color: 'bg-orange-500' },
          { label: 'Approved', value: stats.approved ?? 0, color: 'bg-emerald-500' },
          { label: 'Rejected', value: stats.rejected ?? 0, color: 'bg-red-500' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-white text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading approvals...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No {statusFilter || ''} approval requests found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map(item => (
              <div key={item._id} className="p-5 flex items-start gap-4 hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      item.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{item.status}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    Requested by {item.requestedBy?.name || 'Unknown'} • {new Date(item.requestedAt).toLocaleString('en-IN')}
                  </p>
                  {item.rejectionReason && <p className="text-xs text-red-500 mt-1">Reason: {item.rejectionReason}</p>}
                </div>
                {item.status === 'pending' && (
                  <Can module="tasks" action="approve">
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => approveMut.mutate(item._id)} disabled={approveMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg disabled:opacity-50">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleReject(item._id)} disabled={rejectMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg border border-red-200 disabled:opacity-50">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </Can>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
