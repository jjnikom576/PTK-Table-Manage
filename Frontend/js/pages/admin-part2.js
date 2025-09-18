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
  renderTeachersTable();
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
      const fullName = `${firstName} ${lastName}`;
      
      return `
        <tr class="teacher-row" data-teacher-id="${teacher.id}">
          <td style="padding: 0.75rem; text-align: center;">
            <input type="checkbox" class="teacher-row-checkbox" data-teacher-id="${teacher.id}">
          </td>
          <td style="padding: 0.75rem; text-align: center;">${teacher.id}</td>
          <td style="padding: 0.75rem;">${firstName}</td>
          <td style="padding: 0.75rem;">${lastName}</td>
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
    const searchableText = [teacher.f_name, teacher.l_name, teacher.email, teacher.phone, teacher.subject_group].join(' ').toLowerCase();
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
  
  dataSubNavTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      dataSubNavTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      const dataSubPages = document.querySelectorAll('.data-sub-page');
      dataSubPages.forEach(page => {
        page.classList.add('hidden');
      });
      
      const targetId = tab.getAttribute('data-target');
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
      }
    });
  });
  
  const activeTab = document.querySelector('.data-sub-nav-tab.active');
  if (!activeTab && dataSubNavTabs.length > 0) {
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
