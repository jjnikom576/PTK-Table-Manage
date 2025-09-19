// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Import middleware
import {
  authMiddleware,
  corsMiddleware,
  requestLoggingMiddleware,
  errorHandlingMiddleware,
  rateLimitMiddleware,
  bodySizeLimitMiddleware,
  requestIdMiddleware,
  securityHeadersMiddleware
} from './middleware/auth-middleware';

// Import routes
import authRoutes from './routes/auth-routes';
import coreRoutes from './routes/core-routes';
import scheduleRoutes from './routes/schedule-routes';

// Import database manager for initialization
import { DatabaseManager } from './database/database-manager';
import { Env, AdminUser } from './interfaces';

type AppVariables = { user: AdminUser; sessionToken: string; requestId: string };

// ===========================================
// Initialize Hono App
// ===========================================

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ===========================================
// Global Middleware (Applied to all routes)
// ===========================================

// Security and utility middleware
app.use('*', securityHeadersMiddleware);
app.use('*', requestIdMiddleware);
app.use('*', corsMiddleware);
app.use('*', requestLoggingMiddleware);
app.use('*', errorHandlingMiddleware);

// Rate limiting (100 requests per minute)
app.use('*', rateLimitMiddleware(100, 60000));

// Body size limiting (1MB)
app.use('*', bodySizeLimitMiddleware(1024 * 1024));

// Pretty JSON formatting in development
app.use('*', prettyJSON());

// Hono built-in logger
app.use('*', logger());

// ===========================================
// Public Routes
// ===========================================

// Root endpoint
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'School Schedule Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      core: '/api/core/*',
      schedule: '/api/schedule/*',
      health: '/api/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    // Basic database connectivity test
    const result = await c.env.DB.prepare('SELECT 1 as test').first();
    
    return c.json({
      success: true,
      message: 'System is healthy',
      status: 'online',
      database: result ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: (globalThis as any).process?.uptime?.() ?? 'N/A'
    });
  } catch (error) {
    return c.json({
      success: false,
      message: 'Health check failed',
      status: 'unhealthy',
      database: 'error',
      error: String(error),
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Database initialization endpoint (public for setup)
app.post('/api/setup', async (c) => {
  try {
    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.initialize();
    
    if (result.success) {
      return c.json({
        success: true,
        message: 'Database initialized successfully',
        data: result.data,
        next_steps: [
          '1. Login with default admin credentials (username: admin, password: Aa1234)',
          '2. Change default password immediately',
          '3. Create academic year and semesters',
          '4. Start adding teachers, classes, and subjects'
        ],
        timestamp: new Date().toISOString()
      });
    } else {
      return c.json(result, 500);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: 'Database initialization failed',
      error: String(error),
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// ===========================================
// Authentication Middleware (Applied to protected routes)
// ===========================================

// Apply authentication to API routes, but allow specific public GET endpoints
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;
  const publicGetPaths = new Set([
    '/api/core/context',
    '/api/core/academic-years',
    '/api/core/semesters',
    '/api/schedule/timetable'
  ]);
  if (method === 'GET' && publicGetPaths.has(path)) {
    return await next();
  }
  return await authMiddleware(c, next);
});

// ===========================================
// API Routes
// ===========================================

// Mount route modules
app.route('/api/auth', authRoutes);
app.route('/api/core', coreRoutes);
app.route('/api/schedule', scheduleRoutes);

// ===========================================
// API Documentation Endpoint
// ===========================================

app.get('/api/docs', (c) => {
  return c.json({
    success: true,
    message: 'School Schedule Management System API Documentation',
    version: '1.0.0',
    authentication: {
      description: 'All API endpoints except public ones require authentication',
      method: 'Bearer Token or Session Token',
      headers: {
        'Authorization': 'Bearer <session_token>',
        'X-Session-Token': '<session_token>'
      },
      cookie: 'session_token=<session_token>'
    },
    endpoints: {
      public: {
        'GET /': 'API information',
        'GET /api/health': 'Health check',
        'POST /api/setup': 'Initialize database',
        'GET /api/docs': 'This documentation',
        'POST /api/auth/login': 'Admin login',
      },
      auth: {
        'POST /api/auth/logout': 'Logout',
        'GET /api/auth/me': 'Get current user info',
        'POST /api/auth/refresh': 'Refresh session',
        'GET /api/auth/users': 'List admin users (super admin only)',
        'POST /api/auth/users': 'Create admin user (super admin only)',
        'PUT /api/auth/users/:id': 'Update admin user (super admin only)',
        'DELETE /api/auth/users/:id': 'Delete admin user (super admin only)',
        'GET /api/auth/sessions': 'Get user sessions',
        'DELETE /api/auth/sessions/:token': 'Revoke specific session',
        'DELETE /api/auth/sessions': 'Revoke all other sessions',
        'GET /api/auth/activity': 'Get activity logs'
      },
      core: {
        'GET /api/core/context': 'Get global context (active year/semester)',
        'GET /api/core/academic-years': 'List academic years',
        'POST /api/core/academic-years': 'Create academic year',
        'PUT /api/core/academic-years/:id/activate': 'Activate academic year',
        'GET /api/core/semesters': 'List semesters (global)',
        'POST /api/core/semesters': 'Create semester (global)',
        'PUT /api/core/semesters/:id/activate': 'Activate semester',
        'DELETE /api/core/semesters/:id': 'Delete semester',
        'GET /api/core/status': 'System status and table info',
        'POST /api/core/initialize': 'Initialize database',
        'POST /api/core/create-tables/:year': 'Create dynamic tables for year',
        'GET /api/core/tables-status/:year': 'Check table existence for year'
      },
      schedule: {
        'GET /api/schedule/teachers': 'List teachers (with pagination)',
        'POST /api/schedule/teachers': 'Create teacher',
        'PUT /api/schedule/teachers/:id': 'Update teacher',
        'DELETE /api/schedule/teachers/:id': 'Delete teacher',
        'GET /api/schedule/classes': 'List classes',
        'POST /api/schedule/classes': 'Create class',
        'PUT /api/schedule/classes/:id': 'Update class',
        'DELETE /api/schedule/classes/:id': 'Delete class',
        'GET /api/schedule/rooms': 'List rooms',
        'POST /api/schedule/rooms': 'Create room',
        'PUT /api/schedule/rooms/:id': 'Update room',
        'DELETE /api/schedule/rooms/:id': 'Delete room',
        'GET /api/schedule/periods': 'List periods',
        'POST /api/schedule/periods': 'Create period',
        'PUT /api/schedule/periods/:id': 'Update period',
        'DELETE /api/schedule/periods/:id': 'Delete period',
        'GET /api/schedule/subjects': 'List subjects',
        'POST /api/schedule/subjects': 'Create subject',
        'PUT /api/schedule/subjects/:id': 'Update subject',
        'DELETE /api/schedule/subjects/:id': 'Delete subject',
        'GET /api/schedule/schedules': 'List schedules',
        'POST /api/schedule/schedules': 'Create schedule',
        'DELETE /api/schedule/schedules/:id': 'Delete schedule',
        'GET /api/schedule/timetable': 'Get formatted timetable view',
        'GET /api/schedule/conflicts': 'Check scheduling conflicts'
      }
    },
    data_flow: {
      setup: '1. POST /api/setup → 2. POST /api/auth/login → 3. POST /api/core/academic-years → 4. POST /api/core/semesters → 5. PUT /api/core/academic-years/:id/activate → 6. PUT /api/core/semesters/:id/activate',
      daily_usage: '1. GET /api/core/context → 2. Manage teachers/classes/rooms → 3. Create subjects → 4. Build schedules → 5. GET /api/schedule/timetable'
    },
    response_format: {
      success: {
        success: true,
        data: '...',
        message: 'Optional success message'
      },
      error: {
        success: false,
        error: 'Error type',
        message: 'Human readable error message'
      },
      pagination: {
        success: true,
        data: ['...'],
        pagination: {
          page: 1,
          limit: 50,
          total: 100,
          totalPages: 2
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ===========================================
// 404 Handler
// ===========================================

app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    available_endpoints: {
      'GET /': 'API information',
      'GET /api/health': 'Health check',
      'GET /api/docs': 'API documentation',
      'POST /api/setup': 'Database initialization'
    },
    timestamp: new Date().toISOString()
  }, 404);
});

// ===========================================
// Error Handler
// ===========================================

app.onError((error, c) => {
  console.error('Global error handler:', error);
  
  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    request_id: c.get('requestId')
  }, 500);
});

// ===========================================
// Export
// ===========================================

export default app;

// Export type for environment
export type { Env };
