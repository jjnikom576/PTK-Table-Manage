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

/**
 * Generate Time Slots
 */
export const generateTimeSlots = () => [
  '08:40 น.\u00A0-\u00A009:30 น.',
  '09:30 น.\u00A0-\u00A010:20 น.',
  '10:20 น.\u00A0-\u00A011:10 น.',
  '11:10 น.\u00A0-\u00A012:00 น.',
  '13:00 น.\u00A0-\u00A013:50 น.',
  '13:50 น.\u00A0-\u00A014:40 น.',
  '14:40 น.\u00A0-\u00A015:30 น.',
  '15:30 น.\u00A0-\u00A016:20 น.'
];

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
 * Format Teacher Name with Subject Group
 */
export const formatTeacherName = (teacher) => teacher ? `${teacher.name} (${teacher.subject_group})` : '';

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
