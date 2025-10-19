// src/routes/schedule-routes.ts
import { Hono } from 'hono';
import type { Env } from '../interfaces';
import type { AppVariables } from './schedule-route-types';
import { registerPublicScheduleRoutes } from './schedule-routes-public';
import { registerTeacherRoutes } from './schedule-routes-teachers';
import { registerClassRoutes } from './schedule-routes-classes';
import { registerPeriodRoutes } from './schedule-routes-periods';
import { registerRoomRoutes } from './schedule-routes-rooms';
import { registerSubjectRoutes } from './schedule-routes-subjects';
import { registerScheduleRoutes } from './schedule-routes-schedules';
import { registerSubstitutionRoutes } from './schedule-routes-substitutions';

const scheduleRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

registerPublicScheduleRoutes(scheduleRoutes);
registerTeacherRoutes(scheduleRoutes);
registerClassRoutes(scheduleRoutes);
registerPeriodRoutes(scheduleRoutes);
registerRoomRoutes(scheduleRoutes);
registerSubjectRoutes(scheduleRoutes);
registerScheduleRoutes(scheduleRoutes);
registerSubstitutionRoutes(scheduleRoutes);

export default scheduleRoutes;
