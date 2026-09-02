import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { ClassDivisionPicker } from '../../components/academics/ClassDivisionPicker';
import { formatClassSection } from '../../constants/systemFlow';

type Record = {
  _id: string;
  type: string;
  title: string;
  points: number;
  date: string;
  studentId?: { name: string; admissionNo: string; standardId?: { name: string; shortName?: string }; divisionName?: string };
};

export default function DisciplinePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ studentId: '', type: 'incident', title: '', description: '', points: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['discipline'],
    queryFn: () => axios.get('/discipline').then(r => r.data.data as Record[]),
  });

  const { data: studentsRes } = useQuery({
    queryKey: ['students-all-discipline'],
    queryFn: () => axios.get('/students?limit=500&status=active').then(r => r.data.data),
  });
  const students = Array.isArray(studentsRes) ? studentsRes : [];

  const create = useMutation({
    mutationFn: () => axios.post('/discipline', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discipline'] }); setShowModal(false); },
  });

  return (
    <div className="p-6">
      <PageHeader title="Discipline & Behaviour" description="Merits, demerits, and incident log (Spec §21)"
        breadcrumb={[{ label: 'Home' }, { label: 'Discipline' }]}
        actions={<Button onClick={() => setShowModal(true)}>Log Incident</Button>} />
      <div className="card overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr><th className="px-4 py-2 text-left">Student</th><th className="px-4 py-2">Class</th><th className="px-4 py-2">Type</th><th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2">Points</th><th className="px-4 py-2">Date</th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading...</td></tr> :
              (data || []).map(r => (
                <tr key={r._id} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.studentId?.name}</td>
                  <td className="px-4 py-2 font-mono">{formatClassSection(r.studentId?.standardId, r.studentId?.divisionName)}</td>
                  <td className="px-4 py-2 capitalize text-center">{r.type}</td>
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2 text-center">{r.points}</td>
                  <td className="px-4 py-2">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Discipline Record"
        footer={<div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate()}>Save</Button></div>}>
        <div className="space-y-3">
          <Select label="Student *" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
            options={[{ value: '', label: 'Select student' }, ...students.map((s: { _id: string; name: string; admissionNo: string }) => ({ value: s._id, label: `${s.name} (${s.admissionNo})` }))]} />
          <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            options={[{ value: 'merit', label: 'Merit' }, { value: 'demerit', label: 'Demerit' }, { value: 'incident', label: 'Incident' }]} />
          <Input label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Points" type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
