import scheduleAPI from '../../api/schedule-api.js';
import { ensurePeriodsList } from '../../utils.js';
import {
  cache,
  getCurrentContextRef,
  setLastLoadedPeriods
} from './state.js';

function resolveContext(year, semesterId) {
  const context = getCurrentContextRef();
  const targetYear = year ?? context.year;
  const targetSemester =
    semesterId ?? context.semester?.id ?? context.semesterId ?? null;
  return { targetYear, targetSemester };
}

export async function getTeachers(year = null, semesterId = null, options = {}) {
  const { targetYear, targetSemester } = resolveContext(year, semesterId);
  const { forceRefresh = false } = options;

  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }

  if (!targetSemester) {
    console.warn('[DataService] ⚠️ Missing semester context for loading teachers');
    return { ok: true, data: [] };
  }

  const cacheKey = `teachers_${targetYear}_${targetSemester}`;
  if (forceRefresh) {
    cache.delete(cacheKey);
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    const result = await scheduleAPI.getTeachers(targetYear, targetSemester);
    if (result.success) {
      const teachers = Array.isArray(result.data) ? result.data : [];
      cache.set(cacheKey, teachers);
      return { ok: true, data: teachers };
    }

    return { ok: false, error: result.error || 'ไม่สามารถโหลดข้อมูลครูได้' };
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load teachers for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

export async function getClasses(year = null, semesterId = null, options = {}) {
  const { targetYear, targetSemester } = resolveContext(year, semesterId);
  const { forceRefresh = false } = options;

  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  if (!targetSemester) {
    return { ok: false, error: 'No semester specified' };
  }

  const cacheKey = `classes_${targetYear}_${targetSemester}`;
  if (forceRefresh) {
    cache.delete(cacheKey);
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    const result = await scheduleAPI.getClasses(targetYear, targetSemester);
    if (result.success) {
      const classes = Array.isArray(result.data) ? result.data : [];
      cache.set(cacheKey, classes);
      return { ok: true, data: classes };
    }

    return { ok: false, error: result.error || 'ไม่สามารถโหลดข้อมูลชั้นเรียนได้' };
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load classes for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

export async function getRooms(year = null, semesterId = null, options = {}) {
  const { targetYear, targetSemester } = resolveContext(year, semesterId);
  const { forceRefresh = false } = options;

  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  if (!targetSemester) {
    return { ok: false, error: 'No semester specified' };
  }

  const cacheKey = `rooms_${targetYear}_${targetSemester}`;
  if (forceRefresh) {
    cache.delete(cacheKey);
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    const result = await scheduleAPI.getRooms(targetYear, targetSemester);
    if (result.success) {
      const rooms = Array.isArray(result.data) ? result.data : [];
      cache.set(cacheKey, rooms);
      return { ok: true, data: rooms };
    }

    return { ok: false, error: result.error || 'ไม่สามารถโหลดข้อมูลห้องเรียนได้' };
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load rooms for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

export async function getSubjects(year = null, semesterId = null, options = {}) {
  const { targetYear, targetSemester } = resolveContext(year, semesterId);
  const { forceRefresh = false } = options;

  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  if (!targetSemester) {
    return { ok: false, error: 'No semester specified' };
  }

  const cacheKey = `subjects_${targetYear}_${targetSemester}`;
  if (forceRefresh) {
    cache.delete(cacheKey);
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    const result = await scheduleAPI.getSubjects(targetYear, targetSemester);
    if (result.success) {
      const subjects = Array.isArray(result.data) ? result.data : [];
      cache.set(cacheKey, subjects);
      return { ok: true, data: subjects };
    }

    return { ok: false, error: result.error || 'ไม่สามารถโหลดข้อมูลวิชาเรียนได้' };
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load subjects for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

export async function getSchedules(year = null, semesterId = null, options = {}) {
  const { targetYear, targetSemester } = resolveContext(year, semesterId);
  const { forceRefresh = false } = options;

  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }

  const cacheKey = targetSemester
    ? `schedules_${targetYear}_${targetSemester}`
    : `schedules_${targetYear}`;

  if (forceRefresh) {
    cache.delete(cacheKey);
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  try {
    if (!targetSemester) {
      console.warn('[DataService] ⚠️ Missing semester context for schedules');
      return { ok: true, data: [] };
    }

    const result = await scheduleAPI.getSchedules(targetYear, targetSemester);
    if (result.success) {
      const schedules = Array.isArray(result.data) ? result.data : [];
      cache.set(cacheKey, schedules);
      return { ok: true, data: schedules };
    }

    return { ok: false, error: result.error || 'ไม่สามารถโหลดข้อมูลตารางสอนได้' };
  } catch (error) {
    console.error(`[DataService] ❌ Failed to load schedules for year ${targetYear}:`, error);
    return { ok: false, error: error.message };
  }
}

export async function getPeriods(year = null, semesterId = null, options = {}) {
  const { targetYear, targetSemester } = resolveContext(year, semesterId);
  const { forceRefresh = false } = options;

  if (!targetYear) {
    return { ok: false, error: 'No year specified' };
  }
  if (!targetSemester) {
    return { ok: false, error: 'No semester specified' };
  }

  const cacheKey = `periods_${targetYear}_${targetSemester}`;
  if (forceRefresh) {
    cache.delete(cacheKey);
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    const normalized = ensurePeriodsList(cached);
    setLastLoadedPeriods(normalized, {
      year: targetYear,
      semesterId: targetSemester
    });
    return { ok: true, data: normalized };
  }

  try {
    const result = await scheduleAPI.getPeriods(targetYear, targetSemester);
    if (result.success) {
      const normalized = ensurePeriodsList(result.data);
      cache.set(cacheKey, normalized);
      setLastLoadedPeriods(normalized, {
        year: targetYear,
        semesterId: targetSemester
      });
      return { ok: true, data: normalized };
    }

    const unauthorized =
      result?.status === 401 ||
      (typeof result?.error === 'string' && result.error.toLowerCase().includes('auth'));

    if (unauthorized) {
      console.warn(
        `[DataService] Periods endpoint returned ${result.status}. Using default periods for year ${targetYear}, semester ${targetSemester}.`
      );
      const fallback = ensurePeriodsList();
      cache.set(cacheKey, fallback);
      setLastLoadedPeriods(fallback, {
        year: targetYear,
        semesterId: targetSemester
      });
      return {
        ok: true,
        data: fallback,
        fallback: true,
        reason: 'unauthorized'
      };
    }

    return {
      ok: false,
      error: result.error || 'ไม่สามารถโหลดข้อมูลคาบเรียนได้',
      status: result.status
    };
  } catch (error) {
    console.error(
      `[DataService] ❌ Failed to load periods for year ${targetYear}:`,
      error
    );
    return { ok: false, error: error.message };
  }
}
