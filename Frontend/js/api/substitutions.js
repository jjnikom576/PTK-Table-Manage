import scheduleAPI from './schedule-api.js';

const today = () => new Date().toISOString().slice(0, 10);

export async function getSubstitutions() {
  try {
    const result = await scheduleAPI.getSubstitutionsByDate(today());
    if (result.success) {
      const data = Array.isArray(result.data?.absent_teachers) ? result.data.absent_teachers : [];
      return { ok: true, data };
    }
    return { ok: false, error: result.error || 'ไม่สามารถโหลดข้อมูลการสอนแทนได้' };
  } catch (error) {
    console.error('[SubstitutionsAPI] Failed to load substitutions:', error);
    return { ok: false, error: error.message };
  }
}

export async function getSubstitutionSchedules() {
  try {
    const result = await scheduleAPI.getSubstitutionsByDate(today());
    if (result.success) {
      const schedules = Array.isArray(result.data?.absent_teachers)
        ? result.data.absent_teachers.flatMap((teacher) => teacher.periods || [])
        : [];
      return { ok: true, data: schedules };
    }
    return { ok: false, error: result.error || 'ไม่สามารถโหลดข้อมูลตารางสอนแทนได้' };
  } catch (error) {
    console.error('[SubstitutionsAPI] Failed to load substitution schedules:', error);
    return { ok: false, error: error.message };
  }
}

export async function getSubstitutionsByDateRange(_year, startDate, endDate) {
  try {
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    const aggregated = [];

    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const result = await scheduleAPI.getSubstitutionsByDate(dateStr);
      if (result.success && Array.isArray(result.data?.absent_teachers)) {
        aggregated.push(
          ...result.data.absent_teachers.map((entry) => ({ date: dateStr, ...entry }))
        );
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return { ok: true, data: aggregated };
  } catch (error) {
    console.error('[SubstitutionsAPI] Failed to load substitutions by date range:', error);
    return { ok: false, error: error.message };
  }
}
