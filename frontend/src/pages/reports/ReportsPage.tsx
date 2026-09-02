import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';

type ReportModule = { id: string; title: string; icon: string; description: string };

const REPORT_MODULES: ReportModule[] = [
  { id: 'strength', title: 'Student Strength', icon: '👥', description: 'Class-wise, gender-wise student count' },
  { id: 'attendance', title: 'Attendance Summary', icon: '📅', description: 'Monthly attendance by class' },
  { id: 'defaulters-attendance', title: 'Attendance Defaulters', icon: '⚠️', description: 'Students below 75% attendance' },
  { id: 'fee-collection', title: 'Fee Collection', icon: '💰', description: 'Date-wise fee collection report' },
  { id: 'fee-defaulters', title: 'Fee Defaulters', icon: '📋', description: 'Outstanding fee list' },
  { id: 'exam-results', title: 'Exam Results', icon: '📊', description: 'Class-wise result analysis' },
  { id: 'staff-list', title: 'Staff List', icon: '👨‍🏫', description: 'Department-wise staff report' },
  { id: 'payroll', title: 'Payroll Summary', icon: '💼', description: 'Monthly salary register' },
];

function StudentStrengthReport() {
  const [academicYearId, setAcademicYearId] = useState('');
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: () => axios.get('/academics/years').then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['report-strength', academicYearId],
    queryFn: () => axios.get(`/reports/student-strength${academicYearId ? `?academicYearId=${academicYearId}` : ''}`).then(r => r.data.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} className="input-field w-44">
          <option value="">Current Year</option>
          {(Array.isArray(years) ? years : []).map((y: { _id: string; name: string }) => <option key={y._id} value={y._id}>{y.name}</option>)}
        </select>
        <button onClick={() => window.open('/api/reports/students/export', '_blank')} className="btn-secondary text-sm">📥 Export Excel</button>
      </div>
      {isLoading ? <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div> : data && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="card p-4 text-center"><div className="text-3xl font-bold text-blue-700">{data.total}</div><div className="text-xs text-gray-500">Total Students</div></div>
            {(data.byGender || []).map((g: { _id: string; count: number }) => (
              <div key={g._id} className="card p-4 text-center"><div className="text-3xl font-bold text-purple-600">{g.count}</div><div className="text-xs text-gray-500 capitalize">{g._id || 'Unknown'}</div></div>
            ))}
            <div className="card p-4 text-center"><div className="text-3xl font-bold text-green-600">{data.newAdmissions}</div><div className="text-xs text-gray-500">New Admissions</div></div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Class-wise Strength</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Class</th><th className="px-4 py-2 text-left">Section</th><th className="px-4 py-2 text-center">Boys</th><th className="px-4 py-2 text-center">Girls</th><th className="px-4 py-2 text-center">Total</th></tr></thead>
              <tbody>
                {(data.byClass || []).map((r: { _id: { standardId?: string; divisionName?: string }; count: number; male: number; female: number }, i: number) => (
                  <tr key={i} className="border-t"><td className="px-4 py-2">{r._id.standardId}</td><td className="px-4 py-2">{r._id.divisionName}</td><td className="px-4 py-2 text-center">{r.male}</td><td className="px-4 py-2 text-center">{r.female}</td><td className="px-4 py-2 text-center font-semibold">{r.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Category-wise</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-center">Count</th><th className="px-4 py-2 text-center">%</th></tr></thead>
              <tbody>
                {(data.byCategory || []).map((r: { _id: string; count: number }) => (
                  <tr key={r._id} className="border-t"><td className="px-4 py-2 uppercase">{r._id}</td><td className="px-4 py-2 text-center">{r.count}</td><td className="px-4 py-2 text-center">{data.total > 0 ? ((r.count / data.total) * 100).toFixed(1) : 0}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceSummaryReport() {
  const [standardId, setStandardId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['report-attendance', standardId, month, year],
    queryFn: () => axios.get(`/reports/attendance-summary?standardId=${standardId}&month=${month}&year=${year}`).then(r => r.data.data),
    enabled: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-36">
          <option value="">All Classes</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(+e.target.value)} className="input-field w-32">
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="input-field w-24">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {isLoading ? <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div> : data && (
        <div className="grid grid-cols-4 gap-3">
          <div className="card p-4 text-center"><div className="text-3xl font-bold text-blue-700">{data.total}</div><div className="text-xs text-gray-500">Total Records</div></div>
          <div className="card p-4 text-center"><div className="text-3xl font-bold text-green-600">{data.present}</div><div className="text-xs text-gray-500">Present</div></div>
          <div className="card p-4 text-center"><div className="text-3xl font-bold text-red-600">{data.absent}</div><div className="text-xs text-gray-500">Absent</div></div>
          <div className="card p-4 text-center"><div className="text-3xl font-bold text-purple-600">{data.avgPct}%</div><div className="text-xs text-gray-500">Avg Attendance</div></div>
        </div>
      )}
    </div>
  );
}

function AttendanceDefaultersReport() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [threshold, setThreshold] = useState(75);
  const { data, isLoading } = useQuery({
    queryKey: ['report-att-defaulters', month, year, threshold],
    queryFn: () => axios.get(`/reports/attendance-defaulters?month=${month}&year=${year}&threshold=${threshold}`).then(r => r.data.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="input-field w-32">
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="input-field w-24">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Below</label>
          <input type="number" value={threshold} onChange={e => setThreshold(+e.target.value)} className="input-field w-20" min="50" max="100" />
          <label className="text-sm text-gray-600">%</label>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm text-red-600">{Array.isArray(data) ? data.length : 0} Students Below {threshold}%</div>
        <table className="w-full text-sm">
          <thead className="bg-red-50"><tr><th className="px-4 py-2 text-left">#</th><th className="px-4 py-2 text-left">Student</th><th className="px-4 py-2 text-left">Class</th><th className="px-4 py-2 text-center">Present</th><th className="px-4 py-2 text-center">Total</th><th className="px-4 py-2 text-center">%</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto"></div></td></tr> :
              (Array.isArray(data) ? data : []).map((r: { studentId: string; student?: { name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string }; present: number; total: number; pct: string }, i: number) => (
                <tr key={r.studentId} className="border-t">
                  <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{r.student?.name}<div className="text-xs text-gray-400">{r.student?.admissionNo}</div></td>
                  <td className="px-4 py-2 text-gray-500">{r.student?.standardId?.name} {r.student?.divisionName}</td>
                  <td className="px-4 py-2 text-center">{r.present}</td>
                  <td className="px-4 py-2 text-center">{r.total}</td>
                  <td className="px-4 py-2 text-center font-bold text-red-600">{r.pct}%</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeeCollectionReport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['report-fee-collection', from, to],
    queryFn: () => axios.get(`/reports/fee-collection?from=${from}&to=${to}`).then(r => r.data.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field w-40" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field w-40" />
      </div>
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">₹{data.total?.toLocaleString('en-IN') || 0}</div><div className="text-xs text-gray-500">Total Collected</div></div>
            <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-600">{data.count || 0}</div><div className="text-xs text-gray-500">Transactions</div></div>
            <div className="card p-4 text-center">
              <div className="text-sm">
                {(data.byMode || []).map((m: { _id: string; total: number }) => <div key={m._id} className="flex justify-between text-xs"><span className="uppercase">{m._id}</span><span className="font-bold">₹{m.total?.toLocaleString('en-IN')}</span></div>)}
              </div>
            </div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Receipt</th><th className="px-4 py-2 text-left">Student</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Mode</th></tr></thead>
              <tbody>
                {(data.payments || []).map((p: { _id: string; receiptNo?: string; studentId?: { name: string; admissionNo: string }; paidAt?: string; amount: number; method?: string }) => (
                  <tr key={p._id} className="border-t"><td className="px-4 py-2 font-mono text-xs">{p.receiptNo || '—'}</td><td className="px-4 py-2">{p.studentId?.name}</td><td className="px-4 py-2">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}</td><td className="px-4 py-2 text-right font-semibold text-green-600">₹{p.amount?.toLocaleString('en-IN')}</td><td className="px-4 py-2 uppercase text-xs">{p.method}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {isLoading && <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>}
    </div>
  );
}

function PayrollReport() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading } = useQuery({
    queryKey: ['report-payroll', month, year],
    queryFn: () => axios.get(`/reports/payroll-summary?month=${month}&year=${year}`).then(r => r.data.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="input-field w-32">
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="input-field w-24">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => window.open(`/api/reports/payroll/export?month=${month}&year=${year}`, '_blank')} className="btn-secondary text-sm">📥 Export Excel</button>
      </div>
      {isLoading ? <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div> : data && (
        <div className="grid grid-cols-4 gap-3">
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{data.count || 0}</div><div className="text-xs text-gray-500">Staff</div></div>
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">₹{data.totalGross?.toLocaleString('en-IN') || 0}</div><div className="text-xs text-gray-500">Gross Salary</div></div>
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-600">₹{data.totalNet?.toLocaleString('en-IN') || 0}</div><div className="text-xs text-gray-500">Net Payable</div></div>
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-orange-600">₹{data.totalPf?.toLocaleString('en-IN') || 0}</div><div className="text-xs text-gray-500">Total PF</div></div>
        </div>
      )}
    </div>
  );
}

const REPORT_COMPONENTS: Record<string, () => JSX.Element> = {
  strength: StudentStrengthReport,
  attendance: AttendanceSummaryReport,
  'defaulters-attendance': AttendanceDefaultersReport,
  'fee-collection': FeeCollectionReport,
  payroll: PayrollReport,
};

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const ActiveComponent = activeReport ? REPORT_COMPONENTS[activeReport] : null;
  const activeModule = REPORT_MODULES.find(r => r.id === activeReport);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Comprehensive reports with Excel and PDF export</p>
        </div>
        {activeReport && <button onClick={() => setActiveReport(null)} className="btn-secondary">← All Reports</button>}
      </div>

      {!activeReport ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {REPORT_MODULES.map(r => (
            <button key={r.id} onClick={() => setActiveReport(r.id)} className="card p-5 text-left hover:shadow-md hover:border-blue-200 border-2 border-transparent transition-all">
              <div className="text-3xl mb-2">{r.icon}</div>
              <h3 className="font-semibold text-gray-900">{r.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{r.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">{activeModule?.icon} {activeModule?.title}</h2>
            <p className="text-sm text-gray-500">{activeModule?.description}</p>
          </div>
          {ActiveComponent ? <ActiveComponent /> : (
            <div className="card p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">🔧</div>
              <p>Report being built...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
