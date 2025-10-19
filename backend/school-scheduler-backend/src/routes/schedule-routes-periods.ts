import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import type { Env, CreatePeriodRequest } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerPeriodRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
  scheduleRoutes.get('/periods', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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
        const direct = await dbManager.getPeriodsBySemesterForYear(semesterId, year);
        return c.json(direct);
      }

      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.academic_year?.year || !contextResult.data?.semester?.id) {
        return c.json({ success: false, message: 'No active academic context found' }, 400);
      }

      const fallback = await dbManager.getPeriodsBySemesterForYear(
        contextResult.data.semester.id!,
        contextResult.data.academic_year.year
      );
      return c.json(fallback);
    } catch (error) {
      console.error('Get periods error:', error);
      return c.json({
        success: false,
        message: 'Failed to get periods',
        error: String(error)
      }, 500);
    }
  });

  scheduleRoutes.post('/periods', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const body = await c.req.json<CreatePeriodRequest>();

      const parsedPeriodNo = parseInt(String(body.period_no), 10);
      if (!Number.isInteger(parsedPeriodNo) || parsedPeriodNo <= 0) {
        return c.json({ success: false, message: 'Period number must be a positive integer' }, 400);
      }
      body.period_no = parsedPeriodNo;

      body.period_name = body.period_name?.trim();
      if (!body.period_name) {
        return c.json({ success: false, message: 'Period name is required' }, 400);
      }

      if (!body.start_time || !body.end_time) {
        return c.json({ success: false, message: 'Start time and end time are required' }, 400);
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(body.start_time) || !timeRegex.test(body.end_time)) {
        return c.json({ success: false, message: 'Times must be in HH:MM format' }, 400);
      }

      if (body.start_time >= body.end_time) {
        return c.json({ success: false, message: 'Start time must be before end time' }, 400);
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
        if (!contextResult.success || !contextResult.data?.semester?.id || !contextResult.data?.academic_year?.year) {
          return c.json({ success: false, message: 'No active academic context found' }, 400);
        }

        if (!body.semester_id) {
          body.semester_id = contextResult.data.semester.id!;
        }
        if (!resolvedYear) {
          resolvedYear = contextResult.data.academic_year.year;
        }
      }

      if (!resolvedYear || !body.semester_id) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.createPeriod(body, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `periods_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'CREATE_PERIOD',
          tableName,
          result.data?.id?.toString(),
          null,
          body
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Create period error:', error);
      return c.json({
        success: false,
        message: 'Failed to create period',
        error: String(error)
      }, 500);
    }
  });

  scheduleRoutes.put('/periods/:id', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const periodId = parseInt(c.req.param('id'));
      if (Number.isNaN(periodId)) {
        return c.json({ success: false, message: 'Invalid period ID' }, 400);
      }

      const payload = await c.req.json<Partial<CreatePeriodRequest>>();

      if (payload.period_no !== undefined) {
        const parsedPeriodNo = parseInt(String(payload.period_no), 10);
        if (!Number.isInteger(parsedPeriodNo) || parsedPeriodNo <= 0) {
          return c.json({ success: false, message: 'Period number must be a positive integer' }, 400);
        }
        payload.period_no = parsedPeriodNo;
      }

      if (payload.period_name !== undefined) {
        const trimmedName = payload.period_name.trim();
        if (!trimmedName) {
          return c.json({ success: false, message: 'Period name cannot be empty' }, 400);
        }
        payload.period_name = trimmedName;
      }

      if ((payload.start_time !== undefined && payload.end_time === undefined) ||
        (payload.start_time === undefined && payload.end_time !== undefined)) {
        return c.json({ success: false, message: 'Both start time and end time must be provided' }, 400);
      }

      if (payload.start_time !== undefined && payload.end_time !== undefined) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(payload.start_time) || !timeRegex.test(payload.end_time)) {
          return c.json({ success: false, message: 'Times must be in HH:MM format' }, 400);
        }
        if (payload.start_time >= payload.end_time) {
          return c.json({ success: false, message: 'Start time must be before end time' }, 400);
        }
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');

      let resolvedYear: number | undefined;
      let resolvedSemester: number | undefined;

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
        resolvedSemester = parsedSemester;
      }

      if (!resolvedYear || !resolvedSemester) {
        const contextResult = await dbManager.getGlobalContext();
        if (!contextResult.success || !contextResult.data?.semester?.id || !contextResult.data?.academic_year?.year) {
          return c.json({ success: false, message: 'No active academic context found' }, 400);
        }

        if (!resolvedYear) {
          resolvedYear = contextResult.data.academic_year.year;
        }
        if (!resolvedSemester) {
          resolvedSemester = contextResult.data.semester.id!;
        }
      }

      if (!resolvedYear || !resolvedSemester) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.updatePeriod(periodId, resolvedSemester, payload, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `periods_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'UPDATE_PERIOD',
          tableName,
          periodId.toString(),
          null,
          payload
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Update period error:', error);
      return c.json({
        success: false,
        message: 'Failed to update period',
        error: String(error)
      }, 500);
    }
  });

  scheduleRoutes.delete('/periods/:id', requireAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const periodId = parseInt(c.req.param('id'));
      if (Number.isNaN(periodId)) {
        return c.json({ success: false, message: 'Invalid period ID' }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');

      let resolvedYear: number | undefined;
      let resolvedSemester: number | undefined;

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
        resolvedSemester = parsedSemester;
      }

      if (!resolvedYear || !resolvedSemester) {
        const contextResult = await dbManager.getGlobalContext();
        if (!contextResult.success || !contextResult.data?.semester?.id || !contextResult.data?.academic_year?.year) {
          return c.json({ success: false, message: 'No active academic context found' }, 400);
        }

        if (!resolvedYear) {
          resolvedYear = contextResult.data.academic_year.year;
        }
        if (!resolvedSemester) {
          resolvedSemester = contextResult.data.semester.id!;
        }
      }

      if (!resolvedYear || !resolvedSemester) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.deletePeriod(periodId, resolvedSemester, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `periods_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'DELETE_PERIOD',
          tableName,
          periodId.toString(),
          null,
          null
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Delete period error:', error);
      return c.json({
        success: false,
        message: 'Failed to delete period',
        error: String(error)
      }, 500);
    }
  });
}
