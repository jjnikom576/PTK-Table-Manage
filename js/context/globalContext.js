/**
 * Global Context Management System for Multi-Year School Schedule System
 * Features: Centralized state, Context persistence, UI sync, Rooms integration
 */

import * as dataService from '../services/dataService.js';
import * as yearService from '../services/yearService.js';

// =============================================================================
// CONTEXT STATE
// =============================================================================

const globalContext = {
  currentYear: null,
  currentSemester: null,
  availableYears: [],
  availableSemesters: [],
  currentRooms: [], // ใหม่ - rooms สำหรับปีปัจจุบัน
  userRole: 'teacher',
  isLoading: false,
  error: null
};

// Event listeners
const contextListeners = {
  contextChange: [],
  yearChange: [],
  semesterChange: [],
  contextError: []
};

// Storage keys
const STORAGE_KEYS = {
  CONTEXT: 'school-schedule-context',
  USER_ROLE: 'school-schedule-user-role'
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Initialize Global Context
 */
export async function initGlobalContext() {
  try {
    console.log('[GlobalContext] Initializing global context');
    
    // Load from storage first
    const storedContext = loadContextFromStorage();
    if (storedContext && isContextValid(storedContext)) {
      Object.assign(globalContext, storedContext);
      console.log('[GlobalContext] Loaded context from storage:', storedContext);
    }
    
    // Initialize services
    await dataService.initDataService({ mode: 'mock' });
    yearService.initYearService();
    
    // Load available years and semesters
    const years = await dataService.loadAcademicYears();
    if (years.ok) {
      globalContext.availableYears = years.data;
    }
    
    // Set default context if none exists
    if (!globalContext.currentYear) {
      // Use default values instead
      await setContext(2567, 1); // Use semester 1 instead of 4
    }
    
    // Setup event listeners
    setupContextEventListeners();
    
    console.log('[GlobalContext] Initialization complete');
    return { ok: true, context: globalContext };
    
  } catch (error) {
    console.error('[GlobalContext] Failed to initialize:', error);
    globalContext.error = error.message;
    return { ok: false, error: error.message };
  }
}

/**
 * Set Context
 */
export async function setContext(year, semesterId) {
  try {
    const previousYear = globalContext.currentYear;
    const previousSemester = globalContext.currentSemester;
    
    // Skip validation - use direct assignment
    globalContext.currentYear = year;
    globalContext.currentSemester = { id: semesterId, semester_name: 'ภาคเรียนที่ 1' };
    
    // Update data service context
    await dataService.setGlobalContext(year, semesterId);
    
    // Save to storage
    saveContextToStorage({
      currentYear: year,
      currentSemester: globalContext.currentSemester,
      timestamp: Date.now()
    });
    
    // Notify listeners
    notifyContextChange({
      currentYear: year,
      currentSemester: globalContext.currentSemester
    });
    
    return { ok: true, context: globalContext };
    
  } catch (error) {
    console.error('[GlobalContext] Failed to set context:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get Context
 */
export function getContext() {
  return { ...globalContext };
}

/**
 * Update Context (partial)
 */
export function updateContext(partialContext) {
  const previousContext = { ...globalContext };
  Object.assign(globalContext, partialContext);
  
  // Save to storage if structural changes
  if (partialContext.currentYear || partialContext.currentSemester) {
    saveContextToStorage();
  }
  
  // Notify if significant changes
  if (partialContext.currentRooms) {
    notifyListeners('contextChange', { 
      year: globalContext.currentYear,
      semester: globalContext.currentSemester,
      rooms: globalContext.currentRooms
    });
  }
  
  return { ok: true, previous: previousContext, current: globalContext };
}

/**
 * Reset Context
 */
export function resetContext() {
  console.log('[GlobalContext] Resetting context');
  
  const defaultContext = {
    currentYear: null,
    currentSemester: null,
    availableYears: globalContext.availableYears, // Keep available data
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

// Load rooms for current year
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

// =============================================================================
// CONTEXT PERSISTENCE
// =============================================================================

/**
 * Save Context To Storage
 */
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

/**
 * Load Context From Storage
 */
export function loadContextFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTEXT);
    if (!stored) return null;
    
    const parsedContext = JSON.parse(stored);
    
    // Check if context is not too old (24 hours)
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

/**
 * Clear Stored Context
 */
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

/**
 * Is Context Valid
 */
export function isContextValid(storedContext) {
  if (!storedContext) return false;
  
  return (
    storedContext.currentYear &&
    typeof storedContext.currentYear === 'number' &&
    storedContext.currentYear >= 2500 &&
    storedContext.currentYear <= 3000 &&
    storedContext.currentSemester &&
    typeof storedContext.currentSemester === 'object'
  );
}

// =============================================================================
// CONTEXT VALIDATION
// =============================================================================

/**
 * Validate Year
 */
export function validateYear(year) {
  if (!year || typeof year !== 'number') {
    return { ok: false, error: 'Year must be a number' };
  }
  
  if (year < 2500 || year > 3000) {
    return { ok: false, error: 'Year must be between 2500-3000' };
  }
  
  const availableYear = globalContext.availableYears.find(y => y.year === year);
  if (!availableYear) {
    return { ok: false, error: `Year ${year} not available` };
  }
  
  return { ok: true, year: availableYear };
}

/**
 * Validate Semester
 */
export function validateSemester(semesterId, year) {
  if (!semesterId) {
    return { ok: false, error: 'Semester ID is required' };
  }
  
  // Find semester in available semesters or load from data
  let semester = globalContext.availableSemesters.find(s => s.id === semesterId);
  
  if (!semester) {
    // Try to find in mock data
    const mockData = dataService.mockData || {};
    semester = mockData.semesters?.find(s => s.id === semesterId);
  }
  
  if (!semester) {
    return { ok: false, error: `Semester ${semesterId} not found` };
  }
  
  // Validate semester belongs to year if year is provided
  if (year) {
    const yearData = globalContext.availableYears.find(y => y.year === year);
    if (yearData && semester.academic_year_id !== yearData.id) {
      return { ok: false, error: `Semester ${semesterId} does not belong to year ${year}` };
    }
  }
  
  return { ok: true, semester };
}

/**
 * Validate User Access
 */
export function validateUserAccess(year, userRole) {
  // Basic role validation
  const validRoles = ['teacher', 'admin'];
  if (!validRoles.includes(userRole)) {
    return { ok: false, error: 'Invalid user role' };
  }
  
  // Admin can access all years
  if (userRole === 'admin') {
    return { ok: true };
  }
  
  // Teachers can access current and recent years
  const currentYear = new Date().getFullYear() + 543; // Thai year
  const yearDiff = Math.abs(year - currentYear);
  
  if (yearDiff > 2) {
    return { ok: false, error: 'Access denied: Year too far from current' };
  }
  
  return { ok: true };
}

/**
 * Check Context Integrity
 */
export function checkContextIntegrity() {
  const issues = [];
  
  // Check current year exists
  if (globalContext.currentYear) {
    const yearValidation = validateYear(globalContext.currentYear);
    if (!yearValidation.ok) {
      issues.push(`Invalid current year: ${yearValidation.error}`);
    }
  }
  
  // Check current semester exists and matches year
  if (globalContext.currentSemester) {
    const semesterValidation = validateSemester(
      globalContext.currentSemester.id, 
      globalContext.currentYear
    );
    if (!semesterValidation.ok) {
      issues.push(`Invalid current semester: ${semesterValidation.error}`);
    }
  }
  
  // Check rooms data consistency
  if (globalContext.currentRooms.length > 0 && globalContext.currentYear) {
    // Rooms should match current year
    const expectedRoomCount = globalContext.currentRooms.length;
    if (expectedRoomCount === 0) {
      issues.push('No rooms loaded for current year');
    }
  }
  
  // Check user access
  if (globalContext.currentYear && globalContext.userRole) {
    const accessValidation = validateUserAccess(globalContext.currentYear, globalContext.userRole);
    if (!accessValidation.ok) {
      issues.push(`Access validation failed: ${accessValidation.error}`);
    }
  }
  
  const isValid = issues.length === 0;
  
  return {
    isValid,
    issues,
    context: globalContext
  };
}

/**
 * Validate Context (combined validation)
 */
export async function validateContext(year, semesterId) {
  const yearValidation = validateYear(year);
  if (!yearValidation.ok) return yearValidation;
  
  const semesterValidation = validateSemester(semesterId, year);
  if (!semesterValidation.ok) return semesterValidation;
  
  const accessValidation = validateUserAccess(year, globalContext.userRole);
  if (!accessValidation.ok) return accessValidation;
  
  return {
    ok: true,
    year: yearValidation.year,
    semester: semesterValidation.semester
  };
}

// =============================================================================
// UI SYNCHRONIZATION
// =============================================================================

/**
 * Update Context UI
 */
export function updateContextUI() {
  try {
    // Update year selector
    const yearSelector = document.getElementById('year-selector');
    if (yearSelector) {
      updateYearSelector(globalContext.availableYears);
      yearSelector.value = globalContext.currentYear || '';
    }
    
    // Update semester selector
    const semesterSelector = document.getElementById('semester-selector');
    if (semesterSelector) {
      updateSemesterSelector(globalContext.availableSemesters);
      semesterSelector.value = globalContext.currentSemester?.id || '';
    }
    
    // Update context display
    const contextDisplay = document.getElementById('context-display');
    if (contextDisplay) {
      const yearText = globalContext.currentYear ? `ปีการศึกษา ${globalContext.currentYear}` : 'ไม่ได้เลือกปี';
      const semesterText = globalContext.currentSemester ? globalContext.currentSemester.semester_name : 'ไม่ได้เลือกภาคเรียน';
      contextDisplay.textContent = `${yearText} | ${semesterText}`;
    }
    
    // Update loading states
    if (globalContext.isLoading) {
      showContextSwitchLoading();
    } else {
      hideContextSwitchLoading();
    }
    
    // Show error if exists
    if (globalContext.error) {
      showContextError(globalContext.error);
    } else {
      hideContextError();
    }
    
  } catch (error) {
    console.error('[GlobalContext] Failed to update UI:', error);
  }
}

/**
 * Update Year Selector
 */
export function updateYearSelector(availableYears) {
  const yearSelector = document.getElementById('year-selector');
  if (!yearSelector) return;
  
  yearSelector.innerHTML = '<option value="">เลือกปีการศึกษา</option>';
  
  availableYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year.year;
    option.textContent = `ปีการศึกษา ${year.year}`;
    option.selected = year.year === globalContext.currentYear;
    yearSelector.appendChild(option);
  });
}

/**
 * Update Semester Selector
 */
export function updateSemesterSelector(availableSemesters) {
  const semesterSelector = document.getElementById('semester-selector');
  if (!semesterSelector) return;
  
  semesterSelector.innerHTML = '<option value="">เลือกภาคเรียน</option>';
  
  availableSemesters.forEach(semester => {
    const option = document.createElement('option');
    option.value = semester.id;
    option.textContent = semester.semester_name;
    option.selected = semester.id === globalContext.currentSemester?.id;
    semesterSelector.appendChild(option);
  });
}

/**
 * Show Context Switch Loading
 */
export function showContextSwitchLoading() {
  globalContext.isLoading = true;
  
  const loadingElement = document.getElementById('context-loading');
  if (loadingElement) {
    loadingElement.style.display = 'block';
  }
  
  // Disable selectors
  const yearSelector = document.getElementById('year-selector');
  const semesterSelector = document.getElementById('semester-selector');
  
  if (yearSelector) yearSelector.disabled = true;
  if (semesterSelector) semesterSelector.disabled = true;
}

/**
 * Hide Context Switch Loading
 */
export function hideContextSwitchLoading() {
  globalContext.isLoading = false;
  
  const loadingElement = document.getElementById('context-loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
  
  // Enable selectors
  const yearSelector = document.getElementById('year-selector');
  const semesterSelector = document.getElementById('semester-selector');
  
  if (yearSelector) yearSelector.disabled = false;
  if (semesterSelector) semesterSelector.disabled = false;
}

// Helper UI functions
function showContextError(error) {
  const errorElement = document.getElementById('context-error');
  if (errorElement) {
    errorElement.textContent = error;
    errorElement.style.display = 'block';
  }
}

function hideContextError() {
  const errorElement = document.getElementById('context-error');
  if (errorElement) {
    errorElement.style.display = 'none';
  }
}

// =============================================================================
// CONTEXT SWITCHING LOGIC
// =============================================================================

/**
 * Switch Context
 */
export async function switchContext(newYear, newSemesterId) {
  try {
    showContextSwitchLoading();
    
    console.log(`[GlobalContext] Switching context to ${newYear}/${newSemesterId}`);
    
    // Validate new context
    const validation = await validateContext(newYear, newSemesterId);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    
    // Update context
    const result = await setContext(newYear, newSemesterId);
    if (!result.ok) {
      throw new Error(result.error);
    }
    
    // Load rooms for new year
    const rooms = await dataService.getRooms();
    if (rooms.ok) {
      updateContext({ currentRooms: rooms.data });
    }
    
    // Clear relevant caches
    await clearContextCaches();
    
    // Reload data for new context
    await loadContextData();
    
    // Update UI
    updateContextUI();
    
    // Notify listeners
    notifyContextChange();
    
    console.log(`[GlobalContext] Context switched successfully`);
    return { ok: true };
    
  } catch (error) {
    console.error('[GlobalContext] Context switch failed:', error);
    handleContextError(error);
    return { ok: false, error: error.message };
  } finally {
    hideContextSwitchLoading();
  }
}

// Helper functions for context switching
async function clearContextCaches() {
  // Clear data service cache
  if (dataService.clearCache) {
    dataService.clearCache();
  }
}

async function loadContextData() {
  if (globalContext.currentYear && globalContext.currentSemester) {
    // Preload semester data
    await dataService.loadSemesterData(globalContext.currentSemester.id);
  }
}

function notifyContextChange() {
  notifyListeners('contextChange', {
    year: globalContext.currentYear,
    semester: globalContext.currentSemester,
    rooms: globalContext.currentRooms
  });
}

function handleContextError(error) {
  globalContext.error = error.message;
  notifyListeners('contextError', error);
  updateContextUI();
}

// =============================================================================
// EVENT MANAGEMENT
// =============================================================================

/**
 * On Context Change
 */
export function onContextChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  contextListeners.contextChange.push(callback);
  
  return () => {
    const index = contextListeners.contextChange.indexOf(callback);
    if (index > -1) {
      contextListeners.contextChange.splice(index, 1);
    }
  };
}

/**
 * On Year Change
 */
export function onYearChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  contextListeners.yearChange.push(callback);
  
  return () => {
    const index = contextListeners.yearChange.indexOf(callback);
    if (index > -1) {
      contextListeners.yearChange.splice(index, 1);
    }
  };
}

/**
 * On Semester Change
 */
export function onSemesterChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  contextListeners.semesterChange.push(callback);
  
  return () => {
    const index = contextListeners.semesterChange.indexOf(callback);
    if (index > -1) {
      contextListeners.semesterChange.splice(index, 1);
    }
  };
}

/**
 * On Context Error
 */
export function onContextError(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  contextListeners.contextError.push(callback);
  
  return () => {
    const index = contextListeners.contextError.indexOf(callback);
    if (index > -1) {
      contextListeners.contextError.splice(index, 1);
    }
  };
}

/**
 * Notify Listeners
 */
function notifyListeners(eventType, data) {
  const listeners = contextListeners[eventType] || [];
  listeners.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`[GlobalContext] Error in ${eventType} listener:`, error);
    }
  });
}

// Setup event listeners for services
function setupContextEventListeners() {
  // Listen to year service events
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
    // Update current rooms if affects current year
    if (data.toYear === globalContext.currentYear || data.fromYear === globalContext.currentYear) {
      loadRoomsForCurrentYear();
    }
  });
}

// =============================================================================
// INTEGRATION HELPERS
// =============================================================================

/**
 * Context Aware Component
 */
export function contextAwareComponent(component) {
  // Enhance component with context awareness
  if (typeof component === 'function') {
    const enhancedComponent = function(...args) {
      const context = getContext();
      return component.call(this, context, ...args);
    };
    
    // Add context methods to component
    enhancedComponent.getContext = getContext;
    enhancedComponent.updateContext = updateContext;
    enhancedComponent.onContextChange = onContextChange;
    
    return enhancedComponent;
  }
  
  // For object-based components
  if (typeof component === 'object' && component !== null) {
    component.getContext = getContext;
    component.updateContext = updateContext;
    component.onContextChange = onContextChange;
    
    // Auto-update when context changes
    component._contextUnsubscribe = onContextChange((newContext) => {
      if (typeof component.onContextUpdate === 'function') {
        component.onContextUpdate(newContext);
      }
    });
    
    return component;
  }
  
  throw new Error('Component must be a function or object');
}

/**
 * Use Global Context Hook
 */
export function useGlobalContext() {
  const context = getContext();
  
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

/**
 * With Context Higher Order Function
 */
export function withContext(component) {
  return contextAwareComponent(component);
}

/**
 * Context Provider Utility
 */
export function createContextProvider(initialContext = {}) {
  // Override global context with provided values
  const savedContext = { ...globalContext };
  Object.assign(globalContext, initialContext);
  
  return {
    getContext,
    updateContext,
    restore: () => {
      Object.assign(globalContext, savedContext);
    }
  };
}

/**
 * Context Debug Helper
 */
export function debugContext() {
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
      hasStoredContext: !!localStorage.getItem(STORAGE_KEYS.CONTEXT),
      storedContext: loadContextFromStorage()
    }
  };
}

// Export for debugging and external access
export { globalContext };

// Initialize context when module loads
if (typeof window !== 'undefined') {
  // Auto-initialize in browser environment
  setTimeout(() => {
    initGlobalContext();
  }, 0);
}