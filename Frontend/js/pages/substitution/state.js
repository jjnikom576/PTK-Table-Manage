import { formatSemester } from '../../utils.js';

const initialState = {
  currentSubPage: 'hall-of-fame',
  selectedDate: new Date().toISOString().slice(0, 10),
  loadedData: null,
  context: null
};

export const substitutionPageState = {
  ...initialState
};

export function resetSubstitutionPageState() {
  Object.assign(substitutionPageState, initialState);
}

export function setSubstitutionContext(context) {
  substitutionPageState.context = context;
}

export function getSubstitutionContext() {
  return substitutionPageState.context;
}

export function setSelectedDate(date) {
  substitutionPageState.selectedDate = date;
}

export function getSelectedDate() {
  return substitutionPageState.selectedDate;
}

export function setLoadedData(data) {
  substitutionPageState.loadedData = data;
}

export function getLoadedData() {
  return substitutionPageState.loadedData;
}

export function setCurrentSubPage(subPage) {
  substitutionPageState.currentSubPage = subPage;
}

export function showSubstitutionPageLoading(show) {
  const loadingElement = document.querySelector('#substitution-loading');
  if (loadingElement) {
    loadingElement.style.display = show ? 'block' : 'none';
  }
}

export function showSubstitutionPageError(message) {
  const errorContainer = document.querySelector('#substitution-error');
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    errorContainer.style.display = 'block';
  }
}

export function updateContextBadge(newContext) {
  const contextBadge = document.querySelector(
    '#substitution-sub-nav .context-display .context-badge'
  );
  if (contextBadge) {
    contextBadge.textContent = `${formatSemester(newContext.semester)} ปีการศึกษา ${newContext.year}`;
  }
}
