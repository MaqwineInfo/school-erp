import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';

const DOC_TYPES = [
  { slug: 'birth_certificate', label: 'Birth Certificate' }, { slug: 'aadhar', label: 'Aadhar Card' },
  { slug: 'caste_certificate', label: 'Caste Certificate' }, { slug: 'income_certificate', label: 'Income Certificate' },
  { slug: 'previous_tc', label: 'Previous TC' }, { slug: 'previous_marksheet', label: 'Previous Marksheet' },
  { slug: 'passport_photo', label: 'Passport Photo' }, { slug: 'medical_certificate', label: 'Medical Certificate' },
  { slug: 'bank_passbook', label: 'Bank Passbook' }, { slug: 'migration_certificate', label: 'Migration Certificate' },
];

export default function StudentDocumentsPage() {
  const [search, setSearch] = useState('');
  const [filterMissing, setFilterMissing] = useState('');
  const [standardId, setStandardId] = useState('');

  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['students-docs', search, standardId],
    queryFn: () => axios.get(`/students?limit=50${search ? `&search=${search}` : ''}${standardId ? `&standardId=${standardId}` : ''}`).then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.students || []; }),
  });
  const students = Array.isArray(data) ? data : [];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Documents</h1>
        <p className="text-sm text-gray-500">Track document submission status for each student</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold">{students.length}</div><div className="text-xs text-gray-500">Total Students</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{students.filter(s => (s.documents || []).length >= 5).length}</div><div className="text-xs text-gray-500">Documents Complete</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-orange-500">{students.filter(s => (s.documents || []).length > 0 && (s.documents || []).length < 5).length}</div><div className="text-xs text-gray-500">Partially Submitted</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-500">{students.filter(s => !(s.documents || []).length).length}</div><div className="text-xs text-gray-500">No Documents</div></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="input-field w-64" />
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-36">
          <option value="">All Classes</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filterMissing} onChange={e => setFilterMissing(e.target.value)} className="input-field w-44">
          <option value="">All Students</option>
          <option value="missing">Documents Missing</option>
          <option value="complete">Documents Complete</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50">Student</th>
                <th className="px-4 py-3 text-left">Class</th>
                {DOC_TYPES.map(d => <th key={d.slug} className="px-2 py-3 text-center text-xs">{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={12} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
                students.slice(0, 30).map((s: { _id: string; name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string; documents?: string[] }) => {
                  const docs: string[] = s.documents || [];
                  return (
                    <tr key={s._id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.admissionNo}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.standardId?.name} {s.divisionName}</td>
                      {DOC_TYPES.map(d => (
                        <td key={d.slug} className="px-2 py-3 text-center">
                          {docs.includes(d.slug) ? <span className="text-green-500 text-lg">✅</span> : <span className="text-gray-300 text-lg">⬜</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
