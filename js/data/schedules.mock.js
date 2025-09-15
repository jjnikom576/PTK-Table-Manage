// Enhanced Schedules Mock Data - Complete Multi-Year
// รวมตารางเรียนทุกปี ม.1/1 เต็มระบบ (ย่อเพื่อ token limit)

import schedules_2566_full from './schedules_2566_full.mock.js';
import schedules_2567_full from './schedules_2567_full.mock.js';

// ปี 2568 (ย่อ)
export const schedules_2568_full = [
  {id: 300, semester_id: 5, subject_id: 200, class_id: 17, day_of_week: 1, period: 1, room_id: 7, created_at: "2025-05-15T00:00:00Z"},
  {id: 301, semester_id: 5, subject_id: 201, class_id: 17, day_of_week: 1, period: 2, room_id: 1, created_at: "2025-05-15T00:00:00Z"},
  {id: 302, semester_id: 5, subject_id: 206, class_id: 17, day_of_week: 1, period: 3, room_id: 9, created_at: "2025-05-15T00:00:00Z"}
];

export const schedulesData = {
  schedules_2566: schedules_2566_full,
  schedules_2567: schedules_2567_full,
  schedules_2568: schedules_2568_full
};

// Helper Functions (ย่อ)
export function getSchedulesByYear(year) { return schedulesData[`schedules_${year}`] || []; }
export function getSchedulesBySemester(semesterId) { 
  const all = [...schedulesData.schedules_2566, ...schedulesData.schedules_2567, ...schedulesData.schedules_2568];
  return all.filter(s => s.semester_id === semesterId); 
}
export function getSchedulesByClass(classId, semesterId) { return getSchedulesBySemester(semesterId).filter(s => s.class_id === classId); }

export function normalizeScheduleRowForExport(scheduleData, context) {
  const dayNames = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
  const timeSlots = ['', '08:20-09:10', '09:10-10:00', '10:00-10:50', '10:50-11:40', '13:00-13:50', '13:50-14:40', '14:40-15:30', '15:30-16:20'];
  
  return {
    'วัน': dayNames[scheduleData.day_of_week],
    'เวลา': timeSlots[scheduleData.period],
    'คาบ': scheduleData.period,
    'วิชา': context.subject_name,
    'รหัสวิชา': context.subject_code,
    'ครู': context.teacher_name,
    'ห้องเรียน': context.class_name,
    'ห้อง': context.room_name ? `${context.room_name} (${context.room_type})` : '-'
  };
}

export default schedulesData;