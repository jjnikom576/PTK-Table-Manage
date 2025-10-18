// Global context state and listener registries

export const globalContext = {
  currentYear: null,
  currentSemester: null,
  availableYears: [],
  availableSemesters: [],
  semestersLoaded: false,
  currentRooms: [],
  userRole: 'teacher',
  isLoading: false,
  error: null
};

export const contextListeners = {
  contextChange: [],
  yearChange: [],
  semesterChange: [],
  contextError: []
};

export const STORAGE_KEYS = {
  CONTEXT: 'school-schedule-context',
  USER_ROLE: 'school-schedule-user-role'
};

export function setFallbackContext() {
  console.log('[GlobalContext] Setting fallback context');
  globalContext.currentYear = null;
  globalContext.currentSemester = null;
  globalContext.availableYears = [];
  globalContext.availableSemesters = [];
  globalContext.currentRooms = [];
}

export function getContext() {
  return { ...globalContext };
}
