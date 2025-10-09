import adminState from './state.js';

export function getFullName(teacher) {
  if (!teacher) return 'Unknown';
  const firstName = teacher.f_name || '';
  const lastName = teacher.l_name || '';
  return `${firstName} ${lastName}`.trim() || 'Unknown';
}

export function getRoleDisplayName(role) {
  const roleMap = {
    teacher: 'ครู',
    head_teacher: 'หัวหน้าครู',
    admin: 'ผู้ดูแลระบบ',
    super_admin: 'ผู้ดูแลระบบสูงสุด'
  };
  return roleMap[role] || role || 'ครู';
}

export function normalizeTeacherNameString(name) {
  if (typeof name !== 'string') return '';
  const cleaned = name.trim().replace(/\s{2,}/g, ' ');
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  if (parts.length <= 1) {
    return cleaned;
  }

  const [first, second, ...rest] = parts;
  const normalizedFirst = first.trim();
  const normalizedSecond = second.trim();
  const titleCandidates = new Set([
    'นาย', 'นาง', 'นางสาว', 'ครู', 'คุณ',
    'ดร.', 'ดร', 'ผศ.', 'รศ.', 'ศ.', 'อาจารย์',
    'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'dr', 'dr.'
  ]);

  const firstLower = normalizedFirst.toLowerCase();
  if (!titleCandidates.has(firstLower)) {
    return cleaned;
  }

  const mergedFirst = `${normalizedFirst}${normalizedSecond}`;
  return [mergedFirst, ...rest].join(' ');
}

export function formatTeacherName(teacher) {
  if (!teacher) return '';

  const title = typeof teacher.title === 'string' ? teacher.title.trim() : '';
  const first = typeof teacher.f_name === 'string' ? teacher.f_name.trim() : '';
  const last = typeof teacher.l_name === 'string' ? teacher.l_name.trim() : '';

  const nameParts = [];

  if (title && first) {
    nameParts.push(`${title}${first}`);
  } else {
    if (title) nameParts.push(title);
    if (first) nameParts.push(first);
  }

  if (last) {
    nameParts.push(last);
  }

  if (nameParts.length) {
    return nameParts.join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  const fullName = typeof teacher.full_name === 'string' ? teacher.full_name.trim() : '';
  if (fullName) {
    const normalized = normalizeTeacherNameString(fullName);
    if (normalized) {
      return normalized;
    }
  }

  const simpleName = typeof teacher.name === 'string' ? teacher.name.trim() : '';
  if (simpleName) {
    const normalized = normalizeTeacherNameString(simpleName);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

export function getTeacherDisplayNameById(teacherId) {
  const teacher = adminState.teachers.find(item => Number(item.id) === Number(teacherId));
  if (!teacher) {
    return '';
  }

  return formatTeacherName(teacher) || '';
}

export function getClassDisplayNameById(classId) {
  const cls = adminState.classes.find(item => Number(item.id) === Number(classId));
  if (!cls) {
    return `ห้อง #${classId}`;
  }

  if (cls.display_name) {
    return cls.display_name;
  }

  if (cls.class_name) {
    return cls.class_name;
  }

  const grade = cls.grade_level || '';
  const section = cls.section ? `/${cls.section}` : '';
  const label = `${grade}${section}`.trim();
  return label || `ห้อง #${classId}`;
}

export function getRoomDisplayNameById(roomId) {
  const room = adminState.rooms.find(item => Number(item.id) === Number(roomId));
  if (!room) {
    return `ห้อง #${roomId}`;
  }

  return room.display_name || room.room_name || `ห้อง #${roomId}`;
}
