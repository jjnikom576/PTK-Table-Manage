/**
 * Authentication API Module
 * Handles admin login/logout using APIManager
 */

import apiManager from './core/api-manager.js';

class AuthAPI {
  constructor() {
    this.sessionKey = 'admin_session';
  }

  /**
   * Admin login
   */
  async login(username, password) {
    try {
      const result = await apiManager.post('admin/login', {
        username: username.trim(),
        password: password
      });

      if (result.success && result.data) {
        // Save session data
        const sessionData = {
          token: result.data.token,
          user: result.data.user,
          expiresAt: result.data.expires_at,
          loginTime: new Date().toISOString()
        };

        this.saveSession(sessionData);

        return {
          success: true,
          user: result.data.user,
          message: 'เข้าสู่ระบบสำเร็จ'
        };
      } else {
        // Backend login failed - try demo fallback for default credentials
        if (username === 'admin' && password === 'admin123') {
          const demoSession = {
            token: `demo-${Date.now()}`,
            user: { 
              id: 0, 
              username: 'admin', 
              role: 'super_admin',
              f_name: 'Admin',
              l_name: 'Demo'
            },
            expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString(),
            loginTime: new Date().toISOString(),
            isDemoMode: true
          };

          this.saveSession(demoSession);

          return {
            success: true,
            user: demoSession.user,
            message: 'เข้าสู่ระบบในโหมด Demo',
            isDemoMode: true
          };
        }

        return {
          success: false,
          error: result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        };
      }
    } catch (error) {
      // Network error - allow demo fallback for development
      if (username === 'admin' && password === 'admin123') {
        const demoSession = {
          token: `demo-offline-${Date.now()}`,
          user: { 
            id: 0, 
            username: 'admin', 
            role: 'super_admin',
            f_name: 'Admin',
            l_name: 'Offline'
          },
          expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString(),
          loginTime: new Date().toISOString(),
          isDemoMode: true,
          isOfflineMode: true
        };

        this.saveSession(demoSession);

        return {
          success: true,
          user: demoSession.user,
          message: 'เข้าสู่ระบบในโหมด Offline Demo',
          isDemoMode: true,
          isOfflineMode: true
        };
      }

      return {
        success: false,
        error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ'
      };
    }
  }

  /**
   * Admin logout
   */
  async logout() {
    const session = this.getSession();
    
    if (session && !session.isDemoMode) {
      // Try to notify backend about logout
      try {
        await apiManager.post('admin/logout');
      } catch (error) {
        // Ignore logout errors - clear session anyway
        console.warn('Backend logout failed:', error);
      }
    }

    this.clearSession();

    return {
      success: true,
      message: 'ออกจากระบบเรียบร้อย'
    };
  }

  /**
   * Check authentication status
   */
  isAuthenticated() {
    const session = this.getSession();
    
    if (!session || !session.token) {
      return false;
    }

    // Check expiration
    if (session.expiresAt) {
      const expiryTime = new Date(session.expiresAt);
      const now = new Date();
      
      if (now >= expiryTime) {
        this.clearSession();
        return false;
      }
    }

    return true;
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  }

  /**
   * Get session data
   */
  getSession() {
    try {
      const raw = localStorage.getItem(this.sessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Failed to parse session data:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Save session data
   */
  saveSession(sessionData) {
    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Clear session data
   */
  clearSession() {
    try {
      localStorage.removeItem(this.sessionKey);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Refresh session (extend expiry)
   */
  async refreshSession() {
    const session = this.getSession();
    
    if (!session || session.isDemoMode) {
      return { success: false, error: 'No valid session to refresh' };
    }

    try {
      const result = await apiManager.post('admin/refresh');
      
      if (result.success && result.data) {
        // Update session with new expiry
        const updatedSession = {
          ...session,
          expiresAt: result.data.expires_at
        };
        
        this.saveSession(updatedSession);
        
        return {
          success: true,
          message: 'Session refreshed successfully'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to refresh session'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to refresh session'
      };
    }
  }

  /**
   * Validate admin permissions
   */
  hasAdminPermission(requiredRole = 'admin') {
    const user = this.getCurrentUser();
    
    if (!user || !this.isAuthenticated()) {
      return false;
    }

    // Role hierarchy: super_admin > admin
    const roleHierarchy = {
      'super_admin': 2,
      'admin': 1
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 1;

    return userLevel >= requiredLevel;
  }

  /**
   * Get user display name
   */
  getUserDisplayName() {
    const user = this.getCurrentUser();
    
    if (!user) return 'Unknown User';
    
    if (user.f_name && user.l_name) {
      return `${user.f_name} ${user.l_name}`;
    }
    
    return user.username || 'Admin User';
  }

  /**
   * Check if in demo mode
   */
  isDemoMode() {
    const session = this.getSession();
    return session ? !!session.isDemoMode : false;
  }

  /**
   * Check if in offline mode
   */
  isOfflineMode() {
    const session = this.getSession();
    return session ? !!session.isOfflineMode : false;
  }
}

// Export singleton instance
const authAPI = new AuthAPI();
export default authAPI;

// Export individual functions for backward compatibility
export const login = (username, password) => authAPI.login(username, password);
export const logout = () => authAPI.logout();
export const isLoggedIn = () => authAPI.isAuthenticated();
export const getSession = () => authAPI.getSession();
export const saveSession = (data) => authAPI.saveSession(data);
