import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { DashboardLayout } from './components/layout/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import OnboardingWizard from './pages/onboarding/OnboardingWizard';
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentsPage from './pages/students/StudentsPage';
import StudentProfilePage from './pages/students/StudentProfilePage';
import EnquiriesPage from './pages/admissions/EnquiriesPage';
import AcademicsPage from './pages/academics/AcademicsPage';
import TimetablePage from './pages/academics/TimetablePage';
import AttendancePage from './pages/attendance/AttendancePage';
import HomeworkPage from './pages/homework/HomeworkPage';
import FeeStructurePage from './pages/fees/FeeStructurePage';
import FeeCollectionPage from './pages/fees/FeeCollectionPage';
import FeeDemandPage from './pages/fees/FeeDemandPage';
import FeeDefaultersPage from './pages/fees/FeeDefaultersPage';
import ExamsPage from './pages/exams/ExamsPage';
import MarksEntryPage from './pages/exams/MarksEntryPage';
import ReportCardsPage from './pages/exams/ReportCardsPage';
import StaffPage from './pages/hr/StaffPage';
import LeavePage from './pages/hr/LeavePage';
import PayrollPage from './pages/hr/PayrollPage';
import LibraryPage from './pages/library/LibraryPage';
import TransportPage from './pages/transport/TransportPage';
import HostelPage from './pages/hostel/HostelPage';
import NoticesPage from './pages/communication/NoticesPage';
import VisitorsPage from './pages/frontoffice/VisitorsPage';
import CertificatesPage from './pages/frontoffice/CertificatesPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import EventsPage from './pages/events/EventsPage';
import HealthPage from './pages/health/HealthPage';
import InventoryPage from './pages/inventory/InventoryPage';
import SMSPage from './pages/communication/SMSPage';
import SyllabusPage from './pages/academics/SyllabusPage';
import SchoolProfilePage from './pages/settings/SchoolProfilePage';
import UserManagementPage from './pages/settings/UserManagementPage';
import ModuleConfigPage from './pages/settings/ModuleConfigPage';
import StudentDocumentsPage from './pages/students/StudentDocumentsPage';
import IDCardPage from './pages/students/IDCardPage';
import RTEPage from './pages/admissions/RTEPage';
import AdmissionFormPage from './pages/admissions/AdmissionFormPage';
import ExamAnalyticsPage from './pages/exams/ExamAnalyticsPage';
import FeeConcessionPage from './pages/fees/FeeConcessionPage';
import ReportsPage from './pages/reports/ReportsPage';
import RolesPage from './pages/settings/RolesPage';
import SuperAdminPanel from './pages/superadmin/SuperAdminPanel';
import AuditLogPage from './pages/audit/AuditLogPage';
import ApprovalsPage from './pages/approvals/ApprovalsPage';
import { ModuleRoute } from './components/auth/ModuleRoute';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-gray-400 text-sm mt-2">This module is coming soon. Core functionality is live!</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Students */}
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/documents" element={<StudentDocumentsPage />} />
        <Route path="students/id-cards" element={<IDCardPage />} />
        <Route path="students/:id" element={<StudentProfilePage />} />

        {/* Admissions */}
        <Route path="admissions/enquiries" element={<EnquiriesPage />} />
        <Route path="admissions/form" element={<AdmissionFormPage />} />
        <Route path="admissions/rte" element={<RTEPage />} />

        {/* Academics */}
        <Route path="academics" element={<AcademicsPage />} />
        <Route path="academics/years" element={<AcademicsPage />} />
        <Route path="academics/standards" element={<AcademicsPage />} />
        <Route path="academics/subjects" element={<AcademicsPage />} />
        <Route path="academics/timetable" element={<TimetablePage />} />
        <Route path="academics/syllabus" element={<SyllabusPage />} />

        {/* Attendance */}
        <Route path="attendance" element={<AttendancePage />} />

        {/* Homework */}
        <Route path="homework" element={<HomeworkPage />} />
        <Route path="study-material" element={<SyllabusPage />} />

        {/* Fees */}
        <Route path="fees/structures" element={<ModuleRoute module="fees" action="edit"><FeeStructurePage /></ModuleRoute>} />
        <Route path="fees/demands" element={<ModuleRoute module="fees" action="edit"><FeeDemandPage /></ModuleRoute>} />
        <Route path="fees/payments" element={<ModuleRoute module="fees" action="add"><FeeCollectionPage /></ModuleRoute>} />
        <Route path="fees/concessions" element={<ModuleRoute module="fees" action="approve"><FeeConcessionPage /></ModuleRoute>} />
        <Route path="fees/defaulters" element={<ModuleRoute module="fees"><FeeDefaultersPage /></ModuleRoute>} />

        {/* Exams */}
        <Route path="exams" element={<ModuleRoute module="examinations"><ExamsPage /></ModuleRoute>} />
        <Route path="exams/marks" element={<ModuleRoute module="examinations" action="add"><MarksEntryPage /></ModuleRoute>} />
        <Route path="exams/report-cards" element={<ModuleRoute module="examinations"><ReportCardsPage /></ModuleRoute>} />
        <Route path="exams/analytics" element={<ModuleRoute module="examinations" action="export"><ExamAnalyticsPage /></ModuleRoute>} />

        {/* HR & Payroll */}
        <Route path="hr/staff" element={<StaffPage />} />
        <Route path="hr/leaves" element={<LeavePage />} />
        <Route path="hr/payroll" element={<PayrollPage />} />
        <Route path="hr/salary-slips" element={<PayrollPage />} />

        {/* Other modules */}
        <Route path="library" element={<LibraryPage />} />
        <Route path="transport" element={<TransportPage />} />
        <Route path="hostel" element={<HostelPage />} />
        <Route path="communication/notices" element={<NoticesPage />} />
        <Route path="communication/sms" element={<SMSPage />} />
        <Route path="finance/expenses" element={<ExpensesPage />} />
        <Route path="frontoffice/visitors" element={<VisitorsPage />} />
        <Route path="frontoffice/certificates" element={<CertificatesPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="health" element={<ModuleRoute module="students" action="edit"><HealthPage /></ModuleRoute>} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* Settings */}
        <Route path="settings/school" element={<SchoolProfilePage />} />
        <Route path="settings/roles" element={<RolesPage />} />
        <Route path="settings/users" element={<UserManagementPage />} />
        <Route path="settings/modules" element={<ModuleConfigPage />} />

        {/* Audit Logs */}
        <Route path="audit-logs" element={<AuditLogPage />} />

        {/* Approvals */}
        <Route path="approvals" element={<ApprovalsPage />} />

        {/* Super Admin */}
        <Route path="superadmin/tenants" element={
          <RequireSuperAdmin><SuperAdminPanel /></RequireSuperAdmin>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
