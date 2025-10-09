import authAPI from '../api/auth-api.js';
import { getContext } from '../context/globalContext.js';

import adminState, { normalizeContext } from './admin/state.js';
import { ensureUserActionsInSubnav, adjustAuthInputWidth } from './admin/uiHelpers.js';
import {
  bindAuthForm,
  bindLogout,
  showAuthOnly,
  showAdminSections,
  updateUsernameHeader
} from './admin/auth.js';
import { loadAdminTemplates } from './admin/templates.js';
import { initAcademicManagement } from './admin/academicManagement.js';
import { initTeacherManagement } from './admin/teacherManagement.js';
import {
  initClassManagement,
  loadClassesData,
  renderClassesTable
} from './admin/classManagement.js';
import {
  initRoomManagement,
  loadRoomsData,
  renderRoomsTable
} from './admin/roomManagement.js';
import {
  initSubjectManagement,
  loadSubjectsData,
  renderSubjectsTable
} from './admin/subjectManagement.js';
import {
  initPeriodManagement,
  loadPeriodsData,
  renderPeriodsTable
} from './admin/periodManagement.js';
import { initSchedulePromptTools } from './admin/schedulePrompt.js';
import { bindMainAdminNavigation, bindDataSubNavigation } from './admin/navigation.js';

async function bootstrapAdminModules() {
  await loadAdminTemplates();
  bindDataSubNavigation();

  await initAcademicManagement();
  await initTeacherManagement();
  await initClassManagement();
  await initRoomManagement();
  await initSubjectManagement();
  await initPeriodManagement();
  initSchedulePromptTools();
}

export async function initAdminPage(context = null) {
  const section = document.getElementById('page-admin');
  if (section) {
    section.classList.remove('hidden');
    section.style.display = 'block';
  }

  try {
    ensureUserActionsInSubnav();
  } catch (error) {
    console.warn('Unable to ensure user actions in sub navigation:', error);
  }

  adminState.context = normalizeContext(context) || getContext();

  if (authAPI.isAuthenticated()) {
    showAdminSections();
    updateUsernameHeader();
    await bootstrapAdminModules();
  } else {
    showAuthOnly();
    await loadAdminTemplates();
    bindDataSubNavigation();
  }

  bindAuthForm({
    onLoginSuccess: async () => {
      showAdminSections();
      updateUsernameHeader();
      await bootstrapAdminModules();
    }
  });

  bindLogout({
    onLogout: () => {
      window.location.hash = 'login';
      window.location.reload();
    }
  });

  adjustAuthInputWidth();
  bindMainAdminNavigation();
  initSchedulePromptTools();

  adminState.initialized = true;
}

export function setAdminContext(year, semesterId) {
  adminState.context = { year, semesterId };
}

export function validateAdminContextAccess() {
  return true;
}

export function updateAdminUIForContext(context) {
  adminState.context = normalizeContext(context) || adminState.context;
}

document.addEventListener('admin:refresh-all-requested', async () => {
  try {
    await loadClassesData();
    await loadRoomsData();
    await loadSubjectsData();
    await loadPeriodsData();

    renderClassesTable();
    renderRoomsTable();
    renderSubjectsTable();
    renderPeriodsTable();
  } catch (error) {
    console.error('Failed to refresh admin datasets:', error);
  }
});

// Legacy exports kept for compatibility with existing imports.
export async function showTeacherManagement() {}
export async function showClassManagement() {}
export async function showRoomManagement() {}
export async function showSubjectManagement() {}
export async function showScheduleManagement() {}
