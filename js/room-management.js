// Room Management Module
// Full CRUD operations for rooms (ห้องเรียน)

// Global state for rooms
let currentRoomsData = [];
let filteredRoomsData = [];
let currentRoomPage = 1;
let roomsPerPage = 10;
let roomsSortConfig = { key: 'id', direction: 'asc' };

// Room management initialization
function initRoomManagement() {
  console.log('🏠 Initializing room management...');
  
  // Bind form events
  bindRoomFormEvents();
  
  // Bind table events  
  bindRoomTableEvents();
  
  // Bind modal events
  bindRoomModalEvents();
  
  // Load initial data
  loadRoomsData();
  
  console.log('✅ Room management initialized');
}

function bindRoomFormEvents() {
  // Room form submission (Add new room)
  const roomForm = document.getElementById('room-form');
  if (roomForm) {
    roomForm.addEventListener('submit', handleRoomFormSubmit);
  }
  
  // Edit room form submission
  const editRoomForm = document.getElementById('edit-room-form');
  if (editRoomForm) {
    editRoomForm.addEventListener('submit', handleEditRoomFormSubmit);
  }
  
  // Real-time validation for room name checking
  const roomNameInput = document.getElementById('room-name');
  if (roomNameInput) {
    roomNameInput.addEventListener('blur', checkRoomNameDuplicate);
  }
}

function bindRoomTableEvents() {
  // Search
  const searchInput = document.getElementById('room-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleRoomSearch, 300));
  }
  
  const searchBtn = document.getElementById('search-rooms');
  if (searchBtn) {
    searchBtn.addEventListener('click', handleRoomSearch);
  }
  
  // Pagination
  const prevBtn = document.getElementById('prev-page-rooms');
  const nextBtn = document.getElementById('next-page-rooms');
  
  if (prevBtn) prevBtn.addEventListener('click', () => changeRoomPage(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeRoomPage(1));
  
  // Per page selector
  const perPageSelect = document.getElementById('entries-per-page-rooms');
  if (perPageSelect) {
    perPageSelect.addEventListener('change', handleRoomsPerPageChange);
  }
  
  // Table actions (will be bound dynamically)
  const table = document.getElementById('rooms-table');
  if (table) {
    table.addEventListener('click', handleRoomTableAction);
  }
  
  // Bulk actions
  const bulkSelectAll = document.getElementById('bulk-select-all-rooms');
  const bulkDelete = document.getElementById('bulk-delete-rooms');
  
  if (bulkSelectAll) {
    bulkSelectAll.addEventListener('change', handleRoomBulkSelectAll);
  }
  
  if (bulkDelete) {
    bulkDelete.addEventListener('click', handleRoomBulkDelete);
  }
  
  // Export
  const exportBtn = document.getElementById('export-excel-rooms');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportRoomsToExcel);
  }
  
  // Sorting
  const sortableHeaders = document.querySelectorAll('#rooms-table th[data-sortable]');
  sortableHeaders.forEach(header => {
    header.addEventListener('click', handleRoomSort);
  });
}

function bindRoomModalEvents() {
  // Modal close buttons
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Modal close X buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Delete confirmation
  const confirmDeleteBtn = document.getElementById('confirm-delete-room');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', confirmRoomDelete);
  }
  
  // Edit from view modal
  const editFromViewBtn = document.getElementById('edit-from-view-room');
  if (editFromViewBtn) {
    editFromViewBtn.addEventListener('click', editRoomFromView);
  }
  
  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
}

// Form validation
function checkRoomNameDuplicate() {
  const roomNameInput = document.getElementById('room-name');
  if (!roomNameInput) return;
  
  const roomName = roomNameInput.value.trim();
  
  // Clear previous validation
  roomNameInput.classList.remove('valid', 'invalid');
  
  if (!roomName) return;
  
  // Check for duplicates
  const isDuplicate = currentRoomsData.some(room => 
    room.room_name.toLowerCase() === roomName.toLowerCase()
  );
  
  if (isDuplicate) {
    roomNameInput.classList.add('invalid');
    showValidationMessage(roomNameInput, `❌ ห้อง "${roomName}" มีอยู่แล้ว`, 'error');
  } else {
    roomNameInput.classList.add('valid');
    showValidationMessage(roomNameInput, `✅ "${roomName}" สามารถใช้ได้`, 'success');
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

// Form submission - Add new room
async function handleRoomFormSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const roomName = formData.get('room_name').trim();
  const roomType = formData.get('room_type').trim();
  
  // Final validation
  if (!validateRoomDataFinal(roomName, roomType)) {
    return;
  }
  
  try {
    showLoading('กำลังเพิ่มห้องเรียน...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add to current data (simulate successful creation)
    const newRoom = {
      id: Math.max(...currentRoomsData.map(r => r.id || 0), 0) + 1,
      room_name: roomName,
      room_type: roomType,
      created_at: new Date().toISOString(),
      semester_id: getCurrentSemesterId() // From global context
    };
    
    currentRoomsData.unshift(newRoom);
    
    // Reset form
    e.target.reset();
    
    // Clear validation messages
    document.querySelectorAll('.validation-message').forEach(msg => msg.remove());
    
    // Refresh table
    applyRoomFiltersAndSort();
    
    showToast(`เพิ่มห้อง "${roomName}" เรียบร้อยแล้ว`, 'success');
    
  } catch (error) {
    console.error('Error adding room:', error);
    showToast('เกิดข้อผิดพลาดในการเพิ่มห้องเรียน', 'error');
  } finally {
    hideLoading();
  }
}

// Form submission - Edit room
async function handleEditRoomFormSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const roomId = parseInt(formData.get('id'));
  const roomName = formData.get('room_name').trim();
  const roomType = formData.get('room_type').trim();
  
  // Find existing room
  const existingRoom = currentRoomsData.find(r => r.id === roomId);
  if (!existingRoom) {
    showToast('ไม่พบข้อมูลห้องเรียน', 'error');
    return;
  }
  
  // Check for duplicates (excluding current room)
  const isDuplicate = currentRoomsData.some(room => 
    room.id !== roomId && room.room_name.toLowerCase() === roomName.toLowerCase()
  );
  
  if (isDuplicate) {
    showToast(`ห้อง "${roomName}" มีอยู่แล้ว`, 'error');
    return;
  }
  
  if (!validateRoomDataFinal(roomName, roomType, roomId)) {
    return;
  }
  
  try {
    showLoading('กำลังแก้ไขห้องเรียน...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update room data
    existingRoom.room_name = roomName;
    existingRoom.room_type = roomType;
    existingRoom.updated_at = new Date().toISOString();
    
    // Close modal
    closeAllModals();
    
    // Refresh table
    applyRoomFiltersAndSort();
    
    showToast(`แก้ไขห้อง "${roomName}" เรียบร้อยแล้ว`, 'success');
    
  } catch (error) {
    console.error('Error editing room:', error);
    showToast('เกิดข้อผิดพลาดในการแก้ไขห้องเรียน', 'error');
  } finally {
    hideLoading();
  }
}

function validateRoomDataFinal(roomName, roomType, excludeId = null) {
  if (!roomName) {
    showToast('กรุณากรอกชื่อห้อง', 'error');
    return false;
  }
  
  if (!roomType) {
    showToast('กรุณาเลือกประเภทห้อง', 'error');
    return false;
  }
  
  // Check duplicates
  const isDuplicate = currentRoomsData.some(room => 
    room.id !== excludeId && room.room_name.toLowerCase() === roomName.toLowerCase()
  );
  
  if (isDuplicate) {
    showToast(`ห้อง "${roomName}" มีอยู่แล้ว`, 'error');
    return false;
  }
  
  return true;
}

// Data loading
async function loadRoomsData() {
  try {
    showLoading('กำลังโหลดข้อมูลห้องเรียน...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock data
    currentRoomsData = [
      {
        id: 1,
        room_name: 'ห้อง 401',
        room_type: 'ทั่วไป',
        created_at: '2024-01-15T10:30:00Z',
        semester_id: 1
      },
      {
        id: 2,
        room_name: 'ห้อง 402',
        room_type: 'ทั่วไป',
        created_at: '2024-01-15T10:31:00Z',
        semester_id: 1
      },
      {
        id: 3,
        room_name: 'ห้องปฏิบัติการคอมพิวเตอร์ 1',
        room_type: 'ปฏิบัติการคอมพิวเตอร์',
        created_at: '2024-01-15T10:32:00Z',
        semester_id: 1
      },
      {
        id: 4,
        room_name: 'ห้องปฏิบัติการฟิสิกส์',
        room_type: 'ปฏิบัติการคอมพิวเตอร์',
        created_at: '2024-01-15T10:33:00Z',
        semester_id: 1
      }
    ];
    
    // Apply initial filters
    applyRoomFiltersAndSort();
    
  } catch (error) {
    console.error('Error loading rooms:', error);
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
  } finally {
    hideLoading();
  }
}

// Search and filtering
function handleRoomSearch() {
  const searchTerm = document.getElementById('room-search').value.trim().toLowerCase();
  
  if (searchTerm === '') {
    filteredRoomsData = [...currentRoomsData];
  } else {
    filteredRoomsData = currentRoomsData.filter(room =>
      room.room_name.toLowerCase().includes(searchTerm) ||
      room.room_type.toLowerCase().includes(searchTerm) ||
      room.id.toString().includes(searchTerm)
    );
  }
  
  currentRoomPage = 1;
  renderRoomsTable();
  updateRoomPaginationInfo();
}

// Sorting
function handleRoomSort(e) {
  const sortKey = e.target.dataset.sortKey;
  if (!sortKey) return;
  
  // Toggle direction if same key
  if (roomsSortConfig.key === sortKey) {
    roomsSortConfig.direction = roomsSortConfig.direction === 'asc' ? 'desc' : 'asc';
  } else {
    roomsSortConfig.key = sortKey;
    roomsSortConfig.direction = 'asc';
  }
  
  applyRoomFiltersAndSort();
  updateRoomSortIndicators();
}

function applyRoomFiltersAndSort() {
  // Apply search filter
  handleRoomSearch();
  
  // Apply sorting
  filteredRoomsData.sort((a, b) => {
    let aVal = a[roomsSortConfig.key];
    let bVal = b[roomsSortConfig.key];
    
    // Handle different data types
    if (roomsSortConfig.key === 'created_at') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    let result = 0;
    if (aVal < bVal) result = -1;
    if (aVal > bVal) result = 1;
    
    return roomsSortConfig.direction === 'desc' ? -result : result;
  });
  
  renderRoomsTable();
  updateRoomPaginationInfo();
}

function updateRoomSortIndicators() {
  // Clear all sort indicators
  document.querySelectorAll('#rooms-table th[data-sortable]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });
  
  // Add indicator to current sort column
  const currentHeader = document.querySelector(
    `#rooms-table th[data-sort-key="${roomsSortConfig.key}"]`
  );
  if (currentHeader) {
    currentHeader.classList.add(`sort-${roomsSortConfig.direction}`);
  }
}

// Table rendering
function renderRoomsTable() {
  const tableBody = document.getElementById('rooms-table-body');
  if (!tableBody) return;
  
  const startIndex = (currentRoomPage - 1) * roomsPerPage;
  const endIndex = startIndex + roomsPerPage;
  const paginatedRooms = filteredRoomsData.slice(startIndex, endIndex);
  
  if (paginatedRooms.length === 0) {
    tableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="6" style="text-align: center; padding: 2rem; color: #666;">
          ไม่พบข้อมูลห้องเรียน
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = paginatedRooms.map(room => {
      const createdDate = new Date(room.created_at).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      return `
        <tr class="room-row" data-room-id="${room.id}">
          <td style="padding: 0.75rem; text-align: center;">
            <input type="checkbox" class="room-row-checkbox" data-room-id="${room.id}">
          </td>
          <td style="padding: 0.75rem; text-align: center;">${room.id}</td>
          <td style="padding: 0.75rem;" class="cell-full">${room.room_name}</td>
          <td style="padding: 0.75rem;" class="cell-full">${room.room_type}</td>
          <td style="padding: 0.75rem;" class="cell-full">${createdDate}</td>
          <td style="padding: 0.75rem; text-align: center; white-space: nowrap; vertical-align: middle;">
            <div class="actions-container">
              <button type="button" class="btn btn--sm btn--outline" 
                      data-action="view" data-room-id="${room.id}" 
                      title="ดูข้อมูลห้อง ${room.room_name}">
                👁️ ดู
              </button>
              <button type="button" class="btn btn--sm btn--primary" 
                      data-action="edit" data-room-id="${room.id}" 
                      title="แก้ไขห้อง ${room.room_name}">
                ✏️ แก้ไข
              </button>
              <button type="button" class="btn btn--sm btn--danger" 
                      data-action="delete" data-room-id="${room.id}" 
                      title="ลบห้อง ${room.room_name}">
                🗑️ ลบ
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // Update row selection
  updateRoomBulkActionButtons();
}

// Pagination
function changeRoomPage(delta) {
  const totalPages = Math.ceil(filteredRoomsData.length / roomsPerPage);
  const newPage = currentRoomPage + delta;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentRoomPage = newPage;
    renderRoomsTable();
    updateRoomPaginationInfo();
  }
}

function handleRoomsPerPageChange(e) {
  roomsPerPage = parseInt(e.target.value);
  currentRoomPage = 1;
  renderRoomsTable();
  updateRoomPaginationInfo();
}

function updateRoomPaginationInfo() {
  const totalPages = Math.ceil(filteredRoomsData.length / roomsPerPage);
  const pageInfo = document.getElementById('page-info-rooms');
  const prevBtn = document.getElementById('prev-page-rooms');
  const nextBtn = document.getElementById('next-page-rooms');
  
  if (pageInfo) {
    pageInfo.textContent = `หน้า ${currentRoomPage} จาก ${totalPages} (${filteredRoomsData.length} รายการ)`;
  }
  
  if (prevBtn) {
    prevBtn.disabled = currentRoomPage <= 1;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentRoomPage >= totalPages;
  }
}

// Table actions
function handleRoomTableAction(e) {
  const action = e.target.dataset.action;
  const roomId = parseInt(e.target.dataset.roomId);
  
  switch (action) {
    case 'view':
      handleViewRoom(roomId);
      break;
    case 'edit':
      handleEditRoom(roomId);
      break;
    case 'delete':
      handleDeleteRoom(roomId);
      break;
  }
}

function handleViewRoom(roomId) {
  const roomData = currentRoomsData.find(room => room.id === roomId);
  if (!roomData) return;
  
  // Populate view modal
  document.getElementById('view-room-id').textContent = roomData.id;
  document.getElementById('view-room-name').textContent = roomData.room_name;
  document.getElementById('view-room-type').textContent = roomData.room_type;
  document.getElementById('view-room-created').textContent = new Date(roomData.created_at).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Store room ID for edit button
  document.getElementById('edit-from-view-room').dataset.roomId = roomId;
  
  // Show modal
  document.getElementById('view-room-modal').classList.remove('hidden');
}

function handleEditRoom(roomId) {
  const roomData = currentRoomsData.find(room => room.id === roomId);
  if (!roomData) return;
  
  // Populate edit modal
  document.getElementById('edit-room-id').value = roomData.id;
  document.getElementById('edit-room-name').value = roomData.room_name;
  document.getElementById('edit-room-type').value = roomData.room_type;
  
  // Show modal
  document.getElementById('edit-room-modal').classList.remove('hidden');
}

function handleDeleteRoom(roomId) {
  const roomData = currentRoomsData.find(room => room.id === roomId);
  if (!roomData) return;
  
  // Populate delete modal
  document.getElementById('delete-room-name').textContent = roomData.room_name;
  document.getElementById('delete-room-type').textContent = `(${roomData.room_type})`;
  
  // Store room ID for confirmation
  document.getElementById('confirm-delete-room').dataset.roomId = roomId;
  
  // Show modal
  document.getElementById('delete-room-modal').classList.remove('hidden');
}

async function confirmRoomDelete() {
  const roomId = parseInt(document.getElementById('confirm-delete-room').dataset.roomId);
  const roomData = currentRoomsData.find(room => room.id === roomId);
  
  if (!roomData) return;
  
  try {
    showLoading('กำลังลบห้องเรียน...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove from current data
    currentRoomsData = currentRoomsData.filter(room => room.id !== roomId);
    
    // Close modal
    closeAllModals();
    
    // Refresh table
    applyRoomFiltersAndSort();
    
    showToast(`ลบห้อง "${roomData.room_name}" เรียบร้อยแล้ว`, 'success');
    
  } catch (error) {
    console.error('Error deleting room:', error);
    showToast('เกิดข้อผิดพลาดในการลบห้องเรียน', 'error');
  } finally {
    hideLoading();
  }
}

function editRoomFromView() {
  const roomId = parseInt(document.getElementById('edit-from-view-room').dataset.roomId);
  closeAllModals();
  setTimeout(() => handleEditRoom(roomId), 100);
}

// Modal management
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.add('hidden');
  });
  
  // Clear validation messages
  document.querySelectorAll('.validation-message').forEach(msg => msg.remove());
}

// Bulk actions
function handleRoomBulkSelectAll(e) {
  const isChecked = e.target.checked;
  const checkboxes = document.querySelectorAll('.room-row-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
  });
  
  updateRoomBulkActionButtons();
}

function updateRoomBulkActionButtons() {
  const selectedCheckboxes = document.querySelectorAll('.room-row-checkbox:checked');
  const bulkDeleteBtn = document.getElementById('bulk-delete-rooms');
  const bulkSelectAll = document.getElementById('bulk-select-all-rooms');
  
  if (bulkDeleteBtn) {
    bulkDeleteBtn.disabled = selectedCheckboxes.length === 0;
    bulkDeleteBtn.textContent = selectedCheckboxes.length > 0 
      ? `🗑️ ลบที่เลือก (${selectedCheckboxes.length})` 
      : '🗑️ ลบที่เลือก';
  }
  
  if (bulkSelectAll) {
    const allCheckboxes = document.querySelectorAll('.room-row-checkbox');
    bulkSelectAll.checked = allCheckboxes.length > 0 && selectedCheckboxes.length === allCheckboxes.length;
    bulkSelectAll.indeterminate = selectedCheckboxes.length > 0 && selectedCheckboxes.length < allCheckboxes.length;
  }
}

async function handleRoomBulkDelete() {
  const selectedCheckboxes = document.querySelectorAll('.room-row-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    showToast('กรุณาเลือกห้องเรียนที่ต้องการลบ', 'warning');
    return;
  }
  
  const roomIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.roomId));
  const roomNames = roomIds.map(id => {
    const room = currentRoomsData.find(r => r.id === id);
    return room ? room.room_name : '';
  }).filter(name => name);
  
  const confirmed = confirm(
    `ต้องการลบห้องเรียนที่เลือก ${roomIds.length} รายการหรือไม่?\n\n` +
    `${roomNames.join(', ')}\n\n` +
    `การลบนี้ไม่สามารถยกเลิกได้`
  );
  
  if (!confirmed) return;
  
  try {
    showLoading('กำลังลบห้องเรียนที่เลือก...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Remove from current data
    currentRoomsData = currentRoomsData.filter(room => !roomIds.includes(room.id));
    
    // Refresh table
    applyRoomFiltersAndSort();
    
    showToast(`ลบห้องเรียน ${roomIds.length} รายการเรียบร้อยแล้ว`, 'success');
    
  } catch (error) {
    console.error('Error bulk deleting rooms:', error);
    showToast('เกิดข้อผิดพลาดในการลบห้องเรียน', 'error');
  } finally {
    hideLoading();
  }
}

// Export functionality
function exportRoomsToExcel() {
  try {
    // Create CSV content
    const headers = ['ID', 'ชื่อห้อง', 'ประเภท', 'วันที่เพิ่ม'];
    const csvContent = [
      headers.join(','),
      ...filteredRoomsData.map(room => [
        room.id,
        `"${room.room_name}"`,
        `"${room.room_type}"`,
        `"${new Date(room.created_at).toLocaleDateString('th-TH')}"`
      ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `rooms_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('ส่งออกข้อมูลห้องเรียนเรียบร้อยแล้ว', 'success');
    
  } catch (error) {
    console.error('Error exporting rooms:', error);
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
  const addRoomTab = document.getElementById('tab-add-room');
  if (addRoomTab) {
    addRoomTab.addEventListener('click', () => {
      // Delay initialization to ensure DOM is ready
      setTimeout(initRoomManagement, 100);
    });
  }
});

// Export functions for global access
window.initRoomManagement = initRoomManagement;
window.loadRoomsData = loadRoomsData;