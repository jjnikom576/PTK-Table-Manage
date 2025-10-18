import { globalContext, contextListeners } from './state.js';
import { saveContextToStorage, clearStoredContext } from './persistence.js';
import { updateContextUI } from './ui.js';
import { checkContextIntegrity } from './validation.js';
import * as dataService from '../../services/dataService.js';
import * as yearService from '../../services/yearService.js';

export function updateContext(partialContext) {
  const previousContext = { ...globalContext };
  Object.assign(globalContext, partialContext);

  if (partialContext.currentYear || partialContext.currentSemester) {
    saveContextToStorage();
  }

  if (partialContext.currentRooms) {
    notifyListeners('contextChange', {
      year: globalContext.currentYear,
      semester: globalContext.currentSemester,
      rooms: globalContext.currentRooms
    });
  }

  return { ok: true, previous: previousContext, current: globalContext };
}

export function resetContext() {
  console.log('[GlobalContext] Resetting context');

  const defaultContext = {
    currentYear: null,
    currentSemester: null,
    availableYears: globalContext.availableYears,
    availableSemesters: [],
    currentRooms: [],
    userRole: 'teacher',
    isLoading: false,
    error: null
  };

  Object.assign(globalContext, defaultContext);
  clearStoredContext();

  notifyListeners('contextChange', defaultContext);

  return { ok: true };
}

export function notifyContextChange(payload = {}) {
  notifyListeners('contextChange', {
    year: globalContext.currentYear,
    semester: globalContext.currentSemester,
    rooms: globalContext.currentRooms,
    ...payload
  });
}

export function handleContextError(error) {
  globalContext.error = error.message;
  notifyListeners('contextError', error);
  updateContextUI();
}

export function onContextChange(callback) {
  return registerListener('contextChange', callback);
}

export function onYearChange(callback) {
  return registerListener('yearChange', callback);
}

export function onSemesterChange(callback) {
  return registerListener('semesterChange', callback);
}

export function onContextError(callback) {
  return registerListener('contextError', callback);
}

export function setupContextEventListeners() {
  yearService.onYearChange((data) => {
    console.log('[GlobalContext] Year service year change:', data);
    notifyListeners('yearChange', data);
  });

  yearService.onSemesterChange((data) => {
    console.log('[GlobalContext] Year service semester change:', data);
    notifyListeners('semesterChange', data);
  });

  yearService.onRoomDataChange((data) => {
    console.log('[GlobalContext] Room data change:', data);
    if (data.toYear === globalContext.currentYear || data.fromYear === globalContext.currentYear) {
      loadRoomsForCurrentYear();
    }
  });
}

export function debugListeners() {
  return {
    counts: {
      contextChange: contextListeners.contextChange.length,
      yearChange: contextListeners.yearChange.length,
      semesterChange: contextListeners.semesterChange.length,
      contextError: contextListeners.contextError.length
    },
    integrity: checkContextIntegrity()
  };
}

function registerListener(type, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  const bucket = contextListeners[type];
  if (!bucket) {
    throw new Error(`Unknown listener type: ${type}`);
  }

  bucket.push(callback);

  return () => {
    const index = bucket.indexOf(callback);
    if (index > -1) {
      bucket.splice(index, 1);
    }
  };
}

function notifyListeners(eventType, data) {
  const listeners = contextListeners[eventType] || [];
  listeners.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error(`[GlobalContext] Error in ${eventType} listener:`, error);
    }
  });
}

async function loadRoomsForCurrentYear() {
  if (!globalContext.currentYear) return;

  try {
    const rooms = await dataService.loadYearData(globalContext.currentYear);
    if (rooms.ok && rooms.data.rooms) {
      globalContext.currentRooms = rooms.data.rooms;
    }
  } catch (error) {
    console.error('[GlobalContext] Failed to load rooms:', error);
    globalContext.currentRooms = [];
  }
}
