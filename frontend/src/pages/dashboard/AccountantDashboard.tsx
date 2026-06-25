import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from '../../lib/api';

export default function AccountantDashboard() {
  const { data: feeStats } = useQuery({
    queryKey: ['fee-stats-dashboard'],
    queryFn: () => axios.get('/reports/fee-collection').then(r => r.data.data),
  });

  const { data: defaulters } = useQuery({
    queryKey: ['fee-defaulters-dash'],
    queryFn: () => axios.get('/reports/fee-defaulters').then(r => r.data.data),
  });

  const { data: expStats } = useQuery({
    queryKey: ['expense-stats-dash'],
    queryFn: () => axios.get('/expenses/category-stats').then(r => r.data.data),
  });

  const totalCollection = feeStats?.total || 0;
  const defaulterCount = defaulters?.count || 0;
  const totalDue = defaulters?.totalDue || 0;
  const pendingExpenses = (Array.isArray(expStats) ? expStats : []).reduce((s: number, e: { total: number }) => s + e.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard 💰</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">₹{totalCollection.toLocaleString('en-IN')}</div>
          <div className="text-sm text-gray-500 mt-1">Total Collected</div>
        </div>
        <div className="card p-5 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</div>
          <div className="text-sm text-gray-500 mt-1">Outstanding Dues</div>
        </div>
        <div className="card p-5 border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-orange-600">{defaulterCount}</div>
          <div className="text-sm text-gray-500 mt-1">Fee Defaulters</div>
        </div>
        <div className="card p-5 border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">₹{pendingExpenses.toLocaleString('en-IN')}</div>
          <div className="text-sm text-gray-500 mt-1">Pending Expenses</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Collect Fee', link: '/fees/payments', icon: '💳', color: 'bg-green-500' },
          { label: 'Fee Demands', link: '/fees/demands', icon: '📋', color: 'bg-blue-500' },
          { label: 'Defaulters', link: '/fees/defaulters', icon: '⚠️', color: 'bg-red-500' },
          { label: 'Add Expense', link: '/finance/expenses', icon: '📤', color: 'bg-orange-500' },
        ].map(a => (
          <Link key={a.label} to={a.link} className="card p-4 text-center hover:shadow-md transition-shadow">
            <div className={`${a.color} text-white rounded-xl p-3 w-12 h-12 flex items-center justify-center text-xl mx-auto mb-2`}>{a.icon}</div>
            <div className="text-sm font-medium text-gray-700">{a.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Collections */}
        <div className="card p-5">
          <div className="flex justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Recent Collections</h2>
            <Link to="/fees/payments" className="text-blue-600 text-xs">View all →</Link>
          </div>
          {(feeStats?.payments || []).slice(0, 6).map((p: { _id: string; studentId?: { name: string }; amount: number; paidAt?: string; method?: string }) => (
            <div key={p._id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm font-medium">{p.studentId?.name || 'Student'}</span>
              <div className="text-right">
                <div className="text-sm font-bold text-green-600">₹{p.amount?.toLocaleString('en-IN')}</div>
                <div className="text-xs text-gray-400 uppercase">{p.method}</div>
              </div>
            </div>
          ))}
          {!(feeStats?.payments || []).length && <p className="text-gray-400 text-sm">No recent collections</p>}
        </div>

        {/* Top Defaulters */}
        <div className="card p-5">
          <div className="flex justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Top Defaulters</h2>
            <Link to="/fees/defaulters" className="text-blue-600 text-xs">View all →</Link>
          </div>
          {(defaulters?.demands || []).slice(0, 6).map((d: { _id: string; studentId?: { name: string; admissionNo: string }; totalDue: number }) => (
            <div key={d._id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <div className="text-sm font-medium">{d.studentId?.name}</div>
                <div className="text-xs text-gray-400">{d.studentId?.admissionNo}</div>
              </div>
              <div className="text-sm font-bold text-red-600">₹{d.totalDue?.toLocaleString('en-IN')}</div>
            </div>
          ))}
          {!(defaulters?.demands || []).length && <p className="text-gray-400 text-sm">No defaulters found</p>}
        </div>
      </div>
    </div>
  );
}
