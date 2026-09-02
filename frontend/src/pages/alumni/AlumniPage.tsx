import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

type Alumni = { _id: string; name: string; batch?: string; lastClass?: string; phone?: string; email?: string; occupation?: string };

export default function AlumniPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Alumni>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['alumni'],
    queryFn: () => axios.get('/alumni').then(r => r.data.data as Alumni[]),
  });

  const create = useMutation({
    mutationFn: () => axios.post('/alumni', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alumni'] }); setShowModal(false); setForm({}); },
  });

  return (
    <div className="p-6">
      <PageHeader title="Alumni Directory" description="Former students and outreach (Spec §29)"
        breadcrumb={[{ label: 'Home' }, { label: 'Alumni' }]}
        actions={<Button onClick={() => setShowModal(true)}>Add Alumni</Button>} />
      <div className="card overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2">Batch</th><th className="px-4 py-2">Last Class</th><th className="px-4 py-2">Contact</th><th className="px-4 py-2">Occupation</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading...</td></tr> :
              (data || []).map(a => (
                <tr key={a._id} className="border-t">
                  <td className="px-4 py-2 font-medium">{a.name}</td>
                  <td className="px-4 py-2">{a.batch || '—'}</td>
                  <td className="px-4 py-2">{a.lastClass || '—'}</td>
                  <td className="px-4 py-2">{a.phone || a.email || '—'}</td>
                  <td className="px-4 py-2">{a.occupation || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Alumni"
        footer={<div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate()}>Save</Button></div>}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name *" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Input label="Batch" value={form.batch || ''} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} />
          <Input label="Last Class" value={form.lastClass || ''} onChange={e => setForm(f => ({ ...f, lastClass: e.target.value }))} />
          <Input label="Phone" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
