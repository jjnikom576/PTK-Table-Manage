export function getTeacherName(teacher) {
  if (!teacher) return 'ไม่ระบุครู';

  let name = '';

  if (teacher.title && teacher.f_name) {
    name = teacher.title + teacher.f_name;
  } else if (teacher.f_name) {
    name = teacher.f_name;
  } else if (teacher.title) {
    name = teacher.title;
  }

  if (teacher.l_name) {
    name = name ? `${name}  ${teacher.l_name}` : teacher.l_name;
  }

  if (!name) {
    name = teacher.full_name || teacher.name || 'ไม่ระบุครู';
  }

  return name;
}

export function scrollElementToViewportTop(element, offset = 0) {
  try {
    const rect = element.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const targetY = currentY + rect.top - (typeof offset === 'number' ? offset : 0);
    const safeY = Math.max(0, Math.min(targetY, document.body.scrollHeight - viewportH));

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: safeY, behavior: 'smooth' });
    } else if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  } catch (error) {
    console.warn('[TeacherSchedule] scrollElementToViewportTop failed:', error);
  }
}

export function centerElementInContainer(container, element) {
  if (!container || !element) return;
  try {
    const elementLeft = element.offsetLeft;
    const desired = elementLeft - (container.clientWidth / 2 - element.clientWidth / 2);
    const maxScroll = container.scrollWidth - container.clientWidth;
    const targetLeft = Math.max(0, Math.min(desired, maxScroll));

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } else {
      container.scrollLeft = targetLeft;
    }
  } catch (error) {
    console.warn('[TeacherSchedule] centerElementInContainer error:', error);
  }
}

export function getTeacherNameForExport(teacher) {
  if (!teacher) return 'ไม่ระบุครู';

  const fname = teacher.f_name || '';
  const lname = teacher.l_name || '';

  if (fname && lname) {
    return `${fname}  ${lname}`;
  }
  if (fname) {
    return fname;
  }
  if (lname) {
    return lname;
  }

  return 'ไม่ระบุครู';
}

export function getTeacherPrefixForExport(teacher) {
  if (!teacher || !teacher.f_name) return 'ครู';
  return /^[A-Za-z\s]+$/.test(teacher.f_name) ? 'T.' : 'ครู';
}

export function generateWorkloadHTML(scheduleData) {
  const validSchedules = scheduleData.schedules.filter((schedule) => {
    const periodNo = schedule.period_no || schedule.period;
    return periodNo >= 1 && periodNo <= 8;
  });

  const groupedMap = new Map();

  scheduleData.subjects.forEach((subject) => {
    const subjectSchedules = validSchedules.filter((schedule) => schedule.subject_id === subject.id);
    const classInfo = scheduleData.classes.find((cls) => cls.id === subject.class_id);

    const subjectCode = subject.subject_code || '';
    const subjectName = subject.subject_name || '';
    const groupKey = `${subjectCode}|${subjectName}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        subject,
        classes: [],
        totalPeriods: 0
      });
    }

    const group = groupedMap.get(groupKey);
    if (classInfo) {
      group.classes.push(classInfo);
    }
    group.totalPeriods += subjectSchedules.length;
  });

  const subjectSummary = Array.from(groupedMap.values())
    .map((group) => {
      const sortedClassNames = group.classes
        .map((cls) => cls.class_name || cls.name || 'ไม่ระบุห้อง')
        .sort((a, b) => a.localeCompare(b, 'th'));

      return `
        <tr>
          <td class="subject-code">${group.subject.subject_code || '-'}</td>
          <td class="subject-name">${group.subject.subject_name || '-'}</td>
          <td class="subject-classes">${sortedClassNames.join(', ')}</td>
          <td class="subject-periods">${group.totalPeriods}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table class="workload-summary-table">
      <thead>
        <tr>
          <th>รหัสวิชา</th>
          <th>ชื่อวิชา</th>
          <th>ห้องเรียน</th>
          <th>รวมคาบ</th>
        </tr>
      </thead>
      <tbody>
        ${subjectSummary || '<tr><td colspan="4">ไม่มีข้อมูลภาระงาน</td></tr>'}
      </tbody>
    </table>
  `;
}
