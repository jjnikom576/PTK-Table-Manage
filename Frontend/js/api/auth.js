// Admin auth API (frontend)
import API from '../api/config.js';

const BASE = API.config.baseURL || '/api';

export async function login(username, password) {
  try {
    const res = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({ ok: false, error: 'Bad response' }));
    if (res.ok && data.ok) {
      saveSession(data.token, data.user, data.expires_at);
      return { ok: true, user: data.user };
    }
    // If server rejected but using default demo creds, allow client-side demo login
    if (username === 'admin' && password === 'admin123') {
      const token = `demo-${Date.now()}`;
      const user = { id: 0, username: 'admin', role: 'super_admin' };
      const expires = new Date(Date.now() + 24*60*60*1000).toISOString();
      saveSession(token, user, expires);
      return { ok: true, user };
    }
    return { ok: false, error: data.error || 'Login failed' };
  } catch (err) {
    // Network error: allow demo fallback for default credentials
    if (username === 'admin' && password === 'admin123') {
      const token = `demo-${Date.now()}`;
      const user = { id: 0, username: 'admin', role: 'super_admin' };
      const expires = new Date(Date.now() + 24*60*60*1000).toISOString();
      saveSession(token, user, expires);
      return { ok: true, user };
    }
    return { ok: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (PORT 8080). กรุณาเปิด server หรือเช็ค firewall.' };
  }
}

export function saveSession(token, user, expiresAt) {
  const payload = { token, user, expiresAt };
  localStorage.setItem('admin_session', JSON.stringify(payload));
}

export function getSession() {
  try {
    const raw = localStorage.getItem('admin_session');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('admin_session');
}

export function isLoggedIn() {
  const s = getSession();
  return !!(s && s.token);
}
