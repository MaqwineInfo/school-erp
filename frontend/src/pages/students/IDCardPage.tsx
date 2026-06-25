import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';

export default function IDCardPage() {
  const [standardId, setStandardId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => axios.get('/settings/profile').then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['students-idcard', standardId],
    queryFn: () => axios.get(`/students?limit=200${standardId ? `&standardId=${standardId}` : ''}`).then(r => { const d = r.data.data; return Array.isArray(d) ? d : d?.students || []; }),
    enabled: !!standardId,
  });
  const students = Array.isArray(data) ? data : [];

  const toggleAll = () => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map((s: { _id: string }) => s._id));
  const toggle = (id: string) => setSelectedStudents(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selected = students.filter((s: { _id: string }) => selectedStudents.includes(s._id));

  const printCards = () => { if (printRef.current) { const w = window.open(); w?.document.write(`<html><head><style>body{margin:0;font-family:Arial}@media print{.no-print{display:none}}</style></head><body>${printRef.current.innerHTML}</body></html>`); w?.document.close(); w?.print(); } };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ID Card Generator</h1>
          <p className="text-sm text-gray-500">Generate printable student identity cards</p>
        </div>
        <button onClick={printCards} disabled={selected.length === 0} className="btn-primary">🖨️ Print {selected.length > 0 ? `(${selected.length})` : ''} ID Cards</button>
      </div>

      <div className="flex gap-3">
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-44">
          <option value="">Select Class</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {students.length > 0 && (
          <button onClick={toggleAll} className="btn-secondary">{selectedStudents.length === students.length ? 'Deselect All' : `Select All (${students.length})`}</button>
        )}
      </div>

      {/* Student List */}
      {standardId && (
        isLoading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
          <div className="grid grid-cols-3 gap-3">
            {students.map((s: { _id: string; name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string; dateOfBirth?: string; bloodGroup?: string; guardians?: { name: string; phone: string }[] }) => (
              <div key={s._id} onClick={() => toggle(s._id)} className={`card p-3 cursor-pointer transition-all ${selectedStudents.includes(s._id) ? 'border-2 border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedStudents.includes(s._id)} onChange={() => toggle(s._id)} className="w-4 h-4" onClick={e => e.stopPropagation()} />
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.admissionNo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Hidden print section */}
      <div ref={printRef} className="hidden">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px' }}>
          {selected.map((s: { _id: string; name: string; admissionNo: string; standardId?: { name: string }; divisionName?: string; dateOfBirth?: string; bloodGroup?: string; guardians?: { name: string; phone: string }[] }) => (
            <div key={s._id} style={{ width: '200px', height: '125px', border: '2px solid #1e40af', borderRadius: '8px', padding: '8px', fontSize: '9px', background: 'white', fontFamily: 'Arial' }}>
              <div style={{ background: '#1e40af', color: 'white', textAlign: 'center', padding: '3px', borderRadius: '4px', fontSize: '8px', fontWeight: 'bold', marginBottom: '4px' }}>
                {school?.name || 'School Name'} — STUDENT ID
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <div style={{ width: '35px', height: '40px', background: '#dbeafe', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👤</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{s.name}</div>
                  <div>Adm: <b>{s.admissionNo}</b></div>
                  <div>Class: {s.standardId?.name} {s.divisionName}</div>
                  {s.dateOfBirth && <div>DOB: {new Date(s.dateOfBirth).toLocaleDateString('en-IN')}</div>}
                  {s.bloodGroup && <div>Blood: {s.bloodGroup}</div>}
                </div>
              </div>
              {s.guardians?.[0] && <div style={{ marginTop: '4px', borderTop: '1px solid #e5e7eb', paddingTop: '2px' }}>Parent: {s.guardians[0].name} | 📞 {s.guardians[0].phone}</div>}
            </div>
          ))}
        </div>
      </div>

      {!standardId && (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🪪</div>
          <p>Select a class to view students and generate ID cards</p>
        </div>
      )}
    </div>
  );
}
