/**
 * Academic Years Mock Data
 * Multi-Year Schedule System
 */

// Mock Academic Years Data
const ACADEMIC_YEARS = [
    {
        id: 1,
        year: 2566,
        start_date: '2023-05-15',
        end_date: '2024-04-30',
        is_active: false,
        created_at: '2023-05-01T00:00:00.000Z'
    },
    {
        id: 2,
        year: 2567,
        start_date: '2024-05-15',
        end_date: '2025-04-30',
        is_active: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 3,
        year: 2568,
        start_date: '2025-05-15',
        end_date: '2026-04-30',
        is_active: false,
        created_at: '2025-05-01T00:00:00.000Z'
    },
    {
        id: 4,
        year: 2569,
        start_date: '2026-05-15',
        end_date: '2027-04-30',
        is_active: false,
        created_at: '2026-05-01T00:00:00.000Z'
    },
    {
        id: 5,
        year: 2570,
        start_date: '2027-05-15',
        end_date: '2028-04-30',
        is_active: false,
        created_at: '2027-05-01T00:00:00.000Z'
    }
];

// Helper Functions
export const AcademicYearUtils = {
    /**
     * Get all academic years
     * @returns {Array} - Array of academic year objects
     */
    getAll() {
        return [...ACADEMIC_YEARS];
    },

    /**
     * Get current active academic year
     * @returns {Object|null} - Current academic year object
     */
    getCurrentAcademicYear() {
        return ACADEMIC_YEARS.find(year => year.is_active) || null;
    },

    /**
     * Get academic year by year number
     * @param {number|string} yearNumber - Academic year (e.g., 2567)
     * @returns {Object|null} - Academic year object
     */
    getYearByNumber(yearNumber) {
        const year = parseInt(yearNumber);
        return ACADEMIC_YEARS.find(ay => ay.year === year) || null;
    },

    /**
     * Get academic year by ID
     * @param {number} id - Academic year ID
     * @returns {Object|null} - Academic year object
     */
    getYearById(id) {
        return ACADEMIC_YEARS.find(ay => ay.id === id) || null;
    },

    /**
     * List available years for dropdown/selection
     * @returns {Array} - Array of {value, label} objects
     */
    listAvailableYears() {
        return ACADEMIC_YEARS.map(year => ({
            value: year.year.toString(),
            label: `ปีการศึกษา ${year.year}`,
            id: year.id,
            is_active: year.is_active
        }));
    }
};

// Export for backward compatibility
export const academicYearsData = ACADEMIC_YEARS;
export { ACADEMIC_YEARS };

// Export default
export default {
    years: ACADEMIC_YEARS,
    utils: AcademicYearUtils
};
