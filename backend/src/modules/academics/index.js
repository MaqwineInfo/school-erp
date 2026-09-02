/**
 * Academics module public interface (architecture §9).
 * Other modules may use `service` and subscribe to `events`; nothing else is importable.
 */
const routes = require('./academic.routes');
const academic = require('./academic.service');
const enrolment = require('./enrolment.service');

module.exports = {
  name: 'academics',
  routes,
  permissions: ['academics'],
  jobs: [],
  events: { publishes: ['STUDENT_ENROLLED', 'STUDENT_PROMOTED'], subscribes: [] },

  /** The only surface other modules may call. */
  service: {
    // Structure
    activeYear: academic.activeYear,
    requireActiveYear: academic.requireActiveYear,
    resolveGroup: academic.resolveGroup,
    listGroups: academic.listGroups,
    setupStatus: academic.setupStatus,

    // Enrolment — used by admissions, students, fees, attendance, exams
    enrol: enrolment.enrol,
    closeEnrolment: enrolment.close,
    transfer: enrolment.transfer,
    promoteMany: enrolment.promoteMany,
    currentEnrolment: enrolment.current,
    enrolmentHistory: enrolment.history,
    studentIdsInGroup: enrolment.studentIdsInGroup,
  },
};
