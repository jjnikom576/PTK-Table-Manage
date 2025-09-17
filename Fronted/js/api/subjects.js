/**
 * Subjects API Service - Enhanced with Subject Constraints
 * Handles subject operations with room requirements integration
 */

import { getYearBasedEndpoint, getTableName, apiError } from './config.js';
import { subjectsData, getSubjectsByYear, getSubjectsByTeacher } from '../data/subjects.mock.js';

/**
 * Get all subjects for a specific year
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSubjects(year) {
  try {
    const subjects = getSubjectsByYear(year);
    return { ok: true, data: subjects };
  } catch (error) {
    return apiError(`Failed to fetch subjects for year ${year}`, 500, error);
  }
}

/**
 * Get subjects by semester
 * @param {number} semesterId - Semester ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSubjectsBySemester(semesterId, year) {
  try {
    const subjects = getSubjectsByYear(year);
    const filteredSubjects = subjects.filter(s => s.semester_id === parseInt(semesterId));
    
    return { ok: true, data: filteredSubjects };
  } catch (error) {
    return apiError(`Failed to fetch subjects for semester ${semesterId} in year ${year}`, 500, error);
  }
}

/**
 * Get subjects by teacher
 * @param {number} teacherId - Teacher ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSubjectsByTeacherId(teacherId, year) {
  try {
    const subjects = getSubjectsByTeacher(teacherId, year);
    return { ok: true, data: subjects };
  } catch (error) {
    return apiError(`Failed to fetch subjects for teacher ${teacherId} in year ${year}`, 500, error);
  }
}

/**
 * Get subjects by class
 * @param {number} classId - Class ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSubjectsByClass(classId, year) {
  try {
    const subjects = getSubjectsByYear(year);
    const classSubjects = subjects.filter(s => s.class_id === parseInt(classId));
    
    return { ok: true, data: classSubjects };
  } catch (error) {
    return apiError(`Failed to fetch subjects for class ${classId} in year ${year}`, 500, error);
  }
}

/**
 * Create new subject
 * @param {Object} subjectData - Subject data
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function createSubject(subjectData, year) {
  try {
    // Validate required fields
    if (!subjectData.semester_id || !subjectData.teacher_id || !subjectData.class_id || 
        !subjectData.subject_name || !subjectData.periods_per_week) {
      return apiError('Missing required fields', 400);
    }
    
    const tableName = `subjects_${year}`;
    if (!subjectsData[tableName]) {
      subjectsData[tableName] = [];
    }
    
    // Validate periods_per_week
    if (subjectData.periods_per_week < 1 || subjectData.periods_per_week > 12) {
      return apiError('periods_per_week must be between 1 and 12', 400);
    }
    
    // Check for duplicate subject_code if provided
    if (subjectData.subject_code) {
      const existingSubject = subjectsData[tableName].find(s => 
        s.semester_id === subjectData.semester_id &&
        s.class_id === subjectData.class_id &&
        s.subject_code === subjectData.subject_code
      );
      
      if (existingSubject) {
        return apiError(`Subject code ${subjectData.subject_code} already exists for this class and semester`, 409);
      }
    }
    
    // Create new subject
    const newSubject = {
      id: Math.max(...subjectsData[tableName].map(s => s.id), 0) + 1,
      semester_id: parseInt(subjectData.semester_id),
      teacher_id: parseInt(subjectData.teacher_id),
      class_id: parseInt(subjectData.class_id),
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code || null,
      periods_per_week: parseInt(subjectData.periods_per_week),
      subject_constraints: subjectData.subject_constraints || {},
      default_room_id: subjectData.default_room_id || null,
      room_preferences: subjectData.room_preferences || {},
      created_at: new Date().toISOString()
    };
    
    subjectsData[tableName].push(newSubject);
    
    return { ok: true, data: newSubject };
  } catch (error) {
    return apiError(`Failed to create subject for year ${year}`, 500, error);
  }
}

/**
 * Update subject
 * @param {number} subjectId - Subject ID
 * @param {Object} updateData - Data to update
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function updateSubject(subjectId, updateData, year) {
  try {
    const tableName = `subjects_${year}`;
    if (!subjectsData[tableName]) {
      return apiError(`No subjects data for year ${year}`, 404);
    }
    
    const subjectIndex = subjectsData[tableName].findIndex(s => s.id === parseInt(subjectId));
    
    if (subjectIndex === -1) {
      return apiError(`Subject ${subjectId} not found in year ${year}`, 404);
    }
    
    // Validate periods_per_week if provided
    if (updateData.periods_per_week && 
        (updateData.periods_per_week < 1 || updateData.periods_per_week > 12)) {
      return apiError('periods_per_week must be between 1 and 12', 400);
    }
    
    // Update subject data
    const updatedSubject = {
      ...subjectsData[tableName][subjectIndex],
      ...updateData,
      id: parseInt(subjectId)
    };
    
    subjectsData[tableName][subjectIndex] = updatedSubject;
    
    return { ok: true, data: updatedSubject };
  } catch (error) {
    return apiError(`Failed to update subject ${subjectId} for year ${year}`, 500, error);
  }
}

/**
 * Delete subject
 * @param {number} subjectId - Subject ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data?: Object, error?: string }
 */
export async function deleteSubject(subjectId, year) {
  try {
    const tableName = `subjects_${year}`;
    if (!subjectsData[tableName]) {
      return apiError(`No subjects data for year ${year}`, 404);
    }
    
    const subjectIndex = subjectsData[tableName].findIndex(s => s.id === parseInt(subjectId));
    
    if (subjectIndex === -1) {
      return apiError(`Subject ${subjectId} not found in year ${year}`, 404);
    }
    
    const deletedSubject = subjectsData[tableName].splice(subjectIndex, 1)[0];
    
    return { ok: true, data: deletedSubject };
  } catch (error) {
    return apiError(`Failed to delete subject ${subjectId} for year ${year}`, 500, error);
  }
}
