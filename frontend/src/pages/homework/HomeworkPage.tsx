import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';
import { ClassDivisionPicker } from '../../components/academics/ClassDivisionPicker';
import { useAcademicLabels } from '../../hooks/useAcademicLabels';

type Homework = { _id: string; title: string; description?: string; type: string; standardId?: string | { _id: string; name: string }; divisionName?: string; subjectId?: { name: string }; teacherId?: { name: string }; dueDate?: string; isActive: boolean; createdAt: string };

const TYPE_LABELS: Record<string, string> = { classwork: '📖 Classwork', homework: '📝 Homework', assignment: '📋 Assignment', project: '🔬 Project' };
const TYPE_COLORS: Record<string, string> = { classwork: 'badge-blue', homework: 'badge-green', assignment: 'badge-yellow', project: 'badge-purple' };

export default function HomeworkPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [filters, setFilters] = useState({ type: '', standardId: '', divisionName: '', from: '', to: '' });
  const [assignClass, setAssignClass] = useState({ standardId: '', divisionName: '' });
  const labels = useAcademicLabels();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Homework>>();

  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => axios.get('/academics/subjects').then(r => r.data.data) });

  const params = new URLSearchParams({ limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery({
    queryKey: ['homework', filters],
    queryFn: () => axios.get(`/homework?${params}`).then(r => r.data),
  });
  const homeworks: Homework[] = Array.isArray(data?.data) ? data.data : data?.data?.items || [];

  const save = useMutation({
    mutationFn: (d: Partial<Homework>) => {
      const payload = { ...d, standardId: assignClass.standardId, divisionName: assignClass.divisionName };
      return editing ? axios.put(`/homework/${editing._id}`, payload).then(r => r.data) : axios.post('/homework', payload).then(r => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); setShowModal(false); setEditing(null); reset(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => axios.delete(`/homework/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  });

  const openEdit = (hw: Homework) => {
    setEditing(hw);
    reset(hw);
    setAssignClass({
      standardId: typeof hw.standardId === 'object' && hw.standardId && '_id' in hw.standardId
        ? hw.standardId._id
        : String(hw.standardId || ''),
      divisionName: hw.divisionName || '',
    });
    setShowModal(true);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework & Classwork</h1>
          <p className="text-sm text-gray-500">Assign and manage classwork, homework, assignments and projects</p>
        </div>
        <button onClick={() => { setEditing(null); reset({}); setShowModal(true); }} className="btn-primary">+ Assign</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="input-field w-40">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ClassDivisionPicker
          standardId={filters.standardId}
          divisionName={filters.divisionName}
          onStandardChange={(id) => setFilters(f => ({ ...f, standardId: id, divisionName: '' }))}
          onDivisionChange={(name) => setFilters(f => ({ ...f, divisionName: name }))}
          required={false}
          className="md:col-span-2"
        />
        <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input-field w-40" placeholder="From" />
        <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input-field w-40" placeholder="To" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {homeworks.map(hw => (
            <div key={hw._id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`badge ${TYPE_COLORS[hw.type] || 'badge-gray'}`}>{TYPE_LABELS[hw.type] || hw.type}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(hw)} className="text-blue-500 hover:text-blue-700 text-xs px-2 py-0.5">Edit</button>
                  <button onClick={() => { if (confirm('Delete this?')) remove.mutate(hw._id); }} className="text-red-400 hover:text-red-600 text-xs px-2 py-0.5">Delete</button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mt-2">{hw.title}</h3>
              {hw.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{hw.description}</p>}
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-1">📚 {hw.subjectId?.name} • {typeof hw.standardId === 'object' ? hw.standardId?.name : hw.standardId} {hw.divisionName && `- ${hw.divisionName}`}</div>
                <div className="flex items-center gap-1">👤 {hw.teacherId?.name}</div>
                {hw.dueDate && <div className="flex items-center gap-1 text-red-500">📅 Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}</div>}
              </div>
            </div>
          ))}
          {homeworks.length === 0 && (
            <div className="col-span-3 card p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📝</div>
              <p>No homework assigned yet</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold">{editing ? 'Edit' : 'Assign'} Homework / Classwork</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input {...register('title', { required: 'Required' })} className="input-field" placeholder="e.g. Solve Ex 5.2" />
              {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select {...register('type')} className="input-field">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input {...register('dueDate')} type="date" className="input-field" />
              </div>
              <div className="col-span-2">
                <ClassDivisionPicker
                  standardId={assignClass.standardId}
                  divisionName={assignClass.divisionName}
                  onStandardChange={(id) => setAssignClass({ standardId: id, divisionName: '' })}
                  onDivisionChange={(name) => setAssignClass({ standardId: assignClass.standardId, divisionName: name })}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select {...register('subjectId', { required: true })} className="input-field">
                  <option value="">Select</option>
                  {(Array.isArray(subjects) ? subjects : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea {...register('description')} rows={3} className="input-field" placeholder="Detailed instructions..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? 'Saving...' : editing ? 'Update' : 'Assign'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
