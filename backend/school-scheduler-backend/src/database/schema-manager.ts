// src/database/schema-manager.ts
import { Env, TableExistenceCheck, DatabaseResult } from '../interfaces';

export class SchemaManager {
  constructor(private db: D1Database, private env: Env) {}

  // ===========================================
  // Core Tables Management (Fixed Tables)
  // ===========================================

  async createCoreTablesIfNotExists(): Promise<DatabaseResult> {
    try {
      console.log('Creating admin tables...');
      
      // Admin Tables
      await this.createAdminTables();
      console.log('Admin tables created successfully');
      
      console.log('Creating academic tables...');
      
      // Core academic structure tables
      await this.createAcademicTables();
      console.log('Academic tables created successfully');
      
      return { 
        success: true, 
        data: { 
          message: 'All core tables created successfully',
          adminTables: 'created',
          academicTables: 'created'
        } 
      };
    } catch (error) {
      console.error('Core tables creation error:', error);
      return { success: false, error: String(error) };
    }
  }

  private async createAdminTables(): Promise<void> {
    console.log('Creating admin_users table...');
    // Admin Users
    await this.db.exec(
      "CREATE TABLE IF NOT EXISTS admin_users (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "username TEXT NOT NULL UNIQUE, " +
      "password_hash TEXT NOT NULL, " +
      "full_name TEXT NOT NULL, " +
      "email TEXT, " +
      "role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')), " +
      "is_active INTEGER DEFAULT 1, " +
      "last_login DATETIME, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
      ")"
    );

    console.log('Creating admin_users indexes...');
    // Admin Users Indexes
    await this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username)");
    await this.db.exec("CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = 1");

    console.log('Creating admin_sessions table...');
    // Admin Sessions
    await this.db.exec(
      "CREATE TABLE IF NOT EXISTS admin_sessions (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "admin_user_id INTEGER NOT NULL, " +
      "session_token TEXT NOT NULL UNIQUE, " +
      "expires_at DATETIME NOT NULL, " +
      "ip_address TEXT, " +
      "user_agent TEXT, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      "FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE" +
      ")"
    );

    console.log('Creating admin_sessions indexes...');
    // Admin Sessions Indexes
    await this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token)");
    await this.db.exec("CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)");

    console.log('Creating admin_activity_log table...');
    // Admin Activity Log
    await this.db.exec(
      "CREATE TABLE IF NOT EXISTS admin_activity_log (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "admin_user_id INTEGER NOT NULL, " +
      "action TEXT NOT NULL, " +
      "table_name TEXT, " +
      "record_id TEXT, " +
      "old_values TEXT, " +
      "new_values TEXT, " +
      "ip_address TEXT, " +
      "user_agent TEXT, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      "FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE" +
      ")"
    );

    console.log('Creating admin_activity_log indexes...');
    // Activity Log Indexes
    await this.db.exec("CREATE INDEX IF NOT EXISTS idx_admin_log_user ON admin_activity_log(admin_user_id)");
    await this.db.exec("CREATE INDEX IF NOT EXISTS idx_admin_log_date ON admin_activity_log(created_at)");
    
    console.log('All admin tables created successfully');
  }

  private async createAcademicTables(): Promise<void> {
    console.log('Creating academic_years table...');
    // Academic Years
    await this.db.exec(
      "CREATE TABLE IF NOT EXISTS academic_years (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "year INTEGER NOT NULL UNIQUE, " +
      "is_active INTEGER DEFAULT 0, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
      ")"
    );

    console.log('Creating academic_years indexes...');
    // Academic Years Indexes
    await this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_year ON academic_years(year)");
    await this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active) WHERE is_active = 1");

    console.log('Creating semesters table...');
    // Semesters
    await this.db.exec(
      "CREATE TABLE IF NOT EXISTS semesters (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      /* academic_year_id removed: semesters are global */
      
      "semester_name TEXT NOT NULL, " +
      "is_active INTEGER DEFAULT 0, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      /* Removed FK to academic_years: semesters are not tied to year */
      "UNIQUE (semester_name)" +
      ")"
    );

    console.log('Creating semesters indexes...');
    // Semesters Indexes
    // academic_year_id was removed; keep semesters global
    await this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_semesters_active ON semesters(is_active) WHERE is_active = 1");

    console.log('Creating periods table...');
    // Periods (Shared across all years)
    await this.db.exec(
      "CREATE TABLE IF NOT EXISTS periods (" +
      "period_no INTEGER PRIMARY KEY, " +
      "period_name TEXT NOT NULL, " +
      "start_time TIME NOT NULL, " +
      "end_time TIME NOT NULL, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
      "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
      ")"
    );

    console.log('Creating periods indexes...');
    // Periods Indexes
    await this.db.exec("CREATE INDEX IF NOT EXISTS idx_periods_time_range ON periods(start_time, end_time)");
    
    console.log('All academic tables created successfully');
  }

  // ===========================================
  // Dynamic Tables Management (Per Year)
  // ===========================================

  async createDynamicTablesForYear(year: number): Promise<DatabaseResult> {
    try {
      const tables = [
        this.createTeachersTable(year),
        this.createClassesTable(year),
        this.createRoomsTable(year),
        this.createSubjectsTable(year),
        this.createSchedulesTable(year)
      ];

      await Promise.all(tables);

      return { success: true, data: { year, tablesCreated: 5 } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async createTeachersTable(year: number): Promise<void> {
    const tableName = `teachers_${year}`;
    
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        title TEXT,
        f_name TEXT NOT NULL,
        l_name TEXT NOT NULL,
        full_name TEXT GENERATED ALWAYS AS (COALESCE(title || ' ', '') || f_name || ' ' || l_name) STORED,
        email TEXT,
        phone TEXT,
        subject_group TEXT NOT NULL,
        role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'head_of_department', 'vice_principal', 'principal')),
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
      )
    `);

    // Ensure 'title' column exists for previously created tables
    try {
      const col = await this.db
        .prepare(`SELECT 1 as ok FROM pragma_table_info('${tableName}') WHERE name='title'`)
        .first<{ ok: number }>();
      if (!col) {
        await this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN title TEXT`);
      }
    } catch (_) {
      // ignore
    }

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_semester ON ${tableName}(semester_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_active ON ${tableName}(semester_id, is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_search ON ${tableName}(f_name, l_name, subject_group)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_name_search ON ${tableName}(full_name)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_email ON ${tableName}(email) WHERE email IS NOT NULL`
    ];

    for (const index of indexes) {
      await this.db.exec(index);
    }
  }

  private async createClassesTable(year: number): Promise<void> {
    const tableName = `classes_${year}`;
    
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        grade_level TEXT NOT NULL,
        section INTEGER NOT NULL,
        class_name TEXT GENERATED ALWAYS AS (grade_level || '/' || section) STORED,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        UNIQUE (semester_id, grade_level, section)
      )
    `);

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_semester ON ${tableName}(semester_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_active ON ${tableName}(semester_id, is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_grade ON ${tableName}(grade_level)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_unique_class ON ${tableName}(semester_id, grade_level, section)`
    ];

    for (const index of indexes) {
      await this.db.exec(index);
    }
  }

  private async createRoomsTable(year: number): Promise<void> {
    const tableName = `rooms_${year}`;
    
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        room_name TEXT NOT NULL,
        room_type TEXT NOT NULL CHECK (room_type IN ('ทั่วไป', 'ปฏิบัติการคอมพิวเตอร์')),
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        UNIQUE (semester_id, room_name)
      )
    `);

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_semester ON ${tableName}(semester_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_active ON ${tableName}(semester_id, is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_type ON ${tableName}(room_type)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_unique_name ON ${tableName}(semester_id, room_name)`
    ];

    for (const index of indexes) {
      await this.db.exec(index);
    }
  }

  private async createSubjectsTable(year: number): Promise<void> {
    const tableName = `subjects_${year}`;
    
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        subject_name TEXT NOT NULL,
        subject_code TEXT,
        periods_per_week INTEGER NOT NULL CHECK (periods_per_week > 0),
        default_room_id INTEGER,
        special_requirements TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers_${year}(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes_${year}(id) ON DELETE CASCADE,
        FOREIGN KEY (default_room_id) REFERENCES rooms_${year}(id) ON DELETE SET NULL,
        UNIQUE (semester_id, teacher_id, class_id, subject_name)
      )
    `);

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_semester ON ${tableName}(semester_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_teacher ON ${tableName}(teacher_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_class ON ${tableName}(class_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_room ON ${tableName}(default_room_id) WHERE default_room_id IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_active ON ${tableName}(semester_id, is_active)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_unique ON ${tableName}(semester_id, teacher_id, class_id, subject_name)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_teacher ON ${tableName}(teacher_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_class ON ${tableName}(class_id)`
    ];

    for (const index of indexes) {
      await this.db.exec(index);
    }
  }

  private async createSchedulesTable(year: number): Promise<void> {
    const tableName = `schedules_${year}`;
    
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        period_no INTEGER NOT NULL,
        room_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects_${year}(id) ON DELETE CASCADE,
        FOREIGN KEY (period_no) REFERENCES periods(period_no) ON DELETE RESTRICT,
        FOREIGN KEY (room_id) REFERENCES rooms_${year}(id) ON DELETE SET NULL,
        UNIQUE (semester_id, day_of_week, period_no, room_id),
        /* Removed subject-level uniqueness to allow parallel sections */
      )
    `);

    // Create indexes (Heavy usage - สำคัญมาก)
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_semester ON ${tableName}(semester_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_subject ON ${tableName}(subject_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_time ON ${tableName}(day_of_week, period_no)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_daily ON ${tableName}(semester_id, day_of_week)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_room ON ${tableName}(room_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_time ON ${tableName}(day_of_week, period_no)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_room ON ${tableName}(room_id) WHERE room_id IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_daily ON ${tableName}(semester_id, day_of_week)`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_conflict_check ON ${tableName}(semester_id, day_of_week, period_no)`
    ];

    for (const index of indexes) {
      await this.db.exec(index);
    }
  }

  // ===========================================
  // Table Existence Utilities
  // ===========================================

  async checkTableExists(tableName: string): Promise<TableExistenceCheck> {
    try {
      const result = await this.db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .bind(tableName)
        .first();
      
      return {
        exists: result !== null,
        tableName
      };
    } catch (error) {
      return {
        exists: false,
        tableName
      };
    }
  }

  async getYearTablesStatus(year: number): Promise<{ [key: string]: boolean }> {
    const tableNames = [
      `teachers_${year}`,
      `classes_${year}`,
      `rooms_${year}`,
      `subjects_${year}`,
      `schedules_${year}`
    ];

    const status: { [key: string]: boolean } = {};

    for (const tableName of tableNames) {
      const check = await this.checkTableExists(tableName);
      status[tableName] = check.exists;
    }

    return status;
  }

  // ===========================================
  // Initial Setup
  // ===========================================

  async createDefaultAdminUser(): Promise<DatabaseResult> {
    try {
      // Check if any admin exists
      const existingAdmin = await this.db
        .prepare('SELECT COUNT(*) as count FROM admin_users')
        .first<{ count: number }>();

      if (existingAdmin && existingAdmin.count > 0) {
        return { success: true, data: { message: 'Admin users already exist' } };
      }

      // Get default password from environment
      const defaultPassword = this.env.ADMIN_DEFAULT_PASSWORD || 'Aa1234';
      
      // Hash the password using the same method as AuthManager
      const hashedPassword = await this.hashPassword(defaultPassword);
      
      console.log('Creating admin user with:', {
        username: 'admin',
        plainPassword: defaultPassword,
        hashedPassword: hashedPassword
      });
      
      const result = await this.db
        .prepare(
          "INSERT INTO admin_users (username, password_hash, full_name, role, is_active) " +
          "VALUES (?, ?, ?, ?, ?)"
        )
        .bind('admin', hashedPassword, 'System Administrator', 'super_admin', 1)
        .run();

      return { 
        success: true, 
        data: { 
          message: 'Default admin user created',
          adminId: result.meta.last_row_id,
          username: 'admin',
          password: defaultPassword // For initial setup info only
        } 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // เพิ่ม helper method สำหรับ hash password
  private async hashPassword(password: string): Promise<string> {
    // ใช้วิธีเดียวกับ AuthManager
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async createDefaultPeriods(): Promise<DatabaseResult> {
    try {
      // Check if periods exist
      const existingPeriods = await this.db
        .prepare('SELECT COUNT(*) as count FROM periods')
        .first<{ count: number }>();

      if (existingPeriods && existingPeriods.count > 0) {
        return { success: true, data: { message: 'Periods already exist' } };
      }

      // Create default periods (8 periods per day)
      const periods = [
        { period_no: 1, period_name: 'คาบ 1', start_time: '08:40', end_time: '09:30' },
        { period_no: 2, period_name: 'คาบ 2', start_time: '09:30', end_time: '10:20' },
        { period_no: 3, period_name: 'คาบ 3', start_time: '10:20', end_time: '11:10' },
        { period_no: 4, period_name: 'คาบ 4', start_time: '11:10', end_time: '12:00' },
        { period_no: 5, period_name: 'พักเที่ยง', start_time: '12:00', end_time: '13:00' },
        { period_no: 6, period_name: 'คาบ 6', start_time: '13:00', end_time: '13:50' },
        { period_no: 7, period_name: 'คาบ 7', start_time: '13:50', end_time: '14:40' },
        { period_no: 8, period_name: 'คาบ 8', start_time: '14:40', end_time: '15:30' },
      ];

      const stmt = this.db.prepare(`
        INSERT INTO periods (period_no, period_name, start_time, end_time)
        VALUES (?, ?, ?, ?)
      `);

      for (const period of periods) {
        await stmt
          .bind(period.period_no, period.period_name, period.start_time, period.end_time)
          .run();
      }

      return { 
        success: true, 
        data: { 
          message: 'Default periods created',
          periodsCreated: periods.length 
        } 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
