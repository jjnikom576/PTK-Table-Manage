import scheduleAPI from '../../api/schedule-api.js';
import { getContext } from '../../context/globalContext.js';
import adminState from './state.js';
import {
  getFullName,
  getRoleDisplayName,
  formatTeacherName,
  normalizeTeacherNameString
} from './entityHelpers.js';

const REFRESH_REQUEST_EVENT = 'admin:refresh-all-requested';
const TEACHERS_UPDATED_EVENT = 'admin:teachers-updated';

export async function initTeacherManagement() {
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

export async function loadTeachersData() {
  try {
    adminState.loading = true;
    adminState.error = null;

    const context = adminState.context || getContext();
    const year = context?.year || 2567;
    const semesterId = context?.semester?.id || context?.semesterId;

    console.log(`📊 Loading teachers for year ${year}...`);
    const result = await scheduleAPI.getTeachers(year, semesterId);

    if (result.success) {
      adminState.teachers = result.data || [];
      console.log(`✅ Loaded ${adminState.teachers.length} teachers for year ${year}`);
      document.dispatchEvent(new CustomEvent(TEACHERS_UPDATED_EVENT));
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
  }
}

function showTeachersError(message) {
  console.error('🚨 Teacher Error:', message);
}

function showTeachersSuccess(message) {
  console.log('✅ Teacher Success:', message);
}

async function addNewTeacher(teacherData) {
  try {
    const context = adminState.context || getContext();
    const year = context?.year || 2567;
    const semesterId = context?.semester?.id || context?.semesterId;

    console.log('📝 Creating new teacher...', teacherData);
    const result = await scheduleAPI.createTeacher(year, semesterId, teacherData);

    if (result.success) {
      console.log('✅ Teacher created successfully:', result.data);
      showTeachersSuccess('เพิ่มครูใหม่เรียบร้อยแล้ว');
      await loadTeachersData();
      renderTeachersTable();
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
      renderTeachersTable();
    } else {
      console.error('❌ Failed to update teacher:', result.error);
      showTeachersError(result.error || 'ไม่สามารถอัปเดตข้อมูลครูได้');
    }
  } catch (error) {
    console.error('❌ Error updating teacher:', error);
    showTeachersError('เกิดข้อผิดพลาดในการอัปเดตครู');
  }
}

async function deleteTeacher(id, shouldConfirm = true) {
  if (shouldConfirm && !window.confirm('ต้องการลบครูคนนี้หรือไม่?')) {
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

function bindTeacherFormEvents() {
  const teacherForm = document.getElementById('teacher-form');
  if (teacherForm) {
    teacherForm.addEventListener('submit', handleTeacherSubmit);
  }

  const cancelEditBtn = document.getElementById('cancel-teacher-edit');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', handleCancelTeacherEdit);
  }

  const inputs = document.querySelectorAll('#teacher-form input, #teacher-form select');
  inputs.forEach(input => {
    input.addEventListener('input', handleTeacherInputChange);
  });
}

async function handleTeacherSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const teacherData = {
    title: formData.get('title') || '',
    f_name: formData.get('f_name')?.trim() || '',
    l_name: formData.get('l_name')?.trim() || '',
    email: formData.get('email')?.trim() || '',
    phone: formData.get('phone')?.trim() || '',
    subject_group: formData.get('subject_group')?.trim() || '',
    role: formData.get('role') || 'teacher'
  };

  if (!teacherData.f_name || !teacherData.l_name) {
    showTeachersError('กรุณาระบุชื่อและนามสกุลของครู');
    alert('กรุณาระบุชื่อและนามสกุลของครู');
    return;
  }

  if (adminState.editingTeacher) {
    await updateTeacher(adminState.editingTeacher.id, teacherData);
  } else {
    await addNewTeacher(teacherData);
  }

  clearTeacherForm();
  renderTeachersTable();
}

function handleTeacherInputChange() {
  const form = document.getElementById('teacher-form');
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;

  const firstName = form.querySelector('input[name="f_name"]')?.value.trim();
  const lastName = form.querySelector('input[name="l_name"]')?.value.trim();

  submitButton.disabled = !(firstName && lastName);
}

function handleCancelTeacherEdit() {
  if (!adminState.editingTeacher) return;

  adminState.editingTeacher = null;
  clearTeacherForm();

  const cancelEditBtn = document.getElementById('cancel-teacher-edit');
  if (cancelEditBtn) {
    cancelEditBtn.classList.add('hidden');
  }

  const submitButton = document.querySelector('#teacher-form button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'เพิ่มครูใหม่';
  }
}

function clearTeacherForm() {
  const form = document.getElementById('teacher-form');
  if (!form) return;

  form.reset();
  adminState.editingTeacher = null;

  const cancelEditBtn = document.getElementById('cancel-teacher-edit');
  if (cancelEditBtn) {
    cancelEditBtn.classList.add('hidden');
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'เพิ่มครูใหม่';
    submitButton.disabled = true;
  }
}

function populateTeacherForm(teacher) {
  const form = document.getElementById('teacher-form');
  if (!form) return;

  form.querySelector('input[name="title"]')?.setAttribute('value', teacher.title || '');
  form.querySelector('input[name="f_name"]')?.setAttribute('value', teacher.f_name || '');
  form.querySelector('input[name="l_name"]')?.setAttribute('value', teacher.l_name || '');
  form.querySelector('input[name="email"]')?.setAttribute('value', teacher.email || '');
  form.querySelector('input[name="phone"]')?.setAttribute('value', teacher.phone || '');
  form.querySelector('input[name="subject_group"]')?.setAttribute('value', teacher.subject_group || '');

  const roleSelect = form.querySelector('select[name="role"]');
  if (roleSelect) {
    roleSelect.value = teacher.role || 'teacher';
  }
}

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

function handleTableAction(event) {
  const action = event.target.dataset.action;
  const teacherId = parseInt(event.target.dataset.teacherId, 10);

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

function handleSelectAll(event) {
  const checkboxes = document.querySelectorAll('.teacher-row-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = event.target.checked;
  });
  updateBulkActionButtons();
}

async function handleDeleteSelected() {
  const selectedIds = getSelectedTeacherIds();
  if (selectedIds.length === 0) return;

  if (window.confirm(`ต้องการลบครู ${selectedIds.length} คนที่เลือกหรือไม่?`)) {
    for (const id of selectedIds) {
      await deleteTeacher(id, false);
    }
    renderTeachersTable();
  }
}

function handleExportTeachers() {
  alert('ฟีเจอร์ส่งออกจะพัฒนาในเร็วๆ นี้');
}

function handleSearch(event) {
  adminState.searchTerm = event.target.value.toLowerCase();
  adminState.currentPage = 1;
  renderTeachersTable();
}

async function handleRefresh() {
  await loadTeachersData();
  renderTeachersTable();
  document.dispatchEvent(new CustomEvent(REFRESH_REQUEST_EVENT, {
    detail: { source: 'teacher-management' }
  }));
}

function handleItemsPerPageChange(event) {
  adminState.itemsPerPage = parseInt(event.target.value, 10);
  adminState.currentPage = 1;
  renderTeachersTable();
}

function handleColumnSort(event) {
  const column = event.target.dataset.column;
  const columnName = event.target.textContent.trim();
  if (!column) return;

  if (adminState.sortColumn === column) {
    adminState.sortDirection = adminState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    adminState.sortColumn = column;
    adminState.sortDirection = 'asc';
  }

  showSortingFeedback(columnName, adminState.sortDirection);
  renderTeachersTable();
}

function editTeacher(id) {
  const teacher = adminState.teachers.find(t => t.id === id);
  if (!teacher) {
    showTeachersError('ไม่พบข้อมูลครูที่ต้องการแก้ไข');
    return;
  }

  adminState.editingTeacher = teacher;
  populateTeacherForm(teacher);

  const cancelEditBtn = document.getElementById('cancel-teacher-edit');
  if (cancelEditBtn) {
    cancelEditBtn.classList.remove('hidden');
  }

  const submitButton = document.querySelector('#teacher-form button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'บันทึกการแก้ไข';
  }
}

function viewTeacher(id) {
  const teacher = adminState.teachers.find(t => t.id === id);
  if (!teacher) {
    showTeachersError('ไม่พบข้อมูลครูที่ต้องการดู');
    return;
  }

  const fullName = getFullName(teacher);
  alert(`รายละเอียดครู:\n\nชื่อ: ${fullName}\nอีเมล: ${teacher.email || 'ไม่ระบุ'}\nเบอร์: ${teacher.phone || 'ไม่ระบุ'}\nกลุ่มสาระ: ${teacher.subject_group}\nบทบาท: ${getRoleDisplayName(teacher.role)}`);
}

function renderTeachersTable() {
  console.log('🎨 Rendering teachers table with', adminState.teachers.length, 'teachers');

  const tableBody = document.getElementById('teachers-table-body');
  if (!tableBody) {
    console.error('❌ Teachers table body not found!');
    return;
  }

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

  filteredTeachers.sort((a, b) => {
    let aValue = a[adminState.sortColumn];
    let bValue = b[adminState.sortColumn];

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

  const totalItems = filteredTeachers.length;
  const totalPages = Math.ceil(totalItems / adminState.itemsPerPage);
  const startIndex = (adminState.currentPage - 1) * adminState.itemsPerPage;
  const endIndex = startIndex + adminState.itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex);

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
  return Array.from(checkboxes).map(cb => parseInt(cb.dataset.teacherId, 10));
}

function changePage(newPage) {
  const totalItems = adminState.teachers.filter(teacher => {
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
  }).length;

  const totalPages = Math.ceil(totalItems / adminState.itemsPerPage);

  if (newPage >= 1 && newPage <= totalPages) {
    adminState.currentPage = newPage;
    renderTeachersTable();
  }
}

function initKeyboardNavigation() {
  document.addEventListener('keydown', handleTableKeyboardNavigation);
}

function handleTableKeyboardNavigation(event) {
  const activeElement = document.activeElement;
  const isTableContext = activeElement?.closest('.teacher-data-grid') ||
    activeElement?.closest('.data-table') ||
    activeElement?.id === 'teacher-search';

  if (!isTableContext) return;

  switch (event.key) {
    case 'F3':
    case '/':
      event.preventDefault();
      focusSearchInput();
      break;
    case 'Escape':
      event.preventDefault();
      clearSearchAndFocus();
      break;
    case 'F5':
    case 'r':
      if (event.ctrlKey) {
        event.preventDefault();
        handleRefresh();
      }
      break;
    case 'Delete':
      if (event.ctrlKey) {
        event.preventDefault();
        handleDeleteSelected();
      }
      break;
    case 'a':
      if (event.ctrlKey) {
        event.preventDefault();
        toggleSelectAll();
      }
      break;
    case 'n':
      if (event.ctrlKey) {
        event.preventDefault();
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

export function showShortcutsModal() {
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

  document.getElementById('shortcuts-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'shortcuts-modal') {
      closeShortcutsModal();
    }
  });

  document.addEventListener('keydown', function escapeHandler(event) {
    if (event.key === 'Escape') {
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

export function initResizableColumns() {
  const table = document.getElementById('teachers-table');
  if (!table) return;

  const headers = table.querySelectorAll('th');
  let isResizing = false;
  let currentHeader = null;
  let startX = 0;
  let startWidth = 0;

  headers.forEach((header, index) => {
    if (index === headers.length - 1) return;

    header.addEventListener('mousedown', (event) => {
      const rect = header.getBoundingClientRect();
      const isResizeArea = event.clientX >= rect.right - 5;

      if (isResizeArea) {
        event.preventDefault();
        isResizing = true;
        currentHeader = header;
        startX = event.clientX;
        startWidth = header.offsetWidth;

        header.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    });

    header.addEventListener('mousemove', (event) => {
      if (isResizing) return;

      const rect = header.getBoundingClientRect();
      const isResizeArea = event.clientX >= rect.right - 5;

      header.style.cursor = isResizeArea ? 'col-resize' : 'default';
    });

    header.addEventListener('mouseleave', () => {
      if (!isResizing) {
        header.style.cursor = 'default';
      }
    });
  });

  function handleMouseMove(event) {
    if (!isResizing || !currentHeader) return;

    const diff = event.clientX - startX;
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

export {
  bindTeacherFormEvents,
  bindTeacherTableEvents,
  bindTeacherSearchEvents,
  bindTeacherPaginationEvents,
  renderTeachersTable
};
