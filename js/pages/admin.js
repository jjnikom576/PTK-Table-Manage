/**
 * Enhanced Admin Page - Multi-Year System with Rooms Management & Export
 * Features: Context-aware CRUD, Room management, Export/Import, Year transitions
 */

import { formatSemester, getRoomTypeBadgeClass, validateScheduleConflict } from '../utils.js';
import { getContext, onContextChange } from '../context/globalContext.js';
import { getTeachers, getClasses, getRooms, getSubjects, getSchedules } from '../services/dataService.js';
import { exportTableToCSV, exportTableToXLSX, generateExportFilename } from '../utils/export.js';

// Global state for admin page
let adminPageState = {
  currentTab: 'teachers',
  loadedData: null,
  context: null,
  user: null
};

/**
 * Initialize Admin Page
 */
export async function initAdminPage(context) {
  console.log('Initializing Admin Page...', context);
  
  try {
    // Validate admin access
    if (!validateAdminContextAccess(context, adminPageState.user)) {
      throw new Error('ไม่มีสิทธิ์เข้าถึงหน้าจัดการระบบ');
    }
    
    // Set admin context
    setAdminContext(context.year, context.semesterId);
    
    // Load initial data
    await loadAdminDataForContext(context);
    
    // Setup admin UI
    setupAdminUI(context);
    
    // Setup event listeners
    setupAdminEventListeners();
    
    // Show default management (teachers)
    await showTeacherManagement(context);
    
    // Listen for context changes
    onContextChange(async (newContext) => {
      await updateAdminUIForContext(newContext);
    });
    
    console.log('Admin Page initialized successfully');
    
  } catch (error) {
    console.error('Error initializing Admin Page:', error);
    showAdminError(`เกิดข้อผิดพลาดในการเข้าถึงระบบจัดการ: ${error.message}`);
  }
}

/**
 * Show schedule management
 */
export async function showScheduleManagement(context) {
  adminPageState.currentTab = 'schedules';
  
  const contentContainer = document.querySelector('#admin-content');
  if (!contentContainer) return;
  
  try {
    showAdminLoading(true);
    
    const schedulesHTML = `
      <div class="schedule-management">
        <div class="management-header">
          <h3>จัดการตารางสอน - ${context.year}</h3>
          <div class="management-controls">
            <button class="btn btn--primary" onclick="showScheduleGenerator()">
              ⚙️ สร้างตารางอัตโนมัติ
            </button>
            <button class="btn btn--export" onclick="exportSchedules('xlsx')">
              📊 Export ตารางสอน
            </button>
          </div>
        </div>
        
        ${await mockAIGenerationForContext(context)}
        ${renderAdminExportBar(context)}
      </div>
    `;
    
    contentContainer.innerHTML = schedulesHTML;
    
  } catch (error) {
    console.error('Error showing schedule management:', error);
    showAdminError(`ไม่สามารถแสดงการจัดการตารางได้: ${error.message}`);
  } finally {
    showAdminLoading(false);
  }
}

/**
 * Mock AI generation for context
 */
export async function mockAIGenerationForContext(context) {
  return `
    <div class="ai-generation">
      <h3>🤖 สร้างตารางสอนอัตโนมัติ</h3>
      <p>สำหรับ ${formatSemester(context.semester)} ปีการศึกษา ${context.year}</p>
      
      <div class="ai-options">
        <label>
          <input type="checkbox" checked> ตรวจสอบ Conflict ครู
        </label>
        <label>
          <input type="checkbox" checked> ตรวจสอบ Conflict ห้องเรียน
        </label>
        <label>
          <input type="checkbox" checked> ตรวจสอบ Conflict ห้อง
        </label>
        <label>
          <input type="checkbox" checked> ปฏิบัติตาม subject_constraints
        </label>
      </div>
      
      <button class="btn btn--primary" onclick="generateSchedule()">
        ⚡ สร้างตารางสอน
      </button>
    </div>
  `;
}

/**
 * Render admin export bar
 */
export function renderAdminExportBar(context) {
  return `
    <div class="admin-export-bar">
      <h4>📤 Export ข้อมูลระบบ</h4>
      <div class="export-buttons">
        <button class="btn btn--export" onclick="exportAllData('teachers')">
          Export ครูทั้งหมด
        </button>
        <button class="btn btn--export" onclick="exportAllData('rooms')">
          Export ห้องทั้งหมด
        </button>
        <button class="btn btn--export" onclick="exportAllData('schedules')">
          Export ตารางสอนทั้งหมด
        </button>
        <button class="btn btn--export" onclick="exportSystemReport()">
          📊 Export รายงานระบบ
        </button>
      </div>
    </div>
  `;
}

// Helper functions
async function loadAdminDataForContext(context) {
  try {
    const [teachers, classes, rooms, subjects, schedules] = await Promise.all([
      getTeachers(),
      getClasses(),
      getRooms(),
      getSubjects(),
      getSchedules()
    ]);
    
    adminPageState.loadedData = {
      teachers: teachers.data || [],
      classes: classes.data || [],
      rooms: rooms.data || [],
      subjects: subjects.data || [],
      schedules: schedules.data || []
    };
    
  } catch (error) {
    throw new Error(`ไม่สามารถโหลดข้อมูลสำหรับ Admin ได้: ${error.message}`);
  }
}

function setupAdminUI(context) {
  const adminContainer = document.querySelector('#admin-container');
  if (adminContainer) {
    adminContainer.innerHTML = renderDataManagementSection(context);
  }
}

function setupAdminEventListeners() {
  const adminTabs = document.querySelector('.admin-tabs');
  if (adminTabs) {
    adminTabs.addEventListener('click', async (e) => {
      if (e.target.matches('[data-tab]')) {
        const tab = e.target.dataset.tab;
        const context = adminPageState.context;
        
        // Update active tab
        adminTabs.querySelectorAll('.tab-btn').forEach(btn =>
          btn.classList.toggle('active', btn.dataset.tab === tab)
        );
        
        // Switch to selected tab
        switch(tab) {
          case 'teachers':
            await showTeacherManagement(context);
            break;
          case 'classes':
            await showClassManagement(context);
            break;
          case 'rooms':
            await showRoomManagement(context);
            break;
          case 'subjects':
            await showSubjectManagement(context);
            break;
          case 'schedules':
            await showScheduleManagement(context);
            break;
        }
      }
    });
  }
}

function showAdminLoading(show) {
  const loadingElement = document.querySelector('#admin-loading');
  if (loadingElement) {
    loadingElement.style.display = show ? 'block' : 'none';
  }
}

function showAdminError(message) {
  const errorContainer = document.querySelector('#admin-error');
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    errorContainer.style.display = 'block';
  }
  console.error('Admin Page Error:', message);
}

function updateAdminHeader(context) {
  const contextDisplay = document.querySelector('.admin-context');
  if (contextDisplay) {
    contextDisplay.innerHTML = `<p>กำลังจัดการข้อมูล: <strong>${formatSemester(context.semester)} ปีการศึกษา ${context.year}</strong></p>`;
  }
}

/**
 * Export system report
 */
export async function exportSystemReport(context) {
  try {
    const data = adminPageState.loadedData;
    
    const systemReport = {
      teachers: data.teachers.length,
      classes: data.classes.length,
      rooms: data.rooms.length,
      subjects: data.subjects.length,
      schedules: data.schedules.length
    };
    
    const filename = generateExportFilename(`รายงานระบบ-${context.year}`, context);
    
    return await exportTableToXLSX([systemReport], filename);
    
  } catch (error) {
    throw new Error(`Export รายงานระบบล้มเหลว: ${error.message}`);
  }
}

/**
 * Show room management
 */
export async function showRoomManagement(context) {
  adminPageState.currentTab = 'rooms';
  
  const contentContainer = document.querySelector('#admin-content');
  if (!contentContainer) return;
  
  try {
    showAdminLoading(true);
    
    const rooms = adminPageState.loadedData?.rooms || [];
    const classRooms = rooms.filter(room => room.room_type === 'CLASS');
    const techRooms = rooms.filter(room => room.room_type === 'TECH');
    
    const roomsHTML = `
      <div class="room-management">
        <h3>จัดการห้อง - ${context.year}</h3>
        
        <div class="room-controls">
          <button class="btn btn--primary" onclick="showAddRoomForm()">
            ➕ เพิ่มห้องใหม่
          </button>
          <button class="btn btn--export" onclick="exportRooms('csv')">
            📄 Export รายการห้อง
          </button>
        </div>
        
        <div class="room-grid">
          <div class="room-type-section">
            <h4>ห้องเรียนทั่วไป (CLASS)</h4>
            <div id="class-rooms-list">
              ${classRooms.map(room => `
                <div class="room-item" data-room-id="${room.id}">
                  <div class="room-info">
                    <h5>${room.name}</h5>
                    <span class="badge ${getRoomTypeBadgeClass(room.room_type)}">
                      ${room.room_type}
                    </span>
                    <p class="capacity">ความจุ: ${room.capacity || 'ไม่ระบุ'}</p>
                  </div>
                  <div class="room-actions">
                    <button class="btn btn--sm" onclick="editRoom(${room.id})">
                      ✏️ แก้ไข
                    </button>
                    <button class="btn btn--sm btn--danger" onclick="deleteRoom(${room.id})">
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="room-type-section">
            <h4>ห้องเทคโนโลยี (TECH)</h4>
            <div id="tech-rooms-list">
              ${techRooms.map(room => `
                <div class="room-item" data-room-id="${room.id}">
                  <div class="room-info">
                    <h5>${room.name}</h5>
                    <span class="badge ${getRoomTypeBadgeClass(room.room_type)}">
                      ${room.room_type}
                    </span>
                    <p class="capacity">ความจุ: ${room.capacity || 'ไม่ระบุ'}</p>
                  </div>
                  <div class="room-actions">
                    <button class="btn btn--sm" onclick="editRoom(${room.id})">
                      ✏️ แก้ไข
                    </button>
                    <button class="btn btn--sm btn--danger" onclick="deleteRoom(${room.id})">
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    
    contentContainer.innerHTML = roomsHTML;
    
  } catch (error) {
    console.error('Error showing room management:', error);
    showAdminError(`ไม่สามารถแสดงการจัดการห้องได้: ${error.message}`);
  } finally {
    showAdminLoading(false);
  }
}

/**
 * Add room
 */
export async function addRoom(roomData, context) {
  try {
    // Validate room data
    if (!validateRoomData(roomData)) {
      throw new Error('ข้อมูลห้องไม่ถูกต้อง');
    }
    
    // Add year to room data
    roomData.year = context.year;
    
    // In real implementation, use room API
    // return await roomAPI.create(roomData, context.year);
    
    // For now, simulate success
    console.log('Room added:', roomData);
    return { ok: true, data: roomData };
    
  } catch (error) {
    console.error('Error adding room:', error);
    throw new Error(`ไม่สามารถเพิ่มห้องได้: ${error.message}`);
  }
}

/**
 * Validate room data
 */
export function validateRoomData(roomData) {
  if (!roomData) return false;
  
  // Check required fields
  if (!roomData.name || !roomData.name.trim()) {
    console.error('Room name is required');
    return false;
  }
  
  if (!roomData.room_type || !['CLASS', 'TECH'].includes(roomData.room_type)) {
    console.error('Valid room type is required (CLASS or TECH)');
    return false;
  }
  
  // Check capacity if provided
  if (roomData.capacity && (isNaN(roomData.capacity) || roomData.capacity < 1)) {
    console.error('Capacity must be a positive number');
    return false;
  }
  
  return true;
}

/**
 * Show subject management
 */
export async function showSubjectManagement(context) {
  adminPageState.currentTab = 'subjects';
  
  const contentContainer = document.querySelector('#admin-content');
  if (!contentContainer) return;
  
  try {
    showAdminLoading(true);
    
    const subjects = adminPageState.loadedData?.subjects || [];
    
    const subjectsHTML = `
      <div class="subject-management">
        <div class="management-header">
          <h3>จัดการวิชา - ${context.year}</h3>
          <div class="management-controls">
            <button class="btn btn--primary" onclick="showAddSubjectForm()">
              ➕ เพิ่มวิชาใหม่
            </button>
            <button class="btn btn--export" onclick="exportSubjects('csv')">
              📄 Export รายการวิชา
            </button>
          </div>
        </div>
        
        <div class="subjects-list">
          ${subjects.map(subject => `
            <div class="subject-item" data-subject-id="${subject.id}">
              <div class="subject-info">
                <h4>${subject.subject_name}</h4>
                <p class="subject-code">รหัส: ${subject.subject_code || 'ไม่ระบุ'}</p>
                <p class="periods-per-week">${subject.periods_per_week || 0} คาบ/สัปดาห์</p>
              </div>
              <div class="subject-actions">
                <button class="btn btn--sm" onclick="editSubject(${subject.id})">
                  ✏️ แก้ไข
                </button>
                <button class="btn btn--sm btn--danger" onclick="deleteSubject(${subject.id})">
                  🗑️ ลบ
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    contentContainer.innerHTML = subjectsHTML;
    
  } catch (error) {
    console.error('Error showing subject management:', error);
    showAdminError(`ไม่สามารถแสดงการจัดการวิชาได้: ${error.message}`);
  } finally {
    showAdminLoading(false);
  }
}

/**
 * Render data management section
 */
export function renderDataManagementSection(context) {
  return `
    <div class="admin-header">
      <h2>⚙️ จัดการระบบ (Admin Only)</h2>
      <div class="admin-context">
        <p>กำลังจัดการข้อมูล: <strong>${formatSemester(context.semester)} ปีการศึกษา ${context.year}</strong></p>
      </div>
    </div>
    <div class="admin-tabs">
      <button class="tab-btn active" data-tab="teachers">ครู</button>
      <button class="tab-btn" data-tab="classes">ห้องเรียน</button>
      <button class="tab-btn" data-tab="rooms">ห้อง</button>
      <button class="tab-btn" data-tab="subjects">วิชา</button>
      <button class="tab-btn" data-tab="schedules">ตาราง</button>
    </div>
  `;
}

/**
 * Show teacher management
 */
export async function showTeacherManagement(context) {
  adminPageState.currentTab = 'teachers';
  
  const contentContainer = document.querySelector('#admin-content');
  if (!contentContainer) return;
  
  try {
    showAdminLoading(true);
    
    const teachers = adminPageState.loadedData?.teachers || [];
    
    const teachersHTML = `
      <div class="teacher-management">
        <div class="management-header">
          <h3>จัดการครู - ${context.year}</h3>
          <div class="management-controls">
            <button class="btn btn--primary" onclick="showAddTeacherForm()">
              ➕ เพิ่มครูใหม่
            </button>
            <button class="btn btn--export" onclick="exportTeachers('csv')">
              📄 Export รายการครู
            </button>
          </div>
        </div>
        
        <div class="teachers-list">
          ${teachers.map(teacher => `
            <div class="teacher-item" data-teacher-id="${teacher.id}">
              <div class="teacher-info">
                <h4>${teacher.name}</h4>
                <p class="subject-group">กลุ่มสาระ: ${teacher.subject_group || 'ไม่ระบุ'}</p>
                <p class="contact">${teacher.email || ''} ${teacher.phone || ''}</p>
              </div>
              <div class="teacher-actions">
                <button class="btn btn--sm" onclick="editTeacher(${teacher.id})">
                  ✏️ แก้ไข
                </button>
                <button class="btn btn--sm btn--danger" onclick="deleteTeacher(${teacher.id})">
                  🗑️ ลบ
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    contentContainer.innerHTML = teachersHTML;
    
  } catch (error) {
    console.error('Error showing teacher management:', error);
    showAdminError(`ไม่สามารถแสดงการจัดการครูได้: ${error.message}`);
  } finally {
    showAdminLoading(false);
  }
}

/**
 * Show class management
 */
export async function showClassManagement(context) {
  adminPageState.currentTab = 'classes';
  
  const contentContainer = document.querySelector('#admin-content');
  if (!contentContainer) return;
  
  try {
    showAdminLoading(true);
    
    const classes = adminPageState.loadedData?.classes || [];
    
    const classesHTML = `
      <div class="class-management">
        <div class="management-header">
          <h3>จัดการห้องเรียน - ${context.year}</h3>
          <div class="management-controls">
            <button class="btn btn--primary" onclick="showAddClassForm()">
              ➕ เพิ่มห้องเรียนใหม่
            </button>
            <button class="btn btn--export" onclick="exportClasses('csv')">
              📄 Export รายการห้องเรียน
            </button>
          </div>
        </div>
        
        <div class="classes-grid">
          ${classes.map(cls => `
            <div class="class-item" data-class-id="${cls.id}">
              <div class="class-info">
                <h4>${cls.class_name}</h4>
                <p class="grade-level">ระดับ: ${cls.grade_level}</p>
                <p class="student-count">นักเรียน: ${cls.student_count || 0} คน</p>
              </div>
              <div class="class-actions">
                <button class="btn btn--sm" onclick="editClass(${cls.id})">
                  ✏️ แก้ไข
                </button>
                <button class="btn btn--sm btn--danger" onclick="deleteClass(${cls.id})">
                  🗑️ ลบ
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    contentContainer.innerHTML = classesHTML;
    
  } catch (error) {
    console.error('Error showing class management:', error);
    showAdminError(`ไม่สามารถแสดงการจัดการห้องเรียนได้: ${error.message}`);
  } finally {
    showAdminLoading(false);
  }
}

/**
 * Set admin context
 */
export function setAdminContext(year, semesterId) {
  adminPageState.context = { year, semesterId };
  console.log('Admin context set:', adminPageState.context);
}

/**
 * Validate admin context access
 */
export function validateAdminContextAccess(context, user) {
  // Basic validation - in real implementation, check user roles
  if (!context || !context.year) return false;
  
  // For now, allow all access (in production, check user.role === 'admin')
  return true;
}

/**
 * Update admin UI for new context
 */
export async function updateAdminUIForContext(context) {
  console.log('Updating Admin UI for new context:', context);
  
  try {
    // Update context
    setAdminContext(context.year, context.semesterId);
    
    // Reload data
    await loadAdminDataForContext(context);
    
    // Update UI header
    updateAdminHeader(context);
    
    // Refresh current tab
    if (adminPageState.currentTab === 'teachers') {
      await showTeacherManagement(context);
    } else if (adminPageState.currentTab === 'rooms') {
      await showRoomManagement(context);
    } else if (adminPageState.currentTab === 'classes') {
      await showClassManagement(context);
    } else if (adminPageState.currentTab === 'subjects') {
      await showSubjectManagement(context);
    } else if (adminPageState.currentTab === 'schedules') {
      await showScheduleManagement(context);
    }
    
  } catch (error) {
    console.error('Error updating Admin UI context:', error);
    showAdminError(`ไม่สามารถเปลี่ยนบริบทได้: ${error.message}`);
  }
}
