import type { Context, Hono } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import type { Env } from '../interfaces';
import type { AppVariables } from './schedule-route-types';

export function registerPublicScheduleRoutes(
  scheduleRoutes: Hono<{ Bindings: Env; Variables: AppVariables }>
) {
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
}
