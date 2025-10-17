/**
 * Substitution Schedule Page - Hall of Fame & Schedule Display
 * Similar to teacherSchedule.js structure
 */

import scheduleAPI from '../api/schedule-api.js';
import * as globalContext from '../context/globalContext.js';
import { formatThaiDate, getTeacherName } from '../utils.js';
import { initSubstitutionDetails, refreshSubstitutionDetails } from './substitutionDetails.js';

// =============================================================================
// PAGE STATE
// =============================================================================

let pageState = {
  teachers: [],
  selectedTeacher: null,
  selectedDate: null,
  substitutionData: {},
  hallOfFameData: [],
  availableDates: [],
  fallbackFromDate: null,
  isLoading: false,
  error: null,
  eventsInitialized: false
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Initialize Substitution Schedule Page
 */
export async function initSubstitutionSchedulePage(context = null) {
  const currentContext = context || globalContext.getContext();

  console.log('[SubstitutionSchedule] Initializing page with context:', currentContext);

  try {
    // Validate context
    if (!currentContext.currentYear || !currentContext.currentSemester) {
      throw new Error('ไม่ได้เลือกปีการศึกษาหรือภาคเรียน');
    }

    // Check if page is visible
    const substitutionPage = document.getElementById('page-substitution');
    if (substitutionPage && substitutionPage.style.display === 'none') {
      substitutionPage.style.display = 'block';
      substitutionPage.classList.remove('hidden');
    }

    // Load Hall of Fame data
    await loadHallOfFame();

    // Setup event listeners
    setupEventListeners();

    console.log('[SubstitutionSchedule] Page initialized successfully');

  } catch (error) {
    console.error('[SubstitutionSchedule] Failed to initialize page:', error);
    showError(error.message);
  }
}

/**
 * Refresh Page
 */
export async function refreshPage(newContext = null) {
  console.log('[SubstitutionSchedule] Refreshing page with context:', newContext);

  const currentContext = newContext || globalContext.getContext();

  try {
    // Clear current state
    pageState.teachers = [];
    pageState.selectedTeacher = null;
    pageState.selectedDate = null;
    pageState.substitutionData = {};
    pageState.hallOfFameData = [];
    pageState.availableDates = [];
    pageState.fallbackFromDate = null;

    // Reload
    await initSubstitutionSchedulePage(currentContext);

    console.log('[SubstitutionSchedule] ✅ Page refreshed successfully');

  } catch (error) {
    console.error('[SubstitutionSchedule] Failed to refresh page:', error);
    showError(error.message);
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load Hall of Fame Data
 */
async function loadHallOfFame() {
  try {
    setLoading(true);

    console.log('[SubstitutionSchedule] Loading Hall of Fame data...');

    const response = await scheduleAPI.getHallOfFame();

    if (response.success && response.data) {
      pageState.hallOfFameData = response.data.teachers || [];
      console.log('[SubstitutionSchedule] Hall of Fame loaded:', pageState.hallOfFameData.length, 'teachers');

      // Render Hall of Fame
      renderHallOfFame();
    } else {
      throw new Error(response.message || 'ไม่สามารถโหลดข้อมูล Hall of Fame ได้');
    }

  } catch (error) {
    console.error('[SubstitutionSchedule] Error loading Hall of Fame:', error);
    showError('เกิดข้อผิดพลาดในการโหลด Hall of Fame: ' + error.message);
  } finally {
    setLoading(false);
  }
}

/**
 * Load Teacher Substitution Details
 */
async function loadTeacherSubstitutions(teacherId) {
  try {
    setLoading(true);

    console.log('[SubstitutionSchedule] Loading substitutions for teacher:', teacherId);

    const response = await scheduleAPI.getTeacherSubstitutions(teacherId);

    if (response.success && response.data) {
      pageState.substitutionData[teacherId] = response.data;
      console.log('[SubstitutionSchedule] Teacher substitutions loaded:', response.data);

      // Render details
      renderTeacherDetails(teacherId);
    } else {
      throw new Error(response.message || 'ไม่สามารถโหลดข้อมูลการสอนแทนได้');
    }

  } catch (error) {
    console.error('[SubstitutionSchedule] Error loading teacher substitutions:', error);
    showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
  } finally {
    setLoading(false);
  }
}

/**
 * Load Today's Substitution Schedule
 */
async function loadTodaySchedule() {
  const loadingEl = document.getElementById('today-substitution-loading');
  const contentEl = document.getElementById('today-substitution-content');
  const emptyEl = document.getElementById('today-substitution-empty');

  try {
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) {
      contentEl.classList.add('hidden');
      contentEl.innerHTML = '';
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    console.log('[SubstitutionSchedule] Loading today schedule:', dateStr);

    await fetchAndRenderScheduleForDate(dateStr, {
      allowFallback: true
    });
  } catch (error) {
    console.error('[SubstitutionSchedule] Error loading today schedule:', error);
    showError('เกิดข้อผิดพลาดในการโหลดตารางวันนี้: ' + error.message);
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

async function fetchAndRenderScheduleForDate(requestedDate, options = {}) {
  const { allowFallback = false, originalRequestedDate = null } = options;
  const baseRequestedDate = originalRequestedDate || requestedDate;

  const response = await scheduleAPI.getSubstitutionsByDate(requestedDate);

  if (!response.success || !response.data) {
    throw new Error(response.error || response.message || 'ไม่สามารถโหลดตารางสอนแทนได้');
  }

  const {
    date: actualDate = requestedDate,
    absent_teachers: absentTeachers = [],
    available_dates: availableDates = []
  } = response.data;

  pageState.selectedDate = actualDate;
  pageState.availableDates = normalizeAvailableDates(availableDates);

  if (absentTeachers.length === 0 && allowFallback) {
    const fallbackCandidate = pageState.availableDates.find(entry =>
      entry.date && entry.date !== requestedDate && entry.count > 0
    );

    if (fallbackCandidate) {
      console.log('[SubstitutionSchedule] No data for', requestedDate, 'falling back to', fallbackCandidate.date);
      pageState.fallbackFromDate = baseRequestedDate;

      return await fetchAndRenderScheduleForDate(fallbackCandidate.date, {
        allowFallback: false,
        originalRequestedDate: baseRequestedDate
      });
    }
  }

  pageState.fallbackFromDate = (baseRequestedDate && baseRequestedDate !== actualDate)
    ? baseRequestedDate
    : null;

  updateTodayDateDisplay(actualDate, baseRequestedDate);

  console.log('[SubstitutionSchedule] Schedule loaded for', actualDate, '-', absentTeachers.length, 'absent teachers');

  renderTodaySchedule(absentTeachers);

  return {
    actualDate,
    requestedDate: baseRequestedDate,
    count: absentTeachers.length
  };
}

function normalizeAvailableDates(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  return rawEntries
    .filter(entry => entry && entry.date)
    .map(entry => ({
      date: entry.date,
      count: typeof entry.count === 'number'
        ? entry.count
        : parseInt(entry.count, 10) || 0
    }))
    .sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());
}

function updateTodayDateDisplay(actualDate, requestedDate) {
  const dateDisplay = document.getElementById('today-date-display');
  if (!dateDisplay) return;

  const actualThai = formatThaiDate(actualDate);
  const requestedThai = requestedDate ? formatThaiDate(requestedDate) : null;

  if (requestedThai && requestedDate !== actualDate) {
    dateDisplay.innerHTML = `${actualThai}<span class="fallback-note" style="display:block;font-size:0.85em;color:#666;margin-top:4px;">ไม่มีข้อมูลสำหรับ ${requestedThai} จึงแสดงข้อมูลล่าสุด</span>`;
  } else {
    dateDisplay.textContent = actualThai;
  }
}

// =============================================================================
// RENDERING FUNCTIONS
// =============================================================================

/**
 * Render Today's Substitution Schedule (Timetable Format - grouped by absent teacher)
 */
function renderTodaySchedule(absentTeachers) {
  const contentEl = document.getElementById('today-substitution-content');
  const emptyEl = document.getElementById('today-substitution-empty');

  if (!contentEl || !emptyEl) return;

  if (!contentEl.dataset.defaultDisplay) {
    contentEl.dataset.defaultDisplay = contentEl.style.display || 'flex';
  }

  if (!emptyEl.dataset.defaultHtml) {
    emptyEl.dataset.defaultHtml = emptyEl.innerHTML;
  }

  if (absentTeachers.length === 0) {
    contentEl.classList.add('hidden');
    contentEl.style.display = 'none';
    contentEl.innerHTML = '';

    if (pageState.availableDates.length > 0) {
      const latest = pageState.availableDates[0];
      const latestDate = formatThaiDate(latest.date);
      emptyEl.innerHTML = `
        <p>ไม่มีการสอนแทนในวันนี้</p>
        <p class="hint-text">ข้อมูลล่าสุด: ${latestDate} - ${latest.count} รายวิชา</p>
      `;
    } else {
      emptyEl.innerHTML = emptyEl.dataset.defaultHtml || '<p>ไม่มีการสอนแทนในวันนี้</p>';
    }

    emptyEl.classList.remove('hidden');
    return;
  }

  // Show content, hide empty state
  contentEl.classList.remove('hidden');
  contentEl.style.display = contentEl.dataset.defaultDisplay || 'flex';
  emptyEl.classList.add('hidden');
  emptyEl.innerHTML = emptyEl.dataset.defaultHtml || '<p>ไม่มีการสอนแทนในวันนี้</p>';

  // Build HTML (same format as substitute recommendation)
  let html = '';

  if (pageState.fallbackFromDate) {
    html += `
      <div class="fallback-banner" role="status">
        <strong>แสดงข้อมูลล่าสุด</strong>
        <span>ไม่มีข้อมูลสำหรับ ${formatThaiDate(pageState.fallbackFromDate)} จึงแสดงข้อมูลของ ${formatThaiDate(pageState.selectedDate)}</span>
      </div>
    `;
  }

  const sortedTeachers = [...absentTeachers].sort((a, b) => {
    const nameCompare = (a.teacher_name || '').localeCompare(b.teacher_name || '', 'th');
    if (nameCompare !== 0) return nameCompare;
    return (a.teacher_id || 0) - (b.teacher_id || 0);
  });

  sortedTeachers.forEach(teacher => {
    html += `
      <div class="substitute-timetable-card">
        <h4 class="timetable-header">
          📋 ตารางสอนแทน - ${teacher.teacher_name}
          <span class="badge">${teacher.periods.length} คาบ</span>
        </h4>

        <div class="timetable-grid">
          <table class="substitute-table">
            <thead>
              <tr>
                <th>คาบ</th>
                <th>วิชา</th>
                <th>ชั้นเรียน</th>
                <th>ห้อง</th>
                <th>ครูสอนแทน</th>
              </tr>
            </thead>
            <tbody>
              ${teacher.periods.map(period => `
                <tr>
                  <td class="period-cell">
                    <strong>คาบ ${period.period_no}</strong>
                  </td>
                  <td class="subject-cell">
                    ${period.subject_name || '-'}
                  </td>
                  <td class="class-cell">
                    <span class="badge badge-class">${period.class_name || '-'}</span>
                  </td>
                  <td class="room-cell">
                    ${period.room_name || '-'}
                  </td>
                  <td class="teacher-cell">
                    ${period.substitute_teacher_name || 'ว่าง'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  contentEl.innerHTML = html;

  console.log('[SubstitutionSchedule] Today schedule rendered:', absentTeachers.length, 'teachers', { absentTeachers });
}

/**
 * Render Hall of Fame Ranking (Card Format)
 */
function renderHallOfFame() {
  const container = document.getElementById('substitute-ranking');
  if (!container) return;

  const teachers = pageState.hallOfFameData;

  if (teachers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>ยังไม่มีข้อมูลการสอนแทนในภาคเรียนนี้</p>
      </div>
    `;
    return;
  }

  // Build ranking HTML (Card format matching teacher summary)
  let html = '<div class="ranking-list">';

  teachers.forEach((teacher, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    const count = teacher.substitution_count || 0;

    // Special styling for top 3
    const rankClass = rank <= 3 ? `rank-${rank}` : '';

    html += `
      <div class="ranking-item ${rankClass}" data-teacher-id="${teacher.id}">
        <div class="rank-line">${medal} #${rank}</div>
        <div class="group-line">${teacher.subject_group || 'ไม่ระบุ'}</div>
        <div class="name-line">${teacher.full_name || getTeacherName(teacher)}</div>
        <div class="meta-line">
          <span>สอนแทน: ${count} ครั้ง</span>
        </div>
      </div>
    `;
  });

  html += '</div>';

  container.innerHTML = html;

  // Bind click events
  bindRankingClickEvents();

  console.log('[SubstitutionSchedule] Hall of Fame rendered:', teachers.length, 'teachers');
}

/**
 * Render Teacher Details (when clicked)
 */
function renderTeacherDetails(teacherId) {
  const teacher = pageState.hallOfFameData.find(t => t.id === teacherId);
  if (!teacher) {
    console.error('[SubstitutionSchedule] Teacher not found:', teacherId);
    return;
  }

  const data = pageState.substitutionData[teacherId];
  if (!data || !data.dates) {
    console.error('[SubstitutionSchedule] No substitution data for teacher:', teacherId);
    return;
  }

  // Create modal or expand section to show details
  const container = document.getElementById('substitute-ranking');
  if (!container) return;

  // Find the clicked ranking item
  const rankingItem = container.querySelector(`[data-teacher-id="${teacherId}"]`);
  if (!rankingItem) return;

  // Check if details already shown
  let detailsSection = rankingItem.nextElementSibling;
  if (detailsSection && detailsSection.classList.contains('teacher-details-section')) {
    // Toggle visibility
    detailsSection.classList.toggle('hidden');
    return;
  }

  // Build details HTML
  let html = `
    <div class="teacher-details-section" data-teacher-id="${teacherId}">
      <div class="details-header">
        <h4>📅 รายละเอียดการสอนแทนของ ${teacher.full_name}</h4>
        <button class="btn btn--ghost btn--sm close-details" data-teacher-id="${teacherId}">✖️ ปิด</button>
      </div>
      <div class="details-body">
        <div class="date-buttons">
  `;

  // Sort dates descending
  const sortedDates = data.dates.sort((a, b) => new Date(b) - new Date(a));

  sortedDates.forEach(date => {
    const thaiDate = formatThaiDate(date);
    html += `
      <button class="btn btn--outline date-btn"
              data-teacher-id="${teacherId}"
              data-date="${date}"
              title="ดูรายละเอียดวันที่ ${thaiDate}">
        📅 ${thaiDate}
      </button>
    `;
  });

  html += `
        </div>
        <div class="date-detail-container" id="date-detail-${teacherId}">
          <p class="hint-text">คลิกวันที่เพื่อดูรายละเอียด</p>
        </div>
      </div>
    </div>
  `;

  // Insert after ranking item
  rankingItem.insertAdjacentHTML('afterend', html);

  // Bind date button clicks
  bindDateButtonClicks(teacherId);

  console.log('[SubstitutionSchedule] Teacher details rendered for:', teacher.full_name);
}

/**
 * Render Date Details (when date button clicked)
 */
async function renderDateDetails(teacherId, date) {
  const detailContainer = document.getElementById(`date-detail-${teacherId}`);
  if (!detailContainer) return;

  // Show loading
  detailContainer.innerHTML = '<div class="loading-spinner"></div><p>กำลังโหลด...</p>';

  try {
    // Call API to get substitution details for this teacher on this date
    const response = await scheduleAPI.getSubstitutionDetails(teacherId, date);

    if (response.success && response.data) {
      const details = response.data;

      let html = `
        <div class="date-detail-card">
          <h5>📋 รายละเอียดวันที่ ${formatThaiDate(date)}</h5>
          <table class="detail-table">
            <thead>
              <tr>
                <th>คาบ</th>
                <th>ครูที่ขาด</th>
                <th>ชั้นเรียน</th>
                <th>วิชา</th>
                <th>ห้อง</th>
              </tr>
            </thead>
            <tbody>
      `;

      details.periods.forEach(period => {
        html += `
          <tr>
            <td>${period.period_no}</td>
            <td>${period.absent_teacher_name}</td>
            <td>${period.class_name}</td>
            <td>${period.subject_name}</td>
            <td>${period.room_name}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      detailContainer.innerHTML = html;

    } else {
      detailContainer.innerHTML = '<p class="error-text">ไม่พบข้อมูล</p>';
    }

  } catch (error) {
    console.error('[SubstitutionSchedule] Error loading date details:', error);
    detailContainer.innerHTML = '<p class="error-text">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  if (pageState.eventsInitialized) {
    console.log('[SubstitutionSchedule] Event listeners already initialized');
    return;
  }

  console.log('[SubstitutionSchedule] Setting up event listeners');

  // Sub-tab navigation (Hall of Fame / Schedule)
  const subTabs = document.querySelectorAll('#page-substitution .sub-nav-tab');
  subTabs.forEach(tab => {
    tab.addEventListener('click', handleSubTabClick);
  });

  pageState.eventsInitialized = true;
  console.log('[SubstitutionSchedule] Event listeners setup completed');
}

/**
 * Handle Sub Tab Click
 */
async function handleSubTabClick(event) {
  const tab = event.currentTarget;
  const targetId = tab.dataset.target;

  console.log('[SubstitutionSchedule] Sub-tab clicked:', targetId);

  // Update tab states
  document.querySelectorAll('#page-substitution .sub-nav-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');

  // Show/hide content
  document.querySelectorAll('#page-substitution .sub-page').forEach(page => {
    page.classList.add('hidden');
    page.classList.remove('active');
  });
  const targetPage = document.getElementById(targetId);
  if (targetPage) {
    targetPage.classList.remove('hidden');
    targetPage.classList.add('active');
  }

  // Initialize the target tab if needed
  if (targetId === 'substitution-details') {
    // Load substitution details tab (teacher-by-teacher view)
    const currentContext = globalContext.getContext();
    await initSubstitutionDetails(currentContext);
  } else if (targetId === 'substitution-schedule') {
    // Today's schedule tab - load today's substitutions
    console.log('[SubstitutionSchedule] Today schedule tab activated');
    await loadTodaySchedule();
  }
}

/**
 * Bind Ranking Click Events (Card click to navigate to details tab)
 */
function bindRankingClickEvents() {
  const rankingCards = document.querySelectorAll('.ranking-item');
  rankingCards.forEach(card => {
    card.addEventListener('click', async (e) => {
      const teacherId = parseInt(card.dataset.teacherId);
      console.log('[SubstitutionSchedule] Ranking card clicked for teacher:', teacherId);

      // Switch to "รายละเอียดรายครู" tab
      const detailsTab = document.querySelector('.sub-nav-tab[data-target="substitution-details"]');
      if (detailsTab) {
        // Update tab states
        document.querySelectorAll('#page-substitution .sub-nav-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        detailsTab.classList.add('active');
        detailsTab.setAttribute('aria-selected', 'true');

        // Show/hide content
        document.querySelectorAll('#page-substitution .sub-page').forEach(page => {
          page.classList.add('hidden');
          page.classList.remove('active');
        });
        const targetPage = document.getElementById('substitution-details');
        if (targetPage) {
          targetPage.classList.remove('hidden');
          targetPage.classList.add('active');
        }

        // Initialize details tab and select teacher
        const currentContext = globalContext.getContext();
        await initSubstitutionDetails(currentContext, teacherId);

        console.log('[SubstitutionSchedule] Navigated to teacher details tab for teacher:', teacherId);
      }
    });
  });
}

/**
 * Bind Date Button Clicks
 */
function bindDateButtonClicks(teacherId) {
  const dateButtons = document.querySelectorAll(`.date-btn[data-teacher-id="${teacherId}"]`);
  dateButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const date = btn.dataset.date;
      console.log('[SubstitutionSchedule] Date button clicked:', date);

      // Highlight active button
      document.querySelectorAll(`.date-btn[data-teacher-id="${teacherId}"]`).forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      // Load and show date details
      await renderDateDetails(teacherId, date);
    });
  });

  // Bind close button
  const closeBtn = document.querySelector(`.close-details[data-teacher-id="${teacherId}"]`);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const detailsSection = document.querySelector(`.teacher-details-section[data-teacher-id="${teacherId}"]`);
      if (detailsSection) {
        detailsSection.remove();
      }
    });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Set Loading State
 */
function setLoading(isLoading) {
  pageState.isLoading = isLoading;
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
 * Show Error
 */
function showError(message) {
  pageState.error = message;
  const errorEl = document.getElementById('substitution-error');
  if (errorEl) {
    const messageEl = errorEl.querySelector('.error-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    errorEl.classList.remove('hidden');
  }
  console.error('[SubstitutionSchedule] Error:', message);
}
