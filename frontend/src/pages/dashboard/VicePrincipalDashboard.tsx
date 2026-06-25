import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import { BookOpen, UserCheck, Clock, Award, Calendar, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function VicePrincipalDashboard() {
  const user = useAuthStore(s => s.user);
  const { data } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => get<any>('/dashboard/stats'), staleTime: 5 * 60 * 1000 });
  const stats = data?.data || {};

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]} 📋</h1>
        <p className="text-indigo-100">Vice Principal — Academic Oversight</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Attendance Today', value: `${stats.presentToday ?? '—'}`, icon: <UserCheck className="w-5 h-5" />, color: 'bg-emerald-500', to: '/attendance' },
          { label: 'Subjects Running', value: stats.totalSubjects ?? '—', icon: <BookOpen className="w-5 h-5" />, color: 'bg-indigo-500', to: '/academics/subjects' },
          { label: 'Exams This Month', value: stats.examsThisMonth ?? 0, icon: <Award className="w-5 h-5" />, color: 'bg-violet-500', to: '/exams' },
          { label: 'Pending Approvals', value: stats.pendingLeaves ?? 0, icon: <Clock className="w-5 h-5" />, color: 'bg-orange-500', to: '/hr/leaves' },
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
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-indigo-600" /> Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Timetable Management', path: '/academics/timetable' },
              { label: 'Attendance Report', path: '/attendance' },
              { label: 'Exam Schedule', path: '/exams' },
              { label: 'Academic Year Setup', path: '/academics/years' },
              { label: 'Events Calendar', path: '/events' },
            ].map(a => (
              <Link key={a.label} to={a.path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-indigo-50 text-sm text-gray-700 hover:text-indigo-700 border border-gray-100 hover:border-indigo-200 transition-colors">
                {a.label}
                <span className="text-indigo-400">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-indigo-600" /> Academic Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Classes Running</span>
              <span className="font-semibold text-gray-900">{stats.totalClasses ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Active Teachers</span>
              <span className="font-semibold text-gray-900">{stats.activeStaff ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Homework Assigned</span>
              <span className="font-semibold text-gray-900">{stats.homeworkPending ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
