import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const PERIOD_TIMES = ['8:00–8:45', '8:45–9:30', '9:30–10:15', '10:15–10:30 (Recess)', '10:30–11:15', '11:15–12:00', '12:00–12:45', '12:45–1:30'];

type Slot = { dayOfWeek: number; periodNo: number; type: string; subjectId?: { _id: string; name: string }; teacherId?: { _id: string; name: string }; startTime?: string; endTime?: string; room?: string };

function SlotCell({ slot, onClick }: { slot?: Slot; onClick: () => void }) {
  if (!slot || slot.type === 'free') {
    return (
      <button onClick={onClick} className="w-full h-16 border-2 border-dashed border-gray-200 rounded-lg text-gray-300 hover:border-blue-300 hover:text-blue-400 text-xs transition-colors flex items-center justify-center">
        + Add
      </button>
    );
  }
  if (slot.type === 'recess' || slot.type === 'lunch') {
    return <div className="w-full h-16 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center text-xs text-amber-600 font-medium capitalize">{slot.type}</div>;
  }
  return (
    <button onClick={onClick} className="w-full h-16 bg-blue-50 border border-blue-200 rounded-lg p-2 text-left hover:bg-blue-100 transition-colors">
      <div className="text-xs font-semibold text-blue-800 truncate">{slot.subjectId?.name || '—'}</div>
      <div className="text-xs text-blue-500 truncate">{slot.teacherId?.name || '—'}</div>
    </button>
  );
}

export default function TimetablePage() {
  const qc = useQueryClient();
  const [standardId, setStandardId] = useState('');
  const [divisionName, setDivisionName] = useState('A');
  const [editSlot, setEditSlot] = useState<{ day: number; period: number } | null>(null);
  const [slotForm, setSlotForm] = useState({ type: 'subject', subjectId: '', teacherId: '', room: '' });

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => axios.get('/academics/standards').then(r => r.data.data),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => axios.get('/academics/subjects').then(r => r.data.data),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => axios.get('/hr/staff').then(r => r.data.data),
  });

  const { data: timetable } = useQuery({
    queryKey: ['timetable', standardId, divisionName],
    queryFn: () => axios.get(`/timetable/class?standardId=${standardId}&divisionName=${divisionName}`).then(r => r.data.data),
    enabled: !!standardId,
  });

  const academicYearId = useQuery({ queryKey: ['academic-year'], queryFn: () => axios.get('/academics/years').then(r => r.data.data?.[0]?._id) }).data;

  const updateSlot = useMutation({
    mutationFn: (slot: object) => axios.post('/timetable/slot', { standardId, divisionName, academicYearId, slot }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timetable'] }); setEditSlot(null); },
  });

  const slots: Slot[] = timetable?.slots || [];
  const getSlot = (day: number, period: number) => slots.find(s => s.dayOfWeek === day && s.periodNo === period);

  const selectedStandard = Array.isArray(standards) ? standards.find((s: { _id: string }) => s._id === standardId) : null;
  const divisions: string[] = selectedStandard?.divisions?.map((d: { name: string }) => d.name) || [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage weekly class timetables</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={standardId} onChange={e => setStandardId(e.target.value)} className="input-field w-48">
          <option value="">Select Class</option>
          {(Array.isArray(standards) ? standards : []).map((s: { _id: string; name: string }) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
        <select value={divisionName} onChange={e => setDivisionName(e.target.value)} className="input-field w-32" disabled={!standardId}>
          {divisions.map((d: string) => <option key={d} value={d}>Division {d}</option>)}
        </select>
      </div>

      {!standardId ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🗓️</div>
          <p>Select a class and division to view or edit the timetable</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 w-28">Period / Day</th>
                  {DAYS.map(d => <th key={d} className="px-3 py-3 text-center text-xs font-medium text-gray-700">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period} className="border-b">
                    <td className="px-3 py-2">
                      <div className="text-xs font-semibold text-gray-700">P{period}</div>
                      <div className="text-xs text-gray-400">{PERIOD_TIMES[period - 1]}</div>
                    </td>
                    {DAYS.map((_, dayIdx) => (
                      <td key={dayIdx} className="px-2 py-2">
                        <SlotCell
                          slot={getSlot(dayIdx, period)}
                          onClick={() => { setEditSlot({ day: dayIdx, period }); const s = getSlot(dayIdx, period); setSlotForm({ type: s?.type || 'subject', subjectId: s?.subjectId?._id || '', teacherId: s?.teacherId?._id || '', room: s?.room || '' }); }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Edit Slot — {DAYS[editSlot.day]}, Period {editSlot.period}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={slotForm.type} onChange={e => setSlotForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                  <option value="subject">Subject</option>
                  <option value="recess">Recess</option>
                  <option value="lunch">Lunch</option>
                  <option value="assembly">Assembly</option>
                  <option value="free">Free Period</option>
                  <option value="pt">PT / Sports</option>
                </select>
              </div>
              {slotForm.type === 'subject' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select value={slotForm.subjectId} onChange={e => setSlotForm(f => ({ ...f, subjectId: e.target.value }))} className="input-field">
                      <option value="">Select Subject</option>
                      {(Array.isArray(subjects) ? subjects : []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                    <select value={slotForm.teacherId} onChange={e => setSlotForm(f => ({ ...f, teacherId: e.target.value }))} className="input-field">
                      <option value="">Select Teacher</option>
                      {(Array.isArray(staff) ? staff : staff?.staff || []).map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                    <input value={slotForm.room} onChange={e => setSlotForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. Room 101" className="input-field" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditSlot(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => updateSlot.mutate({ dayOfWeek: editSlot.day, periodNo: editSlot.period, type: slotForm.type, subjectId: slotForm.subjectId || undefined, teacherId: slotForm.teacherId || undefined, room: slotForm.room || undefined })}
                disabled={updateSlot.isPending} className="btn-primary flex-1">
                {updateSlot.isPending ? 'Saving...' : 'Save Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
