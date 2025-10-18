import { pageState, setPageState } from './state.js';
import { renderTeacherTabs, renderTeacherSchedule } from './ui.js';
import { centerElementInContainer } from './helpers.js';
import { setupExportHandlers } from './exporting.js';

export function setupEventListeners(context) {
  if (pageState.eventsInitialized) {
    console.log('[TeacherSchedule] Event listeners already initialized, skipping...');
    return;
  }

  console.log('[TeacherSchedule] Setting up event listeners');

  document.addEventListener('click', async (event) => {
    if (event.target.matches('.sub-nav-tab') && event.target.closest('#page-teacher')) {
      console.log('[TeacherSchedule] Sub-nav tab clicked:', event.target.dataset.target);

      const targetId = event.target.dataset.target;
      const allTabs = document.querySelectorAll('#page-teacher .sub-nav-tab');
      allTabs.forEach((tab) => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });

      event.target.classList.add('active');
      event.target.setAttribute('aria-selected', 'true');

      const allSubPages = document.querySelectorAll('#page-teacher .sub-page');
      allSubPages.forEach((page) => {
        page.classList.remove('active');
        page.classList.add('hidden');
      });

      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');
      }

      console.log(`[TeacherSchedule] Switched to tab: ${targetId}`);
    }
  });

  document.addEventListener('click', async (event) => {
    const chip = event.target.closest('.group-chip');
    if (chip) {
      const group = chip.getAttribute('data-group');
      if (!group || group === 'ALL' || pageState.selectedGroup === group) {
        setPageState({ selectedGroup: 'ALL' });
      } else {
        setPageState({ selectedGroup: group });
      }
      await renderTeacherTabs(context);
      return;
    }

    if (event.target.matches('.teacher-tab')) {
      console.log('[TeacherSchedule] Teacher tab clicked:', event.target.dataset.teacherId);
      const teacherId = parseInt(event.target.dataset.teacherId, 10);
      try {
        const tabsContainer = document.getElementById('teacher-tabs');
        if (tabsContainer && event.target) {
          centerElementInContainer(tabsContainer, event.target);
        }
      } catch (error) {
        console.warn('[TeacherSchedule] Failed to center tab:', error);
      }
      await selectTeacher(teacherId, context);
    }
  });

  document.addEventListener('click', async (event) => {
    const rankingItem = event.target.closest('.ranking-item');
    if (!rankingItem) return;

    console.log('[TeacherSchedule] Ranking item clicked:', rankingItem.dataset.teacherId);
    const teacherId = parseInt(rankingItem.dataset.teacherId, 10);

    const summaryTab = document.querySelector('[data-target="teacher-summary"]');
    const detailsTab = document.querySelector('[data-target="teacher-details"]');

    if (summaryTab && detailsTab) {
      summaryTab.classList.remove('active');
      summaryTab.setAttribute('aria-selected', 'false');

      detailsTab.classList.add('active');
      detailsTab.setAttribute('aria-selected', 'true');

      const summaryContent = document.getElementById('teacher-summary');
      const detailsContent = document.getElementById('teacher-details');

      if (summaryContent) {
        summaryContent.classList.remove('active');
        summaryContent.classList.add('hidden');
      }

      if (detailsContent) {
        detailsContent.classList.remove('hidden');
        detailsContent.classList.add('active');
      }

      console.log('[TeacherSchedule] Switched to teacher details tab');
    }

    await selectTeacher(teacherId, context);
  });

  setPageState({ eventsInitialized: true });
  console.log('[TeacherSchedule] Event listeners setup completed');
}

export async function selectTeacher(teacherId, context) {
  document.querySelectorAll('.teacher-tab').forEach((tab) => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });

  const activeTab = document.querySelector(`[data-teacher-id="${teacherId}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    const tabsContainer = document.getElementById('teacher-tabs');
    if (tabsContainer) {
      centerElementInContainer(tabsContainer, activeTab);
    }
  }

  setPageState({ selectedTeacher: teacherId, hasUserSelection: true });

  await renderTeacherSchedule(teacherId, context);
  setupExportHandlers(teacherId, context);
}
