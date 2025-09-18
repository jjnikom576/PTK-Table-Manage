// src/routes/core-routes.ts
import { Hono, Context } from 'hono';
import { DatabaseManager } from '../database/database-manager';
import { requireJSON, requireAdmin } from '../middleware/auth-middleware';
import { Env, CreateAcademicYearRequest, CreateSemesterRequest } from '../interfaces';

const coreRoutes = new Hono<{ Bindings: Env }>();

// Apply authentication to all core routes
coreRoutes.use('*', requireAdmin);

// ===========================================
// Global Context Routes
// ===========================================

// GET /api/core/context (Get current global context)
coreRoutes.get('/context', async (c: Context<{ Bindings: Env }>) => {
  try {
    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.getGlobalContext();
    
    return c.json(result);
  } catch (error) {
    console.error('Get global context error:', error);
    return c.json({
      success: false,
      message: 'Failed to get global context',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Academic Years Routes
// ===========================================

// GET /api/core/academic-years
coreRoutes.get('/academic-years', async (c: Context<{ Bindings: Env }>) => {
  try {
    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.getAcademicYears();
    
    return c.json(result);
  } catch (error) {
    console.error('Get academic years error:', error);
    return c.json({
      success: false,
      message: 'Failed to get academic years',
      error: String(error)
    }, 500);
  }
});

// POST /api/core/academic-years
coreRoutes.post('/academic-years', requireJSON, async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json<CreateAcademicYearRequest>();
    
    // Validate input
    if (!body.year || typeof body.year !== 'number') {
      return c.json({
        success: false,
        message: 'Year is required and must be a number'
      }, 400);
    }

    // Validate year range (reasonable academic years)
    // Support both Buddhist Era (2500+) and Christian Era (1900+)
    const currentYear = new Date().getFullYear(); // 2025 (ค.ศ.)
    const currentBuddhistYear = currentYear + 543; // 2568 (พ.ศ.)
    
    // Check if input is Buddhist Era (พ.ศ.) or Christian Era (ค.ศ.)
    const isBuddhistEra = body.year > 2500;
    
    if (isBuddhistEra) {
      // Buddhist Era validation (2558-2578 for current year 2568)
      if (body.year < (currentBuddhistYear - 10) || body.year > (currentBuddhistYear + 10)) {
        return c.json({
          success: false,
          message: `Year must be within reasonable range (${currentBuddhistYear - 10}-${currentBuddhistYear + 10} for Buddhist Era)`
        }, 400);
      }
    } else {
      // Christian Era validation (2015-2035 for current year 2025)
      if (body.year < (currentYear - 10) || body.year > (currentYear + 10)) {
        return c.json({
          success: false,
          message: `Year must be within reasonable range (${currentYear - 10}-${currentYear + 10} for Christian Era)`
        }, 400);
      }
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.createAcademicYear(body.year);

    return c.json(result);
  } catch (error) {
    console.error('Create academic year error:', error);
    return c.json({
      success: false,
      message: 'Failed to create academic year',
      error: String(error)
    }, 500);
  }
});

// PUT /api/core/academic-years/:id/activate
coreRoutes.put('/academic-years/:id/activate', async (c: Context<{ Bindings: Env }>) => {
  try {
    const yearId = parseInt(c.req.param('id'));
    
    if (isNaN(yearId)) {
      return c.json({
        success: false,
        message: 'Invalid academic year ID'
      }, 400);
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.setActiveAcademicYear(yearId);
    
    return c.json(result);
  } catch (error) {
    console.error('Activate academic year error:', error);
    return c.json({
      success: false,
      message: 'Failed to activate academic year',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Semesters Routes
// ===========================================

// GET /api/core/academic-years/:yearId/semesters
coreRoutes.get('/academic-years/:yearId/semesters', async (c: Context<{ Bindings: Env }>) => {
  try {
    const yearId = parseInt(c.req.param('yearId'));
    
    if (isNaN(yearId)) {
      return c.json({
        success: false,
        message: 'Invalid academic year ID'
      }, 400);
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.getSemestersByYear(yearId);
    
    return c.json(result);
  } catch (error) {
    console.error('Get semesters error:', error);
    return c.json({
      success: false,
      message: 'Failed to get semesters',
      error: String(error)
    }, 500);
  }
});

// POST /api/core/academic-years/:yearId/semesters
coreRoutes.post('/academic-years/:yearId/semesters', requireJSON, async (c: Context<{ Bindings: Env }>) => {
  try {
    const yearId = parseInt(c.req.param('yearId'));
    const body = await c.req.json<CreateSemesterRequest>();
    
    if (isNaN(yearId)) {
      return c.json({
        success: false,
        message: 'Invalid academic year ID'
      }, 400);
    }

    // Validate input
    if (!body.semester_number || !body.semester_name) {
      return c.json({
        success: false,
        message: 'Semester number and name are required'
      }, 400);
    }

    // Validate semester number (1-3)
    if (![1, 2, 3].includes(body.semester_number)) {
      return c.json({
        success: false,
        message: 'Semester number must be 1, 2, or 3'
      }, 400);
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.createSemester(yearId, body.semester_number, body.semester_name);
    
    return c.json(result);
  } catch (error) {
    console.error('Create semester error:', error);
    return c.json({
      success: false,
      message: 'Failed to create semester',
      error: String(error)
    }, 500);
  }
});

// PUT /api/core/semesters/:id/activate
coreRoutes.put('/semesters/:id/activate', async (c: Context<{ Bindings: Env }>) => {
  try {
    const semesterId = parseInt(c.req.param('id'));
    
    if (isNaN(semesterId)) {
      return c.json({
        success: false,
        message: 'Invalid semester ID'
      }, 400);
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.setActiveSemester(semesterId);
    
    return c.json(result);
  } catch (error) {
    console.error('Activate semester error:', error);
    return c.json({
      success: false,
      message: 'Failed to activate semester',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Periods Routes
// ===========================================

// GET /api/core/periods
coreRoutes.get('/periods', async (c: Context<{ Bindings: Env }>) => {
  try {
    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.getPeriods();
    
    return c.json(result);
  } catch (error) {
    console.error('Get periods error:', error);
    return c.json({
      success: false,
      message: 'Failed to get periods',
      error: String(error)
    }, 500);
  }
});

// PUT /api/core/periods/:periodNo
coreRoutes.put('/periods/:periodNo', requireJSON, async (c: Context<{ Bindings: Env }>) => {
  try {
    const periodNo = parseInt(c.req.param('periodNo'));
    const body = await c.req.json<{
      period_name: string;
      start_time: string;
      end_time: string;
    }>();
    
    if (isNaN(periodNo)) {
      return c.json({
        success: false,
        message: 'Invalid period number'
      }, 400);
    }

    // Validate input
    if (!body.period_name || !body.start_time || !body.end_time) {
      return c.json({
        success: false,
        message: 'Period name, start time, and end time are required'
      }, 400);
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(body.start_time) || !timeRegex.test(body.end_time)) {
      return c.json({
        success: false,
        message: 'Times must be in HH:MM format'
      }, 400);
    }

    // Validate that start time is before end time
    const startTime = new Date(`1970-01-01T${body.start_time}:00`);
    const endTime = new Date(`1970-01-01T${body.end_time}:00`);
    
    if (startTime >= endTime) {
      return c.json({
        success: false,
        message: 'Start time must be before end time'
      }, 400);
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.updatePeriod(periodNo, body.period_name, body.start_time, body.end_time);
    
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

// ===========================================
// System Status Routes
// ===========================================

// GET /api/core/status (System status and table information)
coreRoutes.get('/status', async (c: Context<{ Bindings: Env }>) => {
  try {
    const dbManager = new DatabaseManager(c.env.DB, c.env);
    
    // Get global context
    const contextResult = await dbManager.getGlobalContext();
    
    // Get academic years
    const yearsResult = await dbManager.getAcademicYears();
    
    // Get periods count
    const periodsResult = await dbManager.getPeriods();
    
    let tableStatus = {};
    if (contextResult.success && contextResult.data?.academic_year) {
      // Get table status for active year
      const year = contextResult.data.academic_year.year;
      const schemaManager = (dbManager as any).schemaManager;
      tableStatus = await schemaManager.getYearTablesStatus(year);
    }

    return c.json({
      success: true,
      data: {
        context: contextResult.data || null,
        academic_years_count: yearsResult.success ? yearsResult.data?.length : 0,
        periods_count: periodsResult.success ? periodsResult.data?.length : 0,
        table_status: tableStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get system status error:', error);
    return c.json({
      success: false,
      message: 'Failed to get system status',
      error: String(error)
    }, 500);
  }
});

// POST /api/core/initialize (Initialize database with default data)
coreRoutes.post('/initialize', async (c: Context<{ Bindings: Env }>) => {
  try {
    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const result = await dbManager.initialize();
    
    return c.json(result);
  } catch (error) {
    console.error('Initialize database error:', error);
    return c.json({
      success: false,
      message: 'Failed to initialize database',
      error: String(error)
    }, 500);
  }
});

// POST /api/core/create-tables/:year (Create dynamic tables for specific year)
coreRoutes.post('/create-tables/:year', async (c: Context<{ Bindings: Env }>) => {
  try {
    const year = parseInt(c.req.param('year'));
    
    if (isNaN(year)) {
      return c.json({
        success: false,
        message: 'Invalid year'
      }, 400);
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const schemaManager = (dbManager as any).schemaManager;
    const result = await schemaManager.createDynamicTablesForYear(year);
    
    return c.json(result);
  } catch (error) {
    console.error('Create tables error:', error);
    return c.json({
      success: false,
      message: 'Failed to create tables',
      error: String(error)
    }, 500);
  }
});

// GET /api/core/tables-status/:year (Check table existence for specific year)
coreRoutes.get('/tables-status/:year', async (c: Context<{ Bindings: Env }>) => {
  try {
    const year = parseInt(c.req.param('year'));
    
    if (isNaN(year)) {
      return c.json({
        success: false,
        message: 'Invalid year'
      }, 400);
    }

    const dbManager = new DatabaseManager(c.env.DB, c.env);
    const schemaManager = (dbManager as any).schemaManager;
    const status = await schemaManager.getYearTablesStatus(year);
    
    return c.json({
      success: true,
      data: {
        year,
        tables: status,
        all_exist: Object.values(status).every(exists => exists)
      }
    });
  } catch (error) {
    console.error('Get tables status error:', error);
    return c.json({
      success: false,
      message: 'Failed to get tables status',
      error: String(error)
    }, 500);
  }
});

export default coreRoutes;
