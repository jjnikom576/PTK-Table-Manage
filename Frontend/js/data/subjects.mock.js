// Enhanced Subjects Mock Data - Multi-Year Complete
// รวมทุกปี ทุกเทอม สำหรับ ม.1 ครบถ้วน

import subjects_2566 from './subjects_2566.mock.js';
import { subjects_2566_semester2, subjects_2567, subjects_2568 } from './subjects_additional.mock.js';
import { classesData } from './classes.mock.js';
import { teachersData } from './teachers.mock.js';

export const subjectsData = {
  // ปี 2566 (รวมทั้ง 2 ภาคเรียน)
  subjects_2566: [
    ...subjects_2566,           // ภาคเรียนที่ 1 (32 วิชา)
    ...subjects_2566_semester2  // ภาคเรียนที่ 2 (8 วิชา ตัวอย่าง)
  ],

  // ปี 2567 (ปีปัจจุบัน)
  subjects_2567: subjects_2567,  // 9 วิชา ม.1/1 ภาคเรียนที่ 1

  // ปี 2568 (อนาคต)  
  subjects_2568: subjects_2568   // 8 วิชา ม.1/1 ภาคเรียนที่ 1
};

// Helper Functions
export function getSubjectsByYear(year) {
  return subjectsData[`subjects_${year}`] || [];
}

export function getSubjectsBySemester(semesterId) {
  const allSubjects = [
    ...subjectsData.subjects_2566,
    ...subjectsData.subjects_2567, 
    ...subjectsData.subjects_2568,
    ...(subjectsData.subjects_2569 || []),
    ...(subjectsData.subjects_2570 || [])
  ];
  return allSubjects.filter(s => s.semester_id === semesterId);
}

export function getSubjectsByTeacher(teacherId, year) {
  const subjects = getSubjectsByYear(year);
  return subjects.filter(s => s.teacher_id === teacherId);
}

export function getSubjectsByClass(classId, year) {
  const subjects = getSubjectsByYear(year);
  return subjects.filter(s => s.class_id === classId);
}

export function getSubjectsByRoomType(roomType, year) {
  const subjects = getSubjectsByYear(year);
  return subjects.filter(s => 
    s.subject_constraints?.requires_room_type === roomType
  );
}

export function calculateTeacherWorkload(teacherId, semesterId) {
  const subjects = getSubjectsBySemester(semesterId);
  return subjects
    .filter(s => s.teacher_id === teacherId)
    .reduce((total, s) => total + s.periods_per_week, 0);
}

export function validateSubjectRoomConstraints(subject, room) {
  const requiredType = subject.subject_constraints?.requires_room_type;
  if (!requiredType) return { valid: true };
  
  if (room.room_type !== requiredType) {
    return {
      valid: false,
      error: `วิชา "${subject.subject_name}" ต้องการห้องประเภท ${requiredType} แต่ได้ห้องประเภท ${room.room_type}`
    };
  }
  
  return { valid: true };
}

export function getSubjectTotalPeriods(year) {
  const subjects = getSubjectsByYear(year);
  return subjects.reduce((total, s) => total + s.periods_per_week, 0);
}

export function getSubjectsByGradeLevel(gradeLevel, year) {
  const subjects = getSubjectsByYear(year);
  const classes = getClassesByGradeLevel(gradeLevel, year); // จาก classes.mock.js
  const classIds = classes.map(c => c.id);
  return subjects.filter(s => classIds.includes(s.class_id));
}

// Analysis Functions
export function analyzeTeacherWorkloadByYear(year) {
  const subjects = getSubjectsByYear(year);
  const workload = {};
  
  subjects.forEach(subject => {
    const teacherId = subject.teacher_id;
    if (!workload[teacherId]) {
      workload[teacherId] = {
        total_periods: 0,
        subjects_count: 0,
        classes_taught: new Set(),
        subject_names: []
      };
    }
    
    workload[teacherId].total_periods += subject.periods_per_week;
    workload[teacherId].subjects_count++;
    workload[teacherId].classes_taught.add(subject.class_id);
    workload[teacherId].subject_names.push(subject.subject_name);
  });
  
  // Convert Set to Array
  Object.keys(workload).forEach(teacherId => {
    workload[teacherId].classes_taught = Array.from(workload[teacherId].classes_taught);
  });
  
  return workload;
}

export function getSubjectGroupStats(year) {
  const subjects = getSubjectsByYear(year);
  const stats = {};
  
  subjects.forEach(subject => {
    const group = subject.subject_name;
    if (!stats[group]) {
      stats[group] = {
        total_periods: 0,
        classes_count: 0,
        teachers: new Set()
      };
    }
    
    stats[group].total_periods += subject.periods_per_week;
    stats[group].classes_count++;
    stats[group].teachers.add(subject.teacher_id);
  });
  
  // Convert Set to Array and sort by total_periods
  const result = Object.keys(stats).map(group => ({
    subject_group: group,
    total_periods: stats[group].total_periods,
    classes_count: stats[group].classes_count,
    teachers_count: stats[group].teachers.size
  })).sort((a, b) => b.total_periods - a.total_periods);
  
  return result;
}

// Export normalization for subjects schedule
export function normalizeSubjectRowForExport(subjectData, context) {
  return {
    'วิชา': subjectData.subject_name,
    'รหัสวิชา': subjectData.subject_code,
    'คาบ/สัปดาห์': subjectData.periods_per_week,
    'ห้องเรียน': context.class_name,
    'ครู': context.teacher_name,
    'ห้องที่ใช้': context.room_name || '-',
    'ประเภทห้อง': subjectData.subject_constraints?.requires_room_type || 'ไม่ระบุ',
    'ปีการศึกษา': context.year,
    'ภาคเรียน': context.semester
  };
}

export function getUniqueSubjectNames(year) {
  const subjects = getSubjectsByYear(year);
  return [...new Set(subjects.map(s => s.subject_name))].sort();
}

export function getSubjectEvolution(subjectName, years = [2566, 2567, 2568]) {
  const evolution = {};
  
  years.forEach(year => {
    const subjects = getSubjectsByYear(year);
    const subjectInstances = subjects.filter(s => s.subject_name === subjectName);
    
    evolution[year] = {
      exists: subjectInstances.length > 0,
      total_periods: subjectInstances.reduce((sum, s) => sum + s.periods_per_week, 0),
      classes_count: subjectInstances.length,
      room_requirements: [...new Set(subjectInstances.map(s => s.subject_constraints?.requires_room_type).filter(Boolean))]
    };
  });
  
  return evolution;
}

export default subjectsData;

// ================================
// Auto generate subjects for 2569, 2570 (both semesters)
// ================================

function buildYearSubjects(year, semIds, classKey) {
  const classes = classesData[classKey] || [];
  const teachers = teachersData[`teachers_${year}`] || [];
  // Build rotating pools per subject group
  const pool = new Map();
  const idx = new Map();
  teachers.forEach(t => {
    const g = t.subject_group;
    const arr = pool.get(g) || [];
    arr.push(t.id);
    pool.set(g, arr);
  });
  function nextTeacherId(group, fallbackId) {
    const arr = pool.get(group);
    if (!arr || arr.length === 0) return fallbackId;
    const i = idx.get(group) || 0;
    const id = arr[i % arr.length];
    idx.set(group, (i + 1) % arr.length);
    return id;
  }
  const subjectPlan = [
    { name: 'ภาษาไทย', code: 'ท', perWeek: 5, group: 'ภาษาไทย', room: 'CLASS' },
    { name: 'คณิตศาสตร์', code: 'ค', perWeek: 4, group: 'คณิตศาสตร์', room: 'CLASS' },
    { name: 'วิทยาศาสตร์', code: 'ว', perWeek: 4, group: 'วิทยาศาสตร์', room: 'LAB_SCI' },
    { name: 'ภาษาอังกฤษ', code: 'อ', perWeek: 3, group: 'ภาษาอังกฤษ', room: 'CLASS' },
    { name: 'สังคมศึกษา', code: 'ส', perWeek: 3, group: 'สังคมศึกษา', room: 'CLASS' },
    { name: 'ศิลปะ', code: 'ศ', perWeek: 2, group: 'ศิลปะ', room: 'TECH' },
    { name: 'พลศึกษา', code: 'พ', perWeek: 2, group: 'พลศึกษา', room: null },
    { name: 'วิทยาการคำนวณ', code: 'วค', perWeek: 2, group: 'วิทยาการคำนวณ', room: 'LAB_COMP' },
    { name: 'การงานอาชีพ', code: 'กง', perWeek: 2, group: 'การงานอาชีพ', room: 'TECH' },
    { name: 'ดนตรี', code: 'ด', perWeek: 1, group: 'ศิลปะ', room: 'TECH' },
  ];
  let idCounter = 1000 + (year % 100); // unique-ish per year
  const list = [];
  classes.forEach(cls => {
    if (!semIds.includes(cls.semester_id)) return;
    subjectPlan.forEach(sp => {
      idCounter += 1;
      const teacher_id = nextTeacherId(sp.group, 1);
      list.push({
        id: idCounter,
        semester_id: cls.semester_id,
        teacher_id,
        class_id: cls.id,
        subject_name: sp.name,
        subject_code: `${sp.code}${cls.grade_level === 'ม.1' ? '11' : '21'}${('0' + (cls.section)).slice(-2)}`,
        periods_per_week: sp.perWeek,
        subject_constraints: sp.room ? { requires_room_type: sp.room } : {},
        default_room_id: null,
        room_preferences: {},
        created_at: new Date().toISOString()
      });
    });
  });
  return list;
}

subjectsData.subjects_2569 = buildYearSubjects(2569, [11,12], 'classes_2569');
subjectsData.subjects_2570 = buildYearSubjects(2570, [13,14], 'classes_2570');
