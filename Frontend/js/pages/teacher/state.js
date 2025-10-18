const initialState = {
  teachers: [],
  selectedTeacher: null,
  teacherSchedules: {},
  workloadSummary: null,
  isLoading: false,
  error: null,
  selectedGroup: 'ALL',
  eventsInitialized: false
};

export const pageState = { ...initialState };

export function resetPageState() {
  Object.assign(pageState, initialState);
}

export function setPageState(partial = {}) {
  Object.assign(pageState, partial);
  return pageState;
}

export function setLoading(isLoading) {
  pageState.isLoading = isLoading;

  const loadingElement = document.getElementById('teacher-loading');
  if (loadingElement) {
    loadingElement.style.display = isLoading ? 'block' : 'none';
  }
}

export function showError(message) {
  pageState.error = message;

  console.error('[TeacherSchedule] Error:', message);

  const errorElement = document.getElementById('teacher-error');
  if (errorElement) {
    const errorMsg = errorElement.querySelector('.error-message');
    if (errorMsg) errorMsg.textContent = message;
    errorElement.style.display = 'block';

    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  } else {
    const summaryContainer = document.getElementById('teacher-summary');
    if (summaryContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.cssText =
        'color: red; padding: 20px; background: #ffe6e6; border: 1px solid #ff0000; margin: 10px 0; border-radius: 4px;';
      errorDiv.textContent = `เกิดข้อผิดพลาด: ${message}`;
      summaryContainer.appendChild(errorDiv);
    }
  }
}

export function showExportProgress(button) {
  button.disabled = true;
  button.innerHTML = '⌛ กำลัง Export...';
}

export function hideExportProgress(button) {
  button.disabled = false;
  const format = button.dataset.exportType;
  const texts = {
    html: '📄 HTML',
    csv: '📄 CSV',
    xlsx: '📊 Excel',
    gsheets: '📋 Google Sheets'
  };
  button.innerHTML = texts[format] || 'Export';
}

export function showExportSuccess(message) {
  console.log('[TeacherSchedule]', message);
}

export function showExportError(message) {
  console.error('[TeacherSchedule] Export Error:', message);
  alert(message);
}

export function getPageState() {
  return { ...pageState };
}
