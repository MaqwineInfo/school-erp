import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type HealthRecord = { _id: string; type: string; date: string; height?: number; weight?: number; bmi?: number; diagnosis?: string; treatment?: string; notes?: string; doctorName?: string; studentId?: { name: string; admissionNo: string; standardId?: { name: string } }; recordedBy?: { name: string } };

const TYPE_LABELS: Record<string, string> = { checkup: '🏥 Health Checkup', vaccination: '💉 Vaccination', incident: '🚑 Incident', chronic: '💊 Chronic Condition', dental: '🦷 Dental', eye: '👁️ Eye Checkup' };

export default function HealthPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ _id: string; name: string; admissionNo: string } | null>(null);
  const [filterType, setFilterType] = useState('');
  const [standardId, setStandardId] = useState('');
  const { register, handleSubmit, reset } = useForm();

  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });
  const { data: studentsSearch = [] } = useQuery({
    queryKey: ['students-search-health', studentSearch],
    queryFn: () => axios.get(`/students?search=${studentSearch}&limit=8`).then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.students || []; }),
    enabled: studentSearch.length > 2,
  });

  const params = new URLSearchParams(Object.fromEntries(Object.entries({ type: filterType, standardId }).filter(([, v]) => v)));
  const { data, isLoading } = useQuery({
    queryKey: ['health', filterType, standardId],
    queryFn: () => axios.get(`/health?${params}`).then(r => r.data.data),
  });
  const records: HealthRecord[] = Array.isArray(data) ? data : data?.items || [];

  const save = useMutation({
    mutationFn: (d: object) => axios.post('/health', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health'] }); setShowModal(false); setSelectedStudent(null); setStudentSearch(''); reset(); },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health & Wellness</h1>
          <p className="text-sm text-gray-500">Student health records, checkups, and medical history</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Record</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{records.length}</div><div className="text-xs text-gray-500">Total Records</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-600">{records.filter(r => r.type === 'incident').length}</div><div className="text-xs text-gray-500">Incidents</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{records.filter(r => r.type === 'checkup').length}</div><div className="text-xs text-gray-500">Checkups</div></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-44">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-36">
          <option value="">All Classes</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Height/Weight</th>
              <th className="px-4 py-3 text-center">BMI</th>
              <th className="px-4 py-3 text-left">Diagnosis</th>
              <th className="px-4 py-3 text-left">Doctor</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
              records.map(r => (
                <tr key={r._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.studentId?.name}<div className="text-xs text-gray-400">{r.studentId?.admissionNo}</div></td>
                  <td className="px-4 py-3 text-gray-500">{r.studentId?.standardId?.name}</td>
                  <td className="px-4 py-3"><span className="badge badge-blue text-xs">{TYPE_LABELS[r.type] || r.type}</span></td>
                  <td className="px-4 py-3">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-center">{r.height ? `${r.height}cm` : '—'} / {r.weight ? `${r.weight}kg` : '—'}</td>
                  <td className="px-4 py-3 text-center font-semibold">{r.bmi ? r.bmi.toFixed(1) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.diagnosis || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.doctorName || '—'}</td>
                </tr>
              ))
            }
            {!isLoading && records.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No health records found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit(d => save.mutate({ ...d, studentId: selectedStudent?._id }))} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">Add Health Record</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Search Student *</label>
              <div className="relative">
                <input value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }} className="input-field" placeholder="Type name..." />
                {!selectedStudent && (studentsSearch as { _id: string; name: string; admissionNo: string }[]).length > 0 && studentSearch.length > 2 && (
                  <div className="absolute z-30 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {(studentsSearch as { _id: string; name: string; admissionNo: string }[]).map(s => (
                      <button key={s._id} type="button" onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); }} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">{s.name} — {s.admissionNo}</button>
                    ))}
                  </div>
                )}
              </div>
              {selectedStudent && <p className="text-xs text-green-600 mt-1">✅ {selectedStudent.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select {...register('type')} className="input-field">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input {...register('date')} type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height (cm)</label>
                <input {...register('height', { valueAsNumber: true })} type="number" className="input-field" placeholder="e.g. 145" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                <input {...register('weight', { valueAsNumber: true })} type="number" className="input-field" placeholder="e.g. 40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
                <input {...register('temperature', { valueAsNumber: true })} type="number" step="0.1" className="input-field" placeholder="e.g. 98.6" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                <input {...register('bloodPressure')} className="input-field" placeholder="120/80" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Diagnosis / Observations</label>
                <textarea {...register('diagnosis')} rows={2} className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Treatment</label>
                <textarea {...register('treatment')} rows={2} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Doctor Name</label>
                <input {...register('doctorName')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Next Checkup</label>
                <input {...register('nextCheckupDate')} type="date" className="input-field" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); setSelectedStudent(null); setStudentSearch(''); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={save.isPending || !selectedStudent} className="btn-primary flex-1">{save.isPending ? 'Saving...' : 'Save Record'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
