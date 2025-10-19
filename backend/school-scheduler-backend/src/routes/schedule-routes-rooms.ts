import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import type { Env, CreateRoomRequest } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerRoomRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
  // GET /api/schedule/rooms
  scheduleRoutes.get('/rooms', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const dbManager = new DatabaseManager(c.env.DB, c.env);
      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');
      if (yearParam && semesterParam) {
        const year = parseInt(yearParam);
        const semesterId = parseInt(semesterParam);
        if (isNaN(year) || isNaN(semesterId)) {
          return c.json({ success: false, message: 'Invalid year or semesterId' }, 400);
        }
        const direct = await dbManager.getRoomsBySemesterForYear(semesterId, year);
        return c.json(direct);
      }

      const contextResult = await dbManager.getGlobalContext();
      const context = contextResult.data;
      if (!contextResult.success || !context || !context.semester || !context.academic_year?.year) {
        return c.json({ success: false, message: 'No active semester found' }, 400);
      }

      const semesterId = context.semester.id!;
      const year = context.academic_year.year;
      const fallback = await dbManager.getRoomsBySemesterForYear(semesterId, year);
      return c.json(fallback);
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
  scheduleRoutes.post('/rooms', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

      const result = await dbManager.createRoom(body, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `rooms_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'CREATE_ROOM',
          tableName,
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

  // PUT /api/schedule/rooms/:id
  scheduleRoutes.put('/rooms/:id', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const roomId = parseInt(c.req.param('id'));
      if (Number.isNaN(roomId)) {
        return c.json({ success: false, message: 'Invalid room ID' }, 400);
      }

      const payload = await c.req.json<Partial<CreateRoomRequest>>();
      const updates: Partial<CreateRoomRequest> = {};

      if (typeof payload.room_name === 'string') {
        const trimmed = payload.room_name.trim();
        if (!trimmed) {
          return c.json({ success: false, message: 'Room name cannot be empty' }, 400);
        }
        updates.room_name = trimmed;
      }

      if (payload.room_type !== undefined) {
        if (!['ทั่วไป', 'ปฏิบัติการคอมพิวเตอร์'].includes(payload.room_type)) {
          return c.json({
            success: false,
            message: 'Room type must be "ทั่วไป" or "ปฏิบัติการคอมพิวเตอร์"'
          }, 400);
        }
        updates.room_type = payload.room_type;
      }

      if (!updates.room_name && !updates.room_type) {
        return c.json({ success: false, message: 'No room fields to update' }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');

      let resolvedYear: number | undefined;
      let resolvedSemester: number | undefined;

      if (yearParam) {
        const parsedYear = parseInt(yearParam);
        if (Number.isNaN(parsedYear)) {
          return c.json({ success: false, message: 'Invalid year' }, 400);
        }
        resolvedYear = parsedYear;
      }

      if (semesterParam) {
        const parsedSemester = parseInt(semesterParam);
        if (Number.isNaN(parsedSemester)) {
          return c.json({ success: false, message: 'Invalid semesterId' }, 400);
        }
        resolvedSemester = parsedSemester;
      }

      if (!resolvedYear || !resolvedSemester) {
        const contextResult = await dbManager.getGlobalContext();
        const context = contextResult.data;
        if (!contextResult.success || !context || !context.semester || !context.academic_year?.year) {
          return c.json({ success: false, message: 'No active semester found' }, 400);
        }

        if (!resolvedYear) {
          resolvedYear = context.academic_year.year;
        }
        if (!resolvedSemester) {
          resolvedSemester = context.semester.id!;
        }
      }

      if (!resolvedYear || !resolvedSemester) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.updateRoom(roomId, resolvedSemester, updates, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `rooms_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'UPDATE_ROOM',
          tableName,
          roomId.toString(),
          null,
          updates
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Update room error:', error);
      return c.json({
        success: false,
        message: 'Failed to update room',
        error: String(error)
      }, 500);
    }
  });

  // DELETE /api/schedule/rooms/:id
  scheduleRoutes.delete('/rooms/:id', requireAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const roomId = parseInt(c.req.param('id'));
      if (Number.isNaN(roomId)) {
        return c.json({ success: false, message: 'Invalid room ID' }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');

      let resolvedYear: number | undefined;
      let resolvedSemester: number | undefined;

      if (yearParam) {
        const parsedYear = parseInt(yearParam);
        if (Number.isNaN(parsedYear)) {
          return c.json({ success: false, message: 'Invalid year' }, 400);
        }
        resolvedYear = parsedYear;
      }

      if (semesterParam) {
        const parsedSemester = parseInt(semesterParam);
        if (Number.isNaN(parsedSemester)) {
          return c.json({ success: false, message: 'Invalid semesterId' }, 400);
        }
        resolvedSemester = parsedSemester;
      }

      if (!resolvedYear || !resolvedSemester) {
        const contextResult = await dbManager.getGlobalContext();
        const context = contextResult.data;
        if (!contextResult.success || !context || !context.semester || !context.academic_year?.year) {
          return c.json({ success: false, message: 'No active semester found' }, 400);
        }

        if (!resolvedYear) {
          resolvedYear = context.academic_year.year;
        }
        if (!resolvedSemester) {
          resolvedSemester = context.semester.id!;
        }
      }

      if (!resolvedYear || !resolvedSemester) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.deleteRoom(roomId, resolvedSemester, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `rooms_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'DELETE_ROOM',
          tableName,
          roomId.toString(),
          null,
          null
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Delete room error:', error);
      return c.json({
        success: false,
        message: 'Failed to delete room',
        error: String(error)
      }, 500);
    }
  });
}
