import type {
  DatabaseResult,
  Teacher,
  CreateTeacherRequest,
  PaginatedResponse
} from '../interfaces';
import { DatabaseManagerBase, Constructor } from './database-manager-base';

export function DatabaseManagerTeachersMixin<TBase extends Constructor<DatabaseManagerBase>>(Base: TBase) {
  return class extends Base {
    protected async createTeachersTableIfMissing(year: number): Promise<void> {
      const tableName = `teachers_${year}`;
      const check = await this.db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .bind(tableName)
        .first();

      if (!check) {
        await this.db
          .prepare(`
            CREATE TABLE IF NOT EXISTS ${tableName} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              semester_id INTEGER NOT NULL,
              title TEXT,
              f_name TEXT NOT NULL,
              l_name TEXT NOT NULL,
              full_name TEXT GENERATED ALWAYS AS (
                TRIM(COALESCE(title || ' ', '') || f_name || ' ' || l_name)
              ) VIRTUAL,
              email TEXT,
              phone TEXT,
              subject_group TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'teacher',
              is_active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `)
          .run();
        await this.db
          .prepare(`CREATE INDEX IF NOT EXISTS idx_${tableName}_semester ON ${tableName} (semester_id)`)
          .run();
      }
    }

    async createTeacher(data: CreateTeacherRequest, forYear?: number): Promise<DatabaseResult<Teacher>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `teachers_${year}`;
        let result;
        try {
          result = await this.db
            .prepare(`
            INSERT INTO ${tableName} (semester_id, title, f_name, l_name, email, phone, subject_group, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
            .bind(
              data.semester_id,
              data.title || null,
              data.f_name,
              data.l_name,
              data.email || null,
              data.phone || null,
              data.subject_group,
              data.role || 'teacher'
            )
            .run();
        } catch (e) {
          const msg = String(e);
          if (msg.includes('no such table')) {
            await this.ensureDynamicTablesExist(year);
            await this.createTeachersTableIfMissing(year);
            result = await this.db
              .prepare(`
              INSERT INTO ${tableName} (semester_id, title, f_name, l_name, email, phone, subject_group, role, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `)
              .bind(
                data.semester_id,
                data.title || null,
                data.f_name,
                data.l_name,
                data.email || null,
                data.phone || null,
                data.subject_group,
                data.role || 'teacher'
              )
              .run();
          } else {
            throw e;
          }
        }

        const teacher = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(result.meta.last_row_id)
          .first<Teacher>();

        return { success: true, data: teacher! };
      } catch (error) {
        const message = String(error);
        if (message.includes('UNIQUE constraint failed')) {
          return { success: false, error: 'Teacher already exists for this semester' };
        }
        return { success: false, error: message };
      }
    }

    async getTeachersBySemester(semesterId: number, page = 1, limit = 50): Promise<PaginatedResponse<Teacher>> {
      try {
        const year = await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `teachers_${year}`;
        const offset = (page - 1) * limit;

        const totalResult = await this.db
          .prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE semester_id = ? AND is_active = 1`)
          .bind(semesterId)
          .first<{ count: number }>();

        const teachers = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY f_name, l_name
          LIMIT ? OFFSET ?
        `)
          .bind(semesterId, limit, offset)
          .all<Teacher>();

        return {
          success: true,
          data: teachers.results,
          pagination: {
            total: totalResult?.count || 0,
            page,
            limit,
            totalPages: Math.ceil((totalResult?.count || 0) / limit)
          }
        };
      } catch (error) {
        return {
          success: false,
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0
          }
        };
      }
    }

    async getTeachersBySemesterForYear(semesterId: number, year: number, page = 1, limit = 50): Promise<PaginatedResponse<Teacher>> {
      try {
        await this.ensureDynamicTablesExist(year);

        const tableName = `teachers_${year}`;
        const offset = (page - 1) * limit;

        const totalResult = await this.db
          .prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE semester_id = ? AND is_active = 1`)
          .bind(semesterId)
          .first<{ count: number }>();

        const teachers = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY f_name, l_name
          LIMIT ? OFFSET ?
        `)
          .bind(semesterId, limit, offset)
          .all<Teacher>();

        return {
          success: true,
          data: teachers.results,
          pagination: {
            total: totalResult?.count || 0,
            page,
            limit,
            totalPages: Math.ceil((totalResult?.count || 0) / limit)
          }
        };
      } catch (error) {
        return {
          success: false,
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0
          }
        };
      }
    }

    async updateTeacher(teacherId: number, semesterId: number, data: Partial<CreateTeacherRequest>, forYear?: number): Promise<DatabaseResult> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `teachers_${year}`;
        const fields: string[] = [];
        const values: any[] = [];

        if (data.title !== undefined) {
          fields.push('title = ?');
          values.push(data.title);
        }
        if (data.f_name !== undefined) {
          fields.push('f_name = ?');
          values.push(data.f_name);
        }
        if (data.l_name !== undefined) {
          fields.push('l_name = ?');
          values.push(data.l_name);
        }
        if (data.email !== undefined) {
          fields.push('email = ?');
          values.push(data.email);
        }
        if (data.phone !== undefined) {
          fields.push('phone = ?');
          values.push(data.phone);
        }
        if (data.subject_group !== undefined) {
          fields.push('subject_group = ?');
          values.push(data.subject_group);
        }
        if (data.role !== undefined) {
          fields.push('role = ?');
          values.push(data.role);
        }

        if (fields.length === 0) {
          return { success: false, error: 'No teacher fields to update' };
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        const result = await this.db
          .prepare(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ? AND semester_id = ? AND is_active = 1`)
          .bind(...values, teacherId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Teacher not found' };
        }

        return { success: true, data: { message: 'Teacher updated successfully' } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async deleteTeacher(teacherId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `teachers_${year}`;
        const result = await this.db
          .prepare(`DELETE FROM ${tableName} WHERE id = ? AND semester_id = ?`)
          .bind(teacherId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Teacher not found' };
        }

        return { success: true, data: { message: 'Teacher deleted successfully' } };
      } catch (error) {
        const message = String(error);
        if (message.includes('FOREIGN KEY constraint failed')) {
          return { success: false, error: 'Cannot delete teacher while schedules still reference them' };
        }
        return { success: false, error: message };
      }
    }
  };
}
