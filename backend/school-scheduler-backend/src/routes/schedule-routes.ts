// src/routes/schedule-routes.ts
import { Hono, Context } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import { 
  Env, 
  CreateTeacherRequest, 
  CreateClassRequest, 
  CreateRoomRequest, 
  CreateSubjectRequest,
  CreateScheduleRequest 
} from '../interfaces';
import type { AdminUser } from '../interfaces';

type AppVariables = { user: AdminUser; sessionToken: string; requestId: string };

const scheduleRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Public route(s) for viewing schedules
// Note: Allow anyone to view the timetable of the active semester
scheduleRoutes.get('/timetable', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const dbManager = new DatabaseManager(c.env.DB, c.env);

    // Optional query params for direct selection
    const yearParam = c.req.query('year');
    const semesterParam = c.req.query('semesterId') || c.req.query('semester');
    let schedulesResult;

    if (yearParam && semesterParam) {
      const year = parseInt(yearParam);
      const semesterId = parseInt(semesterParam);
      if (isNaN(year) || isNaN(semesterId)) {
        return c.json({ success: false, message: 'Invalid year or semesterId' }, 400);
      }
      schedulesResult = await dbManager.getSchedulesBySemesterForYear(semesterId, year);
    } else {
      // Fallback to active context
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester) {
        return c.json({ success: false, message: 'No active semester found' }, 400);
      }
      schedulesResult = await dbManager.getSchedulesBySemester(contextResult.data.semester.id!);
    }
    if (!schedulesResult.success) {
      return c.json(schedulesResult);
    }

    const schedules = schedulesResult.data || [];

    // Build timetable grid (1-7 days, 1-12 periods)
    const timetableData: any = {
      days: [1,2,3,4,5,6,7],
      periods: Array.from({ length: 12 }, (_, i) => i + 1),
      grid: {}
    };

    // Initialize grid
    timetableData.days.forEach((d: number) => {
      timetableData.grid[d] = {};
      timetableData.periods.forEach((p: number) => {
        timetableData.grid[d][p] = null;
      });
    });

    // Fill grid
    for (const s of schedules) {
      if (timetableData.grid[s.day_of_week] && typeof timetableData.grid[s.day_of_week][s.period_no] !== 'undefined') {
        timetableData.grid[s.day_of_week][s.period_no] = s;
      }
    }

    // Return in mock-aligned shape: list + grid
    return c.json({ success: true, data: { list: schedules, grid: timetableData.grid } });
  } catch (error) {
    console.error('Public timetable error:', error);
    return c.json({ success: false, message: 'Failed to get timetable', error: String(error) }, 500);
  }
});

// Apply authentication to remaining schedule routes (write/admin operations)
scheduleRoutes.use('*', requireAdmin);

// ===========================================
// Teachers Routes
// ===========================================

// GET /api/schedule/teachers (Get teachers for current active semester)
scheduleRoutes.get('/teachers', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    
    const dbManager = new DatabaseManager(c.env.DB, c.env);
    
    // Get active semester
    const contextResult = await dbManager.getGlobalContext();
    if (!contextResult.success || !contextResult.data?.semester) {
      return c.json({
        success: false,
        message: 'No active semester found'
      }, 400);
    }

    const result = await dbManager.getTeachersBySemester(contextResult.data.semester.id!, page, limit);
    
    return c.json(result);
  } catch (error) {
    console.error('Get teachers error:', error);
    return c.json({
      success: false,
      message: 'Failed to get teachers',
      error: String(error)
    }, 500);
  }
});

// POST /api/schedule/teachers
scheduleRoutes.post('/teachers', requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const body = await c.req.json<CreateTeacherRequest>();
    
    // Validate input
    if (!body.f_name || !body.l_name || !body.subject_group) {
      return c.json({
        success: false,
        message: 'First name, last name, and subject group are required'
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

    // Set semester_id from active context
    body.semester_id = contextResult.data.semester.id!;
    
    const result = await dbManager.createTeacher(body);

    // Log activity
    if (result.success) {
      const user = c.get('user');
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'CREATE_TEACHER',
        `teachers_${contextResult.data.academic_year?.year}`,
        result.data?.id?.toString(),
        null,
        body
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Create teacher error:', error);
    return c.json({
      success: false,
      message: 'Failed to create teacher',
      error: String(error)
    }, 500);
  }
});

// PUT /api/schedule/teachers/:id
scheduleRoutes.put('/teachers/:id', requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const teacherId = parseInt(c.req.param('id'));
    const body = await c.req.json<Partial<CreateTeacherRequest>>();
    
    if (isNaN(teacherId)) {
      return c.json({
        success: false,
        message: 'Invalid teacher ID'
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

    const result = await dbManager.updateTeacher(teacherId, contextResult.data.semester.id!, body);

    // Log activity
    if (result.success) {
      const user = c.get('user');
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'UPDATE_TEACHER',
        `teachers_${contextResult.data.academic_year?.year}`,
        teacherId.toString(),
        null,
        body
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Update teacher error:', error);
    return c.json({
      success: false,
      message: 'Failed to update teacher',
      error: String(error)
    }, 500);
  }
});

// DELETE /api/schedule/teachers/:id
scheduleRoutes.delete('/teachers/:id', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const teacherId = parseInt(c.req.param('id'));
    
    if (isNaN(teacherId)) {
      return c.json({
        success: false,
        message: 'Invalid teacher ID'
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

    const result = await dbManager.deleteTeacher(teacherId, contextResult.data.semester.id!);

    // Log activity
    if (result.success) {
      const user = c.get('user');
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'DELETE_TEACHER',
        `teachers_${contextResult.data.academic_year?.year}`,
        teacherId.toString()
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Delete teacher error:', error);
    return c.json({
      success: false,
      message: 'Failed to delete teacher',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Classes Routes
// ===========================================

// GET /api/schedule/classes
scheduleRoutes.get('/classes', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

    const result = await dbManager.getClassesBySemester(contextResult.data.semester.id!);
    
    return c.json(result);
  } catch (error) {
    console.error('Get classes error:', error);
    return c.json({
      success: false,
      message: 'Failed to get classes',
      error: String(error)
    }, 500);
  }
});

// POST /api/schedule/classes
scheduleRoutes.post('/classes', requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const body = await c.req.json<CreateClassRequest>();
    
    // Validate input
    if (!body.grade_level || !body.section) {
      return c.json({
        success: false,
        message: 'Grade level and section are required'
      }, 400);
    }

    // Validate section is positive number
    if (body.section <= 0) {
      return c.json({
        success: false,
        message: 'Section must be a positive number'
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

    // Set semester_id from active context
    body.semester_id = contextResult.data.semester.id!;
    
    const result = await dbManager.createClass(body);

    // Log activity
    if (result.success) {
      const user = c.get('user');
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'CREATE_CLASS',
        `classes_${contextResult.data.academic_year?.year}`,
        result.data?.id?.toString(),
        null,
        body
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Create class error:', error);
    return c.json({
      success: false,
      message: 'Failed to create class',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Rooms Routes
// ===========================================

// GET /api/schedule/rooms
scheduleRoutes.get('/rooms', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

    const result = await dbManager.getRoomsBySemester(contextResult.data.semester.id!);
    
    return c.json(result);
  } catch (error) {
    console.error('Get rooms error:', error);
    return c.json({
      success: false,
      message: 'Failed to get rooms',
      error: String(error)
    }, 500);
  }
});

// POST /api/schedule/rooms
scheduleRoutes.post('/rooms', requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const body = await c.req.json<CreateRoomRequest>();
    
    // Validate input
    if (!body.room_name || !body.room_type) {
      return c.json({
        success: false,
        message: 'Room name and room type are required'
      }, 400);
    }

    // Validate room type
    if (!['ทั่วไป', 'ปฏิบัติการคอมพิวเตอร์'].includes(body.room_type)) {
      return c.json({
        success: false,
        message: 'Room type must be "ทั่วไป" or "ปฏิบัติการคอมพิวเตอร์"'
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

    // Set semester_id from active context
    body.semester_id = contextResult.data.semester.id!;
    
    const result = await dbManager.createRoom(body);

    // Log activity
    if (result.success) {
      const user = c.get('user');
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'CREATE_ROOM',
        `rooms_${contextResult.data.academic_year?.year}`,
        result.data?.id?.toString(),
        null,
        body
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Create room error:', error);
    return c.json({
      success: false,
      message: 'Failed to create room',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Subjects Routes
// ===========================================

// GET /api/schedule/subjects
scheduleRoutes.get('/subjects', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

    const result = await dbManager.getSubjectsBySemester(contextResult.data.semester.id!);
    
    return c.json(result);
  } catch (error) {
    console.error('Get subjects error:', error);
    return c.json({
      success: false,
      message: 'Failed to get subjects',
      error: String(error)
    }, 500);
  }
});

// POST /api/schedule/subjects
scheduleRoutes.post('/subjects', requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const body = await c.req.json<CreateSubjectRequest>();
    
    // Validate input
    if (!body.teacher_id || !body.class_id || !body.subject_name || !body.periods_per_week) {
      return c.json({
        success: false,
        message: 'Teacher ID, class ID, subject name, and periods per week are required'
      }, 400);
    }

    // Validate periods per week
    if (body.periods_per_week <= 0 || body.periods_per_week > 20) {
      return c.json({
        success: false,
        message: 'Periods per week must be between 1 and 20'
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

    // Set semester_id from active context
    body.semester_id = contextResult.data.semester.id!;
    
    const result = await dbManager.createSubject(body);

    // Log activity
    if (result.success) {
      const user = c.get('user');
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'CREATE_SUBJECT',
        `subjects_${contextResult.data.academic_year?.year}`,
        result.data?.id?.toString(),
        null,
        body
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Create subject error:', error);
    return c.json({
      success: false,
      message: 'Failed to create subject',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Schedules Routes
// ===========================================

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
scheduleRoutes.post('/schedules', requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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
    
    // Get active semester
    const contextResult = await dbManager.getGlobalContext();
    if (!contextResult.success || !contextResult.data?.semester) {
      return c.json({
        success: false,
        message: 'No active semester found'
      }, 400);
    }

    // Set semester_id from active context
    body.semester_id = contextResult.data.semester.id!;
    
    const result = await dbManager.createSchedule(body);

    // Log activity
    if (result.success) {
      const user = c.get('user');
      const authManager = new AuthManager(c.env.DB, c.env);
      await authManager.logActivity(
        user.id!,
        'CREATE_SCHEDULE',
        `schedules_${contextResult.data.academic_year?.year}`,
        result.data?.id?.toString(),
        null,
        body
      );
    }

    return c.json(result);
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
scheduleRoutes.delete('/schedules/:id', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

    const result = await dbManager.deleteSchedule(scheduleId, contextResult.data.semester.id!);

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

// ===========================================
// Utility Routes
// ===========================================

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
scheduleRoutes.get('/conflicts', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

export default scheduleRoutes;
