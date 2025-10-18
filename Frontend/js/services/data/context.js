import { getCurrentContext, getCurrentContextRef, replaceCurrentContext } from './state.js';
import {
  getAcademicYearByNumber,
  getSemesterById,
  loadSemestersByYear
} from './loaders.js';

export async function setGlobalContext(year, semesterId) {
  try {
    const academicYearResult = await getAcademicYearByNumber(year);
    if (!academicYearResult.ok) {
      throw new Error(academicYearResult.error || 'Academic year not found');
    }

    let semesterData = null;
    if (semesterId) {
      const semesterResult = await getSemesterById(semesterId);
      if (!semesterResult.ok) {
        throw new Error(semesterResult.error || 'Semester not found');
      }
      semesterData = semesterResult.data;
    }

    replaceCurrentContext({
      year,
      semesterId,
      semester: semesterData,
      academicYear: academicYearResult.data
    });

    console.log('[DataService] Context set:', getCurrentContextRef());
    return { ok: true, context: getCurrentContext() };
  } catch (error) {
    console.error('[DataService] Failed to set context:', error);
    return { ok: false, error: error.message };
  }
}

export async function switchToYear(year) {
  try {
    const semestersResult = await loadSemestersByYear(year);
    if (!semestersResult.ok) {
      throw new Error(semestersResult.error || 'Failed to load semesters');
    }

    const semesters = semestersResult.data || [];
    if (!semesters.length) {
      throw new Error(`No semesters found for year ${year}`);
    }

    const context = getCurrentContextRef();
    let newSemesterId = null;

    if (context.semester) {
      const matchingSemester = semesters.find(
        (item) =>
          item.semester_number === context.semester.semester_number ||
          item.id === context.semester.id
      );
      newSemesterId = matchingSemester?.id || semesters[0].id;
    } else {
      newSemesterId = semesters[0].id;
    }

    return await setGlobalContext(year, newSemesterId);
  } catch (error) {
    console.error('[DataService] Failed to switch year:', error);
    return { ok: false, error: error.message };
  }
}

export async function switchToSemester(semesterId) {
  try {
    const semesterResult = await getSemesterById(semesterId);
    if (!semesterResult.ok) {
      throw new Error(semesterResult.error || 'Semester not found');
    }

    const semester = semesterResult.data;
    const targetYear = semester?.academic_year_id || getCurrentContextRef().year;

    return await setGlobalContext(targetYear, semesterId);
  } catch (error) {
    console.error('[DataService] Failed to switch semester:', error);
    return { ok: false, error: error.message };
  }
}
