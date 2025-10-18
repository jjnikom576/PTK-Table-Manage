import {
  getRoomTypeBadgeClass,
  getDisplayPeriods,
  getDisplayPeriodsAsync,
  getLunchSlot,
  getLunchSlotAsync,
  isActiveSemester
} from '../../utils.js';

export function renderContextControls(context) {
  const semesterDisplay = document.getElementById('current-semester-display');
  if (semesterDisplay) {
    const semesterName = context.currentSemester?.semester_name || '';
    const year = context.currentYear || '';
    if (semesterName && year) {
      semesterDisplay.textContent = `${semesterName} • ${year}`;
    } else if (year) {
      semesterDisplay.textContent = `ปีการศึกษา ${year}`;
    } else {
      semesterDisplay.textContent = '';
    }
  }

  const scheduleContext = document.getElementById('schedule-context');
  if (scheduleContext) {
    const year = context.currentYear || '';
    const semesterName = context.currentSemester?.semester_name || '';
    scheduleContext.textContent = year
      ? `${semesterName ? `${semesterName} • ` : ''}ปีการศึกษา ${year}`
      : '';
  }
}

export function renderClassSelector(availableClasses, selectedClass) {
  const classSelector =
    document.getElementById('class-selector') ||
    document.getElementById('class-dropdown');
  if (!classSelector) return;

  classSelector.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
  classSelector.disabled = availableClasses.length === 0;

  const groupedByGrade = availableClasses.reduce((groups, cls) => {
    const baseName = cls.class_name || '';
    const grade = cls.grade_level || (baseName.includes('/') ? baseName.split('/')[0] : baseName) || 'อื่นๆ';
    if (!groups[grade]) {
      groups[grade] = [];
    }
    groups[grade].push(cls);
    return groups;
  }, {});

  Object.entries(groupedByGrade)
    .sort(([a], [b]) => a.localeCompare(b, 'th'))
    .forEach(([grade, classes]) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = grade;

      classes
        .sort((a, b) => a.class_name.localeCompare(b.class_name, 'th'))
        .forEach((cls) => {
          const option = document.createElement('option');
          option.value = cls.id;
          option.textContent = cls.class_name;
          option.selected = String(cls.id) === String(selectedClass);
          optgroup.appendChild(option);
        });

      classSelector.appendChild(optgroup);
    });
}

export function renderScheduleHeader(className, context) {
  renderContextControls(context);
  const headerContainer = document.getElementById('student-schedule-header');
  if (headerContainer) {
    headerContainer.classList.remove('hidden');
  }

  const selectedName = document.getElementById('selected-class-name');
  if (selectedName) {
    selectedName.textContent = className;
  }

  const contextText = document.getElementById('schedule-context');
  if (contextText) {
    const year = context.currentYear || '';
    const semesterName = context.currentSemester?.semester_name || '';
    contextText.textContent = year
      ? `${semesterName ? `${semesterName} • ` : ''}ปีการศึกษา ${year}`
      : '';
  }

  const emptyState = document.getElementById('student-empty-state');
  if (emptyState) {
    emptyState.style.display = 'none';
  }
}

export async function renderScheduleTable(resultData, context) {
  const tableContainer = getScheduleContainer();
  if (!tableContainer) return;

  const matrix = resultData?.matrix;
  if (!matrix) {
    tableContainer.innerHTML = '<p class="no-schedule">ไม่มีตารางเรียนสำหรับห้องนี้</p>';
    return;
  }

  const year = context?.currentYear || context?.year;
  const semesterId =
    context?.currentSemester?.id ||
    context?.semester?.id ||
    context?.semesterId;
  const displayPeriods = await getDisplayPeriodsAsync(year, semesterId);
  const lunchSlot = await getLunchSlotAsync(year, semesterId);
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  let html = '<div class="schedule-table-wrapper">';
  html += '<table class="schedule-table">';
  html += '<thead><tr>';
  html += '<th class="day-header">วัน/เวลา</th>';
  displayPeriods.forEach(({ display, actual, label }) => {
    html += `<th class="period-header"><div class="period-info"><span class="period-number">คาบ ${display}</span><span class="time-slot">${label}</span></div></th>`;
    if (actual === 4) {
      html += `<th class="lunch-header lunch-column"><div class="lunch-info">${lunchSlot.label}<br><small>${lunchSlot.time}</small></div></th>`;
    }
  });
  html += '</tr></thead>';

  html += '<tbody>';
  days.forEach((dayName, dayIndex) => {
    const day = dayIndex + 1;
    html += `<tr class="day-row" data-day="${day}">`;
    html += `<td class="day-cell">${dayName}</td>`;

    displayPeriods.forEach(({ display, actual }) => {
      const period = actual;
      const cell = matrix[day]?.[period];
      if (cell) {
        const subjectCode =
          cell.subject?.subject_code ||
          cell.subject?.subject_name?.substring(0, 6) ||
          cell.schedule?.subject_code ||
          '-';
        const teacherName = cell.teacher?.name || '';
        const roomName = String(cell.room?.name || cell.schedule?.room_name || '');

        html += `<td class="schedule-cell has-subject" data-day="${day}" data-period="${period}" data-display-period="${display}">
          <div class="schedule-cell-content">
            <div class="subject-code">${subjectCode}</div>
            <div class="teacher-name">${teacherName}</div>
            <div class="room-info">${roomName}</div>
          </div>
        </td>`;
      } else {
        html += `<td class="schedule-cell empty" data-day="${day}" data-period="${period}" data-display-period="${display}">
          <div class="empty-cell">-</div>
        </td>`;
      }

      if (period === 4 && dayIndex === 0) {
        html += `<td class="lunch-cell lunch-column" aria-label="${lunchSlot.label} ${lunchSlot.time}" rowspan="${days.length}">${lunchSlot.label}<br><small>${lunchSlot.time}</small></td>`;
      }
    });

    html += '</tr>';
  });
  html += '</tbody>';
  html += '</table></div>';

  tableContainer.innerHTML = html;
  try {
    fitStudentTableFonts(tableContainer);
  } catch (error) {
    console.warn('[StudentSchedule] font fit failed:', error);
  }

  renderSubjectLegend(resultData, context);

  const emptyState = document.getElementById('student-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  const errorState = document.getElementById('student-error');
  if (errorState) errorState.classList.add('hidden');
}

function renderSubjectLegend(resultData) {
  const legendHost = document.getElementById('student-schedule-legend');
  if (!legendHost) return;

  const matrix = resultData?.matrix;
  if (!matrix) {
    legendHost.innerHTML = '';
    legendHost.classList.add('hidden');
    return;
  }

  const subjectsMap = new Map();

  Object.values(matrix).forEach((daySchedule) => {
    Object.values(daySchedule).forEach((cell) => {
      if (cell && cell.subject) {
        const subjectCode =
          cell.subject.subject_code ||
          cell.subject.subject_name?.substring(0, 6) ||
          cell.schedule?.subject_code ||
          '';
        const subjectName =
          cell.subject.subject_name ||
          cell.schedule?.subject_name ||
          '';

        if (subjectCode && !subjectsMap.has(subjectCode)) {
          subjectsMap.set(subjectCode, {
            code: subjectCode,
            name: subjectName || '-'
          });
        }
      }
    });
  });

  const subjects = Array.from(subjectsMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code, 'th')
  );

  if (subjects.length === 0) {
    legendHost.innerHTML = '';
    legendHost.classList.add('hidden');
    return;
  }

  legendHost.innerHTML = `
    <h4>📚 คำอธิบายรหัสวิชา</h4>
    <div class="student-legend-grid">
      ${subjects
        .map(
          (subject) => `
        <div class="student-legend-item">
          <span class="subject-code">${subject.code}</span>
          <span class="subject-name">${subject.name}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `;
  legendHost.classList.remove('hidden');
}

function fitStudentTableFonts(container) {
  if (!container) return;

  const textElements = container.querySelectorAll('.subject-name, .teacher-name');
  const contents = container.querySelectorAll('.schedule-cell-content');
  if (!textElements.length || !contents.length) return;

  const subjectsFitAt = (px) => {
    const metaPx = Math.max(Math.round(px * 0.85), px - 2, 8);
    container.style.setProperty('--subject-font', px + 'px');
    container.style.setProperty('--schedule-meta-font', metaPx + 'px');
    void container.offsetHeight;

    let ok = true;
    textElements.forEach((element) => {
      if (!ok) return;
      const margin = 4;
      const available =
        (element.clientWidth || element.parentElement?.clientWidth || 0) - margin;
      const needed = element.scrollWidth;
      if (needed - available > 1) ok = false;
    });

    if (ok) {
      contents.forEach((content) => {
        if (!ok) return;
        const cell = content.closest('td');
        const maxHeight = (cell?.clientHeight || 64) - 4;
        if (content.scrollHeight > maxHeight) ok = false;
      });
    }
    return ok;
  };

  const maxPx = 18;
  const minPx = 6;
  let chosen = 12;

  for (let size = maxPx; size >= minPx; size -= 1) {
    if (subjectsFitAt(size)) {
      chosen = size;
      break;
    }
  }

  const finalSubject = chosen;
  container.style.setProperty('--subject-font', finalSubject + 'px');
  container.style.removeProperty('--teacher-font');
  container.style.setProperty(
    '--schedule-meta-font',
    Math.max(Math.round(chosen * 0.85), chosen - 2, 8) + 'px'
  );
  container.style.removeProperty('--room-font');
}

function getScheduleContainer() {
  return (
    document.getElementById('student-schedule-table') ||
    document.getElementById('schedule-table-container')
  );
}

export async function generateScheduleTable(scheduleData, className, context) {
  const year = context?.currentYear || context?.year;
  const semesterId =
    context?.currentSemester?.id ||
    context?.semester?.id ||
    context?.semesterId;
  const displayPeriods = await getDisplayPeriodsAsync(year, semesterId);
  const lunchSlot = await getLunchSlotAsync(year, semesterId);
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  const scheduleMatrix = createScheduleMatrix(scheduleData);

  let tableHTML = `
    <div class="schedule-table-wrapper">
      <table class="schedule-table">
        <thead>
          <tr>
            <th class="time-header">เวลา</th>
            ${days.map((day) => `<th class="day-header">${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  displayPeriods.forEach(({ display, actual, label }) => {
    const period = actual;
    const lunchTimeDisplay = `${label}`;
    tableHTML += `
      <tr>
        <td class="time-cell">${label}</td>
        ${days
          .map((_, dayIndex) => {
            const dayNumber = dayIndex + 1;
            const cellData = scheduleMatrix[dayNumber]?.[period];
            if (cellData) {
              return `
                <td class="schedule-cell" data-day="${dayNumber}" data-period="${period}">
                  ${formatScheduleCell(cellData.subject, cellData.teacher, cellData.room, context)}
                </td>
              `;
            }
            return `
              <td class="schedule-cell empty" data-day="${dayNumber}" data-period="${period}">
                <div class="empty-cell">-</div>
              </td>
            `;
          })
          .join('')}
      </tr>
    `;

    if (period === 4) {
      tableHTML += `<tr class="lunch-row"><td colspan="6">${lunchSlot.label} ${lunchTimeDisplay}</td></tr>`;
    }
  });

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  return tableHTML;
}

export function formatScheduleCell(subject, teacher, room, context) {
  return `
    <div class="schedule-cell-content">
      <div class="subject-name">${subject?.subject_name || 'ไม่ระบุวิชา'}</div>
      <div class="teacher-name">${teacher?.name || 'ไม่ระบุครู'}</div>
      <div class="room-info">
        ${
          room
            ? `
          ${room.name || ''}
          <span class="badge ${getRoomTypeBadgeClass(room.room_type)}">
            ${room.room_type}
          </span>
        `
            : 'ไม่ระบุห้อง'
        }
      </div>
    </div>
  `;
}

export function renderEmptyScheduleState(className, context) {
  renderContextControls(context);
  const tableContainer = getScheduleContainer();
  if (tableContainer) {
    tableContainer.innerHTML = '';
  }
  const legendHost = document.getElementById('student-schedule-legend');
  if (legendHost) {
    legendHost.innerHTML = '';
    legendHost.classList.add('hidden');
  }

  const headerContainer = document.getElementById('student-schedule-header');
  if (headerContainer) {
    headerContainer.classList.add('hidden');
  }

  const emptyState = document.getElementById('student-empty-state');
  if (emptyState) {
    emptyState.style.display = 'block';
    const message = emptyState.querySelector('p');
    if (message) {
      const semester = context.currentSemester?.semester_name || '';
      const year = context.currentYear || '';
      message.textContent = className
        ? `ไม่พบตารางเรียนสำหรับห้อง ${className} ${
            semester || year ? `(${semester ? `${semester} ` : ''}${year})` : ''
          }`
        : 'กรุณาเลือกห้องเรียนเพื่อดูตารางเรียน';
    }
  }
  const errorContainer = document.getElementById('student-error');
  if (errorContainer) {
    errorContainer.classList.add('hidden');
  }
}

export function highlightCurrentPeriod(context) {
  if (!isActiveSemester(context.currentSemester)) return;

  const today = new Date();
  const dayOfWeek = today.getDay();
  const currentDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  if (currentDay > 5) return;

  const currentTime = today.getHours() * 60 + today.getMinutes();
  const displayPeriods = getDisplayPeriods();
  const timePeriods = displayPeriods.map(({ actual, label }) => {
    const [start, end] = label.split('-').map((time) => {
      const [hours, minutes] = time.trim().split(':').map(Number);
      return hours * 60 + minutes;
    });
    return { start, end, period: actual };
  });

  const lunchSlot = getLunchSlot();
  timePeriods.push({
    start: lunchSlot.startMinutes || 720,
    end: lunchSlot.endMinutes || 780,
    period: lunchSlot.period
  });

  const currentPeriod = timePeriods.find(
    (slot) => currentTime >= slot.start && currentTime <= slot.end
  );

  if (currentPeriod) {
    const selector = `[data-day="${currentDay}"][data-period="${currentPeriod.period}"]`;
    const cell = document.querySelector(selector);
    if (cell) {
      cell.classList.add('current-period');
      cell.style.animation = 'pulse 2s infinite';
    }
  }
}

export function setLoading(isLoading) {
  const loadingIndicator = document.getElementById('student-loading');
  if (loadingIndicator) {
    loadingIndicator.classList.toggle('hidden', !isLoading);
  }
  if (isLoading) {
    const emptyState = document.getElementById('student-empty-state');
    if (emptyState) {
      emptyState.style.display = 'none';
    }
    const errorContainer = document.getElementById('student-error');
    if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
  }
}

export function showError(message) {
  const loadingIndicator = document.getElementById('student-loading');
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }
  const errorContainer = document.getElementById('student-error');
  if (!errorContainer) return;

  const emptyState = document.getElementById('student-empty-state');
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  const legendHost = document.getElementById('student-schedule-legend');
  if (legendHost) {
    legendHost.innerHTML = '';
    legendHost.classList.add('hidden');
  }

  const messageElement =
    errorContainer.querySelector('.error-message') || errorContainer;
  messageElement.textContent = message;
  errorContainer.classList.remove('hidden');
}

export function clearScheduleDisplay() {
  const tableContainer = getScheduleContainer();
  if (tableContainer) {
    tableContainer.innerHTML = '';
  }
  const legendHost = document.getElementById('student-schedule-legend');
  if (legendHost) {
    legendHost.innerHTML = '';
    legendHost.classList.add('hidden');
  }
  const headerContainer = document.getElementById('student-schedule-header');
  if (headerContainer) {
    headerContainer.classList.add('hidden');
  }
  const selectedName = document.getElementById('selected-class-name');
  if (selectedName) {
    selectedName.textContent = '-';
  }
  const emptyState = document.getElementById('student-empty-state');
  if (emptyState) {
    emptyState.style.display = 'block';
  }
  const errorContainer = document.getElementById('student-error');
  if (errorContainer) {
    errorContainer.classList.add('hidden');
  }
}

function createScheduleMatrix(scheduleData) {
  const matrix = {};

  scheduleData.forEach((item) => {
    const day = item.day || item.day_of_week;
    const period = item.period;

    if (!matrix[day]) {
      matrix[day] = {};
    }

    matrix[day][period] = {
      subject: {
        subject_name: item['วิชา'] || item.subject_name,
        subject_code: item['รหัสวิชา'] || item.subject_code
      },
      teacher: {
        name: item['ครู'] || item.teacher_name
      },
      room: {
        name: item['ห้อง'] ? item['ห้อง'].split(' (')[0] : item.room_name || '',
        room_type: item.room_type || extractRoomType(item['ห้อง'])
      }
    };
  });

  return matrix;
}

function extractRoomType(roomString) {
  if (!roomString) return 'CLASS';

  if (roomString.includes('TECH')) return 'TECH';
  if (roomString.includes('เทค')) return 'TECH';
  if (roomString.includes('คอม')) return 'TECH';

  return 'CLASS';
}
