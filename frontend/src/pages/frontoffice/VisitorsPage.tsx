import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Visitor = { _id: string; name: string; phone?: string; purpose?: string; toMeet?: string; idProofType?: string; gatePassNo: string; checkIn: string; checkOut?: string; studentId?: { name: string; admissionNo: string } };

const ID_LABELS: Record<string, string> = { aadhaar: 'Aadhaar', pan: 'PAN', driving_license: 'Driving License', passport: 'Passport', voter_id: 'Voter ID', other: 'Other' };

export default function VisitorsPage() {
  const qc = useQueryClient();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', date],
    queryFn: () => axios.get(`/visitors?date=${date}`).then(r => r.data.data),
  });
  const visitors: Visitor[] = data?.items || [];
  const stats = data?.stats || {};

  const checkIn = useMutation({
    mutationFn: (d: object) => axios.post('/visitors/check-in', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visitors'] }); setShowCheckIn(false); reset(); },
  });

  const checkOut = useMutation({
    mutationFn: (id: string) => axios.patch(`/visitors/${id}/check-out`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitors'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitor Management</h1>
          <p className="text-sm text-gray-500">Manage school gate pass and visitor register</p>
        </div>
        <button onClick={() => setShowCheckIn(true)} className="btn-primary">+ Check In Visitor</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{stats.todayIn || 0}</div><div className="text-xs text-gray-500">Today's Visitors</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.currentlyIn || 0}</div><div className="text-xs text-gray-500">Currently Inside</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-500">{stats.todayOut || 0}</div><div className="text-xs text-gray-500">Checked Out</div></div>
      </div>

      {/* Date Filter */}
      <div className="flex gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-44" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Gate Pass</th>
              <th className="px-4 py-3 text-left">Visitor Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Purpose</th>
              <th className="px-4 py-3 text-left">To Meet</th>
              <th className="px-4 py-3 text-left">ID Proof</th>
              <th className="px-4 py-3 text-left">Check In</th>
              <th className="px-4 py-3 text-left">Check Out</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
            ) : visitors.map(v => (
              <tr key={v._id} className={`border-t ${!v.checkOut ? 'bg-green-50/30' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">{v.gatePassNo}</td>
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3">{v.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{v.purpose || '—'}</td>
                <td className="px-4 py-3">{v.toMeet || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{v.idProofType ? ID_LABELS[v.idProofType] : '—'}</td>
                <td className="px-4 py-3">{new Date(v.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-4 py-3">{v.checkOut ? new Date(v.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge-green">In</span>}</td>
                <td className="px-4 py-3 text-center">
                  {!v.checkOut && (
                    <button onClick={() => { if (confirm('Check out this visitor?')) checkOut.mutate(v._id); }} className="btn-danger text-xs py-1 px-2">Check Out</button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && visitors.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-gray-400">No visitors for this date</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Check In Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => checkIn.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Visitor Check In</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Visitor Name *</label>
              <input {...register('name', { required: true })} className="input-field" placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input {...register('phone')} className="input-field" placeholder="Mobile number" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Meet</label>
                <input {...register('toMeet')} className="input-field" placeholder="Person to meet" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID Proof</label>
                <select {...register('idProofType')} className="input-field">
                  <option value="">Select</option>
                  {Object.entries(ID_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID Number</label>
                <input {...register('idProofNo')} className="input-field" placeholder="ID number" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purpose of Visit</label>
              <input {...register('purpose')} className="input-field" placeholder="e.g. Parent meeting, Admission enquiry" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCheckIn(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={checkIn.isPending} className="btn-primary flex-1">{checkIn.isPending ? 'Checking In...' : '✅ Check In & Issue Gate Pass'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
