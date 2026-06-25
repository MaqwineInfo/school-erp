import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';

type Chapter = { no: number; title: string; topics: string[]; status: string; completedDate?: string; remarks?: string };
type Syllabus = { _id: string; standardId?: { name: string }; subjectId?: { name: string; code?: string }; teacherId?: { name: string }; chapters: Chapter[] };

const STATUS_OPTIONS = [{ value: 'pending', label: '⬜ Pending', cls: 'text-gray-500' }, { value: 'in_progress', label: '🔄 In Progress', cls: 'text-blue-600' }, { value: 'completed', label: '✅ Completed', cls: 'text-green-600' }];

export default function SyllabusPage() {
  const qc = useQueryClient();
  const [standardId, setStandardId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: '', topics: '' });

  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => axios.get('/academics/subjects').then(r => r.data.data) });
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: () => axios.get('/academics/years').then(r => r.data.data) });
  const activeYear = (Array.isArray(years) ? years : []).find((y: { isActive: boolean }) => y.isActive);

  const { data: syllabus, isLoading } = useQuery<Syllabus>({
    queryKey: ['syllabus', standardId, subjectId, academicYearId || activeYear?._id],
    queryFn: () => axios.get(`/syllabus/one?standardId=${standardId}&subjectId=${subjectId}&academicYearId=${academicYearId || activeYear?._id}`).then(r => r.data.data),
    enabled: !!(standardId && subjectId && (academicYearId || activeYear)),
  });

  const saveSyllabus = useMutation({
    mutationFn: (chapters: Chapter[]) => axios.post('/syllabus', { standardId, subjectId, academicYearId: academicYearId || activeYear?._id, chapters }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['syllabus'] }); setAddingChapter(false); setNewChapter({ title: '', topics: '' }); },
  });

  const updateChapter = useMutation({
    mutationFn: ({ syllabusId, chapterIndex, status }: { syllabusId: string; chapterIndex: number; status: string }) =>
      axios.patch('/syllabus/chapter', { syllabusId, chapterIndex, status, completedDate: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['syllabus'] }),
  });

  const chapters = syllabus?.chapters || [];
  const completed = chapters.filter(c => c.status === 'completed').length;
  const pct = chapters.length > 0 ? Math.round((completed / chapters.length) * 100) : 0;

  const addChapter = () => {
    const current = syllabus?.chapters || [];
    const updated = [...current, { no: current.length + 1, title: newChapter.title, topics: newChapter.topics.split(',').map(t => t.trim()).filter(Boolean), status: 'pending' }];
    saveSyllabus.mutate(updated as Chapter[]);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Syllabus Tracker</h1>
        <p className="text-sm text-gray-500">Track chapter-wise syllabus completion for each subject</p>
      </div>

      {/* Selectors */}
      <div className="flex gap-3 flex-wrap">
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-40">
          <option value="">Select Class</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="input-field w-44">
          <option value="">Select Subject</option>
          {(Array.isArray(subjects) ? subjects : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} className="input-field w-44">
          <option value="">Current Year</option>
          {(Array.isArray(years) ? years : []).map((y: { _id: string; name: string }) => <option key={y._id} value={y._id}>{y.name}</option>)}
        </select>
      </div>

      {standardId && subjectId ? (
        isLoading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
          <div className="space-y-4">
            {/* Progress */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Syllabus Completion</span>
                <span className="text-sm text-gray-500">{completed}/{chapters.length} chapters ({pct}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Chapters */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b flex justify-between items-center">
                <span className="font-semibold text-sm">{chapters.length} Chapters</span>
                <button onClick={() => setAddingChapter(true)} className="btn-primary text-xs py-1 px-3">+ Add Chapter</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left w-8">No.</th><th className="px-4 py-2 text-left">Chapter</th><th className="px-4 py-2 text-left">Topics</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Completed</th></tr></thead>
                <tbody>
                  {chapters.map((ch, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-3 text-gray-400">{ch.no || i + 1}</td>
                      <td className="px-4 py-3 font-medium">{ch.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{(ch.topics || []).join(', ') || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={ch.status}
                          onChange={e => syllabus && updateChapter.mutate({ syllabusId: syllabus._id, chapterIndex: i, status: e.target.value })}
                          className={`input-field py-1 text-xs w-36 ${ch.status === 'completed' ? 'bg-green-50 border-green-300' : ch.status === 'in_progress' ? 'bg-blue-50' : ''}`}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{ch.completedDate ? new Date(ch.completedDate).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                  {chapters.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No chapters added yet. Click "+ Add Chapter" to start.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Add Chapter */}
            {addingChapter && (
              <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-sm">Add New Chapter</h3>
                <input value={newChapter.title} onChange={e => setNewChapter(c => ({ ...c, title: e.target.value }))} placeholder="Chapter title" className="input-field" />
                <input value={newChapter.topics} onChange={e => setNewChapter(c => ({ ...c, topics: e.target.value }))} placeholder="Topics (comma-separated)" className="input-field" />
                <div className="flex gap-2">
                  <button onClick={() => { setAddingChapter(false); setNewChapter({ title: '', topics: '' }); }} className="btn-secondary">Cancel</button>
                  <button onClick={addChapter} disabled={!newChapter.title || saveSyllabus.isPending} className="btn-primary">{saveSyllabus.isPending ? 'Saving...' : 'Add Chapter'}</button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <p>Select a class and subject to view or edit the syllabus</p>
        </div>
      )}
    </div>
  );
}
