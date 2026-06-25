import React from 'react';
import { Users, UserCheck, Bell, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function ReceptionistDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Good morning, {user?.name?.split(' ')[0]} 🗂️</h1>
        <p className="text-pink-100">Front Desk — Visitor Management & Enquiries</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Visitors Today', value: '—', icon: <Users className="w-5 h-5" />, color: 'bg-pink-500', to: '/frontoffice/visitors' },
          { label: 'New Enquiries', value: '—', icon: <UserCheck className="w-5 h-5" />, color: 'bg-rose-500', to: '/admissions/enquiries' },
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
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><Search className="w-5 h-5 text-pink-600" /> Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Check In Visitor', path: '/frontoffice/visitors' },
            { label: 'New Enquiry', path: '/admissions/enquiries' },
            { label: 'Student Search', path: '/students' },
            { label: 'Notice Board', path: '/communication/notices' },
          ].map(a => (
            <Link key={a.label} to={a.path}
              className="p-4 rounded-xl border-2 border-pink-100 bg-pink-50 text-pink-700 text-sm font-medium hover:border-pink-300 text-center">
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Bell className="w-5 h-5 text-pink-600" /> My Access</h3>
        <p className="text-sm text-gray-500">You have access to: Visitor log, Admission enquiries, Student search (name/class only), Notices.</p>
      </div>
    </div>
  );
}
