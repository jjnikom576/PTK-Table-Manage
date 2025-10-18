import { navigateToPage as navigateToPageUtil, getCurrentPage } from '../navigation.js';
import { initStudentSchedulePage } from '../pages/studentSchedule.js';
import { initTeacherSchedulePage } from '../pages/teacherSchedule.js';
import { initSubstitutionSchedulePage } from '../pages/substitutionSchedule.js';
import { initAdminPage } from '../pages/admin.js';

export function setupEventListeners(app) {
  console.log('🎛️ Setting up event listeners...');

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-page]')) {
      e.preventDefault();
      const page = e.target.dataset.page;
      console.log('🧭 Navigation clicked:', page);
      app.navigateToPage(page);
    }
  });

  window.addEventListener('hashchange', () => {
    app.handleURLChange();
  });

  window.addEventListener('popstate', () => {
    app.handleURLChange();
  });

  app.setupContextSelectors();

  console.log('✅ Event listeners setup completed');
}

export function bindExportHandlers() {
  console.log('🧾 Binding export handlers...');
  console.log('✅ Export handlers bound');
}

export async function initializeRouting(app) {
  console.log('🛣️ Initializing routing...');

  const hash = window.location.hash;
  if (hash === '#teacher-schedule') {
    app.currentPage = 'teacher';
  } else if (hash === '#substitution') {
    app.currentPage = 'substitution';
  } else if (hash === '#admin') {
    app.currentPage = 'admin';
  } else {
    app.currentPage = 'student';
  }

  console.log(`✅ Initial currentPage set to: ${app.currentPage}`);
  console.log('✅ Routing initialized');
}

export async function navigateToPage(app, pageId, subPageId = null) {
  try {
    console.log(`🧭 Navigating to page: ${pageId}`);

    app.currentPage = pageId;
    navigateToPageUtil(pageId, subPageId);

    console.log(`✅ Navigation completed, currentPage: ${app.currentPage}`);
  } catch (error) {
    console.error('Navigation error:', error);
    app.showNotification('เกิดข้อผิดพลาดในการนำทาง', 'error');
  }
}

export async function showPage(app, pageId, context) {
  const pageContainer = document.querySelector(`#page-${pageId}`);
  if (!pageContainer) {
    throw new Error(`Page container not found: ${pageId}`);
  }

  pageContainer.style.display = 'block';

  switch (pageId) {
    case 'student':
      if (!app.modules.studentSchedule) {
        app.modules.studentSchedule = true;
        await initStudentSchedulePage(context);
      }
      break;
    case 'teacher':
      if (!app.modules.teacherSchedule) {
        app.modules.teacherSchedule = true;
        await initTeacherSchedulePage(context);
      }
      break;
    case 'substitution':
      if (!app.modules.substitution) {
        app.modules.substitution = true;
        await initSubstitutionSchedulePage(context);
      }
      break;
    case 'admin':
      if (!app.modules.admin) {
        app.modules.admin = true;
        await initAdminPage(context);
      }
      break;
  }
}

export function handleURLChange(app) {
  app.currentPage = getCurrentPage();
}

export function hideAllPages() {
  const pages = document.querySelectorAll('[id^="page-"]');
  pages.forEach((page) => {
    page.style.display = 'none';
  });
}

export function updateNavigationUI(pageId) {
  const navItems = document.querySelectorAll('[data-page]');
  navItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });
}
