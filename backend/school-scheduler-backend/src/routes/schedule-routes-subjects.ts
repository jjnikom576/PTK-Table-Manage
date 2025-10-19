import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import type { Env, CreateSubjectRequest } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerSubjectRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
  // GET /api/schedule/subjects
  scheduleRoutes.get('/subjects', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
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
        const result = await dbManager.getSubjectsBySemesterForYear(semesterId, year);
        return c.json(result);
      }
      const contextResult = await dbManager.getGlobalContext();
      if (!contextResult.success || !contextResult.data?.semester) {
        return c.json({ success: false, message: 'No active semester found' }, 400);
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
  scheduleRoutes.post('/subjects', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const body = await c.req.json<CreateSubjectRequest>();
      
      // Validate input
      if (!body.teacher_id || !body.class_id || !body.subject_name || !body.periods_per_week) {
        return c.json({
          success: false,
          message: 'Teacher ID, class ID, subject name, and periods per week are required'
        }, 400);
      }

      // Validate subject_type if provided
      if (body.subject_type) {
        const validTypes: Array<CreateSubjectRequest['subject_type']> = ['พื้นฐาน', 'เพิ่มเติม', 'พัฒนาผู้เรียน'];
        if (!validTypes.includes(body.subject_type)) {
          return c.json({
            success: false,
            message: 'Subject type must be one of: พื้นฐาน, เพิ่มเติม, พัฒนาผู้เรียน'
          }, 400);
        }
      }

      // Validate periods per week
      if (body.periods_per_week <= 0 || body.periods_per_week > 20) {
        return c.json({
          success: false,
          message: 'Periods per week must be between 1 and 20'
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

      if (body.class_ids && !Array.isArray(body.class_ids)) {
        if (typeof body.class_ids === 'string') {
          try {
            const parsed = JSON.parse(body.class_ids);
            if (Array.isArray(parsed)) {
              body.class_ids = parsed;
            }
          } catch (error) {
            const values = String(body.class_ids)
              .split(',')
              .map(item => Number(item.trim()))
              .filter(value => Number.isFinite(value));
            body.class_ids = values;
          }
        } else {
          body.class_ids = [Number(body.class_ids)].filter(value => Number.isFinite(value));
        }
      }

      if (Array.isArray(body.class_ids)) {
        body.class_ids = body.class_ids
          .map(value => Number(value))
          .filter(value => Number.isFinite(value));
      }

      const result = await dbManager.createSubject(body, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `subjects_${resolvedYear}`;
        const recordIds = Array.isArray(result.data)
          ? result.data
              .map(item => (item as { id?: number } | undefined)?.id)
              .filter((id): id is number => typeof id === 'number')
          : [];
        await authManager.logActivity(
          user.id!,
          'CREATE_SUBJECT',
          tableName,
          recordIds.length ? recordIds.join(',') : undefined,
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

  // PUT /api/schedule/subjects/:id
  scheduleRoutes.put('/subjects/:id', requireAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const subjectId = parseInt(c.req.param('id'));
      if (isNaN(subjectId)) {
        return c.json({ success: false, message: 'Invalid subject ID' }, 400);
      }

      const dbManager = new DatabaseManager(c.env.DB, c.env);
      const body = await c.req.json<Partial<CreateSubjectRequest & { class_ids?: number[] | string[] | string }>>();

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

      const updateData: Partial<CreateSubjectRequest> & {
        class_ids?: number[];
      } = {};

      if (body.teacher_id !== undefined) {
        const teacherId = Number(body.teacher_id);
        if (!Number.isFinite(teacherId)) {
          return c.json({ success: false, message: 'Invalid teacher ID' }, 400);
        }
        updateData.teacher_id = teacherId;
      }

      if (body.class_id !== undefined) {
        const classId = Number(body.class_id);
        if (!Number.isFinite(classId)) {
          return c.json({ success: false, message: 'Invalid class ID' }, 400);
        }
        updateData.class_id = classId;
      }

      if (body.subject_name !== undefined) {
        const subjectName = String(body.subject_name).trim();
        if (!subjectName) {
          return c.json({ success: false, message: 'Subject name cannot be empty' }, 400);
        }
        updateData.subject_name = subjectName;
      }

      if (body.subject_code !== undefined) {
        if (body.subject_code === null) {
          updateData.subject_code = null;
        } else {
          const subjectCode = String(body.subject_code).trim();
          updateData.subject_code = subjectCode.length > 0 ? subjectCode : null;
        }
      }

      if (body.periods_per_week !== undefined) {
        const periods = Number(body.periods_per_week);
        if (!Number.isFinite(periods) || periods <= 0 || periods > 20) {
          return c.json({ success: false, message: 'Periods per week must be between 1 and 20' }, 400);
        }
        updateData.periods_per_week = periods;
      }

      if (body.default_room_id !== undefined) {
        const defaultRoomRaw = body.default_room_id as number | string | null;
        if (defaultRoomRaw === null || (typeof defaultRoomRaw === 'string' && defaultRoomRaw.trim() === '')) {
          updateData.default_room_id = null;
        } else {
          const roomId = Number(defaultRoomRaw);
          if (!Number.isFinite(roomId)) {
            return c.json({ success: false, message: 'Invalid default_room_id' }, 400);
          }
          updateData.default_room_id = roomId;
        }
      }

      if (body.special_requirements !== undefined) {
        if (body.special_requirements === null) {
          updateData.special_requirements = null;
        } else {
          const requirements = String(body.special_requirements).trim();
          updateData.special_requirements = requirements.length > 0 ? requirements : null;
        }
      }

      if (body.subject_type !== undefined) {
        const validTypes: Array<CreateSubjectRequest['subject_type']> = ['พื้นฐาน', 'เพิ่มเติม', 'พัฒนาผู้เรียน'];
        if (body.subject_type && !validTypes.includes(body.subject_type)) {
          return c.json({
            success: false,
            message: 'Subject type must be one of: พื้นฐาน, เพิ่มเติม, พัฒนาผู้เรียน'
          }, 400);
        }
        updateData.subject_type = body.subject_type;
      }

      if (body.class_ids && !Array.isArray(body.class_ids)) {
        if (typeof body.class_ids === 'string') {
          try {
            const parsed = JSON.parse(body.class_ids);
            if (Array.isArray(parsed)) {
              body.class_ids = parsed;
            }
          } catch (error) {
            const values = String(body.class_ids)
              .split(',')
              .map(item => Number(item.trim()))
              .filter(value => Number.isFinite(value));
            body.class_ids = values;
          }
        } else {
          body.class_ids = [Number(body.class_ids)].filter(value => Number.isFinite(value));
        }
      }

      if (Array.isArray(body.class_ids)) {
        updateData.class_ids = body.class_ids
          .map(value => Number(value))
          .filter(value => Number.isFinite(value));
      }

      if (Object.keys(updateData).length === 0) {
        return c.json({ success: false, message: 'No fields provided for update' }, 400);
      }

      const result = await dbManager.updateSubject(subjectId, resolvedSemester, updateData, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `subjects_${resolvedYear}`;
        const recordIds = Array.isArray(result.data)
          ? result.data
              .map(item => (item as { id?: number } | undefined)?.id)
              .filter((id): id is number => typeof id === 'number')
          : [];

        await authManager.logActivity(
          user.id!,
          'UPDATE_SUBJECT',
          tableName,
          recordIds.length ? recordIds.join(',') : subjectId.toString(),
          null,
          updateData
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Update subject error:', error);
      return c.json({
        success: false,
        message: 'Failed to update subject',
        error: String(error)
      }, 500);
    }
  });

  // DELETE /api/schedule/subjects/:id
  scheduleRoutes.delete('/subjects/:id', requireAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
    try {
      const subjectId = parseInt(c.req.param('id'));
      if (isNaN(subjectId)) {
        return c.json({ success: false, message: 'Invalid subject ID' }, 400);
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

      let resolvedSemester: number | undefined;
      if (semesterParam) {
        const parsedSemester = parseInt(semesterParam);
        if (isNaN(parsedSemester)) {
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

        if (!resolvedSemester) {
          resolvedSemester = context.semester.id!;
        }
        if (!resolvedYear) {
          resolvedYear = context.academic_year.year;
        }
      }

      if (!resolvedYear || !resolvedSemester) {
        return c.json({ success: false, message: 'year and semesterId are required' }, 400);
      }

      const result = await dbManager.deleteSubject(subjectId, resolvedSemester, resolvedYear);

      if (result.success) {
        const user = c.get('user');
        const authManager = new AuthManager(c.env.DB, c.env);
        const tableName = `subjects_${resolvedYear}`;
        await authManager.logActivity(
          user.id!,
          'DELETE_SUBJECT',
          tableName,
          subjectId.toString(),
          null,
          null
        );
      }

      return c.json(result);
    } catch (error) {
      console.error('Delete subject error:', error);
      return c.json({
        success: false,
        message: 'Failed to delete subject',
        error: String(error)
      }, 500);
    }
  });
}
