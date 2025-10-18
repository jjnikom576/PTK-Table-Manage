import * as dataService from '../../services/dataService.js';
import * as globalContext from '../../context/globalContext.js';
import {
  exportTableToCSV,
  exportTableToXLSX,
  exportTableToGoogleSheets
} from '../../utils/export.js';
import {
  getDisplayPeriodsAsync,
  getLunchSlotAsync,
  isActiveSemester
} from '../../utils.js';
import { pageState } from './state.js';

export function renderExportBar(context) {
  const exportContainer = document.getElementById('student-export-bar');
  if (!exportContainer) return;

  const isHistorical = !isActiveSemester(context.currentSemester);

  exportContainer.innerHTML = `
    <div class="export-bar">
      <h4>📤 Export ตารางเรียน</h4>
      <div class="export-buttons">
        <button class="btn btn--sm btn--export" data-export-type="csv">
          📄 Export CSV
        </button>
        <button class="btn btn--sm btn--export" data-export-type="xlsx">
          📊 Export Excel
        </button>
        ${!isHistorical ? `
          <button class="btn btn--sm btn--export btn--gsheets" data-export-type="gsheets">
            📋 Google Sheets
          </button>
        ` : ''}
      </div>
      <div class="export-status" id="export-status" style="display: none;"></div>
    </div>
  `;
}

export async function exportSchedule(format, className, context) {
  if (!className || !context.currentSemester) {
    throw new Error('ไม่สามารถ Export ได้: ข้อมูลไม่ครบถ้วน');
  }

  try {
    const classId = getClassIdByName(className);
    if (!classId) {
      throw new Error(`ไม่พบห้องเรียน: ${className}`);
    }

    const scheduleData = await dataService.normalizeStudentScheduleForExport({
      classId,
      semesterId: context.currentSemester.id
    });

    if (!scheduleData || scheduleData.length === 0) {
      throw new Error('ไม่มีข้อมูลตารางเรียนสำหรับ Export');
    }

    const filename = generateExportFilename(`ตารางเรียน-${className}`, context);

    switch (format) {
      case 'csv':
        return await exportTableToCSV(scheduleData, filename);
      case 'xlsx':
        return await exportTableToXLSX(scheduleData, filename);
      case 'gsheets':
        return await exportTableToGoogleSheets(scheduleData, filename);
      default:
        throw new Error('รูปแบบ Export ไม่ถูกต้อง');
    }
  } catch (error) {
    console.error('[StudentSchedule] Export failed:', error);
    throw error;
  }
}

export function setupStudentExportHandlers(context) {
  console.log('[StudentSchedule] Setting up export handlers...');

  const exportButtons = document.querySelectorAll(
    '#export-bar-student button[data-export-type]'
  );
  console.log('[StudentSchedule] Found export buttons:', exportButtons.length);

  if (exportButtons.length === 0) {
    console.warn(
      '[StudentSchedule] No export buttons found! Selector: #export-bar-student button[data-export-type]'
    );
    return;
  }

  exportButtons.forEach((button, index) => {
    console.log(
      `[StudentSchedule] Setting up button ${index + 1}:`,
      button.dataset.exportType
    );

    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    newButton.addEventListener('click', async (event) => {
      console.log(
        '[StudentSchedule] Export button clicked:',
        event.target.dataset.exportType
      );
      event.preventDefault();
      event.stopPropagation();
      await handleStudentExport(newButton, context);
    });
  });

  console.log('[StudentSchedule] Export handlers setup completed');
}

function getClassIdByName(className) {
  const cls = pageState.availableClasses.find(
    (item) => item.class_name === className
  );
  return cls?.id || null;
}

function generateExportFilename(baseName, context) {
  const year = context.currentYear || 'unknown';
  const semester = context.currentSemester?.semester_number || 'unknown';
  const date = new Date().toISOString().slice(0, 10);

  return `${baseName}_${year}_ภาค${semester}_${date}`;
}

async function handleStudentExport(button, context) {
  if (button.disabled) return;

  try {
    if (!pageState.selectedClass) {
      throw new Error('กรุณาเลือกห้องเรียนก่อน');
    }

    showExportProgress(button);

    const format = button.dataset.exportType;
    const filename = generateStudentExportFilename(
      pageState.selectedClass,
      context
    );

    switch (format) {
      case 'html':
        await exportStudentScheduleToHTML(
          pageState.selectedClass,
          context,
          filename
        );
        break;
      case 'csv': {
        const csvData = await prepareStudentExportData(
          pageState.selectedClass,
          context
        );
        await exportTableToCSV(csvData, filename);
        break;
      }
      case 'xlsx': {
        const xlsxData = await prepareStudentExportData(
          pageState.selectedClass,
          context
        );
        await exportTableToXLSX(xlsxData, filename);
        break;
      }
      case 'gsheets': {
        const gsheetsData = await prepareStudentExportData(
          pageState.selectedClass,
          context
        );
        await exportTableToGoogleSheets(gsheetsData, filename);
        break;
      }
      default:
        throw new Error('รูปแบบ Export ไม่ถูกต้อง');
    }

    showExportSuccess('Export สำเร็จ!');
  } catch (error) {
    console.error('[StudentSchedule] Export failed:', error);
    showExportError(error.message);
  } finally {
    hideExportProgress(button);
  }
}

async function exportStudentScheduleToHTML(classIdOrName, context, filename) {
  if (!pageState.currentSchedule) {
    throw new Error('ไม่มีข้อมูลตารางเรียน');
  }

  const classInfo = pageState.currentSchedule.classInfo;
  const className = classInfo?.class_name || classIdOrName;

  const year =
    context.currentYear ||
    context.year ||
    globalContext.getContext()?.currentYear ||
    'N/A';
  const semesterName =
    context.currentSemester?.semester_name ||
    context.semester?.semester_name ||
    globalContext.getContext()?.currentSemester?.semester_name ||
    'ไม่ระบุภาคเรียน';

  const scheduleTableHTML = await generateStudentScheduleTableHTML(
    pageState.currentSchedule,
    context
  );
  const legendHTML = generateStudentLegendHTML(pageState.currentSchedule);

  const fullHTML = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ตารางเรียน - ${className}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
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
            --font-weight-semibold: 600;
            --font-weight-medium: 500;
            --font-weight-bold: 700;
            --font-size-xs: 0.75rem;
            --font-size-sm: 0.875rem;
            --font-size-base: 1rem;
            --font-size-lg: 1.125rem;
            --font-size-xl: 1.25rem;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--font-family-primary);
            font-size: var(--font-size-base);
            line-height: 1.6;
            color: var(--color-dark);
            background-color: var(--color-gray-50);
            padding: 2rem;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 0.75rem 1.5rem;
            background-color: var(--color-primary);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-family: var(--font-family-primary);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }
        .print-button:hover {
            background-color: var(--color-primary-dark);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        @media print {
            .print-button {
                display: none;
            }
            body {
                padding: 0;
                background-color: white;
            }
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background-color: white;
            padding: 2rem;
            border-radius: 12px;
        }
        .schedule-header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--color-gray-200);
        }
        .schedule-header h2 {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--color-primary);
            margin-bottom: 0.5rem;
        }
        .schedule-meta {
            font-size: 1rem;
            color: var(--color-dark-lighter);
        }
        .schedule-meta strong {
            color: var(--color-dark);
            font-weight: 600;
        }
        .schedule-table-wrapper {
            overflow-x: auto;
            margin-bottom: 2rem;
        }
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .schedule-table th,
        .schedule-table td {
            border: 1px solid var(--color-gray-300);
            padding: 0.75rem;
            text-align: center;
            vertical-align: middle;
        }
        .schedule-table thead th {
            background-color: var(--color-primary);
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
            padding: 1rem 0.5rem;
        }
        .day-header {
            background-color: var(--color-primary);
            color: white;
            font-weight: 700;
            min-width: 100px;
        }
        .period-header {
            background-color: var(--color-primary);
            color: white;
            min-width: 120px;
        }
        .period-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .period-number {
            font-weight: 700;
            font-size: 1rem;
        }
        .time-slot {
            font-size: 0.75rem;
            opacity: 0.9;
        }
        .lunch-header {
            background-color: #f6ad55 !important;
            color: white;
            font-weight: 700;
        }
        .lunch-info {
            font-size: 0.875rem;
        }
        .day-cell {
            background-color: var(--color-gray-100);
            font-weight: 600;
            color: var(--color-dark);
        }
        .schedule-cell {
            min-height: 80px;
            position: relative;
        }
        .schedule-cell.has-subject {
            background-color: var(--color-primary-light);
        }
        .schedule-cell.empty {
            background-color: white;
            color: var(--color-gray-300);
        }
        .schedule-cell-content {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.875rem;
        }
        .subject-code {
            font-weight: 700;
            color: var(--color-primary-dark);
            font-size: 1rem;
        }
        .teacher-name {
            color: var(--color-dark);
            font-size: 0.85rem;
        }
        .room-info {
            color: var(--color-dark-lighter);
            font-size: 0.75rem;
        }
        .empty-cell {
            color: var(--color-gray-300);
            font-size: 1.1rem;
        }
        .lunch-cell {
            background-color: #fef5e7 !important;
            color: #d68910;
            font-weight: 600;
        }
        .student-legend-card {
            background-color: var(--color-gray-50);
            border-radius: 8px;
            padding: 1.5rem;
            margin-top: 2rem;
        }
        .student-legend-card h4 {
            text-align: center;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--color-primary);
            margin-bottom: 1rem;
        }
        .student-legend-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 0.75rem;
        }
        .student-legend-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem;
            background-color: white;
            border-radius: 4px;
            border-left: 3px solid var(--color-primary);
        }
        .student-legend-item .subject-code {
            font-weight: 700;
            color: var(--color-primary-dark);
            min-width: 60px;
            font-size: 0.85rem;
        }
        .student-legend-item .subject-name {
            color: var(--color-dark);
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ พิมพ์</button>

    <div class="container">
        <div class="schedule-header">
            <h2>ตารางเรียน ${className}</h2>
            <div class="schedule-meta">
                <span><strong>${semesterName}</strong></span>
                <span style="margin-left: 1.5rem;"><strong>ปีการศึกษา ${year}</strong></span>
            </div>
        </div>

        <div class="schedule-section">
            ${scheduleTableHTML}
        </div>

        <div class="legend-section">
            ${legendHTML}
        </div>
    </div>
</body>
</html>`;

  const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function generateStudentScheduleTableHTML(scheduleData, context) {
  const matrix = scheduleData?.matrix;
  if (!matrix) {
    return '<p class="no-schedule">ไม่มีตารางเรียนสำหรับห้องนี้</p>';
  }

  const year = context?.currentYear || context?.year;
  const semesterId =
    context?.currentSemester?.id ||
    context?.semester?.id ||
    context?.semesterId;
  const displayPeriods = await getDisplayPeriodsAsync(year, semesterId);
  const lunchSlot = await getLunchSlotAsync(year, semesterId);
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  let html = '<div class="schedule-table-wrapper">';
  html += '<table class="schedule-table">';
  html += '<thead><tr>';
  html += '<th class="day-header">วัน/เวลา</th>';
  displayPeriods.forEach(({ display, actual, label }) => {
    html += `<th class="period-header"><div class="period-info"><span class="period-number">คาบ ${display}</span><span class="time-slot">${label}</span></div></th>`;
    if (actual === 4) {
      html += `<th class="lunch-header lunch-column"><div class="lunch-info">${lunchSlot.label}<br><small>${lunchSlot.time}</small></div></th>`;
    }
  });
  html += '</tr></thead>';

  html += '<tbody>';
  days.forEach((dayName, dayIndex) => {
    const day = dayIndex + 1;
    html += `<tr class="day-row" data-day="${day}">`;
    html += `<td class="day-cell">${dayName}</td>`;

    displayPeriods.forEach(({ display, actual }) => {
      const period = actual;
      const cell = matrix[day]?.[period];
      if (cell) {
        const subjectCode =
          cell.subject?.subject_code ||
          cell.subject?.subject_name?.substring(0, 6) ||
          '-';
        const teacherName = cell.teacher?.name || '';
        const roomName = cell.room?.name || '';

        html += `<td class="schedule-cell has-subject" data-day="${day}" data-period="${period}" data-display-period="${display}">
          <div class="schedule-cell-content">
            <div class="subject-code">${subjectCode}</div>
            <div class="teacher-name">${teacherName}</div>
            <div class="room-info">${roomName}</div>
          </div>
        </td>`;
      } else {
        html += `<td class="schedule-cell empty" data-day="${day}" data-period="${period}" data-display-period="${display}">
          <div class="empty-cell">-</div>
        </td>`;
      }

      if (period === 4 && dayIndex === 0) {
        html += `<td class="lunch-cell lunch-column" aria-label="${lunchSlot.label} ${lunchSlot.time}" rowspan="${days.length}">${lunchSlot.label}<br><small>${lunchSlot.time}</small></td>`;
      }
    });

    html += '</tr>';
  });
  html += '</tbody>';
  html += '</table></div>';

  return html;
}

function generateStudentLegendHTML(scheduleData) {
  const matrix = scheduleData?.matrix;
  if (!matrix) {
    return '';
  }

  const subjectsMap = new Map();

  Object.values(matrix).forEach((daySchedule) => {
    Object.values(daySchedule).forEach((cell) => {
      if (cell && cell.subject) {
        const subjectCode =
          cell.subject.subject_code ||
          cell.subject.subject_name?.substring(0, 6) ||
          '';
        const subjectName = cell.subject.subject_name || '';

        if (subjectCode && !subjectsMap.has(subjectCode)) {
          subjectsMap.set(subjectCode, {
            code: subjectCode,
            name: subjectName
          });
        }
      }
    });
  });

  const subjects = Array.from(subjectsMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code, 'th')
  );

  if (subjects.length === 0) {
    return '';
  }

  let html = '<div class="student-legend-card">';
  html += '<h4>📚 คำอธิบายรหัสวิชา</h4>';
  html += '<div class="student-legend-grid">';
  subjects.forEach((subject) => {
    html += `
      <div class="student-legend-item">
        <span class="subject-code">${subject.code}</span>
        <span class="subject-name">${subject.name}</span>
      </div>
    `;
  });
  html += '</div>';
  html += '</div>';

  return html;
}

async function prepareStudentExportData(className, context) {
  if (!pageState.currentSchedule) {
    throw new Error('ไม่มีข้อมูลตารางเรียน');
  }

  const year = context?.currentYear || context?.year;
  const semesterId =
    context?.currentSemester?.id ||
    context?.semester?.id ||
    context?.semesterId;
  const displayPeriods = await getDisplayPeriodsAsync(year, semesterId);
  const lunchSlot = await getLunchSlotAsync(year, semesterId);
  const lunchKey = lunchSlot.label || 'พักเที่ยง';
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  const periodHeaders = [];
  displayPeriods.forEach((period) => {
    periodHeaders.push(`คาบ ${period.display}`);
    if (period.display === 4) {
      periodHeaders.push(lunchKey);
    }
  });

  const createEmptyRow = () => {
    const row = { 'วัน/เวลา': '' };
    periodHeaders.forEach((header) => {
      row[header] = '';
    });
    return row;
  };

  const exportData = [];

  const headerRow = createEmptyRow();
  headerRow['คาบ 3'] = `ตารางเรียน - ${className}`;
  exportData.push(headerRow);

  const semesterRow = createEmptyRow();
  semesterRow['คาบ 3'] = `ภาคเรียนที่ ${
    context.currentSemester?.semester_number || 1
  } ปีการศึกษา ${context.currentYear}`;
  exportData.push(semesterRow);

  exportData.push(createEmptyRow());

  days.forEach((dayName, dayIndex) => {
    const rowData = createEmptyRow();
    const dayNumber = dayIndex + 1;
    rowData['วัน/เวลา'] = dayName;

    displayPeriods.forEach(({ display, actual }) => {
      const key = `คาบ ${display}`;
      const cellData = pageState.currentSchedule.matrix[dayNumber]?.[actual];

      if (cellData) {
        const subjectCode =
          cellData.subject.subject_code ||
          cellData.subject.subject_name?.substring(0, 6) ||
          '-';
        const roomName = cellData.room.name || '';
        rowData[key] = `${subjectCode}\n${cellData.teacher.name}\n${roomName}`;
      } else {
        rowData[key] = '-';
      }

      if (actual === 4 && lunchKey in rowData) {
        rowData[lunchKey] = '';
      }
    });

    exportData.push(rowData);
  });

  exportData.push(createEmptyRow());

  const subjectsMap = new Map();
  Object.values(pageState.currentSchedule.matrix).forEach((daySchedule) => {
    Object.values(daySchedule).forEach((cell) => {
      if (cell && cell.subject) {
        const subjectCode =
          cell.subject.subject_code ||
          cell.subject.subject_name?.substring(0, 6) ||
          '';
        const subjectName = cell.subject.subject_name || '';

        if (subjectCode && !subjectsMap.has(subjectCode)) {
          subjectsMap.set(subjectCode, {
            code: subjectCode,
            name: subjectName
          });
        }
      }
    });
  });

  const subjects = Array.from(subjectsMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code, 'th')
  );

  if (subjects.length > 0) {
    const legendHeaderRow = createEmptyRow();
    legendHeaderRow['คาบ 3'] = '📚 คำอธิบายรหัสวิชา';
    exportData.push(legendHeaderRow);

    subjects.forEach((subject) => {
      const subjectRow = createEmptyRow();
      subjectRow['คาบ 1'] = subject.code;
      subjectRow['คาบ 2'] = subject.name;
      exportData.push(subjectRow);
    });
  }

  return exportData;
}

function generateStudentExportFilename(className, context) {
  const year = context.currentYear || 'unknown';
  const semester = context.currentSemester?.semester_number || 'unknown';
  const date = new Date().toISOString().slice(0, 10);

  return `ตารางเรียน-${className}_${year}_ภาค${semester}_${date}`;
}

function showExportProgress(button) {
  button.disabled = true;
  const originalText = button.dataset.originalText || button.textContent;
  button.dataset.originalText = originalText;
  button.textContent = 'กำลัง Export...';
  button.classList.add('is-loading');

  const statusElement = document.getElementById('export-status');
  if (statusElement) {
    statusElement.className = 'export-status';
    statusElement.textContent = 'กำลังสร้างไฟล์...';
    statusElement.style.display = 'block';
  }
}

function hideExportProgress(button) {
  button.disabled = false;
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
  button.classList.remove('is-loading');
}

function showExportSuccess(message) {
  const statusElement = document.getElementById('export-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = 'export-status export-status--success';
    statusElement.style.display = 'block';

    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

function showExportError(message) {
  const statusElement = document.getElementById('export-status');
  if (statusElement) {
    statusElement.textContent = message || 'Export ล้มเหลว กรุณาลองใหม่';
    statusElement.className = 'export-status export-status--error';
    statusElement.style.display = 'block';

    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 5000);
  }
}

export {
  prepareStudentExportData,
  generateStudentExportFilename,
  showExportProgress,
  hideExportProgress,
  showExportSuccess,
  showExportError
};
