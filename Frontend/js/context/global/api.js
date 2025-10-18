import coreAPI from '../../api/core-api.js';
import authAPI from '../../api/auth-api.js';
import * as dataService from '../../services/dataService.js';

import {
  globalContext,
  setFallbackContext
} from './state.js';
import {
  saveContextToStorage,
  loadContextFromStorage,
  clearStoredContext
} from './persistence.js';
import {
  isStoredContextCompatible,
  applyStoredContext,
  validateContext
} from './validation.js';
import {
  updateContextUI,
  showContextSwitchLoading,
  hideContextSwitchLoading
} from './ui.js';
import {
  updateContext,
  notifyContextChange,
  handleContextError,
  setupContextEventListeners
} from './events.js';

let eventsSetup = false;

export async function initGlobalContext() {
  try {
    console.log('[GlobalContext] Initializing global context');

    globalContext.isLoading = true;
    globalContext.error = null;

    const isAuthenticated = authAPI.isAuthenticated();
    console.log('[GlobalContext] Authentication status:', isAuthenticated);

    await loadContextFromAPI();

    const hasBackendData =
      globalContext.availableYears.length > 0 || globalContext.availableSemesters.length > 0;

    if (!hasBackendData) {
      clearStoredContext();
      setFallbackContext();
    } else if (!globalContext.currentYear || !globalContext.currentSemester) {
      const storedContext = loadContextFromStorage();
      if (storedContext && isStoredContextCompatible(storedContext)) {
        applyStoredContext(storedContext);
        console.log('[GlobalContext] Loaded context from storage:', storedContext);
      } else if (storedContext) {
        console.log('[GlobalContext] Stored context is out of date, clearing');
        clearStoredContext();
      }
    }

    globalContext.isLoading = false;
    updateContextUI();

    if (!eventsSetup) {
      setupContextEventListeners();
      eventsSetup = true;
    }

    console.log('[GlobalContext] Initialization complete. Final state:', {
      currentYear: globalContext.currentYear,
      currentSemester: globalContext.currentSemester,
      availableYears: globalContext.availableYears.length,
      availableSemesters: globalContext.availableSemesters.length
    });
  } catch (error) {
    console.error('[GlobalContext] Error during initialization:', error);
    globalContext.isLoading = false;
    globalContext.error = error.message;
    setFallbackContext();
    updateContextUI();
  }
}

export async function refreshContextFromBackend() {
  try {
    console.log('[GlobalContext] Refreshing context from backend...');

    if (!authAPI.isAuthenticated()) {
      console.log('[GlobalContext] Not authenticated, skipping backend refresh');
      return { ok: false, error: 'Not authenticated' };
    }

    await loadContextFromAPI();
    updateContextUI();

    console.log('[GlobalContext] Context refreshed from backend successfully');
    return { ok: true, context: globalContext };
  } catch (error) {
    console.error('[GlobalContext] Failed to refresh context from backend:', error);
    return { ok: false, error: error.message };
  }
}

export async function setContext(year, semesterId) {
  try {
    const previousYear = globalContext.currentYear;
    const previousSemester = globalContext.currentSemester;

    console.log(`[GlobalContext] Setting context to ${year}/${semesterId}`);

    const actualSemester = globalContext.availableSemesters.find((s) => s.id === semesterId);

    if (!actualSemester && semesterId) {
      console.warn(`[GlobalContext] Semester ${semesterId} not found in available data`);
      return { ok: false, error: `Semester ${semesterId} not found` };
    }

    globalContext.currentYear = year;
    globalContext.currentSemester = actualSemester || null;

    if (authAPI.isAuthenticated() && year && semesterId) {
      try {
        const setActiveYearResult = await coreAPI.setActiveAcademicYear(year);
        if (!setActiveYearResult.success) {
          console.warn(
            '[GlobalContext] Failed to set active year on backend:',
            setActiveYearResult.error
          );
        }

        const setActiveSemesterResult = await coreAPI.setActiveSemester(semesterId);
        if (!setActiveSemesterResult.success) {
          console.warn(
            '[GlobalContext] Failed to set active semester on backend:',
            setActiveSemesterResult.error
          );
        }

        console.log('[GlobalContext] Backend context updated successfully');
      } catch (apiError) {
        console.warn('[GlobalContext] Failed to update backend context:', apiError);
      }
    }

    saveContextToStorage();
    updateContextUI();

    notifyContextChange({
      previousYear,
      previousSemester
    });

    console.log('[GlobalContext] Context set successfully');
    return { ok: true, context: globalContext };
  } catch (error) {
    console.error('[GlobalContext] Failed to set context:', error);
    return { ok: false, error: error.message };
  }
}

export async function switchContext(newYear, newSemesterId) {
  try {
    showContextSwitchLoading();

    console.log(`[GlobalContext] Switching context to ${newYear}/${newSemesterId}`);

    const validation = await validateContext(newYear, newSemesterId);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const result = await setContext(newYear, newSemesterId);
    if (!result.ok) {
      throw new Error(result.error);
    }

    const rooms = await dataService.getRooms();
    if (rooms.ok) {
      updateContext({ currentRooms: rooms.data });
    }

    await clearContextCaches();
    await loadContextData();

    updateContextUI();
    notifyContextChange();

    console.log('[GlobalContext] Context switched successfully');
    return { ok: true };
  } catch (error) {
    console.error('[GlobalContext] Context switch failed:', error);
    handleContextError(error);
    return { ok: false, error: error.message };
  } finally {
    hideContextSwitchLoading();
  }
}

async function loadContextFromAPI() {
  try {
    console.log('[GlobalContext] Loading context from backend API...');

    try {
      const ctxRes = await coreAPI.getGlobalContext();
      if (ctxRes?.success && ctxRes.data) {
        const activeYear = ctxRes.data.currentYear ?? ctxRes.data.academic_year?.year ?? null;
        const activeSemester = ctxRes.data.currentSemester ?? ctxRes.data.semester ?? null;
        if (activeYear) globalContext.currentYear = activeYear;
        if (activeSemester) globalContext.currentSemester = activeSemester;
      }
    } catch (e) {
      console.warn('[GlobalContext] Failed to fetch api-context:', e);
    }

    const yearsResult = await coreAPI.getAcademicYears();
    console.log('[GlobalContext] Years API full response:', yearsResult);

    if (yearsResult.success && yearsResult.data) {
      globalContext.availableYears = yearsResult.data;
      console.log('[GlobalContext] Loaded years from API:', yearsResult.data.length, 'years');
    } else {
      console.warn('[GlobalContext] No academic years found or API failed');
      globalContext.availableYears = [];
    }

    globalContext.availableSemesters = [];
    globalContext.semestersLoaded = false;
    try {
      const semestersResult = await coreAPI.getSemesters();
      if (semestersResult.success && Array.isArray(semestersResult.data)) {
        globalContext.availableSemesters = semestersResult.data;
        console.log('[GlobalContext] Loaded semesters from API (global):', semestersResult.data.length);
      } else {
        console.warn('[GlobalContext] Failed to load semesters or empty:', semestersResult);
      }
    } catch (e) {
      console.warn('[GlobalContext] Error loading semesters:', e);
    } finally {
      globalContext.semestersLoaded = true;
    }

    if (globalContext.availableYears.length > 0) {
      const activeYear = globalContext.availableYears.find((y) => y.is_active) || null;
      console.log('[GlobalContext] Selected active year:', activeYear);

      const semestersResult = await coreAPI.getSemesters();
      console.log('[GlobalContext] Semesters API response:', semestersResult);

      if (semestersResult.success && semestersResult.data && semestersResult.data.length > 0) {
        globalContext.availableSemesters = semestersResult.data;
        console.log('[GlobalContext] Loaded semesters from API:', semestersResult.data.length);

        const activeSemester = globalContext.availableSemesters.find((s) => s.is_active);

        if (activeSemester) {
          if (activeYear) globalContext.currentYear = activeYear.year;
          globalContext.currentSemester = activeSemester;
          console.log(
            '[GlobalContext] Set active context:',
            activeYear?.year ?? null,
            activeSemester.semester_name || activeSemester.name
          );
        } else {
          globalContext.currentSemester = null;
          console.log('[GlobalContext] No active semester found; leaving currentSemester = null');
        }
      } else {
        console.log('[GlobalContext] No semesters found for active year:', activeYear?.year);
        globalContext.availableSemesters = [];
      }
    }

    if (!globalContext.currentYear || !globalContext.currentSemester) {
      console.log('[GlobalContext] No active context found - clearing active state only');
      globalContext.currentYear = null;
      globalContext.currentSemester = null;
    }
  } catch (error) {
    console.error('[GlobalContext] Error loading from API:', error);
    throw error;
  }
}

async function clearContextCaches() {
  if (dataService.clearCache) {
    dataService.clearCache();
  }
}

async function loadContextData() {
  if (globalContext.currentYear && globalContext.currentSemester) {
    await dataService.loadSemesterData(globalContext.currentSemester.id);
  }
}
