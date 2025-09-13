/**
 * Subjects Mock Data - Fixed Version
 */

// Subjects 2567 (Current Year)
const subjects_2567 = [
    { id: 1, semester_id: 4, teacher_id: 1, class_id: 1, subject_name: 'วิทยาศาสตร์', subject_code: 'ว30101', periods_per_week: 4, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 2, semester_id: 4, teacher_id: 4, class_id: 1, subject_name: 'คณิตศาสตร์', subject_code: 'ค30101', periods_per_week: 5, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 3, semester_id: 4, teacher_id: 7, class_id: 1, subject_name: 'ภาษาไทย', subject_code: 'ท30101', periods_per_week: 4, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 4, semester_id: 4, teacher_id: 9, class_id: 1, subject_name: 'ภาษาอังกฤษ', subject_code: 'อ30101', periods_per_week: 3, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 5, semester_id: 4, teacher_id: 10, class_id: 1, subject_name: 'สังคมศึกษา', subject_code: 'ส30101', periods_per_week: 3, created_at: '2024-05-01T00:00:00.000Z' },
];

// Export for backward compatibility
export const subjectsData = subjects_2567;
export const getSubjectsByYear = (year) => {
  if (year === 2567) return subjects_2567;
  return [];
};
export const getSubjectsByTeacher = (teacherId, year = 2567) => {
  const subjects = year === 2567 ? subjects_2567 : [];
  return subjects.filter(s => s.teacher_id === teacherId);
};
export { subjects_2567 };

// Export default
export default {
  data: subjectsData
};
