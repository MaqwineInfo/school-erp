import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Phone, UserCheck, Copy, ExternalLink } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { ClassDivisionPicker } from '../../components/academics/ClassDivisionPicker';
import { formatClassSection } from '../../constants/systemFlow';
import { enquiryService } from '../../services';
import { authService } from '../../services/auth.service';
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

type EnquiryForm = {
  studentName?: string;
  dob?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  source?: string;
  status?: string;
  followUpDate?: string;
  standardId?: string;
  divisionName?: string;
};

function enquiryClassDisplay(e: Enquiry) {
  const std = typeof e.applyingForStandard === 'object' ? e.applyingForStandard : null;
  if (!std || !e.applyingForDivision) {
    return typeof e.applyingForStandard === 'object' ? (e.applyingForStandard as { name: string }).name : '—';
  }
  return formatClassSection(std as { name: string; shortName?: string }, e.applyingForDivision);
}

export default function EnquiriesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [convertEnquiry, setConvertEnquiry] = useState<Enquiry | null>(null);
  const [convertForm, setConvertForm] = useState({ admissionNo: '', standardId: '', divisionName: '' });
  const [convertError, setConvertError] = useState('');
  const [form, setForm] = useState<EnquiryForm>({ source: 'walk_in', status: 'new', standardId: '', divisionName: '' });

  const { data: meRes } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authService.me,
  });
  const me = meRes?.data as { tenant?: { slug?: string }; tenantId?: { slug?: string } } | undefined;
  const tenantSlug = me?.tenant?.slug || me?.tenantId?.slug;
  const publicUrl = tenantSlug ? `${window.location.origin}/apply/${tenantSlug}` : null;

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', search, filterStatus],
    queryFn: () => enquiryService.list({ search: search || undefined, status: filterStatus || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: enquiryService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enquiries'] });
      setShowModal(false);
      setForm({ source: 'walk_in', status: 'new', standardId: '', divisionName: '' });
      setFormError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setFormError(err.response?.data?.message || 'Failed to save enquiry');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => enquiryService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => enquiryService.convert(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['enquiries'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['standards'] });
      setConvertEnquiry(null);
      setConvertError('');
      const studentId = (res as { data?: { _id?: string } })?.data?._id;
      if (studentId) navigate(`/students/${studentId}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setConvertError(err.response?.data?.message || 'Failed to convert enquiry');
    },
  });

  const enquiries = data?.data || [];

  const openConvert = (e: Enquiry) => {
    const stdId = typeof e.applyingForStandard === 'object'
      ? (e.applyingForStandard as { _id: string })?._id
      : (e.applyingForStandard as string) || '';
    setConvertEnquiry(e);
    setConvertForm({
      admissionNo: '',
      standardId: stdId,
      divisionName: e.applyingForDivision || '',
    });
    setConvertError('');
  };

  const handleCreate = () => {
    setFormError('');
    if (!form.studentName?.trim()) { setFormError('Student name is required'); return; }
    if (!form.parentPhone?.trim()) { setFormError('Parent phone is required'); return; }
    if (!form.standardId) { setFormError('Class is required'); return; }
    if (!form.divisionName) { setFormError('Section is required'); return; }
    createMutation.mutate({
      studentName: form.studentName,
      dob: form.dob,
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      parentEmail: form.parentEmail,
      applyingForStandard: form.standardId,
      applyingForDivision: form.divisionName,
      source: form.source,
      status: form.status as Enquiry['status'],
      followUpDate: form.followUpDate,
    });
  };

  const handleConvert = () => {
    setConvertError('');
    if (!convertForm.admissionNo.trim()) { setConvertError('Admission number is required'); return; }
    if (!convertForm.standardId) { setConvertError('Select a class'); return; }
    if (!convertForm.divisionName) { setConvertError('Select a section'); return; }
    convertMutation.mutate({ id: convertEnquiry!._id, data: convertForm });
  };

  const columns = [
    { key: 'studentName', header: 'Student', render: (e: Enquiry) => <span className="font-medium">{e.studentName}</span> },
    {
      key: 'class', header: 'Class · Section',
      render: (e: Enquiry) => <span className="text-sm font-mono font-semibold">{enquiryClassDisplay(e)}</span>,
    },
    {
      key: 'parent', header: 'Parent',
      render: (e: Enquiry) => (
        <div>
          <p className="text-sm">{e.parentName}</p>
          <p className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{e.parentPhone}</p>
        </div>
      ),
    },
    { key: 'source', header: 'Source', render: (e: Enquiry) => <span className="text-sm capitalize">{e.source?.replace(/_/g, ' ')}</span> },
    {
      key: 'status', header: 'Status',
      render: (e: Enquiry) => (
        <select
          value={e.status}
          onChange={ev => updateStatusMutation.mutate({ id: e._id, status: ev.target.value })}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
          onClick={ev => ev.stopPropagation()}
          disabled={e.status === 'admitted'}
        >
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: (e: Enquiry) => (
        e.status !== 'admitted' && e.status !== 'lost' ? (
          <Button size="sm" variant="outline" icon={<UserCheck className="w-3.5 h-3.5" />} onClick={(ev) => { ev.stopPropagation(); openConvert(e); }}>
            Admit
          </Button>
        ) : e.status === 'admitted' ? <Badge variant="success">Admitted</Badge> : null
      ),
    },
    { key: 'createdAt', header: 'Received', render: (e: Enquiry) => new Date(e.createdAt).toLocaleDateString('en-IN') },
  ];

  const statusCounts = enquiries.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <PageHeader
        title="Admission Enquiries"
        description="Enquiry → Class + Section → Admit as student (same mapping end-to-end)"
        breadcrumb={[{ label: 'Home' }, { label: 'Admissions' }, { label: 'Enquiries' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Enquiry</Button>}
      />

      {publicUrl && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex flex-wrap items-center gap-3 text-sm">
          <span className="text-blue-800">Public form: <code className="text-xs">{publicUrl}</code></span>
          <Button size="sm" variant="outline" icon={<Copy className="w-3.5 h-3.5" />} onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy</Button>
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" icon={<ExternalLink className="w-3.5 h-3.5" />}>Open</Button>
          </a>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { status: '', label: 'All', count: enquiries.length },
          { status: 'new', label: 'New', count: statusCounts.new || 0 },
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
            <Button loading={createMutation.isPending} onClick={handleCreate}>Save Enquiry</Button>
          </div>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Student Name *" value={form.studentName || ''} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} />
          <Input type="date" label="Date of Birth" value={form.dob || ''} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          <Input label="Parent Name" value={form.parentName || ''} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} />
          <Input label="Parent Phone *" type="tel" value={form.parentPhone || ''} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} />
          <Input label="Parent Email" type="email" value={form.parentEmail || ''} onChange={e => setForm(f => ({ ...f, parentEmail: e.target.value }))} />
          <Select label="Enquiry Source" value={form.source || 'walk_in'} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} options={sourceOptions} />
          <Input type="date" label="Follow-up Date" value={form.followUpDate || ''} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} />
        </div>
        <div className="mt-4">
          <ClassDivisionPicker
            standardId={form.standardId}
            divisionName={form.divisionName}
            onStandardChange={(id) => setForm(f => ({ ...f, standardId: id, divisionName: '' }))}
            onDivisionChange={(name) => setForm(f => ({ ...f, divisionName: name }))}
            required
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!convertEnquiry}
        onClose={() => setConvertEnquiry(null)}
        title={`Admit: ${convertEnquiry?.studentName}`}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConvertEnquiry(null)}>Cancel</Button>
            <Button loading={convertMutation.isPending} onClick={handleConvert}>Create Student Record</Button>
          </div>
        }
      >
        {convertError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{convertError}</div>}
        {convertEnquiry && (
          <p className="text-sm text-gray-600 mb-4">
            Enquiry class: <strong className="font-mono">{enquiryClassDisplay(convertEnquiry)}</strong>
            — confirm or change below before creating the student record.
          </p>
        )}
        <div className="space-y-4">
          <Input label="Admission No. *" value={convertForm.admissionNo} onChange={e => setConvertForm(f => ({ ...f, admissionNo: e.target.value }))} placeholder="ADM-2026-001" />
          <ClassDivisionPicker
            standardId={convertForm.standardId}
            divisionName={convertForm.divisionName}
            onStandardChange={(id) => setConvertForm(f => ({ ...f, standardId: id, divisionName: '' }))}
            onDivisionChange={(name) => setConvertForm(f => ({ ...f, divisionName: name }))}
          />
        </div>
      </Modal>
    </div>
  );
}
