import type { Context } from 'hono';
import type { Env } from '../interfaces';
import type { AdminUser } from '../interfaces';

export type AppVariables = { user: AdminUser; sessionToken: string; requestId: string };
export type ScheduleRouteContext = Context<{ Bindings: Env; Variables: AppVariables }>;
