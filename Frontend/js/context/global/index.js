export { globalContext, setFallbackContext, getContext } from './state.js';

export {
  saveContextToStorage,
  loadContextFromStorage,
  clearStoredContext
} from './persistence.js';

export {
  isContextValid,
  isStoredContextCompatible,
  applyStoredContext,
  validateYear,
  validateSemester,
  validateUserAccess,
  checkContextIntegrity,
  validateContext
} from './validation.js';

export {
  updateContextUI,
  updateYearSelector,
  updateSemesterSelector,
  showContextSwitchLoading,
  hideContextSwitchLoading
} from './ui.js';

export {
  initGlobalContext,
  refreshContextFromBackend,
  setContext,
  switchContext
} from './api.js';

export {
  updateContext,
  resetContext,
  notifyContextChange,
  handleContextError,
  onContextChange,
  onYearChange,
  onSemesterChange,
  onContextError,
  setupContextEventListeners
} from './events.js';

export {
  contextAwareComponent,
  useGlobalContext,
  withContext,
  createContextProvider,
  debugContext
} from './helpers.js';
