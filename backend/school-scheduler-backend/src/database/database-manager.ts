// src/database/database-manager.ts
import { SchemaManager } from './schema-manager';
import {
  Env,
  DatabaseResult,
  GlobalContext,
  AcademicYear,
  Semester,
  Period,
  Teacher,
  Class,
  Room,
  Subject,
  Schedule,
  AdminUser,
  AdminSession,
  AdminActivityLog,
  CreateTeacherRequest,
  CreateClassRequest,
  CreateRoomRequest,
  CreatePeriodRequest,
  CreateSubjectRequest,
  CreateScheduleRequest,
  PaginatedResponse
} from '../interfaces';

export class DatabaseManager {
  private schemaManager: SchemaManager;

  constructor(private db: D1Database, private env: Env) {
    this.schemaManager = new SchemaManager(db, env);
  }

  // Resolve dynamic table suffix using the currently active academic year
  private async getActiveYear(): Promise<number> {
    const row = await this.db
      .prepare('SELECT year FROM academic_years WHERE is_active = 1')
      .first<{ year: number }>();
    if (!row) throw new Error('No active academic year found');
    return row.year;
  }

  // ===========================================
  // Initialization
  // ===========================================

  async initialize(): Promise<DatabaseResult> {
    try {
      console.log('Starting database initialization...');
      
      // Create core tables if they don't exist
      console.log('Creating core tables...');
      const coreTablesResult = await this.schemaManager.createCoreTablesIfNotExists();
      if (!coreTablesResult.success) {
        console.error('Failed to create core tables:', coreTablesResult.error);
        return { success: false, error: `Core tables creation failed: ${coreTablesResult.error}` };
      }
      console.log('Core tables created successfully');
      
      // Create default admin user if none exist
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

  // ===========================================
  // Global Context Management
  // ===========================================

  async getGlobalContext(): Promise<DatabaseResult<GlobalContext>> {
    try {
      // Get active academic year
      const activeYear = await this.db
        .prepare('SELECT * FROM academic_years WHERE is_active = 1')
        .first<AcademicYear>();

      if (!activeYear) {
        return { success: false, error: 'No active academic year found' };
      }

      // Get active semester
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
      // Deactivate all academic years
      await this.db
        .prepare('UPDATE academic_years SET is_active = 0, updated_at = CURRENT_TIMESTAMP')
        .run();

      // Activate the selected year
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

  async setActiveSemester(semesterId: number): Promise<DatabaseResult> {
    try {
      // Deactivate all semesters
      await this.db
        .prepare('UPDATE semesters SET is_active = 0, updated_at = CURRENT_TIMESTAMP')
        .run();

      // Activate the selected semester
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

  // ===========================================
  // Academic Year Management
  // ===========================================

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

      // Create dynamic tables for this year
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

  // ===========================================
  // Semester Management
  // ===========================================

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
        .prepare('SELECT * FROM semesters ORDER BY id')
        .all<Semester>();

      return { success: true, data: semesters.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async deleteSemester(semesterId: number): Promise<DatabaseResult> {
    try {
      // Do not allow deleting active semester
      const active = await this.db
        .prepare('SELECT id FROM semesters WHERE id = ? AND is_active = 1')
        .bind(semesterId)
        .first();
      if (active) {
        return { success: false, error: 'Cannot delete an active semester' };
      }
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

  // ===========================================
  // Period Management
  // ===========================================

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

      const tableName = `periods_${year}`;
      const result = await this.db
        .prepare(`
          INSERT INTO ${tableName} (semester_id, period_no, period_name, start_time, end_time, is_active, created_at, updated_at)
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
      const message = String(error);
      if (message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Period number already exists for this semester' };
      }
      return { success: false, error: message };
    }
  }

  async updatePeriod(periodId: number, semesterId: number, data: Partial<CreatePeriodRequest>, forYear?: number): Promise<DatabaseResult<Period>> {
    try {
      const year = forYear ?? await this.getActiveYear();
      await this.ensureDynamicTablesExist(year);

      const tableName = `periods_${year}`;
      const fields: string[] = [];
      const values: any[] = [];

      if (data.period_no !== undefined) {
        fields.push('period_no = ?');
        values.push(data.period_no);
      }
      if (data.period_name) {
        fields.push('period_name = ?');
        values.push(data.period_name);
      }
      if (data.start_time) {
        fields.push('start_time = ?');
        values.push(data.start_time);
      }
      if (data.end_time) {
        fields.push('end_time = ?');
        values.push(data.end_time);
      }
      if (data.start_time || data.end_time || data.period_name || data.period_no !== undefined) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
      }

      if (fields.length === 0) {
        return { success: false, error: 'No period fields to update' };
      }

      values.push(periodId, semesterId);

      const result = await this.db
        .prepare(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ? AND semester_id = ?`)
        .bind(...values)
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
      const message = String(error);
      if (message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Period number already exists for this semester' };
      }
      return { success: false, error: message };
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

  private async ensureDefaultPeriodsForSemester(year: number, semesterId: number): Promise<void> {
    const tableName = `periods_${year}`;
    const check = await this.db
      .prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE semester_id = ?`)
      .bind(semesterId)
      .first<{ count: number }>();

    if (check && check.count > 0) {
      return;
    }

    const defaults = [
      { period_no: 1, period_name: 'คาบ 1', start_time: '08:40', end_time: '09:30' },
      { period_no: 2, period_name: 'คาบ 2', start_time: '09:30', end_time: '10:20' },
      { period_no: 3, period_name: 'คาบ 3', start_time: '10:20', end_time: '11:10' },
      { period_no: 4, period_name: 'คาบ 4', start_time: '11:10', end_time: '12:00' },
      { period_no: 5, period_name: 'พักเที่ยง', start_time: '12:00', end_time: '13:00' },
      { period_no: 6, period_name: 'คาบ 6', start_time: '13:00', end_time: '13:50' },
      { period_no: 7, period_name: 'คาบ 7', start_time: '13:50', end_time: '14:40' },
      { period_no: 8, period_name: 'คาบ 8', start_time: '14:40', end_time: '15:30' }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO ${tableName} (semester_id, period_no, period_name, start_time, end_time, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    for (const period of defaults) {
      await stmt
        .bind(semesterId, period.period_no, period.period_name, period.start_time, period.end_time)
        .run();
    }
  }

  // ===========================================
  // Dynamic Table Operations (Year-specific)
  // ===========================================

  // Emergency creator for teachers_{year} if ensureDynamicTablesExist didn't materialize the table
  private async createTeachersTableIfMissing(year: number): Promise<void> {
    const tableName = `teachers_${year}`;
    const check = await this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .bind(tableName)
      .first<{ name: string }>();
    if (check && check.name) return;

    await this.db.exec(
      "CREATE TABLE IF NOT EXISTS " + tableName + " (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "semester_id INTEGER NOT NULL, " +
      "title TEXT, " +
      "f_name TEXT NOT NULL, " +
      "l_name TEXT NOT NULL, " +
      "full_name TEXT GENERATED ALWAYS AS (COALESCE(title || ' ', '') || f_name || ' ' || l_name) STORED, " +
      "email TEXT, " +
      "phone TEXT, " +
      "subject_group TEXT NOT NULL, " +
      "role TEXT DEFAULT 'teacher', " +
      "is_active INTEGER DEFAULT 1, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
      ")"
    );

    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_semester ON ${tableName}(semester_id);`);
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_active ON ${tableName}(semester_id, is_active);`);
  }

  private async ensureDynamicTablesExist(year: number): Promise<void> {
    const status = await this.schemaManager.getYearTablesStatus(year);
    
    // Check if all tables exist
    const requiredTables = [`teachers_${year}`, `classes_${year}`, `rooms_${year}`, `periods_${year}`, `subjects_${year}`, `schedules_${year}`];
    const missingTables = requiredTables.filter(table => !status[table]);
    
    if (missingTables.length > 0) {
      await this.schemaManager.createDynamicTablesForYear(year);
    }
  }

  private async getYearFromSemesterId(semesterId: number): Promise<number> {
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

  // ===========================================
  // Teachers Management
  // ===========================================

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

      const newTeacher = await this.db
        .prepare(`
          SELECT 
            id,
            semester_id,
            title,
            f_name,
            l_name,
            COALESCE(title || ' ', '') || f_name || ' ' || l_name AS full_name,
            email,
            phone,
            subject_group,
            role,
            is_active,
            created_at,
            updated_at
          FROM ${tableName}
          WHERE id = ?
        `)
        .bind(result.meta.last_row_id)
        .first<Teacher>();

      return { success: true, data: newTeacher! };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getTeachersBySemester(semesterId: number, page = 1, limit = 50): Promise<PaginatedResponse<Teacher>> {
    try {
      const year = await this.getActiveYear();
      const tableName = `teachers_${year}`;

      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await this.db
        .prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE semester_id = ? AND is_active = 1`)
        .bind(semesterId)
        .first<{ count: number }>();

      // Get teachers
      const teachers = await this.db
        .prepare(`
          SELECT 
            id,
            semester_id,
            title,
            f_name,
            l_name,
            COALESCE(title || ' ', '') || f_name || ' ' || l_name AS full_name,
            email,
            phone,
            subject_group,
            role,
            is_active,
            created_at,
            updated_at
          FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1 
          ORDER BY f_name
          LIMIT ? OFFSET ?
        `)
        .bind(semesterId, limit, offset)
        .all<Teacher>();

      const total = countResult?.count || 0;

      return {
        success: true,
        data: teachers.results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }
  }

  async getTeachersBySemesterForYear(semesterId: number, year: number, page = 1, limit = 50): Promise<PaginatedResponse<Teacher>> {
    try {
      const tableName = `teachers_${year}`;

      const offset = (page - 1) * limit;

      const countResult = await this.db
        .prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE semester_id = ? AND is_active = 1`)
        .bind(semesterId)
        .first<{ count: number }>();

      const teachers = await this.db
        .prepare(`
          SELECT 
            id,
            semester_id,
            title,
            f_name,
            l_name,
            COALESCE(title || ' ', '') || f_name || ' ' || l_name AS full_name,
            email,
            phone,
            subject_group,
            role,
            is_active,
            created_at,
            updated_at
          FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1 
          ORDER BY f_name
          LIMIT ? OFFSET ?
        `)
        .bind(semesterId, limit, offset)
        .all<Teacher>();

      const total = countResult?.count || 0;
      return {
        success: true,
        data: teachers.results,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }
  }

  async updateTeacher(teacherId: number, semesterId: number, data: Partial<CreateTeacherRequest>, forYear?: number): Promise<DatabaseResult> {
    try {
      console.log('🔧 updateTeacher called with:', { teacherId, semesterId, data, forYear }); // Debug
      
      const year = forYear ?? await this.getActiveYear();
      const tableName = `teachers_${year}`;
      console.log('📝 Using table:', tableName); // Debug

      const fields: string[] = [];
      const values: any[] = [];

      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
      if (data.f_name) { fields.push('f_name = ?'); values.push(data.f_name); }
      if (data.l_name) { fields.push('l_name = ?'); values.push(data.l_name); }
      if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
      if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
      if (data.subject_group) { fields.push('subject_group = ?'); values.push(data.subject_group); }
      if (data.role) { fields.push('role = ?'); values.push(data.role); }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(teacherId);

      const sql = `UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ?`;
      console.log('📝 SQL Query:', sql); // Debug
      console.log('📝 SQL Values:', values); // Debug

      const result = await this.db
        .prepare(sql)
        .bind(...values)
        .run();

      console.log('📝 SQL Result:', result); // Debug

      if (result.meta.changes === 0) {
        return { success: false, error: 'Teacher not found' };
      }

      return { success: true, data: { message: 'Teacher updated successfully' } };
    } catch (error) {
      console.error('❌ updateTeacher error:', error); // Debug
      return { success: false, error: String(error) };
    }
  }

  async deleteTeacher(teacherId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
    try {
      const year = forYear ?? await this.getActiveYear();
      const tableName = `teachers_${year}`;

      const result = await this.db
        .prepare(`UPDATE ${tableName} SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(teacherId)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Teacher not found' };
      }

      return { success: true, data: { message: 'Teacher deleted successfully' } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // Classes Management  
  // ===========================================

  async createClass(data: CreateClassRequest, forYear?: number): Promise<DatabaseResult<Class>> {
    try {
      const year = forYear ?? await this.getActiveYear();
      await this.ensureDynamicTablesExist(year);

      const tableName = `classes_${year}`;
      const result = await this.db
        .prepare(`
          INSERT INTO ${tableName} (semester_id, grade_level, section, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(data.semester_id, data.grade_level, data.section)
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

  // ===========================================
  // Rooms Management
  // ===========================================

  async createRoom(data: CreateRoomRequest, forYear?: number): Promise<DatabaseResult<Room>> {
    try {
      const year = forYear ?? await this.getActiveYear();
      await this.ensureDynamicTablesExist(year);

      const tableName = `rooms_${year}`;
      const result = await this.db
        .prepare(`
          INSERT INTO ${tableName} (semester_id, room_name, room_type, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(data.semester_id, data.room_name, data.room_type)
        .run();

      const newRoom = await this.db
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(result.meta.last_row_id)
        .first<Room>();

      return { success: true, data: newRoom! };
    } catch (error) {
      const message = String(error);
      if (message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Room already exists for this semester' };
      }
      return { success: false, error: message };
    }
  }

  async getRoomsBySemester(semesterId: number): Promise<DatabaseResult<Room[]>> {
    try {
      const year = await this.getActiveYear();
      const tableName = `rooms_${year}`;

      const rooms = await this.db
        .prepare(`
          SELECT * FROM ${tableName} 
          WHERE semester_id = ? AND is_active = 1 
          ORDER BY room_name
        `)
        .bind(semesterId)
        .all<Room>();

      return { success: true, data: rooms.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getRoomsBySemesterForYear(semesterId: number, year: number): Promise<DatabaseResult<Room[]>> {
    try {
      const tableName = `rooms_${year}`;
      const rooms = await this.db
        .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY room_name
        `)
        .bind(semesterId)
        .all<Room>();
      return { success: true, data: rooms.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updateRoom(roomId: number, semesterId: number, data: Partial<CreateRoomRequest>, forYear?: number): Promise<DatabaseResult<Room>> {
    try {
      const year = forYear ?? await this.getActiveYear();
      await this.ensureDynamicTablesExist(year);

      const tableName = `rooms_${year}`;
      const fields: string[] = [];
      const values: any[] = [];

      if (data.room_name) {
        fields.push('room_name = ?');
        values.push(data.room_name);
      }
      if (data.room_type) {
        fields.push('room_type = ?');
        values.push(data.room_type);
      }

      if (fields.length === 0) {
        return { success: false, error: 'No room fields to update' };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.db
        .prepare(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ? AND semester_id = ?`)
        .bind(...values, roomId, semesterId)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Room not found' };
      }

      const updatedRoom = await this.db
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(roomId)
        .first<Room>();

      return { success: true, data: updatedRoom! };
    } catch (error) {
      const message = String(error);
      if (message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Room already exists for this semester' };
      }
      return { success: false, error: message };
    }
  }

  async deleteRoom(roomId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
    try {
      const year = forYear ?? await this.getActiveYear();
      await this.ensureDynamicTablesExist(year);

      const tableName = `rooms_${year}`;
      const result = await this.db
        .prepare(`DELETE FROM ${tableName} WHERE id = ? AND semester_id = ?`)
        .bind(roomId, semesterId)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Room not found' };
      }

      return { success: true, data: { message: 'Room deleted successfully' } };
    } catch (error) {
      const message = String(error);
      if (message.includes('FOREIGN KEY constraint failed')) {
        return { success: false, error: 'Cannot delete room while schedules still reference it' };
      }
      return { success: false, error: message };
    }
  }

  // ===========================================
  // Subjects Management
  // ===========================================

  async createSubject(data: CreateSubjectRequest, forYear?: number): Promise<DatabaseResult<Subject>> {
    try {
      const year = forYear ?? await this.getActiveYear();
      await this.ensureDynamicTablesExist(year);

      const tableName = `subjects_${year}`;
      const result = await this.db
        .prepare(`
          INSERT INTO ${tableName} (semester_id, teacher_id, class_id, subject_name, subject_code, periods_per_week, default_room_id, special_requirements, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(
          data.semester_id,
          data.teacher_id,
          data.class_id,
          data.subject_name,
          data.subject_code || null,
          data.periods_per_week,
          data.default_room_id || null,
          data.special_requirements || null
        )
        .run();

      const newSubject = await this.db
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(result.meta.last_row_id)
        .first<Subject>();

      return { success: true, data: newSubject! };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getSubjectsBySemester(semesterId: number): Promise<DatabaseResult<any[]>> {
    try {
      const year = await this.getActiveYear();
      const tableName = `subjects_${year}`;

      const subjects = await this.db
        .prepare(`
          SELECT s.*, t.full_name as teacher_name, c.class_name, r.room_name
          FROM ${tableName} s
          JOIN teachers_${year} t ON s.teacher_id = t.id
          JOIN classes_${year} c ON s.class_id = c.id
          LEFT JOIN rooms_${year} r ON s.default_room_id = r.id
          WHERE s.semester_id = ? AND s.is_active = 1
          ORDER BY t.full_name, c.class_name, s.subject_name
        `)
        .bind(semesterId)
        .all();

      return { success: true, data: subjects.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getSubjectsBySemesterForYear(semesterId: number, year: number): Promise<DatabaseResult<any[]>> {
    try {
      const tableName = `subjects_${year}`;
      const subjects = await this.db
        .prepare(`
          SELECT s.*, t.full_name as teacher_name, c.class_name, r.room_name
          FROM ${tableName} s
          JOIN teachers_${year} t ON s.teacher_id = t.id
          JOIN classes_${year} c ON s.class_id = c.id
          LEFT JOIN rooms_${year} r ON s.default_room_id = r.id
          WHERE s.semester_id = ? AND s.is_active = 1
          ORDER BY c.class_name, s.subject_name
        `)
        .bind(semesterId)
        .all();
      return { success: true, data: subjects.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // Schedules Management
  // ===========================================

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

      // Check for conflicts
      const conflicts = await this.checkScheduleConflicts(data, year);
      if (conflicts.length > 0) {
        return { 
          success: false, 
          error: `Schedule conflicts detected: ${conflicts.join(', ')}` 
        };
      }

      const result = await this.db
        .prepare(`
          INSERT INTO ${tableName} (semester_id, subject_id, day_of_week, period_no, room_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(
          data.semester_id,
          data.subject_id,
          data.day_of_week,
          data.period_no,
          data.room_id || null
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

  private async checkScheduleConflicts(data: CreateScheduleRequest, year: number): Promise<string[]> {
    const conflicts: string[] = [];
    const tableName = `schedules_${year}`;

    try {
      // Check room conflict
      if (data.room_id) {
        const roomConflict = await this.db
          .prepare(`
            SELECT 1 FROM ${tableName} 
            WHERE semester_id = ? AND day_of_week = ? AND period_no = ? AND room_id = ?
          `)
          .bind(data.semester_id, data.day_of_week, data.period_no, data.room_id)
          .first();

        if (roomConflict) {
          conflicts.push('Room is already occupied');
        }
      }

      // Check teacher conflict (through subject)
      const teacherConflict = await this.db
        .prepare(`
          SELECT 1 FROM ${tableName} sch
          JOIN subjects_${year} sub1 ON sch.subject_id = sub1.id
          JOIN subjects_${year} sub2 ON sub2.id = ?
          WHERE sch.semester_id = ? AND sch.day_of_week = ? AND sch.period_no = ?
          AND sub1.teacher_id = sub2.teacher_id
        `)
        .bind(data.subject_id, data.semester_id, data.day_of_week, data.period_no)
        .first();

      if (teacherConflict) {
        conflicts.push('Teacher is already scheduled');
      }

      // Check class conflict (through subject)
      const classConflict = await this.db
        .prepare(`
          SELECT 1 FROM ${tableName} sch
          JOIN subjects_${year} sub1 ON sch.subject_id = sub1.id
          JOIN subjects_${year} sub2 ON sub2.id = ?
          WHERE sch.semester_id = ? AND sch.day_of_week = ? AND sch.period_no = ?
          AND sub1.class_id = sub2.class_id
        `)
        .bind(data.subject_id, data.semester_id, data.day_of_week, data.period_no)
        .first();

      if (classConflict) {
        conflicts.push('Class is already scheduled');
      }

    } catch (error) {
      // Log error but don't block the operation
      console.error('Error checking schedule conflicts:', error);
    }

    return conflicts;
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
            sch.day_of_week,
            sch.period_no AS period,
            sch.room_id,
            sch.created_at,
            sch.updated_at,
            sub.subject_name,
            sub.subject_code,
            sub.teacher_id,
            sub.class_id,
            t.full_name as teacher_name,
            c.class_name,
            r.room_name,
            p.period_name,
            p.start_time,
            p.end_time
          FROM ${tableName} sch
          JOIN subjects_${year} sub ON sch.subject_id = sub.id
          JOIN teachers_${year} t ON sub.teacher_id = t.id
          JOIN classes_${year} c ON sub.class_id = c.id
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

  // New: Get schedules for a specific semester and year (without relying on active year)
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
            sch.day_of_week,
            sch.period_no AS period,
            sch.room_id,
            sch.created_at,
            sch.updated_at,
            sub.subject_name,
            sub.subject_code,
            sub.teacher_id,
            sub.class_id,
            t.full_name as teacher_name,
            c.class_name,
            r.room_name,
            p.period_name,
            p.start_time,
            p.end_time
          FROM ${tableName} sch
          JOIN subjects_${year} sub ON sch.subject_id = sub.id
          JOIN teachers_${year} t ON sub.teacher_id = t.id
          JOIN classes_${year} c ON sub.class_id = c.id
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

  async deleteAcademicYear(yearId: number): Promise<DatabaseResult> {
    try {
      const row = await this.db
        .prepare('SELECT id, year, is_active FROM academic_years WHERE id = ?')
        .bind(yearId)
        .first<{ id: number; year: number; is_active: number }>();
      if (!row) return { success: false, error: 'Academic year not found' };
      if (row.is_active === 1) return { success: false, error: 'Cannot delete an active academic year' };

      // Do NOT drop dynamic tables; retain data for potential reuse
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
}
