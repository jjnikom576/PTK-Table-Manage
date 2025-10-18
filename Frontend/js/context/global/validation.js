import { globalContext } from './state.js';

export function isContextValid(storedContext) {
  if (!storedContext) return false;

  return (
    storedContext.currentYear &&
    typeof storedContext.currentYear === 'number' &&
    storedContext.currentYear >= 2500 &&
    storedContext.currentYear <= 3000 &&
    storedContext.currentSemester &&
    typeof storedContext.currentSemester === 'object'
  );
}

export function isStoredContextCompatible(storedContext) {
  if (!isContextValid(storedContext)) return false;

  const yearExists = globalContext.availableYears.some(
    (year) => year.year === storedContext.currentYear
  );

  const semesterId = storedContext.currentSemester?.id;
  const semesterExists =
    Boolean(semesterId) &&
    globalContext.availableSemesters.some((semester) => semester.id === semesterId);

  return yearExists && semesterExists;
}

export function applyStoredContext(storedContext) {
  globalContext.currentYear = storedContext.currentYear;

  const semesterId = storedContext.currentSemester?.id;
  if (semesterId) {
    globalContext.currentSemester =
      globalContext.availableSemesters.find((semester) => semester.id === semesterId) || null;
  } else {
    globalContext.currentSemester = null;
  }
}

export function validateYear(year) {
  if (!year || typeof year !== 'number') {
    return { ok: false, error: 'Year must be a number' };
  }

  if (year < 2500 || year > 3000) {
    return { ok: false, error: 'Year must be between 2500-3000' };
  }

  const availableYear = globalContext.availableYears.find((y) => y.year === year);
  if (!availableYear) {
    return { ok: false, error: `Year ${year} not available` };
  }

  return { ok: true, year: availableYear };
}

export function validateSemester(semesterId) {
  if (!semesterId) {
    return { ok: false, error: 'Semester ID is required' };
  }

  const semester = globalContext.availableSemesters.find((s) => s.id === semesterId);

  if (!semester) {
    return { ok: false, error: `Semester ${semesterId} not found` };
  }

  return { ok: true, semester };
}

export function validateUserAccess(year, userRole) {
  const validRoles = ['teacher', 'admin'];
  if (!validRoles.includes(userRole)) {
    return { ok: false, error: 'Invalid user role' };
  }

  if (userRole === 'admin') {
    return { ok: true };
  }

  const currentYear = new Date().getFullYear() + 543;
  const yearDiff = Math.abs(year - currentYear);

  if (yearDiff > 2) {
    return { ok: false, error: 'Access denied: Year too far from current' };
  }

  return { ok: true };
}

export function checkContextIntegrity() {
  const issues = [];

  if (globalContext.currentYear) {
    const yearValidation = validateYear(globalContext.currentYear);
    if (!yearValidation.ok) {
      issues.push(`Invalid current year: ${yearValidation.error}`);
    }
  }

  if (globalContext.currentSemester) {
    const semesterValidation = validateSemester(globalContext.currentSemester.id);
    if (!semesterValidation.ok) {
      issues.push(`Invalid current semester: ${semesterValidation.error}`);
    }
  }

  if (globalContext.currentRooms.length > 0 && globalContext.currentYear) {
    const expectedRoomCount = globalContext.currentRooms.length;
    if (expectedRoomCount === 0) {
      issues.push('No rooms loaded for current year');
    }
  }

  if (globalContext.currentYear && globalContext.userRole) {
    const accessValidation = validateUserAccess(globalContext.currentYear, globalContext.userRole);
    if (!accessValidation.ok) {
      issues.push(`Access validation failed: ${accessValidation.error}`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    context: globalContext
  };
}

export async function validateContext(year, semesterId) {
  const yearValidation = validateYear(year);
  if (!yearValidation.ok) return yearValidation;

  const semesterValidation = validateSemester(semesterId);
  if (!semesterValidation.ok) return semesterValidation;

  const accessValidation = validateUserAccess(year, globalContext.userRole);
  if (!accessValidation.ok) return accessValidation;

  return {
    ok: true,
    year: yearValidation.year,
    semester: semesterValidation.semester
  };
}
