import { initDataService, getCurrentContext } from './data/state.js';
import { clearCache, clearYearCache, getCacheStatus } from './data/cache.js';
import { setGlobalContext, switchToYear, switchToSemester } from './data/context.js';
import {
  loadAcademicYears,
  loadSemesters,
  loadSemestersByYear,
  loadYearData,
  loadSemesterData,
  getAcademicYearById,
  getAcademicYearByNumber,
  getSemesterById
} from './data/loaders.js';
import {
  getTeachers,
  getClasses,
  getRooms,
  getSubjects,
  getSchedules,
  getPeriods
} from './data/entities.js';
import { getStudentSchedule } from './data/student.js';
import {
  compareAcrossYears,
  getTeacherHistory,
  cloneYearData
} from './data/analytics.js';
import {
  normalizeStudentScheduleForExport,
  normalizeTeacherScheduleForExport,
  normalizeSubstitutionForExport
} from './data/exporters.js';
import {
  getSubstitutions,
  getSubstitutionSchedules
} from './data/substitutions.js';

export {
  initDataService,
  clearCache,
  clearYearCache,
  clearYearCache as clearCacheForYear,
  getCacheStatus,
  setGlobalContext,
  switchToYear,
  switchToSemester,
  loadAcademicYears,
  loadSemesters,
  loadSemestersByYear,
  loadYearData,
  loadSemesterData,
  getTeachers,
  getClasses,
  getRooms,
  getSubjects,
  getSchedules,
  getPeriods,
  getStudentSchedule,
  getAcademicYearById,
  getAcademicYearByNumber,
  getSemesterById,
  compareAcrossYears,
  getTeacherHistory,
  cloneYearData,
  normalizeStudentScheduleForExport,
  normalizeTeacherScheduleForExport,
  normalizeSubstitutionForExport,
  getCurrentContext,
  getSubstitutions,
  getSubstitutionSchedules
};
