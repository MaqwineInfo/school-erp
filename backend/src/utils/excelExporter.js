const ExcelJS = require('exceljs');

const BRAND_COLOR = '1a56db';
const HEADER_BG = 'EFF6FF';
const ALT_ROW = 'F8FAFC';

function applyHeaderStyle(worksheet, rowNumber = 1) {
  const row = worksheet.getRow(rowNumber);
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, size: 10, color: { argb: '1E3A5F' } };
    cell.border = { bottom: { style: 'medium', color: { argb: BRAND_COLOR } } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  row.height = 22;
}

function addSchoolHeader(worksheet, tenantName, reportTitle) {
  worksheet.mergeCells('A1:Z1');
  worksheet.getCell('A1').value = tenantName;
  worksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: BRAND_COLOR } };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:Z2');
  worksheet.getCell('A2').value = reportTitle;
  worksheet.getCell('A2').font = { bold: true, size: 11 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
}

// ─────────────────────────────────────────────
// Students List Export
// ─────────────────────────────────────────────
async function exportStudents({ students, tenantName }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'School ERP';
  const ws = wb.addWorksheet('Students', { views: [{ state: 'frozen', ySplit: 4 }] });

  addSchoolHeader(ws, tenantName, 'Student Master List');
  ws.addRow([]); // blank spacer row

  const headers = ['#', 'Admission No', 'Name', 'Class', 'Division', 'Gender', 'Date of Birth', 'Blood Group', 'Father Name', 'Mother Name', 'Phone', 'Category', 'RTE', 'Aadhar No', 'Admission Date', 'Status'];
  ws.addRow(headers);
  applyHeaderStyle(ws, 4);

  students.forEach((s, i) => {
    const row = ws.addRow([
      i + 1, s.admissionNo, s.name, s.standardName, s.divisionName, s.gender,
      s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '',
      s.bloodGroup, s.fatherName, s.motherName, s.phone, s.category,
      s.rteAdmission ? 'Yes' : 'No', s.aadharNo,
      s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN') : '',
      s.status,
    ]);
    if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_ROW } };
  });

  ws.columns.forEach(col => { col.width = 16; });
  ws.getColumn(3).width = 24; // Name column wider
  ws.autoFilter = { from: 'A4', to: `P4` };

  return wb.xlsx.writeBuffer();
}

// ─────────────────────────────────────────────
// Fee Collection Report Export
// ─────────────────────────────────────────────
async function exportFeeCollection({ payments, tenantName, dateRange }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Fee Collection', { views: [{ state: 'frozen', ySplit: 4 }] });

  addSchoolHeader(ws, tenantName, `Fee Collection Report (${dateRange})`);
  ws.addRow([]);

  const headers = ['#', 'Receipt No', 'Date', 'Student Name', 'Adm No', 'Class', 'Fee Head', 'Amount (₹)', 'Mode', 'Transaction ID', 'Status', 'Collected By'];
  ws.addRow(headers);
  applyHeaderStyle(ws, 4);

  let total = 0;
  payments.forEach((p, i) => {
    total += p.amount || 0;
    const row = ws.addRow([
      i + 1, p.receiptNo, p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '',
      p.studentName, p.admissionNo, p.class, p.feeHead,
      p.amount, p.method, p.transactionId || '-', p.status, p.collectedBy,
    ]);
    if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_ROW } };
  });

  ws.addRow([]);
  const totalRow = ws.addRow(['', '', '', '', '', '', 'TOTAL', total, '', '', '', '']);
  totalRow.getCell(7).font = { bold: true };
  totalRow.getCell(8).font = { bold: true, color: { argb: '16a34a' } };

  ws.columns.forEach(col => { col.width = 16; });
  ws.autoFilter = { from: 'A4', to: 'L4' };

  return wb.xlsx.writeBuffer();
}

// ─────────────────────────────────────────────
// Attendance Report Export
// ─────────────────────────────────────────────
async function exportAttendance({ records, students, month, year, tenantName }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance', { views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }] });
  const daysInMonth = new Date(year, month, 0).getDate();

  addSchoolHeader(ws, tenantName, `Attendance Report — ${new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`);
  ws.addRow([]);

  const headers = ['#', 'Adm No', 'Student Name', ...Array.from({ length: daysInMonth }, (_, i) => i + 1), 'Present', 'Absent', '%'];
  ws.addRow(headers);
  applyHeaderStyle(ws, 4);

  students.forEach((s, idx) => {
    const studentRecords = records.filter(r => String(r.studentId) === String(s._id));
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const rec = studentRecords.find(r => new Date(r.date).getDate() === i + 1);
      return rec ? (rec.status === 'present' ? 'P' : rec.status === 'absent' ? 'A' : rec.status === 'late' ? 'L' : 'H') : '';
    });
    const present = days.filter(d => d === 'P' || d === 'L').length;
    const absent = days.filter(d => d === 'A').length;
    const total = present + absent;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const row = ws.addRow([idx + 1, s.admissionNo, s.name, ...days, present, absent, `${pct}%`]);
    if (pct < 75) row.getCell(days.length + 6).font = { color: { argb: 'DC2626' }, bold: true };
    if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_ROW } };
  });

  ws.getColumn(3).width = 24;
  return wb.xlsx.writeBuffer();
}

// ─────────────────────────────────────────────
// Staff Payroll Export
// ─────────────────────────────────────────────
async function exportPayroll({ payrollList, tenantName, month, year }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Payroll', { views: [{ state: 'frozen', ySplit: 4 }] });
  const months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

  addSchoolHeader(ws, tenantName, `Payroll Statement — ${months[month]} ${year}`);
  ws.addRow([]);

  const headers = ['#', 'Emp ID', 'Name', 'Designation', 'Basic', 'DA', 'HRA', 'TA', 'Sp. Allow.', 'Gross', 'PF', 'ESIC', 'Prof Tax', 'TDS', 'LOP', 'Total Ded.', 'Net Pay', 'Bank Ac', 'IFSC', 'Mode', 'Status'];
  ws.addRow(headers);
  applyHeaderStyle(ws, 4);

  let totalGross = 0, totalNet = 0;
  payrollList.forEach((p, i) => {
    totalGross += p.earnings?.total || 0;
    totalNet += p.netSalary || 0;
    ws.addRow([
      i + 1, p.employeeId, p.staffName, p.designation,
      p.earnings?.basic, p.earnings?.da, p.earnings?.hra, p.earnings?.ta, p.earnings?.specialAllowance,
      p.earnings?.total,
      p.deductions?.pf, p.deductions?.esic, p.deductions?.professionalTax, p.deductions?.tds, p.deductions?.lop,
      p.deductions?.total, p.netSalary,
      p.bankAccount, p.ifscCode, p.paymentMode, p.status,
    ]);
  });

  ws.addRow([]);
  const tr = ws.addRow(['', '', '', 'TOTAL', '', '', '', '', '', totalGross, '', '', '', '', '', '', totalNet]);
  tr.font = { bold: true };

  ws.columns.forEach(col => { col.width = 13; });
  ws.getColumn(3).width = 22;
  ws.autoFilter = { from: 'A4', to: 'U4' };

  return wb.xlsx.writeBuffer();
}

module.exports = { exportStudents, exportFeeCollection, exportAttendance, exportPayroll };
