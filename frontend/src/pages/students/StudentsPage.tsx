import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, AlertCircle, Upload } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { ClassDivisionPicker } from '../../components/academics/ClassDivisionPicker';
import { SetupFlowBanner } from '../../components/academics/SetupFlowBanner';
import { formatClassSection } from '../../constants/systemFlow';
import { studentService } from '../../services/student.service';
import { academicService } from '../../services';
import type { Student } from '../../types';

const genderOptions = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
const categoryOptions = [
  { value: 'general', label: 'General' }, { value: 'obc', label: 'OBC' },
  { value: 'sc', label: 'SC' }, { value: 'st', label: 'ST' },
  { value: 'ews', label: 'EWS' }, { value: 'rte', label: 'RTE 25%' },
];

function displayClassSection(s: Student) {
  const std = typeof s.standardId === 'object' ? s.standardId as { name: string; shortName?: string } : null;
  return formatClassSection(std, s.divisionName);
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [filterStandardId, setFilterStandardId] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignForm, setAssignForm] = useState({ standardId: '', divisionName: '' });
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<Partial<Student>>({
    name: '', gender: 'male', category: 'general',
    standardId: '', divisionName: '',
    guardians: [{ relation: 'father', name: '', phone: '' }],
  });

  const { data: standardsRes } = useQuery({ queryKey: ['standards'], queryFn: academicService.listStandards });
  const standards = standardsRes?.data || [];
  const filterStandard = standards.find(s => s._id === filterStandardId);

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, status, filterStandardId, filterDivision],
    queryFn: () => studentService.list({
      search: search || undefined,
      status,
      standardId: filterStandardId || undefined,
      divisionName: filterDivision || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: studentService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['standards'] });
      setShowModal(false);
      setFormError('');
      setForm({
        name: '', gender: 'male', category: 'general', standardId: '', divisionName: '',
        guardians: [{ relation: 'father', name: '', phone: '' }],
      });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setFormError(err.response?.data?.message || 'Failed to add student');
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => studentService.bulkAssignClass(selectedIds, assignForm.standardId, assignForm.divisionName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['standards'] });
      setShowAssignModal(false);
      setSelectedIds([]);
      setAssignForm({ standardId: '', divisionName: '' });
    },
  });

  const students = data?.data || [];
  const hasClasses = standards.length > 0;

  const handleSubmit = () => {
    setFormError('');
    if (!form.name?.trim()) { setFormError('Student name is required'); return; }
    if (!form.admissionNo?.trim()) { setFormError('Admission number is required'); return; }
    if (!form.standardId) { setFormError('Please select a class'); return; }
    if (!form.divisionName) { setFormError('Please select a section/division'); return; }
    createMutation.mutate(form);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const columns = [
    {
      key: 'select', header: '',
      render: (s: Student) => (
        <input type="checkbox" checked={selectedIds.includes(s._id)} onChange={() => toggleSelect(s._id)} onClick={e => e.stopPropagation()} />
      ),
    },
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
        <span className="text-sm font-semibold font-mono">{displayClassSection(s)}</span>
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
        description="Student listing, promotion, and class/section assignment (WF-0082)"
        breadcrumb={[{ label: 'Home' }, { label: 'Students' }]}
        actions={
          <>
            <Button variant="outline" icon={<Upload className="w-4 h-4" />}>Import</Button>
            <Button variant="outline" icon={<Download className="w-4 h-4" />}>Export</Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)} disabled={!hasClasses}>
              Add Student
            </Button>
          </>
        }
      />

      <SetupFlowBanner currentStep="students" />

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-800">{selectedIds.length} selected</span>
          <Button size="sm" onClick={() => setShowAssignModal(true)}>Promote / Assign Class</Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      )}

      {!hasClasses && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Set up classes first.</strong> Go to Academics → Classes & Sections to create classes (e.g. Class 8) with sections (A, B, C) before adding students.
            <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate('/academics/standards')}>Go to Classes Setup</Button>
          </div>
        </div>
      )}

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
          value={filterStandardId}
          onChange={e => { setFilterStandardId(e.target.value); setFilterDivision(''); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Classes</option>
          {standards.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select
          value={filterDivision}
          onChange={e => setFilterDivision(e.target.value)}
          disabled={!filterStandardId}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">All Sections</option>
          {(filterStandard?.divisions || []).map(d => <option key={d.name} value={d.name}>Section {d.name}</option>)}
        </select>
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
        <Table
          columns={columns}
          data={students}
          loading={isLoading}
          emptyMessage="No students found"
          onRowClick={(s) => navigate(`/students/${s._id}`)}
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setFormError(''); }}
        title="Add New Student"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={handleSubmit}>Add Student</Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name *" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Student name" />
          <Input label="Admission No. *" value={form.admissionNo || ''} onChange={e => setForm(f => ({ ...f, admissionNo: e.target.value }))} placeholder="ADM-2024-001" />
          <Input label="GR No." value={form.grNo || ''} onChange={e => setForm(f => ({ ...f, grNo: e.target.value }))} />
          <Input type="date" label="Date of Birth" value={form.dob || ''} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          <Select label="Gender" value={form.gender || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Student['gender'] }))} options={genderOptions} />
          <Select label="Category" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value as Student['category'] }))} options={categoryOptions} />
          <Input type="date" label="Admission Date" value={form.admissionDate || ''} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} />

          <div className="sm:col-span-2 border-t pt-4">
            <p className="font-medium text-sm text-gray-700 mb-3">Class Assignment *</p>
            <ClassDivisionPicker
              standardId={typeof form.standardId === 'string' ? form.standardId : (form.standardId as { _id: string })?._id}
              divisionName={form.divisionName}
              onStandardChange={(id) => setForm(f => ({ ...f, standardId: id, divisionName: '' }))}
              onDivisionChange={(name) => setForm(f => ({ ...f, divisionName: name }))}
            />
          </div>

          <div className="sm:col-span-2 border-t pt-3 mt-1">
            <p className="font-medium text-sm text-gray-700 mb-3">Parent / Guardian</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Parent Name" value={form.guardians?.[0]?.name || ''} onChange={e => setForm(f => ({ ...f, guardians: [{ relation: 'father' as const, name: e.target.value, phone: f.guardians?.[0]?.phone || '', email: f.guardians?.[0]?.email }] }))} />
              <Input label="Phone" value={form.guardians?.[0]?.phone || ''} onChange={e => setForm(f => ({ ...f, guardians: [{ relation: 'father' as const, name: f.guardians?.[0]?.name || '', phone: e.target.value, email: f.guardians?.[0]?.email }] }))} />
              <Input label="Email" value={form.guardians?.[0]?.email || ''} onChange={e => setForm(f => ({ ...f, guardians: [{ relation: 'father' as const, name: f.guardians?.[0]?.name || '', phone: f.guardians?.[0]?.phone || '', email: e.target.value }] }))} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <Input label="Current Address" value={form.currentAddress || ''} onChange={e => setForm(f => ({ ...f, currentAddress: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Promote / Assign Class — ${selectedIds.length} student(s)`}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button loading={assignMutation.isPending} onClick={() => assignMutation.mutate()}>Save</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 mb-4">Move selected students to a new class and section (e.g. end-of-year promotion).</p>
        <ClassDivisionPicker
          standardId={assignForm.standardId}
          divisionName={assignForm.divisionName}
          onStandardChange={(id) => setAssignForm({ standardId: id, divisionName: '' })}
          onDivisionChange={(name) => setAssignForm(f => ({ ...f, divisionName: name }))}
        />
      </Modal>
    </div>
  );
}
