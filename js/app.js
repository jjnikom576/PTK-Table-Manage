/**
 * Enhanced School Schedule Management System - Main Application
 * Multi-Year Support with Rooms Management & Export System
 * Version: 2.0 Enhanced
 */

import { initGlobalContext, getContext, onContextChange } from './context/globalContext.js';
import { initDataService, loadYearData } from './services/dataService.js';
import { initYearService } from './services/yearService.js';
import { initNavigation, navigateToPage, getCurrentPage, setupMobileMenu } from './navigation.js';
import { exportTableToCSV, exportTableToXLSX, exportTableToGoogleSheets, generateExportFilename } from './utils/export.js';

// Import page modules
import { initStudentSchedulePage } from './pages/studentSchedule.js';
import { initTeacherSchedulePage } from './pages/teacherSchedule.js';
import { initSubstitutionPage } from './pages/substitution.js';
import { initAdminPage } from './pages/admin.js';

/**
 * Main Application Class
 */
class SchoolScheduleApp {
  constructor() {
    this.context = null;
    this.modules = {};
    this.initialized = false;
    this.errorState = null;
    this.exportHandlers = {};
    this.currentPage = null;
  }

  /**
   * Get semester name by ID (NEW)
   */
  async getSemesterName(semesterId) {
    try {
      const { mockData } = await import('./data/index.js');
      const semester = mockData.semesters?.find(s => s.id === semesterId);
      return semester ? semester.semester_name : 'ภาคเรียน';
    } catch (error) {
      console.error('Error getting semester name:', error);
      return 'ภาคเรียน';
    }
  }

  /**
   * Initialize application
   */
  async init() {
    try {
      console.log('🚀 Initializing School Schedule System...');
      
      await this.initializeCore();
      await this.loadInitialContext();
      await this.initializeModules();
      await this.setupEventListeners();
      await this.setupExportHandlers();
      await this.loadInitialData();
      await this.initializeRouting();
      
      this.initialized = true;
      console.log('✅ School Schedule System initialized successfully');
      
    } catch (error) {
      await this.handleInitializationError(error);
    }
  }

  /**
   * Initialize core services
   */
  async initializeCore() {
    console.log('🔧 Initializing core services...');
    
    await initDataService({ mode: 'mock' });
    await initYearService();
    await initGlobalContext();
    
    console.log('✅ Core services initialized');
  }

  /**
   * Load initial context
   */
  async loadInitialContext() {
    console.log('📅 Loading initial context...');
    
    try {
      const storedContext = this.loadContextFromStorage();
      
      if (storedContext && this.isContextValid(storedContext)) {
        await this.setContext(storedContext.year, storedContext.semesterId);
      } else {
        // Use default context
        await this.setContext(2567, 1);
      }
      
      console.log('✅ Initial context loaded:', this.context);
      
    } catch (error) {
      console.warn('⚠️ Error loading initial context:', error);
      this.context = { year: 2567, semesterId: 1 };
    }
  }

  /**
   * Initialize page modules
   */
  async initializeModules() {
    console.log('📖 Initializing page modules...');
    
    // Initialize navigation system
    initNavigation();
    setupMobileMenu();
    
    this.modules = {
      navigation: true,
      studentSchedule: null,
      teacherSchedule: null,
      substitution: null,
      admin: null
    };
    
    console.log('✅ Page modules initialized');
  }

  /**
   * Setup event listeners
   */
  async setupEventListeners() {
    console.log('🎧 Setting up event listeners...');
    
    // ⭐ FIX: ปิด Context change listener เพื่อไม่ให้ notification ซ้ำ
    // onContextChange(async (newContext) => {
    //   await this.handleContextChange(newContext);
    // });
    
    // Navigation listeners
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        const page = e.target.dataset.page;
        this.navigateToPage(page);
      }
    });
    
    // URL change listeners
    window.addEventListener('hashchange', () => {
      this.handleURLChange();
    });
    
    window.addEventListener('popstate', () => {
      this.handleURLChange();
    });
    
    // ⭐ FIX: Context selector listeners
    this.setupContextSelectors();
    
    console.log('✅ Event listeners setup completed');
  }

  /**
   * Setup context selector event listeners (FIXED)
   */
  setupContextSelectors() {
    console.log('📅 Setting up context selectors...');
    
    const yearSelector = document.getElementById('year-selector');
    const semesterSelector = document.getElementById('semester-selector');
    const applyBtn = document.getElementById('context-apply-btn');
    
    // ⭐ FIX: เอา change listeners ออก - ใช้ OK button แทน
    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        const selectedYear = parseInt(yearSelector?.value);
        const selectedSemesterId = parseInt(semesterSelector?.value);
        
        if (selectedYear && selectedSemesterId) {
          console.log(`Applying context change: ${selectedYear}/${selectedSemesterId}`);
          await this.applyContextChange(selectedYear, selectedSemesterId);
        } else {
          this.showNotification('กรุณาเลือกปีการศึกษาและภาคเรียน', 'warning');
        }
      });
    }
    
    // ⭐ FIX: เพิ่ม year change listener เพื่อ update semester options
    if (yearSelector) {
      yearSelector.addEventListener('change', async () => {
        await this.updateSemesterOptions();
      });
    }
    
    console.log('✅ Context selectors setup completed');
  }

  /**
   * Update semester options when year changes (FIXED)
   */
  async updateSemesterOptions() {
    const yearSelector = document.getElementById('year-selector');
    const semesterSelector = document.getElementById('semester-selector');
    
    if (!yearSelector || !semesterSelector) return;
    
    const selectedYear = parseInt(yearSelector.value);
    if (!selectedYear) return;
    
    console.log(`📅 Updating semester options for year: ${selectedYear}`);
    
    try {
      // ⭐ FIX: Use mock data directly instead of context
      const { mockData } = await import('./data/index.js');
      
      const yearData = mockData.academicYears?.find(y => y.year === selectedYear);
      if (!yearData) {
        console.warn('Year data not found in mockData:', selectedYear);
        return;
      }
      
      // Filter semesters for selected year
      const filteredSemesters = mockData.semesters?.filter(s => 
        s.academic_year_id === yearData.id
      ) || [];
      
      console.log(`Found ${filteredSemesters.length} semesters for year ${selectedYear}:`, filteredSemesters.map(s => s.semester_name));
      
      // Clear and populate semester selector
      semesterSelector.innerHTML = '<option value="">เลือกภาคเรียน</option>';
      
      filteredSemesters.forEach(semester => {
        const option = document.createElement('option');
        option.value = semester.id;
        option.textContent = semester.semester_name;
        semesterSelector.appendChild(option);
      });
      
      // Auto-select first semester
      if (filteredSemesters.length > 0) {
        semesterSelector.value = filteredSemesters[0].id;
        console.log(`Auto-selected semester: ${filteredSemesters[0].id} (${filteredSemesters[0].semester_name})`);
      }
      
    } catch (error) {
      console.error('Error updating semester options:', error);
    }
  }
  
  /**
   * Use global context helper (NEW)
   */
  useGlobalContext() {
    return {
      getContext: () => {
        // Import getContext dynamically to avoid circular deps
        return window.globalContextData || { availableYears: [], availableSemesters: [] };
      }
    };
  }
  async applyContextChange(newYear, newSemesterId) {
    try {
      console.log(`🎯 Applying context change to: ${newYear}/${newSemesterId}`);
      
      // Import switchContext from globalContext
      const { switchContext } = await import('./context/globalContext.js');
      const result = await switchContext(newYear, newSemesterId);
      
      if (result.ok) {
        // ⭐ FIX: Refresh เฉพาะ content ไม่ใช่ทั้งหน้า
        console.log('🔄 Context changed successfully, refreshing content...');
        
        // Clear และ refresh content area
        await this.refreshContentOnly({ year: newYear, semesterId: newSemesterId });
        
        // ⭐ FIX: แสดง notification เพียงครั้งเดียว (ไม่ใช้ context change listener)
        const semesterName = await this.getSemesterName(newSemesterId);
        this.showNotification(`เปลี่ยนไปปีการศึกษา ${newYear} ${semesterName} เรียบร้อย!`, 'success');
      } else {
        throw new Error(result.error || 'Context switch failed');
      }
      
    } catch (error) {
      console.error('Error applying context change:', error);
      this.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนบริบท: ' + error.message, 'error');
    }
  }

  /**
   * Handle year change (NEW)
   */
  async handleYearChange(newYear) {
    try {
      console.log(`🎯 Handling year change to: ${newYear}`);
      
      // Get current context
      const currentContext = getContext();
      
      // Find first semester of new year
      const newYearData = currentContext.availableYears.find(y => y.year === newYear);
      if (!newYearData) {
        throw new Error(`Year ${newYear} not found`);
      }
      
      const firstSemester = currentContext.availableSemesters.find(s => 
        s.academic_year_id === newYearData.id && s.semester_number === 1
      );
      
      if (!firstSemester) {
        throw new Error(`No semesters found for year ${newYear}`);
      }
      
      // Import switchContext from globalContext
      const { switchContext } = await import('./context/globalContext.js');
      await switchContext(newYear, firstSemester.id);
      
      // Refresh current page
      await this.refreshCurrentPage(getContext());
      
    } catch (error) {
      console.error('Error handling year change:', error);
      this.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนปีการศึกษา: ' + error.message, 'error');
    }
  }

  /**
   * Handle semester change (NEW)
   */
  async handleSemesterChange(newSemesterId) {
    try {
      console.log(`🎯 Handling semester change to: ${newSemesterId}`);
      
      // Get current context
      const currentContext = getContext();
      const currentYear = currentContext.currentYear;
      
      if (!currentYear) {
        throw new Error('No current year set');
      }
      
      // Import switchContext from globalContext
      const { switchContext } = await import('./context/globalContext.js');
      await switchContext(currentYear, newSemesterId);
      
      // Refresh current page
      await this.refreshCurrentPage(getContext());
      
    } catch (error) {
      console.error('Error handling semester change:', error);
      this.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนภาคเรียน: ' + error.message, 'error');
    }
  }

  /**
   * Setup export handlers
   */
  async setupExportHandlers() {
    console.log('📤 Setting up export handlers...');
    
    // FIX: ลบ global export handler เพื่อไม่ให้ทับซ้อนกับ page-specific handlers
    // แต่ละหน้าจะจัดการ export เอง
    
    console.log('✅ Export handlers setup completed');
  }

  /**
   * Handle export button clicks
   */
  async handleExportClick(exportType, target, button) {
    try {
      this.showExportProgress(button);
      
      const context = getContext();
      let exportData;
      
      switch(target) {
        case 'student':
          // Skip class check - use default data
          exportData = await this.getStudentExportData('default', context);
          break;
          
        case 'teacher':
          const selectedTeacher = this.getActiveTeacherId();
          if (!selectedTeacher) {
            throw new Error('กรุณาเลือกครูก่อน');
          }
          exportData = await this.getTeacherExportData(selectedTeacher, context);
          break;
          
        case 'substitution':
          const selectedDate = this.getSelectedDate();
          if (!selectedDate) {
            throw new Error('กรุณาเลือกวันที่ก่อน');
          }
          exportData = await this.getSubstitutionExportData(selectedDate, context);
          break;
          
        default:
          throw new Error('ไม่รองรับการ export ประเภทนี้');
      }
      
      const filename = generateExportFilename(`${target}-export`, context);
      
      switch(exportType) {
        case 'csv':
          await exportTableToCSV(exportData, filename);
          break;
        case 'xlsx':
          await exportTableToXLSX(exportData, filename);
          break;
        case 'gsheets':
          await exportTableToGoogleSheets(exportData, filename);
          break;
        default:
          throw new Error('ไม่รองรับรูปแบบ export นี้');
      }
      
      this.showNotification('Export สำเร็จ!', 'success');
      
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('Export ล้มเหลว: ' + error.message, 'error');
    } finally {
      this.hideExportProgress(button);
    }
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    console.log('📊 Loading initial data...');
    
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

  /**
   * Initialize routing
   */
  async initializeRouting() {
    console.log('🛣️ Initializing routing...');
    
    // Navigation is already initialized in initializeModules()
    // Hash-based routing will be handled automatically
    
    console.log('✅ Routing initialized');
  }

  /**
   * Navigate to page (ENHANCED)
   */
  async navigateToPage(pageId, subPageId = null) {
    try {
      console.log(`🧭 Navigating to page: ${pageId}`);
      
      // ⭐ FIX: Set current page BEFORE navigation
      this.currentPage = pageId;
      
      // Use navigation system
      navigateToPage(pageId);
      
      console.log(`✅ Navigation completed, currentPage: ${this.currentPage}`);
      
    } catch (error) {
      console.error('Navigation error:', error);
      this.showNotification('เกิดข้อผิดพลาดในการนำทาง', 'error');
    }
  }

  /**
   * Initialize routing (ENHANCED)
   */
  async initializeRouting() {
    console.log('🛣️ Initializing routing...');
    
    // Set initial currentPage from URL
    const hash = window.location.hash;
    if (hash === '#teacher-schedule') {
      this.currentPage = 'teacher';
    } else if (hash === '#substitution') {
      this.currentPage = 'substitution';
    } else if (hash === '#admin') {
      this.currentPage = 'admin';
    } else {
      this.currentPage = 'student'; // default
    }
    
    console.log(`✅ Initial currentPage set to: ${this.currentPage}`);
    console.log('✅ Routing initialized');
  }

  /**
   * Show specific page
   */
  async showPage(pageId, context) {
    const pageContainer = document.querySelector(`#page-${pageId}`);
    if (!pageContainer) {
      throw new Error(`Page container not found: ${pageId}`);
    }
    
    pageContainer.style.display = 'block';
    
    switch(pageId) {
      case 'student':
        if (!this.modules.studentSchedule) {
          this.modules.studentSchedule = true;
          await initStudentSchedulePage(context);
        }
        break;
      case 'teacher':
        if (!this.modules.teacherSchedule) {
          this.modules.teacherSchedule = true;
          await initTeacherSchedulePage(context);
        }
        break;
      case 'substitution':
        if (!this.modules.substitution) {
          this.modules.substitution = true;
          await initSubstitutionPage(context);
        }
        break;
      case 'admin':
        if (!this.modules.admin) {
          this.modules.admin = true;
          await initAdminPage(context);
        }
        break;
    }
  }

  /**
   * Handle context changes (ENHANCED)
   */
  async handleContextChange(newContext) {
    console.log('🎯 Context changed:', newContext);
    
    try {
      this.context = newContext;
      this.saveContextToStorage(newContext);
      
      // ⭐ FIX: Clear data service cache only once
      const { clearCache } = await import('./services/dataService.js');
      if (clearCache) {
        clearCache();
        console.log('🧼 Cache cleared after context change');
      }
      
      // Refresh current page with new context
      if (this.currentPage && this.modules[this.currentPage]) {
        console.log(`🔄 Refreshing page "${this.currentPage}" with new context`);
        await this.refreshCurrentPage(newContext);
      }
      
      // ⭐ FIX: Better notification with actual semester number
      const semesterNumber = newContext.semester?.semester_number || 
                           (newContext.semester?.semester_name?.includes('ที่ 1') ? 1 :
                            newContext.semester?.semester_name?.includes('ที่ 2') ? 2 :
                            newContext.semester?.semester_name?.includes('ที่ 3') ? 3 : '?');
                            
      this.showNotification(
        `เปลี่ยนไปปีการศึกษา ${newContext.year} ภาคเรียนที่ ${semesterNumber}`, 
        'success'
      );
      
    } catch (error) {
      console.error('Error handling context change:', error);
      this.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนบริบท: ' + error.message, 'error');
    }
  }

  /**
   * Set application context
   */
  async setContext(year, semesterId) {
    this.context = { year, semesterId, currentYear: year, semesterId };
    this.saveContextToStorage(this.context);
  }

  /**
   * Validate context data
   */
  isContextValid(context) {
    return context && 
           typeof context.year === 'number' && 
           context.year >= 2500 && 
           context.year <= 3000 &&
           context.semesterId;
  }

  /**
   * Load context from storage
   */
  loadContextFromStorage() {
    try {
      const stored = localStorage.getItem('school-schedule-context');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Error loading context from storage:', error);
      return null;
    }
  }

  /**
   * Save context to storage
   */
  saveContextToStorage(context) {
    try {
      localStorage.setItem('school-schedule-context', JSON.stringify(context));
    } catch (error) {
      console.warn('Error saving context to storage:', error);
    }
  }

  /**
   * Hide all pages
   */
  hideAllPages() {
    const pages = document.querySelectorAll('[id^="page-"]');
    pages.forEach(page => {
      page.style.display = 'none';
    });
  }

  /**
   * Update navigation UI
   */
  updateNavigationUI(pageId) {
    const navItems = document.querySelectorAll('[data-page]');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });
  }

  /**
   * Handle URL changes
   */
  handleURLChange() {
    // Hash changes are handled by navigation system
    this.currentPage = getCurrentPage();
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('notification--show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('notification--show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  /**
   * Show export progress
   */
  showExportProgress(button) {
    button.disabled = true;
    button.textContent = 'กำลัง Export...';
    button.classList.add('loading');
  }

  /**
   * Hide export progress
   */
  hideExportProgress(button) {
    button.disabled = false;
    button.classList.remove('loading');
  }

  /**
   * Get active teacher ID
   */
  getActiveTeacherId() {
    const activeTab = document.querySelector('.teacher-tab.active');
    return activeTab ? parseInt(activeTab.dataset.teacherId) : null;
  }

  /**
   * Get selected date
   */
  getSelectedDate() {
    const datePicker = document.querySelector('#date-picker');
    return datePicker ? datePicker.value : new Date().toISOString().slice(0, 10);
  }

  /**
   * Get student export data
   */
  async getStudentExportData(className, context) {
    return [
      {
        'วัน': 'จันทร์',
        'เวลา': '08:20-09:10',
        'คาบ': 1,
        'วิชา': 'คณิตศาสตร์',
        'ครู': 'นายคณิต',
        'ห้อง': '401'
      }
    ];
  }

  /**
   * Get teacher export data
   */
  async getTeacherExportData(teacherId, context) {
    return [
      {
        'วัน': 'จันทร์',
        'เวลา': '08:20-09:10',
        'วิชา': 'คณิตศาสตร์',
        'ห้องเรียน': 'ม.1/1'
      }
    ];
  }

  /**
   * Get substitution export data
   */
  async getSubstitutionExportData(date, context) {
    return [
      {
        'วันที่': date,
        'ครูที่ขาด': 'นายคณิต',
        'เหตุผล': 'ลาป่วย'
      }
    ];
  }

  /**
   * Refresh content only (NEW - ไม่ reload ทั้งหน้า)
   */
  async refreshContentOnly(newContext) {
    console.log(`🔄 Refreshing content only for: ${this.currentPage}`);
    
    if (!this.currentPage) {
      console.log('No current page to refresh');
      return;
    }
    
    try {
      // ⭐ FIX: Clear เฉพาะ content area และ reset class selector
      if (this.currentPage === 'student') {
        // Clear เฉพาะ schedule table
        const scheduleContainer = document.querySelector('#student-schedule-table');
        if (scheduleContainer) {
          scheduleContainer.innerHTML = '<p>กรุณาเลือกห้องเรียนเพื่อดูตารางเรียน</p>';
        }
        
        // ⭐ FIX: Reset class selector เป็น default และ refresh options
        const classSelector = document.querySelector('#class-dropdown');
        if (classSelector) {
          classSelector.value = ''; // Reset เป็น "เลือกห้องเรียน"
        }
        
        // Refresh class options for new context
        const studentPage = await import('./pages/studentSchedule.js');
        if (studentPage.refreshClassSelector) {
          await studentPage.refreshClassSelector(newContext, null); // ไม่ preserve selection
        }
        
        console.log('Student content refreshed - class selector reset to default');
      }
      
      console.log('✅ Content refresh completed successfully');
      
    } catch (error) {
      console.error('Error refreshing content:', error);
      this.showNotification('เกิดข้อผิดพลาดในการรีเฟรชเนื้อหา', 'error');
    }
  }

  /**
   * Refresh current page (FIXED - ไม่ทำลาย ComboBox)
   */
  async refreshCurrentPage(newContext) {
    console.log(`🔄 Refreshing current page: ${this.currentPage}`);
    
    if (!this.currentPage) {
      console.log('No current page to refresh');
      return;
    }
    
    try {
      // ⭐ FIX: แทนที่จะ clear ทุกอย่าง ให้ refresh แค่ข้อมูลเท่านั้น
      console.log(`🔄 Refreshing data for page: ${this.currentPage}`);
      
      // แทนที่จะ reset UI ให้ refresh แค่ข้อมูล
      if (this.currentPage === 'student') {
        // ⭐ FIX: เก็บ current selection ไว้
        const classSelector = document.querySelector('#class-dropdown');
        const currentSelection = classSelector ? classSelector.value : null;
        
        console.log('Preserving class selection:', currentSelection);
        
        // เรียก refresh function ของ student page โดยตรง
        const studentPage = await import('./pages/studentSchedule.js');
        if (studentPage.refreshPage) {
          await studentPage.refreshPage(newContext, currentSelection);
        } else {
          // Fallback: เรียก init แต่ไม่ reset UI
          await studentPage.refreshClassSelector();
        }
        
        console.log('Student page data refreshed without UI reset');
      }
      else if (this.currentPage === 'teacher') {
        // Refresh teacher page data only
        const teacherPage = await import('./pages/teacherSchedule.js');
        if (teacherPage.refreshPage) {
          await teacherPage.refreshPage(newContext);
        }
      }
      else if (this.currentPage === 'substitution') {
        // Refresh substitution page data only
        const substitutionPage = await import('./pages/substitution.js');
        if (substitutionPage.refreshPage) {
          await substitutionPage.refreshPage(newContext);
        }
      }
      else if (this.currentPage === 'admin') {
        // Refresh admin page data only
        const adminPage = await import('./pages/admin.js');
        if (adminPage.refreshPage) {
          await adminPage.refreshPage(newContext);
        }
      }
      
      console.log('✅ Current page data refreshed successfully (UI preserved)');
      
    } catch (error) {
      console.error('Error refreshing current page:', error);
      this.showNotification('เกิดข้อผิดพลาดในการรีเฟรชหน้า', 'error');
    }
  }

  /**
   * Handle initialization error
   */
  async handleInitializationError(error) {
    console.error('❌ Application initialization failed:', error);
    
    this.errorState = error;
    
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
}

// Create and initialize app instance
const app = new SchoolScheduleApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
} else {
  app.init();
}

// Export for global access
window.SchoolScheduleApp = app;
