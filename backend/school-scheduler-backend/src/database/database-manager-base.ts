import { SchemaManager } from './schema-manager';
import type { Env } from '../interfaces';

export type Constructor<T = {}> = new (...args: any[]) => T;

export class DatabaseManagerBase {
  protected readonly schemaManager: SchemaManager;

  constructor(protected readonly db: D1Database, protected readonly env: Env) {
    this.schemaManager = new SchemaManager(db, env);
  }

  protected async getActiveYear(): Promise<number> {
    const row = await this.db
      .prepare('SELECT year FROM academic_years WHERE is_active = 1')
      .first<{ year: number }>();
    if (!row) throw new Error('No active academic year found');
    return row.year;
  }

  protected async ensureDefaultPeriodsForSemester(year: number, semesterId: number): Promise<void> {
    const tableName = `periods_${year}`;
    const check = await this.db
      .prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE semester_id = ?`)
      .bind(semesterId)
      .first<{ count: number }>();

    if (check && check.count > 0) {
      return;
    }

    const defaultPeriods = [
      { period_no: 1, period_name: 'คาบ 1', start_time: '08:30', end_time: '09:20' },
      { period_no: 2, period_name: 'คาบ 2', start_time: '09:20', end_time: '10:10' },
      { period_no: 3, period_name: 'คาบ 3', start_time: '10:10', end_time: '11:00' },
      { period_no: 4, period_name: 'คาบ 4', start_time: '11:00', end_time: '11:50' },
      { period_no: 5, period_name: 'คาบ 5', start_time: '12:40', end_time: '13:30' },
      { period_no: 6, period_name: 'คาบ 6', start_time: '13:30', end_time: '14:20' },
      { period_no: 7, period_name: 'คาบ 7', start_time: '14:20', end_time: '15:10' },
      { period_no: 8, period_name: 'คาบ 8', start_time: '14:40', end_time: '15:30' }
    ];

    for (const period of defaultPeriods) {
      await this.db
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
          semesterId,
          period.period_no,
          period.period_name,
          period.start_time,
          period.end_time
        )
        .run();
    }
  }

  protected async ensureDynamicTablesExist(year: number): Promise<void> {
    const status = await this.schemaManager.getYearTablesStatus(year);

    const requiredTables = [
      `teachers_${year}`,
      `classes_${year}`,
      `rooms_${year}`,
      `periods_${year}`,
      `subjects_${year}`,
      `schedules_${year}`
    ];
    const missingTables = requiredTables.filter(table => !status[table]);

    if (missingTables.length > 0) {
      await this.schemaManager.createDynamicTablesForYear(year);
    }
  }

  protected async getYearFromSemesterId(semesterId: number): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT ay.year 
        FROM academic_years ay
        /* semesters are global; academic_year_id removed */
        WHERE s.id = ?
      `)
      .bind(semesterId)
      .first<{ year: number }>();

    if (!result) {
      throw new Error('Semester not found');
    }

    return result.year;
  }
}
