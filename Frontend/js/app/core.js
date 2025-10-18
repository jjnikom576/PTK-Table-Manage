import templateLoader from '../templateLoader.js';
import { initGlobalContext, getContext } from '../context/globalContext.js';
import { initDataService, loadYearData } from '../services/dataService.js';
import { initYearService } from '../services/yearService.js';
import { initNavigation, setupMobileMenu, navigateToPage as navigateToPageUtil } from '../navigation.js';
import { initStudentSchedulePage } from '../pages/studentSchedule.js';
import { initTeacherSchedulePage } from '../pages/teacherSchedule.js';
import { initSubstitutionSchedulePage } from '../pages/substitution/schedule.js';
import { initAdminPage } from '../pages/admin.js';
import coreAPI from '../api/core-api.js';

export async function loadCoreTemplates() {
  try {
    console.log('📦 Loading core templates...');

    const templates = await templateLoader.loadMultiple([
      'components/global-context',
      'components/navigation',
      'components/footer'
    ]);

    const globalContextContainer = document.getElementById('global-context-container');
    const navigationContainer = document.getElementById('navigation-container');
    const footerContainer = document.getElementById('footer-container');

    if (globalContextContainer) {
      globalContextContainer.innerHTML = templates['components/global-context'];
    }

    if (navigationContainer) {
      navigationContainer.innerHTML = templates['components/navigation'];
    }

    if (footerContainer) {
      footerContainer.innerHTML = templates['components/footer'];
    }

    console.log('✅ Core templates loaded');
  } catch (error) {
    console.error('❌ Error loading core templates:', error);
    throw error;
  }
}

export async function getSemesterName(_app, semesterId) {
  if (!semesterId) {
    return 'ภาคเรียน';
  }

  try {
    const context = getContext();
    const inContext =
      context.availableSemesters?.find((semester) => semester.id === semesterId) || null;
    if (inContext) {
      return inContext.semester_name || inContext.name || 'ภาคเรียน';
    }

    const response = await coreAPI.getSemesters();
    if (response.success) {
      const semester =
        (response.data || []).find((item) => item.id === semesterId) || null;
      return semester ? semester.semester_name || semester.name || 'ภาคเรียน' : 'ภาคเรียน';
    }

    return 'ภาคเรียน';
  } catch (error) {
    console.error('Error getting semester name:', error);
    return 'ภาคเรียน';
  }
}

export async function initApp(app) {
  try {
    console.log('🚀 Starting School Schedule App...');

    await app.loadCoreTemplates();
    await app.initCoreServices();
    await app.loadInitialContext();
    await app.initModules();
    await app.initializeStudentPage();

    app.setupEventListeners();
    app.bindExportHandlers();

    app.initialized = true;
    console.log('✅ App initialized successfully');

    await app.loadDefaultPage();
  } catch (error) {
    await app.handleInitializationError(error);
  }
}

export async function initCoreServices() {
  console.log('🛠️ Initializing core services...');

  await initDataService({ mode: 'api' });
  await initYearService();
  await initGlobalContext();

  console.log('✅ Core services initialized');
}

export async function initModules(app) {
  console.log('🧩 Initializing modules...');

  await initNavigation();

  app.modules = {
    studentSchedule: initStudentSchedulePage,
    teacherSchedule: initTeacherSchedulePage,
    substitution: initSubstitutionSchedulePage,
    admin: initAdminPage
  };

  console.log('✅ Modules initialized');
}

export async function initializeStudentPage(app) {
  try {
    console.log('📚 Initializing student schedule page...');

    const context = getContext();
    if (app.modules.studentSchedule) {
      await app.modules.studentSchedule(context);
    }

    console.log('✅ Student schedule page initialized');
  } catch (error) {
    console.error('❌ Error initializing student page:', error);
  }
}

export async function initializeTeacherPage(app) {
  try {
    console.log('👩‍🏫 Initializing teacher schedule page...');

    const context = getContext();
    if (app.modules.teacherSchedule) {
      await app.modules.teacherSchedule(context);
    }

    console.log('✅ Teacher schedule page initialized');
  } catch (error) {
    console.error('❌ Error initializing teacher page:', error);
  }
}

export async function loadDefaultPage(app) {
  try {
    const hashPage = (typeof window !== 'undefined' && window.location && window.location.hash)
      ? window.location.hash.replace('#', '')
      : '';

    const userRequestedPage =
      app._userNavigated ||
      (hashPage && hashPage !== '' && hashPage !== 'student' && hashPage !== 'student-schedule');

    if (userRequestedPage) {
      console.log('⏭️ Default page load skipped; user already navigated to:', hashPage || app.currentPage);
      return;
    }

    if (app.currentPage && app.currentPage !== 'student') {
      console.log('⏭️ Default page load skipped; current page is already:', app.currentPage);
      return;
    }

    console.log('📄 Loading default page...');

    const studentPage = document.getElementById('page-student');
    if (studentPage) {
      studentPage.classList.remove('hidden');
      app.currentPage = 'student';

      if (typeof navigateToPageUtil === 'function') {
        await navigateToPageUtil('student');
      }

      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.dataset.page === 'student') {
          link.classList.add('active');
        }
      });
    }

    console.log('✅ Default page loaded:', app.currentPage);

    setTimeout(() => {
      const currentStudentPage = document.getElementById('page-student');
      if (currentStudentPage) {
        console.log('🔍 Checking student page visibility:', {
          classList: Array.from(currentStudentPage.classList),
          display: currentStudentPage.style.display,
          visible: !currentStudentPage.classList.contains('hidden')
        });
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Error loading default page:', error);
  }
}

export async function initializeModules(app) {
  console.log('🧭 Initializing page modules...');

  initNavigation();
  setupMobileMenu();

  app.modules = {
    navigation: true,
    studentSchedule: null,
    teacherSchedule: null,
    substitution: null,
    admin: null
  };

  console.log('✅ Page modules initialized');
}

export async function loadInitialData() {
  console.log('📥 Loading initial data...');

  try {
    const context = getContext();
    if (context.currentYear) {
      await loadYearData(context.currentYear);
    }

    console.log('✅ Initial data loaded');
  } catch (error) {
    console.warn('⚠️ Error loading initial data:', error);
  }
}

export async function handleInitializationError(app, error) {
  console.error('❌ Application initialization failed:', error);

  app.errorState = error;

  const errorContainer = document.querySelector('#app-error');
  if (errorContainer) {
    errorContainer.innerHTML = `
        <div class="error-message">
          <h3>เกิดข้อผิดพลาดในการเริ่มระบบ</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()">โหลดหน้าใหม่</button>
        </div>
      `;
    errorContainer.style.display = 'block';
  }
}
