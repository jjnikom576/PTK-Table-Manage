// Enhanced Data Index - Multi-Year Complete System
// รวม mock data ทั้งหมด 3 ปี 6 เทอม

import { academicYearsData } from './academicYears.mock.js';
import { semestersData } from './semesters.mock.js';
import { teachersData } from './teachers.mock.js';
import { classesData } from './classes.mock.js';
import { roomsData } from './rooms.mock.js';
import { subjectsData } from './subjects.mock.js';
import { schedulesData } from './schedules.mock.js';
import { substitutionsData } from './substitutions.mock.js';

// Combined Mock Data
export const mockData = {
  // Fixed tables
  academicYears: academicYearsData,
  semesters: semestersData,
  
  // Dynamic tables by year
  2566: {
    teachers: teachersData.teachers_2566,
    classes: classesData.classes_2566,
    rooms: roomsData.rooms_2566,
    subjects: subjectsData.subjects_2566,
    schedules: schedulesData.schedules_2566,
    substitutions: substitutionsData.substitutions_2566,
    substitution_schedules: substitutionsData.substitution_schedules_2566
  },
  2567: {
    teachers: teachersData.teachers_2567,
    classes: classesData.classes_2567,
    rooms: roomsData.rooms_2567,
    subjects: subjectsData.subjects_2567,
    schedules: schedulesData.schedules_2567,
    substitutions: substitutionsData.substitutions_2567,
    substitution_schedules: substitutionsData.substitution_schedules_2567
  },
  2568: {
    teachers: teachersData.teachers_2568,
    classes: classesData.classes_2568,
    rooms: roomsData.rooms_2568,
    subjects: subjectsData.subjects_2568,
    schedules: schedulesData.schedules_2568,
    substitutions: substitutionsData.substitutions_2568,
    substitution_schedules: substitutionsData.substitution_schedules_2568
  },
  2569: {
    teachers: teachersData.teachers_2569,
    classes: classesData.classes_2569,
    rooms: roomsData.rooms_2569,
    subjects: subjectsData.subjects_2569,
    schedules: schedulesData.schedules_2569,
    substitutions: [],
    substitution_schedules: []
  },
  2570: {
    teachers: teachersData.teachers_2570,
    classes: classesData.classes_2570,
    rooms: roomsData.rooms_2570,
    subjects: subjectsData.subjects_2570,
    schedules: schedulesData.schedules_2570,
    substitutions: [],
    substitution_schedules: []
  }
};

// Global Context Management
let __CONTEXT__ = { year: 2567, semesterId: 3 };

export function setGlobalContext(year, semesterId) {
  __CONTEXT__ = { year, semesterId };
}

export function getGlobalContext() {
  return __CONTEXT__;
}

export function switchContext(newYear, newSemesterId) {
  const oldContext = __CONTEXT__;
  setGlobalContext(newYear, newSemesterId);
  return oldContext;
}

// Multi-Year Functions
export function getDataByYear(year) {
  return mockData[year] || null;
}

export function getDataBySemester(semesterId) {
  // Find year by semester
  const semester = semestersData.find(s => s.id === semesterId);
  if (!semester) return null;
  
  const year = academicYearsData.find(y => y.id === semester.academic_year_id)?.year;
  return year ? getDataByYear(year) : null;
}

export function getCurrentYearData() {
  return getDataByYear(__CONTEXT__.year);
}

// Export Preparation Functions
export function prepareStudentScheduleExport(classId, semesterId) {
  const data = getDataBySemester(semesterId);
  if (!data) return [];
  
  const schedules = data.schedules.filter(s => s.class_id === classId && s.semester_id === semesterId);
  
  return schedules.map(schedule => {
    const subject = data.subjects.find(s => s.id === schedule.subject_id);
    const teacher = data.teachers.find(t => t.id === subject?.teacher_id);
    const room = data.rooms.find(r => r.id === schedule.room_id);
    const cls = data.classes.find(c => c.id === schedule.class_id);
    
    return {
      day_of_week: schedule.day_of_week,
      period: schedule.period,
      subject_name: subject?.subject_name,
      subject_code: subject?.subject_code,
      teacher_name: teacher?.name,
      class_name: cls?.class_name,
      room_name: room?.name,
      room_type: room?.room_type
    };
  });
}

export function prepareTeacherScheduleExport(teacherId, semesterId) {
  const data = getDataBySemester(semesterId);
  if (!data) return [];
  
  const teacherSubjects = data.subjects.filter(s => s.teacher_id === teacherId && s.semester_id === semesterId);
  const schedules = [];
  
  teacherSubjects.forEach(subject => {
    const subjectSchedules = data.schedules.filter(s => s.subject_id === subject.id);
    subjectSchedules.forEach(schedule => {
      const room = data.rooms.find(r => r.id === schedule.room_id);
      const cls = data.classes.find(c => c.id === schedule.class_id);
      
      schedules.push({
        day_of_week: schedule.day_of_week,
        period: schedule.period,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        class_name: cls?.class_name,
        room_name: room?.name,
        room_type: room?.room_type
      });
    });
  });
  
  return schedules;
}

export function prepareSubstitutionExport(date, semesterId) {
  const data = getDataBySemester(semesterId);
  if (!data) return [];
  
  const subs = data.substitutions.filter(s => s.absent_date === date);
  const results = [];
  
  subs.forEach(sub => {
    const subSchedules = data.substitution_schedules.filter(ss => ss.substitution_id === sub.id);
    subSchedules.forEach(subSchedule => {
      const originalSchedule = data.schedules.find(s => s.id === subSchedule.original_schedule_id);
      const subject = data.subjects.find(s => s.id === originalSchedule?.subject_id);
      const absentTeacher = data.teachers.find(t => t.id === sub.absent_teacher_id);
      const substituteTeacher = data.teachers.find(t => t.id === subSchedule.substitute_teacher_id);
      const room = data.rooms.find(r => r.id === originalSchedule?.room_id);
      const cls = data.classes.find(c => c.id === originalSchedule?.class_id);
      
      results.push({
        absent_date: sub.absent_date,
        absent_teacher_name: absentTeacher?.name,
        reason: sub.reason,
        period: originalSchedule?.period,
        subject_name: subject?.subject_name,
        class_name: cls?.class_name,
        room_name: room?.name,
        room_type: room?.room_type,
        substitute_teacher_name: substituteTeacher?.name
      });
    });
  });
  
  return results;
}

export function normalizeDataForExport(data, type) {
  switch (type) {
    case 'student':
      return data.map(row => ({
        'วัน': ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'][row.day_of_week],
        'เวลา': ['', '08:20-09:10', '09:10-10:00', '10:00-10:50', '10:50-11:40', '13:00-13:50', '13:50-14:40'][row.period],
        'คาบ': row.period,
        'วิชา': row.subject_name,
        'รหัสวิชา': row.subject_code,
        'ครู': row.teacher_name,
        'ห้องเรียน': row.class_name,
        'ห้อง': row.room_name ? `${row.room_name} (${row.room_type || ''})` : '-'
      }));
    
    case 'teacher':
      return data.map(row => ({
        'วัน': ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'][row.day_of_week],
        'เวลา': ['', '08:20-09:10', '09:10-10:00', '10:00-10:50', '10:50-11:40', '13:00-13:50', '13:50-14:40'][row.period],
        'คาบ': row.period,
        'วิชา': row.subject_name,
        'ห้องเรียน': row.class_name,
        'ห้อง': row.room_name ? `${row.room_name} (${row.room_type || ''})` : '-'
      }));
    
    case 'substitution':
      return data.map(row => ({
        'วันที่': row.absent_date,
        'ครูที่ขาด': row.absent_teacher_name,
        'เหตุผล': row.reason,
        'คาบ': row.period,
        'วิชา': row.subject_name,
        'ห้องเรียน': row.class_name,
        'ห้อง': row.room_name ? `${row.room_name} (${row.room_type || ''})` : '-',
        'ครูสอนแทน': row.substitute_teacher_name
      }));
    
    default:
      return data;
  }
}

// Cross-year analysis
export function compareAcrossYears(dataType, years = [2566, 2567, 2568]) {
  const comparison = {};
  years.forEach(year => {
    const data = getDataByYear(year);
    if (data && data[dataType]) {
      comparison[year] = {
        count: data[dataType].length,
        data: data[dataType]
      };
    }
  });
  return comparison;
}

export function validateCrossYearData() {
  const errors = [];
  
  // Validate academic years exist
  [2566, 2567, 2568].forEach(year => {
    if (!mockData[year]) {
      errors.push(`Missing data for year ${year}`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

export default mockData;
