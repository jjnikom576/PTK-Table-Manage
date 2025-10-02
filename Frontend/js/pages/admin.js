// =============================================================================
// ACADEMIC YEAR MANAGEMENT (NEW)
// =============================================================================
/**
 * Initialize Academic Management after login
 */
async function initAcademicManagement() {
  try {
    console.log('[Admin] Initializing Academic Management...');

    // 1. Load current context from backend
    await loadAdminContext();

    // 2. Load academic years
    await loadAcademicYears();

    // 3. Load semesters (global)
    await loadSemesters();

    // 4. Populate UI
    populateCurrentSemesterTab();
    populateAcademicYearsList();
    populateSemestersList();
    populateAcademicYearsTable();
    populateSemestersTable();

    // 5. Bind academic management events
    bindAcademicManagementEvents();

    console.log('[Admin] Academic Management initialized successfully');

  } catch (error) {
    console.error('[Admin] Error initializing Academic Management:', error);
    adminState.error = error.message;
  }
}

function buildSubjectGroups(subjectRows = []) {
  const groups = new Map();

  subjectRows.forEach(subject => {
    const groupKey = subject.group_key && String(subject.group_key).trim().length > 0
      ? String(subject.group_key)
      : `SUBJ_${subject.id}`;

    const classIds = Array.isArray(subject.class_ids) && subject.class_ids.length > 0
      ? subject.class_ids
        .map(value => Number(value))
        .filter(value => Number.isFinite(value))
      : (subject.class_id != null ? [Number(subject.class_id)] : []);

    let existingGroup = groups.get(groupKey);

    if (!existingGroup) {
      existingGroup = {
        id: subject.id,
        group_key: groupKey,
        teacher_id: subject.teacher_id,
        teacher_name: subject.teacher_name,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        periods_per_week: subject.periods_per_week,
        default_room_id: subject.default_room_id,
        room_name: subject.room_name,
        special_requirements: subject.special_requirements,
        semester_id: subject.semester_id,
        created_at: subject.created_at,
        updated_at: subject.updated_at,
        class_ids: [],
        member_subject_ids: [],
        member_rows: []
      };
      groups.set(groupKey, existingGroup);
    }

    for (const classId of classIds) {
      if (!existingGroup.class_ids.includes(classId)) {
        existingGroup.class_ids.push(classId);
      }
    }

    if (subject.id != null && !existingGroup.member_subject_ids.includes(subject.id)) {
      existingGroup.member_subject_ids.push(subject.id);
    }

    existingGroup.member_rows.push(subject);

    if (!existingGroup.created_at || (subject.created_at && subject.created_at < existingGroup.created_at)) {
      existingGroup.created_at = subject.created_at;
    }
    if (!existingGroup.updated_at || (subject.updated_at && subject.updated_at > existingGroup.updated_at)) {
      existingGroup.updated_at = subject.updated_at;
    }

    // Preserve latest textual fields where available
    existingGroup.teacher_name = subject.teacher_name || existingGroup.teacher_name;
    existingGroup.room_name = subject.room_name || existingGroup.room_name;
  });

  return Array.from(groups.values()).map(group => {
    const sortedClassIds = group.class_ids.sort((a, b) => a - b);
    return {
      ...group,
      class_ids: sortedClassIds,
      primary_class_id: sortedClassIds.length ? sortedClassIds[0] : null
    };
  });
}

function getClassNamesFromIds(classIds = []) {
  if (!Array.isArray(classIds)) {
    return [];
  }

  return classIds
    .map(id => getClassDisplayNameById(id))
    .filter(name => typeof name === 'string' && name.trim().length > 0);
}

/**
 * Load current context from backend
 */
async function loadAdminContext() {
  try {
    const result = await coreAPI.getGlobalContext();

    if (result.success && result.data) {
      adminState.activeYear = result.data.currentYear;
      adminState.activeSemester = result.data.currentSemester;

      console.log('[Admin] Loaded context:', {
        activeYear: adminState.activeYear,
        activeSemester: adminState.activeSemester
      });
    }
  } catch (error) {
    console.warn('[Admin] Failed to load context:', error);
  }
}

/**
 * Load academic years from API
 */
async function loadAcademicYears() {
  try {
    const result = await coreAPI.getAcademicYears(false); // force fresh fetch after login/admin ops

    if (result.success && result.data) {
      adminState.academicYears = result.data;
      console.log('[Admin] Loaded academic years:', result.data.length, 'years');
    } else {
      adminState.academicYears = [];
      console.warn('[Admin] No academic years found');
    }
  } catch (error) {
    console.error('[Admin] Error loading academic years:', error);
    adminState.academicYears = [];
  }
}

/**
 * Load semesters for a specific year
 */
async function loadSemesters() {
  try {
    const result = await coreAPI.getSemesters(false); // force fresh fetch after login/admin ops

    if (result.success && result.data) {
      adminState.semesters = result.data;
      console.log('[Admin] Loaded semesters:', result.data.length, 'semesters');
    } else {
      adminState.semesters = [];
      console.warn('[Admin] No semesters found');
    }
  } catch (error) {
    console.error('[Admin] Error loading semesters:', error);
    adminState.semesters = [];
  }
}

/**
 * Populate "กำหนดภาคเรียนปัจจุบัน" tab
 */
function populateCurrentSemesterTab() {
  // Update current selection display
  const yearDisplay = document.getElementById('current-year-display');
  const semesterDisplay = document.getElementById('current-semester-display');

  if (yearDisplay) {
    yearDisplay.textContent = adminState.activeYear ?
      `ปีการศึกษา ${adminState.activeYear}` : 'ยังไม่ได้เลือก';
  }

  if (semesterDisplay) {
    semesterDisplay.textContent = adminState.activeSemester ?
      (adminState.activeSemester.name || adminState.activeSemester.semester_name) : 'ยังไม่ได้เลือก';
  }

  console.log('[Admin] Updated current semester tab display');
}

/**
 * Populate academic years list in current semester tab
 */
function populateAcademicYearsList() {
  const container = document.getElementById('academic-years-list');
  if (!container) return;

  if (adminState.academicYears.length === 0) {
    container.innerHTML = '<p class="no-data">ยังไม่มีปีการศึกษา - กรุณาเพิ่มในแท็บ "เพิ่มปีการศึกษา"</p>';
    return;
  }

  const yearsHTML = adminState.academicYears.map(year => {
    const isActive = year.year === adminState.activeYear;
    return `
      <div class="selection-item ${isActive ? 'active' : ''}" data-year="${year.year}">
        <input type="radio" name="academic-year" value="${year.id}" ${isActive ? 'checked' : ''} id="year-${year.id}">
        <label for="year-${year.id}">ปีการศึกษา ${year.year}</label>
        ${isActive ? '<span class="active-badge">ใช้งานอยู่</span>' : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = yearsHTML;
  // Enable click-to-toggle on the whole item
  enableSelectionItemToggle('academic-years-list');

  console.log('[Admin] Populated academic years list');
}

/**
 * Populate semesters list in current semester tab
 */
function populateSemestersList() {
  const container = document.getElementById('semesters-list');
  if (!container) return;

  if (adminState.semestersLoading && !adminState.semestersLoaded) {
    container.innerHTML = `<p class="no-data">กำลังโหลด...</p>`;
    return;
  }
  if (adminState.semesters.length === 0) {
    container.innerHTML = `<p class="no-data">ยังไม่มีภาคเรียน - กรุณาเพิ่มในแท็บ "เพิ่มภาคเรียน"</p>`;
    return;
  }

  const semestersHTML = adminState.semesters.map(semester => {
    const isActive = semester.id === adminState.activeSemester?.id;
    const semesterName = semester.name || semester.semester_name;

    return `
      <div class="selection-item ${isActive ? 'active' : ''}" data-semester-id="${semester.id}">
        <input type="radio" name="semester" value="${semester.id}" ${isActive ? 'checked' : ''} id="semester-${semester.id}">
        <label for="semester-${semester.id}">${semesterName}</label>
        ${isActive ? '<span class="active-badge">ใช้งานอยู่</span>' : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = semestersHTML;
  // Enable click-to-toggle on the whole item
  enableSelectionItemToggle('semesters-list');

  console.log('[Admin] Populated semesters list');
}

/**
 * Enable click-to-toggle behavior on selection lists (radio) allowing deselect on second click
 */
function enableSelectionItemToggle(containerId) {
  const container = document.getElementById(containerId);
  if (!container || container.dataset.toggleBound === '1') return;
  container.dataset.toggleBound = '1';
  container.addEventListener('click', (e) => {
    const target = e.target;
    const item = target && target.closest ? target.closest('.selection-item') : null;
    if (!item || !container.contains(item)) return;
    const input = item.querySelector('input[type="radio"]');
    if (!input) return;
    // Prevent default label/input behavior; handle manually
    e.preventDefault();
    // Always select the clicked item (radio must have a value; no deselect)
    container.querySelectorAll('input[type="radio"]').forEach((el) => { el.checked = false; });
    container.querySelectorAll('.selection-item').forEach((el) => el.classList.remove('active'));
    input.checked = true;
    item.classList.add('active');
    // dispatch change for existing handlers
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * Bind events for academic management
 */
function bindAcademicManagementEvents() {
  // Current semester form submission
  const form = document.getElementById('current-semester-form');
  if (form) {
    form.addEventListener('submit', handleCurrentSemesterFormSubmit);
  }

  // Year selection change
  const yearsList = document.getElementById('academic-years-list');
  if (yearsList) {
    yearsList.addEventListener('change', handleYearSelectionChange);
  }

  // NEW: Academic year form submission
  const academicYearForm = document.getElementById('academic-year-form');
  if (academicYearForm) {
    academicYearForm.addEventListener('submit', handleAcademicYearFormSubmit);
  }

  // NEW: Semester form submission
  const semesterForm = document.getElementById('semester-form');
  if (semesterForm) {
    semesterForm.addEventListener('submit', handleSemesterFormSubmit);
  }

  console.log('[Admin] Academic management events bound');
}

/**
 * Handle year selection change - load semesters for selected year
 */
async function handleYearSelectionChange(event) {
  if (event.target.name === 'academic-year') {
    const selectedYearId = parseInt(event.target.value);
    const selectedYear = adminState.academicYears.find(y => y.id === selectedYearId);

    if (selectedYear) {
      console.log('[Admin] Year selection changed to:', selectedYear.year);

      // Semesters เป็น global static table แล้ว โหลดมาแล้วไม่ต้องดึง API ซ้ำ
      if (!Array.isArray(adminState.semesters) || adminState.semesters.length === 0) {
        await loadSemesters();
      } else {
        console.log('[Admin] Using cached semesters – no API call needed');
      }

      populateSemestersList();

      // Update hidden field
      const hiddenField = document.getElementById('selected-academic-year');
      if (hiddenField) {
        hiddenField.value = selectedYearId;
      }
    }
  }
}

/**
 * Handle current semester form submission
 */
async function handleCurrentSemesterFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const academicYearId = formData.get('academic-year');
  const semesterId = formData.get('semester');

  // Validate both selections
  if (!academicYearId) {
    alert('กรุณาเลือกปีการศึกษา');
    return;
  }
  if (!semesterId) {
    alert('กรุณาเลือกภาคเรียน');
    return;
  }
  const selectedYear = adminState.academicYears.find(y => y.id === parseInt(String(academicYearId)));
  if (!selectedYear) {
    alert('ปีการศึกษาที่เลือกไม่ถูกต้อง');
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : '';

  try {
    if (submitBtn) {
      submitBtn.textContent = 'กำลังบันทึก...';
      submitBtn.disabled = true;
    }

    // Call APIs to set active context (year then semester)
    const yearResult = await coreAPI.setActiveAcademicYear(selectedYear.year);
    const semesterResult = await coreAPI.setActiveSemester(parseInt(String(semesterId)));

    if (yearResult.success && semesterResult.success) {
      // Update admin state
      adminState.activeYear = selectedYear.year;
      adminState.activeSemester = adminState.semesters.find(s => s.id === parseInt(String(semesterId)));

      // Refresh global context
      await refreshContextFromBackend();

      // Update UI
      populateCurrentSemesterTab();
      populateAcademicYearsList();
      populateSemestersList();

      alert('บันทึกการตั้งค่าเรียบร้อย!');

      console.log('[Admin] Active context updated:', {
        year: adminState.activeYear,
        semester: adminState.activeSemester
      });

    } else {
      const error = !yearResult.success ? yearResult.error : semesterResult.error;
      throw new Error(error || 'ไม่สามารถบันทึกการตั้งค่าได้');
    }

  } catch (error) {
    console.error('[Admin] Error saving current semester:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);

  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText || 'บันทึก';
      submitBtn.disabled = false;
    }
  }
}

/**
 * Handle academic year form submission (NEW)
 */
async function handleAcademicYearFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const year = parseInt(formData.get('year'));

  if (!year || year < 2500 || year > 2600) {
    alert('กรุณาระบุปีการศึกษาที่ถูกต้อง (2500-2600)');
    return;
  }

  // Check if year already exists
  const existingYear = adminState.academicYears.find(y => y.year === year);
  if (existingYear) {
    alert(`ปีการศึกษา ${year} มีอยู่แล้ว`);
    return;
  }

  // Get submit button
  const submitBtn = event.target.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;

  try {
    // Set loading state
    submitBtn.textContent = 'กำลังบันทึก...';
    submitBtn.disabled = true;

    console.log('[Admin] Creating academic year:', year);

    // Call API to create academic year
    const result = await coreAPI.createAcademicYear(year);

    if (result.success) {
      // Refresh academic years data
      await loadAcademicYears();

      // Update UI
      populateAcademicYearsList();
      populateAcademicYearsTable();

      // Clear form
      event.target.reset();

      alert(`เพิ่มปีการศึกษา ${year} เรียบร้อย!`);

      console.log('[Admin] Academic year created successfully:', result.data);

    } else {
      console.error('[Admin] Failed to create academic year:', result.error);
      alert(`เกิดข้อผิดพลาด: ${result.error || 'ไม่สามารถเพิ่มปีการศึกษาได้'}`);
    }

  } catch (error) {
    console.error('[Admin] Error creating academic year:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);

  } finally {
    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

/**
 * Handle semester form submission (NEW)
 */
async function handleSemesterFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const semesterName = formData.get('semester_name')?.trim();

  if (!semesterName) {
    alert('กรุณาระบุชื่อภาคเรียน');
    return;
  }
  // ไม่ต้องเลือกหมายเลขภาคเรียนแล้ว ใช้ชื่อ + id เท่านั้น

  try {
    // Set loading state
    const submitBtn = event.target.querySelector('[type="submit"]');
    var originalText = submitBtn ? submitBtn.textContent : '';
    submitBtn.textContent = 'กำลังบันทึก...';
    submitBtn.disabled = true;

    // Call API to create semester (global)
    const result = await coreAPI.createSemester({
      semester_name: semesterName
    });

    if (result.success) {
      // Refresh semesters (global)
      await loadSemesters();

      // Update UI
      populateSemestersList();
      populateSemestersTable();

      // Clear form
      event.target.reset();

      alert(`เพิ่มภาคเรียน "${semesterName}" เรียบร้อย!`);

      console.log('[Admin] Semester created:', result.data);

    } else {
      throw new Error(result.error || 'ไม่สามารถเพิ่มภาคเรียนได้');
    }

  } catch (error) {
    console.error('[Admin] Error creating semester:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);

  } finally {
    // Reset button
    const submitBtn = event.target.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = typeof originalText !== 'undefined' ? originalText : 'บันทึก';
      submitBtn.disabled = false;
    }
  }
}

/**
 * Populate academic years table (NEW)
 */
function populateAcademicYearsTable() {
  const tableBody = document.getElementById('academic-years-table-body');
  if (!tableBody) return;

  if (adminState.academicYears.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="no-data">ยังไม่มีข้อมูลปีการศึกษา</td></tr>';
    return;
  }

  const rowsHTML = adminState.academicYears.map((year, index) => {
    const isActive = year.year === adminState.activeYear;
    return `
      <tr ${isActive ? 'class="active-row"' : ''}>
        <td><input type="checkbox" class="row-select" data-id="${year.id}"></td>
        <td>${year.id}</td>
        <td>ปีการศึกษา ${year.year} ${isActive ? '<span class="active-badge">ใช้งาน</span>' : ''}</td>
        <td>${new Date(year.created_at).toLocaleDateString('th-TH')}</td>
        <td class="table-actions">
          <button type="button" class="btn btn--sm btn--outline" onclick="editAcademicYear(${year.id})">✏️ แก้ไข</button>
          <button type="button" class="btn btn--sm btn--danger" onclick="deleteAcademicYear(${year.id}, '${year.year}')" ${isActive ? 'disabled' : ''}>
            🗑️ ลบ
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = rowsHTML;

  console.log('[Admin] Populated academic years table');
}

/**
 * Populate semesters table (NEW)
 */
function populateSemestersTable() {
  const tableBody = document.getElementById('semesters-table-body');
  if (!tableBody) return;

  if (adminState.semesters.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="no-data">ยังไม่มีภาคเรียน</td></tr>`;
    return;
  }

  const rowsHTML = adminState.semesters.map((semester, index) => {
    const isActive = semester.id === adminState.activeSemester?.id;
    const semesterName = semester.name || semester.semester_name;

    return `
      <tr ${isActive ? 'class="active-row"' : ''}>
        <td><input type="checkbox" class="row-select" data-id="${semester.id}"></td>
        <td>${semester.id}</td>
        <td>${semesterName} ${isActive ? '<span class="active-badge">ใช้งาน</span>' : ''}</td>
        <td>${new Date(semester.created_at).toLocaleDateString('th-TH')}</td>
        <td class="table-actions">
          <button type="button" class="btn btn--sm btn--outline" onclick="editSemester(${semester.id})">✏️ แก้ไข</button>
          <button type="button" class="btn btn--sm btn--danger" onclick="deleteSemester(${semester.id}, '${semesterName}')" ${isActive ? 'disabled' : ''}>
            🗑️ ลบ
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = rowsHTML;

  console.log('[Admin] Populated semesters table');
}

// Expose deleteSemester handler for inline onclick
window.deleteSemester = async function (semesterId, semesterName) {
  try {
    if (!semesterId) return;
    const confirmed = confirm(`ยืนยันการลบภาคเรียน \"${semesterName}\" ?`);
    if (!confirmed) return;

    const result = await coreAPI.deleteSemester(parseInt(semesterId));
    if (!result.success) {
      alert(result.error || 'ลบภาคเรียนไม่สำเร็จ');
      return;
    }
    // Clear current activeSemester if it was deleted
    if (adminState.activeSemester && adminState.activeSemester.id === parseInt(semesterId)) {
      adminState.activeSemester = null;
    }
    // Reload list
    await loadSemesters();
    populateSemestersList();
    populateSemestersTable();
    // Refresh global context from backend (to sync any changes)
    try { await refreshContextFromBackend(); } catch (e) { }
    alert('ลบภาคเรียนเรียบร้อย');
  } catch (error) {
    console.error('[Admin] Error deleting semester:', error);
    alert('เกิดข้อผิดพลาดในการลบภาคเรียน');
  }
}

// =============================================================================

/**
 * Admin Page – API Integration Version
 */

import authAPI from '../api/auth-api.js';
import coreAPI from '../api/core-api.js';
import scheduleAPI from '../api/schedule-api.js';
import { getContext, refreshContextFromBackend } from '../context/globalContext.js';
import templateLoader from '../templateLoader.js';

let adminState = {
  context: null,
  initialized: false,
  templatesLoaded: false,
  templates: null,

  // Data Management
  teachers: [],
  classes: [],
  rooms: [],
  periods: [],
  subjects: [],
  subjectsRaw: [],
  academicYears: [],
  semesters: [],
  activeYear: null,
  activeSemester: null,

  // UI State
  currentPage: 1,
  itemsPerPage: 10,
  searchTerm: '',
  classSearchTerm: '',
  roomSearchTerm: '',
  subjectSearchTerm: '',
  periodSearchTerm: '',
  subjectCurrentPage: 1,
  subjectItemsPerPage: 10,
  periodsCurrentPage: 1,
  periodsPerPage: 10,
  editingTeacher: null,
  editingClass: null,
  editingRoom: null,
  editingSubject: null,
  editingPeriod: null,
  viewingSubject: null,
  sortColumn: 'id',
  sortDirection: 'asc',
  loading: false,
  error: null,
  classesLoading: false,
  classesError: null,
  roomsLoading: false,
  roomsError: null,
  subjectsLoading: false,
  subjectsError: null,
  periodsLoading: false,
  periodsError: null,
  subjectClassSelection: {
    selectedIds: []
  },
  isGeneratingSchedulePrompt: false
};

// Helper functions for compatibility
function getFullName(teacher) {
  if (!teacher) return 'Unknown';
  const firstName = teacher.f_name || '';
  const lastName = teacher.l_name || '';
  return `${firstName} ${lastName}`.trim() || 'Unknown';
}

function getRoleDisplayName(role) {
  const roleMap = {
    'teacher': 'ครู',
    'head_teacher': 'หัวหน้าครู',
    'admin': 'ผู้ดูแลระบบ',
    'super_admin': 'ผู้ดูแลระบบสูงสุด'
  };
  return roleMap[role] || role || 'ครู';
}

export async function initAdminPage(context = null) {
  const section = document.getElementById('page-admin');
  if (section) { section.classList.remove('hidden'); section.style.display = 'block'; }

  try { ensureUserActionsInSubnav(); } catch (e) { }

  adminState.context = normalizeContext(context) || getContext();

  // Check authentication first
  if (authAPI.isAuthenticated()) {
    // User is logged in - show admin sections and load data
    showAdminSections();
    updateUsernameHeader();

    // Load templates and initialize management
    await loadAdminTemplates();

    // NEW: Load academic year management data
    await initAcademicManagement();
    await initTeacherManagement();
    await initClassManagement();
    await initRoomManagement();
    await initSubjectManagement();
    await initPeriodManagement();
    initSchedulePromptTools();
  } else {
    // User not logged in - show login form only
    showAuthOnly();
    // Load templates for when they log in later
    await loadAdminTemplates();
  }

  // Bind navigation and auth events
  bindAuthForm();
  adjustAuthInputWidth();
  bindLogout();
  bindDataSubNavigation();
  bindMainAdminNavigation();

  adminState.initialized = true;
}

export function setAdminContext(year, semesterId) {
  adminState.context = { year, semesterId };
}

export function validateAdminContextAccess(context, user) {
  return true;
}

export async function updateAdminUIForContext(context) {
  adminState.context = normalizeContext(context) || adminState.context;
}

export async function showTeacherManagement() { }
export async function showClassManagement() { }
export async function showRoomManagement() { }
export async function showSubjectManagement() { }
export async function showScheduleManagement() { }

// ------------------------ Authentication ------------------------

function bindAuthForm() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = (document.getElementById('admin-username')?.value || '').trim();
    const p = (document.getElementById('admin-password')?.value || '');
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...'; }

    try {
      const result = await authAPI.login(u, p);
      if (result.success) {
        showAdminSections();
        updateUsernameHeader();

        // Load academic year/semester data every time after login
        await initAcademicManagement();
        // Initialize teacher management after successful login
        await initTeacherManagement();
        await initClassManagement();
        await initRoomManagement();
        await initSubjectManagement();
        await initPeriodManagement();

        if (result.isDemoMode || result.isOfflineMode) {
          console.log('✅', result.message);
        }
      } else {
        alert(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }

    if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
  });
}

function bindLogout() {
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('btn-logout-admin')) {
      try {
        await authAPI.logout();
        window.location.hash = 'login';
        window.location.reload();
      } catch (error) {
        console.error('Logout error:', error);
        window.location.hash = 'login';
        window.location.reload();
      }
    }
  }, { passive: true });
}

function showAuthOnly() {
  // If already authenticated, don't show auth form
  if (authAPI.isAuthenticated()) {
    showAdminSections();
    updateUsernameHeader();
    return;
  }

  const auth = document.getElementById('admin-auth-check');
  const sections = document.querySelectorAll('#page-admin .admin-section');
  const page = document.getElementById('page-admin');

  if (auth) auth.classList.remove('hidden');
  sections.forEach(s => s.classList.add('hidden'));
  const headerBtn = document.querySelector('#page-admin .btn-logout-admin');
  if (headerBtn) headerBtn.classList.add('hidden');
  const userBox = document.querySelector('#page-admin .admin-user-actions');
  if (userBox) userBox.classList.add('hidden');
  if (page) page.classList.add('auth-only');
}

function showAdminSections() {
  const auth = document.getElementById('admin-auth-check');
  const sections = document.querySelectorAll('#page-admin .admin-section');
  const page = document.getElementById('page-admin');
  if (auth) auth.classList.add('hidden');
  sections.forEach(s => s.classList.remove('hidden'));
  const headerBtn = document.querySelector('#page-admin .btn-logout-admin');
  if (headerBtn) headerBtn.classList.remove('hidden');
  const userBox = document.querySelector('#page-admin .admin-user-actions');
  if (userBox) userBox.classList.remove('hidden');
  if (page) page.classList.remove('auth-only');
}

function updateUsernameHeader() {
  try {
    const user = authAPI.getCurrentUser();
    const displayName = authAPI.getUserDisplayName();
    const el = document.getElementById('admin-username-display');
    if (el) el.textContent = 'ผู้ใช้: ' + displayName;
  } catch (e) { }
}

// ------------------------ Template Loading ------------------------

async function loadAdminTemplates() {
  if (adminState.templatesLoaded) return;

  try {
    const templates = await templateLoader.loadMultiple([
      'forms/admin/add-teacher',
      'forms/admin/add-class',
      'forms/admin/add-room',
      'forms/admin/add-subject',
      'forms/admin/add-period',
      'forms/admin/add-academic-year'
    ]);

    // Store templates for later use instead of inserting all at once
    adminState.templates = templates;

    const adminFormsGrid = document.querySelector('#admin-data .admin-forms-grid');
    if (adminFormsGrid) {
      // Only show teacher template by default (first tab)
      adminFormsGrid.innerHTML = `
        <div id="add-teacher" class="data-sub-page active">
          ${templates['forms/admin/add-teacher']}
        </div>
        <div id="add-class" class="data-sub-page hidden">
          ${templates['forms/admin/add-class']}
        </div>
        <div id="add-room" class="data-sub-page hidden">
          ${templates['forms/admin/add-room']}
        </div>
        <div id="add-subject" class="data-sub-page hidden">
          ${templates['forms/admin/add-subject']}
        </div>
        <div id="add-period" class="data-sub-page hidden">
          ${templates['forms/admin/add-period']}
        </div>
      `;

      // Store templates for later use when switching tabs
      window.adminTemplates = templates;
    }

    const academicManagementContent = document.querySelector('#academic-management-content');
    if (academicManagementContent) {
      const parser = new DOMParser();
      const templateHtml = templates['forms/admin/add-academic-year'];
      const doc = parser.parseFromString(templateHtml, 'text/html');
      const templateElement = doc.body.firstElementChild;

      academicManagementContent.innerHTML = '';
      if (templateElement) {
        academicManagementContent.appendChild(templateElement);
      } else {
        academicManagementContent.innerHTML = templateHtml;
      }
    }

    console.log('✅ Admin templates loaded successfully');
    adminState.templatesLoaded = true;

  } catch (error) {
    console.error('❌ Error loading admin templates:', error);
  }
}

// ------------------------ Teacher Management ------------------------

async function initTeacherManagement() {
  console.log('🔧 Initializing teacher management...');

  await new Promise(resolve => setTimeout(resolve, 200));

  const container = document.querySelector('.teacher-management-container');
  const tableBody = document.getElementById('teachers-table-body');

  if (!container || !tableBody) {
    console.error('❌ Teacher management elements not found!');
    return;
  }

  await loadTeachersData();

  bindTeacherFormEvents();
  bindTeacherTableEvents();
  bindTeacherSearchEvents();
  bindTeacherPaginationEvents();

  renderTeachersTable();

  console.log('✅ Teacher management initialized successfully');
}

async function loadTeachersData() {
  try {
    adminState.loading = true;
    adminState.error = null;

    const context = adminState.context || getContext();
    const year = context?.year || 2567;

    console.log(`📊 Loading teachers for year ${year}...`);
    const semesterId = context?.semester?.id || context?.semesterId;
    const result = await scheduleAPI.getTeachers(year, semesterId);

    if (result.success) {
      adminState.teachers = result.data || [];
      console.log(`✅ Loaded ${adminState.teachers.length} teachers for year ${year}`);

      // Debug: แสดงข้อมูล teacher ที่โหลดมา
      console.log('🔍 Teachers data loaded:', adminState.teachers);
      adminState.teachers.forEach(t => {
        console.log(`Teacher ID ${t.id}: title="${t.title}", name="${t.f_name} ${t.l_name}"`);
      });
      populateSubjectTeacherOptions();
    } else {
      console.error('❌ Failed to load teachers:', result.error);
      adminState.error = result.error;
      adminState.teachers = [];
      showTeachersError(result.error);
    }
  } catch (error) {
    console.error('❌ Error loading teachers data:', error);
    adminState.error = 'เกิดข้อผิดพลาดในการโหลดข้อมูลครู';
    adminState.teachers = [];
    showTeachersError(adminState.error);
  } finally {
    adminState.loading = false;
    populateSubjectTeacherOptions();
  }
}

function showTeachersError(message) {
  console.error('🚨 Teacher Error:', message);
}

function showTeachersSuccess(message) {
  console.log('✅ Teacher Success:', message);
}

// CRUD Operations
async function addNewTeacher(teacherData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || 2567;

    console.log('📝 Creating new teacher...', teacherData);
    const semesterId = context?.semester?.id || context?.semesterId;
    const result = await scheduleAPI.createTeacher(year, semesterId, teacherData);

    if (result.success) {
      console.log('✅ Teacher created successfully:', result.data);
      showTeachersSuccess('เพิ่มครูใหม่เรียบร้อยแล้ว');
      await loadTeachersData();
    } else {
      console.error('❌ Failed to create teacher:', result.error);
      showTeachersError(result.error || 'ไม่สามารถเพิ่มครูใหม่ได้');
    }
  } catch (error) {
    console.error('❌ Error creating teacher:', error);
    showTeachersError('เกิดข้อผิดพลาดในการเพิ่มครู');
  }
}

async function updateTeacher(id, teacherData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || 2567;

    console.log('📝 Updating teacher...', id, teacherData);
    const result = await scheduleAPI.updateTeacher(year, id, teacherData);

    if (result.success) {
      console.log('✅ Teacher updated successfully');
      showTeachersSuccess('อัปเดตข้อมูลครูเรียบร้อยแล้ว');
      await loadTeachersData();
    } else {
      console.error('❌ Failed to update teacher:', result.error);
      showTeachersError(result.error || 'ไม่สามารถอัปเดตข้อมูลครูได้');
    }
  } catch (error) {
    console.error('❌ Error updating teacher:', error);
    showTeachersError('เกิดข้อผิดพลาดในการอัปเดตครู');
  }
}

async function deleteTeacher(id, confirm = true) {
  if (confirm && !window.confirm('ต้องการลบครูคนนี้หรือไม่?')) {
    return;
  }

  try {
    const context = adminState.context || getContext();
    const year = context?.year || 2567;

    console.log('🗑️ Deleting teacher...', id);
    const result = await scheduleAPI.deleteTeacher(year, id);

    if (result.success) {
      console.log('✅ Teacher deleted successfully');
      showTeachersSuccess('ลบครูเรียบร้อยแล้ว');
      await loadTeachersData();
      renderTeachersTable();
    } else {
      console.error('❌ Failed to delete teacher:', result.error);
      showTeachersError(result.error || 'ไม่สามารถลบครูได้');
    }
  } catch (error) {
    console.error('❌ Error deleting teacher:', error);
    showTeachersError('เกิดข้อผิดพลาดในการลบครู');
  }
}

// Event Handlers
function bindTeacherFormEvents() {
  const teacherForm = document.getElementById('teacher-form');
  if (teacherForm) {
    teacherForm.addEventListener('submit', handleTeacherSubmit);
  }

  const clearButton = document.getElementById('clear-teacher-form');
  if (clearButton) {
    clearButton.addEventListener('click', clearTeacherForm);
  }
}

async function handleTeacherSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  // Debug: แสดงข้อมูลที่อ่านจาก form
  console.log('📝 Form Data Debug:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: "${value}"`);
  }

  // Debug: ดูค่าใน input elements โดยตรง
  const titleInput = document.getElementById('teacher-title-input');
  console.log('📝 Direct title input value:', titleInput ? titleInput.value : 'NOT_FOUND');

  const teacherData = {
    title: formData.get('title'),
    f_name: formData.get('f_name'),
    l_name: formData.get('l_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    subject_group: formData.get('subject_group'),
    role: formData.get('role')
  };

  console.log('📝 Teacher Data Object:', teacherData); // Debug log

  if (adminState.editingTeacher) {
    await updateTeacher(adminState.editingTeacher.id, teacherData);
    adminState.editingTeacher = null;
  } else {
    await addNewTeacher(teacherData);
  }

  clearTeacherForm();
  renderTeachersTable();
}

function clearTeacherForm() {
  const form = document.getElementById('teacher-form');
  if (form) {
    form.reset();
    adminState.editingTeacher = null;

    const title = form.closest('.admin-form-section').querySelector('h3');
    if (title) {
      title.textContent = '📝 เพิ่มครูใหม่';
    }
  }
}

// ------------------------ Class Management ------------------------

async function initClassManagement() {
  console.log('🔧 Initializing class management...');

  await new Promise(resolve => setTimeout(resolve, 200));

  const container = document.querySelector('.class-management-container');
  const tableBody = document.getElementById('classes-table-body');

  if (!container || !tableBody) {
    console.warn('⚠️ Class management elements not found. Skipping initialization.');
    return;
  }

  bindClassFormEvents();
  bindClassTableEvents();
  await loadClassesData();
  renderClassesTable();

  console.log('✅ Class management initialized successfully');
}

async function loadClassesData() {
  try {
    adminState.classesLoading = true;
    adminState.classesError = null;

    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      console.warn('⚠️ Missing year or semester context for loading classes');
      adminState.classes = [];
      return;
    }

    console.log(`📚 Loading classes for year ${year}, semester ${semesterId}...`);
    const result = await scheduleAPI.getClasses(year, semesterId);

    if (result.success) {
      const rows = result.data || [];
      adminState.classes = rows.map(cls => ({
        ...cls,
        display_name: cls.class_name || `${cls.grade_level}/${cls.section}`
      }));
      console.log(`✅ Loaded ${adminState.classes.length} classes for year ${year}`);
      renderSubjectClassLists();
    } else {
      adminState.classes = [];
      adminState.classesError = result.error || 'ไม่สามารถโหลดข้อมูลชั้นเรียนได้';
      showClassesError(adminState.classesError);
    }
  } catch (error) {
    adminState.classes = [];
    adminState.classesError = 'เกิดข้อผิดพลาดในการโหลดข้อมูลชั้นเรียน';
    console.error('❌ Error loading classes:', error);
    showClassesError(adminState.classesError);
  } finally {
    adminState.classesLoading = false;
    renderSubjectClassLists();
  }
}

function showClassesError(message) {
  console.error('🚨 Class Error:', message);
}

function showClassesSuccess(message) {
  console.log('✅ Class Success:', message);
}

async function addNewClass(classData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showClassesError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log('📝 Creating new class...', classData);
    const payload = {
      grade_level: classData.grade_level,
      section: Number(classData.section),
      semester_id: classData.semester_id || semesterId
    };

    const result = await scheduleAPI.createClass(year, semesterId, payload);

    if (result.success) {
      showClassesSuccess('เพิ่มชั้นเรียนใหม่เรียบร้อยแล้ว');
      await loadClassesData();
      renderClassesTable();
    } else {
      showClassesError(result.error || 'ไม่สามารถเพิ่มชั้นเรียนได้');
    }
  } catch (error) {
    console.error('❌ Error creating class:', error);
    showClassesError('เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน');
  }
}

function bindClassFormEvents() {
  const classForm = document.getElementById('class-form');
  if (classForm && !classForm.dataset.bound) {
    classForm.addEventListener('submit', handleClassSubmit);
    classForm.dataset.bound = 'true';
  }
}

async function handleClassSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const gradeLevel = String(formData.get('grade_level') || '').trim();
  const sectionRaw = formData.get('section');
  const sectionValue = Number(sectionRaw);

  if (!gradeLevel) {
    showClassesError('กรุณาเลือกชั้นเรียน');
    return;
  }

  if (!Number.isInteger(sectionValue) || sectionValue <= 0) {
    showClassesError('หมายเลขห้องต้องเป็นจำนวนเต็มบวก');
    return;
  }

  const payload = {
    grade_level: gradeLevel,
    section: sectionValue
  };

  if (adminState.editingClass) {
    await updateClass(adminState.editingClass.id, payload);
  } else {
    await addNewClass(payload);
  }

  clearClassForm();
}

function clearClassForm() {
  const form = document.getElementById('class-form');
  if (form) {
    form.reset();
    adminState.editingClass = null;

    const header = form.closest('.admin-form-section')?.querySelector('h3');
    if (header) {
      header.textContent = '🏫 เพิ่มชั้นเรียน';
    }
  }
}

// ------------------------ Room Management ------------------------

async function initRoomManagement() {
  console.log('🔧 Initializing room management...');

  await new Promise(resolve => setTimeout(resolve, 200));

  const container = document.querySelector('.room-management-container');
  const tableBody = document.getElementById('rooms-table-body');

  if (!container || !tableBody) {
    console.warn('⚠️ Room management elements not found. Skipping initialization.');
    return;
  }

  bindRoomFormEvents();
  bindRoomTableEvents();
  await loadRoomsData();
  renderRoomsTable();

  console.log('✅ Room management initialized successfully');
}

async function loadRoomsData() {
  try {
    adminState.roomsLoading = true;
    adminState.roomsError = null;

    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      console.warn('⚠️ Missing year or semester context for loading rooms');
      adminState.rooms = [];
      return;
    }

    console.log(`🏠 Loading rooms for year ${year}, semester ${semesterId}...`);
    const result = await scheduleAPI.getRooms(year, semesterId);

    if (result.success) {
      adminState.rooms = (result.data || []).map(room => ({
        ...room,
        display_name: room.room_name || ''
      }));
      console.log(`✅ Loaded ${adminState.rooms.length} rooms for year ${year}`);
      populateSubjectRoomOptions();
    } else {
      adminState.rooms = [];
      adminState.roomsError = result.error || 'ไม่สามารถโหลดข้อมูลห้องเรียนได้';
      showRoomsError(adminState.roomsError);
    }
  } catch (error) {
    adminState.rooms = [];
    adminState.roomsError = 'เกิดข้อผิดพลาดในการโหลดข้อมูลห้องเรียน';
    console.error('❌ Error loading rooms:', error);
    showRoomsError(adminState.roomsError);
  } finally {
    adminState.roomsLoading = false;
    populateSubjectRoomOptions();
  }
}

function showRoomsError(message) {
  console.error('🚨 Room Error:', message);
}

function showRoomsSuccess(message) {
  console.log('✅ Room Success:', message);
}

async function addNewRoom(roomData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showRoomsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log('📝 Creating new room...', roomData);
    const result = await scheduleAPI.createRoom(year, semesterId, roomData);

    if (result.success) {
      showRoomsSuccess('เพิ่มห้องเรียนใหม่เรียบร้อยแล้ว');
      await loadRoomsData();
      renderRoomsTable();
    } else {
      showRoomsError(result.error || 'ไม่สามารถเพิ่มห้องเรียนได้');
    }
  } catch (error) {
    console.error('❌ Error creating room:', error);
    showRoomsError('เกิดข้อผิดพลาดในการเพิ่มห้องเรียน');
  }
}

async function updateRoom(roomId, roomData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showRoomsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log('🛠️ Updating room...', roomId, roomData);
    const result = await scheduleAPI.updateRoom(year, semesterId, roomId, roomData);

    if (result.success) {
      showRoomsSuccess('อัปเดตห้องเรียนเรียบร้อยแล้ว');
      adminState.editingRoom = null;
      await loadRoomsData();
      renderRoomsTable();
    } else {
      showRoomsError(result.error || 'ไม่สามารถอัปเดตห้องเรียนได้');
    }
  } catch (error) {
    console.error('❌ Error updating room:', error);
    showRoomsError('เกิดข้อผิดพลาดในการอัปเดตห้องเรียน');
  }
}

async function deleteRoom(roomId) {
  if (!window.confirm('ต้องการลบห้องเรียนนี้หรือไม่?')) {
    return;
  }

  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showRoomsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log('🗑️ Deleting room...', roomId);
    const result = await scheduleAPI.deleteRoom(year, semesterId, roomId);

    if (result.success) {
      showRoomsSuccess('ลบห้องเรียนเรียบร้อยแล้ว');
      if (adminState.editingRoom && adminState.editingRoom.id === roomId) {
        adminState.editingRoom = null;
        clearRoomForm();
      }
      await loadRoomsData();
      renderRoomsTable();
    } else {
      showRoomsError(result.error || 'ไม่สามารถลบห้องเรียนได้');
    }
  } catch (error) {
    console.error('❌ Error deleting room:', error);
    showRoomsError('เกิดข้อผิดพลาดในการลบห้องเรียน');
  }
}

function bindRoomFormEvents() {
  const roomForm = document.getElementById('room-form');
  if (roomForm && roomForm.dataset.bound !== 'true') {
    roomForm.addEventListener('submit', handleRoomSubmit);
    roomForm.dataset.bound = 'true';
  }
}

async function handleRoomSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const roomName = String(formData.get('room_name') || '').trim();
  const roomType = String(formData.get('room_type') || '').trim();

  if (!roomName) {
    showRoomsError('กรุณากรอกชื่อห้องเรียน');
    return;
  }

  if (!['ทั่วไป', 'ปฏิบัติการคอมพิวเตอร์'].includes(roomType)) {
    showRoomsError('กรุณาเลือกประเภทห้องที่ถูกต้อง');
    return;
  }

  const payload = {
    room_name: roomName,
    room_type: roomType
  };

  if (adminState.editingRoom) {
    await updateRoom(adminState.editingRoom.id, payload);
  } else {
    await addNewRoom(payload);
  }

  clearRoomForm();
}

function clearRoomForm() {
  const form = document.getElementById('room-form');
  if (form) {
    form.reset();
    adminState.editingRoom = null;

    const header = form.closest('.admin-form-section')?.querySelector('h3');
    if (header) {
      header.textContent = '🏠 เพิ่มห้องเรียน';
    }
  }
}

function bindRoomTableEvents() {
  const table = document.getElementById('rooms-table');
  if (!table) return;

  if (table.dataset.bound === 'true') {
    return;
  }

  table.addEventListener('click', handleRoomTableClick);
  table.dataset.bound = 'true';
}

function handleRoomTableClick(event) {
  const target = event.target.closest('button[data-action]');
  if (!target) return;

  const roomId = parseInt(target.dataset.roomId || '', 10);
  if (!roomId || Number.isNaN(roomId)) return;

  const action = target.dataset.action;
  if (action === 'edit') {
    enterRoomEditMode(roomId);
  } else if (action === 'delete') {
    deleteRoom(roomId);
  } else if (action === 'view') {
    viewRoomInformation(roomId);
  }
}

function enterRoomEditMode(roomId) {
  const targetRoom = adminState.rooms.find(room => room.id === roomId);
  if (!targetRoom) {
    showRoomsError('ไม่พบข้อมูลห้องเรียนที่ต้องการแก้ไข');
    return;
  }

  const form = document.getElementById('room-form');
  if (!form) return;

  const nameInput = form.querySelector('#room-name');
  const typeSelect = form.querySelector('#room-type');

  if (nameInput) {
    nameInput.value = targetRoom.room_name || '';
  }
  if (typeSelect) {
    typeSelect.value = targetRoom.room_type || '';
  }

  adminState.editingRoom = targetRoom;

  const header = form.closest('.admin-form-section')?.querySelector('h3');
  if (header) {
    header.textContent = `✏️ แก้ไขห้องเรียน ${targetRoom.room_name || ''}`.trim();
  }

  nameInput?.focus();
}

function viewRoomInformation(roomId) {
  const targetRoom = adminState.rooms.find(room => room.id === roomId);
  if (!targetRoom) {
    showRoomsError('ไม่พบข้อมูลห้องเรียน');
    return;
  }

  const nameEl = document.getElementById('view-room-name');
  const typeEl = document.getElementById('view-room-type');
  const idEl = document.getElementById('view-room-id');
  const createdEl = document.getElementById('view-room-created');

  if (nameEl) nameEl.textContent = targetRoom.room_name || '-';
  if (typeEl) typeEl.textContent = targetRoom.room_type || '-';
  if (idEl) idEl.textContent = String(targetRoom.id ?? '-');
  if (createdEl) {
    createdEl.textContent = targetRoom.created_at ? new Date(targetRoom.created_at).toLocaleString('th-TH') : '-';
  }

  const modal = document.getElementById('view-room-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  const closeButtons = modal.querySelectorAll('[data-modal-close], .modal-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
  });

  const editButton = document.getElementById('edit-from-view-room');
  if (editButton) {
    editButton.onclick = () => {
      modal.classList.add('hidden');
      enterRoomEditMode(roomId);
    };
  }
}

function renderRoomsTable() {
  const tableBody = document.getElementById('rooms-table-body');
  if (!tableBody) return;

  if (adminState.roomsLoading) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 2rem; text-align: center; color: #666;">
          ⏳ กำลังโหลดข้อมูลห้องเรียน...
        </td>
      </tr>
    `;
    return;
  }

  if (!adminState.rooms || adminState.rooms.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 2rem; text-align: center; color: #666;">
          📋 ยังไม่มีข้อมูลห้องเรียนสำหรับภาคเรียนนี้
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = adminState.rooms.map(room => {
    const createdAt = room.created_at ? new Date(room.created_at).toLocaleString('th-TH') : '-';
    const displayName = room.display_name || room.room_name || '-';
    const roomType = room.room_type || '-';

    return `
      <tr class="room-row" data-room-id="${room.id}">
        <td class="col-checkbox">
          <input type="checkbox" class="room-row-checkbox" data-room-id="${room.id}" aria-label="เลือกห้องเรียน ${displayName}">
        </td>
        <td class="col-id">${room.id ?? '-'}</td>
        <td class="col-room-name">${displayName}</td>
        <td class="col-room-type">${roomType}</td>
        <td class="col-created">${createdAt}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button type="button" class="btn btn--sm btn--outline" data-action="edit" data-room-id="${room.id}" title="แก้ไขห้องเรียน ${displayName}">✏️</button>
            <button type="button" class="btn btn--sm btn--danger" data-action="delete" data-room-id="${room.id}" title="ลบห้องเรียน ${displayName}">🗑️</button>
            <button type="button" class="btn btn--sm btn--primary" data-action="view" data-room-id="${room.id}" title="ดูรายละเอียดห้องเรียน ${displayName}">👁️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const actionButtons = tableBody.querySelectorAll('button[data-action]');
  actionButtons.forEach(button => {
    if (button.dataset.bound === 'true') {
      return;
    }
    button.addEventListener('click', handleRoomTableClick);
    button.dataset.bound = 'true';
  });
}

// ------------------------ Subject Management ------------------------

async function initSubjectManagement() {
  console.log('🔧 Initializing subject management...');

  await new Promise(resolve => setTimeout(resolve, 200));

  const container = document.querySelector('.subject-management-container');
  const tableBody = document.getElementById('subjects-table-body');

  if (!container || !tableBody) {
    console.warn('⚠️ Subject management elements not found. Skipping initialization.');
    return;
  }

  setSubjectFormMode('create');

  if (!Array.isArray(adminState.teachers) || adminState.teachers.length === 0) {
    await loadTeachersData();
  }

  if (!Array.isArray(adminState.classes) || adminState.classes.length === 0) {
    await loadClassesData();
  }

  if (!Array.isArray(adminState.rooms) || adminState.rooms.length === 0) {
    await loadRoomsData();
  }

  populateSubjectTeacherOptions();
  populateSubjectRoomOptions();
  resetSubjectClassSelection();

  bindSubjectFormEvents();
  bindSubjectControls();
  bindSubjectTableEvents();

  await loadSubjectsData();
  renderSubjectsTable();

  console.log('✅ Subject management initialized successfully');
}

async function loadSubjectsData() {
  try {
    adminState.subjectsLoading = true;
    adminState.subjectsError = null;

    const { year, semesterId } = getActiveAdminContext();

    if (!year || !semesterId) {
      console.warn('⚠️ Missing year or semester context for loading subjects');
      adminState.subjects = [];
      return;
    }

    console.log(`📚 Loading subjects for year ${year}, semester ${semesterId}...`);
    const result = await scheduleAPI.getSubjects(year, semesterId);

    if (result.success && Array.isArray(result.data)) {
      adminState.subjectsRaw = result.data.map(subject => ({ ...subject }));
      const groupedSubjects = buildSubjectGroups(adminState.subjectsRaw)
        .sort((a, b) => {
          const teacherCompare = getTeacherDisplayNameById(a.teacher_id).localeCompare(getTeacherDisplayNameById(b.teacher_id), 'th');
          if (teacherCompare !== 0) return teacherCompare;

          const classCompare = getClassDisplayNameById(a.primary_class_id).localeCompare(getClassDisplayNameById(b.primary_class_id), 'th');
          if (classCompare !== 0) return classCompare;

          return (a.subject_name || '').localeCompare(b.subject_name || '', 'th');
        });

      adminState.subjects = groupedSubjects;
      adminState.subjectCurrentPage = 1;
      console.log(`✅ Loaded ${adminState.subjects.length} grouped subjects (raw rows: ${adminState.subjectsRaw.length}) for year ${year}`);
    } else {
      adminState.subjects = [];
      adminState.subjectsRaw = [];
      adminState.subjectsError = result.error || 'ไม่สามารถโหลดข้อมูลวิชาเรียนได้';
      showSubjectsError(adminState.subjectsError);
    }
  } catch (error) {
    adminState.subjects = [];
    adminState.subjectsRaw = [];
    adminState.subjectsError = 'เกิดข้อผิดพลาดในการโหลดข้อมูลวิชาเรียน';
    console.error('❌ Error loading subjects:', error);
    showSubjectsError(adminState.subjectsError);
  } finally {
    adminState.subjectsLoading = false;
  }
}

function showSubjectsError(message) {
  console.error('🚨 Subject Error:', message);
}

function showSubjectsSuccess(message) {
  console.log('✅ Subject Success:', message);
}

function populateSubjectTeacherOptions() {
  const teacherSelect = document.getElementById('subject-teacher');
  const editTeacherSelect = document.getElementById('edit-subject-teacher');

  if (!teacherSelect && !editTeacherSelect) {
    return;
  }

  const teachers = Array.isArray(adminState.teachers) ? adminState.teachers : [];

  const optionsHTML = [
    '<option value="">-- เลือกครู --</option>',
    ...teachers.map(teacher => {
      const displayName = formatTeacherName(teacher);
      return `<option value="${teacher.id}">${displayName}</option>`;
    })
  ].join('');

  if (teacherSelect) {
    const currentValue = teacherSelect.value;
    teacherSelect.innerHTML = optionsHTML;
    if (currentValue && teacherSelect.querySelector(`option[value="${currentValue}"]`)) {
      teacherSelect.value = currentValue;
    }
  }

  if (editTeacherSelect) {
    const currentEditValue = editTeacherSelect.value;
    editTeacherSelect.innerHTML = optionsHTML;
    if (currentEditValue && editTeacherSelect.querySelector(`option[value="${currentEditValue}"]`)) {
      editTeacherSelect.value = currentEditValue;
    }
  }
}

function populateSubjectRoomOptions() {
  const roomSelect = document.getElementById('subject-room');
  const editRoomSelect = document.getElementById('edit-subject-room');

  if (!roomSelect && !editRoomSelect) {
    return;
  }

  const rooms = Array.isArray(adminState.rooms) ? adminState.rooms : [];

  const optionsHTML = [
    '<option value="">-- เลือกห้องเรียน (ถ้ามี) --</option>',
    ...rooms.map(room => {
      const label = getRoomDisplayNameById(room.id);
      return `<option value="${room.id}">${label}</option>`;
    })
  ].join('');

  if (roomSelect) {
    const currentValue = roomSelect.value;
    roomSelect.innerHTML = optionsHTML;
    if (currentValue && roomSelect.querySelector(`option[value="${currentValue}"]`)) {
      roomSelect.value = currentValue;
    }
  }

  if (editRoomSelect) {
    const currentEditValue = editRoomSelect.value;
    editRoomSelect.innerHTML = optionsHTML;
    if (currentEditValue && editRoomSelect.querySelector(`option[value="${currentEditValue}"]`)) {
      editRoomSelect.value = currentEditValue;
    }
  }
}

function resetSubjectClassSelection() {
  adminState.subjectClassSelection = {
    selectedIds: []
  };

  renderSubjectClassLists();
  updateClassTransferButtons();
  updateSubjectClassHiddenInput();
}

function renderSubjectClassLists() {
  const availableContainer = document.getElementById('available-classes');
  const selectedContainer = document.getElementById('selected-classes');

  if (!availableContainer || !selectedContainer) {
    return;
  }

  const selectedIds = (adminState.subjectClassSelection.selectedIds || []).map(id => Number(id));
  const classes = Array.isArray(adminState.classes) ? adminState.classes : [];

  const availableClasses = classes
    .filter(cls => !selectedIds.includes(Number(cls.id)))
    .sort((a, b) => getClassDisplayNameById(a.id).localeCompare(getClassDisplayNameById(b.id), 'th'));

  const selectedClasses = classes
    .filter(cls => selectedIds.includes(Number(cls.id)))
    .sort((a, b) => getClassDisplayNameById(a.id).localeCompare(getClassDisplayNameById(b.id), 'th'));

  availableContainer.innerHTML = availableClasses.length
    ? availableClasses.map(cls => subjectClassItemTemplate(cls, 'available')).join('')
    : '<div class="empty">ไม่มีชั้นเรียน</div>';

  selectedContainer.innerHTML = selectedClasses.length
    ? selectedClasses.map(cls => subjectClassItemTemplate(cls, 'selected')).join('')
    : '<div class="empty">ยังไม่ได้เลือกชั้นเรียน</div>';

  updateSubjectClassHiddenInput();
  updateClassTransferButtons();
}

function subjectClassItemTemplate(cls, listType) {
  const label = getClassDisplayNameById(cls.id);
  return `<button type="button" class="class-item" data-class-id="${cls.id}" data-list="${listType}" aria-pressed="false">${label}</button>`;
}

function handleSubjectClassItemClick(event) {
  const item = event.target.closest('.class-item');
  if (!item) return;

  const isSelected = item.classList.toggle('selected');
  item.setAttribute('aria-pressed', String(isSelected));
  updateClassTransferButtons();
}

function handleAddClassSelection() {
  const selectedButtons = Array.from(document.querySelectorAll('#available-classes .class-item.selected'));
  if (selectedButtons.length === 0) {
    return;
  }

  const selectedIds = adminState.subjectClassSelection.selectedIds || [];

  selectedButtons.forEach(button => {
    const classId = Number(button.dataset.classId);
    if (!selectedIds.includes(classId)) {
      selectedIds.push(classId);
    }
  });

  adminState.subjectClassSelection.selectedIds = selectedIds;
  renderSubjectClassLists();
}

function handleRemoveClassSelection() {
  const selectedButtons = Array.from(document.querySelectorAll('#selected-classes .class-item.selected'));
  if (selectedButtons.length === 0) {
    return;
  }

  let selectedIds = adminState.subjectClassSelection.selectedIds || [];
  const idsToRemove = selectedButtons.map(button => Number(button.dataset.classId));

  selectedIds = selectedIds.filter(id => !idsToRemove.includes(Number(id)));
  adminState.subjectClassSelection.selectedIds = selectedIds;

  renderSubjectClassLists();
}

function updateSubjectClassHiddenInput() {
  const hiddenField = document.getElementById('selected-class-ids');
  if (!hiddenField) return;

  const selectedIds = adminState.subjectClassSelection.selectedIds || [];
  hiddenField.value = selectedIds.join(',');
}

function updateClassTransferButtons() {
  const addButton = document.getElementById('subject-add-class');
  const removeButton = document.getElementById('subject-remove-class');

  if (addButton) {
    const hasSelection = !!document.querySelector('#available-classes .class-item.selected');
    addButton.disabled = !hasSelection;
  }

  if (removeButton) {
    const hasSelection = !!document.querySelector('#selected-classes .class-item.selected');
    removeButton.disabled = !hasSelection;
  }
}

function bindSubjectFormEvents() {
  const form = document.getElementById('subject-form');
  if (form && form.dataset.bound !== 'true') {
    form.addEventListener('submit', handleSubjectSubmit);
    form.dataset.bound = 'true';
  }

  const resetButton = document.getElementById('clear-subject-form');
  if (resetButton && resetButton.dataset.bound !== 'true') {
    resetButton.addEventListener('click', () => {
      clearSubjectForm();
      resetButton.blur();
    });
    resetButton.dataset.bound = 'true';
  }
}

function bindSubjectControls() {
  const searchInput = document.getElementById('subject-search');
  if (searchInput && searchInput.dataset.bound !== 'true') {
    searchInput.addEventListener('input', (event) => {
      adminState.subjectSearchTerm = (event.target.value || '').toString().trim().toLowerCase();
      adminState.subjectCurrentPage = 1;
      renderSubjectsTable();
    });
    searchInput.dataset.bound = 'true';
  }

  const searchButton = document.getElementById('search-subjects');
  if (searchButton && searchButton.dataset.bound !== 'true') {
    searchButton.addEventListener('click', () => {
      adminState.subjectCurrentPage = 1;
      renderSubjectsTable();
    });
    searchButton.dataset.bound = 'true';
  }

  const perPageSelect = document.getElementById('entries-per-page-subjects');
  if (perPageSelect && perPageSelect.dataset.bound !== 'true') {
    perPageSelect.addEventListener('change', (event) => {
      const value = parseInt(event.target.value, 10);
      adminState.subjectItemsPerPage = Number.isFinite(value) && value > 0 ? value : 10;
      adminState.subjectCurrentPage = 1;
      renderSubjectsTable();
    });
    perPageSelect.dataset.bound = 'true';
    if (perPageSelect.value) {
      adminState.subjectItemsPerPage = parseInt(perPageSelect.value, 10) || adminState.subjectItemsPerPage;
    } else {
      perPageSelect.value = String(adminState.subjectItemsPerPage);
    }
  }

  const prevButton = document.getElementById('prev-page-subjects');
  if (prevButton && prevButton.dataset.bound !== 'true') {
    prevButton.addEventListener('click', () => {
      if (adminState.subjectCurrentPage > 1) {
        adminState.subjectCurrentPage -= 1;
        renderSubjectsTable();
      }
    });
    prevButton.dataset.bound = 'true';
  }

  const nextButton = document.getElementById('next-page-subjects');
  if (nextButton && nextButton.dataset.bound !== 'true') {
    nextButton.addEventListener('click', () => {
      const subjects = getFilteredSubjects();
      const perPage = adminState.subjectItemsPerPage || 10;
      const totalPages = Math.max(1, Math.ceil(subjects.length / perPage));
      if (adminState.subjectCurrentPage < totalPages) {
        adminState.subjectCurrentPage += 1;
        renderSubjectsTable();
      }
    });
    nextButton.dataset.bound = 'true';
  }

  const availableContainer = document.getElementById('available-classes');
  if (availableContainer && availableContainer.dataset.bound !== 'true') {
    availableContainer.addEventListener('click', handleSubjectClassItemClick);
    availableContainer.dataset.bound = 'true';
  }

  const selectedContainer = document.getElementById('selected-classes');
  if (selectedContainer && selectedContainer.dataset.bound !== 'true') {
    selectedContainer.addEventListener('click', handleSubjectClassItemClick);
    selectedContainer.dataset.bound = 'true';
  }

  const addButton = document.getElementById('subject-add-class');
  if (addButton && addButton.dataset.bound !== 'true') {
    addButton.addEventListener('click', handleAddClassSelection);
    addButton.dataset.bound = 'true';
  }

  const removeButton = document.getElementById('subject-remove-class');
  if (removeButton && removeButton.dataset.bound !== 'true') {
    removeButton.addEventListener('click', handleRemoveClassSelection);
    removeButton.dataset.bound = 'true';
  }
}

function bindSubjectTableEvents() {
  const table = document.getElementById('subjects-table');
  if (!table || table.dataset.bound === 'true') {
    return;
  }

  table.addEventListener('click', handleSubjectTableClick);
  table.addEventListener('change', handleSubjectTableChange, true);
  table.dataset.bound = 'true';
}

async function handleSubjectSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton ? submitButton.textContent : '';
  const isEditing = !!(adminState.editingSubject && adminState.editingSubject.id);

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = isEditing ? 'กำลังอัปเดต...' : 'กำลังบันทึก...';
    }

    const formData = new FormData(form);
    const teacherId = Number(formData.get('teacher_id'));
    const classIdsRaw = String(formData.get('class_ids') || '').split(',').map(id => Number(id)).filter(Boolean);
    const classIds = Array.from(new Set(classIdsRaw));
    const subjectName = String(formData.get('subject_name') || '').trim();
    const subjectCode = String(formData.get('subject_code') || '').trim();
    const periodsPerWeek = Number(formData.get('periods_per_week'));
    const defaultRoomIdRaw = formData.get('default_room_id');
    const defaultRoomId = defaultRoomIdRaw ? Number(defaultRoomIdRaw) : null;
    const requirements = String(formData.get('special_requirements') || '').trim();

    if (!teacherId) {
      showSubjectsError('กรุณาเลือกครูผู้สอน');
      alert('กรุณาเลือกครูผู้สอน');
      return;
    }

    if (!classIds.length) {
      showSubjectsError('กรุณาเลือกอย่างน้อยหนึ่งชั้นเรียน');
      alert('กรุณาเลือกชั้นเรียนอย่างน้อยหนึ่งห้อง');
      return;
    }

    if (!subjectName) {
      showSubjectsError('กรุณาระบุชื่อวิชา');
      alert('กรุณาระบุชื่อวิชา');
      return;
    }

    if (!Number.isFinite(periodsPerWeek) || periodsPerWeek <= 0 || periodsPerWeek > 20) {
      showSubjectsError('จำนวนคาบต่อสัปดาห์ต้องอยู่ระหว่าง 1-20');
      alert('จำนวนคาบต่อสัปดาห์ต้องอยู่ระหว่าง 1-20');
      return;
    }

    const { year, semesterId } = getActiveAdminContext();

    if (!year || !semesterId) {
      showSubjectsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      alert('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    if (isEditing) {
      const subject = adminState.editingSubject;
      if (!subject || !subject.id) {
        showSubjectsError('ไม่พบข้อมูลวิชาที่ต้องการแก้ไข');
        alert('ไม่พบข้อมูลวิชาที่ต้องการแก้ไข');
        return;
      }

      const payload = {
        teacher_id: teacherId,
        class_id: classIds[0],
        class_ids: classIds,
        group_key: subject.group_key,
        subject_name: subjectName,
        subject_code: subjectCode || null,
        periods_per_week: periodsPerWeek,
        default_room_id: defaultRoomId || null,
        special_requirements: requirements || null
      };

      const result = await scheduleAPI.updateSubject(year, semesterId, subject.id, payload);

      if (result.success) {
        showSubjectsSuccess('อัปเดตข้อมูลวิชาเรียบร้อยแล้ว');
        await loadSubjectsData();
        renderSubjectsTable();
        clearSubjectForm();
      } else {
        const errorMessage = result.error || 'ไม่สามารถอัปเดตข้อมูลวิชาได้';
        showSubjectsError(errorMessage);
        alert(errorMessage);
      }

      return;
    }

    const creationResult = await scheduleAPI.createSubject(year, semesterId, {
      semester_id: semesterId,
      teacher_id: teacherId,
      class_ids: classIds,
      class_id: classIds[0],
      subject_name: subjectName,
      subject_code: subjectCode || null,
      periods_per_week: periodsPerWeek,
      default_room_id: defaultRoomId || null,
      special_requirements: requirements || null
    });

    if (creationResult.success) {
      showSubjectsSuccess('เพิ่มวิชาเรียนเรียบร้อยแล้ว');
      await loadSubjectsData();
      renderSubjectsTable();
      clearSubjectForm();
    } else {
      const errorMessage = creationResult.error || 'ไม่สามารถเพิ่มวิชาเรียนได้';
      showSubjectsError(errorMessage);
      alert(errorMessage);
    }
  } catch (error) {
    console.error('❌ Error creating subject:', error);
    showSubjectsError('เกิดข้อผิดพลาดในการเพิ่มวิชาเรียน');
    alert('เกิดข้อผิดพลาดในการเพิ่มวิชาเรียน');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText || '💾 บันทึก';
    }
  }
}

function clearSubjectForm(options = {}) {
  const { keepEditing = false } = options;

  const form = document.getElementById('subject-form');
  if (form) {
    form.reset();
  }

  adminState.subjectClassSelection = {
    selectedIds: []
  };
  resetSubjectClassSelection();

  const teacherSelect = document.getElementById('subject-teacher');
  if (teacherSelect) {
    teacherSelect.value = '';
  }

  const roomSelect = document.getElementById('subject-room');
  if (roomSelect) {
    roomSelect.value = '';
  }

  const requirementsInput = document.getElementById('subject-requirements');
  if (requirementsInput) {
    requirementsInput.value = '';
  }

  if (!keepEditing) {
    adminState.editingSubject = null;
    setSubjectFormMode('create');
  }
}

function setSubjectFormMode(mode, subjectName = '') {
  const header = document.querySelector('.admin-form-section-fullwidth h3');
  const submitButton = document.getElementById('subject-submit-button');
  const clearButton = document.getElementById('clear-subject-form');

  if (mode === 'edit') {
    if (header) {
      header.textContent = '✏️ แก้ไขวิชาเรียน';
    }
    if (submitButton) {
      submitButton.textContent = '💾 อัปเดต';
    }
    if (clearButton) {
      clearButton.textContent = '↩️ ยกเลิกการแก้ไข';
      clearButton.dataset.mode = 'cancel-edit';
    }
  } else {
    if (header) {
      header.textContent = '📚 เพิ่มวิชาเรียน';
    }
    if (submitButton) {
      submitButton.textContent = '💾 บันทึก';
    }
    if (clearButton) {
      clearButton.textContent = '🔄 ล้างฟอร์ม';
      delete clearButton.dataset.mode;
    }
  }
}

function startSubjectEdit(subject) {
  if (!subject) {
    return;
  }

  adminState.editingSubject = { ...subject };

  populateSubjectTeacherOptions();
  populateSubjectRoomOptions();

  const teacherSelect = document.getElementById('subject-teacher');
  if (teacherSelect) {
    teacherSelect.value = subject.teacher_id != null ? String(subject.teacher_id) : '';
  }

  const roomSelect = document.getElementById('subject-room');
  if (roomSelect) {
    roomSelect.value = subject.default_room_id != null ? String(subject.default_room_id) : '';
  }

  const nameInput = document.getElementById('subject-name');
  if (nameInput) {
    nameInput.value = subject.subject_name || '';
  }

  const codeInput = document.getElementById('subject-code');
  if (codeInput) {
    codeInput.value = subject.subject_code || '';
  }

  const periodsInput = document.getElementById('subject-periods');
  if (periodsInput) {
    periodsInput.value = subject.periods_per_week != null ? String(subject.periods_per_week) : '';
  }

  const requirementsInput = document.getElementById('subject-requirements');
  if (requirementsInput) {
    requirementsInput.value = subject.special_requirements || '';
  }

  const classIds = Array.isArray(subject.class_ids) && subject.class_ids.length > 0
    ? subject.class_ids
    : [subject.class_id];

  adminState.subjectClassSelection = {
    selectedIds: classIds.filter(id => id != null).map(id => Number(id))
  };

  renderSubjectClassLists();

  const hiddenField = document.getElementById('selected-class-ids');
  if (hiddenField) {
    hiddenField.value = (adminState.subjectClassSelection.selectedIds || []).join(',');
  }

  setSubjectFormMode('edit', subject.subject_name || '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSubjectTableChange(event) {
  const checkbox = event.target.closest('.subject-row-checkbox');
  if (checkbox) {
    updateSubjectBulkActions();
  }
}

function handleSubjectSelectAll(event) {
  const checked = event.target.checked;
  const checkboxes = document.querySelectorAll('.subject-row-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = checked;
  });
  updateSubjectBulkActions();
}

function updateSubjectBulkActions() {
  const selectedIds = getSelectedSubjectIds();

  const selectAllCheckbox = document.getElementById('select-all-subjects');
  if (selectAllCheckbox) {
    const rowCheckboxes = document.querySelectorAll('.subject-row-checkbox');
    const total = rowCheckboxes.length;
    const allSelected = total > 0 && selectedIds.length === total;
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = selectedIds.length > 0 && selectedIds.length < total;
    selectAllCheckbox.disabled = total === 0;
  }

  const bulkDeleteButton = document.getElementById('bulk-delete-subjects');
  if (bulkDeleteButton) {
    bulkDeleteButton.disabled = selectedIds.length === 0;
  }
}

function getSelectedSubjectIds() {
  return Array.from(document.querySelectorAll('.subject-row-checkbox:checked'))
    .map(cb => Number(cb.dataset.subjectId))
    .filter(Boolean);
}

async function handleBulkDeleteSubjects() {
  const selectedIds = getSelectedSubjectIds();
  if (selectedIds.length === 0) {
    alert('กรุณาเลือกวิชาที่ต้องการลบ');
    return;
  }

  const confirmed = window.confirm(`ต้องการลบวิชาที่เลือกจำนวน ${selectedIds.length} รายการหรือไม่?`);
  if (!confirmed) {
    return;
  }

  try {
    const { year, semesterId } = getActiveAdminContext();

    if (!year || !semesterId) {
      alert('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    for (const subjectId of selectedIds) {
      await scheduleAPI.deleteSubject(year, semesterId, subjectId);
    }

    showSubjectsSuccess(`ลบวิชาเรียนเรียบร้อยแล้ว (${selectedIds.length} รายการ)`);
    await loadSubjectsData();
    renderSubjectsTable();
    updateSubjectBulkActions();
  } catch (error) {
    console.error('❌ Error bulk deleting subjects:', error);
    showSubjectsError('เกิดข้อผิดพลาดในการลบวิชาเรียน');
    alert('เกิดข้อผิดพลาดในการลบวิชาเรียน');
  }
}

function openSubjectViewModal(subject) {
  if (!subject) {
    return;
  }

  const teacherName = getTeacherDisplayNameById(subject.teacher_id)
    || normalizeTeacherNameString(subject.teacher_name)
    || (subject.teacher_id != null ? `ครู #${subject.teacher_id}` : 'ไม่ระบุ');
  const classNames = getClassNamesFromIds(subject.class_ids && subject.class_ids.length ? subject.class_ids : [subject.class_id]);
  const classDisplay = classNames.length ? classNames.join(', ') : '-';
  const roomName = subject.room_name || (subject.default_room_id ? getRoomDisplayNameById(subject.default_room_id) : '-');
  const rawRequirements = (subject.special_requirements || '').trim();
  const requirements = rawRequirements ? rawRequirements : 'ไม่มี';
  const subjectCode = subject.subject_code || '-';
  const periods = subject.periods_per_week != null ? `${subject.periods_per_week} คาบ/สัปดาห์` : '-';
  const createdAt = subject.created_at ? new Date(subject.created_at).toLocaleString('th-TH') : '-';

  const details = [
    `ID: ${subject.id ?? '-'}`,
    `วิชา: ${subject.subject_name || '-'}`,
    `รหัส: ${subjectCode}`,
    `ครู: ${teacherName}`,
    `ชั้นเรียน: ${classDisplay}`,
    `คาบ/สัปดาห์: ${periods}`,
    `ห้อง: ${roomName}`,
    `ความต้องการพิเศษ: ${requirements}`,
    `วันที่เพิ่ม: ${createdAt}`
  ].join('\n');

  alert(`รายละเอียดวิชาเรียน\n\n${details}`);
}

function openSubjectEditModal(subject) {
  startSubjectEdit(subject);
}


function renderSubjectsTable() {
  const tableBody = document.getElementById('subjects-table-body');
  if (!tableBody) return;

  if (adminState.subjectsLoading) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" style="padding: 2rem; text-align: center; color: #666;">
          ⏳ กำลังโหลดข้อมูลวิชาเรียน...
        </td>
      </tr>
    `;
    updateSubjectPagination(0, 0);
    return;
  }

  const filteredSubjects = getFilteredSubjects();
  const perPage = adminState.subjectItemsPerPage || 10;
  const totalItems = filteredSubjects.length;
  const totalPages = totalItems === 0 ? 0 : Math.max(1, Math.ceil(totalItems / perPage));

  if (totalPages > 0 && adminState.subjectCurrentPage > totalPages) {
    adminState.subjectCurrentPage = totalPages;
  }

  const startIndex = (adminState.subjectCurrentPage - 1) * perPage;
  const pageItems = filteredSubjects.slice(startIndex, startIndex + perPage);

  if (pageItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" style="padding: 2rem; text-align: center; color: #666;">
          📋 ยังไม่มีข้อมูลวิชาเรียนสำหรับภาคเรียนนี้
        </td>
      </tr>
    `;
    updateSubjectPagination(totalItems, totalPages);
    return;
  }

  tableBody.innerHTML = pageItems.map(subject => {
    const teacherName = getTeacherDisplayNameById(subject.teacher_id)
      || normalizeTeacherNameString(subject.teacher_name)
      || 'ไม่ระบุครูผู้สอน';
    const classNames = getClassNamesFromIds(subject.class_ids && subject.class_ids.length ? subject.class_ids : [subject.class_id]);
    const classDisplay = classNames.length ? classNames.join(', ') : (subject.class_name || getClassDisplayNameById(subject.class_id) || '-');
    const classTitle = classNames.length ? classNames.join(', ') : classDisplay;
    const roomName = subject.room_name || (subject.default_room_id ? getRoomDisplayNameById(subject.default_room_id) : '-');
    const subjectCode = subject.subject_code || '-';
    const periods = subject.periods_per_week ?? '-';
    const rawRequirements = subject.special_requirements == null ? '' : String(subject.special_requirements).trim();
    const requirementsDisplay = rawRequirements ? rawRequirements.replace(/\n/g, '<br>') : '-';
    const requirementsTitle = rawRequirements ? rawRequirements.replace(/"/g, '&quot;').replace(/\n/g, ' / ') : '-';
    const subjectNameForTitle = String(subject.subject_name || '').replace(/"/g, '&quot;');
    const createdAt = subject.created_at ? new Date(subject.created_at).toLocaleString('th-TH') : '-';
    const subjectId = subject.id ?? subject.subject_id ?? '-';

    return `
      <tr class="subject-row" data-subject-id="${subject.id}" data-group-key="${subject.group_key || ''}">
        <td class="col-checkbox">
          <input type="checkbox" class="subject-row-checkbox" data-subject-id="${subject.id}" aria-label="เลือกวิชา ${subject.subject_name}">
        </td>
        <td class="col-id">${subjectId}</td>
        <td class="col-subject-name">
          <div class="subject-name-cell">
            <strong>${subject.subject_name}</strong>
          </div>
        </td>
        <td class="col-subject-code">${subjectCode}</td>
        <td class="col-teacher">${teacherName}</td>
        <td class="col-class" title="${classTitle}">${classDisplay}</td>
        <td class="col-periods">${periods}</td>
        <td class="col-room">${roomName}</td>
        <td class="col-requirements" title="${requirementsTitle}">${requirementsDisplay}</td>
        <td class="col-created">${createdAt}</td>
        <td class="col-actions">
          <div class="actions-container">
            <button type="button" class="btn btn--sm btn--outline" data-action="edit" data-subject-id="${subject.id}" title="แก้ไขวิชา ${subjectNameForTitle}">✏️</button>
            <button type="button" class="btn btn--sm btn--danger" data-action="delete" data-subject-id="${subject.id}" title="ลบวิชา ${subjectNameForTitle}">🗑️</button>
            <button type="button" class="btn btn--sm btn--primary" data-action="view" data-subject-id="${subject.id}" title="ดูรายละเอียดวิชา ${subjectNameForTitle}">👁️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updateSubjectPagination(totalItems, totalPages);

  const selectAllCheckbox = document.getElementById('select-all-subjects');
  if (selectAllCheckbox) {
    if (selectAllCheckbox.dataset.bound !== 'true') {
      selectAllCheckbox.addEventListener('change', handleSubjectSelectAll);
      selectAllCheckbox.dataset.bound = 'true';
    }
  }

  const bulkDeleteButton = document.getElementById('bulk-delete-subjects');
  if (bulkDeleteButton && bulkDeleteButton.dataset.bound !== 'true') {
    bulkDeleteButton.addEventListener('click', handleBulkDeleteSubjects);
    bulkDeleteButton.dataset.bound = 'true';
  }

  updateSubjectBulkActions();
}

function updateSubjectPagination(totalItems, totalPages) {
  const pageInfo = document.getElementById('page-info-subjects');
  if (pageInfo) {
    const displayPages = totalItems === 0 ? 0 : totalPages;
    const displayCurrent = totalItems === 0 ? 0 : adminState.subjectCurrentPage;
    pageInfo.textContent = `หน้า ${displayCurrent} จาก ${displayPages} (${totalItems} รายการ)`;
  }

  const prevButton = document.getElementById('prev-page-subjects');
  if (prevButton) {
    prevButton.disabled = adminState.subjectCurrentPage <= 1 || totalItems === 0;
  }

  const nextButton = document.getElementById('next-page-subjects');
  if (nextButton) {
    nextButton.disabled = totalItems === 0 || adminState.subjectCurrentPage >= (totalPages || 0);
  }
}

function getFilteredSubjects() {
  const subjects = Array.isArray(adminState.subjects) ? [...adminState.subjects] : [];
  const term = (adminState.subjectSearchTerm || '').trim().toLowerCase();

  if (!term) {
    return subjects;
  }

  return subjects.filter(subject => {
    const searchableText = getSubjectSearchableText(subject);
    return searchableText.includes(term);
  });
}

function getSubjectSearchableText(subject) {
  const classNames = getClassNamesFromIds(subject.class_ids && subject.class_ids.length ? subject.class_ids : [subject.class_id]);
  const parts = [
    subject.subject_name,
    subject.subject_code,
    subject.teacher_name,
    subject.class_name,
    classNames.join(' '),
    subject.special_requirements,
    getTeacherDisplayNameById(subject.teacher_id),
    ...classNames.map(name => name),
    getClassDisplayNameById(subject.class_id)
  ];

  return parts
    .map(part => (part || '').toString().toLowerCase())
    .join(' ');
}

async function handleSubjectTableClick(event) {
  const targetButton = event.target.closest('button[data-action]');
  if (!targetButton) return;

  const subjectId = parseInt(targetButton.dataset.subjectId || '', 10);
  if (!subjectId) return;

  const action = targetButton.dataset.action;

  if (action === 'view') {
    const subject = adminState.subjects.find(item => Number(item.id) === Number(subjectId));
    if (subject) {
      openSubjectViewModal(subject);
    }
    return;
  }

  if (action === 'edit') {
    const subject = adminState.subjects.find(item => Number(item.id) === Number(subjectId));
    if (subject) {
      openSubjectEditModal(subject);
    }
    return;
  }

  if (action === 'delete') {
    await deleteSubject(subjectId);
    return;
  }
}

async function deleteSubject(subjectId) {
  const subject = adminState.subjects.find(item => Number(item.id) === Number(subjectId));
  const subjectLabel = subject ? subject.subject_name : `#${subjectId}`;

  const confirmed = window.confirm(`ต้องการลบวิชา "${subjectLabel}" หรือไม่?`);
  if (!confirmed) {
    return;
  }

  try {
    const { year, semesterId } = getActiveAdminContext();

    if (!year || !semesterId) {
      alert('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    const result = await scheduleAPI.deleteSubject(year, semesterId, subjectId);

    if (result.success) {
      const deletedCount = result.data?.deleted ? Number(result.data.deleted) : 1;
      showSubjectsSuccess(`ลบวิชาเรียนเรียบร้อยแล้ว${deletedCount > 1 ? ` (${deletedCount} รายการ)` : ''}`);
      await loadSubjectsData();
      renderSubjectsTable();
      updateSubjectBulkActions();
    } else {
      const errorMessage = result.error || 'ไม่สามารถลบวิชาเรียนได้';
      showSubjectsError(errorMessage);
      alert(errorMessage);
    }
  } catch (error) {
    console.error('❌ Error deleting subject:', error);
    showSubjectsError('เกิดข้อผิดพลาดในการลบวิชาเรียน');
    alert('เกิดข้อผิดพลาดในการลบวิชาเรียน');
  }
}

function getTeacherDisplayNameById(teacherId) {
  const teacher = adminState.teachers.find(item => Number(item.id) === Number(teacherId));
  if (!teacher) {
    return '';
  }

  return formatTeacherName(teacher) || '';
}

function normalizeTeacherNameString(name) {
  if (typeof name !== 'string') return '';
  const cleaned = name.trim().replace(/\s{2,}/g, ' ');
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  if (parts.length <= 1) {
    return cleaned;
  }

  const [first, second, ...rest] = parts;
  const normalizedFirst = first.trim();
  const normalizedSecond = second.trim();
  const titleCandidates = new Set([
    'นาย', 'นาง', 'นางสาว', 'ครู', 'คุณ',
    'ดร.', 'ดร', 'ผศ.', 'รศ.', 'ศ.', 'อาจารย์',
    'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'dr', 'dr.'
  ]);

  const firstLower = normalizedFirst.toLowerCase();
  if (!titleCandidates.has(firstLower)) {
    return cleaned;
  }

  const mergedFirst = `${normalizedFirst}${normalizedSecond}`;
  return [mergedFirst, ...rest].join(' ');
}

function formatTeacherName(teacher) {
  if (!teacher) return '';

  const title = typeof teacher.title === 'string' ? teacher.title.trim() : '';
  const first = typeof teacher.f_name === 'string' ? teacher.f_name.trim() : '';
  const last = typeof teacher.l_name === 'string' ? teacher.l_name.trim() : '';

  const nameParts = [];

  if (title && first) {
    nameParts.push(`${title}${first}`);
  } else {
    if (title) nameParts.push(title);
    if (first) nameParts.push(first);
  }

  if (last) {
    nameParts.push(last);
  }

  if (nameParts.length) {
    return nameParts.join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  const fullName = typeof teacher.full_name === 'string' ? teacher.full_name.trim() : '';
  if (fullName) {
    const normalized = normalizeTeacherNameString(fullName);
    if (normalized) {
      return normalized;
    }
  }

  const simpleName = typeof teacher.name === 'string' ? teacher.name.trim() : '';
  if (simpleName) {
    const normalized = normalizeTeacherNameString(simpleName);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function getClassDisplayNameById(classId) {
  const cls = adminState.classes.find(item => Number(item.id) === Number(classId));
  if (!cls) {
    return `ห้อง #${classId}`;
  }

  if (cls.display_name) {
    return cls.display_name;
  }

  if (cls.class_name) {
    return cls.class_name;
  }

  const grade = cls.grade_level || '';
  const section = cls.section ? `/${cls.section}` : '';
  const label = `${grade}${section}`.trim();
  return label || `ห้อง #${classId}`;
}

function getRoomDisplayNameById(roomId) {
  const room = adminState.rooms.find(item => Number(item.id) === Number(roomId));
  if (!room) {
    return `ห้อง #${roomId}`;
  }

  return room.display_name || room.room_name || `ห้อง #${roomId}`;
}

function getActiveAdminContext() {
  const context = adminState.context || getContext();

  const year = context?.year
    || context?.currentYear
    || context?.academicYear?.year
    || context?.academic_year?.year
    || adminState.activeYear
    || null;

  const semesterId = context?.semester?.id
    || context?.currentSemester?.id
    || context?.semesterId
    || adminState.activeSemester?.id
    || null;

  return { year, semesterId };
}

// ------------------------ Schedule Prompt Generation ------------------------

function initSchedulePromptTools() {
  const button = document.getElementById('btn-generate-ai');

  if (!button) {
    console.warn('⚠️ Schedule prompt button not found in DOM');
    return;
  }

  if (!button.textContent || !button.textContent.trim()) {
    button.textContent = '🧠 Generate Prompt';
  }

  if (button.dataset.bound === 'true') {
    return;
  }

  button.addEventListener('click', handleGenerateSchedulePrompt);
  button.dataset.bound = 'true';
}

async function handleGenerateSchedulePrompt() {
  const button = document.getElementById('btn-generate-ai');
  if (!button) {
    return;
  }

  if (adminState.isGeneratingSchedulePrompt) {
    return;
  }

  const originalLabel = button.textContent;

  try {
    adminState.isGeneratingSchedulePrompt = true;
    button.disabled = true;
    button.textContent = '⏳ Preparing prompt...';

    const { year, semesterId } = getActiveAdminContext();
    const semesterName = adminState.activeSemester?.name
      || adminState.activeSemester?.semester_name
      || adminState.context?.semester?.name
      || adminState.context?.semester?.semester_name
      || null;

    if (!year) {
      alert('กรุณาเลือกปีการศึกษาปัจจุบันก่อนสร้าง Prompt');
      return;
    }

    if (!semesterId) {
      alert('กรุณาเลือกภาคเรียนที่ใช้งานอยู่ก่อนสร้าง Prompt');
      return;
    }

    await ensureSchedulePromptData(year, semesterId);

    const dataset = buildSchedulePromptDataset(year, semesterId, semesterName);

    if (!dataset.subjects || dataset.subjects.length === 0) {
      alert('ไม่พบรายวิชาสำหรับภาคเรียนนี้ กรุณาตรวจสอบข้อมูลก่อนค่ะ');
      return;
    }

    const promptText = buildSchedulePromptText(dataset);
    const downloaded = downloadPromptFile(promptText, year, semesterId);
    if (downloaded) {
      alert('สร้าง Prompt สำเร็จแล้ว! ตรวจสอบไฟล์ .txt ที่ดาวน์โหลดเพื่อใช้งานกับ AI');
    }
  } catch (error) {
    console.error('❌ Error generating schedule prompt:', error);
    alert('เกิดข้อผิดพลาดในการสร้าง Prompt กรุณาลองอีกครั้ง');
  } finally {
    adminState.isGeneratingSchedulePrompt = false;
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

async function ensureSchedulePromptData(year, semesterId) {
  try {
    if (typeof scheduleAPI.invalidateCacheByPattern === 'function') {
      scheduleAPI.invalidateCacheByPattern(`subjects_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`teachers_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`classes_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`rooms_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`periods_${year}_`);
    }
  } catch (cacheError) {
    console.warn('⚠️ Unable to invalidate schedule cache before prompt generation:', cacheError);
  }

  await loadTeachersData();
  await loadClassesData();
  await loadRoomsData();
  await loadPeriodsData();
  await loadSubjectsData();
}

function buildSchedulePromptDataset(year, semesterId, semesterName) {
  const scheduleTableName = `schedules_${year}`;
  const generatedAt = new Date().toISOString();

  const subjectsRaw = Array.isArray(adminState.subjectsRaw) ? adminState.subjectsRaw : [];

  const subjects = subjectsRaw
    .filter(subject => Number(subject.semester_id) === Number(semesterId))
    .map(subject => {
      const classIds = parseNumericArray(subject.class_ids, subject.class_id);
      const classNames = classIds.map(id => getClassDisplayNameById(id)).filter(Boolean);
      const teacherName = getTeacherDisplayNameById(subject.teacher_id)
        || normalizeTeacherNameString(subject.teacher_name)
        || null;

      const defaultRoomId = subject.default_room_id != null ? Number(subject.default_room_id) : null;

      return {
        id: subject.id != null ? Number(subject.id) : null,
        group_key: subject.group_key || null,
        subject_name: subject.subject_name || '',
        subject_code: subject.subject_code || null,
        subject_group: subject.subject_group || null,
        teacher_id: subject.teacher_id != null ? Number(subject.teacher_id) : null,
        teacher_name: teacherName,
        class_ids: classIds,
        classes: classNames,
        periods_per_week: subject.periods_per_week != null ? Number(subject.periods_per_week) : null,
        default_room_id: defaultRoomId,
        default_room_name: subject.room_name || (defaultRoomId ? getRoomDisplayNameById(defaultRoomId) : null),
        special_requirements: subject.special_requirements || null,
        notes: subject.notes || null
      };
    })
    .sort((a, b) => {
      const teacherCompare = (a.teacher_name || '').localeCompare(b.teacher_name || '', 'th');
      if (teacherCompare !== 0) return teacherCompare;
      return (a.subject_name || '').localeCompare(b.subject_name || '', 'th');
    });

  const teacherIdsUsed = new Set(subjects
    .map(subject => subject.teacher_id)
    .filter(id => Number.isFinite(id)));

  const classIdsUsed = new Set(subjects
    .flatMap(subject => subject.class_ids)
    .filter(id => Number.isFinite(id)));

  const roomIdsUsed = new Set(subjects
    .map(subject => subject.default_room_id)
    .filter(id => Number.isFinite(id)));

  const periodEntries = (Array.isArray(adminState.periods) ? adminState.periods : [])
    .filter(period => Number(period.semester_id) === Number(semesterId))
    .map(period => ({
      period_no: Number(period.period_no),
      period_name: period.period_name || null,
      start_time: period.start_time || null,
      end_time: period.end_time || null
    }))
    .filter(entry => Number.isFinite(entry.period_no))
    .sort((a, b) => a.period_no - b.period_no);

  const teacherEntries = (Array.isArray(adminState.teachers) ? adminState.teachers : [])
    .filter(teacher => teacherIdsUsed.size === 0 || teacherIdsUsed.has(Number(teacher.id)))
    .map(teacher => {
      const formattedName = formatTeacherName(teacher)
        || normalizeTeacherNameString(teacher.full_name)
        || getFullName(teacher);

      return {
        id: Number(teacher.id),
        name: formattedName,
        title: teacher.title || null,
        subject_group: teacher.subject_group || null,
        email: teacher.email || null,
        phone: teacher.phone || null
      };
    })
    .filter(entry => Number.isFinite(entry.id));

  const missingTeacherIds = [...teacherIdsUsed].filter(id => !teacherEntries.some(entry => entry.id === id));
  if (missingTeacherIds.length > 0) {
    missingTeacherIds.forEach(id => {
      const fallbackSubject = subjects.find(subject => subject.teacher_id === id);
      teacherEntries.push({
        id,
        name: fallbackSubject?.teacher_name || `ครู #${id}`,
        title: null,
        subject_group: fallbackSubject?.subject_group || null,
        email: null,
        phone: null
      });
    });
  }

  teacherEntries.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));

  const classEntries = (Array.isArray(adminState.classes) ? adminState.classes : [])
    .filter(cls => classIdsUsed.size === 0 || classIdsUsed.has(Number(cls.id)))
    .map(cls => {
      const displayName = cls.display_name || cls.class_name || getClassDisplayNameById(cls.id);
      return {
        id: Number(cls.id),
        name: displayName,
        class_name: cls.class_name || null,
        grade_level: cls.grade_level ?? null,
        section: cls.section ?? null,
        homeroom_teacher_id: cls.homeroom_teacher_id != null ? Number(cls.homeroom_teacher_id) : null
        // student_count: cls.student_count != null ? Number(cls.student_count) : null
      };
    })
    .filter(entry => Number.isFinite(entry.id))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));

  const roomEntries = (Array.isArray(adminState.rooms) ? adminState.rooms : [])
    .map(room => ({
      id: Number(room.id),
      name: room.display_name || room.room_name || `ห้อง ${room.id}`,
      room_type: room.room_type || null,
      capacity: room.capacity != null ? Number(room.capacity) : null,
      attributes: room.attributes || room.special_equipment || null
    }))
    .filter(entry => Number.isFinite(entry.id))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));

  const missingRoomIds = [...roomIdsUsed].filter(id => !roomEntries.some(entry => entry.id === id));
  if (missingRoomIds.length > 0) {
    missingRoomIds.forEach(id => {
      roomEntries.push({
        id,
        name: getRoomDisplayNameById(id),
        room_type: null,
        capacity: null,
        attributes: null
      });
    });
    roomEntries.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
  }

  const dataset = {
    context: {
      generated_at: generatedAt,
      year,
      semester_id: semesterId,
      semester_name: semesterName,
      schedule_table: scheduleTableName,
      subject_table: `subjects_${year}`,
      day_of_week_definition: '1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday',
      "required_insert_columns": [
        "semester_id",
        "subject_id",
        "class_id",
        "day_of_week",
        "period_no",
        "room_id"
      ],
      constraints: [
        'Each subject must be scheduled exactly periods_per_week times within the week.',
        'A teacher cannot teach more than one subject in the same day_of_week & period_no slot.',
        'A class cannot have more than one subject in the same day_of_week & period_no slot.',
        'Prefer using default_room_id / default_room_name when available.',
        'Respect any special_requirements, such as consecutive periods or forbidden slots.'
      ],
      summary: {
        subject_count: subjects.length,
        teacher_count: teacherEntries.length,
        class_count: classEntries.length,
        room_count: roomEntries.length,
        period_count: periodEntries.length
      }
    },
    subjects,
    teachers: teacherEntries,
    classes: classEntries,
    rooms: roomEntries,
    periods: periodEntries
  };

  return dataset;
}

function buildSchedulePromptText(dataset) {
  const { context } = dataset;

  const lines = [
    '# School Schedule AI Prompt',
    '',
    'ใช้ข้อมูล JSON ด้านล่างเพื่อจัดตารางสอนทั้งสัปดาห์ให้ครบถ้วนตามข้อกำหนด',
    '',
    '## Context',
    `- Academic Year: ${context.year}`,
    `- Semester ID: ${context.semester_id}`,
    context.semester_name ? `- Semester Name: ${context.semester_name}` : null,
    `- Target Table: ${context.schedule_table}`,
    `- Day of Week Mapping: ${context.day_of_week_definition}`,
    '',
    '## Instructions for the AI',
    '1. Constraint หลัก:',
    '   - ห้ามครู 1 คน สอนเกิน 1 ชั้นเรียนในเวลาเดียวกัน (teacher conflict)',
    '   - ห้ามห้องเรียน 1 ห้อง ถูกใช้เกิน 1 ชั้นเรียนในเวลาเดียวกัน (room conflict)',
    '   - ห้ามชั้นเรียน 1 ห้อง มีมากกว่า 1 วิชาในเวลาเดียวกัน (class conflict)',
    '   - ยกเว้น: “ลูกเสือ ม.ต้น (SCOUT_MS)” และ “กิจกรรมพัฒนาผู้เรียน ม.ปลาย (DEV_HS)” ที่อนุญาตให้เรียนรวม/ซ้อนกันได้ตามกติกาด้านล่าง',
    '',
    '2. เติมตารางสอนให้ครบตามค่า periods_per_week ของแต่ละวิชาใน dataset',
    '',
    '3. กติกาพิเศษสำหรับกิจกรรม:',
    '   - กิจกรรมพัฒนาผู้เรียน ม.ปลาย (DEV_HS):',
    '     • 1 ครูต่อ 1 ห้องเรียน ม.ปลาย (9 ห้อง: ม.4/1–ม.6/3)',
    '     • ต้องจัดลง “วันพุธ คาบสุดท้าย” เท่านั้น',
    '     • ใช้ห้องประจำชั้น (HR) ของห้องนั้นเสมอ',
    '   - ลูกเสือ ม.ต้น (SCOUT_MS):',
    '     • ม.1 ทั้งหมดเรียนพร้อมกัน, ม.2 ทั้งหมดเรียนพร้อมกัน, ม.3 ทั้งหมดเรียนพร้อมกัน',
    '     • แต่ละระดับชั้นต้องจัดที่ “วันพุธ คาบสุดท้าย”',
    '     • อนุญาตให้มี “ครูหลายคน” สอนพร้อมกันในเวลาเดียวกัน',
    '     • แถวหลักของลูกเสือใช้ “สนามลูกเสือ” (room_id=32)',
    '     • แถวเสริมของครูเพิ่ม ให้ใช้ room_id = NULL (เพื่อเลี่ยง UNIQUE)',
    '',
    '4. เคารพเงื่อนไขในฟิลด์ special_requirements และใช้ default_room_id หากมี',
    '',
    '5. ห้องเรียน:',
    '   - ถ้า room_id = NULL (ในวิชาปกติ) ให้จัดลงห้องประจำชั้น (HR) ของ class_id นั้น ๆ',
    '   - ถ้าไม่พบ HR จริง ให้คง room_id = NULL',
    '',
    '6. วัน–เวลา:',
    '   - ใช้เฉพาะวันจันทร์–พฤหัส (day_of_week ∈ {1,2,3,4})',
    '   - วันศุกร์ (day_of_week=5) = Playday ห้ามมีคาบเรียน',
    '   - ห้ามมีเรียนวันเสาร์ (6) และอาทิตย์ (7)',
    '   - ห้ามใช้คาบที่เป็นพัก/กลางวัน (period_name มีคำว่า “พัก/กลางวัน/Lunch/Break”)',
    '   - ต้องใช้เฉพาะ period_no ที่อยู่ใน periods ของ dataset',
    '',
    '7. ตรวจสอบซ้ำ:',
    '   - ห้ามซ้ำ (class_id, day_of_week, period_no)',
    '   - ห้ามซ้ำ (room_id, day_of_week, period_no) ยกเว้นลูกเสือ/กิจกรรม',
    '   - ครู 1 คน ห้ามซ้ำ (teacher_id, day_of_week, period_no) ยกเว้นลูกเสือ',
    '',
    '8. Summary Schema Rule:',
    '   - 1 ห้องเรียน (room_id) ในเวลาหนึ่ง สอนได้แค่ 1 ชั้นเรียน (ยกเว้นลูกเสือ/กิจกรรมตามข้อ 3)',
    '',
    '9. ถ้า periods_per_week ของ “กิจกรรม” มากกว่า 1 ให้ใช้แค่ 1 คาบ (Wed-last)',
    '',
    '10. ถ้าวิชาต่างกันแต่เป็นชั้นเดียวกัน ต้องใช้ห้องต่างกันหรือเวลาต่างกัน',
    '',
    '## Dataset (คัดลอกไปวางใน Prompt ได้เลย)',
    '```json',
    JSON.stringify(dataset, null, 2),
    '```',
    '',
    '## Output Format Example',
    '11. Output: ต้องตอบกลับเป็น SQL คำสั่ง INSERT เท่านั้น',
    `   INSERT INTO ${context.schedule_table} (semester_id, subject_id, class_id, day_of_week, period_no, room_id)`,
    `   VALUES (${context.semester_id}, 366, 11, 1, 1, 11), (${context.semester_id}, 168, 17, 1, 2, 17), ...;`,
    '   - 1 แถวต่อ 1 คาบเรียน',
    ''
  ];

  return lines.filter(Boolean).join('\n');
}


function downloadPromptFile(content, year, semesterId) {
  if (!content) {
    return false;
  }

  const filename = `schedule_prompt_${year}_semester-${semesterId}.txt`;

  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const urlFactory = window.URL || window.webkitURL;
    const url = urlFactory.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);

    requestAnimationFrame(() => {
      try {
        link.click();
      } finally {
        document.body.removeChild(link);
        urlFactory.revokeObjectURL(url);
      }
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Automatic download failed, falling back to new window.', error);
    const encoded = encodeURIComponent(content);
    const fallbackWindow = window.open(`data:text/plain;charset=utf-8,${encoded}`, '_blank');
    if (!fallbackWindow) {
      try {
        navigator.clipboard?.writeText(content);
        alert('ไม่สามารถดาวน์โหลดไฟล์ได้ ระบบได้คัดลอก Prompt ไว้ในคลิปบอร์ดแล้ว');
        return false;
      } catch (_) {
        alert('ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาคัดลอก Prompt ด้วยตนเอง:\n\n' + content.substring(0, 5000));
        return false;
      }
    } else {
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้อัตโนมัติ จึงเปิด Prompt ในแท็บใหม่แทน');
      return false;
    }
  }
}

function parseNumericArray(arrayLike, fallback) {
  if (Array.isArray(arrayLike)) {
    return arrayLike
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));
  }

  if (typeof arrayLike === 'string') {
    const trimmed = arrayLike.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map(value => Number(value))
            .filter(value => Number.isFinite(value));
        }
      } catch (_) {
        // ignore JSON parse error, fall back to comma split
      }
    }

    if (trimmed.length > 0) {
      return trimmed
        .split(',')
        .map(value => Number(value.trim()))
        .filter(value => Number.isFinite(value));
    }
  }

  if (fallback != null) {
    const num = Number(fallback);
    if (Number.isFinite(num)) {
      return [num];
    }
  }

  return [];
}

// ------------------------ Period Management ------------------------

async function initPeriodManagement() {
  console.log('🔧 Initializing period management...');

  await new Promise(resolve => setTimeout(resolve, 200));

  const form = document.getElementById('period-form');
  const tableBody = document.getElementById('periods-table-body');

  if (!form || !tableBody) {
    console.warn('⚠️ Period management elements not found. Skipping initialization.');
    return;
  }

  bindPeriodFormEvents();
  bindPeriodControls();
  bindPeriodTableEvents();

  await loadPeriodsData();
  renderPeriodsTable();

  console.log('✅ Period management initialized successfully');
}

async function loadPeriodsData() {
  try {
    adminState.periodsLoading = true;
    adminState.periodsError = null;

    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      console.warn('⚠️ Missing year or semester context for loading periods');
      adminState.periods = [];
      adminState.periodsError = 'ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่';
      return;
    }

    console.log(`🕒 Loading periods for year ${year}, semester ${semesterId}...`);
    const result = await scheduleAPI.getPeriods(year, semesterId);

    if (result.success && Array.isArray(result.data)) {
      adminState.periods = result.data
        .map(item => ({
          ...item,
          id: item.id ?? item.period_id ?? item.periodId ?? null,
          period_no: Number(item.period_no ?? item.period ?? item.period_number ?? 0)
        }))
        .sort((a, b) => (a.period_no || 0) - (b.period_no || 0));
      adminState.periodsCurrentPage = 1;
      console.log(`✅ Loaded ${adminState.periods.length} periods for year ${year}`);
    } else {
      adminState.periods = [];
      adminState.periodsError = result.error || 'ไม่สามารถโหลดข้อมูลคาบเรียนได้';
      showPeriodsError(adminState.periodsError);
    }
  } catch (error) {
    adminState.periods = [];
    adminState.periodsError = 'เกิดข้อผิดพลาดในการโหลดข้อมูลคาบเรียน';
    console.error('❌ Error loading periods:', error);
    showPeriodsError(adminState.periodsError);
  } finally {
    adminState.periodsLoading = false;
  }
}

function showPeriodsError(message) {
  console.error('🚨 Period Error:', message);
}

function showPeriodsSuccess(message) {
  console.log('✅ Period Success:', message);
}

async function addNewPeriod(periodData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showPeriodsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return false;
    }

    console.log('📝 Creating new period...', periodData);
    const result = await scheduleAPI.createPeriod(year, semesterId, periodData);

    if (result.success) {
      showPeriodsSuccess('เพิ่มคาบเรียนใหม่เรียบร้อยแล้ว');
      await loadPeriodsData();
      renderPeriodsTable();
      return true;
    }

    showPeriodsError(result.error || 'ไม่สามารถเพิ่มคาบเรียนได้');
    return false;
  } catch (error) {
    console.error('❌ Error creating period:', error);
    showPeriodsError('เกิดข้อผิดพลาดในการเพิ่มคาบเรียน');
    return false;
  }
}

async function updatePeriod(periodId, periodData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showPeriodsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return false;
    }

    console.log('🛠️ Updating period...', periodId, periodData);
    const result = await scheduleAPI.updatePeriod(year, semesterId, periodId, periodData);

    if (result.success) {
      showPeriodsSuccess('อัปเดตคาบเรียนเรียบร้อยแล้ว');
      adminState.editingPeriod = null;
      await loadPeriodsData();
      renderPeriodsTable();
      return true;
    }

    showPeriodsError(result.error || 'ไม่สามารถอัปเดตคาบเรียนได้');
    return false;
  } catch (error) {
    console.error('❌ Error updating period:', error);
    showPeriodsError('เกิดข้อผิดพลาดในการอัปเดตคาบเรียน');
    return false;
  }
}

async function deletePeriod(periodId) {
  if (!window.confirm('ต้องการลบคาบเรียนนี้หรือไม่?')) {
    return false;
  }

  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showPeriodsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return false;
    }

    console.log('🗑️ Deleting period...', periodId);
    const result = await scheduleAPI.deletePeriod(year, semesterId, periodId);

    if (result.success) {
      showPeriodsSuccess('ลบคาบเรียนเรียบร้อยแล้ว');
      if (adminState.editingPeriod && adminState.editingPeriod.id === periodId) {
        adminState.editingPeriod = null;
        clearPeriodForm();
      }
      await loadPeriodsData();
      renderPeriodsTable();
      return true;
    }

    showPeriodsError(result.error || 'ไม่สามารถลบคาบเรียนได้');
    return false;
  } catch (error) {
    console.error('❌ Error deleting period:', error);
    showPeriodsError('เกิดข้อผิดพลาดในการลบคาบเรียน');
    return false;
  }
}

function bindPeriodFormEvents() {
  const form = document.getElementById('period-form');
  if (form && form.dataset.bound !== 'true') {
    form.addEventListener('submit', handlePeriodSubmit);
    form.dataset.bound = 'true';
  }

  const clearButton = document.getElementById('clear-period-form');
  if (clearButton && clearButton.dataset.bound !== 'true') {
    clearButton.addEventListener('click', () => {
      clearPeriodForm();
      clearButton.blur();
    });
    clearButton.dataset.bound = 'true';
  }
}

async function handlePeriodSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton ? submitButton.textContent : null;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = adminState.editingPeriod ? 'กำลังอัปเดต...' : 'กำลังบันทึก...';
  }

  try {
    const formData = new FormData(form);
    const periodNo = Number(formData.get('period_no'));
    const periodName = String(formData.get('period_name') || '').trim();
    const startTime = String(formData.get('start_time') || '').trim();
    const endTime = String(formData.get('end_time') || '').trim();

    if (!Number.isInteger(periodNo) || periodNo <= 0) {
      showPeriodsError('ลำดับคาบต้องเป็นจำนวนเต็มบวก');
      return;
    }

    if (!periodName) {
      showPeriodsError('กรุณากรอกชื่อคาบ');
      return;
    }

    if (!startTime || !endTime) {
      showPeriodsError('กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด');
      return;
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      showPeriodsError('รูปแบบเวลาไม่ถูกต้อง');
      return;
    }

    if (endMinutes <= startMinutes) {
      showPeriodsError('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม');
      return;
    }

    const payload = {
      period_no: periodNo,
      period_name: periodName,
      start_time: normalizeTimeValue(startTime),
      end_time: normalizeTimeValue(endTime)
    };

    let success = false;
    if (adminState.editingPeriod) {
      success = await updatePeriod(adminState.editingPeriod.id, payload);
    } else {
      success = await addNewPeriod(payload);
    }

    if (success) {
      clearPeriodForm();
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText || '💾 บันทึก';
    }
  }
}

function clearPeriodForm() {
  const form = document.getElementById('period-form');
  if (form) {
    form.reset();
    adminState.editingPeriod = null;

    const header = form.closest('.admin-form-section')?.querySelector('h3');
    if (header) {
      header.textContent = '📝 เพิ่มคาบเรียนใหม่';
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = '💾 บันทึก';
    }
  }
}

function bindPeriodControls() {
  const searchInput = document.getElementById('period-search');
  if (searchInput && searchInput.dataset.bound !== 'true') {
    searchInput.addEventListener('input', (e) => {
      adminState.periodSearchTerm = (e.target.value || '').toString().trim().toLowerCase();
      adminState.periodsCurrentPage = 1;
      renderPeriodsTable();
    });
    searchInput.dataset.bound = 'true';
  }

  const refreshButton = document.getElementById('refresh-periods');
  if (refreshButton && refreshButton.dataset.bound !== 'true') {
    refreshButton.addEventListener('click', async () => {
      await loadPeriodsData();
      renderPeriodsTable();
    });
    refreshButton.dataset.bound = 'true';
  }

  const perPageSelect = document.getElementById('periods-per-page');
  if (perPageSelect && perPageSelect.dataset.bound !== 'true') {
    perPageSelect.addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      adminState.periodsPerPage = Number.isFinite(value) && value > 0 ? value : 10;
      adminState.periodsCurrentPage = 1;
      renderPeriodsTable();
    });
    perPageSelect.dataset.bound = 'true';
    adminState.periodsPerPage = Number.parseInt(perPageSelect.value, 10) || 10;
  }

  const prevButton = document.getElementById('prev-period-page');
  if (prevButton && prevButton.dataset.bound !== 'true') {
    prevButton.addEventListener('click', () => {
      if (adminState.periodsCurrentPage > 1) {
        adminState.periodsCurrentPage -= 1;
        renderPeriodsTable();
      }
    });
    prevButton.dataset.bound = 'true';
  }

  const nextButton = document.getElementById('next-period-page');
  if (nextButton && nextButton.dataset.bound !== 'true') {
    nextButton.addEventListener('click', () => {
      const periods = getFilteredPeriods();
      const perPage = adminState.periodsPerPage || 10;
      const totalPages = Math.max(1, Math.ceil(periods.length / perPage));
      if (adminState.periodsCurrentPage < totalPages) {
        adminState.periodsCurrentPage += 1;
        renderPeriodsTable();
      }
    });
    nextButton.dataset.bound = 'true';
  }
}

function bindPeriodTableEvents() {
  const table = document.getElementById('periods-table');
  if (!table || table.dataset.bound === 'true') {
    return;
  }

  table.addEventListener('click', handlePeriodTableClick);
  table.dataset.bound = 'true';
}

async function handlePeriodTableClick(event) {
  const target = event.target.closest('button[data-action]');
  if (!target) return;

  const periodId = parseInt(target.dataset.periodId || '', 10);
  if (!periodId || Number.isNaN(periodId)) {
    return;
  }

  const action = target.dataset.action;
  if (action === 'edit') {
    enterPeriodEditMode(periodId);
  } else if (action === 'delete') {
    await deletePeriod(periodId);
  }
}

function enterPeriodEditMode(periodId) {
  const targetPeriod = adminState.periods.find(item => item.id === periodId);
  if (!targetPeriod) {
    showPeriodsError('ไม่พบข้อมูลคาบเรียนที่ต้องการแก้ไข');
    return;
  }

  const form = document.getElementById('period-form');
  if (!form) return;

  const numberInput = form.querySelector('#period-no');
  const nameInput = form.querySelector('#period-name');
  const startInput = form.querySelector('#period-start-time');
  const endInput = form.querySelector('#period-end-time');

  if (numberInput) numberInput.value = targetPeriod.period_no ?? targetPeriod.period ?? '';
  if (nameInput) nameInput.value = targetPeriod.period_name || targetPeriod.name || '';
  if (startInput) startInput.value = normalizeTimeValue(targetPeriod.start_time || targetPeriod.startTime || '');
  if (endInput) endInput.value = normalizeTimeValue(targetPeriod.end_time || targetPeriod.endTime || '');

  const header = form.closest('.admin-form-section')?.querySelector('h3');
  if (header) {
    header.textContent = '✏️ แก้ไขคาบเรียน';
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = '💾 อัปเดต';
  }

  adminState.editingPeriod = targetPeriod;
}

function renderPeriodsTable() {
  const tableBody = document.getElementById('periods-table-body');
  if (!tableBody) return;

  if (adminState.periodsLoading) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 2rem; text-align: center; color: #666;">
          ⏳ กำลังโหลดข้อมูลคาบเรียน...
        </td>
      </tr>
    `;
    updatePeriodPagination(0, 0);
    return;
  }

  const filtered = getFilteredPeriods();
  const perPage = adminState.periodsPerPage || 10;
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  if (adminState.periodsCurrentPage > totalPages) {
    adminState.periodsCurrentPage = totalPages;
  }

  const startIndex = (adminState.periodsCurrentPage - 1) * perPage;
  const pageItems = filtered.slice(startIndex, startIndex + perPage);

  if (pageItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 2rem; text-align: center; color: #666;">
          📋 ยังไม่มีข้อมูลคาบเรียนสำหรับภาคเรียนนี้
        </td>
      </tr>
    `;
    updatePeriodPagination(totalItems, totalPages);
    return;
  }

  tableBody.innerHTML = pageItems.map(period => {
    const periodId = period.id ?? period.period_id ?? period.periodId ?? period.period_no;
    const periodNo = period.period_no ?? period.period ?? '-';
    const name = period.period_name || period.name || '-';
    const start = formatPeriodTime(period.start_time || period.startTime);
    const end = formatPeriodTime(period.end_time || period.endTime);
    const duration = formatDuration(period.start_time || period.startTime, period.end_time || period.endTime);

    return `
      <tr class="period-row" data-period-id="${periodId}">
        <td class="col-checkbox">
          <input type="checkbox" class="period-row-checkbox" data-period-id="${periodId}" aria-label="เลือกคาบเรียนที่ ${periodNo}">
        </td>
        <td class="col-period-no">${periodNo}</td>
        <td class="col-period-name">${name}</td>
        <td class="col-start-time">${start}</td>
        <td class="col-end-time">${end}</td>
        <td class="col-duration">${duration}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button type="button" class="btn btn--sm btn--outline" data-action="edit" data-period-id="${periodId}" title="แก้ไขคาบเรียน ${name}">✏️</button>
            <button type="button" class="btn btn--sm btn--danger" data-action="delete" data-period-id="${periodId}" title="ลบคาบเรียน ${name}">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePeriodPagination(totalItems, totalPages);
}

function updatePeriodPagination(totalItems, totalPages) {
  const pageInfo = document.getElementById('period-page-info');
  if (pageInfo) {
    const displayTotalPages = totalItems === 0 ? 0 : totalPages;
    const displayCurrent = totalItems === 0 ? 0 : adminState.periodsCurrentPage;
    pageInfo.textContent = `หน้า ${displayCurrent} จาก ${displayTotalPages} (${totalItems} รายการ)`;
  }

  const prevButton = document.getElementById('prev-period-page');
  if (prevButton) {
    prevButton.disabled = adminState.periodsCurrentPage <= 1 || totalItems === 0;
  }

  const nextButton = document.getElementById('next-period-page');
  if (nextButton) {
    nextButton.disabled = totalItems === 0 || adminState.periodsCurrentPage >= totalPages;
  }
}

function getFilteredPeriods() {
  const list = Array.isArray(adminState.periods) ? [...adminState.periods] : [];
  const term = (adminState.periodSearchTerm || '').trim().toLowerCase();

  if (!term) {
    return list;
  }

  return list.filter(period => {
    const searchable = [
      period.period_no,
      period.period_name,
      period.start_time,
      period.end_time
    ]
      .map(value => (value || '').toString().toLowerCase())
      .join(' ');

    return searchable.includes(term);
  });
}

function parseTimeToMinutes(value) {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function normalizeTimeValue(value) {
  if (!value) return '';

  const parts = value.split(':');
  const hours = parts[0] ? parts[0].padStart(2, '0') : '00';
  const minutes = parts[1] ? parts[1].padStart(2, '0') : '00';

  return `${hours}:${minutes}`;
}

function formatPeriodTime(value) {
  if (!value) return '-';
  return normalizeTimeValue(value);
}

function formatDuration(start, end) {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return '-';
  }

  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} ชม. ${minutes} นาที`;
  }

  if (hours > 0) {
    return `${hours} ชม.`;
  }

  return `${minutes} นาที`;
}

function renderClassesTable() {
  const tableBody = document.getElementById('classes-table-body');
  if (!tableBody) return;

  if (adminState.classesLoading) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 2rem; text-align: center; color: #666;">
          ⏳ กำลังโหลดข้อมูลชั้นเรียน...
        </td>
      </tr>
    `;
    return;
  }

  if (!adminState.classes || adminState.classes.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 2rem; text-align: center; color: #666;">
          📋 ยังไม่มีข้อมูลชั้นเรียนสำหรับภาคเรียนนี้
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = adminState.classes.map(cls => {
    const createdAt = cls.created_at ? new Date(cls.created_at).toLocaleString('th-TH') : '-';
    const className = cls.display_name || `${cls.grade_level}/${cls.section}`;
    return `
      <tr class="class-row" data-class-id="${cls.id}">
        <td class="col-checkbox">
          <input type="checkbox" class="class-row-checkbox" data-class-id="${cls.id}" aria-label="เลือกชั้นเรียน ${className}">
        </td>
        <td class="col-id">${cls.id ?? '-'}</td>
        <td class="col-class-name">${className}</td>
        <td class="col-created">${createdAt}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button type="button" class="btn btn--sm btn--outline" data-action="edit" data-class-id="${cls.id}" title="แก้ไขชั้นเรียน ${className}">✏️</button>
            <button type="button" class="btn btn--sm btn--danger" data-action="delete" data-class-id="${cls.id}" title="ลบชั้นเรียน ${className}">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Ensure action buttons respond even if table-level handler missed
  const actionButtons = tableBody.querySelectorAll('button[data-action]');
  actionButtons.forEach(button => {
    if (button.dataset.bound === 'true') {
      return;
    }
    button.addEventListener('click', handleClassTableClick);
    button.dataset.bound = 'true';
  });
}

function bindClassTableEvents() {
  const table = document.getElementById('classes-table');
  if (!table || table.dataset.bound === 'true') {
    return;
  }

  table.addEventListener('click', handleClassTableClick);
  table.dataset.bound = 'true';
}

async function handleClassTableClick(event) {
  const target = event.target.closest('button[data-action]');
  if (!target) return;

  const classId = parseInt(target.dataset.classId || '', 10);
  if (!classId || Number.isNaN(classId)) return;

  const action = target.dataset.action;
  if (action === 'edit') {
    enterClassEditMode(classId);
  } else if (action === 'delete') {
    await deleteClass(classId);
  }
}

function enterClassEditMode(classId) {
  const targetClass = adminState.classes.find(cls => cls.id === classId);
  if (!targetClass) {
    showClassesError('ไม่พบข้อมูลชั้นเรียนที่ต้องการแก้ไข');
    return;
  }

  const form = document.getElementById('class-form');
  if (!form) return;

  const gradeSelect = form.querySelector('#class-grade');
  const sectionInput = form.querySelector('#class-section');

  if (gradeSelect) {
    gradeSelect.value = targetClass.grade_level || '';
  }
  if (sectionInput) {
    sectionInput.value = targetClass.section ?? '';
  }

  adminState.editingClass = targetClass;

  const header = form.closest('.admin-form-section')?.querySelector('h3');
  if (header) {
    header.textContent = `✏️ แก้ไขชั้นเรียน ${targetClass.display_name || targetClass.class_name || ''}`.trim();
  }

  sectionInput?.focus();
}

async function updateClass(classId, classData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showClassesError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log('🛠️ Updating class...', classId, classData);
    const result = await scheduleAPI.updateClass(year, semesterId, classId, classData);

    if (result.success) {
      showClassesSuccess('อัปเดตชั้นเรียนเรียบร้อยแล้ว');
      adminState.editingClass = null;
      await loadClassesData();
      renderClassesTable();
    } else {
      showClassesError(result.error || 'ไม่สามารถอัปเดตชั้นเรียนได้');
    }
  } catch (error) {
    console.error('❌ Error updating class:', error);
    showClassesError('เกิดข้อผิดพลาดในการอัปเดตชั้นเรียน');
  }
}

async function deleteClass(classId) {
  if (!window.confirm('ต้องการลบชั้นเรียนนี้หรือไม่?')) {
    return;
  }

  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showClassesError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log('🗑️ Deleting class...', classId);
    const result = await scheduleAPI.deleteClass(year, semesterId, classId);

    if (result.success) {
      showClassesSuccess('ลบชั้นเรียนเรียบร้อยแล้ว');
      if (adminState.editingClass && adminState.editingClass.id === classId) {
        adminState.editingClass = null;
        clearClassForm();
      }
      await loadClassesData();
      renderClassesTable();
    } else {
      showClassesError(result.error || 'ไม่สามารถลบชั้นเรียนได้');
    }
  } catch (error) {
    console.error('❌ Error deleting class:', error);
    showClassesError('เกิดข้อผิดพลาดในการลบชั้นเรียน');
  }
}

// NOTE: Continuing with remaining functions in next part...
// This includes: table events, rendering, helpers, etc.

function normalizeContext(ctx) {
  if (!ctx) return null;
  if (ctx.currentYear && ctx.currentSemester) {
    return { year: ctx.currentYear, semesterId: ctx.currentSemester.id };
  }
  if (ctx.year && ctx.semesterId) return ctx;
  return null;
}

function ensureUserActionsInSubnav() {
  const nav = document.querySelector('#page-admin nav.sub-navigation');
  if (!nav) return;
  if (nav.querySelector('.admin-subnav')) return;
  const ul = nav.querySelector('ul.sub-nav-tabs');
  if (!ul) return;
  const wrap = document.createElement('div');
  wrap.className = 'admin-subnav';
  ul.parentNode.insertBefore(wrap, ul);
  wrap.appendChild(ul);
  const actions = document.createElement('div');
  actions.className = 'admin-user-actions hidden';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'admin-username';
  nameSpan.id = 'admin-username-display';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn--outline btn-logout-admin';
  btn.textContent = 'ออกจากระบบ';
  actions.appendChild(nameSpan);
  actions.appendChild(btn);
  wrap.appendChild(actions);
}

function adjustAuthInputWidth() {
  try {
    const form = document.querySelector('#page-admin .auth-form');
    if (!form) return;

    form.style.margin = '0 auto';
    form.style.textAlign = 'center';
    form.style.maxWidth = '350px';

    const formElement = form.querySelector('form');
    if (formElement) {
      formElement.style.display = 'flex';
      formElement.style.flexDirection = 'column';
      formElement.style.alignItems = 'center';
      formElement.style.gap = '0.75rem';
    }

    const labels = form.querySelectorAll('label');
    labels.forEach((label) => {
      const input = label.nextElementSibling;
      if (input && input.tagName === 'INPUT') {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.style.justifyContent = 'center';

        label.parentNode.insertBefore(wrapper, label);
        wrapper.appendChild(label);
        wrapper.appendChild(input);

        input.style.padding = '0.4rem 0.55rem';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '6px';
      }
    });

    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.style.margin = '0.5rem auto 0';
      button.style.padding = '0.55rem 1.5rem';
    }
  } catch (e) { }
}

/**
 * Admin Page Part 2 - Table Events, Rendering, Navigation
 * This file contains the remaining functions for admin.js
 */

// Copy these functions back to admin.js to complete it

// ------------------------ Table Events ------------------------

function bindTeacherTableEvents() {
  const tableBody = document.getElementById('teachers-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', handleTableAction);
  }

  const tableHeader = document.getElementById('teachers-table')?.querySelector('thead');
  if (tableHeader) {
    tableHeader.addEventListener('click', handleColumnSort);
  }

  const selectAllCheckbox = document.getElementById('select-all-teachers');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAll);
  }

  const deleteSelectedBtn = document.getElementById('delete-selected-teachers');
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
  }

  const exportBtn = document.getElementById('export-teachers');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportTeachers);
  }

  const shortcutsBtn = document.getElementById('show-shortcuts');
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', showShortcutsModal);
  }

  initResizableColumns();
  initKeyboardNavigation();
}

function bindTeacherSearchEvents() {
  const searchInput = document.getElementById('teacher-search');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  const refreshBtn = document.getElementById('refresh-teachers');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefresh);
  }

  const itemsPerPageSelect = document.getElementById('teachers-per-page');
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', handleItemsPerPageChange);
  }
}

function bindTeacherPaginationEvents() {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => changePage(adminState.currentPage - 1));
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => changePage(adminState.currentPage + 1));
  }
}

// ------------------------ Table Event Handlers ------------------------

function handleTableAction(e) {
  const action = e.target.dataset.action;
  const teacherId = parseInt(e.target.dataset.teacherId);

  if (!action || !teacherId) return;

  switch (action) {
    case 'edit':
      editTeacher(teacherId);
      break;
    case 'delete':
      deleteTeacher(teacherId);
      break;
    case 'view':
      viewTeacher(teacherId);
      break;
  }
}

function handleSelectAll(e) {
  const checkboxes = document.querySelectorAll('.teacher-row-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = e.target.checked;
  });
  updateBulkActionButtons();
}

async function handleDeleteSelected() {
  const selectedIds = getSelectedTeacherIds();
  if (selectedIds.length === 0) return;

  if (confirm(`ต้องการลบครู ${selectedIds.length} คนที่เลือกหรือไม่?`)) {
    for (const id of selectedIds) {
      await deleteTeacher(id, false);
    }
    renderTeachersTable();
  }
}

function handleExportTeachers() {
  alert('ฟีเจอร์ส่งออกจะพัฒนาในเร็วๆ นี้');
}

function handleSearch(e) {
  adminState.searchTerm = e.target.value.toLowerCase();
  adminState.currentPage = 1;
  renderTeachersTable();
}

async function handleRefresh() {
  await loadTeachersData();
  await loadClassesData();
  await loadRoomsData();
  await loadSubjectsData();
  await loadPeriodsData();
  renderTeachersTable();
  renderClassesTable();
  renderRoomsTable();
  renderSubjectsTable();
  renderPeriodsTable();
}

function handleItemsPerPageChange(e) {
  adminState.itemsPerPage = parseInt(e.target.value);
  adminState.currentPage = 1;
  renderTeachersTable();
}

function handleColumnSort(e) {
  const th = e.target.closest('th');
  if (!th || !th.dataset.sortable) return;

  const column = th.dataset.column;
  const columnName = th.textContent.trim();

  if (adminState.sortColumn === column) {
    adminState.sortDirection = adminState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    adminState.sortColumn = column;
    adminState.sortDirection = 'asc';
  }

  showSortingFeedback(columnName, adminState.sortDirection);
  updateSortIndicators();
  renderTeachersTable();
}

// ------------------------ Teacher CRUD UI Functions ------------------------

function editTeacher(id) {
  const teacher = adminState.teachers.find(t => t.id === id);
  if (!teacher) return;

  console.log('🔍 Editing teacher:', teacher); // Debug log

  // Set title input (using corrected ID)
  const titleInput = document.getElementById('teacher-title-input');
  console.log('📝 Title input element:', titleInput); // Debug log
  console.log('📝 Teacher title value:', teacher.title); // Debug log

  if (titleInput) {
    titleInput.value = teacher.title || '';
    console.log('📝 Set title input value to:', titleInput.value); // Debug log
  } else {
    console.error('❌ Title input element not found!'); // Debug log
  }

  document.getElementById('teacher-f-name').value = teacher.f_name || '';
  document.getElementById('teacher-l-name').value = teacher.l_name || '';
  document.getElementById('teacher-email').value = teacher.email || '';
  document.getElementById('teacher-phone').value = teacher.phone || '';
  document.getElementById('teacher-subject-group').value = teacher.subject_group || '';

  const roleRadio = document.querySelector(`input[name="role"][value="${teacher.role}"]`);
  if (roleRadio) {
    roleRadio.checked = true;
  }

  adminState.editingTeacher = teacher;

  const firstName = teacher.f_name || 'ไม่ระบุ';
  const lastName = teacher.l_name || 'ไม่ระบุ';
  const fullName = `${firstName} ${lastName}`;

  const title = document.querySelector('.admin-form-section h3');
  if (title) {
    title.textContent = `✏️ แก้ไขครู`;
  }
}

function viewTeacher(id) {
  const teacher = adminState.teachers.find(t => t.id === id);
  if (!teacher) return;

  const firstName = teacher.f_name || 'ไม่ระบุ';
  const lastName = teacher.l_name || 'ไม่ระบุ';
  const fullName = `${teacher.title ? teacher.title + ' ' : ''}${firstName} ${lastName}`;

  alert(`รายละเอียดครู:\n\nชื่อ: ${fullName}\nอีเมล: ${teacher.email || 'ไม่ระบุ'}\nเบอร์โทร: ${teacher.phone || 'ไม่ระบุ'}\nสาขาวิชา: ${teacher.subject_group}\nบทบาท: ${getRoleDisplayName(teacher.role)}`);
}

// ------------------------ Table Rendering ------------------------

function renderTeachersTable() {
  console.log('🎨 Rendering teachers table with', adminState.teachers.length, 'teachers');

  const tableBody = document.getElementById('teachers-table-body');
  if (!tableBody) {
    console.error('❌ Teachers table body not found!');
    return;
  }

  // Filter teachers
  let filteredTeachers = adminState.teachers.filter(teacher => {
    if (!adminState.searchTerm) return true;

    const searchableText = [
      teacher.title,
      teacher.f_name,
      teacher.l_name,
      teacher.email,
      teacher.phone,
      teacher.subject_group
    ].join(' ').toLowerCase();

    return searchableText.includes(adminState.searchTerm);
  });

  // Sort filtered teachers
  filteredTeachers.sort((a, b) => {
    let aValue = a[adminState.sortColumn];
    let bValue = b[adminState.sortColumn];
    // Sort by display full name (with title) when column is full_name
    if (adminState.sortColumn === 'full_name') {
      const ad = `${a.title ? a.title + ' ' : ''}${a.f_name || ''} ${a.l_name || ''}`.toLowerCase();
      const bd = `${b.title ? b.title + ' ' : ''}${b.f_name || ''} ${b.l_name || ''}`.toLowerCase();
      aValue = ad;
      bValue = bd;
    }

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    let comparison = 0;
    if (aStr < bStr) comparison = -1;
    else if (aStr > bStr) comparison = 1;

    return adminState.sortDirection === 'desc' ? -comparison : comparison;
  });

  // Pagination
  const totalItems = filteredTeachers.length;
  const totalPages = Math.ceil(totalItems / adminState.itemsPerPage);
  const startIndex = (adminState.currentPage - 1) * adminState.itemsPerPage;
  const endIndex = startIndex + adminState.itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex);

  // Render table rows
  if (paginatedTeachers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 2rem; text-align: center; color: #666;">
          ${adminState.searchTerm ? '🔍 ไม่พบข้อมูลที่ค้นหา' : '📋 ไม่มีข้อมูลครู'}
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = paginatedTeachers.map(teacher => {
      const firstName = teacher.f_name || 'ไม่ระบุ';
      const lastName = teacher.l_name || 'ไม่ระบุ';
      const displayName = `${teacher.title ? teacher.title : ''}${firstName} ${lastName}`;
      const fullName = `${firstName} ${lastName}`;

      // Debug: แสดงข้อมูลที่กำลัง render
      console.log(`🎨 Rendering teacher ${teacher.id}: title="${teacher.title}", displayName="${displayName}"`);

      return `
        <tr class="teacher-row" data-teacher-id="${teacher.id}">
          <td style="padding: 0.75rem; text-align: center;">
            <input type="checkbox" class="teacher-row-checkbox" data-teacher-id="${teacher.id}">
          </td>
          <td style="padding: 0.75rem; text-align: center;">${teacher.id}</td>
          <td style="padding: 0.75rem;">${displayName}</td>
          <td style="padding: 0.75rem;" title="${teacher.email || ''}">${teacher.email || '-'}</td>
          <td style="padding: 0.75rem;" title="${teacher.phone || ''}">${teacher.phone || '-'}</td>
          <td style="padding: 0.75rem;">${teacher.subject_group || '-'}</td>
          <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
            <div class="actions-container">
              <button type="button" class="btn btn--sm btn--outline" data-action="edit" data-teacher-id="${teacher.id}" title="แก้ไขข้อมูลครู ${fullName}">✏️</button>
              <button type="button" class="btn btn--sm btn--danger" data-action="delete" data-teacher-id="${teacher.id}" title="ลบครู ${fullName}">🗑️</button>
              <button type="button" class="btn btn--sm btn--primary" data-action="view" data-teacher-id="${teacher.id}" title="ดูรายละเอียดครู ${fullName}">👁️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  updatePaginationInfo(adminState.currentPage, totalPages, totalItems);
  updateBulkActionButtons();
  updateSortIndicators();

  console.log('✅ Table rendered successfully');
}

// ------------------------ UI Helper Functions ------------------------

function updatePaginationInfo(currentPage, totalPages, totalItems) {
  const pageInfo = document.querySelector('.page-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (pageInfo) {
    pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages} (${totalItems} รายการ)`;
  }

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }
}

function updateBulkActionButtons() {
  const selectedIds = getSelectedTeacherIds();
  const deleteBtn = document.getElementById('delete-selected-teachers');
  const copyBtn = document.getElementById('copy-selected-teachers');

  const hasSelection = selectedIds.length > 0;

  if (deleteBtn) {
    deleteBtn.disabled = !hasSelection;
    deleteBtn.style.opacity = hasSelection ? '1' : '0.5';
  }

  if (copyBtn) {
    copyBtn.disabled = !hasSelection;
    copyBtn.style.opacity = hasSelection ? '1' : '0.5';
  }
}

function updateSortIndicators() {
  document.querySelectorAll('#teachers-table th[data-sortable]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });

  const currentSortTh = document.querySelector(`#teachers-table th[data-column="${adminState.sortColumn}"]`);
  if (currentSortTh) {
    currentSortTh.classList.add(adminState.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
  }
}

function showSortingFeedback(columnName, direction) {
  const directionText = direction === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย';
  const message = `🔄 จัดเรียงข้อมูลตาม ${columnName} (${directionText})`;

  let feedback = document.getElementById('sort-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'sort-feedback';
    feedback.className = 'sort-feedback';
    const container = document.querySelector('.teacher-data-grid');
    if (container) {
      container.insertBefore(feedback, document.querySelector('.table-container'));
    }
  }

  feedback.textContent = message;
  feedback.style.display = 'block';

  setTimeout(() => {
    if (feedback) {
      feedback.style.display = 'none';
    }
  }, 2000);
}

function getSelectedTeacherIds() {
  const checkboxes = document.querySelectorAll('.teacher-row-checkbox:checked');
  return Array.from(checkboxes).map(cb => parseInt(cb.dataset.teacherId));
}

function changePage(newPage) {
  const totalItems = adminState.teachers.filter(teacher => {
    if (!adminState.searchTerm) return true;
    const searchableText = [teacher.title, teacher.f_name, teacher.l_name, teacher.email, teacher.phone, teacher.subject_group].join(' ').toLowerCase();
    return searchableText.includes(adminState.searchTerm);
  }).length;

  const totalPages = Math.ceil(totalItems / adminState.itemsPerPage);

  if (newPage >= 1 && newPage <= totalPages) {
    adminState.currentPage = newPage;
    renderTeachersTable();
  }
}

// ------------------------ Navigation ------------------------

function bindMainAdminNavigation() {
  const mainNavTabs = document.querySelectorAll('#page-admin .sub-nav-tabs .sub-nav-tab:not([data-bound])');

  if (mainNavTabs.length === 0) {
    console.log('ℹ️ Main admin navigation already bound or no tabs found');
    return;
  }

  mainNavTabs.forEach(tab => {
    tab.setAttribute('data-bound', 'true');

    tab.addEventListener('click', (e) => {
      e.preventDefault();

      const targetId = tab.getAttribute('data-target');
      console.log('🎯 Admin tab clicked:', targetId);

      const allMainTabs = document.querySelectorAll('#page-admin .sub-nav-tabs .sub-nav-tab');
      allMainTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const adminSubPages = document.querySelectorAll('#page-admin .sub-page');
      adminSubPages.forEach(page => {
        page.classList.add('hidden');
        page.style.display = 'none';
      });

      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.style.display = 'block';
        console.log('✅ Showing admin section:', targetId);

        if (targetId === 'admin-year') {
          initAcademicYearNavigation();
        }
      } else {
        console.error('❌ Target admin section not found:', targetId);
      }
    });
  });

  console.log('✅ Main admin navigation bound to', mainNavTabs.length, 'tabs');
}

function bindDataSubNavigation() {
  const dataSubNavTabs = document.querySelectorAll('.data-sub-nav-tab');

  console.log('🔧 Binding data sub navigation, found', dataSubNavTabs.length, 'tabs');

  dataSubNavTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();

      const targetId = tab.getAttribute('data-target');
      console.log('📋 Data sub-tab clicked:', targetId);

      // Remove active from all tabs
      dataSubNavTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      // Add active to clicked tab
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Hide all data sub-pages
      const dataSubPages = document.querySelectorAll('#admin-data .data-sub-page');
      console.log('📋 Found', dataSubPages.length, 'data sub-pages');
      dataSubPages.forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('active');
      });

      // Show target page
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');

        // Reload template content to ensure it shows properly
        if (window.adminTemplates) {
          let templateKey = null;

          // Map targetId to correct template key
          switch (targetId) {
            case 'add-teacher':
              templateKey = 'forms/admin/add-teacher';
              break;
            case 'add-class':
              templateKey = 'forms/admin/add-class';
              break;
            case 'add-room':
              templateKey = 'forms/admin/add-room';
              break;
            case 'add-subject':
              templateKey = 'forms/admin/add-subject';
              break;
            case 'add-period':
              templateKey = 'forms/admin/add-period';
              break;
          }

          if (templateKey && window.adminTemplates[templateKey]) {
            console.log('🔄 Reloading template:', templateKey);

            // Parse template and extract inner content
            const parser = new DOMParser();
            const doc = parser.parseFromString(window.adminTemplates[templateKey], 'text/html');
            const templateDiv = doc.querySelector(`#${targetId}`);

            console.log('🔍 Template parsed. Found div:', !!templateDiv);

            if (templateDiv) {
              // Get the innerHTML of the template (without the outer div)
              targetPage.innerHTML = templateDiv.innerHTML;
              console.log('✅ Content set from template div');
            } else {
              // Fallback: use template as-is
              targetPage.innerHTML = window.adminTemplates[templateKey];
              console.log('⚠️ Fallback: using template as-is');
            }

            // Re-bind events for specific forms
            setTimeout(async () => {
              try {
                if (targetId === 'add-teacher') {
                  await initTeacherManagement();
                } else if (targetId === 'add-class') {
                  await initClassManagement();
                } else if (targetId === 'add-room') {
                  await initRoomManagement();
                } else if (targetId === 'add-subject') {
                  await initSubjectManagement();
                } else if (targetId === 'add-period') {
                  await initPeriodManagement();
                }
              } catch (error) {
                console.error('❌ Failed to initialize sub-tab:', targetId, error);
              }
            }, 100);
          } else {
            console.warn('⚠️ Template not found:', templateKey, 'Available:', Object.keys(window.adminTemplates || {}));
          }
        }

        console.log('✅ Showing data sub-page:', targetId);
      } else {
        console.error('❌ Target data sub-page not found:', targetId);
      }
    });
  });

  // Initialize first tab as active
  const activeTab = document.querySelector('.data-sub-nav-tab.active');
  if (!activeTab && dataSubNavTabs.length > 0) {
    console.log('📋 Initializing first data sub-tab as active');
    dataSubNavTabs[0].click();
  }
}

function initAcademicYearNavigation() {
  console.log('📅 Initializing academic year navigation...');

  const subNavItems = document.querySelectorAll('#admin-year .sub-nav-item:not([data-bound])');

  if (subNavItems.length === 0) {
    console.log('ℹ️ Academic year sub-navigation already bound or no items found');

    const container = document.querySelector('#admin-year');
    const academicMgmtDiv = document.querySelector('#admin-year #academic-management');

    if (container && academicMgmtDiv) {
      if (academicMgmtDiv.classList.contains('hidden')) {
        academicMgmtDiv.classList.remove('hidden');
        academicMgmtDiv.style.display = 'block';
        console.log('✅ Removed hidden class from academic-management div');
      }
    }

    const retrySubNavItems = document.querySelectorAll('#admin-year .sub-nav-item:not([data-bound])');
    if (retrySubNavItems.length > 0) {
      console.log('🔄 Found sub-nav items after removing hidden class:', retrySubNavItems.length);
      bindAcademicSubNavItems(retrySubNavItems);
      return;
    }

    return;
  }

  bindAcademicSubNavItems(subNavItems);
  console.log('✅ Academic year navigation initialized with', subNavItems.length, 'sub-tabs');
}

function bindAcademicSubNavItems(subNavItems) {
  subNavItems.forEach(item => {
    item.setAttribute('data-bound', 'true');

    item.addEventListener('click', (e) => {
      e.preventDefault();

      const targetSubTab = item.getAttribute('data-sub-tab');
      console.log('📅 Academic sub-tab clicked:', targetSubTab);

      const allSubNavItems = document.querySelectorAll('#admin-year .sub-nav-item');
      allSubNavItems.forEach(i => i.classList.remove('active'));

      item.classList.add('active');

      const allSubTabContent = document.querySelectorAll('#admin-year .sub-tab-content');
      allSubTabContent.forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
      });

      const targetContent = document.getElementById(targetSubTab);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
        console.log('✅ Showing academic sub-tab:', targetSubTab);
      } else {
        console.error('❌ Academic sub-tab content not found:', targetSubTab);
      }
    });
  });

  if (subNavItems.length > 0) {
    subNavItems[0].click();
  }
}

// ------------------------ Keyboard Navigation ------------------------

function initKeyboardNavigation() {
  document.addEventListener('keydown', handleTableKeyboardNavigation);
}

function handleTableKeyboardNavigation(e) {
  const activeElement = document.activeElement;
  const isTableContext = activeElement.closest('.teacher-data-grid') ||
    activeElement.closest('.data-table') ||
    activeElement.id === 'teacher-search';

  if (!isTableContext) return;

  switch (e.key) {
    case 'F3':
    case '/':
      e.preventDefault();
      focusSearchInput();
      break;
    case 'Escape':
      e.preventDefault();
      clearSearchAndFocus();
      break;
    case 'F5':
    case 'r':
      if (e.ctrlKey) {
        e.preventDefault();
        handleRefresh();
      }
      break;
    case 'Delete':
      if (e.ctrlKey) {
        e.preventDefault();
        handleDeleteSelected();
      }
      break;
    case 'a':
      if (e.ctrlKey) {
        e.preventDefault();
        toggleSelectAll();
      }
      break;
    case 'n':
      if (e.ctrlKey) {
        e.preventDefault();
        focusFirstFormInput();
      }
      break;
  }
}

function focusSearchInput() {
  const searchInput = document.getElementById('teacher-search');
  if (searchInput) {
    searchInput.focus();
    searchInput.select();
  }
}

function clearSearchAndFocus() {
  const searchInput = document.getElementById('teacher-search');
  if (searchInput) {
    searchInput.value = '';
    adminState.searchTerm = '';
    adminState.currentPage = 1;
    renderTeachersTable();
    searchInput.focus();
  }
}

function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById('select-all-teachers');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = !selectAllCheckbox.checked;
    handleSelectAll({ target: selectAllCheckbox });
  }
}

function focusFirstFormInput() {
  const firstInput = document.getElementById('teacher-f-name');
  if (firstInput) {
    firstInput.focus();
    firstInput.select();
  }
}

// ------------------------ Modal Functions ------------------------

function showShortcutsModal() {
  const modalHtml = `
    <div id="shortcuts-modal" class="shortcuts-modal">
      <div class="shortcuts-modal-content">
        <div class="shortcuts-modal-header">
          <h3>⌨️ คีย์ลัดสำหรับตารางครู</h3>
          <button type="button" class="shortcuts-close">×</button>
        </div>
        <div class="shortcuts-modal-body">
          <div class="shortcuts-section">
            <h4>🔍 การค้นหา</h4>
            <div class="shortcut-item">
              <kbd>F3</kbd> หรือ <kbd>/</kbd> - โฟกัสช่องค้นหา
            </div>
            <div class="shortcut-item">
              <kbd>Esc</kbd> - ล้างคำค้นหา
            </div>
          </div>
          
          <div class="shortcuts-section">
            <h4>📋 การจัดการ</h4>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>A</kbd> - เลือก/ยกเลิกทั้งหมด
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>Delete</kbd> - ลบรายการที่เลือก
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>R</kbd> - รีเฟรชข้อมูล
            </div>
          </div>
          
          <div class="shortcuts-section">
            <h4>✏️ การเพิ่มข้อมูล</h4>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>N</kbd> - โฟกัสฟอร์มเพิ่มครูใหม่
            </div>
          </div>
        </div>
        <div class="shortcuts-modal-footer">
          <button type="button" class="btn btn--primary shortcuts-close">ตกลง</button>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById('shortcuts-modal');
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.querySelectorAll('.shortcuts-close').forEach(btn => {
    btn.addEventListener('click', closeShortcutsModal);
  });

  document.getElementById('shortcuts-modal').addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-modal') {
      closeShortcutsModal();
    }
  });

  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      closeShortcutsModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
}

function closeShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) {
    modal.remove();
  }
}

// ------------------------ Resizable Columns ------------------------

function initResizableColumns() {
  const table = document.getElementById('teachers-table');
  if (!table) return;

  const headers = table.querySelectorAll('th');
  let isResizing = false;
  let currentHeader = null;
  let startX = 0;
  let startWidth = 0;

  headers.forEach((header, index) => {
    if (index === headers.length - 1) return;

    header.addEventListener('mousedown', (e) => {
      const rect = header.getBoundingClientRect();
      const isResizeArea = e.clientX >= rect.right - 5;

      if (isResizeArea) {
        e.preventDefault();
        isResizing = true;
        currentHeader = header;
        startX = e.clientX;
        startWidth = header.offsetWidth;

        header.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    });

    header.addEventListener('mousemove', (e) => {
      if (isResizing) return;

      const rect = header.getBoundingClientRect();
      const isResizeArea = e.clientX >= rect.right - 5;

      header.style.cursor = isResizeArea ? 'col-resize' : 'default';
    });

    header.addEventListener('mouseleave', () => {
      if (!isResizing) {
        header.style.cursor = 'default';
      }
    });
  });

  function handleMouseMove(e) {
    if (!isResizing || !currentHeader) return;

    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff);

    currentHeader.style.width = newWidth + 'px';
  }

  function handleMouseUp() {
    if (isResizing) {
      isResizing = false;

      if (currentHeader) {
        currentHeader.classList.remove('resizing');
        currentHeader = null;
      }

      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }

  console.log('✅ Resizable columns initialized');
}

// Export functions for admin.js integration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bindTeacherTableEvents,
    bindTeacherSearchEvents,
    bindTeacherPaginationEvents,
    renderTeachersTable,
    bindMainAdminNavigation,
    bindDataSubNavigation,
    initKeyboardNavigation,
    initResizableColumns,
    showShortcutsModal
  };
}

// =============================================================================
// GLOBAL FUNCTIONS FOR INLINE ONCLICK HANDLERS
// =============================================================================

/**
 * Delete Academic Year - Global function for onclick
 */
window.deleteAcademicYear = async function (yearId, year) {
  try {
    if (!yearId) return;

    // Import required modules dynamically
    const { default: coreAPI } = await import('../api/core-api.js');
    const { refreshContextFromBackend } = await import('../context/globalContext.js');

    // Check if it's the active year (rough check)
    const confirmed = confirm(`ยืนยันการลบปีการศึกษา ${year} ?`);
    if (!confirmed) return;

    // Show loading state
    const button = event?.target;
    const originalText = button ? button.textContent : '';
    if (button) {
      button.textContent = 'กำลังลบ...';
      button.disabled = true;
    }

    try {
      const result = await coreAPI.deleteAcademicYear(parseInt(yearId));

      if (!result.success) {
        alert(result.error || 'ลบปีการศึกษาไม่สำเร็จ');
        return;
      }

      // Refresh global context from backend (to sync any changes)
      try { await refreshContextFromBackend(); } catch (e) { }

      alert(`ลบปีการศึกษา ${year} เรียบร้อยแล้ว!`);

      // Reload page to refresh all data
      window.location.reload();

    } finally {
      // Reset button
      if (button) {
        button.textContent = originalText;
        button.disabled = false;
      }
    }

  } catch (error) {
    console.error('[Admin] Error deleting academic year:', error);
    alert('เกิดข้อผิดพลาดในการลบปีการศึกษา: ' + error.message);
  }
};

/**
 * Edit Academic Year - Global function for onclick (placeholder)
 */
window.editAcademicYear = async function (yearId) {
  alert('คุณสมบัติแก้ไขยังไม่ได้ถูกพัฒนา ใช้ลบแล้วเพิ่มใหม่แทน');
  console.log('[Admin] Edit academic year:', yearId);
};

/**
 * Edit Semester - Global function for onclick (placeholder)
 */
window.editSemester = async function (semesterId) {
  alert('คุณสมบัติแก้ไขภาคเรียนยังไม่ได้ถูกพัฒนา ใช้ลบแล้วเพิ่มใหม่แทน');
  console.log('[Admin] Edit semester:', semesterId);
};
