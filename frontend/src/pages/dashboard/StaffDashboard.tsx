import React from 'react';
import { Calendar, Bell, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function StaffDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-600 to-gray-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 👤</h1>
        <p className="text-slate-300">Staff Portal — Leave & Notices</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Apply Leave', path: '/hr/leaves', icon: <Clock className="w-5 h-5" />, color: 'bg-slate-600' },
          { label: 'Notices', path: '/communication/notices', icon: <Bell className="w-5 h-5" />, color: 'bg-gray-600' },
          { label: 'Events', path: '/events', icon: <Calendar className="w-5 h-5" />, color: 'bg-zinc-600' },
        ].map(s => (
          <Link key={s.label} to={s.path} className={`${s.color} rounded-xl p-5 text-white shadow-sm hover:shadow-md`}>
            <div className="bg-white/20 p-2 rounded-lg w-fit mb-2">{s.icon}</div>
            <p className="font-semibold text-sm">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
