import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { ClassDivisionPicker } from '../../components/academics/ClassDivisionPicker';

type Student = { _id: string; name: string; admissionNo: string; rollNo?: string };
type Entry = { studentId: string; marksObtained: number | ''; maxMarks: number; isAbsent: boolean; remarks: string };

export default function MarksEntryPage() {
  const qc = useQueryClient();
  const [examId, setExamId] = useState('');
  const [standardId, setStandardId] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [saved, setSaved] = useState(false);

  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => axios.get('/exams').then(r => r.data.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => axios.get('/academics/subjects').then(r => r.data.data) });

  const selectedExam = (Array.isArray(exams) ? exams : []).find((e: { _id: string }) => e._id === examId);

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-class', standardId, divisionName],
    queryFn: () => axios.get(`/students?standardId=${standardId}&divisionName=${divisionName}&limit=100`).then(r => {
      const d = r.data.data;
      return Array.isArray(d) ? d : d?.students || [];
    }),
    enabled: !!standardId && !!divisionName,
  });

  // Load existing marks
  const { data: existingMarksData } = useQuery({
    queryKey: ['marks', examId, standardId, divisionName, subjectId],
    queryFn: () => axios.get(`/marks?examId=${examId}&standardId=${standardId}&divisionName=${divisionName}&subjectId=${subjectId}`).then(r => r.data.data),
    enabled: !!(examId && standardId && subjectId),
  });

  // Sync existing marks into state when data loads
  React.useEffect(() => {
    if (!existingMarksData) return;
    const data = Array.isArray(existingMarksData) ? existingMarksData : [];
    const map: Record<string, Entry> = {};
    data.forEach((e: { studentId: { _id: string } | string; marksObtained?: number; maxMarks?: number; isAbsent?: boolean; remarks?: string }) => {
      const sid = typeof e.studentId === 'object' ? (e.studentId as { _id: string })._id : e.studentId;
      map[sid] = { studentId: sid, marksObtained: e.marksObtained ?? '', maxMarks: e.maxMarks || selectedExam?.maxMarks || 100, isAbsent: e.isAbsent || false, remarks: e.remarks || '' };
    });
    setEntries(map);
  }, [existingMarksData]);

  const bulkSave = useMutation({
    mutationFn: () => axios.post('/marks/bulk', {
      examId, subjectId, standardId, divisionName,
      entries: (students as Student[]).map(s => entries[s._id] || { studentId: s._id, marksObtained: null, maxMarks: selectedExam?.maxMarks || 100, isAbsent: false, remarks: '' }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marks'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const updateEntry = (studentId: string, field: keyof Entry, value: Entry[keyof Entry]) => {
    setEntries(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { studentId, marksObtained: '', maxMarks: selectedExam?.maxMarks || 100, isAbsent: false, remarks: '' }), [field]: value },
    }));
  };

  const maxMarks = selectedExam?.maxMarks || 100;
  const passMarks = selectedExam?.passingMarks || Math.round(maxMarks * 0.33);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
          <p className="text-sm text-gray-500">Enter marks for a class and subject</p>
        </div>
        {saved && <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">✅ Marks saved successfully!</div>}
      </div>

      {/* Selectors */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Exam *</label>
            <select value={examId} onChange={e => setExamId(e.target.value)} className="input-field">
              <option value="">Select Exam</option>
              {(Array.isArray(exams) ? exams : []).map((e: { _id: string; name: string }) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <ClassDivisionPicker
              standardId={standardId}
              divisionName={divisionName}
              onStandardChange={(id) => { setStandardId(id); setEntries({}); }}
              onDivisionChange={(name) => { setDivisionName(name); setEntries({}); }}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="input-field">
              <option value="">Select Subject</option>
              {(Array.isArray(subjects) ? subjects : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {selectedExam && (
          <div className="mt-3 flex gap-4 text-sm text-gray-500">
            <span>Max Marks: <strong>{maxMarks}</strong></span>
            <span>Passing Marks: <strong>{passMarks}</strong></span>
            <span>Exam: <strong>{selectedExam.name}</strong></span>
          </div>
        )}
      </div>

      {/* Marks Table */}
      {examId && standardId && divisionName && subjectId ? (
        loadingStudents ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-sm">{(students as Student[]).length} Students</span>
              <div className="flex gap-3 text-sm text-gray-500">
                <span>Present: <strong className="text-green-600">{(students as Student[]).filter(s => !entries[s._id]?.isAbsent).length}</strong></span>
                <span>Absent: <strong className="text-red-600">{(students as Student[]).filter(s => entries[s._id]?.isAbsent).length}</strong></span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-4 py-2 text-left">Student</th>
                  <th className="px-4 py-2 text-left w-28">Adm No.</th>
                  <th className="px-4 py-2 text-center w-24">Absent</th>
                  <th className="px-4 py-2 text-center w-32">Marks / {maxMarks}</th>
                  <th className="px-4 py-2 text-center w-20">Grade</th>
                  <th className="px-4 py-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(students as Student[]).map((s, i) => {
                  const e = entries[s._id] || { studentId: s._id, marksObtained: '', maxMarks, isAbsent: false, remarks: '' };
                  const grade = !e.isAbsent && e.marksObtained !== '' ? (() => {
                    const pct = (Number(e.marksObtained) / maxMarks) * 100;
                    if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
                    if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
                    if (pct >= 33) return 'D'; return 'E';
                  })() : e.isAbsent ? 'AB' : '—';
                  const passed = !e.isAbsent && e.marksObtained !== '' && Number(e.marksObtained) >= passMarks;
                  return (
                    <tr key={s._id} className={`border-t ${e.isAbsent ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{s.name}</td>
                      <td className="px-4 py-2 text-gray-500">{s.admissionNo}</td>
                      <td className="px-4 py-2 text-center">
                        <input type="checkbox" checked={e.isAbsent} onChange={ev => updateEntry(s._id, 'isAbsent', ev.target.checked)} className="rounded w-4 h-4" />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" max={maxMarks}
                          value={e.marksObtained}
                          disabled={e.isAbsent}
                          onChange={ev => updateEntry(s._id, 'marksObtained', ev.target.value === '' ? '' : +ev.target.value)}
                          className={`input-field py-1 text-center ${!e.isAbsent && e.marksObtained !== '' && Number(e.marksObtained) < passMarks ? 'border-red-300 bg-red-50' : ''}`}
                          placeholder="—"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`badge ${grade === 'AB' ? 'badge-red' : passed ? 'badge-green' : grade === '—' ? 'badge-gray' : 'badge-red'}`}>{grade}</span>
                      </td>
                      <td className="px-4 py-2">
                        <input value={e.remarks} onChange={ev => updateEntry(s._id, 'remarks', ev.target.value)} placeholder="Optional" className="input-field py-1 text-sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t flex justify-end">
              <button onClick={() => bulkSave.mutate()} disabled={bulkSave.isPending} className="btn-primary">
                {bulkSave.isPending ? 'Saving...' : '💾 Save All Marks'}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p>Select exam, class, and subject to enter marks</p>
        </div>
      )}
    </div>
  );
}
