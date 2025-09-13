/**
 * Simple Substitutions Mock Data
 */

// Simple mock data
const substitutions_2567 = [
  { id: 1, absent_teacher_id: 1, absent_date: '2024-12-01', reason: 'ลาป่วย', status: 'ACTIVE' },
  { id: 2, absent_teacher_id: 4, absent_date: '2024-12-02', reason: 'ลากิจ', status: 'ACTIVE' }
];

const substitution_schedules_2567 = [
  { id: 1, substitution_id: 1, substitute_teacher_id: 2, original_schedule_id: 1, periods_count: 2 },
  { id: 2, substitution_id: 2, substitute_teacher_id: 7, original_schedule_id: 2, periods_count: 1 }
];

// Export
export const substitutionsData = substitutions_2567;
export const substitutionSchedulesData = substitution_schedules_2567;

export default {
  data: {
    substitutions_2567,
    substitution_schedules_2567
  }
};
