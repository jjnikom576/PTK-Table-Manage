/**
 * Simple Navigation System - Fixed for Hash-based routing
 */

// =============================================================================
// NAVIGATION STATE
// =============================================================================

let currentPage = 'student';
let initialized = false;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Initialize Navigation
 */
export function initNavigation() {
  console.log('[Navigation] Initializing...');
  
  if (initialized) return;

  // Setup click handlers for nav links
  const navLinks = document.querySelectorAll('.nav-link[data-page]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.dataset.page;
      showPage(pageId);
    });
  });

  // Setup hash change listener
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== currentPage) {
      showPage(hash);
    }
  });

  // Show initial page
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(`page-${hash}`)) {
    showPage(hash);
  } else {
    showPage('student');
  }

  initialized = true;
  console.log('[Navigation] Initialized successfully');
}

/**
 * Show Page
 */
export function showPage(pageId) {
  console.log(`[Navigation] Showing page: ${pageId}`);

  try {
    // Hide all pages
    const allPages = document.querySelectorAll('[id^="page-"]');
    allPages.forEach(page => {
      page.classList.add('hidden');
      page.style.display = 'none';
    });

    // Show target page
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
      targetPage.style.display = 'block';
      
      // Update hash
      window.location.hash = pageId;
      
      // Update active nav
      updateActiveNav(pageId);
      
      // Update current page
      currentPage = pageId;
      
      // Initialize page if needed
      initializePage(pageId);
      
    } else {
      console.warn(`[Navigation] Page not found: page-${pageId}`);
    }

  } catch (error) {
    console.error('[Navigation] Error showing page:', error);
  }
}

/**
 * Update Active Navigation
 */
function updateActiveNav(pageId) {
  // Remove active from all nav items
  const navItems = document.querySelectorAll('.nav-link');
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.parentElement) {
      item.parentElement.classList.remove('active');
    }
  });

  // Add active to current page
  const activeNav = document.querySelector(`[data-page="${pageId}"]`);
  if (activeNav) {
    activeNav.classList.add('active');
    if (activeNav.parentElement && activeNav.parentElement.classList.contains('nav-item')) {
      activeNav.parentElement.classList.add('active');
    }
  }
}

/**
 * Initialize Page Content
 */
function initializePage(pageId) {
  switch(pageId) {
    case 'student':
      initStudentPage();
      break;
    case 'teacher':
      initTeacherPage();
      break;
    case 'substitution':
      initSubstitutionPage();
      break;
    case 'admin':
      initAdminPage();
      break;
  }
}

// =============================================================================
// PAGE INITIALIZATION
// =============================================================================

function initStudentPage() {
  console.log('[Navigation] Init student page');
  
  const classSelector = document.getElementById('class-dropdown');
  if (classSelector && !classSelector.dataset.initialized) {
    // Add mock data
    classSelector.innerHTML = `
      <option value="">-- เลือกห้องเรียน --</option>
      <option value="m1-1">ม.1/1</option>
      <option value="m1-2">ม.1/2</option>
      <option value="m2-1">ม.2/1</option>
      <option value="m2-2">ม.2/2</option>
      <option value="m3-1">ม.3/1</option>
    `;
    
    classSelector.addEventListener('change', (e) => {
      if (e.target.value) {
        loadMockSchedule(e.target.value);
      }
    });
    
    classSelector.dataset.initialized = 'true';
  }
}

function initTeacherPage() {
  console.log('[Navigation] Init teacher page');
  
  // Setup sub-navigation tabs
  const subTabs = document.querySelectorAll('#page-teacher .sub-nav-tab');
  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      subTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      // Add active to clicked
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      // Show corresponding sub-page
      const target = tab.dataset.target;
      showSubPage(target);
    });
  });
}

function initSubstitutionPage() {
  console.log('[Navigation] Init substitution page');
  
  const subTabs = document.querySelectorAll('#page-substitution .sub-nav-tab');
  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      const target = tab.dataset.target;
      showSubPage(target);
    });
  });
}

function initAdminPage() {
  console.log('[Navigation] Init admin page');
  
  const subTabs = document.querySelectorAll('#page-admin .sub-nav-tab');
  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      const target = tab.dataset.target;
      showSubPage(target);
    });
  });
}

// =============================================================================
// SUB-PAGE FUNCTIONS
// =============================================================================

function showSubPage(subPageId) {
  console.log(`[Navigation] Showing sub-page: ${subPageId}`);
  
  // Hide all sub-pages in current page
  const currentPageElement = document.getElementById(`page-${currentPage}`);
  if (currentPageElement) {
    const allSubPages = currentPageElement.querySelectorAll('.sub-page');
    allSubPages.forEach(page => {
      page.classList.add('hidden');
      page.classList.remove('active');
    });
    
    // Show target sub-page
    const targetSubPage = document.getElementById(subPageId);
    if (targetSubPage) {
      targetSubPage.classList.remove('hidden');
      targetSubPage.classList.add('active');
    }
  }
}

// =============================================================================
// MOCK DATA FUNCTIONS
// =============================================================================

function loadMockSchedule(classId) {
  console.log(`[Navigation] Loading schedule for: ${classId}`);
  
  const scheduleContainer = document.getElementById('student-schedule-table');
  const emptyState = document.getElementById('student-empty-state');
  const scheduleHeader = document.getElementById('student-schedule-header');
  const classTitle = document.getElementById('selected-class-title');
  
  if (emptyState) emptyState.style.display = 'none';
  if (scheduleHeader) scheduleHeader.classList.remove('hidden');
  if (classTitle) classTitle.textContent = `ตารางเรียน ${classId.toUpperCase()}`;
  
  if (scheduleContainer) {
    scheduleContainer.innerHTML = `
      <div class="schedule-table-wrapper">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>คาบ/วัน</th>
              <th>จันทร์</th>
              <th>อังคาร</th>
              <th>พุธ</th>
              <th>พฤหัสบดี</th>
              <th>ศุกร์</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="period-cell">1<br><small>08:20-09:10</small></td>
              <td class="schedule-cell">
                <div class="subject">คณิตศาสตร์</div>
                <div class="teacher">นายสมชาย ใจดี</div>
                <div class="room">ห้อง 401</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">ภาษาไทย</div>
                <div class="teacher">นางสาวมาลี สวยงาม</div>
                <div class="room">ห้อง 402</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">วิทยาศาสตร์</div>
                <div class="teacher">นายวิทย์ ชาญฉลาด</div>
                <div class="room">ห้องแล็บ 1</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">ภาษาอังกฤษ</div>
                <div class="teacher">Miss Jane Smith</div>
                <div class="room">ห้อง 403</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">สังคมศึกษา</div>
                <div class="teacher">นางประไพ รู้แจ้ง</div>
                <div class="room">ห้อง 404</div>
              </td>
            </tr>
            <tr>
              <td class="period-cell">2<br><small>09:10-10:00</small></td>
              <td class="schedule-cell">
                <div class="subject">คณิตศาสตร์</div>
                <div class="teacher">นายสมชาย ใจดี</div>
                <div class="room">ห้อง 401</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">ภาษาไทย</div>
                <div class="teacher">นางสาวมาลี สวยงาม</div>
                <div class="room">ห้อง 402</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">วิทยาศาสตร์</div>
                <div class="teacher">นายวิทย์ ชาญฉลาด</div>
                <div class="room">ห้องแล็บ 1</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">ภาษาอังกฤษ</div>
                <div class="teacher">Miss Jane Smith</div>
                <div class="room">ห้อง 403</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">พลศึกษา</div>
                <div class="teacher">นายกีฬา แข็งแรง</div>
                <div class="room">สนามกีฬา</div>
              </td>
            </tr>
            <tr>
              <td class="period-cell">3<br><small>10:20-11:10</small></td>
              <td class="schedule-cell">
                <div class="subject">ศิลปะ</div>
                <div class="teacher">นางสาวสีสวย งดงาม</div>
                <div class="room">ห้องศิลปะ</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">คณิตศาสตร์</div>
                <div class="teacher">นายสมชาย ใจดี</div>
                <div class="room">ห้อง 401</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">ภาษาไทย</div>
                <div class="teacher">นางสาวมาลี สวยงาม</div>
                <div class="room">ห้อง 402</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">วิทยาศาสตร์</div>
                <div class="teacher">นายวิทย์ ชาญฉลาด</div>
                <div class="room">ห้องแล็บ 2</div>
              </td>
              <td class="schedule-cell">
                <div class="subject">สังคมศึกษา</div>
                <div class="teacher">นางประไพ รู้แจ้ง</div>
                <div class="room">ห้อง 404</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }
}

// =============================================================================
// MOBILE MENU
// =============================================================================

export function setupMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const menu = document.querySelector('.nav-menu');
  
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.classList.contains('open');
      
      if (isOpen) {
        toggle.classList.remove('open');
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        toggle.classList.add('open');
        menu.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
    
    // Close menu when clicking nav links on mobile
    const navLinks = menu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (toggle.classList.contains('open')) {
          toggle.classList.remove('open');
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

export function getCurrentPage() {
  return currentPage;
}

export function navigateToPage(pageId) {
  showPage(pageId);
}

export function getNavigationState() {
  return {
    currentPage,
    initialized
  };
}
