import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import type { Env, CreateTeacherRequest } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerTeacherRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
  // GET /api/schedule/teachers (Get teachers for current active semester)
  scheduleRoutes.get('/teachers', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '50');
      
      const dbManager = new DatabaseManager(c.env.DB, c.env);
      // Allow explicit year/semester selection via query
      const yearParam = c.req.query('year');
      const semesterParam = c.req.query('semesterId') || c.req.query('semester_id');
      if (yearParam && semesterParam) {
        const year = parseInt(yearParam);
        const semesterId = parseInt(semesterParam);
        if (isNaN(year) || isNaN(semesterId)) {
          return c.json({ success: false, message: 'Invalid year or semesterId' }, 400);
        }
        const direct = await dbManager.getTeachersBySemesterForYear(semesterId, year, page, limit);
        return c.json(direct);
      }
      // Require explicit year+semesterId
      return c.json({ success: false, message: 'year and semesterId are required' }, 400);
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
  scheduleRoutes.post('/teachers', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const body = await c.req.json<CreateTeacherRequest>();
      
      // Validate input
      if (!body.f_name || !body.l_name || !body.subject_group) {
        return c.json({
          success: false,
          message: 'First name, last name, and subject group are required'
        }, 400);
      }

      // Title is optional and free-text

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      
      // Get active semester
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester) {
        return c.json({
          success: false,
          message: 'No active semester found'
        }, 400);
      }

      // Allow explicit semester/year via query
      const semParam = c.req.query('semesterId') || c.req.query('semester_id');
      if (semParam) {
        const s = parseInt(semParam);
        if (isNaN(s)) {
          return c.json({ success: false, message: 'Invalid semesterId' }, 400);
        }
        body.semester_id = s;
      }

      // Require explicit year and semesterId
      const yearParam = c.req.query('year');
      let forYear = yearParam ? parseInt(yearParam) : undefined;
      if (!forYear || !body.semester_id || isNaN(forYear)) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.createTeacher(body, forYear);
      if (!result.success) {
        return c.json(result, 500);
      }

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
  scheduleRoutes.put('/teachers/:id', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

      const yearParam = c.req.query('year');
      const forYear = yearParam ? parseInt(yearParam) : contextResult.data.academic_year?.year;
      if (yearParam && (forYear === undefined || isNaN(forYear))) {
        return c.json({ success: false, message: 'Invalid year' }, 400);
      }
      const result = await dbManager.updateTeacher(teacherId, contextResult.data.semester.id!, body, forYear);

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
  scheduleRoutes.delete('/teachers/:id', requireAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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

      const yearParam = c.req.query('year');
      const forYear = yearParam ? parseInt(yearParam) : contextResult.data.academic_year?.year;
      if (yearParam && (forYear === undefined || isNaN(forYear))) {
        return c.json({ success: false, message: 'Invalid year' }, 400);
      }
      const result = await dbManager.deleteTeacher(teacherId, contextResult.data.semester.id!, forYear);

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
}
