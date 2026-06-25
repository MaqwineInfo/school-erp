import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, GraduationCap, Calendar } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { academicService } from '../../services';
import type { Standard, Subject, AcademicYear } from '../../types';

type Tab = 'years' | 'standards' | 'subjects';

export default function AcademicsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('years');
  const [showYearModal, setShowYearModal] = useState(false);
  const [showStdModal, setShowStdModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [yearForm, setYearForm] = useState<Partial<AcademicYear>>({ name: '', startDate: '', endDate: '' });
  const [stdForm, setStdForm] = useState<Partial<Standard & { divisionsInput: string }>>({ name: '', order: 1, stage: 'primary', divisionsInput: 'A,B,C' });
  const [subForm, setSubForm] = useState<Partial<Subject>>({ name: '', type: 'core', maxMarks: 100, passMarks: 35, periodsPerWeek: 5 });

  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: academicService.listYears });
  const { data: standards } = useQuery({ queryKey: ['standards'], queryFn: academicService.listStandards });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: academicService.listSubjects });

  const createYear = useMutation({ mutationFn: academicService.createYear, onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-years'] }); setShowYearModal(false); } });
  const activateYear = useMutation({ mutationFn: academicService.activateYear, onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }) });
  const createStd = useMutation({
    mutationFn: (data: Partial<Standard & { divisionsInput: string }>) => {
      const { divisionsInput, ...rest } = data;
      const divisions = (divisionsInput || 'A').split(',').map((d, i) => ({ name: d.trim(), strength: 0 }));
      return academicService.createStandard({ ...rest, divisions });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['standards'] }); setShowStdModal(false); },
  });
  const createSub = useMutation({ mutationFn: academicService.createSubject, onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); setShowSubModal(false); } });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'years', label: 'Academic Years', icon: <Calendar className="w-4 h-4" /> },
    { key: 'standards', label: 'Standards & Divisions', icon: <GraduationCap className="w-4 h-4" /> },
    { key: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const subjectTypeColors: Record<string, 'info' | 'success' | 'warning' | 'purple' | 'default'> = {
    core: 'info', language: 'success', elective: 'warning', co_scholastic: 'default', practical: 'purple', lab: 'purple',
  };

  return (
    <div>
      <PageHeader
        title="Academic Structure"
        description="Manage academic years, standards, divisions and subjects"
        breadcrumb={[{ label: 'Home' }, { label: 'Academics' }]}
        actions={
          tab === 'years' ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowYearModal(true)}>New Year</Button>
          : tab === 'standards' ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowStdModal(true)}>Add Standard</Button>
          : <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowSubModal(true)}>Add Subject</Button>
        }
      />

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'years' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(years?.data || []).map(y => (
            <Card key={y._id} className={y.isActive ? 'border-blue-300 bg-blue-50/50' : ''}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-900">{y.name}</h3>
                {y.isActive ? <Badge variant="success">Active</Badge> : <Badge>Inactive</Badge>}
              </div>
              <p className="text-sm text-gray-500">{new Date(y.startDate).toLocaleDateString('en-IN')} — {new Date(y.endDate).toLocaleDateString('en-IN')}</p>
              <p className="text-xs text-gray-400 mt-1">{y.terms?.length || 0} terms • {y.holidays?.length || 0} holidays</p>
              {!y.isActive && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => activateYear.mutate(y._id)}>Activate</Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'standards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(standards?.data || []).map(s => (
            <Card key={s._id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900 text-lg">{s.name}</h3>
                <Badge variant="info">{s.stage.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.divisions.map(d => (
                  <div key={d.name} className="px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                    <span className="font-medium text-blue-700">Div {d.name}</span>
                    <span className="text-gray-400 ml-1">({d.strength} students)</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'subjects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(subjects?.data || []).map(s => (
            <Card key={s._id} padding="sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{s.name}</h3>
                <Badge variant={subjectTypeColors[s.type] || 'default'}>{s.type}</Badge>
              </div>
              {s.code && <p className="text-xs text-gray-400">Code: {s.code}</p>}
              <div className="flex gap-3 text-xs text-gray-500 mt-2">
                <span>Max: {s.maxMarks}</span>
                <span>Pass: {s.passMarks}</span>
                <span>{s.periodsPerWeek} periods/wk</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Year Modal */}
      <Modal isOpen={showYearModal} onClose={() => setShowYearModal(false)} title="New Academic Year" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowYearModal(false)}>Cancel</Button><Button loading={createYear.isPending} onClick={() => createYear.mutate(yearForm)}>Create</Button></div>}>
        <div className="space-y-4">
          <Input label="Year Name *" value={yearForm.name || ''} onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))} placeholder="2026-27" />
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Start Date" value={yearForm.startDate || ''} onChange={e => setYearForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input type="date" label="End Date" value={yearForm.endDate || ''} onChange={e => setYearForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Standard Modal */}
      <Modal isOpen={showStdModal} onClose={() => setShowStdModal(false)} title="Add Standard" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowStdModal(false)}>Cancel</Button><Button loading={createStd.isPending} onClick={() => createStd.mutate(stdForm)}>Add</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Standard Name *" value={stdForm.name || ''} onChange={e => setStdForm(f => ({ ...f, name: e.target.value }))} placeholder="Class 8" />
            <Input label="Order (for sorting)" type="number" value={stdForm.order || 1} onChange={e => setStdForm(f => ({ ...f, order: +e.target.value }))} />
          </div>
          <Select label="Stage" value={stdForm.stage || 'primary'} onChange={e => setStdForm(f => ({ ...f, stage: e.target.value }))}
            options={[{ value: 'pre_primary', label: 'Pre-Primary' }, { value: 'primary', label: 'Primary' }, { value: 'middle', label: 'Middle' }, { value: 'secondary', label: 'Secondary' }, { value: 'senior_secondary', label: 'Senior Secondary' }]} />
          <Input label="Divisions (comma-separated)" value={stdForm.divisionsInput || ''} onChange={e => setStdForm(f => ({ ...f, divisionsInput: e.target.value }))} placeholder="A, B, C" hint="e.g. A, B, C will create 3 divisions" />
        </div>
      </Modal>

      {/* Subject Modal */}
      <Modal isOpen={showSubModal} onClose={() => setShowSubModal(false)} title="Add Subject" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowSubModal(false)}>Cancel</Button><Button loading={createSub.isPending} onClick={() => createSub.mutate(subForm)}>Add</Button></div>}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Subject Name *" value={subForm.name || ''} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Code" value={subForm.code || ''} onChange={e => setSubForm(f => ({ ...f, code: e.target.value }))} placeholder="MATH-041" />
          <Select label="Type" value={subForm.type || 'core'} onChange={e => setSubForm(f => ({ ...f, type: e.target.value as Subject['type'] }))}
            options={[{ value: 'core', label: 'Core' }, { value: 'language', label: 'Language' }, { value: 'elective', label: 'Elective' }, { value: 'co_scholastic', label: 'Co-Scholastic' }, { value: 'practical', label: 'Practical' }, { value: 'lab', label: 'Lab' }]} />
          <Input label="Max Marks" type="number" value={subForm.maxMarks || 100} onChange={e => setSubForm(f => ({ ...f, maxMarks: +e.target.value }))} />
          <Input label="Pass Marks" type="number" value={subForm.passMarks || 35} onChange={e => setSubForm(f => ({ ...f, passMarks: +e.target.value }))} />
          <Input label="Periods / Week" type="number" value={subForm.periodsPerWeek || 5} onChange={e => setSubForm(f => ({ ...f, periodsPerWeek: +e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
