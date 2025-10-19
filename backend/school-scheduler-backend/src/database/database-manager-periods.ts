import type { DatabaseResult, Period, CreatePeriodRequest } from '../interfaces';
import { DatabaseManagerBase, Constructor } from './database-manager-base';

export function DatabaseManagerPeriodsMixin<TBase extends Constructor<DatabaseManagerBase>>(Base: TBase) {
  return class extends Base {
    async getPeriodsBySemester(semesterId: number, forYear?: number): Promise<DatabaseResult<Period[]>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);
        await this.ensureDefaultPeriodsForSemester(year, semesterId);

        const tableName = `periods_${year}`;
        const periods = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY period_no
        `)
          .bind(semesterId)
          .all<Period>();

        return { success: true, data: periods.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getPeriodsBySemesterForYear(semesterId: number, year: number): Promise<DatabaseResult<Period[]>> {
      try {
        await this.ensureDynamicTablesExist(year);
        await this.ensureDefaultPeriodsForSemester(year, semesterId);

        const tableName = `periods_${year}`;
        const periods = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY period_no
        `)
          .bind(semesterId)
          .all<Period>();

        return { success: true, data: periods.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async createPeriod(data: CreatePeriodRequest, forYear?: number): Promise<DatabaseResult<Period>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);
        await this.ensureDefaultPeriodsForSemester(year, data.semester_id);

        const tableName = `periods_${year}`;

        const existingPeriod = await this.db
          .prepare(`SELECT 1 FROM ${tableName} WHERE semester_id = ? AND period_no = ?`)
          .bind(data.semester_id, data.period_no)
          .first();

        if (existingPeriod) {
          return { success: false, error: 'Period number already exists for this semester' };
        }

        const result = await this.db
          .prepare(`
          INSERT INTO ${tableName} (
            semester_id,
            period_no,
            period_name,
            start_time,
            end_time,
            is_active,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
          .bind(
            data.semester_id,
            data.period_no,
            data.period_name,
            data.start_time,
            data.end_time
          )
          .run();

        const newPeriod = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(result.meta.last_row_id)
          .first<Period>();

        return { success: true, data: newPeriod! };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async updatePeriod(periodId: number, semesterId: number, data: Partial<CreatePeriodRequest>, forYear?: number): Promise<DatabaseResult<Period>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `periods_${year}`;
        const fields: string[] = [];
        const values: any[] = [];

        if (data.period_name !== undefined) {
          fields.push('period_name = ?');
          values.push(data.period_name);
        }
        if (data.start_time !== undefined) {
          fields.push('start_time = ?');
          values.push(data.start_time);
        }
        if (data.end_time !== undefined) {
          fields.push('end_time = ?');
          values.push(data.end_time);
        }

        if (fields.length === 0) {
          return { success: false, error: 'No period fields to update' };
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        const result = await this.db
          .prepare(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ? AND semester_id = ? AND is_active = 1`)
          .bind(...values, periodId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Period not found' };
        }

        const updatedPeriod = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(periodId)
          .first<Period>();

        return { success: true, data: updatedPeriod! };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async deletePeriod(periodId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `periods_${year}`;
        const result = await this.db
          .prepare(`DELETE FROM ${tableName} WHERE id = ? AND semester_id = ?`)
          .bind(periodId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Period not found' };
        }

        return { success: true, data: { message: 'Period deleted successfully' } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  };
}
