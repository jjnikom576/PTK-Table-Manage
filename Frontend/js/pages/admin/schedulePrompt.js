import scheduleAPI from '../../api/schedule-api.js';
import adminState from './state.js';
import { loadTeachersData } from './teacherManagement.js';
import { loadClassesData, renderClassesTable } from './classManagement.js';
import { loadRoomsData, renderRoomsTable } from './roomManagement.js';
import { loadSubjectsData, renderSubjectsTable, getActiveAdminContext } from './subjectManagement.js';
import { loadPeriodsData, renderPeriodsTable } from './periodManagement.js';
import {
  getClassDisplayNameById,
  getTeacherDisplayNameById,
  getRoomDisplayNameById,
  normalizeTeacherNameString
} from './entityHelpers.js';

export function initSchedulePromptTools() {
  const button = document.getElementById('btn-generate-ai');

  if (!button) {
    console.warn('⚠️ Schedule prompt button not found in DOM');
    return;
  }

  if (!button.textContent || !button.textContent.trim()) {
    button.textContent = '🧠 Generate Prompt';
  }

  if (button.dataset.bound === 'true') {
    return;
  }

  button.addEventListener('click', handleGenerateSchedulePrompt);
  button.dataset.bound = 'true';
}

async function handleGenerateSchedulePrompt() {
  const button = document.getElementById('btn-generate-ai');
  if (!button) {
    return;
  }

  if (adminState.isGeneratingSchedulePrompt) {
    return;
  }

  const originalLabel = button.textContent;

  try {
    adminState.isGeneratingSchedulePrompt = true;
    button.disabled = true;
    button.textContent = '⏳ Preparing prompt...';

    const { year, semesterId } = getActiveAdminContext();
    const semesterName = adminState.activeSemester?.name
      || adminState.activeSemester?.semester_name
      || adminState.context?.semester?.name
      || adminState.context?.semester?.semester_name
      || null;

    if (!year) {
      alert('กรุณาเลือกปีการศึกษาปัจจุบันก่อนสร้าง Prompt');
      return;
    }

    if (!semesterId) {
      alert('กรุณาเลือกภาคเรียนที่ใช้งานอยู่ก่อนสร้าง Prompt');
      return;
    }

    await ensureSchedulePromptData(year, semesterId);

    const dataset = buildSchedulePromptDataset(year, semesterId, semesterName);

    if (!dataset.subjects || dataset.subjects.length === 0) {
      alert('ไม่พบรายวิชาสำหรับภาคเรียนนี้ กรุณาตรวจสอบข้อมูลก่อนค่ะ');
      return;
    }

    const promptText = buildSchedulePromptText(dataset);
    const downloaded = downloadPromptFile(promptText, year, semesterId);
    if (downloaded) {
      alert('สร้าง Prompt สำเร็จแล้ว! ตรวจสอบไฟล์ .txt ที่ดาวน์โหลดเพื่อใช้งานกับ AI');
    }
  } catch (error) {
    console.error('❌ Error generating schedule prompt:', error);
    alert('เกิดข้อผิดพลาดในการสร้าง Prompt กรุณาลองอีกครั้ง');
  } finally {
    adminState.isGeneratingSchedulePrompt = false;
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

async function ensureSchedulePromptData(year, semesterId) {
  try {
    if (typeof scheduleAPI.invalidateCacheByPattern === 'function') {
      scheduleAPI.invalidateCacheByPattern(`subjects_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`teachers_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`classes_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`rooms_${year}_`);
      scheduleAPI.invalidateCacheByPattern(`periods_${year}_`);
    }
  } catch (cacheError) {
    console.warn('⚠️ Unable to invalidate schedule cache before prompt generation:', cacheError);
  }

  await loadTeachersData();
  await loadClassesData();
  await loadRoomsData();
  await loadPeriodsData();
  await loadSubjectsData();

  renderClassesTable();
  renderRoomsTable();
  renderPeriodsTable();
  renderSubjectsTable();
}

function buildSchedulePromptDataset(year, semesterId, semesterName) {
  const scheduleTableName = `schedules_${year}`;
  const generatedAt = new Date().toISOString();

  const subjectsRaw = Array.isArray(adminState.subjectsRaw) ? adminState.subjectsRaw : [];

  const subjects = subjectsRaw
    .filter(subject => Number(subject.semester_id) === Number(semesterId))
    .map(subject => {
      const classIds = parseNumericArray(subject.class_ids, subject.class_id);
      const classNames = classIds.map(id => getClassDisplayNameById(id)).filter(Boolean);
      const teacherName = getTeacherDisplayNameById(subject.teacher_id)
        || normalizeTeacherNameString(subject.teacher_name)
        || null;

      const defaultRoomId = subject.default_room_id != null ? Number(subject.default_room_id) : null;

      return {
        id: subject.id != null ? Number(subject.id) : null,
        group_key: subject.group_key || null,
        subject_name: subject.subject_name || '',
        subject_code: subject.subject_code || null,
        subject_group: subject.subject_group || null,
        teacher_id: subject.teacher_id != null ? Number(subject.teacher_id) : null,
        teacher_name: teacherName,
        class_ids: classIds,
        class_names: classNames,
        default_room_id: defaultRoomId,
        room_name: getRoomDisplayNameById(defaultRoomId) || subject.room_name || null,
        periods_per_week: Number(subject.periods_per_week ?? subject.period_per_week ?? subject.period) || null,
        special_requirements: subject.special_requirements || subject.notes || subject.requirements || null,
        flags: {
          is_activity: Boolean(subject.is_activity || subject.is_activity_subject),
          is_scout: Boolean(subject.is_scout || subject.subject_code === 'SCOUT'),
          allow_merge: Boolean(subject.allow_merge || subject.is_shared_class)
        }
      };
    });

  const periods = Array.isArray(adminState.periods) ? adminState.periods.map(period => ({
    id: period.id ?? period.period_id ?? null,
    period_no: Number(period.period_no ?? period.period ?? 0),
    period_name: period.period_name || '',
    start_time: period.start_time || '',
    end_time: period.end_time || ''
  })) : [];

  return {
    generated_at: generatedAt,
    metadata: {
      year,
      semester_id: semesterId,
      semester_name: semesterName,
      schedule_table: scheduleTableName,
      total_subjects: subjects.length,
      total_periods: periods.length
    },
    subjects,
    periods,
    teachers: Array.isArray(adminState.teachers) ? adminState.teachers : [],
    classes: Array.isArray(adminState.classes) ? adminState.classes : [],
    rooms: Array.isArray(adminState.rooms) ? adminState.rooms : []
  };
}

function buildSchedulePromptText(dataset) {
  const context = dataset.metadata;

  const lines = [
    '## Objective',
    `สร้างตารางสอนสำหรับปีการศึกษา ${context.year} ภาคเรียน ${context.semester_name || context.semester_id} โดยใช้ข้อมูลต่อไปนี้`,
    '',
    '## Requirements',
    '1. รายวิชาแต่ละวิชาต้องสอดคล้องกับจำนวนคาบที่กำหนด (periods_per_week) โดยเฉพาะวิชา “กิจกรรม” ให้ลง 1 คาบ/สัปดาห์ (คาบสุดท้ายวันพุธ)',
    '2. วิชาที่มี class_ids มากกว่า 1 แปลว่าเป็นการสอนรวม ให้ใช้ room_id เดียวกันและลงพร้อมกัน',
    '3. วิชาลูกเสือ/กิจกรรมที่ flagged ไว้ให้ลงคาบสุดท้ายของวันพุธ (day_of_week=3, period=last).',
    '4. ค่า room_id ต้องมาจาก rooms ดังนี้',
    '   - ถ้าวิชามี default_room_id ให้ใช้ห้องนั้น',
    '   - ถ้าไม่มี ให้ใช้ห้องประจำชั้น (HR) ของแต่ละ class_id',
    '   - ถ้าไม่มี HR ให้ set room_id = NULL',
    '',
    '5. ข้อกำหนดพิเศษ:',
    '   - วิชากิจกรรม (flags.is_activity=true) ใช้วันพุธคาบสุดท้ายเท่านั้น',
    '   - ถ้ามี teacher_name เหมือนกัน ให้ลงตารางโดยไม่ชนกัน',
    '   - ถ้า room_id = NULL (ในวิชาปกติ) ให้จัดลงห้องประจำชั้น (HR) ของ class_id นั้น ๆ',
    '   - ถ้าไม่พบ HR จริง ให้คง room_id = NULL',
    '',
    '6. วัน–เวลา:',
    '   - ใช้เฉพาะวันจันทร์–พฤหัส (day_of_week ∈ {1,2,3,4})',
    '   - วันศุกร์ (day_of_week=5) = Playday ห้ามมีคาบเรียน',
    '   - ห้ามมีเรียนวันเสาร์ (6) และอาทิตย์ (7)',
    '   - ห้ามใช้คาบที่เป็นพัก/กลางวัน (period_name มีคำว่า “พัก/กลางวัน/Lunch/Break”)',
    '   - ต้องใช้เฉพาะ period_no ที่อยู่ใน periods ของ dataset',
    '',
    '7. ตรวจสอบซ้ำ:',
    '   - ห้ามซ้ำ (class_id, day_of_week, period_no)',
    '   - ห้ามซ้ำ (room_id, day_of_week, period_no) ยกเว้นลูกเสือ/กิจกรรม',
    '   - ครู 1 คน ห้ามซ้ำ (teacher_id, day_of_week, period_no) ยกเว้นลูกเสือ',
    '',
    '8. Summary Schema Rule:',
    '   - 1 ห้องเรียน (room_id) ในเวลาหนึ่ง สอนได้แค่ 1 ชั้นเรียน (ยกเว้นลูกเสือ/กิจกรรมตามข้อ 3)',
    '',
    '9. ถ้า periods_per_week ของ “กิจกรรม” มากกว่า 1 ให้ใช้แค่ 1 คาบ (Wed-last)',
    '',
    '10. ถ้าวิชาต่างกันแต่เป็นชั้นเดียวกัน ต้องใช้ห้องต่างกันหรือเวลาต่างกัน',
    '',
    '## Dataset (คัดลอกไปวางใน Prompt ได้เลย)',
    '```json',
    JSON.stringify(dataset, null, 2),
    '```',
    '',
    '## Output Format Example',
    '11. Output: ต้องตอบกลับเป็น SQL คำสั่ง INSERT เท่านั้น',
    `   INSERT INTO ${context.schedule_table} (semester_id, subject_id, class_id, day_of_week, period_no, room_id)`,
    `   VALUES (${context.semester_id}, 366, 11, 1, 1, 11), (${context.semester_id}, 168, 17, 1, 2, 17), ...;`,
    '   - 1 แถวต่อ 1 คาบเรียน',
    ''
  ];

  return lines.filter(Boolean).join('\n');
}

function downloadPromptFile(content, year, semesterId) {
  if (!content) {
    return false;
  }

  const filename = `schedule_prompt_${year}_semester-${semesterId}.txt`;

  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const urlFactory = window.URL || window.webkitURL;
    const url = urlFactory.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);

    requestAnimationFrame(() => {
      try {
        link.click();
      } finally {
        document.body.removeChild(link);
        urlFactory.revokeObjectURL(url);
      }
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Automatic download failed, falling back to new window.', error);
    const encoded = encodeURIComponent(content);
    const fallbackWindow = window.open(`data:text/plain;charset=utf-8,${encoded}`, '_blank');
    if (!fallbackWindow) {
      try {
        navigator.clipboard?.writeText(content);
        alert('ไม่สามารถดาวน์โหลดไฟล์ได้ ระบบได้คัดลอก Prompt ไว้ในคลิปบอร์ดแล้ว');
        return false;
      } catch (_) {
        alert('ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาคัดลอก Prompt ด้วยตนเอง:\n\n' + content.substring(0, 5000));
        return false;
      }
    } else {
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้อัตโนมัติ จึงเปิด Prompt ในแท็บใหม่แทน');
      return false;
    }
  }
}

function parseNumericArray(arrayLike, fallback) {
  if (Array.isArray(arrayLike)) {
    return arrayLike
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));
  }

  if (typeof arrayLike === 'string') {
    const trimmed = arrayLike.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map(value => Number(value))
            .filter(value => Number.isFinite(value));
        }
      } catch (_) {
        // ignore JSON parse error, fall back to comma split
      }
    }

    if (trimmed.length > 0) {
      return trimmed
        .split(',')
        .map(value => Number(value.trim()))
        .filter(value => Number.isFinite(value));
    }
  }

  if (fallback != null) {
    const num = Number(fallback);
    if (Number.isFinite(num)) {
      return [num];
    }
  }

  return [];
}

export { buildSchedulePromptDataset, buildSchedulePromptText, downloadPromptFile };
