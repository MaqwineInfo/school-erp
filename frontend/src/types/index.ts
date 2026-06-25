export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor: string;
  plan: 'trial' | 'starter' | 'growth' | 'enterprise';
  status: 'trial' | 'active' | 'suspended';
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  permissions: string[];
  photo?: string;
  tenantId?: Tenant | string;
  branchId?: string;
  studentId?: string;
  linkedStudentIds?: string[];
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: string;
}

export type UserRole =
  | 'super_admin' | 'school_owner' | 'principal' | 'vice_principal'
  | 'hod' | 'class_teacher' | 'teacher' | 'admission_officer'
  | 'accountant' | 'cashier' | 'librarian' | 'transport_incharge' | 'hostel_warden'
  | 'hr_manager' | 'receptionist' | 'driver' | 'parent' | 'student' | 'staff';

export interface Student {
  _id: string;
  tenantId: string;
  branchId: string;
  admissionNo: string;
  grNo?: string;
  rollNo?: string;
  name: string;
  photo?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  religion?: string;
  caste?: string;
  category?: 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'rte';
  motherTongue?: string;
  currentAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  standardId?: Standard | string;
  divisionName?: string;
  stream?: string;
  house?: string;
  academicYearId?: AcademicYear | string;
  admissionDate?: string;
  isRteStudent: boolean;
  guardians: Guardian[];
  health?: { allergies: string[]; conditions: string[]; medications: string[] };
  status: 'active' | 'inactive' | 'transferred' | 'alumni';
  createdAt: string;
}

export interface Guardian {
  relation: 'father' | 'mother' | 'guardian';
  name: string;
  phone?: string;
  email?: string;
  occupation?: string;
  qualification?: string;
}

export interface AcademicYear {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  terms: { name: string; startDate: string; endDate: string }[];
  holidays: { name: string; date: string; type: string }[];
}

export interface Standard {
  _id: string;
  name: string;
  shortName?: string;
  order: number;
  stage: string;
  streams: string[];
  divisions: { name: string; classTeacherId?: string; strength: number }[];
  isActive: boolean;
}

export interface Subject {
  _id: string;
  name: string;
  code?: string;
  type: 'core' | 'language' | 'elective' | 'co_scholastic' | 'practical' | 'lab';
  maxMarks: number;
  passMarks: number;
  periodsPerWeek: number;
}

export interface Enquiry {
  _id: string;
  studentName: string;
  dob?: string;
  gender?: string;
  parentName?: string;
  parentPhone: string;
  parentEmail?: string;
  currentSchool?: string;
  applyingForStandard?: Standard | string;
  source: string;
  status: 'new' | 'contacted' | 'school_visit' | 'form_issued' | 'form_submitted' | 'admitted' | 'lost';
  assignedTo?: User | string;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Attendance {
  _id: string;
  standardId: Standard | string;
  divisionName: string;
  date: string;
  records: { studentId: Student | string; status: 'present' | 'absent' | 'late' | 'leave'; remarks?: string }[];
}

export interface FeeStructure {
  _id: string;
  name: string;
  standardId?: Standard | string;
  academicYearId: AcademicYear | string;
  components: { name: string; amount: number; gstRate: number; isOptional: boolean }[];
  installments: { name: string; dueDate: string; percentage: number }[];
  lateFeePerDay: number;
}

export interface FeeDemand {
  _id: string;
  studentId: Student | string;
  installmentName?: string;
  dueDate?: string;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
}

export interface FeePayment {
  _id: string;
  studentId: Student | string;
  receiptNo: string;
  amount: number;
  method: string;
  paidAt: string;
  collectedBy?: User | string;
}

export interface Exam {
  _id: string;
  name: string;
  type: string;
  status: 'draft' | 'published' | 'completed';
  academicYearId: AcademicYear | string;
  schedules: {
    standardId?: Standard | string;
    subjectId?: Subject | string;
    date?: string;
    startTime?: string;
    duration?: number;
    maxMarks: number;
    room?: string;
  }[];
  createdAt: string;
}

export interface MarksEntry {
  _id: string;
  examId: string;
  studentId: Student | string;
  subjectId: Subject | string;
  marksObtained?: number;
  maxMarks: number;
  grade?: string;
  isAbsent: boolean;
  status: 'draft' | 'submitted' | 'verified';
}

export interface Staff {
  _id: string;
  employeeId: string;
  name: string;
  photo?: string;
  dob?: string;
  gender?: string;
  designation?: string;
  department?: string;
  qualification: { degree: string; institution: string; year: number }[];
  joiningDate?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface Leave {
  _id: string;
  staffId: Staff | string;
  type: string;
  from: string;
  to: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedAt: string;
}

export interface Payroll {
  _id: string;
  staffId: Staff | string;
  month: number;
  year: number;
  earnings: { basic: number; da: number; hra: number; ta: number; specialAllowance: number; total: number };
  deductions: { pf: number; esic: number; professionalTax: number; tds: number; lop: number; total: number };
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
}

export interface Book {
  _id: string;
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  barcode?: string;
  rackNo?: string;
}

export interface BookIssue {
  _id: string;
  bookId: Book | string;
  memberId: string;
  memberType: 'student' | 'staff';
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount: number;
  status: 'issued' | 'returned' | 'overdue' | 'lost';
}

export interface Notice {
  _id: string;
  title: string;
  content: string;
  type: string;
  audience: { scope: string; standardIds?: string[]; roles?: string[] };
  publishAt: string;
  isPublished: boolean;
  createdBy?: User | string;
  createdAt: string;
}

export interface Expense {
  _id: string;
  category: string;
  title: string;
  amount: number;
  vendor?: string;
  billNo?: string;
  paidAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
}

export interface Visitor {
  _id: string;
  name: string;
  phone?: string;
  purpose?: string;
  toMeet?: string;
  gatePassNo: string;
  checkIn: string;
  checkOut?: string;
}

export interface Certificate {
  _id: string;
  studentId: Student | string;
  type: string;
  serialNo: string;
  issuedAt: string;
  verificationCode: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DashboardStats {
  students: { total: number; active: number };
  staff: { total: number };
  enquiries: { new: number };
  fees: {
    todayCollection: number;
    monthCollection: number;
    defaulters: number;
  };
  recentCollection: { date: string; amount: number }[];
}
