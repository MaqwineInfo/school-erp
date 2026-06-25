import React from 'react';
import { UserPlus, FileText, CheckCircle, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function AdmissionOfficerDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 📝</h1>
        <p className="text-cyan-100">Admission Officer — Enquiries to Enrolment</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Enquiries', value: '—', icon: <FileText className="w-5 h-5" />, color: 'bg-cyan-500', to: '/admissions/enquiries' },
          { label: 'Converted', value: '—', icon: <CheckCircle className="w-5 h-5" />, color: 'bg-teal-500', to: '/students' },
          { label: 'Pending', value: '—', icon: <UserPlus className="w-5 h-5" />, color: 'bg-sky-500', to: '/admissions/enquiries' },
          { label: 'RTE Seats', value: '—', icon: <Users className="w-5 h-5" />, color: 'bg-emerald-500', to: '/admissions/rte' },
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
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-cyan-600" /> Admission Workflow</h3>
          <div className="space-y-2">
            {[
              { label: 'New Enquiry', path: '/admissions/enquiries' },
              { label: 'Online Admission Form', path: '/admissions/form' },
              { label: 'RTE Tracker', path: '/admissions/rte' },
              { label: 'Print Admission Letter', path: '/frontoffice/certificates' },
            ].map(a => (
              <Link key={a.label} to={a.path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-cyan-50 text-sm text-gray-700 border border-gray-100">
                {a.label} <span className="text-cyan-400">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
          <div className="space-y-3">
            {[
              { stage: 'Enquiries', count: '—', color: 'bg-cyan-100 text-cyan-700' },
              { stage: 'Follow-up Done', count: '—', color: 'bg-sky-100 text-sky-700' },
              { stage: 'Documents Received', count: '—', color: 'bg-teal-100 text-teal-700' },
              { stage: 'Admitted', count: '—', color: 'bg-emerald-100 text-emerald-700' },
            ].map(f => (
              <div key={f.stage} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{f.stage}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.color}`}>{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
