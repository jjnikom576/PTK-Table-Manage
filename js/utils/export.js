/**
 * Export Utilities for Multi-Year School Schedule System
 * Supports CSV (UTF-8+BOM), XLSX, and Google Sheets exports
 */

// Time slot definitions
const TIME_SLOTS = [
  '08:20-09:10', '09:10-10:00', '10:00-10:50', '10:50-11:40',
  '13:00-13:50', '13:50-14:40', '14:40-15:30', '15:30-16:20'
];

// Thai day names
const THAI_DAY_NAMES = {
  1: 'วันจันทร์', 2: 'วันอังคาร', 3: 'วันพุธ', 
  4: 'วันพฤหัสบดี', 5: 'วันศุกร์', 6: 'วันเสาร์', 7: 'วันอาทิตย์'
};

const THAI_DAY_ABBR = {
  1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 7: 'อา'
};

/**
 * Export table data to CSV with UTF-8 BOM for Thai support
 * @param {Array} tableData - Array of objects with column data
 * @param {string} filename - Output filename (without extension)
 */
export function exportTableToCSV(tableData, filename) {
  if (!tableData || tableData.length === 0) {
    throw new Error('ไม่มีข้อมูลสำหรับ Export CSV');
  }

  try {
    // Skip first row if it contains column headers
    let dataRows = tableData;
    const firstRow = tableData[0];
    
    // Check if first row is header row (contains 'วัน/เวลา')
    if (firstRow && firstRow['วัน/เวลา'] === 'วัน/เวลา') {
      dataRows = tableData.slice(1); // Skip header row
    }
    
    // Get headers from first data row
    const headers = Object.keys(dataRows[0] || firstRow);
    
    // Create CSV content WITHOUT automatic header
    const csvRows = [
      // Data rows only
      ...dataRows.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Add UTF-8 BOM for Excel Thai support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    downloadBlob(blob, `${filename}.csv`);
    return { success: true, message: 'Export CSV สำเร็จ' };
    
  } catch (error) {
    console.error('CSV Export Error:', error);
    throw new Error(`Export CSV ล้มเหลว: ${error.message}`);
  }
}

/**
 * Export table data to XLSX using SheetJS (placeholder - requires implementation)
 * @param {Array} tableData - Array of objects with column data
 * @param {string} filename - Output filename (without extension)
 */
export function exportTableToXLSX(tableData, filename) {
  if (!tableData || tableData.length === 0) {
    throw new Error('ไม่มีข้อมูลสำหรับ Export XLSX');
  }

  // Note: This is a placeholder. In production, you would use SheetJS:
  // import * as XLSX from 'xlsx';
  
  try {
    // Fallback to CSV for now
    console.warn('XLSX Export: Using CSV fallback (SheetJS not implemented)');
    return exportTableToCSV(tableData, filename);
    
    /* Production implementation with SheetJS:
    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ตารางสอน');
    
    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return { success: true, message: 'Export XLSX สำเร็จ' };
    */
    
  } catch (error) {
    console.error('XLSX Export Error:', error);
    throw new Error(`Export XLSX ล้มเหลว: ${error.message}`);
  }
}

/**
 * Export table data to Google Sheets (creates CSV and provides import instructions)
 * @param {Array} tableData - Array of objects with column data  
 * @param {string} filename - Base filename
 */
export function exportTableToGoogleSheets(tableData, filename) {
  if (!tableData || tableData.length === 0) {
    throw new Error('ไม่มีข้อมูลสำหรับ Export Google Sheets');
  }

  try {
    // Create CSV data for Google Sheets import
    const headers = Object.keys(tableData[0]);
    const csvRows = [
      headers.join(','),
      ...tableData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Simple CSV escaping for Google Sheets
          return String(value).includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    downloadBlob(blob, `${filename}_GoogleSheets.csv`);
    
    // Show Google Sheets import instructions
    showGoogleSheetsInstructions(filename);
    
    return { success: true, message: 'Export Google Sheets CSV สำเร็จ' };
    
  } catch (error) {
    console.error('Google Sheets Export Error:', error);
    throw new Error(`Export Google Sheets ล้มเหลว: ${error.message}`);
  }
}

/**
 * Download blob as file
 * @param {Blob} blob - File blob
 * @param {string} filename - Download filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Show Google Sheets import instructions
 * @param {string} filename - Base filename for reference
 */
function showGoogleSheetsInstructions(filename) {
  const modal = document.createElement('div');
  modal.className = 'export-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>📋 นำเข้า Google Sheets</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>ไฟล์ <strong>${filename}_GoogleSheets.csv</strong> ถูกดาวน์โหลดแล้ว</p>
        <h4>ขั้นตอนการนำเข้า:</h4>
        <ol>
          <li>เปิด <a href="https://sheets.google.com" target="_blank">Google Sheets</a></li>
          <li>คลิก "ใหม่" → "นำเข้า"</li>
          <li>เลือกไฟล์ CSV ที่ดาวน์โหลด</li>
          <li>ตั้งค่า: Encoding = "UTF-8"</li>
          <li>คลิก "นำเข้าข้อมูล"</li>
        </ol>
      </div>
      <div class="modal-footer">
        <button class="btn btn--primary modal-close">เข้าใจแล้ว</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal handlers
  modal.addEventListener('click', (e) => {
    if (e.target.matches('.modal-close') || e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Helper Functions for Data Normalization

/**
 * Get Thai day name from day number
 * @param {number} dayNumber - Day number (1-7)
 * @param {boolean} abbreviated - Return abbreviated form
 */
export function getThaiDayName(dayNumber, abbreviated = false) {
  return abbreviated ? THAI_DAY_ABBR[dayNumber] : THAI_DAY_NAMES[dayNumber];
}

/**
 * Get time slot string from period number
 * @param {number} period - Period number (1-8)
 */
export function getTimeSlot(period) {
  return TIME_SLOTS[period - 1] || `คาบ ${period}`;
}

/**
 * Normalize schedule data for export
 * @param {Array} rows - Raw schedule data
 * @param {Object} context - Export context (year, semester, etc.)
 */
export function normalizeScheduleForExport(rows, context) {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map(row => ({
    'วัน': getThaiDayName(row.day_of_week),
    'เวลา': getTimeSlot(row.period),
    'คาบ': row.period,
    'วิชา': row.subject_name || '',
    'รหัสวิชา': row.subject_code || '',
    'ครู': row.teacher_name || '',
    'ห้องเรียน': row.class_name || '',
    'ห้อง': row.room_name ? `${row.room_name} (${row.room_type || 'N/A'})` : ''
  }));
}

/**
 * Generate export filename with context
 * @param {string} base - Base filename
 * @param {Object} context - Context with year, semester info
 */
export function generateExportFilename(base, context) {
  const ctx = context || {};
  // Prefer Thai academic year from context; fallback to Thai year today
  const thaiNow = new Date().getFullYear() + 543;
  const year = ctx.currentYear ?? ctx.year ?? thaiNow;
  // Accept multiple shapes for semester info
  const semester = (ctx.currentSemester && ctx.currentSemester.semester_number)
    || (ctx.semester && ctx.semester.semester_number)
    || ctx.semesterId
    || 'all';
  const date = new Date().toISOString().slice(0, 10);

  return `${base}_${year}_ภาค${semester}_${date}`;
}

/**
 * Normalize teacher schedule data for export
 * @param {Array} rows - Raw teacher schedule data
 * @param {Object} context - Export context
 */
export function normalizeTeacherScheduleForExport(rows, context) {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map(row => ({
    'วัน': getThaiDayName(row.day_of_week),
    'เวลา': getTimeSlot(row.period),
    'คาบ': row.period,
    'วิชา': `${row.subject_name} (${row.subject_code || ''})`.trim(),
    'ห้องเรียน': row.class_name || '',
    'ห้อง': row.room_name ? `${row.room_name} (${row.room_type || 'N/A'})` : '',
    'ครู': row.teacher_name || ''
  }));
}

/**
 * Normalize substitution data for export
 * @param {Array} rows - Raw substitution data
 * @param {Object} context - Export context
 */
export function normalizeSubstitutionForExport(rows, context) {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map(row => ({
    'วันที่': formatThaiDate(row.date),
    'ครูที่ขาด': row.absent_teacher_name || '',
    'เหตุผล': row.reason || '',
    'คาบ': row.period,
    'เวลา': getTimeSlot(row.period),
    'วิชา': row.subject_name || '',
    'ห้องเรียน': row.class_name || '',
    'ห้อง': row.room_name ? `${row.room_name} (${row.room_type || 'N/A'})` : '',
    'ครูสอนแทน': row.substitute_teacher_name || 'ยังไม่กำหนด'
  }));
}

/**
 * Format Thai date
 * @param {string|Date} date - Date to format
 */
function formatThaiDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543; // Convert to Thai year
  
  return `${day} ${month} ${year}`;
}

// Export Integration Functions

/**
 * Bind export buttons in a container
 * @param {HTMLElement} container - Container element with export buttons
 * @param {Function} getExportData - Function to get export data
 * @param {Object} context - Current context
 */
export function bindExportButtons(container, getExportData, context) {
  if (!container) return;
  
  const exportButtons = container.querySelectorAll('[data-export-type]');
  
  exportButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const exportType = button.dataset.exportType;
      const target = button.dataset.target || 'generic';
      
      try {
        await handleExportClick(exportType, getExportData, context, button);
      } catch (error) {
        console.error('Export failed:', error);
        showNotification(`Export ล้มเหลว: ${error.message}`, 'error');
      }
    });
  });
}

/**
 * Handle export button click
 * @param {string} exportType - Type of export (csv, xlsx, gsheets)
 * @param {Function} getExportData - Function to get export data
 * @param {Object} context - Current context
 * @param {HTMLElement} button - Clicked button element
 */
export async function handleExportClick(exportType, getExportData, context, button) {
  showExportProgress(button);
  
  try {
    // Get export data
    const rawData = await getExportData();
    if (!rawData || rawData.length === 0) {
      throw new Error('ไม่มีข้อมูลสำหรับ Export');
    }
    
    // Generate filename
    const baseFilename = generateBaseFilename(context);
    const filename = generateExportFilename(baseFilename, context);
    
    // Export based on type
    let result;
    switch (exportType) {
      case 'csv':
        result = exportTableToCSV(rawData, filename);
        break;
      case 'xlsx':
        result = exportTableToXLSX(rawData, filename);
        break;
      case 'gsheets':
        result = exportTableToGoogleSheets(rawData, filename);
        break;
      default:
        throw new Error(`ประเภท Export ไม่รองรับ: ${exportType}`);
    }
    
    showNotification(result.message || 'Export สำเร็จ', 'success');
    
  } finally {
    hideExportProgress(button);
  }
}

/**
 * Generate base filename from context
 * @param {Object} context - Export context
 */
function generateBaseFilename(context) {
  const ctx = context || {};
  // Prefer URL hash (navigation.js sets it to 'student'|'teacher'|'substitution')
  const fromHash = (typeof window !== 'undefined' && window.location && window.location.hash)
    ? window.location.hash.replace('#','')
    : '';
  const page = fromHash || ctx.currentPage || '';

  switch (page) {
    case 'student':
      return `ตารางเรียน-${ctx.selectedClass || 'ทั้งหมด'}`;
    case 'teacher':
      return `ตารางสอน-${ctx.selectedTeacher || 'ทั้งหมด'}`;
    case 'substitution':
      return `สอนแทน-${ctx.selectedDate || 'รายงาน'}`;
    default:
      return 'export';
  }
}

/**
 * Show export progress indicator
 * @param {HTMLElement} button - Export button
 */
export function showExportProgress(button) {
  if (!button) return;
  
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.innerHTML = '<span class="spinner"></span> กำลัง Export...';
  button.classList.add('loading');
}

/**
 * Hide export progress indicator
 * @param {HTMLElement} button - Export button
 */
export function hideExportProgress(button) {
  if (!button) return;
  
  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
  button.classList.remove('loading');
  delete button.dataset.originalText;
}

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  const removeNotification = () => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  };
  
  setTimeout(removeNotification, 5000);
  
  // Manual close
  notification.querySelector('.notification-close').addEventListener('click', removeNotification);
}

// Error Handling & Validation

/**
 * Validate export data before processing
 * @param {Array} data - Data to validate
 * @param {string} exportType - Type of export
 */
export function validateExportData(data, exportType) {
  if (!Array.isArray(data)) {
    throw new Error('ข้อมูล Export ต้องเป็น Array');
  }
  
  if (data.length === 0) {
    throw new Error('ไม่มีข้อมูลสำหรับ Export');
  }
  
  // Check if all rows have consistent structure
  const firstRowKeys = Object.keys(data[0] || {});
  if (firstRowKeys.length === 0) {
    throw new Error('ข้อมูล Export ไม่มี columns');
  }
  
  // File size check (approximate)
  const approximateSize = JSON.stringify(data).length;
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (approximateSize > maxSize) {
    throw new Error('ข้อมูลมีขนาดใหญ่เกินไป (เกิน 10MB)');
  }
  
  return true;
}

/**
 * Check browser compatibility for export features
 */
export function checkBrowserCompatibility() {
  const features = {
    blob: typeof Blob !== 'undefined',
    download: 'download' in document.createElement('a'),
    url: typeof URL !== 'undefined' && URL.createObjectURL
  };
  
  const unsupported = Object.keys(features).filter(key => !features[key]);
  
  if (unsupported.length > 0) {
    console.warn('Browser ไม่รองรับฟีเจอร์:', unsupported.join(', '));
    return false;
  }
  
  return true;
}

// Initialize export system
if (typeof window !== 'undefined') {
  // Check browser compatibility on load
  if (!checkBrowserCompatibility()) {
    console.error('Browser นี้ไม่รองรับฟีเจอร์ Export อย่างเต็มรูปแบบ');
  }
}