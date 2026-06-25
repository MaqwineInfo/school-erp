import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type SmsLog = { _id: string; type: string; message: string; audience: string; totalCount: number; sentCount: number; failedCount: number; status: string; sentBy?: { name: string }; createdAt: string };

const TEMPLATES = [
  { label: 'Fee Reminder', text: 'Dear Parent, Fee of {amount} for {student} is due on {date}. Please pay at the earliest. Regards, {school}' },
  { label: 'Attendance Alert', text: 'Dear Parent, {student} was absent on {date}. If absent due to health, kindly inform school. Regards, {school}' },
  { label: 'Exam Result', text: 'Dear Parent, {student} scored {marks}/{total} in {exam}. Report card available at school. Regards, {school}' },
  { label: 'PTM Notice', text: 'Dear Parent, Parent-Teacher Meeting is scheduled on {date} at {time}. Please attend. Regards, {school}' },
  { label: 'Holiday Notice', text: 'Dear Parent, School will remain closed on {date} due to {reason}. Regards, {school}' },
  { label: 'Event Reminder', text: 'Dear Parent, {event} is scheduled on {date}. Your child should report by {time}. Regards, {school}' },
];

export default function SMSPage() {
  const qc = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: { type: 'sms', audience: 'all_parents', message: '' } });
  const messageLength = watch('message')?.length || 0;

  const { data, isLoading } = useQuery({
    queryKey: ['sms-logs'],
    queryFn: () => axios.get('/sms').then(r => r.data.data),
  });
  const logs: SmsLog[] = Array.isArray(data) ? data : data?.items || [];

  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => axios.get('/sms/stats').then(r => r.data.data),
  });

  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => axios.get('/academics/standards').then(r => r.data.data) });

  const send = useMutation({
    mutationFn: (d: object) => axios.post('/sms/send', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sms-logs', 'sms-stats'] }); setShowCompose(false); reset(); },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMS & WhatsApp</h1>
          <p className="text-sm text-gray-500">Send bulk SMS and WhatsApp messages to parents and staff</p>
        </div>
        <button onClick={() => setShowCompose(true)} className="btn-primary">📤 Compose Message</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{stats?.today || 0}</div><div className="text-xs text-gray-500">Sent Today</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats?.month || 0}</div><div className="text-xs text-gray-500">This Month</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-purple-600">{(stats?.byType || []).find((t: { _id: string }) => t._id === 'whatsapp')?.count || 0}</div><div className="text-xs text-gray-500">WhatsApp</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-600">{logs.length}</div><div className="text-xs text-gray-500">Total Campaigns</div></div>
      </div>

      {/* Message Log */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">Message History</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Message</th>
              <th className="px-4 py-3 text-left">Audience</th>
              <th className="px-4 py-3 text-center">Recipients</th>
              <th className="px-4 py-3 text-center">Sent</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Sent By</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
              logs.map(l => (
                <tr key={l._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3"><span className={`badge ${l.type === 'whatsapp' ? 'badge-green' : l.type === 'email' ? 'badge-blue' : 'badge-gray'}`}>{l.type.toUpperCase()}</span></td>
                  <td className="px-4 py-3 max-w-xs truncate">{l.message}</td>
                  <td className="px-4 py-3 capitalize text-gray-500">{l.audience?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-center">{l.totalCount}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-semibold">{l.sentCount}</td>
                  <td className="px-4 py-3"><span className={`badge ${l.status === 'sent' ? 'badge-green' : l.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>{l.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{l.sentBy?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))
            }
            {!isLoading && logs.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No messages sent yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit(d => send.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold">Compose Message</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Channel</label>
                <select {...register('type')} className="input-field">
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Send To</label>
                <select {...register('audience')} className="input-field">
                  <option value="all_parents">All Parents</option>
                  <option value="all_staff">All Staff</option>
                  <option value="class_parents">Class Parents</option>
                </select>
              </div>
            </div>

            {/* Template Picker */}
            <div>
              <label className="block text-sm font-medium mb-1">Quick Templates</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.label} type="button" onClick={() => setValue('message', t.text)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100">{t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message *</label>
              <textarea {...register('message', { required: true })} rows={4} className="input-field" placeholder="Type your message..." />
              <div className="text-xs text-gray-400 mt-1 text-right">{messageLength} chars</div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCompose(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={send.isPending} className="btn-primary flex-1">{send.isPending ? 'Sending...' : '📤 Send Now'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
