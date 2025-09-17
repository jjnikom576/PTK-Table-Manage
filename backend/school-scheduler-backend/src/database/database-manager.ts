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
  CreateSubjectRequest,
  CreateScheduleRequest,
  PaginatedResponse
} from '../interfaces';

export class DatabaseManager {
  private schemaManager: SchemaManager;

  constructor(private db: D1Database, private env: Env) {
    this.schemaManager = new SchemaManager(db, env);
  }

  // ===========================================
  // Initialization
  // ===========================================

  async initialize(): Promise<DatabaseResult> {
    try {
      // Create core tables if they don't exist
      await this.schemaManager.createCoreTablesIfNotExists();
      
      // Create default admin user if none exist
      await this.schemaManager.createDefaultAdminUser();
      
      // Create default periods if none exist
      await this.schemaManager.createDefaultPeriods();

      return { success: true, data: { message: 'Database initialized successfully' } };
    } catch (error) {
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
      return { success: false, error: String(error) };
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
      return { success: false, error: String(error) };
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

  async createSemester(academicYearId: number, semesterNumber: number, semesterName: string): Promise<DatabaseResult<Semester>> {
    try {
      const result = await this.db
        .prepare(`
          INSERT INTO semesters (academic_year_id, semester_number, semester_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(academicYearId, semesterNumber, semesterName)
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

  async getSemestersByYear(academicYearId: number): Promise<DatabaseResult<Semester[]>> {
    try {
      const semesters = await this.db
        .prepare('SELECT * FROM semesters WHERE academic_year_id = ? ORDER BY semester_number')
        .bind(academicYearId)
        .all<Semester>();

      return { success: true, data: semesters.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // Period Management
  // ===========================================

  async getPeriods(): Promise<DatabaseResult<Period[]>> {
    try {
      const periods = await this.db
        .prepare('SELECT * FROM periods ORDER BY period_no')
        .all<Period>();

      return { success: true, data: periods.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updatePeriod(periodNo: number, periodName: string, startTime: string, endTime: string): Promise<DatabaseResult> {
    try {
      const result = await this.db
        .prepare(`
          UPDATE periods 
          SET period_name = ?, start_time = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP
          WHERE period_no = ?
        `)
        .bind(periodName, startTime, endTime, periodNo)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Period not found' };
      }

      return { success: true, data: { message: 'Period updated successfully' } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // Dynamic Table Operations (Year-specific)
  // ===========================================

  private async ensureDynamicTablesExist(year: number): Promise<void> {
    const status = await this.schemaManager.getYearTablesStatus(year);
    
    // Check if all tables exist
    const requiredTables = [`teachers_${year}`, `classes_${year}`, `rooms_${year}`, `subjects_${year}`, `schedules_${year}`];
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
        JOIN semesters s ON ay.id = s.academic_year_id
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

  async createTeacher(data: CreateTeacherRequest): Promise<DatabaseResult<Teacher>> {
    try {
      const year = await this.getYearFromSemesterId(data.semester_id);
      await this.ensureDynamicTablesExist(year);

      const tableName = `teachers_${year}`;
      const result = await this.db
        .prepare(`
          INSERT INTO ${tableName} (semester_id, f_name, l_name, email, phone, subject_group, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(
          data.semester_id,
          data.f_name,
          data.l_name,
          data.email || null,
          data.phone || null,
          data.subject_group,
          data.role || 'teacher'
        )
        .run();

      const newTeacher = await this.db
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(result.meta.last_row_id)
        .first<Teacher>();

      return { success: true, data: newTeacher! };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getTeachersBySemester(semesterId: number, page = 1, limit = 50): Promise<PaginatedResponse<Teacher>> {
    try {
      const year = await this.getYearFromSemesterId(semesterId);
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
          SELECT * FROM ${tableName} 
          WHERE semester_id = ? AND is_active = 1 
          ORDER BY full_name
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

  async updateTeacher(teacherId: number, semesterId: number, data: Partial<CreateTeacherRequest>): Promise<DatabaseResult> {
    try {
      const year = await this.getYearFromSemesterId(semesterId);
      const tableName = `teachers_${year}`;

      const fields: string[] = [];
      const values: any[] = [];

      if (data.f_name) { fields.push('f_name = ?'); values.push(data.f_name); }
      if (data.l_name) { fields.push('l_name = ?'); values.push(data.l_name); }
      if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
      if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
      if (data.subject_group) { fields.push('subject_group = ?'); values.push(data.subject_group); }
      if (data.role) { fields.push('role = ?'); values.push(data.role); }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(teacherId);

      const result = await this.db
        .prepare(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Teacher not found' };
      }

      return { success: true, data: { message: 'Teacher updated successfully' } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async deleteTeacher(teacherId: number, semesterId: number): Promise<DatabaseResult> {
    try {
      const year = await this.getYearFromSemesterId(semesterId);
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

  async createClass(data: CreateClassRequest): Promise<DatabaseResult<Class>> {
    try {
      const year = await this.getYearFromSemesterId(data.semester_id);
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
      const year = await this.getYearFromSemesterId(semesterId);
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

  async createRoom(data: CreateRoomRequest): Promise<DatabaseResult<Room>> {
    try {
      const year = await this.getYearFromSemesterId(data.semester_id);
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
      return { success: false, error: String(error) };
    }
  }

  async getRoomsBySemester(semesterId: number): Promise<DatabaseResult<Room[]>> {
    try {
      const year = await this.getYearFromSemesterId(semesterId);
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

  // ===========================================
  // Subjects Management
  // ===========================================

  async createSubject(data: CreateSubjectRequest): Promise<DatabaseResult<Subject>> {
    try {
      const year = await this.getYearFromSemesterId(data.semester_id);
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
      const year = await this.getYearFromSemesterId(semesterId);
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

  // ===========================================
  // Schedules Management
  // ===========================================

  async createSchedule(data: CreateScheduleRequest): Promise<DatabaseResult<Schedule>> {
    try {
      const year = await this.getYearFromSemesterId(data.semester_id);
      await this.ensureDynamicTablesExist(year);

      const tableName = `schedules_${year}`;
      
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
      const year = await this.getYearFromSemesterId(semesterId);
      const tableName = `schedules_${year}`;

      const schedules = await this.db
        .prepare(`
          SELECT 
            sch.*,
            sub.subject_name,
            sub.subject_code,
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
          JOIN periods p ON sch.period_no = p.period_no
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

  async deleteSchedule(scheduleId: number, semesterId: number): Promise<DatabaseResult> {
    try {
      const year = await this.getYearFromSemesterId(semesterId);
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
