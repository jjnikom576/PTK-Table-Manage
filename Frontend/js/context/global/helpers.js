import { globalContext, contextListeners, getContext as getStateContext } from './state.js';
import { saveContextToStorage, loadContextFromStorage } from './persistence.js';
import {
  validateYear,
  validateSemester,
  checkContextIntegrity
} from './validation.js';
import {
  updateContext,
  onContextChange,
  onYearChange,
  onSemesterChange
} from './events.js';
import { setContext, switchContext } from './api.js';

export function contextAwareComponent(component) {
  if (typeof component === 'function') {
    const enhancedComponent = function (...args) {
      const context = getStateContext();
      return component.call(this, context, ...args);
    };

    enhancedComponent.getContext = getStateContext;
    enhancedComponent.updateContext = updateContext;
    enhancedComponent.onContextChange = onContextChange;

    return enhancedComponent;
  }

  if (typeof component === 'object' && component !== null) {
    component.getContext = getStateContext;
    component.updateContext = updateContext;
    component.onContextChange = onContextChange;

    component._contextUnsubscribe = onContextChange((newContext) => {
      if (typeof component.onContextUpdate === 'function') {
        component.onContextUpdate(newContext);
      }
    });

    return component;
  }

  throw new Error('Component must be a function or object');
}

export function useGlobalContext() {
  const context = getStateContext();

  return {
    ...context,
    setContext,
    updateContext,
    switchContext,
    validateYear,
    validateSemester,
    onContextChange,
    onYearChange,
    onSemesterChange
  };
}

export function withContext(component) {
  return contextAwareComponent(component);
}

export function createContextProvider(initialContext = {}) {
  const savedContext = { ...globalContext };
  Object.assign(globalContext, initialContext);

  return {
    getContext: getStateContext,
    updateContext,
    restore: () => {
      Object.assign(globalContext, savedContext);
      saveContextToStorage();
    }
  };
}

export function debugContext() {
  const stored = loadContextFromStorage();

  return {
    globalContext: { ...globalContext },
    listeners: {
      contextChange: contextListeners.contextChange.length,
      yearChange: contextListeners.yearChange.length,
      semesterChange: contextListeners.semesterChange.length,
      contextError: contextListeners.contextError.length
    },
    integrity: checkContextIntegrity(),
    storage: {
      hasStoredContext: !!stored,
      storedContext: stored
    }
  };
}
