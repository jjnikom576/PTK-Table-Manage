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
    
    onContextChange(async (newContext) => {
      await this.handleContextChange(newContext);
    });
    
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        const page = e.target.dataset.page;
        this.navigateToPage(page);
      }
    });
    
    window.addEventListener('hashchange', () => {
      this.handleURLChange();
    });
    
    window.addEventListener('popstate', () => {
      this.handleURLChange();
    });
    
    console.log('✅ Event listeners setup completed');
  }

  /**
   * Setup export handlers
   */
  async setupExportHandlers() {
    console.log('📤 Setting up export handlers...');
    
    document.addEventListener('click', async (e) => {
      if (e.target.matches('[data-export-type]')) {
        const type = e.target.dataset.exportType;
        const target = e.target.dataset.target;
        
        await this.handleExportClick(type, target, e.target);
      }
    });
    
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
   * Navigate to page
   */
  async navigateToPage(pageId, subPageId = null) {
    try {
      console.log(`🧭 Navigating to page: ${pageId}${subPageId ? `/${subPageId}` : ''}`);
      
      // Use navigation system's built-in navigation
      navigateToPage(pageId);
      
      this.currentPage = pageId;
      
    } catch (error) {
      console.error('Navigation error:', error);
      this.showNotification('เกิดข้อผิดพลาดในการนำทาง', 'error');
    }
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
   * Handle context changes
   */
  async handleContextChange(newContext) {
    console.log('Context changed:', newContext);
    
    try {
      this.context = newContext;
      this.saveContextToStorage(newContext);
      
      if (this.currentPage && this.modules[this.currentPage]) {
        await this.refreshCurrentPage(newContext);
      }
      
    } catch (error) {
      console.error('Error handling context change:', error);
      this.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนบริบท', 'error');
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
   * Refresh current page
   */
  async refreshCurrentPage(newContext) {
    if (this.currentPage) {
      await this.showPage(this.currentPage, newContext);
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
