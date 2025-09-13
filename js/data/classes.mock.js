/**
 * Classes Mock Data - Fixed Version
 */

// Classes 2567 (Current Year)
const classes_2567 = [
    { id: 1, semester_id: 4, class_name: 'ม.1/1', grade_level: 'ม.1', section: 1, student_count: 35, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 2, semester_id: 4, class_name: 'ม.1/2', grade_level: 'ม.1', section: 2, student_count: 34, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 3, semester_id: 4, class_name: 'ม.2/1', grade_level: 'ม.2', section: 1, student_count: 38, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 4, semester_id: 4, class_name: 'ม.2/2', grade_level: 'ม.2', section: 2, student_count: 37, created_at: '2024-05-01T00:00:00.000Z' },
    { id: 5, semester_id: 4, class_name: 'ม.3/1', grade_level: 'ม.3', section: 1, student_count: 32, created_at: '2024-05-01T00:00:00.000Z' },
];

// Classes 2566 (Previous Year)
const classes_2566 = [
    { id: 1, semester_id: 1, class_name: 'ม.1/1', grade_level: 'ม.1', section: 1, student_count: 40, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 2, semester_id: 1, class_name: 'ม.1/2', grade_level: 'ม.1', section: 2, student_count: 39, created_at: '2023-05-01T00:00:00.000Z' },
];

// Classes 2568 (Future)
const classes_2568 = [
    { id: 1, semester_id: 7, class_name: 'ม.1/1', grade_level: 'ม.1', section: 1, student_count: 30, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 2, semester_id: 7, class_name: 'ม.1/2', grade_level: 'ม.1', section: 2, student_count: 29, created_at: '2025-05-01T00:00:00.000Z' },
];

// Utility Functions
export const ClassUtils = {
    getClassesByYear(year) {
        const yearData = { 2566: classes_2566, 2567: classes_2567, 2568: classes_2568 };
        return yearData[year] || [];
    },
    
    getClassesBySemester(semesterId) {
        const allClasses = [...classes_2566, ...classes_2567, ...classes_2568];
        return allClasses.filter(c => c.semester_id === semesterId);
    }
};

// Export for backward compatibility  
const allClassesData = [...classes_2567, ...classes_2566, ...classes_2568];
export { allClassesData as classesData };
export const getClassesByYear = ClassUtils.getClassesByYear;
export const getClassesBySemester = ClassUtils.getClassesBySemester;

// Export default
export default {
    data: allClassesData,
    utils: ClassUtils
};
