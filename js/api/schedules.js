/**
 * Schedules API Service - Context-aware Schedule Operations
 * Handles schedule operations with 3D conflict detection (teacher/class/room)
 */

import { getYearBasedEndpoint, getTableName, apiError } from './config.js';

// Simple mock schedules
const mockSchedules = [
  { id: 1, class_id: 1, subject_id: 1, teacher_id: 1, room_id: 1, day_of_week: 1, period: 1 },
  { id: 2, class_id: 1, subject_id: 2, teacher_id: 4, room_id: 1, day_of_week: 1, period: 2 },
  { id: 3, class_id: 1, subject_id: 3, teacher_id: 7, room_id: 1, day_of_week: 1, period: 3 },
];

/**
 * Get all schedules for a specific year
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSchedules(year) {
  try {
    return { ok: true, data: mockSchedules };
  } catch (error) {
    return apiError(`Failed to fetch schedules for year ${year}`, 500, error);
  }
}

/**
 * Get schedules by semester
 * @param {number} semesterId - Semester ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSchedulesBySemester(semesterId, year) {
  try {
    const schedules = getSchedulesByYear(year);
    const semesterSchedules = schedules.filter(s => s.semester_id === parseInt(semesterId));
    
    return { ok: true, data: semesterSchedules };
  } catch (error) {
    return apiError(`Failed to fetch schedules for semester ${semesterId} in year ${year}`, 500, error);
  }
}

/**
 * Get schedules by class
 * @param {number} classId - Class ID
 * @param {number} semesterId - Semester ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSchedulesByClass(classId, semesterId, year) {
  try {
    const schedules = getSchedulesByYear(year);
    const classSchedules = schedules.filter(s => 
      s.class_id === parseInt(classId) && s.semester_id === parseInt(semesterId)
    );
    
    return { ok: true, data: classSchedules };
  } catch (error) {
    return apiError(`Failed to fetch schedules for class ${classId} in year ${year}`, 500, error);
  }
}

/**
 * Get schedules by teacher (via subjects)
 * @param {number} teacherId - Teacher ID
 * @param {number} semesterId - Semester ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getSchedulesByTeacher(teacherId, semesterId, year) {
  try {
    // This would join with subjects table in real implementation
    // Mock implementation: filter by teacherId through subjects
    const schedules = getSchedulesByYear(year);
    const teacherSchedules = schedules.filter(s => 
      s.teacher_id === parseInt(teacherId) && s.semester_id === parseInt(semesterId)
    );
    
    return { ok: true, data: teacherSchedules };
  } catch (error) {
    return apiError(`Failed to fetch schedules for teacher ${teacherId} in year ${year}`, 500, error);
  }
}

/**
 * Create new schedule with conflict validation
 * @param {Object} scheduleData - Schedule data
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function createSchedule(scheduleData, year) {
  try {
    // Validate required fields
    if (!scheduleData.semester_id || !scheduleData.subject_id || !scheduleData.class_id ||
        !scheduleData.day_of_week || !scheduleData.period) {
      return apiError('Missing required fields', 400);
    }
    
    // Validate ranges
    if (scheduleData.day_of_week < 1 || scheduleData.day_of_week > 7) {
      return apiError('day_of_week must be between 1 and 7', 400);
    }
    
    if (scheduleData.period < 1 || scheduleData.period > 12) {
      return apiError('period must be between 1 and 12', 400);
    }
    
    const tableName = `schedules_${year}`;
    if (!schedulesData[tableName]) {
      schedulesData[tableName] = [];
    }
    
    // Check for conflicts (3D: teacher, class, room)
    const existingSchedules = schedulesData[tableName];
    const conflictCheck = validateScheduleConflict(scheduleData, existingSchedules, year);
    
    if (!conflictCheck.ok) {
      return conflictCheck;
    }
    
    // Create new schedule
    const newSchedule = {
      id: Math.max(...existingSchedules.map(s => s.id), 0) + 1,
      semester_id: parseInt(scheduleData.semester_id),
      subject_id: parseInt(scheduleData.subject_id),
      class_id: parseInt(scheduleData.class_id),
      day_of_week: parseInt(scheduleData.day_of_week),
      period: parseInt(scheduleData.period),
      room_id: scheduleData.room_id || null,
      created_at: new Date().toISOString()
    };
    
    schedulesData[tableName].push(newSchedule);
    
    return { ok: true, data: newSchedule };
  } catch (error) {
    return apiError(`Failed to create schedule for year ${year}`, 500, error);
  }
}

/**
 * Update schedule with conflict validation
 * @param {number} scheduleId - Schedule ID
 * @param {Object} updateData - Data to update
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function updateSchedule(scheduleId, updateData, year) {
  try {
    const tableName = `schedules_${year}`;
    if (!schedulesData[tableName]) {
      return apiError(`No schedules data for year ${year}`, 404);
    }
    
    const scheduleIndex = schedulesData[tableName].findIndex(s => s.id === parseInt(scheduleId));
    
    if (scheduleIndex === -1) {
      return apiError(`Schedule ${scheduleId} not found in year ${year}`, 404);
    }
    
    // Create updated schedule object for conflict checking
    const currentSchedule = schedulesData[tableName][scheduleIndex];
    const updatedScheduleData = { ...currentSchedule, ...updateData };
    
    // Check conflicts (excluding current schedule)
    const existingSchedules = schedulesData[tableName].filter(s => s.id !== parseInt(scheduleId));
    const conflictCheck = validateScheduleConflict(updatedScheduleData, existingSchedules, year);
    
    if (!conflictCheck.ok) {
      return conflictCheck;
    }
    
    // Update schedule
    const updatedSchedule = {
      ...currentSchedule,
      ...updateData,
      id: parseInt(scheduleId)
    };
    
    schedulesData[tableName][scheduleIndex] = updatedSchedule;
    
    return { ok: true, data: updatedSchedule };
  } catch (error) {
    return apiError(`Failed to update schedule ${scheduleId} for year ${year}`, 500, error);
  }
}

/**
 * Delete schedule
 * @param {number} scheduleId - Schedule ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data?: Object, error?: string }
 */
export async function deleteSchedule(scheduleId, year) {
  try {
    const tableName = `schedules_${year}`;
    if (!schedulesData[tableName]) {
      return apiError(`No schedules data for year ${year}`, 404);
    }
    
    const scheduleIndex = schedulesData[tableName].findIndex(s => s.id === parseInt(scheduleId));
    
    if (scheduleIndex === -1) {
      return apiError(`Schedule ${scheduleId} not found in year ${year}`, 404);
    }
    
    const deletedSchedule = schedulesData[tableName].splice(scheduleIndex, 1)[0];
    
    return { ok: true, data: deletedSchedule };
  } catch (error) {
    return apiError(`Failed to delete schedule ${scheduleId} for year ${year}`, 500, error);
  }
}

/**
 * Validate schedule conflicts (3D checking)
 * @param {Object} scheduleData - Schedule to validate
 * @param {number} year - Academic year
 * @param {number} excludeScheduleId - Schedule ID to exclude from conflict check
 * @returns {Object} { ok: boolean, conflicts?: Object, error?: string }
 */
export async function validateScheduleConflicts(scheduleData, year, excludeScheduleId = null) {
  try {
    const tableName = `schedules_${year}`;
    if (!schedulesData[tableName]) {
      return { ok: true, conflicts: { teacher: false, class: false, room: false } };
    }
    
    const existingSchedules = schedulesData[tableName].filter(s => 
      !excludeScheduleId || s.id !== parseInt(excludeScheduleId)
    );
    
    const conflictCheck = validateScheduleConflict(scheduleData, existingSchedules, year);
    
    return conflictCheck;
  } catch (error) {
    return apiError(`Failed to validate schedule conflicts for year ${year}`, 500, error);
  }
}