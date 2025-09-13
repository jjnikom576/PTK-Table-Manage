/**
 * Enhanced Schedules Mock Data
 * Part 1: Basic Structure และ Sample Schedules
 * เชื่อมกับ subjects, classes, rooms พร้อม conflict detection
 */

// Time Periods Configuration
export const TIME_PERIODS = {
    1: { start: '08:20', end: '09:10', label: 'คาบ 1' },
    2: { start: '09:10', end: '10:00', label: 'คาบ 2' },
    3: { start: '10:00', end: '10:50', label: 'คาบ 3' },
    4: { start: '10:50', end: '11:40', label: 'คาบ 4' },
    5: { start: '13:00', end: '13:50', label: 'คาบ 5' },
    6: { start: '13:50', end: '14:40', label: 'คาบ 6' },
    7: { start: '14:40', end: '15:30', label: 'คาบ 7' },
    8: { start: '15:30', end: '16:20', label: 'คาบ 8' }
};

// Days of Week Configuration
export const DAYS_OF_WEEK = {
    1: { short: 'จ', full: 'จันทร์' },
    2: { short: 'อ', full: 'อังคาร' },
    3: { short: 'พ', full: 'พุธ' },
    4: { short: 'พฤ', full: 'พฤหัสบดี' },
    5: { short: 'ศ', full: 'ศุกร์' }
};

// Sample Schedules 2567 - ม.1/1 (subject_id อ้างอิงจาก subjects.mock.js)
const schedules_2567_sample = [
    // จันทร์ - ม.1/1
    {
        id: 1,
        semester_id: 4,
        subject_id: 1,  // วิทยาศาสตร์ (id: 1)
        class_id: 1,    // ม.1/1
        day_of_week: 1, // จันทร์
        period: 1,      // คาบ 1
        room_id: 14,    // ห้องวิทยาศาสตร์ 1 (TECH)
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 2,
        semester_id: 4,
        subject_id: 2,  // คณิตศาสตร์ (id: 2)
        class_id: 1,    // ม.1/1
        day_of_week: 1, // จันทร์
        period: 2,      // คาบ 2
        room_id: 1,     // ห้อง 101 (CLASS)
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 3,
        semester_id: 4,
        subject_id: 3,  // ภาษาไทย (id: 3)
        class_id: 1,    // ม.1/1
        day_of_week: 1, // จันทร์
        period: 3,      // คาบ 3
        room_id: 1,     // ห้อง 101 (CLASS)
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 4,
        semester_id: 4,
        subject_id: 4,  // ภาษาอังกฤษ (id: 4)
        class_id: 1,    // ม.1/1
        day_of_week: 1, // จันทร์
        period: 5,      // คาบ 5
        room_id: 1,     // ห้อง 101 (CLASS)
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // อังคาร - ม.1/1
    {
        id: 5,
        semester_id: 4,
        subject_id: 2,  // คณิตศาสตร์ (id: 2)
        class_id: 1,    // ม.1/1
        day_of_week: 2, // อังคาร
        period: 1,      // คาบ 1
        room_id: 1,     // ห้อง 101 (CLASS)
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 6,
        semester_id: 4,
        subject_id: 1,  // วิทยาศาสตร์ (id: 1)
        class_id: 1,    // ม.1/1
        day_of_week: 2, // อังคาร
        period: 2,      // คาบ 2
        room_id: 14,    // ห้องวิทยาศาสตร์ 1 (TECH)
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // จันทร์ - ม.1/2 (ต้องไม่ชนกับครูเดียวกัน)
    {
        id: 7,
        semester_id: 4,
        subject_id: 6,  // คณิตศาสตร์ ม.1/2 (ต้องสร้าง subject ใหม่)
        class_id: 2,    // ม.1/2
        day_of_week: 1, // จันทร์
        period: 1,      // คาบ 1
        room_id: 2,     // ห้อง 102 (CLASS)
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 8,
        semester_id: 4,
        subject_id: 7,  // วิทยาศาสตร์ ม.1/2 (ต้องสร้าง subject ใหม่)
        class_id: 2,    // ม.1/2
        day_of_week: 1, // จันทร์
        period: 4,      // คาบ 4 - ต้องต่างคาบกับ ม.1/1
        room_id: 14,    // ห้องวิทยาศาสตร์ 1 (TECH) - ใช้ร่วมกับ ม.1/1 ได้
        created_at: '2024-05-01T00:00:00.000Z'
    }
];

// Schedules 2568 - Copy from 2567 but adjust semester_id and subject_id mapping
const schedules_2568_sample = schedules_2567_sample.map(schedule => {
    // Subject ID mapping: 2567 (1,2,3,4,5) -> 2568 (101,102,103,104,105)
    return {
        ...schedule,
        id: schedule.id + 100, // เพิ่ม 100 เพื่อไม่ให้ id ซ้ำ
        semester_id: 7,  // ภาคเรียนที่ 1 ปี 2568
        subject_id: schedule.subject_id + 100, // subject_id: 1->101, 2->102, etc.
        created_at: '2025-05-01T00:00:00.000Z'
    };
});

// Multi-Year Schedules Data Structure
const schedulesData = {
    schedules_2566: [],  // ยังไม่มีข้อมูล
    schedules_2567: schedules_2567_sample,
    schedules_2568: schedules_2568_sample
};

// Conflict Detection Logic
export const ConflictDetection = {
    /**
     * Validate schedule conflict across 3 dimensions
     * @param {Object} newSchedule - New schedule to validate
     * @param {Array} existingSchedules - Array of existing schedules
     * @param {Object} context - Context data {subjects, teachers, rooms}
     * @returns {Object} - Validation result {ok, conflicts[]}
     */
    validateScheduleConflict(newSchedule, existingSchedules, context) {
        const { subjects, teachers, rooms } = context;
        const conflicts = [];
        
        // Get subject data for teacher info
        const newSubject = subjects?.find(s => s.id === newSchedule.subject_id);
        if (!newSubject) {
            return { ok: false, conflicts: ['ไม่พบข้อมูลวิชา'] };
        }
        
        // Filter schedules for same time slot
        const sameTimeSlot = existingSchedules.filter(schedule => 
            schedule.day_of_week === newSchedule.day_of_week &&
            schedule.period === newSchedule.period &&
            schedule.id !== newSchedule.id // Don't conflict with self
        );
        
        // 1. Check Teacher Conflict
        const teacherConflicts = sameTimeSlot.filter(schedule => {
            const existingSubject = subjects?.find(s => s.id === schedule.subject_id);
            return existingSubject?.teacher_id === newSubject.teacher_id;
        });
        
        if (teacherConflicts.length > 0) {
            const teacher = teachers?.find(t => t.id === newSubject.teacher_id);
            const teacherName = teacher?.name || `ครูรหัส ${newSubject.teacher_id}`;
            conflicts.push({
                type: 'TEACHER_CONFLICT',
                message: `ครูชนคาบ: ${teacherName} มีคาบสอนในเวลาเดียวกัน`,
                details: teacherConflicts
            });
        }
        
        // 2. Check Class Conflict
        const classConflicts = sameTimeSlot.filter(schedule => 
            schedule.class_id === newSchedule.class_id
        );
        
        if (classConflicts.length > 0) {
            conflicts.push({
                type: 'CLASS_CONFLICT',
                message: `ห้องเรียนชนคาบ: ห้อง ${newSchedule.class_id} มีคาบเรียนในเวลาเดียวกัน`,
                details: classConflicts
            });
        }
        
        // 3. Check Room Conflict (if room is specified)
        if (newSchedule.room_id) {
            const roomConflicts = sameTimeSlot.filter(schedule => 
                schedule.room_id === newSchedule.room_id
            );
            
            if (roomConflicts.length > 0) {
                const room = rooms?.find(r => r.id === newSchedule.room_id);
                const roomName = room?.name || `ห้อง ${newSchedule.room_id}`;
                conflicts.push({
                    type: 'ROOM_CONFLICT',
                    message: `ห้องชนคาบ: ${roomName} ถูกใช้ในเวลาเดียวกัน`,
                    details: roomConflicts
                });
            }
        }
        
        return {
            ok: conflicts.length === 0,
            conflicts
        };
    },
    
    /**
     * Check room type constraints
     * @param {Object} subject - Subject with constraints
     * @param {Object} room - Room to check
     * @returns {Object} - Validation result {ok, reason}
     */
    validateRoomConstraints(subject, room) {
        if (!subject.subject_constraints || !room) {
            return { ok: true, reason: 'No constraints or no room' };
        }
        
        const constraints = subject.subject_constraints;
        
        // Check required room type
        if (constraints.requires_room_type && 
            room.room_type !== constraints.requires_room_type) {
            return {
                ok: false,
                reason: `วิชา ${subject.subject_name} ต้องการห้องประเภท ${constraints.requires_room_type} แต่ห้อง ${room.name} เป็นประเภท ${room.room_type}`
            };
        }
        
        return { ok: true, reason: 'Constraints satisfied' };
    }
};

// Main Helper Functions
export const ScheduleUtils = {
    /**
     * Get schedules by year
     * @param {string|number} year - Academic year (2566, 2567, 2568)
     * @returns {Array} - Array of schedule objects
     */
    getSchedulesByYear(year) {
        const yearStr = year.toString();
        return schedulesData[`schedules_${yearStr}`] || [];
    },

    /**
     * Get schedules by semester
     * @param {number} semesterId - Semester ID
     * @returns {Array} - Array of schedules in the semester
     */
    getSchedulesBySemester(semesterId) {
        // Search across all years
        const allSchedules = Object.values(schedulesData).flat();
        return allSchedules.filter(schedule => schedule.semester_id === semesterId);
    },

    /**
     * Get schedules by class and semester
     * @param {number} classId - Class ID
     * @param {number} semesterId - Semester ID
     * @returns {Array} - Array of schedules for the class
     */
    getSchedulesByClass(classId, semesterId) {
        const semesterSchedules = this.getSchedulesBySemester(semesterId);
        return semesterSchedules.filter(schedule => schedule.class_id === classId);
    },

    /**
     * Get schedules by teacher
     * @param {number} teacherId - Teacher ID
     * @param {number} semesterId - Semester ID
     * @param {Array} subjects - Subjects data for teacher lookup
     * @returns {Array} - Array of schedules for the teacher
     */
    getSchedulesByTeacher(teacherId, semesterId, subjects) {
        const semesterSchedules = this.getSchedulesBySemester(semesterId);
        
        return semesterSchedules.filter(schedule => {
            const subject = subjects.find(s => s.id === schedule.subject_id);
            return subject?.teacher_id === teacherId;
        });
    },

    /**
     * Get schedules by room
     * @param {number} roomId - Room ID
     * @param {number} semesterId - Semester ID
     * @returns {Array} - Array of schedules using the room
     */
    getSchedulesByRoom(roomId, semesterId) {
        const semesterSchedules = this.getSchedulesBySemester(semesterId);
        return semesterSchedules.filter(schedule => schedule.room_id === roomId);
    },

    /**
     * Normalize schedule row for export (join with related data)
     * @param {Object} schedule - Schedule object
     * @param {Object} context - Context data {subjects, teachers, classes, rooms}
     * @returns {Object} - Normalized schedule data for export
     */
    normalizeScheduleRowForExport(schedule, context) {
        const { subjects, teachers, classes, rooms } = context;
        
        const subject = subjects?.find(s => s.id === schedule.subject_id);
        const teacher = teachers?.find(t => t.id === subject?.teacher_id);
        const classInfo = classes?.find(c => c.id === schedule.class_id);
        const room = rooms?.find(r => r.id === schedule.room_id);
        
        const dayInfo = DAYS_OF_WEEK[schedule.day_of_week];
        const periodInfo = TIME_PERIODS[schedule.period];
        
        return {
            // Original data
            ...schedule,
            
            // Joined data
            subject_name: subject?.subject_name || 'ไม่ระบุ',
            subject_code: subject?.subject_code || '',
            teacher_name: teacher?.name || 'ไม่ระบุ',
            teacher_subject_group: teacher?.subject_group || '',
            class_name: classInfo?.class_name || 'ไม่ระบุ',
            room_name: room?.name || 'ไม่ระบุ',
            room_type: room?.room_type || '',
            
            // Formatted data
            day_name: dayInfo?.full || 'ไม่ระบุ',
            period_time: periodInfo ? `${periodInfo.start}-${periodInfo.end}` : '',
            period_label: periodInfo?.label || `คาบ ${schedule.period}`,
            
            // Display format
            time_slot: `วัน${dayInfo?.short || ''} คาบ${schedule.period}`,
            full_display: `${subject?.subject_name || 'ไม่ระบุ'} - ${teacher?.name || 'ไม่ระบุ'} - ${room?.name || 'ไม่ระบุ'}`
        };
    },

    /**
     * Build timetable matrix for display
     * @param {Array} schedules - Array of schedules
     * @param {Object} context - Context data
     * @returns {Object} - Timetable matrix {matrix, days, periods}
     */
    buildTimetableMatrix(schedules, context) {
        const matrix = {};
        const days = Object.keys(DAYS_OF_WEEK).map(d => parseInt(d)).sort();
        const periods = Object.keys(TIME_PERIODS).map(p => parseInt(p)).sort();
        
        // Initialize empty matrix
        days.forEach(day => {
            matrix[day] = {};
            periods.forEach(period => {
                matrix[day][period] = null;
            });
        });
        
        // Fill matrix with schedules
        schedules.forEach(schedule => {
            const normalized = this.normalizeScheduleRowForExport(schedule, context);
            matrix[schedule.day_of_week][schedule.period] = normalized;
        });
        
        return {
            matrix,
            days: days.map(d => ({ id: d, ...DAYS_OF_WEEK[d] })),
            periods: periods.map(p => ({ id: p, ...TIME_PERIODS[p] }))
        };
    }
};

// Export default
export default {
    data: schedulesData,
    utils: ScheduleUtils,
    conflicts: ConflictDetection,
    periods: TIME_PERIODS,
    days: DAYS_OF_WEEK
};

// Also export schedulesData directly for compatibility
export { schedulesData };
