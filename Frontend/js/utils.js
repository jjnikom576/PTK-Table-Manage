/**
 * Enhanced Utility Functions for Multi-Year School Schedule System
 * Features: Academic year helpers, Date/time, Room functions, Conflict validation
 */

// =============================================================================
// ACADEMIC YEAR FUNCTIONS
// =============================================================================

/**
 * Format Academic Year
 */
export const formatAcademicYear = (year) => `ปีการศึกษา ${year}`;

/**
 * Parse Academic Year from string
 */
export const parseAcademicYear = (yearString) => Number(String(yearString).replace(/\D/g,''));

/**
 * Convert Gregorian year to Thai Buddhist year
 */
export const getThaiAcademicYear = (gregorianYear) => gregorianYear + 543;

/**
 * Convert Thai Buddhist year to Gregorian year
 */
export const getGregorianYear = (thaiYear) => thaiYear - 543;

/**
 * Validate Academic Year
 */
export const isValidAcademicYear = (year) => Number.isInteger(year) && year >= 2500 && year <= 3000;

/**
 * Generate Year Range
 */
export const getYearRange = (startYear, endYear) => Array.from({length: endYear-startYear+1}, (_,i)=>startYear+i);

// =============================================================================
// SEMESTER FUNCTIONS
// =============================================================================

/**
 * Get Semester Name
 */
export const getSemesterName = (semesterNumber) => {
  switch(semesterNumber) {
    case 1: return 'ภาคเรียนที่ 1';
    case 2: return 'ภาคเรียนที่ 2';
    case 3: return 'ภาคฤดูร้อน';
    default: return `ภาคเรียนที่ ${semesterNumber}`;
  }
};

/**
 * Format Semester with Year
 */
export const formatSemester = (semesterData) => `${getSemesterName(semesterData.semester_number)} ปีการศึกษา ${semesterData.year ?? ''}`;

/**
 * Check if Semester is Active
 */
export const isActiveSemester = (semesterData) => !!semesterData.is_active;

/**
 * Get Semester Date Range
 */
export const getSemesterDateRange = (semesterData) => ({ start: semesterData.start_date, end: semesterData.end_date });

/**
 * Calculate Semester Weeks
 */
export const calculateSemesterWeeks = (semesterData) => {
  if (!semesterData.start_date || !semesterData.end_date) return 0;
  
  const startDate = new Date(semesterData.start_date);
  const endDate = new Date(semesterData.end_date);
  const timeDiff = endDate.getTime() - startDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return Math.ceil(daysDiff / 7);
};

// =============================================================================
// DATE & TIME FUNCTIONS
// =============================================================================

/**
 * Format Thai Date
 */
export const formatThaiDate = (date) => {
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = thaiMonths[dateObj.getMonth()];
  const year = getThaiAcademicYear(dateObj.getFullYear());
  
  return `${day} ${month} ${year}`;
};

/**
 * Format Thai Date Time
 */
export const formatThaiDateTime = (date) => {
  const dateObj = new Date(date);
  const datePart = formatThaiDate(date);
  const timePart = dateObj.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  return `${datePart} เวลา ${timePart}`;
};

/**
 * Get Thai Year from Date
 */
export const getThaiYear = (date) => getThaiAcademicYear(new Date(date).getFullYear());

/**
 * Check if Date is in Semester
 */
export const isInSemester = (date, semesterData) => {
  if (!semesterData.start_date || !semesterData.end_date) return false;
  
  const checkDate = new Date(date);
  const startDate = new Date(semesterData.start_date);
  const endDate = new Date(semesterData.end_date);
  
  return checkDate >= startDate && checkDate <= endDate;
};

/**
 * Get Academic Week Number
 */
export const getAcademicWeek = (date, semesterData) => {
  if (!isInSemester(date, semesterData)) return 0;
  
  const checkDate = new Date(date);
  const startDate = new Date(semesterData.start_date);
  const timeDiff = checkDate.getTime() - startDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return Math.ceil(daysDiff / 7);
};

const NBSP = '\u00A0';

// Default periods as fallback (if API fails)
const DEFAULT_PERIODS = [
  { period_no: 1, period_name: 'คาบที่ 1', start_time: '08:00', end_time: '08:50' },
  { period_no: 2, period_name: 'คาบที่ 2', start_time: '08:50', end_time: '09:40' },
  { period_no: 3, period_name: 'คาบที่ 3', start_time: '09:40', end_time: '10:30' },
  { period_no: 4, period_name: 'คาบที่ 4', start_time: '10:30', end_time: '11:20' },
  { period_no: 5, period_name: 'พักเที่ยง', start_time: '11:20', end_time: '12:20', is_break: true },
  { period_no: 6, period_name: 'คาบที่ 5', start_time: '12:20', end_time: '13:10' },
  { period_no: 7, period_name: 'คาบที่ 6', start_time: '13:10', end_time: '14:00' },
  { period_no: 8, period_name: 'คาบที่ 7', start_time: '14:00', end_time: '14:50' },
  { period_no: 9, period_name: 'คาบที่ 8', start_time: '14:50', end_time: '15:40' }
];
const BREAK_KEYWORDS = ['พัก', 'break', 'lunch', 'เบรก', 'หยุด'];

// Cache for periods from API
let cachedPeriods = null;
let cachedPeriodsTimestamp = null;
const PERIODS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let periodsUnauthorizedSince = null;

const normalisePeriod = (period) => {
  if (!period) return null;
  const rawNumber = period.period_no ?? period.periodNo ?? period.id ?? period.number;
  const periodNo = Number(rawNumber);
  if (!Number.isFinite(periodNo)) return null;
  return {
    ...period,
    period_no: periodNo,
    period_name: period.period_name ?? period.name ?? '',
    start_time: period.start_time ?? period.startTime ?? '',
    end_time: period.end_time ?? period.endTime ?? '',
    is_break: typeof period.is_break === 'boolean' ? period.is_break : (period.isBreak === true ? true : undefined),
    period_type: period.period_type ?? period.type ?? ''
  };
};

/**
 * Fetch periods from API
 * @param {number} year - Academic year
 * @param {number} semesterId - Semester ID
 * @returns {Promise<Array>} - Periods array
 */
export async function fetchPeriodsFromAPI(year, semesterId) {
  // Check cache validity
  if (cachedPeriods && cachedPeriodsTimestamp &&
      (Date.now() - cachedPeriodsTimestamp) < PERIODS_CACHE_DURATION) {
    return cachedPeriods;
  }

  if (periodsUnauthorizedSince &&
      (Date.now() - periodsUnauthorizedSince) < PERIODS_CACHE_DURATION) {
    if (!cachedPeriods) {
      cachedPeriods = DEFAULT_PERIODS.map(p => ({ ...p }));
      cachedPeriodsTimestamp = Date.now();
    }
    return cachedPeriods;
  }

  try {
    // Dynamically import schedule API
    const { default: scheduleAPI } = await import('./api/schedule-api.js');

    const result = await scheduleAPI.getPeriods(year, semesterId);

    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      // Cache the result
      cachedPeriods = result.data;
      cachedPeriodsTimestamp = Date.now();
      periodsUnauthorizedSince = null;
      return result.data;
    }

    const unauthorized =
      result?.status === 401 ||
      (typeof result?.error === 'string' && result.error.toLowerCase().includes('auth'));

    if (unauthorized) {
      if (!periodsUnauthorizedSince) {
        console.warn('[Utils] Periods endpoint unauthorized. Using defaults until session available.');
      }
      periodsUnauthorizedSince = Date.now();
      cachedPeriods = DEFAULT_PERIODS.map(p => ({ ...p }));
      cachedPeriodsTimestamp = Date.now();
      return cachedPeriods;
    }

    // Fallback to default if API returns empty
    console.warn('[Utils] API returned empty periods, using defaults');
    cachedPeriods = DEFAULT_PERIODS.map(p => ({ ...p }));
    cachedPeriodsTimestamp = Date.now();
    return cachedPeriods;
  } catch (error) {
    console.error('[Utils] Failed to fetch periods from API:', error);
    // Fallback to default
    cachedPeriods = DEFAULT_PERIODS.map(p => ({ ...p }));
    cachedPeriodsTimestamp = Date.now();
    return cachedPeriods;
  }
}

export const ensurePeriodsList = (periods = []) => {
  if (Array.isArray(periods) && periods.length) {
    return periods
      .map(normalisePeriod)
      .filter(Boolean)
      .sort((a, b) => a.period_no - b.period_no);
  }
  return DEFAULT_PERIODS.map(p => ({ ...p }));
};

export const isBreakPeriod = (period) => {
  if (!period) return false;
  if (typeof period.is_break === 'boolean') return period.is_break;
  const type = String(period.period_type ?? period.type ?? '').toLowerCase();
  if (type && BREAK_KEYWORDS.some(keyword => type.includes(keyword))) return true;
  const name = String(period.period_name ?? period.name ?? '').toLowerCase();
  return BREAK_KEYWORDS.some(keyword => name.includes(keyword));
};

const formatTimeComponent = (raw) => {
  if (!raw) return '';
  const timeString = String(raw).trim();
  const match = timeString.match(/^(\d{1,2}):?(\d{2})/);
  if (!match) return timeString;
  const [, hour, minute] = match;
  return `${hour.padStart(2, '0')}:${minute}`;
};

export const formatPeriodTimeRange = (period, { includeThaiSuffix = true } = {}) => {
  if (!period) return '';
  const start = formatTimeComponent(period.start_time);
  const end = formatTimeComponent(period.end_time);
  if (!start || !end) return '';
  const suffix = includeThaiSuffix ? ' น.' : '';
  return `${start}${suffix}${NBSP}-${NBSP}${end}${suffix}`;
};

export const extractTeachingPeriods = (periods = []) =>
  ensurePeriodsList(periods).filter(period => !isBreakPeriod(period));

export const buildPeriodDisplaySequence = (periods = []) =>
  ensurePeriodsList(periods).map(period => ({
    type: isBreakPeriod(period) ? 'break' : 'teaching',
    period
  }));

export const toDisplayPeriods = (periods = []) =>
  extractTeachingPeriods(periods).map((period, idx) => ({
    period,
    actual: period.period_no,
    display: idx + 1,
    label: formatPeriodTimeRange(period)
  }));

/**
 * Generate Time Slots (fallback using default periods)
 */
export const generateTimeSlots = () =>
  extractTeachingPeriods(DEFAULT_PERIODS).map(period => formatPeriodTimeRange(period));

export const getLunchSlot = () => {
  const lunch = ensurePeriodsList(DEFAULT_PERIODS).find(isBreakPeriod);
  if (!lunch) {
    return {
      period: 5,
      label: 'พักเที่ยง',
      time: '12:00 น.\u00A0-\u00A013:00 น.'
    };
  }
  return {
    period: lunch.period_no,
    label: lunch.period_name || 'พักเที่ยง',
    time: formatPeriodTimeRange(lunch)
  };
};

/**
 * Get lunch slot from API (async version)
 * @param {number} year - Academic year
 * @param {number} semesterId - Semester ID
 * @returns {Promise<Object>} - Lunch slot object
 */
export async function getLunchSlotAsync(year, semesterId) {
  try {
    const periods = await fetchPeriodsFromAPI(year, semesterId);
    const lunch = ensurePeriodsList(periods).find(isBreakPeriod);

    if (!lunch) {
      // Fallback to default
      return {
        period: 5,
        label: 'พักเที่ยง',
        time: '12:00 น.\u00A0-\u00A013:00 น.'
      };
    }

    return {
      period: lunch.period_no,
      label: lunch.period_name || 'พักเที่ยง',
      time: formatPeriodTimeRange(lunch)
    };
  } catch (error) {
    console.error('[Utils] Failed to get lunch slot from API:', error);
    // Fallback to default
    return getLunchSlot();
  }
}

export const getDisplayPeriods = () =>
  toDisplayPeriods(DEFAULT_PERIODS).map(({ period, actual, display, label }) => ({
    actual,
    display,
    label,
    period
  }));

/**
 * Get display periods from API (async version)
 * @param {number} year - Academic year
 * @param {number} semesterId - Semester ID
 * @returns {Promise<Array>} - Display periods array
 */
export async function getDisplayPeriodsAsync(year, semesterId) {
  try {
    const periods = await fetchPeriodsFromAPI(year, semesterId);
    return toDisplayPeriods(periods).map(({ period, actual, display, label }) => ({
      actual,
      display,
      label,
      period
    }));
  } catch (error) {
    console.error('[Utils] Failed to get display periods from API:', error);
    // Fallback to default
    return getDisplayPeriods();
  }
}

/**
 * Get Short Day Name
 */
export const getDayName = (dayNumber) => ['จ','อ','พ','พฤ','ศ','ส','อา'][dayNumber-1] || '';

/**
 * Get Full Thai Day Name
 */
export const getThaiDayName = (dayNumber) => ['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์'][dayNumber-1] || '';

// =============================================================================
// CLASS & TEACHER FUNCTIONS
// =============================================================================

/**
 * Parse Class Name
 */
export const parseClassName = (className) => {
  const parts = className.split('/');
  return { grade: parts[0], section: parseInt(parts[1]) };
};

/**
 * Generate Class Name
 */
export const generateClassName = (grade, section) => `${grade}/${section}`;

/**
 * Get Grade Level from Class Name
 */
export const getGradeLevel = (className) => className.split('/')[0];

/**
 * Get Section Number from Class Name
 */
export const getSectionNumber = (className) => Number(className.split('/')[1] || 1);

/**
 * Get Teacher Display Name (รองรับทั้ง full_name และ title + f_name + l_name)
 * @param {Object} teacher - Teacher object
 * @returns {string} - Formatted teacher name
 */
export function getTeacherName(teacher) {
  if (!teacher) return 'ไม่ระบุชื่อ';

  // Build from title + f_name + l_name (title ชิดกับ f_name, ไม่เว้นวรรค)
  let name = '';

  // title ชิดกับ f_name (ไม่เว้นวรรค)
  if (teacher.title && teacher.f_name) {
    name = teacher.title + teacher.f_name;
  } else if (teacher.f_name) {
    name = teacher.f_name;
  } else if (teacher.title) {
    name = teacher.title;
  }

  // เว้นวรรคก่อน l_name (เว้นวรรค 2 ตัว)
  if (teacher.l_name) {
    name = name ? name + '  ' + teacher.l_name : teacher.l_name;
  }

  // Fallback: ถ้ายังไม่มีชื่อ ลอง full_name หรือ name
  if (!name) {
    name = teacher.full_name || teacher.name || 'ไม่ระบุชื่อ';
  }

  return name;
}

/**
 * Format Teacher Name with Subject Group
 */
export const formatTeacherName = (teacher) => teacher ? `${getTeacherName(teacher)} (${teacher.subject_group})` : '';

/**
 * Get Teacher Subject Group
 */
export const getTeacherSubjectGroup = (teacher) => teacher?.subject_group ?? '';

// =============================================================================
// ROOM FUNCTIONS (ใหม่)
// =============================================================================

/**
 * Format Room Name with Type
 */
export const formatRoomName = (room) => room ? `${room.name} (${room.room_type})` : '';

/**
 * Get Room Type Badge Class
 */
export const getRoomTypeBadgeClass = (roomType) => {
  switch(roomType) {
    case 'TECH': return 'badge--tech';
    case 'CLASS': return 'badge--classroom';
    default: return 'badge--default';
  }
};

/**
 * Check if Room is Available
 */
export const isRoomAvailable = (room, day, period, existingSchedules) => {
  if (!room || !room.id) return false;
  
  // Check if room is active
  if (!room.is_active) return false;
  
  // Check for conflicts in existing schedules
  const conflict = existingSchedules.find(schedule => 
    schedule.room_id === room.id &&
    schedule.day_of_week === day &&
    schedule.period === period
  );
  
  return !conflict;
};

/**
 * Get Room Capacity Status
 */
export const getRoomCapacityStatus = (room, studentCount) => {
  if (!room || !room.capacity || !studentCount) {
    return { status: 'unknown', message: 'ไม่ทราบข้อมูลความจุ' };
  }
  
  const utilization = (studentCount / room.capacity) * 100;
  
  if (utilization <= 70) {
    return { status: 'good', message: 'ความจุเหมาะสม', utilization };
  } else if (utilization <= 90) {
    return { status: 'warning', message: 'ใกล้เต็ม', utilization };
  } else if (utilization <= 100) {
    return { status: 'full', message: 'เต็ม', utilization };
  } else {
    return { status: 'overflow', message: 'เกินความจุ', utilization };
  }
};

// =============================================================================
// CONFLICT VALIDATION (สำคัญ)
// =============================================================================

/**
 * Validate Schedule Conflict (3D: Teacher/Class/Room)
 */
export function validateScheduleConflict(newItem, existingSchedules, { subjects, rooms, semesterId }) {
  const conflicts = {
    teacher: false,
    class: false,
    room: false
  };
  
  const details = {
    teacherConflict: null,
    classConflict: null,
    roomConflict: null
  };
  
  // Teacher conflict check
  const subject = subjects.find(s => s.id === newItem.subject_id);
  if (subject) {
    const teacherConflict = existingSchedules.find(existing => {
      const existingSubject = subjects.find(s => s.id === existing.subject_id);
      return existingSubject &&
             existingSubject.teacher_id === subject.teacher_id &&
             existing.day_of_week === newItem.day_of_week &&
             existing.period === newItem.period &&
             existing.id !== newItem.id; // Exclude self when updating
    });
    
    if (teacherConflict) {
      conflicts.teacher = true;
      details.teacherConflict = teacherConflict;
    }
  }
  
  // Class conflict check
  const classConflict = existingSchedules.find(existing =>
    existing.class_id === newItem.class_id &&
    existing.day_of_week === newItem.day_of_week &&
    existing.period === newItem.period &&
    existing.id !== newItem.id // Exclude self when updating
  );
  
  if (classConflict) {
    conflicts.class = true;
    details.classConflict = classConflict;
  }
  
  // Room conflict check (only if room is specified)
  if (newItem.room_id) {
    const roomConflict = existingSchedules.find(existing =>
      existing.room_id === newItem.room_id &&
      existing.day_of_week === newItem.day_of_week &&
      existing.period === newItem.period &&
      existing.id !== newItem.id // Exclude self when updating
    );
    
    if (roomConflict) {
      conflicts.room = true;
      details.roomConflict = roomConflict;
    }
  }
  
  // Check subject constraints (room type requirements)
  if (subject && subject.subject_constraints && subject.subject_constraints.requires_room_type && newItem.room_id) {
    const room = rooms.find(r => r.id === newItem.room_id);
    if (room && room.room_type !== subject.subject_constraints.requires_room_type) {
      conflicts.room = true;
      details.roomConflict = {
        type: 'constraint_violation',
        message: `วิชา "${subject.subject_name}" ต้องใช้ห้องประเภท ${subject.subject_constraints.requires_room_type}`
      };
    }
  }
  
  const hasConflicts = conflicts.teacher || conflicts.class || conflicts.room;
  
  return {
    ok: !hasConflicts,
    conflicts,
    details,
    summary: generateConflictSummary(conflicts, details, { subjects, rooms })
  };
}

/**
 * Generate Conflict Summary
 */
function generateConflictSummary(conflicts, details, { subjects, rooms }) {
  const messages = [];
  
  if (conflicts.teacher && details.teacherConflict) {
    const subject = subjects.find(s => s.id === details.teacherConflict.subject_id);
    messages.push(`ครูชนกัน: ${subject?.subject_name || 'Unknown'} คาบ ${details.teacherConflict.period}`);
  }
  
  if (conflicts.class && details.classConflict) {
    messages.push(`ห้องเรียนชนกัน: คาบ ${details.classConflict.period}`);
  }
  
  if (conflicts.room && details.roomConflict) {
    if (details.roomConflict.type === 'constraint_violation') {
      messages.push(details.roomConflict.message);
    } else {
      const room = rooms.find(r => r.id === details.roomConflict.room_id);
      messages.push(`ห้องชนกัน: ${room?.name || 'Unknown'} คาบ ${details.roomConflict.period}`);
    }
  }
  
  return messages;
}

/**
 * Validate Subject Room Constraints
 */
export function validateSubjectRoomConstraints(subject, room) {
  if (!subject || !subject.subject_constraints || !subject.subject_constraints.requires_room_type) {
    return { ok: true }; // No constraints
  }
  
  if (!room) {
    return {
      ok: false,
      error: `วิชา "${subject.subject_name}" ต้องระบุห้อง`
    };
  }
  
  if (room.room_type !== subject.subject_constraints.requires_room_type) {
    return {
      ok: false,
      error: `วิชา "${subject.subject_name}" ต้องใช้ห้องประเภท ${subject.subject_constraints.requires_room_type} แต่เลือกห้องประเภท ${room.room_type}`
    };
  }
  
  return { ok: true };
}

// Export additional utilities
export const DAYS_OF_WEEK = {
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัสบดี',
  5: 'ศุกร์',
  6: 'เสาร์',
  7: 'อาทิตย์'
};

export const ROOM_TYPES = {
  CLASS: 'ห้องเรียนทั่วไป',
  TECH: 'ห้องเทคโนโลยี',
  LAB_SCI: 'ห้องปฏิบัติการวิทยาศาสตร์',
  LAB_COMP: 'ห้องคอมพิวเตอร์'
};
