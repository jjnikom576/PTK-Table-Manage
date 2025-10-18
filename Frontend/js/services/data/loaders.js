import coreAPI from '../../api/core-api.js';
import { ensurePeriodsList } from '../../utils.js';
import {
  cache,
  getCurrentContextRef,
  setLastLoadedPeriods
} from './state.js';
import {
  getTeachers,
  getClasses,
  getRooms,
  getSubjects,
  getSchedules,
  getPeriods
} from './entities.js';

export async function loadAcademicYears() {
  const cacheKey = 'years';
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    const response = await coreAPI.getAcademicYears();
    const result = response.success
      ? { ok: true, data: response.data }
      : { ok: false, error: response.error || 'ไม่สามารถโหลดข้อมูลปีการศึกษาได้' };

    if (result.ok) {
      cache.set(cacheKey, result.data);
    }

    return result;
  } catch (error) {
    console.error('[DataService] Failed to load academic years:', error);
    return { ok: false, error: error.message };
  }
}

export async function loadSemesters() {
  try {
    const response = await coreAPI.getSemesters();
    return response.success
      ? { ok: true, data: response.data }
      : { ok: false, error: response.error || 'ไม่สามารถโหลดข้อมูลภาคเรียนได้' };
  } catch (error) {
    console.error('[DataService] Failed to load semesters:', error);
    return { ok: false, error: error.message };
  }
}

export async function loadSemestersByYear(yearId) {
  const cacheKey = `semesters.${yearId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    const response = await coreAPI.getSemesters();
    const result = response.success
      ? {
          ok: true,
          data: (response.data || []).filter(
            (semester) => semester.academic_year_id === yearId
          )
        }
      : { ok: false, error: response.error || 'ไม่สามารถโหลดข้อมูลภาคเรียนได้' };

    if (result.ok) {
      cache.set(cacheKey, result.data);
    }

    return result;
  } catch (error) {
    console.error('[DataService] Failed to load semesters by year:', error);
    return { ok: false, error: error.message };
  }
}

export async function loadYearData(year) {
  const cacheKey = `byYear.${year}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    const context = getCurrentContextRef();
    const resolvedSemesterId =
      context.semesterId || context.semester?.id || null;

    const [
      teachersRes,
      classesRes,
      roomsRes,
      subjectsRes,
      schedulesRes,
      periodsRes
    ] = await Promise.all([
      getTeachers(year),
      resolvedSemesterId ? getClasses(year, resolvedSemesterId) : Promise.resolve({ ok: true, data: [] }),
      resolvedSemesterId ? getRooms(year, resolvedSemesterId) : Promise.resolve({ ok: true, data: [] }),
      resolvedSemesterId ? getSubjects(year, resolvedSemesterId) : Promise.resolve({ ok: true, data: [] }),
      resolvedSemesterId ? getSchedules(year, resolvedSemesterId) : Promise.resolve({ ok: true, data: [] }),
      resolvedSemesterId ? getPeriods(year, resolvedSemesterId) : Promise.resolve({ ok: true, data: ensurePeriodsList() })
    ]);

    if (![teachersRes, classesRes, roomsRes, subjectsRes, schedulesRes, periodsRes].every((result) => result.ok)) {
      const errors = [
        teachersRes,
        classesRes,
        roomsRes,
        subjectsRes,
        schedulesRes,
        periodsRes
      ]
        .filter((result) => !result.ok)
        .map((result) => result.error)
        .join(', ');
      throw new Error(errors || 'Failed to load year data');
    }

    const normalizedPeriods = ensurePeriodsList(periodsRes.data || []);
    setLastLoadedPeriods(normalizedPeriods, {
      year,
      semesterId: resolvedSemesterId
    });

    const completeData = {
      teachers: teachersRes.data || [],
      classes: classesRes.data || [],
      rooms: roomsRes.data || [],
      subjects: subjectsRes.data || [],
      schedules: schedulesRes.data || [],
      substitutions: [],
      substitution_schedules: [],
      periods: normalizedPeriods
    };

    cache.set(cacheKey, completeData);
    return { ok: true, data: completeData };
  } catch (error) {
    console.error('[DataService] Failed to load year data:', error);
    return { ok: false, error: error.message };
  }
}

export async function loadSemesterData(semesterId) {
  try {
    const semesterResult = await getSemesterById(semesterId);
    if (!semesterResult.ok) {
      throw new Error(semesterResult.error || 'Semester not found');
    }

    const semester = semesterResult.data;
    const academicYearResult = await getAcademicYearById(
      semester.academic_year_id
    );
    if (!academicYearResult.ok) {
      throw new Error(academicYearResult.error || 'Academic year not found');
    }

    const actualYear = academicYearResult.data.year;
    const yearData = await loadYearData(actualYear);
    if (!yearData.ok) {
      return yearData;
    }

    const semesterData = {
      ...yearData.data,
      classes: yearData.data.classes.filter(
        (cls) => cls.semester_id === semesterId
      ),
      subjects: yearData.data.subjects.filter((subject) => {
        const subjectData = yearData.data.subjects.find(
          (item) => item.id === subject.id
        );
        const cls = yearData.data.classes.find(
          (item) => item.id === subjectData?.class_id
        );
        return cls?.semester_id === semesterId;
      }),
      schedules: yearData.data.schedules.filter(
        (schedule) => schedule.semester_id === semesterId
      )
    };

    return { ok: true, data: semesterData };
  } catch (error) {
    console.error('[DataService] Failed to load semester data:', error);
    return { ok: false, error: error.message };
  }
}

export async function getAcademicYearById(yearId) {
  const years = await loadAcademicYears();
  if (!years.ok) {
    return years;
  }

  const academicYear = (years.data || []).find((item) => item.id === yearId);
  if (!academicYear) {
    return { ok: false, error: `Academic year ID ${yearId} not found` };
  }

  return { ok: true, data: academicYear };
}

export async function getAcademicYearByNumber(year) {
  const years = await loadAcademicYears();
  if (!years.ok) {
    return years;
  }

  const academicYear = (years.data || []).find((item) => item.year === year);
  if (!academicYear) {
    return { ok: false, error: `Academic year ${year} not found` };
  }

  return { ok: true, data: academicYear };
}

export async function getSemesterById(semesterId) {
  const cachedSemesters = Object.values(cache.semesters || {}).flat();
  let semester = cachedSemesters.find((item) => item.id === semesterId);

  if (!semester) {
    const context = getCurrentContextRef();
    const academicYearId = context.academicYear?.id;
    if (academicYearId) {
      const semestersResult = await loadSemestersByYear(academicYearId);
      if (semestersResult.ok) {
        semester = semestersResult.data.find((item) => item.id === semesterId);
      }
    }
  }

  if (!semester) {
    const allSemestersResult = await loadSemesters();
    if (allSemestersResult.ok) {
      semester = (allSemestersResult.data || []).find(
        (item) => item.id === semesterId
      );
    }
  }

  if (!semester) {
    return { ok: false, error: `Semester ${semesterId} not found` };
  }

  return { ok: true, data: semester };
}
