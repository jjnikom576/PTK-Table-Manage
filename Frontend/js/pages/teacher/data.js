import * as dataService from '../../services/dataService.js';
import * as globalContext from '../../context/globalContext.js';
import {
  ensurePeriodsList,
  extractTeachingPeriods,
  buildPeriodDisplaySequence
} from '../../utils.js';
import { pageState, setLoading } from './state.js';
import { getTeacherName } from './helpers.js';

export async function loadTeachersData(context) {
  try {
    setLoading(true);

    const resolvedContext = context || globalContext.getContext() || {};
    const targetYear = resolvedContext.currentYear || resolvedContext.year;
    console.log(`[TeacherSchedule] Loading data for year: ${targetYear}`);

    if (!targetYear) {
      throw new Error('ไม่พบปีการศึกษา');
    }

    const semesterId =
      resolvedContext.currentSemester?.id ||
      resolvedContext.semesterId ||
      globalContext.getContext()?.currentSemester?.id ||
      null;

    if (!semesterId) {
      throw new Error('ไม่พบภาคเรียน');
    }

    const requestOptions = { forceRefresh: true };
    const [
      teachersResult,
      schedulesResult,
      subjectsResult,
      classesResult,
      roomsResult,
      periodsResult
    ] = await Promise.all([
      dataService.getTeachers(targetYear, semesterId, requestOptions),
      dataService.getSchedules(targetYear, semesterId, requestOptions),
      dataService.getSubjects(targetYear, semesterId, requestOptions),
      dataService.getClasses(targetYear, semesterId, requestOptions),
      dataService.getRooms(targetYear, semesterId, requestOptions),
      dataService.getPeriods(targetYear, semesterId, requestOptions)
    ]);

    if (!teachersResult.ok) {
      console.error('[TeacherSchedule] Teachers load failed:', teachersResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลครูได้: ' + teachersResult.error);
    }
    if (!schedulesResult.ok) {
      console.error('[TeacherSchedule] Schedules load failed:', schedulesResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลตารางสอนได้: ' + schedulesResult.error);
    }
    if (!subjectsResult.ok) {
      console.error('[TeacherSchedule] Subjects load failed:', subjectsResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลวิชาได้: ' + subjectsResult.error);
    }
    if (!periodsResult.ok) {
      console.error('[TeacherSchedule] Periods load failed:', periodsResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลคาบเรียนได้: ' + periodsResult.error);
    }

    pageState.teachers = teachersResult.data;

    console.log(`[TeacherSchedule] ✅ Data loaded for year ${targetYear}:`, {
      teachers: teachersResult.data.length,
      schedules: schedulesResult.data.length,
      subjects: subjectsResult.data.length,
      classes: classesResult.data?.length || 0,
      rooms: roomsResult.data?.length || 0,
      periods: periodsResult.data?.length || 0
    });

    await calculateWorkloadSummary({
      teachers: teachersResult.data,
      schedules: schedulesResult.data,
      subjects: subjectsResult.data,
      classes: classesResult.data || [],
      rooms: roomsResult.data || [],
      periods: periodsResult.data || [],
      semesterId
    });
  } finally {
    setLoading(false);
  }
}

async function calculateWorkloadSummary(data) {
  const { teachers, schedules, subjects, classes = [] } = data;

  console.log('[calculateWorkloadSummary] Input data:', {
    teachers: teachers.length,
    schedules: schedules.length,
    subjects: subjects.length,
    classes: classes.length
  });

  if (teachers.length > 0) {
    const firstTeacher = teachers[0];
    console.log('[calculateWorkloadSummary] First teacher:', {
      id: firstTeacher.id,
      name: getTeacherName(firstTeacher),
      subject_group: firstTeacher.subject_group
    });

    const teacherSubjects = subjects.filter((subject) => subject.teacher_id === firstTeacher.id);
    console.log('[calculateWorkloadSummary] First teacher subjects:', teacherSubjects.length);

    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
    const teacherSchedules = schedules.filter((schedule) => {
      const subject = subjectById.get(schedule.subject_id);
      return subject && subject.teacher_id === firstTeacher.id;
    });
    console.log('[calculateWorkloadSummary] First teacher schedules:', teacherSchedules.length);

    const periodNumbers = teacherSchedules.map((schedule) => schedule.period_no || schedule.period);
    console.log(
      '[calculateWorkloadSummary] First teacher period_no:',
      periodNumbers.sort((a, b) => a - b)
    );

    const periodCounts = {};
    periodNumbers.forEach((period) => {
      periodCounts[period] = (periodCounts[period] || 0) + 1;
    });
    console.log('[calculateWorkloadSummary] First teacher period distribution:', periodCounts);
  }

  const subjectById = new Map((subjects || []).map((subject) => [subject.id, subject]));
  const subjectGroups = {};
  const teacherWorkloads = [];

  (teachers || []).forEach((teacher) => {
    const teacherSubjects = (subjects || []).filter((subject) => subject.teacher_id === teacher.id);
    const teacherSchedules = (schedules || []).filter((schedule) => {
      const subject = subjectById.get(schedule.subject_id);
      return subject && subject.teacher_id === teacher.id;
    });
    const totalPeriods = teacherSchedules.length;

    if (!subjectGroups[teacher.subject_group]) {
      subjectGroups[teacher.subject_group] = {
        name: teacher.subject_group,
        teachers: 0,
        totalPeriods: 0
      };
    }
    subjectGroups[teacher.subject_group].teachers += 1;
    subjectGroups[teacher.subject_group].totalPeriods += totalPeriods;

    teacherWorkloads.push({
      teacher,
      subjects: teacherSubjects,
      schedules: teacherSchedules,
      totalPeriods,
      subjectsCount: teacherSubjects.length
    });
  });

  try {
    const totalSchedulesAll = (schedules || []).length;
    const totalSubjectsAll = (subjects || []).length;
    const totalPeriodsSum = teacherWorkloads.reduce((sum, item) => sum + item.totalPeriods, 0);
    console.log('[TeacherSchedule] Workload debug:', { totalSchedulesAll, totalSubjectsAll, totalPeriodsSum });

    if (totalPeriodsSum === 0 && totalSchedulesAll > 0 && classes.length > 0) {
      console.warn('[TeacherSchedule] Detected zero workload with schedules present. Applying fallback...');
      const classIdsOfYear = new Set(classes.map((cls) => cls.id));
      const filteredSchedules = schedules.filter((schedule) => classIdsOfYear.has(schedule.class_id));
      const subjectByIdFallback = new Map((subjects || []).map((subject) => [subject.id, subject]));
      teacherWorkloads.length = 0;
      const subjectGroupsFallback = {};

      teachers.forEach((teacher) => {
        const teacherSubjects = (subjects || []).filter(
          (subject) => subject.teacher_id === teacher.id && classIdsOfYear.has(subject.class_id)
        );
        const teacherSchedules = filteredSchedules.filter((schedule) => {
          const subject = subjectByIdFallback.get(schedule.subject_id);
          return subject && subject.teacher_id === teacher.id && classIdsOfYear.has(schedule.class_id);
        });
        const totalPeriods = teacherSchedules.length;
        if (!subjectGroupsFallback[teacher.subject_group]) {
          subjectGroupsFallback[teacher.subject_group] = {
            name: teacher.subject_group,
            teachers: 0,
            totalPeriods: 0
          };
        }
        subjectGroupsFallback[teacher.subject_group].teachers += 1;
        subjectGroupsFallback[teacher.subject_group].totalPeriods += totalPeriods;
        teacherWorkloads.push({
          teacher,
          subjects: teacherSubjects,
          schedules: teacherSchedules,
          totalPeriods,
          subjectsCount: teacherSubjects.length
        });
      });

      pageState.workloadSummary = {
        subjectGroups: Object.values(subjectGroupsFallback),
        teacherWorkloads: teacherWorkloads.sort((a, b) => b.totalPeriods - a.totalPeriods)
      };
      console.log('[TeacherSchedule] Fallback workload computed.');
      return;
    }
  } catch (error) {
    console.warn('[TeacherSchedule] Workload debug/fallback error:', error);
  }

  pageState.workloadSummary = {
    subjectGroups: Object.values(subjectGroups),
    teacherWorkloads: teacherWorkloads.sort((a, b) => b.totalPeriods - a.totalPeriods)
  };
}

export async function getTeacherScheduleData(teacherId, context) {
  console.log('\n' + '='.repeat(80));
  console.log(`📘 [getTeacherScheduleData] START - Teacher ID: ${teacherId}`);
  console.log('='.repeat(80));
  console.log('[TeacherSchedule] Getting schedule data with context:', context);

  const resolvedContext = context || {};
  const targetYear = resolvedContext.currentYear || resolvedContext.year;
  if (!targetYear) {
    throw new Error('ไม่พบปีการศึกษา');
  }

  console.log(`[TeacherSchedule] Loading data for year: ${targetYear}`);

  if (typeof dataService.clearYearCache === 'function') {
    dataService.clearYearCache(targetYear);
  }

  const semesterId =
    resolvedContext.currentSemester?.id ||
    resolvedContext.semesterId ||
    globalContext.getContext()?.currentSemester?.id ||
    null;

  if (!semesterId) {
    throw new Error('ไม่พบภาคเรียน');
  }

  const requestOptions = { forceRefresh: true };
  const [
    schedulesResult,
    subjectsResult,
    classesResult,
    roomsResult,
    periodsResult
  ] = await Promise.all([
    dataService.getSchedules(targetYear, semesterId, requestOptions),
    dataService.getSubjects(targetYear, semesterId, requestOptions),
    dataService.getClasses(targetYear, semesterId, requestOptions),
    dataService.getRooms(targetYear, semesterId, requestOptions),
    dataService.getPeriods(targetYear, semesterId, requestOptions)
  ]);

  if (!schedulesResult.ok) {
    console.error('[TeacherSchedule] Schedules load failed:', schedulesResult.error);
    throw new Error('ไม่สามารถโหลดข้อมูลตารางสอนได้: ' + schedulesResult.error);
  }
  if (!subjectsResult.ok) {
    console.error('[TeacherSchedule] Subjects load failed:', subjectsResult.error);
    throw new Error('ไม่สามารถโหลดข้อมูลวิชาได้: ' + subjectsResult.error);
  }
  if (!periodsResult.ok) {
    console.error('[TeacherSchedule] Periods load failed:', periodsResult.error);
    throw new Error('ไม่สามารถโหลดข้อมูลคาบเรียนได้: ' + periodsResult.error);
  }

  const schedules = schedulesResult.data || [];
  const subjects = subjectsResult.data || [];
  const classes = classesResult.data || [];
  const rooms = roomsResult.data || [];
  const periods = ensurePeriodsList(periodsResult.data || []);

  console.log('[TeacherSchedule] ✅ Data loaded for teacher schedule:', {
    schedules: schedules.length,
    subjects: subjects.length,
    classes: classes.length,
    rooms: rooms.length,
    periods: periods.length
  });

  const teacherSubjects = subjects.filter((subject) => subject.teacher_id === teacherId);
  const subjectIds = new Set(teacherSubjects.map((subject) => subject.id));

  const schedulesInYear = schedules.filter((schedule) => {
    const subject = subjects.find((item) => item.id === schedule.subject_id);
    return subject && subject.teacher_id === teacherId;
  });

  console.log(`[TeacherSchedule] ➜ Teacher ${teacherId} subject count:`, teacherSubjects.length);
  console.log(`[TeacherSchedule] ➜ Teacher ${teacherId} filtered schedules:`, schedulesInYear.length);

  const teacherSchedules = schedulesInYear.filter((schedule) => subjectIds.has(schedule.subject_id));

  const matrixData = buildTeacherScheduleMatrix(
    teacherSchedules,
    { subjects, classes, rooms },
    periods
  );

  const teachingSet = new Set(matrixData.teachingPeriodNumbers);
  const validPeriods = teacherSchedules.filter((schedule) =>
    teachingSet.has(Number(schedule.period_no || schedule.period))
  );

  return {
    subjects: teacherSubjects,
    schedules: teacherSchedules,
    matrix: matrixData.matrix,
    classes,
    rooms,
    periods: matrixData.periods,
    teachingPeriods: matrixData.teachingPeriods,
    teachingPeriodNumbers: matrixData.teachingPeriodNumbers,
    periodSequence: matrixData.periodSequence,
    totalPeriods: validPeriods.length
  };
}

export async function fetchTeacherScheduleDataDynamic(teacherId, resolvedContext) {
  const targetYear = resolvedContext.currentYear || resolvedContext.year;
  const semesterId =
    resolvedContext.currentSemester?.id ||
    resolvedContext.semesterId ||
    resolvedContext.semester?.id ||
    null;

  if (!targetYear || !semesterId) {
    throw new Error('ไม่พบปีการศึกษาหรือภาคเรียนสำหรับการค้นหาตาราง');
  }

  const requestOptions = { forceRefresh: true };
  const [
    schedulesRes,
    subjectsRes,
    classesRes,
    roomsRes,
    periodsRes
  ] = await Promise.all([
    dataService.getSchedules(targetYear, semesterId, requestOptions),
    dataService.getSubjects(targetYear, semesterId, requestOptions),
    dataService.getClasses(targetYear, semesterId, requestOptions),
    dataService.getRooms(targetYear, semesterId, requestOptions),
    dataService.getPeriods(targetYear, semesterId, requestOptions)
  ]);

  const responses = [
    { name: 'schedules', res: schedulesRes },
    { name: 'subjects', res: subjectsRes },
    { name: 'classes', res: classesRes },
    { name: 'rooms', res: roomsRes },
    { name: 'periods', res: periodsRes }
  ];

  const failed = responses.find((item) => !item.res?.ok);
  if (failed) {
    throw new Error(`ไม่สามารถโหลดข้อมูล ${failed.name} ได้: ${failed.res?.error || 'unknown error'}`);
  }

  const schedules = schedulesRes.data || [];
  const subjects = subjectsRes.data || [];
  const classes = classesRes.data || [];
  const rooms = roomsRes.data || [];
  const periods = periodsRes.data || [];

  const teacherSubjects = subjects.filter((subject) => subject.teacher_id === teacherId);
  const subjectIdSet = new Set(teacherSubjects.map((subject) => subject.id));
  const teacherSchedules = schedules.filter((schedule) => subjectIdSet.has(schedule.subject_id));

  const matrixData = buildTeacherScheduleMatrixDynamic(
    teacherSchedules,
    { subjects, classes, rooms },
    periods
  );

  const teachingSet = new Set(matrixData.teachingPeriodNumbers);
  const totalPeriods = teacherSchedules.filter((schedule) =>
    teachingSet.has(Number(schedule.period_no || schedule.period))
  ).length;

  return {
    subjects: teacherSubjects,
    schedules: teacherSchedules,
    matrix: matrixData.matrix,
    classes,
    rooms,
    totalPeriods,
    periods: matrixData.periods,
    teachingPeriods: matrixData.teachingPeriods,
    teachingPeriodNumbers: matrixData.teachingPeriodNumbers,
    periodSequence: matrixData.periodSequence
  };
}

export function buildTeacherScheduleMatrixLegacy(schedules, context, periods = []) {
  const matrix = {};

  for (let day = 1; day <= 5; day++) {
    matrix[day] = {};
    for (let period = 1; period <= 7; period++) {
      matrix[day][period] = [];
    }
  }

  schedules.forEach((schedule) => {
    const subject = context.subjects.find((item) => item.id === schedule.subject_id);
    const classInfo = context.classes.find((item) => item.id === schedule.class_id);
    const room = context.rooms.find((item) => item.id === schedule.room_id);

    const apiPeriod = schedule.period_no || schedule.period;
    if (!schedule.day_of_week || !apiPeriod) return;

    let displayPeriod = null;

    if (apiPeriod >= 1 && apiPeriod <= 4) {
      displayPeriod = apiPeriod;
    } else if (apiPeriod >= 6 && apiPeriod <= 8) {
      displayPeriod = apiPeriod - 1;
    }

    if (displayPeriod !== null && displayPeriod >= 1 && displayPeriod <= 7) {
      matrix[schedule.day_of_week][displayPeriod].push({
        schedule,
        subject: subject || { subject_name: 'ไม่ระบุวิชา', subject_code: '' },
        class: classInfo || { class_name: 'ไม่ระบุห้อง' },
        room: room || { name: 'ไม่ระบุห้อง' }
      });
    }
  });

  return matrix;
}

export function buildTeacherScheduleMatrixDynamic(schedules = [], context = {}, periods = []) {
  const normalizedPeriods = ensurePeriodsList(Array.isArray(periods) ? periods : []);
  const basePeriods = normalizedPeriods.length ? normalizedPeriods : ensurePeriodsList();
  const teachingPeriods = extractTeachingPeriods(basePeriods);
  const teachingPeriodNumbers = teachingPeriods.map((period) => period.period_no);
  const fallbackPeriodNumbers = teachingPeriodNumbers.length
    ? teachingPeriodNumbers
    : Array.from({ length: 8 }, (_, index) => index + 1);

  const matrix = {};
  const dayNumbers = [1, 2, 3, 4, 5];

  dayNumbers.forEach((day) => {
    matrix[day] = {};
    fallbackPeriodNumbers.forEach((periodNo) => {
      matrix[day][periodNo] = [];
    });
  });

  schedules.forEach((schedule) => {
    const day = Number(schedule?.day_of_week ?? schedule?.day);
    const periodNo = Number(schedule?.period_no ?? schedule?.period);
    if (!day || !periodNo) {
      return;
    }

    if (!matrix[day]) {
      matrix[day] = {};
      fallbackPeriodNumbers.forEach((p) => {
        matrix[day][p] = [];
      });
    }

    if (!Array.isArray(matrix[day][periodNo])) {
      matrix[day][periodNo] = [];
    }

    const subject = (context.subjects || []).find((item) => item.id === schedule.subject_id);
    const classInfo = (context.classes || []).find((item) => item.id === schedule.class_id);
    const room = (context.rooms || []).find((item) => item.id === schedule.room_id);

    matrix[day][periodNo].push({
      schedule,
      subject: subject || {
        subject_name: schedule.subject_name || 'Unknown Subject',
        subject_code: schedule.subject_code || ''
      },
      class: classInfo || { class_name: schedule.class_name || 'Unknown Class' },
      room: room || { name: schedule.room_name || 'Unknown Room' }
    });
  });

  return {
    matrix,
    periods: basePeriods,
    teachingPeriods,
    teachingPeriodNumbers: fallbackPeriodNumbers,
    periodSequence: buildPeriodDisplaySequence(basePeriods)
  };
}

export function buildTeacherScheduleMatrix(schedules, context, periods = []) {
  return buildTeacherScheduleMatrixDynamic(schedules, context, periods);
}
