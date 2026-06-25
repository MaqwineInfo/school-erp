import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList, Check } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { examService, academicService } from '../../services';
import type { Exam } from '../../types';

const examTypes = [
  { value: 'unit_test', label: 'Unit Test (PT)' }, { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'annual', label: 'Annual' }, { value: 'pre_board', label: 'Pre-Board' },
  { value: 'practical', label: 'Practical' }, { value: 'project', label: 'Project' },
  { value: 'mcq', label: 'MCQ / Online' }, { value: 'internal', label: 'Internal' },
];

export default function ExamsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Exam>>({ name: '', type: 'unit_test', status: 'draft', schedules: [] });

  const { data, isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => examService.list() });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: academicService.listYears });
  const { data: standards } = useQuery({ queryKey: ['standards'], queryFn: academicService.listStandards });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: academicService.listSubjects });

  const createMutation = useMutation({
    mutationFn: examService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); setShowModal(false); },
  });

  const publishMutation = useMutation({
    mutationFn: examService.publish,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });

  const exams = data?.data || [];

  const typeColors: Record<string, 'info' | 'warning' | 'success' | 'purple' | 'default'> = {
    unit_test: 'info', half_yearly: 'warning', annual: 'success', pre_board: 'purple',
  };

  return (
    <div>
      <PageHeader
        title="Exams & Assessments"
        description="Schedule and manage examinations"
        breadcrumb={[{ label: 'Home' }, { label: 'Exams & Results' }, { label: 'Exams' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Create Exam</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-xl border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(exam => (
            <Card key={exam._id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={typeColors[exam.type] || 'default'}>{exam.type.replace(/_/g, ' ')}</Badge>
                    <Badge variant={statusBadge(exam.status)}>{exam.status}</Badge>
                  </div>
                </div>
                <ClipboardList className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {typeof exam.academicYearId === 'object' ? (exam.academicYearId as { name: string }).name : exam.academicYearId}
              </p>
              <p className="text-sm text-gray-600">{exam.schedules.length} subject(s) scheduled</p>
              {exam.status === 'draft' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" icon={<Check className="w-3.5 h-3.5" />} onClick={() => publishMutation.mutate(exam._id)}>Publish</Button>
                </div>
              )}
            </Card>
          ))}
          {exams.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No exams created yet</div>}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Exam"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Create Exam</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Exam Name *" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Unit Test 1 (2026)" />
          <Select label="Exam Type" value={form.type || 'unit_test'} onChange={e => setForm(f => ({ ...f, type: e.target.value as Exam['type'] }))} options={examTypes} />
          <Select
            label="Academic Year"
            value={String(form.academicYearId || '')}
            onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value as unknown as Exam['academicYearId'] }))}
            options={(years?.data || []).map(y => ({ value: y._id, label: y.name }))}
            placeholder="Select year"
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Exam Schedule</label>
            <button
              onClick={() => setForm(f => ({ ...f, schedules: [...(f.schedules || []), { maxMarks: 100 }] }))}
              className="text-xs text-blue-600 font-medium"
            >
              + Add Subject
            </button>
          </div>
          <div className="space-y-2">
            {form.schedules?.map((s, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 p-2 border border-gray-100 rounded-lg">
                <select className="col-span-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                  onChange={e => setForm(f => ({ ...f, schedules: f.schedules?.map((x, j) => j === i ? { ...x, standardId: e.target.value } : x) }))}>
                  <option value="">Class</option>
                  {standards?.data?.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                </select>
                <select className="col-span-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                  onChange={e => setForm(f => ({ ...f, schedules: f.schedules?.map((x, j) => j === i ? { ...x, subjectId: e.target.value } : x) }))}>
                  <option value="">Subject</option>
                  {subjects?.data?.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                </select>
                <input type="date" className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                  onChange={e => setForm(f => ({ ...f, schedules: f.schedules?.map((x, j) => j === i ? { ...x, date: e.target.value } : x) }))} />
                <input type="number" placeholder="Max Marks" defaultValue={100} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                  onChange={e => setForm(f => ({ ...f, schedules: f.schedules?.map((x, j) => j === i ? { ...x, maxMarks: +e.target.value } : x) }))} />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
