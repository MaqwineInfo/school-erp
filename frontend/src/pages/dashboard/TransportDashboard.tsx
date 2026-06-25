import React from 'react';
import { Bus, Users, MapPin, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function TransportDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 🚌</h1>
        <p className="text-sky-100">Transport In-charge — Routes & Fleet Management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Buses', value: '—', icon: <Bus className="w-5 h-5" />, color: 'bg-sky-500', to: '/transport' },
          { label: 'Students Using', value: '—', icon: <Users className="w-5 h-5" />, color: 'bg-blue-500', to: '/transport' },
          { label: 'Active Routes', value: '—', icon: <MapPin className="w-5 h-5" />, color: 'bg-indigo-500', to: '/transport' },
          { label: 'Alerts', value: '0', icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-orange-500', to: '/transport' },
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
        <h3 className="font-semibold text-gray-900 mb-4">Transport Management</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'View Routes', path: '/transport' },
            { label: 'Student Allocation', path: '/transport' },
            { label: 'Driver Management', path: '/transport' },
            { label: 'Transport Report', path: '/reports' },
          ].map(a => (
            <Link key={a.label} to={a.path}
              className="p-4 rounded-xl border-2 border-sky-100 bg-sky-50 text-sky-700 text-sm font-medium hover:border-sky-300 text-center">
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
