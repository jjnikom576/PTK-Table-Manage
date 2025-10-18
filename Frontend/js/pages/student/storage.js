export function saveSelectedClass(className) {
  try {
    localStorage.setItem('student-schedule-selected-class', className);
  } catch (error) {
    console.warn('[StudentSchedule] Failed to save selected class:', error);
  }
}

export function getSavedSelectedClass() {
  try {
    return localStorage.getItem('student-schedule-selected-class');
  } catch (error) {
    console.warn('[StudentSchedule] Failed to get saved selected class:', error);
    return null;
  }
}

export function clearSavedSelectedClass() {
  try {
    localStorage.removeItem('student-schedule-selected-class');
  } catch (error) {
    console.warn('[StudentSchedule] Failed to clear saved selected class:', error);
  }
}
