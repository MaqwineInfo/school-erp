import { get, post, put, patch, del } from '../lib/api';
import type {
  Enquiry, AcademicYear, Standard, Subject,
  Attendance, FeeStructure, FeeDemand, FeePayment,
  Exam, MarksEntry, Staff, Leave, Payroll,
  Book, BookIssue, Notice, Expense, Visitor, Certificate,
  DashboardStats,
} from '../types';

export const dashboardService = {
  principal: () => get<DashboardStats>('/dashboard/principal'),
};

export const enquiryService = {
  list: (params?: Record<string, unknown>) => get<Enquiry[]>('/admissions', params),
  get: (id: string) => get<Enquiry>(`/admissions/${id}`),
  create: (data: Partial<Enquiry>) => post<Enquiry>('/admissions', data),
  update: (id: string, data: Partial<Enquiry>) => put<Enquiry>(`/admissions/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string) => patch(`/admissions/${id}/status`, { status, notes }),
  convert: (id: string, data: Record<string, unknown>) => post(`/admissions/${id}/convert`, data),
  remove: (id: string) => del(`/admissions/${id}`),
};

export const academicService = {
  listYears: () => get<AcademicYear[]>('/academics/years'),
  createYear: (data: Partial<AcademicYear>) => post<AcademicYear>('/academics/years', data),
  updateYear: (id: string, data: Partial<AcademicYear>) => put<AcademicYear>(`/academics/years/${id}`, data),
  activateYear: (id: string) => patch(`/academics/years/${id}/activate`, {}),

  listStandards: () => get<Standard[]>('/academics/standards'),
  createStandard: (data: Partial<Standard>) => post<Standard>('/academics/standards', data),
  updateStandard: (id: string, data: Partial<Standard>) => put<Standard>(`/academics/standards/${id}`, data),
  deleteStandard: (id: string) => del(`/academics/standards/${id}`),

  listSubjects: () => get<Subject[]>('/academics/subjects'),
  createSubject: (data: Partial<Subject>) => post<Subject>('/academics/subjects', data),
  updateSubject: (id: string, data: Partial<Subject>) => put<Subject>(`/academics/subjects/${id}`, data),
  deleteSubject: (id: string) => del(`/academics/subjects/${id}`),

  getTimetable: (params: Record<string, unknown>) => get('/academics/timetable', params),
  saveTimetable: (data: Record<string, unknown>) => post('/academics/timetable', data),

  listHomework: (params?: Record<string, unknown>) => get('/academics/homework', params),
  createHomework: (data: Record<string, unknown>) => post('/academics/homework', data),
  deleteHomework: (id: string) => del(`/academics/homework/${id}`),
};

export const attendanceService = {
  mark: (data: Record<string, unknown>) => post('/attendance/mark', data),
  getByDate: (params: Record<string, unknown>) => get('/attendance/by-date', params),
  monthly: (params: Record<string, unknown>) => get('/attendance/monthly', params),
  summary: (params: Record<string, unknown>) => get('/attendance/summary', params),
};

export const feeService = {
  listStructures: (params?: Record<string, unknown>) => get<FeeStructure[]>('/fees/structures', params),
  createStructure: (data: Partial<FeeStructure>) => post<FeeStructure>('/fees/structures', data),
  updateStructure: (id: string, data: Partial<FeeStructure>) => put<FeeStructure>(`/fees/structures/${id}`, data),

  listDemands: (params?: Record<string, unknown>) => get<FeeDemand[]>('/fees/demands', params),
  createDemand: (data: Partial<FeeDemand>) => post<FeeDemand>('/fees/demands', data),
  generateDemands: (data: Record<string, unknown>) => post('/fees/demands/generate', data),

  listPayments: (params?: Record<string, unknown>) => get<FeePayment[]>('/fees/payments', params),
  collectPayment: (data: Record<string, unknown>) => post('/fees/payments/collect', data),

  defaulters: (params?: Record<string, unknown>) => get('/fees/defaulters', params),
};

export const examService = {
  list: (params?: Record<string, unknown>) => get<Exam[]>('/exams', params),
  get: (id: string) => get<Exam>(`/exams/${id}`),
  create: (data: Partial<Exam>) => post<Exam>('/exams', data),
  update: (id: string, data: Partial<Exam>) => put<Exam>(`/exams/${id}`, data),
  publish: (id: string) => patch(`/exams/${id}/publish`, {}),
  remove: (id: string) => del(`/exams/${id}`),
  enterMarks: (data: Record<string, unknown>) => post('/exams/marks/enter', data),
  getMarks: (params: Record<string, unknown>) => get<MarksEntry[]>('/exams/marks', params),
  resultCard: (studentId: string, examId: string) => get(`/exams/marks/${studentId}/result-card`, { examId }),
};

export const hrService = {
  listStaff: (params?: Record<string, unknown>) => get<Staff[]>('/hr/staff', params),
  getStaff: (id: string) => get<Staff>(`/hr/staff/${id}`),
  createStaff: (data: Partial<Staff>) => post<Staff>('/hr/staff', data),
  updateStaff: (id: string, data: Partial<Staff>) => put<Staff>(`/hr/staff/${id}`, data),
  removeStaff: (id: string) => del(`/hr/staff/${id}`),

  listLeaves: (params?: Record<string, unknown>) => get<Leave[]>('/hr/leaves', params),
  applyLeave: (data: Partial<Leave>) => post<Leave>('/hr/leaves', data),
  approveLeave: (id: string, action: string, reason?: string) => patch(`/hr/leaves/${id}/approve`, { action, rejectionReason: reason }),

  listPayroll: (params?: Record<string, unknown>) => get<Payroll[]>('/hr/payroll', params),
  generatePayroll: (data: Record<string, unknown>) => post('/hr/payroll/generate', data),
  markPaid: (id: string, bankRef: string) => patch(`/hr/payroll/${id}/paid`, { bankRef }),
};

export const libraryService = {
  listBooks: (params?: Record<string, unknown>) => get<Book[]>('/library/books', params),
  addBook: (data: Partial<Book>) => post<Book>('/library/books', data),
  updateBook: (id: string, data: Partial<Book>) => put<Book>(`/library/books/${id}`, data),
  removeBook: (id: string) => del(`/library/books/${id}`),

  listIssues: (params?: Record<string, unknown>) => get<BookIssue[]>('/library/issues', params),
  issueBook: (data: Record<string, unknown>) => post<BookIssue>('/library/issues', data),
  returnBook: (id: string) => patch(`/library/issues/${id}/return`, {}),
};

export const transportService = {
  listVehicles: () => get('/transport/vehicles'),
  addVehicle: (data: Record<string, unknown>) => post('/transport/vehicles', data),
  updateVehicle: (id: string, data: Record<string, unknown>) => put(`/transport/vehicles/${id}`, data),
  removeVehicle: (id: string) => del(`/transport/vehicles/${id}`),

  listRoutes: () => get('/transport/routes'),
  addRoute: (data: Record<string, unknown>) => post('/transport/routes', data),
  updateRoute: (id: string, data: Record<string, unknown>) => put(`/transport/routes/${id}`, data),
  removeRoute: (id: string) => del(`/transport/routes/${id}`),
};

export const hostelService = {
  listRooms: (params?: Record<string, unknown>) => get('/hostel/rooms', params),
  addRoom: (data: Record<string, unknown>) => post('/hostel/rooms', data),
  listAllocations: (params?: Record<string, unknown>) => get('/hostel/allocations', params),
  allocate: (data: Record<string, unknown>) => post('/hostel/allocations', data),
  vacate: (id: string) => patch(`/hostel/allocations/${id}/vacate`, {}),
};

export const noticeService = {
  list: (params?: Record<string, unknown>) => get<Notice[]>('/notices', params),
  create: (data: Partial<Notice>) => post<Notice>('/notices', data),
  update: (id: string, data: Partial<Notice>) => put<Notice>(`/notices/${id}`, data),
  remove: (id: string) => del(`/notices/${id}`),
};

export const expenseService = {
  list: (params?: Record<string, unknown>) => get<Expense[]>('/expenses', params),
  create: (data: Partial<Expense>) => post<Expense>('/expenses', data),
  approve: (id: string, action: string) => patch(`/expenses/${id}/approve`, { action }),
};

export const visitorService = {
  list: (params?: Record<string, unknown>) => get<Visitor[]>('/visitors', params),
  create: (data: Partial<Visitor>) => post<Visitor>('/visitors', data),
  checkout: (id: string) => patch(`/visitors/${id}/checkout`, {}),
};

export const certificateService = {
  list: (params?: Record<string, unknown>) => get<Certificate[]>('/certificates', params),
  issue: (data: Partial<Certificate>) => post<Certificate>('/certificates', data),
  verify: (code: string) => get<Certificate>(`/certificates/verify/${code}`),
};
