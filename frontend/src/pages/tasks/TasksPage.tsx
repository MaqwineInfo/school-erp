import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';

type Task = { _id: string; title: string; status: string; priority: string; dueDate?: string; assignedTo?: { name: string } };

export default function TasksPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => axios.get('/tasks').then(r => r.data.data as Task[]),
  });

  const create = useMutation({
    mutationFn: () => axios.post('/tasks', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowModal(false); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axios.put(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <div className="p-6">
      <PageHeader title="Tasks" description="Staff task management (Spec §27)"
        breadcrumb={[{ label: 'Home' }, { label: 'Tasks' }]}
        actions={<Button onClick={() => setShowModal(true)}>New Task</Button>} />
      <div className="grid gap-3 mt-4">
        {isLoading ? <p className="text-gray-400">Loading...</p> : (data || []).map(t => (
          <div key={t._id} className="card p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-gray-500">{t.assignedTo?.name || 'Unassigned'} · {t.priority} · {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'No due date'}</p>
            </div>
            <select value={t.status} onChange={e => updateStatus.mutate({ id: t._id, status: e.target.value })} className="input-field w-36 text-sm">
              {['open', 'in_progress', 'done', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Task"
        footer={<div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate()}>Create</Button></div>}>
        <div className="space-y-3">
          <Input label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
          <Input type="date" label="Due Date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
