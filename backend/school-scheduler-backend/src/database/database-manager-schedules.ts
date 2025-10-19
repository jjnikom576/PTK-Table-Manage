import type {
  DatabaseResult,
  Schedule,
  CreateScheduleRequest
} from '../interfaces';
import { DatabaseManagerBase, Constructor } from './database-manager-base';

export function DatabaseManagerSchedulesMixin<TBase extends Constructor<DatabaseManagerBase>>(Base: TBase) {
  return class extends Base {
    protected async checkScheduleConflicts(data: CreateScheduleRequest, year: number): Promise<string[]> {
      const conflicts: string[] = [];
      const tableName = `schedules_${year}`;

      try {
        const teacherConflict = await this.db
          .prepare(`
            SELECT 1 FROM ${tableName}
            WHERE semester_id = ? AND day_of_week = ? AND period_no = ?
              AND subject_id IN (
                SELECT id FROM subjects_${year}
                WHERE teacher_id = (SELECT teacher_id FROM subjects_${year} WHERE id = ?)
                  AND semester_id = ?
              )
          `)
          .bind(data.semester_id, data.day_of_week, data.period_no, data.subject_id, data.semester_id)
          .first();

        if (teacherConflict) {
          conflicts.push('Teacher is already scheduled');
        }

        const classConflict = await this.db
          .prepare(`
            SELECT 1 FROM ${tableName} sched
            JOIN subjects_${year} sub1 ON sched.subject_id = sub1.id
            JOIN subjects_${year} sub2 ON sub2.id = ?
            WHERE sched.semester_id = ?
              AND sched.day_of_week = ?
              AND sched.period_no = ?
              AND sub1.class_id = sub2.class_id
          `)
          .bind(data.subject_id, data.semester_id, data.day_of_week, data.period_no)
          .first();

        if (classConflict) {
          conflicts.push('Class is already scheduled');
        }
      } catch (error) {
        console.error('Error checking schedule conflicts:', error);
      }

      return conflicts;
    }

    async createSchedule(data: CreateScheduleRequest, forYear?: number): Promise<DatabaseResult<Schedule>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);
        await this.ensureDefaultPeriodsForSemester(year, data.semester_id);

        const tableName = `schedules_${year}`;
        const periodsTable = `periods_${year}`;

        const periodExists = await this.db
          .prepare(`SELECT 1 FROM ${periodsTable} WHERE semester_id = ? AND period_no = ? AND is_active = 1`)
          .bind(data.semester_id, data.period_no)
          .first();

        if (!periodExists) {
          return { success: false, error: 'Selected period does not exist for this semester' };
        }

        const conflicts = await this.checkScheduleConflicts(data, year);
        if (conflicts.length > 0) {
          return {
            success: false,
            error: `Schedule conflicts detected: ${conflicts.join(', ')}`
          };
        }

        const result = await this.db
          .prepare(`
          INSERT INTO ${tableName} (
            semester_id,
            subject_id,
            class_id,
            day_of_week,
            period_no,
            room_id,
            is_active,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
          .bind(
            data.semester_id,
            data.subject_id,
            data.class_id ?? null,
            data.day_of_week,
            data.period_no,
            data.room_id ?? null
          )
          .run();

        const newSchedule = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(result.meta.last_row_id)
          .first<Schedule>();

        return { success: true, data: newSchedule! };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getSchedulesBySemester(semesterId: number): Promise<DatabaseResult<any[]>> {
      try {
        const year = await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);
        await this.ensureDefaultPeriodsForSemester(year, semesterId);
        const tableName = `schedules_${year}`;

        const schedules = await this.db
          .prepare(`
          SELECT 
            sch.id,
            sch.semester_id,
            sch.subject_id,
            sch.class_id,
            sch.day_of_week,
            sch.period_no AS period,
            sch.room_id,
            sch.created_at,
            sch.updated_at,
            sub.subject_name,
            sub.subject_code,
            sub.class_ids,
            sub.teacher_id,
            t.full_name as teacher_name,
            c.class_name,
            r.room_name,
            p.period_name,
            p.start_time,
            p.end_time
          FROM ${tableName} sch
          JOIN subjects_${year} sub ON sch.subject_id = sub.id
          JOIN teachers_${year} t ON sub.teacher_id = t.id
          JOIN classes_${year} c ON sch.class_id = c.id
          LEFT JOIN rooms_${year} r ON sch.room_id = r.id
          JOIN periods_${year} p ON p.semester_id = sch.semester_id AND p.period_no = sch.period_no AND p.is_active = 1
          WHERE sch.semester_id = ?
          ORDER BY sch.day_of_week, sch.period_no
        `)
          .bind(semesterId)
          .all();

        return { success: true, data: schedules.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getSchedulesBySemesterForYear(semesterId: number, year: number): Promise<DatabaseResult<any[]>> {
      try {
        await this.ensureDynamicTablesExist(year);
        await this.ensureDefaultPeriodsForSemester(year, semesterId);
        const tableName = `schedules_${year}`;
        const schedules = await this.db
          .prepare(`
          SELECT 
            sch.id,
            sch.semester_id,
            sch.subject_id,
            sch.class_id,
            sch.day_of_week,
            sch.period_no AS period,
            sch.room_id,
            sch.created_at,
            sch.updated_at,
            sub.subject_name,
            sub.subject_code,
            sub.class_ids,
            sub.teacher_id,
            t.full_name as teacher_name,
            c.class_name,
            r.room_name,
            p.period_name,
            p.start_time,
            p.end_time
          FROM ${tableName} sch
          JOIN subjects_${year} sub ON sch.subject_id = sub.id
          JOIN teachers_${year} t ON sub.teacher_id = t.id
          JOIN classes_${year} c ON sch.class_id = c.id
          LEFT JOIN rooms_${year} r ON sch.room_id = r.id
          JOIN periods_${year} p ON p.semester_id = sch.semester_id AND p.period_no = sch.period_no AND p.is_active = 1
          WHERE sch.semester_id = ?
          ORDER BY sch.day_of_week, sch.period_no
        `)
          .bind(semesterId)
          .all();

        return { success: true, data: schedules.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async deleteSchedule(scheduleId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
      try {
        const year = forYear ?? await this.getActiveYear();
        const tableName = `schedules_${year}`;

        const result = await this.db
          .prepare(`DELETE FROM ${tableName} WHERE id = ?`)
          .bind(scheduleId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Schedule not found' };
        }

        return { success: true, data: { message: 'Schedule deleted successfully' } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  };
}
