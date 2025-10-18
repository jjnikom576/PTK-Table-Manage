import {
  loadCoreTemplates,
  getSemesterName,
  initApp,
  initCoreServices,
  initModules,
  initializeStudentPage,
  initializeTeacherPage,
  loadDefaultPage,
  initializeModules,
  loadInitialData,
  handleInitializationError
} from './core.js';

import {
  loadInitialContext,
  loadDefaultClassSelection,
  setDefaultContext,
  setupContextSelectors,
  updateSemesterOptions,
  applyContextChange,
  handleYearChange,
  handleSemesterChange,
  handleContextChange,
  setContext,
  useGlobalContext,
  isContextValid,
  loadContextFromStorage,
  saveContextToStorage,
  refreshContentOnly,
  refreshCurrentPage
} from './context.js';

import {
  setupEventListeners,
  bindExportHandlers,
  initializeRouting,
  navigateToPage,
  showPage,
  handleURLChange,
  hideAllPages,
  updateNavigationUI
} from './navigation.js';

import {
  setupExportHandlers,
  handleExportClick,
  showNotification,
  showExportProgress,
  hideExportProgress,
  getStudentExportData,
  getTeacherExportData,
  getSubstitutionExportData,
  getActiveTeacherId,
  getSelectedDate
} from './exports.js';

import { loadStudentSchedulePage } from './pages.js';

export default class SchoolScheduleApp {
  constructor() {
    this.context = null;
    this.modules = {};
    this.initialized = false;
    this.errorState = null;
    this.exportHandlers = {};
    this.currentPage = null;
  }

  async loadCoreTemplates() {
    return loadCoreTemplates(this);
  }

  async getSemesterName(semesterId) {
    return getSemesterName(this, semesterId);
  }

  async init() {
    return initApp(this);
  }

  async loadInitialContext() {
    return loadInitialContext(this);
  }

  async loadDefaultClassSelection() {
    return loadDefaultClassSelection(this);
  }

  async initCoreServices() {
    return initCoreServices(this);
  }

  async initModules() {
    return initModules(this);
  }

  async initializeStudentPage() {
    return initializeStudentPage(this);
  }

  async initializeTeacherPage() {
    return initializeTeacherPage(this);
  }

  async loadDefaultPage() {
    return loadDefaultPage(this);
  }

  async setDefaultContext(context) {
    return setDefaultContext(this, context);
  }

  async initializeModules() {
    return initializeModules(this);
  }

  setupEventListeners() {
    return setupEventListeners(this);
  }

  bindExportHandlers() {
    return bindExportHandlers(this);
  }

  async setupContextSelectors() {
    return setupContextSelectors(this);
  }

  async updateSemesterOptions() {
    return updateSemesterOptions(this);
  }

  async applyContextChange(newYear, newSemesterId) {
    return applyContextChange(this, newYear, newSemesterId);
  }

  async handleYearChange(newYear) {
    return handleYearChange(this, newYear);
  }

  async handleSemesterChange(newSemesterId) {
    return handleSemesterChange(this, newSemesterId);
  }

  async setupExportHandlers() {
    return setupExportHandlers(this);
  }

  async handleExportClick(exportType, target, button) {
    return handleExportClick(this, exportType, target, button);
  }

  async loadInitialData() {
    return loadInitialData(this);
  }

  async initializeRouting() {
    return initializeRouting(this);
  }

  async navigateToPage(pageId, subPageId = null) {
    return navigateToPage(this, pageId, subPageId);
  }

  async showPage(pageId, context) {
    return showPage(this, pageId, context);
  }

  async handleContextChange(newContext) {
    return handleContextChange(this, newContext);
  }

  async setContext(year, semesterId) {
    return setContext(this, year, semesterId);
  }

  useGlobalContext() {
    return useGlobalContext(this);
  }

  isContextValid(context) {
    return isContextValid(this, context);
  }

  loadContextFromStorage() {
    return loadContextFromStorage(this);
  }

  saveContextToStorage(context) {
    return saveContextToStorage(this, context);
  }

  hideAllPages() {
    return hideAllPages(this);
  }

  updateNavigationUI(pageId) {
    return updateNavigationUI(this, pageId);
  }

  handleURLChange() {
    return handleURLChange(this);
  }

  showNotification(message, type = 'info') {
    return showNotification(this, message, type);
  }

  showExportProgress(button) {
    return showExportProgress(this, button);
  }

  hideExportProgress(button) {
    return hideExportProgress(this, button);
  }

  getActiveTeacherId() {
    return getActiveTeacherId(this);
  }

  getSelectedDate() {
    return getSelectedDate(this);
  }

  async getStudentExportData(className, context) {
    return getStudentExportData(this, className, context);
  }

  async getTeacherExportData(teacherId, context) {
    return getTeacherExportData(this, teacherId, context);
  }

  async getSubstitutionExportData(date, context) {
    return getSubstitutionExportData(this, date, context);
  }

  async refreshContentOnly(newContext) {
    return refreshContentOnly(this, newContext);
  }

  async refreshCurrentPage(newContext) {
    return refreshCurrentPage(this, newContext);
  }

  async loadStudentSchedulePage() {
    return loadStudentSchedulePage(this);
  }

  async handleInitializationError(error) {
    return handleInitializationError(this, error);
  }
}
