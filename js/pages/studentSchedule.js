/**
 * Enhanced Student Schedule Page for Multi-Year School Schedule System
 * Features: Context-aware loading, Room information, Export functionality
 */

import * as dataService from '../services/dataService.js';
import * as globalContext from '../context/globalContext.js';
import { exportTableToCSV, exportTableToXLSX, exportTableToGoogleSheets } from '../utils/export.js';
import { formatRoomName, getRoomTypeBadgeClass, getThaiDayName, generateTimeSlots, isActiveSemester } from '../utils.js';

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
  
  // Get fresh classes data with current context
  const result = await dataService.getClasses(currentContext.currentYear);
  
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
    option.value = cls.class_name; // ใช้ "1/1" แทน ID
    option.textContent = `${cls.grade_level}/${cls.section} (${cls.student_count || 0} คน)`; // "ม.1/1 (40 คน)"
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
    }, 100);
  } else if (!preserveSelection && classes.length > 0) {
    // ⭐ FIX: Auto-select first class เมื่อไม่มี selection เดิม
    const firstClass = classes[0];
    classSelector.value = firstClass.class_name;
    console.log('[StudentSchedule] ✅ Auto-selected first class:', firstClass.class_name);
    
    // Trigger change event เพื่อโหลด schedule
    setTimeout(() => {
      const changeEvent = new Event('change', { bubbles: true });
      classSelector.dispatchEvent(changeEvent);
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
    
    if (!currentContext.year || !currentContext.semesterId) {
      console.warn('Context missing year/semesterId, using defaults');
      const fallbackContext = globalContext.getContext();
      currentContext.year = fallbackContext.currentYear || 2568;
      currentContext.semesterId = fallbackContext.currentSemester?.id || 7;
    }
    
    console.log('Using context:', currentContext);
    
    // Render page components
    await renderContextControls(currentContext);
    
    /**
 * Refresh class selector dropdown (NEW)
 */
async function refreshClassSelector(context) {
  console.log('[StudentSchedule] Refreshing class selector');
  
  // ⭐ FIX: Try multiple selectors
  const selectors = ['#class-selector', '.class-selector', '[data-class-selector]', 'select[name="class"]'];
  let classSelector = null;
  
  for (const sel of selectors) {
    classSelector = document.querySelector(sel);
    if (classSelector) {
      console.log(`Found class selector with: ${sel}`);
      break;
    }
  }
  
  if (!classSelector) {
    console.warn('Class selector not found with any selector:', selectors);
    // ⭐ FIX: List all select elements for debugging
    const allSelects = document.querySelectorAll('select');
    console.log('All select elements found:', Array.from(allSelects).map(s => s.id || s.className || s.tagName));
    return;
  }
  
  // ⭐ FIX: Force clear cache before getting classes
  await dataService.clearCache();
  
  // Get fresh classes data for current context
  console.log('Getting classes for context:', context);
  const result = await dataService.getClasses();
  if (!result.ok) {
    console.error('Failed to get classes:', result.error);
    return;
  }
  
  const classes = result.data;
  console.log('Got classes for refresh:', classes.map(c => c.class_name));
  
  // ⭐ FIX: If no classes, show all available classes from mockData
  if (classes.length === 0) {
    console.warn('No classes found for current context, checking mockData...');
    const { mockData } = await import('../data/index.js');
    const contextKey = context.year || 2568;
    const fallbackClasses = mockData[contextKey]?.classes || [];
    console.log(`Fallback classes for year ${contextKey}:`, fallbackClasses.map(c => c.class_name));
    
    if (fallbackClasses.length > 0) {
      classes.push(...fallbackClasses);
    }
  }
  
  // Clear and repopulate
  classSelector.innerHTML = '<option value="">เลือกห้องเรียน</option>';
  classes.forEach(classItem => {
    const option = document.createElement('option');
    option.value = classItem.id;
    option.textContent = classItem.class_name;
    classSelector.appendChild(option);
  });
  
  // ⭐ FIX: Auto-select first class and trigger change event
  if (classes.length > 0) {
    classSelector.value = classes[0].id;
    console.log(`Auto-selected class: ${classes[0].class_name}`);
    
    // ⭐ FIX: Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const changeEvent = new Event('change', { bubbles: true });
      classSelector.dispatchEvent(changeEvent);
      console.log('Change event dispatched');
      
      // ⭐ FIX: Force load schedule if event doesn't work
      setTimeout(() => {
        const selectedClassId = classSelector.value;
        if (selectedClassId && classes.length > 0) {
          console.log('Force loading schedule for class:', selectedClassId);
          // Direct call to navigation's loadSchedule
          if (window.loadScheduleForClass) {
            window.loadScheduleForClass(`m${selectedClassId.replace('/', '-').toLowerCase()}`);
          }
        }
      }, 200);
    }, 100);
  }
  
  console.log(`Class selector refreshed with ${classes.length} classes`);
}

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
export async function loadScheduleForContext(className, context) {
  if (!className || !context.currentSemester) return;
  
  try {
    setLoading(true);
    
    // Get class ID
    const classId = getClassIdByName(className);
    if (!classId) {
      throw new Error(`ไม่พบห้องเรียน: ${className}`);
    }
    
    // Load schedule data
    const scheduleResult = await dataService.normalizeStudentScheduleForExport({
      classId,
      semesterId: context.currentSemester.id
    });
    
    if (scheduleResult && scheduleResult.length > 0) {
      pageState.currentSchedule = scheduleResult;
      pageState.selectedClass = className;
      
      // Render schedule
      renderScheduleHeader(className, context);
      renderScheduleTable(scheduleResult, context);
      
      // Setup export functionality
      renderExportBar(context);
      setupExportHandlers(className, context);
      
      // Highlight current period if active semester
      if (isActiveSemester(context.currentSemester)) {
        highlightCurrentPeriod(context);
      }
    } else {
      renderEmptyScheduleState(className, context);
    }
    
    // Save selected class
    saveSelectedClass(className);
    
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
      <h2>📚 ตารางเรียนนักเรียน</h2>
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
      option.value = cls.class_name;
      option.textContent = `${cls.class_name} (${cls.student_count || 'ไม่ระบุ'} คน)`;
      option.selected = cls.class_name === selectedClass;
      optgroup.appendChild(option);
    });
    
    classSelector.appendChild(optgroup);
  });
}

/**
 * Render Schedule Header
 */
export function renderScheduleHeader(className, context) {
  const headerContainer = document.getElementById('schedule-header');
  if (!headerContainer) return;
  
  const semesterText = context.currentSemester?.semester_name || 'ไม่ระบุภาคเรียน';
  const yearText = context.currentYear ? `ปีการศึกษา ${context.currentYear}` : '';
  
  headerContainer.innerHTML = `
    <div class="schedule-header">
      <h3>ตารางเรียน ${className}</h3>
      <div class="schedule-meta">
        <span>${semesterText}</span>
        ${yearText ? `<span class="separator">•</span><span>${yearText}</span>` : ''}
        ${isActiveSemester(context.currentSemester) ? '<span class="badge badge--active">ภาคเรียนปัจจุบัน</span>' : ''}
      </div>
    </div>
  `;
}

/**
 * Render Schedule Table
 */
export function renderScheduleTable(scheduleData, context) {
  const tableContainer = document.getElementById('schedule-table-container');
  if (!tableContainer) return;
  
  if (!scheduleData || scheduleData.length === 0) {
    tableContainer.innerHTML = '<p class="no-schedule">ไม่มีตารางเรียนสำหรับห้องนี้</p>';
    return;
  }
  
  const scheduleTable = generateScheduleTable(scheduleData, pageState.selectedClass, context);
  tableContainer.innerHTML = scheduleTable;
}

/**
 * Generate Schedule Table
 */
export function generateScheduleTable(scheduleData, className, context) {
  const timeSlots = generateTimeSlots();
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
  
  timeSlots.forEach((timeSlot, periodIndex) => {
    const period = periodIndex + 1;
    tableHTML += `
      <tr class="period-row" data-period="${period}">
        <td class="time-cell">
          <div class="period-info">
            <span class="period-number">คาบ ${period}</span>
            <span class="time-slot">${timeSlot}</span>
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
        const emptyText = (period === 8) ? '-' : 'ว่าง';
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
      tableHTML += `<tr class="lunch-row"><td colspan="6">พักเที่ยง 12:00 น. - 13:00 น.</td></tr>`;
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
          ${room.name} 
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
    { start: 820, end: 910, period: 1 },
    { start: 910, end: 1000, period: 2 },
    { start: 1000, end: 1050, period: 3 },
    { start: 1050, end: 1140, period: 4 },
    { start: 1300, end: 1350, period: 5 },
    { start: 1350, end: 1440, period: 6 },
    { start: 1440, end: 1530, period: 7 },
    { start: 1530, end: 1620, period: 8 }
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
    const classes = await dataService.getClasses();
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
  
  const timeSlots = generateTimeSlots();
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
  const exportData = [];
  
  // Header information
  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': `ตารางเรียน - ${className}`,
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });
  
  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': `ภาคเรียนที่ ${context.currentSemester?.semester_number || 1} ปีการศึกษา ${context.currentYear}`,
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });
  
  // Empty row
  exportData.push({
    'วัน/เวลา': '', 'คาบ 1': '', 'คาบ 2': '', 'คาบ 3': '',
    'คาบ 4': '', 'คาบ 5': '', 'คาบ 6': '', 'คาบ 7': '', 'คาบ 8': ''
  });
  
  // Table data
  days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const rowData = { 'วัน/เวลา': day };
    
    timeSlots.forEach((timeSlot, periodIndex) => {
      const period = periodIndex + 1;
      const cellData = pageState.currentSchedule.matrix[dayNumber]?.[period];
      
      if (cellData) {
        rowData[`คาบ ${period}`] = `${cellData.subject.subject_name}\n${cellData.teacher.name}\n${cellData.room.name}`;
      } else {
        rowData[`คาบ ${period}`] = '-';
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
