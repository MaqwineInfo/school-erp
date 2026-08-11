import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, UserPlus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { studentService } from '../../services/student.service';
import type { Student } from '../../types';

const genderOptions = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
const categoryOptions = [
  { value: 'general', label: 'General' }, { value: 'obc', label: 'OBC' },
  { value: 'sc', label: 'SC' }, { value: 'st', label: 'ST' },
  { value: 'ews', label: 'EWS' }, { value: 'rte', label: 'RTE 25%' },
];

export default function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Student>>({
    name: '', gender: 'male', category: 'general',
    guardians: [{ relation: 'father', name: '', phone: '' }],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, status],
    queryFn: () => studentService.list({ search, status }),
  });

  const createMutation = useMutation({
    mutationFn: studentService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setShowModal(false); },
  });

  const students = data?.data || [];

  const columns = [
    {
      key: 'admissionNo', header: 'Adm. No.',
      render: (s: Student) => <span className="font-mono text-xs text-gray-500">{s.admissionNo}</span>,
    },
    {
      key: 'name', header: 'Student Name',
      render: (s: Student) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
            {s.name[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{s.name}</p>
            <p className="text-xs text-gray-400">{s.gender}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'standard', header: 'Class',
      render: (s: Student) => (
        <span className="text-sm">
          {typeof s.standardId === 'object' ? (s.standardId as { name: string })?.name : ''}{' '}
          {s.divisionName && `-${s.divisionName}`}
        </span>
      ),
    },
    {
      key: 'guardians', header: 'Parent',
      render: (s: Student) => (
        <div>
          <p className="text-sm">{s.guardians?.[0]?.name || '—'}</p>
          <p className="text-xs text-gray-400">{s.guardians?.[0]?.phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'category', header: 'Category',
      render: (s: Student) => <Badge variant="info">{s.category?.toUpperCase()}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      render: (s: Student) => <Badge variant={statusBadge(s.status)}>{s.status}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage all student records and profiles"
        breadcrumb={[{ label: 'Home' }, { label: 'Students' }]}
        actions={
          <>
            <Button variant="outline" icon={<Download className="w-4 h-4" />}>Export</Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Add Student</Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, admission no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="transferred">Transferred</option>
          <option value="alumni">Alumni</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-1">
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{students.length}</span> students
          </p>
        </div>
        <Table columns={columns} data={students} loading={isLoading} emptyMessage="No students found" />
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Student"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>
              Add Student
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name *" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Student name" />
          <Input label="Admission No. *" value={form.admissionNo || ''} onChange={e => setForm(f => ({ ...f, admissionNo: e.target.value }))} placeholder="ADM-2024-001" />
          <Input label="GR No." value={form.grNo || ''} onChange={e => setForm(f => ({ ...f, grNo: e.target.value }))} />
          <Input type="date" label="Date of Birth" value={form.dob || ''} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          <Select label="Gender" value={form.gender || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Student['gender'] }))} options={genderOptions} />
          <Select label="Category" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value as Student['category'] }))} options={categoryOptions} />
          <Input label="Division" value={form.divisionName || ''} onChange={e => setForm(f => ({ ...f, divisionName: e.target.value }))} placeholder="A" />
          <Input type="date" label="Admission Date" value={form.admissionDate || ''} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} />

          <div className="sm:col-span-2 border-t pt-3 mt-1">
            <p className="font-medium text-sm text-gray-700 mb-3">Parent / Guardian</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Parent Name" value={form.guardians?.[0]?.name || ''} onChange={e => setForm(f => ({ ...f, guardians: [{ relation: 'father', ...(f.guardians?.[0] || {}), name: e.target.value }] }))} />
              <Input label="Phone" value={form.guardians?.[0]?.phone || ''} onChange={e => setForm(f => ({ ...f, guardians: [{ relation: 'father', name: '', ...(f.guardians?.[0] || {}), phone: e.target.value }] }))} />
              <Input label="Email" value={form.guardians?.[0]?.email || ''} onChange={e => setForm(f => ({ ...f, guardians: [{ relation: 'father', name: '', ...(f.guardians?.[0] || {}), email: e.target.value }] }))} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <Input label="Current Address" value={form.currentAddress || ''} onChange={e => setForm(f => ({ ...f, currentAddress: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
