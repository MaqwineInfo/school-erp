import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, IndianRupee, AlertTriangle, UserPlus, TrendingUp, BookOpen, Clock } from 'lucide-react';
import { StatCard, Card } from '../../components/ui/Card';
import { dashboardService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import TeacherDashboard from './TeacherDashboard';
import AccountantDashboard from './AccountantDashboard';
import ParentDashboard from './ParentDashboard';
import PrincipalDashboard from './PrincipalDashboard';
import VicePrincipalDashboard from './VicePrincipalDashboard';
import HodDashboard from './HodDashboard';
import HRManagerDashboard from './HRManagerDashboard';
import LibrarianDashboard from './LibrarianDashboard';
import TransportDashboard from './TransportDashboard';
import HostelWardenDashboard from './HostelWardenDashboard';
import StudentDashboard from './StudentDashboard';
import ReceptionistDashboard from './ReceptionistDashboard';
import AdmissionOfficerDashboard from './AdmissionOfficerDashboard';
import CashierDashboard from './CashierDashboard';
import DriverDashboard from './DriverDashboard';
import ClassTeacherDashboard from './ClassTeacherDashboard';
import StaffDashboard from './StaffDashboard';

function formatINR(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  // Route every role to its specific dashboard
  switch (user?.role) {
    case 'principal':                    return <PrincipalDashboard />;
    case 'vice_principal':               return <VicePrincipalDashboard />;
    case 'hod':                          return <HodDashboard />;
    case 'teacher':                     return <TeacherDashboard />;
    case 'class_teacher':               return <ClassTeacherDashboard />;
    case 'accountant':                  return <AccountantDashboard />;
    case 'cashier':                     return <CashierDashboard />;
    case 'driver':                      return <DriverDashboard />;
    case 'staff':                       return <StaffDashboard />;
    case 'hr_manager':                  return <HRManagerDashboard />;
    case 'admission_officer':           return <AdmissionOfficerDashboard />;
    case 'librarian':                   return <LibrarianDashboard />;
    case 'transport_incharge':          return <TransportDashboard />;
    case 'hostel_warden':               return <HostelWardenDashboard />;
    case 'receptionist':                return <ReceptionistDashboard />;
    case 'parent':                      return <ParentDashboard />;
    case 'student':                     return <StudentDashboard />;
    default: break; // super_admin, staff — fall through to the full admin dashboard
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'principal'],
    queryFn: () => dashboardService.principal(),
    staleTime: 60000,
  });

  const stats = data?.data;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Good morning, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-blue-100 text-sm mt-1">{today}</p>
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          <div>
            <p className="text-blue-200 text-xs">Today's Collection</p>
            <p className="text-white text-xl font-bold">
              {isLoading ? '...' : formatINR(stats?.fees.todayCollection || 0)}
            </p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Month Collection</p>
            <p className="text-white text-xl font-bold">
              {isLoading ? '...' : formatINR(stats?.fees.monthCollection || 0)}
            </p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">New Enquiries</p>
            <p className="text-white text-xl font-bold">{isLoading ? '...' : stats?.enquiries.new || 0}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Students"
          value={isLoading ? '...' : (stats?.students.total || 0).toLocaleString('en-IN')}
          icon={<GraduationCap className="w-5 h-5" />}
          color="blue"
          description={`${stats?.students.active || 0} active`}
          change="+12 this month"
          changeType="up"
        />
        <StatCard
          title="Total Staff"
          value={isLoading ? '...' : (stats?.staff.total || 0).toLocaleString('en-IN')}
          icon={<Users className="w-5 h-5" />}
          color="green"
          description="Teaching & non-teaching"
        />
        <StatCard
          title="Fee Defaulters"
          value={isLoading ? '...' : (stats?.fees.defaulters || 0).toLocaleString('en-IN')}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="orange"
          description="Pending fee demands"
        />
        <StatCard
          title="New Enquiries"
          value={isLoading ? '...' : (stats?.enquiries.new || 0).toLocaleString('en-IN')}
          icon={<UserPlus className="w-5 h-5" />}
          color="purple"
          description="Awaiting follow-up"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Collections chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Fee Collections (Last 7 Days)</h3>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          {isLoading ? (
            <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <div className="space-y-2">
              {(stats?.recentCollection || []).map((day) => {
                const max = Math.max(...(stats?.recentCollection || []).map(d => d.amount), 1);
                const pct = (day.amount / max) * 100;
                const label = new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-16">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-16 text-right">{formatINR(day.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Mark Attendance', icon: <Users className="w-5 h-5" />, href: '/attendance', color: 'text-blue-600 bg-blue-50' },
              { label: 'Collect Fee', icon: <IndianRupee className="w-5 h-5" />, href: '/fees/payments', color: 'text-green-600 bg-green-50' },
              { label: 'Add Enquiry', icon: <UserPlus className="w-5 h-5" />, href: '/admissions/enquiries', color: 'text-purple-600 bg-purple-50' },
              { label: 'Issue Book', icon: <BookOpen className="w-5 h-5" />, href: '/library', color: 'text-orange-600 bg-orange-50' },
              { label: 'View Timetable', icon: <Clock className="w-5 h-5" />, href: '/academics/timetable', color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Post Notice', icon: <AlertTriangle className="w-5 h-5" />, href: '/communication/notices', color: 'text-red-600 bg-red-50' },
            ].map(action => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <span className={`p-2 rounded-lg ${action.color}`}>{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
