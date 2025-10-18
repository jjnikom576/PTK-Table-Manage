import coreAPI from '../api/core-api.js';
import { getCurrentPage } from '../navigation.js';
import { getContext as getGlobalContext } from '../context/globalContext.js';

export async function loadInitialContext() {
  try {
    console.log('🌐 Loading initial context from backend...');

    const contextResult = await coreAPI.getGlobalContext();
    console.log('📦 Context result:', contextResult);

    if (contextResult.success && contextResult.data) {
      const { year, semester } = contextResult.data;
      window.globalSchoolContext = {
        currentYear: year,
        currentSemester: semester,
        dataLoaded: true
      };
    } else {
      console.warn('⚠️ No active context returned, falling back to defaults');
      window.globalSchoolContext = {
        currentYear: 2567,
        currentSemester: { id: 1, semester_name: 'ภาคเรียนที่ 1' },
        dataLoaded: false
      };
    }

    const scheduleResult = await coreAPI.getCurrentSchedule();
    console.log('📦 Schedule result:', scheduleResult);

    if (scheduleResult.success && scheduleResult.data) {
      window.globalSchoolContext.hasSchedule = true;
      window.globalSchoolContext.scheduleData = scheduleResult.data;
    } else {
      window.globalSchoolContext.hasSchedule = false;
      window.globalSchoolContext.scheduleData = null;
    }
  } catch (error) {
    console.error('❌ Error loading initial context:', error);
    window.globalSchoolContext = {
      currentYear: 2567,
      currentSemester: { id: 1, semester_name: 'ภาคเรียนที่ 1' },
      dataLoaded: false,
      hasSchedule: false,
      scheduleData: null,
      error: error.message
    };
  }
}

export async function loadDefaultClassSelection() {
  try {
    const currentPage = getCurrentPage();
    if (currentPage !== 'student') {
      return;
    }

    const studentPage = await import('../pages/studentSchedule.js');
    if (studentPage.refreshClassSelector) {
      const currentContext = getGlobalContext();
      await studentPage.refreshClassSelector(currentContext, null);
    }
  } catch (error) {
    console.error('[App] Error loading default class selection:', error);
  }
}

export async function setDefaultContext(app, context) {
  try {
    const globalContext = await import('../context/globalContext.js');
    if (globalContext.setContext) {
      await globalContext.setContext(context.year, context.semesterId);
    }
    app.context = context;
  } catch (error) {
    console.error('❌ Error setting default context:', error);
  }
}

export async function setupContextSelectors(app) {
  const yearSelector = document.getElementById('year-selector');
  const semesterSelector = document.getElementById('semester-selector');
  const applyBtn = document.getElementById('context-apply-btn');

  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const selectedYear = parseInt(yearSelector?.value, 10);
      const selectedSemesterId = parseInt(semesterSelector?.value, 10);

      if (selectedYear && selectedSemesterId) {
        await app.applyContextChange(selectedYear, selectedSemesterId);
      } else {
        app.showNotification('โปรดเลือกปีการศึกษาและภาคเรียน', 'warning');
      }
    });
  }

  if (yearSelector) {
    yearSelector.addEventListener('change', async () => {
      await app.updateSemesterOptions();
    });
  }
}

export async function updateSemesterOptions() {
  const yearSelector = document.getElementById('year-selector');
  const semesterSelector = document.getElementById('semester-selector');

  if (!yearSelector || !semesterSelector) {
    return;
  }

  const selectedYear = parseInt(yearSelector.value, 10);
  if (!selectedYear) {
    semesterSelector.innerHTML = '<option value=\"\">เลือกภาคเรียน</option>';
    return;
  }

  try {
    const context = getGlobalContext();
    const yearData = context.availableYears?.find((year) => year.year === selectedYear);
    if (!yearData) {
      semesterSelector.innerHTML = '<option value=\"\">ไม่พบภาคเรียน</option>';
      return;
    }

    const response = await coreAPI.getSemesters();
    if (!response.success) {
      semesterSelector.innerHTML = '<option value=\"\">ไม่สามารถโหลดภาคเรียนได้</option>';
      return;
    }

    const filteredSemesters = (response.data || []).filter(
      (semester) => semester.academic_year_id === yearData.id
    );

    semesterSelector.innerHTML = '<option value=\"\">เลือกภาคเรียน</option>';
    filteredSemesters.forEach((semester) => {
      const option = document.createElement('option');
      option.value = semester.id;
      option.textContent = semester.semester_name;
      semesterSelector.appendChild(option);
    });

    if (filteredSemesters.length > 0) {
      semesterSelector.value = filteredSemesters[0].id;
    }
  } catch (error) {
    console.error('Error updating semester options:', error);
  }
}

export async function applyContextChange(app, newYear, newSemesterId) {
  try {
    const { switchContext } = await import('../context/globalContext.js');
    const result = await switchContext(newYear, newSemesterId);

    if (!result.ok) {
      throw new Error(result.error || 'Context switch failed');
    }

    const globalContextState = getGlobalContext();
    const activeSemester = globalContextState?.currentSemester || null;

    app.context = {
      year: newYear,
      semesterId: newSemesterId,
      semester: activeSemester
    };

    saveContextToStorage(app, {
      year: newYear,
      semesterId: newSemesterId
    });

    const currentPage = getCurrentPage();

    if (currentPage === 'teacher') {
      try {
        const teacherPage = await import('../pages/teacherSchedule.js');
        if (teacherPage && typeof teacherPage.refreshPage === 'function') {
          const ctx = getGlobalContext();
          await teacherPage.refreshPage(ctx);
        }

        const summaryTab = document.querySelector('[data-target=\"teacher-summary\"]');
        const detailsTab = document.querySelector('[data-target=\"teacher-details\"]');
        const summaryContent = document.getElementById('teacher-summary');
        const detailsContent = document.getElementById('teacher-details');
        if (summaryTab && detailsTab) {
          summaryTab.classList.add('active');
          summaryTab.setAttribute('aria-selected', 'true');
          detailsTab.classList.remove('active');
          detailsTab.setAttribute('aria-selected', 'false');
        }
        if (summaryContent && detailsContent) {
          summaryContent.classList.remove('hidden');
          summaryContent.classList.add('active');
          detailsContent.classList.remove('active');
          detailsContent.classList.add('hidden');
        }
      } catch (error) {
        console.warn('Failed to refresh teacher page after context change:', error);
      }
    } else {
      await app.refreshContentOnly({ year: newYear, semesterId: newSemesterId });
      await app.refreshCurrentPage(getGlobalContext());
    }

    const semesterName = await app.getSemesterName(newSemesterId);
    app.showNotification(`เปลี่ยนไปปีการศึกษา ${newYear} ${semesterName} เรียบร้อยแล้ว`, 'success');
  } catch (error) {
    console.error('Error applying context change:', error);
    app.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนบริบท: ' + error.message, 'error');
  }
}

export async function handleYearChange(app, newYear) {
  try {
    const context = getGlobalContext();
    const newYearData = context.availableYears.find((year) => year.year === newYear);
    if (!newYearData) {
      throw new Error(`Year ${newYear} not found`);
    }

    const firstSemester = context.availableSemesters[0];
    if (!firstSemester) {
      throw new Error(`No semesters found for year ${newYear}`);
    }

    const { switchContext } = await import('../context/globalContext.js');
    await switchContext(newYear, firstSemester.id);

    await app.refreshCurrentPage(getGlobalContext());
  } catch (error) {
    console.error('Error handling year change:', error);
    app.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนปีการศึกษา: ' + error.message, 'error');
  }
}

export async function handleSemesterChange(app, newSemesterId) {
  try {
    const context = getGlobalContext();
    const currentYear = context.currentYear;
    if (!currentYear) {
      throw new Error('No current year set');
    }

    const { switchContext } = await import('../context/globalContext.js');
    await switchContext(currentYear, newSemesterId);

    await app.refreshCurrentPage(getGlobalContext());
  } catch (error) {
    console.error('Error handling semester change:', error);
    app.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนภาคเรียน: ' + error.message, 'error');
  }
}

export async function handleContextChange(app, newContext = {}) {
  try {
    const globalContextState = getGlobalContext();
    const normalizedYear =
      newContext?.year ??
      newContext?.currentYear ??
      globalContextState?.currentYear ??
      null;

    const normalizedSemesterObject =
      newContext?.semester ??
      (newContext?.semesterId
        ? globalContextState?.availableSemesters?.find(
            (item) => item.id === newContext.semesterId
          )
        : null) ??
      globalContextState?.currentSemester ??
      null;

    const normalizedSemesterId =
      newContext?.semesterId ?? normalizedSemesterObject?.id ?? null;

    const previousContext = app.context || {};
    const hasChanged =
      previousContext.year !== normalizedYear ||
      previousContext.semesterId !== normalizedSemesterId;

    app.context = {
      year: normalizedYear,
      semesterId: normalizedSemesterId,
      semester: normalizedSemesterObject
    };

    saveContextToStorage(app, {
      year: normalizedYear,
      semesterId: normalizedSemesterId
    });

    if (!hasChanged) {
      return { ok: true, context: app.context };
    }

    if (app.currentPage === 'student') {
      await app.refreshContentOnly(app.context);
    }

    await app.refreshCurrentPage(globalContextState);

    return { ok: true, context: app.context };
  } catch (error) {
    console.error('Error handling context change:', error);
    if (typeof app.showNotification === 'function') {
      app.showNotification('เกิดข้อผิดพลาดในการอัปเดตบริบท: ' + error.message, 'error');
    }
    return { ok: false, error: error.message };
  }
}

export async function setContext(app, year, semesterId) {
  try {
    const { setContext: setGlobalContext } = await import('../context/globalContext.js');
    const result = await setGlobalContext(year, semesterId);

    if (!result.ok) {
      throw new Error(result.error || 'Failed to set context');
    }

    const semesterFromResult =
      result.context?.currentSemester || getGlobalContext()?.currentSemester || null;

    return await handleContextChange(app, {
      year,
      semesterId,
      semester: semesterFromResult
    });
  } catch (error) {
    console.error('Error setting context:', error);
    if (typeof app.showNotification === 'function') {
      app.showNotification('เกิดข้อผิดพลาดในการตั้งค่าบริบท: ' + error.message, 'error');
    }
    return { ok: false, error: error.message };
  }
}

export function useGlobalContext() {
  return {
    getContext: () => getGlobalContext()
  };
}

export function isContextValid(_app, context) {
  return (
    context &&
    typeof context.year === 'number' &&
    context.year >= 2500 &&
    context.year <= 3000 &&
    context.semesterId
  );
}

export function loadContextFromStorage() {
  try {
    const stored = localStorage.getItem('school-schedule-context');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Error loading context from storage:', error);
    return null;
  }
}

export function saveContextToStorage(_app, context) {
  try {
    localStorage.setItem('school-schedule-context', JSON.stringify(context));
  } catch (error) {
    console.warn('Error saving context to storage:', error);
  }
}

export async function refreshContentOnly(app, newContext) {
  if (app.currentPage !== 'student') {
    return;
  }

  try {
    const scheduleContainer = document.querySelector('#student-schedule-table');
    if (scheduleContainer) {
      scheduleContainer.innerHTML = '<p>โปรดเลือกห้องเพื่อแสดงตาราง</p>';
    }

    const classSelector = document.querySelector('#class-dropdown');
    if (classSelector) {
      classSelector.value = '';
    }

    const studentPage = await import('../pages/studentSchedule.js');
    if (studentPage.refreshClassSelector) {
      await studentPage.refreshClassSelector(newContext, null);
    }
  } catch (error) {
    console.error('Error refreshing student content:', error);
    app.showNotification('เกิดข้อผิดพลาดในการรีเฟรชเนื้อหา', 'error');
  }
}

export async function refreshCurrentPage(app, newContext) {
  if (!app.currentPage) {
    return;
  }

  try {
    if (app.currentPage === 'student') {
      const studentPage = await import('../pages/studentSchedule.js');
      if (studentPage.refreshPage) {
        await studentPage.refreshPage(newContext, null);
      }
    } else if (app.currentPage === 'teacher') {
      const teacherPage = await import('../pages/teacherSchedule.js');
      if (teacherPage.refreshPage) {
        await teacherPage.refreshPage(newContext);
      }
    } else if (app.currentPage === 'substitution') {
      const substitutionPage = await import('../pages/substitution/schedule.js');
      if (substitutionPage.refreshPage) {
        await substitutionPage.refreshPage(newContext);
      }
    } else if (app.currentPage === 'admin') {
      const adminPage = await import('../pages/admin.js');
      if (adminPage.refreshPage) {
        await adminPage.refreshPage(newContext);
      }
    }
  } catch (error) {
    console.error('Error refreshing current page:', error);
    app.showNotification('เกิดข้อผิดพลาดในการรีเฟรชหน้าปัจจุบัน: ' + error.message, 'error');
  }
}
