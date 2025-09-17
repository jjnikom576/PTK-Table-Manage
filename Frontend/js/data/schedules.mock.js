// Enhanced Schedules Mock Data - Complete Multi-Year
// รวมตารางเรียนทุกปี ม.1/1 เต็มระบบ (ย่อเพื่อ token limit)

import schedules_2566_full from './schedules_2566_full.mock.js';
import schedules_2567_full from './schedules_2567_full.mock.js';
import { classesData } from './classes.mock.js';
import { subjectsData } from './subjects.mock.js';
import { roomsData } from './rooms.mock.js';

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
// ================================
// Auto-generate dense schedules for 2569, 2570 (both semesters)
// ================================

function pickRoomIdForSubject(subject, rooms) {
  const req = subject.subject_constraints?.requires_room_type || 'CLASS';
  const candidates = rooms.filter(r => r.room_type === req || req === 'CLASS');
  if (candidates.length === 0) return rooms[0]?.id || 1;
  return candidates[(subject.id + subject.class_id) % candidates.length].id;
}

function buildYearSchedules(year, semIds, classKey, roomsKey) {
  const classes = classesData[classKey] || [];
  const subjects = subjectsData[`subjects_${year}`] || [];
  const rooms = roomsData[roomsKey] || [];
  const timeSlots = Array.from({ length: 5*8 }, (_, i) => ({ day: Math.floor(i/8)+1, period: (i%8)+1 }));
  let idCounter = 2000 + (year % 100);
  const schedules = [];

  // teacher availability map: teacherId -> set of "day-period" keys
  const busy = new Map();
  function isBusy(teacherId, day, period) {
    const k = `${day}-${period}`;
    const set = busy.get(teacherId);
    return set ? set.has(k) : false;
  }
  function markBusy(teacherId, day, period) {
    const k = `${day}-${period}`;
    const set = busy.get(teacherId) || new Set();
    set.add(k);
    busy.set(teacherId, set);
  }

  classes.forEach((cls, idx) => {
    if (!semIds.includes(cls.semester_id)) return;
    const classSubjects = subjects.filter(s => s.class_id === cls.id);
    // target 35/40 slots filled
    const targetFill = 35;
    // build required instances by periods_per_week
    const entries = [];
    classSubjects.forEach(sub => {
      for (let i=0; i<sub.periods_per_week; i++) entries.push(sub);
    });
    // simple spread across week with offset by class index
    let slotIndex = (idx * 3) % timeSlots.length;
    entries.forEach(sub => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < timeSlots.length) {
        const ts = timeSlots[slotIndex];
        slotIndex = (slotIndex + 1) % timeSlots.length;
        attempts++;
        // Skip period 8 by policy (always empty), and reduce crowding at 4
        if (ts.period === 8) continue;
        if (isBusy(sub.teacher_id, ts.day, ts.period)) continue;
        idCounter += 1;
        schedules.push({ id: idCounter, semester_id: cls.semester_id, subject_id: sub.id, class_id: cls.id, day_of_week: ts.day, period: ts.period, room_id: pickRoomIdForSubject(sub, rooms), created_at: new Date().toISOString() });
        markBusy(sub.teacher_id, ts.day, ts.period);
        placed = true;
      }
    });
    // Ensure upper cap ~35 using slice
    const classSchedules = schedules.filter(s => s.class_id === cls.id && s.semester_id === cls.semester_id);
    if (classSchedules.length > targetFill) {
      // trim overflow from the tail for this class only
      let overflow = classSchedules.length - targetFill;
      for (let i = schedules.length - 1; i >= 0 && overflow > 0; i--) {
        const sc = schedules[i];
        if (sc.class_id === cls.id && sc.semester_id === cls.semester_id) {
          schedules.splice(i, 1);
          overflow--;
        }
      }
    }
  });
  return schedules;
}

const schedules_2569 = buildYearSchedules(2569, [11,12], 'classes_2569', 'rooms_2569');
const schedules_2570 = buildYearSchedules(2570, [13,14], 'classes_2570', 'rooms_2570');

schedulesData.schedules_2569 = schedules_2569;
schedulesData.schedules_2570 = schedules_2570;
