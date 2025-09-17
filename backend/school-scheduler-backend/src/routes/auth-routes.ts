// src/routes/auth-routes.ts
import { Hono, Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { AuthManager } from '../auth/auth-manager';
import { requireJSON, requireSuperAdmin } from '../middleware/auth-middleware';
import { Env, LoginRequest, AdminUser } from '../interfaces';

type AppVariables = { user: AdminUser; sessionToken: string; requestId: string };

const authRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ===========================================
// Public Auth Routes
// ===========================================

// POST /api/auth/login
authRoutes.post('/login', requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const credentials = await c.req.json<LoginRequest>();
    
    // Validate input
    if (!credentials.username || !credentials.password) {
      return c.json({
        success: false,
        message: 'Username and password are required'
      }, 400);
    }

    // Get client info
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               c.req.header('X-Real-IP');
    const userAgent = c.req.header('User-Agent');

    // Attempt login
    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.login(credentials, ip, userAgent);

    if (!result.success) {
      return c.json(result, 401);
    }

    // Set session cookie (optional - client can also use token in headers)
    if (result.session_token) {
      setCookie(c, 'session_token', result.session_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 8 * 60 * 60 // 8 hours
      });
    }

    return c.json(result);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({
      success: false,
      message: 'Login failed',
      error: String(error)
    }, 500);
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const sessionToken = c.get('sessionToken') || getCookie(c, 'session_token');
    
    if (!sessionToken) {
      return c.json({
        success: false,
        message: 'No active session'
      }, 400);
    }

    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For');
    const userAgent = c.req.header('User-Agent');

    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.logout(sessionToken, ip, userAgent);

    // Clear session cookie
    setCookie(c, 'session_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 0
    });

    return c.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({
      success: false,
      message: 'Logout failed',
      error: String(error)
    }, 500);
  }
});

// GET /api/auth/me
authRoutes.get('/me', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: 'No authenticated user'
      }, 401);
    }

    return c.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    return c.json({
      success: false,
      message: 'Failed to get user info',
      error: String(error)
    }, 500);
  }
});

// POST /api/auth/refresh
authRoutes.post('/refresh', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const sessionToken = c.get('sessionToken');
    
    if (!sessionToken) {
      return c.json({
        success: false,
        message: 'No session token'
      }, 400);
    }

    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.extendSession(sessionToken);

    return c.json(result);
  } catch (error) {
    console.error('Refresh session error:', error);
    return c.json({
      success: false,
      message: 'Failed to refresh session',
      error: String(error)
    }, 500);
  }
});

// ===========================================
// Protected Admin Routes
// ===========================================

// GET /api/auth/users (Super Admin Only)
authRoutes.get('/users', requireSuperAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.getAdminUsers();
    
    return c.json(result);
  } catch (error) {
    console.error('Get admin users error:', error);
    return c.json({
      success: false,
      message: 'Failed to get admin users',
      error: String(error)
    }, 500);
  }
});

// POST /api/auth/users (Super Admin Only)
authRoutes.post('/users', requireSuperAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const body = await c.req.json<{
      username: string;
      password: string;
      full_name: string;
      email?: string;
      role?: 'admin' | 'super_admin';
    }>();

    // Validate input
    if (!body.username || !body.password || !body.full_name) {
      return c.json({
        success: false,
        message: 'Username, password, and full_name are required'
      }, 400);
    }

    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.createAdminUser(
      body.username,
      body.password,
      body.full_name,
      body.email,
      body.role || 'admin'
    );

    if (result.success) {
      // Log the creation
      const currentUser = c.get('user');
      await authManager.logActivity(
        currentUser.id!,
        'CREATE_USER',
        'admin_users',
        result.data?.id?.toString(),
        null,
        { username: body.username, full_name: body.full_name, role: body.role || 'admin' }
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Create admin user error:', error);
    return c.json({
      success: false,
      message: 'Failed to create admin user',
      error: String(error)
    }, 500);
  }
});

// PUT /api/auth/users/:id (Super Admin Only)
authRoutes.put('/users/:id', requireSuperAdmin, requireJSON, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const userId = parseInt(c.req.param('id'));
    const updates = await c.req.json<{
      username?: string;
      password?: string;
      full_name?: string;
      email?: string;
      role?: 'admin' | 'super_admin';
      is_active?: number;
    }>();

    if (isNaN(userId)) {
      return c.json({
        success: false,
        message: 'Invalid user ID'
      }, 400);
    }

    const authManager = new AuthManager(c.env.DB, c.env);
    
    // Get old values for logging
    const oldUser = await authManager.getAdminUser(userId);
    const result = await authManager.updateAdminUser(userId, updates);

    if (result.success && oldUser.success) {
      // Log the update
      const currentUser = c.get('user');
      await authManager.logActivity(
        currentUser.id!,
        'UPDATE_USER',
        'admin_users',
        userId.toString(),
        oldUser.data,
        updates
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Update admin user error:', error);
    return c.json({
      success: false,
      message: 'Failed to update admin user',
      error: String(error)
    }, 500);
  }
});

// DELETE /api/auth/users/:id (Super Admin Only)
authRoutes.delete('/users/:id', requireSuperAdmin, async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const userId = parseInt(c.req.param('id'));
    
    if (isNaN(userId)) {
      return c.json({
        success: false,
        message: 'Invalid user ID'
      }, 400);
    }

    const currentUser = c.get('user');
    if (currentUser.id === userId) {
      return c.json({
        success: false,
        message: 'Cannot delete your own account'
      }, 400);
    }

    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.deleteAdminUser(userId);

    if (result.success) {
      // Log the deletion
      await authManager.logActivity(
        currentUser.id!,
        'DELETE_USER',
        'admin_users',
        userId.toString()
      );
    }

    return c.json(result);
  } catch (error) {
    console.error('Delete admin user error:', error);
    return c.json({
      success: false,
      message: 'Failed to delete admin user',
      error: String(error)
    }, 500);
  }
});

// GET /api/auth/sessions (Get current user's sessions)
authRoutes.get('/sessions', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const user = c.get('user');
    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.getUserSessions(user.id!);
    
    return c.json(result);
  } catch (error) {
    console.error('Get user sessions error:', error);
    return c.json({
      success: false,
      message: 'Failed to get user sessions',
      error: String(error)
    }, 500);
  }
});

// DELETE /api/auth/sessions/:token (Revoke specific session)
authRoutes.delete('/sessions/:token', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const sessionToken = c.req.param('token');
    const user = c.get('user');
    
    const authManager = new AuthManager(c.env.DB, c.env);
    const result = await authManager.revokeUserSession(user.id!, sessionToken);
    
    return c.json(result);
  } catch (error) {
    console.error('Revoke session error:', error);
    return c.json({
      success: false,
      message: 'Failed to revoke session',
      error: String(error)
    }, 500);
  }
});

// DELETE /api/auth/sessions (Revoke all sessions except current)
authRoutes.delete('/sessions', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const currentSessionToken = c.get('sessionToken');
    const user = c.get('user');
    
    const authManager = new AuthManager(c.env.DB, c.env);
    
    // Get all user sessions
    const sessionsResult = await authManager.getUserSessions(user.id!);
    if (sessionsResult.success && sessionsResult.data) {
      // Revoke all sessions except current
      for (const session of sessionsResult.data) {
        if (session.session_token !== currentSessionToken) {
          await authManager.revokeUserSession(user.id!, session.session_token);
        }
      }
    }
    
    return c.json({
      success: true,
      message: 'All other sessions revoked successfully'
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return c.json({
      success: false,
      message: 'Failed to revoke sessions',
      error: String(error)
    }, 500);
  }
});

// GET /api/auth/activity (Get activity logs)
authRoutes.get('/activity', async (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const user = c.get('user');
    
    const authManager = new AuthManager(c.env.DB, c.env);
    
    // Super admins can see all activity, regular admins see only their own
    const result = user.role === 'super_admin' 
      ? await authManager.getActivityLogs(page, limit)
      : await authManager.getUserActivityLogs(user.id!, page, limit);
    
    return c.json(result);
  } catch (error) {
    console.error('Get activity logs error:', error);
    return c.json({
      success: false,
      message: 'Failed to get activity logs',
      error: String(error)
    }, 500);
  }
});

export default authRoutes;
