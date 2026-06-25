import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Certificate = { _id: string; type: string; serialNo: string; issuedAt: string; verificationCode: string; studentId?: { name: string; admissionNo: string; standardId?: { name: string } }; issuedBy?: { name: string } };

const CERT_LABELS: Record<string, string> = { bonafide: 'Bonafide', character: 'Character', conduct: 'Conduct', tc: 'Transfer (TC)', migration: 'Migration', study: 'Study', participation: 'Participation', merit: 'Merit', achievement: 'Achievement' };
const CERT_COLORS: Record<string, string> = { bonafide: 'badge-blue', character: 'badge-green', conduct: 'badge-purple', tc: 'badge-red', migration: 'badge-yellow', study: 'badge-blue', participation: 'badge-green', merit: 'badge-yellow', achievement: 'badge-yellow' };

export default function CertificatesPage() {
  const qc = useQueryClient();
  const [showIssue, setShowIssue] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ _id: string; name: string; admissionNo: string } | null>(null);
  const [filterType, setFilterType] = useState('');
  const { register, handleSubmit, reset, setValue } = useForm();

  const { data: students = [] } = useQuery({
    queryKey: ['students-search-cert', studentSearch],
    queryFn: () => axios.get(`/students?search=${studentSearch}&limit=8`).then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.students || []; }),
    enabled: studentSearch.length > 2,
  });

  const params = new URLSearchParams(Object.fromEntries(Object.entries({ type: filterType }).filter(([, v]) => v)));
  const { data, isLoading } = useQuery({
    queryKey: ['certificates', filterType],
    queryFn: () => axios.get(`/certificates?${params}`).then(r => r.data.data),
  });
  const certs: Certificate[] = Array.isArray(data) ? data : data?.items || [];

  const issue = useMutation({
    mutationFn: (d: object) => axios.post('/certificates', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['certificates'] }); setShowIssue(false); setSelectedStudent(null); setStudentSearch(''); reset(); },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => axios.delete(`/certificates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificate Management</h1>
          <p className="text-sm text-gray-500">Issue bonafide, character, TC and other certificates with QR verification</p>
        </div>
        <button onClick={() => setShowIssue(true)} className="btn-primary">+ Issue Certificate</button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-44">
          <option value="">All Types</option>
          {Object.entries(CERT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="text-sm text-gray-500 flex items-center">Total: {certs.length} certificates issued</div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Serial No.</th>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Issued By</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Verify Code</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
            ) : certs.map(c => (
              <tr key={c._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-bold">{c.serialNo}</td>
                <td className="px-4 py-3 font-medium">{c.studentId?.name}<div className="text-xs text-gray-400">{c.studentId?.admissionNo}</div></td>
                <td className="px-4 py-3 text-gray-500">{c.studentId?.standardId?.name}</td>
                <td className="px-4 py-3"><span className={`badge ${CERT_COLORS[c.type] || 'badge-gray'}`}>{CERT_LABELS[c.type] || c.type}</span></td>
                <td className="px-4 py-3 text-gray-500">{c.issuedBy?.name}</td>
                <td className="px-4 py-3">{new Date(c.issuedAt).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3 font-mono text-xs text-blue-600">{c.verificationCode}</td>
                <td className="px-4 py-3 text-center flex gap-2 justify-center">
                  <button className="text-blue-500 hover:text-blue-700 text-xs">🖨️ Print</button>
                  <button onClick={() => { if (confirm('Revoke this certificate?')) revoke.mutate(c._id); }} className="text-red-400 hover:text-red-600 text-xs">Revoke</button>
                </td>
              </tr>
            ))}
            {!isLoading && certs.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No certificates issued yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Issue Modal */}
      {showIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => issue.mutate({ ...d, studentId: selectedStudent?._id }))} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Issue Certificate</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Search Student *</label>
              <div className="relative">
                <input value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }} className="input-field" placeholder="Type name or admission no." />
                {!selectedStudent && (students as { _id: string; name: string; admissionNo: string }[]).length > 0 && studentSearch.length > 2 && (
                  <div className="absolute z-30 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {(students as { _id: string; name: string; admissionNo: string }[]).map(s => (
                      <button key={s._id} type="button" onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); }} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                        {s.name} — {s.admissionNo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedStudent && <p className="text-xs text-green-600 mt-1">✅ Selected: {selectedStudent.name} ({selectedStudent.admissionNo})</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Certificate Type *</label>
              <select {...register('type', { required: true })} className="input-field">
                <option value="">Select type</option>
                {Object.entries(CERT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <textarea {...register('remarks')} rows={2} className="input-field" placeholder="Optional remarks..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowIssue(false); setSelectedStudent(null); setStudentSearch(''); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={issue.isPending || !selectedStudent} className="btn-primary flex-1">{issue.isPending ? 'Issuing...' : 'Issue Certificate'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
