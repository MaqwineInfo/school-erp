import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  const { data: timetable = [] } = useQuery({
    queryKey: ['my-timetable'],
    queryFn: () => axios.get(`/timetable/teacher/${user?._id}`).then(r => r.data.data),
    enabled: !!user?._id,
  });

  const { data: homework } = useQuery({
    queryKey: ['my-homework'],
    queryFn: () => axios.get(`/homework?teacherId=${user?._id}&limit=5`).then(r => r.data),
  });

  const { data: pendingLeave } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => axios.get('/leaves?status=pending&limit=5').then(r => r.data),
  });

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDay = (new Date().getDay() + 6) % 7; // 0=Mon
  const todaySlots = (Array.isArray(timetable) ? timetable : []).filter((s: { dayOfWeek: number }) => s.dayOfWeek === todayDay).sort((a: { periodNo: number }, b: { periodNo: number }) => a.periodNo - b.periodNo);

  const hwList = Array.isArray(homework?.data) ? homework.data : homework?.data?.items || [];
  const leaveList = Array.isArray(pendingLeave?.data) ? pendingLeave.data : pendingLeave?.data?.leaves || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Mark Attendance', link: '/attendance', icon: '✅', color: 'bg-green-500' },
          { label: 'Enter Marks', link: '/exams/marks', icon: '📊', color: 'bg-blue-500' },
          { label: 'Assign Homework', link: '/homework', icon: '📝', color: 'bg-purple-500' },
          { label: 'Apply Leave', link: '/hr/leaves', icon: '🏖️', color: 'bg-orange-500' },
        ].map(a => (
          <Link key={a.label} to={a.link} className="card p-4 text-center hover:shadow-md transition-shadow">
            <div className={`${a.color} text-white text-2xl rounded-xl p-3 w-12 h-12 flex items-center justify-center mx-auto mb-2`}>{a.icon}</div>
            <div className="text-sm font-medium text-gray-700">{a.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">📅 Today's Schedule — {DAYS[todayDay]}</h2>
          {todaySlots.length > 0 ? (
            <div className="space-y-2">
              {todaySlots.map((s: { periodNo: number; startTime?: string; endTime?: string; subjectId?: { name: string }; standardName?: string; divisionName?: string; room?: string }, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                  <div className="text-xs font-bold text-blue-600 w-6">P{s.periodNo}</div>
                  <div>
                    <div className="text-sm font-medium">{s.subjectId?.name} — {s.standardName} {s.divisionName}</div>
                    <div className="text-xs text-gray-400">{s.startTime} – {s.endTime} {s.room ? `• ${s.room}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No classes scheduled today</p>}
        </div>

        {/* Recent Homework */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">📝 Recent Assignments</h2>
            <Link to="/homework" className="text-blue-600 text-xs">View all →</Link>
          </div>
          {hwList.length > 0 ? (
            <div className="space-y-2">
              {hwList.slice(0, 5).map((hw: { _id: string; title: string; type: string; standardId?: { name: string }; divisionName?: string; dueDate?: string }) => (
                <div key={hw._id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-gray-400 w-20 truncate">{hw.standardId?.name} {hw.divisionName}</span>
                  <span className="flex-1 font-medium truncate">{hw.title}</span>
                  {hw.dueDate && <span className="text-xs text-red-400">{new Date(hw.dueDate).toLocaleDateString('en-IN')}</span>}
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No recent assignments</p>}
        </div>
      </div>
    </div>
  );
}
