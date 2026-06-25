import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import {
  Users, GraduationCap, IndianRupee, UserCheck, AlertTriangle,
  TrendingUp, BookOpen, Clock, Award, Bell, BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

const StatCard = ({ label, value, icon, color, to }: { label: string; value: string | number; icon: React.ReactNode; color: string; to?: string }) => {
  const inner = (
    <div className={`rounded-xl p-5 text-white ${color} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="bg-white/20 p-2 rounded-lg">{icon}</div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm text-white/80">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

export default function PrincipalDashboard() {
  const user = useAuthStore(s => s.user);

  const { data: dashData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => get<any>('/dashboard/stats'),
    staleTime: 5 * 60 * 1000,
  });

  const stats = dashData?.data || {};

  const quickActions = [
    { label: 'Mark Attendance', path: '/attendance', icon: <UserCheck className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'View Reports', path: '/reports', icon: <BarChart3 className="w-5 h-5" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Fee Defaulters', path: '/fees/defaulters', icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'Leave Requests', path: '/hr/leaves', icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: 'Exam Schedule', path: '/exams', icon: <Award className="w-5 h-5" />, color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { label: 'Staff Directory', path: '/hr/staff', icon: <Users className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Good morning, {user?.name?.split(' ')[0]} 🏫</h1>
        <p className="text-blue-100">Principal Dashboard — Full school overview</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents ?? '—'} icon={<GraduationCap className="w-5 h-5" />} color="bg-blue-500" to="/students" />
        <StatCard label="Present Today" value={stats.presentToday ?? '—'} icon={<UserCheck className="w-5 h-5" />} color="bg-emerald-500" to="/attendance" />
        <StatCard label="Fee Collected" value={`₹${((stats.feeCollected ?? 0) / 1000).toFixed(0)}K`} icon={<IndianRupee className="w-5 h-5" />} color="bg-yellow-500" to="/fees/payments" />
        <StatCard label="Staff Active" value={stats.activeStaff ?? '—'} icon={<Users className="w-5 h-5" />} color="bg-violet-500" to="/hr/staff" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Leaves" value={stats.pendingLeaves ?? 0} icon={<Clock className="w-5 h-5" />} color="bg-orange-500" to="/hr/leaves" />
        <StatCard label="Fee Defaulters" value={stats.defaultersCount ?? 0} icon={<AlertTriangle className="w-5 h-5" />} color="bg-red-500" to="/fees/defaulters" />
        <StatCard label="Exams This Month" value={stats.examsThisMonth ?? 0} icon={<Award className="w-5 h-5" />} color="bg-cyan-500" to="/exams" />
        <StatCard label="Notices Today" value={stats.noticesCount ?? 0} icon={<Bell className="w-5 h-5" />} color="bg-pink-500" to="/communication/notices" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(a => (
            <Link key={a.label} to={a.path}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${a.color} hover:scale-105 transition-transform text-center`}>
              {a.icon}
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Today's Attendance</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Total Students</span><span className="font-medium text-gray-900">{stats.totalStudents ?? '—'}</span></div>
            <div className="flex justify-between"><span>Present</span><span className="font-medium text-emerald-600">{stats.presentToday ?? '—'}</span></div>
            <div className="flex justify-between"><span>Absent</span><span className="font-medium text-red-500">{(stats.totalStudents ?? 0) - (stats.presentToday ?? 0)}</span></div>
            <div className="flex justify-between"><span>Attendance %</span>
              <span className="font-medium">{stats.totalStudents ? Math.round((stats.presentToday / stats.totalStudents) * 100) : '—'}%</span>
            </div>
          </div>
          <Link to="/attendance" className="block mt-4 text-center text-xs text-blue-600 hover:underline">View Full Report →</Link>
        </div>

        {/* Fee summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-gray-900">Fee Overview</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Total Demand</span><span className="font-medium text-gray-900">₹{((stats.totalFeeDemand ?? 0) / 100000).toFixed(1)}L</span></div>
            <div className="flex justify-between"><span>Collected</span><span className="font-medium text-green-600">₹{((stats.feeCollected ?? 0) / 100000).toFixed(1)}L</span></div>
            <div className="flex justify-between"><span>Pending</span><span className="font-medium text-red-500">₹{(((stats.totalFeeDemand ?? 0) - (stats.feeCollected ?? 0)) / 100000).toFixed(1)}L</span></div>
            <div className="flex justify-between"><span>Defaulters</span><span className="font-medium text-orange-600">{stats.defaultersCount ?? 0} students</span></div>
          </div>
          <Link to="/fees/defaulters" className="block mt-4 text-center text-xs text-blue-600 hover:underline">View Defaulters →</Link>
        </div>

        {/* Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold text-gray-900">Academic Performance</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Exams Scheduled</span><span className="font-medium text-gray-900">{stats.examsThisMonth ?? 0}</span></div>
            <div className="flex justify-between"><span>Homework Pending</span><span className="font-medium text-orange-600">{stats.homeworkPending ?? 0}</span></div>
            <div className="flex justify-between"><span>Syllabus Covered</span><span className="font-medium text-green-600">{stats.syllabusCovered ?? 0}%</span></div>
          </div>
          <Link to="/reports" className="block mt-4 text-center text-xs text-blue-600 hover:underline">Full Reports →</Link>
        </div>
      </div>
    </div>
  );
}
