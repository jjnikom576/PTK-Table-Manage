import coreAPI from '../../api/core-api.js';
import { refreshContextFromBackend } from '../../context/globalContext.js';
import adminState from './state.js';

export async function initAcademicManagement() {
  try {
    console.log('[Admin] Initializing Academic Management...');

    await loadAdminContext();
    await loadAcademicYears();
    await loadSemesters();

    populateCurrentSemesterTab();
    populateAcademicYearsList();
    populateSemestersList();
    populateAcademicYearsTable();
    populateSemestersTable();

    bindAcademicManagementEvents();

    console.log('[Admin] Academic Management initialized successfully');
  } catch (error) {
    console.error('[Admin] Error initializing Academic Management:', error);
    adminState.error = error.message;
  }
}

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

async function loadAcademicYears() {
  try {
    const result = await coreAPI.getAcademicYears(false);

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

async function loadSemesters() {
  try {
    const result = await coreAPI.getSemesters(false);

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

function populateCurrentSemesterTab() {
  const yearDisplay = document.getElementById('current-year-display');
  const semesterDisplay = document.getElementById('current-semester-display');

  if (yearDisplay) {
    yearDisplay.textContent = adminState.activeYear
      ? `ปีการศึกษา ${adminState.activeYear}`
      : 'ยังไม่ได้เลือก';
  }

  if (semesterDisplay) {
    semesterDisplay.textContent = adminState.activeSemester
      ? (adminState.activeSemester.name || adminState.activeSemester.semester_name)
      : 'ยังไม่ได้เลือก';
  }

  console.log('[Admin] Updated current semester tab display');
}

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
  enableSelectionItemToggle('academic-years-list');

  console.log('[Admin] Populated academic years list');
}

function populateSemestersList() {
  const container = document.getElementById('semesters-list');
  if (!container) return;

  if (adminState.semestersLoading && !adminState.semestersLoaded) {
    container.innerHTML = '<p class="no-data">กำลังโหลด...</p>';
    return;
  }

  if (adminState.semesters.length === 0) {
    container.innerHTML = '<p class="no-data">ยังไม่มีภาคเรียน - กรุณาเพิ่มในแท็บ "เพิ่มภาคเรียน"</p>';
    return;
  }

  const semestersHTML = adminState.semesters.map(semester => {
    const isActive = semester.id === adminState.activeSemester?.id;
    const semesterName = semester.name || semester.semester_name;

    return `
      <div class="selection-item ${isActive ? 'active' : ''}">
        <input type="radio" name="semester" value="${semester.id}" ${isActive ? 'checked' : ''} id="semester-${semester.id}">
        <label for="semester-${semester.id}">${semesterName}</label>
        ${isActive ? '<span class="active-badge">ใช้งานอยู่</span>' : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = semestersHTML;
  enableSelectionItemToggle('semesters-list');

  console.log('[Admin] Populated semesters list');
}

function enableSelectionItemToggle(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.selection-item').forEach((item) => {
    const input = item.querySelector('input[type="radio"]');
    if (!input) return;

    item.addEventListener('click', (event) => {
      if (event.target === input) return;

      event.preventDefault();
      container.querySelectorAll('input[type="radio"]').forEach((el) => { el.checked = false; });
      container.querySelectorAll('.selection-item').forEach((el) => el.classList.remove('active'));
      input.checked = true;
      item.classList.add('active');
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function bindAcademicManagementEvents() {
  const form = document.getElementById('current-semester-form');
  if (form) {
    form.addEventListener('submit', handleCurrentSemesterFormSubmit);
  }

  const yearsList = document.getElementById('academic-years-list');
  if (yearsList) {
    yearsList.addEventListener('change', handleYearSelectionChange);
  }

  const academicYearForm = document.getElementById('academic-year-form');
  if (academicYearForm) {
    academicYearForm.addEventListener('submit', handleAcademicYearFormSubmit);
  }

  const semesterForm = document.getElementById('semester-form');
  if (semesterForm) {
    semesterForm.addEventListener('submit', handleSemesterFormSubmit);
  }

  console.log('[Admin] Academic management events bound');
}

async function handleYearSelectionChange(event) {
  if (event.target.name !== 'academic-year') return;

  const selectedYearId = parseInt(event.target.value, 10);
  const selectedYear = adminState.academicYears.find(y => y.id === selectedYearId);

  if (!selectedYear) return;
  console.log('[Admin] Year selection changed to:', selectedYear.year);

  if (!Array.isArray(adminState.semesters) || adminState.semesters.length === 0) {
    await loadSemesters();
  } else {
    console.log('[Admin] Using cached semesters – no API call needed');
  }

  populateSemestersList();

  const hiddenField = document.getElementById('selected-academic-year');
  if (hiddenField) {
    hiddenField.value = selectedYearId;
  }
}

async function handleCurrentSemesterFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const academicYearId = formData.get('academic-year');
  const semesterId = formData.get('semester');

  if (!academicYearId) {
    alert('กรุณาเลือกปีการศึกษา');
    return;
  }

  if (!semesterId) {
    alert('กรุณาเลือกภาคเรียน');
    return;
  }

  const selectedYear = adminState.academicYears.find(y => y.id === parseInt(String(academicYearId), 10));
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

    const yearResult = await coreAPI.setActiveAcademicYear(selectedYear.year);
    const semesterResult = await coreAPI.setActiveSemester(parseInt(String(semesterId), 10));

    if (yearResult.success && semesterResult.success) {
      adminState.activeYear = selectedYear.year;
      adminState.activeSemester = adminState.semesters.find(
        s => s.id === parseInt(String(semesterId), 10)
      );

      await refreshContextFromBackend();

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

async function handleAcademicYearFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const year = parseInt(formData.get('year'), 10);

  if (!year || year < 2500 || year > 2600) {
    alert('กรุณาระบุปีการศึกษาที่ถูกต้อง (2500-2600)');
    return;
  }

  const existingYear = adminState.academicYears.find(y => y.year === year);
  if (existingYear) {
    alert(`ปีการศึกษา ${year} มีอยู่แล้ว`);
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'บันทึก';

  try {
    if (submitBtn) {
      submitBtn.textContent = 'กำลังบันทึก...';
      submitBtn.disabled = true;
    }

    console.log('[Admin] Creating academic year:', year);
    const result = await coreAPI.createAcademicYear(year);

    if (result.success) {
      await loadAcademicYears();

      populateAcademicYearsList();
      populateAcademicYearsTable();

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
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

async function handleSemesterFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const semesterName = formData.get('semester_name')?.trim();

  if (!semesterName) {
    alert('กรุณาระบุชื่อภาคเรียน');
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'บันทึก';

  try {
    if (submitBtn) {
      submitBtn.textContent = 'กำลังบันทึก...';
      submitBtn.disabled = true;
    }

    const result = await coreAPI.createSemester({
      semester_name: semesterName
    });

    if (result.success) {
      await loadSemesters();

      populateSemestersList();
      populateSemestersTable();

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
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

function populateAcademicYearsTable() {
  const tableBody = document.getElementById('academic-years-table-body');
  if (!tableBody) return;

  if (adminState.academicYears.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="no-data">ยังไม่มีข้อมูลปีการศึกษา</td></tr>';
    return;
  }

  const rowsHTML = adminState.academicYears.map((year) => {
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

function populateSemestersTable() {
  const tableBody = document.getElementById('semesters-table-body');
  if (!tableBody) return;

  if (adminState.semesters.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="no-data">ยังไม่มีภาคเรียน</td></tr>';
    return;
  }

  const rowsHTML = adminState.semesters.map((semester) => {
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

async function deleteSemester(semesterId, semesterName) {
  try {
    if (!semesterId) return;
    const confirmed = window.confirm(`ยืนยันการลบภาคเรียน "${semesterName}" ?`);
    if (!confirmed) return;

    const result = await coreAPI.deleteSemester(parseInt(semesterId, 10));
    if (!result.success) {
      alert(result.error || 'ลบภาคเรียนไม่สำเร็จ');
      return;
    }

    if (adminState.activeSemester && adminState.activeSemester.id === parseInt(semesterId, 10)) {
      adminState.activeSemester = null;
    }

    await loadSemesters();
    populateSemestersList();
    populateSemestersTable();

    try {
      await refreshContextFromBackend();
    } catch (error) {
      console.warn('[Admin] Failed to refresh context after deleting semester:', error);
    }

    alert('ลบภาคเรียนเรียบร้อย');
  } catch (error) {
    console.error('[Admin] Error deleting semester:', error);
    alert('เกิดข้อผิดพลาดในการลบภาคเรียน');
  }
}

async function deleteAcademicYear(yearId, year) {
  try {
    if (!yearId) return;

    const confirmed = window.confirm(`ยืนยันการลบปีการศึกษา ${year} ?`);
    if (!confirmed) return;

    const button = window.event?.target;
    const originalText = button ? button.textContent : '';
    if (button) {
      button.textContent = 'กำลังลบ...';
      button.disabled = true;
    }

    try {
      const result = await coreAPI.deleteAcademicYear(parseInt(yearId, 10));

      if (!result.success) {
        alert(result.error || 'ลบปีการศึกษาไม่สำเร็จ');
        return;
      }

      try {
        await refreshContextFromBackend();
      } catch (error) {
        console.warn('[Admin] Failed to refresh context after deleting year:', error);
      }

      alert(`ลบปีการศึกษา ${year} เรียบร้อยแล้ว!`);
      window.location.reload();
    } finally {
      if (button) {
        button.textContent = originalText;
        button.disabled = false;
      }
    }
  } catch (error) {
    console.error('[Admin] Error deleting academic year:', error);
    alert('เกิดข้อผิดพลาดในการลบปีการศึกษา: ' + error.message);
  }
}

function editAcademicYear(yearId) {
  alert('คุณสมบัติแก้ไขยังไม่ได้ถูกพัฒนา ใช้ลบแล้วเพิ่มใหม่แทน');
  console.log('[Admin] Edit academic year:', yearId);
}

function editSemester(semesterId) {
  alert('คุณสมบัติแก้ไขภาคเรียนยังไม่ได้ถูกพัฒนา ใช้ลบแล้วเพิ่มใหม่แทน');
  console.log('[Admin] Edit semester:', semesterId);
}

window.deleteSemester = deleteSemester;
window.deleteAcademicYear = deleteAcademicYear;
window.editAcademicYear = editAcademicYear;
window.editSemester = editSemester;
