import * as dataService from '../../services/dataService.js';
import * as globalContext from '../../context/globalContext.js';
import {
  pageState,
  resetPageState,
  setPageState,
  setLoading,
  showError
} from './state.js';
import { loadTeachersData } from './data.js';
import { renderWorkloadSummary, renderTeacherTabs } from './ui.js';
import { setupEventListeners, selectTeacher } from './events.js';

export async function initTeacherSchedulePage(context = null) {
  const currentContext = context || globalContext.getContext();

  console.log('[TeacherSchedule] Initializing page with context:', currentContext);

  try {
    if (!currentContext?.currentYear || !currentContext?.currentSemester) {
      throw new Error('กรุณาเลือกปีการศึกษาและภาคเรียนก่อน');
    }

    const teacherPage = document.getElementById('page-teacher');
    if (teacherPage && teacherPage.style.display === 'none') {
      teacherPage.style.display = 'block';
      teacherPage.classList.remove('hidden');
    }

    await dataService.setGlobalContext(
      currentContext.currentYear,
      currentContext.currentSemester?.id || null
    );

    await loadTeachersData(currentContext);
    await renderWorkloadSummary(currentContext);
    await renderTeacherTabs(currentContext);
    setupEventListeners(currentContext);

    console.log('[TeacherSchedule] Page initialized successfully');
  } catch (error) {
    console.error('[TeacherSchedule] Failed to initialize page:', error);
    showError(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
}

export async function updatePageForContext(newContext) {
  console.log('[TeacherSchedule] Updating for new context:', newContext);

  try {
    const eventsInitialized = pageState.eventsInitialized;
    resetPageState();
    setPageState({ eventsInitialized });
    await initTeacherSchedulePage(newContext);
  } catch (error) {
    console.error('[TeacherSchedule] Failed to update page:', error);
    showError(error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนบริบท');
  }
}

export async function refreshPage(newContext = null) {
  console.log('[TeacherSchedule] Refreshing page with context:', newContext);

  try {
    const currentContext = newContext || globalContext.getContext();
    const eventsInitialized = pageState.eventsInitialized;
    resetPageState();
    setPageState({ eventsInitialized });
    await initTeacherSchedulePage(currentContext);
    console.log('[TeacherSchedule] Page refreshed successfully');
  } catch (error) {
    console.error('[TeacherSchedule] Failed to refresh page:', error);
    showError(error.message || 'เกิดข้อผิดพลาดในการรีเฟรชหน้า');
  }
}

export async function refreshPageData(newContext, preserveSelection = null) {
  console.log('[TeacherSchedule] Refreshing page data with context:', newContext);

  let previousSelection = preserveSelection;
  if (preserveSelection == null && pageState.selectedTeacher) {
    previousSelection = pageState.selectedTeacher;
  }

  try {
    setLoading(true);

    await dataService.setGlobalContext(
      newContext.currentYear || newContext.year,
      newContext.currentSemester?.id || newContext.semesterId || null
    );

    const eventsInitialized = pageState.eventsInitialized;
    resetPageState();
    setPageState({ selectedGroup: 'ALL', eventsInitialized });

    await loadTeachersData(newContext);
    await renderWorkloadSummary(newContext);
    await renderTeacherTabs(newContext);

    clearTeacherDetailPanels();

    if (previousSelection) {
      await selectTeacher(previousSelection, newContext);
    }

    console.log('[TeacherSchedule] Page data refresh completed');
  } catch (error) {
    console.error('[TeacherSchedule] Error refreshing page:', error);
    showError(`เกิดข้อผิดพลาดในการโหลดข้อมูลใหม่: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

function clearTeacherDetailPanels() {
  const contentWrapper = document.getElementById('teacher-schedule-content');
  const teacherInfoContainer = document.getElementById('teacher-info');
  const scheduleContainer = document.getElementById('teacher-schedule-table');
  const workloadContainer = document.getElementById('teacher-workload');
  const emptyState = document.getElementById('teacher-details-empty');
  const exportBar = document.getElementById('export-bar-teacher');

  exportBar?.classList.add('hidden');
  contentWrapper?.classList.add('hidden');
  teacherInfoContainer?.classList.add('hidden');
  scheduleContainer?.classList.add('hidden');
  workloadContainer?.classList.add('hidden');
  if (emptyState) {
    emptyState.style.display = 'block';
  }

  document.querySelectorAll('.teacher-tab.active').forEach((tab) => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
}
