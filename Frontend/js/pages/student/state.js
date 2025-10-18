const initialState = {
  currentSchedule: null,
  cachedTimetable: null,
  selectedClass: null,
  availableClasses: [],
  isLoading: false,
  error: null
};

export const pageState = {
  ...initialState
};

export function setPageState(partial = {}) {
  Object.assign(pageState, partial);
  return pageState;
}

export function resetPageState() {
  Object.assign(pageState, initialState);
  return pageState;
}

export function getPageState() {
  return { ...pageState };
}
