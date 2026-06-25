import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Demand = { _id: string; studentId?: { name: string; admissionNo: string; standardId?: { name: string } }; installmentName: string; totalAmount: number; concession: number; totalDue: number; status: string; academicYearId?: { name: string } };

export default function FeeConcessionPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Demand | null>(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['fee-demands-concession', search],
    queryFn: () => axios.get(`/fees/demands?limit=50${search ? `&search=${search}` : ''}`).then(r => r.data.data),
  });
  const demands: Demand[] = Array.isArray(data) ? data : data?.demands || [];

  const applyConcession = useMutation({
    mutationFn: ({ id, concessionAmount, reason }: { id: string; concessionAmount: number; reason: string }) =>
      axios.patch(`/fees/demands/${id}/concession`, { concessionAmount, reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-demands-concession'] }); setShowModal(false); setSelected(null); reset(); },
  });

  const totalConcession = demands.reduce((s, d) => s + (d.concession || 0), 0);
  const studentsWithConcession = demands.filter(d => d.concession > 0).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Concessions</h1>
          <p className="text-sm text-gray-500">Manage fee waivers, discounts, and scholarships</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border-l-4 border-blue-400"><div className="text-2xl font-bold text-blue-700">{studentsWithConcession}</div><div className="text-xs text-gray-500">Students with Concession</div></div>
        <div className="card p-4 text-center border-l-4 border-green-400"><div className="text-2xl font-bold text-green-600">₹{totalConcession.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Total Concession Granted</div></div>
        <div className="card p-4 text-center border-l-4 border-orange-400"><div className="text-2xl font-bold text-orange-600">{demands.length}</div><div className="text-xs text-gray-500">Total Demands</div></div>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="input-field w-64" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Installment</th>
              <th className="px-4 py-3 text-right">Total Fee</th>
              <th className="px-4 py-3 text-right">Concession</th>
              <th className="px-4 py-3 text-right">Due Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
              demands.map(d => (
                <tr key={d._id} className={`border-t hover:bg-gray-50 ${d.concession > 0 ? 'bg-green-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium">{d.studentId?.name}<div className="text-xs text-gray-400">{d.studentId?.admissionNo}</div></td>
                  <td className="px-4 py-3 text-gray-500">{d.studentId?.standardId?.name}</td>
                  <td className="px-4 py-3">{d.installmentName}</td>
                  <td className="px-4 py-3 text-right">₹{d.totalAmount?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">{d.concession > 0 ? `₹${d.concession.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{d.totalDue?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><span className={`badge ${d.status === 'paid' ? 'badge-green' : d.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>{d.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => { setSelected(d); reset({ concessionAmount: d.concession }); setShowModal(true); }} className="text-blue-500 text-xs">Edit Concession</button>
                  </td>
                </tr>
              ))
            }
            {!isLoading && demands.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No fee demands found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => applyConcession.mutate({ id: selected._id, ...d }))} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Apply Concession</h2>
            <div className="text-sm text-gray-500">
              <div><strong>Student:</strong> {selected.studentId?.name}</div>
              <div><strong>Installment:</strong> {selected.installmentName}</div>
              <div><strong>Total Fee:</strong> ₹{selected.totalAmount?.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Concession Amount (₹)</label>
              <input {...register('concessionAmount', { required: true, valueAsNumber: true, min: 0, max: selected.totalAmount })} type="number" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea {...register('reason')} rows={2} className="input-field" placeholder="e.g. Sibling discount, scholarship, RTE" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); setSelected(null); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={applyConcession.isPending} className="btn-primary flex-1">Apply</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
