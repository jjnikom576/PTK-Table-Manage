/**
 * Enhanced Data Service Layer for Multi-Year School Schedule System
 * Features: Multi-year data management, Context-aware loading, Export support, Rooms integration
 */

import { mockData } from '../data/index.js';
import * as academicYearsAPI from '../api/academicYears.js';
import * as semestersAPI from '../api/semesters.js';
import * as teachersAPI from '../api/teachers.js';
import * as classesAPI from '../api/classes.js';
import * as roomsAPI from '../api/rooms.js';
import * as subjectsAPI from '../api/subjects.js';
import * as schedulesAPI from '../api/schedules.js';
import * as substitutionsAPI from '../api/substitutions.js';
import { getThaiDayName, getDayName, generateTimeSlots } from '../utils.js';

// =============================================================================
// SERVICE CONFIGURATION & CONTEXT
// =============================================================================

let serviceConfig = {
  mode: 'mock', // 'mock' | 'api'
  enableCache: true,
  cacheTimeout: 300000, // 5 minutes
  maxCacheSize: 50
};

/**
 * Initialize data service with configuration
 */
export function initDataService(config = {}) {
  // Update service configuration
  serviceConfig = {
    ...serviceConfig,
    ...config
  };
  
  console.log('[DataService] Initialized with config:', serviceConfig);
  
  // Clear cache when switching modes
  if (config.mode) {
    cache.clear();
  }
  
  return Promise.resolve(serviceConfig);
}

let currentContext = {
  year: null,
  semesterId: null,
  semester: null,
  academicYear: null
};

// Cache Strategy
const cache = {
  years: null,
  semesters: {},
  byYear: {
    // 2567: { teachers, classes, rooms, subjects, schedules, substitutions }
  },
  exportCache: {},
  timestamps: {},
  
  set(key, data) {
    if (!serviceConfig.enableCache) return;
    this.timestamps[key] = Date.now();
    if (key.includes('.')) {
      const [section, subKey] = key.split('.');
      if (!this[section]) this[section] = {};
      this[section][subKey] = data;
    } else {
      this[key] = data;
    }
    this.cleanup();
  },
  
  get(key) {
    if (!serviceConfig.enableCache) return null;
    const timestamp = this.timestamps[key];
    if (!timestamp || Date.now() - timestamp > serviceConfig.cacheTimeout) {
      this.delete(key);
      return null;
    }
    if (key.includes('.')) {
      const [section, subKey] = key.split('.');
      return this[section]?.[subKey] || null;
    }
    return this[key] || null;
  },
  
  delete(key) {
    delete this.timestamps[key];
    if (key.includes('.')) {
      const [section, subKey] = key.split('.');
      if (this[section]) delete this[section][subKey];
    } else {
      delete this[key];
    }
  },
  
  clear() {
    this.years = null;
    this.semesters = {};
    this.byYear = {};
    this.exportCache = {};
    this.timestamps = {};
  },
  
  cleanup() {
    const now = Date.now();
    const expired = Object.entries(this.timestamps)
      .filter(([key, time]) => now - time > serviceConfig.cacheTimeout)
      .map(([key]) => key);
    expired.forEach(key => this.delete(key));
  }
};

// =============================================================================
// CACHE MANAGEMENT (NEW)
// =============================================================================

/**
 * Clear all cache (for context switching)
 */
export function clearCache() {
  console.log('[DataService] Clearing all cache...');
  cache.clear();
  console.log('[DataService] ✅ Cache cleared');
}

/**
 * Clear cache for specific year
 */
export function clearYearCache(year) {
  console.log(`[DataService] Clearing cache for year ${year}...`);
  cache.delete(`byYear.${year}`);
  cache.delete(`exportCache.${year}`);
  console.log(`[DataService] ✅ Year ${year} cache cleared`);
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  return {
    enabled: serviceConfig.enableCache,
    timeout: serviceConfig.cacheTimeout,
    size: Object.keys(cache.timestamps).length,
    years: Object.keys(cache.byYear),
    lastCleared: cache.lastCleared || null
  };
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================


/**
 * Set Global Context
 */
export async function setGlobalContext(year, semesterId) {
  try {
    const academicYear = await getAcademicYearByNumber(year);
    const semester = semesterId ? await getSemesterById(semesterId) : null;
    
    currentContext = { year, semesterId, semester, academicYear };
    console.log('[DataService] Context set:', currentContext);
    return { ok: true, context: currentContext };
  } catch (error) {
    console.error('[DataService] Failed to set context:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Switch to Year
 */
export async function switchToYear(year) {
  try {
    const semesters = await loadSemestersByYear(year);
    let newSemesterId = null;
    
    if (currentContext.semester) {
      const sameSemester = semesters.data?.find(s => 
        s.semester_number === currentContext.semester.semester_number
      );
      newSemesterId = sameSemester?.id || semesters.data?.[0]?.id;
    } else {
      newSemesterId = semesters.data?.[0]?.id;
    }
    
    return await setGlobalContext(year, newSemesterId);
  } catch (error) {
    console.error('[DataService] Failed to switch year:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Switch to Semester
 */
export async function switchToSemester(semesterId) {
  try {
    const semester = await getSemesterById(semesterId);
    if (!semester.ok) throw new Error('Semester not found');
    
    const year = semester.data.academic_year_id || currentContext.year;
    return await setGlobalContext(year, semesterId);
  } catch (error) {
    console.error('[DataService] Failed to switch semester:', error);
    return { ok: false, error: error.message };
  }
}

// =============================================================================
// DATA LOADING FUNCTIONS
// =============================================================================

/**
 * Load Academic Years
 */
export async function loadAcademicYears() {
  const cacheKey = 'years';
  let cached = cache.get(cacheKey);
  if (cached) return { ok: true, data: cached };
  
  try {
    let result;
    if (serviceConfig.mode === 'mock') {
      result = { ok: true, data: mockData.academicYears };
      console.log('[DataService] Loaded academic years from mock:', mockData.academicYears);
    } else {
      result = await academicYearsAPI.getAcademicYears();
    }
    
    if (result.ok) {
      cache.set(cacheKey, result.data);
    }
    return result;
  } catch (error) {
    console.error('[DataService] Failed to load academic years:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Load Semesters
 */
export async function loadSemesters() {
  try {
    let result;
    if (serviceConfig.mode === 'mock') {
      result = { ok: true, data: mockData.semesters };
      console.log('[DataService] Loaded semesters from mock:', mockData.semesters);
    } else {
      result = await semestersAPI.getAllSemesters();
    }
    return result;
  } catch (error) {
    console.error('[DataService] Failed to load semesters:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Load Semesters for Year
 */
export async function loadSemestersByYear(yearId) {
  const cacheKey = `semesters.${yearId}`;
  let cached = cache.get(cacheKey);
  if (cached) return { ok: true, data: cached };
  
  try {
    let result;
    if (serviceConfig.mode === 'mock') {
      const semesterData = mockData.semesters.filter(s => 
        s.academic_year_id === yearId || s.academic_year_id === yearId
      );
      result = { ok: true, data: semesterData };
    } else {
      result = await semestersAPI.getSemesters(yearId);
    }
    
    if (result.ok) {
      cache.set(cacheKey, result.data);
    }
    return result;
  } catch (error) {
    console.error('[DataService] Failed to load semesters:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Load Complete Year Data (including rooms)
 */
export async function loadYearData(year) {
  const cacheKey = `byYear.${year}`;
  let cached = cache.get(cacheKey);
  if (cached) return { ok: true, data: cached };
  
  try {
    if (serviceConfig.mode === 'mock') {
      const yearData = mockData[year];
      if (!yearData) {
        throw new Error(`No data available for year ${year}`);
      }
      
      const completeData = {
        teachers: yearData.teachers || [],
        classes: yearData.classes || [],
        rooms: yearData.rooms || [], // ใหม่
        subjects: yearData.subjects || [],
        schedules: yearData.schedules || [],
        substitutions: yearData.substitutions || [],
        substitution_schedules: yearData.substitution_schedules || []
      };
      
      cache.set(cacheKey, completeData);
      return { ok: true, data: completeData };
      
    } else {
      const results = await Promise.all([
        teachersAPI.getTeachers(year),
        classesAPI.getClasses(year),
        roomsAPI.getRooms(year), // ใหม่
        subjectsAPI.getSubjects(year),
        schedulesAPI.getSchedules(year),
        substitutionsAPI.getSubstitutions(year)
      ]);
      
      const [teachers, classes, rooms, subjects, schedules, substitutions] = results;
      
      if (!results.every(r => r.ok)) {
        const errors = results.filter(r => !r.ok).map(r => r.error);
        throw new Error(`Failed to load some data: ${errors.join(', ')}`);
      }
      
      const completeData = {
        teachers: teachers.data,
        classes: classes.data,
        rooms: rooms.data, // ใหม่
        subjects: subjects.data,
        schedules: schedules.data,
        substitutions: substitutions.data,
        substitution_schedules: []
      };
      
      cache.set(cacheKey, completeData);
      return { ok: true, data: completeData };
    }
  } catch (error) {
    console.error('[DataService] Failed to load year data:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Load Semester-Specific Data
 */
export async function loadSemesterData(semesterId) {
  try {
    const semester = await getSemesterById(semesterId);
    if (!semester.ok) throw new Error('Semester not found');
    
    // หา actual year จาก academic_year_id
    const academicYear = await getAcademicYearById(semester.data.academic_year_id);
    if (!academicYear.ok) throw new Error('Academic year not found');
    
    const actualYear = academicYear.data.year; // ใช้ actual year (2568)
    const yearData = await loadYearData(actualYear);
    
    if (!yearData.ok) return yearData;
    
    const semesterData = {
      ...yearData.data,
      classes: yearData.data.classes.filter(c => c.semester_id === semesterId),
      subjects: yearData.data.subjects.filter(s => {
        const subject = yearData.data.subjects.find(subj => subj.id === s.id);
        const cls = yearData.data.classes.find(c => c.id === subject?.class_id);
        return cls?.semester_id === semesterId;
      }),
      schedules: yearData.data.schedules.filter(s => s.semester_id === semesterId)
    };
    
    return { ok: true, data: semesterData };
  } catch (error) {
    console.error('[DataService] Failed to load semester data:', error);
    return { ok: false, error: error.message };
  }
}

// =============================================================================
// MAIN DATA FUNCTIONS (MISSING FUNCTIONS)
// =============================================================================

/**
 * Get Teachers (FIXED - เพิ่ม function ที่ขาดหาย)
 */
export async function getTeachers(year = null) {
  const targetYear = year || currentContext.year;
  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  
  console.log(`[DataService] getTeachers for year: ${targetYear}`);
  
  const cacheKey = `teachers_${targetYear}`;
  let cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[DataService] ✅ Teachers cache HIT for year ${targetYear}:`, cached.length);
    return { ok: true, data: cached };
  }
  
  try {
    if (serviceConfig.mode === 'mock') {
      const yearData = mockData[targetYear];
      if (!yearData || !yearData.teachers) {
        console.warn(`[DataService] ⚠️ No teachers data for year ${targetYear}`);
        return { ok: true, data: [] };
      }
      
      const teachers = yearData.teachers;
      console.log(`[DataService] ✅ Loaded ${teachers.length} teachers from mock for year ${targetYear}`);
      cache.set(cacheKey, teachers);
      return { ok: true, data: teachers };
    } else {
      const result = await teachersAPI.getTeachers(targetYear);
      if (result.ok) {
        cache.set(cacheKey, result.data);
      }
      return result;
    }
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load teachers for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get Classes (FIXED - เพิ่ม year parameter)
 */
export async function getClasses(year = null) {
  const targetYear = year || currentContext.year;
  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  
  console.log(`[DataService] getClasses for year: ${targetYear}`);
  
  const cacheKey = `classes_${targetYear}`;
  let cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[DataService] ✅ Classes cache HIT for year ${targetYear}:`, cached.length);
    return { ok: true, data: cached };
  }
  
  try {
    if (serviceConfig.mode === 'mock') {
      const yearData = mockData[targetYear];
      if (!yearData || !yearData.classes) {
        console.warn(`[DataService] ⚠️ No classes data for year ${targetYear}`);
        return { ok: true, data: [] };
      }
      
      const classes = yearData.classes;
      console.log(`[DataService] ✅ Loaded ${classes.length} classes from mock for year ${targetYear}`);
      cache.set(cacheKey, classes);
      return { ok: true, data: classes };
    } else {
      const result = await classesAPI.getClasses(targetYear);
      if (result.ok) {
        cache.set(cacheKey, result.data);
      }
      return result;
    }
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load classes for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get Rooms (FIXED - เพิ่ม year parameter)
 */
export async function getRooms(year = null) {
  const targetYear = year || currentContext.year;
  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  
  console.log(`[DataService] getRooms for year: ${targetYear}`);
  
  const cacheKey = `rooms_${targetYear}`;
  let cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[DataService] ✅ Rooms cache HIT for year ${targetYear}:`, cached.length);
    return { ok: true, data: cached };
  }
  
  try {
    if (serviceConfig.mode === 'mock') {
      const yearData = mockData[targetYear];
      if (!yearData || !yearData.rooms) {
        console.warn(`[DataService] ⚠️ No rooms data for year ${targetYear}`);
        return { ok: true, data: [] };
      }
      
      const rooms = yearData.rooms;
      console.log(`[DataService] ✅ Loaded ${rooms.length} rooms from mock for year ${targetYear}`);
      cache.set(cacheKey, rooms);
      return { ok: true, data: rooms };
    } else {
      const result = await roomsAPI.getRooms(targetYear);
      if (result.ok) {
        cache.set(cacheKey, result.data);
      }
      return result;
    }
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load rooms for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get Subjects (FIXED - เพิ่ม year parameter)
 */
export async function getSubjects(year = null) {
  const targetYear = year || currentContext.year;
  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  
  console.log(`[DataService] getSubjects for year: ${targetYear}`);
  
  const cacheKey = `subjects_${targetYear}`;
  let cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[DataService] ✅ Subjects cache HIT for year ${targetYear}:`, cached.length);
    return { ok: true, data: cached };
  }
  
  try {
    if (serviceConfig.mode === 'mock') {
      const yearData = mockData[targetYear];
      if (!yearData || !yearData.subjects) {
        console.warn(`[DataService] ⚠️ No subjects data for year ${targetYear}`);
        return { ok: true, data: [] };
      }
      
      const subjects = yearData.subjects;
      console.log(`[DataService] ✅ Loaded ${subjects.length} subjects from mock for year ${targetYear}`);
      cache.set(cacheKey, subjects);
      return { ok: true, data: subjects };
    } else {
      const result = await subjectsAPI.getSubjects(targetYear);
      if (result.ok) {
        cache.set(cacheKey, result.data);
      }
      return result;
    }
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load subjects for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get Schedules (FIXED - เพิ่ม year parameter)
 */
export async function getSchedules(year = null) {
  const targetYear = year || currentContext.year;
  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  
  console.log(`[DataService] getSchedules for year: ${targetYear}`);
  
  const cacheKey = `schedules_${targetYear}`;
  let cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[DataService] ✅ Schedules cache HIT for year ${targetYear}:`, cached.length);
    return { ok: true, data: cached };
  }
  
  try {
    if (serviceConfig.mode === 'mock') {
      const yearData = mockData[targetYear];
      if (!yearData || !yearData.schedules) {
        console.warn(`[DataService] ⚠️ No schedules data for year ${targetYear}`);
        return { ok: true, data: [] };
      }
      
      const schedules = yearData.schedules;
      console.log(`[DataService] ✅ Loaded ${schedules.length} schedules from mock for year ${targetYear}`);
      cache.set(cacheKey, schedules);
      return { ok: true, data: schedules };
    } else {
      const result = await schedulesAPI.getSchedules(targetYear);
      if (result.ok) {
        cache.set(cacheKey, result.data);
      }
      return result;
    }
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load schedules for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

// =============================================================================
// STUDENT SCHEDULE FUNCTIONS  
// =============================================================================

/**
 * Get Student Schedule by Class
 */
export async function getStudentSchedule(classId) {
  try {
    console.log('[DataService] Getting student schedule for class:', classId);
    console.log('[DataService] Current context:', currentContext);
    
    // ใช้ปีจาก context จริง
    const targetYear = currentContext.year || 2568;
    console.log('[DataService] Using target year:', targetYear);
    
    const yearData = await loadYearData(targetYear);
    
    if (!yearData.ok) {
      throw new Error('Failed to load year data');
    }
    
    const { schedules, subjects, teachers, classes, rooms } = yearData.data;
    console.log('[DataService] Available classes:', classes.map(c => c.class_name));
    
    // ⭐ FIX: รองรับทั้ง numeric ID และ string ID
    console.log('[DataService] Looking for class:', classId, 'type:', typeof classId);
    
    let classInfo = null;
    
    // ลองหาด้วย numeric ID ก่อน
    if (!isNaN(classId)) {
      classInfo = classes.find(c => c.id === parseInt(classId));
      console.log('[DataService] Found by numeric ID:', classInfo);
    }
    
    // ถ้าไม่เจอ ลองหาด้วย string conversion (m1-1 -> ม.1/1)
    if (!classInfo && typeof classId === 'string') {
      const className = classId.replace('-', '/').replace('m', 'ม.');
      classInfo = classes.find(c => c.class_name === className);
      console.log('[DataService] Found by name conversion:', classInfo);
    }
    
    // ถ้ายังไม่เจอ ลองหาด้วย direct match
    if (!classInfo) {
      classInfo = classes.find(c => c.class_name === classId || c.id === classId);
      console.log('[DataService] Found by direct match:', classInfo);
    }
    
    if (!classInfo) {
      return { ok: false, error: `Class ${classId} not found` };
    }
    
    // หา schedules ของ class นี้
    const classSchedules = schedules.filter(s => s.class_id === classInfo.id);
    
    // สร้างตารางแบบ matrix
    const scheduleMatrix = buildScheduleMatrix(classSchedules, { subjects, teachers, rooms });
    
    return {
      ok: true,
      data: {
        classInfo,
        schedules: classSchedules,
        matrix: scheduleMatrix,
        subjects,
        teachers,
        rooms
      }
    };
    
  } catch (error) {
    console.error('[DataService] Failed to get student schedule:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Build Schedule Matrix (5 days x 8 periods)
 */
function buildScheduleMatrix(schedules, context) {
  const matrix = {};
  
  // สร้าง matrix ว่าง
  for (let day = 1; day <= 5; day++) {
    matrix[day] = {};
    for (let period = 1; period <= 8; period++) {
      matrix[day][period] = null;
    }
  }
  
  // ใส่ข้อมูล schedule
  schedules.forEach(schedule => {
    const subject = context.subjects.find(s => s.id === schedule.subject_id);
    const teacher = context.teachers.find(t => t.id === subject?.teacher_id);
    const room = context.rooms.find(r => r.id === schedule.room_id);
    
    if (schedule.day_of_week && schedule.period) {
      matrix[schedule.day_of_week][schedule.period] = {
        schedule,
        subject: subject || { subject_name: 'ไม่ระบุวิชา' },
        teacher: teacher || { name: 'ไม่ระบุครู' },
        room: room || { name: 'ไม่ระบุห้อง' }
      };
    }
  });
  
  return matrix;
}

// =============================================================================
// CRUD OPERATIONS (CONTEXT-AWARE) - FIXED: ลบ function ซ้ำ
// =============================================================================

/**
 * Get Teachers (using current context) - REMOVED: ซ้ำกับ function ข้างบน
 */
// ⭐ FIX: ลบ function นี้ออกเพราะซ้ำกับ getTeachers(year) ข้างบน

/**
 * Get Classes (using current context) - REMOVED: ซ้ำกับ function ข้างบน
 */
// ⭐ FIX: ลบ function นี้ออกเพราะซ้ำกับ getClasses(year) ข้างบน

/**
 * Get Rooms (using current context) - REMOVED: ซ้ำกับ function ข้างบน
 */
// ⭐ FIX: ลบ function นี้ออกเพราะซ้ำกับ getRooms(year) ข้างบน

/**
 * Get Subjects (using current context) - REMOVED: ซ้ำกับ function ข้างบน
 */
// ⭐ FIX: ลบ function นี้ออกเพราะซ้ำกับ getSubjects(year) ข้างบน

/**
 * Get Schedules (using current context) - REMOVED: ซ้ำกับ function ข้างบน
 */
// ⭐ FIX: ลบ function นี้ออกเพราะซ้ำกับ getSchedules(year) ข้างบน

// Helper functions
export async function getAcademicYearById(yearId) {
  const years = await loadAcademicYears();
  if (!years.ok) return years;
  
  const academicYear = years.data.find(y => y.id === yearId);
  if (!academicYear) {
    return { ok: false, error: `Academic year ID ${yearId} not found` };
  }
  return { ok: true, data: academicYear };
}

export async function getAcademicYearByNumber(year) {
  const years = await loadAcademicYears();
  if (!years.ok) return years;
  
  const academicYear = years.data.find(y => y.year === year);
  if (!academicYear) {
    return { ok: false, error: `Academic year ${year} not found` };
  }
  return { ok: true, data: academicYear };
}

export async function getSemesterById(semesterId) {
  const allSemesters = Object.values(cache.semesters).flat();
  let semester = allSemesters.find(s => s.id === semesterId);
  
  if (!semester) {
    if (currentContext.year) {
      const semesters = await loadSemesters(currentContext.year);
      if (semesters.ok) {
        semester = semesters.data.find(s => s.id === semesterId);
      }
    }
    
    if (!semester && serviceConfig.mode === 'mock') {
      semester = mockData.semesters.find(s => s.id === semesterId);
    }
  }
  
  if (!semester) {
    return { ok: false, error: `Semester ${semesterId} not found` };
  }
  return { ok: true, data: semester };
}

// =============================================================================
// CROSS-YEAR OPERATIONS
// =============================================================================

/**
 * Compare Data Across Years
 */
export async function compareAcrossYears(dataType, years) {
  try {
    const promises = years.map(year => loadYearData(year));
    const results = await Promise.all(promises);
    
    if (!results.every(r => r.ok)) {
      const errors = results.filter(r => !r.ok).map(r => r.error);
      throw new Error(`Failed to load data for comparison: ${errors.join(', ')}`);
    }
    
    const comparison = {};
    results.forEach((result, index) => {
      const year = years[index];
      const data = result.data[dataType] || [];
      comparison[year] = {
        count: data.length,
        data: data,
        analysis: generateDataAnalysis(dataType, data)
      };
    });
    
    comparison.insights = generateCrossYearInsights(dataType, comparison);
    return { ok: true, data: comparison };
  } catch (error) {
    console.error('[DataService] Failed to compare across years:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get Teacher History
 */
export async function getTeacherHistory(teacherId) {
  try {
    const years = await loadAcademicYears();
    if (!years.ok) return years;
    
    const history = [];
    for (const year of years.data) {
      const yearData = await loadYearData(year.year);
      if (yearData.ok) {
        const teacher = yearData.data.teachers.find(t => t.id === teacherId);
        if (teacher) {
          history.push({ year: year.year, teacher });
        }
      }
    }
    
    return { ok: true, data: history };
  } catch (error) {
    console.error('[DataService] Failed to get teacher history:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Clone Year Data
 */
export async function cloneYearData(fromYear, toYear) {
  try {
    const sourceData = await loadYearData(fromYear);
    if (!sourceData.ok) throw new Error(`Source year ${fromYear} not found`);
    
    // This would clone data to new year (implementation depends on API)
    console.log(`[DataService] Cloning data from ${fromYear} to ${toYear}`);
    
    return { ok: true, message: `Data cloned from ${fromYear} to ${toYear}` };
  } catch (error) {
    console.error('[DataService] Failed to clone year data:', error);
    return { ok: false, error: error.message };
  }
}

// Helper functions for analysis
function generateDataAnalysis(dataType, data) {
  switch(dataType) {
    case 'teachers':
      return {
        bySubjectGroup: data.reduce((acc, t) => {
          acc[t.subject_group] = (acc[t.subject_group] || 0) + 1;
          return acc;
        }, {})
      };
    case 'rooms':
      return {
        byType: data.reduce((acc, r) => {
          acc[r.room_type] = (acc[r.room_type] || 0) + 1;
          return acc;
        }, {})
      };
    default:
      return {};
  }
}

function generateCrossYearInsights(dataType, comparison) {
  const years = Object.keys(comparison).filter(k => k !== 'insights');
  const trends = {};
  
  if (years.length >= 2) {
    const latest = years[years.length - 1];
    const previous = years[years.length - 2];
    
    trends.countChange = comparison[latest].count - comparison[previous].count;
    trends.percentChange = ((comparison[latest].count - comparison[previous].count) / comparison[previous].count * 100).toFixed(1);
  }
  
  return trends;
}

// =============================================================================
// EXPORT HELPERS (สำคัญ)
// =============================================================================

/**
 * Normalize Student Schedule For Export
 */
export async function normalizeStudentScheduleForExport({ schedules, subjects, teachers, rooms, classes, classId, semesterId }) {
  try {
    // Load required data if not provided
    if (!schedules || !subjects || !teachers || !rooms || !classes) {
      const semesterData = await loadSemesterData(semesterId);
      if (!semesterData.ok) throw new Error('Failed to load semester data');
      
      schedules = schedules || semesterData.data.schedules;
      subjects = subjects || semesterData.data.subjects;
      teachers = teachers || semesterData.data.teachers;
      rooms = rooms || semesterData.data.rooms;
      classes = classes || semesterData.data.classes;
    }
    
    // Filter schedules for specific class
    const classSchedules = schedules.filter(schedule => schedule.class_id === classId);
    
    // Transform to export format
    return classSchedules.map(schedule => {
      const subject = subjects.find(s => s.id === schedule.subject_id);
      const teacher = teachers.find(t => t.id === subject?.teacher_id);
      const room = rooms.find(r => r.id === schedule.room_id);
      const cls = classes.find(c => c.id === schedule.class_id);
      
      return {
        'วัน': getThaiDayName(schedule.day_of_week),
        'เวลา': getTimeSlot(schedule.period),
        'คาบ': schedule.period,
        'วิชา': subject?.subject_name || '',
        'รหัสวิชา': subject?.subject_code || '',
        'ครู': teacher?.name || '',
        'ห้องเรียน': cls?.class_name || '',
        'ห้อง': room ? `${room.name} (${room.room_type})` : ''
      };
    });
  } catch (error) {
    console.error('[DataService] Failed to normalize student schedule:', error);
    throw error;
  }
}

/**
 * Normalize Teacher Schedule For Export
 */
export async function normalizeTeacherScheduleForExport({ schedules, subjects, teachers, rooms, classes, teacherId, semesterId }) {
  try {
    // Load required data if not provided
    if (!schedules || !subjects || !teachers || !rooms || !classes) {
      const semesterData = await loadSemesterData(semesterId);
      if (!semesterData.ok) throw new Error('Failed to load semester data');
      
      schedules = schedules || semesterData.data.schedules;
      subjects = subjects || semesterData.data.subjects;
      teachers = teachers || semesterData.data.teachers;
      rooms = rooms || semesterData.data.rooms;
      classes = classes || semesterData.data.classes;
    }
    
    // Filter subjects for specific teacher
    const teacherSubjects = subjects.filter(subject => subject.teacher_id === teacherId);
    const teacherSubjectIds = teacherSubjects.map(s => s.id);
    
    // Filter schedules for teacher's subjects
    const teacherSchedules = schedules.filter(schedule => 
      teacherSubjectIds.includes(schedule.subject_id)
    );
    
    // Transform to export format
    return teacherSchedules.map(schedule => {
      const subject = subjects.find(s => s.id === schedule.subject_id);
      const room = rooms.find(r => r.id === schedule.room_id);
      const cls = classes.find(c => c.id === schedule.class_id);
      
      return {
        'วัน': getThaiDayName(schedule.day_of_week),
        'เวลา': getTimeSlot(schedule.period),
        'คาบ': schedule.period,
        'วิชา': subject?.subject_name || '',
        'รหัสวิชา': subject?.subject_code || '',
        'ห้องเรียน': cls?.class_name || '',
        'ห้อง': room ? `${room.name} (${room.room_type})` : ''
      };
    });
  } catch (error) {
    console.error('[DataService] Failed to normalize teacher schedule:', error);
    throw error;
  }
}

/**
 * Normalize Substitution For Export
 */
export async function normalizeSubstitutionForExport({ substitutions, schedules, subjects, teachers, rooms, classes, date, semesterId }) {
  try {
    // Load required data if not provided
    if (!substitutions || !schedules || !subjects || !teachers || !rooms || !classes) {
      const semesterData = await loadSemesterData(semesterId);
      if (!semesterData.ok) throw new Error('Failed to load semester data');
      
      substitutions = substitutions || semesterData.data.substitutions;
      schedules = schedules || semesterData.data.schedules;
      subjects = subjects || semesterData.data.subjects;
      teachers = teachers || semesterData.data.teachers;
      rooms = rooms || semesterData.data.rooms;
      classes = classes || semesterData.data.classes;
    }
    
    // Filter substitutions by date
    const dateSubstitutions = substitutions.filter(sub => 
      new Date(sub.absent_date).toDateString() === new Date(date).toDateString()
    );
    
    // Get substitution schedules
    const substitutionSchedules = semesterData.data.substitution_schedules || [];
    
    // Transform to export format
    const exportData = [];
    
    for (const substitution of dateSubstitutions) {
      const absentTeacher = teachers.find(t => t.id === substitution.absent_teacher_id);
      const relatedSubSchedules = substitutionSchedules.filter(ss => ss.substitution_id === substitution.id);
      
      for (const subSchedule of relatedSubSchedules) {
        const originalSchedule = schedules.find(s => s.id === subSchedule.original_schedule_id);
        const subject = subjects.find(s => s.id === originalSchedule?.subject_id);
        const room = rooms.find(r => r.id === originalSchedule?.room_id);
        const cls = classes.find(c => c.id === originalSchedule?.class_id);
        const substituteTeacher = teachers.find(t => t.id === subSchedule.substitute_teacher_id);
        
        exportData.push({
          'วันที่': new Date(substitution.absent_date).toLocaleDateString('th-TH'),
          'ครูที่ขาด': absentTeacher?.name || '',
          'เหตุผล': substitution.reason || '',
          'คาบ': originalSchedule?.period || '',
          'เวลา': originalSchedule ? getTimeSlot(originalSchedule.period) : '',
          'วิชา': subject?.subject_name || '',
          'ห้องเรียน': cls?.class_name || '',
          'ห้อง': room ? `${room.name} (${room.room_type})` : '',
          'ครูสอนแทน': substituteTeacher?.name || ''
        });
      }
    }
    
    return exportData;
  } catch (error) {
    console.error('[DataService] Failed to normalize substitution data:', error);
    throw error;
  }
}

// Helper function for time slots
function getTimeSlot(period) {
  const timeSlots = generateTimeSlots();
  return timeSlots[period - 1] || `คาบ ${period}`;
}

// Export current context
export function getCurrentContext() {
  return { ...currentContext };
}

// Additional exports for substitutions
export async function getSubstitutions() {
  return await substitutionsAPI.getSubstitutions(currentContext.currentYear);
}

export async function getSubstitutionSchedules() {
  return await substitutionsAPI.getSubstitutionSchedules(currentContext.currentYear);
}