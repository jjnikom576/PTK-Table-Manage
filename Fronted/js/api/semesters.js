/**
 * Semesters API Service
 * Handles semester operations within academic years
 */

import { API_CONFIG, apiError } from './config.js';
import { semestersData, getSemestersByYear, getCurrentSemester } from '../data/semesters.mock.js';

/**
 * Get all semesters for a specific academic year
 * @param {number} yearId - Academic year ID
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSemesters(yearId) {
  try {
    const semesters = getSemestersByYear(yearId);
    return { ok: true, data: semesters };
  } catch (error) {
    return apiError(`Failed to fetch semesters for year ${yearId}`, 500, error);
  }
}

/**
 * Get semester by ID
 * @param {number} semesterId - Semester ID
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getSemester(semesterId) {
  try {
    const semester = semestersData.find(s => s.id === parseInt(semesterId));
    
    if (!semester) {
      return apiError(`Semester ${semesterId} not found`, 404);
    }
    
    return { ok: true, data: semester };
  } catch (error) {
    return apiError(`Failed to fetch semester ${semesterId}`, 500, error);
  }
}

/**
 * Get current active semester
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getActiveSemester() {
  try {
    const activeSemester = getCurrentSemester();
    
    if (!activeSemester) {
      return apiError('No active semester found', 404);
    }
    
    return { ok: true, data: activeSemester };
  } catch (error) {
    return apiError('Failed to fetch active semester', 500, error);
  }
}

/**
 * Create new semester
 * @param {Object} semesterData - Semester data
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function createSemester(semesterData) {
  try {
    // Validate required fields
    if (!semesterData.academic_year_id || !semesterData.semester_number || !semesterData.semester_name) {
      return apiError('Missing required fields', 400);
    }
    
    // Check if semester already exists for this year
    const existingSemester = semestersData.find(s => 
      s.academic_year_id === semesterData.academic_year_id && 
      s.semester_number === semesterData.semester_number
    );
    
    if (existingSemester) {
      return apiError(`Semester ${semesterData.semester_number} already exists for this year`, 409);
    }
    
    // Create new semester
    const newSemester = {
      id: Math.max(...semestersData.map(s => s.id), 0) + 1,
      academic_year_id: parseInt(semesterData.academic_year_id),
      semester_number: parseInt(semesterData.semester_number),
      semester_name: semesterData.semester_name,
      start_date: semesterData.start_date,
      end_date: semesterData.end_date,
      is_active: semesterData.is_active || false,
      created_at: new Date().toISOString()
    };
    
    semestersData.push(newSemester);
    
    return { ok: true, data: newSemester };
  } catch (error) {
    return apiError('Failed to create semester', 500, error);
  }
}

/**
 * Update semester
 * @param {number} semesterId - Semester ID
 * @param {Object} updateData - Data to update
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function updateSemester(semesterId, updateData) {
  try {
    const semesterIndex = semestersData.findIndex(s => s.id === parseInt(semesterId));
    
    if (semesterIndex === -1) {
      return apiError(`Semester ${semesterId} not found`, 404);
    }
    
    // Update semester data
    const updatedSemester = {
      ...semestersData[semesterIndex],
      ...updateData,
      id: parseInt(semesterId)
    };
    
    semestersData[semesterIndex] = updatedSemester;
    
    return { ok: true, data: updatedSemester };
  } catch (error) {
    return apiError(`Failed to update semester ${semesterId}`, 500, error);
  }
}

/**
 * Delete semester
 * @param {number} semesterId - Semester ID
 * @returns {Object} { ok: boolean, data?: Object, error?: string }
 */
export async function deleteSemester(semesterId) {
  try {
    const semesterIndex = semestersData.findIndex(s => s.id === parseInt(semesterId));
    
    if (semesterIndex === -1) {
      return apiError(`Semester ${semesterId} not found`, 404);
    }
    
    const deletedSemester = semestersData.splice(semesterIndex, 1)[0];
    
    return { ok: true, data: deletedSemester };
  } catch (error) {
    return apiError(`Failed to delete semester ${semesterId}`, 500, error);
  }
}

/**
 * Set active semester for a year
 * @param {number} semesterId - Semester ID to activate
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function setActiveSemester(semesterId) {
  try {
    const targetSemester = semestersData.find(s => s.id === parseInt(semesterId));
    
    if (!targetSemester) {
      return apiError(`Semester ${semesterId} not found`, 404);
    }
    
    // Set all semesters of the same year as inactive
    semestersData.forEach(s => {
      if (s.academic_year_id === targetSemester.academic_year_id) {
        s.is_active = false;
      }
    });
    
    // Set target semester as active
    targetSemester.is_active = true;
    
    return { ok: true, data: targetSemester };
  } catch (error) {
    return apiError(`Failed to set active semester ${semesterId}`, 500, error);
  }
}