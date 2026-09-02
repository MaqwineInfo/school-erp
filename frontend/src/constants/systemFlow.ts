/**
 * SYSTEM FLOW — mirrors backend/src/constants/systemFlow.js
 * Hierarchy: Academic Year → Class → Section → Student
 */

export const SETUP_FLOW = [
  { step: 1, key: 'academic_year', label: 'Academic Year', route: '/academics/years' },
  { step: 2, key: 'classes_sections', label: 'Classes & Sections', route: '/academics/standards' },
  { step: 3, key: 'subjects', label: 'Subjects', route: '/academics/subjects' },
  { step: 4, key: 'students', label: 'Students', route: '/students' },
] as const;

export const LABELS = {
  class: 'Class',
  section: 'Section',
} as const;

/** Display e.g. "8A" from class + section */
export function formatClassSection(
  standard?: { name?: string; shortName?: string } | string | null,
  divisionName?: string | null,
): string {
  if (!standard || !divisionName) return '—';
  if (typeof standard === 'string') return divisionName;
  const classPart = standard.shortName || standard.name?.replace(/^Class\s*/i, '') || standard.name || '';
  return `${classPart}${divisionName}`;
}
