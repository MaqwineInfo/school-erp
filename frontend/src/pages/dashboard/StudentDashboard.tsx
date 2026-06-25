import React from 'react';
import { BookOpen, UserCheck, Award, Calendar, ClipboardList, IndianRupee, Library } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function StudentDashboard() {
  const user = useAuthStore(s => s.user);

  const quickLinks = [
    ...(user?.studentId ? [{ label: 'My Profile', path: `/students/${user.studentId}`, icon: <BookOpen className="w-5 h-5" />, color: 'bg-lime-50 text-lime-700 border-lime-200' }] : []),
    { label: 'My Attendance', path: '/attendance', icon: <UserCheck className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Homework', path: '/homework', icon: <ClipboardList className="w-5 h-5" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'My Timetable', path: '/academics/timetable', icon: <Calendar className="w-5 h-5" />, color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { label: 'Exam Schedule', path: '/exams', icon: <Award className="w-5 h-5" />, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { label: 'Study Material', path: '/study-material', icon: <BookOpen className="w-5 h-5" />, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { label: 'Library', path: '/library', icon: <Library className="w-5 h-5" />, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-lime-600 to-green-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(' ')[0]} 🎒</h1>
        <p className="text-lime-100">Student Portal — Your Academic Overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Attendance %', value: '—%', icon: <UserCheck className="w-5 h-5" />, color: 'bg-emerald-500' },
          { label: 'Pending HW', value: '—', icon: <ClipboardList className="w-5 h-5" />, color: 'bg-orange-500' },
          { label: 'Fee Dues', value: '₹0', icon: <IndianRupee className="w-5 h-5" />, color: 'bg-red-500' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-white shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 p-2 rounded-lg">{s.icon}</div>
              <span className="text-xl font-bold">{s.value}</span>
            </div>
            <p className="text-xs text-white/80">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickLinks.map(a => (
            <Link key={a.label} to={a.path}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${a.color} hover:scale-105 transition-transform text-center`}>
              {a.icon}
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Today's Schedule</h3>
        <p className="text-sm text-gray-500">View your timetable to see today's classes.</p>
        <Link to="/academics/timetable" className="text-blue-600 text-sm hover:underline mt-2 block">Open Timetable →</Link>
      </div>
    </div>
  );
}
