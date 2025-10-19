import type {
  DatabaseResult,
  GlobalContext,
  AcademicYear,
  Semester
} from '../interfaces';
import { DatabaseManagerBase, Constructor } from './database-manager-base';

export function DatabaseManagerInitializationMixin<TBase extends Constructor<DatabaseManagerBase>>(Base: TBase) {
  return class extends Base {
    async initialize(): Promise<DatabaseResult> {
      try {
        console.log('Starting database initialization...');

        console.log('Creating core tables...');
        const coreTablesResult = await this.schemaManager.createCoreTablesIfNotExists();
        if (!coreTablesResult.success) {
          console.error('Failed to create core tables:', coreTablesResult.error);
          return { success: false, error: `Core tables creation failed: ${coreTablesResult.error}` };
        }
        console.log('Core tables created successfully');

        console.log('Creating default admin user...');
        const adminResult = await this.schemaManager.createDefaultAdminUser();
        if (!adminResult.success) {
          console.error('Failed to create admin user:', adminResult.error);
          return { success: false, error: `Admin user creation failed: ${adminResult.error}` };
        }
        console.log('Default admin user created successfully');

        return {
          success: true,
          data: {
            message: 'Database initialized successfully',
            details: {
              coreTables: coreTablesResult.data || 'created',
              adminUser: adminResult.data || 'created'
            }
          }
        };
      } catch (error) {
        console.error('Database initialization error:', error);
        return { success: false, error: String(error) };
      }
    }

    async getGlobalContext(): Promise<DatabaseResult<GlobalContext>> {
      try {
        const activeYear = await this.db
          .prepare('SELECT * FROM academic_years WHERE is_active = 1')
          .first<AcademicYear>();

        if (!activeYear) {
          return { success: false, error: 'No active academic year found' };
        }

        const activeSemester = await this.db
          .prepare('SELECT * FROM semesters WHERE is_active = 1')
          .first<Semester>();

        if (!activeSemester) {
          return { success: false, error: 'No active semester found' };
        }

        return {
          success: true,
          data: {
            academic_year: activeYear,
            semester: activeSemester
          }
        };
      } catch (error) {
        const message = String(error);
        if (message.includes('UNIQUE constraint failed')) {
          return { success: false, error: 'Class already exists for this semester' };
        }
        return { success: false, error: message };
      }
    }

    async setActiveAcademicYear(yearId: number): Promise<DatabaseResult> {
      try {
        await this.db
          .prepare('UPDATE academic_years SET is_active = 0, updated_at = CURRENT_TIMESTAMP')
          .run();

        const result = await this.db
          .prepare('UPDATE academic_years SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(yearId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Academic year not found' };
        }

        return { success: true, data: { message: 'Active academic year updated' } };
      } catch (error) {
        const message = String(error);
        if (message.includes('UNIQUE constraint failed')) {
          return { success: false, error: 'Class already exists for this semester' };
        }
        return { success: false, error: message };
      }
    }

    async setActiveSemester(semesterId: number): Promise<DatabaseResult> {
      try {
        await this.db
          .prepare('UPDATE semesters SET is_active = 0, updated_at = CURRENT_TIMESTAMP')
          .run();

        const result = await this.db
          .prepare('UPDATE semesters SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Semester not found' };
        }

        const year = await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);
        await this.ensureDefaultPeriodsForSemester(year, semesterId);

        return { success: true, data: { message: 'Active semester updated' } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async createAcademicYear(year: number): Promise<DatabaseResult<AcademicYear>> {
      try {
        const result = await this.db
          .prepare(`
          INSERT INTO academic_years (year, is_active, created_at, updated_at)
          VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
          .bind(year)
          .run();

        const newYear = await this.db
          .prepare('SELECT * FROM academic_years WHERE id = ?')
          .bind(result.meta.last_row_id)
          .first<AcademicYear>();

        await this.schemaManager.createDynamicTablesForYear(year);

        return { success: true, data: newYear! };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getAcademicYears(): Promise<DatabaseResult<AcademicYear[]>> {
      try {
        const years = await this.db
          .prepare('SELECT * FROM academic_years ORDER BY year DESC')
          .all<AcademicYear>();
        return { success: true, data: years.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async createSemester(semesterName: string): Promise<DatabaseResult<Semester>> {
      try {
        const result = await this.db
          .prepare(`
          INSERT INTO semesters (semester_name, is_active, created_at, updated_at)
          VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
          .bind(semesterName)
          .run();

        const newSemester = await this.db
          .prepare('SELECT * FROM semesters WHERE id = ?')
          .bind(result.meta.last_row_id)
          .first<Semester>();

        return { success: true, data: newSemester! };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getSemesters(): Promise<DatabaseResult<Semester[]>> {
      try {
        const semesters = await this.db
          .prepare('SELECT * FROM semesters ORDER BY created_at DESC')
          .all<Semester>();
        return { success: true, data: semesters.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async deleteSemester(semesterId: number): Promise<DatabaseResult> {
      try {
        const result = await this.db
          .prepare('DELETE FROM semesters WHERE id = ?')
          .bind(semesterId)
          .run();
        if (result.meta.changes === 0) {
          return { success: false, error: 'Semester not found' };
        }
        return { success: true, data: { message: 'Semester deleted' }, affectedRows: result.meta.changes };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async deleteAcademicYear(yearId: number): Promise<DatabaseResult> {
      try {
        const row = await this.db
          .prepare('SELECT id, year, is_active FROM academic_years WHERE id = ?')
          .bind(yearId)
          .first<{ id: number; year: number; is_active: number }>();
        if (!row) return { success: false, error: 'Academic year not found' };
        if (row.is_active === 1) return { success: false, error: 'Cannot delete an active academic year' };

        const del = await this.db
          .prepare('DELETE FROM academic_years WHERE id = ?')
          .bind(yearId)
          .run();
        if (del.meta.changes === 0) {
          return { success: false, error: 'Delete failed' };
        }
        return { success: true, data: { message: 'Academic year deleted', year: row.year }, affectedRows: del.meta.changes };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  };
}
