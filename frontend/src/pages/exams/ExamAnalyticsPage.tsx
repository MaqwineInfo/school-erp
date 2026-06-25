import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';

export default function ExamAnalyticsPage() {
  const [examId, setExamId] = useState('');
  const [standardId, setStandardId] = useState('');

  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => axios.get('/exams').then(r => r.data.data) });
  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => axios.get('/academics/subjects').then(r => r.data.data) });

  const { data: summary, isLoading } = useQuery({
    queryKey: ['exam-summary', examId, standardId],
    queryFn: () => axios.get(`/marks/class-summary?examId=${examId}&standardId=${standardId}`).then(r => r.data.data),
    enabled: !!(examId && standardId),
  });

  const subjectResults = Array.isArray(summary?.subjectWise) ? summary.subjectWise : [];
  const studentResults = Array.isArray(summary?.students) ? summary.students : [];

  const topPerformers = [...studentResults].sort((a: { percentage: number }, b: { percentage: number }) => b.percentage - a.percentage).slice(0, 5);
  const weakStudents = [...studentResults].sort((a: { percentage: number }, b: { percentage: number }) => a.percentage - b.percentage).slice(0, 5);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Analytics</h1>
        <p className="text-sm text-gray-500">Detailed analysis, pass/fail rates, and performance trends</p>
      </div>

      <div className="flex gap-3">
        <select value={examId} onChange={e => setExamId(e.target.value)} className="input-field w-64">
          <option value="">Select Exam</option>
          {(Array.isArray(exams) ? exams : []).map((e: { _id: string; name: string }) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-40">
          <option value="">Select Class</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {examId && standardId ? (
        isLoading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
          summary ? (
            <div className="space-y-5">
              {/* Class Overview */}
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-5 text-center border-l-4 border-blue-500">
                  <div className="text-2xl font-bold text-blue-700">{summary.totalStudents || 0}</div>
                  <div className="text-sm text-gray-500">Total Students</div>
                </div>
                <div className="card p-5 text-center border-l-4 border-green-500">
                  <div className="text-2xl font-bold text-green-600">{summary.passCount || 0} ({summary.passPercent || 0}%)</div>
                  <div className="text-sm text-gray-500">Passed</div>
                </div>
                <div className="card p-5 text-center border-l-4 border-red-500">
                  <div className="text-2xl font-bold text-red-600">{summary.failCount || 0}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
                <div className="card p-5 text-center border-l-4 border-purple-500">
                  <div className="text-2xl font-bold text-purple-600">{summary.classAverage || 0}%</div>
                  <div className="text-sm text-gray-500">Class Average</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Subject-wise Performance */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Subject-wise Average</h3>
                  {subjectResults.map((sub: { subjectName: string; avg: number; passPercent: number }) => (
                    <div key={sub.subjectName} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{sub.subjectName}</span>
                        <span className="text-gray-500">{sub.avg?.toFixed(1)}% avg</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${sub.avg >= 60 ? 'bg-green-500' : sub.avg >= 35 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${sub.avg}%` }} />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Pass rate: {sub.passPercent?.toFixed(0)}%</div>
                    </div>
                  ))}
                  {subjectResults.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
                </div>

                {/* Grade Distribution */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Grade Distribution</h3>
                  {[
                    { grade: 'A+', range: '90-100', cls: 'bg-green-600' },
                    { grade: 'A', range: '75-89', cls: 'bg-green-400' },
                    { grade: 'B+', range: '60-74', cls: 'bg-blue-400' },
                    { grade: 'B', range: '50-59', cls: 'bg-blue-300' },
                    { grade: 'C', range: '35-49', cls: 'bg-yellow-400' },
                    { grade: 'F', range: '<35', cls: 'bg-red-500' },
                  ].map(g => {
                    const count = studentResults.filter((s: { percentage: number }) => {
                      if (g.grade === 'A+') return s.percentage >= 90;
                      if (g.grade === 'A') return s.percentage >= 75 && s.percentage < 90;
                      if (g.grade === 'B+') return s.percentage >= 60 && s.percentage < 75;
                      if (g.grade === 'B') return s.percentage >= 50 && s.percentage < 60;
                      if (g.grade === 'C') return s.percentage >= 35 && s.percentage < 50;
                      return s.percentage < 35;
                    }).length;
                    const pct = studentResults.length > 0 ? (count / studentResults.length) * 100 : 0;
                    return (
                      <div key={g.grade} className="flex items-center gap-3 mb-2">
                        <div className="w-8 font-bold text-sm">{g.grade}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className={`${g.cls} h-4 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-12 text-xs text-right">{count} ({pct.toFixed(0)}%)</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Top Performers */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">🏆 Top Performers</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Rank</th><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-right">%</th></tr></thead>
                    <tbody>
                      {topPerformers.map((s: { studentId?: { name: string }; percentage: number }, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-bold text-yellow-600">#{i + 1}</td>
                          <td className="px-3 py-2">{s.studentId?.name || 'Student'}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-bold">{s.percentage?.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Needs Attention */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">⚠️ Needs Attention</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-right">%</th></tr></thead>
                    <tbody>
                      {weakStudents.map((s: { studentId?: { name: string }; percentage: number }, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{s.studentId?.name || 'Student'}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-bold">{s.percentage?.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : <div className="card p-10 text-center text-gray-400">No marks data found for this combination</div>
        )
      ) : (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p>Select an exam and class to view detailed analytics</p>
        </div>
      )}
    </div>
  );
}
