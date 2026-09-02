import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

import TeacherDashboard from './TeacherDashboard';
import AccountantDashboard from './AccountantDashboard';
import ParentDashboard from './ParentDashboard';
import PrincipalDashboard from './PrincipalDashboard';
import VicePrincipalDashboard from './VicePrincipalDashboard';
import HodDashboard from './HodDashboard';
import HRManagerDashboard from './HRManagerDashboard';
import LibrarianDashboard from './LibrarianDashboard';
import TransportDashboard from './TransportDashboard';
import HostelWardenDashboard from './HostelWardenDashboard';
import StudentDashboard from './StudentDashboard';
import ReceptionistDashboard from './ReceptionistDashboard';
import AdmissionOfficerDashboard from './AdmissionOfficerDashboard';
import CashierDashboard from './CashierDashboard';
import DriverDashboard from './DriverDashboard';
import ClassTeacherDashboard from './ClassTeacherDashboard';
import StaffDashboard from './StaffDashboard';

/**
 * Dashboard router.
 *
 * Closes defect A12. The previous version returned from a `switch` on `user.role` and
 * THEN called `useQuery`, so the number of hooks varied by role — any render where the
 * role changed (sign-in, impersonation, role switch) threw "Rendered more hooks than
 * during the previous render."
 *
 * This component now calls no hooks after a conditional return: it is pure dispatch, and
 * each role dashboard owns its own data fetching.
 */
const DASHBOARDS: Record<string, React.ComponentType> = {
  principal: PrincipalDashboard,
  school_admin: PrincipalDashboard,
  vice_principal: VicePrincipalDashboard,
  hod: HodDashboard,
  teacher: TeacherDashboard,
  class_teacher: ClassTeacherDashboard,
  accountant: AccountantDashboard,
  cashier: CashierDashboard,
  driver: DriverDashboard,
  staff: StaffDashboard,
  hr_manager: HRManagerDashboard,
  admission_officer: AdmissionOfficerDashboard,
  librarian: LibrarianDashboard,
  transport_manager: TransportDashboard,
  transport_incharge: TransportDashboard, // legacy slug, pre-migration users
  hostel_warden: HostelWardenDashboard,
  receptionist: ReceptionistDashboard,
  parent: ParentDashboard,
  student: StudentDashboard,
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  if ((user as { isSuperAdmin?: boolean }).isSuperAdmin || user.role === 'super_admin') {
    return <Navigate to="/super" replace />;
  }

  // Fall back to the principal view for any role without a bespoke dashboard yet —
  // it is permission-gated, so a narrower role simply sees fewer tiles.
  const Dashboard = DASHBOARDS[user.role ?? ''] ?? PrincipalDashboard;
  return <Dashboard />;
}
