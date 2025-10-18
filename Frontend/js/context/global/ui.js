import { globalContext } from './state.js';

export function updateContextUI() {
  try {
    console.log('[GlobalContext] Updating UI with context:', globalContext);

    const yearSelector = document.getElementById('year-selector');
    if (yearSelector) {
      const userIsSelecting = document.activeElement === yearSelector;

      updateYearSelector(globalContext.availableYears);

      if (!userIsSelecting && yearSelector.value !== String(globalContext.currentYear || '')) {
        yearSelector.value = globalContext.currentYear || '';
        console.log('[GlobalContext] Set year selector to:', globalContext.currentYear);
        updateSemesterSelector(globalContext.availableSemesters);
      }

      if (!yearSelector.hasAttribute('data-listener-added')) {
        yearSelector.addEventListener('change', () => {
          console.log('[GlobalContext] Year changed, updating semester selector');
          updateSemesterSelector(globalContext.availableSemesters);
        });
        yearSelector.setAttribute('data-listener-added', 'true');
      }
    }

    const semesterSelector = document.getElementById('semester-selector');
    if (semesterSelector) {
      const userIsSelecting = document.activeElement === semesterSelector;

      updateSemesterSelector(globalContext.availableSemesters);

      if (
        !userIsSelecting &&
        semesterSelector.value !== String(globalContext.currentSemester?.id || '')
      ) {
        semesterSelector.value = globalContext.currentSemester?.id || '';
        console.log(
          '[GlobalContext] Set semester selector to:',
          globalContext.currentSemester?.id
        );
      }
    }

    const contextDisplay = document.getElementById('context-display');
    if (contextDisplay) {
      const yearText = globalContext.currentYear
        ? `ปีการศึกษา ${globalContext.currentYear}`
        : 'ไม่ได้เลือกปี';
      const semesterText = globalContext.currentSemester
        ? globalContext.currentSemester.semester_name
        : 'ไม่ได้เลือกภาคเรียน';
      contextDisplay.textContent = `${yearText} | ${semesterText}`;
    }

    if (globalContext.isLoading) {
      showContextSwitchLoading();
    } else {
      hideContextSwitchLoading();
    }

    if (globalContext.error) {
      showContextError(globalContext.error);
    } else {
      hideContextError();
    }
  } catch (error) {
    console.error('[GlobalContext] Failed to update UI:', error);
  }
}

export function updateYearSelector(availableYears) {
  const yearSelector = document.getElementById('year-selector');
  if (!yearSelector) {
    console.warn('[GlobalContext] Year selector element not found!');
    return;
  }

  console.log('[GlobalContext] Updating year selector. Available years:', availableYears.length);

  yearSelector.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';

  if (availableYears.length === 0) {
    defaultOption.textContent = 'ไม่มีปีการศึกษา - เพิ่มใหม่ในหน้าแอดมิน';
    defaultOption.disabled = true;
    console.log('[GlobalContext] Setting empty state message for year selector');
  } else {
    defaultOption.textContent = 'เลือกปีการศึกษา';
    console.log('[GlobalContext] Setting normal default message for year selector');
  }

  yearSelector.appendChild(defaultOption);

  availableYears.forEach((year) => {
    const option = document.createElement('option');
    option.value = year.year;
    option.textContent = `ปีการศึกษา ${year.year}${year.is_active ? ' (ใช้งาน)' : ''}`;
    option.selected = year.year === globalContext.currentYear;
    yearSelector.appendChild(option);
  });

  const hasOption = Array.from(yearSelector.options).some(
    (opt) => opt.value === String(globalContext.currentYear)
  );
  yearSelector.value = hasOption ? String(globalContext.currentYear) : '';

  console.log('[GlobalContext] Updated year selector. Final value:', yearSelector.value);
  console.log('[GlobalContext] Year selector options count:', yearSelector.options.length);
  console.log(
    '[GlobalContext] Current selected text:',
    yearSelector.options[yearSelector.selectedIndex]?.textContent
  );
}

export function updateSemesterSelector(availableSemesters) {
  const semesterSelector = document.getElementById('semester-selector');
  if (!semesterSelector) {
    console.warn('[GlobalContext] Semester selector element not found!');
    return;
  }

  const currentValue = semesterSelector.value;
  const userIsSelecting = document.activeElement === semesterSelector;
  const filteredSemesters = Array.isArray(availableSemesters) ? availableSemesters : [];
  console.log('[GlobalContext] Updating semester selector (global). Count:', filteredSemesters.length);

  const currentOptions = Array.from(semesterSelector.options);
  const hasWrongDefaultOption = currentOptions.some(
    (opt) => opt.textContent === 'กำลังโหลด...' || opt.textContent.includes('กำลังโหลด')
  );

  const needsRebuild =
    hasWrongDefaultOption || currentOptions.length !== filteredSemesters.length + 1;

  console.log(
    '[GlobalContext] Rebuild needed:',
    needsRebuild,
    'hasWrongDefaultOption:',
    hasWrongDefaultOption
  );

  if (needsRebuild && !userIsSelecting) {
    console.log('[GlobalContext] Rebuilding semester selector options');

    semesterSelector.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    if (filteredSemesters.length === 0) {
      defaultOption.textContent = 'ยังไม่มีภาคเรียน - เพิ่มใหม่ในหน้าแอดมิน';
      defaultOption.disabled = true;
      console.log('[GlobalContext] Setting "no semesters" message');
    } else {
      defaultOption.textContent = 'เลือกภาคเรียน';
      console.log('[GlobalContext] Setting normal "select semester" message');
    }

    semesterSelector.appendChild(defaultOption);

    filteredSemesters.forEach((semester) => {
      const option = document.createElement('option');
      option.value = semester.id;
      const semesterName = semester.name || semester.semester_name;
      option.textContent = `${semesterName}${semester.is_active ? ' (ใช้งาน)' : ''}`;
      semesterSelector.appendChild(option);
    });

    const desired =
      currentValue ||
      (globalContext.currentSemester?.id ? String(globalContext.currentSemester.id) : '');
    if (desired && semesterSelector.querySelector(`option[value="${desired}"]`)) {
      semesterSelector.value = desired;
      console.log('[GlobalContext] Restored semester selector value to:', desired);
    } else {
      semesterSelector.value = '';
    }

    console.log('[GlobalContext] Updated semester selector. Options count:', semesterSelector.options.length);
    console.log('[GlobalContext] Final semester value:', semesterSelector.value);
    console.log(
      '[GlobalContext] Selected semester text:',
      semesterSelector.options[semesterSelector.selectedIndex]?.textContent
    );
  } else if (!needsRebuild) {
    console.log('[GlobalContext] Semester selector rebuild not needed');
  } else {
    console.log('[GlobalContext] User is selecting, skipping rebuild');
  }
}

export function showContextSwitchLoading() {
  globalContext.isLoading = true;

  const loadingElement = document.getElementById('context-loading');
  if (loadingElement) {
    loadingElement.style.display = 'block';
  }

  const yearSelector = document.getElementById('year-selector');
  const semesterSelector = document.getElementById('semester-selector');

  if (yearSelector) yearSelector.disabled = true;
  if (semesterSelector) semesterSelector.disabled = true;
}

export function hideContextSwitchLoading() {
  globalContext.isLoading = false;

  const loadingElement = document.getElementById('context-loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }

  const yearSelector = document.getElementById('year-selector');
  const semesterSelector = document.getElementById('semester-selector');

  if (yearSelector) yearSelector.disabled = false;
  if (semesterSelector) semesterSelector.disabled = false;
}

function showContextError(error) {
  const errorElement = document.getElementById('context-error');
  if (errorElement) {
    errorElement.textContent = error;
    errorElement.style.display = 'block';
  }
}

function hideContextError() {
  const errorElement = document.getElementById('context-error');
  if (errorElement) {
    errorElement.style.display = 'none';
  }
}
