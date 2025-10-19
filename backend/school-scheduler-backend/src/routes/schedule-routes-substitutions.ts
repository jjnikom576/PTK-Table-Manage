import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { SchemaManager } from '../database/schema-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import type { Env } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerSubstitutionRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
  // Substitutions Routes
  // ===========================================

  // GET /api/schedule/substitutions/stats - Get substitution statistics for all teachers
  // นับจากคอลัมน์ period_1 ถึง period_9 ว่าครูแต่ละคนสอนแทนกี่ครั้ง
  scheduleRoutes.get('/substitutions/stats', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const dbManager = new DatabaseManager(c.env.DB, c.env);

      // Get active context
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester || !contextResult.data?.academic_year?.year) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      const semester = contextResult.data.semester;
      const year = contextResult.data.academic_year.year;
      const tableName = "substitutions_" + year;
      const teachersTableName = "teachers_" + year;

      // ⭐ ตรวจสอบว่า table มีหรือยัง ถ้าไม่มีให้ return empty stats
      const checkTableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
      const tableExists: any = await c.env.DB.prepare(checkTableQuery).bind(tableName).first();

      if (!tableExists) {
        // Table doesn't exist yet, return empty stats
        return c.json({
          success: true,
          data: {}
        });
      }

      // Query: นับจำนวนครั้งที่ครูแต่ละคนสอนแทน (normalized schema)
      const query = "SELECT substitute_teacher_id as teacher_id, COUNT(*) as total_count " +
        "FROM " + tableName + " " +
        "WHERE semester_id = ? AND substitute_teacher_id IS NOT NULL " +
        "GROUP BY substitute_teacher_id";

      const results: any = await c.env.DB.prepare(query).bind(semester.id).all();

      if (!results.success) {
        return c.json({
          success: false,
          message: 'Failed to query substitution stats'
        }, 500);
      }

      // Build stats object { teacher_id: count }
      const stats: Record<number, number> = {};
      (results.results || []).forEach((row: any) => {
        stats[row.teacher_id] = row.total_count;
      });

      return c.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get substitution stats error:', error);
      return c.json({
        success: false,
        message: 'Failed to get substitution stats',
        error: String(error)
      }, 500);
    }
  });

  // POST /api/schedule/substitutions - Submit substitution assignments
  // รับข้อมูลเป็น { date, absentTeachers: [{ teacherId, day_of_week, periods: { 1: substituteId, 2: substituteId, ... } }] }
  scheduleRoutes.post('/substitutions', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const body = await c.req.json<{
        date: string;
        absentTeachers: Array<{
          teacherId: number;
          day_of_week: number;
          periods: Record<number, number>; // { period_number: substitute_teacher_id }
        }>;
      }>();

      if (!body.date || !Array.isArray(body.absentTeachers) || body.absentTeachers.length === 0) {
        return c.json({
          success: false,
          message: 'Date and absentTeachers array are required'
        }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);

      // Get active context
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester || !contextResult.data?.academic_year?.year) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      const semester = contextResult.data.semester;
      const year = contextResult.data.academic_year.year;
      const tableName = "substitutions_" + year;

      // ⭐ ใช้ SchemaManager สร้าง table แทน (ให้ได้ schema ที่ถูกต้อง)
      const schemaManager = new SchemaManager(c.env.DB, c.env);
      await schemaManager.createDynamicTablesForYear(year);

      // ⭐ เช็คว่ามี force parameter หรือไม่
      const forceParam = c.req.query('force');
      const forceReplace = forceParam === 'true' || forceParam === '1';
      const teachersTableName = "teachers_" + year;
      
      let existingRecordsSummary: Array<{ absent_teacher_id: number; count: number; teacher_name: string | null }> = [];

      if (forceReplace) {
        const deleteQuery = "DELETE FROM " + tableName + " WHERE semester_id = ? AND absent_date = ?";
        await c.env.DB.prepare(deleteQuery).bind(semester.id, body.date).run();
        console.log('[Substitutions] Deleted existing records for date:', body.date);
      } else {
        const existingQuery =
          "SELECT sub.absent_teacher_id, COUNT(*) as count, t.full_name AS teacher_name " +
          "FROM " + tableName + " sub " +
          "LEFT JOIN " + teachersTableName + " t ON sub.absent_teacher_id = t.id " +
          "WHERE sub.semester_id = ? AND sub.absent_date = ? " +
          "GROUP BY sub.absent_teacher_id, t.full_name";

        const existingResult: any = await c.env.DB.prepare(existingQuery)
          .bind(semester.id, body.date)
          .all();

        if (!existingResult.success) {
          return c.json({
            success: false,
            message: 'Failed to check existing substitution records'
          }, 500);
        }

        existingRecordsSummary = existingResult.results || [];

        if (existingRecordsSummary.length > 0) {
          const existingCount = existingRecordsSummary.reduce((sum: number, row: any) => sum + (row.count || 0), 0);

          return c.json({
            success: false,
            error: 'DUPLICATE_DATE',
            message: 'พบการบันทึกการสอนแทนในวันดังกล่าวอยู่แล้ว',
            data: {
              date: body.date,
              existing_count: existingCount,
              teachers: existingRecordsSummary.map((row: any) => ({
                teacher_id: row.absent_teacher_id,
                teacher_name: row.teacher_name || null,
                periods: row.count
              }))
            }
          }, 409);
        }
      }

      // ⭐ Get schedules table to find schedule_id and subject_id
      const schedulesTable = "schedules_" + year;

      // Insert records for each absent teacher's schedule
      const insertedIds: number[] = [];
      const user = c.get('user');

      for (const absentTeacher of body.absentTeachers) {
        const { teacherId, day_of_week, periods } = absentTeacher;

        // Insert one row per period (normalized schema)
        for (const [periodNoStr, substituteTeacherId] of Object.entries(periods)) {
          const periodNo = parseInt(periodNoStr);

          // Find the schedule_id for this absent teacher, day, and period
          const scheduleQuery = "SELECT s.id as schedule_id, s.subject_id " +
            "FROM " + schedulesTable + " s " +
            "INNER JOIN subjects_" + year + " subj ON s.subject_id = subj.id " +
            "WHERE s.semester_id = ? AND subj.teacher_id = ? AND s.day_of_week = ? AND s.period_no = ?";

          const schedule: any = await c.env.DB.prepare(scheduleQuery)
            .bind(semester.id, teacherId, day_of_week, periodNo)
            .first();

          if (!schedule) {
            console.warn(`[Substitutions] No schedule found for teacher ${teacherId}, day ${day_of_week}, period ${periodNo}`);
            continue;
          }

          // Insert substitution record
          const insertQuery = "INSERT INTO " + tableName + " (" +
            "semester_id, absent_date, absent_teacher_id, reason, schedule_id, subject_id, substitute_teacher_id, status" +
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

          const result = await c.env.DB.prepare(insertQuery)
            .bind(
              semester.id,
              body.date,
              teacherId,
              'ไปราชการ', // default reason
              schedule.schedule_id,
              schedule.subject_id,
              substituteTeacherId,
              'assigned'
            )
            .run();

          if (result.meta?.last_row_id) {
            insertedIds.push(result.meta.last_row_id);
          }
        }
      }

      // Log activity
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'CREATE_SUBSTITUTION',
        tableName,
        insertedIds.join(','),
        null,
        { date: body.date, absent_count: body.absentTeachers.length }
      );

      return c.json({
        success: true,
        message: "Successfully created " + insertedIds.length + " substitution records",
        data: {
          inserted_count: insertedIds.length,
          ids: insertedIds
        }
      });
    } catch (error) {
      console.error('Create substitutions error:', error);
      return c.json({
        success: false,
        message: 'Failed to create substitutions',
        error: String(error)
      }, 500);
    }
  });

  // GET /api/schedule/substitutions/hall-of-fame - PUBLIC endpoint for Hall of Fame display
  // ดึงข้อมูลครูทั้งหมดพร้อมสถิติการสอนแทน
  scheduleRoutes.get('/substitutions/hall-of-fame', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const dbManager = new DatabaseManager(c.env.DB, c.env);

      // Get active context
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester || !contextResult.data?.academic_year?.year) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      const semester = contextResult.data.semester;
      const year = contextResult.data.academic_year.year;
      const teachersTableName = "teachers_" + year;
      const substitutionsTableName = "substitutions_" + year;

      // ⭐ ดึงข้อมูลครูทั้งหมด
      const teachersQuery = "SELECT * FROM " + teachersTableName + " WHERE semester_id = ? ORDER BY full_name ASC";
      const teachersResult: any = await c.env.DB.prepare(teachersQuery).bind(semester.id).all();

      if (!teachersResult.success) {
        return c.json({
          success: false,
          message: 'Failed to get teachers'
        }, 500);
      }

      const teachers = teachersResult.results || [];

      // ⭐ ตรวจสอบว่า substitutions table มีหรือยัง
      const checkTableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
      const tableExists: any = await c.env.DB.prepare(checkTableQuery).bind(substitutionsTableName).first();

      let substitutionStats: Record<number, number> = {};

      if (tableExists) {
        // ⭐ นับจำนวนครั้งที่แต่ละครูสอนแทน (normalized schema)
        const statsQuery = "SELECT substitute_teacher_id, COUNT(*) as count " +
          "FROM " + substitutionsTableName + " " +
          "WHERE semester_id = ? AND substitute_teacher_id IS NOT NULL " +
          "GROUP BY substitute_teacher_id";

        const statsResult: any = await c.env.DB.prepare(statsQuery).bind(semester.id).all();

        if (statsResult.success) {
          (statsResult.results || []).forEach((row: any) => {
            substitutionStats[row.substitute_teacher_id] = row.count;
          });
        }
      }

      // ⭐ รวมข้อมูลครูกับสถิติ
      const hallOfFameData = teachers.map((teacher: any) => ({
        id: teacher.id,
        full_name: teacher.full_name,
        title: teacher.title,
        f_name: teacher.f_name,
        l_name: teacher.l_name,
        subject_group: teacher.subject_group,
        substitution_count: substitutionStats[teacher.id] || 0
      }));

      // ⭐ เรียงตามจำนวนครั้งที่สอนแทน (มาก -> น้อย)
      hallOfFameData.sort((a: any, b: any) => b.substitution_count - a.substitution_count);

      return c.json({
        success: true,
        data: {
          teachers: hallOfFameData,
          semester: {
            id: semester.id,
            semester_name: semester.semester_name
          },
          academic_year: {
            year: year
          }
        }
      });
    } catch (error) {
      console.error('Get hall of fame error:', error);
      return c.json({
        success: false,
        message: 'Failed to get hall of fame',
        error: String(error)
      }, 500);
    }
  });

  // GET /api/schedule/substitutions/teacher/:id - Get all substitution dates for a teacher
  scheduleRoutes.get('/substitutions/teacher/:id', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const teacherId = parseInt(c.req.param('id'));
      if (isNaN(teacherId)) {
        return c.json({ success: false, message: 'Invalid teacher ID' }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);

      // Get active context
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester || !contextResult.data?.academic_year?.year) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      const semester = contextResult.data.semester;
      const year = contextResult.data.academic_year.year;
      const tableName = "substitutions_" + year;

      // Check if table exists
      const checkTableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
      const tableExists: any = await c.env.DB.prepare(checkTableQuery).bind(tableName).first();

      if (!tableExists) {
        return c.json({
          success: true,
          data: { dates: [], total_count: 0 }
        });
      }

      // Query to find all dates where this teacher substituted (normalized schema)
      const query = "SELECT DISTINCT absent_date as date FROM " + tableName + " " +
        "WHERE semester_id = ? AND substitute_teacher_id = ? " +
        "ORDER BY absent_date DESC";

      const result: any = await c.env.DB.prepare(query).bind(semester.id, teacherId).all();

      if (!result.success) {
        return c.json({
          success: false,
          message: 'Failed to query substitution dates'
        }, 500);
      }

      const dates = (result.results || []).map((row: any) => row.date);

      return c.json({
        success: true,
        data: {
          teacher_id: teacherId,
          dates: dates,
          total_count: dates.length
        }
      });

    } catch (error) {
      console.error('Get teacher substitutions error:', error);
      return c.json({
        success: false,
        message: 'Failed to get teacher substitutions',
        error: String(error)
      }, 500);
    }
  });

  // GET /api/schedule/substitutions/date/:date - Get all substitution details for a specific date (PUBLIC)
  scheduleRoutes.get('/substitutions/date/:date', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const date = c.req.param('date');

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ success: false, message: 'Invalid date format (expected YYYY-MM-DD)' }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);

      // Get active context
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester || !contextResult.data?.academic_year?.year) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      const semester = contextResult.data.semester;
      const year = contextResult.data.academic_year.year;
      const tableName = "substitutions_" + year;
      const teachersTableName = "teachers_" + year;

      // Check if table exists
      const checkTableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
      const tableExists: any = await c.env.DB.prepare(checkTableQuery).bind(tableName).first();

      if (!tableExists) {
        return c.json({
          success: true,
          data: { date: date, absent_teachers: [], available_dates: [] }
        });
      }

      // Get list of available substitution dates (latest first)
      const availableDatesQuery = "SELECT absent_date, COUNT(*) as count " +
        "FROM " + tableName + " " +
        "WHERE semester_id = ? " +
        "GROUP BY absent_date " +
        "ORDER BY absent_date DESC " +
        "LIMIT 30";

      const availableDatesResult: any = await c.env.DB.prepare(availableDatesQuery)
        .bind(semester.id)
        .all();

      const availableDates = (availableDatesResult?.results || []).map((row: any) => ({
        date: row.absent_date,
        count: row.count
      }));

      // Get all substitution records for this date
      const schedulesTable = "schedules_" + year;
      const subjectsTable = "subjects_" + year;
      const classesTable = "classes_" + year;
      const roomsTable = "rooms_" + year;

      const query = "SELECT " +
        "sub.id, sub.schedule_id, sub.subject_id, sub.absent_teacher_id, sub.substitute_teacher_id, " +
        "sched.period_no, sched.class_id, sched.room_id, " +
        "subj.subject_name, " +
        "cls.class_name, " +
        "rm.room_name, " +
        "at.full_name as absent_teacher_name, " +
        "st.full_name as substitute_teacher_name " +
        "FROM " + tableName + " sub " +
        "INNER JOIN " + schedulesTable + " sched ON sub.schedule_id = sched.id " +
        "LEFT JOIN " + subjectsTable + " subj ON sub.subject_id = subj.id " +
        "LEFT JOIN " + classesTable + " cls ON sched.class_id = cls.id " +
        "LEFT JOIN " + roomsTable + " rm ON sched.room_id = rm.id " +
        "LEFT JOIN " + teachersTableName + " at ON sub.absent_teacher_id = at.id " +
        "LEFT JOIN " + teachersTableName + " st ON sub.substitute_teacher_id = st.id " +
        "WHERE sub.semester_id = ? AND sub.absent_date = ? " +
        "ORDER BY sub.absent_teacher_id, sched.period_no";

      const result: any = await c.env.DB.prepare(query).bind(semester.id, date).all();

      if (!result.success) {
        return c.json({
          success: false,
          message: 'Failed to query substitution records'
        }, 500);
      }

      // Group by absent teacher
      const groupedByTeacher: { [key: number]: any } = {};

      (result.results || []).forEach((row: any) => {
        const absentTeacherId = row.absent_teacher_id;

        if (!groupedByTeacher[absentTeacherId]) {
          groupedByTeacher[absentTeacherId] = {
            teacher_id: absentTeacherId,
            teacher_name: row.absent_teacher_name || 'Unknown',
            periods: []
          };
        }

        groupedByTeacher[absentTeacherId].periods.push({
          period_no: row.period_no,
          subject_name: row.subject_name || 'N/A',
          class_name: row.class_name || 'N/A',
          room_name: row.room_name || 'N/A',
          substitute_teacher_id: row.substitute_teacher_id,
          substitute_teacher_name: row.substitute_teacher_name || 'ว่าง'
        });
      });

      const absent_teachers = Object.values(groupedByTeacher);

      return c.json({
        success: true,
        data: {
          date: date,
          absent_teachers: absent_teachers,
          available_dates: availableDates
        }
      });

    } catch (error) {
      console.error('Get substitution by date error:', error);
      return c.json({
        success: false,
        message: 'Failed to get substitution data',
        error: String(error)
      }, 500);
    }
  });

  // GET /api/schedule/substitutions/teacher/:id/date/:date - Get substitution details for a teacher on a specific date
  scheduleRoutes.get('/substitutions/teacher/:id/date/:date', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const teacherId = parseInt(c.req.param('id'));
      const date = c.req.param('date');

      if (isNaN(teacherId)) {
        return c.json({ success: false, message: 'Invalid teacher ID' }, 400);
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ success: false, message: 'Invalid date format (expected YYYY-MM-DD)' }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);

      // Get active context
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester || !contextResult.data?.academic_year?.year) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      const semester = contextResult.data.semester;
      const year = contextResult.data.academic_year.year;
      const tableName = "substitutions_" + year;
      const teachersTableName = "teachers_" + year;

      // Check if table exists
      const checkTableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
      const tableExists: any = await c.env.DB.prepare(checkTableQuery).bind(tableName).first();

      if (!tableExists) {
        return c.json({
          success: true,
          data: { periods: [] }
        });
      }

      // Get all substitution records for this teacher on this date (normalized schema)
      const schedulesTable = "schedules_" + year;
      const subjectsTable = "subjects_" + year;
      const classesTable = "classes_" + year;
      const roomsTable = "rooms_" + year;

      const query = "SELECT " +
        "sub.id, sub.schedule_id, sub.subject_id, sub.absent_teacher_id, " +
        "sched.period_no, sched.class_id, sched.room_id, " +
        "subj.subject_name, " +
        "cls.class_name, " +
        "rm.room_name, " +
        "t.full_name as absent_teacher_name " +
        "FROM " + tableName + " sub " +
        "INNER JOIN " + schedulesTable + " sched ON sub.schedule_id = sched.id " +
        "LEFT JOIN " + subjectsTable + " subj ON sub.subject_id = subj.id " +
        "LEFT JOIN " + classesTable + " cls ON sched.class_id = cls.id " +
        "LEFT JOIN " + roomsTable + " rm ON sched.room_id = rm.id " +
        "LEFT JOIN " + teachersTableName + " t ON sub.absent_teacher_id = t.id " +
        "WHERE sub.semester_id = ? AND sub.absent_date = ? AND sub.substitute_teacher_id = ? " +
        "ORDER BY sched.period_no";

      const result: any = await c.env.DB.prepare(query).bind(semester.id, date, teacherId).all();

      if (!result.success) {
        return c.json({
          success: false,
          message: 'Failed to query substitution details'
        }, 500);
      }

      const periods = (result.results || []).map((row: any) => ({
        period_no: row.period_no,
        absent_teacher_id: row.absent_teacher_id,
        absent_teacher_name: row.absent_teacher_name || 'Unknown',
        class_name: row.class_name || 'N/A',
        subject_name: row.subject_name || 'N/A',
        room_name: row.room_name || 'N/A'
      }));

      return c.json({
        success: true,
        data: {
          teacher_id: teacherId,
          date: date,
          periods: periods
        }
      });

    } catch (error) {
      console.error('Get substitution details error:', error);
      return c.json({
        success: false,
        message: 'Failed to get substitution details',
        error: String(error)
      }, 500);
    }
  });
}
