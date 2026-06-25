import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Expense = { _id: string; title: string; category: string; amount: number; gstAmount?: number; vendor?: string; billNo?: string; billDate?: string; paymentMethod: string; status: string; createdBy?: { name: string }; approvedBy?: { name: string }; remarks?: string; paidAt?: string };

const CAT_LABELS: Record<string, string> = { salary: '💰 Salary', utilities: '💡 Utilities', maintenance: '🔧 Maintenance', stationery: '📎 Stationery', marketing: '📣 Marketing', events: '🎉 Events', repairs: '🛠️ Repairs', travel: '🚗 Travel', rent: '🏠 Rent', other: '📦 Other' };
const STATUS_COLOR: Record<string, string> = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', paid: 'badge-blue' };

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [page, setPage] = useState(1);
  const { register, handleSubmit, reset } = useForm();

  const params = new URLSearchParams({ page: String(page), limit: '20', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filters, page],
    queryFn: () => axios.get(`/expenses?${params}`).then(r => r.data),
  });
  const expenses: Expense[] = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
  const summary = data?.data?.summary || [];

  const totalApproved = summary.find((s: { _id: string }) => s._id === 'approved')?.total || 0;
  const totalPending = summary.find((s: { _id: string }) => s._id === 'pending')?.total || 0;
  const totalPaid = summary.find((s: { _id: string }) => s._id === 'paid')?.total || 0;

  const create = useMutation({
    mutationFn: (d: object) => axios.post('/expenses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setShowCreate(false); reset(); },
  });

  const approve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axios.patch(`/expenses/${id}/approve`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-sm text-gray-500">Track and approve school expenses, bills, and vouchers</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Expense</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-yellow-600">₹{totalPending.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Pending Approval</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">₹{totalApproved.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Approved</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">₹{totalPaid.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Paid</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-700">{expenses.length}</div><div className="text-xs text-gray-500">Total Entries</div></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} className="input-field w-44">
          <option value="">All Categories</option>
          {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field w-36">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Vendor</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Mode</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
            ) : expenses.map(e => (
              <tr key={e._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.title}<div className="text-xs text-gray-400">Bill: {e.billNo || '—'}</div></td>
                <td className="px-4 py-3">{CAT_LABELS[e.category] || e.category}</td>
                <td className="px-4 py-3 text-gray-500">{e.vendor || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold">₹{e.amount.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">{e.billDate ? new Date(e.billDate).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-3 uppercase text-xs">{e.paymentMethod}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLOR[e.status] || 'badge-gray'}`}>{e.status}</span></td>
                <td className="px-4 py-3 text-center flex gap-1 justify-center">
                  {e.status === 'pending' && (
                    <>
                      <button onClick={() => approve.mutate({ id: e._id, status: 'approved' })} className="text-green-500 hover:text-green-700 text-xs">✅ Approve</button>
                      <button onClick={() => approve.mutate({ id: e._id, status: 'rejected' })} className="text-red-400 hover:text-red-600 text-xs">❌</button>
                    </>
                  )}
                  {e.status === 'approved' && (
                    <button onClick={() => approve.mutate({ id: e._id, status: 'paid' })} className="text-blue-500 hover:text-blue-700 text-xs">Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && expenses.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No expenses found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => create.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold">Add Expense</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input {...register('title', { required: true })} className="input-field" placeholder="Expense description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select {...register('category', { required: true })} className="input-field">
                  {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
                <input {...register('amount', { required: true, valueAsNumber: true })} type="number" className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GST Amount (₹)</label>
                <input {...register('gstAmount', { valueAsNumber: true })} type="number" className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select {...register('paymentMethod')} className="input-field">
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="neft">NEFT</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vendor</label>
                <input {...register('vendor')} className="input-field" placeholder="Vendor name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bill No.</label>
                <input {...register('billNo')} className="input-field" placeholder="Invoice number" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bill Date</label>
                <input {...register('billDate')} type="date" className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <textarea {...register('remarks')} rows={2} className="input-field" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={create.isPending} className="btn-primary flex-1">{create.isPending ? 'Saving...' : 'Add Expense'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
