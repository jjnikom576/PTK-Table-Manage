import * as dataService from '../../services/dataService.js';
import {
  renderContextControls,
  renderClassSelector,
  renderScheduleHeader,
  renderScheduleTable,
  renderEmptyScheduleState,
  highlightCurrentPeriod,
  setLoading,
  showError,
  clearScheduleDisplay
} from './ui.js';
import {
  renderExportBar,
  setupStudentExportHandlers,
  exportSchedule as exportScheduleModule
} from './export.js';
import {
  pageState,
  setPageState,
  resetPageState,
  getPageState as getPageStateModule
} from './state.js';
import {
  saveSelectedClass,
  getSavedSelectedClass,
  clearSavedSelectedClass
} from './storage.js';
import { ensureStudentDom, waitForElement } from './dom.js';
import { resolveContext, resolveSemesterId } from './context.js';
import {
  compareClasses,
  findClassNameById,
  markUserSelection,
  resetUserSelection,
  shouldPersistSelection
} from './classUtils.js';
import {
  preloadTimetableFromAPI,
  buildFallbackScheduleFromTimetable
} from './timetable.js';

export async function refreshPage(newContext, preserveSelection = null) {
  const context = resolveContext(newContext);
  await refreshClassSelector(context, preserveSelection);

  const targetClass =
    preserveSelection ||
    pageState.selectedClass ||
    getSavedSelectedClass() ||
    null;

  if (targetClass) {
    await loadScheduleForContext(targetClass, context);
  }
}

export async function refreshClassSelector(
  context = null,
  preserveSelection = null
) {
  const activeContext = resolveContext(context);
  const year = activeContext.currentYear || activeContext.year;
  const semesterId = resolveSemesterId(activeContext);

  if (!year || !semesterId) {
    renderClassSelector([], null);
    clearScheduleDisplay();
    return;
  }

  try {
    const contextSync = await dataService.setGlobalContext(year, semesterId);
    if (!contextSync.ok) {
      console.warn(
        '[StudentSchedule] Failed to sync data context:',
        contextSync.error
      );
    }
  } catch (error) {
    console.warn('[StudentSchedule] setGlobalContext error:', error);
  }

  const classesResponse = await dataService.getClasses(year, semesterId);
  let classes = [];

  if (classesResponse.ok) {
    const uniqueClasses = new Map();
    (classesResponse.data || []).forEach((cls) => {
      if (!uniqueClasses.has(cls.class_name)) {
        uniqueClasses.set(cls.class_name, cls);
      }
    });
    classes = Array.from(uniqueClasses.values()).sort(compareClasses);
  } else {
    console.warn(
      '[StudentSchedule] Failed to load classes for selector:',
      classesResponse.error
    );
  }

  setPageState({ availableClasses: classes });

  const userDrivenSelection =
    preserveSelection ??
    (shouldPersistSelection() ? pageState.selectedClass : null);

  if (preserveSelection !== null && preserveSelection !== undefined) {
    markUserSelection(preserveSelection);
  }

  const storedSelection = getSavedSelectedClass();

  const selector =
    document.getElementById('class-dropdown') ||
    document.getElementById('class-selector') ||
    (await waitForElement('#class-dropdown')) ||
    (await waitForElement('#page-student select'));
  if (!selector) {
    clearScheduleDisplay();
    return;
  }

  let targetValue = userDrivenSelection ?? storedSelection;
  if (!targetValue && classes.length) {
    targetValue = classes[0].id;
  }

  const targetValueString = targetValue != null ? String(targetValue) : null;

  const restoredFromStorage =
    !userDrivenSelection &&
    storedSelection != null &&
    targetValueString === String(storedSelection);

  if (restoredFromStorage) {
    markUserSelection(targetValueString);
  }

  renderClassSelector(classes, targetValueString);
  bindClassSelector(activeContext);

  if (targetValueString) {
    selector.value = targetValueString;
    await loadScheduleForContext(targetValueString, activeContext);
  } else {
    clearScheduleDisplay();
  }
}

export async function initStudentSchedulePage(initialContext) {
  const context = resolveContext(initialContext);
  resetPageState();

  await ensureStudentDom();
  renderContextControls(context);
  renderExportBar(context);
  setupStudentExportHandlers(context);

  await refreshClassSelector(context);
  ensureGlobalHooks();
}

export async function updatePageForContext(newContext) {
  const context = resolveContext(newContext);
  await ensureStudentDom();
  renderContextControls(context);
  renderExportBar(context);
  setupStudentExportHandlers(context);

  await refreshClassSelector(context);
}

export async function loadScheduleForContext(classRef, suppliedContext = null) {
  const context = resolveContext(suppliedContext);
  const validation = validateContextAccess(context);
  if (!validation.ok) {
    showError(validation.error);
    return { ok: false, error: validation.error };
  }

  if (!classRef) {
    clearScheduleDisplay();
    return { ok: false, error: 'กรุณาเลือกห้องเรียนก่อน' };
  }

  const year = context.currentYear || context.year;
  const semesterId = resolveSemesterId(context);

  if (year && semesterId) {
    try {
      const contextSync = await dataService.setGlobalContext(year, semesterId);
      if (!contextSync.ok) {
        console.warn(
          '[StudentSchedule] Failed to sync data context before load:',
          contextSync.error
        );
      }
    } catch (error) {
      console.warn(
        '[StudentSchedule] Unexpected error syncing data context:',
        error
      );
    }
  }

  setLoading(true);

  try {
    const timetableData = await preloadTimetableFromAPI(context);

    const classId = await resolveClassId(classRef, context);
    if (!classId) {
      renderEmptyScheduleState(String(classRef), context);
      return { ok: false, error: 'ไม่พบห้องเรียนที่เลือก' };
    }

    const scheduleResult = await dataService.getStudentSchedule(classId);
    if (!scheduleResult.ok) {
      const fallbackSchedule = await buildFallbackScheduleFromTimetable(
        classId,
        classRef,
        context,
        timetableData
      );

      if (fallbackSchedule) {
        console.warn(
          '[StudentSchedule] Using timetable fallback for class:',
          classId,
          scheduleResult.error
        );
        const fallbackClassName =
          fallbackSchedule.classInfo?.class_name ||
          findClassNameById(classId) ||
          String(classRef);

        await presentScheduleResult(
          classId,
          fallbackClassName,
          fallbackSchedule,
          context
        );

        if (shouldPersistSelection()) {
          saveSelectedClass(String(classId));
        }

        if (context.currentSemester && context.currentYear) {
          highlightCurrentPeriod(context);
        }

        return { ok: true, data: fallbackSchedule, fallback: true };
      }

      showError(scheduleResult.error || 'ไม่สามารถโหลดตารางเรียนได้');
      renderEmptyScheduleState(String(classRef), context);
      return scheduleResult;
    }

    const renderedClassName =
      scheduleResult.data?.classInfo?.class_name ||
      findClassNameById(classId) ||
      String(classRef);

    await presentScheduleResult(
      classId,
      renderedClassName,
      scheduleResult.data,
      context
    );

    if (shouldPersistSelection()) {
      saveSelectedClass(String(classId));
    }

    if (context.currentSemester && context.currentYear) {
      highlightCurrentPeriod(context);
    }

    return scheduleResult;
  } catch (error) {
    console.error('[StudentSchedule] Failed to load schedule:', error);
    showError(error.message || 'เกิดข้อผิดพลาดระหว่างโหลดตารางเรียน');
    renderEmptyScheduleState(String(classRef), context);
    return { ok: false, error: error.message };
  } finally {
    setLoading(false);
  }
}

export function validateContextAccess(context) {
  if (!context.currentYear) {
    return { ok: false, error: 'กรุณาเลือกปีการศึกษา' };
  }
  if (!resolveSemesterId(context)) {
    return { ok: false, error: 'กรุณาเลือกภาคเรียน' };
  }
  return { ok: true };
}

export function compareScheduleAcrossSemesters(className, semester1, semester2) {
  console.log(
    `Comparing ${className} schedule between semesters:`,
    semester1,
    semester2
  );
  return {
    changes: [],
    additions: [],
    removals: [],
    modifications: []
  };
}

export function showScheduleHistory(className, yearRange) {
  const historyContainer = document.getElementById('schedule-history');
  if (!historyContainer) return;

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

export function detectScheduleChanges(oldSchedule, newSchedule) {
  const changes = {
    added: [],
    removed: [],
    modified: []
  };

  const oldMap = createScheduleMap(oldSchedule);
  const newMap = createScheduleMap(newSchedule);

  Object.keys(newMap).forEach((key) => {
    if (!oldMap[key]) {
      changes.added.push(newMap[key]);
    } else if (JSON.stringify(oldMap[key]) !== JSON.stringify(newMap[key])) {
      changes.modified.push({ old: oldMap[key], new: newMap[key] });
    }
  });

  Object.keys(oldMap).forEach((key) => {
    if (!newMap[key]) {
      changes.removed.push(oldMap[key]);
    }
  });

  return changes;
}

function createScheduleMap(schedule) {
  const map = {};
  (schedule || []).forEach((item) => {
    const key = `${item.day}-${item.period}`;
    map[key] = item;
  });
  return map;
}

async function presentScheduleResult(classId, className, scheduleData, context) {
  setPageState({
    currentSchedule: scheduleData,
    selectedClass: String(classId)
  });

  const headerContainer = await waitForElement('#student-schedule-header');
  if (headerContainer) {
    renderScheduleHeader(className, context);
  }

  await renderScheduleTable(scheduleData, context);

  const exportContainer = await waitForElement('#student-export-bar');
  if (exportContainer) {
    renderExportBar(context);
    setupStudentExportHandlers(context);
  }
}

function bindClassSelector(context) {
  const selector =
    document.getElementById('class-selector') ||
    document.getElementById('class-dropdown');
  if (!selector || selector.dataset.bound === 'true') {
    return;
  }

  selector.addEventListener('change', async (event) => {
    const value = event.target.value;
    if (!value) {
      clearSavedSelectedClass();
      clearScheduleDisplay();
      resetUserSelection();
      return;
    }

    markUserSelection(value);
    await loadScheduleForContext(value, context);
  });

  selector.dataset.bound = 'true';
}

function ensureGlobalHooks() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.studentSchedulePage) {
    window.studentSchedulePage = {};
  }

  window.studentSchedulePage.init = initStudentSchedulePage;
  window.studentSchedulePage.updatePageForContext = updatePageForContext;
  window.studentSchedulePage.loadScheduleForContext = robustLoadSchedule;
  window.studentSchedulePage.exportSchedule = exportScheduleModule;
  window.studentSchedulePage.getPageState = getPageStateModule;
}

async function robustLoadSchedule(classRef, context) {
  try {
    await loadScheduleForContext(classRef, context);
  } catch (error) {
    console.error('[StudentSchedule] robustLoadSchedule failed:', error);
    showError(error.message || 'เกิดข้อผิดพลาดระหว่างโหลดตารางเรียน');
    setLoading(false);
  }
}

ensureGlobalHooks();

async function resolveClassId(classRef, context) {
  if (typeof classRef === 'number' || /^\d+$/.test(String(classRef))) {
    return Number(classRef);
  }

  const existing = pageState.availableClasses.find(
    (cls) => cls.class_name === String(classRef)
  );
  if (existing) {
    return existing.id;
  }

  const year = context.currentYear || context.year;
  const semesterId = resolveSemesterId(context);
  const classesResponse = await dataService.getClasses(year, semesterId);

  if (!classesResponse.ok) {
    return null;
  }

  const classes = classesResponse.data || [];
  const byName = classes.find(
    (cls) =>
      cls.class_name === String(classRef) || String(cls.id) === String(classRef)
  );

  if (byName) {
    setPageState({ availableClasses: classes });
    return byName.id;
  }

  return null;
}
