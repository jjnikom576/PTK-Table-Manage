import { getContext, onContextChange } from '../../context/globalContext.js';
import { formatThaiDate, getThaiDayName } from '../../utils.js';
import {
  substitutionPageState,
  setSubstitutionContext,
  setSelectedDate,
  getSelectedDate,
  getLoadedData,
  setCurrentSubPage,
  showSubstitutionPageLoading,
  showSubstitutionPageError,
  updateContextBadge
} from './state.js';
import {
  renderHallOfFame,
  renderSubstituteRanking,
  renderSubstituteStats,
  renderSubstitutionExportBar,
  renderSubstitutionScheduleView,
  renderDatePicker,
  renderAbsentTeacherCards,
  renderSubstituteAssignments,
  renderSubstitutionManagement,
  displaySubstituteRecommendations
} from './ui.js';
import {
  loadSubstitutionDataForContext as fetchSubstitutionData,
  calculateSubstituteStats,
  generateSubstituteRanking,
  findOptimalSubstitutes
} from './data.js';
import {
  exportSubstitutionData,
  exportMonthlySubstitutionReport
} from './exporting.js';

export {
  renderHallOfFame,
  renderSubstitutionExportBar,
  renderSubstituteRanking,
  renderSubstituteStats,
  renderDatePicker,
  renderAbsentTeacherCards,
  renderSubstituteAssignments,
  renderSubstitutionManagement,
  exportSubstitutionData,
  exportMonthlySubstitutionReport,
  calculateSubstituteStats,
  generateSubstituteRanking
};

export async function initSubstitutionPage(context = getContext()) {
  console.log('Initializing Substitution Page...', context);

  try {
    setSubstitutionContext(context);
    initSubstitutionSubNav(context);
    await fetchSubstitutionData();
    setupSubstitutionPageEventListeners(context);
    await switchToHallOfFame(context);

    onContextChange(async (newContext) => {
      await updatePageForContext(newContext);
    });

    console.log('Substitution Page initialized successfully');
  } catch (error) {
    console.error('Error initializing Substitution Page:', error);
    showSubstitutionPageError(`เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}`);
  }
}

export async function updatePageForContext(newContext) {
  console.log('Updating Substitution Page for new context:', newContext);

  try {
    setSubstitutionContext(newContext);
    updateContextBadge(newContext);
    await fetchSubstitutionData();

    if (substitutionPageState.currentSubPage === 'hall-of-fame') {
      await switchToHallOfFame(newContext);
    } else if (substitutionPageState.currentSubPage === 'substitution-schedule') {
      await switchToSubstitutionSchedule(newContext);
    } else if (substitutionPageState.currentSubPage === 'substitution-management') {
      await switchToSubstitutionManagement(newContext);
    }
  } catch (error) {
    console.error('Error updating Substitution Page context:', error);
    showSubstitutionPageError(`ไม่สามารถเปลี่ยนบริบทได้: ${error.message}`);
  }
}

export async function loadSubstitutionByDate(date, context) {
  try {
    setSelectedDate(date);
    const data = getLoadedData();
    const substitutions = (data.substitutions || []).filter(
      (substitution) => substitution.absent_date === date
    );

    const substitutionDisplay = document.querySelector('#substitution-display');
    if (!substitutionDisplay) {
      return;
    }

    if (!substitutions.length) {
      substitutionDisplay.innerHTML = `
        <div class="no-substitutions">
          <p>ไม่มีการสอนแทนในวันที่ ${formatThaiDate(date)}</p>
        </div>
      `;
      return;
    }

    const detailedSubstitutions = await Promise.all(
      substitutions.map(async (substitution) => {
        const teacher = (data.teachers || []).find(
          (item) => item.id === substitution.absent_teacher_id
        );

        const affectedSchedules = (data.schedules || []).filter((schedule) => {
          const subject = (data.subjects || []).find((s) => s.id === schedule.subject_id);
          return subject && subject.teacher_id === substitution.absent_teacher_id;
        });

        const affectedSchedulesWithDetails = affectedSchedules.map((schedule) => {
          const subject = (data.subjects || []).find((s) => s.id === schedule.subject_id);
          const classData = (data.classes || []).find((c) => c.id === schedule.class_id);
          const room = (data.rooms || []).find((r) => r.id === schedule.room_id);

          return {
            ...schedule,
            subject_name: subject?.subject_name || '',
            class_name: classData?.class_name || '',
            room_name: room?.name || '',
            room_type: room?.room_type || ''
          };
        });

        return {
          ...substitution,
          teacher_name: teacher?.name || 'ไม่ระบุ',
          affected_schedules: affectedSchedulesWithDetails
        };
      })
    );

    const assignments = buildSubstituteAssignmentsForDate(date, data);

    substitutionDisplay.innerHTML = `
      <div class="substitution-date-header">
        <h4>📋 ตารางสอนแทน - วันที่ ${formatThaiDate(date)}</h4>
      </div>

      ${renderSubstitutionExportBar()}

      <div class="absent-teachers-section">
        <h5>ครูที่ไม่อยู่</h5>
        ${renderAbsentTeacherCards(detailedSubstitutions)}
      </div>

      <div class="substitute-assignments-section">
        <h5>ตารางสอนแทน</h5>
        ${renderSubstituteAssignments(assignments)}
      </div>
    `;

    attachExportHandlers(context);
  } catch (error) {
    console.error('Error loading substitution by date:', error);
    throw error;
  }
}

export function validateSubstitutionAccess(context) {
  return !!(context && context.semesterId);
}

export async function switchToHallOfFame(context) {
  setCurrentSubPage('hall-of-fame');

  const contentContainer = document.querySelector('#substitution-content');
  if (!contentContainer) return;

  try {
    showSubstitutionPageLoading(true);
    const hallOfFameHTML = await renderHallOfFame(context);
    contentContainer.innerHTML = hallOfFameHTML;
  } catch (error) {
    console.error('Error switching to Hall of Fame:', error);
    showSubstitutionPageError(`ไม่สามารถแสดง Hall of Fame ได้: ${error.message}`);
  } finally {
    showSubstitutionPageLoading(false);
  }
}

export async function switchToSubstitutionSchedule(context) {
  setCurrentSubPage('substitution-schedule');

  const contentContainer = document.querySelector('#substitution-content');
  if (!contentContainer) return;

  try {
    showSubstitutionPageLoading(true);

    const scheduleHTML = await renderSubstitutionScheduleView();
    contentContainer.innerHTML = scheduleHTML;

    initializeDatePicker(context);
    await loadSubstitutionByDate(getSelectedDate(), context);
  } catch (error) {
    console.error('Error switching to substitution schedule:', error);
    showSubstitutionPageError(`ไม่สามารถแสดงตารางสอนแทนได้: ${error.message}`);
  } finally {
    showSubstitutionPageLoading(false);
  }
}

export async function switchToSubstitutionManagement(context) {
  setCurrentSubPage('substitution-management');

  const contentContainer = document.querySelector('#substitution-content');
  if (!contentContainer) return;

  try {
    showSubstitutionPageLoading(true);
    const data = getLoadedData();
    const managementHTML = await renderSubstitutionManagement(data?.teachers || []);
    contentContainer.innerHTML = managementHTML;
    initializeSubstitutionManagementListeners(context);
  } catch (error) {
    console.error('Error switching to substitution management:', error);
    showSubstitutionPageError(`ไม่สามารถแสดงหน้าจัดการการสอนแทนได้: ${error.message}`);
  } finally {
    showSubstitutionPageLoading(false);
  }
}

function setupSubstitutionPageEventListeners(context) {
  const exportContainer = document.getElementById('substitution-export');
  if (exportContainer) {
    exportContainer.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-export-type]');
      if (!button) return;

      const format = button.dataset.exportType;
      if (format === 'monthly') {
        await exportSubstitutionData(context, 'monthly', 'monthly');
      } else {
        await exportSubstitutionData(context, format, 'daily');
      }
    });
  }

  const subNavContainer = document.querySelector('#substitution-sub-nav');
  if (subNavContainer) {
    subNavContainer.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-sub-page]');
      if (!target) return;

      const subPage = target.dataset.subPage;

      subNavContainer.querySelectorAll('.sub-nav-btn').forEach((btn) =>
        btn.classList.toggle('active', btn.dataset.subPage === subPage)
      );

      if (subPage === 'hall-of-fame') {
        await switchToHallOfFame(context);
      } else if (subPage === 'substitution-schedule') {
        await switchToSubstitutionSchedule(context);
      } else if (subPage === 'substitution-management') {
        await switchToSubstitutionManagement(context);
      }
    });
  }

  document.addEventListener('click', async (event) => {
    const dateButton = event.target.closest('.date-btn');
    if (dateButton) {
      await loadSubstitutionByDate(dateButton.dataset.date, context);
    }
  });
}

function initSubstitutionSubNav(context) {
  const subNavContainer = document.querySelector('#substitution-sub-nav');
  if (!subNavContainer) {
    console.warn('Substitution sub navigation container not found');
    return;
  }

  subNavContainer.innerHTML = `
    <div class="sub-nav-tabs">
      <button class="sub-nav-btn active" data-sub-page="hall-of-fame">
        🏅 Hall of Fame
      </button>
      <button class="sub-nav-btn" data-sub-page="substitution-schedule">
        📋 ตารางสอนแทน
      </button>
      <button class="sub-nav-btn" data-sub-page="substitution-management">
        🔄 จัดการการสอนแทน
      </button>
    </div>
    <div class="context-display">
      <span class="context-badge">
        ${formatSemester(context.semester)} ปีการศึกษา ${context.year}
      </span>
    </div>
  `;
}

function initializeDatePicker(context) {
  const datePicker = document.querySelector('#custom-date-picker');
  if (datePicker) {
    datePicker.addEventListener('change', async (event) => {
      await loadSubstitutionByDate(event.target.value, context);
    });
  }
}

function initializeSubstitutionManagementListeners(context) {
  const container = document.querySelector('#substitution-content');
  if (!container) return;

  const datePicker = container.querySelector('#substitute-date');
  if (datePicker) {
    datePicker.addEventListener('change', (event) => {
      setSelectedDate(event.target.value);
      console.log('[Substitution] Selected date changed to:', event.target.value);
    });
  }

  container.addEventListener('click', async (event) => {
    if (event.target.matches('#btn-find-substitutes')) {
      await findSubstituteTeachers(context);
    }
  });

  container.addEventListener('click', async (event) => {
    if (event.target.matches('#btn-submit-substitutes')) {
      await submitSubstitutions(context);
    }
  });
}

async function findSubstituteTeachers(context) {
  const selectedDate = getSelectedDate();
  if (!selectedDate) {
    alert('กรุณาเลือกวันที่');
    return;
  }

  const checkboxes = document.querySelectorAll('.absent-teacher-checkbox:checked');
  if (!checkboxes.length) {
    alert('กรุณาเลือกครูที่ไม่อยู่อย่างน้อย 1 คน');
    return;
  }

  const absentTeacherIds = Array.from(checkboxes).map((checkbox) =>
    Number.parseInt(checkbox.value, 10)
  );

  console.log('[Substitution] Finding substitutes for:', {
    date: selectedDate,
    absentTeachers: absentTeacherIds
  });

  const recommendationsDiv = document.querySelector('#substitute-recommendations');
  if (recommendationsDiv) {
    recommendationsDiv.classList.remove('hidden');
    recommendationsDiv.innerHTML =
      '<div class="loading-state"><div class="loading-spinner"></div><p>กำลังค้นหาครูสอนแทนที่เหมาะสม...</p></div>';
  }

  const data = getLoadedData();
  const dayOfWeek = new Date(selectedDate).getDay();

  const affectedSchedules = (data.schedules || []).filter((schedule) => {
    const subject = (data.subjects || []).find((item) => item.id === schedule.subject_id);
    return subject && absentTeacherIds.includes(subject.teacher_id) && schedule.day_of_week === dayOfWeek;
  });

  if (!affectedSchedules.length) {
    if (recommendationsDiv) {
      recommendationsDiv.innerHTML =
        '<div class="empty-state"><p>ไม่พบตารางสอนที่ได้รับผลกระทบในวันนี้</p></div>';
    }
    return;
  }

  const recommendations = await findOptimalSubstitutes(
    affectedSchedules,
    absentTeacherIds,
    data,
    selectedDate,
    dayOfWeek
  );

  displaySubstituteRecommendations(recommendations);
}

function buildSubstituteAssignmentsForDate(date, data) {
  const assignments = (data.substitutionSchedules || [])
    .filter((schedule) => {
      const substitution = (data.substitutions || []).find((s) => s.id === schedule.substitution_id);
      return substitution && substitution.absent_date === date;
    })
    .map((schedule) => {
      const substitution = (data.substitutions || []).find((s) => s.id === schedule.substitution_id);
      const originalSchedule = (data.schedules || []).find((s) => s.id === schedule.original_schedule_id);
      const substituteTeacher = (data.teachers || []).find((t) => t.id === schedule.substitute_teacher_id);

      let scheduleDetails = {};
      if (originalSchedule) {
        const subject = (data.subjects || []).find((s) => s.id === originalSchedule.subject_id);
        const classData = (data.classes || []).find((c) => c.id === originalSchedule.class_id);
        const room = (data.rooms || []).find((r) => r.id === originalSchedule.room_id);

        scheduleDetails = {
          subject_name: subject?.subject_name || '',
          class_name: classData?.class_name || '',
          room_name: room?.name || '',
          room_type: room?.room_type || '',
          day_of_week: originalSchedule.day_of_week,
          period: originalSchedule.period
        };
      }

      return {
        ...schedule,
        substitution,
        substitute_teacher_name: substituteTeacher?.name || 'ไม่ระบุ',
        ...scheduleDetails
      };
    });

  return assignments;
}

async function submitSubstitutions(context) {
  const selectedDate = getSelectedDate();
  if (!selectedDate) {
    alert('กรุณาเลือกวันที่');
    return;
  }

  const checkboxes = document.querySelectorAll('.absent-teacher-checkbox:checked');
  if (!checkboxes.length) {
    alert('กรุณาเลือกครูที่ไม่อยู่อย่างน้อย 1 คน');
    return;
  }

  const selects = document.querySelectorAll('.substitute-teacher-select');
  const substitutions = [];

  selects.forEach((select) => {
    const scheduleId = Number.parseInt(select.dataset.scheduleId, 10);
    const substituteTeacherId = select.value ? Number.parseInt(select.value, 10) : null;

    if (substituteTeacherId) {
      substitutions.push({
        schedule_id: scheduleId,
        substitute_teacher_id: substituteTeacherId
      });
    }
  });

  if (!substitutions.length) {
    alert('กรุณาเลือกครูสอนแทนอย่างน้อย 1 คน');
    return;
  }

  const absentTeacherIds = Array.from(checkboxes).map((checkbox) =>
    Number.parseInt(checkbox.value, 10)
  );

  console.log('[Substitution] Submitting:', {
    date: selectedDate,
    absentTeachers: absentTeacherIds,
    substitutions
  });

  alert(`จะบันทึกการสอนแทน ${substitutions.length} คาบ\nในวันที่ ${selectedDate}`);
  // TODO: integrate with backend submission
}

function attachExportHandlers(context) {
  const exportBar = document.querySelector('#substitution-display .export-bar');
  if (!exportBar) return;

  exportBar.addEventListener(
    'click',
    async (event) => {
      const button = event.target.closest('button[data-export-type]');
      if (!button) return;
      const format = button.dataset.exportType;
      if (format === 'monthly') {
        await exportMonthlySubstitutionReport(context);
      } else {
        await exportSubstitutionData(context, format, 'daily');
      }
    },
    { once: true }
  );
}
