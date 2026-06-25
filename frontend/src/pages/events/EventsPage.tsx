import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Event = { _id: string; title: string; description?: string; type: string; startDate: string; endDate?: string; allDay?: boolean; venue?: string; audience: string; color?: string; isPublished: boolean; createdBy?: { name: string } };

const TYPE_LABELS: Record<string, string> = { holiday: '🏖️ Holiday', exam: '📝 Exam', event: '🎉 Event', meeting: '👥 Meeting', sports: '⚽ Sports', cultural: '🎭 Cultural', academic: '📚 Academic', other: '📌 Other' };
const TYPE_COLORS: Record<string, string> = { holiday: 'bg-orange-100 text-orange-700', exam: 'bg-red-100 text-red-700', event: 'bg-blue-100 text-blue-700', meeting: 'bg-purple-100 text-purple-700', sports: 'bg-green-100 text-green-700', cultural: 'bg-pink-100 text-pink-700', academic: 'bg-indigo-100 text-indigo-700', other: 'bg-gray-100 text-gray-600' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function EventsPage() {
  const qc = useQueryClient();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [filterType, setFilterType] = useState('');
  const { register, handleSubmit, reset } = useForm();

  const from = new Date(year, month, 1).toISOString().split('T')[0];
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['events', from, to, filterType],
    queryFn: () => axios.get(`/events?from=${from}&to=${to}${filterType ? `&type=${filterType}` : ''}`).then(r => r.data.data),
  });
  const events: Event[] = Array.isArray(data) ? data : [];

  const save = useMutation({
    mutationFn: (d: object) => editing ? axios.put(`/events/${editing._id}`, d) : axios.post('/events', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setShowModal(false); setEditing(null); reset(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => axios.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });

  // Build calendar days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const getEventsForDay = (day: number) => {
    const d = new Date(year, month, day);
    return events.filter(e => {
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : start;
      return d >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && d <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
    });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events & Academic Calendar</h1>
          <p className="text-sm text-gray-500">Manage holidays, exams, events and school activities</p>
        </div>
        <button onClick={() => { setEditing(null); reset({}); setShowModal(true); }} className="btn-primary">+ Add Event</button>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }} className="btn-secondary">←</button>
        <h2 className="text-lg font-bold w-48 text-center">{MONTHS[month]} {year}</h2>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }} className="btn-secondary">→</button>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-44 ml-4">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {['holiday', 'exam', 'event', 'meeting'].map(t => (
          <div key={t} className="card p-3 text-center">
            <div className="text-xl font-bold">{events.filter(e => e.type === t).length}</div>
            <div className="text-xs text-gray-500">{TYPE_LABELS[t]}</div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50" />)}
          {calDays.map(day => {
            const dayEvents = getEventsForDay(day);
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div key={day} className={`min-h-[80px] border-b border-r border-gray-100 p-1 ${isToday ? 'bg-blue-50' : ''}`}>
                <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>{day}</div>
                {dayEvents.slice(0, 2).map(e => (
                  <div key={e._id} className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer ${TYPE_COLORS[e.type]}`} title={e.title}>{e.title}</div>
                ))}
                {dayEvents.length > 2 && <div className="text-xs text-gray-400">+{dayEvents.length - 2} more</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* List View */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">All Events This Month ({events.length})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Audience</th><th className="px-4 py-2 text-left">Venue</th><th className="px-4 py-2 text-center">Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
              events.map(e => (
                <tr key={e._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{e.title}</td>
                  <td className="px-4 py-2"><span className={`badge ${TYPE_COLORS[e.type]}`}>{TYPE_LABELS[e.type]}</span></td>
                  <td className="px-4 py-2">{new Date(e.startDate).toLocaleDateString('en-IN')}{e.endDate && e.endDate !== e.startDate ? ` – ${new Date(e.endDate).toLocaleDateString('en-IN')}` : ''}</td>
                  <td className="px-4 py-2 capitalize">{e.audience}</td>
                  <td className="px-4 py-2 text-gray-500">{e.venue || '—'}</td>
                  <td className="px-4 py-2 text-center flex gap-2 justify-center">
                    <button onClick={() => { setEditing(e); reset(e); setShowModal(true); }} className="text-blue-500 text-xs">Edit</button>
                    <button onClick={() => { if (confirm('Delete?')) remove.mutate(e._id); }} className="text-red-400 text-xs">Delete</button>
                  </td>
                </tr>
              ))
            }
            {!isLoading && events.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No events this month</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold">{editing ? 'Edit' : 'Add'} Event</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input {...register('title', { required: true })} className="input-field" placeholder="Event title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select {...register('type')} className="input-field">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Audience</label>
                <select {...register('audience')} className="input-field">
                  <option value="all">All</option>
                  <option value="students">Students</option>
                  <option value="staff">Staff</option>
                  <option value="parents">Parents</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <input {...register('startDate', { required: true })} type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input {...register('endDate')} type="date" className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Venue</label>
                <input {...register('venue')} className="input-field" placeholder="e.g. School ground, Auditorium" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea {...register('description')} rows={2} className="input-field" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); setEditing(null); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
