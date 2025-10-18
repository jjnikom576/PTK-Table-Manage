/**
 * Substitution Details Module
 * Handles the "รายละเอียดการสอนแทน" tab with teacher-by-teacher breakdown
 * Similar structure to teacherSchedule.js
 */

import scheduleAPI from '../../api/schedule-api.js';
import * as globalContext from '../../context/globalContext.js';
import { formatThaiDate, getTeacherName } from '../../utils.js';
import { scrollElementToViewportTop } from '../teacher/helpers.js';

// =============================================================================
// MODULE STATE
// =============================================================================

let moduleState = {
  teachers: [],
  selectedTeacher: null,
  selectedDate: null,
  substitutionsByTeacher: {},
  isLoading: false,
  error: null,
  initialized: false
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize Substitution Details Tab
 * @param {Object} context - Global context
 * @param {Number} preSelectedTeacherId - Optional teacher ID to auto-select and load
 */
export async function initSubstitutionDetails(context = null, preSelectedTeacherId = null) {
  const currentContext = context || globalContext.getContext();

  console.log('[SubstitutionDetails] Initializing with context:', currentContext);
  if (preSelectedTeacherId) {
    console.log('[SubstitutionDetails] Pre-selecting teacher:', preSelectedTeacherId);
  }

  try {
    // Validate context
    if (!currentContext.currentYear || !currentContext.currentSemester) {
      throw new Error('ไม่ได้เลือกปีการศึกษาหรือภาคเรียน');
    }

    // Load teachers from Hall of Fame API
    await loadTeachers();

    // Setup event listeners
    if (!moduleState.initialized) {
      setupEventListeners();
      moduleState.initialized = true;
    }

    // If pre-selected teacher ID provided, auto-select and load their data
    if (preSelectedTeacherId) {
      // Find and activate the teacher tab
      const teacherTab = document.querySelector(`.teacher-tab[data-teacher-id="${preSelectedTeacherId}"]`);
      if (teacherTab) {
        // Update active state
        document.querySelectorAll('#substitution-teacher-tabs .teacher-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        teacherTab.classList.add('active');
        teacherTab.setAttribute('aria-selected', 'true');

        // Scroll into view
        teacherTab.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Load teacher data
        await loadTeacherSubstitutions(preSelectedTeacherId);

        console.log('[SubstitutionDetails] Auto-selected teacher:', preSelectedTeacherId);
      } else {
        console.warn('[SubstitutionDetails] Teacher tab not found for pre-selection:', preSelectedTeacherId);
      }
    }

    console.log('[SubstitutionDetails] Initialization complete');

  } catch (error) {
    console.error('[SubstitutionDetails] Initialization error:', error);
    showError(error.message);
  }
}

/**
 * Refresh the module with new context
 */
export async function refreshSubstitutionDetails(newContext = null) {
  console.log('[SubstitutionDetails] Refreshing...');

  const currentContext = newContext || globalContext.getContext();

  try {
    // Clear state
    moduleState.teachers = [];
    moduleState.selectedTeacher = null;
    moduleState.selectedDate = null;
    moduleState.substitutionsByTeacher = {};

    // Reload
    await initSubstitutionDetails(currentContext);

    console.log('[SubstitutionDetails] ✅ Refresh complete');

  } catch (error) {
    console.error('[SubstitutionDetails] Refresh error:', error);
    showError(error.message);
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load teachers with substitution data
 */
async function loadTeachers() {
  try {
    setLoading(true);

    console.log('[SubstitutionDetails] Loading teachers from Hall of Fame...');

    const response = await scheduleAPI.getHallOfFame();

    if (response.success && response.data) {
      // Get ALL teachers (not just those with substitution_count > 0)
      // We want to show all teachers so users can explore
      const allTeachers = response.data.teachers || [];

      // Sort by substitution count descending, then by name
      moduleState.teachers = allTeachers.sort((a, b) => {
        const countDiff = (b.substitution_count || 0) - (a.substitution_count || 0);
        if (countDiff !== 0) return countDiff;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      console.log('[SubstitutionDetails] Loaded teachers:', moduleState.teachers.length, 'teachers');

      // Render teacher tabs
      renderTeacherTabs();

    } else {
      throw new Error(response.message || 'ไม่สามารถโหลดข้อมูลครูได้');
    }

  } catch (error) {
    console.error('[SubstitutionDetails] Error loading teachers:', error);
    showError('เกิดข้อผิดพลาดในการโหลดข้อมูลครู: ' + error.message);
  } finally {
    setLoading(false);
  }
}

/**
 * Load substitution data for a specific teacher
 */
async function loadTeacherSubstitutions(teacherId) {
  try {
    setLoading(true);

    console.log('[SubstitutionDetails] Loading substitutions for teacher:', teacherId);

    const response = await scheduleAPI.getTeacherSubstitutions(teacherId);

    if (response.success && response.data) {
      moduleState.substitutionsByTeacher[teacherId] = response.data;
      moduleState.selectedTeacher = teacherId;

      console.log('[SubstitutionDetails] Teacher substitutions loaded:', response.data);

      // Render teacher details
      renderTeacherDetails(teacherId);
      scrollToDetailsSection('#substitution-details');

    } else {
      throw new Error(response.message || 'ไม่สามารถโหลดข้อมูลการสอนแทนได้');
    }

  } catch (error) {
    console.error('[SubstitutionDetails] Error loading teacher substitutions:', error);
    showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
  } finally {
    setLoading(false);
  }
}

/**
 * Load substitution details for a specific date
 */
async function loadDateDetails(teacherId, date) {
  try {
    console.log('[SubstitutionDetails] Loading date details:', teacherId, date);

    moduleState.selectedDate = date;

    const response = await scheduleAPI.getSubstitutionDetails(teacherId, date);

    if (response.success && response.data) {
      console.log('[SubstitutionDetails] Date details loaded:', response.data);

      // Render date details table
      renderDateDetailsTable(teacherId, date, response.data);

    } else {
      throw new Error(response.message || 'ไม่สามารถโหลดรายละเอียดได้');
    }

  } catch (error) {
    console.error('[SubstitutionDetails] Error loading date details:', error);
    showError('เกิดข้อผิดพลาดในการโหลดรายละเอียด: ' + error.message);
  }
}

// =============================================================================
// RENDERING FUNCTIONS
// =============================================================================

/**
 * Render teacher tabs (EXACT MATCH to teacherSchedule.js)
 */
function renderTeacherTabs() {
  const container = document.getElementById('substitution-teacher-tabs');

  if (!container) {
    console.error('[SubstitutionDetails] ❌ Teacher tabs container NOT found');
    return;
  }

  // Make sure container is visible
  container.classList.remove('hidden');
  container.style.display = 'block';

  const teachers = moduleState.teachers;

  if (teachers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>ยังไม่มีข้อมูลการสอนแทนในภาคเรียนนี้</p>
      </div>
    `;
    return;
  }

  // Build group names and buckets (SAME AS teacherSchedule.js)
  const groups = teachers.reduce((acc, t) => {
    const key = t.subject_group || 'อื่นๆ';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'th'));

  // Render group filter chips (SAME AS teacherSchedule.js)
  const filterBar = `
    <div id="teacher-group-filter" class="group-filter" role="tablist" aria-label="กรองตามกลุ่มสาระ">
      <button class="group-chip active" data-group="ALL">ทั้งหมด</button>
      ${groupNames.map(g => `
        <button class="group-chip" data-group="${g}">${g}</button>
      `).join('')}
    </div>
  `;

  // Render all groups (SAME AS teacherSchedule.js)
  const groupsHTML = `
    <div class="teacher-groups">
      ${groupNames.map(g => {
        const list = groups[g]
          .slice()
          .sort((a, b) => {
            // Sort by substitution count DESC, then by name
            const countDiff = (b.substitution_count || 0) - (a.substitution_count || 0);
            if (countDiff !== 0) return countDiff;
            const nameA = a.full_name || getTeacherName(a);
            const nameB = b.full_name || getTeacherName(b);
            return nameA.localeCompare(nameB, 'th');
          })
          .map(t => {
            const count = t.substitution_count || 0;
            // const countBadge = count > 0 ? `<span class="count-badge">${count} ครั้ง</span>` : '';
            const countBadge = count > 0 ? `<span class="count-badge">${count}</span>` : '';
            return `
              <button class="teacher-tab" data-teacher-id="${t.id}" role="tab" aria-selected="false">
                <span class="teacher-tab__name">${t.full_name || getTeacherName(t)}</span>
                ${countBadge}
              </button>
            `;
          }).join('');
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

  container.innerHTML = filterBar + groupsHTML;

  // Ensure all parent elements are visible
  let parent = container.parentElement;
  let depth = 0;
  while (parent && depth < 5) {
    if (parent.classList.contains('hidden')) {
      console.log('[SubstitutionDetails] Removing hidden from parent:', parent.id || parent.className);
      parent.classList.remove('hidden');
    }
    if (parent.style.display === 'none') {
      parent.style.display = 'block';
    }
    parent = parent.parentElement;
    depth++;
  }

  // Bind click events
  bindTeacherTabClicks();
  bindGroupFilterClicks();

  console.log('[SubstitutionDetails] Teacher tabs rendered:', teachers.length, 'teachers in', groupNames.length, 'groups');
}

/**
 * Render teacher details section
 */
function renderTeacherDetails(teacherId) {
  const teacher = moduleState.teachers.find(t => t.id === teacherId);
  if (!teacher) {
    console.error('[SubstitutionDetails] Teacher not found:', teacherId);
    return;
  }

  const data = moduleState.substitutionsByTeacher[teacherId];
  if (!data || !data.dates) {
    console.error('[SubstitutionDetails] No substitution data for teacher:', teacherId);
    return;
  }

  // Show containers
  const contentContainer = document.getElementById('substitution-details-content');
  const emptyState = document.getElementById('substitution-details-empty');
  const exportBar = document.getElementById('export-bar-substitution');

  if (contentContainer) contentContainer.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  if (exportBar) exportBar.classList.remove('hidden');

  // Render teacher info
  const infoContainer = document.getElementById('substitution-teacher-info');
  if (infoContainer) {
    infoContainer.classList.remove('hidden');
    infoContainer.innerHTML = `
      <div class="teacher-card">
        <h3>👨‍🏫 ${teacher.full_name}</h3>
        <div class="teacher-meta">
          <span class="badge">${teacher.subject_group || 'ไม่ระบุ'}</span>
          <span class="stat">สอนแทนทั้งหมด: <strong>${teacher.substitution_count} ครั้ง</strong></span>
        </div>
      </div>
    `;
  }

  // Render date buttons
  renderDateButtons(teacherId, data.dates);

  console.log('[SubstitutionDetails] Teacher details rendered for:', teacher.full_name);

  scrollToDetailsSection('#substitution-details-content');
}

/**
 * Render date buttons
 */
function renderDateButtons(teacherId, dates) {
  const container = document.getElementById('substitution-dates-container');
  if (!container) return;

  container.classList.remove('hidden');

  // Sort dates descending (newest first)
  const sortedDates = [...dates].sort((a, b) => new Date(b) - new Date(a));

  let html = '<h4>📅 เลือกวันที่เพื่อดูรายละเอียด:</h4>';
  html += '<div class="date-buttons-grid">';

  sortedDates.forEach(date => {
    const thaiDate = formatThaiDate(date);
    const isActive = moduleState.selectedDate === date;

    html += `
      <button class="date-btn ${isActive ? 'active' : ''}"
              data-teacher-id="${teacherId}"
              data-date="${date}"
              title="ดูรายละเอียดวันที่ ${thaiDate}">
        📅 ${thaiDate}
      </button>
    `;
  });

  html += '</div>';

  container.innerHTML = html;

  // Bind date button clicks
  bindDateButtonClicks();
}

/**
 * Render date details table
 */
function renderDateDetailsTable(teacherId, date, data) {
  const container = document.getElementById('substitution-detail-table');
  if (!container) return;

  container.classList.remove('hidden');

  const periods = data.periods || [];

  if (periods.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>ไม่พบข้อมูลการสอนแทนในวันนี้</p>
      </div>
    `;
    return;
  }

  const thaiDate = formatThaiDate(date);

  let html = `
    <div class="detail-card">
      <h4>📋 รายละเอียดการสอนแทน - ${thaiDate}</h4>
      <table class="detail-table">
        <thead>
          <tr>
            <th>คาบที่</th>
            <th>ครูที่ขาด</th>
            <th>ชั้นเรียน</th>
            <th>วิชา</th>
            <th>ห้อง</th>
          </tr>
        </thead>
        <tbody>
  `;

  periods.forEach(period => {
    html += `
      <tr>
        <td class="text-center"><strong>${period.period_no}</strong></td>
        <td>${period.absent_teacher_name || 'ไม่ระบุ'}</td>
        <td>${period.class_name || '-'}</td>
        <td>${period.subject_name || '-'}</td>
        <td>${period.room_name || '-'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <div class="table-footer">
        <p>รวม <strong>${periods.length}</strong> คาบ</p>
      </div>
    </div>
  `;

  container.innerHTML = html;
  scrollToDetailsSection('#substitution-detail-table');

  console.log('[SubstitutionDetails] Date details table rendered:', periods.length, 'periods');
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Setup event listeners
 */
function setupEventListeners() {
  console.log('[SubstitutionDetails] Setting up event listeners');

  // Event listeners will be bound dynamically after rendering

  console.log('[SubstitutionDetails] Event listeners setup complete');
}

/**
 * Bind teacher tab click events
 */
function bindTeacherTabClicks() {
  const container = document.getElementById('substitution-teacher-tabs');
  if (!container) return;

  // Remove existing listener to prevent duplicate bindings
  const newContainer = container.cloneNode(true);
  container.parentNode.replaceChild(newContainer, container);

  // Use event delegation for better performance
  newContainer.addEventListener('click', async (e) => {
    const teacherTab = e.target.closest('.teacher-tab');
    if (!teacherTab) return;

    const teacherId = parseInt(teacherTab.dataset.teacherId);
    console.log('[SubstitutionDetails] Teacher tab clicked:', teacherId);

    // Update active state
    document.querySelectorAll('#substitution-teacher-tabs .teacher-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    teacherTab.classList.add('active');
    teacherTab.setAttribute('aria-selected', 'true');

    // Load teacher data
    await loadTeacherSubstitutions(teacherId);
  });
}

/**
 * Bind group filter click events
 */
function bindGroupFilterClicks() {
  const filterContainer = document.getElementById('teacher-group-filter');
  if (!filterContainer) return;

  // Remove existing listener to prevent duplicate bindings
  const newFilterContainer = filterContainer.cloneNode(true);
  filterContainer.parentNode.replaceChild(newFilterContainer, filterContainer);

  newFilterContainer.addEventListener('click', async (e) => {
    const chip = e.target.closest('.group-chip');
    if (!chip) return;

    const selectedGroup = chip.dataset.group;
    console.log('[SubstitutionDetails] Group filter clicked:', selectedGroup);

    // Update active chip
    document.querySelectorAll('.group-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    // Filter groups display
    const allSections = document.querySelectorAll('.teacher-groups .group-section');

    if (selectedGroup === 'ALL') {
      // Show all groups
      allSections.forEach(section => section.style.display = 'block');
      const groupsContainer = document.querySelector('.teacher-groups');
      if (groupsContainer) groupsContainer.classList.remove('single');
    } else {
      // Show only selected group
      allSections.forEach(section => {
        const groupTitle = section.querySelector('.group-title');
        if (groupTitle && groupTitle.textContent === selectedGroup) {
          section.style.display = 'block';
        } else {
          section.style.display = 'none';
        }
      });
      const groupsContainer = document.querySelector('.teacher-groups');
      if (groupsContainer) groupsContainer.classList.add('single');
    }
  });
}

/**
 * Bind date button click events
 */
function bindDateButtonClicks() {
  const buttons = document.querySelectorAll('.date-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const teacherId = parseInt(btn.dataset.teacherId);
      const date = btn.dataset.date;

      console.log('[SubstitutionDetails] Date button clicked:', date);

      // Update active state
      document.querySelectorAll('.date-btn').forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      // Load date details
      await loadDateDetails(teacherId, date);
    });
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Set loading state
 */
function setLoading(isLoading) {
  moduleState.isLoading = isLoading;
  const loadingEl = document.getElementById('substitution-loading');
  if (loadingEl) {
    if (isLoading) {
      loadingEl.classList.remove('hidden');
    } else {
      loadingEl.classList.add('hidden');
    }
  }
}

/**
 * Show error message
 */
function showError(message) {
  moduleState.error = message;
  const errorEl = document.getElementById('substitution-error');
  if (errorEl) {
    const messageEl = errorEl.querySelector('.error-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    errorEl.classList.remove('hidden');
  }
  console.error('[SubstitutionDetails] Error:', message);
}

function scrollToDetailsSection(targetSelector, offset = 180) {
  try {
    if (typeof window === 'undefined') return;

    const app = window.SchoolScheduleApp;
    const pageActive =
      (app && app.currentPage === 'substitution') ||
      !document.getElementById('page-substitution')?.classList.contains('hidden');

    if (!pageActive) return;

    const target =
      (typeof targetSelector === 'string' && document.querySelector(targetSelector)) ||
      document.querySelector('#substitution-details-content') ||
      document.getElementById('substitution-details');

    if (!target) return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollElementToViewportTop(target, offset);
      }, 50);
    });
  } catch (error) {
    console.warn('[SubstitutionDetails] scrollToDetailsSection failed:', error);
  }
}
