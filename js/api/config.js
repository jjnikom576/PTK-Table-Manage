/**
 * Enhanced API Configuration for Multi-Year Schedule System
 * Part 1: Basic Structure & Environment Detection
 */

// Environment Detection
const ENV = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production'
};

const CURRENT_ENV = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ? 
                   ENV.DEVELOPMENT : ENV.PRODUCTION;

// Base API Configuration
const API_CONFIG = {
    [ENV.DEVELOPMENT]: {
        baseURL: 'http://localhost:8080/api',
        timeout: 10000,
        debug: true
    },
    [ENV.PRODUCTION]: {
        baseURL: '/api',
        timeout: 30000,
        debug: false
    }
};

const config = API_CONFIG[CURRENT_ENV];

// Fixed Tables (ไม่แยกตามปี)
const FIXED_ENDPOINTS = {
    ACADEMIC_YEARS: '/academic-years',
    SEMESTERS: '/semesters/:yearId',
    PERIODS: '/periods', // คาบเรียน optional
    SYSTEM_CONFIG: '/system/config'
};

// Dynamic Tables (แยกตามปีการศึกษา)
const DYNAMIC_TABLES = {
    TEACHERS: 'teachers',
    CLASSES: 'classes', 
    ROOMS: 'rooms',     // ← ใหม่
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    SUBSTITUTIONS: 'substitutions'
};

// Export Configuration Constants
export const EXPORT_CONST = {
    MIME: {
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        json: 'application/json'
    },
    
    // Dynamic filename generator
    defaultFilename: (base, context = {}) => {
        const { year, semester } = context;
        const date = new Date().toISOString().slice(0, 10);
        const semesterStr = semester ? `_s${semester}` : '_all';
        
        return `${base}_y${year}${semesterStr}_${date}`;
    },
    
    EXTENSIONS: {
        csv: '.csv',
        xlsx: '.xlsx', 
        json: '.json'
    }
};

// Multi-Year Table Naming Helpers
export const TableUtils = {
    /**
     * Generate table name with year suffix
     * @param {string} baseTable - Base table name
     * @param {string|number} year - Academic year (e.g., 2567)
     * @returns {string} - Full table name (e.g., "rooms_2567")
     */
    getTableName(baseTable, year) {
        if (!year) {
            throw new Error('Academic year is required for table naming');
        }
        return `${baseTable}_${year}`;
    },

    /**
     * Generate year-based API endpoint
     * @param {string} endpoint - Base endpoint
     * @param {string|number} year - Academic year
     * @returns {string} - Full endpoint path
     */
    getYearBasedEndpoint(endpoint, year) {
        if (!this.isYearSpecificTable(endpoint)) {
            return endpoint;
        }
        
        const tableName = this.getTableName(endpoint, year);
        return `/${tableName}`;
    },

    /**
     * Check if table requires year specification
     * @param {string} tableName - Table name to check
     * @returns {boolean}
     */
    isYearSpecificTable(tableName) {
        return Object.values(DYNAMIC_TABLES).includes(tableName.replace(/_\d{4}$/, ''));
    },

    /**
     * Extract year from table name
     * @param {string} tableName - Full table name with year
     * @returns {string|null} - Extracted year or null
     */
    getYearFromTableName(tableName) {
        const match = tableName.match(/_(\d{4})$/);
        return match ? match[1] : null;
    }
};

// Academic Year Validation and Context Management
export const YearUtils = {
    /**
     * Validate if year is accessible (within allowed range)
     * @param {string|number} year - Academic year to validate
     * @returns {boolean} - Is year valid and accessible
     */
    validateYearAccess(year) {
        const currentYear = new Date().getFullYear() + 543; // Convert to Buddhist year
        const numYear = parseInt(year);
        
        // Allow ±5 years from current year
        const minYear = currentYear - 5;
        const maxYear = currentYear + 5;
        
        return numYear >= minYear && numYear <= maxYear && numYear >= 2560;
    },

    /**
     * Get current academic context from global state or default
     * @returns {Object} - Current academic context
     */
    getCurrentAcademicContext() {
        // Try to get from global state first
        if (window.globalAcademicContext) {
            return {
                year: window.globalAcademicContext.currentYear,
                semester: window.globalAcademicContext.currentSemester
            };
        }
        
        // Fallback to current year
        const currentYear = new Date().getFullYear() + 543;
        return {
            year: currentYear.toString(),
            semester: '1'
        };
    }
};

// API Error Handling
export const APIError = {
    /**
     * Create standardized API error object
     * @param {string} message - Error message
     * @param {number} code - HTTP status code
     * @param {Object} detail - Additional error details
     * @returns {Error} - Formatted error object
     */
    create(message, code = 500, detail = {}) {
        const error = new Error(message);
        error.code = code;
        error.detail = detail;
        error.timestamp = new Date().toISOString();
        
        if (config.debug) {
            console.error('[API Error]', {
                message,
                code,
                detail,
                stack: error.stack
            });
        }
        
        return error;
    },

    /**
     * Handle year validation errors
     * @param {string|number} year - Invalid year
     * @returns {Error} - Year validation error
     */
    invalidYear(year) {
        return this.create(
            `Invalid academic year: ${year}`,
            400,
            { type: 'INVALID_YEAR', year }
        );
    },

    /**
     * Handle table existence errors
     * @param {string} tableName - Non-existent table
     * @returns {Error} - Table not found error
     */
    tableNotFound(tableName) {
        return this.create(
            `Table not found: ${tableName}`,
            404,
            { type: 'TABLE_NOT_FOUND', table: tableName }
        );
    }
};

// Main API Configuration Export
export const API = {
    // Environment
    ENV: CURRENT_ENV,
    config,
    
    // Endpoints
    FIXED: FIXED_ENDPOINTS,
    DYNAMIC: DYNAMIC_TABLES,
    
    // Utilities
    table: TableUtils,
    year: YearUtils,
    error: APIError,
    export: EXPORT_CONST,
    
    /**
     * Build full API URL
     * @param {string} endpoint - API endpoint
     * @param {Object} params - URL parameters
     * @returns {string} - Complete API URL
     */
    buildURL(endpoint, params = {}) {
        let url = config.baseURL + endpoint;
        
        // Replace URL parameters
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });
        
        return url;
    },
    
    /**
     * Get headers for API requests
     * @param {Object} additional - Additional headers
     * @returns {Object} - Request headers
     */
    getHeaders(additional = {}) {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...additional
        };
    }
};

// Export configuration for backward compatibility
export { API_CONFIG };
export const apiError = APIError.create;
export const getTableName = TableUtils.getTableName;
export const getYearBasedEndpoint = TableUtils.getYearBasedEndpoint;

// Export default configuration
export default API;
