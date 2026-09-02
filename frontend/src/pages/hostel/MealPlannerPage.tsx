import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';

type Meal = { _id: string; date: string; mealType: string; items: string[]; notes?: string };

export default function MealPlannerPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: '', mealType: 'lunch', items: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['meal-menu'],
    queryFn: () => axios.get('/meal').then(r => r.data.data as Meal[]),
  });

  const create = useMutation({
    mutationFn: () => axios.post('/meal', { ...form, items: form.items.split(',').map(s => s.trim()).filter(Boolean) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-menu'] }); setShowModal(false); },
  });

  return (
    <div className="p-6">
      <PageHeader title="Meal Planner" description="Hostel mess menu (Spec §17)"
        breadcrumb={[{ label: 'Home' }, { label: 'Hostel' }, { label: 'Meal Planner' }]}
        actions={<Button onClick={() => setShowModal(true)}>Add Menu</Button>} />
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {isLoading ? <p className="text-gray-400">Loading...</p> : (data || []).map(m => (
          <div key={m._id} className="card p-4">
            <div className="flex justify-between mb-2">
              <span className="font-semibold capitalize">{m.mealType}</span>
              <span className="text-sm text-gray-500">{new Date(m.date).toLocaleDateString('en-IN')}</span>
            </div>
            <ul className="text-sm text-gray-700 list-disc pl-4">{m.items.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Meal Menu"
        footer={<div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={create.isPending} onClick={() => create.mutate()}>Save</Button></div>}>
        <div className="space-y-3">
          <Input type="date" label="Date *" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Select label="Meal Type" value={form.mealType} onChange={e => setForm(f => ({ ...f, mealType: e.target.value }))}
            options={[{ value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'snack', label: 'Snack' }, { value: 'dinner', label: 'Dinner' }]} />
          <Input label="Items (comma-separated) *" value={form.items} onChange={e => setForm(f => ({ ...f, items: e.target.value }))} placeholder="Rice, Dal, Sabzi" />
          <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
