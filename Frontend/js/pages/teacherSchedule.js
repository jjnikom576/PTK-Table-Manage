/**
 * Enhanced Teacher Schedule Page for Multi-Year School Schedule System
 * Features: Teacher workload summary, Individual schedules, Export functionality
 */

import * as dataService from '../services/dataService.js';
import * as globalContext from '../context/globalContext.js';
import { exportTableToCSV, exportTableToXLSX, exportTableToGoogleSheets } from '../utils/export.js';
import { formatRoomName, getRoomTypeBadgeClass, getThaiDayName, generateTimeSlots, isActiveSemester } from '../utils.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get teacher display name (handle different API formats)
 */
function getTeacherName(teacher) {
  if (!teacher) return 'ไม่ระบุชื่อ';
  
  // Try full_name first
  if (teacher.full_name) return teacher.full_name;
  
  // Try name
  if (teacher.name) return teacher.name;
  
  // Build from title + f_name + l_name
  const parts = [];
  if (teacher.title) parts.push(teacher.title);
  if (teacher.f_name) parts.push(teacher.f_name);
  if (teacher.l_name) parts.push(teacher.l_name);
  
  return parts.length > 0 ? parts.join(' ') : 'ไม่ระบุชื่อ';
}

// =============================================================================
// PAGE STATE
// =============================================================================

let pageState = {
  teachers: [],
  selectedTeacher: null,
  teacherSchedules: {},
  workloadSummary: null,
  isLoading: false,
  error: null,
  // For group filter in "ตารางรายครู"
  selectedGroup: 'ALL'
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Initialize Teacher Schedule Page
 */
export async function initTeacherSchedulePage(context = null) {
  // ⭐ FIX: ใช้ global context แทน parameter
  const currentContext = context || globalContext.getContext();
  
  console.log('[TeacherSchedule] Initializing page with context:', currentContext);

  try {
    // Validate context
    if (!currentContext.currentYear || !currentContext.currentSemester) {
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
    await dataService.setGlobalContext(currentContext.currentYear, (currentContext.currentSemester && currentContext.currentSemester.id) || null);

    // Load teachers and data
    console.log('[TeacherSchedule] Loading teachers data');
    await loadTeachersData(currentContext);

    // Render components
    console.log('[TeacherSchedule] Rendering workload summary');
    await renderWorkloadSummary(currentContext);

    console.log('[TeacherSchedule] Rendering teacher tabs');
    await renderTeacherTabs(currentContext);

    // Setup event listeners
    console.log('[TeacherSchedule] Setting up event listeners');
    setupEventListeners(currentContext);

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

/**
 * Refresh Page (NEW - สำหรับ app.js)
 */
import coreAPI from '../api/core-api.js';

export async function refreshPage(newContext = null) {
  console.log('[TeacherSchedule] Refreshing page with context:', newContext);
  
  // ⭐ FIX: ใช้ global context ถ้าไม่มี newContext
  const currentContext = newContext || globalContext.getContext();
  
  try {
    // Clear current state
    pageState.teachers = [];
    pageState.selectedTeacher = null;
    pageState.teacherSchedules = {};
    pageState.workloadSummary = null;

    // Reload with new context
    await initTeacherSchedulePage(currentContext);
    
    console.log('[TeacherSchedule] ✅ Page refreshed successfully');

  } catch (error) {
    console.error('[TeacherSchedule] Failed to refresh page:', error);
    showError(error.message);
  }
}

/**
 * Refresh Page Data (NEW - สำหรับ context switching)
 */
export async function refreshPageData(newContext, preserveSelection = null) {
  console.log('[TeacherSchedule] Refreshing page data with context:', newContext);
  
  try {
    // Set loading state
    setLoading(true);
    
    // ⭐ FIX: Set context in dataService first
    await dataService.setGlobalContext(newContext.currentYear || newContext.year, newContext.currentSemester?.id || newContext.semesterId);
    
    // Clear current state
    pageState.teachers = [];
    pageState.selectedTeacher = null;
    pageState.teacherSchedules = {};
    pageState.workloadSummary = null;
    
    // Reload data with new context
    await loadTeachersData(newContext);
    
    // Re-render components
    await renderWorkloadSummary(newContext);
    await renderTeacherTabs(newContext);
    
    // Clear any selected teacher (let user reselect)
    const contentWrapper = document.getElementById('teacher-schedule-content');
    const teacherInfoContainer = document.getElementById('teacher-info');
    const scheduleContainer = document.getElementById('teacher-schedule-table');
    const workloadContainer = document.getElementById('teacher-workload');
    const emptyState = document.getElementById('teacher-details-empty');

    const exportBar = document.getElementById('export-bar-teacher');
    if (exportBar) exportBar.classList.add('hidden');
    if (contentWrapper) contentWrapper.classList.add('hidden');
    if (teacherInfoContainer) teacherInfoContainer.classList.add('hidden');
    if (scheduleContainer) scheduleContainer.classList.add('hidden');
    if (workloadContainer) workloadContainer.classList.add('hidden');
    if (emptyState) emptyState.style.display = 'block';
    
    // Clear active tab
    const activeTabs = document.querySelectorAll('.teacher-tab.active');
    activeTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    console.log('[TeacherSchedule] ✅ Page refresh completed successfully');
    
  } catch (error) {
    console.error('[TeacherSchedule] Error refreshing page:', error);
    showError('เกิดข้อผิดพลาดในการรีเฟรชข้อมูลครู: ' + error.message);
  } finally {
    setLoading(false);
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load Teachers Data (FIXED - ใช้ context ที่ถูกต้อง)
 */
async function loadTeachersData(context) {
  try {
    setLoading(true);
    
    // ⭐ FIX: ใช้ year จาก context ให้ถูกต้อง
    const targetYear = context.currentYear || context.year;
    console.log(`[TeacherSchedule] Loading data for year: ${targetYear}`);
    
    if (!targetYear) {
      throw new Error('ไม่ได้ระบุปีการศึกษา');
    }

    // ⭐ FIX: ส่ง year parameter ให้ทุก API call
    const semesterId = context.currentSemester?.id || context.semesterId;
    const [teachersResult, schedulesResult, subjectsResult, classesResult, roomsResult] = await Promise.all([
      dataService.getTeachers(targetYear),
      dataService.getSchedules(targetYear),
      dataService.getSubjects(targetYear, semesterId),
      dataService.getClasses(targetYear, semesterId),
      dataService.getRooms(targetYear, semesterId)
    ]);

    // ตรวจสอบผลลัพธ์
    if (!teachersResult.ok) {
      console.error('[TeacherSchedule] Teachers load failed:', teachersResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลครูได้: ' + teachersResult.error);
    }
    if (!schedulesResult.ok) {
      console.error('[TeacherSchedule] Schedules load failed:', schedulesResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลตารางสอนได้: ' + schedulesResult.error);
    }
    if (!subjectsResult.ok) {
      console.error('[TeacherSchedule] Subjects load failed:', subjectsResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลวิชาได้: ' + subjectsResult.error);
    }

    pageState.teachers = teachersResult.data;

    console.log(`[TeacherSchedule] ✅ Successfully loaded data for year ${targetYear}:`, {
      teachers: teachersResult.data.length,
      schedules: schedulesResult.data.length,
      subjects: subjectsResult.data.length,
      classes: classesResult.data?.length || 0,
      rooms: roomsResult.data?.length || 0
    });

    // ⭐ FIX: คิดภาระงานเฉพาะภาคเรียนปัจจุบันเท่านั้น
    await calculateWorkloadSummary({
      teachers: teachersResult.data,
      schedules: schedulesResult.data,
      subjects: subjectsResult.data,
      classes: classesResult.data || [],
      rooms: roomsResult.data || [],
      semesterId: (context.currentSemester && context.currentSemester.id) || null
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
  const { teachers, schedules, subjects, classes = [] } = data;

  // ⭐ DEBUG: ดูข้อมูลที่ได้รับ
  console.log('[calculateWorkloadSummary] Input data:', {
    teachers: teachers.length,
    schedules: schedules.length,
    subjects: subjects.length,
    classes: classes.length
  });
  
  // ตัวอย่าง schedule ครูคนแรก (index 0)
  if (teachers.length > 0) {
    const firstTeacher = teachers[0];
    console.log('[calculateWorkloadSummary] First teacher:', {
      id: firstTeacher.id,
      name: getTeacherName(firstTeacher),
      subject_group: firstTeacher.subject_group
    });
    
    const teacherSubjects = subjects.filter(s => s.teacher_id === firstTeacher.id);
    console.log('[calculateWorkloadSummary] First teacher subjects:', teacherSubjects.length);
    
    const subjectById = new Map(subjects.map(s => [s.id, s]));
    const teacherSchedules = schedules.filter(sc => {
      const sub = subjectById.get(sc.subject_id);
      return sub && sub.teacher_id === firstTeacher.id;
    });
    console.log('[calculateWorkloadSummary] First teacher schedules:', teacherSchedules.length);
    
    // ดู period_no ทั้งหมด
    const periodNumbers = teacherSchedules.map(s => s.period_no || s.period);
    console.log('[calculateWorkloadSummary] First teacher period_no:', periodNumbers.sort((a, b) => a - b));
    
    // นับตามช่วง
    const periodCounts = {};
    periodNumbers.forEach(p => {
      periodCounts[p] = (periodCounts[p] || 0) + 1;
    });
    console.log('[calculateWorkloadSummary] First teacher period distribution:', periodCounts);
  }

  // สร้างดัชนี subject ตาม id เพื่อ join schedule -> subject -> teacher อย่างแม่นยำ
  const subjectById = new Map((subjects || []).map(s => [s.id, s]));

  // Group teachers by subject group
  const subjectGroups = {};
  const teacherWorkloads = [];

  teachers.forEach(teacher => {
    // รายวิชาที่ครูสอน (จาก subjects ของปีนี้)
    const teacherSubjects = (subjects || []).filter(s => s.teacher_id === teacher.id);

    // คาบสอนจริงของครู (จาก schedules ของปีนี้ โดยอิง subject->teacher)
    const teacherSchedules = (schedules || []).filter(sc => {
      const sub = subjectById.get(sc.subject_id);
      return sub && sub.teacher_id === teacher.id;
    });

    // ⭐ FIX 2025-10-01: นับจำนวน schedule entries จริง ไม่ใช่ unique time slots
    // เพราะครูอาจสอนหลายห้องในคาบเดียวกัน ควรนับเป็นจำนวนคาบสอนจริง
    const totalPeriods = teacherSchedules.length;
    
    // ⭐ DEBUG: ดูครู "นาย ภูริช ศิริมงคล" โดยเฉพาะ
    const teacherName = getTeacherName(teacher);
    if (teacherName.includes('ภูริช') || teacher.subject_group === 'ศิลปะการแสดง') {
      console.log(`\n[calculateWorkloadSummary] Teacher "${teacherName}":`, {
        id: teacher.id,
        subject_group: teacher.subject_group,
        subjectsCount: teacherSubjects.length,
        schedulesCount: teacherSchedules.length
      });
      
      // ดู period_no distribution
      const periodNumbers = teacherSchedules.map(s => s.period_no || s.period);
      const periodCounts = {};
      periodNumbers.forEach(p => {
        periodCounts[p] = (periodCounts[p] || 0) + 1;
      });
      console.log(`[calculateWorkloadSummary] "${teacherName}" period distribution:`, periodCounts);
      
      // นับแยกตามช่วง
      const period1to8 = periodNumbers.filter(p => p >= 1 && p <= 8).length;
      const period9plus = periodNumbers.filter(p => p >= 9).length;
      console.log(`[calculateWorkloadSummary] "${teacherName}" periods: 1-8 = ${period1to8}, 9+ = ${period9plus}`);
      
      // ⭐ DEBUG: ดูว่าสอนห้องอะไรบ้างในแต่ละคาบ
      console.log(`[calculateWorkloadSummary] "${teacherName}" schedule details:`);
      teacherSchedules.forEach(sc => {
        const sub = subjectById.get(sc.subject_id);
        const cls = (classes || []).find(c => c.id === sc.class_id);
        console.log(`  - Day ${sc.day_of_week} Period ${sc.period_no || sc.period}: ${sub?.subject_name} @ ${cls?.class_name || 'N/A'}`);
      });
    }

    // สะสมตามกลุ่มสาระ
    if (!subjectGroups[teacher.subject_group]) {
      subjectGroups[teacher.subject_group] = {
        name: teacher.subject_group,
        teachers: 0,
        totalPeriods: 0
      };
    }
    subjectGroups[teacher.subject_group].teachers += 1;
    subjectGroups[teacher.subject_group].totalPeriods += totalPeriods;

    // บันทึกสรุปรายครู
    teacherWorkloads.push({
      teacher,
      subjects: teacherSubjects,
      schedules: teacherSchedules,
      totalPeriods,
      subjectsCount: teacherSubjects.length
    });
  });

  // Debug: log totals
  try {
    const totalSchedulesAll = (schedules || []).length;
    const totalSubjectsAll = (subjects || []).length;
    const totalPeriodsSum = teacherWorkloads.reduce((sum, t) => sum + t.totalPeriods, 0);
    console.log('[TeacherSchedule] Workload debug:', { totalSchedulesAll, totalSubjectsAll, totalPeriodsSum });
    // Fallback: if sum is zero but schedules exist, try year-class filter fallback
    if (totalPeriodsSum === 0 && totalSchedulesAll > 0 && classes.length > 0) {
      console.warn('[TeacherSchedule] Detected zero workload with schedules present. Applying year-class fallback...');
      const classIdsOfYear = new Set(classes.map(c => c.id));
      const filteredSchedules = schedules.filter(sc => classIdsOfYear.has(sc.class_id));
      const subjectById = new Map((subjects || []).map(s => [s.id, s]));
      teacherWorkloads.length = 0;
      const subjectGroupsFB = {};
      teachers.forEach(teacher => {
        const teacherSubjects = (subjects || []).filter(s => s.teacher_id === teacher.id && classIdsOfYear.has(s.class_id));
        const teacherSchedules = filteredSchedules.filter(sc => {
          const sub = subjectById.get(sc.subject_id);
          return sub && sub.teacher_id === teacher.id && classIdsOfYear.has(sc.class_id);
        });
        const totalPeriods = teacherSchedules.length;
        if (!subjectGroupsFB[teacher.subject_group]) {
          subjectGroupsFB[teacher.subject_group] = { name: teacher.subject_group, teachers: 0, totalPeriods: 0 };
        }
        subjectGroupsFB[teacher.subject_group].teachers += 1;
        subjectGroupsFB[teacher.subject_group].totalPeriods += totalPeriods;
        teacherWorkloads.push({ teacher, subjects: teacherSubjects, schedules: teacherSchedules, totalPeriods, subjectsCount: teacherSubjects.length });
      });
      pageState.workloadSummary = {
        subjectGroups: Object.values(subjectGroupsFB),
        teacherWorkloads: teacherWorkloads.sort((a, b) => b.totalPeriods - a.totalPeriods)
      };
      console.log('[TeacherSchedule] Fallback workload computed.');
      return;
    }
  } catch (e) {
    console.warn('[TeacherSchedule] Workload debug/fallback error:', e);
  }

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

  // อัปเดต teacher ranking (จัดเป็น 4 บรรทัด: Rank -> Group -> Name -> Subjects & Hours)
  const teacherRankingContainer = document.getElementById('teacher-ranking');
  console.log('[TeacherSchedule] teacher-ranking element:', teacherRankingContainer);

  if (teacherRankingContainer) {
    const html = teacherWorkloads.map((item, index) => {
      const rank = `#${index + 1}`;
      const group = item.teacher.subject_group || '';
      const name = getTeacherName(item.teacher); // ⭐ FIX: ใช้ helper function
      const meta = `${item.subjectsCount} วิชา • ${item.totalPeriods} คาบ`;
      return `
        <div class="ranking-item" data-teacher-id="${item.teacher.id}">
          <div class="rank-line">${rank}</div>
          <div class="group-line">${group}</div>
          <div class="name-line">${name}</div>
          <div class="meta-line">
            <span class="subjects-count">${item.subjectsCount} วิชา</span>
            <span class="dot">•</span>
            <span class="periods-count">${item.totalPeriods} คาบ</span>
          </div>
        </div>`;
    }).join('');

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

  // Build group names and buckets
  const groups = pageState.teachers.reduce((acc, t) => {
    const key = t.subject_group || 'อื่นๆ';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'th'));

  // Render group filter chips
  const filterBar = `
    <div id="teacher-group-filter" class="group-filter" role="tablist" aria-label="กรองตามกลุ่มสาระ">
      <button class="group-chip ${pageState.selectedGroup === 'ALL' ? 'active' : ''}" data-group="ALL">ทั้งหมด</button>
      ${groupNames.map(g => `
        <button class="group-chip ${pageState.selectedGroup === g ? 'active' : ''}" data-group="${g}">${g}</button>
      `).join('')}
    </div>
  `;

  // Selected group -> render only that group, otherwise render all
  const selected = pageState.selectedGroup || 'ALL';
  const visibleGroups = selected === 'ALL' ? groupNames : groupNames.filter(g => g === selected);
  const singleClass = visibleGroups.length === 1 ? ' single' : '';
  const groupsHTML = `
    <div class="teacher-groups${singleClass}">
      ${visibleGroups.map(g => {
        const list = groups[g]
          .slice()
          .sort((a, b) => {
            const nameA = getTeacherName(a); // ⭐ FIX: ใช้ helper function
            const nameB = getTeacherName(b);
            return nameA.localeCompare(nameB, 'th');
          })
          .map(t => `
            <button class="teacher-tab" data-teacher-id="${t.id}" role="tab" aria-selected="false">
              <span class="teacher-tab__name">${getTeacherName(t)}</span>
            </button>
          `).join('');
        return `
          <div class="group-section">
            <div class="group-title">${g}</div>
            <div class="group-list" role="tablist" aria-label="${g}">
              ${list}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  tabsContainer.innerHTML = filterBar + groupsHTML;
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
    document.getElementById('export-bar-teacher')?.classList.remove('hidden');
    document.getElementById('teacher-schedule-content')?.classList.remove('hidden');
    document.getElementById('teacher-info')?.classList.remove('hidden');
    document.getElementById('teacher-schedule-table')?.classList.remove('hidden');
    document.getElementById('teacher-workload')?.classList.remove('hidden');
    document.getElementById('teacher-details-empty')?.style.setProperty('display', 'none');

    // Smooth scroll to the first section heading: "ตารางสอน - {teacher.name}"
    const infoHeadingEl = document.querySelector('#teacher-info .teacher-info-card h4') ||
                          document.getElementById('teacher-info') ||
                          document.getElementById('teacher-schedule-table');
    if (infoHeadingEl) {
      scrollElementToViewportTop(infoHeadingEl, 72);
    }

  } catch (error) {
    console.error('[TeacherSchedule] Failed to render teacher schedule:', error);
    showError(`โหลดตารางสอน ${teacher.name} ล้มเหลว: ${error.message}`);
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
      <h4 style="text-align: center;">ตารางสอน - ${getTeacherName(teacher)}</h4>
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

  // ⭐ FIX ข้อ 1: ใช้ 7 คาบ (1-4 เช้า, 5-7 บ่าย)
  const allTimeSlots = generateTimeSlots(); // 8 คาบ
  const timeSlots = [
    allTimeSlots[0], // คาบ 1
    allTimeSlots[1], // คาบ 2
    allTimeSlots[2], // คาบ 3
    allTimeSlots[3], // คาบ 4
    allTimeSlots[4], // คาบ 5 (หลังพัก)
    allTimeSlots[5], // คาบ 6
    allTimeSlots[6]  // คาบ 7
  ];
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  let tableHTML = `
    <div class="schedule-table-card">
      <div class="table-responsive">
        <table class="schedule-table teacher-schedule">
          <thead>
            <tr>
              <th class="day-header">วัน/เวลา</th>
              ${timeSlots.map((timeSlot, index) => {
                const periodNum = index + 1;
                let headerHTML = `
                <th class="period-header">
                  <div class="period-info">
                    <div class="period-number">คาบ ${periodNum}</div>
                    <div class="time-slot">${timeSlot}</div>
                  </div>
                </th>`;
                // ⭐ FIX: Add lunch header AFTER period 4
                if (periodNum === 4) {
                  headerHTML += `<th class="lunch-header lunch-column"><div class="lunch-info">พักเที่ยง<br><small>12:00 - 13:00</small></div></th>`;
                }
                return headerHTML;
              }).join('')}
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
        // ⭐ FIX ข้อ 2: ใช้ subject_code แทน subject_name
        const subjectCode = cellData.subject.subject_code || '';
        const className = cellData.class.class_name || cellData.class.name || '';
        const roomName = String(cellData.room.name || cellData.room.room_name || "").replace(/^ห้อง\s*/i, "");
        
        tableHTML += `
          <td class="schedule-cell has-subject" data-day="${dayNumber}" data-period="${period}">
            <div class="subject-info">
              <div class="subject-code">${subjectCode}</div>
              <div class="class-name">${className}</div>
              <div class="room-name">${roomName}</div>
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

      // Insert lunch column after period 4; merge cells for all days using rowspan
      if (period === 4) {
        if (dayIndex === 0) {
          tableHTML += `<td class=\"lunch-cell lunch-column\" aria-label=\"พักเที่ยง\" rowspan=\"${days.length}\">พักเที่ยง</td>`;
        }
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
 * Render Workload Details Section (ใช้ schedules เป็นหลัก)
 */
function renderWorkloadDetailsSection(scheduleData, teacher) {
  const workloadContainer = document.getElementById('teacher-workload');
  if (!workloadContainer) return;
  
  // ใช้ schedules เป็นหลัก - กรองเฉพาะ period 1-8
  const validSchedules = scheduleData.schedules.filter(s => {
    const periodNo = s.period_no || s.period;
    return periodNo >= 1 && periodNo <= 8;
  });
  
  // จัดกลุ่มตาม subject_id + class_id
  const subjectClassMap = new Map();
  
  validSchedules.forEach(schedule => {
    const key = `${schedule.subject_id}-${schedule.class_id}`;
    if (!subjectClassMap.has(key)) {
      subjectClassMap.set(key, {
        schedules: [],
        subject_id: schedule.subject_id,
        class_id: schedule.class_id
      });
    }
    subjectClassMap.get(key).schedules.push(schedule);
  });

  // สร้างสรุปแต่ละวิชา+ห้อง
  const subjectSummary = Array.from(subjectClassMap.values())
    .map(item => {
      // หา subject info
      const subject = scheduleData.subjects.find(s => s.id === item.subject_id);
      if (!subject) {
        console.warn(`[renderWorkloadDetails] Subject not found: ${item.subject_id}`);
        return null;
      }
      
      // หา class info
      const classInfo = scheduleData.classes.find(c => c.id === item.class_id);
      if (!classInfo) {
        console.warn(`[renderWorkloadDetails] Class not found: ${item.class_id}`);
        return null;
      }
      
      // นับ unique time slots
      const uniqueTimeSlots = new Set(
        item.schedules.map(sc => `${sc.day_of_week}-${sc.period_no || sc.period}`)
      );
      
      return {
        subject,
        class: classInfo,
        periods: uniqueTimeSlots.size,
        scheduleCount: item.schedules.length
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => {
      // เรียงตาม subject_code แล้วตาม class_name
      const codeCompare = (a.subject.subject_code || '').localeCompare(b.subject.subject_code || '', 'th');
      if (codeCompare !== 0) return codeCompare;
      return (a.class.class_name || '').localeCompare(b.class.class_name || '', 'th');
    });

  workloadContainer.innerHTML = `
    <div class="workload-summary-card">
      <h4 style="text-align: center !important;">📝 ภาระงานสอน</h4>
      <div class="subjects-list">
        ${subjectSummary.map(item => {
          const subjectCode = item.subject.subject_code || item.subject.subject_name.substring(0, 6);
          return `
          <div class="subject-workload-item">
            <span class="subject-code">${subjectCode}</span>
            <span class="subject-name">${item.subject.subject_name}</span>
            <span class="class-names">${item.class.class_name || item.class.name || 'ไม่ระบุห้อง'}</span>
            <span class="periods-count">${item.periods} คาบ</span>
          </div>
        `}).join('')}
      </div>
      <div class="total-workload" style="text-align: center !important;">
        <strong>รวม ${scheduleData.totalPeriods} คาบ/สัปดาห์</strong>
      </div>
    </div>
  `;
}

/**
 * Get Teacher Schedule Data (FIXED - ใช้ context ที่ถูกต้อง + CLEAR CACHE)
 */
async function getTeacherScheduleData(teacherId, context) {
  try {
    console.log(`[TeacherSchedule] Getting schedule data for teacher ${teacherId} with context:`, context);
    
    // ⭐ FIX: ใช้ year จาก context ที่ถูกต้อง
    const targetYear = context.currentYear || context.year;
    if (!targetYear) {
      throw new Error('ไม่ได้ระบุปีการศึกษา');
    }
    
    console.log(`[TeacherSchedule] Loading data for year: ${targetYear}`);
    
    // ⭐ FIX: CLEAR CACHE ก่อนโหลดข้อมูล
    console.log('[TeacherSchedule] Clearing year cache before loading...');
    if (typeof dataService.clearYearCache === 'function') {
      dataService.clearYearCache(targetYear);
    }
    
    // ⭐ FIX: ส่ง year parameter ให้ทุก API call
    const semesterId = context.currentSemester?.id || context.semesterId;
    const [schedulesResult, subjectsResult, classesResult, roomsResult] = await Promise.all([
      dataService.getSchedules(targetYear),
      dataService.getSubjects(targetYear, semesterId),
      dataService.getClasses(targetYear, semesterId),
      dataService.getRooms(targetYear, semesterId)
    ]);
    
    // ตรวจสอบผลลัพธ์
    if (!schedulesResult.ok) {
      console.error('[TeacherSchedule] Schedules load failed:', schedulesResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลตารางสอนได้: ' + schedulesResult.error);
    }
    if (!subjectsResult.ok) {
      console.error('[TeacherSchedule] Subjects load failed:', subjectsResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลวิชาได้: ' + subjectsResult.error);
    }

    const schedules = schedulesResult.data || [];
    const subjects = subjectsResult.data || [];
    const classes = classesResult.data || [];
    const rooms = roomsResult.data || [];

    console.log(`[TeacherSchedule] ✅ Data loaded successfully:`, {
      schedules: schedules.length,
      subjects: subjects.length,
      classes: classes.length,
      rooms: rooms.length
    });

    // ⭐ DEBUG: ดู raw schedules data
    console.log(`[TeacherSchedule] 🔍 Raw schedules for year ${targetYear}:`, schedules.length, 'entries');
    console.log('[TeacherSchedule] 🔍 First 3 schedules:', schedules.slice(0, 3));
    
    // ⭐ FIX: กรองข้อมูลตามปีด้วย class ของปีนี้ (mock บางส่วนใช้ semester_id ข้ามปี)
    const classIdsOfYear = new Set(classes.map(c => c.id));
    const subjectsInYear = subjects.filter(s => classIdsOfYear.has(s.class_id));
    const schedulesInYear = schedules.filter(s => classIdsOfYear.has(s.class_id));

    console.log(`[TeacherSchedule] 🔍 After class filter: ${schedulesInYear.length} schedules`);

    // ⭐ FIX ข้อ 1 & 3: Filter teacher subjects first, THEN get schedules
    const teacherSubjects = subjectsInYear.filter(s => s.teacher_id === teacherId);
    const subjectIds = new Set(teacherSubjects.map(s => s.id));
    
    console.log(`[TeacherSchedule] 🔍 Teacher ${teacherId} teaches ${teacherSubjects.length} subjects:`, 
      teacherSubjects.map(s => `${s.subject_name} (id=${s.id})`));

    // Filter schedules by subject IDs (เฉพาะวิชาที่ครูสอน)
    const teacherSchedules = schedulesInYear.filter(s => subjectIds.has(s.subject_id));
    
    console.log(`[TeacherSchedule] 🔍 Found ${teacherSchedules.length} schedule entries for teacher ${teacherId}`);
    console.log('[TeacherSchedule] 🔍 Teacher schedules period distribution:', 
      teacherSchedules.map(s => `Day${s.day_of_week}P${s.period_no || s.period}`).join(', '));

    // Build schedule matrix
    // ⭐ FIX ข้อ 1: สร้าง matrix จาก teacherSchedules ตรง ๆ (ไม่ใช้ cache)
    const matrix = buildTeacherScheduleMatrix(teacherSchedules, { subjects, classes, rooms });

    // ⭐ FIX: คำนวณ totalPeriods จาก unique (day, period) เท่านั้น
    const validPeriods = teacherSchedules.filter(s => {
      const periodNo = s.period_no || s.period;
      return periodNo >= 1 && periodNo <= 8;
    });
    
    // นับ unique time slots แทนนับทุก schedule
    const uniqueTimeSlots = new Set(
      validPeriods.map(s => `${s.day_of_week}-${s.period_no || s.period}`)
    );
    
    const result = {
      subjects: teacherSubjects,
      schedules: teacherSchedules,
      matrix,
      classes,
      rooms,
      totalPeriods: uniqueTimeSlots.size // ใช้ unique count
    };
    
    console.log(`[TeacherSchedule] ✅ Schedule data prepared for teacher ${teacherId}:`, {
      totalSubjects: result.subjects.length,
      totalSchedules: result.schedules.length,
      totalPeriods: result.totalPeriods
    });
    
    return result;
    
  } catch (error) {
    console.error(`[TeacherSchedule] Failed to get teacher ${teacherId} schedule data:`, error);
    throw error;
  }
}

/**
 * Build Teacher Schedule Matrix
 */
function buildTeacherScheduleMatrix(schedules, context) {
  const matrix = {};

  // ⭐ FIX: Initialize matrix for 7 display periods
  // Display: 1,2,3,4 (เช้า 4 คาบ) → [5 = พักเที่ยง] → 5,6,7 (บ่าย 3 คาบ)
  // API period values: 1,2,3,4, [skip 5], 6,7,8
  for (let day = 1; day <= 5; day++) {
    matrix[day] = {};
    for (let period = 1; period <= 7; period++) {
      matrix[day][period] = null;
    }
  }

  console.log('[buildTeacherScheduleMatrix] 🔨 Building matrix from schedules:', schedules.length);

  // Fill matrix with schedule data
  schedules.forEach(schedule => {
    const subject = context.subjects.find(s => s.id === schedule.subject_id);
    const classInfo = context.classes.find(c => c.id === schedule.class_id);
    const room = context.rooms.find(r => r.id === schedule.room_id);

    // Get period number from API
    const apiPeriod = schedule.period_no || schedule.period;
    if (!schedule.day_of_week || !apiPeriod) return;
    
    // ⭐ MAP API periods to display periods:
    // API: 1,2,3,4 → Display: 1,2,3,4 (เช้า)
    // API: 5 → SKIP (พักเที่ยง)
    // API: 6,7,8 → Display: 5,6,7 (บ่าย)
    let displayPeriod = null;
    
    if (apiPeriod >= 1 && apiPeriod <= 4) {
      // คาบเช้า: ใช้ตรงๆ
      displayPeriod = apiPeriod;
    } else if (apiPeriod >= 6 && apiPeriod <= 8) {
      // คาบบ่าย: แปลง 6→5, 7→6, 8→7
      displayPeriod = apiPeriod - 1;
    }
    // apiPeriod === 5 → skip (พักเที่ยง)
    
    if (displayPeriod !== null && displayPeriod >= 1 && displayPeriod <= 7) {
      matrix[schedule.day_of_week][displayPeriod] = {
        schedule,
        subject: subject || { subject_name: 'ไม่ระบุวิชา', subject_code: '' },
        class: classInfo || { class_name: 'ไม่ระบุห้อง' },
        room: room || { name: 'ไม่ระบุห้อง' }
      };
      
      console.log(`[buildTeacherScheduleMatrix] ✅ Mapped API period ${apiPeriod} → display ${displayPeriod} for Day ${schedule.day_of_week}`);
    }
  });

  console.log('[buildTeacherScheduleMatrix] ✅ Matrix built successfully');
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
    `<th class="period-header"><span class="period-number">คาบ ${index + 1}</span><span class="time-slot">${timeSlot}</span></th>`
  ).join('')}
          </tr>
          <tr class="lunch-row"><th colspan="${1 + timeSlots.length}">พักเที่ยง 12:00 น. - 13:00 น.</th></tr>
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
                ${String(cellData.room.name || "").replace(/^��ͧ\s*/, "")}
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
    // Group filter chip (use delegation to survive re-renders)
    const chip = e.target.closest('.group-chip');
    if (chip) {
      const grp = chip.getAttribute('data-group');
      // Toggle behavior: clicking the same chip again returns to ALL
      if (!grp || grp === 'ALL' || pageState.selectedGroup === grp) {
        pageState.selectedGroup = 'ALL';
      } else {
        pageState.selectedGroup = grp;
      }
      await renderTeacherTabs(context);
      return;
    }

    if (e.target.matches('.teacher-tab')) {
      console.log('[TeacherSchedule] Teacher tab clicked:', e.target.dataset.teacherId);
      const teacherId = parseInt(e.target.dataset.teacherId);
      // Smooth center the clicked tab in the tab strip
      try {
        const tabsContainer = document.getElementById('teacher-tabs');
        if (tabsContainer && e.target) {
          centerElementInContainer(tabsContainer, e.target);
        }
      } catch (err) {
        console.warn('[TeacherSchedule] Failed to center tab:', err);
      }
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
    // Ensure the active tab is centered in view (fallback if click handler missed it)
    const tabsContainer = document.getElementById('teacher-tabs');
    if (tabsContainer) {
      centerElementInContainer(tabsContainer, activeTab);
    }
  }

  // Update page state
  pageState.selectedTeacher = teacherId;

  // Render teacher schedule
  await renderTeacherSchedule(teacherId, context);

  // Setup export functionality
  setupExportHandlers(teacherId, context);
}

// Smoothly scroll an element so its top aligns near the top of the viewport
function scrollElementToViewportTop(element, offset = 0) {
  try {
    const rect = element.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const targetY = currentY + rect.top - (typeof offset === 'number' ? offset : 0);
    const safeY = Math.max(0, Math.min(targetY, document.body.scrollHeight - viewportH));

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: safeY, behavior: 'smooth' });
    } else if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  } catch (e) {
    console.warn('[TeacherSchedule] scrollElementToViewportTop failed:', e);
  }
}

// Smoothly center a child element inside a scrollable container (horizontal)
function centerElementInContainer(container, element) {
  if (!container || !element) return;
  try {
    const containerRect = container.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();

    // Compute element's left relative to container's scrollable content
    const elementLeft = element.offsetLeft;
    const desired = elementLeft - (container.clientWidth / 2 - element.clientWidth / 2);
    const maxScroll = container.scrollWidth - container.clientWidth;
    const targetLeft = Math.max(0, Math.min(desired, maxScroll));

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } else {
      container.scrollLeft = targetLeft;
    }
  } catch (e) {
    console.warn('[TeacherSchedule] centerElementInContainer error:', e);
  }
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
        const subjectCode = cellData.subject.subject_code || cellData.subject.subject_name.substring(0, 6);
        const className = cellData.class.class_name || cellData.class.name || '';
        const roomName = String(cellData.room.name || cellData.room.room_name || "").replace(/^ห้อง\s*/i, "");
        rowData[`คาบ ${period}`] = `${subjectCode}\n${className}\n${roomName}`;
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
    const subjectCode = item.subject.subject_code || item.subject.subject_name.substring(0, 6);
    exportData.push({
      'วัน/เวลา': '',
      'คาบ 1': `${subjectCode} ${item.subject.subject_name}`,
      'คาบ 2': '',
      'คาบ 3': '',
       'คาบ 4': `${item.class?.class_name || item.class?.name || 'ไม่ระบุห้อง'}`,
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

