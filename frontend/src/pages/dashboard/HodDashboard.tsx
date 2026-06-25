import React from 'react';
import { BookOpen, ClipboardList, Users, CheckCircle, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function HodDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 🎓</h1>
        <p className="text-violet-100">Head of Department — Subject & Staff Oversight</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Department Teachers', value: '—', icon: <Users className="w-5 h-5" />, color: 'bg-violet-500', to: '/hr/staff' },
          { label: 'Subjects Assigned', value: '—', icon: <BookOpen className="w-5 h-5" />, color: 'bg-blue-500', to: '/academics/subjects' },
          { label: 'Pending Marks', value: '—', icon: <ClipboardList className="w-5 h-5" />, color: 'bg-orange-500', to: '/exams/marks' },
          { label: 'Materials Uploaded', value: '—', icon: <CheckCircle className="w-5 h-5" />, color: 'bg-emerald-500', to: '/study-material' },
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
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-violet-600" /> Department Modules</h3>
          <div className="space-y-2">
            {[
              { label: 'Manage Syllabus', path: '/academics/syllabus' },
              { label: 'Study Material', path: '/study-material' },
              { label: 'Marks Verification', path: '/exams/marks' },
              { label: 'Department Reports', path: '/reports' },
            ].map(a => (
              <Link key={a.label} to={a.path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-violet-50 text-sm text-gray-700 border border-gray-100 hover:border-violet-200">
                {a.label} <span className="text-violet-400">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">My Responsibilities</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Approve marks before final submission</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Monitor syllabus coverage monthly</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Review study material uploads</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Recommend leave for dept. staff</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
