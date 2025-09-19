/**
 * Enhanced Substitution Page - Multi-Year Support with Export & Rooms
 * Features: Context-aware data, Hall of Fame, Room tracking, Export functionality
 */

import { formatSemester, formatThaiDate, getThaiDayName, getRoomTypeBadgeClass } from '../utils.js';
import { getContext, onContextChange } from '../context/globalContext.js';
import { getSubstitutions, getTeachers, getSchedules, getSubjects, getClasses, getRooms } from '../services/dataService.js';
import { exportTableToCSV, exportTableToXLSX, generateExportFilename } from '../utils/export.js';

// Global state for substitution page
let substitutionPageState = {
  currentSubPage: 'hall-of-fame',
  selectedDate: new Date().toISOString().slice(0, 10),
  loadedData: null,
  context: null
};

/**
 * Initialize Substitution Page
 */
export async function initSubstitutionPage(context) {
  console.log('Initializing Substitution Page...', context);
  
  try {
    // Store context
    substitutionPageState.context = context;
    
    // Initialize sub navigation
    initSubstitutionSubNav(context);
    
    // Load initial data
    await loadSubstitutionDataForContext(context);
    
    // Setup event listeners
    setupSubstitutionPageEventListeners();
    
    // Show default view (Hall of Fame)
    await switchToHallOfFame(context);
    
    // Listen for context changes
    onContextChange(async (newContext) => {
      await updatePageForContext(newContext);
    });
    
    console.log('Substitution Page initialized successfully');
    
  } catch (error) {
    console.error('Error initializing Substitution Page:', error);
    showSubstitutionPageError(`เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}`);
  }
}

/**
 * Render Hall of Fame
 */
export async function renderHallOfFame(context) {
  const data = substitutionPageState.loadedData;
  if (!data) throw new Error('ไม่มีข้อมูลที่โหลดแล้ว');

  return `
    <div class="hall-of-fame-header">
      <h3>🏅 Hall of Fame - ครูสอนแทน</h3>
      <p class="context-info">
        ${formatSemester(context.semester)} ปีการศึกษา ${context.year}
      </p>
    </div>
    <div class="hall-of-fame-content">
      ${await renderSubstituteRanking(context)}
      ${await renderSubstituteStats(context)}
      ${await showSemesterAchievements(context)}
    </div>
  `;
}

/**
 * Render substitution export bar
 */
export function renderSubstitutionExportBar(context) {
  return `
    <div class="export-bar">
      <button class="btn btn--sm btn--export" data-export-type="csv" data-target="substitution">
        📄 Export รายวัน CSV
      </button>
      <button class="btn btn--sm btn--export" data-export-type="xlsx" data-target="substitution">
        📊 Export รายวัน Excel
      </button>
      <button class="btn btn--sm btn--export" data-export-type="monthly">
        📅 Export รายเดือน
      </button>
    </div>
  `;
}

/**
 * Export substitution data
 */
export async function exportSubstitutionData(context, format, dateRange = 'daily') {
  try {
    const data = substitutionPageState.loadedData;
    let exportData = [];
    
    if (dateRange === 'daily') {
      const date = substitutionPageState.selectedDate;
      const dateSubstitutions = data.substitutions.filter(sub => sub.absent_date === date);
      
      exportData = dateSubstitutions.map(substitution => {
        const teacher = data.teachers.find(t => t.id === substitution.absent_teacher_id);
        return {
          'วันที่': substitution.absent_date,
          'ครูที่ขาด': teacher?.name || '',
          'เหตุผล': substitution.reason || '',
          'สถานะ': substitution.status || '',
          'ผู้บันทึก': substitution.created_by || ''
        };
      });
      
    } else if (dateRange === 'monthly') {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const monthlySubstitutions = data.substitutions.filter(sub => {
        const subDate = new Date(sub.absent_date);
        return subDate.getMonth() + 1 === currentMonth && subDate.getFullYear() === currentYear;
      });
      
      exportData = monthlySubstitutions.map(substitution => {
        const teacher = data.teachers.find(t => t.id === substitution.absent_teacher_id);
        return {
          'วันที่': substitution.absent_date,
          'ครูที่ขาด': teacher?.name || '',
          'เหตุผล': substitution.reason || '',
          'สถานะ': substitution.status || ''
        };
      });
    }
    
    const filename = generateExportFilename(
      `สอนแทน-${substitutionPageState.selectedDate || 'รายเดือน'}`, 
      context
    );
    
    switch(format) {
      case 'csv':
        return await exportTableToCSV(exportData, filename);
      case 'xlsx':
        return await exportTableToXLSX(exportData, filename);
      case 'monthly':
        return await exportMonthlySubstitutionReport(context);
      default:
        throw new Error('ไม่รองรับรูปแบบนี้');
    }
    
  } catch (error) {
    throw new Error(`Export ล้มเหลว: ${error.message}`);
  }
}

// Helper functions
function setupSubstitutionPageEventListeners() {
  console.log('Substitution page event listeners setup completed');
}

function showSubstitutionPageLoading(show) {
  const loadingElement = document.querySelector('#substitution-loading');
  if (loadingElement) {
    loadingElement.style.display = show ? 'block' : 'none';
  }
}

function showSubstitutionPageError(message) {
  const errorContainer = document.querySelector('#substitution-error');
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    errorContainer.style.display = 'block';
  }
}

async function renderSubstituteRanking(context) {
  const ranking = generateSubstituteRanking(context);
  const rankingHTML = ranking.slice(0, 5).map((item, index) => `
    <div class="substitute-rank-item">
      <span class="rank">${['🥇', '🥈', '🥉', '4.', '5.'][index] || `${index + 1}.`}</span>
      <span class="teacher-name">${item.teacher?.name || 'ไม่ระบุ'}</span>
      <span class="periods">${item.periods} คาบ</span>
    </div>
  `).join('');
  
  return `
    <div class="substitute-ranking-section">
      <h4>🏆 ครูสอนแทนยอดเยี่ยม</h4>
      ${rankingHTML || '<p>ไม่มีข้อมูล</p>'}
    </div>
  `;
}

async function renderSubstituteStats(context) {
  const stats = calculateSubstituteStats(context);
  
  return `
    <div class="substitute-stats-section">
      <h4>📊 สถิติการสอนแทน</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">${stats.totalSubstitutions}</span>
          <span class="stat-label">ครั้ง</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.totalPeriods}</span>
          <span class="stat-label">คาบทั้งหมด</span>
        </div>
      </div>
    </div>
  `;
}

async function renderSubstitutionScheduleView(context) {
  return `
    <div class="substitution-schedule-container">
      ${renderDatePicker(context)}
      <div id="substitution-display">
        <div class="select-date-prompt">
          <p>เลือกวันที่เพื่อดูการสอนแทน</p>
        </div>
      </div>
    </div>
  `;
}

async function initializeDatePicker(context) {
  const datePicker = document.querySelector('#custom-date-picker');
  if (datePicker) {
    datePicker.addEventListener('change', async (e) => {
      await loadSubstitutionByDate(e.target.value, context);
    });
  }
}

async function exportMonthlySubstitutionReport(context) {
  return await exportSubstitutionData(context, 'xlsx', 'monthly');
}

/**
 * Calculate substitute stats
 */
export function calculateSubstituteStats(context) {
  const data = substitutionPageState.loadedData;
  const substitutions = data.substitutions || [];
  const substitutionSchedules = data.substitutionSchedules || [];
  
  // Calculate total substitutions and periods
  const totalSubstitutions = substitutions.length;
  const totalPeriods = substitutionSchedules.reduce((sum, schedule) => 
    sum + (schedule.periods_count || 0), 0
  );
  
  // Calculate by reason
  const reasonStats = {};
  substitutions.forEach(sub => {
    const reason = sub.reason || 'ไม่ระบุ';
    if (!reasonStats[reason]) {
      reasonStats[reason] = { count: 0, percentage: 0 };
    }
    reasonStats[reason].count += 1;
  });
  
  // Calculate percentages
  Object.keys(reasonStats).forEach(reason => {
    reasonStats[reason].percentage = totalSubstitutions > 0 
      ? (reasonStats[reason].count / totalSubstitutions * 100).toFixed(1)
      : 0;
  });
  
  return {
    totalSubstitutions,
    totalPeriods,
    reasonStats,
    averagePeriodsPerSubstitution: totalSubstitutions > 0 
      ? (totalPeriods / totalSubstitutions).toFixed(1)
      : 0
  };
}

/**
 * Generate substitute ranking
 */
export function generateSubstituteRanking(context) {
  const data = substitutionPageState.loadedData;
  const substitutionSchedules = data.substitutionSchedules || [];
  
  // Count periods by teacher
  const teacherPeriods = {};
  
  substitutionSchedules.forEach(schedule => {
    const teacherId = schedule.substitute_teacher_id;
    const periods = schedule.periods_count || 0;
    
    if (!teacherPeriods[teacherId]) {
      teacherPeriods[teacherId] = { periods: 0, assignments: 0 };
    }
    
    teacherPeriods[teacherId].periods += periods;
    teacherPeriods[teacherId].assignments += 1;
  });
  
  // Add teacher details and sort
  const ranking = Object.entries(teacherPeriods)
    .map(([teacherId, stats]) => {
      const teacher = data.teachers.find(t => t.id == teacherId);
      return {
        teacher,
        ...stats,
        teacherId: parseInt(teacherId)
      };
    })
    .filter(item => item.teacher)
    .sort((a, b) => b.periods - a.periods);
  
  return ranking;
}

/**
 * Show semester achievements
 */
export function showSemesterAchievements(context) {
  const stats = calculateSubstituteStats(context);
  const ranking = generateSubstituteRanking(context);
  
  const topTeacher = ranking[0];
  const achievements = [];
  
  if (topTeacher && topTeacher.periods >= 20) {
    achievements.push({
      title: '🌟 ครูดีเด่นแห่งเทอม',
      description: `${topTeacher.teacher.name} สอนแทน ${topTeacher.periods} คาบ`,
      type: 'gold'
    });
  }
  
  if (stats.totalSubstitutions >= 50) {
    achievements.push({
      title: '🎯 เทอมที่มีการสอนแทนมาก',
      description: `รวม ${stats.totalSubstitutions} ครั้ง`,
      type: 'info'
    });
  }
  
  return achievements;
}

/**
 * Render date picker
 */
export function renderDatePicker(context) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  
  return `
    <div class="date-picker-section">
      <h4>📅 เลือกวันที่ดูการสอนแทน</h4>
      <div class="date-controls">
        <button class="btn btn--sm date-btn" data-date="${today}">
          วันนี้
        </button>
        <button class="btn btn--sm date-btn" data-date="${yesterday}">
          เมื่อวาน
        </button>
        <input type="date" id="custom-date-picker" class="date-input" value="${substitutionPageState.selectedDate}">
      </div>
    </div>
  `;
}

/**
 * Load substitution by date
 */
export async function loadSubstitutionByDate(date, context) {
  try {
    substitutionPageState.selectedDate = date;
    
    const data = substitutionPageState.loadedData;
    
    // Filter substitutions by date
    const dateSubstitutions = data.substitutions.filter(sub => 
      sub.absent_date === date
    );
    
    if (dateSubstitutions.length === 0) {
      const substitutionDisplay = document.querySelector('#substitution-display');
      if (substitutionDisplay) {
        substitutionDisplay.innerHTML = `
          <div class="no-substitutions">
            <p>ไม่มีการสอนแทนในวันที่ ${formatThaiDate(date)}</p>
          </div>
        `;
      }
      return;
    }
    
    // Get detailed substitution data
    const detailedSubstitutions = await Promise.all(
      dateSubstitutions.map(async (substitution) => {
        const teacher = data.teachers.find(t => t.id === substitution.absent_teacher_id);
        
        // Get affected schedules
        const affectedSchedules = data.schedules.filter(schedule => {
          const subject = data.subjects.find(s => s.id === schedule.subject_id);
          return subject && subject.teacher_id === substitution.absent_teacher_id;
        });
        
        const affectedSchedulesWithDetails = affectedSchedules.map(schedule => {
          const subject = data.subjects.find(s => s.id === schedule.subject_id);
          const classData = data.classes.find(c => c.id === schedule.class_id);
          const room = data.rooms.find(r => r.id === schedule.room_id);
          
          return {
            ...schedule,
            subject_name: subject?.subject_name || '',
            class_name: classData?.class_name || '',
            room_name: room?.name || '',
            room_type: room?.room_type || ''
          };
        });
        
        return {
          ...substitution,
          teacher_name: teacher?.name || 'ไม่ระบุ',
          affected_schedules: affectedSchedulesWithDetails
        };
      })
    );
    
    // Get substitute assignments for this date
    const substituteAssignments = data.substitutionSchedules.filter(schedule => {
      const substitution = data.substitutions.find(s => s.id === schedule.substitution_id);
      return substitution && substitution.absent_date === date;
    }).map(schedule => {
      const substitution = data.substitutions.find(s => s.id === schedule.substitution_id);
      const originalSchedule = data.schedules.find(s => s.id === schedule.original_schedule_id);
      const substituteTeacher = data.teachers.find(t => t.id === schedule.substitute_teacher_id);
      
      let scheduleDetails = {};
      if (originalSchedule) {
        const subject = data.subjects.find(s => s.id === originalSchedule.subject_id);
        const classData = data.classes.find(c => c.id === originalSchedule.class_id);
        const room = data.rooms.find(r => r.id === originalSchedule.room_id);
        
        scheduleDetails = {
          subject_name: subject?.subject_name || '',
          class_name: classData?.class_name || '',
          room_name: room?.name || '',
          room_type: room?.room_type || '',
          day_of_week: originalSchedule.day_of_week,
          period: originalSchedule.period
        };
      }
      
      return {
        ...schedule,
        substitution,
        substitute_teacher_name: substituteTeacher?.name || 'ไม่ระบุ',
        ...scheduleDetails
      };
    });
    
    // Render the substitution data
    const substitutionDisplay = document.querySelector('#substitution-display');
    if (substitutionDisplay) {
      substitutionDisplay.innerHTML = `
        <div class="substitution-date-header">
          <h4>📋 ตารางสอนแทน - วันที่ ${formatThaiDate(date)}</h4>
        </div>
        
        ${renderSubstitutionExportBar(context)}
        
        <div class="absent-teachers-section">
          <h5>ครูที่ไม่อยู่</h5>
          ${renderAbsentTeacherCards(detailedSubstitutions, context)}
        </div>
        
        <div class="substitute-assignments-section">
          <h5>ตารางสอนแทน</h5>
          ${renderSubstituteAssignments(substituteAssignments, context)}
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error loading substitution by date:', error);
    throw error;
  }
}

/**
 * Render absent teacher cards
 */
export function renderAbsentTeacherCards(absences, context) {
  if (!absences.length) {
    return '<p class="no-absences">ไม่มีครูที่ขาดในวันนี้</p>';
  }
  
  return absences.map(absence => `
    <div class="absent-card">
      <h4>${absence.teacher_name}</h4>
      <p class="reason">เหตุผล: ${absence.reason || 'ไม่ระบุ'}</p>
      <div class="affected-classes">
        <h6>คาบที่ได้รับผลกระทบ:</h6>
        ${absence.affected_schedules.map(schedule => `
          <div class="schedule-item">
            <span class="period">คาบ ${schedule.period}</span>
            <span class="subject">${schedule.subject_name}</span>
            <span class="class">${schedule.class_name}</span>
            <span class="room">
              ${schedule.room_name}
              ${schedule.room_type ? `<span class="badge ${getRoomTypeBadgeClass(schedule.room_type)}">${schedule.room_type}</span>` : ''}
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * Render substitute assignments
 */
export function renderSubstituteAssignments(assignments, context) {
  if (!assignments.length) {
    return '<p class="no-assignments">ยังไม่มีการจัดสรรครูสอนแทน</p>';
  }
  
  return `
    <div class="assignments-grid">
      ${assignments.map(assignment => `
        <div class="assignment-card">
          <div class="assignment-header">
            <span class="period">คาบ ${assignment.period}</span>
            <span class="day">${getThaiDayName(assignment.day_of_week)}</span>
          </div>
          <div class="assignment-details">
            <div class="subject">${assignment.subject_name}</div>
            <div class="class">${assignment.class_name}</div>
            <div class="room">
              ${assignment.room_name}
              ${assignment.room_type ? `<span class="badge ${getRoomTypeBadgeClass(assignment.room_type)}">${assignment.room_type}</span>` : ''}
            </div>
          </div>
          <div class="substitute-teacher">
            <strong>ครูสอนแทน:</strong> ${assignment.substitute_teacher_name}
          </div>
          <div class="periods-count">
            ${assignment.periods_count} คาบ
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Update page for new context
 */
export async function updatePageForContext(newContext) {
  console.log('Updating Substitution Page for new context:', newContext);
  
  try {
    // Update stored context
    substitutionPageState.context = newContext;
    
    // Update sub navigation
    updateSubNavForContext(newContext);
    
    // Reload data for new context
    await loadSubstitutionDataForContext(newContext);
    
    // Refresh current view
    if (substitutionPageState.currentSubPage === 'hall-of-fame') {
      await switchToHallOfFame(newContext);
    } else if (substitutionPageState.currentSubPage === 'substitution-schedule') {
      await switchToSubstitutionSchedule(newContext);
    }
    
  } catch (error) {
    console.error('Error updating Substitution Page context:', error);
    showSubstitutionPageError(`ไม่สามารถเปลี่ยนบริบทได้: ${error.message}`);
  }
}

/**
 * Load substitution data for context
 */
export async function loadSubstitutionDataForContext(context) {
  try {
    showSubstitutionPageLoading(true);
    
    // Load all necessary data
    const [substitutions, substitutionSchedules, teachers, schedules, subjects, classes, rooms] = await Promise.all([
      getSubstitutions(),
      getSubstitutionSchedules(),
      getTeachers(),
      getSchedules(),
      getSubjects(), // TODO: update to pass year+semester if needed
      getClasses(),  // TODO: update to pass year+semester if needed
      getRooms()     // TODO: update to pass year+semester if needed
    ]);
    
    // Store loaded data
    substitutionPageState.loadedData = {
      substitutions: substitutions.data || [],
      substitutionSchedules: substitutionSchedules.data || [],
      teachers: teachers.data || [],
      schedules: schedules.data || [],
      subjects: subjects.data || [],
      classes: classes.data || [],
      rooms: rooms.data || []
    };
    
    console.log('Substitution data loaded:', {
      substitutions: substitutionPageState.loadedData.substitutions.length,
      substitutionSchedules: substitutionPageState.loadedData.substitutionSchedules.length
    });
    
  } catch (error) {
    throw new Error(`ไม่สามารถโหลดข้อมูลการสอนแทนได้: ${error.message}`);
  } finally {
    showSubstitutionPageLoading(false);
  }
}

/**
 * Validate substitution access
 */
export function validateSubstitutionAccess(context) {
  if (!context || !context.semesterId) return false;
  return true;
}

/**
 * Initialize substitution sub navigation
 */
export function initSubstitutionSubNav(context) {
  const subNavContainer = document.querySelector('#substitution-sub-nav');
  if (!subNavContainer) {
    console.warn('Substitution sub navigation container not found');
    return;
  }
  
  const subNavHTML = `
    <div class="sub-nav-tabs">
      <button class="sub-nav-btn active" data-sub-page="hall-of-fame">
        🏅 Hall of Fame
      </button>
      <button class="sub-nav-btn" data-sub-page="substitution-schedule">
        📋 ตารางสอนแทน
      </button>
    </div>
    <div class="context-display">
      <span class="context-badge">
        ${formatSemester(context.semester)} ปีการศึกษา ${context.year}
      </span>
    </div>
  `;
  
  subNavContainer.innerHTML = subNavHTML;
  
  // Add click handlers
  subNavContainer.addEventListener('click', async (e) => {
    if (e.target.matches('[data-sub-page]')) {
      const subPage = e.target.dataset.subPage;
      
      // Update active button
      subNavContainer.querySelectorAll('.sub-nav-btn').forEach(btn => 
        btn.classList.toggle('active', btn.dataset.subPage === subPage)
      );
      
      // Switch to selected sub page
      if (subPage === 'hall-of-fame') {
        await switchToHallOfFame(context);
      } else if (subPage === 'substitution-schedule') {
        await switchToSubstitutionSchedule(context);
      }
    }
  });
}

/**
 * Switch to Hall of Fame view
 */
export async function switchToHallOfFame(context) {
  substitutionPageState.currentSubPage = 'hall-of-fame';
  
  const contentContainer = document.querySelector('#substitution-content');
  if (!contentContainer) return;
  
  try {
    showSubstitutionPageLoading(true);
    
    const hallOfFameHTML = await renderHallOfFame(context);
    contentContainer.innerHTML = hallOfFameHTML;
    
  } catch (error) {
    console.error('Error switching to Hall of Fame:', error);
    showSubstitutionPageError(`ไม่สามารถแสดง Hall of Fame ได้: ${error.message}`);
  } finally {
    showSubstitutionPageLoading(false);
  }
}

/**
 * Switch to substitution schedule view
 */
export async function switchToSubstitutionSchedule(context) {
  substitutionPageState.currentSubPage = 'substitution-schedule';
  
  const contentContainer = document.querySelector('#substitution-content');
  if (!contentContainer) return;
  
  try {
    showSubstitutionPageLoading(true);
    
    const scheduleHTML = await renderSubstitutionScheduleView(context);
    contentContainer.innerHTML = scheduleHTML;
    
    // Initialize date picker
    await initializeDatePicker(context);
    
    // Load substitution for today by default
    await loadSubstitutionByDate(substitutionPageState.selectedDate, context);
    
  } catch (error) {
    console.error('Error switching to substitution schedule:', error);
    showSubstitutionPageError(`ไม่สามารถแสดงตารางสอนแทนได้: ${error.message}`);
  } finally {
    showSubstitutionPageLoading(false);
  }
}

/**
 * Update sub nav for context
 */
export function updateSubNavForContext(newContext) {
  const contextDisplay = document.querySelector('#substitution-sub-nav .context-display .context-badge');
  if (contextDisplay) {
    contextDisplay.textContent = `${formatSemester(newContext.semester)} ปีการศึกษา ${newContext.year}`;
  }
}
