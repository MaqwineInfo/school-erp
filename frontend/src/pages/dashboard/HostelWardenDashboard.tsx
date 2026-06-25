import React from 'react';
import { Home, Users, AlertTriangle, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function HostelWardenDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 🏠</h1>
        <p className="text-rose-100">Hostel Warden — Residential Management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Boarders', value: '—', icon: <Users className="w-5 h-5" />, color: 'bg-rose-500', to: '/hostel' },
          { label: 'Present Today', value: '—', icon: <UserCheck className="w-5 h-5" />, color: 'bg-emerald-500', to: '/hostel' },
          { label: 'Rooms Occupied', value: '—', icon: <Home className="w-5 h-5" />, color: 'bg-blue-500', to: '/hostel' },
          { label: 'Complaints', value: '0', icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-orange-500', to: '/hostel' },
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

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Hostel Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Mark Attendance', path: '/hostel' },
            { label: 'Room Allotment', path: '/hostel' },
            { label: 'Visitor Log', path: '/frontoffice/visitors' },
            { label: 'Complaints', path: '/hostel' },
          ].map(a => (
            <Link key={a.label} to={a.path}
              className="p-4 rounded-xl border-2 border-rose-100 bg-rose-50 text-rose-700 text-sm font-medium hover:border-rose-300 text-center">
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
