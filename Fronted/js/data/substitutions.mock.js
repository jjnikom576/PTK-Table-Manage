// Enhanced Substitutions Mock Data - Multi-Year (2566-2568)
// การสอนแทน ม.1 ครบ 3 ปี 6 เทอม

export const substitutionsData = {
  // ปี 2566
  substitutions_2566: [
    {id: 1, semester_id: 1, absent_teacher_id: 1, absent_date: "2023-06-15", reason: "ลาป่วย", status: "completed", created_by: "admin", created_at: "2023-06-15T00:00:00Z"},
    {id: 2, semester_id: 1, absent_teacher_id: 2, absent_date: "2023-07-10", reason: "ประชุม", status: "completed", created_by: "admin", created_at: "2023-07-10T00:00:00Z"},
    {id: 3, semester_id: 1, absent_teacher_id: 4, absent_date: "2023-08-05", reason: "อบรม", status: "completed", created_by: "admin", created_at: "2023-08-05T00:00:00Z"},
    {id: 4, semester_id: 2, absent_teacher_id: 3, absent_date: "2023-12-20", reason: "ลาพักผ่อน", status: "completed", created_by: "admin", created_at: "2023-12-20T00:00:00Z"},
    {id: 5, semester_id: 2, absent_teacher_id: 5, absent_date: "2024-01-15", reason: "ไปราชการ", status: "completed", created_by: "admin", created_at: "2024-01-15T00:00:00Z"}
  ],

  substitution_schedules_2566: [
    {id: 1, substitution_id: 1, original_schedule_id: 1, substitute_teacher_id: 10, periods_count: 1, completed_at: "2023-06-15T08:20:00Z"},
    {id: 2, substitution_id: 1, original_schedule_id: 7, substitute_teacher_id: 10, periods_count: 1, completed_at: "2023-06-15T08:20:00Z"},
    {id: 3, substitution_id: 2, original_schedule_id: 2, substitute_teacher_id: 3, periods_count: 1, completed_at: "2023-07-10T09:10:00Z"},
    {id: 4, substitution_id: 3, original_schedule_id: 4, substitute_teacher_id: 3, periods_count: 1, completed_at: "2023-08-05T10:50:00Z"},
    {id: 5, substitution_id: 4, original_schedule_id: 3, substitute_teacher_id: 2, periods_count: 1, completed_at: "2023-12-20T10:00:00Z"}
  ],

  // ปี 2567
  substitutions_2567: [
    {id: 6, semester_id: 3, absent_teacher_id: 1, absent_date: "2024-06-10", reason: "ลาป่วย", status: "completed", created_by: "admin", created_at: "2024-06-10T00:00:00Z"},
    {id: 7, semester_id: 3, absent_teacher_id: 2, absent_date: "2024-07-05", reason: "ประชุม", status: "completed", created_by: "admin", created_at: "2024-07-05T00:00:00Z"},
    {id: 8, semester_id: 3, absent_teacher_id: 4, absent_date: "2024-08-15", reason: "อบรม", status: "completed", created_by: "admin", created_at: "2024-08-15T00:00:00Z"},
    {id: 9, semester_id: 4, absent_teacher_id: 7, absent_date: "2024-12-10", reason: "ลาป่วย", status: "completed", created_by: "admin", created_at: "2024-12-10T00:00:00Z"},
    {id: 10, semester_id: 4, absent_teacher_id: 3, absent_date: "2025-01-20", reason: "ประชุม", status: "completed", created_by: "admin", created_at: "2025-01-20T00:00:00Z"}
  ],

  substitution_schedules_2567: [
    {id: 6, substitution_id: 6, original_schedule_id: 200, substitute_teacher_id: 10, periods_count: 1, completed_at: "2024-06-10T08:20:00Z"},
    {id: 7, substitution_id: 7, original_schedule_id: 201, substitute_teacher_id: 3, periods_count: 1, completed_at: "2024-07-05T09:10:00Z"},
    {id: 8, substitution_id: 8, original_schedule_id: 203, substitute_teacher_id: 3, periods_count: 1, completed_at: "2024-08-15T10:50:00Z"},
    {id: 9, substitution_id: 9, original_schedule_id: 205, substitute_teacher_id: 8, periods_count: 1, completed_at: "2024-12-10T13:50:00Z"},
    {id: 10, substitution_id: 10, original_schedule_id: 208, substitute_teacher_id: 2, periods_count: 1, completed_at: "2025-01-20T10:00:00Z"}
  ],

  // ปี 2568
  substitutions_2568: [
    {id: 11, semester_id: 5, absent_teacher_id: 7, absent_date: "2025-06-05", reason: "อบรม AI", status: "completed", created_by: "admin", created_at: "2025-06-05T00:00:00Z"},
    {id: 12, semester_id: 5, absent_teacher_id: 8, absent_date: "2025-07-10", reason: "ประชุมโรบอติกส์", status: "completed", created_by: "admin", created_at: "2025-07-10T00:00:00Z"}
  ],

  substitution_schedules_2568: [
    {id: 11, substitution_id: 11, original_schedule_id: 302, substitute_teacher_id: 1, periods_count: 1, completed_at: "2025-06-05T10:00:00Z"},
    {id: 12, substitution_id: 12, original_schedule_id: 309, substitute_teacher_id: 7, periods_count: 1, completed_at: "2025-07-10T10:50:00Z"}
  ]
};

// Helper Functions
export function getSubstitutionsByYear(year) {
  return {
    substitutions: substitutionsData[`substitutions_${year}`] || [],
    schedules: substitutionsData[`substitution_schedules_${year}`] || []
  };
}

export function getSubstitutionsBySemester(semesterId) {
  const allSubs = [...substitutionsData.substitutions_2566, ...substitutionsData.substitutions_2567, ...substitutionsData.substitutions_2568];
  return allSubs.filter(s => s.semester_id === semesterId);
}

export function calculateSubstituteStats(semesterId) {
  const subs = getSubstitutionsBySemester(semesterId);
  const allSubSchedules = [...substitutionsData.substitution_schedules_2566, ...substitutionsData.substitution_schedules_2567, ...substitutionsData.substitution_schedules_2568];
  
  const stats = {};
  allSubSchedules.forEach(schedule => {
    const sub = subs.find(s => s.id === schedule.substitution_id);
    if (sub) {
      const teacherId = schedule.substitute_teacher_id;
      if (!stats[teacherId]) stats[teacherId] = 0;
      stats[teacherId] += schedule.periods_count;
    }
  });
  
  return Object.entries(stats).map(([teacherId, count]) => ({
    teacher_id: parseInt(teacherId),
    substitute_count: count
  })).sort((a, b) => b.substitute_count - a.substitute_count);
}

export function getTopSubstituteTeachers(semesterId, limit = 10) {
  return calculateSubstituteStats(semesterId).slice(0, limit);
}

export function normalizeSubstitutionRowForExport(substitutionData, context) {
  return {
    'วันที่': substitutionData.absent_date,
    'ครูที่ขาด': context.absent_teacher_name,
    'เหตุผล': substitutionData.reason,
    'คาบ': context.period,
    'วิชา': context.subject_name,
    'ห้องเรียน': context.class_name,
    'ห้อง': context.room_name ? `${context.room_name} (${context.room_type})` : '-',
    'ครูสอนแทน': context.substitute_teacher_name,
    'สถานะ': substitutionData.status === 'completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ'
  };
}

export function getSubstitutionByDate(date, semesterId) {
  const subs = getSubstitutionsBySemester(semesterId);
  return subs.filter(s => s.absent_date === date);
}

// Hall of Fame calculation
export function getHallOfFameData(semesterId) {
  const stats = getTopSubstituteTeachers(semesterId, 3);
  const medals = ['🥇', '🥈', '🥉'];
  
  return stats.map((stat, index) => ({
    ...stat,
    rank: index + 1,
    medal: medals[index] || '🏅'
  }));
}

export default substitutionsData;