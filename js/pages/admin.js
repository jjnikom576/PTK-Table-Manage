/**
 * Admin Page – Template-based with minimal login integration
 */

import { isLoggedIn, login, logout } from '../api/auth.js';
import { getContext } from '../context/globalContext.js';
import templateLoader from '../templateLoader.js';
import { getTeachersByYear, getFullName, getRoleDisplayName } from '../data/teachers.mock.js';

let adminState = {
  context: null,
  initialized: false,
  templatesLoaded: false,
  teachers: [],
  currentPage: 1,
  itemsPerPage: 10,
  searchTerm: '',
  editingTeacher: null,
  sortColumn: 'id',
  sortDirection: 'asc'
};

export async function initAdminPage(context = null) {
  // Ensure admin page is visible
  const section = document.getElementById('page-admin');
  if (section) { section.classList.remove('hidden'); section.style.display = 'block'; }

  // Ensure sub-nav has user actions on the right
  try { ensureUserActionsInSubnav(); } catch (e) {}

  adminState.context = normalizeContext(context) || getContext();
  showAuthOnly();
  bindAuthForm();
  adjustAuthInputWidth();





  bindLogout();
  bindDataSubNavigation();
  bindMainAdminNavigation(); // เพิ่มบรรทัดนี้
  
  // โหลด admin templates
  await loadAdminTemplates();
  
  // Initialize teacher management
  await initTeacherManagement();
  
  adminState.initialized = true;
}

export function setAdminContext(year, semesterId) {
  adminState.context = { year, semesterId };
}

export function validateAdminContextAccess(context, user) {
  // Keep permissive; we gate UI with isLoggedIn()
  return true;
}

export async function updateAdminUIForContext(context) {
  adminState.context = normalizeContext(context) || adminState.context;
}

// No-op placeholders to keep API surface compatible
export async function showTeacherManagement() {}
export async function showClassManagement() {}
export async function showRoomManagement() {}
export async function showSubjectManagement() {}
export async function showScheduleManagement() {}

// ------------------------ Template Loading ------------------------

async function loadAdminTemplates() {
  if (adminState.templatesLoaded) return;
  
  try {
    // โหลด admin form templates
    const templates = await templateLoader.loadMultiple([
      'forms/admin/add-teacher',
      'forms/admin/add-class', 
      'forms/admin/add-room',
      'forms/admin/add-subject',
      'forms/admin/add-academic-year'
    ]);
    
    // แทรก templates เข้าใน admin forms grid
    const adminFormsGrid = document.querySelector('#admin-data .admin-forms-grid');
    if (adminFormsGrid) {
      // ล้างเนื้อหาเดิม
      adminFormsGrid.innerHTML = '';
      
      // เพิ่ม templates ใหม่
      adminFormsGrid.innerHTML = 
        templates['forms/admin/add-teacher'] +
        templates['forms/admin/add-class'] +
        templates['forms/admin/add-room'] +
        templates['forms/admin/add-subject'];
    }
    
    // แทรก academic year template ลงใน admin-year section
    const academicManagementContent = document.querySelector('#academic-management-content');
    if (academicManagementContent) {
      // วิธี brute force - ใช้ DOMParser
      const parser = new DOMParser();
      const templateHtml = templates['forms/admin/add-academic-year'];
      const doc = parser.parseFromString(templateHtml, 'text/html');
      const templateElement = doc.body.firstElementChild;
      
      academicManagementContent.innerHTML = '';
      if (templateElement) {
        academicManagementContent.appendChild(templateElement);
      } else {
        // fallback
        academicManagementContent.innerHTML = templateHtml;
      }
      
      console.log('📅 Academic year template loaded into #academic-management-content');
      console.log('📝 Template content length:', templates['forms/admin/add-academic-year']?.length || 0, 'characters');
    } else {
      console.error('❌ #academic-management-content not found!');
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
  
  // Wait a bit for DOM to be ready
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Check if elements exist
  const container = document.querySelector('.teacher-management-container');
  const tableBody = document.getElementById('teachers-table-body');
  const table = document.getElementById('teachers-table');
  
  console.log('Container found:', !!container);
  console.log('Table body found:', !!tableBody);
  console.log('Table found:', !!table);
  
  if (!container) {
    console.error('❌ Teacher management container not found!');
    return;
  }
  
  if (!tableBody) {
    console.error('❌ Teachers table body not found!');
    return;
  }
  
  // Load teachers data
  await loadTeachersData();
  
  // Bind event listeners
  bindTeacherFormEvents();
  bindTeacherTableEvents();
  bindTeacherSearchEvents();
  bindTeacherPaginationEvents();
  
  // Initial render
  console.log('📊 Rendering teachers table...');
  renderTeachersTable();
  
  console.log('✅ Teacher management initialized successfully');
}

async function loadTeachersData() {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || 2567;
    adminState.teachers = getTeachersByYear(year);
    console.log(`📊 Loaded ${adminState.teachers.length} teachers for year ${year}`);
  } catch (error) {
    console.error('❌ Error loading teachers data:', error);
    adminState.teachers = [];
  }
}

function bindTeacherFormEvents() {
  // Teacher form submission
  const teacherForm = document.getElementById('teacher-form');
  if (teacherForm) {
    teacherForm.addEventListener('submit', handleTeacherSubmit);
  }
  
  // Clear form button
  const clearButton = document.getElementById('clear-teacher-form');
  if (clearButton) {
    clearButton.addEventListener('click', clearTeacherForm);
  }
}

function bindTeacherTableEvents() {
  // Table action buttons (delegated events)
  const tableBody = document.getElementById('teachers-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', handleTableAction);
  }
  
  // Table header sorting
  const tableHeader = document.getElementById('teachers-table')?.querySelector('thead');
  if (tableHeader) {
    tableHeader.addEventListener('click', handleColumnSort);
  }
  
  // Select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-teachers');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAll);
  }
  
  // Bulk actions
  const deleteSelectedBtn = document.getElementById('delete-selected-teachers');
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
  }
  
  // Export button
  const exportBtn = document.getElementById('export-teachers');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportTeachers);
  }
  
  // Shortcuts help button
  const shortcutsBtn = document.getElementById('show-shortcuts');
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', showShortcutsModal);
  }
  
  // Initialize resizable columns
  initResizableColumns();
  
  // Initialize keyboard navigation
  initKeyboardNavigation();
}

function bindTeacherSearchEvents() {
  // Search input
  const searchInput = document.getElementById('teacher-search');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-teachers');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefresh);
  }
  
  // Items per page
  const itemsPerPageSelect = document.getElementById('teachers-per-page');
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', handleItemsPerPageChange);
  }
}

function bindTeacherPaginationEvents() {
  // Pagination buttons
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => changePage(adminState.currentPage - 1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => changePage(adminState.currentPage + 1));
  }
}

// Event Handlers
async function handleTeacherSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const teacherData = {
    f_name: formData.get('f_name'),
    l_name: formData.get('l_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    subject_group: formData.get('subject_group'),
    role: formData.get('role')
  };
  
  if (adminState.editingTeacher) {
    // Update existing teacher
    await updateTeacher(adminState.editingTeacher.id, teacherData);
    adminState.editingTeacher = null;
  } else {
    // Add new teacher
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
    
    // Reset form title
    const title = form.closest('.admin-form-section').querySelector('h3');
    if (title) {
      title.textContent = '📝 เพิ่มครูใหม่';
    }
  }
}

// Keyboard Navigation Implementation
function initKeyboardNavigation() {
  document.addEventListener('keydown', handleTableKeyboardNavigation);
}

function handleTableKeyboardNavigation(e) {
  // Only handle when focus is on table or related elements
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
          
          <div class="shortcuts-section">
            <h4>🔄 การจัดเรียง</h4>
            <div class="shortcut-item">
              คลิกที่หัวคอลัมน์ - จัดเรียงข้อมูล
            </div>
            <div class="shortcut-item">
              สัญลักษณ์: ↑ (น้อยไปมาก) / ↓ (มากไปน้อย)
            </div>
          </div>
        </div>
        <div class="shortcuts-modal-footer">
          <button type="button" class="btn btn--primary shortcuts-close">ตกลง</button>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById('shortcuts-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Add event listeners
  document.querySelectorAll('.shortcuts-close').forEach(btn => {
    btn.addEventListener('click', closeShortcutsModal);
  });
  
  // Close on backdrop click
  document.getElementById('shortcuts-modal').addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-modal') {
      closeShortcutsModal();
    }
  });
  
  // Close on Escape key
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
    case 'save':
      saveInlineEdit(teacherId);
      break;
    case 'cancel':
      cancelInlineEdit(teacherId);
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

function handleDeleteSelected() {
  const selectedIds = getSelectedTeacherIds();
  if (selectedIds.length === 0) return;
  
  if (confirm(`ต้องการลบครู ${selectedIds.length} คนที่เลือกหรือไม่?`)) {
    selectedIds.forEach(id => deleteTeacher(id, false));
    renderTeachersTable();
  }
}

function handleExportTeachers() {
  // TODO: Implement export functionality
  alert('ฟีเจอร์ส่งออกจะพัฒนาในเร็วๆ นี้');
}

function handleSearch(e) {
  adminState.searchTerm = e.target.value.toLowerCase();
  adminState.currentPage = 1;
  renderTeachersTable();
}

function handleRefresh() {
  loadTeachersData().then(() => {
    renderTeachersTable();
  });
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
  
  // Toggle sort direction if same column, otherwise default to asc
  if (adminState.sortColumn === column) {
    adminState.sortDirection = adminState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    adminState.sortColumn = column;
    adminState.sortDirection = 'asc';
  }
  
  // Show sorting feedback
  showSortingFeedback(columnName, adminState.sortDirection);
  
  // Update sort indicators
  updateSortIndicators();
  
  // Re-render table
  renderTeachersTable();
}

function showSortingFeedback(columnName, direction) {
  const directionText = direction === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย';
  const message = `🔄 จัดเรียงข้อมูลตาม ${columnName} (${directionText})`;
  
  // Create or update feedback element
  let feedback = document.getElementById('sort-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'sort-feedback';
    feedback.className = 'sort-feedback';
    document.querySelector('.teacher-data-grid').insertBefore(feedback, document.querySelector('.table-container'));
  }
  
  feedback.textContent = message;
  feedback.style.display = 'block';
  
  // Auto-hide after 2 seconds
  setTimeout(() => {
    if (feedback) {
      feedback.style.display = 'none';
    }
  }, 2000);
}

function updateSortIndicators() {
  // Remove all existing sort indicators
  document.querySelectorAll('#teachers-table th[data-sortable]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });
  
  // Add indicator to current sorted column
  const currentSortTh = document.querySelector(`#teachers-table th[data-column="${adminState.sortColumn}"]`);
  if (currentSortTh) {
    currentSortTh.classList.add(adminState.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
  }
}

// CRUD Operations
async function addNewTeacher(teacherData) {
  const newId = Math.max(...adminState.teachers.map(t => t.id), 0) + 1;
  const newTeacher = {
    id: newId,
    ...teacherData,
    user_id: null,
    created_at: new Date().toISOString()
  };
  
  adminState.teachers.push(newTeacher);
  console.log('✅ Added new teacher:', newTeacher);
}

async function updateTeacher(id, teacherData) {
  const index = adminState.teachers.findIndex(t => t.id === id);
  if (index !== -1) {
    adminState.teachers[index] = {
      ...adminState.teachers[index],
      ...teacherData
    };
    console.log('✅ Updated teacher:', adminState.teachers[index]);
  }
}

function deleteTeacher(id, confirm = true) {
  if (confirm && !window.confirm('ต้องการลบครูคนนี้หรือไม่?')) {
    return;
  }
  
  const index = adminState.teachers.findIndex(t => t.id === id);
  if (index !== -1) {
    const deleted = adminState.teachers.splice(index, 1)[0];
    console.log('🗑️ Deleted teacher:', deleted);
    renderTeachersTable();
  }
}

function editTeacher(id) {
  const teacher = adminState.teachers.find(t => t.id === id);
  if (!teacher) return;
  
  // Populate form with teacher data (handle missing data)
  document.getElementById('teacher-f-name').value = teacher.f_name || '';
  document.getElementById('teacher-l-name').value = teacher.l_name || '';
  document.getElementById('teacher-email').value = teacher.email || '';
  document.getElementById('teacher-phone').value = teacher.phone || '';
  document.getElementById('teacher-subject-group').value = teacher.subject_group || '';
  
  // Set role radio button
  const roleRadio = document.querySelector(`input[name="role"][value="${teacher.role}"]`);
  if (roleRadio) {
    roleRadio.checked = true;
  }
  
  adminState.editingTeacher = teacher;
  
  // Update form title with safe name display
  const firstName = teacher.f_name || 'ไม่ระบุ';
  const lastName = teacher.l_name || 'ไม่ระบุ';
  const fullName = `${firstName} ${lastName}`;
  
  const title = document.querySelector('.admin-form-section h3');
  if (title) {
    title.textContent = `✏️ แก้ไขครู: ${fullName}`;
  }
}

function viewTeacher(id) {
  const teacher = adminState.teachers.find(t => t.id === id);
  if (!teacher) return;
  
  const firstName = teacher.f_name || 'ไม่ระบุ';
  const lastName = teacher.l_name || 'ไม่ระบุ';
  const fullName = `${firstName} ${lastName}`;
  
  alert(`รายละเอียดครู:\n\nชื่อ: ${fullName}\nอีเมล: ${teacher.email || 'ไม่ระบุ'}\nเบอร์โทร: ${teacher.phone || 'ไม่ระบุ'}\nสาขาวิชา: ${teacher.subject_group}\nบทบาท: ${getRoleDisplayName(teacher.role)}`);
}

// Rendering Functions
function renderTeachersTable() {
  console.log('🎨 Rendering teachers table with', adminState.teachers.length, 'teachers');
  
  const tableBody = document.getElementById('teachers-table-body');
  if (!tableBody) {
    console.error('❌ Teachers table body not found!');
    return;
  }
  
  // Filter teachers based on search term
  let filteredTeachers = adminState.teachers.filter(teacher => {
    if (!adminState.searchTerm) return true;
    
    const searchableText = [
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
    const aValue = a[adminState.sortColumn];
    const bValue = b[adminState.sortColumn];
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    // Convert to string for comparison if needed
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    let comparison = 0;
    if (aStr < bStr) comparison = -1;
    else if (aStr > bStr) comparison = 1;
    
    return adminState.sortDirection === 'desc' ? -comparison : comparison;
  });
  
  console.log('🔍 Filtered teachers:', filteredTeachers.length);
  
  // Pagination
  const totalItems = filteredTeachers.length;
  const totalPages = Math.ceil(totalItems / adminState.itemsPerPage);
  const startIndex = (adminState.currentPage - 1) * adminState.itemsPerPage;
  const endIndex = startIndex + adminState.itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex);
  
  console.log('📄 Paginated teachers:', paginatedTeachers.length);
  
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
      // Dynamic text fitting - like Excel
      const createFullCell = (content) => {
        return {
          displayText: content || '-',
          titleAttr: '',
          cssClass: 'cell-full'
        };
      };
      
      const createDynamicCell = (content, columnClass) => {
        const text = content || '-';
        if (!content) return { 
          displayText: text, 
          titleAttr: '',
          cssClass: `cell-dynamic ${columnClass}`
        };
        
        return {
          displayText: text, // แสดงข้อความเต็มก่อน
          titleAttr: `title="${text}"`, // เอา tooltip ไว้เสมอ
          cssClass: `cell-dynamic ${columnClass}`
        };
      };
      
      // Safe name handling
      const firstName = teacher.f_name || 'ไม่ระบุ';
      const lastName = teacher.l_name || 'ไม่ระบุ';
      const fullName = `${firstName} ${lastName}`;
      
      // Apply different strategies
      const fname = createFullCell(firstName);
      const lname = createFullCell(lastName);
      const email = createDynamicCell(teacher.email, 'col-email'); // ใช้ dynamic 
      const phone = createDynamicCell(teacher.phone, 'col-phone'); // ใช้ dynamic
      const subject = createDynamicCell(teacher.subject_group, 'col-subject'); // เปลี่ยนเป็น dynamic
      
      return `
        <tr class="teacher-row" data-teacher-id="${teacher.id}">
          <td style="padding: 0.75rem; text-align: center;">
            <input type="checkbox" class="teacher-row-checkbox" data-teacher-id="${teacher.id}">
          </td>
          <td style="padding: 0.75rem; text-align: center;">${teacher.id}</td>
          <td style="padding: 0.75rem;" class="${fname.cssClass}">${fname.displayText}</td>
          <td style="padding: 0.75rem;" class="${lname.cssClass}">${lname.displayText}</td>
          <td style="padding: 0.75rem;" class="${email.cssClass}" ${email.titleAttr}>${email.displayText}</td>
          <td style="padding: 0.75rem;" class="${phone.cssClass}" ${phone.titleAttr}>${phone.displayText}</td>
          <td style="padding: 0.75rem;" class="${subject.cssClass}">${subject.displayText}</td>
          <td style="padding: 0.75rem; text-align: center; white-space: nowrap; vertical-align: middle;">
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
  
  // Update pagination info
  updatePaginationInfo(adminState.currentPage, totalPages, totalItems);
  
  // Update bulk action buttons
  updateBulkActionButtons();
  
  // Update sort indicators
  updateSortIndicators();
  
  console.log('✅ Table rendered successfully');
}

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

// Resizable Columns Implementation
function initResizableColumns() {
  const table = document.getElementById('teachers-table');
  if (!table) return;
  
  const headers = table.querySelectorAll('th');
  let isResizing = false;
  let currentHeader = null;
  let startX = 0;
  let startWidth = 0;
  
  headers.forEach((header, index) => {
    // Skip the last column (no resize handle)
    if (index === headers.length - 1) return;
    
    // Add mousedown event for resize handle
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
        
        // Add event listeners for mouse move and up
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    });
    
    // Change cursor on hover over resize area
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
    const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
    
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
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }
  
  console.log('✅ Resizable columns initialized');
}

// Utility Functions
function getSelectedTeacherIds() {
  const checkboxes = document.querySelectorAll('.teacher-row-checkbox:checked');
  return Array.from(checkboxes).map(cb => parseInt(cb.dataset.teacherId));
}

function changePage(newPage) {
  const totalItems = adminState.teachers.filter(teacher => {
    if (!adminState.searchTerm) return true;
    const searchableText = [teacher.f_name, teacher.l_name, teacher.email, teacher.phone, teacher.subject_group].join(' ').toLowerCase();
    return searchableText.includes(adminState.searchTerm);
  }).length;
  
  const totalPages = Math.ceil(totalItems / adminState.itemsPerPage);
  
  if (newPage >= 1 && newPage <= totalPages) {
    adminState.currentPage = newPage;
    renderTeachersTable();
  }
}

// ------------------------ Helpers ------------------------

function bindAuthForm() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = (document.getElementById('admin-username')?.value || '').trim();
    const p = (document.getElementById('admin-password')?.value || '');
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...'; }
    const res = await login(u, p);
    if (res.ok) {
      showAdminSections(); updateUsernameHeader();
    } else {
      alert(res.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
  });
}

function bindLogout() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('btn-logout-admin')) {
      try { logout(); } catch {}
      window.location.hash = 'login';
      window.location.reload();
    }
  }, { passive: true });
}

function showAuthOnly() {
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
  // If already present, skip
  if (nav.querySelector('.admin-subnav')) return;
  const ul = nav.querySelector('ul.sub-nav-tabs');
  if (!ul) return;
  // Create wrapper and move ul inside
  const wrap = document.createElement('div');
  wrap.className = 'admin-subnav';
  ul.parentNode.insertBefore(wrap, ul);
  wrap.appendChild(ul);
  // Add user actions box
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


function updateUsernameHeader() {
  try {
    const raw = localStorage.getItem('admin_session');
    let n = 'admin';
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.user && data.user.username) n = data.user.username;
    }
    const el = document.getElementById('admin-username-display');
    if (el) el.textContent = 'ผู้ใช้: ' + n;
  } catch (e) {}
}




function bindMainAdminNavigation() {
  // ป้องกัน duplicate binding
  const mainNavTabs = document.querySelectorAll('#page-admin .sub-nav-tabs .sub-nav-tab:not([data-bound])');
  
  if (mainNavTabs.length === 0) {
    console.log('ℹ️ Main admin navigation already bound or no tabs found');
    return;
  }
  
  mainNavTabs.forEach(tab => {
    tab.setAttribute('data-bound', 'true'); // มาร์คว่า bound แล้ว
    
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = tab.getAttribute('data-target');
      console.log('🎯 Admin tab clicked:', targetId);
      
      // Remove active class from all main tabs
      const allMainTabs = document.querySelectorAll('#page-admin .sub-nav-tabs .sub-nav-tab');
      allMainTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked tab
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      // Hide all admin sub-pages
      const adminSubPages = document.querySelectorAll('#page-admin .sub-page');
      adminSubPages.forEach(page => {
        page.classList.add('hidden');
        page.style.display = 'none'; // บังคับซ่อน
      });
      
      // Show target page
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.style.display = 'block'; // บังคับแสดง
        console.log('✅ Showing admin section:', targetId);
        
        // Debug CSS
        console.log('🎨 CSS classes:', targetPage.className);
        console.log('🎨 Display style:', window.getComputedStyle(targetPage).display);
        console.log('🎨 Visibility:', window.getComputedStyle(targetPage).visibility);
        
        // ตรวจสอบเนื้อหา
        const content = targetPage.innerHTML.trim();
        if (content.length === 0 || content === '<!-- Content will be loaded here -->') {
          console.warn('⚠️ Target page is empty:', targetId);
          targetPage.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Loading content...</div>';
        } else {
          console.log('📝 Content found in', targetId, ':', content.length, 'characters');
          
          // ถ้าเป็น academic year section ให้เพิ่ม sub-nav events
          if (targetId === 'admin-year') {
            initAcademicYearNavigation();
          }
        }
      } else {
        console.error('❌ Target admin section not found:', targetId);
      }
    });
  });
  
  console.log('✅ Main admin navigation bound to', mainNavTabs.length, 'tabs');
}

function initAcademicYearNavigation() {
  console.log('📅 Initializing academic year navigation...');
  
  // แก้ไข selector ให้ถูกต้อง - ใช้ #admin-year แทน #academic-management-content
  const subNavItems = document.querySelectorAll('#admin-year .sub-nav-item:not([data-bound])');
  
  if (subNavItems.length === 0) {
    console.log('ℹ️ Academic year sub-navigation already bound or no items found');
    
    // Debug: ดูว่ามี elements อะไรอยู่
    const container = document.querySelector('#admin-year');
    const academicMgmtDiv = document.querySelector('#admin-year #academic-management');
    const subNav = document.querySelector('#admin-year .sub-nav');
    const allSubNavItems = document.querySelectorAll('#admin-year .sub-nav-item');
    
    console.log('🔍 Container found:', !!container);
    console.log('🔍 Academic management div found:', !!academicMgmtDiv);
    console.log('🔍 Sub-nav found:', !!subNav);
    console.log('🔍 All sub-nav items found:', allSubNavItems.length);
    
    if (container && academicMgmtDiv) {
      // แก้ไข: ลบ class hidden จาก academic-management div
      if (academicMgmtDiv.classList.contains('hidden')) {
        academicMgmtDiv.classList.remove('hidden');
        academicMgmtDiv.style.display = 'block';
        console.log('✅ Removed hidden class from academic-management div');
      }
      console.log('📝 Container HTML preview:', container.innerHTML.substring(0, 200) + '...');
    }
    
    // ลองอีกครั้งหลังจากแก้ไข hidden
    const retrySubNavItems = document.querySelectorAll('#admin-year .sub-nav-item:not([data-bound])');
    if (retrySubNavItems.length > 0) {
      console.log('🔄 Found sub-nav items after removing hidden class:', retrySubNavItems.length);
      // Recursively call with fixed elements
      bindAcademicSubNavItems(retrySubNavItems);
      return;
    }
    
    return;
  }
  
  bindAcademicSubNavItems(subNavItems);
  console.log('✅ Academic year navigation initialized with', subNavItems.length, 'sub-tabs');
}

// แยกฟังก์ชัน binding ออกมา
function bindAcademicSubNavItems(subNavItems) {
  subNavItems.forEach(item => {
    item.setAttribute('data-bound', 'true');
    
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetSubTab = item.getAttribute('data-sub-tab');
      console.log('📅 Academic sub-tab clicked:', targetSubTab);
      
      // Remove active from all sub-nav items
      const allSubNavItems = document.querySelectorAll('#admin-year .sub-nav-item');
      allSubNavItems.forEach(i => i.classList.remove('active'));
      
      // Add active to clicked item
      item.classList.add('active');
      
      // Hide all sub-tab-content
      const allSubTabContent = document.querySelectorAll('#admin-year .sub-tab-content');
      allSubTabContent.forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
      });
      
      // Show target sub-tab-content
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
  
  // Initialize first sub-tab as active
  if (subNavItems.length > 0) {
    subNavItems[0].click();
  }
}

function bindDataSubNavigation() {
  // Bind data sub-navigation tabs
  const dataSubNavTabs = document.querySelectorAll('.data-sub-nav-tab');
  
  dataSubNavTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all tabs
      dataSubNavTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked tab
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      // Hide all data sub-pages
      const dataSubPages = document.querySelectorAll('.data-sub-page');
      dataSubPages.forEach(page => {
        page.classList.add('hidden');
      });
      
      // Show target page
      const targetId = tab.getAttribute('data-target');
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
      }
    });
  });
  
  // Initialize first tab as active if none are active
  const activeTab = document.querySelector('.data-sub-nav-tab.active');
  if (!activeTab && dataSubNavTabs.length > 0) {
    dataSubNavTabs[0].click();
  }
}

function adjustAuthInputWidth() {
  try {
    const form = document.querySelector('#page-admin .auth-form');
    if (!form) return;
    
    // FIX: Center entire auth-form container
    form.style.margin = '0 auto';
    form.style.textAlign = 'center';
    form.style.maxWidth = '350px';
    
    // FIX: Change form to flexbox layout for center alignment
    const formElement = form.querySelector('form');
    if (formElement) {
      formElement.style.display = 'flex';
      formElement.style.flexDirection = 'column';
      formElement.style.alignItems = 'center';
      formElement.style.gap = '0.75rem';
    }
    
    // FIX: Create row containers for label + input pairs
    const labels = form.querySelectorAll('label');
    labels.forEach((label) => {
      const input = label.nextElementSibling;
      if (input && input.tagName === 'INPUT') {
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.style.justifyContent = 'center';
        
        // Move label and input into wrapper
        label.parentNode.insertBefore(wrapper, label);
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        
        // Style the input
        input.style.padding = '0.4rem 0.55rem';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '6px';
      }
    });
    
    // FIX: Center button
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.style.margin = '0.5rem auto 0';
      button.style.padding = '0.55rem 1.5rem';
    }
  } catch (e) {}
}


