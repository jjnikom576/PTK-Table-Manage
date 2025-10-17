/**
 * APIManager Base Class
 * Central API management with environment switching and authentication
 */

class APIManager {
  constructor() {
    // Environment detection
    this.isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    // API base URLs
    this.baseURL = this.isDevelopment 
      ? 'http://localhost:8787/api'
      : '/api'; // Production URL will be configured later
    
    // Request timeout
    this.timeout = this.isDevelopment ? 10000 : 30000;
    
    // Debug mode
    this.debug = this.isDevelopment;
    this._sessionBroadcastInFlight = false;
    
    if (this.debug) {
      console.log('🔧 APIManager initialized:', {
        environment: this.isDevelopment ? 'development' : 'production',
        baseURL: this.baseURL,
        timeout: this.timeout
      });
    }
  }

  /**
   * Build full API URL
   */
  buildURL(endpoint) {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;
  }

  /**
   * Get request headers with authentication
   */
  getHeaders(additional = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...additional
    };

    // Add authentication if available
    const session = this.getSession();
    if (session && session.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    return headers;
  }

  /**
   * Get session from localStorage
   */
  getSession() {
    try {
      const raw = localStorage.getItem('admin_session');
      if (!raw) {
        console.log('APIManager: No session found in localStorage');
        return null;
      }
      const session = JSON.parse(raw);
      console.log('APIManager: Session found:', {
        hasToken: !!session.token,
        tokenStart: session.token ? session.token.substring(0, 10) + '...' : 'null',
        user: session.user?.username || 'unknown'
      });
      return session;
    } catch (error) {
      console.warn('APIManager: Failed to parse session:', error);
      return null;
    }
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!response.ok && response.status === 401) {
          this.handleUnauthorized(response, data);
        }

        if (response.ok) {
          return {
            success: true,
            data: data.data || data,
            status: response.status
          };
        } else {
          return {
            success: false,
            error: data.error || data.message || 'Request failed',
            message: data.message || null,
            data: data.data || null,
            status: response.status
          };
        }
      } else {
        // Non-JSON response
        const text = await response.text();
        if (!response.ok && response.status === 401) {
          this.handleUnauthorized(response, text);
        }
        
        if (response.ok) {
          return {
            success: true,
            data: text,
            status: response.status
          };
        } else {
          return {
            success: false,
            error: text || 'Request failed',
            message: text || null,
            data: null,
            status: response.status
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response',
        status: response.status,
        detail: error.message
      };
    }
  }

  handleUnauthorized(response, body) {
    try {
      if (this._sessionBroadcastInFlight) {
        return;
      }

      const session = this.getSession();
      if (!session || !session.token) {
        return;
      }

      this._sessionBroadcastInFlight = true;

      if (typeof window !== 'undefined') {
        const detail = {
          status: response?.status,
          url: response?.url,
          body,
          timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail }));
      }

      // Reset flag shortly after to allow future detections
      setTimeout(() => {
        this._sessionBroadcastInFlight = false;
      }, 100);
    } catch (error) {
      this._sessionBroadcastInFlight = false;
      console.warn('APIManager: Failed to dispatch session expiration event:', error);
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (this.debug) {
      console.error('API Error:', error);
    }

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ',
        type: 'NETWORK_ERROR'
      };
    }

    // Timeout errors
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่',
        type: 'TIMEOUT_ERROR'
      };
    }

    // Generic error
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
      type: 'UNKNOWN_ERROR',
      detail: error
    };
  }

  /**
   * Create fetch request with timeout
   */
  async createRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: this.getHeaders(options.headers || {})
      });

      clearTimeout(timeoutId);
      return await this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    
    if (this.debug) {
      console.log('🔄 GET:', url);
    }

    return await this.createRequest(url, {
      method: 'GET',
      ...options
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = null, options = {}) {
    const url = this.buildURL(endpoint);
    
    if (this.debug) {
      console.log('🔄 POST:', url, data);
    }

    const requestOptions = {
      method: 'POST',
      ...options
    };

    if (data !== null) {
      requestOptions.body = JSON.stringify(data);
    }

    return await this.createRequest(url, requestOptions);
  }

  /**
   * PUT request
   */
  async put(endpoint, data = null, options = {}) {
    const url = this.buildURL(endpoint);
    
    if (this.debug) {
      console.log('🔄 PUT:', url, data);
    }

    const requestOptions = {
      method: 'PUT',
      ...options
    };

    if (data !== null) {
      requestOptions.body = JSON.stringify(data);
    }

    return await this.createRequest(url, requestOptions);
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    
    if (this.debug) {
      console.log('🔄 DELETE:', url);
    }

    return await this.createRequest(url, {
      method: 'DELETE',
      ...options
    });
  }

  /**
   * Health check - test API connection
   */
  async healthCheck() {
    try {
      const result = await this.get('health');
      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export singleton instance
const apiManager = new APIManager();
export default apiManager;
