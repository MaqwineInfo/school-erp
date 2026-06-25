import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';

export default function FeeDefaultersPage() {
  const [academicYearId, setAcademicYearId] = useState('');
  const [standardId, setStandardId] = useState('');

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: () => axios.get('/academics/years').then(r => r.data.data) });
  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });

  const params = new URLSearchParams(Object.fromEntries(Object.entries({ academicYearId, standardId }).filter(([, v]) => v)));
  const { data, isLoading } = useQuery({
    queryKey: ['fee-defaulters', academicYearId, standardId],
    queryFn: () => axios.get(`/reports/fee-defaulters?${params}`).then(r => r.data.data),
  });

  const demands = data?.demands || [];
  const totalDue = data?.totalDue || 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Defaulters</h1>
          <p className="text-sm text-gray-500">Students with pending or overdue fee payments</p>
        </div>
        <button className="btn-secondary">📥 Export Excel</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-600">{demands.length}</div><div className="text-xs text-gray-500">Defaulters</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-orange-600">₹{totalDue.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Total Outstanding</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-700">{demands.filter((d: { status: string }) => d.status === 'overdue').length}</div><div className="text-xs text-gray-500">Overdue</div></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} className="input-field w-44">
          <option value="">All Years</option>
          {(Array.isArray(years) ? years : []).map((y: { _id: string; name: string }) => <option key={y._id} value={y._id}>{y.name}</option>)}
        </select>
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-40">
          <option value="">All Classes</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-red-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Installment</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-left">Due Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto"></div></td></tr>
            ) : demands.map((d: { _id: string; studentId?: { name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string }; installmentName?: string; totalAmount: number; totalPaid: number; totalDue: number; dueDate?: string; status: string }, i: number) => (
              <tr key={d._id} className="border-t hover:bg-red-50/40">
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{d.studentId?.name}<div className="text-xs text-gray-400">{d.studentId?.admissionNo}</div></td>
                <td className="px-4 py-2 text-gray-500">{d.studentId?.standardId?.name} {d.studentId?.divisionName}</td>
                <td className="px-4 py-2">{d.installmentName || 'Fee Demand'}</td>
                <td className="px-4 py-2 text-right">₹{d.totalAmount?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right text-green-600">₹{d.totalPaid?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right text-red-600 font-bold">₹{d.totalDue?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-sm">{d.dueDate ? new Date(d.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-2"><span className={`badge ${d.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>{d.status}</span></td>
                <td className="px-4 py-2 text-center"><button className="text-blue-500 hover:text-blue-700 text-xs">Send SMS</button></td>
              </tr>
            ))}
            {!isLoading && demands.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-gray-400">No defaulters found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
