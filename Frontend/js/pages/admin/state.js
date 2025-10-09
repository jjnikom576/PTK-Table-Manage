const adminState = {
  context: null,
  initialized: false,
  templatesLoaded: false,
  templates: null,

  // Data Management
  teachers: [],
  classes: [],
  rooms: [],
  periods: [],
  subjects: [],
  subjectsRaw: [],
  academicYears: [],
  semesters: [],
  activeYear: null,
  activeSemester: null,

  // UI State
  currentPage: 1,
  itemsPerPage: 10,
  searchTerm: '',
  classSearchTerm: '',
  roomSearchTerm: '',
  subjectSearchTerm: '',
  periodSearchTerm: '',
  subjectCurrentPage: 1,
  subjectItemsPerPage: 10,
  periodsCurrentPage: 1,
  periodsPerPage: 10,
  editingTeacher: null,
  editingClass: null,
  editingRoom: null,
  editingSubject: null,
  editingPeriod: null,
  viewingSubject: null,
  sortColumn: 'id',
  sortDirection: 'asc',
  loading: false,
  error: null,
  classesLoading: false,
  classesError: null,
  roomsLoading: false,
  roomsError: null,
  subjectsLoading: false,
  subjectsError: null,
  periodsLoading: false,
  periodsError: null,
  subjectClassSelection: {
    selectedIds: []
  },
  isGeneratingSchedulePrompt: false
};

export function normalizeContext(ctx) {
  if (!ctx) return null;
  if (ctx.currentYear && ctx.currentSemester) {
    return { year: ctx.currentYear, semesterId: ctx.currentSemester.id };
  }
  if (ctx.year && ctx.semesterId) return ctx;
  return null;
}

export default adminState;
