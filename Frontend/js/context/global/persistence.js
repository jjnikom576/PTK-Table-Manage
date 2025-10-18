import { globalContext, STORAGE_KEYS } from './state.js';

export function saveContextToStorage() {
  try {
    const contextToSave = {
      currentYear: globalContext.currentYear,
      currentSemester: globalContext.currentSemester,
      userRole: globalContext.userRole,
      timestamp: Date.now()
    };

    localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(contextToSave));
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, globalContext.userRole);

    console.log('[GlobalContext] Context saved to storage');
    return true;
  } catch (error) {
    console.error('[GlobalContext] Failed to save context:', error);
    return false;
  }
}

export function loadContextFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTEXT);
    if (!stored) return null;

    const parsedContext = JSON.parse(stored);
    const age = Date.now() - (parsedContext.timestamp || 0);
    if (age > 24 * 60 * 60 * 1000) {
      console.log('[GlobalContext] Stored context expired, clearing');
      clearStoredContext();
      return null;
    }

    return parsedContext;
  } catch (error) {
    console.error('[GlobalContext] Failed to load context from storage:', error);
    clearStoredContext();
    return null;
  }
}

export function clearStoredContext() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONTEXT);
    console.log('[GlobalContext] Cleared stored context');
    return true;
  } catch (error) {
    console.error('[GlobalContext] Failed to clear stored context:', error);
    return false;
  }
}
