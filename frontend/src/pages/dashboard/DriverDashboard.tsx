import React from 'react';
import { Bus, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function DriverDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-stone-600 to-gray-700 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 🚌</h1>
        <p className="text-stone-300">Driver — My Route & Students</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'My Route', path: '/transport', icon: <MapPin className="w-5 h-5" />, color: 'bg-stone-600' },
          { label: 'Student List', path: '/transport', icon: <Users className="w-5 h-5" />, color: 'bg-gray-600' },
        ].map(s => (
          <Link key={s.label} to={s.path} className={`${s.color} rounded-xl p-5 text-white shadow-sm hover:shadow-md`}>
            <div className="bg-white/20 p-2 rounded-lg w-fit mb-2">{s.icon}</div>
            <p className="font-semibold">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-3">
        <Bus className="w-8 h-8 text-stone-500" />
        <p className="text-sm text-gray-500">Mark attendance for your assigned route students. Contact transport in-charge for route changes.</p>
      </div>
    </div>
  );
}
