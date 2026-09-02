import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, GraduationCap, Calendar } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { academicService } from '../../services';
import { SetupFlowBanner } from '../../components/academics/SetupFlowBanner';
import type { Standard, Subject, AcademicYear } from '../../types';

type Tab = 'years' | 'standards' | 'subjects';

const TAB_ROUTES: Record<Tab, string> = {
  years: '/academics/years',
  standards: '/academics/standards',
  subjects: '/academics/subjects',
};

const PATH_TO_TAB: Record<string, Tab> = {
  '/academics': 'years',
  '/academics/years': 'years',
  '/academics/standards': 'standards',
  '/academics/subjects': 'subjects',
};

const STAGE_OPTIONS = [
  { value: 'pre_primary', label: 'Pre-Primary' },
  { value: 'primary', label: 'Primary' },
  { value: 'middle', label: 'Middle' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'senior_secondary', label: 'Senior Secondary' },
];

export default function AcademicsPage() {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = PATH_TO_TAB[location.pathname] || 'years';

  const [showYearModal, setShowYearModal] = useState(false);
  const [showStdModal, setShowStdModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editStd, setEditStd] = useState<Standard | null>(null);
  const [addDivStd, setAddDivStd] = useState<Standard | null>(null);
  const [newDivision, setNewDivision] = useState('');

  const [yearForm, setYearForm] = useState<Partial<AcademicYear>>({ name: '', startDate: '', endDate: '' });
  const [stdForm, setStdForm] = useState<Partial<Standard & { divisionsInput: string }>>({
    name: '', order: 1, stage: 'primary', divisionsInput: 'A, B, C',
  });
  const [editSub, setEditSub] = useState<Subject | null>(null);
  const [mapClassIds, setMapClassIds] = useState<string[]>([]);
  const [subForm, setSubForm] = useState<Partial<Subject>>({
    name: '', type: 'core', maxMarks: 100, passMarks: 35, periodsPerWeek: 5, standardIds: [],
  });

  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: academicService.listYears });
  const { data: standards } = useQuery({ queryKey: ['standards'], queryFn: academicService.listStandards });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: academicService.listSubjects });

  const invalidateStandards = () => qc.invalidateQueries({ queryKey: ['standards'] });

  const createYear = useMutation({
    mutationFn: academicService.createYear,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-years'] }); setShowYearModal(false); },
  });
  const activateYear = useMutation({
    mutationFn: academicService.activateYear,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
  const createStd = useMutation({
    mutationFn: (data: Partial<Standard & { divisionsInput: string }>) => {
      const { divisionsInput, ...rest } = data;
      const divisions = (divisionsInput || 'A').split(',').map((d) => ({ name: d.trim().toUpperCase(), strength: 0 }));
      return academicService.createStandard({ ...rest, divisions });
    },
    onSuccess: () => { invalidateStandards(); setShowStdModal(false); resetStdForm(); },
  });
  const updateStd = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Standard> }) => academicService.updateStandard(id, data),
    onSuccess: () => { invalidateStandards(); setEditStd(null); },
  });
  const deleteStd = useMutation({
    mutationFn: academicService.deleteStandard,
    onSuccess: () => invalidateStandards(),
  });
  const addDivision = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => academicService.addDivision(id, name),
    onSuccess: () => { invalidateStandards(); setAddDivStd(null); setNewDivision(''); },
  });
  const removeDivision = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => academicService.removeDivision(id, name),
    onSuccess: () => invalidateStandards(),
  });
  const createSub = useMutation({
    mutationFn: academicService.createSubject,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); setShowSubModal(false); },
  });
  const updateSub = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subject> }) => academicService.updateSubject(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); setEditSub(null); },
  });

  const resetStdForm = () => setStdForm({ name: '', order: 1, stage: 'primary', divisionsInput: 'A, B, C' });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'years', label: 'Academic Years', icon: <Calendar className="w-4 h-4" /> },
    { key: 'standards', label: 'Classes & Sections', icon: <GraduationCap className="w-4 h-4" /> },
    { key: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const subjectTypeColors: Record<string, 'info' | 'success' | 'warning' | 'purple' | 'default'> = {
    core: 'info', language: 'success', elective: 'warning', co_scholastic: 'default', practical: 'purple', lab: 'purple',
  };

  const standardsList = standards?.data || [];

  return (
    <div>
      <PageHeader
        title={tab === 'standards' ? 'Class & Section Setup' : 'Academic Structure'}
        description={tab === 'standards'
          ? 'Define classes (Nursery → Grade 12) and sections (A, B, C). Plan §9 step 3.'
          : 'Manage academic years, classes, sections and subjects'}
        breadcrumb={[{ label: 'Home' }, { label: 'School Admin' }, { label: tabs.find(t => t.key === tab)?.label || 'Academics' }]}
        actions={
          tab === 'years' ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowYearModal(true)}>New Year</Button>
          : tab === 'standards' ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => { resetStdForm(); setShowStdModal(true); }}>Add Class</Button>
          : <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowSubModal(true)}>Add Subject</Button>
        }
      />

      <SetupFlowBanner currentStep={tab === 'years' ? 'academic_year' : tab === 'standards' ? 'classes_sections' : 'subjects'} />

      {tab === 'standards' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
          <strong>How it works:</strong> Each <em>Class</em> (e.g. Class 8) has one or more <em>Sections</em> (A, B, C).
          When adding students, pick both class and section — they must match this structure.
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => navigate(TAB_ROUTES[t.key])}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
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
              {!y.isActive && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => activateYear.mutate(y._id)}>Activate</Button>
              )}
            </Card>
          ))}
          {(years?.data || []).length === 0 && (
            <Card className="col-span-full text-center py-8 text-gray-400">
              No academic year yet. Create one first — new students will be linked to the active year.
            </Card>
          )}
        </div>
      )}

      {tab === 'standards' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sections</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Students</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Stage</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {standardsList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No classes yet. Add your first class.</td></tr>
              ) : standardsList.map(s => (
                <tr key={s._id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {s.divisions.map(d => (
                        <span key={d.name} className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs">
                          {d.name} ({d.strength}/{d.maxCapacity || 40})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.totalStudents ?? 0}</td>
                  <td className="px-4 py-3"><Badge variant="info">{s.stage.replace(/_/g, ' ')}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAddDivStd(s)}>+ Section</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditStd(s)}>Edit</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Classes: {(s.standardIds?.length
                  ? standardsList.filter(st => s.standardIds?.includes(st._id)).map(st => st.name)
                  : ['All']).join(', ')}
              </p>
              <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => {
                setEditSub(s);
                setMapClassIds(s.standardIds || []);
              }}>Map Classes</Button>
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

      {/* Add Class Modal */}
      <Modal isOpen={showStdModal} onClose={() => setShowStdModal(false)} title="Add Class (Standard)" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowStdModal(false)}>Cancel</Button><Button loading={createStd.isPending} onClick={() => createStd.mutate(stdForm)}>Create Class</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Class Name *" value={stdForm.name || ''} onChange={e => setStdForm(f => ({ ...f, name: e.target.value }))} placeholder="Class 8" hint="e.g. Nursery, Class 1, Class 10" />
            <Input label="Sort Order" type="number" value={stdForm.order || 1} onChange={e => setStdForm(f => ({ ...f, order: +e.target.value }))} hint="Lower = appears first" />
          </div>
          <Select label="Stage" value={stdForm.stage || 'primary'} onChange={e => setStdForm(f => ({ ...f, stage: e.target.value }))} options={STAGE_OPTIONS} />
          <Input label="Sections (comma-separated) *" value={stdForm.divisionsInput || ''} onChange={e => setStdForm(f => ({ ...f, divisionsInput: e.target.value }))} placeholder="A, B, C" hint="Each section can have students assigned separately" />
        </div>
      </Modal>

      {/* Edit Class Modal */}
      <Modal isOpen={!!editStd} onClose={() => setEditStd(null)} title={`Edit ${editStd?.name}`} size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setEditStd(null)}>Cancel</Button><Button loading={updateStd.isPending} onClick={() => editStd && updateStd.mutate({ id: editStd._id, data: { name: editStd.name, order: editStd.order, stage: editStd.stage } })}>Save</Button></div>}>
        {editStd && (
          <div className="space-y-4">
            <Input label="Class Name" value={editStd.name} onChange={e => setEditStd({ ...editStd, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Sort Order" type="number" value={editStd.order} onChange={e => setEditStd({ ...editStd, order: +e.target.value })} />
              <Select label="Stage" value={editStd.stage} onChange={e => setEditStd({ ...editStd, stage: e.target.value })} options={STAGE_OPTIONS} />
            </div>
          </div>
        )}
      </Modal>

      {/* Add Section Modal */}
      <Modal isOpen={!!addDivStd} onClose={() => { setAddDivStd(null); setNewDivision(''); }} title={`Add Section to ${addDivStd?.name}`} size="sm"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setAddDivStd(null)}>Cancel</Button><Button loading={addDivision.isPending} onClick={() => addDivStd && addDivision.mutate({ id: addDivStd._id, name: newDivision })}>Add Section</Button></div>}>
        <Input label="Section Name *" value={newDivision} onChange={e => setNewDivision(e.target.value.toUpperCase())} placeholder="D" hint="Usually A, B, C, D..." />
      </Modal>

      {/* Map Subject to Classes */}
      <Modal isOpen={!!editSub} onClose={() => setEditSub(null)} title={`Map Classes — ${editSub?.name}`} size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setEditSub(null)}>Cancel</Button><Button loading={updateSub.isPending} onClick={() => editSub && updateSub.mutate({ id: editSub._id, data: { standardIds: mapClassIds } })}>Save Mapping</Button></div>}>
        <p className="text-sm text-gray-600 mb-3">Select which classes teach this subject.</p>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {standardsList.map(st => (
            <label key={st._id} className="flex items-center gap-2 text-sm p-2 border rounded-lg cursor-pointer">
              <input type="checkbox" checked={mapClassIds.includes(st._id)} onChange={(e) => {
                setMapClassIds(prev => e.target.checked ? [...prev, st._id] : prev.filter(id => id !== st._id));
              }} />
              {st.name}
            </label>
          ))}
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
        </div>
      </Modal>
    </div>
  );
}
