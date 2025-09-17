// src/auth/auth-manager.ts
import { 
  Env, 
  DatabaseResult, 
  AdminUser, 
  AdminSession, 
  AdminActivityLog,
  LoginRequest,
  AuthResponse 
} from '../interfaces';

export class AuthManager {
  constructor(private db: D1Database, private env: Env) {}

  // ===========================================
  // Session Management
  // ===========================================

  private generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getSessionExpiryTime(): string {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 8); // 8 hours session
    return expiry.toISOString();
  }

  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const inputHash = await this.hashPassword(password);
    return inputHash === hashedPassword;
  }

  // ===========================================
  // Authentication
  // ===========================================

  async login(credentials: LoginRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      // Find admin user
      const user = await this.db
        .prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1')
        .bind(credentials.username)
        .first<AdminUser>();

      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(credentials.password, user.password_hash);
      if (!passwordValid) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Generate session token
      const sessionToken = this.generateSessionToken();
      const expiresAt = this.getSessionExpiryTime();

      // Create session
      const sessionResult = await this.db
        .prepare(`
          INSERT INTO admin_sessions (admin_user_id, session_token, expires_at, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        .bind(user.id, sessionToken, expiresAt, ipAddress, userAgent)
        .run();

      if (!sessionResult.success) {
        return {
          success: false,
          message: 'Failed to create session'
        };
      }

      // Update last login
      await this.db
        .prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(user.id!)
        .run();

      // Log login activity
      await this.logActivity(user.id!, 'LOGIN', undefined, undefined, undefined, undefined, ipAddress, userAgent);

      return {
        success: true,
        message: 'Login successful',
        session_token: sessionToken,
        user: {
          id: user.id!,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Login failed',
        error: String(error)
      };
    }
  }

  async logout(sessionToken: string, ipAddress?: string, userAgent?: string): Promise<DatabaseResult> {
    try {
      // Get session info for logging
      const session = await this.db
        .prepare('SELECT admin_user_id FROM admin_sessions WHERE session_token = ?')
        .bind(sessionToken)
        .first<{ admin_user_id: number }>();

      // Delete session
      const result = await this.db
        .prepare('DELETE FROM admin_sessions WHERE session_token = ?')
        .bind(sessionToken)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Session not found' };
      }

      // Log logout activity
      if (session) {
        await this.logActivity(session.admin_user_id, 'LOGOUT', null, null, null, null, ipAddress, userAgent);
      }

      return { success: true, data: { message: 'Logout successful' } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // Session Validation
  // ===========================================

  async validateSession(sessionToken: string): Promise<DatabaseResult<AdminUser>> {
    try {
      if (!sessionToken) {
        return { success: false, error: 'No session token provided' };
      }

      const result = await this.db
        .prepare(`
          SELECT u.*, s.expires_at
          FROM admin_users u
          JOIN admin_sessions s ON u.id = s.admin_user_id
          WHERE s.session_token = ? AND u.is_active = 1
        `)
        .bind(sessionToken)
        .first<AdminUser & { expires_at: string }>();

      if (!result) {
        return { success: false, error: 'Invalid session' };
      }

      // Check if session is expired
      const expiryDate = new Date(result.expires_at);
      const now = new Date();

      if (now > expiryDate) {
        // Delete expired session
        await this.db
          .prepare('DELETE FROM admin_sessions WHERE session_token = ?')
          .bind(sessionToken)
          .run();

        return { success: false, error: 'Session expired' };
      }

      // Remove expires_at from user data
      const { expires_at, ...userData } = result;
      
      return { success: true, data: userData };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async extendSession(sessionToken: string): Promise<DatabaseResult> {
    try {
      const newExpiryTime = this.getSessionExpiryTime();
      
      const result = await this.db
        .prepare('UPDATE admin_sessions SET expires_at = ? WHERE session_token = ?')
        .bind(newExpiryTime, sessionToken)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true, data: { expires_at: newExpiryTime } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // Session Cleanup
  // ===========================================

  async cleanupExpiredSessions(): Promise<DatabaseResult> {
    try {
      const result = await this.db
        .prepare('DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP')
        .run();

      return { 
        success: true, 
        data: { 
          message: 'Expired sessions cleaned up',
          deletedSessions: result.meta.changes 
        } 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getUserSessions(userId: number): Promise<DatabaseResult<AdminSession[]>> {
    try {
      const sessions = await this.db
        .prepare(`
          SELECT * FROM admin_sessions 
          WHERE admin_user_id = ? AND expires_at > CURRENT_TIMESTAMP 
          ORDER BY created_at DESC
        `)
        .bind(userId)
        .all<AdminSession>();

      return { success: true, data: sessions.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async revokeUserSession(userId: number, sessionToken: string): Promise<DatabaseResult> {
    try {
      const result = await this.db
        .prepare('DELETE FROM admin_sessions WHERE admin_user_id = ? AND session_token = ?')
        .bind(userId, sessionToken)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true, data: { message: 'Session revoked' } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async revokeAllUserSessions(userId: number): Promise<DatabaseResult> {
    try {
      const result = await this.db
        .prepare('DELETE FROM admin_sessions WHERE admin_user_id = ?')
        .bind(userId)
        .run();

      return { 
        success: true, 
        data: { 
          message: 'All user sessions revoked',
          revokedSessions: result.meta.changes 
        } 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // User Management
  // ===========================================

  async createAdminUser(
    username: string, 
    password: string, 
    fullName: string, 
    email?: string, 
    role: 'admin' | 'super_admin' = 'admin'
  ): Promise<DatabaseResult<AdminUser>> {
    try {
      // Check if username already exists
      const existingUser = await this.db
        .prepare('SELECT id FROM admin_users WHERE username = ?')
        .bind(username)
        .first();

      if (existingUser) {
        return { success: false, error: 'Username already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const result = await this.db
        .prepare(`
          INSERT INTO admin_users (username, password_hash, full_name, email, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(username, passwordHash, fullName, email || null, role)
        .run();

      const newUser = await this.db
        .prepare('SELECT * FROM admin_users WHERE id = ?')
        .bind(result.meta.last_row_id)
        .first<AdminUser>();

      return { success: true, data: newUser! };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updateAdminUser(
    userId: number, 
    updates: {
      username?: string;
      password?: string;
      full_name?: string;
      email?: string;
      role?: 'admin' | 'super_admin';
      is_active?: number;
    }
  ): Promise<DatabaseResult> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.username) {
        // Check if new username already exists
        const existingUser = await this.db
          .prepare('SELECT id FROM admin_users WHERE username = ? AND id != ?')
          .bind(updates.username, userId)
          .first();

        if (existingUser) {
          return { success: false, error: 'Username already exists' };
        }

        fields.push('username = ?');
        values.push(updates.username);
      }

      if (updates.password) {
        const passwordHash = await this.hashPassword(updates.password);
        fields.push('password_hash = ?');
        values.push(passwordHash);
      }

      if (updates.full_name) { fields.push('full_name = ?'); values.push(updates.full_name); }
      if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
      if (updates.role) { fields.push('role = ?'); values.push(updates.role); }
      if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active); }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      const result = await this.db
        .prepare(`UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: { message: 'User updated successfully' } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getAdminUsers(): Promise<DatabaseResult<AdminUser[]>> {
    try {
      const users = await this.db
        .prepare('SELECT id, username, full_name, email, role, is_active, last_login, created_at, updated_at FROM admin_users ORDER BY created_at DESC')
        .all<AdminUser>();

      return { success: true, data: users.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getAdminUser(userId: number): Promise<DatabaseResult<AdminUser>> {
    try {
      const user = await this.db
        .prepare('SELECT id, username, full_name, email, role, is_active, last_login, created_at, updated_at FROM admin_users WHERE id = ?')
        .bind(userId)
        .first<AdminUser>();

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async deleteAdminUser(userId: number): Promise<DatabaseResult> {
    try {
      // Don't allow deleting the last super admin
      const superAdminCount = await this.db
        .prepare('SELECT COUNT(*) as count FROM admin_users WHERE role = ? AND is_active = 1')
        .bind('super_admin')
        .first<{ count: number }>();

      const userToDelete = await this.db
        .prepare('SELECT role FROM admin_users WHERE id = ?')
        .bind(userId)
        .first<{ role: string }>();

      if (userToDelete?.role === 'super_admin' && superAdminCount && superAdminCount.count <= 1) {
        return { success: false, error: 'Cannot delete the last super admin' };
      }

      // Soft delete - set is_active to 0
      const result = await this.db
        .prepare('UPDATE admin_users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(userId)
        .run();

      if (result.meta.changes === 0) {
        return { success: false, error: 'User not found' };
      }

      // Revoke all user sessions
      await this.revokeAllUserSessions(userId);

      return { success: true, data: { message: 'User deleted successfully' } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ===========================================
  // Activity Logging
  // ===========================================

  async logActivity(
    adminUserId: number,
    action: string,
    tableName?: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.db
        .prepare(`
          INSERT INTO admin_activity_log (
            admin_user_id, action, table_name, record_id, old_values, new_values, 
            ip_address, user_agent, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        .bind(
          adminUserId,
          action,
          tableName,
          recordId,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent
        )
        .run();
    } catch (error) {
      // Log error but don't throw - activity logging shouldn't break main operations
      console.error('Failed to log activity:', error);
    }
  }

  async getActivityLogs(page = 1, limit = 50): Promise<DatabaseResult<AdminActivityLog[]>> {
    try {
      const offset = (page - 1) * limit;

      const logs = await this.db
        .prepare(`
          SELECT 
            al.*,
            au.username,
            au.full_name
          FROM admin_activity_log al
          JOIN admin_users au ON al.admin_user_id = au.id
          ORDER BY al.created_at DESC
          LIMIT ? OFFSET ?
        `)
        .bind(limit, offset)
        .all();

      return { success: true, data: logs.results as AdminActivityLog[] };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getUserActivityLogs(userId: number, page = 1, limit = 50): Promise<DatabaseResult<AdminActivityLog[]>> {
    try {
      const offset = (page - 1) * limit;

      const logs = await this.db
        .prepare(`
          SELECT * FROM admin_activity_log 
          WHERE admin_user_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `)
        .bind(userId, limit, offset)
        .all<AdminActivityLog>();

      return { success: true, data: logs.results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
