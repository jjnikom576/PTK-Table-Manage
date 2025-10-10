import scheduleAPI from '../../api/schedule-api.js';
import { getContext } from '../../context/globalContext.js';
import adminState from './state.js';
import {
  getTeacherDisplayNameById,
  getClassDisplayNameById,
  getRoomDisplayNameById,
  formatTeacherName,
  normalizeTeacherNameString
} from './entityHelpers.js';
import { loadTeachersData } from './teacherManagement.js';
import { loadClassesData } from './classManagement.js';
import { loadRoomsData } from './roomManagement.js';

const SUBJECTS_UPDATED_EVENT = 'admin:subjects-updated';
const CLASSES_UPDATED_EVENT = 'admin:classes-updated';
const ROOMS_UPDATED_EVENT = 'admin:rooms-updated';
const TEACHERS_UPDATED_EVENT = 'admin:teachers-updated';

export function buildSubjectGroups(subjectRows = []) {
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
        subject_type: subject.subject_type || 'พื้นฐาน',
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

    existingGroup.teacher_name = subject.teacher_name || existingGroup.teacher_name;
    existingGroup.room_name = subject.room_name || existingGroup.room_name;
    existingGroup.subject_type = subject.subject_type || existingGroup.subject_type || 'พื้นฐาน';
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

export function getClassNamesFromIds(classIds = []) {
  if (!Array.isArray(classIds)) {
    return [];
  }

  return classIds
    .map(id => getClassDisplayNameById(id))
    .filter(name => typeof name === 'string' && name.trim().length > 0);
}

export async function initSubjectManagement() {
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

export async function loadSubjectsData() {
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
      adminState.subjectsRaw = result.data.map(subject => ({
        ...subject,
        subject_type: subject.subject_type || 'พื้นฐาน'
      }));
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
      document.dispatchEvent(new CustomEvent(SUBJECTS_UPDATED_EVENT));
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
    const currentValue = editTeacherSelect.value;
    editTeacherSelect.innerHTML = optionsHTML;
    if (currentValue && editTeacherSelect.querySelector(`option[value="${currentValue}"]`)) {
      editTeacherSelect.value = currentValue;
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
    '<option value="">-- เลือกห้องเรียน --</option>',
    ...rooms.map(room => {
      const displayName = room.display_name || room.room_name || `ห้อง #${room.id}`;
      return `<option value="${room.id}">${displayName}</option>`;
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
    const currentValue = editRoomSelect.value;
    editRoomSelect.innerHTML = optionsHTML;
    if (currentValue && editRoomSelect.querySelector(`option[value="${currentValue}"]`)) {
      editRoomSelect.value = currentValue;
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
      submitButton.textContent = isEditing ? 'กำลังบันทึก...' : 'กำลังเพิ่ม...';
    }

    const formData = new FormData(form);
    const subjectPayload = readSubjectFormData(formData);

    if (!subjectPayload.subject_name) {
      alert('กรุณาระบุชื่อวิชา');
      return;
    }

    if (!subjectPayload.teacher_id) {
      alert('กรุณาเลือกครูผู้สอน');
      return;
    }

    if (!subjectPayload.class_ids.length) {
      alert('กรุณาเลือกชั้นเรียนอย่างน้อย 1 ชั้น');
      return;
    }

    const { year, semesterId } = getActiveAdminContext();
    if (!year || !semesterId) {
      alert('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log(isEditing ? '🛠️ Updating subject...' : '📝 Creating new subject...', subjectPayload);

    let result;
    if (isEditing) {
      result = await scheduleAPI.updateSubject(year, semesterId, adminState.editingSubject.id, subjectPayload);
    } else {
      result = await scheduleAPI.createSubject(year, semesterId, subjectPayload);
    }

    if (result.success) {
      showSubjectsSuccess(isEditing ? 'อัปเดตวิชาเรียบร้อยแล้ว' : 'เพิ่มวิชาใหม่เรียบร้อยแล้ว');
      await loadSubjectsData();
      renderSubjectsTable();
      clearSubjectForm({ refocus: true });
    } else {
      const errorMessage = result.error || (isEditing ? 'ไม่สามารถอัปเดตวิชาได้' : 'ไม่สามารถเพิ่มวิชาได้');
      showSubjectsError(errorMessage);
      alert(errorMessage);
    }
  } catch (error) {
    console.error('❌ Error saving subject:', error);
    showSubjectsError('เกิดข้อผิดพลาดในการบันทึกข้อมูลวิชาเรียน');
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลวิชาเรียน');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText || (isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มวิชาใหม่');
    }
  }
}

function readSubjectFormData(formData) {
  const selectedClassesRaw = (formData.get('selected_class_ids') || '').toString().split(',');
  const selectedClassIds = selectedClassesRaw
    .map(value => Number(value.trim()))
    .filter(value => Number.isFinite(value));

  let subjectCode = (formData.get('subject_code') || '').toString().trim();
  if (!subjectCode) {
    const selectedClass = adminState.classes.find(cls => Number(cls.id) === selectedClassIds[0]);
    const gradePrefix = selectedClass?.grade_level ? `${selectedClass.grade_level}-` : '';
    subjectCode = `${gradePrefix}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }

  return {
    subject_name: (formData.get('subject_name') || '').toString().trim(),
    subject_code: subjectCode,
    subject_type: (formData.get('subject_type') || 'พื้นฐาน').toString().trim() || 'พื้นฐาน',
    teacher_id: Number(formData.get('teacher_id')) || null,
    default_room_id: Number(formData.get('default_room_id')) || null,
    periods_per_week: Number(formData.get('periods_per_week')) || null,
    special_requirements: (formData.get('special_requirements') || '').toString().trim() || null,
    class_ids: selectedClassIds
  };
}

function handleSubjectTableClick(event) {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;

  const subjectId = Number(actionButton.dataset.subjectId);
  if (!subjectId) return;

  const action = actionButton.dataset.action;
  if (action === 'edit') {
    const subject = adminState.subjectsRaw.find(item => Number(item.id) === subjectId);
    if (subject) {
      startSubjectEdit(subject);
    } else {
      showSubjectsError('ไม่พบข้อมูลวิชาที่ต้องการแก้ไข');
    }
  } else if (action === 'delete') {
    deleteSubject(subjectId);
  } else if (action === 'view') {
    const subject = adminState.subjectsRaw.find(item => Number(item.id) === subjectId);
    if (subject) {
      openSubjectViewModal(subject);
    } else {
      showSubjectsError('ไม่พบข้อมูลวิชาที่ต้องการดู');
    }
  }
}

function handleSubjectTableChange(event) {
  const checkbox = event.target.closest('.subject-row-checkbox');
  if (checkbox) {
    updateSubjectBulkActions();
  }
}

function handleSubjectSelectAll(event) {
  const checked = !!event.target.checked;
  document.querySelectorAll('.subject-row-checkbox').forEach(checkbox => {
    checkbox.checked = checked;
  });
  updateSubjectBulkActions();
}

function updateSubjectBulkActions() {
  const selectedIds = getSelectedSubjectIds();
  const bulkDeleteButton = document.getElementById('bulk-delete-subjects');

  if (bulkDeleteButton) {
    bulkDeleteButton.disabled = selectedIds.length === 0;
  }
}

function getSelectedSubjectIds() {
  return Array.from(document.querySelectorAll('.subject-row-checkbox:checked')).map(checkbox => Number(checkbox.dataset.subjectId));
}

async function handleBulkDeleteSubjects() {
  const selectedIds = getSelectedSubjectIds();
  if (selectedIds.length === 0) return;

  const confirmed = window.confirm(`ต้องการลบวิชา ${selectedIds.length} รายการที่เลือกหรือไม่?`);
  if (!confirmed) return;

  for (const subjectId of selectedIds) {
    await deleteSubject(subjectId, false);
  }

  await loadSubjectsData();
  renderSubjectsTable();
}

async function deleteSubject(subjectId, confirmPrompt = true) {
  if (!subjectId) return;

  if (confirmPrompt) {
    const subject = adminState.subjectsRaw.find(item => Number(item.id) === Number(subjectId));
    const subjectLabel = subject?.subject_name || subject?.subject_code || `วิชาที่มี ID ${subjectId}`;
    const confirmed = window.confirm(`ต้องการลบวิชา "${subjectLabel}" หรือไม่?`);
    if (!confirmed) return;
  }

  try {
    const { year, semesterId } = getActiveAdminContext();
    if (!year || !semesterId) {
      showSubjectsError('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      alert('ไม่พบปีการศึกษาหรือภาคเรียนที่ใช้งานอยู่');
      return;
    }

    console.log('🗑️ Deleting subject...', subjectId);
    const result = await scheduleAPI.deleteSubject(year, semesterId, subjectId);

    if (result.success) {
      showSubjectsSuccess('ลบวิชาเรียนเรียบร้อยแล้ว');
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

function openSubjectViewModal(subject) {
  const modal = document.getElementById('view-subject-modal');
  if (!modal) return;

  const teacherName = getTeacherDisplayNameById(subject.teacher_id)
    || normalizeTeacherNameString(subject.teacher_name)
    || 'ไม่ระบุครูผู้สอน';

  modal.querySelector('[data-field="subject-name"]').textContent = subject.subject_name || '-';
  modal.querySelector('[data-field="subject-code"]').textContent = subject.subject_code || '-';
  modal.querySelector('[data-field="subject-type"]').textContent = subject.subject_type || 'พื้นฐาน';
  modal.querySelector('[data-field="teacher"]').textContent = teacherName;
  modal.querySelector('[data-field="periods"]').textContent = subject.periods_per_week ?? '-';
  modal.querySelector('[data-field="room"]').textContent = subject.room_name || getRoomDisplayNameById(subject.default_room_id) || '-';
  modal.querySelector('[data-field="classes"]').textContent = getClassNamesFromIds(subject.class_ids).join(', ') || '-';
  modal.querySelector('[data-field="requirements"]').textContent = subject.special_requirements || '-';

  modal.classList.remove('hidden');

  const closeButtons = modal.querySelectorAll('[data-modal-close], .modal-close');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
  });
}

function startSubjectEdit(subject) {
  adminState.editingSubject = subject;
  openSubjectEditModal(subject);
}

function openSubjectEditModal(subject) {
  const modalTitle = document.querySelector('#subject-form-section h3');
  if (modalTitle) {
    modalTitle.textContent = `✏️ แก้ไขวิชา ${subject.subject_name || ''}`.trim();
  }

  setSubjectFormMode('edit', subject.subject_name);
  populateSubjectForm(subject);

  const form = document.getElementById('subject-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setSubjectFormMode(mode, subjectName = '') {
  const submitButton = document.querySelector('#subject-form button[type="submit"]');
  const cancelButton = document.getElementById('cancel-subject-edit');
  const formTitle = document.querySelector('#subject-form-section h3');

  if (mode === 'edit') {
    if (submitButton) {
      submitButton.textContent = 'บันทึกการแก้ไข';
      submitButton.classList.add('btn--primary');
    }
    if (cancelButton) cancelButton.classList.remove('hidden');
    if (formTitle) formTitle.textContent = `✏️ แก้ไขวิชา ${subjectName}`.trim();
  } else {
    if (submitButton) {
      submitButton.textContent = 'เพิ่มวิชาใหม่';
      submitButton.classList.remove('btn--primary');
    }
    if (cancelButton) cancelButton.classList.add('hidden');
    if (formTitle) formTitle.textContent = '➕ เพิ่มวิชาใหม่';
  }
}

function populateSubjectForm(subject) {
  const form = document.getElementById('subject-form');
  if (!form) return;

  form.querySelector('#subject-name')?.setAttribute('value', subject.subject_name || '');
  form.querySelector('#subject-code')?.setAttribute('value', subject.subject_code || '');
  form.querySelector('#subject-teacher')?.setAttribute('value', subject.teacher_id || '');

  const typeSelect = form.querySelector('#subject-type');
  if (typeSelect) {
    typeSelect.value = subject.subject_type || 'พื้นฐาน';
  }
  const editTypeSelect = document.getElementById('edit-subject-type');
  if (editTypeSelect) {
    editTypeSelect.value = subject.subject_type || 'พื้นฐาน';
  }
  form.querySelector('#subject-room')?.setAttribute('value', subject.default_room_id || '');
  form.querySelector('#subject-periods')?.setAttribute('value', subject.periods_per_week ?? '');
  const requirementsInput = form.querySelector('#subject-requirements');
  if (requirementsInput) {
    requirementsInput.value = subject.special_requirements || '';
  }

  adminState.subjectClassSelection.selectedIds = Array.isArray(subject.class_ids)
    ? subject.class_ids.map(id => Number(id))
    : subject.class_id
      ? [Number(subject.class_id)]
      : [];

  renderSubjectClassLists();
}

function clearSubjectForm(options = {}) {
  const form = document.getElementById('subject-form');
  if (!form) return;

  form.reset();
  adminState.editingSubject = null;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = false;
  }

  const typeSelect = form.querySelector('#subject-type');
  if (typeSelect) {
    typeSelect.value = 'พื้นฐาน';
  }
  const editTypeSelect = document.getElementById('edit-subject-type');
  if (editTypeSelect) {
    editTypeSelect.value = 'พื้นฐาน';
  }

  setSubjectFormMode('create');
  resetSubjectClassSelection();

  if (options.refocus) {
    form.querySelector('#subject-name')?.focus();
  }
}

export function renderSubjectsTable() {
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
  const totalItems = filteredSubjects.length;
  const perPage = adminState.subjectItemsPerPage || 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  if (adminState.subjectCurrentPage > totalPages) {
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
    const subjectType = subject.subject_type || 'พื้นฐาน';
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
        <td class="col-subject-type">${subjectType}</td>
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
  if (selectAllCheckbox && selectAllCheckbox.dataset.bound !== 'true') {
    selectAllCheckbox.addEventListener('change', handleSubjectSelectAll);
    selectAllCheckbox.dataset.bound = 'true';
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
  const teacherName = getTeacherDisplayNameById(subject.teacher_id)
    || normalizeTeacherNameString(subject.teacher_name)
    || '';

  const classNames = getClassNamesFromIds(subject.class_ids && subject.class_ids.length ? subject.class_ids : [subject.class_id]);
  const roomName = subject.room_name || getRoomDisplayNameById(subject.default_room_id) || '';

  return [
    subject.subject_name || '',
    subject.subject_code || '',
    subject.subject_type || '',
    teacherName,
    classNames.join(' '),
    roomName,
    subject.special_requirements || ''
  ].join(' ').toLowerCase();
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

document.addEventListener(TEACHERS_UPDATED_EVENT, populateSubjectTeacherOptions);
document.addEventListener(CLASSES_UPDATED_EVENT, () => {
  renderSubjectClassLists();
  updateSubjectClassHiddenInput();
});
document.addEventListener(ROOMS_UPDATED_EVENT, populateSubjectRoomOptions);

export {
  bindSubjectFormEvents,
  bindSubjectControls,
  bindSubjectTableEvents,
  clearSubjectForm,
  startSubjectEdit,
  deleteSubject,
  openSubjectViewModal,
  getFilteredSubjects,
  getSubjectSearchableText,
  getActiveAdminContext
};
