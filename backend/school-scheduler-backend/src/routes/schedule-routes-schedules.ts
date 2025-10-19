import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import type { Env, CreateScheduleRequest } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerScheduleRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
  // GET /api/schedule/schedules
  scheduleRoutes.get('/schedules', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const dbManager = new DatabaseManager(c.env.DB, c.env);
      
      // Get active semester
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      const result = await dbManager.getSchedulesBySemester(contextResult.data.semester.id!);
      
      return c.json(result);
    } catch (error) {
      console.error('Get schedules error:', error);
      return c.json({
        success: false,
        message: 'Failed to get schedules',
        error: String(error)
      }, 500);
    }
  });

  // POST /api/schedule/schedules
  scheduleRoutes.post('/schedules', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const body = await c.req.json<CreateScheduleRequest>();
      
      // Validate input
      if (!body.subject_id || !body.day_of_week || !body.period_no) {
        return c.json({
          success: false,
          message: 'Subject ID, day of week, and period number are required'
        }, 400);
      }

      // Validate day of week (1-7, Monday-Sunday)
      if (body.day_of_week < 1 || body.day_of_week > 7) {
        return c.json({
          success: false,
          message: 'Day of week must be between 1 (Monday) and 7 (Sunday)'
        }, 400);
      }

      // Validate period number
      if (body.period_no < 1 || body.period_no > 12) {
        return c.json({
          success: false,
          message: 'Period number must be between 1 and 12'
        }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');

      let resolvedYear: number | undefined;
      if (yearParam) {
        const parsedYear = parseInt(yearParam);
        if (isNaN(parsedYear)) {
          return c.json({ success: false, message: 'Invalid year' }, 400);
        }
        resolvedYear = parsedYear;
      }

      if (semesterParam) {
        const parsedSemester = parseInt(semesterParam);
        if (isNaN(parsedSemester)) {
          return c.json({ success: false, message: 'Invalid semesterId' }, 400);
        }
        body.semester_id = parsedSemester;
      }

      if (!body.semester_id || !resolvedYear) {
        const contextResult = await dbManager.getGlobalContext();
        const context = contextResult.data;
        if (!contextResult.success || !context || !context.semester || !context.academic_year?.year) {
          return c.json({ success: false, message: 'No active semester found' }, 400);
        }

        if (!body.semester_id) {
          body.semester_id = context.semester.id!;
        }
        if (!resolvedYear) {
          resolvedYear = context.academic_year.year;
        }
      }

      if (!resolvedYear || !body.semester_id) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.createSchedule(body, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `schedules_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'CREATE_SCHEDULE',
          tableName,
          result.data?.id?.toString(),
          null,
          body
        );
        return c.json(result);
      }

      const err = (result.error || '').toLowerCase();
      const isConflict = err.includes('conflict');
      return c.json(result, isConflict ? 409 : 400);
    } catch (error) {
      console.error('Create schedule error:', error);
      return c.json({
        success: false,
        message: 'Failed to create schedule',
        error: String(error)
      }, 500);
    }
  });

  // DELETE /api/schedule/schedules/:id
  scheduleRoutes.delete('/schedules/:id', requireAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const scheduleId = parseInt(c.req.param('id'));
      
      if (isNaN(scheduleId)) {
        return c.json({
          success: false,
          message: 'Invalid schedule ID'
        }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      
      // Get active semester
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      // Determine year to use
      const yearParam = c.req.query('year');
      let forYear: number | undefined = undefined;
      if (yearParam) {
        const y = parseInt(yearParam);
        if (isNaN(y)) return c.json({ success: false, message: 'Invalid year' }, 400);
        forYear = y;
      } else {
        if (!contextResult.success || !contextResult.data?.academic_year?.year) {
          return c.json({ success: false, message: 'No active academic year found' }, 400);
        }
        forYear = contextResult.data.academic_year.year;
      }

      const result = await dbManager.deleteSchedule(scheduleId, contextResult.data.semester.id!, forYear);

      // Log activity
      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        await authManager.logActivity(
          user.id!,
          'DELETE_SCHEDULE',
          `schedules_${contextResult.data.academic_year?.year}`,
          scheduleId.toString()
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Delete schedule error:', error);
      return c.json({
        success: false,
        message: 'Failed to delete schedule',
        error: String(error)
      }, 500);
    }
  });

  // GET /api/schedule/timetable (Get formatted timetable view)
  scheduleRoutes.get('/timetable', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const view = c.req.query('view') || 'grid'; // grid, teacher, class, room
      const filterBy = c.req.query('filter'); // teacher_id, class_id, room_id
      const filterId = c.req.query('id');
      
      const dbManager = new DatabaseManager(c.env.DB, c.env);
      
      // Get active semester
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      // Get all schedules
      const schedulesResult = await dbManager.getSchedulesBySemester(contextResult.data.semester.id!);
      if (!schedulesResult.success) {
        return c.json(schedulesResult);
      }

      let schedules = schedulesResult.data || [];

      // Apply filters
      if (filterBy && filterId) {
        const id = parseInt(filterId);
        if (!isNaN(id)) {
          schedules = schedules.filter(schedule => {
            switch (filterBy) {
              case 'teacher':
                return schedule.teacher_id === id;
              case 'class':
                return schedule.class_id === id;
              case 'room':
                return schedule.room_id === id;
              default:
                return true;
            }
          });
        }
      }

      // Format data based on view
      const timetableData = {
        view,
        filter: filterBy ? { type: filterBy, id: filterId } : null,
        schedules,
        grid: {} as any,
        summary: {
          total_schedules: schedules.length,
          days_with_classes: [...new Set(schedules.map(s => s.day_of_week))].length,
          periods_used: [...new Set(schedules.map(s => s.period_no))].length
        }
      };

      // Create grid format (day x period matrix)
      for (let day = 1; day <= 7; day++) {
        timetableData.grid[day] = {};
        for (let period = 1; period <= 12; period++) {
          const schedule = schedules.find(s => s.day_of_week === day && s.period_no === period);
          timetableData.grid[day][period] = schedule || null;
        }
      }

      return c.json({
        success: true,
        data: timetableData
      });
    } catch (error) {
      console.error('Get timetable error:', error);
      return c.json({
        success: false,
        message: 'Failed to get timetable',
        error: String(error)
      }, 500);
    }
  });

  // GET /api/schedule/conflicts (Check for scheduling conflicts)
  scheduleRoutes.get('/conflicts', requireAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const dbManager = new DatabaseManager(c.env.DB, c.env);
      
      // Get active semester
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      // Get all schedules
      const schedulesResult = await dbManager.getSchedulesBySemester(contextResult.data.semester.id!);
      if (!schedulesResult.success) {
        return c.json(schedulesResult);
      }

      const schedules = schedulesResult.data || [];
      const conflicts: any[] = [];

      // Check for conflicts
      const timeSlots = new Map<string, any[]>();

      schedules.forEach(schedule => {
        const key = `${schedule.day_of_week}_${schedule.period_no}`;
        if (!timeSlots.has(key)) {
          timeSlots.set(key, []);
        }
        timeSlots.get(key)!.push(schedule);
      });

      // Find conflicts
      timeSlots.forEach((schedulesAtTime, timeSlot) => {
        if (schedulesAtTime.length > 1) {
          // Check for teacher conflicts
          const teachers = new Map();
          const classes = new Map();
          const rooms = new Map();

          schedulesAtTime.forEach(schedule => {
            if (schedule.teacher_id) {
              if (!teachers.has(schedule.teacher_id)) {
                teachers.set(schedule.teacher_id, []);
              }
              teachers.get(schedule.teacher_id).push(schedule);
            }

            if (schedule.class_id) {
              if (!classes.has(schedule.class_id)) {
                classes.set(schedule.class_id, []);
              }
              classes.get(schedule.class_id).push(schedule);
            }

            if (schedule.room_id) {
              if (!rooms.has(schedule.room_id)) {
                rooms.set(schedule.room_id, []);
              }
              rooms.get(schedule.room_id).push(schedule);
            }
          });

          // Report conflicts
          teachers.forEach((schedules, teacherId) => {
            if (schedules.length > 1) {
              conflicts.push({
                type: 'teacher_conflict',
                time_slot: timeSlot,
                teacher_id: teacherId,
                teacher_name: schedules[0].teacher_name,
                schedules: schedules
              });
            }
          });

          classes.forEach((schedules, classId) => {
            if (schedules.length > 1) {
              conflicts.push({
                type: 'class_conflict',
                time_slot: timeSlot,
                class_id: classId,
                class_name: schedules[0].class_name,
                schedules: schedules
              });
            }
          });

          rooms.forEach((schedules, roomId) => {
            if (schedules.length > 1) {
              conflicts.push({
                type: 'room_conflict',
                time_slot: timeSlot,
                room_id: roomId,
                room_name: schedules[0].room_name,
                schedules: schedules
              });
            }
          });
        }
      });

      return c.json({
        success: true,
        data: {
          conflicts,
          conflict_count: conflicts.length,
          has_conflicts: conflicts.length > 0
        }
      });
    } catch (error) {
      console.error('Get conflicts error:', error);
      return c.json({
        success: false,
        message: 'Failed to check conflicts',
        error: String(error)
      }, 500);
    }
  });
}
