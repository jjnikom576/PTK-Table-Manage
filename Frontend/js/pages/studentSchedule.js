import * as dataService from '../services/dataService.js';
import * as globalContext from '../context/globalContext.js';
import coreAPI from '../api/core-api.js';
import {
  renderContextControls,
  renderClassSelector,
  renderScheduleHeader,
  renderScheduleTable,
  renderEmptyScheduleState,
  highlightCurrentPeriod,
  setLoading,
  showError,
  clearScheduleDisplay,
  generateScheduleTable,
  formatScheduleCell
} from './student/ui.js';
import {
  renderExportBar,
  setupStudentExportHandlers,
  exportSchedule as exportScheduleModule
} from './student/export.js';
import {
  pageState,
  setPageState,
  resetPageState,
  getPageState as getPageStateModule
} from './student/state.js';
import {
  saveSelectedClass,
  getSavedSelectedClass,
  clearSavedSelectedClass
} from './student/storage.js';

const WAIT_INTERVAL_MS = 50;
const WAIT_TIMEOUT_MS = 3000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForElement(
  selector,
  { timeout = WAIT_TIMEOUT_MS, interval = WAIT_INTERVAL_MS } = {}
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await delay(interval);
  }
  return null;
}

async function ensureStudentDom() {
  await waitForElement('#page-student');
  await waitForElement('#class-dropdown');
  await waitForElement('#student-schedule-header');
  await waitForElement('#export-bar-student');
}

function resolveContext(inputContext) {
  return inputContext || globalContext.getContext();
}

function resolveSemesterId(context) {
  return (
    context.currentSemester?.id ||
    context.semester?.id ||
    context.semesterId ||
    null
  );
}

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
    console.warn('[StudentSchedule] Failed to load classes for selector:', classesResponse.error);
  }

  setPageState({ availableClasses: classes });

  const userDrivenSelection =
    preserveSelection ??
    (pageState.hasUserSelection ? pageState.selectedClass : null);

  if (preserveSelection !== null && preserveSelection !== undefined) {
    setPageState({ hasUserSelection: true });
  }

  const storedSelection = pageState.hasUserSelection
    ? getSavedSelectedClass()
    : null;

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

        if (pageState.hasUserSelection) {
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

    if (pageState.hasUserSelection) {
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

async function preloadTimetableFromAPI(context) {
  try {
    const year = context.currentYear;
    const semesterId = resolveSemesterId(context);

    if (!year || !semesterId) {
      return null;
    }

    const response = await coreAPI.getTimetableBy(year, semesterId, true);
    if (!response?.success) {
      return null;
    }

    const cached =
      typeof coreAPI.getCachedTimetable === 'function'
        ? coreAPI.getCachedTimetable()
        : null;

    const timetableList = Array.isArray(response?.data?.list)
      ? response.data.list
      : Array.isArray(cached?.list)
        ? cached.list
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(cached)
            ? cached
            : [];

    if (!timetableList.length) {
      return null;
    }

    const matrix = {};
    for (let day = 1; day <= 7; day += 1) {
      matrix[day] = {};
      for (let period = 1; period <= 12; period += 1) {
        matrix[day][period] = null;
      }
    }

    timetableList.forEach((item) => {
      const day = Number(item.day_of_week ?? item.day);
      const period = Number(item.period ?? item.period_no);
      if (!day || !period) return;

      matrix[day] = matrix[day] || {};
      matrix[day][period] = {
        subject: {
          subject_name: item.subject_name || '',
          subject_code: item.subject_code || ''
        },
        teacher: { name: item.teacher_name || '' },
        room: { name: item.room_name || '' },
        schedule: item,
        raw: item
      };
    });

    setPageState({
      currentSchedule: { matrix },
      cachedTimetable: timetableList
    });

    return timetableList;
  } catch (error) {
    console.warn('[StudentSchedule] Timetable API preload failed:', error);
    return null;
  }
}

function normalizeIdList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter(Number.isFinite);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    let source = value.trim();
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => Number(item))
          .filter(Number.isFinite);
      }
      source = String(parsed);
    } catch {
      // ignore parse errors
    }
    return source
      .split(',')
      .map((item) => Number(item.trim()))
      .filter(Number.isFinite);
  }

  if (value !== null && value !== undefined) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? [numeric] : [];
  }

  return [];
}

async function buildFallbackScheduleFromTimetable(
  classId,
  originalClassRef,
  context,
  timetableEntries = null
) {
  const year = context.currentYear || context.year;
  const semesterId = resolveSemesterId(context);

  if (!year || !semesterId) {
    return null;
  }

  let entries = Array.isArray(timetableEntries) ? timetableEntries : null;

  if (!entries || !entries.length) {
    const response = await coreAPI.getTimetableBy(year, semesterId, true);
    if (response?.success) {
      if (Array.isArray(response.data?.list)) {
        entries = response.data.list;
      } else if (Array.isArray(response.data)) {
        entries = response.data;
      }
    }

    if ((!entries || !entries.length) && typeof coreAPI.getCachedTimetable === 'function') {
      const cached = coreAPI.getCachedTimetable();
      if (Array.isArray(cached?.list)) {
        entries = cached.list;
      } else if (Array.isArray(cached)) {
        entries = cached;
      }
    }
  }

  if (!entries || !entries.length) {
    return null;
  }

  const numericClassId = Number(classId);
  const resolvedClassName =
    findClassNameById(classId) ||
    entries.find(
      (item) => Number(item.class_id ?? item.classId) === numericClassId
    )?.class_name ||
    entries.find(
      (item) => Number(item.classId ?? item.class_id) === numericClassId
    )?.className ||
    (typeof originalClassRef === 'string' ? originalClassRef : null) ||
    String(classId);

  const filteredEntries = entries.filter((item) => {
    const entryNumericId = Number(item.class_id ?? item.classId);
    if (
      Number.isFinite(entryNumericId) &&
      Number.isFinite(numericClassId) &&
      entryNumericId === numericClassId
    ) {
      return true;
    }

    const candidateIds = new Set([
      ...normalizeIdList(item.class_ids),
      ...normalizeIdList(item.classIds)
    ]);
    if (Number.isFinite(numericClassId) && candidateIds.has(numericClassId)) {
      return true;
    }

    const entryClassName = item.class_name || item.className || '';
    if (resolvedClassName && entryClassName === resolvedClassName) {
      return true;
    }

    if (
      typeof originalClassRef === 'string' &&
      originalClassRef &&
      entryClassName === originalClassRef
    ) {
      return true;
    }

    return false;
  });

  if (!filteredEntries.length) {
    return null;
  }

  const matrix = {};
  filteredEntries.forEach((item) => {
    const day = Number(item.day_of_week ?? item.day);
    const period = Number(item.period ?? item.period_no);
    if (!day || !period) {
      return;
    }

    if (!matrix[day]) {
      matrix[day] = {};
    }

    matrix[day][period] = {
      schedule: item,
      subject: {
        subject_name: item.subject_name || '',
        subject_code: item.subject_code || ''
      },
      teacher: {
        name: item.teacher_name || ''
      },
      room: {
        name: item.room_name || ''
      }
    };
  });

  const subjectsMap = new Map();
  filteredEntries.forEach((item) => {
    const code = item.subject_code || item.subject_name || '';
    if (!code || subjectsMap.has(code)) {
      return;
    }
    subjectsMap.set(code, {
      subject_code: item.subject_code || '',
      subject_name: item.subject_name || ''
    });
  });

  return {
    fallback: true,
    classInfo: {
      id: Number.isFinite(numericClassId) ? numericClassId : classId,
      class_name: resolvedClassName
    },
    schedules: filteredEntries,
    matrix,
    subjects: Array.from(subjectsMap.values()),
    teachers: [],
    rooms: [],
    periods: [],
    timetableEntries: filteredEntries
  };
}

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

function findClassNameById(classId) {
  const match = pageState.availableClasses.find(
    (cls) => String(cls.id) === String(classId)
  );
  return match?.class_name || null;
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
      setPageState({ hasUserSelection: false, selectedClass: null });
      return;
    }

    setPageState({ hasUserSelection: true });
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

export { generateScheduleTable, formatScheduleCell } from './student/ui.js';
export { exportSchedule } from './student/export.js';
export { getPageState } from './student/state.js';
export {
  renderContextControls,
  renderClassSelector,
  renderScheduleHeader,
  renderScheduleTable,
  renderEmptyScheduleState,
  highlightCurrentPeriod
} from './student/ui.js';

function compareClasses(a, b) {
  const aKey = buildClassSortKey(a);
  const bKey = buildClassSortKey(b);

  if (aKey.levelRank !== bKey.levelRank) {
    return aKey.levelRank - bKey.levelRank;
  }
  if (aKey.grade !== bKey.grade) {
    return aKey.grade - bKey.grade;
  }
  if (aKey.section !== bKey.section) {
    return aKey.section - bKey.section;
  }
  return aKey.name.localeCompare(bKey.name, 'th');
}

function buildClassSortKey(cls) {
  const name = cls.class_name || '';
  const gradeText = cls.grade_level || name.split('/')[0] || '';
  const gradeMatch = gradeText.match(/(\d+)/);
  const grade = gradeMatch ? Number.parseInt(gradeMatch[1], 10) : Number.MAX_SAFE_INTEGER;

  const sectionValue =
    cls.section ??
    (() => {
      const [, sectionPart] = name.split('/');
      const sectionNum = Number.parseInt(sectionPart, 10);
      return Number.isFinite(sectionNum) ? sectionNum : Number.MAX_SAFE_INTEGER;
    })();

  const section = Number.isFinite(sectionValue)
    ? Number(sectionValue)
    : Number.MAX_SAFE_INTEGER;

  const levelRank = determineLevelRank(gradeText);

  return {
    levelRank,
    grade,
    section,
    name
  };
}

function determineLevelRank(label) {
  if (!label) return Number.MAX_SAFE_INTEGER;
  const normalized = label.trim();
  if (/^ม\./i.test(normalized)) return 1;
  if (/^ป\./i.test(normalized)) return 0;
  if (/^อาชีว/i.test(normalized)) return 2;
  return Number.MAX_SAFE_INTEGER;
}
