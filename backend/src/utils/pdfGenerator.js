const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js'),
    bold: path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js'),
  },
};

// Use default Roboto fonts bundled with pdfmake
let printer;
try {
  const vfsFonts = require('pdfmake/build/vfs_fonts');
  const pdfMake = require('pdfmake/build/pdfmake');
  pdfMake.vfs = vfsFonts.pdfMake.vfs;
  printer = pdfMake;
} catch {
  const PdfPrinter = require('pdfmake/src/printer');
  printer = new PdfPrinter({
    Roboto: {
      normal: Buffer.from(''),
      bold: Buffer.from(''),
    },
  });
}

function getSchoolHeader(tenant) {
  return {
    stack: [
      { text: tenant?.name || 'School ERP', style: 'schoolName', alignment: 'center' },
      { text: [tenant?.address, tenant?.city, tenant?.state, tenant?.pinCode].filter(Boolean).join(', '), style: 'subtext', alignment: 'center' },
      { text: `Phone: ${tenant?.phone || ''}  |  Email: ${tenant?.email || ''}`, style: 'subtext', alignment: 'center' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#1a56db' }], margin: [0, 6, 0, 10] },
    ],
  };
}

// ───────────────────────────────────────────
// Fee Receipt PDF
// ───────────────────────────────────────────
function generateFeeReceipt({ tenant, payment, student, demand }) {
  const docDef = {
    content: [
      getSchoolHeader(tenant),
      { text: 'FEE RECEIPT', style: 'title', alignment: 'center', margin: [0, 0, 0, 12] },
      {
        columns: [
          {
            stack: [
              { text: `Receipt No: ${payment.receiptNo}`, style: 'field' },
              { text: `Date: ${new Date(payment.paidAt).toLocaleDateString('en-IN')}`, style: 'field' },
              { text: `Payment Mode: ${payment.method?.toUpperCase()}`, style: 'field' },
            ],
          },
          {
            stack: [
              { text: `Student: ${student.name}`, style: 'field' },
              { text: `Admission No: ${student.admissionNo}`, style: 'field' },
              { text: `Class: ${student.standardName || ''} ${student.divisionName || ''}`, style: 'field' },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 80, 80, 80],
          body: [
            [
              { text: 'Fee Component', style: 'tableHeader' },
              { text: 'Amount (₹)', style: 'tableHeader', alignment: 'right' },
              { text: 'Paid (₹)', style: 'tableHeader', alignment: 'right' },
              { text: 'Balance (₹)', style: 'tableHeader', alignment: 'right' },
            ],
            ...((demand?.components || []).map(c => [
              { text: c.name },
              { text: c.amount?.toLocaleString('en-IN'), alignment: 'right' },
              { text: c.paid?.toLocaleString('en-IN'), alignment: 'right' },
              { text: c.due?.toLocaleString('en-IN'), alignment: 'right' },
            ])),
            [
              { text: 'Total', bold: true },
              { text: demand?.totalAmount?.toLocaleString('en-IN'), bold: true, alignment: 'right' },
              { text: payment.amount?.toLocaleString('en-IN'), bold: true, alignment: 'right', color: '#16a34a' },
              { text: demand?.totalDue?.toLocaleString('en-IN'), bold: true, alignment: 'right' },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20],
      },
      {
        columns: [
          { text: 'Received with thanks', style: 'subtext' },
          { text: 'Authorised Signatory', style: 'subtext', alignment: 'right' },
        ],
      },
      { text: 'This is a computer-generated receipt. No signature required.', style: 'footer', alignment: 'center', margin: [0, 20, 0, 0] },
    ],
    styles: {
      schoolName: { fontSize: 16, bold: true, color: '#1a56db' },
      title: { fontSize: 13, bold: true, margin: [0, 4, 0, 4] },
      field: { fontSize: 10, margin: [0, 2] },
      subtext: { fontSize: 9, color: '#666' },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f3f4f6' },
      footer: { fontSize: 8, color: '#999', italics: true },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
  };

  return createBuffer(docDef);
}

// ───────────────────────────────────────────
// Salary Slip PDF
// ───────────────────────────────────────────
function generateSalarySlip({ tenant, payroll, staff }) {
  const e = payroll.earnings;
  const d = payroll.deductions;
  const months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

  const docDef = {
    content: [
      getSchoolHeader(tenant),
      { text: 'SALARY SLIP', style: 'title', alignment: 'center', margin: [0, 0, 0, 10] },
      { text: `Month: ${months[payroll.month]} ${payroll.year}`, style: 'field', alignment: 'center', margin: [0, 0, 0, 10] },
      {
        columns: [
          { stack: [{ text: `Name: ${staff.name}`, style: 'field' }, { text: `Employee ID: ${staff.employeeId}`, style: 'field' }, { text: `Designation: ${staff.designation || ''}`, style: 'field' }] },
          { stack: [{ text: `Department: ${staff.department || ''}`, style: 'field' }, { text: `Days Worked: ${payroll.daysWorked}`, style: 'field' }, { text: `LOP Days: ${payroll.lopDays}`, style: 'field' }] },
        ],
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          {
            table: {
              headerRows: 1, widths: ['*', 80],
              body: [
                [{ text: 'Earnings', style: 'tableHeader' }, { text: 'Amount (₹)', style: 'tableHeader', alignment: 'right' }],
                ['Basic Salary', { text: e.basic?.toLocaleString('en-IN'), alignment: 'right' }],
                ['DA', { text: e.da?.toLocaleString('en-IN'), alignment: 'right' }],
                ['HRA', { text: e.hra?.toLocaleString('en-IN'), alignment: 'right' }],
                ['Transport Allowance', { text: e.ta?.toLocaleString('en-IN'), alignment: 'right' }],
                ['Special Allowance', { text: e.specialAllowance?.toLocaleString('en-IN'), alignment: 'right' }],
                [{ text: 'Total Earnings', bold: true }, { text: e.total?.toLocaleString('en-IN'), bold: true, alignment: 'right' }],
              ],
            },
            layout: 'lightHorizontalLines',
          },
          {
            table: {
              headerRows: 1, widths: ['*', 80],
              body: [
                [{ text: 'Deductions', style: 'tableHeader' }, { text: 'Amount (₹)', style: 'tableHeader', alignment: 'right' }],
                ['PF (12%)', { text: d.pf?.toLocaleString('en-IN'), alignment: 'right' }],
                ['ESIC', { text: d.esic?.toLocaleString('en-IN'), alignment: 'right' }],
                ['Professional Tax', { text: d.professionalTax?.toLocaleString('en-IN'), alignment: 'right' }],
                ['TDS', { text: d.tds?.toLocaleString('en-IN'), alignment: 'right' }],
                ['LOP Deduction', { text: d.lop?.toLocaleString('en-IN'), alignment: 'right' }],
                [{ text: 'Total Deductions', bold: true }, { text: d.total?.toLocaleString('en-IN'), bold: true, alignment: 'right' }],
              ],
            },
            layout: 'lightHorizontalLines',
          },
        ],
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: ['*', '*'],
          body: [[
            { text: 'Net Salary Payable', bold: true, fontSize: 12 },
            { text: `₹ ${payroll.netSalary?.toLocaleString('en-IN')}`, bold: true, fontSize: 14, color: '#16a34a', alignment: 'right' },
          ]],
        },
        layout: 'noBorders',
        fillColor: '#f0fdf4',
        margin: [0, 0, 0, 20],
      },
      { text: 'This is a computer-generated salary slip.', style: 'footer', alignment: 'center' },
    ],
    styles: {
      schoolName: { fontSize: 16, bold: true, color: '#1a56db' },
      title: { fontSize: 13, bold: true },
      field: { fontSize: 10, margin: [0, 2] },
      subtext: { fontSize: 9, color: '#666' },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f3f4f6' },
      footer: { fontSize: 8, color: '#999', italics: true },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
  };

  return createBuffer(docDef);
}

// ───────────────────────────────────────────
// Helper: convert docDef to Buffer
// ───────────────────────────────────────────
function createBuffer(docDef) {
  return new Promise((resolve, reject) => {
    try {
      const PdfPrinter = require('pdfmake/src/printer');
      const vfs = require('pdfmake/build/vfs_fonts.js');

      const fontDescriptors = {
        Roboto: {
          normal: Buffer.from(vfs.pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
          bold: Buffer.from(vfs.pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
          italics: Buffer.from(vfs.pdfMake.vfs['Roboto-Italic.ttf'], 'base64'),
          bolditalics: Buffer.from(vfs.pdfMake.vfs['Roboto-MediumItalic.ttf'], 'base64'),
        },
      };

      const p = new PdfPrinter(fontDescriptors);
      const doc = p.createPdfKitDocument(docDef);
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateFeeReceipt, generateSalarySlip };
