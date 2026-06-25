import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCog } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { hrService } from '../../services';
import type { Staff } from '../../types';

const departments = ['Administration', 'Academics', 'Science', 'Mathematics', 'English', 'Social Science', 'Physical Education', 'Arts', 'Library', 'Accounts', 'Transport', 'Housekeeping'].map(v => ({ value: v, label: v }));

export default function StaffPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Staff>>({ name: '', gender: 'male', qualification: [] });

  const { data, isLoading } = useQuery({
    queryKey: ['staff', search],
    queryFn: () => hrService.listStaff({ search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: hrService.createStaff,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); setShowModal(false); },
  });

  const columns = [
    { key: 'employeeId', header: 'Emp. ID', render: (s: Staff) => <span className="font-mono text-xs text-gray-500">{s.employeeId}</span> },
    {
      key: 'name', header: 'Name',
      render: (s: Staff) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-purple-600">{s.name[0]}</span>
          </div>
          <div>
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-gray-400">{s.designation}</p>
          </div>
        </div>
      ),
    },
    { key: 'department', header: 'Department' },
    { key: 'phone', header: 'Phone' },
    { key: 'joiningDate', header: 'Joining', render: (s: Staff) => s.joiningDate ? new Date(s.joiningDate).toLocaleDateString('en-IN') : '—' },
    { key: 'isActive', header: 'Status', render: (s: Staff) => <Badge variant={s.isActive ? 'success' : 'danger'}>{s.isActive ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage teaching and non-teaching staff"
        breadcrumb={[{ label: 'Home' }, { label: 'HR & Payroll' }, { label: 'Staff' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Add Staff</Button>}
      />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <Table columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No staff found" />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Staff Member"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Add Staff</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name *" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Employee ID *" value={form.employeeId || ''} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="EMP-001" />
          <Input label="Designation" value={form.designation || ''} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Teacher / Principal..." />
          <Select label="Department" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} options={departments} placeholder="Select department" />
          <Input label="Phone" type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input type="date" label="Joining Date" value={form.joiningDate || ''} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} />
          <Select label="Gender" value={form.gender || 'male'} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Staff['gender'] }))} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          <Input type="date" label="Date of Birth" value={form.dob || ''} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          <Input label="PAN" value={form.pan || ''} onChange={e => setForm(f => ({ ...f, pan: e.target.value }))} placeholder="ABCDE1234F" />
        </div>
      </Modal>
    </div>
  );
}
