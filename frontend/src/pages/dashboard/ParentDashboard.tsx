import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

export default function ParentDashboard() {
  const { user } = useAuthStore();

  // Parent sees their child's data
  const { data: students } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => axios.get('/students?limit=10').then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.students || []; }),
  });

  const myStudents = Array.isArray(students) ? students.slice(0, 2) : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Portal 👨‍👩‍👧</h1>
        <p className="text-gray-500 text-sm">Monitor your child's progress, fees, and activities</p>
      </div>

      {myStudents.map((child: { _id: string; name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string }) => (
        <ChildCard key={child._id} child={child} />
      ))}

      {myStudents.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">👶</div>
          <p>No student profiles linked to your account</p>
          <p className="text-xs mt-2">Contact school administration to link your child's profile</p>
        </div>
      )}
    </div>
  );
}

function ChildCard({ child }: { child: { _id: string; name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string } }) {
  const { data: demands } = useQuery({
    queryKey: ['parent-demands', child._id],
    queryFn: () => axios.get(`/fees/demands?studentId=${child._id}&status=pending`).then(r => r.data.data),
  });

  const { data: homework } = useQuery({
    queryKey: ['parent-homework', child._id],
    queryFn: () => axios.get(`/homework?standardId=${child.standardId}&limit=5`).then(r => r.data.data),
  });

  const demandList = Array.isArray(demands) ? demands : demands?.demands || [];
  const hwList = Array.isArray(homework) ? homework : homework?.items || [];
  const totalDue = demandList.reduce((s: number, d: { totalDue: number }) => s + d.totalDue, 0);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
          {child.name[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{child.name}</h2>
          <p className="text-sm text-gray-500">{child.standardId?.name} {child.divisionName} • Adm: {child.admissionNo}</p>
          <Link to={`/students/${child._id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">View full profile →</Link>
        </div>
        <div className="ml-auto text-right">
          {totalDue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1">
              <div className="text-lg font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</div>
              <div className="text-xs text-red-400">Pending Fees</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-xl font-bold text-green-600">{demandList.filter((d: { status: string }) => d.status === 'paid').length}</div>
          <div className="text-xs text-gray-500">Fees Paid</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-xl font-bold text-red-600">{demandList.filter((d: { status: string }) => ['pending', 'overdue'].includes(d.status)).length}</div>
          <div className="text-xs text-gray-500">Due Installments</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xl font-bold text-blue-600">{hwList.length}</div>
          <div className="text-xs text-gray-500">Pending HW</div>
        </div>
      </div>

      {hwList.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-gray-700 mb-2">📝 Upcoming Homework</h3>
          <div className="space-y-1">
            {hwList.slice(0, 3).map((hw: { _id: string; title: string; subjectId?: { name: string }; dueDate?: string }) => (
              <div key={hw._id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                <span>{hw.subjectId?.name}: {hw.title}</span>
                {hw.dueDate && <span className="text-xs text-red-400">Due {new Date(hw.dueDate).toLocaleDateString('en-IN')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
