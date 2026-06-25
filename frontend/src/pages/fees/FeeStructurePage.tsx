import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, IndianRupee } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { feeService, academicService } from '../../services';
import type { FeeStructure } from '../../types';

export default function FeeStructurePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<FeeStructure & { academicYearId: string; standardId: string }>>({
    name: '', components: [{ name: 'Tuition Fee', amount: 0, gstRate: 0, isOptional: false }], installments: [], lateFeePerDay: 0,
  });

  const { data: structures, isLoading } = useQuery({ queryKey: ['fee-structures'], queryFn: () => feeService.listStructures() });
  const { data: standards } = useQuery({ queryKey: ['standards'], queryFn: academicService.listStandards });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: academicService.listYears });

  const createMutation = useMutation({
    mutationFn: feeService.createStructure,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-structures'] }); setShowModal(false); },
  });

  const addComponent = () => setForm(f => ({ ...f, components: [...(f.components || []), { name: '', amount: 0, gstRate: 0, isOptional: false }] }));
  const removeComponent = (idx: number) => setForm(f => ({ ...f, components: f.components?.filter((_, i) => i !== idx) }));
  const updateComponent = (idx: number, field: string, value: unknown) => setForm(f => ({
    ...f,
    components: f.components?.map((c, i) => i === idx ? { ...c, [field]: value } : c),
  }));

  const totalAmount = form.components?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;

  return (
    <div>
      <PageHeader
        title="Fee Structures"
        description="Define fee structures for each standard and academic year"
        breadcrumb={[{ label: 'Home' }, { label: 'Fee Management' }, { label: 'Fee Structures' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Structure</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(structures?.data || []).map(s => (
            <Card key={s._id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {typeof s.standardId === 'object' && s.standardId ? (s.standardId as { name: string }).name : 'All Standards'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                {s.components.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{c.name}</span>
                    <span className="font-medium">₹{c.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-blue-600">
                  ₹{s.components.reduce((sum, c) => sum + c.amount, 0).toLocaleString('en-IN')}
                </span>
              </div>
              {s.lateFeePerDay > 0 && (
                <p className="text-xs text-orange-600 mt-1">Late fee: ₹{s.lateFeePerDay}/day</p>
              )}
            </Card>
          ))}
          {structures?.data?.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">No fee structures created yet</div>
          )}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Fee Structure"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form as Partial<FeeStructure>)}>Create</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Structure Name *" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Class 8 Fee 2026-27" />
            <Select
              label="Academic Year"
              value={form.academicYearId || ''}
              onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))}
              options={(years?.data || []).map(y => ({ value: y._id, label: y.name }))}
              placeholder="Select year"
            />
            <Select
              label="Standard (optional)"
              value={form.standardId || ''}
              onChange={e => setForm(f => ({ ...f, standardId: e.target.value }))}
              options={(standards?.data || []).map(s => ({ value: s._id, label: s.name }))}
              placeholder="All Standards"
            />
            <Input label="Late Fee per Day (₹)" type="number" value={form.lateFeePerDay || 0} onChange={e => setForm(f => ({ ...f, lateFeePerDay: +e.target.value }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Fee Components</label>
              <button onClick={addComponent} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Component</button>
            </div>
            <div className="space-y-2">
              {form.components?.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={c.name} onChange={e => updateComponent(i, 'name', e.target.value)} placeholder="Component name" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="relative w-32">
                    <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="number" value={c.amount} onChange={e => updateComponent(i, 'amount', +e.target.value)} placeholder="Amount" className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={() => removeComponent(i)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between">
              <span className="text-sm font-medium text-blue-700">Total Annual Fee</span>
              <span className="text-lg font-bold text-blue-700">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
