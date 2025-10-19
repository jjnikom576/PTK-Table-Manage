import type {
  DatabaseResult,
  Class,
  CreateClassRequest
} from '../interfaces';
import { DatabaseManagerBase, Constructor } from './database-manager-base';

export function DatabaseManagerClassesMixin<TBase extends Constructor<DatabaseManagerBase>>(Base: TBase) {
  return class extends Base {
    async createClass(data: CreateClassRequest, forYear?: number): Promise<DatabaseResult<Class>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `classes_${year}`;

        const exists = await this.db
          .prepare(`SELECT 1 FROM ${tableName} WHERE semester_id = ? AND grade_level = ? AND section = ?`)
          .bind(data.semester_id, data.grade_level, data.section)
          .first();

        if (exists) {
          return { success: false, error: 'Class already exists for this semester' };
        }

        const result = await this.db
          .prepare(`
          INSERT INTO ${tableName} (
            semester_id,
            grade_level,
            section,
            class_name,
            is_active,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
          .bind(
            data.semester_id,
            data.grade_level,
            data.section,
            `${data.grade_level}/${data.section}`
          )
          .run();

        const newClass = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(result.meta.last_row_id)
          .first<Class>();

        return { success: true, data: newClass! };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getClassesBySemester(semesterId: number): Promise<DatabaseResult<Class[]>> {
      try {
        const year = await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `classes_${year}`;
        const classes = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY grade_level, section
        `)
          .bind(semesterId)
          .all<Class>();

        return { success: true, data: classes.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getClassesBySemesterForYear(semesterId: number, year: number): Promise<DatabaseResult<Class[]>> {
      try {
        await this.ensureDynamicTablesExist(year);

        const tableName = `classes_${year}`;
        const classes = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY grade_level, section
        `)
          .bind(semesterId)
          .all<Class>();

        return { success: true, data: classes.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async updateClass(classId: number, semesterId: number, data: Partial<CreateClassRequest>, forYear?: number): Promise<DatabaseResult<Class>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `classes_${year}`;
        const fields: string[] = [];
        const values: any[] = [];

        if (data.grade_level) {
          fields.push('grade_level = ?');
          values.push(data.grade_level);
        }
        if (data.section !== undefined) {
          fields.push('section = ?');
          values.push(data.section);
        }

        if (fields.length === 0) {
          return { success: false, error: 'No class fields to update' };
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        const result = await this.db
          .prepare(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ? AND semester_id = ? AND is_active = 1`)
          .bind(...values, classId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Class not found' };
        }

        const updatedClass = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(classId)
          .first<Class>();

        return { success: true, data: updatedClass! };
      } catch (error) {
        const message = String(error);
        if (message.includes('UNIQUE constraint failed')) {
          return { success: false, error: 'Class already exists for this semester' };
        }
        return { success: false, error: message };
      }
    }

    async deleteClass(classId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `classes_${year}`;
        const result = await this.db
          .prepare(`DELETE FROM ${tableName} WHERE id = ? AND semester_id = ?`)
          .bind(classId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Class not found' };
        }

        return { success: true, data: { message: 'Class deleted successfully' } };
      } catch (error) {
        const message = String(error);
        if (message.includes('FOREIGN KEY constraint failed')) {
          return { success: false, error: 'Cannot delete class while schedules or subjects still reference it' };
        }
        return { success: false, error: message };
      }
    }
  };
}
