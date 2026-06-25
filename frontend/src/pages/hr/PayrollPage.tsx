import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';

type Payroll = {
  _id: string; month: number; year: number; status: string;
  staffId?: { name: string; employeeId: string; designation: string; department: string; bankAccount?: { number: string; ifsc: string; bank: string } };
  earnings: { basic: number; da: number; hra: number; ta: number; specialAllowance: number; bonus: number; total: number };
  deductions: { pf: number; esic: number; professionalTax: number; tds: number; lop: number; total: number };
  netSalary: number; daysWorked: number; lopDays: number;
};

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function SalarySlipModal({ payroll, onClose }: { payroll: Payroll; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Salary Slip — {MONTHS[payroll.month]} {payroll.year}</h2>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="btn-secondary text-sm">🖨️ Print</button>
              <button onClick={onClose} className="btn-secondary text-sm">Close</button>
            </div>
          </div>

          <div id="salary-slip" className="border rounded-lg p-5 space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-semibold text-gray-800">{payroll.staffId?.name}</h3>
              <div className="text-sm text-gray-500 grid grid-cols-2 gap-1 mt-1">
                <span>Employee ID: {payroll.staffId?.employeeId}</span>
                <span>Designation: {payroll.staffId?.designation}</span>
                <span>Department: {payroll.staffId?.department}</span>
                <span>Days Worked: {payroll.daysWorked} / LOP: {payroll.lopDays}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Earnings</h4>
                <table className="w-full text-sm">
                  <tbody className="space-y-1">
                    {Object.entries({ 'Basic Salary': payroll.earnings.basic, 'DA': payroll.earnings.da, 'HRA': payroll.earnings.hra, 'Transport Allowance': payroll.earnings.ta, 'Special Allowance': payroll.earnings.specialAllowance, 'Bonus': payroll.earnings.bonus }).map(([k, v]) => (
                      v > 0 ? <tr key={k}><td className="text-gray-600">{k}</td><td className="text-right font-medium">₹{v.toLocaleString('en-IN')}</td></tr> : null
                    ))}
                    <tr className="border-t font-bold text-green-700"><td>Gross Earnings</td><td className="text-right">₹{payroll.earnings.total.toLocaleString('en-IN')}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold text-red-600 mb-2">Deductions</h4>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries({ 'Provident Fund (PF)': payroll.deductions.pf, 'ESIC': payroll.deductions.esic, 'Professional Tax': payroll.deductions.professionalTax, 'TDS': payroll.deductions.tds, 'LOP Deduction': payroll.deductions.lop }).map(([k, v]) => (
                      v > 0 ? <tr key={k}><td className="text-gray-600">{k}</td><td className="text-right font-medium">₹{v.toLocaleString('en-IN')}</td></tr> : null
                    ))}
                    <tr className="border-t font-bold text-red-600"><td>Total Deductions</td><td className="text-right">₹{payroll.deductions.total.toLocaleString('en-IN')}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">₹{payroll.netSalary.toLocaleString('en-IN')}</div>
              <div className="text-sm text-gray-500">Net Salary (in words: {numberToWords(payroll.netSalary)} Rupees Only)</div>
            </div>

            {payroll.staffId?.bankAccount && (
              <div className="text-sm text-gray-500">
                Bank: {payroll.staffId.bankAccount.bank} | A/C: {payroll.staffId.bankAccount.number} | IFSC: {payroll.staffId.bankAccount.ifsc}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
  if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
  if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '');
  return String(n);
}

export default function PayrollPage() {
  const qc = useQueryClient();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [viewSlip, setViewSlip] = useState<Payroll | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', month, year, page],
    queryFn: () => axios.get(`/payroll?month=${month}&year=${year}&page=${page}&limit=25`).then(r => r.data),
  });
  const payrolls: Payroll[] = Array.isArray(data?.data) ? data.data : data?.data?.payrolls || [];

  const { data: stats } = useQuery({
    queryKey: ['payroll-stats', month, year],
    queryFn: () => axios.get(`/payroll/stats?month=${month}&year=${year}`).then(r => r.data.data),
  });

  const processMonth = useMutation({
    mutationFn: () => axios.post('/payroll/process-month', { month, year, workingDays: 26 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const totalGross = payrolls.reduce((s, p) => s + p.earnings.total, 0);
  const draftCount = payrolls.filter(p => p.status === 'draft').length;
  const paidCount = payrolls.filter(p => p.status === 'paid').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Processing</h1>
          <p className="text-sm text-gray-500">Process monthly salaries, generate slips, and mark payments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.open(`/api/reports/payroll/export?month=${month}&year=${year}`, '_blank')} className="btn-secondary">📥 Export</button>
          <button onClick={() => processMonth.mutate()} disabled={processMonth.isPending} className="btn-primary">
            {processMonth.isPending ? '⏳ Processing...' : '⚙️ Process Month'}
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="flex gap-3 items-center">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="input-field w-36">
          {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="input-field w-28">
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-gray-500">Payroll for <strong>{MONTHS[month]} {year}</strong></span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{payrolls.length}</div><div className="text-xs text-gray-500">Total Staff</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">₹{totalGross.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Gross Salary</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-600">₹{totalNet.toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Net Payable</div></div>
        <div className="card p-4 text-center"><div className={`text-2xl font-bold ${paidCount === payrolls.length && payrolls.length > 0 ? 'text-green-600' : 'text-orange-500'}`}>{paidCount}/{payrolls.length}</div><div className="text-xs text-gray-500">Paid</div></div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-center">Days</th>
              <th className="px-4 py-3 text-right">Gross</th>
              <th className="px-4 py-3 text-right">Deductions</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Slip</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
            ) : payrolls.map(p => (
              <tr key={p._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.staffId?.name}<div className="text-xs text-gray-400">{p.staffId?.employeeId}</div></td>
                <td className="px-4 py-3 text-gray-500 capitalize">{p.staffId?.department}</td>
                <td className="px-4 py-3 text-center">{p.daysWorked}<span className="text-red-400 text-xs"> (-{p.lopDays})</span></td>
                <td className="px-4 py-3 text-right">₹{p.earnings.total.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-red-500">₹{p.deductions.total.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700">₹{p.netSalary.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'processed' ? 'badge-blue' : 'badge-yellow'}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setViewSlip(p)} className="text-blue-500 hover:text-blue-700 text-xs">📄 View</button>
                </td>
              </tr>
            ))}
            {!isLoading && payrolls.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-gray-400">No payroll data. Click "Process Month" to generate.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewSlip && <SalarySlipModal payroll={viewSlip} onClose={() => setViewSlip(null)} />}
    </div>
  );
}
