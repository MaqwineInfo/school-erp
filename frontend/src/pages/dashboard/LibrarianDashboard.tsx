import React from 'react';
import { Library, BookOpen, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function LibrarianDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 📚</h1>
        <p className="text-teal-100">Librarian — Books & Resource Management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Books', value: '—', icon: <Library className="w-5 h-5" />, color: 'bg-teal-500', to: '/library' },
          { label: 'Issued Today', value: '—', icon: <BookOpen className="w-5 h-5" />, color: 'bg-cyan-500', to: '/library' },
          { label: 'Overdue', value: '—', icon: <Clock className="w-5 h-5" />, color: 'bg-red-500', to: '/library' },
          { label: 'Active Members', value: '—', icon: <Users className="w-5 h-5" />, color: 'bg-emerald-500', to: '/library' },
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
        <h3 className="font-semibold text-gray-900 mb-4">Library Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Issue Book', path: '/library' },
            { label: 'Return Book', path: '/library' },
            { label: 'Add New Book', path: '/library' },
            { label: 'Overdue List', path: '/library' },
          ].map(a => (
            <Link key={a.label} to={a.path}
              className="p-4 rounded-xl border-2 border-teal-100 bg-teal-50 text-teal-700 text-sm font-medium hover:border-teal-300 text-center">
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
