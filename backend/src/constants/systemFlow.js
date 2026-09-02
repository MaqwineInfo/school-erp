/**
 * SYSTEM FLOW — Single source of truth (do not change order or field names)
 *
 * Hierarchy:  Academic Year → Class (Standard) → Section (division) → Student
 * API fields: standardId (ObjectId) + divisionName (uppercase string, e.g. "A")
 * UI labels:  Class + Section
 */

const SETUP_FLOW = [
  { step: 1, key: 'academic_year', label: 'Academic Year', route: '/academics/years' },
  { step: 2, key: 'classes_sections', label: 'Classes & Sections', route: '/academics/standards' },
  { step: 3, key: 'subjects', label: 'Subjects', route: '/academics/subjects' },
  { step: 4, key: 'students', label: 'Students', route: '/students' },
];

const ADMISSION_FLOW = [
  { step: 1, key: 'enquiry', label: 'Enquiry', status: 'new' },
  { step: 2, key: 'contact', label: 'Contacted', status: 'contacted' },
  { step: 3, key: 'visit', label: 'School Visit', status: 'school_visit' },
  { step: 4, key: 'form', label: 'Form Submitted', status: 'form_submitted' },
  { step: 5, key: 'admit', label: 'Admitted', status: 'admitted' },
];

const LABELS = {
  class: 'Class',
  section: 'Section',
  classField: 'standardId',
  sectionField: 'divisionName',
};

const DEFAULT_SECTION_CAPACITY = 40;

module.exports = {
  SETUP_FLOW,
  ADMISSION_FLOW,
  LABELS,
  DEFAULT_SECTION_CAPACITY,
};
