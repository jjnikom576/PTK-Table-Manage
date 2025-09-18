// Classes Management Module
// Similar to teacher management but for classes (ชั้นเรียน)
// Fixed import for showLoading/hideLoading

import { showLoading, hideLoading } from './pages/admin.js';

// Global helper fallback
if (typeof window.showLoading === 'undefined') {
  window.showLoading = showLoading;
  window.hideLoading = hideLoading;
  window.showToast = function(message, type = 'info') {
    console.log(`📱 Toast (${type}): ${message}`);
  };
}

// Global state for classes
let currentClassesData = [];
let filteredClassesData = [];
let currentClassPage = 1;
let classesPerPage = 10;
let classesSortConfig = { key: 'id', direction: 'asc' };

// Class management initialization
function initClassManagement() {
  console.log('🏫 Initializing class management...');
  
  // Bind form events
  bindClassFormEvents();
  
  // Bind table events  
  bindClassTableEvents();
  
  // Load initial data
  loadClassesData();
  
  console.log('✅ Class management initialized');
}

function bindClassFormEvents() {
  // Class form submission
  const classForm = document.getElementById('class-form');
  if (classForm) {
    classForm.addEventListener('submit', handleClassFormSubmit);
  }
  
  // Real-time validation for combination checking
  const gradeSelect = document.getElementById('class-grade');
  const sectionInput = document.getElementById('class-section');
  
  if (gradeSelect && sectionInput) {
    gradeSelect.addEventListener('change', checkClassCombination);
    sectionInput.addEventListener('input', checkClassCombination);
    sectionInput.addEventListener('blur', checkClassCombination);
  }
}

function bindClassTableEvents() {
  // Search
  const searchInput = document.getElementById('class-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleClassSearch, 300));
  }
  
  const searchBtn = document.getElementById('search-classes');
  if (searchBtn) {
    searchBtn.addEventListener('click', handleClassSearch);
  }
  
  // Pagination
  const prevBtn = document.getElementById('prev-page-classes');
  const nextBtn = document.getElementById('next-page-classes');
  
  if (prevBtn) prevBtn.addEventListener('click', () => changeClassPage(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeClassPage(1));
  
  // Per page selector
  const perPageSelect = document.getElementById('entries-per-page-classes');
  if (perPageSelect) {
    perPageSelect.addEventListener('change', handleClassesPerPageChange);
  }
  
  // Table actions (will be bound dynamically)
  const table = document.getElementById('classes-table');
  if (table) {
    table.addEventListener('click', handleClassTableAction);
  }
  
  // Bulk actions
  const bulkSelectAll = document.getElementById('bulk-select-all-classes');
  const bulkDelete = document.getElementById('bulk-delete-classes');
  
  if (bulkSelectAll) {
    bulkSelectAll.addEventListener('change', handleClassBulkSelectAll);
  }
  
  if (bulkDelete) {
    bulkDelete.addEventListener('click', handleClassBulkDelete);
  }
  
  // Export
  const exportBtn = document.getElementById('export-excel-classes');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportClassesToExcel);
  }
  
  // Sorting
  const sortableHeaders = document.querySelectorAll('#classes-table th[data-sortable]');
  sortableHeaders.forEach(header => {
    header.addEventListener('click', handleClassSort);
  });
}

// Form validation
function checkClassCombination() {
  const gradeSelect = document.getElementById('class-grade');
  const sectionInput = document.getElementById('class-section');
  
  if (!gradeSelect || !sectionInput) return;
  
  const grade = gradeSelect.value.trim();
  const section = sectionInput.value.trim();
  
  // Clear previous validation
  sectionInput.classList.remove('valid', 'invalid');
  
  if (!grade || !section) {
    return; // Both fields required, let HTML validation handle it
  }
  
  const className = `${grade}/${section}`;
  
  // Check for duplicates
  const isDuplicate = currentClassesData.some(cls => 
    cls.class_name.toLowerCase() === className.toLowerCase()
  );
  
  if (isDuplicate) {
    sectionInput.classList.add('invalid');
    showValidationMessage(sectionInput, `❌ ชั้น ${className} มีอยู่แล้ว`, 'error');
  } else {
    sectionInput.classList.add('valid');
    showValidationMessage(sectionInput, `✅ ${className} สามารถใช้ได้`, 'success');
  }
}

function showValidationMessage(input, message, type) {
  // Remove existing message
  const existingMsg = input.parentElement.querySelector('.validation-message');
  if (existingMsg) {
    existingMsg.remove();
  }
  
  // Add new message
  const msgElement = document.createElement('small');
  msgElement.className = `validation-message ${type}`;
  msgElement.textContent = message;
  input.parentElement.appendChild(msgElement);
  
  // Auto remove after 3 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      if (msgElement.parentElement) {
        msgElement.remove();
      }
    }, 3000);
  }
}

// Form submission
async function handleClassFormSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const grade = formData.get('grade_level').trim();
  const section = formData.get('section').trim();
  
  // Final validation
  if (!validateClassDataFinal(grade, section)) {
    return;
  }
  
  const className = `${grade}/${section}`;
  
  try {
    showLoading('กำลังเพิ่มชั้นเรียน...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add to current data (simulate successful creation)
    const newClass = {
      id: Math.max(...currentClassesData.map(c => c.id || 0), 0) + 1,
      class_name: className,
      created_at: new Date().toISOString(),
      semester_id: getCurrentSemesterId() // From global context
    };
    
    currentClassesData.unshift(newClass);
    
    // Reset form
    e.target.reset();
    
    // Refresh table
    applyClassFiltersAndSort();
    
    showToast(`เพิ่มชั้น ${className} เรียบร้อยแล้ว`, 'success');
    
  } catch (error) {
    console.error('Error adding class:', error);
    showToast('เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน', 'error');
  } finally {
    hideLoading();
  }
}

function validateClassDataFinal(grade, section) {
  if (!grade) {
    showToast('กรุณาเลือกชั้น', 'error');
    return false;
  }
  
  if (!section) {
    showToast('กรุณากรอกห้อง', 'error');
    return false;
  }
  
  const sectionNum = parseInt(section);
  if (isNaN(sectionNum) || sectionNum < 1 || sectionNum > 20) {
    showToast('ห้องต้องเป็นตัวเลข 1-20', 'error');
    return false;
  }
  
  const className = `${grade}/${section}`;
  const isDuplicate = currentClassesData.some(cls => 
    cls.class_name.toLowerCase() === className.toLowerCase()
  );
  
  if (isDuplicate) {
    showToast(`ชั้น ${className} มีอยู่แล้ว`, 'error');
    return false;
  }
  
  return true;
}

// Data loading
async function loadClassesData() {
  try {
    showLoading('กำลังโหลดข้อมูลชั้นเรียน...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock data
    currentClassesData = [
      {
        id: 1,
        class_name: 'ม.1/1',
        created_at: '2024-01-15T10:30:00Z',
        semester_id: 1
      },
      {
        id: 2,
        class_name: 'ม.1/2',
        created_at: '2024-01-15T10:31:00Z',
        semester_id: 1
      },
      {
        id: 3,
        class_name: 'ม.2/1',
        created_at: '2024-01-15T10:32:00Z',
        semester_id: 1
      },
      {
        id: 4,
        class_name: 'ม.3/1',
        created_at: '2024-01-15T10:33:00Z',
        semester_id: 1
      }
    ];
    
    // Apply initial filters
    applyClassFiltersAndSort();
    
  } catch (error) {
    console.error('Error loading classes:', error);
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
  } finally {
    hideLoading();
  }
}

// Search and filtering
function handleClassSearch() {
  const searchTerm = document.getElementById('class-search').value.trim().toLowerCase();
  
  if (searchTerm === '') {
    filteredClassesData = [...currentClassesData];
  } else {
    filteredClassesData = currentClassesData.filter(cls =>
      cls.class_name.toLowerCase().includes(searchTerm) ||
      cls.id.toString().includes(searchTerm)
    );
  }
  
  currentClassPage = 1;
  renderClassesTable();
  updateClassPaginationInfo();
}

// Sorting
function handleClassSort(e) {
  const sortKey = e.target.dataset.sortKey;
  if (!sortKey) return;
  
  // Toggle direction if same key
  if (classesSortConfig.key === sortKey) {
    classesSortConfig.direction = classesSortConfig.direction === 'asc' ? 'desc' : 'asc';
  } else {
    classesSortConfig.key = sortKey;
    classesSortConfig.direction = 'asc';
  }
  
  applyClassFiltersAndSort();
  updateClassSortIndicators();
}

function applyClassFiltersAndSort() {
  // Apply search filter
  handleClassSearch();
  
  // Apply sorting
  filteredClassesData.sort((a, b) => {
    let aVal = a[classesSortConfig.key];
    let bVal = b[classesSortConfig.key];
    
    // Handle different data types
    if (classesSortConfig.key === 'created_at') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    let result = 0;
    if (aVal < bVal) result = -1;
    if (aVal > bVal) result = 1;
    
    return classesSortConfig.direction === 'desc' ? -result : result;
  });
  
  renderClassesTable();
  updateClassPaginationInfo();
}

function updateClassSortIndicators() {
  // Clear all sort indicators
  document.querySelectorAll('#classes-table th[data-sortable]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });
  
  // Add indicator to current sort column
  const currentHeader = document.querySelector(
    `#classes-table th[data-sort-key="${classesSortConfig.key}"]`
  );
  if (currentHeader) {
    currentHeader.classList.add(`sort-${classesSortConfig.direction}`);
  }
}

// Table rendering
function renderClassesTable() {
  const tableBody = document.getElementById('classes-table-body');
  if (!tableBody) return;
  
  const startIndex = (currentClassPage - 1) * classesPerPage;
  const endIndex = startIndex + classesPerPage;
  const paginatedClasses = filteredClassesData.slice(startIndex, endIndex);
  
  if (paginatedClasses.length === 0) {
    tableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="5" style="text-align: center; padding: 2rem; color: #666;">
          ไม่พบข้อมูลชั้นเรียน
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = paginatedClasses.map(cls => {
      const createdDate = new Date(cls.created_at).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      return `
        <tr class="class-row" data-class-id="${cls.id}">
          <td style="padding: 0.75rem; text-align: center;">
            <input type="checkbox" class="class-row-checkbox" data-class-id="${cls.id}">
          </td>
          <td style="padding: 0.75rem; text-align: center;">${cls.id}</td>
          <td style="padding: 0.75rem;" class="cell-full">${cls.class_name}</td>
          <td style="padding: 0.75rem;" class="cell-full">${createdDate}</td>
          <td style="padding: 0.75rem; text-align: center; white-space: nowrap; vertical-align: middle;">
            <div class="actions-container">
              <button type="button" class="btn btn--sm btn--danger" 
                      data-action="delete" data-class-id="${cls.id}" 
                      title="ลบชั้นเรียน ${cls.class_name}">
                🗑️ ลบ
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // Update row selection
  updateClassBulkActionButtons();
}

// Pagination
function changeClassPage(delta) {
  const totalPages = Math.ceil(filteredClassesData.length / classesPerPage);
  const newPage = currentClassPage + delta;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentClassPage = newPage;
    renderClassesTable();
    updateClassPaginationInfo();
  }
}

function handleClassesPerPageChange(e) {
  classesPerPage = parseInt(e.target.value);
  currentClassPage = 1;
  renderClassesTable();
  updateClassPaginationInfo();
}

function updateClassPaginationInfo() {
  const totalPages = Math.ceil(filteredClassesData.length / classesPerPage);
  const pageInfo = document.getElementById('page-info-classes');
  const prevBtn = document.getElementById('prev-page-classes');
  const nextBtn = document.getElementById('next-page-classes');
  
  if (pageInfo) {
    pageInfo.textContent = `หน้า ${currentClassPage} จาก ${totalPages} (${filteredClassesData.length} รายการ)`;
  }
  
  if (prevBtn) {
    prevBtn.disabled = currentClassPage <= 1;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentClassPage >= totalPages;
  }
}

// Table actions
function handleClassTableAction(e) {
  const action = e.target.dataset.action;
  const classId = parseInt(e.target.dataset.classId);
  
  if (action === 'delete' && classId) {
    handleDeleteClass(classId);
  }
}

async function handleDeleteClass(classId) {
  const classData = currentClassesData.find(cls => cls.id === classId);
  if (!classData) return;
  
  const confirmed = confirm(`ต้องการลบชั้นเรียน "${classData.class_name}" หรือไม่?\n\nการลบนี้ไม่สามารถยกเลิกได้`);
  
  if (!confirmed) return;
  
  try {
    showLoading('กำลังลบชั้นเรียน...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove from current data
    currentClassesData = currentClassesData.filter(cls => cls.id !== classId);
    
    // Refresh table
    applyClassFiltersAndSort();
    
    showToast(`ลบชั้นเรียน "${classData.class_name}" เรียบร้อยแล้ว`, 'success');
    
  } catch (error) {
    console.error('Error deleting class:', error);
    showToast('เกิดข้อผิดพลาดในการลบชั้นเรียน', 'error');
  } finally {
    hideLoading();
  }
}

// Bulk actions
function handleClassBulkSelectAll(e) {
  const isChecked = e.target.checked;
  const checkboxes = document.querySelectorAll('.class-row-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
  });
  
  updateClassBulkActionButtons();
}

function updateClassBulkActionButtons() {
  const selectedCheckboxes = document.querySelectorAll('.class-row-checkbox:checked');
  const bulkDeleteBtn = document.getElementById('bulk-delete-classes');
  const bulkSelectAll = document.getElementById('bulk-select-all-classes');
  
  if (bulkDeleteBtn) {
    bulkDeleteBtn.disabled = selectedCheckboxes.length === 0;
    bulkDeleteBtn.textContent = selectedCheckboxes.length > 0 
      ? `🗑️ ลบที่เลือก (${selectedCheckboxes.length})` 
      : '🗑️ ลบที่เลือก';
  }
  
  if (bulkSelectAll) {
    const allCheckboxes = document.querySelectorAll('.class-row-checkbox');
    bulkSelectAll.checked = allCheckboxes.length > 0 && selectedCheckboxes.length === allCheckboxes.length;
    bulkSelectAll.indeterminate = selectedCheckboxes.length > 0 && selectedCheckboxes.length < allCheckboxes.length;
  }
}

async function handleClassBulkDelete() {
  const selectedCheckboxes = document.querySelectorAll('.class-row-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    showToast('กรุณาเลือกชั้นเรียนที่ต้องการลบ', 'warning');
    return;
  }
  
  const classIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.classId));
  const classNames = classIds.map(id => {
    const cls = currentClassesData.find(c => c.id === id);
    return cls ? cls.class_name : '';
  }).filter(name => name);
  
  const confirmed = confirm(
    `ต้องการลบชั้นเรียนที่เลือก ${classIds.length} รายการหรือไม่?\n\n` +
    `${classNames.join(', ')}\n\n` +
    `การลบนี้ไม่สามารถยกเลิกได้`
  );
  
  if (!confirmed) return;
  
  try {
    showLoading('กำลังลบชั้นเรียนที่เลือก...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Remove from current data
    currentClassesData = currentClassesData.filter(cls => !classIds.includes(cls.id));
    
    // Refresh table
    applyClassFiltersAndSort();
    
    showToast(`ลบชั้นเรียน ${classIds.length} รายการเรียบร้อยแล้ว`, 'success');
    
  } catch (error) {
    console.error('Error bulk deleting classes:', error);
    showToast('เกิดข้อผิดพลาดในการลบชั้นเรียน', 'error');
  } finally {
    hideLoading();
  }
}

// Export functionality
function exportClassesToExcel() {
  try {
    // Create CSV content
    const headers = ['ID', 'ชื่อชั้นเรียน', 'วันที่เพิ่ม'];
    const csvContent = [
      headers.join(','),
      ...filteredClassesData.map(cls => [
        cls.id,
        `"${cls.class_name}"`,
        `"${new Date(cls.created_at).toLocaleDateString('th-TH')}"`
      ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `classes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('ส่งออกข้อมูลชั้นเรียนเรียบร้อยแล้ว', 'success');
    
  } catch (error) {
    console.error('Error exporting classes:', error);
    showToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'error');
  }
}

// Utility function (should be available globally)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize when the tab becomes active
document.addEventListener('DOMContentLoaded', () => {
  // Listen for tab changes
  const addClassTab = document.getElementById('tab-add-class');
  if (addClassTab) {
    addClassTab.addEventListener('click', () => {
      // Delay initialization to ensure DOM is ready
      setTimeout(initClassManagement, 100);
    });
  }
});

// Export functions for global access
window.initClassManagement = initClassManagement;
window.loadClassesData = loadClassesData;
