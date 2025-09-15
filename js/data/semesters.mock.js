/**
 * Semesters Mock Data
 * Multi-Year Schedule System
 */

// Mock Semesters Data
const SEMESTERS = [
    // ปีการศึกษา 2566 (เก่า)
    {
        id: 1,
        academic_year_id: 1,
        semester_number: 1,
        semester_name: 'ภาคเรียนที่ 1',
        start_date: '2023-05-15',
        end_date: '2023-09-30',
        is_active: false,
        created_at: '2023-05-01T00:00:00.000Z'
    },

    // ปีการศึกษา 2567 (ปัจจุบัน) - แก้ไข duplicate ID
    {
        id: 10,
        academic_year_id: 2,
        semester_number: 1,
        semester_name: 'ภาคเรียนที่ 1',
        start_date: '2024-05-15',
        end_date: '2024-09-30',
        is_active: true, // ภาคเรียนปัจจุบัน
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 2,
        academic_year_id: 1,
        semester_number: 2,
        semester_name: 'ภาคเรียนที่ 2',
        start_date: '2023-10-01',
        end_date: '2024-02-28',
        is_active: false,
        created_at: '2023-05-01T00:00:00.000Z'
    },
    {
        id: 3,
        academic_year_id: 1,
        semester_number: 3,
        semester_name: 'ภาคฤดูร้อน',
        start_date: '2024-03-01',
        end_date: '2024-04-30',
        is_active: false,
        created_at: '2023-05-01T00:00:00.000Z'
    },

    // ปีการศึกษา 2567 (ปัจจุบัน)
    {
        id: 5,
        academic_year_id: 2,
        semester_number: 2,
        semester_name: 'ภาคเรียนที่ 2',
        start_date: '2024-10-01',
        end_date: '2025-02-28',
        is_active: false,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 6,
        academic_year_id: 2,
        semester_number: 3,
        semester_name: 'ภาคฤดูร้อน',
        start_date: '2025-03-01',
        end_date: '2025-04-30',
        is_active: false,
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // ปีการศึกษา 2568 (อนาคต)
    {
        id: 7,
        academic_year_id: 3,
        semester_number: 1,
        semester_name: 'ภาคเรียนที่ 1',
        start_date: '2025-05-15',
        end_date: '2025-09-30',
        is_active: false,
        created_at: '2025-05-01T00:00:00.000Z'
    },
    {
        id: 8,
        academic_year_id: 3,
        semester_number: 2,
        semester_name: 'ภาคเรียนที่ 2',
        start_date: '2025-10-01',
        end_date: '2026-02-28',
        is_active: false,
        created_at: '2025-05-01T00:00:00.000Z'
    },
    {
        id: 9,
        academic_year_id: 3,
        semester_number: 3,
        semester_name: 'ภาคฤดูร้อน',
        start_date: '2026-03-01',
        end_date: '2026-04-30',
        is_active: false,
        created_at: '2025-05-01T00:00:00.000Z'
    }
    ,
    // ปีการศึกษา 2569
    {
        id: 11,
        academic_year_id: 4,
        semester_number: 1,
        semester_name: 'ภาคเรียนที่ 1',
        start_date: '2026-05-15',
        end_date: '2026-09-30',
        is_active: false,
        created_at: '2026-05-01T00:00:00.000Z'
    },
    {
        id: 12,
        academic_year_id: 4,
        semester_number: 2,
        semester_name: 'ภาคเรียนที่ 2',
        start_date: '2026-10-01',
        end_date: '2027-02-28',
        is_active: false,
        created_at: '2026-05-01T00:00:00.000Z'
    },
    // ปีการศึกษา 2570
    {
        id: 13,
        academic_year_id: 5,
        semester_number: 1,
        semester_name: 'ภาคเรียนที่ 1',
        start_date: '2027-05-15',
        end_date: '2027-09-30',
        is_active: false,
        created_at: '2027-05-01T00:00:00.000Z'
    },
    {
        id: 14,
        academic_year_id: 5,
        semester_number: 2,
        semester_name: 'ภาคเรียนที่ 2',
        start_date: '2027-10-01',
        end_date: '2028-02-28',
        is_active: false,
        created_at: '2027-05-01T00:00:00.000Z'
    }
];

// Semester Helper Functions
export const SemesterUtils = {
    /**
     * Get all semesters
     * @returns {Array} - Array of semester objects
     */
    getAll() {
        return [...SEMESTERS];
    },

    /**
     * Get current active semester
     * @returns {Object|null} - Current active semester
     */
    getCurrentSemester() {
        return SEMESTERS.find(semester => semester.is_active) || null;
    },

    /**
     * Get active semester for specific year
     * @param {number} yearId - Academic year ID
     * @returns {Object|null} - Active semester for the year
     */
    getActiveSemester(yearId) {
        return SEMESTERS.find(semester => 
            semester.academic_year_id === yearId && semester.is_active
        ) || null;
    },

    /**
     * Get all semesters by academic year
     * @param {number} yearId - Academic year ID
     * @returns {Array} - Array of semesters for the year
     */
    getSemestersByYear(yearId) {
        return SEMESTERS.filter(semester => 
            semester.academic_year_id === yearId
        );
    },

    /**
     * Get semester by ID
     * @param {number} id - Semester ID
     * @returns {Object|null} - Semester object
     */
    getSemesterById(id) {
        return SEMESTERS.find(semester => semester.id === id) || null;
    },

    /**
     * Get semesters for dropdown/selection by year
     * @param {number} yearId - Academic year ID
     * @returns {Array} - Array of {value, label} objects
     */
    getSemesterOptions(yearId) {
        return this.getSemestersByYear(yearId).map(semester => ({
            value: semester.id.toString(),
            label: semester.semester_name,
            semester_number: semester.semester_number,
            is_active: semester.is_active,
            start_date: semester.start_date,
            end_date: semester.end_date
        }));
    },

    /**
     * Format semester display name
     * @param {Object} semester - Semester object
     * @param {Object} academicYear - Academic year object (optional)
     * @returns {string} - Formatted display name
     */
    formatSemesterDisplay(semester, academicYear = null) {
        if (academicYear) {
            return `${semester.semester_name}/${academicYear.year}`;
        }
        return semester.semester_name;
    }
};

// Combined Academic Context Utils
export const AcademicContextUtils = {
    /**
     * Get current academic context (year + semester)
     * @returns {Object} - Current context {year, semester}
     */
    getCurrentContext() {
        // Import AcademicYearUtils (will be available when imported)
        const currentYear = ACADEMIC_YEARS.find(year => year.is_active);
        const currentSemester = SEMESTERS.find(semester => semester.is_active);
        
        return {
            year: currentYear,
            semester: currentSemester,
            displayName: currentSemester && currentYear ? 
                `${currentSemester.semester_name}/${currentYear.year}` : 'ไม่พบข้อมูล'
        };
    },

    /**
     * Build context for export filename
     * @param {number|null} yearId - Academic year ID (null = current)
     * @param {number|null} semesterId - Semester ID (null = current)
     * @returns {Object} - Export context {year, semester}
     */
    getExportContext(yearId = null, semesterId = null) {
        let year, semester;
        
        if (yearId) {
            year = ACADEMIC_YEARS.find(y => y.id === yearId);
        } else {
            year = ACADEMIC_YEARS.find(y => y.is_active);
        }
        
        if (semesterId) {
            semester = SEMESTERS.find(s => s.id === semesterId);
        } else if (year) {
            semester = SEMESTERS.find(s => 
                s.academic_year_id === year.id && s.is_active
            );
        }
        
        return {
            year: year?.year || new Date().getFullYear() + 543,
            semester: semester?.semester_number || null
        };
    }
};

// Export for backward compatibility
export const semestersData = SEMESTERS;
export const getCurrentSemester = SemesterUtils.getCurrentSemester;
export const getSemestersByYear = SemesterUtils.getSemestersByYear;
export { SEMESTERS };

// Export default
export default {
    semesters: SEMESTERS,
    utils: SemesterUtils,
    context: AcademicContextUtils
};
