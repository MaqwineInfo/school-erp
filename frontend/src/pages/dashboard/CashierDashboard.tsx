import React from 'react';
import { IndianRupee, Receipt, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function CashierDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 💵</h1>
        <p className="text-amber-100">Cashier — Fee Collection Counter</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Collect Fee', path: '/fees/payments', icon: <IndianRupee className="w-5 h-5" />, color: 'bg-amber-500' },
          { label: 'Print Receipt', path: '/fees/payments', icon: <Receipt className="w-5 h-5" />, color: 'bg-yellow-500' },
        ].map(s => (
          <Link key={s.label} to={s.path} className={`${s.color} rounded-xl p-5 text-white shadow-sm hover:shadow-md`}>
            <div className="bg-white/20 p-2 rounded-lg w-fit mb-2">{s.icon}</div>
            <p className="font-semibold">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Users className="w-5 h-5 text-amber-600" /> Counter Access</h3>
        <p className="text-sm text-gray-500">You can collect fees, print receipts, and view student fee status. No access to fee structure or reports.</p>
      </div>
    </div>
  );
}
