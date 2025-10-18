import coreAPI from '../../api/core-api.js';
import { setPageState } from './state.js';
import { findClassNameById } from './classUtils.js';
import { resolveSemesterId } from './context.js';

export async function preloadTimetableFromAPI(context) {
  try {
    const year = context.currentYear || context.year;
    const semesterId = resolveSemesterId(context);

    if (!year || !semesterId) {
      return null;
    }

    const response = await coreAPI.getTimetableBy(year, semesterId, true);
    if (!response?.success) {
      return null;
    }

    const cached =
      typeof coreAPI.getCachedTimetable === 'function'
        ? coreAPI.getCachedTimetable()
        : null;

    const timetableList = normalizeTimetableList(response.data, cached);

    if (!timetableList.length) {
      return null;
    }

    const matrix = buildTimetableMatrix(timetableList);

    setPageState({
      currentSchedule: { matrix },
      cachedTimetable: timetableList
    });

    return timetableList;
  } catch (error) {
    console.warn('[StudentSchedule] Timetable API preload failed:', error);
    return null;
  }
}

export async function buildFallbackScheduleFromTimetable(
  classId,
  originalClassRef,
  context,
  timetableEntries = null
) {
  const year = context.currentYear || context.year;
  const semesterId = resolveSemesterId(context);

  if (!year || !semesterId) {
    return null;
  }

  let entries = Array.isArray(timetableEntries) ? timetableEntries : null;

  if (!entries || !entries.length) {
    const response = await coreAPI.getTimetableBy(year, semesterId, true);
    if (response?.success) {
      entries = normalizeTimetableList(response.data);
    }

    if ((!entries || !entries.length) && typeof coreAPI.getCachedTimetable === 'function') {
      const cached = coreAPI.getCachedTimetable();
      entries = normalizeTimetableList(undefined, cached);
    }
  }

  if (!entries || !entries.length) {
    return null;
  }

  const numericClassId = Number(classId);
  const resolvedClassName =
    findClassNameById(classId) ||
    entries.find(
      (item) => Number(item.class_id ?? item.classId) === numericClassId
    )?.class_name ||
    entries.find(
      (item) => Number(item.classId ?? item.class_id) === numericClassId
    )?.className ||
    (typeof originalClassRef === 'string' ? originalClassRef : null) ||
    String(classId);

  const filteredEntries = entries.filter((item) =>
    matchEntryToClass(item, numericClassId, resolvedClassName, originalClassRef)
  );

  if (!filteredEntries.length) {
    return null;
  }

  const matrix = {};
  filteredEntries.forEach((item) => {
    const day = Number(item.day_of_week ?? item.day);
    const period = Number(item.period ?? item.period_no);
    if (!day || !period) {
      return;
    }

    if (!matrix[day]) {
      matrix[day] = {};
    }

    matrix[day][period] = {
      schedule: item,
      subject: {
        subject_name: item.subject_name || '',
        subject_code: item.subject_code || ''
      },
      teacher: {
        name: item.teacher_name || ''
      },
      room: {
        name: item.room_name || ''
      }
    };
  });

  const subjectsMap = new Map();
  filteredEntries.forEach((item) => {
    const code = item.subject_code || item.subject_name || '';
    if (!code || subjectsMap.has(code)) {
      return;
    }
    subjectsMap.set(code, {
      subject_code: item.subject_code || '',
      subject_name: item.subject_name || ''
    });
  });

  return {
    fallback: true,
    classInfo: {
      id: Number.isFinite(numericClassId) ? numericClassId : classId,
      class_name: resolvedClassName
    },
    schedules: filteredEntries,
    matrix,
    subjects: Array.from(subjectsMap.values()),
    teachers: [],
    rooms: [],
    periods: [],
    timetableEntries: filteredEntries
  };
}

export function normalizeIdList(value) {
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
      // ignore parse errors
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
}

function normalizeTimetableList(responseData, cached) {
  if (Array.isArray(responseData?.list)) {
    return responseData.list;
  }
  if (Array.isArray(cached?.list)) {
    return cached.list;
  }
  if (Array.isArray(responseData)) {
    return responseData;
  }
  if (Array.isArray(cached)) {
    return cached;
  }
  return [];
}

function buildTimetableMatrix(timetableList) {
  const matrix = {};
  for (let day = 1; day <= 7; day += 1) {
    matrix[day] = {};
    for (let period = 1; period <= 12; period += 1) {
      matrix[day][period] = null;
    }
  }

  timetableList.forEach((item) => {
    const day = Number(item.day_of_week ?? item.day);
    const period = Number(item.period ?? item.period_no);
    if (!day || !period) return;

    matrix[day] = matrix[day] || {};
    matrix[day][period] = {
      subject: {
        subject_name: item.subject_name || '',
        subject_code: item.subject_code || ''
      },
      teacher: { name: item.teacher_name || '' },
      room: { name: item.room_name || '' },
      schedule: item,
      raw: item
    };
  });

  return matrix;
}

function matchEntryToClass(item, numericClassId, resolvedClassName, originalClassRef) {
  const entryNumericId = Number(item.class_id ?? item.classId);
  if (
    Number.isFinite(entryNumericId) &&
    Number.isFinite(numericClassId) &&
    entryNumericId === numericClassId
  ) {
    return true;
  }

  const candidateIds = new Set([
    ...normalizeIdList(item.class_ids),
    ...normalizeIdList(item.classIds)
  ]);
  if (Number.isFinite(numericClassId) && candidateIds.has(numericClassId)) {
    return true;
  }

  const entryClassName = item.class_name || item.className || '';
  if (resolvedClassName && entryClassName === resolvedClassName) {
    return true;
  }

  if (
    typeof originalClassRef === 'string' &&
    originalClassRef &&
    entryClassName === originalClassRef
  ) {
    return true;
  }

  return false;
}
