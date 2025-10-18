import {
  getSubstitutions,
  getSubstitutionSchedules as fetchSubstitutionSchedules,
  getTeachers,
  getSchedules,
  getSubjects,
  getClasses,
  getRooms
} from '../../services/dataService.js';
import {
  substitutionPageState,
  setLoadedData,
  showSubstitutionPageLoading
} from './state.js';

export async function loadSubstitutionDataForContext() {
  try {
    showSubstitutionPageLoading(true);

    const [
      substitutions,
      substitutionSchedules,
      teachers,
      schedules,
      subjects,
      classes,
      rooms
    ] = await Promise.all([
      getSubstitutions(),
      getSubstitutionsSchedulesSafe(),
      getTeachers(),
      getSchedules(),
      getSubjects(),
      getClasses(),
      getRooms()
    ]);

    setLoadedData({
      substitutions: substitutions.data || [],
      substitutionSchedules: substitutionSchedules.data || [],
      teachers: teachers.data || [],
      schedules: schedules.data || [],
      subjects: subjects.data || [],
      classes: classes.data || [],
      rooms: rooms.data || []
    });

    console.log('[Substitution] Data loaded:', {
      substitutions: substitutionPageState.loadedData.substitutions.length,
      substitutionSchedules:
        substitutionPageState.loadedData.substitutionSchedules.length
    });
  } finally {
    showSubstitutionPageLoading(false);
  }
}

export function calculateSubstituteStats() {
  const data = substitutionPageState.loadedData || {};
  const substitutions = data.substitutions || [];
  const substitutionSchedules = data.substitutionSchedules || [];

  const totalSubstitutions = substitutions.length;
  const totalPeriods = substitutionSchedules.reduce(
    (sum, schedule) => sum + (schedule.periods_count || 0),
    0
  );

  const reasonStats = {};
  substitutions.forEach((substitution) => {
    const reason = substitution.reason || 'ไม่ระบุ';
    if (!reasonStats[reason]) {
      reasonStats[reason] = { count: 0, percentage: 0 };
    }
    reasonStats[reason].count += 1;
  });

  Object.keys(reasonStats).forEach((reason) => {
    reasonStats[reason].percentage =
      totalSubstitutions > 0
        ? ((reasonStats[reason].count / totalSubstitutions) * 100).toFixed(1)
        : 0;
  });

  return {
    totalSubstitutions,
    totalPeriods,
    reasonStats,
    averagePeriodsPerSubstitution:
      totalSubstitutions > 0
        ? (totalPeriods / totalSubstitutions).toFixed(1)
        : 0
  };
}

export function generateSubstituteRanking() {
  const data = substitutionPageState.loadedData || {};
  const substitutionSchedules = data.substitutionSchedules || [];

  const teacherPeriods = {};

  substitutionSchedules.forEach((schedule) => {
    const teacherId = schedule.substitute_teacher_id;
    const periods = schedule.periods_count || 0;

    if (!teacherPeriods[teacherId]) {
      teacherPeriods[teacherId] = { periods: 0, assignments: 0 };
    }

    teacherPeriods[teacherId].periods += periods;
    teacherPeriods[teacherId].assignments += 1;
  });

  return Object.entries(teacherPeriods)
    .map(([teacherId, stats]) => {
      const teacher = (data.teachers || []).find((t) => t.id == teacherId);
      return {
        teacher,
        ...stats,
        teacherId: Number.parseInt(teacherId, 10)
      };
    })
    .filter((item) => item.teacher)
    .sort((a, b) => b.periods - a.periods);
}

export async function findOptimalSubstitutes(
  affectedSchedules,
  absentTeacherIds,
  data,
  selectedDate,
  dayOfWeek
) {
  const recommendations = [];
  const allTeachers = data.teachers.filter(
    (teacher) => !absentTeacherIds.includes(teacher.id)
  );

  for (const schedule of affectedSchedules) {
    const subject = data.subjects.find((item) => item.id === schedule.subject_id);
    const classData = data.classes.find((item) => item.id === schedule.class_id);
    const room = data.rooms.find((item) => item.id === schedule.room_id);
    const absentTeacher = data.teachers.find(
      (teacher) => teacher.id === subject.teacher_id
    );

    const availableTeachers = allTeachers.filter((teacher) => {
      const hasConflict = data.schedules.some((sch) => {
        const teacherSubjects = data.subjects.filter(
          (item) => item.teacher_id === teacher.id
        );
        return (
          teacherSubjects.some((item) => item.id === sch.subject_id) &&
          sch.day_of_week === dayOfWeek &&
          sch.period_no === schedule.period_no
        );
      });
      return !hasConflict;
    });

    const scoredTeachers = availableTeachers.map((teacher) => {
      const classesOnDay = data.schedules.filter((sch) => {
        const teacherSubjects = data.subjects.filter(
          (item) => item.teacher_id === teacher.id
        );
        return (
          teacherSubjects.some((item) => item.id === sch.subject_id) &&
          sch.day_of_week === dayOfWeek
        );
      }).length;

      const previousSubstitutions = 0;
      const score = classesOnDay * 10 + previousSubstitutions * 5;

      return {
        teacher,
        score,
        classesOnDay,
        previousSubstitutions
      };
    });

    scoredTeachers.sort((a, b) => a.score - b.score);

    recommendations.push({
      schedule,
      subject,
      classData,
      room,
      absentTeacher,
      candidates: scoredTeachers.slice(0, 3)
    });
  }

  return recommendations;
}

async function getSubstitutionsSchedulesSafe() {
  try {
    return await fetchSubstitutionSchedules();
  } catch (error) {
    console.error('[Substitution] Failed to load substitution schedules:', error);
    return { data: [] };
  }
}
