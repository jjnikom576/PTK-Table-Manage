import scheduleAPI from '../../api/schedule-api.js';
import { getContext } from '../../context/globalContext.js';
import adminState from './state.js';
import { getRoomDisplayNameById } from './entityHelpers.js';

const ROOMS_UPDATED_EVENT = 'admin:rooms-updated';

export async function initRoomManagement() {
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

export async function loadRoomsData() {
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
      document.dispatchEvent(new CustomEvent(ROOMS_UPDATED_EVENT));
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
  if (roomForm && !roomForm.dataset.bound) {
    roomForm.addEventListener('submit', handleRoomSubmit);
    roomForm.dataset.bound = 'true';
  }
}

async function handleRoomSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const roomName = String(formData.get('room_name') || '').trim();
  const roomType = String(formData.get('room_type') || '').trim();

  if (!roomName) {
    showRoomsError('กรุณาระบุชื่อห้องเรียน');
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

export function clearRoomForm() {
  const form = document.getElementById('room-form');
  if (!form) return;

  form.reset();
  adminState.editingRoom = null;

  const header = form.closest('.admin-form-section')?.querySelector('h3');
  if (header) {
    header.textContent = '🏠 เพิ่มห้องเรียน';
  }
}

function bindRoomTableEvents() {
  const table = document.getElementById('rooms-table');
  if (!table || table.dataset.bound === 'true') {
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

export function renderRoomsTable() {
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

export {
  bindRoomFormEvents,
  bindRoomTableEvents,
  deleteRoom,
  updateRoom,
  enterRoomEditMode,
  viewRoomInformation
};
