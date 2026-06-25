import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, IndianRupee, Receipt, Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { feeService } from '../../services';
import type { FeePayment } from '../../types';

const methodOptions = [
  { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' }, { value: 'neft', label: 'NEFT/RTGS' },
  { value: 'card', label: 'Card' }, { value: 'net_banking', label: 'Net Banking' },
];

export default function FeeCollectionPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [payForm, setPayForm] = useState({ studentId: '', amount: 0, method: 'cash', remarks: '' });
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fee-payments', search],
    queryFn: () => feeService.listPayments(),
  });

  const collectMutation = useMutation({
    mutationFn: feeService.collectPayment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-payments'] }); setShowModal(false); setPayForm({ studentId: '', amount: 0, method: 'cash', remarks: '' }); },
  });

  const payments = data?.data || [];

  const columns = [
    { key: 'receiptNo', header: 'Receipt No.', render: (p: FeePayment) => <span className="font-mono text-xs text-blue-600">{p.receiptNo}</span> },
    { key: 'student', header: 'Student', render: (p: FeePayment) => (
      <div>
        <p className="font-medium">{typeof p.studentId === 'object' ? (p.studentId as { name: string }).name : '—'}</p>
        <p className="text-xs text-gray-400">{typeof p.studentId === 'object' ? (p.studentId as { admissionNo: string }).admissionNo : ''}</p>
      </div>
    )},
    { key: 'amount', header: 'Amount', render: (p: FeePayment) => <span className="font-semibold text-green-700">₹{p.amount.toLocaleString('en-IN')}</span> },
    { key: 'method', header: 'Method', render: (p: FeePayment) => <Badge variant="info">{p.method?.toUpperCase()}</Badge> },
    { key: 'paidAt', header: 'Date', render: (p: FeePayment) => new Date(p.paidAt).toLocaleDateString('en-IN') },
    { key: 'collectedBy', header: 'Collected By', render: (p: FeePayment) => typeof p.collectedBy === 'object' && p.collectedBy ? (p.collectedBy as { name: string }).name : '—' },
  ];

  const totalToday = payments.filter(p => new Date(p.paidAt).toDateString() === new Date().toDateString()).reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader
        title="Fee Collections"
        description="View and manage fee payments"
        breadcrumb={[{ label: 'Home' }, { label: 'Fee Management' }, { label: 'Collections' }]}
        actions={
          <>
            <Button variant="outline" icon={<Receipt className="w-4 h-4" />}>Export</Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Collect Fee</Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Today's Collection</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{totalToday.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Collected</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₹{payments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by receipt no..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <Table columns={columns} data={payments} loading={isLoading} emptyMessage="No payments found" />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Collect Fee Payment"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={collectMutation.isPending} icon={<IndianRupee className="w-4 h-4" />} onClick={() => collectMutation.mutate(payForm)}>
              Collect ₹{(payForm.amount || 0).toLocaleString('en-IN')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Student ID *" value={payForm.studentId} onChange={e => setPayForm(f => ({ ...f, studentId: e.target.value }))} placeholder="Enter student ID" />
          <Input label="Amount (₹) *" type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: +e.target.value }))} />
          <Select label="Payment Method" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} options={methodOptions} />
          <Input label="Remarks" value={payForm.remarks} onChange={e => setPayForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional notes" />
        </div>
      </Modal>
    </div>
  );
}
