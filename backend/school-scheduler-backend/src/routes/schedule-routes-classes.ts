import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import type { Env, CreateClassRequest } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerClassRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
  // GET /api/schedule/classes
  scheduleRoutes.get('/classes', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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
        const direct = await dbManager.getClassesBySemesterForYear(semesterId, year);
        return c.json(direct);
      }

      const contextResult = await dbManager.getGlobalContext();
      const context = contextResult.data;
      if (!contextResult.success || !context || !context.semester || !context.academic_year?.year) {
        return c.json({ success: false, message: 'No active semester found' }, 400);
      }

      const semesterId = context.semester.id!;
      const year = context.academic_year.year;
      const fallback = await dbManager.getClassesBySemesterForYear(semesterId, year);
      return c.json(fallback);
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
  scheduleRoutes.post('/classes', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const body = await c.req.json<CreateClassRequest>();
      
      // Validate input
      if (!body.grade_level || body.section === undefined || body.section === null) {
        return c.json({
          success: false,
          message: 'Grade level and section are required'
        }, 400);
      }

      const sectionValue = Number(body.section);
      if (!Number.isInteger(sectionValue) || sectionValue <= 0) {
        return c.json({
          success: false,
          message: 'Section must be a positive integer'
        }, 400);
      }
      body.section = sectionValue;

      const dbManager = new DatabaseManager(c.env.DB, c.env);

      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');

      let forYear: number | undefined;
      if (yearParam) {
        const parsedYear = parseInt(yearParam);
        if (isNaN(parsedYear)) {
          return c.json({ success: false, message: 'Invalid year' }, 400);
        }
        forYear = parsedYear;
      }

      if (semesterParam) {
        const parsedSemester = parseInt(semesterParam);
        if (isNaN(parsedSemester)) {
          return c.json({ success: false, message: 'Invalid semesterId' }, 400);
        }
        body.semester_id = parsedSemester;
      }

      if (!forYear || !body.semester_id) {
        const contextResult = await dbManager.getGlobalContext();
        if (!contextResult.success) {
          return c.json({ success: false, message: 'No active academic context found' }, 400);
        }

        if (!forYear) {
          const activeYear = contextResult.data?.academic_year?.year;
          if (!activeYear) {
            return c.json({ success: false, message: 'No active academic year found' }, 400);
          }
          forYear = activeYear;
        }

        if (!body.semester_id) {
          const activeSemesterId = contextResult.data?.semester?.id;
          if (!activeSemesterId) {
            return c.json({ success: false, message: 'No active semester found' }, 400);
          }
          body.semester_id = activeSemesterId;
        }
      }

      if (!forYear || !body.semester_id) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.createClass(body, forYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `classes_${forYear}`;
        await authManager.logActivity(
          user.id!,
          'CREATE_CLASS',
          tableName,
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

  // PUT /api/schedule/classes/:id
  scheduleRoutes.put('/classes/:id', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const classId = parseInt(c.req.param('id'));
      if (Number.isNaN(classId)) {
        return c.json({ success: false, message: 'Invalid class ID' }, 400);
      }

      const payload = await c.req.json<Partial<CreateClassRequest>>();
      const updates: Partial<CreateClassRequest> = {};

      if (typeof payload.grade_level === 'string') {
        const trimmed = payload.grade_level.trim();
        if (!trimmed) {
          return c.json({ success: false, message: 'Grade level cannot be empty' }, 400);
        }
        updates.grade_level = trimmed;
      }

      if (payload.section !== undefined) {
        const sectionValue = Number(payload.section);
        if (!Number.isInteger(sectionValue) || sectionValue <= 0) {
          return c.json({ success: false, message: 'Section must be a positive integer' }, 400);
        }
        updates.section = sectionValue;
      }

      if (!updates.grade_level && updates.section === undefined) {
        return c.json({ success: false, message: 'No class fields to update' }, 400);
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

      const result = await dbManager.updateClass(classId, resolvedSemester, updates, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `classes_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'UPDATE_CLASS',
          tableName,
          classId.toString(),
          null,
          updates
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Update class error:', error);
      return c.json({
        success: false,
        message: 'Failed to update class',
        error: String(error)
      }, 500);
    }
  });

  // DELETE /api/schedule/classes/:id
  scheduleRoutes.delete('/classes/:id', requireAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const classId = parseInt(c.req.param('id'));
      if (Number.isNaN(classId)) {
        return c.json({ success: false, message: 'Invalid class ID' }, 400);
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

      const result = await dbManager.deleteClass(classId, resolvedSemester, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `classes_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'DELETE_CLASS',
          tableName,
          classId.toString(),
          null,
          null
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Delete class error:', error);
      return c.json({
        success: false,
        message: 'Failed to delete class',
        error: String(error)
      }, 500);
    }
  });
}
