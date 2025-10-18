import * as globalContext from '../../context/globalContext.js';
import {
  exportTableToCSV,
  exportTableToXLSX,
  exportTableToGoogleSheets
} from '../../utils/export.js';
import {
  buildPeriodDisplaySequence,
  ensurePeriodsList,
  formatPeriodTimeRange
} from '../../utils.js';
import { pageState, showExportProgress, hideExportProgress, showExportSuccess, showExportError } from './state.js';
import {
  getTeacherScheduleData
} from './data.js';
import {
  getTeacherNameForExport,
  getTeacherPrefixForExport,
  generateWorkloadHTML
} from './helpers.js';

export function setupExportHandlers(teacherId, context) {
  const exportButtons = document.querySelectorAll('#export-bar-teacher button[data-export-type]');

  exportButtons.forEach((button) => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    newButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleExport(newButton, teacherId, context);
    });
  });

  console.log('[TeacherSchedule] Export handlers setup for teacher:', teacherId, 'buttons found:', exportButtons.length);
}

async function handleExport(button, teacherId, context) {
  if (button.disabled) {
    return;
  }

  try {
    if (!teacherId || !pageState.selectedTeacher) {
      throw new Error('กรุณาเลือกรายชื่อครูก่อน');
    }

    showExportProgress(button);

    const format = button.dataset.exportType;
    const exportData = await prepareTeacherExportData(teacherId, context);
    const teacher = pageState.teachers.find((item) => item.id === teacherId);
    const filename = generateExportFilename(
      `ตารางสอน-${teacher?.full_name || teacher?.name || 'teacher'}`,
      context
    );

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

export async function prepareTeacherExportData(teacherId, context) {
  const scheduleData = await getTeacherScheduleData(teacherId, context);
  const teacher = pageState.teachers.find((item) => item.id === teacherId);

  const periodSequence = scheduleData.periodSequence || [];
  const rawPeriods = scheduleData.periods || [];

  const teachingEntries = periodSequence.filter((entry) => entry.type === 'teaching');
  let periods = teachingEntries.map((entry) => entry.period);

  if (periods.length === 0 && rawPeriods.length > 0) {
    periods = rawPeriods.filter((period) => period.period_name !== 'พักกลางวัน');
  }

  const timeSlots = periods.map((period) => `${period.start_time || ''}-${period.end_time || ''}`);
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  console.log('[Export] Debug:', {
    periodSequenceCount: periodSequence.length,
    teachingPeriodsCount: periods.length,
    rawPeriodsCount: rawPeriods.length,
    timeSlots,
    firstPeriod: periods[0],
    matrixSample: scheduleData.matrix?.[1]?.[1] || 'No matrix data'
  });

  const exportData = [];
  const createEmptyRow = () => {
    const row = { 'วัน/เวลา': '' };
    periods.forEach((_, index) => {
      row[`คาบ ${index + 1}`] = '';
    });
    return row;
  };

  const titleRow = createEmptyRow();
  const midCol = Math.ceil(periods.length / 2);
  titleRow[`คาบ ${midCol}`] = `ตารางสอน - ${teacher?.full_name || teacher?.name || ''}`;
  exportData.push(titleRow);

  const groupRow = createEmptyRow();
  groupRow[`คาบ ${midCol}`] = `กลุ่มสาระ: ${teacher?.subject_group || ''}`;
  exportData.push(groupRow);

  if (teacher?.phone) {
    const phoneRow = createEmptyRow();
    phoneRow[`คาบ ${midCol}`] = `📞 ${teacher.phone}`;
    exportData.push(phoneRow);
  }

  if (teacher?.email) {
    const emailRow = createEmptyRow();
    emailRow[`คาบ ${midCol}`] = `📧 ${teacher.email}`;
    exportData.push(emailRow);
  }

  const semesterRow = createEmptyRow();
  semesterRow[`คาบ ${midCol}`] = `ภาคเรียน: ภาคเรียนที่ ${context.currentSemester?.selected || 1} ปีการศึกษา ${context.currentYear}`;
  exportData.push(semesterRow);

  exportData.push(createEmptyRow());

  const headerRow = { 'วัน/เวลา': 'วัน/เวลา' };
  periods.forEach((period, index) => {
    headerRow[`คาบ ${index + 1}`] = `คาบ ${index + 1}\n${timeSlots[index] || ''}`;
  });
  exportData.push(headerRow);

  days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const rowData = { 'วัน/เวลา': day };

    periods.forEach((period, periodIndex) => {
      const periodNo = period.period_no;
      const displayColumn = periodIndex + 1;
      const cellDataArray = scheduleData.matrix[dayNumber]?.[periodNo];

      if (cellDataArray && Array.isArray(cellDataArray) && cellDataArray.length > 0) {
        const cellTexts = cellDataArray.map((cellData) => {
          const subjectCode =
            cellData.subject?.subject_code ||
            cellData.subject?.subject_name?.substring(0, 6) ||
            '';
          const className = cellData.class?.class_name || cellData.class?.name || '';
          const roomName = String(cellData.room?.name || cellData.room?.room_name || '').replace(/^ห้อง\s*/i, '');
          return `${subjectCode}\n${className}\n${roomName}`;
        });
        rowData[`คาบ ${displayColumn}`] = cellTexts.join('\n---\n');
      } else {
        rowData[`คาบ ${displayColumn}`] = '-';
      }
    });

    exportData.push(rowData);
  });

  exportData.push(createEmptyRow());

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
  workloadHeaderRow[`คาบ ${midCol}`] = '📘 ภาระงานรวม';
  exportData.push(workloadHeaderRow);

  subjectSummary.forEach((item) => {
    const subjectCode = item.subject.subject_code || item.subject.subject_name.substring(0, 6);
    const workloadRow = createEmptyRow();
    workloadRow['วัน/เวลา'] = `${subjectCode} ${item.subject.subject_name}`;

    const classCol = Math.min(4, periods.length);
    const periodsCol = Math.min(6, periods.length);

    if (periods.length >= classCol) {
      workloadRow[`คาบ ${classCol}`] = item.classNames;
    }
    if (periods.length >= periodsCol) {
      workloadRow[`คาบ ${periodsCol}`] = `${item.periods} คาบ`;
    }

    exportData.push(workloadRow);
  });

  const totalRow = createEmptyRow();
  totalRow[`คาบ ${midCol}`] = `รวม ${scheduleData.totalPeriods} คาบ/สัปดาห์`;
  exportData.push(totalRow);

  exportData.push(createEmptyRow());

  return exportData;
}

async function exportTableToHTML(teacherId, context, filename) {
  try {
    console.log('[Export HTML] Preparing HTML export...');
    const scheduleData = await getTeacherScheduleData(teacherId, context);
    const teacher = pageState.teachers.find((item) => item.id === teacherId);
    const teacherName = getTeacherNameForExport(teacher);
    const teacherPrefix = getTeacherPrefixForExport(teacher);
    const workloadHTML = generateWorkloadHTML(scheduleData);

    const year = context.currentYear || 'ไม่ระบุ';
    const semesterName =
      context.currentSemester?.semester_name ||
      globalContext.getContext()?.currentSemester?.semester_name ||
      'ไม่ระบุภาคเรียน';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>ตารางสอน ${teacherPrefix}${teacherName}</title>
          <style>
            body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; margin: 32px; color: #222; }
            h1, h2, h3, h4 { margin: 0 0 12px 0; }
            .meta { margin-bottom: 24px; font-size: 1rem; color: #444; }
            .meta span { display: inline-block; margin-right: 16px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #1a73e8; color: #fff; font-size: 0.95rem; }
            .schedule-table, .workload-summary-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .schedule-table th, .schedule-table td,
            .workload-summary-table th, .workload-summary-table td { border: 1px solid #ccc; padding: 10px; text-align: center; vertical-align: middle; }
            .schedule-table thead { background: #f2f6ff; }
            .day-cell { font-weight: 600; background: #f9f9f9; }
            .subject-code { font-weight: 600; display: block; }
            .empty-cell { color: #bbb; }
            .workload-summary-table thead { background: #f7f7f7; }
            .workload-summary-table td { text-align: left; }
          </style>
        </head>
        <body>
          <header>
            <h1>ตารางสอน ${teacherPrefix}${teacherName}</h1>
            <div class="meta">
              <span>กลุ่มสาระ: ${teacher?.subject_group || '-'}</span>
              <span>ภาคเรียน: ${semesterName}</span>
              <span>ปีการศึกษา: ${year}</span>
            </div>
          </header>
          <section>
            ${renderTeacherScheduleTableHTML(scheduleData)}
          </section>
          <section>
            <h2>สรุปภาระงาน</h2>
            ${workloadHTML}
          </section>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    console.log('[Export] HTML export completed:', filename);
  } catch (error) {
    console.error('[Export] HTML export failed:', error);
    showExportError(`Export HTML ล้มเหลว: ${error.message}`);
  }
}

function renderTeacherScheduleTableHTML(scheduleData) {
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
  const periods = scheduleData.teachingPeriods || [];
  const periodSequence = scheduleData.periodSequence || buildPeriodDisplaySequence(ensurePeriodsList(scheduleData.periods || []));
  const teachingPeriods = periodSequence.filter((entry) => entry.type === 'teaching');

  const headerCells = teachingPeriods
    .map((entry, index) => {
      const timeRange = formatPeriodTimeRange(entry.period) || '';
      return `<th>คาบ ${index + 1}<br>${timeRange}</th>`;
    })
    .join('');

  const rows = days
    .map((dayLabel, dayIndex) => {
      const dayNumber = dayIndex + 1;
      const cells = teachingPeriods
        .map((entry) => {
          const periodNo = entry.period.period_no;
          const cellDataArray = scheduleData.matrix?.[dayNumber]?.[periodNo];
          if (!cellDataArray || !cellDataArray.length) {
            return '<td class="empty-cell">-</td>';
          }
          const subjectCodes = Array.from(new Set(cellDataArray.map((item) => item.subject?.subject_code).filter(Boolean)));
          const classNames = Array.from(new Set(cellDataArray.map((item) => item.class?.class_name || item.class?.name).filter(Boolean)));
          const roomNames = Array.from(new Set(cellDataArray.map((item) => item.room?.room_name || item.room?.name).filter(Boolean)));
          return `<td>
              <strong class="subject-code">${subjectCodes.join('<br>') || '-'}</strong>
              <div>${classNames.join('<br>')}</div>
              <div>${roomNames.join('<br>')}</div>
            </td>`;
        })
        .join('');
      return `<tr><td class="day-cell">${dayLabel}</td>${cells}</tr>`;
    })
    .join('');

  return `
    <table class="schedule-table">
      <thead>
        <tr>
          <th>วัน/เวลา</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function generateExportFilename(baseName, context) {
  const year = context.currentYear || 'unknown';
  const semester = context.currentSemester?.semester_number || 'unknown';
  const date = new Date().toISOString().slice(0, 10);

  return `${baseName}_${year}_ภาค${semester}_${date}`;
}
