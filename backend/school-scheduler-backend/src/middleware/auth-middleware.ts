// src/middleware/auth-middleware.ts
import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { AuthManager } from '../auth/auth-manager';
import { Env, AdminUser } from '../interfaces';

type AppVariables = {
  user: AdminUser;
  sessionToken: string;
  requestId: string;
};

// ===========================================
// Authentication Middleware
// ===========================================

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  next: Next
) {
  try {
    // Skip authentication for public routes
    const path = new URL(c.req.url).pathname;
    const publicRoutes = [
      '/api/auth/login',
      '/api/health',
      '/'
    ];

    if (publicRoutes.includes(path)) {
      return await next();
    }

    // Get session token from header or cookie
    const authHeader = c.req.header('Authorization');
    const sessionToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : c.req.header('X-Session-Token') || getCookie(c, 'session_token');

    if (!sessionToken) {
      return c.json({
        success: false,
        error: 'Authentication required',
        message: 'No session token provided'
      }, 401);
    }

    // Validate session
    const authManager = new AuthManager(c.env.DB, c.env);
    const validation = await authManager.validateSession(sessionToken);

    if (!validation.success || !validation.data) {
      return c.json({
        success: false,
        error: 'Authentication failed',
        message: validation.error || 'Invalid session'
      }, 401);
    }

    // Extend session (auto-renewal)
    await authManager.extendSession(sessionToken);

    // Store user info in context for use in handlers
    c.set('user', validation.data);
    c.set('sessionToken', sessionToken);

    return await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({
      success: false,
      error: 'Authentication error',
      message: String(error)
    }, 500);
  }
}

// ===========================================
// Role-based Authorization Middleware
// ===========================================

export function requireRole(roles: ('admin' | 'super_admin')[]) {
  return async (
    c: Context<{ Bindings: Env; Variables: AppVariables }>,
    next: Next
  ) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        error: 'Authorization required',
        message: 'User not found in context'
      }, 401);
    }

    if (!roles.includes(user.role as 'admin' | 'super_admin')) {
      return c.json({
        success: false,
        error: 'Insufficient permissions',
        message: `Required roles: ${roles.join(', ')}`
      }, 403);
    }

    return await next();
  };
}

// Shorthand for super admin only
export const requireSuperAdmin = requireRole(['super_admin']);

// Shorthand for any admin
export const requireAdmin = requireRole(['admin', 'super_admin']);

// ===========================================
// CORS Middleware
// ===========================================

export async function corsMiddleware(c: Context, next: Next) {
  // Set CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
  c.header('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  return await next();
}

// ===========================================
// Request Logging Middleware
// ===========================================

export async function requestLoggingMiddleware(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  next: Next
) {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const userAgent = c.req.header('User-Agent');
  const ip = c.req.header('CF-Connecting-IP') || 
              c.req.header('X-Forwarded-For') || 
              c.req.header('X-Real-IP') || 
              'unknown';

  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip}`);

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    const status = c.res.status;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} - ${duration}ms`);
  }
}

// ===========================================
// Error Handling Middleware
// ===========================================

export async function errorHandlingMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Unhandled error:', error);
    
    // Don't expose internal errors to client
    const isDevelopment = c.env?.NODE_ENV === 'development';
    
    return c.json({
      success: false,
      error: 'Internal server error',
      message: isDevelopment ? String(error) : 'Something went wrong'
    }, 500);
  }
}

// ===========================================
// Rate Limiting Middleware (Basic)
// ===========================================

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(maxRequests = 100, windowMs = 60000) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               c.req.header('X-Real-IP') || 
               'unknown';
    
    const now = Date.now();
    const key = `rate_limit_${ip}`;
    
    // Clean up expired entries
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }
    
    const current = requestCounts.get(key);
    
    if (!current) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return await next();
    }
    
    if (now > current.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return await next();
    }
    
    if (current.count >= maxRequests) {
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());
      
      return c.json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`
      }, 429);
    }
    
    current.count++;
    
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - current.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());
    
    return await next();
  };
}

// ===========================================
// Body Size Limiting Middleware
// ===========================================

export function bodySizeLimitMiddleware(maxSizeBytes = 1024 * 1024) { // 1MB default
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return c.json({
        success: false,
        error: 'Payload too large',
        message: `Request body must be smaller than ${maxSizeBytes} bytes`
      }, 413);
    }
    
    return await next();
  };
}

// ===========================================
// Request ID Middleware
// ===========================================

export async function requestIdMiddleware(
  c: Context<{ Variables: AppVariables }>,
  next: Next
) {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  return await next();
}

// ===========================================
// Content Type Validation Middleware
// ===========================================

export function requireContentType(allowedTypes: string[]) {
  return async (c: Context, next: Next) => {
    if (c.req.method === 'GET' || c.req.method === 'DELETE') {
      return await next();
    }
    
    const contentType = c.req.header('Content-Type');
    
    if (!contentType) {
      return c.json({
        success: false,
        error: 'Missing Content-Type header',
        message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
      }, 400);
    }
    
    const baseType = contentType.split(';')[0].trim();
    
    if (!allowedTypes.includes(baseType)) {
      return c.json({
        success: false,
        error: 'Invalid Content-Type',
        message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
      }, 400);
    }
    
    return await next();
  };
}

// Common content type validators
export const requireJSON = requireContentType(['application/json']);
export const requireFormData = requireContentType(['multipart/form-data', 'application/x-www-form-urlencoded']);

// ===========================================
// Security Headers Middleware
// ===========================================

export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();
  
  // Add security headers to response
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Content-Security-Policy', "default-src 'self'");
  
  // Remove server information
  c.header('Server', '');
}
