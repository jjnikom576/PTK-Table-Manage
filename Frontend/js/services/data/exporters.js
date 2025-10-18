import {
  getThaiDayName,
  ensurePeriodsList,
  getDisplayPeriods,
  getLunchSlot,
  formatPeriodTimeRange
} from '../../utils.js';
import { loadSemesterData } from './loaders.js';
import { getLastLoadedPeriods } from './state.js';

export async function normalizeStudentScheduleForExport({
  schedules,
  subjects,
  teachers,
  rooms,
  classes,
  classId,
  semesterId
}) {
  try {
    if (!schedules || !subjects || !teachers || !rooms || !classes) {
      const semesterDataResult = await loadSemesterData(semesterId);
      if (!semesterDataResult.ok) {
        throw new Error(semesterDataResult.error || 'Failed to load semester data');
      }

      schedules = schedules || semesterDataResult.data.schedules;
      subjects = subjects || semesterDataResult.data.subjects;
      teachers = teachers || semesterDataResult.data.teachers;
      rooms = rooms || semesterDataResult.data.rooms;
      classes = classes || semesterDataResult.data.classes;
    }

    const classSchedules = (schedules || []).filter(
      (schedule) => schedule.class_id === classId
    );

    return classSchedules.map((schedule) => {
      const subject = subjects.find((item) => item.id === schedule.subject_id);
      const teacher = teachers.find((item) => item.id === subject?.teacher_id);
      const room = rooms.find((item) => item.id === schedule.room_id);
      const cls = classes.find((item) => item.id === schedule.class_id);

      return {
        วัน: getThaiDayName(schedule.day_of_week),
        เวลา: getTimeSlot(schedule.period),
        คาบ: schedule.period,
        วิชา: subject?.subject_name || '',
        รหัสวิชา: subject?.subject_code || '',
        ครู: teacher?.name || '',
        ห้องเรียน: cls?.class_name || '',
        ห้อง: room ? `${room.name} (${room.room_type})` : ''
      };
    });
  } catch (error) {
    console.error('[DataService] Failed to normalize student schedule:', error);
    throw error;
  }
}

export async function normalizeTeacherScheduleForExport({
  schedules,
  subjects,
  teachers,
  rooms,
  classes,
  teacherId,
  semesterId
}) {
  try {
    if (!schedules || !subjects || !teachers || !rooms || !classes) {
      const semesterDataResult = await loadSemesterData(semesterId);
      if (!semesterDataResult.ok) {
        throw new Error(semesterDataResult.error || 'Failed to load semester data');
      }

      schedules = schedules || semesterDataResult.data.schedules;
      subjects = subjects || semesterDataResult.data.subjects;
      teachers = teachers || semesterDataResult.data.teachers;
      rooms = rooms || semesterDataResult.data.rooms;
      classes = classes || semesterDataResult.data.classes;
    }

    const teacherSubjects = (subjects || []).filter(
      (subject) => subject.teacher_id === teacherId
    );
    const teacherSubjectIds = teacherSubjects.map((subject) => subject.id);

    const teacherSchedules = (schedules || []).filter((schedule) =>
      teacherSubjectIds.includes(schedule.subject_id)
    );

    return teacherSchedules.map((schedule) => {
      const subject = subjects.find((item) => item.id === schedule.subject_id);
      const room = rooms.find((item) => item.id === schedule.room_id);
      const cls = classes.find((item) => item.id === schedule.class_id);

      return {
        วัน: getThaiDayName(schedule.day_of_week),
        เวลา: getTimeSlot(schedule.period),
        คาบ: schedule.period,
        วิชา: subject?.subject_name || '',
        รหัสวิชา: subject?.subject_code || '',
        ห้องเรียน: cls?.class_name || '',
        ห้อง: room ? `${room.name} (${room.room_type})` : ''
      };
    });
  } catch (error) {
    console.error('[DataService] Failed to normalize teacher schedule:', error);
    throw error;
  }
}

export async function normalizeSubstitutionForExport({
  substitutions,
  schedules,
  subjects,
  teachers,
  rooms,
  classes,
  date,
  semesterId
}) {
  try {
    let semesterDataResult;
    if (!substitutions || !schedules || !subjects || !teachers || !rooms || !classes) {
      semesterDataResult = await loadSemesterData(semesterId);
      if (!semesterDataResult.ok) {
        throw new Error(semesterDataResult.error || 'Failed to load semester data');
      }

      substitutions = substitutions || semesterDataResult.data.substitutions;
      schedules = schedules || semesterDataResult.data.schedules;
      subjects = subjects || semesterDataResult.data.subjects;
      teachers = teachers || semesterDataResult.data.teachers;
      rooms = rooms || semesterDataResult.data.rooms;
      classes = classes || semesterDataResult.data.classes;
    }

    const dateSubstitutions = (substitutions || []).filter(
      (substitution) =>
        new Date(substitution.absent_date).toDateString() === new Date(date).toDateString()
    );

    const substitutionSchedules =
      semesterDataResult?.data?.substitution_schedules || [];

    const exportData = [];

    for (const substitution of dateSubstitutions) {
      const absentTeacher = teachers.find(
        (teacher) => teacher.id === substitution.absent_teacher_id
      );
      const relatedSubSchedules = substitutionSchedules.filter(
        (entry) => entry.substitution_id === substitution.id
      );

      for (const subSchedule of relatedSubSchedules) {
        const originalSchedule = schedules.find(
          (item) => item.id === subSchedule.original_schedule_id
        );
        const subject = subjects.find(
          (item) => item.id === originalSchedule?.subject_id
        );
        const room = rooms.find((item) => item.id === originalSchedule?.room_id);
        const cls = classes.find((item) => item.id === originalSchedule?.class_id);
        const substituteTeacher = teachers.find(
          (teacher) => teacher.id === subSchedule.substitute_teacher_id
        );

        exportData.push({
          วันที่: new Date(substitution.absent_date).toLocaleDateString('th-TH'),
          ครูที่ขาด: absentTeacher?.name || '',
          เหตุผล: substitution.reason || '',
          คาบ: originalSchedule?.period || '',
          เวลา: originalSchedule ? getTimeSlot(originalSchedule.period) : '',
          วิชา: subject?.subject_name || '',
          ห้องเรียน: cls?.class_name || '',
          ห้อง: room ? `${room.name} (${room.room_type})` : '',
          ครูสอนแทน: substituteTeacher?.name || ''
        });
      }
    }

    return exportData;
  } catch (error) {
    console.error('[DataService] Failed to normalize substitution data:', error);
    throw error;
  }
}

function getTimeSlot(period) {
  const normalized = ensurePeriodsList(
    getLastLoadedPeriods().length ? getLastLoadedPeriods() : []
  );
  const matched = normalized.find((item) => item.period_no === period);
  if (matched) {
    const range = formatPeriodTimeRange(matched);
    if (range) {
      return range;
    }
  }

  const displayPeriods = getDisplayPeriods();
  const lunchSlot = getLunchSlot();
  const periodMap = new Map(displayPeriods.map((item) => [item.actual, item.label]));

  if (period === lunchSlot.period) {
    return lunchSlot.time;
  }

  return periodMap.get(period) || `คาบ ${period}`;
}
