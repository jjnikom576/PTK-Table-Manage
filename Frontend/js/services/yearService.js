/**
 * Year Service Layer for Multi-Year School Schedule System
 * Features: Academic year management, Context switching, Data migration, Rooms integration
 */

import { mockData } from '../data/index.js';
import * as dataService from './dataService.js';

// =============================================================================
// SERVICE STATE & CONFIGURATION
// =============================================================================

let yearServiceConfig = {
  enableEvents: true,
  autoValidation: true,
  defaultSemesterCount: 2
};

let currentState = {
  activeYear: null,
  activeSemester: null,
  availableYears: [],
  availableSemesters: []
};

// Event listeners
const eventListeners = {
  yearChange: [],
  semesterChange: [],
  roomDataChange: []
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Initialize Year Service
 */
export function initYearService() {
  console.log('[YearService] Initializing year service');
  
  // Load initial data
  loadInitialYearData();
  
  return { ok: true };
}

/**
 * Get Current Academic Year
 */
export function getCurrentAcademicYear() {
  if (currentState.activeYear) {
    return currentState.activeYear;
  }
  
  // Find active year from mock data
  const activeYear = mockData.academicYears.find(year => year.is_active);
  if (activeYear) {
    currentState.activeYear = activeYear;
    return activeYear;
  }
  
  // Default to most recent year
  const sortedYears = mockData.academicYears.sort((a, b) => b.year - a.year);
  currentState.activeYear = sortedYears[0];
  return currentState.activeYear;
}

/**
 * Get Current Semester
 */
export function getCurrentSemester() {
  if (currentState.activeSemester) {
    return currentState.activeSemester;
  }
  
  const currentYear = getCurrentAcademicYear();
  if (!currentYear) return null;
  
  // Find active semester for current year
  const yearSemesters = mockData.semesters.filter(s => s.academic_year_id === currentYear.id);
  const activeSemester = yearSemesters.find(s => s.is_active);
  
  if (activeSemester) {
    currentState.activeSemester = activeSemester;
    return activeSemester;
  }
  
  // Default to first semester
  currentState.activeSemester = yearSemesters[0];
  return currentState.activeSemester;
}

/**
 * Set Active Context
 */
export async function setActiveContext(year, semesterId) {
  try {
    // Validate year
    const yearData = mockData.academicYears.find(y => y.year === year);
    if (!yearData) {
      throw new Error(`Academic year ${year} not found`);
    }
    
    // Validate semester
    let semesterData = null;
    if (semesterId) {
      semesterData = mockData.semesters.find(s => s.id === semesterId);
      if (!semesterData) {
        throw new Error(`Semester ${semesterId} not found`);
      }
      
      // Validate semester belongs to year
      if (semesterData.academic_year_id !== yearData.id) {
        throw new Error(`Semester ${semesterId} does not belong to year ${year}`);
      }
    }
    
    // Update state
    const previousYear = currentState.activeYear;
    const previousSemester = currentState.activeSemester;
    
    currentState.activeYear = yearData;
    currentState.activeSemester = semesterData;
    
    // Update data service context
    await dataService.setGlobalContext(year, semesterId);
    
    // Trigger events
    if (yearServiceConfig.enableEvents) {
      if (!previousYear || previousYear.year !== year) {
        triggerEvent('yearChange', { previous: previousYear, current: yearData });
      }
      
      if (!previousSemester || previousSemester.id !== semesterId) {
        triggerEvent('semesterChange', { previous: previousSemester, current: semesterData });
      }
    }
    
    console.log(`[YearService] Active context set: ${year}/${semesterId}`);
    return { ok: true, year: yearData, semester: semesterData };
    
  } catch (error) {
    console.error('[YearService] Failed to set active context:', error);
    return { ok: false, error: error.message };
  }
}

// Load initial year data
async function loadInitialYearData() {
  try {
    currentState.availableYears = mockData.academicYears;
    currentState.availableSemesters = mockData.semesters;
    
    // Set default active context
    const currentYear = getCurrentAcademicYear();
    const currentSemester = getCurrentSemester();
    
    if (currentYear && currentSemester) {
      await setActiveContext(currentYear.year, currentSemester.id);
    }
  } catch (error) {
    console.error('[YearService] Failed to load initial year data:', error);
  }
}

// =============================================================================
// YEAR OPERATIONS
// =============================================================================

/**
 * Create New Academic Year
 */
export async function createNewAcademicYear(yearData) {
  try {
    // Validate year data
    if (!yearData.year || !yearData.start_date || !yearData.end_date) {
      throw new Error('Missing required year data: year, start_date, end_date');
    }
    
    // Check if year already exists
    const existingYear = mockData.academicYears.find(y => y.year === yearData.year);
    if (existingYear) {
      throw new Error(`Academic year ${yearData.year} already exists`);
    }
    
    const newYear = {
      id: Math.max(...mockData.academicYears.map(y => y.id)) + 1,
      year: yearData.year,
      start_date: yearData.start_date,
      end_date: yearData.end_date,
      is_active: yearData.is_active || false,
      created_at: new Date().toISOString()
    };
    
    mockData.academicYears.push(newYear);
    currentState.availableYears.push(newYear);
    
    // Create year tables
    await createYearTables(yearData.year);
    
    console.log(`[YearService] Created academic year: ${yearData.year}`);
    return { ok: true, data: newYear };
    
  } catch (error) {
    console.error('[YearService] Failed to create academic year:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Setup Semesters For Year
 */
export async function setupSemestersForYear(year, semesterConfig = {}) {
  try {
    const yearData = mockData.academicYears.find(y => y.year === year);
    if (!yearData) {
      throw new Error(`Academic year ${year} not found`);
    }
    
    const { semesterCount = 2, includeSummer = false } = semesterConfig;
    const semesters = [];
    
    // Create standard semesters
    for (let i = 1; i <= semesterCount; i++) {
      const semester = {
        id: Math.max(...mockData.semesters.map(s => s.id), 0) + semesters.length + 1,
        academic_year_id: yearData.id,
        semester_number: i,
        semester_name: `ภาคเรียนที่ ${i}`,
        start_date: calculateSemesterStartDate(year, i),
        end_date: calculateSemesterEndDate(year, i),
        is_active: i === 1, // First semester active by default
        created_at: new Date().toISOString()
      };
      semesters.push(semester);
    }
    
    // Add summer semester if requested
    if (includeSummer) {
      const summerSemester = {
        id: Math.max(...mockData.semesters.map(s => s.id), 0) + semesters.length + 1,
        academic_year_id: yearData.id,
        semester_number: 3,
        semester_name: 'ภาคฤดูร้อน',
        start_date: calculateSemesterStartDate(year, 3),
        end_date: calculateSemesterEndDate(year, 3),
        is_active: false,
        created_at: new Date().toISOString()
      };
      semesters.push(summerSemester);
    }
    
    // Add to mock data
    mockData.semesters.push(...semesters);
    currentState.availableSemesters.push(...semesters);
    
    console.log(`[YearService] Created ${semesters.length} semesters for year ${year}`);
    return { ok: true, data: semesters };
    
  } catch (error) {
    console.error('[YearService] Failed to setup semesters:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Clone Year Structure
 */
export async function cloneYearStructure(fromYear, toYear, options = { includeRooms: true }) {
  try {
    console.log(`[YearService] Cloning year structure from ${fromYear} to ${toYear}`);
    
    // Validate source year exists
    const sourceYearData = mockData[fromYear];
    if (!sourceYearData) {
      throw new Error(`Source year ${fromYear} data not found`);
    }
    
    // Create target year structure
    if (!mockData[toYear]) {
      mockData[toYear] = {};
    }
    
    const cloneResults = {
      teachers: 0,
      classes: 0,
      rooms: 0,
      subjects: 0
    };
    
    // Clone teachers (optional evolution)
    if (sourceYearData.teachers) {
      mockData[toYear].teachers = sourceYearData.teachers.map(teacher => ({
        ...teacher,
        id: teacher.id + 1000, // Offset IDs
        created_at: new Date().toISOString()
      }));
      cloneResults.teachers = mockData[toYear].teachers.length;
    }
    
    // Clone rooms if requested
    if (options.includeRooms && sourceYearData.rooms) {
      mockData[toYear].rooms = sourceYearData.rooms.map(room => ({
        ...room,
        id: room.id + 1000, // Offset IDs
        created_at: new Date().toISOString()
      }));
      cloneResults.rooms = mockData[toYear].rooms.length;
    }
    
    // Initialize other structures
    mockData[toYear].classes = mockData[toYear].classes || [];
    mockData[toYear].subjects = mockData[toYear].subjects || [];
    mockData[toYear].schedules = mockData[toYear].schedules || [];
    mockData[toYear].substitutions = mockData[toYear].substitutions || [];
    mockData[toYear].substitution_schedules = mockData[toYear].substitution_schedules || [];
    
    console.log(`[YearService] Cloned structure:`, cloneResults);
    return { ok: true, data: cloneResults };
    
  } catch (error) {
    console.error('[YearService] Failed to clone year structure:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Archive Year
 */
export async function archiveYear(year) {
  try {
    const yearData = mockData.academicYears.find(y => y.year === year);
    if (!yearData) {
      throw new Error(`Academic year ${year} not found`);
    }
    
    // Mark as inactive
    yearData.is_active = false;
    yearData.archived_at = new Date().toISOString();
    
    // Mark all semesters as inactive
    const yearSemesters = mockData.semesters.filter(s => s.academic_year_id === yearData.id);
    yearSemesters.forEach(semester => {
      semester.is_active = false;
    });
    
    console.log(`[YearService] Archived year: ${year}`);
    return { ok: true, message: `Year ${year} archived successfully` };
    
  } catch (error) {
    console.error('[YearService] Failed to archive year:', error);
    return { ok: false, error: error.message };
  }
}

// Helper functions for semester date calculation
function calculateSemesterStartDate(year, semesterNumber) {
  const thaiYear = year;
  const gregorianYear = thaiYear - 543;
  
  switch(semesterNumber) {
    case 1: return `${gregorianYear}-05-15`; // May
    case 2: return `${gregorianYear}-10-15`; // October
    case 3: return `${gregorianYear + 1}-03-15`; // March (next year)
    default: return `${gregorianYear}-05-15`;
  }
}

function calculateSemesterEndDate(year, semesterNumber) {
  const thaiYear = year;
  const gregorianYear = thaiYear - 543;
  
  switch(semesterNumber) {
    case 1: return `${gregorianYear}-09-30`; // September
    case 2: return `${gregorianYear + 1}-02-28`; // February (next year)
    case 3: return `${gregorianYear + 1}-04-30`; // April (next year)
    default: return `${gregorianYear}-09-30`;
  }
}

// =============================================================================
// TABLE MANAGEMENT (รวม ROOMS)
// =============================================================================

/**
 * Create Year Tables
 */
export function createYearTables(year, options = { rooms: true }) {
  console.log(`[YearService] Creating tables for year ${year}`);
  
  const tableNames = [
    'teachers',
    'classes', 
    'subjects',
    'schedules',
    'substitutions',
    'substitution_schedules'
  ];
  
  if (options.rooms) {
    tableNames.splice(2, 0, 'rooms'); // Insert rooms after classes
  }
  
  const createdTables = [];
  
  tableNames.forEach(baseTable => {
    const tableName = getTableName(baseTable, year);
    
    // Initialize table in mock data if not exists
    if (!mockData[year]) {
      mockData[year] = {};
    }
    
    if (!mockData[year][baseTable]) {
      mockData[year][baseTable] = [];
      createdTables.push(tableName);
    }
  });
  
  console.log(`[YearService] Created tables: ${createdTables.join(', ')}`);
  return { ok: true, tables: createdTables };
}

/**
 * Get Table Name
 */
export function getTableName(baseTable, year) {
  return `${baseTable}_${year}`;
}

/**
 * Validate Table Exists
 */
export async function validateTableExists(tableName) {
  try {
    const [baseTable, year] = tableName.split('_');
    
    if (!year || !baseTable) {
      return { ok: false, error: 'Invalid table name format' };
    }
    
    const yearNumber = parseInt(year);
    const yearData = mockData[yearNumber];
    
    if (!yearData) {
      return { ok: false, error: `Year ${yearNumber} data not found` };
    }
    
    const exists = yearData[baseTable] !== undefined;
    
    return { ok: true, exists, tableName, baseTable, year: yearNumber };
    
  } catch (error) {
    console.error('[YearService] Failed to validate table:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get Available Year Tables
 */
export function getAvailableYearTables(baseTable) {
  const availableTables = [];
  
  Object.keys(mockData).forEach(key => {
    const yearNumber = parseInt(key);
    if (!isNaN(yearNumber) && mockData[key][baseTable]) {
      availableTables.push({
        year: yearNumber,
        tableName: getTableName(baseTable, yearNumber),
        recordCount: mockData[key][baseTable].length
      });
    }
  });
  
  return availableTables.sort((a, b) => b.year - a.year);
}

// =============================================================================
// ROOM-SPECIFIC OPERATIONS
// =============================================================================

/**
 * Clone Rooms To New Year
 */
export async function cloneRoomsToNewYear(fromYear, toYear) {
  try {
    const sourceRooms = mockData[fromYear]?.rooms;
    if (!sourceRooms) {
      throw new Error(`No rooms found for year ${fromYear}`);
    }
    
    // Ensure target year structure exists
    if (!mockData[toYear]) {
      mockData[toYear] = {};
    }
    
    // Clone rooms with new IDs
    const clonedRooms = sourceRooms.map(room => ({
      ...room,
      id: room.id + (toYear - fromYear) * 1000, // Offset based on year difference
      created_at: new Date().toISOString()
    }));
    
    mockData[toYear].rooms = clonedRooms;
    
    console.log(`[YearService] Cloned ${clonedRooms.length} rooms from ${fromYear} to ${toYear}`);
    
    // Trigger room data change event
    if (yearServiceConfig.enableEvents) {
      triggerEvent('roomDataChange', { 
        action: 'clone', 
        fromYear, 
        toYear, 
        count: clonedRooms.length 
      });
    }
    
    return { ok: true, data: clonedRooms, count: clonedRooms.length };
    
  } catch (error) {
    console.error('[YearService] Failed to clone rooms:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Validate Room Integrity
 */
export async function validateRoomIntegrity(year) {
  try {
    const yearData = mockData[year];
    if (!yearData) {
      throw new Error(`Year ${year} data not found`);
    }
    
    const rooms = yearData.rooms || [];
    const schedules = yearData.schedules || [];
    const subjects = yearData.subjects || [];
    
    const integrity = {
      totalRooms: rooms.length,
      usedRooms: 0,
      unusedRooms: 0,
      conflictingSchedules: 0,
      subjectConstraintViolations: 0,
      roomUsageStats: {}
    };
    
    // Check room usage
    const usedRoomIds = new Set();
    
    schedules.forEach(schedule => {
      if (schedule.room_id) {
        usedRoomIds.add(schedule.room_id);
        
        // Count usage per room
        const roomId = schedule.room_id;
        if (!integrity.roomUsageStats[roomId]) {
          const room = rooms.find(r => r.id === roomId);
          integrity.roomUsageStats[roomId] = {
            name: room?.name || 'Unknown',
            type: room?.room_type || 'Unknown',
            usageCount: 0
          };
        }
        integrity.roomUsageStats[roomId].usageCount++;
        
        // Check subject constraints
        const subject = subjects.find(s => s.id === schedule.subject_id);
        if (subject?.subject_constraints?.requires_room_type) {
          const room = rooms.find(r => r.id === schedule.room_id);
          if (room && room.room_type !== subject.subject_constraints.requires_room_type) {
            integrity.subjectConstraintViolations++;
          }
        }
      }
    });
    
    integrity.usedRooms = usedRoomIds.size;
    integrity.unusedRooms = rooms.length - usedRoomIds.size;
    
    // Check for scheduling conflicts (same room, day, period)
    const roomScheduleMap = {};
    schedules.forEach(schedule => {
      if (schedule.room_id) {
        const key = `${schedule.room_id}-${schedule.day_of_week}-${schedule.period}`;
        if (roomScheduleMap[key]) {
          integrity.conflictingSchedules++;
        } else {
          roomScheduleMap[key] = schedule;
        }
      }
    });
    
    const isValid = integrity.conflictingSchedules === 0 && 
                   integrity.subjectConstraintViolations === 0;
    
    console.log(`[YearService] Room integrity check for ${year}:`, integrity);
    
    return { ok: true, isValid, data: integrity };
    
  } catch (error) {
    console.error('[YearService] Failed to validate room integrity:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Migrate Room Assignments
 */
export async function migrateRoomAssignments(fromYear, toYear) {
  try {
    const sourceSchedules = mockData[fromYear]?.schedules || [];
    const targetSchedules = mockData[toYear]?.schedules || [];
    const targetRooms = mockData[toYear]?.rooms || [];
    
    if (targetSchedules.length === 0) {
      throw new Error(`No schedules found for target year ${toYear}`);
    }
    
    let migratedCount = 0;
    
    // Map source room assignments to target schedules
    targetSchedules.forEach(targetSchedule => {
      // Find corresponding source schedule (by position or similar logic)
      const sourceSchedule = sourceSchedules.find(ss => 
        ss.day_of_week === targetSchedule.day_of_week &&
        ss.period === targetSchedule.period &&
        ss.class_id && targetSchedule.class_id // Match by time slot
      );
      
      if (sourceSchedule?.room_id) {
        // Find equivalent room in target year
        const sourceRoom = mockData[fromYear]?.rooms?.find(r => r.id === sourceSchedule.room_id);
        if (sourceRoom) {
          const targetRoom = targetRooms.find(r => 
            r.name === sourceRoom.name && r.room_type === sourceRoom.room_type
          );
          
          if (targetRoom) {
            targetSchedule.room_id = targetRoom.id;
            migratedCount++;
          }
        }
      }
    });
    
    console.log(`[YearService] Migrated ${migratedCount} room assignments from ${fromYear} to ${toYear}`);
    
    return { ok: true, migratedCount };
    
  } catch (error) {
    console.error('[YearService] Failed to migrate room assignments:', error);
    return { ok: false, error: error.message };
  }
}

// =============================================================================
// EVENT SYSTEM
// =============================================================================

/**
 * On Year Change
 */
export function onYearChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  eventListeners.yearChange.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = eventListeners.yearChange.indexOf(callback);
    if (index > -1) {
      eventListeners.yearChange.splice(index, 1);
    }
  };
}

/**
 * On Semester Change
 */
export function onSemesterChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  eventListeners.semesterChange.push(callback);
  
  return () => {
    const index = eventListeners.semesterChange.indexOf(callback);
    if (index > -1) {
      eventListeners.semesterChange.splice(index, 1);
    }
  };
}

/**
 * On Room Data Change
 */
export function onRoomDataChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  eventListeners.roomDataChange.push(callback);
  
  return () => {
    const index = eventListeners.roomDataChange.indexOf(callback);
    if (index > -1) {
      eventListeners.roomDataChange.splice(index, 1);
    }
  };
}

/**
 * Trigger Event
 */
function triggerEvent(eventType, data) {
  if (!yearServiceConfig.enableEvents) return;
  
  const listeners = eventListeners[eventType] || [];
  listeners.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`[YearService] Error in ${eventType} event listener:`, error);
    }
  });
}

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

/**
 * Migrate Data To New Year
 */
export async function migrateDataToNewYear(fromYear, toYear, options = {}) {
  const { includeTeachers = true, includeRooms = true, includeSubjects = false } = options;
  
  try {
    console.log(`[YearService] Migrating data from ${fromYear} to ${toYear}`);
    
    const migrationResults = {
      teachers: 0,
      rooms: 0,
      subjects: 0,
      errors: []
    };
    
    // Migrate Teachers
    if (includeTeachers) {
      try {
        const result = await migrateTeachers(fromYear, toYear);
        migrationResults.teachers = result.count || 0;
      } catch (error) {
        migrationResults.errors.push(`Teachers: ${error.message}`);
      }
    }
    
    // Migrate Rooms
    if (includeRooms) {
      try {
        const result = await cloneRoomsToNewYear(fromYear, toYear);
        migrationResults.rooms = result.count || 0;
      } catch (error) {
        migrationResults.errors.push(`Rooms: ${error.message}`);
      }
    }
    
    // Migrate Subjects (basic structure only)
    if (includeSubjects) {
      try {
        const result = await migrateSubjects(fromYear, toYear);
        migrationResults.subjects = result.count || 0;
      } catch (error) {
        migrationResults.errors.push(`Subjects: ${error.message}`);
      }
    }
    
    console.log(`[YearService] Migration completed:`, migrationResults);
    
    return {
      ok: true,
      data: migrationResults,
      hasErrors: migrationResults.errors.length > 0
    };
    
  } catch (error) {
    console.error('[YearService] Migration failed:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Migrate Teachers
 */
async function migrateTeachers(fromYear, toYear) {
  const sourceTeachers = mockData[fromYear]?.teachers;
  if (!sourceTeachers) {
    throw new Error(`No teachers found for year ${fromYear}`);
  }
  
  if (!mockData[toYear]) {
    mockData[toYear] = {};
  }
  
  const migratedTeachers = sourceTeachers.map(teacher => ({
    ...teacher,
    id: teacher.id + (toYear - fromYear) * 1000,
    created_at: new Date().toISOString()
  }));
  
  mockData[toYear].teachers = migratedTeachers;
  
  console.log(`[YearService] Migrated ${migratedTeachers.length} teachers`);
  return { count: migratedTeachers.length };
}

/**
 * Migrate Subjects (basic template)
 */
async function migrateSubjects(fromYear, toYear) {
  const sourceSubjects = mockData[fromYear]?.subjects;
  if (!sourceSubjects) {
    throw new Error(`No subjects found for year ${fromYear}`);
  }
  
  if (!mockData[toYear]) {
    mockData[toYear] = {};
  }
  
  // Create basic subject templates (without class assignments)
  const subjectTemplates = sourceSubjects.reduce((acc, subject) => {
    const key = `${subject.subject_name}-${subject.subject_code}`;
    if (!acc[key]) {
      acc[key] = {
        id: Object.keys(acc).length + 1,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        periods_per_week: subject.periods_per_week,
        subject_constraints: subject.subject_constraints,
        created_at: new Date().toISOString()
      };
    }
    return acc;
  }, {});
  
  mockData[toYear].subjects = Object.values(subjectTemplates);
  
  console.log(`[YearService] Created ${Object.keys(subjectTemplates).length} subject templates`);
  return { count: Object.keys(subjectTemplates).length };
}

// Export service state for debugging
export function getYearServiceState() {
  return {
    config: yearServiceConfig,
    state: currentState,
    eventListeners: {
      yearChange: eventListeners.yearChange.length,
      semesterChange: eventListeners.semesterChange.length,
      roomDataChange: eventListeners.roomDataChange.length
    }
  };
}