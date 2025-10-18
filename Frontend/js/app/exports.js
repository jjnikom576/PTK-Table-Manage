import { getContext } from '../context/globalContext.js';
import {
  exportTableToCSV,
  exportTableToXLSX,
  exportTableToGoogleSheets,
  generateExportFilename
} from '../utils/export.js';

export async function setupExportHandlers() {
  console.log('📄 Setting up export handlers...');
  console.log('✅ Export handlers setup completed');
}

export async function handleExportClick(app, exportType, target, button) {
  try {
    app.showExportProgress(button);

    const context = getContext();
    let exportData;

    switch (target) {
      case 'student':
        exportData = await app.getStudentExportData('default', context);
        break;
      case 'teacher': {
        const selectedTeacher = app.getActiveTeacherId();
        if (!selectedTeacher) {
          throw new Error('โปรดเลือกครู');
        }
        exportData = await app.getTeacherExportData(selectedTeacher, context);
        break;
      }
      case 'substitution': {
        const selectedDate = app.getSelectedDate();
        if (!selectedDate) {
          throw new Error('โปรดเลือกวันที่');
        }
        exportData = await app.getSubstitutionExportData(selectedDate, context);
        break;
      }
      default:
        throw new Error('ไม่รองรับรูปแบบ export นี้');
    }

    const filename = generateExportFilename(`${target}-export`, context);

    switch (exportType) {
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
        throw new Error('ไม่รองรับประเภท export นี้');
    }

    app.showNotification('Export สำเร็จ!', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    app.showNotification('Export ล้มเหลว: ' + error.message, 'error');
  } finally {
    app.hideExportProgress(button);
  }
}

export function showNotification(_app, message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('notification--show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('notification--show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

export function showExportProgress(_app, button) {
  if (!button) return;
  button.disabled = true;
  button.textContent = 'กำลัง Export...';
  button.classList.add('loading');
}

export function hideExportProgress(_app, button) {
  if (!button) return;
  button.disabled = false;
  button.classList.remove('loading');
}

export function getActiveTeacherId() {
  const activeTab = document.querySelector('.teacher-tab.active');
  return activeTab ? parseInt(activeTab.dataset.teacherId, 10) : null;
}

export function getSelectedDate() {
  const datePicker = document.querySelector('#date-picker');
  return datePicker ? datePicker.value : new Date().toISOString().slice(0, 10);
}

export async function getStudentExportData(_app, _className, _context) {
  return [
    {
      วัน: 'วันจันทร์',
      เวลา: '08:20-09:10',
      คาบ: 1,
      วิชา: 'คณิตศาสตร์',
      ครู: 'ครูทดสอบ',
      ห้อง: '401'
    }
  ];
}

export async function getTeacherExportData(_app, _teacherId, _context) {
  return [
    {
      วัน: 'วันจันทร์',
      เวลา: '08:20-09:10',
      วิชา: 'คณิตศาสตร์',
      ห้องเรียน: 'ม.1/1'
    }
  ];
}

export async function getSubstitutionExportData(_app, date, _context) {
  return [
    {
      วันที่: date,
      ครูที่ขาด: 'ครูสมหญิง',
      ผู้สอนแทน: 'ครูสมชาย'
    }
  ];
}
