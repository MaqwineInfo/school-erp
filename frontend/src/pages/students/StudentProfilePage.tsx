import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Student = {
  _id: string; name: string; admissionNo: string; grNo?: string; rollNo?: string;
  dob?: string; gender?: string; bloodGroup?: string; category?: string; religion?: string;
  currentAddress?: string; city?: string; state?: string; pinCode?: string;
  standardId?: { _id: string; name: string }; divisionName?: string; status?: string;
  isRteStudent?: boolean; admissionDate?: string; stream?: string; house?: string;
  guardians?: Array<{ relation: string; name: string; phone?: string; email?: string; occupation?: string }>;
  health?: { allergies: string[]; conditions: string[]; medications: string[] };
  photo?: string; aadhaarMasked?: string; udisePenNo?: string; apaarId?: string;
};

const TABS = ['Overview', 'Academic', 'Fees', 'Attendance', 'Exams', 'Homework', 'Transport & Hostel', 'Documents'];

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">{value || '—'}</dd>
    </div>
  );
}

function OverviewTab({ student }: { student: Student }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Personal Info */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">👤 Personal Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          <InfoRow label="Admission No." value={student.admissionNo} />
          <InfoRow label="GR No." value={student.grNo} />
          <InfoRow label="Roll No." value={student.rollNo} />
          <InfoRow label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : undefined} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Blood Group" value={student.bloodGroup} />
          <InfoRow label="Category" value={student.category?.toUpperCase()} />
          <InfoRow label="Religion" value={student.religion} />
          <InfoRow label="Aadhaar (Last 4)" value={student.aadhaarMasked} />
          <InfoRow label="UDISE PEN" value={student.udisePenNo} />
          <InfoRow label="APAAR ID" value={student.apaarId} />
          <InfoRow label="RTE Student" value={student.isRteStudent ? 'Yes' : 'No'} />
        </dl>
      </div>

      {/* Academic Info */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">🎓 Academic Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          <InfoRow label="Class" value={student.standardId?.name} />
          <InfoRow label="Division" value={student.divisionName} />
          <InfoRow label="Stream" value={student.stream} />
          <InfoRow label="House" value={student.house} />
          <InfoRow label="Admission Date" value={student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-IN') : undefined} />
          <InfoRow label="Status" value={student.status} />
        </dl>
      </div>

      {/* Address */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📍 Address</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InfoRow label="Current Address" value={student.currentAddress} />
          </div>
          <InfoRow label="City" value={student.city} />
          <InfoRow label="State" value={student.state} />
          <InfoRow label="PIN Code" value={student.pinCode} />
        </dl>
      </div>

      {/* Family */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">👨‍👩‍👦 Family / Guardians</h3>
        {student.guardians && student.guardians.length > 0 ? (
          <div className="space-y-4">
            {student.guardians.map((g, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-blue-600">{g.relation}</span>
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <InfoRow label="Name" value={g.name} />
                  <InfoRow label="Phone" value={g.phone} />
                  <InfoRow label="Email" value={g.email} />
                  <InfoRow label="Occupation" value={g.occupation} />
                </dl>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-400 text-sm">No guardian information added</p>}
      </div>

      {/* Health */}
      {(student.health?.allergies?.length || student.health?.conditions?.length) ? (
        <div className="card p-5 md:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">🏥 Health Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Allergies</p>
              {student.health.allergies.map(a => <span key={a} className="badge badge-red mr-1">{a}</span>)}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Conditions</p>
              {student.health.conditions.map(c => <span key={c} className="badge badge-yellow mr-1">{c}</span>)}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Medications</p>
              {student.health.medications?.map(m => <span key={m} className="badge badge-blue mr-1">{m}</span>)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AcademicTab({ studentId }: { studentId: string }) {
  const { data: attendance } = useQuery({
    queryKey: ['student-attendance', studentId],
    queryFn: () => axios.get(`/attendance?studentId=${studentId}&limit=30`).then(r => r.data.data),
  });

  const records = Array.isArray(attendance) ? attendance : attendance?.records || [];
  const present = records.filter((r: { status: string }) => r.status === 'present').length;
  const total = records.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Attendance Summary (Recent 30 Days)</h3>
        <div className="flex gap-6">
          <div className="text-center">
            <div className={`text-3xl font-bold ${pct >= 75 ? 'text-green-600' : 'text-red-600'}`}>{pct}%</div>
            <div className="text-xs text-gray-500">Attendance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{present}</div>
            <div className="text-xs text-gray-500">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{total - present}</div>
            <div className="text-xs text-gray-500">Absent</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-medium text-sm text-gray-700">Recent Attendance</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Remarks</th></tr></thead>
          <tbody>
            {records.slice(0, 20).map((r: { _id: string; date: string; status: string; remarks?: string }) => (
              <tr key={r._id} className="border-t">
                <td className="px-4 py-2">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-2">
                  <span className={`badge ${r.status === 'present' ? 'badge-green' : r.status === 'absent' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2 text-gray-500">{r.remarks || '—'}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-gray-400">No attendance records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeesTab({ studentId }: { studentId: string }) {
  const { data: demands } = useQuery({
    queryKey: ['student-demands', studentId],
    queryFn: () => axios.get(`/fees/demands?studentId=${studentId}`).then(r => r.data.data),
  });

  const { data: payments } = useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: () => axios.get(`/fees/payments?studentId=${studentId}`).then(r => r.data.data),
  });

  const demandsArr = Array.isArray(demands) ? demands : demands?.demands || [];
  const paymentsArr = Array.isArray(payments) ? payments : payments?.payments || [];

  const totalDue = demandsArr.reduce((s: number, d: { totalDue: number }) => s + (d.totalDue || 0), 0);
  const totalPaid = paymentsArr.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-600">₹{totalPaid.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500 mt-1">Total Paid</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500 mt-1">Total Due</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-700">{demandsArr.length}</div><div className="text-xs text-gray-500 mt-1">Installments</div></div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">Fee Demands</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Installment</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-right">Paid</th><th className="px-4 py-2 text-right">Due</th><th className="px-4 py-2 text-left">Due Date</th><th className="px-4 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {demandsArr.map((d: { _id: string; installmentName?: string; totalAmount: number; totalPaid: number; totalDue: number; dueDate?: string; status: string }) => (
              <tr key={d._id} className="border-t">
                <td className="px-4 py-2">{d.installmentName || 'Installment'}</td>
                <td className="px-4 py-2 text-right">₹{d.totalAmount?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right text-green-600">₹{d.totalPaid?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right text-red-600">₹{d.totalDue?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">{d.dueDate ? new Date(d.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-2"><span className={`badge ${d.status === 'paid' ? 'badge-green' : d.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>{d.status}</span></td>
              </tr>
            ))}
            {demandsArr.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400">No fee demands</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">Payment History</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Receipt No.</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Mode</th></tr></thead>
          <tbody>
            {paymentsArr.map((p: { _id: string; receiptNo?: string; paidAt?: string; amount: number; method?: string }) => (
              <tr key={p._id} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{p.receiptNo || '—'}</td>
                <td className="px-4 py-2">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-2 text-right font-semibold text-green-600">₹{p.amount?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 uppercase text-xs">{p.method || '—'}</td>
              </tr>
            ))}
            {paymentsArr.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">No payments</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExamsTab({ studentId }: { studentId: string }) {
  const { data: exams } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => axios.get('/exams').then(r => r.data.data),
  });

  const examList = Array.isArray(exams) ? exams : exams?.exams || [];

  return (
    <div className="space-y-4">
      {examList.map((exam: { _id: string; name: string }) => (
        <ExamMarksCard key={exam._id} studentId={studentId} exam={exam} />
      ))}
      {examList.length === 0 && <div className="card p-8 text-center text-gray-400">No exams found</div>}
    </div>
  );
}

function ExamMarksCard({ studentId, exam }: { studentId: string; exam: { _id: string; name: string } }) {
  const { data } = useQuery({
    queryKey: ['report-card', studentId, exam._id],
    queryFn: () => axios.get(`/marks/report-card/${studentId}/${exam._id}`).then(r => r.data.data),
    retry: false,
  });

  if (!data) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <span className="font-semibold">{exam.name}</span>
        <div className="flex items-center gap-4 text-sm">
          <span>Total: <strong>{data.totalMarks}/{data.maxMarks}</strong></span>
          <span>%: <strong>{data.percentage}%</strong></span>
          <span className={`badge ${data.passed ? 'badge-green' : 'badge-red'}`}>{data.passed ? 'PASS' : 'FAIL'}</span>
          <span>Rank: <strong>#{data.rank}</strong></span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Subject</th><th className="px-4 py-2 text-center">Max</th><th className="px-4 py-2 text-center">Obtained</th><th className="px-4 py-2 text-center">Grade</th><th className="px-4 py-2 text-left">Remarks</th></tr></thead>
        <tbody>
          {data.entries?.map((e: { _id: string; subjectId?: { name: string }; maxMarks: number; marksObtained?: number; isAbsent?: boolean; grade?: string; remarks?: string }) => (
            <tr key={e._id} className="border-t">
              <td className="px-4 py-2">{e.subjectId?.name}</td>
              <td className="px-4 py-2 text-center">{e.maxMarks}</td>
              <td className="px-4 py-2 text-center">{e.isAbsent ? <span className="badge badge-red">AB</span> : e.marksObtained ?? '—'}</td>
              <td className="px-4 py-2 text-center"><span className="badge badge-blue">{e.grade || '—'}</span></td>
              <td className="px-4 py-2 text-gray-500">{e.remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const qc = useQueryClient();

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => axios.get(`/students/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const updateStudent = useMutation({
    mutationFn: (data: Partial<Student>) => axios.put(`/students/${id}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', id] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  if (!student) return <div className="p-6 text-center text-gray-400">Student not found</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
            {student.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>Adm: <strong>{student.admissionNo}</strong></span>
              <span>•</span>
              <span>{student.standardId?.name} {student.divisionName}</span>
              <span>•</span>
              <span className={`badge ${student.status === 'active' ? 'badge-green' : 'badge-red'}`}>{student.status}</span>
              {student.isRteStudent && <span className="badge badge-purple">RTE</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/students" className="btn-secondary">← Back</Link>
          <button className="btn-primary">Edit Profile</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 0 && <OverviewTab student={student} />}
        {activeTab === 1 && <AcademicTab studentId={student._id} />}
        {activeTab === 2 && <FeesTab studentId={student._id} />}
        {activeTab === 4 && <ExamsTab studentId={student._id} />}
        {activeTab === 3 && (
          <div className="card p-6 text-center text-gray-400">
            <p className="text-2xl mb-2">📅</p>
            <p>Select Attendance tab under Academic section</p>
          </div>
        )}
        {(activeTab === 5 || activeTab === 6 || activeTab === 7) && (
          <div className="card p-8 text-center text-gray-400">
            <p className="text-2xl mb-2">🚧</p>
            <p>This tab is loading data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
