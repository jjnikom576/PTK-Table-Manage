/**
 * Simple Navigation System - Fixed for Hash-based routing
 */

// Import dataService with correct path
import * as dataService from './services/dataService.js';
import * as teacherSchedule from './pages/teacherSchedule.js';
import * as globalContext from './context/globalContext.js';

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
  console.log(`[Navigation] Initializing page: ${pageId}`);
  
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

async function initStudentPage() {
  console.log('[Navigation] Init student page');
  
  const classSelector = document.getElementById('class-dropdown');
  if (classSelector && !classSelector.dataset.initialized) {
    try {
      // ดึงข้อมูล classes จาก dataService
      const classes = await dataService.getClasses();
      
      if (classes.ok && classes.data.length > 0) {
        // สร้าง options จาก mock data
        let optionsHTML = '<option value="">-- เลือกห้องเรียน --</option>';
        
        classes.data.forEach(cls => {
          // แปลง class_name เป็น value (ม.1/1 -> m1-1)
          const value = cls.class_name.replace('ม.', 'm').replace('/', '-');
          optionsHTML += `<option value="${value}">${cls.class_name} (${cls.student_count || 0} คน)</option>`;
        });
        
        classSelector.innerHTML = optionsHTML;
        console.log('[Navigation] Loaded classes from dataService:', classes.data.length, 'classes');
        
      } else {
        // Fallback to hardcode if no data
        console.warn('[Navigation] No classes data, using fallback');
        classSelector.innerHTML = `
          <option value="">-- เลือกห้องเรียน --</option>
          <option value="m1-1222">ม.1/1</option>
          <option value="m1-2">ม.1/2</option>
          <option value="m2-1">ม.2/1</option>
          <option value="m2-2">ม.2/2</option>
          <option value="m3-1">ม.3/1</option>
        `;
      }
    } catch (error) {
      console.error('[Navigation] Error loading classes:', error);
      // Fallback to hardcode on error
      classSelector.innerHTML = `
        <option value="">-- เลือกห้องเรียน --</option>
        <option value="m1-1">ม.1/1</option>
        <option value="m1-2">ม.1/2</option>
      `;
    }
    
    classSelector.addEventListener('change', (e) => {
      if (e.target.value) {
        loadMockSchedule(e.target.value);
      }
    });
    
    classSelector.dataset.initialized = 'true';
  }
}

async function initTeacherPage() {
  console.log('[Navigation] Init teacher page');
  
  try {
    // สร้าง context ง่าย ๆ
    const context = {
      currentYear: 2568,
      currentSemester: { id: 7, semester_number: 1 }
    };
    
    console.log('[Navigation] Teacher page context:', context);
    
    // เรียกใช้ teacherSchedule.js
    await teacherSchedule.initTeacherSchedulePage(context);
    console.log('[Navigation] Teacher schedule initialized');
    
  } catch (error) {
    console.error('[Navigation] Failed to init teacher page:', error);
    // Fallback ใช้วิธีเดิม
    setupBasicTeacherPage();
  }
}

// Fallback function
function setupBasicTeacherPage() {
  console.log('[Navigation] Setting up basic teacher page');
  
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
  
  // Show error message
  const errorDiv = document.createElement('div');
  errorDiv.innerHTML = '<p style="color: red; padding: 20px;">ไม่สามารถโหลดข้อมูลครูได้ กรุณาตรวจสอบ Console และ Context</p>';
  
  const teacherSummary = document.getElementById('teacher-summary');
  if (teacherSummary) {
    teacherSummary.appendChild(errorDiv);
  }
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
    // เรียก dataService จริง ๆ 
    loadStudentScheduleFromService(classId, scheduleContainer);
  }
}

// เรียก dataService เพื่อโหลดตารางจริง
async function loadStudentScheduleFromService(classId, container) {
  try {
    // แสดง loading
    container.innerHTML = '<p>กำลังโหลดตารางจาก Mock Data...</p>';
    
    console.log('[Navigation] Loading schedule for classId:', classId);
    
    // เรียก dataService
    const result = await dataService.getStudentSchedule(classId);
    
    console.log('[Navigation] DataService result:', result);
    
    if (!result.ok) {
      throw new Error(result.error);
    }
    
    // สร้างตารางจาก matrix
    const scheduleTable = buildScheduleTable(result.data.matrix);
    container.innerHTML = scheduleTable;
    
    console.log('[Navigation] Schedule loaded successfully:', result.data);
    
  } catch (error) {
    console.error('[Navigation] Error loading schedule:', error);
    container.innerHTML = `<p class="error">เกิดข้อผิดพลาด: ${error.message}</p>`;
  }
}

// สร้าง HTML table จาก schedule matrix - แนวนอน (วัน=แถว, คาบ=คอลัมน์)
function buildScheduleTable(matrix) {
  const dayNames = { 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ', 4: 'พฤหัสบดี', 5: 'ศุกร์' };
  const timePeriods = {
    1: '08:20-09:10',
    2: '09:10-10:00', 
    3: '10:20-11:10',
    4: '11:10-12:00',
    5: '13:00-13:50',
    6: '13:50-14:40',
    7: '14:40-15:30',
    8: '15:30-16:20'
  };
  
  let tableHTML = `
    <div class="schedule-table-wrapper">
      <table class="schedule-table">
        <thead>
          <tr>
            <th>วัน/เวลา</th>`;
            
  // หัวตาราง - คาบเรียน
  for (let period = 1; period <= 8; period++) {
    tableHTML += `<th>คาบ ${period}<br><small>${timePeriods[period]}</small></th>`;
  }
  
  tableHTML += `
          </tr>
        </thead>
        <tbody>`;
        
  // แถวตาราง - วันในสัปดาห์
  for (let day = 1; day <= 5; day++) {
    tableHTML += `
          <tr>
            <td class="day-cell">${dayNames[day]}</td>`;
            
    for (let period = 1; period <= 8; period++) {
      const cellData = matrix[day] && matrix[day][period];
      
      if (cellData) {
        tableHTML += `
            <td class="schedule-cell">
              <div class="subject">${cellData.subject.subject_name}</div>
              <!--  // ปิดไว้เทสดู
              <div class="teacher">ครู: ${cellData.teacher.name}</div>
              -->
              <div class="teacher">${cellData.teacher.name}</div>
              <div class="room">${cellData.room.name}</div>
            </td>`;
      } else {
        tableHTML += `<td class="schedule-cell"><div class="subject">-</div></td>`;
      }
    }
    
    tableHTML += `</tr>`;
  }
  
  tableHTML += `
        </tbody>
      </table>
    </div>`;
    
  return tableHTML;
}

// ลบ mock functions ที่สร้างใหม่ - จะใช้ dataService แทน

function loadMockTeacherData() {
  console.log('[Navigation] Loading teacher data from mock');
  
  // Import mock data จะต้องใช้ในระดับ module level
  // สำหรับตอนนี้ใช้ placeholder แล้วจะแก้ในภายหลัง
  const rankingContainer = document.getElementById('teacher-ranking');
  if (rankingContainer) {
    rankingContainer.innerHTML = '<p>กำลังโหลดข้อมูลครูจาก Mock Data...</p>';
  }
  
  const statsContainer = document.getElementById('subject-group-stats');
  if (statsContainer) {
    statsContainer.innerHTML = '<p>กำลังโหลดสถิติกลุ่มสาระจาก Mock Data...</p>';
  }
}

// ลบ hardcoded mock functions - จะใช้ข้อมูลจาก mock data files แทน

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
