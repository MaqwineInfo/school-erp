import React from 'react';
import { Users, Clock, IndianRupee, CheckCircle, UserCog, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function HRManagerDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 👔</h1>
        <p className="text-orange-100">HR Manager — Staff Lifecycle & Payroll</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: '—', icon: <Users className="w-5 h-5" />, color: 'bg-orange-500', to: '/hr/staff' },
          { label: 'Leaves Pending', value: '—', icon: <Clock className="w-5 h-5" />, color: 'bg-amber-500', to: '/hr/leaves' },
          { label: 'Payroll This Month', value: '₹—', icon: <IndianRupee className="w-5 h-5" />, color: 'bg-yellow-600', to: '/hr/payroll' },
          { label: 'On Leave Today', value: '—', icon: <Calendar className="w-5 h-5" />, color: 'bg-rose-500', to: '/hr/leaves' },
        ].map(s => (
          <Link key={s.label} to={s.to} className={`${s.color} rounded-xl p-5 text-white shadow-sm hover:shadow-md`}>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 p-2 rounded-lg">{s.icon}</div>
              <span className="text-2xl font-bold">{s.value}</span>
            </div>
            <p className="text-sm text-white/80">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><UserCog className="w-5 h-5 text-orange-600" /> HR Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add New Staff', path: '/hr/staff' },
              { label: 'Process Payroll', path: '/hr/payroll' },
              { label: 'Approve Leaves', path: '/hr/leaves' },
              { label: 'Salary Slips', path: '/hr/salary-slips' },
              { label: 'Staff Reports', path: '/reports' },
            ].map(a => (
              <Link key={a.label} to={a.path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-orange-50 text-sm text-gray-700 border border-gray-100">
                {a.label} <span className="text-orange-400">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-orange-600" /> Pending Tasks</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
              <span>Leave Requests</span><span className="font-semibold text-orange-700">Review</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
              <span>Payroll Processing</span><span className="font-semibold text-yellow-700">This Month</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
              <span>Staff Attendance</span><span className="font-semibold text-amber-700">Mark</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
