/**
 * Enhanced Teacher Schedule Page for Multi-Year School Schedule System
 * Features: Teacher workload summary, Individual schedules, Export functionality
 */

import * as dataService from '../services/dataService.js';
import * as globalContext from '../context/globalContext.js';
import { exportTableToCSV, exportTableToXLSX, exportTableToGoogleSheets } from '../utils/export.js';
import {
  formatRoomName,
  getRoomTypeBadgeClass,
  getThaiDayName,
  ensurePeriodsList,
  buildPeriodDisplaySequence,
  extractTeachingPeriods,
  formatPeriodTimeRange,
  generateTimeSlots,
  isActiveSemester
} from '../utils.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get teacher display name (handle different API formats)
 */
function getTeacherName(teacher) {
  if (!teacher) return 'ไม่ระบุชื่อ';

  // Build from title + f_name + l_name (title ชิดกับ f_name, ไม่เว้นวรรค)
  let name = '';

  // title ชิดกับ f_name (ไม่เว้นวรรค)
  if (teacher.title && teacher.f_name) {
    name = teacher.title + teacher.f_name;
  } else if (teacher.f_name) {
    name = teacher.f_name;
  } else if (teacher.title) {
    name = teacher.title;
  }

  // เว้นวรรคก่อน l_name
  if (teacher.l_name) {
    name = name ? name + '  ' + teacher.l_name : teacher.l_name;
  }

  // Fallback: ถ้ายังไม่มีชื่อ ลอง full_name หรือ name
  if (!name) {
    name = teacher.full_name || teacher.name || 'ไม่ระบุชื่อ';
  }

  return name;
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
    const resolvedContext = context || globalContext.getContext() || {};
    const targetYear = resolvedContext.currentYear || resolvedContext.year;
    console.log(`[TeacherSchedule] Loading data for year: ${targetYear}`);
    
    if (!targetYear) {
      throw new Error('ไม่ได้ระบุปีการศึกษา');
    }

    // ⭐ FIX: ส่ง year/semester parameter ให้ทุก API call และบังคับรีเฟรช
    const semesterId =
      resolvedContext.currentSemester?.id ||
      resolvedContext.semesterId ||
      globalContext.getContext()?.currentSemester?.id ||
      null;

    if (!semesterId) {
      throw new Error('ไม่ได้ระบุภาคเรียน');
    }

    const requestOptions = { forceRefresh: true };
    const [
      teachersResult,
      schedulesResult,
      subjectsResult,
      classesResult,
      roomsResult,
      periodsResult
    ] = await Promise.all([
      dataService.getTeachers(targetYear, semesterId, requestOptions),
      dataService.getSchedules(targetYear, semesterId, requestOptions),
      dataService.getSubjects(targetYear, semesterId, requestOptions),
      dataService.getClasses(targetYear, semesterId, requestOptions),
      dataService.getRooms(targetYear, semesterId, requestOptions),
      dataService.getPeriods(targetYear, semesterId, requestOptions)
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

    if (!periodsResult.ok) {
      console.error('[TeacherSchedule] Periods load failed:', periodsResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลคาบเรียนได้: ' + periodsResult.error);
    }

    pageState.teachers = teachersResult.data;

    console.log(`[TeacherSchedule] ✅ Successfully loaded data for year ${targetYear}:`, {
      teachers: teachersResult.data.length,
      schedules: schedulesResult.data.length,
      subjects: subjectsResult.data.length,
      classes: classesResult.data?.length || 0,
      rooms: roomsResult.data?.length || 0,
      periods: periodsResult.data?.length || 0
    });

    // ⭐ FIX: คิดภาระงานเฉพาะภาคเรียนปัจจุบันเท่านั้น
    await calculateWorkloadSummary({
      teachers: teachersResult.data,
      schedules: schedulesResult.data,
      subjects: subjectsResult.data,
      classes: classesResult.data || [],
      rooms: roomsResult.data || [],
      periods: periodsResult.data || [],
      semesterId
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
    showError(`โหลดตารางสอน ${teacher.full_name || teacher.name} ล้มเหลว: ${error.message}`);
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

  // ดึง semester_name จาก context
  const semesterName = context.currentSemester?.semester_name ||
                      context.semester?.semester_name ||
                      globalContext.getContext()?.currentSemester?.semester_name || 'ไม่ระบุภาคเรียน';

  const subjectGroup = teacher.subject_group || 'ไม่ระบุกลุ่มสาระ';
  const email = teacher.email || '-';
  const phone = teacher.phone || '-';

  infoContainer.innerHTML = `
    <div class="teacher-info-card">
      <h4>${getTeacherName(teacher)}</h4>
          
      <div class="teacher-badge">
        <span class="label">กลุ่มสาระการเรียนรู้:</span>
        ${subjectGroup}
      </div>
      <div class="teacher-details-grid">
        <div class="detail-item">
          <span class="label">📧 อีเมล:</span>
          <span class="value">${email}</span>
        </div>
        <div class="detail-item">
          <span class="label">📱 โทรศัพท์:</span>
          <span class="value">${phone}</span>
        </div>
        <div class="detail-item">
          <span class="value">${semesterName} ปีการศึกษา ${context.currentYear}</span>
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

    // คาบเป็นคอลัมน์ (แสดงครบ 7 คาบ)
    timeSlots.forEach((timeSlot, periodIndex) => {
      const period = periodIndex + 1;
      const cellDataArray = scheduleData.matrix[dayNumber]?.[period] || []; // ⭐ FIX: อ่านเป็น Array

      if (cellDataArray.length > 0) {
        // ⭐ FIX: แสดงทุกห้องในคาบเดียวกัน
        const classRooms = cellDataArray.map(cell => {
          const subjectCode = cell.subject.subject_code || '';
          const className = cell.class.class_name || cell.class.name || '';
          return className;
        }).join(', ');
        
        // ใช้ข้อมูลของห้องแรกเป็นตัวแทน (subject_code, room_name)
        const firstCell = cellDataArray[0];
        const subjectCode = firstCell.subject.subject_code || '';
        const roomName = String(firstCell.room.name || firstCell.room.room_name || "").replace(/^ห้อง\s*/i, "");
        
        tableHTML += `
          <td class="schedule-cell has-subject" data-day="${dayNumber}" data-period="${period}">
            <div class="subject-info">
              <div class="subject-code">${subjectCode}</div>
              <div class="class-name">${classRooms}</div>
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

  // สร้างสรุปแต่ละวิชา+ห้อง (แบบไม่รวมกลุ่ม)
  const subjectClassItems = Array.from(subjectClassMap.values())
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
    .filter(item => item !== null);

  // ⭐ รวมกลุ่มตาม subject_code + subject_name
  const groupedMap = new Map();

  subjectClassItems.forEach(item => {
    const subjectCode = item.subject.subject_code || '';
    const subjectName = item.subject.subject_name || '';
    const groupKey = `${subjectCode}|${subjectName}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        subject: item.subject,
        classes: [],
        totalPeriods: 0
      });
    }

    const group = groupedMap.get(groupKey);
    group.classes.push(item.class);
    group.totalPeriods += item.periods;
  });

  // แปลงเป็น array และเรียงลำดับ
  const subjectSummary = Array.from(groupedMap.values())
    .map(group => {
      // ⭐ เรียงลำดับชื่อห้องก่อนรวมกัน - แสดงเป็นแนวตั้ง
      const sortedClassNames = group.classes
        .map(c => c.class_name || c.name || 'ไม่ระบุห้อง')
        .sort((a, b) => a.localeCompare(b, 'th'));

      return {
        subject: group.subject,
        classNames: sortedClassNames.join('<br>'), // ⭐ ใช้ <br> แทน comma
        periods: group.totalPeriods
      };
    })
    .sort((a, b) => {
      // เรียงตาม subject_code
      const codeCompare = (a.subject.subject_code || '').localeCompare(b.subject.subject_code || '', 'th');
      if (codeCompare !== 0) return codeCompare;
      return (a.subject.subject_name || '').localeCompare(b.subject.subject_name || '', 'th');
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
            <span class="class-names">${item.classNames}</span>
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
    console.log('\n' + '='.repeat(80));
    console.log(`🔍 [getTeacherScheduleData] START - Teacher ID: ${teacherId}`);
    console.log('='.repeat(80));
    console.log(`[TeacherSchedule] Getting schedule data for teacher ${teacherId} with context:`, context);
    
    // ⭐ FIX: ใช้ year จาก context ที่ถูกต้อง
    const resolvedContext = context || {};
    const targetYear = resolvedContext.currentYear || resolvedContext.year;
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
    const semesterId =
      resolvedContext.currentSemester?.id ||
      resolvedContext.semesterId ||
      globalContext.getContext()?.currentSemester?.id ||
      null;

    if (!semesterId) {
      throw new Error('ไม่ได้ระบุภาคเรียน');
    }

    const requestOptions = { forceRefresh: true };
    const [
      schedulesResult,
      subjectsResult,
      classesResult,
      roomsResult,
      periodsResult
    ] = await Promise.all([
      dataService.getSchedules(targetYear, semesterId, requestOptions),
      dataService.getSubjects(targetYear, semesterId, requestOptions),
      dataService.getClasses(targetYear, semesterId, requestOptions),
      dataService.getRooms(targetYear, semesterId, requestOptions),
      dataService.getPeriods(targetYear, semesterId, requestOptions)
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

    if (!periodsResult.ok) {
      console.error('[TeacherSchedule] Periods load failed:', periodsResult.error);
      throw new Error('ไม่สามารถโหลดข้อมูลคาบเรียนได้: ' + periodsResult.error);
    }

    const schedules = schedulesResult.data || [];
    const subjects = subjectsResult.data || [];
    const classes = classesResult.data || [];
    const rooms = roomsResult.data || [];
    const periods = periodsResult.data || [];
    const normalizedPeriods = ensurePeriodsList(periods);

    console.log(`[TeacherSchedule] ✅ Data loaded successfully:`, {
      schedules: schedules.length,
      subjects: subjects.length,
      classes: classes.length,
      rooms: rooms.length,
      periods: periods.length
    });

    // ⭐ DEBUG: Show sample schedules
    console.log(`\n📊 Sample Schedules (first 3):`);
    schedules.slice(0, 3).forEach(s => {
      console.log(`  - Schedule ID ${s.id}: subject_id=${s.subject_id}, class_id=${s.class_id}, day=${s.day_of_week}, period=${s.period_no || s.period}`);
    });

    // ⭐ DEBUG: ดู raw schedules data
    console.log(`\n[TeacherSchedule] 🔍 Raw schedules for year ${targetYear}:`, schedules.length, 'entries');
    console.log('[TeacherSchedule] 🔍 First 3 schedules:', schedules.slice(0, 3));
    
    // ⭐ FIX: กรองข้อมูลตามปีด้วย class ของปีนี้ (mock บางส่วนใช้ semester_id ข้ามปี)
    const classIdsOfYear = new Set(classes.map(c => c.id));
    const subjectsInYear = subjects.filter(s => classIdsOfYear.has(s.class_id));
    const schedulesInYear = schedules.filter(s => classIdsOfYear.has(s.class_id));

    console.log(`\n[TeacherSchedule] 🔍 After class filter:`, {
      classes_in_year: classIdsOfYear.size,
      subjects_in_year: subjectsInYear.length,
      schedules_in_year: schedulesInYear.length
    });

    // ⭐ FIX ข้อ 1 & 3: Filter teacher subjects first, THEN get schedules
    const teacherSubjects = subjectsInYear.filter(s => s.teacher_id === teacherId);
    const subjectIds = new Set(teacherSubjects.map(s => s.id));
    
    console.log(`\n👨‍🏫 Teacher ${teacherId} Subjects:`, {
      count: teacherSubjects.length,
      subject_ids: Array.from(subjectIds)
    });
    console.log('📚 Subject Details:');
    teacherSubjects.forEach(s => {
      const cls = classes.find(c => c.id === s.class_id);
      console.log(`  - Subject ID ${s.id}: ${s.subject_name} (${s.subject_code || 'no-code'}) @ ${cls?.class_name || 'N/A'}`);
    });

    // Filter schedules by subject IDs (เฉพาะวิชาที่ครูสอน)
    const teacherSchedules = schedulesInYear.filter(s => subjectIds.has(s.subject_id));
    
    console.log(`\n🎯 Teacher ${teacherId} Schedules (filtered by subject_id):`, {
      total_count: teacherSchedules.length,
      expected_count: 32,
      match: teacherSchedules.length === 32 ? '✅ MATCH!' : '❌ MISMATCH!'
    });

    // ⭐ DEBUG: Show ALL teacher schedules in detail
    console.log(`\n📋 DETAILED Schedule List for Teacher ${teacherId}:`);
    teacherSchedules.forEach((s, idx) => {
      const subject = subjects.find(sub => sub.id === s.subject_id);
      const cls = classes.find(c => c.id === s.class_id);
      const room = rooms.find(r => r.id === s.room_id);
      console.log(`  ${idx + 1}. Day ${s.day_of_week} Period ${s.period_no || s.period}: ${subject?.subject_code || 'N/A'} @ ${cls?.class_name || 'N/A'} (Room: ${room?.room_name || room?.name || 'N/A'})`);
    });

    // ⭐ DEBUG: Group by Day-Period
    const groupedByDayPeriod = {};
    teacherSchedules.forEach(s => {
      const key = `Day${s.day_of_week}-P${s.period_no || s.period}`;
      if (!groupedByDayPeriod[key]) {
        groupedByDayPeriod[key] = [];
      }
      const cls = classes.find(c => c.id === s.class_id);
      groupedByDayPeriod[key].push(cls?.class_name || 'N/A');
    });

    console.log(`\n📅 Schedules Grouped by Day-Period:`);
    Object.entries(groupedByDayPeriod).sort().forEach(([key, items]) => {
      console.log(`  ${key}: ${items.join(', ')}`);
    });

    // ⭐ DEBUG: Count by Day
    const countByDay = [0, 0, 0, 0, 0, 0, 0, 0];
    teacherSchedules.forEach(s => {
      if (s.day_of_week >= 1 && s.day_of_week <= 7) {
        countByDay[s.day_of_week]++;
      }
    });

    console.log(`\n📊 Schedules Count by Day:`);
    console.log(`  จันทร์(1): ${countByDay[1]} (Expected: 8) ${countByDay[1] === 8 ? '✅' : '❌'}`);
    console.log(`  อังคาร(2): ${countByDay[2]} (Expected: 9) ${countByDay[2] === 9 ? '✅' : '❌'}`);
    console.log(`  พุธ(3): ${countByDay[3]} (Expected: 8) ${countByDay[3] === 8 ? '✅' : '❌'}`);
    console.log(`  พฤหัสบดี(4): ${countByDay[4]} (Expected: 7) ${countByDay[4] === 7 ? '✅' : '❌'}`);
    console.log(`  ศุกร์(5): ${countByDay[5]}`);
    console.log(`  เสาร์(6): ${countByDay[6]}`);
    console.log(`  อาทิตย์(7): ${countByDay[7]}`);

    // Build schedule matrix
    console.log(`\n🔨 Building Matrix...`);
    const matrixData = buildTeacherScheduleMatrix(
      teacherSchedules,
      { subjects, classes, rooms },
      normalizedPeriods
    );
    const { matrix, periods: resolvedPeriods, teachingPeriods, teachingPeriodNumbers, periodSequence } = matrixData;
    const teachingSet = new Set(teachingPeriodNumbers);

    // ⭐ DEBUG: Verify Matrix
    console.log(`\n🔍 Matrix Verification:`);
    for (let day = 1; day <= 5; day++) {
      const dayName = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'][day];
      const periodsWithData = [];
      for (let period = 1; period <= 8; period++) {
        if (matrix[day] && matrix[day][period]) {
          const cell = matrix[day][period];
          periodsWithData.push(`P${period}(${cell.class?.class_name || 'N/A'})`);
        }
      }
      console.log(`  ${dayName}: ${periodsWithData.length > 0 ? periodsWithData.join(', ') : 'No data'}`);
    }

    // ⭐ FIX 2025-10-02: นับจำนวน schedule entries จริง ไม่ใช่ unique time slots
    // เพราะต้องการนับคาบสอนจริงทั้งหมด รวมถึงกรณีที่ครูสอนหลายห้องในคาบเดียวกัน
    const validPeriods = teacherSchedules.filter(s => {
      const periodNo = s.period_no || s.period;
      return periodNo >= 1 && periodNo <= 8;
    });
    
    const result = {
      subjects: teacherSubjects,
      schedules: teacherSchedules,
      matrix,
      classes,
      rooms,
      periods: resolvedPeriods, // ⭐ เพิ่ม periods
      periodSequence: periodSequence, // ⭐ เพิ่ม periodSequence
      totalPeriods: validPeriods.length // ใช้จำนวน entries จริง
    };

    console.log(`[TeacherSchedule] ✅ Schedule data prepared for teacher ${teacherId}:`, {
      totalSubjects: result.subjects.length,
      totalSchedules: result.schedules.length,
      totalPeriods: result.totalPeriods,
      periods: result.periods?.length || 0,
      periodSequence: result.periodSequence?.length || 0
    });

    return result;
    
  } catch (error) {
    console.error(`[TeacherSchedule] Failed to get teacher ${teacherId} schedule data:`, error);
    throw error;
  }
}

/**
 * Build Teacher Schedule Matrix
 * ⭐ FIX 2025-10-02: Matrix เก็บเป็น Array เพื่อรองรับหลายห้องในคาบเดียวกัน
 */
function buildTeacherScheduleMatrixLegacy(schedules, context, periods = []) {
  const matrix = {};

  // ⭐ FIX: Initialize matrix for 7 display periods
  // Display: 1,2,3,4 (เช้า 4 คาบ) → [5 = พักเที่ยง] → 5,6,7 (บ่าย 3 คาบ)
  // API period values: 1,2,3,4, [skip 5], 6,7,8
  // เปลี่ยนจาก null เป็น [] เพื่อเก็บหลายห้อง
  for (let day = 1; day <= 5; day++) {
    matrix[day] = {};
    for (let period = 1; period <= 7; period++) {
      matrix[day][period] = []; // ⭐ เปลี่ยนจาก null เป็น []
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
      // ⭐ FIX: PUSH เข้า Array แทนการเขียนทับ
      matrix[schedule.day_of_week][displayPeriod].push({
        schedule,
        subject: subject || { subject_name: 'ไม่ระบุวิชา', subject_code: '' },
        class: classInfo || { class_name: 'ไม่ระบุห้อง' },
        room: room || { name: 'ไม่ระบุห้อง' }
      });
      
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
      <h3>${teacher.full_name || teacher.name}</h3>
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
      <h4>ตารางสอน ${teacher.full_name || teacher.name}</h4>
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
    const filename = generateExportFilename(`ตารางสอน-${teacher?.full_name || teacher?.name || 'ครู'}`, context);

    switch (format) {
      case 'html':
        await exportTableToHTML(teacherId, context, filename);
        break;
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

  // ⭐ ใช้ periods จาก API แทน hardcode
  // periodSequence มี structure: [{ type: 'teaching'/'break', period: {...} }]
  // periods เป็น array ของ period objects
  const periodSequence = scheduleData.periodSequence || [];
  const rawPeriods = scheduleData.periods || [];

  // ใช้เฉพาะ teaching periods (ไม่รวม lunch break)
  const teachingEntries = periodSequence.filter(entry => entry.type === 'teaching');
  let periods = teachingEntries.map(entry => entry.period);

  // ถ้าไม่มี periodSequence ให้ fallback ไปใช้ rawPeriods โดยตรง
  if (periods.length === 0 && rawPeriods.length > 0) {
    periods = rawPeriods.filter(p => p.period_name !== 'พักเที่ยง');
  }

  const timeSlots = periods.map(p => `${p.start_time || ''}-${p.end_time || ''}`);
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  console.log('[Export] 📊 Export Data Debug:', {
    periodSequenceCount: periodSequence.length,
    teachingPeriodsCount: periods.length,
    rawPeriodsCount: rawPeriods.length,
    timeSlots: timeSlots,
    firstPeriod: periods[0],
    matrixSample: scheduleData.matrix?.[1]?.[1] || 'No matrix data'
  });

  const exportData = [];

  // สร้าง header columns dynamically ตามจำนวน periods
  const createEmptyRow = () => {
    const row = { 'วัน/เวลา': '' };
    periods.forEach((_, idx) => {
      row[`คาบ ${idx + 1}`] = '';
    });
    return row;
  };

  // FIX: ส่วนหัว - จัดกึ่งกลางเหมือนเว็บ
  const titleRow = createEmptyRow();
  const midCol = Math.ceil(periods.length / 2);
  titleRow[`คาบ ${midCol}`] = `ตารางสอน - ${teacher?.full_name || teacher?.name || ''}`;
  exportData.push(titleRow);

  const groupRow = createEmptyRow();
  groupRow[`คาบ ${midCol}`] = `กลุ่มสาระ: ${teacher?.subject_group || ''}`;
  exportData.push(groupRow);

  // เพิ่มโทรศัพท์ถ้ามี
  if (teacher?.phone) {
    const phoneRow = createEmptyRow();
    phoneRow[`คาบ ${midCol}`] = `📞 ${teacher.phone}`;
    exportData.push(phoneRow);
  }

  // เพิ่มอีเมลถ้ามี
  if (teacher?.email) {
    const emailRow = createEmptyRow();
    emailRow[`คาบ ${midCol}`] = `📧 ${teacher.email}`;
    exportData.push(emailRow);
  }

  const semesterRow = createEmptyRow();
  semesterRow[`คาบ ${midCol}`] = `ภาคเรียน: ภาคเรียนที่ ${context.currentSemester?.selected || 1} ปีการศึกษา ${context.currentYear}`;
  exportData.push(semesterRow);

  // บรรทัดว่าง
  exportData.push(createEmptyRow());
  // FIX: หัวตาราง
  const headerRow = { 'วัน/เวลา': 'วัน/เวลา' };
  periods.forEach((period, idx) => {
    headerRow[`คาบ ${idx + 1}`] = `คาบ ${idx + 1}\n${timeSlots[idx] || ''}`;
  });
  exportData.push(headerRow);

  // FIX: ข้อมูลตาราง - แต่ละวัน
  days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const rowData = { 'วัน/เวลา': day };

    // แต่ละคาบ (dynamic) - ใช้ period.period_no จาก API
    periods.forEach((period, periodIndex) => {
      const periodNo = period.period_no; // ⭐ ใช้ period_no จาก period object
      const displayCol = periodIndex + 1; // column สำหรับ export
      const cellDataArray = scheduleData.matrix[dayNumber]?.[periodNo];

      // matrix เป็น array ของ cell data
      if (cellDataArray && Array.isArray(cellDataArray) && cellDataArray.length > 0) {
        // ถ้ามีหลายห้องในคาบเดียวกัน ให้แสดงทั้งหมด
        const cellTexts = cellDataArray.map(cellData => {
          const subjectCode = cellData.subject?.subject_code || cellData.subject?.subject_name?.substring(0, 6) || '';
          const className = cellData.class?.class_name || cellData.class?.name || '';
          const roomName = String(cellData.room?.name || cellData.room?.room_name || "").replace(/^ห้อง\s*/i, "");
          return `${subjectCode}\n${className}\n${roomName}`;
        });
        rowData[`คาบ ${displayCol}`] = cellTexts.join('\n---\n');
      } else {
        rowData[`คาบ ${displayCol}`] = '-';
      }
    });

    exportData.push(rowData);
  });

  // FIX: ส่วนสรุป - บรรทัดว่าง
  exportData.push(createEmptyRow());

  // ⭐ สร้างสรุปแบบรวมกลุ่ม (เหมือน renderWorkloadDetailsSection)
  const groupedMap = new Map();

  scheduleData.subjects.forEach(subject => {
    const subjectSchedules = scheduleData.schedules.filter(s => s.subject_id === subject.id);
    const classInfo = scheduleData.classes.find(c => c.id === subject.class_id);

    const subjectCode = subject.subject_code || '';
    const subjectName = subject.subject_name || '';
    const groupKey = `${subjectCode}|${subjectName}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        subject: subject,
        classes: [],
        totalPeriods: 0
      });
    }

    const group = groupedMap.get(groupKey);
    if (classInfo) {
      group.classes.push(classInfo);
    }
    group.totalPeriods += subjectSchedules.length;
  });

  // แปลงเป็น array
  const subjectSummary = Array.from(groupedMap.values())
    .map(group => {
      // ⭐ เรียงลำดับชื่อห้องก่อนรวมกัน
      const sortedClassNames = group.classes
        .map(c => c.class_name || c.name || 'ไม่ระบุห้อง')
        .sort((a, b) => a.localeCompare(b, 'th'));

      return {
        subject: group.subject,
        classNames: sortedClassNames.join(', '),
        periods: group.totalPeriods
      };
    })
    .sort((a, b) => {
      const codeCompare = (a.subject.subject_code || '').localeCompare(b.subject.subject_code || '', 'th');
      if (codeCompare !== 0) return codeCompare;
      return (a.subject.subject_name || '').localeCompare(b.subject.subject_name || '', 'th');
    });

  const workloadHeaderRow = createEmptyRow();
  workloadHeaderRow[`คาบ ${midCol}`] = '📝 ภาระงานสอน';
  exportData.push(workloadHeaderRow);
// รายการวิชา
  subjectSummary.forEach(item => {
    const subjectCode = item.subject.subject_code || item.subject.subject_name.substring(0, 6);
    const workloadRow = createEmptyRow();
    workloadRow['คาบ 1'] = `${subjectCode} ${item.subject.subject_name}`;

    // จัดให้ชื่อห้องและจำนวนคาบอยู่ตำแหน่งที่เหมาะสม
    const classCol = Math.min(4, periods.length); // คอลัมน์ที่ 4 หรือน้อยกว่าถ้าคาบไม่พอ
    const periodsCol = Math.min(6, periods.length); // คอลัมน์ที่ 6 หรือน้อยกว่าถ้าคาบไม่พอ

    if (periods.length >= classCol) {
      workloadRow[`คาบ ${classCol}`] = `${item.classNames}`;
    }
    if (periods.length >= periodsCol) {
      workloadRow[`คาบ ${periodsCol}`] = `${item.periods} คาบ`;
    }

    exportData.push(workloadRow);
  });


  // สรุปรวม - จัดกึ่งกลาง
  const totalRow = createEmptyRow();
  totalRow[`คาบ ${midCol}`] = `รวม ${scheduleData.totalPeriods} คาบ/สัปดาห์`;
  exportData.push(totalRow);

  // FIX: ส่วนสรุป - บรรทัดว่าง
  exportData.push(createEmptyRow());

  return exportData;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================


/**
 * Get Teacher Name for Export (แสดงแค่ชื่อ-นามสกุล ไม่มี title)
 */
function getTeacherNameForExport(teacher) {
  if (!teacher) return 'ไม่ระบุชื่อ';

  const fname = teacher.f_name || '';
  const lname = teacher.l_name || '';

  if (fname && lname) {
    return `${fname}  ${lname}`;
  } else if (fname) {
    return fname;
  } else if (lname) {
    return lname;
  }

  return 'ไม่ระบุชื่อ';
}

/**
 * Get Teacher Prefix for Export (ครู สำหรับไทย, T. สำหรับอังกฤษ)
 */
function getTeacherPrefixForExport(teacher) {
  if (!teacher || !teacher.f_name) return 'ครู';

  // ตรวจสอบว่าชื่อเป็นภาษาอังกฤษหรือไทย
  const isEnglish = /^[A-Za-z\s]+$/.test(teacher.f_name);

  return isEnglish ? 'T.' : 'ครู';
}

/**
 * Generate Workload HTML for Export
 */
function generateWorkloadHTML(scheduleData) {
  // กรอง schedules ที่ valid
  const validSchedules = scheduleData.schedules.filter(s => {
    const periodNo = s.period_no || s.period;
    return periodNo >= 1 && periodNo <= 8;
  });

  // สร้าง grouped workload เหมือนหน้าจริง
  const groupedMap = new Map();

  scheduleData.subjects.forEach(subject => {
    const subjectSchedules = validSchedules.filter(s => s.subject_id === subject.id);
    const classInfo = scheduleData.classes.find(c => c.id === subject.class_id);

    const subjectCode = subject.subject_code || '';
    const subjectName = subject.subject_name || '';
    const groupKey = `${subjectCode}|${subjectName}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        subject: subject,
        classes: [],
        totalPeriods: 0
      });
    }

    const group = groupedMap.get(groupKey);
    if (classInfo) {
      group.classes.push(classInfo);
    }
    group.totalPeriods += subjectSchedules.length;
  });

  // เรียงลำดับและสร้าง HTML
  const subjectSummary = Array.from(groupedMap.values())
    .map(group => {
      const sortedClassNames = group.classes
        .map(c => c.class_name || c.name || 'ไม่ระบุห้อง')
        .sort((a, b) => a.localeCompare(b, 'th'));

      return {
        subject: group.subject,
        classNames: sortedClassNames.join(', '),
        periods: group.totalPeriods
      };
    })
    .sort((a, b) => {
      const codeCompare = (a.subject.subject_code || '').localeCompare(b.subject.subject_code || '', 'th');
      if (codeCompare !== 0) return codeCompare;
      return (a.subject.subject_name || '').localeCompare(b.subject.subject_name || '', 'th');
    });

  // สร้าง HTML
  let html = '<div class="workload-details"><div class="subjects-list">';

  subjectSummary.forEach(item => {
    const subjectCode = item.subject.subject_code || item.subject.subject_name.substring(0, 6);
    html += `
      <div class="subject-workload-item">
        <div class="subject-code">${subjectCode}</div>
        <div class="subject-name">${item.subject.subject_name}</div>
        <div class="class-names">${item.classNames}</div>
        <div class="periods-count">${item.periods} คาบ</div>
      </div>
    `;
  });

  html += '</div>';
  html += `<div class="total-workload">รวม ${scheduleData.totalPeriods} คาบ/สัปดาห์</div>`;
  html += '</div>';

  return html;
}

/**
 * Export Table to HTML
 */
async function exportTableToHTML(teacherId, context, filename) {
  try {
    const scheduleData = await getTeacherScheduleData(teacherId, context);
    const teacher = pageState.teachers.find(t => t.id === teacherId);

    if (!teacher) {
      throw new Error('ไม่พบข้อมูลครู');
    }

    // Debug: ดู context structure
    console.log('[Export HTML] Context:', context);
    console.log('[Export HTML] Current Year:', context.currentYear);
    console.log('[Export HTML] Current Semester:', context.currentSemester);

    // ดึงข้อมูลจาก context หรือ global context
    const year = context.currentYear || context.year || globalContext.getContext()?.currentYear || 'N/A';
    const semesterName = context.currentSemester?.semester_name ||
                        context.semester?.semester_name ||
                        globalContext.getContext()?.currentSemester?.semester_name || 'ไม่ระบุภาคเรียน';

    console.log('[Export HTML] Resolved Year:', year);
    console.log('[Export HTML] Resolved Semester:', semesterName);

    // สร้าง HTML โดยใช้ฟังก์ชัน render ที่มีอยู่แล้ว
    const scheduleTableHTML = renderDynamicTeacherScheduleTable(scheduleData, teacher);

    // สร้าง workload HTML แยก
    const workloadHTML = generateWorkloadHTML(scheduleData);

    // สร้าง HTML เต็มรูปแบบพร้อม CSS จากหน้าจริง
    const fullHTML = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ตารางสอน - ${teacher.full_name || teacher.name || ''}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* ===== CSS Variables ===== */
        :root {
            --font-family-primary: 'Sarabun', 'Noto Sans Thai', sans-serif;
            --color-primary: #4299e1;
            --color-primary-dark: #2b6cb0;
            --color-primary-light: #ebf8ff;
            --color-dark: #2d3748;
            --color-dark-lighter: #718096;
            --color-gray-50: #f7fafc;
            --color-gray-100: #edf2f7;
            --color-gray-200: #e2e8f0;
            --color-gray-300: #cbd5e0;
            --color-light-dark: #f5f5f5;
            --font-weight-semibold: 600;
            --font-weight-medium: 500;
            --font-weight-bold: 700;
            --font-size-xs: 0.75rem;
            --font-size-sm: 0.875rem;
            --font-size-2xl: 1.5rem;
            --radius-md: 0.375rem;
            --radius-lg: 0.5rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-family-primary);
            padding: 20px;
            background: #f5f5f5;
            color: var(--color-dark);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: var(--radius-lg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        h2, h3, h4 {
            color: var(--color-dark);
            text-align: center;
            margin-bottom: 1rem;
        }

        /* ===== Teacher Info ===== */
        .teacher-info-section {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: var(--radius-lg);
            margin-bottom: 2rem;
            border-left: 4px solid var(--color-primary);
            text-align: center;
        }

        .teacher-info-section h2 {
            color: var(--color-primary);
            margin-bottom: 0.75rem;
            font-size: 1.75rem;
        }

        .teacher-meta {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1.5rem;
            margin-top: 0.75rem;
            flex-wrap: wrap;
        }

        .badge {
            display: inline-block;
            padding: 0.35rem 0.75rem;
            border-radius: var(--radius-md);
            font-size: var(--font-size-sm);
            background: var(--color-primary-light);
            color: var(--color-primary-dark);
            font-weight: var(--font-weight-semibold);
        }

        /* ===== Schedule Table ===== */
        .schedule-section {
            margin: 2rem 0;
        }

        .schedule-section h3 {
            text-align: center;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
        }

        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            font-size: var(--font-size-sm);
            background: #fff;
            table-layout: fixed;
            margin: 0 auto;
        }

        .schedule-table thead th {
            background: var(--color-light-dark);
            color: var(--color-dark);
            font-weight: var(--font-weight-semibold);
            padding: 0.75rem 0.5rem;
            text-align: center;
            vertical-align: middle;
            border: 1px solid var(--color-gray-200);
            height: 64px;
        }

        .schedule-table thead th:first-child {
            text-align: center;
            background: var(--color-primary);
            color: #fff;
        }

        .schedule-table tbody td {
            border: 1px solid var(--color-gray-100);
            padding: 0.5rem;
            text-align: center;
            vertical-align: middle;
            height: 64px;
        }

        .schedule-table tbody td:first-child {
            text-align: center;
            font-weight: var(--font-weight-semibold);
            background: var(--color-gray-50);
        }

        .period-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
        }

        .period-number {
            font-weight: var(--font-weight-semibold);
            font-size: 0.9rem;
        }

        .time-slot {
            font-size: 0.75rem;
            color: #666;
            white-space: nowrap;
        }

        .subject-info, .schedule-cell-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.15rem;
            min-height: 48px;
            text-align: center;
        }

        .subject-name {
            font-weight: var(--font-weight-semibold);
            color: var(--color-dark);
            font-size: 14px;
            text-align: center;
            line-height: 1.25;
            white-space: nowrap;
        }

        .class-name {
            font-size: 12px;
            color: var(--color-primary-dark);
            font-weight: var(--font-weight-medium);
        }

        .room-name {
            font-size: 12px;
            color: var(--color-dark-lighter);
        }

        .lunch-column {
            background: #fff9cc;
            font-weight: var(--font-weight-semibold);
            text-align: center;
            vertical-align: middle;
        }

        .empty-cell {
            color: #999;
        }

        /* ===== Workload Section ===== */
        .workload-section {
            margin: 2rem 0;
        }

        .workload-section h3 {
            text-align: center;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
        }

        .workload-details {
            text-align: center;
            margin: 0 auto;
            max-width: 700px;
        }

        .subjects-list {
            display: block;
            text-align: center;
            padding-left: 0;
            margin: 0 auto;
        }

        .subject-workload-item {
            display: grid;
            grid-template-columns: 100px minmax(200px, 1fr) 150px 90px;
            gap: 0.75rem 1rem;
            text-align: left;
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            border-bottom: 1px solid #f0f0f0;
            width: 100%;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
            align-items: center;
        }

        .subject-workload-item .subject-code {
            text-align: left;
            font-family: monospace;
            font-weight: var(--font-weight-bold);
            color: #666;
            font-size: 1rem;
        }

        .subject-workload-item .subject-name {
            text-align: left;
            font-weight: var(--font-weight-bold);
            color: #333;
            font-size: 1rem;
        }

        .subject-workload-item .class-names {
            text-align: center;
            color: #0066cc;
            font-weight: var(--font-weight-medium);
            font-size: 0.95rem;
            line-height: 1.6;
        }

        .periods-count {
            text-align: right;
            font-weight: var(--font-weight-bold);
            color: #007700;
            font-size: 1rem;
        }

        .total-workload {
            text-align: center;
            background: var(--color-primary);
            color: white;
            padding: 1rem;
            border-radius: var(--radius-md);
            margin-top: 1.5rem;
            font-size: 1.25rem;
            font-weight: var(--font-weight-bold);
        }

        /* ===== Print Button ===== */
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-size: 16px;
            font-weight: var(--font-weight-semibold);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
        }

        .print-button:hover {
            background: var(--color-primary-dark);
        }

        /* ===== Print Styles ===== */
        @media print {
            body {
                background: white;
                padding: 0;
            }

            .container {
                box-shadow: none;
                padding: 10px;
            }

            .print-button {
                display: none;
            }

            .schedule-table {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ พิมพ์</button>

    <div class="container">
        <div class="teacher-info-section">
            <h2>ตารางสอน - ${getTeacherPrefixForExport(teacher)} ${getTeacherNameForExport(teacher)}</h2>
            <div class="teacher-meta">
                <span><strong>${semesterName}</strong></span>
                <span style="margin-left: 1.5rem;"><strong>ปีการศึกษา ${year}</strong></span>
            </div>
        </div>

        <div class="schedule-section">
            ${scheduleTableHTML}
        </div>

        <div class="workload-section">
            <h3>📊 ภาระงานสอน</h3>
            ${workloadHTML}
        </div>
    </div>
</body>
</html>`;

    // ดาวน์โหลดไฟล์ HTML
    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[Export] HTML export completed:', filename);
  } catch (error) {
    console.error('[Export] HTML export failed:', error);
    throw error;
  }
}

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
    'html': '🌐 HTML',
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

const __originalGetTeacherScheduleData = getTeacherScheduleData;
getTeacherScheduleData = async function (teacherId, context) {
  let resolvedContext = context || (globalContext.getContext ? globalContext.getContext() : null) || {};
  if (!resolvedContext.currentYear && !resolvedContext.year) {
    const fallbackContext = globalContext.getContext ? globalContext.getContext() : null;
    if (fallbackContext) {
      resolvedContext = fallbackContext;
    }
  }

  let data = null;
  let originalError = null;

  if (typeof __originalGetTeacherScheduleData === 'function') {
    try {
      data = await __originalGetTeacherScheduleData(teacherId, context);
    } catch (error) {
      originalError = error;
      console.warn('[TeacherSchedule] Original getTeacherScheduleData failed, using dynamic fallback:', error);
    }
  }

  if (!data || typeof data !== 'object') {
    try {
      data = await fetchTeacherScheduleDataDynamic(teacherId, resolvedContext);
    } catch (fallbackError) {
      if (originalError) {
        console.error('[TeacherSchedule] Original loader error:', originalError);
      }
      throw fallbackError;
    }
  }

  let periods = Array.isArray(data.periods) ? data.periods : [];

  if (!periods.length) {
    try {
      const targetYear = resolvedContext.currentYear || resolvedContext.year;
      const semesterId = resolvedContext.currentSemester?.id || resolvedContext.semesterId || resolvedContext.semester?.id;
      if (targetYear && semesterId) {
        const periodResponse = await dataService.getPeriods(targetYear, semesterId);
        if (periodResponse.ok) {
          periods = periodResponse.data || [];
        }
      }
    } catch (error) {
      console.warn('[TeacherSchedule] Unable to load periods for dynamic schedule rendering:', error);
    }
  }

  const matrixData = buildTeacherScheduleMatrixDynamic(
    data.schedules || [],
    { subjects: data.subjects || [], classes: data.classes || [], rooms: data.rooms || [] },
    periods
  );

  data.matrix = matrixData.matrix;
  data.periods = matrixData.periods;
  data.teachingPeriods = matrixData.teachingPeriods;
  data.teachingPeriodNumbers = matrixData.teachingPeriodNumbers;
  data.periodSequence = matrixData.periodSequence;

  const teachingSet = new Set(matrixData.teachingPeriodNumbers);
  data.totalPeriods = (data.schedules || []).filter(item => teachingSet.has(Number(item.period_no || item.period))).length;

  return data;
};

const __originalRenderTeacherScheduleTableSection = renderScheduleTableSection;
renderScheduleTableSection = function (scheduleData, teacher, context) {
  const tableContainer = document.getElementById('teacher-schedule-table');
  if (!tableContainer) {
    return;
  }

  if (scheduleData && Array.isArray(scheduleData.periodSequence) && scheduleData.periodSequence.length > 0) {
    tableContainer.innerHTML = renderDynamicTeacherScheduleTable(scheduleData, teacher);
    return;
  }

  __originalRenderTeacherScheduleTableSection(scheduleData, teacher, context);
};

const __originalRenderScheduleTable = renderScheduleTable;
renderScheduleTable = function (scheduleData, teacher, context) {
  if (scheduleData && Array.isArray(scheduleData.periodSequence) && scheduleData.periodSequence.length > 0) {
    const tableContainer = document.getElementById('teacher-schedule-table');
    if (tableContainer) {
      tableContainer.innerHTML = renderDynamicTeacherScheduleTable(scheduleData, teacher);
    }
    return;
  }

  __originalRenderScheduleTable(scheduleData, teacher, context);
};

function buildTeacherScheduleMatrixDynamic(schedules = [], context = {}, periods = []) {
  const normalizedPeriods = ensurePeriodsList(Array.isArray(periods) ? periods : []);
  const basePeriods = normalizedPeriods.length ? normalizedPeriods : ensurePeriodsList();
  const teachingPeriods = extractTeachingPeriods(basePeriods);
  const teachingPeriodNumbers = teachingPeriods.map(period => period.period_no);
  const fallbackPeriodNumbers = teachingPeriodNumbers.length
    ? teachingPeriodNumbers
    : Array.from({ length: 8 }, (_, index) => index + 1);

  const matrix = {};
  const dayNumbers = [1, 2, 3, 4, 5];

  dayNumbers.forEach(day => {
    matrix[day] = {};
    fallbackPeriodNumbers.forEach(periodNo => {
      matrix[day][periodNo] = [];
    });
  });

  schedules.forEach(schedule => {
    const day = Number(schedule?.day_of_week ?? schedule?.day);
    const periodNo = Number(schedule?.period_no ?? schedule?.period);
    if (!day || !periodNo) {
      return;
    }

    if (!matrix[day]) {
      matrix[day] = {};
      fallbackPeriodNumbers.forEach(p => {
        matrix[day][p] = [];
      });
    }

    if (!Array.isArray(matrix[day][periodNo])) {
      matrix[day][periodNo] = [];
    }

    const subject = (context.subjects || []).find(s => s.id === schedule.subject_id);
    const classInfo = (context.classes || []).find(c => c.id === schedule.class_id);
    const room = (context.rooms || []).find(r => r.id === schedule.room_id);

    matrix[day][periodNo].push({
      schedule,
      subject: subject || { subject_name: schedule.subject_name || 'Unknown Subject', subject_code: schedule.subject_code || '' },
      class: classInfo || { class_name: schedule.class_name || 'Unknown Class' },
      room: room || { name: schedule.room_name || 'Unknown Room' }
    });
  });

  return {
    matrix,
    periods: basePeriods,
    teachingPeriods,
    teachingPeriodNumbers: fallbackPeriodNumbers,
    periodSequence: buildPeriodDisplaySequence(basePeriods)
  };
}

function renderDynamicTeacherScheduleTable(scheduleData, teacher) {
  const periods = ensurePeriodsList(scheduleData.periods || []);
  const periodSequence = scheduleData.periodSequence || buildPeriodDisplaySequence(periods);
  const teachingPeriods = scheduleData.teachingPeriods || extractTeachingPeriods(periods);
  const teachingPeriodNumbers = scheduleData.teachingPeriodNumbers || teachingPeriods.map(period => period.period_no);
  const teachingIndexMap = new Map();
  teachingPeriods.forEach((period, index) => {
    teachingIndexMap.set(period.period_no, index + 1);
  });

  const days = [
    { number: 1, label: 'วันจันทร์' },
    { number: 2, label: 'วันอังคาร' },
    { number: 3, label: 'วันพุธ' },
    { number: 4, label: 'วันพฤหัสบดี' },
    { number: 5, label: 'วันศุกร์' }
  ];

  if (!periodSequence.length || !teachingPeriodNumbers.length) {
    return '<div class="schedule-table-card"><div class="table-responsive"><p class="no-schedule">ไม่มีข้อมูลตารางสอน</p></div></div>';
  }

  const headerCells = periodSequence.map(entry => {
    if (entry.type === 'break') {
      const label = entry.period.period_name || 'พัก';
      const timeRange = formatPeriodTimeRange(entry.period) || '';
      return `<th class="lunch-header lunch-column"><div class="lunch-info">${label}<br><small>${timeRange}</small></div></th>`;
    }

    const displayIndex = teachingIndexMap.get(entry.period.period_no) || entry.period.period_no;
    const timeRange = formatPeriodTimeRange(entry.period) || entry.period.period_name || '';
    return `<th class="period-header">
        <div class="period-info">
          <div class="period-number">คาบ ${displayIndex}</div>
          <div class="time-slot">${timeRange}</div>
        </div>
      </th>`;
  }).join('');

  const rows = days.map((day, dayIndex) => {
    let rowHTML = `<tr class="day-row" data-day="${day.number}">
      <td class="day-cell">
        <div class="day-name">${day.label}</div>
      </td>`;

    periodSequence.forEach(entry => {
      if (entry.type === 'break') {
        if (dayIndex === 0) {
          const label = entry.period.period_name || 'พัก';
          const timeRange = formatPeriodTimeRange(entry.period) || '';
          rowHTML += `<td class="lunch-cell lunch-column" aria-label="${label}" rowspan="${days.length}">
              ${label}${timeRange ? `<br><small>${timeRange}</small>` : ''}
            </td>`;
        }
        return;
      }

      const periodNo = entry.period.period_no;
      const cellArrayRaw = scheduleData.matrix?.[day.number]?.[periodNo];
      const cellArray = Array.isArray(cellArrayRaw) ? cellArrayRaw : (cellArrayRaw ? [cellArrayRaw] : []);

      if (cellArray.length > 0) {
        const subjectCodes = Array.from(new Set(cellArray.map(item => item.subject?.subject_code).filter(Boolean)));
        const classNames = Array.from(new Set(cellArray.map(item => item.class?.class_name || item.class?.name).filter(Boolean)));
        const roomNames = Array.from(new Set(cellArray.map(item => item.room?.room_name || item.room?.name).filter(Boolean)));

        rowHTML += `<td class="schedule-cell has-subject" data-day="${day.number}" data-period="${periodNo}">
            <div class="subject-info">
              <div class="subject-code">${subjectCodes.join(', ') || '-'}</div>
              <div class="class-name">${classNames.join(', ') || '-'}</div>
              <div class="room-name">${roomNames.join(', ') || '-'}</div>
            </div>
          </td>`;
      } else {
        rowHTML += `<td class="schedule-cell empty" data-day="${day.number}" data-period="${periodNo}">
            <div class="empty-period">-</div>
          </td>`;
      }
    });

    rowHTML += '</tr>';
    return rowHTML;
  }).join('');


  return `
    <div class="schedule-table-card">
      <div class="table-responsive">
        <table class="schedule-table teacher-schedule">
          <thead>
            <tr>
              <th class="day-header">วัน/เวลา</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildTeacherScheduleMatrix(schedules, context, periods = []) {
  return buildTeacherScheduleMatrixDynamic(schedules, context, periods);
}

async function fetchTeacherScheduleDataDynamic(teacherId, resolvedContext) {
  const targetYear = resolvedContext.currentYear || resolvedContext.year;
  const semesterId =
    resolvedContext.currentSemester?.id ||
    resolvedContext.semesterId ||
    resolvedContext.semester?.id ||
    null;

  if (!targetYear || !semesterId) {
    throw new Error('ไม่พบปีการศึกษาหรือภาคเรียนสำหรับตารางสอน');
  }

  const requestOptions = { forceRefresh: true };
  const [
    schedulesRes,
    subjectsRes,
    classesRes,
    roomsRes,
    periodsRes
  ] = await Promise.all([
    dataService.getSchedules(targetYear, semesterId, requestOptions),
    dataService.getSubjects(targetYear, semesterId, requestOptions),
    dataService.getClasses(targetYear, semesterId, requestOptions),
    dataService.getRooms(targetYear, semesterId, requestOptions),
    dataService.getPeriods(targetYear, semesterId, requestOptions)
  ]);

  const responses = [
    { name: 'schedules', res: schedulesRes },
    { name: 'subjects', res: subjectsRes },
    { name: 'classes', res: classesRes },
    { name: 'rooms', res: roomsRes },
    { name: 'periods', res: periodsRes }
  ];

  const failed = responses.find(item => !item.res?.ok);
  if (failed) {
    throw new Error(`ไม่สามารถโหลดข้อมูล ${failed.name} ได้: ${failed.res?.error || 'unknown error'}`);
  }

  const schedules = schedulesRes.data || [];
  const subjects = subjectsRes.data || [];
  const classes = classesRes.data || [];
  const rooms = roomsRes.data || [];
  const periods = periodsRes.data || [];

  const teacherSubjects = subjects.filter(subject => subject.teacher_id === teacherId);
  const subjectIdSet = new Set(teacherSubjects.map(subject => subject.id));
  const teacherSchedules = schedules.filter(schedule => subjectIdSet.has(schedule.subject_id));

  const matrixData = buildTeacherScheduleMatrixDynamic(
    teacherSchedules,
    { subjects, classes, rooms },
    periods
  );

  const teachingSet = new Set(matrixData.teachingPeriodNumbers);
  const totalPeriods = teacherSchedules.filter(schedule =>
    teachingSet.has(Number(schedule.period_no || schedule.period))
  ).length;

  return {
    subjects: teacherSubjects,
    schedules: teacherSchedules,
    matrix: matrixData.matrix,
    classes,
    rooms,
    totalPeriods,
    periods: matrixData.periods,
    teachingPeriods: matrixData.teachingPeriods,
    teachingPeriodNumbers: matrixData.teachingPeriodNumbers,
    periodSequence: matrixData.periodSequence
  };
}

// Export page state for debugging
export function getPageState() {
  return { ...pageState };
}
