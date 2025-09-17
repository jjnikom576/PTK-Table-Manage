/**
 * Teachers API Service - Enhanced for Multi-Year System
 * Handles year-specific teacher operations with export integration
 */

import { getYearBasedEndpoint, getTableName, apiError } from './config.js';
import { teachersData, getTeachersByYear, findTeacherByName } from '../data/teachers.mock.js';

/**
 * Get all teachers for a specific year
 * @param {number} year - Academic year (e.g., 2567)
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getTeachers(year) {
  try {
    // In production: const url = getYearBasedEndpoint('teachers', year);
    // const response = await fetch(url);
    
    const teachers = getTeachersByYear(year);
    return { 
      ok: true, 
      data: teachers.sort((a, b) => a.name.localeCompare(b.name, 'th'))
    };
  } catch (error) {
    return apiError(`Failed to fetch teachers for year ${year}`, 500, error);
  }
}

/**
 * Get teacher by ID for specific year
 * @param {number} teacherId - Teacher ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getTeacherById(teacherId, year) {
  try {
    const teachers = getTeachersByYear(year);
    const teacher = teachers.find(t => t.id === parseInt(teacherId));
    
    if (!teacher) {
      return apiError(`Teacher ${teacherId} not found in year ${year}`, 404);
    }
    
    return { ok: true, data: teacher };
  } catch (error) {
    return apiError(`Failed to fetch teacher ${teacherId} for year ${year}`, 500, error);
  }
}

/**
 * Get teacher by name for specific year
 * @param {string} name - Teacher name
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getTeacherByName(name, year) {
  try {
    const teacher = findTeacherByName(name, year);
    
    if (!teacher) {
      return apiError(`Teacher "${name}" not found in year ${year}`, 404);
    }
    
    return { ok: true, data: teacher };
  } catch (error) {
    return apiError(`Failed to fetch teacher "${name}" for year ${year}`, 500, error);
  }
}

/**
 * Get teachers by subject group for specific year
 * @param {string} subjectGroup - Subject group name
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getTeachersBySubjectGroup(subjectGroup, year) {
  try {
    const teachers = getTeachersByYear(year);
    const filteredTeachers = teachers.filter(t => 
      t.subject_group && t.subject_group.toLowerCase() === subjectGroup.toLowerCase()
    );
    
    return { ok: true, data: filteredTeachers };
  } catch (error) {
    return apiError(`Failed to fetch teachers by subject group ${subjectGroup} for year ${year}`, 500, error);
  }
}

/**
 * Create new teacher for specific year
 * @param {Object} teacherData - Teacher data
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function createTeacher(teacherData, year) {
  try {
    // Validate required fields
    if (!teacherData.name) {
      return apiError('Teacher name is required', 400);
    }
    
    // Get year-specific teachers
    const tableName = `teachers_${year}`;
    if (!teachersData[tableName]) {
      teachersData[tableName] = [];
    }
    
    // Check if teacher already exists
    const existingTeacher = teachersData[tableName].find(t => 
      t.name.toLowerCase() === teacherData.name.toLowerCase()
    );
    
    if (existingTeacher) {
      return apiError(`Teacher "${teacherData.name}" already exists in year ${year}`, 409);
    }
    
    // Create new teacher
    const newTeacher = {
      id: Math.max(...teachersData[tableName].map(t => t.id), 0) + 1,
      name: teacherData.name,
      email: teacherData.email || null,
      phone: teacherData.phone || null,
      subject_group: teacherData.subject_group || null,
      role: teacherData.role || 'teacher',
      user_id: teacherData.user_id || null,
      created_at: new Date().toISOString()
    };
    
    teachersData[tableName].push(newTeacher);
    
    return { ok: true, data: newTeacher };
  } catch (error) {
    return apiError(`Failed to create teacher for year ${year}`, 500, error);
  }
}

/**
 * Update teacher for specific year
 * @param {number} teacherId - Teacher ID
 * @param {Object} updateData - Data to update
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function updateTeacher(teacherId, updateData, year) {
  try {
    const tableName = `teachers_${year}`;
    if (!teachersData[tableName]) {
      return apiError(`No teachers data for year ${year}`, 404);
    }
    
    const teacherIndex = teachersData[tableName].findIndex(t => t.id === parseInt(teacherId));
    
    if (teacherIndex === -1) {
      return apiError(`Teacher ${teacherId} not found in year ${year}`, 404);
    }
    
    // Update teacher data
    const updatedTeacher = {
      ...teachersData[tableName][teacherIndex],
      ...updateData,
      id: parseInt(teacherId) // Ensure ID doesn't change
    };
    
    teachersData[tableName][teacherIndex] = updatedTeacher;
    
    return { ok: true, data: updatedTeacher };
  } catch (error) {
    return apiError(`Failed to update teacher ${teacherId} for year ${year}`, 500, error);
  }
}

/**
 * Delete teacher for specific year
 * @param {number} teacherId - Teacher ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data?: Object, error?: string }
 */
export async function deleteTeacher(teacherId, year) {
  try {
    const tableName = `teachers_${year}`;
    if (!teachersData[tableName]) {
      return apiError(`No teachers data for year ${year}`, 404);
    }
    
    const teacherIndex = teachersData[tableName].findIndex(t => t.id === parseInt(teacherId));
    
    if (teacherIndex === -1) {
      return apiError(`Teacher ${teacherId} not found in year ${year}`, 404);
    }
    
    const deletedTeacher = teachersData[tableName].splice(teacherIndex, 1)[0];
    
    return { ok: true, data: deletedTeacher };
  } catch (error) {
    return apiError(`Failed to delete teacher ${teacherId} for year ${year}`, 500, error);
  }
}

/**
 * Copy teacher to new year (for year transitions)
 * @param {number} teacherId - Teacher ID
 * @param {number} fromYear - Source year
 * @param {number} toYear - Target year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function copyTeacherToNewYear(teacherId, fromYear, toYear) {
  try {
    // Get teacher from source year
    const sourceResult = await getTeacherById(teacherId, fromYear);
    if (!sourceResult.ok) {
      return sourceResult;
    }
    
    const sourceTeacher = sourceResult.data;
    
    // Create teacher in target year (without ID)
    const { id, created_at, ...teacherData } = sourceTeacher;
    
    const createResult = await createTeacher(teacherData, toYear);
    return createResult;
    
  } catch (error) {
    return apiError(`Failed to copy teacher ${teacherId} from ${fromYear} to ${toYear}`, 500, error);
  }
}

/**
 * Get teachers formatted for export
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getTeachersForExport(year) {
  try {
    const result = await getTeachers(year);
    if (!result.ok) {
      return result;
    }
    
    // Format teachers for export
    const exportData = result.data.map(teacher => ({
      'ชื่อ': teacher.name,
      'กลุ่มสาระ': teacher.subject_group || '',
      'อีเมล': teacher.email || '',
      'เบอร์โทร': teacher.phone || '',
      'บทบาท': teacher.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครู',
      'วันที่เพิ่ม': new Date(teacher.created_at).toLocaleDateString('th-TH')
    }));
    
    return { ok: true, data: exportData };
  } catch (error) {
    return apiError(`Failed to format teachers for export (year ${year})`, 500, error);
  }
}
