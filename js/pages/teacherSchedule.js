/**
 * Enhanced Teacher Schedule Page for Multi-Year School Schedule System
 * Features: Teacher workload summary, Individual schedules, Export functionality
 */

import * as dataService from '../services/dataService.js';
import * as globalContext from '../context/globalContext.js';
import { exportTableToCSV, exportTableToXLSX, exportTableToGoogleSheets } from '../utils/export.js';
import { formatRoomName, getRoomTypeBadgeClass, getThaiDayName, generateTimeSlots, isActiveSemester } from '../utils.js';

// =============================================================================
// PAGE STATE
// =============================================================================

let pageState = {
  teachers: [],
  selectedTeacher: null,
  teacherSchedules: {},
  workloadSummary: null,
  isLoading: false,
  error: null
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Initialize Teacher Schedule Page
 */
export async function initTeacherSchedulePage(context) {
  console.log('[TeacherSchedule] Initializing page with context:', context);

  try {
    // Validate context
    if (!context.currentYear || !context.currentSemester) {
      throw new Error('ไม่ได้เลือกปีการศึกษาหรือภาคเรียน');
    }

    // ตรวจสอบว่า page teacher แสดงแล้วหรือไม่
    const teacherPage = document.getElementById('page-teacher');
    console.log('[TeacherSchedule] page-teacher element:', teacherPage);
    console.log('[TeacherSchedule] page-teacher style.display:', teacherPage?.style.display);
    console.log('[TeacherSchedule] page-teacher classList:', teacherPage?.classList.toString());

    if (teacherPage && teacherPage.style.display === 'none') {
      console.warn('[TeacherSchedule] Teacher page is hidden, making visible');
      teacherPage.style.display = 'block';
      teacherPage.classList.remove('hidden');
    }

    // Set up dataService context first
    console.log('[TeacherSchedule] Setting up dataService context');
    await dataService.setGlobalContext(context.currentYear, context.currentSemester.id);

    // Load teachers and data
    console.log('[TeacherSchedule] Loading teachers data');
    await loadTeachersData(context);

    // Render components
    console.log('[TeacherSchedule] Rendering workload summary');
    await renderWorkloadSummary(context);

    console.log('[TeacherSchedule] Rendering teacher tabs');
    await renderTeacherTabs(context);

    // Setup event listeners
    console.log('[TeacherSchedule] Setting up event listeners');
    setupEventListeners(context);

    console.log('[TeacherSchedule] Page initialized successfully');

  } catch (error) {
    console.error('[TeacherSchedule] Failed to initialize page:', error);
    showError(error.message);
  }
}

/**
 * Update Page For Context
 */
export async function updatePageForContext(newContext) {
  console.log('[TeacherSchedule] Updating for new context:', newContext);

  try {
    // Clear current state
    pageState.teachers = [];
    pageState.selectedTeacher = null;
    pageState.teacherSchedules = {};
    pageState.workloadSummary = null;

    // Reload with new context
    await initTeacherSchedulePage(newContext);

  } catch (error) {
    console.error('[TeacherSchedule] Failed to update page:', error);
    showError(error.message);
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load Teachers Data
 */
async function loadTeachersData(context) {
  try {
    setLoading(true);

    // Load all required data
    const [teachersResult, schedulesResult, subjectsResult, classesResult, roomsResult] = await Promise.all([
      dataService.getTeachers(),
      dataService.getSchedules(),
      dataService.getSubjects(),
      dataService.getClasses(),
      dataService.getRooms()
    ]);

    if (!teachersResult.ok) throw new Error('ไม่สามารถโหลดข้อมูลครูได้');
    if (!schedulesResult.ok) throw new Error('ไม่สามารถโหลดข้อมูลตารางสอนได้');
    if (!subjectsResult.ok) throw new Error('ไม่สามารถโหลดข้อมูลวิชาได้');

    pageState.teachers = teachersResult.data;

    // Calculate workload for each teacher
    await calculateWorkloadSummary({
      teachers: teachersResult.data,
      schedules: schedulesResult.data,
      subjects: subjectsResult.data,
      classes: classesResult.data || [],
      rooms: roomsResult.data || []
    });

    console.log('[TeacherSchedule] Loaded data:', {
      teachers: teachersResult.data.length,
      schedules: schedulesResult.data.length,
      subjects: subjectsResult.data.length
    });

  } catch (error) {
    console.error('[TeacherSchedule] Failed to load teachers data:', error);
    throw error;
  } finally {
    setLoading(false);
  }
}

/**
 * Calculate Workload Summary
 */
async function calculateWorkloadSummary(data) {
  const { teachers, schedules, subjects, classes, rooms } = data;

  // Group teachers by subject group
  const subjectGroups = {};
  const teacherWorkloads = [];

  teachers.forEach(teacher => {
    // Find subjects taught by this teacher
    const teacherSubjects = subjects.filter(s => s.teacher_id === teacher.id);

    // Calculate total periods
    const teacherSchedules = schedules.filter(schedule => {
      const subject = subjects.find(s => s.id === schedule.subject_id);
      return subject && subject.teacher_id === teacher.id;
    });

    const totalPeriods = teacherSchedules.length;

    // Group by subject group
    if (!subjectGroups[teacher.subject_group]) {
      subjectGroups[teacher.subject_group] = {
        name: teacher.subject_group,
        teachers: 0,
        totalPeriods: 0
      };
    }

    subjectGroups[teacher.subject_group].teachers++;
    subjectGroups[teacher.subject_group].totalPeriods += totalPeriods;

    // Individual teacher workload
    teacherWorkloads.push({
      teacher,
      subjects: teacherSubjects,
      schedules: teacherSchedules,
      totalPeriods,
      subjectsCount: teacherSubjects.length
    });
  });

  pageState.workloadSummary = {
    subjectGroups: Object.values(subjectGroups),
    teacherWorkloads: teacherWorkloads.sort((a, b) => b.totalPeriods - a.totalPeriods)
  };
}

// =============================================================================
// UI RENDERING
// =============================================================================

/**
 * Render Workload Summary
 */
async function renderWorkloadSummary(context) {
  console.log('[TeacherSchedule] renderWorkloadSummary called', pageState.workloadSummary);

  const summaryContainer = document.getElementById('workload-summary');
  console.log('[TeacherSchedule] workload-summary element:', summaryContainer);

  if (!summaryContainer || !pageState.workloadSummary) {
    console.warn('[TeacherSchedule] Missing container or data');
    return;
  }

  const { subjectGroups, teacherWorkloads } = pageState.workloadSummary;

  // อัปเดต subject group stats
  const subjectGroupContainer = document.getElementById('subject-group-stats');
  console.log('[TeacherSchedule] subject-group-stats element:', subjectGroupContainer);

  if (subjectGroupContainer) {
    const html = subjectGroups.map(group => `
      <div class="stat-card">
        <div class="stat-title">${group.name}</div>
        <div class="stat-number">${group.totalPeriods}</div>
        <div class="stat-subtitle">${group.teachers} คน</div>
      </div>
    `).join('');

    console.log('[TeacherSchedule] Subject groups HTML:', html);
    subjectGroupContainer.innerHTML = html;
  }

  // อัปเดต teacher ranking
  const teacherRankingContainer = document.getElementById('teacher-ranking');
  console.log('[TeacherSchedule] teacher-ranking element:', teacherRankingContainer);

  if (teacherRankingContainer) {
    const html = teacherWorkloads.map((item, index) => `
      <div class="ranking-item" data-teacher-id="${item.teacher.id}">
        <div class="rank">#${index + 1}</div>
        <div class="teacher-info">
          <div class="teacher-name">${item.teacher.name}</div>
          <div class="teacher-group">${item.teacher.subject_group}</div>
        </div>
        <div class="workload-info">
          <div class="periods-count">${item.totalPeriods} คาบ</div>
          <div class="subjects-count">${item.subjectsCount} วิชา</div>
        </div>
      </div>
    `).join('');

    console.log('[TeacherSchedule] Teacher ranking HTML:', html);
    teacherRankingContainer.innerHTML = html;
  }

  console.log('[TeacherSchedule] renderWorkloadSummary completed');
}

/**
 * Render Teacher Tabs
 */
async function renderTeacherTabs(context) {
  const tabsContainer = document.getElementById('teacher-tabs');
  if (!tabsContainer || !pageState.teachers.length) return;

  // FIX: เรียงครูตามกลุ่มสาระก่อน แล้วค่อยเรียงตามชื่อ
  const sortedTeachers = [...pageState.teachers].sort((a, b) => {
    // เรียงตามกลุ่มสาระก่อน
    if (a.subject_group !== b.subject_group) {
      return a.subject_group.localeCompare(b.subject_group, 'th');
    }
    // ถ้ากลุ่มสาระเดียวกัน ให้เรียงตามชื่อ
    return a.name.localeCompare(b.name, 'th');
  });

  tabsContainer.innerHTML = sortedTeachers.map(teacher => `
    <button class="teacher-tab" 
            data-teacher-id="${teacher.id}" 
            role="tab"
            aria-selected="false"
            style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0.75rem; cursor: pointer;">
      <div style="font-weight: bold; margin-bottom: 0.25rem; pointer-events: none;">${teacher.name}</div>
      <div style="font-size: 0.85rem; color: #666; pointer-events: none;">${teacher.subject_group}</div>
    </button>
  `).join('');
}

/**
 * Render Teacher Schedule
 */
async function renderTeacherSchedule(teacherId, context) {
  const teacher = pageState.teachers.find(t => t.id === teacherId);
  if (!teacher) return;

  try {
    setLoading(true);

    // Get teacher's schedule data
    const scheduleData = await getTeacherScheduleData(teacherId, context);

    // Update UI with 3 separate sections
    renderTeacherInfoSection(teacher, scheduleData, context);
    renderScheduleTableSection(scheduleData, teacher, context);
    renderWorkloadDetailsSection(scheduleData, teacher);

    // Show content
    document.getElementById('teacher-info')?.classList.remove('hidden');
    document.getElementById('teacher-schedule-table')?.classList.remove('hidden');
    document.getElementById('teacher-workload')?.classList.remove('hidden');
    document.getElementById('teacher-details-empty')?.style.setProperty('display', 'none');

  } catch (error) {
    console.error('[TeacherSchedule] Failed to render teacher schedule:', error);
    showError(`โหลดตารางสอนครู ${teacher.name} ล้มเหลว: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

/**
 * Render Teacher Info Section
 */
function renderTeacherInfoSection(teacher, scheduleData, context) {
  const infoContainer = document.getElementById('teacher-info');
  if (!infoContainer) return;

  infoContainer.innerHTML = `
    <div class="teacher-info-card" style="text-align: center;">
      <h4 style="text-align: center;">ตารางสอน - ${teacher.name}</h4>
      <div class="teacher-details-grid" style="text-align: center;">
        <div class="detail-item" style="text-align: center;">
          <span class="label">กลุ่มสาระ:</span>
          <span class="value">${teacher.subject_group}</span>
        </div>
        ${teacher.phone ? `
        <div class="detail-item" style="text-align: center;">
          <span class="label">📞</span>
          <span class="value">${teacher.phone}</span>
        </div>` : ''}
        ${teacher.email ? `
        <div class="detail-item" style="text-align: center;">
          <span class="label">📧</span>
          <span class="value">${teacher.email}</span>
        </div>` : ''}
        <div class="detail-item" style="text-align: center;">
          <span class="label">ภาคเรียน:</span>
          <span class="value">ภาคเรียนที่ ${context.currentSemester?.semester_number || 1} ปีการศึกษา ${context.currentYear}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Schedule Table Section
 */
function renderScheduleTableSection(scheduleData, teacher, context) {
  const tableContainer = document.getElementById('teacher-schedule-table');
  if (!tableContainer) return;

  const timeSlots = generateTimeSlots(); // ทุกคาบ (8 คาบ)
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  let tableHTML = `
    <div class="schedule-table-card">
      <div class="table-responsive">
        <table class="schedule-table teacher-schedule">
          <thead>
            <tr>
              <th class="day-header">วัน/เวลา</th>
              ${timeSlots.map((timeSlot, index) =>
    `<th class="period-header">
                  <div class="period-info">
                    <div class="period-number">คาบ ${index + 1}</div>
                    <div class="time-slot">${timeSlot}</div>
                  </div>
                </th>`
  ).join('')}
            </tr>
          </thead>
          <tbody>
  `;

  // วนเป็นแถว (แต่ละวัน) - แสดงครบทุกคาบ
  days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1;

    tableHTML += `
      <tr class="day-row" data-day="${dayNumber}">
        <td class="day-cell">
          <div class="day-name">${day}</div>
        </td>
    `;

    // คาบเป็นคอลัมน์ (แสดงครบ 8 คาบ)
    timeSlots.forEach((timeSlot, periodIndex) => {
      const period = periodIndex + 1;
      const cellData = scheduleData.matrix[dayNumber]?.[period];

      if (cellData) {
        tableHTML += `
          <td class="schedule-cell has-subject" data-day="${dayNumber}" data-period="${period}">
            <div class="subject-info">
              <div class="subject-name">${cellData.subject.subject_name}</div>
              <div class="class-name">${cellData.class.class_name}</div>
              <div class="room-name">${cellData.room.name}</div>
            </div>
          </td>
        `;
      } else {
        tableHTML += `
          <td class="schedule-cell empty" data-day="${dayNumber}" data-period="${period}">
            <div class="empty-period">-</div>
          </td>
        `;
      }
    });

    tableHTML += '</tr>';
  });

  tableHTML += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  tableContainer.innerHTML = tableHTML;
}

/**
 * Render Workload Details Section
 */
function renderWorkloadDetailsSection(scheduleData, teacher) {
  const workloadContainer = document.getElementById('teacher-workload');
  if (!workloadContainer) return;

  const subjectSummary = scheduleData.subjects.map(subject => {
    const subjectSchedules = scheduleData.schedules.filter(s => s.subject_id === subject.id);
    const classInfo = scheduleData.classes.find(c => c.id === subject.class_id);

    return {
      subject,
      class: classInfo,
      periods: subjectSchedules.length
    };
  });

  workloadContainer.innerHTML = `
    <div class="workload-summary-card">
      <h4 style="text-align: center !important;">📝 ภาระงานสอน</h4>
      <div class="subjects-list">
        ${subjectSummary.map(item => `
          <div class="subject-workload-item">
            <span class="subject-code">${item.subject.subject_code || 'ไม่มีรหัส'}</span>
            <span class="subject-name">${item.subject.subject_name}</span>
            <span class="class-names">${item.class?.class_name || 'ไม่ระบุห้อง'}</span>
            <span class="periods-count">${item.periods} คาบ</span>
          </div>
        `).join('')}
      </div>
      <div class="total-workload" style="text-align: center !important;">
        <strong>รวม ${scheduleData.totalPeriods} คาบ/สัปดาห์</strong>
      </div>
    </div>
  `;
}

/**
 * Get Teacher Schedule Data
 */
async function getTeacherScheduleData(teacherId, context) {
  // Load all data
  const [schedulesResult, subjectsResult, classesResult, roomsResult] = await Promise.all([
    dataService.getSchedules(),
    dataService.getSubjects(),
    dataService.getClasses(),
    dataService.getRooms()
  ]);

  const schedules = schedulesResult.data || [];
  const subjects = subjectsResult.data || [];
  const classes = classesResult.data || [];
  const rooms = roomsResult.data || [];

  // Filter subjects taught by this teacher
  const teacherSubjects = subjects.filter(s => s.teacher_id === teacherId);
  const subjectIds = teacherSubjects.map(s => s.id);

  // Filter schedules for teacher's subjects
  const teacherSchedules = schedules.filter(s => subjectIds.includes(s.subject_id));

  // Build schedule matrix
  const matrix = buildTeacherScheduleMatrix(teacherSchedules, { subjects, classes, rooms });

  return {
    subjects: teacherSubjects,
    schedules: teacherSchedules,
    matrix,
    classes,
    rooms,
    totalPeriods: teacherSchedules.length
  };
}

/**
 * Build Teacher Schedule Matrix
 */
function buildTeacherScheduleMatrix(schedules, context) {
  const matrix = {};

  // Initialize empty matrix
  for (let day = 1; day <= 5; day++) {
    matrix[day] = {};
    for (let period = 1; period <= 8; period++) {
      matrix[day][period] = null;
    }
  }

  // Fill matrix with schedule data
  schedules.forEach(schedule => {
    const subject = context.subjects.find(s => s.id === schedule.subject_id);
    const classInfo = context.classes.find(c => c.id === schedule.class_id);
    const room = context.rooms.find(r => r.id === schedule.room_id);

    if (schedule.day_of_week && schedule.period) {
      matrix[schedule.day_of_week][schedule.period] = {
        schedule,
        subject: subject || { subject_name: 'ไม่ระบุวิชา' },
        class: classInfo || { class_name: 'ไม่ระบุห้อง' },
        room: room || { name: 'ไม่ระบุห้อง' }
      };
    }
  });

  return matrix;
}

/**
 * Render Teacher Info
 */
function renderTeacherInfo(teacher, scheduleData) {
  const infoContainer = document.getElementById('teacher-info');
  if (!infoContainer) return;

  infoContainer.innerHTML = `
    <div class="teacher-profile">
      <h3>${teacher.name}</h3>
      <div class="teacher-details">
        <span class="badge badge--${teacher.subject_group.toLowerCase()}">${teacher.subject_group}</span>
        <span class="teacher-role">${teacher.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครู'}</span>
      </div>
      <div class="contact-info">
        ${teacher.email ? `<div>📧 ${teacher.email}</div>` : ''}
        ${teacher.phone ? `<div>📱 ${teacher.phone}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render Schedule Table
 */
function renderScheduleTable(scheduleData, teacher, context) {
  const tableContainer = document.getElementById('teacher-schedule-table');
  if (!tableContainer) return;

  const timeSlots = generateTimeSlots();
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  let tableHTML = `
    <div class="schedule-table-wrapper">
      <h4>ตารางสอน ${teacher.name}</h4>
      <table class="schedule-table teacher-schedule">
        <thead>
          <tr>
            <th class="day-header">วัน/เวลา</th>
            ${timeSlots.map((timeSlot, index) =>
    `<th class="period-header">คาบ ${index + 1}<br><small>${timeSlot}</small></th>`
  ).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  // วนเป็นแถว (แต่ละวัน)
  days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1;

    tableHTML += `
      <tr class="day-row" data-day="${dayNumber}">
        <td class="day-cell">
          <div class="day-name">${day}</div>
        </td>
    `;

    // คาบเป็นคอลัมน์ (แต่ละคาบ)
    timeSlots.forEach((timeSlot, periodIndex) => {
      const period = periodIndex + 1;
      const cellData = scheduleData.matrix[dayNumber]?.[period];

      if (cellData) {
        tableHTML += `
          <td class="schedule-cell has-subject" data-day="${dayNumber}" data-period="${period}">
            <div class="subject-info">
              <div class="subject-name">${cellData.subject.subject_name}</div>
              <div class="class-name">${cellData.class.class_name}</div>
              <div class="room-name">
                ${cellData.room.name}
                ${cellData.room.room_type ? `<span class="room-type ${cellData.room.room_type.toLowerCase()}">${cellData.room.room_type}</span>` : ''}
              </div>
            </div>
          </td>
        `;
      } else {
        tableHTML += `
          <td class="schedule-cell empty" data-day="${dayNumber}" data-period="${period}">
            <div class="empty-period">-</div>
          </td>
        `;
      }
    });

    tableHTML += '</tr>';
  });

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  tableContainer.innerHTML = tableHTML;
}

/**
 * Render Workload Details
 */
function renderWorkloadDetails(scheduleData, teacher) {
  const workloadContainer = document.getElementById('teacher-workload');
  if (!workloadContainer) return;

  const subjectSummary = scheduleData.subjects.map(subject => {
    const subjectSchedules = scheduleData.schedules.filter(s => s.subject_id === subject.id);
    const classInfo = scheduleData.classes.find(c => c.id === subject.class_id);

    return {
      subject,
      class: classInfo,
      periods: subjectSchedules.length
    };
  });

  workloadContainer.innerHTML = `
    <div class="workload-summary">
      <h4>สรุปภาระงาน</h4>
      <div class="workload-stats">
        <div class="stat-item">
          <span class="stat-label">รวมคาบสอน:</span>
          <span class="stat-value">${scheduleData.totalPeriods} คาบ</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">จำนวนวิชา:</span>
          <span class="stat-value">${scheduleData.subjects.length} วิชา</span>
        </div>
      </div>
      
      <div class="subjects-detail">
        <h5>รายวิชาที่สอน</h5>
        ${subjectSummary.map(item => `
          <div class="subject-item">
            <div class="subject-info">
              <span class="subject-name">${item.subject.subject_name}</span>
              <span class="subject-code">${item.subject.subject_code || ''}</span>
            </div>
            <div class="subject-class">${item.class?.class_name || 'ไม่ระบุห้อง'}</div>
            <div class="subject-periods">${item.periods} คาบ</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Setup Event Listeners
 */
function setupEventListeners(context) {
  console.log('[TeacherSchedule] Setting up event listeners');

  // Sub-nav tabs (📊 สรุปภาระงาน <-> 📋 ตารางรายครู)
  document.addEventListener('click', (e) => {
    if (e.target.matches('.sub-nav-tab') && e.target.closest('#page-teacher')) {
      console.log('[TeacherSchedule] Sub-nav tab clicked:', e.target.dataset.target);

      const targetId = e.target.dataset.target;

      // Remove active from all sub-nav tabs
      const allTabs = document.querySelectorAll('#page-teacher .sub-nav-tab');
      allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });

      // Add active to clicked tab
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');

      // Hide all sub-pages
      const allSubPages = document.querySelectorAll('#page-teacher .sub-page');
      allSubPages.forEach(page => {
        page.classList.remove('active');
        page.classList.add('hidden');
      });

      // Show target sub-page
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');
      }

      console.log(`[TeacherSchedule] Switched to tab: ${targetId}`);
    }
  });

  // Teacher tab clicks (for teacher-details tab)
  document.addEventListener('click', async (e) => {
    if (e.target.matches('.teacher-tab')) {
      console.log('[TeacherSchedule] Teacher tab clicked:', e.target.dataset.teacherId);
      const teacherId = parseInt(e.target.dataset.teacherId);
      await selectTeacher(teacherId, context);
    }
  });

  // Ranking item clicks (from summary to details)
  document.addEventListener('click', async (e) => {
    const rankingItem = e.target.closest('.ranking-item');
    if (rankingItem) {
      console.log('[TeacherSchedule] Ranking item clicked:', rankingItem.dataset.teacherId);
      const teacherId = parseInt(rankingItem.dataset.teacherId);

      // Switch to teacher details tab
      const summaryTab = document.querySelector('[data-target="teacher-summary"]');
      const detailsTab = document.querySelector('[data-target="teacher-details"]');

      console.log('[TeacherSchedule] Found tabs:', { summaryTab, detailsTab });

      if (summaryTab && detailsTab) {
        // Remove active from summary
        summaryTab.classList.remove('active');
        summaryTab.setAttribute('aria-selected', 'false');

        // Add active to details
        detailsTab.classList.add('active');
        detailsTab.setAttribute('aria-selected', 'true');

        // Show/hide content
        const summaryContent = document.getElementById('teacher-summary');
        const detailsContent = document.getElementById('teacher-details');

        console.log('[TeacherSchedule] Found content:', { summaryContent, detailsContent });

        if (summaryContent) {
          summaryContent.classList.remove('active');
          summaryContent.classList.add('hidden');
        }

        if (detailsContent) {
          detailsContent.classList.remove('hidden');
          detailsContent.classList.add('active');
        }

        console.log('[TeacherSchedule] Switched to teacher details tab');
      }

      // Select the teacher
      await selectTeacher(teacherId, context);
    }
  });

  console.log('[TeacherSchedule] Event listeners setup completed');
}

/**
 * Select Teacher
 */
async function selectTeacher(teacherId, context) {
  // Update UI state
  document.querySelectorAll('.teacher-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });

  const activeTab = document.querySelector(`[data-teacher-id="${teacherId}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
  }

  // Update page state
  pageState.selectedTeacher = teacherId;

  // Render teacher schedule
  await renderTeacherSchedule(teacherId, context);

  // Setup export functionality
  setupExportHandlers(teacherId, context);
}

// =============================================================================
// EXPORT FUNCTIONALITY
// =============================================================================

/**
 * Setup Export Handlers
 */
function setupExportHandlers(teacherId, context) {
  // FIX: เปลี่ยน selector ให้ถูกต้อง
  const exportButtons = document.querySelectorAll('#export-bar-teacher button[data-export-type]');

  exportButtons.forEach(button => {
    // FIX: ใช้ clone node เพื่อลบ listener เก่าออกหมด
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    // เพิ่ม listener ใหม่
    newButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleExport(newButton, teacherId, context);
    });
  });

  console.log('[TeacherSchedule] Export handlers setup for teacher:', teacherId, 'buttons found:', exportButtons.length);
}

/**
 * Handle Export
 */
async function handleExport(button, teacherId, context) {
  // FIX: ป้องกัน double click
  if (button.disabled) {
    return;
  }

  try {
    // FIX: ตรวจสอบว่าเลือกครูแล้วหรือไม่
    if (!teacherId || !pageState.selectedTeacher) {
      throw new Error('กรุณาเลือกครูก่อน');
    }

    showExportProgress(button);

    const format = button.dataset.exportType;
    const exportData = await prepareTeacherExportData(teacherId, context);

    const teacher = pageState.teachers.find(t => t.id === teacherId);
    const filename = generateExportFilename(`ตารางสอน-${teacher?.name || 'ครู'}`, context);

    switch (format) {
      case 'csv':
        await exportTableToCSV(exportData, filename);
        break;
      case 'xlsx':
        await exportTableToXLSX(exportData, filename);
        break;
      case 'gsheets':
        await exportTableToGoogleSheets(exportData, filename);
        break;
      default:
        throw new Error('รูปแบบ Export ไม่ถูกต้อง');
    }

    showExportSuccess('Export สำเร็จ!');

  } catch (error) {
    console.error('[TeacherSchedule] Export failed:', error);
    showExportError(`Export ล้มเหลว: ${error.message}`);
  } finally {
    hideExportProgress(button);
  }
}

/**
 * Prepare Teacher Export Data
 */
async function prepareTeacherExportData(teacherId, context) {
  const scheduleData = await getTeacherScheduleData(teacherId, context);
  const teacher = pageState.teachers.find(t => t.id === teacherId);
  const timeSlots = generateTimeSlots();
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  const exportData = [];

  // FIX: ส่วนหัว - จัดกึ่งกลางเหมือนเว็บ
  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': `ตารางสอน - ${teacher?.name || ''}`,
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });

  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': `กลุ่มสาระ: ${teacher?.subject_group || ''}`,
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });

  // เพิ่มโทรศัพท์ถ้ามี
  if (teacher?.phone) {
    exportData.push({
      'วัน/เวลา': '',
      'คาบ 1': '',
      'คาบ 2': '',
      'คาบ 3': `📞 ${teacher.phone}`,
      'คาบ 4': '',
      'คาบ 5': '',
      'คาบ 6': '',
      'คาบ 7': '',
      'คาบ 8': ''
    });
  }

  // เพิ่มอีเมลถ้ามี
  if (teacher?.email) {
    exportData.push({
      'วัน/เวลา': '',
      'คาบ 1': '',
      'คาบ 2': '',
      'คาบ 3': `📧 ${teacher.email}`,
      'คาบ 4': '',
      'คาบ 5': '',
      'คาบ 6': '',
      'คาบ 7': '',
      'คาบ 8': ''
    });
  }

  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': `ภาคเรียน: ภาคเรียนที่ ${context.currentSemester?.semester_number || 1} ปีการศึกษา ${context.currentYear}`,
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });

  // บรรทัดว่าง
  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': '',
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });
  // FIX: หัวตาราง
  exportData.push({
    'วัน/เวลา': 'วัน/เวลา',
    'คาบ 1': `คาบ 1\n${timeSlots[0] || ''}`,
    'คาบ 2': `คาบ 2\n${timeSlots[1] || ''}`,
    'คาบ 3': `คาบ 3\n${timeSlots[2] || ''}`,
    'คาบ 4': `คาบ 4\n${timeSlots[3] || ''}`,
    'คาบ 5': `คาบ 5\n${timeSlots[4] || ''}`,
    'คาบ 6': `คาบ 6\n${timeSlots[5] || ''}`,
    'คาบ 7': `คาบ 7\n${timeSlots[6] || ''}`,
    'คาบ 8': `คาบ 8\n${timeSlots[7] || ''}`
  });

  // FIX: ข้อมูลตาราง - แต่ละวัน
  days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const rowData = { 'วัน/เวลา': day };

    // แต่ละคาบ (8 คาบ)
    timeSlots.forEach((timeSlot, periodIndex) => {
      const period = periodIndex + 1;
      const cellData = scheduleData.matrix[dayNumber]?.[period];

      if (cellData) {
        rowData[`คาบ ${period}`] = `${cellData.subject.subject_name}\n${cellData.class.class_name}\n${cellData.room.name}`;
      } else {
        rowData[`คาบ ${period}`] = '-';
      }
    });

    exportData.push(rowData);
  });

  // FIX: ส่วนสรุป - บรรทัดว่าง
  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': '',
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });

  // ส่วนสรุป - จัดกึ่งกลาง
  const subjectSummary = scheduleData.subjects.map(subject => {
    const subjectSchedules = scheduleData.schedules.filter(s => s.subject_id === subject.id);
    const classInfo = scheduleData.classes.find(c => c.id === subject.class_id);
    return { subject, class: classInfo, periods: subjectSchedules.length };
  });

  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': '📝 ภาระงานสอน',
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });
// รายการวิชา
  subjectSummary.forEach(item => {
    exportData.push({
      'วัน/เวลา': '',
      'คาบ 1': `${item.subject.subject_code || 'ไม่มีรหัส'} ${item.subject.subject_name}`,
      'คาบ 2': '',
      'คาบ 3': '',
       'คาบ 4': `${item.class?.class_name || 'ไม่ระบุห้อง'}`,
        'คาบ 5': '',
         'คาบ 6': `${item.periods} คาบ`,
          'คาบ 7': '', 
          'คาบ 8': ''
    });
  });


  // สรุปรวม - จัดกึ่งกลาง
  exportData.push({
    'วัน/เวลา': '', 
    'คาบ 1': '', 
    'คาบ 2': '',
    'คาบ 3': `รวม ${scheduleData.totalPeriods} คาบ/สัปดาห์`,
    'คาบ 4': '', 
    'คาบ 5': '', 
    'คาบ 6': '', 
    'คาบ 7': '', 
    'คาบ 8': ''
  });

  // FIX: ส่วนสรุป - บรรทัดว่าง
  exportData.push({
    'วัน/เวลา': '',
    'คาบ 1': '',
    'คาบ 2': '',
    'คาบ 3': '',
    'คาบ 4': '',
    'คาบ 5': '',
    'คาบ 6': '',
    'คาบ 7': '',
    'คาบ 8': ''
  });



  return exportData;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================


function generateExportFilename(baseName, context) {
  const year = context.currentYear || 'unknown';
  const semester = context.currentSemester?.semester_number || 'unknown';
  const date = new Date().toISOString().slice(0, 10);

  return `${baseName}_${year}_ภาค${semester}_${date}`;
}

/**
 * Loading and Error States
 */
function setLoading(isLoading) {
  pageState.isLoading = isLoading;

  const loadingElement = document.getElementById('teacher-loading');
  if (loadingElement) {
    loadingElement.style.display = isLoading ? 'block' : 'none';
  }
}

function showError(message) {
  pageState.error = message;

  console.error('[TeacherSchedule] Error:', message);

  // แสดง error ใน UI ถ้ามี element
  const errorElement = document.getElementById('teacher-error');
  if (errorElement) {
    const errorMsg = errorElement.querySelector('.error-message');
    if (errorMsg) errorMsg.textContent = message;
    errorElement.style.display = 'block';

    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  } else {
    // Fallback: แสดงใน summary section
    const summaryContainer = document.getElementById('teacher-summary');
    if (summaryContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.cssText = 'color: red; padding: 20px; background: #ffe6e6; border: 1px solid #ff0000; margin: 10px 0; border-radius: 4px;';
      errorDiv.textContent = `เกิดข้อผิดพลาด: ${message}`;
      summaryContainer.appendChild(errorDiv);
    }
  }
}

/**
 * Export Progress Functions
 */
function showExportProgress(button) {
  button.disabled = true;
  button.innerHTML = '⏳ กำลัง Export...';
}

function hideExportProgress(button) {
  button.disabled = false;
  const format = button.dataset.exportType;
  const texts = {
    'csv': '📄 CSV',
    'xlsx': '📊 Excel',
    'gsheets': '📋 Google Sheets'
  };
  button.innerHTML = texts[format] || 'Export';
}

function showExportSuccess(message) {
  // Show success notification (implement notification system if needed)
  console.log('[TeacherSchedule]', message);
}

function showExportError(message) {
  // Show error notification (implement notification system if needed)
  console.error('[TeacherSchedule] Export Error:', message);

  // FIX: แสดง popup แจ้งเตือน
  alert(message);
}

// Export page state for debugging
export function getPageState() {
  return { ...pageState };
}
