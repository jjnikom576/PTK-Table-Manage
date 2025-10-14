/**
 * Enhanced Student Schedule Page for Multi-Year School Schedule System
 * Features: Context-aware loading, Room information, Export functionality
 */

import * as dataService from '../services/dataService.js';
import * as globalContext from '../context/globalContext.js';
import coreAPI from '../api/core-api.js';
import { exportTableToCSV, exportTableToXLSX, exportTableToGoogleSheets } from '../utils/export.js';
import { formatRoomName, getRoomTypeBadgeClass, getThaiDayName, getDisplayPeriods, getDisplayPeriodsAsync, getLunchSlot, getLunchSlotAsync, isActiveSemester } from '../utils.js';

// =============================================================================
// EXPORT FUNCTIONS (NEW)
// =============================================================================

/**
 * Refresh page data without resetting UI (NEW)
 */
export async function refreshPage(newContext, preserveSelection = null) {
  console.log('[StudentSchedule] Refreshing page data with context:', newContext);
  
  try {
    // ⭐ FIX: ลด cache clearing - เพียง clear 1 ครั้ง
    console.log('[StudentSchedule] Refreshing page data with context:', newContext);
    
    // Refresh class selector while preserving selection
    await refreshClassSelector(newContext, preserveSelection);
    
    // If there was a selection, reload that schedule
    if (preserveSelection) {
      console.log('[StudentSchedule] Reloading schedule for preserved selection:', preserveSelection);
      // ⭐ FIX: Use correct function name
      const classDropdown = document.querySelector('#class-dropdown');
      if (classDropdown && preserveSelection) {
        classDropdown.value = preserveSelection;
        const changeEvent = new Event('change', { bubbles: true });
        classDropdown.dispatchEvent(changeEvent);
      }
    }
    
    console.log('[StudentSchedule] Page refresh completed successfully');
    
  } catch (error) {
    console.error('[StudentSchedule] Error refreshing page:', error);
  }
}

/**
 * Refresh class selector (EXPORTED)
 */
export async function refreshClassSelector(context = null, preserveSelection = null) {
  console.log('[StudentSchedule] Refreshing class selector');
  
  const currentContext = context || globalContext.getContext();
  
  // Find class selector
  const selectors = ['#class-dropdown', '#class-selector', '.class-selector', '[data-class-selector]'];
  let classSelector = null;
  
  for (const sel of selectors) {
    classSelector = document.querySelector(sel);
    if (classSelector) {
      console.log(`Found class selector with: ${sel}`);
      break;
    }
  }
  
  if (!classSelector) {
    console.warn('Class selector not found');
    return;
  }
  // Bind change event to use renderer (avoid external bindings)
  if (!classSelector.dataset.bound) {
    classSelector.addEventListener('change', async (e) => {
      const val = e.target.value;
      console.log('[StudentSchedule] Class changed:', val);
      // Hide empty state immediately when a class is chosen
      if (val) {
        const emptyState = document.getElementById('student-empty-state');
        if (emptyState) emptyState.style.display = 'none';
      }
      // ⭐ FIX: Use the same context as the class selector
      await loadScheduleForContext(val, currentContext);
    });
    classSelector.dataset.bound = 'true';
  }
  
  // Get fresh classes data with current context
  const result = await dataService.getClasses(currentContext.currentYear, currentContext.currentSemester?.id || currentContext.semester?.id || currentContext.semesterId);
  
  let classes = [];
  if (result.ok && result.data.length > 0) {
    // ⭐ FIX: แสดงทุกระดับชั้น (ม.1–ม.6) และลบ duplicate ตาม class_name
    const uniqueClasses = new Map();
    result.data.forEach(cls => {
      const key = cls.class_name;
      if (!uniqueClasses.has(key)) {
        uniqueClasses.set(key, cls);
      }
    });
    classes = Array.from(uniqueClasses.values())
      .sort((a, b) => a.class_name.localeCompare(b.class_name, 'th'));
    console.log('[StudentSchedule] ✅ Filtered unique classes from dataService:', classes.map(c => `${c.grade_level} ${c.class_name}`));
  } else {
    // Fallback: ใช้ mock data โดยตรงเหมือน navigation.js
    console.warn('[StudentSchedule] No classes from service, using mock data fallback');
    const { mockData } = await import('../data/index.js');
    
    let allClasses = [];
    [2566, 2567, 2568].forEach(year => {
      if (mockData[year] && mockData[year].classes) {
        allClasses = allClasses.concat(mockData[year].classes);
      }
    });
    
    // กรองเฉพาะ ม.1 และลบ duplicate
    const uniqueClasses = new Map();
    
    allClasses.forEach(cls => {
      const key = cls.class_name;
      if (!uniqueClasses.has(key)) {
        uniqueClasses.set(key, cls);
      }
    });
    
    classes = Array.from(uniqueClasses.values())
      .sort((a, b) => a.class_name.localeCompare(b.class_name));
  }
  console.log('Got classes for refresh:', classes.map(c => c.class_name));
  
  // Update selector options
  const currentSelection = preserveSelection || classSelector.value;
  classSelector.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
  
  classes.forEach(cls => {
    const option = document.createElement('option');
    option.value = cls.id; // ใช้ id เป็นค่าอ้างอิงหลัก
    // option.textContent = `${cls.class_name} (${cls.student_count || 0} คน)`;
    option.textContent = `${cls.class_name}`;
    classSelector.appendChild(option);
  });
  
  // ⭐ FIX: Auto-select first class เมื่อ page load ครั้งแรก
  // Restore selection if possible
  if (currentSelection && classSelector.querySelector(`option[value="${currentSelection}"]`)) {
    classSelector.value = currentSelection;
    console.log('Restored class selection:', currentSelection);
    
    // เฉพาะตอนที่ restore selection จึง trigger event
    setTimeout(() => {
      const changeEvent = new Event('change', { bubbles: true });
      classSelector.dispatchEvent(changeEvent);
      
      // ⭐ FIX: Force load schedule if event doesn't work for restored selection
      setTimeout(async () => {
        const selectedClassId = classSelector.value;
        if (selectedClassId && selectedClassId !== '') {
          console.log('Force loading restored schedule for class:', selectedClassId);
          await loadScheduleForContext(selectedClassId, currentContext);
        }
      }, 200);
    }, 100);
  } else if (!preserveSelection && classes.length > 0) {
    // ⭐ FIX: Auto-select first class เมื่อไม่มี selection เดิม
    const firstClass = classes[0];
    classSelector.value = String(firstClass.id);
    console.log('[StudentSchedule] ✅ Auto-selected first class (by id):', firstClass.class_name, firstClass.id);
    
    // Trigger change event เพื่อโหลด schedule
    setTimeout(() => {
      const changeEvent = new Event('change', { bubbles: true });
      classSelector.dispatchEvent(changeEvent);
      
      // ⭐ FIX: Force load schedule if event doesn't trigger properly
      setTimeout(async () => {
        const selectedClassId = classSelector.value;
        if (selectedClassId && selectedClassId !== '') {
          console.log('Force loading schedule for class:', selectedClassId);
          // ใช้ loadScheduleForContext แทน window.loadScheduleForClass เพื่อป้องกัน DOM replace
          await loadScheduleForContext(selectedClassId, currentContext);
        }
      }, 200);
    }, 100);
  } else {
    // กรณีอื่นๆ ไม่ auto-select
    console.log('No previous selection, staying at default option');
  }
  
  console.log('Class selector refreshed with', classes.length, 'classes');
}

// =============================================================================
// PAGE STATE
// =============================================================================

let pageState = {
  currentSchedule: null,
  selectedClass: null,
  availableClasses: [],
  isLoading: false,
  error: null
};

// =============================================================================
// CONTEXT INTEGRATION
// =============================================================================

/**
 * Initialize Student Schedule Page
 */
export async function initStudentSchedulePage(context) {
  console.log('[StudentSchedule] Initializing page with context:', context);
  
  try {
    // ⭐ FIX: Use context directly without extra validation
    const currentContext = context || globalContext.getContext();
    
    // ⭐ FIX: Ensure consistent context - use the latest global context
    if (!currentContext.year || !currentContext.semesterId) {
      console.warn('Context missing year/semesterId, using latest global context');
      const latestContext = globalContext.getContext();
      currentContext.year = latestContext.currentYear;
      currentContext.currentYear = latestContext.currentYear; 
      currentContext.semesterId = latestContext.currentSemester?.id;
      currentContext.currentSemester = latestContext.currentSemester;
      console.log('[StudentSchedule] Updated context:', currentContext);
    }
    
    // ⭐ FIX: Set DataService context to match student schedule context (if function exists)
    if (typeof dataService.setGlobalContext === 'function') {
      await dataService.setGlobalContext(
        currentContext.currentYear || currentContext.year,
        currentContext.currentSemester?.id || currentContext.semesterId
      );
      console.log('[StudentSchedule] Set DataService context for initialization');
    } else {
      console.warn('[StudentSchedule] dataService.setGlobalContext not available');
    }
    
    console.log('[StudentSchedule] Final context for initialization:', currentContext);
    
    // Render page components
    await renderContextControls(currentContext);

// Load available classes
    await loadAvailableClasses(currentContext);
    
    // ⭐ FIX: Move refresh to AFTER DOM setup
    // setTimeout(async () => {
    //   await refreshClassSelector(currentContext);
    // }, 100);
    
    // Setup event listeners
    setupEventListeners(currentContext);
    
    // Load initial schedule if class is selected
    const savedClass = getSavedSelectedClass();
    if (savedClass) {
      pageState.selectedClass = savedClass;
      await loadScheduleForContext(savedClass, context);
    }
    
    // Setup export handlers
    setupStudentExportHandlers(context);
    
    console.log('[StudentSchedule] Page initialized successfully');
    
    // ⭐ FIX: Re-setup event listeners + refresh selector after page clear
    setTimeout(async () => {
      console.log('Re-setting up event listeners...');
      setupEventListeners(currentContext);  // Re-setup lost listeners
      await refreshClassSelector(currentContext);  // Then refresh selector
      
      // ⭐ FIX: Force load schedule if auto-select doesn't trigger properly  
      setTimeout(async () => {
        const classSelector = document.querySelector('#class-selector') || document.querySelector('.class-selector');
        const selectedClassId = classSelector?.value;
        const hasScheduleTable = document.querySelector('.schedule-table') !== null;
        
        if (selectedClassId && selectedClassId !== '' && !hasScheduleTable) {
          console.log('[StudentSchedule] 🔥 FORCE Loading schedule for class:', selectedClassId, '(auto-select failed)');
          // ใช้ loadScheduleForContext แทน window.loadScheduleForClass กับ current context
          await loadScheduleForContext(selectedClassId, currentContext);
        } else if (selectedClassId && hasScheduleTable) {
          console.log('[StudentSchedule] ✅ Auto-select worked, schedule already loaded for class:', selectedClassId);
        } else {
          console.log('[StudentSchedule] 👍 No class selected yet, waiting for user action');
        }
      }, 500);
    }, 300);
    
  } catch (error) {
    console.error('[StudentSchedule] Failed to initialize page:', error);
    showError(error.message);
  }
}

/**
 * Update Page For Context
 */
export async function updatePageForContext(newContext) {
  console.log('[StudentSchedule] Updating page for new context:', newContext);
  
  try {
    // Update context controls
    await renderContextControls(newContext);
    
    // Reload available classes
    await loadAvailableClasses(newContext);
    
    // Reload current schedule if class is selected
    if (pageState.selectedClass) {
      await loadScheduleForContext(pageState.selectedClass, newContext);
    }
    
  } catch (error) {
    console.error('[StudentSchedule] Failed to update page:', error);
    showError(error.message);
  }
}

/**
 * Load Schedule For Context
 */
export async function loadScheduleForContext(classRef, context) {
  // Prefer API timetable by selected context (public, no login required)
  try {
    const year = context?.currentYear;
    const semesterId = context?.currentSemester?.id;
    if (year && semesterId) {
      const apiRes = await coreAPI.getTimetableBy(year, semesterId, true);
      if (apiRes && apiRes.success) {
        const cached = coreAPI.getCachedTimetable && coreAPI.getCachedTimetable();
        if (cached) {
          if (cached.list && Array.isArray(cached.list)) {
            // Build matrix from list (mock-compatible)
            const matrix = {};
            for (let d = 1; d <= 7; d++) { matrix[d] = {}; for (let p = 1; p <= 12; p++) { matrix[d][p] = null; } }
            cached.list.forEach(item => {
              const day = item.day_of_week;
              const period = item.period || item.period_no;
              if (!day || !period) return;
              matrix[day] = matrix[day] || {};
              const cell = {
                subject: { subject_name: item.subject_name || '' },
                teacher: { name: item.teacher_name || '' },
                room: { name: item.room_name || '' },
                class: { name: item.class_name || '' },
                raw: item
              };
              matrix[day][period] = cell;
            });
            pageState.currentSchedule = { matrix };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[StudentSchedule] Timetable API not available, fallback to existing data flow');
  }
  if (!classRef) return;

  try {
    setLoading(true);

    // Resolve class id (accept numeric ID or class name)
    let classId = null;

    // 1) If classRef is a number or numeric string, use it directly
    if (typeof classRef === 'number' || (/^\d+$/.test(String(classRef)))) {
      classId = parseInt(classRef, 10);
    }

    // 2) Try resolve by name from current cached classes
    if (!classId) {
      const byNameLocal = pageState.availableClasses.find(c => c.class_name === String(classRef));
      if (byNameLocal) classId = byNameLocal.id;
    }

    // 3) Fallback: fetch classes for the context year and resolve by id or name
    if (!classId) {
      const year = context.currentYear || context.year;
      const classesRes = await dataService.getClasses(year, context.currentSemester?.id || context.semester?.id || context.semesterId);
      if (classesRes.ok && classesRes.data?.length) {
        pageState.availableClasses = classesRes.data;

        // Prefer ID match first (supports numeric dropdown values like "63")
        const byId = classesRes.data.find(c => c.id === parseInt(String(classRef), 10));
        if (byId) {
          classId = byId.id;
        } else {
          const byName = classesRes.data.find(c => c.class_name === String(classRef));
          if (byName) classId = byName.id;
        }
      }
    }

    if (!classId || Number.isNaN(classId)) throw new Error(`ไม่พบห้องเรียน: ${classRef}`);

    // ⭐ FIX: Ensure DataService context matches before loading schedule
    console.log('[StudentSchedule] 📊 About to load schedule for classId:', classId);
    
    // Set dataService context to current year/semester
    const loadYear = context.currentYear || context.year;
    const loadSemester = context.currentSemester?.id || context.semesterId;
    console.log('[StudentSchedule] Setting DataService context for schedule load - Year:', loadYear, 'Semester:', loadSemester);
    
    // Set dataService context to current year/semester (if function exists)
    if (typeof dataService.setGlobalContext === 'function') {
      await dataService.setGlobalContext(loadYear, loadSemester);
      console.log('[StudentSchedule] DataService context set for schedule loading');
    } else {
      console.warn('[StudentSchedule] dataService.setGlobalContext not available for schedule loading');
    }
    
    // Load schedule (matrix-based) from dataService
    const result = await dataService.getStudentSchedule(classId);
    console.log('[StudentSchedule] Schedule load result:', result?.ok ? '✅ Success' : '❌ Failed', result);
    if (result && result.ok && result.data?.matrix) {
      pageState.currentSchedule = result.data;
      pageState.selectedClass = classId;

      // Render schedule
      renderScheduleHeader(result.data.classInfo?.class_name || String(classId), context);
      await renderScheduleTable(result.data, context);

      // Setup export functionality
      renderExportBar(context);
      setupExportHandlers(result.data.classInfo?.class_name || String(classId), context);

      // Highlight current period if active semester
      if (isActiveSemester(context.currentSemester)) {
        highlightCurrentPeriod(context);
      }
    } else {
      renderEmptyScheduleState(String(classRef), context);
    }

    // Save selected class
    saveSelectedClass(String(classRef));

  } catch (error) {
    console.error('[StudentSchedule] Failed to load schedule:', error);
    showError(`โหลดตารางเรียนล้มเหลว: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

/**
 * Validate Context Access
 */
export function validateContextAccess(context) {
  if (!context.currentYear) {
    return { ok: false, error: 'ไม่ได้เลือกปีการศึกษา' };
  }
  
  if (!context.currentSemester) {
    return { ok: false, error: 'ไม่ได้เลือกภาคเรียน' };
  }
  
  return { ok: true };
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

/**
 * Render Context Controls
 */
export async function renderContextControls(context) {
  const controlsContainer = document.getElementById('student-context-controls');
  if (!controlsContainer) return;
  
  controlsContainer.innerHTML = `
    <div class="page-header">
      <h2>📚 ตารางเรียน</h2>
      <div class="context-info">
        <span>ปีการศึกษา ${context.currentYear || 'ไม่ได้เลือก'}</span>
        <span class="separator">|</span>
        <span>${context.currentSemester?.semester_name || 'ไม่ได้เลือกภาคเรียน'}</span>
      </div>
    </div>
    
    <div class="class-selector-container">
      <label for="class-selector">เลือกห้องเรียน:</label>
      <select id="class-selector" class="class-selector">
        <option value="">เลือกห้องเรียน</option>
      </select>
    </div>
    
    <div id="loading-indicator" class="loading-indicator" style="display: none;">
      <div class="spinner"></div>
      <span>กำลังโหลดตารางเรียน...</span>
    </div>
    
    <div id="error-message" class="error-message" style="display: none;"></div>
  `;
}

/**
 * Render Class Selector
 */
export function renderClassSelector(availableClasses, selectedClass) {
  const classSelector = document.getElementById('class-selector');
  if (!classSelector) return;
  
  classSelector.innerHTML = '<option value="">เลือกห้องเรียน</option>';
  
  // Group classes by grade level
  const groupedClasses = groupClassesByGrade(availableClasses);
  
  Object.entries(groupedClasses).forEach(([grade, classes]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = grade;
    
    classes.forEach(cls => {
      const option = document.createElement('option');
      option.value = cls.id;
      // option.textContent = `${cls.class_name} (${cls.student_count || 'ไม่ระบุ'} คน)`;
      option.textContent = `${cls.class_name}`;
      option.selected = String(cls.id) === String(selectedClass);
      optgroup.appendChild(option);
    });
    
    classSelector.appendChild(optgroup);
  });
}

/**
 * Render Schedule Header
 */
export function renderScheduleHeader(className, context) {
  // Use the actual header element id from index.html
  const headerContainer = document.getElementById('student-schedule-header');
  if (!headerContainer) return;
  
  // Show only class title; term/year already shown in the main header
  headerContainer.innerHTML = `
    <h3 class="schedule-title centered">ตารางเรียน ${className}</h3>
  `;

  // Ensure header is visible and empty state is hidden
  headerContainer.classList.remove('hidden');
  const emptyState = document.getElementById('student-empty-state');
  if (emptyState) emptyState.style.display = 'none';
}

/**
 * Render Schedule Table
 */
export async function renderScheduleTable(resultData, context) {
  const tableContainer = getScheduleContainer();
  if (!tableContainer) return;

  const matrix = resultData?.matrix;
  if (!matrix) {
    tableContainer.innerHTML = '<p class="no-schedule">ไม่มีตารางเรียนสำหรับห้องนี้</p>';
    return;
  }

  const year = context?.currentYear || context?.year;
  const semesterId = context?.currentSemester?.id || context?.semester?.id || context?.semesterId;
  const displayPeriods = await getDisplayPeriodsAsync(year, semesterId);
  const lunchSlot = await getLunchSlotAsync(year, semesterId);
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  // Build header: วัน/เวลา | คาบ 1 | คาบ 2 | ...
  let html = '<div class="schedule-table-wrapper">';
  html += '<table class="schedule-table">';
  html += '<thead><tr>';
  html += '<th class="day-header">วัน/เวลา</th>';
  displayPeriods.forEach(({ display, actual, label }) => {
    html += `<th class="period-header"><div class="period-info"><span class="period-number">คาบ ${display}</span><span class="time-slot">${label}</span></div></th>`;
    if (actual === 4) {
      html += `<th class="lunch-header lunch-column"><div class="lunch-info">${lunchSlot.label}<br><small>${lunchSlot.time}</small></div></th>`;
    }
  });
  html += '</tr></thead>';

  // Rows: each day on its own row, columns for periods 1..8 with a lunch column between 4 and 5
  html += '<tbody>';
  days.forEach((dayName, dayIndex) => {
    const day = dayIndex + 1;
    html += `<tr class="day-row" data-day="${day}">`;
    html += `<td class="day-cell">${dayName}</td>`;

    displayPeriods.forEach(({ display, actual }) => {
      const period = actual;
      const cell = matrix[day]?.[period];
      if (cell) {
        html += `<td class="schedule-cell has-subject" data-day="${day}" data-period="${period}" data-display-period="${display}">` +
                `<div class="schedule-cell-content">` +
                `<div class="subject-name">${cell.subject?.subject_name || '-'}</div>` +
                `<div class="teacher-name">${cell.teacher?.name || ''}</div>` +
                `<div class="room-info">${cell.room?.name || ''}</div>` +
                `</div>` +
                `</td>`;
      } else {
        const emptyText = '-';
        html += `<td class="schedule-cell empty" data-day="${day}" data-period="${period}" data-display-period="${display}">` +
                `<div class="empty-cell">${emptyText}</div>` +
                `</td>`;
      }

      // Insert lunch column right after period 4 (merged across all day rows)
      if (period === 4) {
        if (dayIndex === 0) {
          // Only render once with rowspan to merge Mon-Fri
          html += `<td class="lunch-cell lunch-column" aria-label="${lunchSlot.label} ${lunchSlot.time}" rowspan="${days.length}">${lunchSlot.label}<br><small>${lunchSlot.time}</small></td>`;
        }
        // For other days, no extra cell so the rowspan cell spans over them
      }
    });
    html += '</tr>';
  });
  html += '</tbody>';
  html += '</table></div>';
  tableContainer.innerHTML = html;
  try { fitStudentTableFonts(tableContainer); } catch (e) { console.warn('[StudentSchedule] font fit failed:', e); }

  // Hide empty state when table is rendered
  const emptyState = document.getElementById('student-empty-state');
  if (emptyState) emptyState.style.display = 'none';
}

// Determine a global font size that makes all cells fit, then apply uniformly
function fitStudentTableFonts(container) {
  const subjects = container.querySelectorAll('.schedule-cell .subject-name');
  const teachers = container.querySelectorAll('.schedule-cell .teacher-name');
  const rooms = container.querySelectorAll('.schedule-cell .room-info');
  const contents = container.querySelectorAll('.schedule-cell .schedule-cell-content');
  if (!subjects.length || !contents.length) return;

  const textElements = [...subjects, ...teachers, ...rooms];

  // Helper: do all subject names fit in one line at a given font size?
  const subjectsFitAt = (px) => {
    const metaPx = Math.max(Math.round(px * 0.85), px - 2, 8);
    container.style.setProperty('--subject-font', px + 'px');
    container.style.setProperty('--schedule-meta-font', metaPx + 'px');
    // Force reflow
    void container.offsetHeight;
    let ok = true;
    textElements.forEach(el => {
      if (!ok) return;
      // Compare content width vs available width of the text line
      const margin = 4; // leave slightly larger safety margin due to padding
      const available = (el.clientWidth || (el.parentElement?.clientWidth || 0)) - margin;
      const needed = el.scrollWidth;
      if (needed - available > 1) ok = false;
    });
    // Also ensure total content height fits inside the cell height (prevents slight overlaps)
    if (ok) {
      contents.forEach(content => {
        if (!ok) return;
        const cell = content.closest('td');
        const maxH = (cell?.clientHeight || 64) - 4; // leave small breathing room
        if (content.scrollHeight > maxH) ok = false;
      });
    }
    return ok;
  };

  const maxPx = 18; // upper bound
  const minPx = 6;  // lower bound (allow smaller to avoid overlap)
  let chosen = 12;

  // Find the largest size between min..max that still fits one-line for all subjects
  for (let s = maxPx; s >= minPx; s--) {
    if (subjectsFitAt(s)) {
      chosen = s;
      break;
    }
  }

  // Apply final font values after best-fit search
  const finalSubject = chosen;
  container.style.setProperty('--subject-font', finalSubject + 'px');
  // Ensure other lines use their defaults
  container.style.removeProperty('--teacher-font');
  container.style.setProperty('--schedule-meta-font', Math.max(Math.round(chosen * 0.85), chosen - 2, 8) + 'px');
  container.style.removeProperty('--room-font');
}

function getScheduleContainer() {
  return document.getElementById('student-schedule-table') ||
         document.getElementById('schedule-table-container');
}

/**
 * Generate Schedule Table
 */
export async function generateScheduleTable(scheduleData, className, context) {
  const year = context?.currentYear || context?.year;
  const semesterId = context?.currentSemester?.id || context?.semester?.id || context?.semesterId;
  const displayPeriods = await getDisplayPeriodsAsync(year, semesterId);
  const lunchSlot = await getLunchSlotAsync(year, semesterId);
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
  
  // Create schedule matrix
  const scheduleMatrix = createScheduleMatrix(scheduleData);
  
  let tableHTML = `
    <div class="schedule-table-wrapper">
      <table class="schedule-table">
        <thead>
          <tr>
            <th class="time-header">เวลา</th>
            ${days.map(day => `<th class="day-header">${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;
  
  displayPeriods.forEach(({ display, actual, label }) => {
    const period = actual;
    tableHTML += `
      <tr class="period-row" data-period="${period}" data-display-period="${display}">
        <td class="time-cell">
          <div class="period-info">
            <span class="period-number">คาบ ${display}</span>
            <span class="time-slot">${label}</span>
          </div>
        </td>
    `;
    
    days.forEach((day, dayIndex) => {
      const dayNumber = dayIndex + 1;
      const cellData = scheduleMatrix[dayNumber]?.[period];
      
      if (cellData) {
        tableHTML += `
          <td class="schedule-cell has-subject" data-day="${dayNumber}" data-period="${period}">
            ${formatScheduleCell(cellData.subject, cellData.teacher, cellData.room, context)}
          </td>
        `;
      } else {
        const emptyText = '-';
        tableHTML += `
          <td class="schedule-cell empty" data-day="${dayNumber}" data-period="${period}">
            <div class="empty-cell">${emptyText}</div>
          </td>
        `;
      }
    });

    tableHTML += '</tr>';
    if (period === 4) {
      // Insert lunch row after period 4
      tableHTML += `<tr class="lunch-row"><td colspan="6">${lunchSlot.label} ${lunchTimeDisplay}</td></tr>`;
    }
  });
  
  tableHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  return tableHTML;
}

/**
 * Format Schedule Cell
 */
export function formatScheduleCell(subject, teacher, room, context) {
  return `
    <div class="schedule-cell-content">
      <div class="subject-name">${subject?.subject_name || 'ไม่ระบุวิชา'}</div>
      <div class="teacher-name">${teacher?.name || 'ไม่ระบุครู'}</div>
      <div class="room-info">
        ${room ? `
          ${String(room.name || '').replace(/^ห้อง\s*/, '')} 
          <span class="badge ${getRoomTypeBadgeClass(room.room_type)}">
            ${room.room_type}
          </span>
        ` : 'ไม่ระบุห้อง'}
      </div>
    </div>
  `;
}

/**
 * Render Empty Schedule State
 */
export function renderEmptyScheduleState(className, context) {
  const tableContainer = document.getElementById('schedule-table-container');
  if (!tableContainer) return;
  
  tableContainer.innerHTML = `
    <div class="empty-schedule-state">
      <div class="empty-icon">📅</div>
      <h3>ไม่มีตารางเรียน</h3>
      <p>ไม่พบตารางเรียนสำหรับห้อง <strong>${className}</strong></p>
      <p>ใน${context.currentSemester?.semester_name} ปีการศึกษา ${context.currentYear}</p>
      <div class="empty-actions">
        <button class="btn btn--outline" onclick="location.reload()">
          🔄 รีเฟรช
        </button>
      </div>
    </div>
  `;
}

// =============================================================================
// ROBUST LOADER (override legacy duplicates)
// =============================================================================

async function robustLoadSchedule(classRef, context) {
  try {
    console.log('[StudentSchedule] robustLoadSchedule called with:', classRef);
    setLoading(true);
    const ctx = context || globalContext.getContext();
    let classId = null;
    // Resolve id
    if (typeof classRef === 'number' || (/^\d+$/.test(String(classRef)))) {
      classId = parseInt(classRef, 10);
    } else {
      const byName = pageState.availableClasses.find(c => c.class_name === String(classRef));
      if (byName) classId = byName.id;
      if (!classId) {
        const clsRes = await dataService.getClasses(ctx.currentYear || ctx.year, ctx.currentSemester?.id || ctx.semester?.id || ctx.semesterId);
        if (clsRes.ok) {
          pageState.availableClasses = clsRes.data;
          const found = clsRes.data.find(c => c.class_name === String(classRef));
          if (found) classId = found.id;
        }
      }
    }
    if (!classId) throw new Error(`ไม่พบห้องเรียน: ${classRef}`);

    const result = await dataService.getStudentSchedule(classId);
    if (result?.ok && result.data?.matrix) {
      pageState.currentSchedule = result.data;
      pageState.selectedClass = classId;
      renderScheduleHeader(result.data.classInfo?.class_name || String(classId), ctx);
      await renderScheduleTable(result.data, ctx);
    } else {
      renderEmptyScheduleState(String(classRef), ctx);
    }
  } catch (e) {
    console.error('[StudentSchedule] robustLoadSchedule failed:', e);
    showError(e.message || 'โหลดตารางล้มเหลว');
  } finally {
    setLoading(false);
  }
}

// Override global export to ensure our robust loader is used everywhere
if (typeof window !== 'undefined') {
  window.studentSchedulePage = window.studentSchedulePage || {};
  window.studentSchedulePage.loadScheduleForContext = robustLoadSchedule;
}

/**
 * Highlight Current Period
 */
export function highlightCurrentPeriod(context) {
  if (!isActiveSemester(context.currentSemester)) return;
  
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ...
  const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
  
  // Skip weekends
  if (currentDay === 0 || currentDay === 6) return;
  
  // Time periods mapping
  const timePeriods = [
    { start: 820, end: 930, period: 1 },
    { start: 930, end: 1020, period: 2 },
    { start: 1020, end: 1110, period: 3 },
    { start: 1110, end: 1200, period: 4 },
    { start: 1300, end: 1350, period: 6 },
    { start: 1350, end: 1440, period: 7 },
    { start: 1440, end: 1530, period: 8 }
  ];
  
  // Find current period
  const currentPeriod = timePeriods.find(tp => 
    currentTime >= tp.start && currentTime <= tp.end
  );
  
  if (currentPeriod) {
    const cell = document.querySelector(`[data-day="${currentDay}"][data-period="${currentPeriod.period}"]`);
    if (cell) {
      cell.classList.add('current-period');
      
      // Add pulse animation for current period
      cell.style.animation = 'pulse 2s infinite';
    }
  }
}

// =============================================================================
// EXPORT FUNCTIONALITY
// =============================================================================

/**
 * Render Export Bar
 */
export function renderExportBar(context) {
  const exportContainer = document.getElementById('student-export-bar');
  if (!exportContainer) return;
  
  const isHistorical = !isActiveSemester(context.currentSemester);
  
  exportContainer.innerHTML = `
    <div class="export-bar">
      <h4>📤 Export ตารางเรียน</h4>
      <div class="export-buttons">
        <button class="btn btn--sm btn--export" data-export-type="csv">
          📄 Export CSV
        </button>
        <button class="btn btn--sm btn--export" data-export-type="xlsx">
          📊 Export Excel
        </button>
        ${!isHistorical ? `
          <button class="btn btn--sm btn--export btn--gsheets" data-export-type="gsheets">
            📋 Google Sheets
          </button>
        ` : ''}
      </div>
      <div class="export-status" id="export-status" style="display: none;"></div>
    </div>
  `;
}

/**
 * Export Schedule
 */
export async function exportSchedule(format, className, context) {
  if (!className || !context.currentSemester) {
    throw new Error('ไม่สามารถ Export ได้: ข้อมูลไม่ครบถ้วน');
  }
  
  try {
    const classId = getClassIdByName(className);
    if (!classId) {
      throw new Error(`ไม่พบห้องเรียน: ${className}`);
    }
    
    const scheduleData = await dataService.normalizeStudentScheduleForExport({
      classId,
      semesterId: context.currentSemester.id
    });
    
    if (!scheduleData || scheduleData.length === 0) {
      throw new Error('ไม่มีข้อมูลตารางเรียนสำหรับ Export');
    }
    
    const filename = generateExportFilename(`ตารางเรียน-${className}`, context);
    
    switch(format) {
      case 'csv': 
        return await exportTableToCSV(scheduleData, filename);
      case 'xlsx': 
        return await exportTableToXLSX(scheduleData, filename);
      case 'gsheets': 
        return await exportTableToGoogleSheets(scheduleData, filename);
      default:
        throw new Error('รูปแบบ Export ไม่ถูกต้อง');
    }
    
  } catch (error) {
    console.error('[StudentSchedule] Export failed:', error);
    throw error;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create Schedule Matrix from schedule data
 */
function createScheduleMatrix(scheduleData) {
  const matrix = {};
  
  scheduleData.forEach(item => {
    const day = item.day || item.day_of_week;
    const period = item.period;
    
    if (!matrix[day]) {
      matrix[day] = {};
    }
    
    matrix[day][period] = {
      subject: {
        subject_name: item['วิชา'] || item.subject_name,
        subject_code: item['รหัสวิชา'] || item.subject_code
      },
      teacher: {
        name: item['ครู'] || item.teacher_name
      },
      room: {
        name: item['ห้อง'] ? item['ห้อง'].split(' (')[0] : (item.room_name || ''),
        room_type: item.room_type || extractRoomType(item['ห้อง'])
      }
    };
  });
  
  return matrix;
}

/**
 * Extract room type from room string
 */
function extractRoomType(roomString) {
  if (!roomString) return 'CLASS';
  
  if (roomString.includes('TECH')) return 'TECH';
  if (roomString.includes('เทค')) return 'TECH';
  if (roomString.includes('คอม')) return 'TECH';
  
  return 'CLASS';
}

/**
 * Load Available Classes
 */
async function loadAvailableClasses(context) {
  try {
    const classes = await dataService.getClasses(context?.currentYear || context?.year, context?.currentSemester?.id || context?.semester?.id || context?.semesterId);
    if (classes.ok) {
      pageState.availableClasses = classes.data;
      renderClassSelector(classes.data, pageState.selectedClass);
    }
  } catch (error) {
    console.error('[StudentSchedule] Failed to load classes:', error);
  }
}

/**
 * Group Classes By Grade
 */
function groupClassesByGrade(classes) {
  return classes.reduce((grouped, cls) => {
    const grade = cls.grade_level || cls.class_name.split('/')[0];
    if (!grouped[grade]) {
      grouped[grade] = [];
    }
    grouped[grade].push(cls);
    return grouped;
  }, {});
}

/**
 * Get Class ID by Name
 */
function getClassIdByName(className) {
  const cls = pageState.availableClasses.find(c => c.class_name === className);
  return cls?.id || null;
}

/**
 * Generate Export Filename
 */
function generateExportFilename(baseName, context) {
  const year = context.currentYear || 'unknown';
  const semester = context.currentSemester?.semester_number || 'unknown';
  const date = new Date().toISOString().slice(0, 10);
  
  return `${baseName}_${year}_ภาค${semester}_${date}`;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners(context) {
  // Class selector change
  const classSelector = document.getElementById('class-selector');
  if (classSelector) {
    classSelector.addEventListener('change', async (e) => {
      const selectedClass = e.target.value;
      if (selectedClass) {
        await loadScheduleForContext(selectedClass, context);
      } else {
        clearScheduleDisplay();
      }
    });
  }
}

/**
 * Setup Export Handlers
 */
function setupExportHandlers(className, context) {
  const exportButtons = document.querySelectorAll('.btn--export');
  
  exportButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const format = button.dataset.exportType;
      await handleExport(format, className, context, button);
    });
  });
}

/**
 * Handle Export
 */
async function handleExport(format, className, context, button) {
  try {
    showExportProgress(button);
    
    await exportSchedule(format, className, context);
    
    showExportSuccess('Export สำเร็จ!');
    
  } catch (error) {
    console.error('[StudentSchedule] Export failed:', error);
    showExportError(error.message);
  } finally {
    hideExportProgress(button);
  }
}

// =============================================================================
// MULTI-YEAR FEATURES
// =============================================================================

/**
 * Compare Schedule Across Semesters
 */
export function compareScheduleAcrossSemesters(className, semester1, semester2) {
  // Implementation for comparing schedules between semesters
  console.log(`Comparing ${className} schedule between semesters:`, semester1, semester2);
  
  // This would load schedules from both semesters and show differences
  // For now, return a placeholder
  return {
    changes: [],
    additions: [],
    removals: [],
    modifications: []
  };
}

/**
 * Show Schedule History
 */
export function showScheduleHistory(className, yearRange) {
  console.log(`Showing schedule history for ${className} across years:`, yearRange);
  
  // Implementation for showing historical schedule data
  const historyContainer = document.getElementById('schedule-history');
  if (historyContainer) {
    historyContainer.innerHTML = `
      <div class="schedule-history">
        <h3>ประวัติตารางเรียน ${className}</h3>
        <p>แสดงข้อมูลในช่วงปีการศึกษา ${yearRange.join(' - ')}</p>
        <div class="history-placeholder">
          <p>ฟีเจอร์นี้จะพัฒนาในเวอร์ชันถัดไป</p>
        </div>
      </div>
    `;
  }
}

/**
 * Detect Schedule Changes
 */
export function detectScheduleChanges(oldSchedule, newSchedule) {
  const changes = {
    added: [],
    removed: [],
    modified: []
  };
  
  // Compare schedules and detect changes
  // This is a simplified implementation
  const oldMap = createScheduleMap(oldSchedule);
  const newMap = createScheduleMap(newSchedule);
  
  // Find additions and modifications
  Object.keys(newMap).forEach(key => {
    if (!oldMap[key]) {
      changes.added.push(newMap[key]);
    } else if (JSON.stringify(oldMap[key]) !== JSON.stringify(newMap[key])) {
      changes.modified.push({ old: oldMap[key], new: newMap[key] });
    }
  });
  
  // Find removals
  Object.keys(oldMap).forEach(key => {
    if (!newMap[key]) {
      changes.removed.push(oldMap[key]);
    }
  });
  
  return changes;
}

/**
 * Create Schedule Map for comparison
 */
function createScheduleMap(schedule) {
  const map = {};
  
  schedule.forEach(item => {
    const key = `${item.day}-${item.period}`;
    map[key] = item;
  });
  
  return map;
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

/**
 * Set Loading State
 */
function setLoading(isLoading) {
  pageState.isLoading = isLoading;
  
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = isLoading ? 'flex' : 'none';
  }
}

/**
 * Show Error
 */
function showError(message) {
  pageState.error = message;
  
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

/**
 * Clear Schedule Display
 */
function clearScheduleDisplay() {
  const tableContainer = document.getElementById('schedule-table-container');
  const headerContainer = document.getElementById('schedule-header');
  const exportContainer = document.getElementById('student-export-bar');
  
  if (tableContainer) tableContainer.innerHTML = '';
  if (headerContainer) headerContainer.innerHTML = '';
  if (exportContainer) exportContainer.innerHTML = '';
  
  pageState.currentSchedule = null;
  pageState.selectedClass = null;
  
  clearSavedSelectedClass();
}

/**
 * Export Progress Functions
 */
function showExportProgress(button) {
  button.disabled = true;
  button.innerHTML = '⏳ กำลัง Export...';
}

function hideExportProgress(button) {
  button.disabled = false;
  const format = button.dataset.exportType;
  const texts = {
    'csv': '📄 Export CSV',
    'xlsx': '📊 Export Excel',
    'gsheets': '📋 Google Sheets'
  };
  button.innerHTML = texts[format] || 'Export';
}

function showExportSuccess(message) {
  const statusElement = document.getElementById('export-status');
  if (statusElement) {
    statusElement.textContent = `✅ ${message}`;
    statusElement.className = 'export-status export-status--success';
    statusElement.style.display = 'block';
    
    setTimeout(() => statusElement.style.display = 'none', 3000);
  }
}

function showExportError(message) {
  const statusElement = document.getElementById('export-status');
  if (statusElement) {
    statusElement.textContent = `❌ Export ล้มเหลว: ${message}`;
    statusElement.className = 'export-status export-status--error';
    statusElement.style.display = 'block';
    
    setTimeout(() => statusElement.style.display = 'none', 5000);
  }
}

// =============================================================================
// LOCAL STORAGE HELPERS
// =============================================================================

function saveSelectedClass(className) {
  try {
    localStorage.setItem('student-schedule-selected-class', className);
  } catch (error) {
    console.warn('[StudentSchedule] Failed to save selected class:', error);
  }
}

function getSavedSelectedClass() {
  try {
    return localStorage.getItem('student-schedule-selected-class');
  } catch (error) {
    console.warn('[StudentSchedule] Failed to get saved selected class:', error);
    return null;
  }
}

function clearSavedSelectedClass() {
  try {
    localStorage.removeItem('student-schedule-selected-class');
  } catch (error) {
    console.warn('[StudentSchedule] Failed to clear saved selected class:', error);
  }
}

// Export page state for debugging
export function getPageState() {
  return { ...pageState };
}

// =============================================================================
// EXPORT FUNCTIONALITY
// =============================================================================

/**
 * Setup Student Export Handlers
 */
function setupStudentExportHandlers(context) {
  console.log('[StudentSchedule] Setting up export handlers...');
  
  const exportButtons = document.querySelectorAll('#export-bar-student button[data-export-type]');
  console.log('[StudentSchedule] Found export buttons:', exportButtons.length);
  
  if (exportButtons.length === 0) {
    console.warn('[StudentSchedule] No export buttons found! Selector: #export-bar-student button[data-export-type]');
    return;
  }
  
  exportButtons.forEach((button, index) => {
    console.log(`[StudentSchedule] Setting up button ${index + 1}:`, button.dataset.exportType);
    
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', async (e) => {
      console.log('[StudentSchedule] Export button clicked:', e.target.dataset.exportType);
      e.preventDefault();
      e.stopPropagation();
      await handleStudentExport(newButton, context);
    });
  });
  
  console.log('[StudentSchedule] Export handlers setup completed');
}

/**
 * Handle Student Export
 */
async function handleStudentExport(button, context) {
  if (button.disabled) return;
  
  try {
    if (!pageState.selectedClass) {
      throw new Error('กรุณาเลือกห้องเรียนก่อน');
    }
    
    showExportProgress(button);
    
    const format = button.dataset.exportType;
    const exportData = await prepareStudentExportData(pageState.selectedClass, context);
    const filename = generateStudentExportFilename(pageState.selectedClass, context);
    
    switch(format) {
      case 'csv':
        await exportTableToCSV(exportData, filename);
        break;
      case 'xlsx':
        await exportTableToXLSX(exportData, filename);
        break;
      case 'gsheets':
        await exportTableToGoogleSheets(exportData, filename);
        break;
      default:
        throw new Error('รูปแบบ Export ไม่ถูกต้อง');
    }
    
    showExportSuccess('Export สำเร็จ!');
    
  } catch (error) {
    console.error('[StudentSchedule] Export failed:', error);
    showExportError(error.message);
  } finally {
    hideExportProgress(button);
  }
}

/**
 * Prepare Student Export Data
 */
async function prepareStudentExportData(className, context) {
  if (!pageState.currentSchedule) {
    throw new Error('ไม่มีข้อมูลตารางเรียน');
  }

  const year = context?.currentYear || context?.year;
  const semesterId = context?.currentSemester?.id || context?.semester?.id || context?.semesterId;
  const displayPeriods = await getDisplayPeriodsAsync(year, semesterId);
  const lunchSlot = await getLunchSlotAsync(year, semesterId);
  const lunchKey = lunchSlot.label || 'พักเที่ยง'; // Use dynamic label from API
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
  const cleanRoom = (n) => String(n || '').replace(/^ห้อง\s*/, '');

  const periodHeaders = [];
  displayPeriods.forEach(period => {
    periodHeaders.push(`คาบ ${period.display}`);
    if (period.display === 4) {
      periodHeaders.push(lunchKey);
    }
  });
  const createEmptyRow = () => {
    const row = { 'วัน/เวลา': '' };
    periodHeaders.forEach(header => { row[header] = ''; });
    return row;
  };

  const exportData = [];

  const headerRow = createEmptyRow();
  headerRow['คาบ 3'] = `ตารางเรียน - ${className}`;
  exportData.push(headerRow);

  const semesterRow = createEmptyRow();
  semesterRow['คาบ 3'] = `ภาคเรียนที่ ${context.currentSemester?.semester_number || 1} ปีการศึกษา ${context.currentYear}`;
  exportData.push(semesterRow);

  exportData.push(createEmptyRow());

  days.forEach((dayName, dayIndex) => {
    const rowData = createEmptyRow();
    const dayNumber = dayIndex + 1;
    rowData['วัน/เวลา'] = dayName;

    displayPeriods.forEach(({ display, actual }) => {
      const key = `คาบ ${display}`;
      const cellData = pageState.currentSchedule.matrix[dayNumber]?.[actual];

      if (cellData) {
        rowData[key] = `${cellData.subject.subject_name}\n${cellData.teacher.name}\n${cleanRoom(cellData.room.name)}`;
      } else {
        rowData[key] = '-';
      }

      if (actual === 4 && lunchKey in rowData) {
        rowData[lunchKey] = '';
      }
    });

    exportData.push(rowData);
  });

  return exportData;
}

/**
 * Generate Student Export Filename
 */
function generateStudentExportFilename(className, context) {
  const year = context.currentYear || 'unknown';
  const semester = context.currentSemester?.semester_number || 'unknown';
  const date = new Date().toISOString().slice(0, 10);
  
  return `ตารางเรียน-${className}_${year}_ภาค${semester}_${date}`;
}

// Make functions available globally for HTML onclick handlers
if (typeof window !== 'undefined') {
  window.studentSchedulePage = {
    init: initStudentSchedulePage,
    updatePageForContext,
    loadScheduleForContext,
    exportSchedule,
    getPageState
  };
}
