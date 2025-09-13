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
    
    // ม.1/2 - 2 วิชา (ครูคนละ 2 ห้อง)
    { id: 6, semester_id: 4, teacher_id: 5, class_id: 2, subject_name: 'คณิตศาสตร์', subject_code: 'ค030102', periods_per_week: 5, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 7, semester_id: 4, teacher_id: 2, class_id: 2, subject_name: 'วิทยาศาสตร์', subject_code: 'ว030102', periods_per_week: 4, created_at: '2024-05-01T00:00:00.000Z' },
];

// Subjects 2568 (Future Year) - Copy from 2567 but adjust semester_id and teacher_id mapping
const subjects_2568 = [
    // ม.1/1 - 5 วิชา (แก้ไข teacher_id ให้ตรงกับ teachers_2568)
    { id: 101, semester_id: 7, teacher_id: 1, class_id: 1, subject_name: 'วิทยาศาสตร์', subject_code: 'ว030101', periods_per_week: 4, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 102, semester_id: 7, teacher_id: 5, class_id: 1, subject_name: 'คณิตศาสตร์', subject_code: 'ค030101', periods_per_week: 5, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 103, semester_id: 7, teacher_id: 7, class_id: 1, subject_name: 'ภาษาไทย', subject_code: 'ท030101', periods_per_week: 4, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 104, semester_id: 7, teacher_id: 8, class_id: 1, subject_name: 'ภาษาอังกฤษ', subject_code: 'อ030101', periods_per_week: 3, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 105, semester_id: 7, teacher_id: 7, class_id: 1, subject_name: 'สังคมศึกษา', subject_code: 'ส030101', periods_per_week: 3, created_at: '2025-05-01T00:00:00.000Z' },
    
    // ม.1/2 - 2 วิชา
    { id: 106, semester_id: 7, teacher_id: 6, class_id: 2, subject_name: 'คณิตศาสตร์', subject_code: 'ค030102', periods_per_week: 5, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 107, semester_id: 7, teacher_id: 2, class_id: 2, subject_name: 'วิทยาศาสตร์', subject_code: 'ว030102', periods_per_week: 4, created_at: '2025-05-01T00:00:00.000Z' },
];

// Export for backward compatibility
export const subjectsData = subjects_2567;
export const getSubjectsByYear = (year) => {
  if (year === 2567) return subjects_2567;
  if (year === 2568) return subjects_2568;
  return [];
};
export const getSubjectsByTeacher = (teacherId, year = 2567) => {
  const subjects = year === 2567 ? subjects_2567 : year === 2568 ? subjects_2568 : [];
  return subjects.filter(s => s.teacher_id === teacherId);
};
export { subjects_2567, subjects_2568 };

// Export default
export default {
  data: {
    subjects_2566: [],
    subjects_2567: subjects_2567,
    subjects_2568: subjects_2568
  }
};
