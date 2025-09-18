/**
 * Global Context Management System for Multi-Year School Schedule System
 * Features: Centralized state, Context persistence, UI sync, Real API integration
 */

import coreAPI from '../api/core-api.js';
import authAPI from '../api/auth-api.js';
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
    
    // Set loading state
    globalContext.isLoading = true;
    globalContext.error = null;
    
    // Check if user is authenticated - only load real data if logged in
    const isAuthenticated = authAPI.isAuthenticated();
    console.log('[GlobalContext] Authentication status:', isAuthenticated);
    
    if (isAuthenticated) {
      // Load from backend API
      await loadContextFromAPI();
    } else {
      // Load from storage or use fallback
      const storedContext = loadContextFromStorage();
      if (storedContext && isContextValid(storedContext)) {
        Object.assign(globalContext, storedContext);
        console.log('[GlobalContext] Loaded context from storage:', storedContext);
      } else {
        // Set fallback context
        setFallbackContext();
      }
    }
    
    // Clear loading state
    globalContext.isLoading = false;
    
    // Update UI with current context
    updateContextUI();
    
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

/**
 * Load context from backend API (NEW)
 */
async function loadContextFromAPI() {
  try {
    console.log('[GlobalContext] Loading context from backend API...');
    
    // 1. Load academic years
    const yearsResult = await coreAPI.getAcademicYears();
    console.log('[GlobalContext] Years API full response:', yearsResult); // DEBUG
    
    if (yearsResult.success && yearsResult.data) {
      globalContext.availableYears = yearsResult.data;
      console.log('[GlobalContext] Loaded years from API:', yearsResult.data.length, 'years');
      console.log('[GlobalContext] Years data:', yearsResult.data); // DEBUG
    } else {
      console.warn('[GlobalContext] No academic years found or API failed');
      console.warn('[GlobalContext] Years result details:', yearsResult); // DEBUG
      globalContext.availableYears = [];
    }
    
    // 2. If we have years, load semesters for selected year
    globalContext.availableSemesters = []; // Reset semesters
    
    if (globalContext.availableYears.length > 0) {
      // Find active year or use latest
      const activeYear = globalContext.availableYears.find(y => y.is_active) || 
                        globalContext.availableYears.reduce((latest, y) => y.year > latest.year ? y : latest);
      
      console.log('[GlobalContext] Selected active year:', activeYear); // DEBUG
      
      if (activeYear) {
        const semestersResult = await coreAPI.getSemesters(activeYear.year);
        console.log('[GlobalContext] Semesters API response:', semestersResult); // DEBUG
        
        if (semestersResult.success && semestersResult.data && semestersResult.data.length > 0) {
          globalContext.availableSemesters = semestersResult.data;
          console.log('[GlobalContext] Loaded semesters from API:', semestersResult.data.length, 'semesters');
          console.log('[GlobalContext] Semesters data:', semestersResult.data); // DEBUG
          
          // Set current context
          const activeSemester = globalContext.availableSemesters.find(s => s.is_active) ||
                                globalContext.availableSemesters[0];
          
          if (activeSemester) {
            globalContext.currentYear = activeYear.year;
            globalContext.currentSemester = activeSemester;
            console.log('[GlobalContext] Set active context:', activeYear.year, activeSemester.semester_name || activeSemester.name);
          }
        } else {
          console.log('[GlobalContext] No semesters found for active year:', activeYear.year);
          console.log('[GlobalContext] Semesters API response:', semestersResult);
          // Don't set current year if no semesters exist
          globalContext.availableSemesters = [];
        }
      }
    }
    
    // 3. Final state - clear context if no valid data
    if (!globalContext.currentYear || !globalContext.currentSemester || globalContext.availableSemesters.length === 0) {
      console.log('[GlobalContext] No valid context found - clearing state');
      globalContext.currentYear = null;
      globalContext.currentSemester = null;
      globalContext.availableSemesters = [];
    }
    
  } catch (error) {
    console.error('[GlobalContext] Error loading from API:', error);
    throw error;
  }
}

/**
 * Set fallback context when no data available
 */
function setFallbackContext() {
  console.log('[GlobalContext] Setting fallback context');
  globalContext.currentYear = null;
  globalContext.currentSemester = null;
  globalContext.availableYears = [];
  globalContext.availableSemesters = [];
  globalContext.currentRooms = [];
}

/**
 * Refresh Context from Backend (NEW)
 */
export async function refreshContextFromBackend() {
  try {
    console.log('[GlobalContext] Refreshing context from backend...');
    
    if (!authAPI.isAuthenticated()) {
      console.log('[GlobalContext] Not authenticated, skipping backend refresh');
      return { ok: false, error: 'Not authenticated' };
    }
    
    // Load fresh data from backend
    await loadContextFromAPI();
    
    // Update UI with refreshed data
    updateContextUI();
    
    console.log('[GlobalContext] Context refreshed from backend successfully');
    return { ok: true, context: globalContext };
    
  } catch (error) {
    console.error('[GlobalContext] Failed to refresh context from backend:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Set Context - NEW: Use real API
 */
export async function setContext(year, semesterId) {
  try {
    const previousYear = globalContext.currentYear;
    const previousSemester = globalContext.currentSemester;
    
    console.log(`[GlobalContext] Setting context to ${year}/${semesterId}`);
    
    // Find semester from available data
    const actualSemester = globalContext.availableSemesters.find(s => s.id === semesterId);
    
    if (!actualSemester && semesterId) {
      console.warn(`[GlobalContext] Semester ${semesterId} not found in available data`);
      return { ok: false, error: `Semester ${semesterId} not found` };
    }
    
    // Update context
    globalContext.currentYear = year;
    globalContext.currentSemester = actualSemester;
    
    // Call backend API to set active context if authenticated
    if (authAPI.isAuthenticated() && year && semesterId) {
      try {
        // Set active year
        const setActiveYearResult = await coreAPI.setActiveAcademicYear(year);
        if (!setActiveYearResult.success) {
          console.warn('[GlobalContext] Failed to set active year on backend:', setActiveYearResult.error);
        }
        
        // Set active semester  
        const setActiveSemesterResult = await coreAPI.setActiveSemester(year, semesterId);
        if (!setActiveSemesterResult.success) {
          console.warn('[GlobalContext] Failed to set active semester on backend:', setActiveSemesterResult.error);
        }
        
        console.log('[GlobalContext] Backend context updated successfully');
      } catch (apiError) {
        console.warn('[GlobalContext] Failed to update backend context:', apiError);
        // Continue anyway - don't fail the entire operation
      }
    }
    
    // Save to storage
    saveContextToStorage({
      currentYear: year,
      currentSemester: globalContext.currentSemester,
      timestamp: Date.now()
    });
    
    // Update UI
    updateContextUI();
    
    // Notify listeners
    notifyContextChange({
      currentYear: year,
      currentSemester: globalContext.currentSemester,
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
  
  // Find semester in available semesters ONLY (NO fallback to mock data)
  let semester = globalContext.availableSemesters.find(s => s.id === semesterId);
  
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
 * Update Context UI (FIXED - ไม่ override user selection)
 */
export function updateContextUI() {
  try {
    console.log('[GlobalContext] Updating UI with context:', globalContext);
    
    // Update year selector
    const yearSelector = document.getElementById('year-selector');
    if (yearSelector) {
      const userIsSelecting = document.activeElement === yearSelector;
      
      updateYearSelector(globalContext.availableYears);
      
      if (!userIsSelecting && yearSelector.value !== String(globalContext.currentYear || '')) {
        yearSelector.value = globalContext.currentYear || '';
        console.log('[GlobalContext] Set year selector to:', globalContext.currentYear);
      }
    }
    
    // Update semester selector
    const semesterSelector = document.getElementById('semester-selector');
    if (semesterSelector) {
      const userIsSelecting = document.activeElement === semesterSelector;
      
      updateSemesterSelector(globalContext.availableSemesters);
      
      if (!userIsSelecting && semesterSelector.value !== String(globalContext.currentSemester?.id || '')) {
        semesterSelector.value = globalContext.currentSemester?.id || '';
        console.log('[GlobalContext] Set semester selector to:', globalContext.currentSemester?.id);
      }
    }
    
    // Update context display - FIX: ใช้ textContent แทน innerHTML
    const contextDisplay = document.getElementById('context-display');
    if (contextDisplay) {
      const yearText = globalContext.currentYear ? `ปีการศึกษา ${globalContext.currentYear}` : 'ไม่ได้เลือกปี';
      const semesterText = globalContext.currentSemester ? globalContext.currentSemester.semester_name : 'ไม่ได้เลือกภาคเรียน';
      contextDisplay.textContent = `${yearText} | ${semesterText}`; // FIX: ใช้ textContent
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
 * Update Year Selector - NEW: Handle empty state + DEBUG
 */
export function updateYearSelector(availableYears) {
  const yearSelector = document.getElementById('year-selector');
  if (!yearSelector) {
    console.warn('[GlobalContext] Year selector element not found!');
    return;
  }
  
  console.log('[GlobalContext] Updating year selector. Available years:', availableYears.length);
  
  // Clear options safely
  yearSelector.innerHTML = '';
  
  // Add default option based on data availability
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  
  if (availableYears.length === 0) {
    defaultOption.textContent = 'ไม่มีปีการศึกษา - เพิ่มใหม่ในหน้าแอดมิน';
    defaultOption.disabled = true;
    console.log('[GlobalContext] Setting empty state message for year selector');
  } else {
    defaultOption.textContent = 'เลือกปีการศึกษา';
    console.log('[GlobalContext] Setting normal default message for year selector');
  }
  
  yearSelector.appendChild(defaultOption);
  
  // Add year options
  availableYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year.year;
    option.textContent = `ปีการศึกษา ${year.year}${year.is_active ? ' (ใช้งาน)' : ''}`;
    option.selected = year.year === globalContext.currentYear;
    yearSelector.appendChild(option);
  });
  
  // Force update the display value
  yearSelector.value = globalContext.currentYear || '';
  
  console.log('[GlobalContext] Updated year selector. Final value:', yearSelector.value);
  console.log('[GlobalContext] Year selector options count:', yearSelector.options.length);
  console.log('[GlobalContext] Current selected text:', yearSelector.options[yearSelector.selectedIndex]?.textContent);
}

/**
 * Update Semester Selector - FIXED: Force rebuild when empty
 */
export function updateSemesterSelector(availableSemesters) {
  const semesterSelector = document.getElementById('semester-selector');
  if (!semesterSelector) {
    console.warn('[GlobalContext] Semester selector element not found!');
    return;
  }
  
  console.log('[GlobalContext] Updating semester selector. Current year:', globalContext.currentYear);
  
  const currentValue = semesterSelector.value;
  const userIsSelecting = document.activeElement === semesterSelector;
  
  // Filter semesters for current year
  const currentYearData = globalContext.availableYears.find(y => y.year === globalContext.currentYear);
  const filteredSemesters = currentYearData ? 
    availableSemesters.filter(semester => semester.academic_year_id === currentYearData.id) :
    [];
  
  console.log('[GlobalContext] Filtering semesters for year:', globalContext.currentYear, 'Found:', filteredSemesters.length);
  
  // FORCE rebuild when no year selected or when semester options are wrong
  const currentOptions = Array.from(semesterSelector.options);
  const hasWrongDefaultOption = currentOptions.some(opt => 
    opt.textContent === 'กำลังโหลด...' || 
    opt.textContent.includes('กำลังโหลด')
  );
  
  const needsRebuild = hasWrongDefaultOption || 
    (!globalContext.currentYear && !currentOptions.some(opt => opt.textContent.includes('เลือกปีการศึกษาก่อน'))) ||
    currentOptions.length !== (filteredSemesters.length + 1);
  
  console.log('[GlobalContext] Rebuild needed:', needsRebuild, 'hasWrongDefaultOption:', hasWrongDefaultOption);
  
  // Rebuild when necessary and user is not selecting
  if (needsRebuild && !userIsSelecting) {
    console.log('[GlobalContext] Rebuilding semester selector options');
    
    // Clear options safely
    semesterSelector.innerHTML = '';
    
    // Add default option based on data availability
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    
    if (!globalContext.currentYear) {
      defaultOption.textContent = 'เลือกปีการศึกษาก่อน';
      defaultOption.disabled = true;
      console.log('[GlobalContext] Setting "select year first" message for semester selector');
    } else if (filteredSemesters.length === 0) {
      defaultOption.textContent = 'ไม่มีภาคเรียน - เพิ่มใหม่ในหน้าแอดมิน';
      defaultOption.disabled = true;
      console.log('[GlobalContext] Setting empty semester message for semester selector');
    } else {
      defaultOption.textContent = 'เลือกภาคเรียน';
      console.log('[GlobalContext] Setting normal default message for semester selector');
    }
    
    semesterSelector.appendChild(defaultOption);
    
    // Add semester options
    filteredSemesters.forEach(semester => {
      const option = document.createElement('option');
      option.value = semester.id;
      const semesterName = semester.name || semester.semester_name;
      option.textContent = `${semesterName}${semester.is_active ? ' (ใช้งาน)' : ''}`;
      semesterSelector.appendChild(option);
    });
    
    // Restore value
    const valueToSet = currentValue || (globalContext.currentSemester?.id ? String(globalContext.currentSemester.id) : '');
    if (valueToSet && semesterSelector.querySelector(`option[value="${valueToSet}"]`)) {
      semesterSelector.value = valueToSet;
      console.log('[GlobalContext] Restored semester selector value to:', valueToSet);
    } else if (globalContext.currentSemester?.id) {
      semesterSelector.value = globalContext.currentSemester.id;
      console.log('[GlobalContext] Set semester selector value to:', globalContext.currentSemester.id);
    } else {
      semesterSelector.value = '';
    }
    
    console.log('[GlobalContext] Updated semester selector. Options count:', semesterSelector.options.length);
    console.log('[GlobalContext] Final semester value:', semesterSelector.value);
    console.log('[GlobalContext] Selected semester text:', semesterSelector.options[semesterSelector.selectedIndex]?.textContent);
  } else if (!needsRebuild) {
    console.log('[GlobalContext] Semester selector rebuild not needed');
  } else {
    console.log('[GlobalContext] User is selecting, skipping rebuild');
  }
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

// Remove auto-initialize - let app.js control initialization