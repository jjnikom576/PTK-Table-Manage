import { pageState, setPageState } from './state.js';

export function compareClasses(a, b) {
  const aKey = buildClassSortKey(a);
  const bKey = buildClassSortKey(b);

  if (aKey.levelRank !== bKey.levelRank) {
    return aKey.levelRank - bKey.levelRank;
  }
  if (aKey.grade !== bKey.grade) {
    return aKey.grade - bKey.grade;
  }
  if (aKey.section !== bKey.section) {
    return aKey.section - bKey.section;
  }
  return aKey.name.localeCompare(bKey.name, 'th');
}

export function findClassNameById(classId) {
  const match = pageState.availableClasses.find(
    (cls) => String(cls.id) === String(classId)
  );
  return match?.class_name || null;
}

export function markUserSelection(selectedClassId) {
  setPageState({
    hasUserSelection: true,
    selectedClass: selectedClassId != null ? String(selectedClassId) : null
  });
}

export function resetUserSelection() {
  setPageState({ hasUserSelection: false, selectedClass: null });
}

export function shouldPersistSelection() {
  return pageState.hasUserSelection;
}

function buildClassSortKey(cls) {
  const name = cls.class_name || '';
  const gradeText = cls.grade_level || name.split('/')[0] || '';
  const gradeMatch = gradeText.match(/(\d+)/);
  const grade = gradeMatch ? Number.parseInt(gradeMatch[1], 10) : Number.MAX_SAFE_INTEGER;

  const sectionValue =
    cls.section ??
    (() => {
      const [, sectionPart] = name.split('/');
      const sectionNum = Number.parseInt(sectionPart, 10);
      return Number.isFinite(sectionNum) ? sectionNum : Number.MAX_SAFE_INTEGER;
    })();

  const section = Number.isFinite(sectionValue)
    ? Number(sectionValue)
    : Number.MAX_SAFE_INTEGER;

  const levelRank = determineLevelRank(gradeText);

  return {
    levelRank,
    grade,
    section,
    name
  };
}

function determineLevelRank(label) {
  if (!label) return Number.MAX_SAFE_INTEGER;
  const normalized = label.trim();
  if (/^ม\./i.test(normalized)) return 1;
  if (/^ป\./i.test(normalized)) return 0;
  if (/^อาชีว/i.test(normalized)) return 2;
  return Number.MAX_SAFE_INTEGER;
}
