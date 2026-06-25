import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function ClassTeacherDashboard() {
  const { user } = useAuthStore();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Teacher — {user?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
        <p className="text-emerald-700 text-sm mt-2 font-medium">Manage your division: attendance, homework, defaulters & certificates</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Class', link: '/students', icon: '👥', color: 'bg-emerald-500' },
          { label: 'Mark Attendance', link: '/attendance', icon: '✅', color: 'bg-green-500' },
          { label: 'Assign Homework', link: '/homework', icon: '📝', color: 'bg-purple-500' },
          { label: 'Fee Defaulters', link: '/fees/defaulters', icon: '💰', color: 'bg-amber-500' },
          { label: 'Report Cards', link: '/exams/report-cards', icon: '📋', color: 'bg-blue-500' },
          { label: 'Issue Certificate', link: '/frontoffice/certificates', icon: '📜', color: 'bg-indigo-500' },
          { label: 'Send Notice', link: '/communication/notices', icon: '📢', color: 'bg-cyan-500' },
          { label: 'Timetable', link: '/academics/timetable', icon: '📅', color: 'bg-slate-500' },
        ].map(a => (
          <Link key={a.label} to={a.link} className="card p-4 text-center hover:shadow-md transition-shadow">
            <div className={`${a.color} text-white text-2xl rounded-xl p-3 w-12 h-12 flex items-center justify-center mx-auto mb-2`}>{a.icon}</div>
            <div className="text-sm font-medium text-gray-700">{a.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
