import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';

export default function RTEPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rte-students'],
    queryFn: () => axios.get('/students?isRteStudent=true&limit=200').then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.students || []; }),
  });
  const students = Array.isArray(data) ? data : [];

  const { data: stats } = useQuery({
    queryKey: ['student-strength'],
    queryFn: () => axios.get('/reports/student-strength').then(r => r.data.data),
  });
  const totalStudents = stats?.total || 0;
  const rteCount = students.length;
  const rtePercent = totalStudents > 0 ? ((rteCount / totalStudents) * 100).toFixed(1) : '0';
  const targetPercent = 25;
  const stillNeeded = Math.max(0, Math.ceil(totalStudents * 0.25) - rteCount);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RTE 25% Tracker</h1>
        <p className="text-sm text-gray-500">Right to Education Act — Track 25% reservation for economically weaker sections</p>
      </div>

      {/* RTE Meter */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-800">RTE Compliance Status</h2>
            <p className="text-sm text-gray-500">Minimum 25% seats must be allotted to RTE students</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-700">{rtePercent}%</div>
            <div className="text-xs text-gray-500">Current RTE %</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
          <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${Math.min(100, parseFloat(rtePercent))}%` }} />
          <div className="absolute top-0 h-4 border-l-2 border-red-500 border-dashed" style={{ left: `${targetPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span className="text-red-500 font-semibold">25% Target</span>
          <span>100%</span>
        </div>
        {stillNeeded > 0 && <div className="mt-3 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm">⚠️ {stillNeeded} more RTE students needed to meet 25% target</div>}
        {parseFloat(rtePercent) >= 25 && <div className="mt-3 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">✅ RTE 25% quota fulfilled!</div>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold">{totalStudents}</div><div className="text-xs text-gray-500">Total Students</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-600">{rteCount}</div><div className="text-xs text-gray-500">RTE Students</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-orange-500">{Math.ceil(totalStudents * 0.25)}</div><div className="text-xs text-gray-500">Required (25%)</div></div>
        <div className="card p-4 text-center"><div className={`text-2xl font-bold ${stillNeeded > 0 ? 'text-red-600' : 'text-green-600'}`}>{stillNeeded}</div><div className="text-xs text-gray-500">Still Needed</div></div>
      </div>

      {/* RTE Student List */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">RTE Student List ({students.length})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Student Name</th>
              <th className="px-4 py-3 text-left">Adm No</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Annual Income</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
              students.map((s: { _id: string; name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string; category?: string; guardians?: { name: string; annualIncome?: number }[] }) => (
                <tr key={s._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.admissionNo}</td>
                  <td className="px-4 py-3">{s.standardId?.name} {s.divisionName}</td>
                  <td className="px-4 py-3 text-gray-500">{s.guardians?.[0]?.name}</td>
                  <td className="px-4 py-3"><span className="badge badge-blue">{s.category || 'EWS'}</span></td>
                  <td className="px-4 py-3 text-gray-500">{s.guardians?.[0]?.annualIncome ? `₹${Number(s.guardians[0].annualIncome).toLocaleString('en-IN')}` : '—'}</td>
                </tr>
              ))
            }
            {!isLoading && students.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-400">No RTE students found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
