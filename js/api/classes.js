/**
 * Classes API Service - Multi-Year Classes Management
 * Handles class (student groups) operations separate from physical rooms
 */

import { getYearBasedEndpoint, getTableName, apiError } from './config.js';
import { classesData, getClassesByYear, getClassesBySemester } from '../data/classes.mock.js';

/**
 * Get all classes for a specific year
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getClasses(year) {
  try {
    const classes = getClassesByYear(year);
    return { 
      ok: true, 
      data: classes.sort((a, b) => {
        // Sort by grade level then section
        const gradeA = a.grade_level.localeCompare(b.grade_level, 'th');
        if (gradeA !== 0) return gradeA;
        return (a.section || 0) - (b.section || 0);
      })
    };
  } catch (error) {
    return apiError(`Failed to fetch classes for year ${year}`, 500, error);
  }
}

/**
 * Get classes by semester
 * @param {number} semesterId - Semester ID
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getClassesBySemesterId(semesterId) {
  try {
    const classes = getClassesBySemester(semesterId);
    return { ok: true, data: classes };
  } catch (error) {
    return apiError(`Failed to fetch classes for semester ${semesterId}`, 500, error);
  }
}

/**
 * Get class by ID
 * @param {number} classId - Class ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getClassById(classId, year) {
  try {
    const classes = getClassesByYear(year);
    const classData = classes.find(c => c.id === parseInt(classId));
    
    if (!classData) {
      return apiError(`Class ${classId} not found in year ${year}`, 404);
    }
    
    return { ok: true, data: classData };
  } catch (error) {
    return apiError(`Failed to fetch class ${classId} for year ${year}`, 500, error);
  }
}

/**
 * Get classes by grade level
 * @param {string} gradeLevel - Grade level (e.g., "ม.1")
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getClassesByGradeLevel(gradeLevel, year) {
  try {
    const classes = getClassesByYear(year);
    const filteredClasses = classes.filter(c => c.grade_level === gradeLevel);
    
    return { ok: true, data: filteredClasses };
  } catch (error) {
    return apiError(`Failed to fetch classes for grade ${gradeLevel} in year ${year}`, 500, error);
  }
}

/**
 * Create new class
 * @param {Object} classData - Class data
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function createClass(classData, year) {
  try {
    // Validate required fields
    if (!classData.semester_id || !classData.grade_level || !classData.section) {
      return apiError('Missing required fields: semester_id, grade_level, section', 400);
    }
    
    const tableName = `classes_${year}`;
    if (!classesData[tableName]) {
      classesData[tableName] = [];
    }
    
    // Generate class name
    const className = `${classData.grade_level}/${classData.section}`;
    
    // Check if class already exists
    const existingClass = classesData[tableName].find(c => 
      c.semester_id === classData.semester_id && c.class_name === className
    );
    
    if (existingClass) {
      return apiError(`Class ${className} already exists for this semester`, 409);
    }
    
    // Create new class
    const newClass = {
      id: Math.max(...classesData[tableName].map(c => c.id), 0) + 1,
      semester_id: parseInt(classData.semester_id),
      class_name: className,
      grade_level: classData.grade_level,
      section: parseInt(classData.section),
      student_count: classData.student_count || null,
      created_at: new Date().toISOString()
    };
    
    classesData[tableName].push(newClass);
    
    return { ok: true, data: newClass };
  } catch (error) {
    return apiError(`Failed to create class for year ${year}`, 500, error);
  }
}

/**
 * Update class
 * @param {number} classId - Class ID
 * @param {Object} updateData - Data to update
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function updateClass(classId, updateData, year) {
  try {
    const tableName = `classes_${year}`;
    if (!classesData[tableName]) {
      return apiError(`No classes data for year ${year}`, 404);
    }
    
    const classIndex = classesData[tableName].findIndex(c => c.id === parseInt(classId));
    
    if (classIndex === -1) {
      return apiError(`Class ${classId} not found in year ${year}`, 404);
    }
    
    // Update class data and regenerate class_name if needed
    const updatedClass = {
      ...classesData[tableName][classIndex],
      ...updateData,
      id: parseInt(classId)
    };
    
    // Regenerate class_name if grade_level or section changed
    if (updateData.grade_level || updateData.section) {
      const gradeLevel = updateData.grade_level || updatedClass.grade_level;
      const section = updateData.section || updatedClass.section;
      updatedClass.class_name = `${gradeLevel}/${section}`;
    }
    
    classesData[tableName][classIndex] = updatedClass;
    
    return { ok: true, data: updatedClass };
  } catch (error) {
    return apiError(`Failed to update class ${classId} for year ${year}`, 500, error);
  }
}

/**
 * Delete class
 * @param {number} classId - Class ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data?: Object, error?: string }
 */
export async function deleteClass(classId, year) {
  try {
    const tableName = `classes_${year}`;
    if (!classesData[tableName]) {
      return apiError(`No classes data for year ${year}`, 404);
    }
    
    const classIndex = classesData[tableName].findIndex(c => c.id === parseInt(classId));
    
    if (classIndex === -1) {
      return apiError(`Class ${classId} not found in year ${year}`, 404);
    }
    
    const deletedClass = classesData[tableName].splice(classIndex, 1)[0];
    
    return { ok: true, data: deletedClass };
  } catch (error) {
    return apiError(`Failed to delete class ${classId} for year ${year}`, 500, error);
  }
}