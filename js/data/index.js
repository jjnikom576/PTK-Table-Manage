/**
 * Enhanced Data Index - Multi-Year Mock Data with Rooms
 * Complete rewrite with proper function ordering
 */

// Import all mock data modules
import academicYearsData, { AcademicYearUtils } from './academicYears.mock.js';
import semestersData, { SemesterUtils, AcademicContextUtils } from './semesters.mock.js';
import teachersData, { TeacherUtils } from './teachers.mock.js';
import classesData, { ClassUtils } from './classes.mock.js';
import roomsData, { RoomUtils, ROOM_TYPES } from './rooms.mock.js';
import subjectsData from './subjects.mock.js';
import { schedulesData } from './schedules.mock.js';
import substitutionsData from './substitutions.mock.js';

// Main Export Structure - Multi-Year Data
export const mockData = {
    // Fixed tables (ไม่แยกตามปี)
    academicYears: academicYearsData.years,
    semesters: semestersData.semesters,
    
    // Dynamic tables by year
    2566: {
        teachers: teachersData.data.teachers_2566 || [],
        classes: classesData.data.classes_2566 || [],
        rooms: roomsData.data.rooms_2566 || [],
        subjects: subjectsData.data.subjects_2566 || [],
        schedules: schedulesData.schedules_2566 || [],
        substitutions: substitutionsData.data.substitutions_2566 || [],
        substitution_schedules: substitutionsData.data.substitution_schedules_2566 || []
    },
    2567: {
        teachers: teachersData.data.teachers_2567 || [],
        classes: classesData.data.classes_2567 || [],
        rooms: roomsData.data.rooms_2567 || [],
        subjects: subjectsData.data.subjects_2567 || [],
        schedules: schedulesData.schedules_2567 || [],
        substitutions: substitutionsData.data.substitutions_2567 || [],
        substitution_schedules: substitutionsData.data.substitution_schedules_2567 || []
    },
    2568: {
        teachers: teachersData.data.teachers_2568 || [],
        classes: classesData.data.classes_2568 || [],
        rooms: roomsData.data.rooms_2568 || [],
        subjects: subjectsData.data.subjects_2568 || [],
        schedules: schedulesData.schedules_2568 || [],
        substitutions: substitutionsData.data.substitutions_2568 || [],
        substitution_schedules: substitutionsData.data.substitution_schedules_2568 || []
    }
}

// Export all Utils and Constants
export {
    // Original utils from individual modules
    AcademicYearUtils,
    SemesterUtils,
    AcademicContextUtils,
    TeacherUtils,
    ClassUtils,
    RoomUtils,
    
    // Constants
    ROOM_TYPES
};

// Default export for convenient access
export default {
    // Main data
    data: mockData,
    
    // Context management
    setContext: setGlobalContext,
    getContext: getGlobalContext,
    switchContext: switchContext,
    
    // Multi-year functions
    getDataByYear,
    getDataBySemester,
    getCurrentData: getCurrentYearData,
    validateData: validateCrossYearData,
    
    // Room functions
    getRooms: getRoomsForYear,
    validateRoom: validateRoomAvailability,
    getRoomInfo: getRoomDisplayInfo,
    
    // Export functions
    exportStudent: prepareStudentScheduleExport,
    exportTeacher: prepareTeacherScheduleExport,
    exportSubstitution: prepareSubstitutionExport,
    normalizeExport: normalizeDataForExport
};;

// Global Context Management
let __CONTEXT__ = {
    year: null,
    semesterId: null,
    lastUpdated: null
};

export function setGlobalContext(year, semesterId) {
    __CONTEXT__ = {
        year: year.toString(),
        semesterId,
        lastUpdated: new Date().toISOString()
    };
    
    if (typeof window !== 'undefined') {
        window.globalAcademicContext = {
            currentYear: year.toString(),
            currentSemester: semesterId
        };
    }
}

export function getGlobalContext() {
    if (typeof window !== 'undefined' && window.globalAcademicContext) {
        return {
            year: window.globalAcademicContext.currentYear,
            semesterId: window.globalAcademicContext.currentSemester
        };
    }
    
    return __CONTEXT__.year ? __CONTEXT__ : {
        year: '2567',
        semesterId: 4
    };
}

export function prepareTeacherScheduleExport(teacherId, semesterId) {
    const semesterData = getDataBySemester(semesterId);
    const schedules = ScheduleUtils.getSchedulesByTeacher(
        teacherId, semesterId, semesterData.subjects
    );
    
    const context = {
        subjects: semesterData.subjects,
        teachers: semesterData.teachers,
        classes: semesterData.classes,
        rooms: semesterData.rooms
    };
    
    const workload = SubjectUtils.calculateTeacherWorkload(teacherId, semesterId);
    
    return {
        type: 'teacher_schedule',
        teacherId,
        semesterId,
        workload,
        data: schedules.map(schedule => 
            ScheduleUtils.normalizeScheduleRowForExport(schedule, context)
        ),
        matrix: ScheduleUtils.buildTimetableMatrix(schedules, context)
    };
}

export function prepareSubstitutionExport(date, semesterId) {
    const semesterData = getDataBySemester(semesterId);
    const substitutions = semesterData.substitutions.filter(s => s.absent_date === date);
    
    const context = {
        subjects: semesterData.subjects,
        teachers: semesterData.teachers,
        classes: semesterData.classes,
        rooms: semesterData.rooms,
        schedules: semesterData.schedules
    };
    
    const exportData = [];
    
    // Process each substitution with its assignments
    Object.values(substitutionsData.data).forEach(scheduleArray => {
        if (Array.isArray(scheduleArray)) {
            scheduleArray.forEach(assignment => {
                const substitution = substitutions.find(s => s.id === assignment.substitution_id);
                if (substitution) {
                    const originalSchedule = context.schedules.find(s => s.id === assignment.original_schedule_id);
                    const subject = context.subjects.find(s => s.id === originalSchedule?.subject_id);
                    const absentTeacher = context.teachers.find(t => t.id === substitution.absent_teacher_id);
                    const substituteTeacher = context.teachers.find(t => t.id === assignment.substitute_teacher_id);
                    const classInfo = context.classes.find(c => c.id === originalSchedule?.class_id);
                    const room = context.rooms.find(r => r.id === originalSchedule?.room_id);
                    
                    exportData.push(SubstitutionUtils.normalizeSubstitutionRowForExport({
                        substitution,
                        assignment,
                        absentTeacher,
                        substituteTeacher,
                        originalSchedule,
                        subject,
                        classInfo,
                        room
                    }, true));
                }
            });
        }
    });
    
    return {
        type: 'substitution',
        date,
        semesterId,
        data: exportData
    };
}

export function normalizeDataForExport(data, type) {
    switch (type) {
        case 'csv':
            return data.map(row => {
                const flattened = {};
                Object.keys(row).forEach(key => {
                    const value = row[key];
                    flattened[key] = typeof value === 'object' && value !== null 
                        ? JSON.stringify(value).replace(/,/g, ';')
                        : String(value || '').replace(/,/g, ';');
                });
                return flattened;
            });
        
        case 'excel':
            return data.map(row => {
                const normalized = { ...row };
                Object.keys(normalized).forEach(key => {
                    if (key.includes('date') || key.includes('_at')) {
                        const value = normalized[key];
                        if (value && typeof value === 'string') {
                            normalized[key] = new Date(value).toLocaleDateString('th-TH');
                        }
                    }
                });
                return normalized;
            });
        
        default:
            return data;
    }
}

export function switchContext(newYear, newSemesterId) {
    setGlobalContext(newYear, newSemesterId);
    return getGlobalContext();
}

// Multi-Year Utility Functions
export function getDataByYear(year) {
    const yearStr = year.toString();
    return mockData[yearStr] || {};
}

export function getDataBySemester(semesterId) {
    const result = {
        teachers: [],
        classes: [],
        rooms: [],
        subjects: [],
        schedules: [],
        substitutions: []
    };
    
    const semester = mockData.semesters.find(s => s.id === semesterId);
    if (!semester) return result;
    
    const academicYear = mockData.academicYears.find(y => y.id === semester.academic_year_id);
    if (!academicYear) return result;
    
    const yearData = getDataByYear(academicYear.year);
    
    return {
        teachers: yearData.teachers || [],
        classes: yearData.classes?.filter(c => c.semester_id === semesterId) || [],
        rooms: yearData.rooms || [],
        subjects: yearData.subjects?.filter(s => s.semester_id === semesterId) || [],
        schedules: yearData.schedules?.filter(s => s.semester_id === semesterId) || [],
        substitutions: yearData.substitutions?.filter(s => s.semester_id === semesterId) || []
    };
}

export function getCurrentYearData() {
    const context = getGlobalContext();
    return getDataByYear(context.year);
}

export function validateCrossYearData() {
    const errors = [];
    
    ['2566', '2567', '2568'].forEach(year => {
        const data = mockData[year];
        if (!data) {
            errors.push(`Missing data for year ${year}`);
            return;
        }
        
        // Validate subjects → teachers FK
        data.subjects?.forEach(subject => {
            const teacher = data.teachers?.find(t => t.id === subject.teacher_id);
            if (!teacher) {
                errors.push(`Year ${year}: Subject ${subject.id} references non-existent teacher ${subject.teacher_id}`);
            }
        });
        
        // Validate subjects → classes FK  
        data.subjects?.forEach(subject => {
            const classInfo = data.classes?.find(c => c.id === subject.class_id);
            if (!classInfo) {
                errors.push(`Year ${year}: Subject ${subject.id} references non-existent class ${subject.class_id}`);
            }
        });
        
        // Validate schedules → rooms FK
        data.schedules?.forEach(schedule => {
            if (schedule.room_id) {
                const room = data.rooms?.find(r => r.id === schedule.room_id);
                if (!room) {
                    errors.push(`Year ${year}: Schedule ${schedule.id} references non-existent room ${schedule.room_id}`);
                }
            }
        });
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Room Integration Functions
export function getRoomsForYear(year) {
    const yearData = getDataByYear(year);
    return yearData.rooms || [];
}

export function validateRoomAvailability(roomId, day, period, year) {
    const yearData = getDataByYear(year);
    const schedules = yearData.schedules || [];
    
    const conflicts = schedules.filter(schedule => 
        schedule.room_id === roomId &&
        schedule.day_of_week === day &&
        schedule.period === period
    );
    
    return {
        available: conflicts.length === 0,
        conflicts
    };
}

export function getRoomDisplayInfo(roomId, year) {
    const rooms = getRoomsForYear(year);
    const room = rooms.find(r => r.id === roomId);
    
    if (!room) {
        return {
            name: 'ไม่ระบุ',
            type: '',
            badge: '',
            fullDisplay: 'ไม่ระบุ'
        };
    }
    
    const typeInfo = ROOM_TYPES[room.room_type] || ROOM_TYPES.CLASS;
    
    return {
        name: room.name,
        type: room.room_type,
        badge: typeInfo.label,
        badgeColor: typeInfo.color,
        badgeBgColor: typeInfo.bgColor,
        fullDisplay: `${room.name} (${typeInfo.label})`,
        capacity: room.capacity,
        location: room.location
    };
}

// Export Preparation Functions
export function prepareStudentScheduleExport(classId, semesterId) {
    const semesterData = getDataBySemester(semesterId);
    const schedules = semesterData.schedules.filter(s => s.class_id === classId);
    
    const context = {
        subjects: semesterData.subjects,
        teachers: semesterData.teachers,
        classes: semesterData.classes,
        rooms: semesterData.rooms
    };
    
    return {
        type: 'student_schedule',
        classId,
        semesterId,
        data: schedules.map(schedule => 
            ScheduleUtils.normalizeScheduleRowForExport(schedule, context)
        ),
        matrix: ScheduleUtils.buildTimetableMatrix(schedules, context)
    };
}
