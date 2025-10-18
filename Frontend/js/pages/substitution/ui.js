import {
  formatSemester,
  formatThaiDate,
  getThaiDayName,
  getRoomTypeBadgeClass
} from '../../utils.js';
import {
  substitutionPageState,
  getLoadedData,
  getSelectedDate
} from './state.js';
import {
  calculateSubstituteStats,
  generateSubstituteRanking
} from './data.js';

export async function renderHallOfFame(context) {
  const data = getLoadedData();
  if (!data) {
    throw new Error('ไม่มีข้อมูลที่โหลดแล้ว');
  }

  return `
    <div class="hall-of-fame-header">
      <h3>🏅 Hall of Fame - ครูสอนแทน</h3>
      <p class="context-info">
        ${formatSemester(context.semester)} ปีการศึกษา ${context.year}
      </p>
    </div>
    <div class="hall-of-fame-content">
      ${await renderSubstituteRanking()}
      ${await renderSubstituteStats()}
      ${await renderSemesterAchievements()}
    </div>
  `;
}

export async function renderSubstituteRanking() {
  const ranking = generateSubstituteRanking();
  const rankingHTML = ranking
    .slice(0, 5)
    .map(
      (item, index) => `
    <div class="substitute-rank-item">
      <span class="rank">${['🥇', '🥈', '🥉', '4.', '5.'][index] || `${index + 1}.`}</span>
      <span class="teacher-name">${item.teacher?.name || 'ไม่ระบุ'}</span>
      <span class="periods">${item.periods} คาบ</span>
    </div>
  `
    )
    .join('');

  return `
    <div class="substitute-ranking-section">
      <h4>🏆 ครูสอนแทนยอดเยี่ยม</h4>
      ${rankingHTML || '<p>ไม่มีข้อมูล</p>'}
    </div>
  `;
}

export async function renderSubstituteStats() {
  const stats = calculateSubstituteStats();

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

export function renderSubstitutionExportBar() {
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

export async function renderSubstitutionScheduleView() {
  return `
    <div class="substitution-schedule-container">
      ${renderDatePicker()}
      <div id="substitution-display">
        <div class="select-date-prompt">
          <p>เลือกวันที่เพื่อดูการสอนแทน</p>
        </div>
      </div>
    </div>
  `;
}

export function renderDatePicker() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const selectedDate = getSelectedDate();

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
        <input type="date" id="custom-date-picker" class="date-input" value="${selectedDate}">
      </div>
    </div>
  `;
}

export function renderAbsentTeacherCards(absences) {
  if (!absences.length) {
    return '<p class="no-absences">ไม่มีครูที่ขาดในวันนี้</p>';
  }

  return absences
    .map(
      (absence) => `
    <div class="absent-card">
      <h4>${absence.teacher_name}</h4>
      <p class="reason">เหตุผล: ${absence.reason || 'ไม่ระบุ'}</p>
      <div class="affected-classes">
        <h6>คาบที่ได้รับผลกระทบ:</h6>
        ${absence.affected_schedules
          .map(
            (schedule) => `
          <div class="schedule-item">
            <span class="period">คาบ ${schedule.period}</span>
            <span class="subject">${schedule.subject_name}</span>
            <span class="class">${schedule.class_name}</span>
            <span class="room">
              ${schedule.room_name}
              ${
                schedule.room_type
                  ? `<span class="badge ${getRoomTypeBadgeClass(schedule.room_type)}">${schedule.room_type}</span>`
                  : ''
              }
            </span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
    )
    .join('');
}

export function renderSubstituteAssignments(assignments) {
  if (!assignments.length) {
    return '<p class="no-assignments">ยังไม่มีการจัดสรรครูสอนแทน</p>';
  }

  return `
    <div class="assignments-grid">
      ${assignments
        .map(
          (assignment) => `
        <div class="assignment-card">
          <div class="assignment-header">
            <strong>คาบที่ ${assignment.period}</strong>
            <span class="badge">${getThaiDayName(assignment.day_of_week)}</span>
          </div>
          <div class="assignment-details">
            <div class="subject">${assignment.subject_name}</div>
            <div class="class">${assignment.class_name}</div>
            <div class="room">
              ${assignment.room_name}
              ${
                assignment.room_type
                  ? `<span class="badge ${getRoomTypeBadgeClass(assignment.room_type)}">${assignment.room_type}</span>`
                  : ''
              }
            </div>
          </div>
          <div class="substitute-teacher">
            <strong>ครูสอนแทน:</strong> ${assignment.substitute_teacher_name}
          </div>
          <div class="periods-count">
            ${assignment.periods_count} คาบ
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderSubstitutionManagement(teachers) {
  const today = new Date().toISOString().slice(0, 10);
  const sortedTeachers = (teachers || []).slice().sort((a, b) =>
    (a.full_name || a.name || '').localeCompare(b.full_name || b.name || '', 'th')
  );

  return `
    <div class="substitute-management-container">
      <h3>🔄 จัดการการสอนแทน</h3>
      <div class="substitute-form">
        <div class="form-group">
          <label for="substitute-date">วันที่:</label>
          <input type="date" id="substitute-date" name="date" value="${today}" required>
        </div>
        <div class="form-group">
          <label>ครูที่ไม่อยู่:</label>
          <div id="absent-teachers-checklist" class="checklist">
            ${sortedTeachers
              .map(
                (teacher) => `
              <label class="checkbox-item">
                <input type="checkbox"
                       class="absent-teacher-checkbox"
                       data-teacher-id="${teacher.id}"
                       data-teacher-name="${teacher.full_name || teacher.name}"
                       value="${teacher.id}">
                <span class="checkbox-label">${teacher.full_name || teacher.name}</span>
              </label>
            `
              )
              .join('')}
          </div>
        </div>
        <div class="substitute-actions">
          <button type="button" class="btn btn--primary" id="btn-find-substitutes">🧮 หาครูสอนแทน</button>
          <button type="button" class="btn btn--success" id="btn-submit-substitutes">💾 Submit การสอนแทน</button>
        </div>
      </div>
      <div id="substitute-recommendations" class="recommendations hidden">
      </div>
    </div>
  `;
}

export function displaySubstituteRecommendations(recommendations) {
  const recommendationsDiv = document.querySelector('#substitute-recommendations');
  if (!recommendationsDiv) return;

  const html = `
    <h4>📋 ผลการค้นหาครูสอนแทน (${recommendations.length} คาบ)</h4>
    <div class="recommendations-list">
      ${recommendations
        .map(
          (rec) => `
        <div class="recommendation-card">
          <div class="recommendation-header">
            <strong>คาบที่ ${rec.schedule.period_no}</strong>
            <span class="badge">ห้อง ${rec.classData?.class_name || '-'}</span>
          </div>
          <div class="recommendation-details">
            <p><strong>วิชา:</strong> ${rec.subject?.subject_name || '-'}</p>
            <p><strong>ครูเดิม:</strong> ${rec.absentTeacher?.full_name || rec.absentTeacher?.name || '-'}</p>
            <p><strong>ห้อง:</strong> ${rec.room?.room_name || '-'}</p>
          </div>
          <div class="recommendation-candidates">
            <label><strong>เลือกครูสอนแทน:</strong></label>
            <select class="substitute-teacher-select" data-schedule-id="${rec.schedule.id}">
              <option value="">-- เลือกครู --</option>
              ${rec.candidates
                .map(
                  (candidate) => `
                <option value="${candidate.teacher.id}">
                  ${candidate.teacher.full_name || candidate.teacher.name}
                  (สอน ${candidate.classesOnDay} คาบในวันนี้)
                </option>
              `
                )
                .join('')}
            </select>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  recommendationsDiv.innerHTML = html;
  recommendationsDiv.classList.remove('hidden');
}

async function renderSemesterAchievements() {
  const stats = calculateSubstituteStats();
  const ranking = generateSubstituteRanking();
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

  if (!achievements.length) {
    return '';
  }

  return `
    <div class="achievements-section">
      ${achievements
        .map(
          (achievement) => `
        <div class="achievement-card ${achievement.type}">
          <h5>${achievement.title}</h5>
          <p>${achievement.description}</p>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}
