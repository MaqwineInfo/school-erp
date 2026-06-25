import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Phone } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { enquiryService } from '../../services';
import type { Enquiry } from '../../types';

const statusColors: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'default' | 'purple'> = {
  new: 'info', contacted: 'warning', school_visit: 'purple',
  form_issued: 'warning', form_submitted: 'warning', admitted: 'success', lost: 'danger',
};

const sourceOptions = [
  'walk_in', 'reference', 'newspaper', 'website', 'hoarding', 'justdial', 'facebook', 'instagram', 'google_ad', 'other'
].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

const statusOptions = [
  'new', 'contacted', 'school_visit', 'form_issued', 'form_submitted', 'admitted', 'lost'
].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

export default function EnquiriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Enquiry>>({ source: 'walk_in', status: 'new' });

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', search, filterStatus],
    queryFn: () => enquiryService.list({ search: search || undefined, status: filterStatus || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: enquiryService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enquiries'] }); setShowModal(false); setForm({ source: 'walk_in', status: 'new' }); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => enquiryService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });

  const enquiries = data?.data || [];

  const columns = [
    { key: 'studentName', header: 'Student', render: (e: Enquiry) => <span className="font-medium">{e.studentName}</span> },
    { key: 'parent', header: 'Parent', render: (e: Enquiry) => (
      <div>
        <p className="text-sm">{e.parentName}</p>
        <p className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{e.parentPhone}</p>
      </div>
    )},
    { key: 'source', header: 'Source', render: (e: Enquiry) => <span className="text-sm capitalize">{e.source?.replace(/_/g,' ')}</span> },
    { key: 'status', header: 'Status', render: (e: Enquiry) => (
      <select
        value={e.status}
        onChange={ev => updateStatusMutation.mutate({ id: e._id, status: ev.target.value })}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
        onClick={ev => ev.stopPropagation()}
      >
        {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )},
    { key: 'followUpDate', header: 'Follow-up', render: (e: Enquiry) => e.followUpDate ? new Date(e.followUpDate).toLocaleDateString('en-IN') : '—' },
    { key: 'createdAt', header: 'Received', render: (e: Enquiry) => new Date(e.createdAt).toLocaleDateString('en-IN') },
  ];

  const statusCounts = enquiries.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <PageHeader
        title="Admission Enquiries"
        description="Track and manage prospective student enquiries"
        breadcrumb={[{ label: 'Home' }, { label: 'Admissions' }, { label: 'Enquiries' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Enquiry</Button>}
      />

      {/* Status summary */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { status: '', label: 'All', count: enquiries.length },
          { status: 'new', label: 'New', count: statusCounts.new || 0 },
          { status: 'contacted', label: 'Contacted', count: statusCounts.contacted || 0 },
          { status: 'school_visit', label: 'Visited', count: statusCounts.school_visit || 0 },
          { status: 'form_submitted', label: 'Form Submitted', count: statusCounts.form_submitted || 0 },
          { status: 'admitted', label: 'Admitted', count: statusCounts.admitted || 0 },
          { status: 'lost', label: 'Lost', count: statusCounts.lost || 0 },
        ].map(s => (
          <button
            key={s.status}
            onClick={() => setFilterStatus(s.status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s.status ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <Table columns={columns} data={enquiries} loading={isLoading} emptyMessage="No enquiries found" />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Admission Enquiry"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Save Enquiry</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Student Name *" value={form.studentName || ''} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} />
          <Input type="date" label="Date of Birth" value={form.dob || ''} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          <Input label="Parent Name" value={form.parentName || ''} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} />
          <Input label="Parent Phone *" type="tel" value={form.parentPhone || ''} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} />
          <Input label="Parent Email" type="email" value={form.parentEmail || ''} onChange={e => setForm(f => ({ ...f, parentEmail: e.target.value }))} />
          <Input label="Current School" value={form.currentSchool || ''} onChange={e => setForm(f => ({ ...f, currentSchool: e.target.value }))} />
          <Select label="Enquiry Source" value={form.source || 'walk_in'} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} options={sourceOptions} />
          <Input type="date" label="Follow-up Date" value={form.followUpDate || ''} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
