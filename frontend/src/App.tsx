import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ModuleRoute } from './components/auth/ModuleRoute';
import { ForbiddenState } from './components/states/SystemStates';
import { guardFor, ROUTE_GUARDS } from './config/routeRegistry';

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
import PublicAdmissionPage from './pages/admissions/PublicAdmissionPage';
import AdmissionFormPage from './pages/admissions/AdmissionFormPage';
import ExamAnalyticsPage from './pages/exams/ExamAnalyticsPage';
import FeeConcessionPage from './pages/fees/FeeConcessionPage';
import ReportsPage from './pages/reports/ReportsPage';
import RolesPage from './pages/settings/RolesPage';
import SuperAdminPanel from './pages/superadmin/SuperAdminPanel';
import SuperAdminAnalyticsPage from './pages/superadmin/SuperAdminAnalyticsPage';
import SuperAdminHealthPage from './pages/superadmin/SuperAdminHealthPage';
import SuperAdminSecurityPage from './pages/superadmin/SuperAdminSecurityPage';
import DisciplinePage from './pages/discipline/DisciplinePage';
import AlumniPage from './pages/alumni/AlumniPage';
import MealPlannerPage from './pages/hostel/MealPlannerPage';
import TasksPage from './pages/tasks/TasksPage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import TenantModulesPage from './pages/superadmin/TenantModulesPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import ApprovalsPage from './pages/approvals/ApprovalsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!(user as { isSuperAdmin?: boolean } | null)?.isSuperAdmin && user?.role !== 'super_admin') {
    return <ForbiddenState module="the platform console" />;
  }
  return <>{children}</>;
}

/**
 * Wrap a page in the guard its registry entry declares.
 *
 * This is what closes defect A11: the permission comes from `routeRegistry.ts`, so adding
 * a route without declaring its permission is caught by a test rather than shipping as an
 * open door. Previously only 7 of ~40 routes were guarded, by hand.
 */
function guarded(path: string, element: React.ReactNode) {
  const guard = guardFor(path);

  if (!guard) {
    // A route with no registry entry is a bug, not a public page — fail closed and say so.
    // eslint-disable-next-line no-console
    console.error(`[routeRegistry] No guard declared for route "${path}" — treating as forbidden.`);
    return <ForbiddenState />;
  }

  if (guard.superAdminOnly) return <RequireSuperAdmin>{element}</RequireSuperAdmin>;
  if (guard.public || !guard.module) return <>{element}</>;

  return (
    <ModuleRoute module={guard.module} action={guard.action ?? 'view'}>
      {element}
    </ModuleRoute>
  );
}

/** Exported for the guard-coverage test. */
export const APP_ROUTES: Array<{ path: string; element: React.ReactNode }> = [
  { path: '', element: <DashboardPage /> },

  { path: 'students', element: <StudentsPage /> },
  { path: 'students/documents', element: <StudentDocumentsPage /> },
  { path: 'students/id-cards', element: <IDCardPage /> },
  { path: 'students/:id', element: <StudentProfilePage /> },

  { path: 'admissions/enquiries', element: <EnquiriesPage /> },
  { path: 'admissions/form', element: <AdmissionFormPage /> },
  { path: 'admissions/rte', element: <RTEPage /> },

  { path: 'academics/years', element: <AcademicsPage /> },
  { path: 'academics/standards', element: <AcademicsPage /> },
  { path: 'academics/subjects', element: <AcademicsPage /> },
  { path: 'academics/timetable', element: <TimetablePage /> },
  { path: 'academics/syllabus', element: <SyllabusPage /> },

  { path: 'attendance', element: <AttendancePage /> },
  { path: 'homework', element: <HomeworkPage /> },
  { path: 'study-material', element: <SyllabusPage /> },

  { path: 'fees/structures', element: <FeeStructurePage /> },
  { path: 'fees/demands', element: <FeeDemandPage /> },
  { path: 'fees/payments', element: <FeeCollectionPage /> },
  { path: 'fees/concessions', element: <FeeConcessionPage /> },
  { path: 'fees/defaulters', element: <FeeDefaultersPage /> },

  { path: 'exams', element: <ExamsPage /> },
  { path: 'exams/marks', element: <MarksEntryPage /> },
  { path: 'exams/report-cards', element: <ReportCardsPage /> },
  { path: 'exams/analytics', element: <ExamAnalyticsPage /> },

  { path: 'hr/staff', element: <StaffPage /> },
  { path: 'hr/leaves', element: <LeavePage /> },
  { path: 'hr/payroll', element: <PayrollPage /> },
  { path: 'hr/salary-slips', element: <PayrollPage /> },

  { path: 'library', element: <LibraryPage /> },
  { path: 'transport', element: <TransportPage /> },
  { path: 'hostel', element: <HostelPage /> },
  { path: 'hostel/meals', element: <MealPlannerPage /> },
  { path: 'discipline', element: <DisciplinePage /> },
  { path: 'health', element: <HealthPage /> },
  { path: 'alumni', element: <AlumniPage /> },
  { path: 'tasks', element: <TasksPage /> },
  { path: 'inventory', element: <InventoryPage /> },
  { path: 'events', element: <EventsPage /> },

  { path: 'communication/notices', element: <NoticesPage /> },
  { path: 'communication/sms', element: <SMSPage /> },
  { path: 'frontoffice/visitors', element: <VisitorsPage /> },
  { path: 'frontoffice/certificates', element: <CertificatesPage /> },

  { path: 'finance/expenses', element: <ExpensesPage /> },

  { path: 'reports', element: <ReportsPage /> },
  { path: 'approvals', element: <ApprovalsPage /> },
  { path: 'audit-logs', element: <AuditLogPage /> },

  { path: 'settings/school', element: <SchoolProfilePage /> },
  { path: 'settings/roles', element: <RolesPage /> },
  { path: 'settings/users', element: <UserManagementPage /> },
  { path: 'settings/modules', element: <ModuleConfigPage /> },

  { path: 'super', element: <SuperAdminDashboard /> },
  { path: 'super/tenants', element: <SuperAdminPanel /> },
  { path: 'super/plans', element: <SuperAdminPanel defaultTab="plans" /> },
  { path: 'super/tenants/:tenantId/modules', element: <TenantModulesPage /> },
  { path: 'super/provisioning', element: <OnboardingWizard /> },
  { path: 'super/analytics', element: <SuperAdminAnalyticsPage /> },
  { path: 'super/health', element: <SuperAdminHealthPage /> },
  { path: 'super/security', element: <SuperAdminSecurityPage /> },
];

export { ROUTE_GUARDS };

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/apply/:slug" element={<PublicAdmissionPage />} />

      {/* Protected — every child gets its guard from the registry. */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        {APP_ROUTES.map(({ path, element }) =>
          path === '' ? (
            <Route key="index" index element={guarded('', element)} />
          ) : (
            <Route key={path} path={path} element={guarded(path, element)} />
          ),
        )}

        {/* Legacy redirects */}
        <Route path="academics" element={<Navigate to="/academics/years" replace />} />
        <Route path="superadmin/tenants" element={<Navigate to="/super/tenants" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
