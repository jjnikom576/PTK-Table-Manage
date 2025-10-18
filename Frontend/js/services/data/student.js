import {
  ensurePeriodsList,
  extractTeachingPeriods,
  getDisplayPeriods,
  getLunchSlot
} from '../../utils.js';
import { loadYearData } from './loaders.js';
import {
  getCurrentContextRef,
  setLastLoadedPeriods
} from './state.js';

export async function getStudentSchedule(classId) {
  try {
    console.log('[DataService] Getting student schedule for class:', classId);
    const context = getCurrentContextRef();
    console.log('[DataService] Current context:', context);

    const targetYear = context.year || 2568;
    console.log('[DataService] Using target year:', targetYear);

    const yearData = await loadYearData(targetYear);
    if (!yearData.ok) {
      throw new Error(yearData.error || 'Failed to load year data');
    }

    const {
      schedules,
      subjects,
      teachers,
      classes,
      rooms,
      periods: rawPeriods
    } = yearData.data;

    const normalizedPeriods = ensurePeriodsList(rawPeriods || []);
    setLastLoadedPeriods(normalizedPeriods, {
      year: targetYear,
      semesterId: context.semesterId || context.semester?.id || null
    });

    console.log('[DataService] Available classes:', classes.map((c) => c.class_name));
    console.log('[DataService] Looking for class:', classId, 'type:', typeof classId);

    let classInfo = null;

    if (!Number.isNaN(Number(classId))) {
      classInfo = classes.find((item) => item.id === Number.parseInt(classId, 10));
      console.log('[DataService] Found by numeric ID:', classInfo);
    }

    if (!classInfo && typeof classId === 'string') {
      const className = classId.replace('-', '/').replace('m', 'ม.');
      classInfo = classes.find((item) => item.class_name === className);
      console.log('[DataService] Found by name conversion:', classInfo);
    }

    if (!classInfo) {
      classInfo = classes.find(
        (item) => item.class_name === classId || item.id === classId
      );
      console.log('[DataService] Found by direct match:', classInfo);
    }

    if (!classInfo) {
      return { ok: false, error: `Class ${classId} not found` };
    }

    const targetClassId = Number(classInfo.id);

    const normaliseIdList = (value) => {
      if (Array.isArray(value)) {
        return value
          .map((item) => Number(item))
          .filter(Number.isFinite);
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        let source = value.trim();
        try {
          const parsed = JSON.parse(source);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) => Number(item))
              .filter(Number.isFinite);
          }
          source = String(parsed);
        } catch {
          // ignore, fallback below
        }
        return source
          .split(',')
          .map((item) => Number(item.trim()))
          .filter(Number.isFinite);
      }

      if (value !== null && value !== undefined) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? [numeric] : [];
      }

      return [];
    };

    const classSchedules = schedules.filter((schedule) => {
      const scheduleClassId = Number(schedule.class_id ?? schedule.classId);
      if (Number.isFinite(scheduleClassId)) {
        return Number.isFinite(targetClassId) && scheduleClassId === targetClassId;
      }

      const candidateIds = new Set([
        ...normaliseIdList(schedule.class_ids),
        ...normaliseIdList(schedule.classIds)
      ]);
      if (Number.isFinite(targetClassId) && candidateIds.has(targetClassId)) {
        return true;
      }

      if (schedule.class_name && classInfo.class_name && schedule.class_name === classInfo.class_name) {
        return true;
      }

      return false;
    });

    if (!classSchedules.length) {
      console.warn('[DataService] No schedules matched class id', classInfo.id, 'from total', schedules.length);
    }

    const {
      matrix: scheduleMatrix,
      teachingPeriods: teachingPeriodEntries
    } = buildScheduleMatrix(classSchedules, { subjects, teachers, rooms }, normalizedPeriods);

    return {
      ok: true,
      data: {
        classInfo,
        schedules: classSchedules,
        matrix: scheduleMatrix,
        subjects,
        teachers,
        rooms,
        periods: normalizedPeriods,
        teachingPeriods: teachingPeriodEntries
      }
    };
  } catch (error) {
    console.error('[DataService] Failed to get student schedule:', error);
    return { ok: false, error: error.message };
  }
}

function buildScheduleMatrix(schedules, context, periods = []) {
  const teachingPeriodEntries = extractTeachingPeriods(periods);
  const fallbackTeaching = extractTeachingPeriods();
  const periodNumbers = (teachingPeriodEntries.length ? teachingPeriodEntries : fallbackTeaching)
    .map((period) => period.period_no);

  const matrix = {};
  const days = [1, 2, 3, 4, 5];

  days.forEach((day) => {
    matrix[day] = {};
    periodNumbers.forEach((periodNo) => {
      matrix[day][periodNo] = null;
    });
  });

  schedules.forEach((schedule) => {
    const day = Number(schedule.day_of_week ?? schedule.day);
    const periodNo = Number(schedule.period_no ?? schedule.period);
    if (!day || !periodNo) {
      return;
    }

    if (!matrix[day]) {
      matrix[day] = {};
      periodNumbers.forEach((p) => {
        matrix[day][p] = null;
      });
    } else if (!Object.prototype.hasOwnProperty.call(matrix[day], periodNo)) {
      matrix[day][periodNo] = null;
    }

    const subject = context.subjects.find((item) => item.id === schedule.subject_id);
    const teacher = context.teachers.find((item) => item.id === subject?.teacher_id);
    const room = context.rooms.find((item) => item.id === schedule.room_id);

    const teacherName =
      teacher?.full_name ||
      teacher?.name ||
      [teacher?.title, teacher?.f_name, teacher?.l_name].filter(Boolean).join(' ') ||
      schedule.teacher_name ||
      '';

    const deriveTeacherDisplayName = () => {
      const baseTitlePatterns = [
        /^นาย\s+/i,
        /^นางสาว\s+/i,
        /^นาง\s+/i,
        /^ครู\s+/i,
        /^Teacher\s+/i,
        /^Mr\.\s+/i,
        /^Mrs\.\s+/i,
        /^Ms\.\s+/i
      ];
      if (teacher?.f_name) {
        return `ครู${teacher.f_name}`;
      }
      if (teacherName) {
        let cleaned = teacherName.trim();
        baseTitlePatterns.forEach((pattern) => {
          cleaned = cleaned.replace(pattern, '');
        });
        const firstToken = cleaned.split(/\s+/)[0] || cleaned;
        return `ครู${firstToken}`;
      }
      return 'ครูไม่ระบุ';
    };

    const teacherDisplayName = deriveTeacherDisplayName();
    const roomName = room?.room_name || room?.name || schedule.room_name || '';

    matrix[day][periodNo] = {
      schedule,
      subject: subject || { subject_name: schedule.subject_name || 'ไม่ระบุวิชา' },
      teacher: teacher
        ? { ...teacher, name: teacherDisplayName }
        : { name: teacherDisplayName },
      room: room
        ? { ...room, name: roomName || 'ไม่ระบุห้อง' }
        : { name: roomName || 'ไม่ระบุห้อง' }
    };
  });

  return {
    matrix,
    teachingPeriods: teachingPeriodEntries.length ? teachingPeriodEntries : fallbackTeaching,
    periodNumbers
  };
}
