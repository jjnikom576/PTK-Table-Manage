import scheduleAPI from '../../api/schedule-api.js';
import { getContext } from '../../context/globalContext.js';
import adminState from './state.js';
import { getClassDisplayNameById } from './entityHelpers.js';

const CLASSES_UPDATED_EVENT = 'admin:classes-updated';

export async function initClassManagement() {
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

export async function loadClassesData() {
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
      document.dispatchEvent(new CustomEvent(CLASSES_UPDATED_EVENT));
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

async function handleClassSubmit(event) {
  event.preventDefault();

  const form = event.target;
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
  renderClassesTable();
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

export function clearClassForm() {
  const form = document.getElementById('class-form');
  if (!form) return;

  form.reset();
  adminState.editingClass = null;

  const header = form.closest('.admin-form-section')?.querySelector('h3');
  if (header) {
    header.textContent = '➕ เพิ่มชั้นเรียนใหม่';
  }
}

export function renderClassesTable() {
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

  const actionButtons = tableBody.querySelectorAll('button[data-action]');
  actionButtons.forEach(button => {
    if (button.dataset.bound === 'true') {
      return;
    }
    button.addEventListener('click', handleClassTableClick);
    button.dataset.bound = 'true';
  });
}

export {
  bindClassFormEvents,
  bindClassTableEvents,
  deleteClass,
  updateClass
};
