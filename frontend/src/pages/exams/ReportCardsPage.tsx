import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';
import { ClassDivisionPicker } from '../../components/academics/ClassDivisionPicker';

type Student = { _id: string; name: string; admissionNo: string; rollNo?: string };
type ReportCard = {
  student: { name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string; dob?: string; gender?: string };
  exam: { name: string; startDate?: string };
  entries: Array<{ subjectId?: { name: string; code?: string }; maxMarks: number; marksObtained?: number; isAbsent?: boolean; grade?: string }>;
  totalMarks: number; maxMarks: number; percentage: string; overallGrade: string; passed: boolean; rank: number;
};

function ReportCardView({ card, tenantName }: { card: ReportCard; tenantName: string }) {
  return (
    <div id="report-card" className="bg-white border-2 border-gray-800 rounded-lg p-6 max-w-2xl mx-auto print:max-w-full print:border-gray-900">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{tenantName}</h1>
        <h2 className="text-lg font-semibold text-blue-700 mt-1">Progress Report Card</h2>
        <p className="text-sm text-gray-500">{card.exam?.name}</p>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div><span className="text-gray-500">Name:</span> <strong>{card.student?.name}</strong></div>
        <div><span className="text-gray-500">Adm No:</span> <strong>{card.student?.admissionNo}</strong></div>
        <div><span className="text-gray-500">Class:</span> <strong>{card.student?.standardId?.name} - {card.student?.divisionName}</strong></div>
        <div><span className="text-gray-500">Roll No:</span> <strong>—</strong></div>
        <div><span className="text-gray-500">DOB:</span> <strong>{card.student?.dob ? new Date(card.student.dob).toLocaleDateString('en-IN') : '—'}</strong></div>
        <div><span className="text-gray-500">Gender:</span> <strong className="capitalize">{card.student?.gender || '—'}</strong></div>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse text-sm mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left">Subject</th>
            <th className="border border-gray-300 px-3 py-2 text-center">Max Marks</th>
            <th className="border border-gray-300 px-3 py-2 text-center">Marks Obtained</th>
            <th className="border border-gray-300 px-3 py-2 text-center">Grade</th>
          </tr>
        </thead>
        <tbody>
          {card.entries?.map((e, i) => (
            <tr key={i} className="even:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2">{e.subjectId?.name || '—'}</td>
              <td className="border border-gray-300 px-3 py-2 text-center">{e.maxMarks}</td>
              <td className="border border-gray-300 px-3 py-2 text-center">{e.isAbsent ? 'AB' : (e.marksObtained ?? '—')}</td>
              <td className="border border-gray-300 px-3 py-2 text-center font-semibold">{e.grade || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-50 font-bold">
            <td className="border border-gray-300 px-3 py-2">Total</td>
            <td className="border border-gray-300 px-3 py-2 text-center">{card.maxMarks}</td>
            <td className="border border-gray-300 px-3 py-2 text-center">{card.totalMarks}</td>
            <td className="border border-gray-300 px-3 py-2 text-center">{card.overallGrade}</td>
          </tr>
        </tfoot>
      </table>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 text-center text-sm">
        <div className="border rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-700">{card.percentage}%</div>
          <div className="text-xs text-gray-500">Percentage</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-700">{card.overallGrade}</div>
          <div className="text-xs text-gray-500">Grade</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className={`text-2xl font-bold ${card.passed ? 'text-green-700' : 'text-red-600'}`}>{card.passed ? 'PASS' : 'FAIL'}</div>
          <div className="text-xs text-gray-500">Result</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-600">#{card.rank}</div>
          <div className="text-xs text-gray-500">Class Rank</div>
        </div>
      </div>

      {/* Grade Legend */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-3">
        <strong>Grade Scale: </strong> A1 (91-100) | A2 (81-90) | B1 (71-80) | B2 (61-70) | C1 (51-60) | C2 (41-50) | D (33-40) | E (Below 33 - Fail)
      </div>

      {/* Signatures */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
        <div className="border-t border-gray-300 pt-2">Class Teacher</div>
        <div className="border-t border-gray-300 pt-2">Principal</div>
        <div className="border-t border-gray-300 pt-2">Parent's Signature</div>
      </div>
    </div>
  );
}

export default function ReportCardsPage() {
  const [examId, setExamId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [standardId, setStandardId] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [view, setView] = useState<'single' | 'bulk'>('single');

  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => axios.get('/exams').then(r => r.data.data) });
  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: () => axios.get('/auth/me').then(r => r.data.data?.tenantId) });

  const { data: students = [] } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => axios.get(`/students?search=${studentSearch}&limit=10`).then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.students || []; }),
    enabled: studentSearch.length > 2,
  });

  const { data: reportCard, isLoading: loadingCard } = useQuery<ReportCard>({
    queryKey: ['report-card', selectedStudentId, examId],
    queryFn: () => axios.get(`/marks/report-card/${selectedStudentId}/${examId}`).then(r => r.data.data),
    enabled: !!(selectedStudentId && examId),
  });

  const { data: classSummary, isLoading: loadingBulk } = useQuery({
    queryKey: ['class-summary', examId, standardId, divisionName],
    queryFn: () => axios.get(`/marks/class-summary?examId=${examId}&standardId=${standardId}&divisionName=${divisionName}`).then(r => r.data.data),
    enabled: !!(examId && standardId && divisionName && view === 'bulk'),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Cards</h1>
          <p className="text-sm text-gray-500">Generate individual or bulk class report cards</p>
        </div>
        {reportCard && (
          <button onClick={() => window.print()} className="btn-primary">🖨️ Print Report Card</button>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView('single')} className={view === 'single' ? 'btn-primary' : 'btn-secondary'}>Single Student</button>
        <button onClick={() => setView('bulk')} className={view === 'bulk' ? 'btn-primary' : 'btn-secondary'}>Class Results</button>
      </div>

      {/* Exam Selector */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Exam *</label>
            <select value={examId} onChange={e => setExamId(e.target.value)} className="input-field">
              <option value="">Select Exam</option>
              {(Array.isArray(exams) ? exams : []).map((e: { _id: string; name: string }) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          {view === 'single' ? (
            <>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Student</label>
                <div className="relative">
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Type student name..." className="input-field" />
                  {(students as Student[]).length > 0 && studentSearch.length > 2 && (
                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {(students as Student[]).map(s => (
                        <button key={s._id} onClick={() => { setSelectedStudentId(s._id); setStudentSearch(s.name); }} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                          {s.name} — {s.admissionNo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <ClassDivisionPicker
              standardId={standardId}
              divisionName={divisionName}
              onStandardChange={setStandardId}
              onDivisionChange={setDivisionName}
              required
              className="md:col-span-2"
            />
          )}
        </div>
      </div>

      {/* Single Report Card */}
      {view === 'single' && (
        loadingCard ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> :
        reportCard ? <ReportCardView card={reportCard} tenantName={tenant?.name || 'School Name'} /> :
        <div className="card p-12 text-center text-gray-400"><div className="text-4xl mb-3">📋</div><p>Select an exam and search for a student</p></div>
      )}

      {/* Class Results Table */}
      {view === 'bulk' && examId && standardId && divisionName && (
        loadingBulk ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : classSummary ? (
          <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4">
              <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{classSummary.stats?.totalStudents}</div><div className="text-xs text-gray-500">Total</div></div>
              <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{classSummary.stats?.passed}</div><div className="text-xs text-gray-500">Passed</div></div>
              <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-600">{classSummary.stats?.failed}</div><div className="text-xs text-gray-500">Failed</div></div>
              <div className="card p-4 text-center"><div className="text-2xl font-bold text-purple-700">{classSummary.stats?.classAvg}%</div><div className="text-xs text-gray-500">Class Avg</div></div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b flex justify-between items-center">
                <span className="font-semibold">Class Result — Pass: {classSummary.stats?.passPercentage}%</span>
                <button className="btn-secondary text-xs">📥 Download Excel</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><th className="px-3 py-2">Rank</th><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2">Adm No.</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">%</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Result</th></tr>
                </thead>
                <tbody>
                  {classSummary.summary?.map((r: { rank?: number; student?: { name: string; admissionNo: string }; totalMarks: number; maxMarks: number; percentage: string; grade: string; passed: boolean }) => (
                    <tr key={r.student?.admissionNo} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 text-center font-semibold text-blue-700">#{r.rank}</td>
                      <td className="px-3 py-2 font-medium">{r.student?.name}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{r.student?.admissionNo}</td>
                      <td className="px-3 py-2 text-center">{r.totalMarks}/{r.maxMarks}</td>
                      <td className="px-3 py-2 text-center">{r.percentage}%</td>
                      <td className="px-3 py-2 text-center"><span className="badge badge-blue">{r.grade}</span></td>
                      <td className="px-3 py-2 text-center"><span className={`badge ${r.passed ? 'badge-green' : 'badge-red'}`}>{r.passed ? 'Pass' : 'Fail'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
