import * as globalContext from '../../context/globalContext.js';
import {
  generateTimeSlots,
  formatPeriodTimeRange,
  ensurePeriodsList,
  extractTeachingPeriods,
  buildPeriodDisplaySequence
} from '../../utils.js';
import { pageState, setLoading, showError } from './state.js';
import { getTeacherScheduleData, buildTeacherScheduleMatrixDynamic } from './data.js';
import {
  getTeacherName,
  scrollElementToViewportTop
} from './helpers.js';

export async function renderWorkloadSummary(context) {
  console.log('[TeacherSchedule] renderWorkloadSummary called', pageState.workloadSummary);

  const summaryContainer = document.getElementById('workload-summary');
  console.log('[TeacherSchedule] workload-summary element:', summaryContainer);

  if (!summaryContainer || !pageState.workloadSummary) {
    console.warn('[TeacherSchedule] Missing container or data');
    return;
  }

  const { subjectGroups, teacherWorkloads } = pageState.workloadSummary;

  const subjectGroupContainer = document.getElementById('subject-group-stats');
  console.log('[TeacherSchedule] subject-group-stats element:', subjectGroupContainer);

  if (subjectGroupContainer) {
    const html = subjectGroups
      .map(
        (group) => `
      <div class="stat-card">
        <div class="stat-title">${group.name}</div>
        <div class="stat-number">${group.totalPeriods}</div>
        <div class="stat-subtitle">${group.teachers} คน</div>
      </div>
    `
      )
      .join('');

    console.log('[TeacherSchedule] Subject groups HTML:', html);
    subjectGroupContainer.innerHTML = html;
  }

  const teacherRankingContainer = document.getElementById('teacher-ranking');
  console.log('[TeacherSchedule] teacher-ranking element:', teacherRankingContainer);

  if (teacherRankingContainer) {
    const html = teacherWorkloads
      .map((item, index) => {
        const rank = `#${index + 1}`;
        const group = item.teacher.subject_group || '';
        const name = getTeacherName(item.teacher);
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
      })
      .join('');

    console.log('[TeacherSchedule] Teacher ranking HTML:', html);
    teacherRankingContainer.innerHTML = html;
  }

  console.log('[TeacherSchedule] renderWorkloadSummary completed');
}

export async function renderTeacherTabs(context) {
  const tabsContainer = document.getElementById('teacher-tabs');
  if (!tabsContainer || !pageState.teachers.length) return;

  const groups = pageState.teachers.reduce((acc, teacher) => {
    const key = teacher.subject_group || 'อื่นๆ';
    if (!acc[key]) acc[key] = [];
    acc[key].push(teacher);
    return acc;
  }, {});
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'th'));

  const filterBar = `
    <div id="teacher-group-filter" class="group-filter" role="tablist" aria-label="ตัวกรองกลุ่มสาระ">
      <button class="group-chip ${pageState.selectedGroup === 'ALL' ? 'active' : ''}" data-group="ALL">ทั้งหมด</button>
      ${groupNames
        .map(
          (group) => `
        <button class="group-chip ${pageState.selectedGroup === group ? 'active' : ''}" data-group="${group}">${group}</button>
      `
        )
        .join('')}
    </div>
  `;

  const selected = pageState.selectedGroup || 'ALL';
  const visibleGroups = selected === 'ALL' ? groupNames : groupNames.filter((group) => group === selected);
  const singleClass = visibleGroups.length === 1 ? ' single' : '';
  const groupsHTML = `
    <div class="teacher-groups${singleClass}">
      ${visibleGroups
        .map((group) => {
          const list = groups[group]
            .slice()
            .sort((a, b) => getTeacherName(a).localeCompare(getTeacherName(b), 'th'))
            .map(
              (teacher) => `
            <button class="teacher-tab" data-teacher-id="${teacher.id}" role="tab" aria-selected="false">
              <span class="teacher-tab__name">${getTeacherName(teacher)}</span>
            </button>
          `
            )
            .join('');
          return `
          <div class="group-section">
            <div class="group-title">${group}</div>
            <div class="group-list" role="tablist" aria-label="${group}">
              ${list}
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;

  tabsContainer.innerHTML = filterBar + groupsHTML;
}

export async function renderTeacherSchedule(teacherId, context) {
  const teacher = pageState.teachers.find((item) => item.id === teacherId);
  if (!teacher) return;

  try {
    setLoading(true);

    const scheduleData = await getTeacherScheduleData(teacherId, context);

    renderTeacherInfoSection(teacher, scheduleData, context);
    renderScheduleTableSection(scheduleData, teacher, context);
    renderWorkloadDetailsSection(scheduleData, teacher);

    document.getElementById('export-bar-teacher')?.classList.remove('hidden');
    document.getElementById('teacher-schedule-content')?.classList.remove('hidden');
    document.getElementById('teacher-info')?.classList.remove('hidden');
    document.getElementById('teacher-schedule-table')?.classList.remove('hidden');
    document.getElementById('teacher-workload')?.classList.remove('hidden');
    document.getElementById('teacher-details-empty')?.style.setProperty('display', 'none');

    const infoHeadingEl =
      document.querySelector('#teacher-info .teacher-info-card h4') ||
      document.getElementById('teacher-info') ||
      document.getElementById('teacher-schedule-table');
    if (infoHeadingEl) {
      scrollElementToViewportTop(infoHeadingEl, 72);
    }
  } catch (error) {
    console.error('[TeacherSchedule] Failed to render teacher schedule:', error);
    showError(`โหลดตารางสอน ${teacher.full_name || teacher.name} ไม่สำเร็จ: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

function renderTeacherInfoSection(teacher, scheduleData, context) {
  const infoContainer = document.getElementById('teacher-info');
  if (!infoContainer) return;

  const semesterName =
    context.currentSemester?.semester_name ||
    context.semester?.semester_name ||
    globalContext.getContext()?.currentSemester?.semester_name ||
    'ไม่พบภาคเรียน';

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
          <span class="label">📞 โทรศัพท์:</span>
          <span class="value">${phone}</span>
        </div>
        <div class="detail-item">
          <span class="value">${semesterName} ปีการศึกษา ${context.currentYear}</span>
        </div>
      </div>
    </div>
  `;
}

function renderScheduleTableSection(scheduleData, teacher, context) {
  const tableContainer = document.getElementById('teacher-schedule-table');
  if (!tableContainer) return;

  const allTimeSlots = generateTimeSlots();
  const timeSlots = [
    allTimeSlots[0],
    allTimeSlots[1],
    allTimeSlots[2],
    allTimeSlots[3],
    allTimeSlots[5],
    allTimeSlots[6],
    allTimeSlots[7]
  ];
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  let tableHTML = `
    <div class="schedule-table-wrapper">
      <table class="schedule-table teacher-schedule">
        <thead>
          <tr>
            <th class="day-header">วัน/เวลา</th>
            ${timeSlots
              .map(
                (slot, index) => `
              <th class="period-header">
                <div class="period-info">
                  <span class="period-number">คาบ ${index + 1}</span>
                  <span class="time-slot">${slot}</span>
                </div>
              </th>`
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
  `;

  days.forEach((dayLabel, dayIndex) => {
    const day = dayIndex + 1;
    tableHTML += `
      <tr class="day-row" data-day="${day}">
        <td class="day-cell">${dayLabel}</td>
    `;

    timeSlots.forEach((slot, slotIndex) => {
      const period = slotIndex + 1;
      const cell = scheduleData.matrix?.[day]?.[period];

      if (Array.isArray(cell) && cell.length > 0) {
        const subjectCodes = Array.from(new Set(cell.map((item) => item.subject?.subject_code).filter(Boolean)));
        const classNames = Array.from(new Set(cell.map((item) => item.class?.class_name || item.class?.name).filter(Boolean)));
        const roomNames = Array.from(new Set(cell.map((item) => item.room?.name || item.room?.room_name).filter(Boolean)));

        tableHTML += `
          <td class="schedule-cell has-subject" data-day="${day}" data-period="${period}">
            <div class="schedule-cell-content">
              <div class="subject-code">${subjectCodes.join('<br>')}</div>
              <div class="class-name">${classNames.join('<br>')}</div>
              <div class="room-info">
                ${roomNames.join('<br>')}
              </div>
            </div>
          </td>
        `;
      } else {
        tableHTML += `
          <td class="schedule-cell empty" data-day="${day}" data-period="${period}">
            <div class="empty-cell">-</div>
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

function renderWorkloadDetailsSection(scheduleData, teacher) {
  const workloadContainer = document.getElementById('teacher-workload');
  if (!workloadContainer) return;

  const groupedMap = new Map();

  scheduleData.subjects.forEach((subject) => {
    const subjectSchedules = scheduleData.schedules.filter((schedule) => schedule.subject_id === subject.id);
    const classInfo = scheduleData.classes.find((cls) => cls.id === subject.class_id);

    const subjectCode = subject.subject_code || '';
    const subjectName = subject.subject_name || '';
    const groupKey = `${subjectCode}|${subjectName}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        subject,
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

  const subjectSummary = Array.from(groupedMap.values())
    .map((group) => {
      const sortedClassNames = group.classes
        .map((cls) => cls.class_name || cls.name || 'ไม่ระบุห้อง')
        .sort((a, b) => a.localeCompare(b, 'th'));

      return {
        subject: group.subject,
        classNames: sortedClassNames.join('<br>'),
        periods: group.totalPeriods
      };
    })
    .sort((a, b) => {
      const codeCompare = (a.subject.subject_code || '').localeCompare(b.subject.subject_code || '', 'th');
      if (codeCompare !== 0) return codeCompare;
      return (a.subject.subject_name || '').localeCompare(b.subject.subject_name || '', 'th');
    });

  workloadContainer.innerHTML = `
    <div class="workload-summary-card">
      <h4 style="text-align: center !important;">📘 ภาระงานรวม</h4>
      <div class="subjects-list">
        ${subjectSummary
          .map((item) => {
            const subjectCode = item.subject.subject_code || item.subject.subject_name.substring(0, 6);
            return `
          <div class="subject-workload-item">
            <span class="subject-code">${subjectCode}</span>
            <span class="subject-name">${item.subject.subject_name}</span>
            <span class="class-names">${item.classNames}</span>
            <span class="periods-count">${item.periods} คาบ</span>
          </div>
        `;
          })
          .join('')}
      </div>
      <div class="total-workload" style="text-align: center !important;">
        <strong>รวม ${scheduleData.totalPeriods} คาบ/สัปดาห์</strong>
      </div>
    </div>
  `;
}

function renderTeacherInfo(teacher, scheduleData) {
  const infoContainer = document.getElementById('teacher-info');
  if (!infoContainer) return;

  infoContainer.innerHTML = `
    <div class="teacher-profile">
      <h3>${teacher.full_name || teacher.name}</h3>
      <div class="teacher-details">
        <span class="badge badge--${(teacher.subject_group || '').toLowerCase()}">${teacher.subject_group}</span>
        <span class="teacher-role">${teacher.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครู'}</span>
      </div>
      <div class="contact-info">
        ${teacher.email ? `<div>📧 ${teacher.email}</div>` : ''}
        ${teacher.phone ? `<div>📞 ${teacher.phone}</div>` : ''}
      </div>
    </div>
  `;
}

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
            ${timeSlots
              .map(
                (slot, index) => `
            <th class="period-header"><span class="period-number">คาบ ${index + 1}</span><span class="time-slot">${slot}</span></th>`
              )
              .join('')}
          </tr>
          <tr class="lunch-row"><th colspan="${1 + timeSlots.length}">พักกลางวัน 12:00 น. - 13:00 น.</th></tr>
        </thead>
        <tbody>
  `;

  days.forEach((dayLabel, dayIndex) => {
    const dayNumber = dayIndex + 1;

    tableHTML += `
      <tr class="day-row" data-day="${dayNumber}">
        <td class="day-cell">
          <div class="day-name">${dayLabel}</div>
        </td>
    `;

    timeSlots.forEach((slot, periodIndex) => {
      const period = periodIndex + 1;
      const cell = scheduleData.matrix[dayNumber]?.[period];

      if (cell) {
        tableHTML += `
          <td class="schedule-cell has-subject" data-day="${dayNumber}" data-period="${period}">
            <div class="subject-info">
              <div class="subject-name">${cell.subject.subject_name}</div>
              <div class="class-name">${cell.class.class_name}</div>
              <div class="room-name">
                ${String(cell.room.name || '').replace(/^ห้อง\s*/, '')}
                ${
                  cell.room.room_type
                    ? `<span class="room-type ${cell.room.room_type.toLowerCase()}">${cell.room.room_type}</span>`
                    : ''
                }
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

function renderWorkloadDetails(scheduleData, teacher) {
  const workloadContainer = document.getElementById('teacher-workload');
  if (!workloadContainer) return;

  const subjectSummary = scheduleData.subjects.map((subject) => {
    const subjectSchedules = scheduleData.schedules.filter((schedule) => schedule.subject_id === subject.id);
    const classInfo = scheduleData.classes.find((cls) => cls.id === subject.class_id);

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
          <span class="stat-label">รวมคาบเรียน:</span>
          <span class="stat-value">${scheduleData.totalPeriods} คาบ</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">จำนวนวิชา:</span>
          <span class="stat-value">${scheduleData.subjects.length} วิชา</span>
        </div>
      </div>
      
      <div class="subjects-detail">
        <h5>รายวิชาที่รับผิดชอบ</h5>
        ${subjectSummary
          .map(
            (item) => `
          <div class="subject-item">
            <div class="subject-info">
              <span class="subject-name">${item.subject.subject_name}</span>
              <span class="subject-code">${item.subject.subject_code || ''}</span>
            </div>
            <div class="class-info">${item.class?.class_name || 'ไม่ระบุห้อง'}</div>
            <div class="period-count">${item.periods} คาบ</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

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

export function renderDynamicTeacherScheduleTable(scheduleData, teacher) {
  const periods = ensurePeriodsList(scheduleData.periods || []);
  const periodSequence = scheduleData.periodSequence || buildPeriodDisplaySequence(periods);
  const teachingPeriods = scheduleData.teachingPeriods || extractTeachingPeriods(periods);
  const teachingPeriodNumbers = scheduleData.teachingPeriodNumbers || teachingPeriods.map((period) => period.period_no);
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

  const headerCells = periodSequence
    .map((entry) => {
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
    })
    .join('');

  const rows = days
    .map((day, dayIndex) => {
      let rowHTML = `<tr class="day-row" data-day="${day.number}">
      <td class="day-cell">
        <div class="day-name">${day.label}</div>
      </td>`;

      periodSequence.forEach((entry) => {
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
        const cellArray = Array.isArray(cellArrayRaw) ? cellArrayRaw : cellArrayRaw ? [cellArrayRaw] : [];

        if (cellArray.length === 0) {
          rowHTML += `<td class="schedule-cell empty" data-day="${day.number}" data-period="${periodNo}">
            <div class="empty-cell">-</div>
          </td>`;
          return;
        }

        const subjectCodes = Array.from(new Set(cellArray.map((item) => item.subject?.subject_code).filter(Boolean)));
        const classNames = Array.from(new Set(cellArray.map((item) => item.class?.class_name || item.class?.name).filter(Boolean)));
        const roomNames = Array.from(new Set(cellArray.map((item) => item.room?.room_name || item.room?.name).filter(Boolean)));

        rowHTML += `<td class="schedule-cell has-subject" data-day="${day.number}" data-period="${periodNo}">
          <div class="schedule-cell-content">
            <div class="subject-code">${subjectCodes.join('<br>')}</div>
            <div class="class-name">${classNames.join('<br>')}</div>
            <div class="room-info">${roomNames.join('<br>')}</div>
          </div>
        </td>`;
      });

      rowHTML += '</tr>';
      return rowHTML;
    })
    .join('');

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
