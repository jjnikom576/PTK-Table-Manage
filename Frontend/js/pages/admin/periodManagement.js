import scheduleAPI from '../../api/schedule-api.js';
import { getContext } from '../../context/globalContext.js';
import adminState from './state.js';

const PERIODS_UPDATED_EVENT = 'admin:periods-updated';

export async function initPeriodManagement() {
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

export async function loadPeriodsData() {
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
      document.dispatchEvent(new CustomEvent(PERIODS_UPDATED_EVENT));
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
    return;
  }

  try {
    const context = adminState.context || getContext();
    const year = context?.year || adminState.activeYear || 2567;
    const semesterId = context?.semester?.id || context?.semesterId || adminState.activeSemester?.id;

    if (!year || !semesterId) {
      showPeriodsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
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
    } else {
      showPeriodsError(result.error || 'ไม่สามารถลบคาบเรียนได้');
    }
  } catch (error) {
    console.error('❌ Error deleting period:', error);
    showPeriodsError('เกิดข้อผิดพลาดในการลบคาบเรียน');
  }
}

function bindPeriodFormEvents() {
  const form = document.getElementById('period-form');
  if (!form || form.dataset.bound === 'true') return;
  form.addEventListener('submit', handlePeriodSubmit);
  form.dataset.bound = 'true';
}

async function handlePeriodSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton ? submitButton.textContent : '';

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

export function clearPeriodForm() {
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
      const totalItems = (adminState.periods || []).length;
      const totalPages = Math.max(1, Math.ceil(totalItems / (adminState.periodsPerPage || 10)));
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
  if (!table || table.dataset.bound === 'true') return;

  table.addEventListener('click', handlePeriodTableClick);
  table.dataset.bound = 'true';
}

async function handlePeriodTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const periodId = parseInt(button.dataset.periodId || '', 10);
  if (!periodId || Number.isNaN(periodId)) return;

  const action = button.dataset.action;
  if (action === 'edit') {
    enterPeriodEditMode(periodId);
  } else if (action === 'delete') {
    await deletePeriod(periodId);
  }
}

function enterPeriodEditMode(periodId) {
  const targetPeriod = adminState.periods.find(period => Number(period.id) === Number(periodId));
  if (!targetPeriod) {
    showPeriodsError('ไม่พบข้อมูลคาบเรียนที่ต้องการแก้ไข');
    return;
  }

  const form = document.getElementById('period-form');
  if (!form) return;

  form.querySelector('#period-no')?.setAttribute('value', targetPeriod.period_no ?? '');
  form.querySelector('#period-name')?.setAttribute('value', targetPeriod.period_name || '');
  form.querySelector('#period-start')?.setAttribute('value', normalizeTimeValue(targetPeriod.start_time));
  form.querySelector('#period-end')?.setAttribute('value', normalizeTimeValue(targetPeriod.end_time));

  adminState.editingPeriod = targetPeriod;

  const header = form.closest('.admin-form-section')?.querySelector('h3');
  if (header) {
    header.textContent = `✏️ แก้ไขคาบเรียน ${targetPeriod.period_name || targetPeriod.period_no || ''}`.trim();
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = '💾 อัปเดต';
  }
}

export function renderPeriodsTable() {
  const tableBody = document.getElementById('periods-table-body');
  if (!tableBody) return;

  if (adminState.periodsLoading) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 2rem; text-align: center; color: #666;">
          ⏳ กำลังโหลดข้อมูลคาบเรียน...
        </td>
      </tr>
    `;
    return;
  }

  const periods = Array.isArray(adminState.periods) ? [...adminState.periods] : [];
  const term = (adminState.periodSearchTerm || '').trim().toLowerCase();

  const filtered = term
    ? periods.filter(period => getPeriodSearchableText(period).includes(term))
    : periods;

  const totalItems = filtered.length;
  const perPage = adminState.periodsPerPage || 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  if (adminState.periodsCurrentPage > totalPages) {
    adminState.periodsCurrentPage = totalPages;
  }

  const startIndex = (adminState.periodsCurrentPage - 1) * perPage;
  const pageItems = filtered.slice(startIndex, startIndex + perPage);

  if (pageItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 2rem; text-align: center; color: #666;">
          📋 ยังไม่มีข้อมูลคาบเรียนสำหรับภาคเรียนนี้
        </td>
      </tr>
    `;
    updatePeriodPagination(totalItems, totalPages);
    return;
  }

  tableBody.innerHTML = pageItems.map(period => {
    const duration = formatDuration(period.start_time, period.end_time);
    return `
      <tr class="period-row" data-period-id="${period.id}">
        <td class="col-id">${period.period_no ?? '-'}</td>
        <td class="col-name">${period.period_name || '-'}</td>
        <td class="col-start">${normalizeTimeValue(period.start_time)}</td>
        <td class="col-end">${normalizeTimeValue(period.end_time)}</td>
        <td class="col-duration">${duration}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button type="button" class="btn btn--sm btn--outline" data-action="edit" data-period-id="${period.id}" title="แก้ไขคาบเรียน ${period.period_name || period.period_no}">✏️</button>
            <button type="button" class="btn btn--sm btn--danger" data-action="delete" data-period-id="${period.id}" title="ลบคาบเรียน ${period.period_name || period.period_no}">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePeriodPagination(totalItems, totalPages);
}

function updatePeriodPagination(totalItems, totalPages) {
  const pageInfo = document.getElementById('periods-page-info');
  if (pageInfo) {
    const currentPageDisplay = totalItems === 0 ? 0 : adminState.periodsCurrentPage;
    const totalPagesDisplay = totalItems === 0 ? 0 : totalPages;
    pageInfo.textContent = `หน้า ${currentPageDisplay} จาก ${totalPagesDisplay} (${totalItems} รายการ)`;
  }

  const prevButton = document.getElementById('prev-period-page');
  if (prevButton) {
    prevButton.disabled = adminState.periodsCurrentPage <= 1 || totalItems === 0;
  }

  const nextButton = document.getElementById('next-period-page');
  if (nextButton) {
    nextButton.disabled = totalItems === 0 || adminState.periodsCurrentPage >= (totalPages || 0);
  }
}

function getPeriodSearchableText(period) {
  return [
    period.period_name || '',
    normalizeTimeValue(period.start_time),
    normalizeTimeValue(period.end_time),
    String(period.period_no ?? '')
  ].join(' ').toLowerCase();
}

function parseTimeToMinutes(value) {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
}

function normalizeTimeValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  const hours = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(2, '0');
  const minutes = String(Math.min(59, Math.max(0, Number(match[2])))).padStart(2, '0');
  return `${hours}:${minutes}`;
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

export {
  bindPeriodFormEvents,
  bindPeriodControls,
  bindPeriodTableEvents,
  deletePeriod,
  updatePeriod,
  addNewPeriod,
  parseTimeToMinutes,
  normalizeTimeValue,
  formatDuration
};
