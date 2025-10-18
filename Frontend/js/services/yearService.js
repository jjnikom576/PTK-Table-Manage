import * as dataService from './dataService.js';

let currentState = {
  activeYear: null,
  activeSemester: null,
  availableYears: [],
  availableSemesters: []
};

const eventListeners = {
  yearChange: [],
  semesterChange: [],
  roomDataChange: []
};

export async function initYearService() {
  console.log('[YearService] Initializing year service');
  await loadInitialYearData();
  return { ok: true };
}

export function getCurrentAcademicYear() {
  return currentState.activeYear;
}

export function getCurrentSemester() {
  return currentState.activeSemester;
}

export function getAvailableYears() {
  return [...currentState.availableYears];
}

export function getAvailableSemesters() {
  return [...currentState.availableSemesters];
}

export async function setActiveYear(yearNumber) {
  if (!yearNumber) {
    return { ok: false, error: 'Invalid year' };
  }

  if (currentState.activeYear?.year === yearNumber) {
    return { ok: true, data: currentState.activeYear };
  }

  const targetYear = currentState.availableYears.find((year) => year.year === yearNumber);
  if (!targetYear) {
    return { ok: false, error: `Year ${yearNumber} not found` };
  }

  currentState.activeYear = targetYear;
  emit('yearChange', { year: targetYear });

  await refreshSemestersForYear(targetYear.id);

  return { ok: true, data: targetYear };
}

export async function setActiveSemester(semesterId) {
  if (!semesterId) {
    return { ok: false, error: 'Invalid semester id' };
  }

  const targetSemester = currentState.availableSemesters.find((semester) => semester.id === semesterId);
  if (!targetSemester) {
    return { ok: false, error: `Semester ${semesterId} not found` };
  }

  currentState.activeSemester = targetSemester;
  emit('semesterChange', { semester: targetSemester });

  return { ok: true, data: targetSemester };
}

export function onYearChange(callback) {
  return registerListener('yearChange', callback);
}

export function onSemesterChange(callback) {
  return registerListener('semesterChange', callback);
}

export function onRoomDataChange(callback) {
  return registerListener('roomDataChange', callback);
}

export function emitRoomDataChange(payload) {
  emit('roomDataChange', payload);
}

export async function refreshYearData() {
  await loadInitialYearData(true);
}

async function loadInitialYearData(force = false) {
  try {
    const years = await dataService.loadAcademicYears();
    if (years.ok) {
      currentState.availableYears = years.data;

      if (force || !currentState.activeYear) {
        currentState.activeYear =
          years.data.find((year) => year.is_active) || years.data[0] || null;
      }
    }

    if (currentState.activeYear) {
      await refreshSemestersForYear(currentState.activeYear.id);
    }
  } catch (error) {
    console.error('[YearService] Failed to load initial year data:', error);
  }
}

async function refreshSemestersForYear(academicYearId) {
  try {
    const semesters = await dataService.loadSemestersByYear(academicYearId);
    if (semesters.ok) {
      currentState.availableSemesters = semesters.data;

      if (
        !currentState.activeSemester ||
        currentState.activeSemester.academic_year_id !== academicYearId
      ) {
        currentState.activeSemester =
          semesters.data.find((semester) => semester.is_active) || semesters.data[0] || null;

        if (currentState.activeSemester) {
          emit('semesterChange', { semester: currentState.activeSemester });
        }
      }
    }
  } catch (error) {
    console.error('[YearService] Failed to refresh semesters:', error);
  }
}

function registerListener(type, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Listener callback must be a function');
  }

  eventListeners[type].push(callback);

  return () => {
    const index = eventListeners[type].indexOf(callback);
    if (index > -1) {
      eventListeners[type].splice(index, 1);
    }
  };
}

function emit(type, payload) {
  const listeners = eventListeners[type] || [];
  listeners.forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      console.error(`[YearService] Error in ${type} listener:`, error);
    }
  });
}
