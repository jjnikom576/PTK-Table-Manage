// Enhanced Classes Mock Data - Multi-Year (แก้ให้ realistic)
// ชั้นเรียน ม.1 ครบ 3 ปี 6 เทอม

export const classesData = {
  // ปี 2566
  classes_2566: [
    // ภาคเรียนที่ 1/2566
    {id: 1, semester_id: 1, class_name: "1/1", grade_level: "ม.1", section: 1, student_count: 40, created_at: "2023-05-15T00:00:00Z"},
    {id: 2, semester_id: 1, class_name: "1/2", grade_level: "ม.1", section: 2, student_count: 39, created_at: "2023-05-15T00:00:00Z"},
    {id: 3, semester_id: 1, class_name: "1/3", grade_level: "ม.1", section: 3, student_count: 38, created_at: "2023-05-15T00:00:00Z"},
    {id: 4, semester_id: 1, class_name: "1/4", grade_level: "ม.1", section: 4, student_count: 41, created_at: "2023-05-15T00:00:00Z"},
    
    // ภาคเรียนที่ 2/2566  
    {id: 5, semester_id: 2, class_name: "1/1", grade_level: "ม.1", section: 1, student_count: 40, created_at: "2023-11-01T00:00:00Z"},
    {id: 6, semester_id: 2, class_name: "1/2", grade_level: "ม.1", section: 2, student_count: 39, created_at: "2023-11-01T00:00:00Z"},
    {id: 7, semester_id: 2, class_name: "1/3", grade_level: "ม.1", section: 3, student_count: 38, created_at: "2023-11-01T00:00:00Z"},
    {id: 8, semester_id: 2, class_name: "1/4", grade_level: "ม.1", section: 4, student_count: 41, created_at: "2023-11-01T00:00:00Z"}
  ],

  // ปี 2567
  classes_2567: [
    {id: 9, semester_id: 3, class_name: "1/1", grade_level: "ม.1", section: 1, student_count: 40, created_at: "2024-05-15T00:00:00Z"},
    {id: 10, semester_id: 3, class_name: "1/2", grade_level: "ม.1", section: 2, student_count: 39, created_at: "2024-05-15T00:00:00Z"},
    {id: 11, semester_id: 3, class_name: "1/3", grade_level: "ม.1", section: 3, student_count: 38, created_at: "2024-05-15T00:00:00Z"},
    {id: 12, semester_id: 3, class_name: "1/4", grade_level: "ม.1", section: 4, student_count: 41, created_at: "2024-05-15T00:00:00Z"},
    
    {id: 13, semester_id: 4, class_name: "1/1", grade_level: "ม.1", section: 1, student_count: 40, created_at: "2024-11-01T00:00:00Z"},
    {id: 14, semester_id: 4, class_name: "1/2", grade_level: "ม.1", section: 2, student_count: 39, created_at: "2024-11-01T00:00:00Z"},
    {id: 15, semester_id: 4, class_name: "1/3", grade_level: "ม.1", section: 3, student_count: 38, created_at: "2024-11-01T00:00:00Z"},
    {id: 16, semester_id: 4, class_name: "1/4", grade_level: "ม.1", section: 4, student_count: 41, created_at: "2024-11-01T00:00:00Z"}
  ],

  // ปี 2568
  classes_2568: [
    {id: 17, semester_id: 5, class_name: "1/1", grade_level: "ม.1", section: 1, student_count: 42, created_at: "2025-05-15T00:00:00Z"},
    {id: 18, semester_id: 5, class_name: "1/2", grade_level: "ม.1", section: 2, student_count: 40, created_at: "2025-05-15T00:00:00Z"},
    {id: 19, semester_id: 5, class_name: "1/3", grade_level: "ม.1", section: 3, student_count: 39, created_at: "2025-05-15T00:00:00Z"},
    {id: 20, semester_id: 5, class_name: "1/4", grade_level: "ม.1", section: 4, student_count: 43, created_at: "2025-05-15T00:00:00Z"},
    
    {id: 21, semester_id: 6, class_name: "1/1", grade_level: "ม.1", section: 1, student_count: 42, created_at: "2025-11-01T00:00:00Z"},
    {id: 22, semester_id: 6, class_name: "1/2", grade_level: "ม.1", section: 2, student_count: 40, created_at: "2025-11-01T00:00:00Z"},
    {id: 23, semester_id: 6, class_name: "1/3", grade_level: "ม.1", section: 3, student_count: 39, created_at: "2025-11-01T00:00:00Z"},
    {id: 24, semester_id: 6, class_name: "1/4", grade_level: "ม.1", section: 4, student_count: 43, created_at: "2025-11-01T00:00:00Z"}
  ]
};

// Helper function for UI display
export function formatClassName(classData) {
  return `${classData.grade_level}/${classData.section}`; // "ม.1/1"
}

export function getClassDisplayName(classData) {
  return `${classData.grade_level}/${classData.section} (${classData.student_count || 0} คน)`;
}

export default classesData;