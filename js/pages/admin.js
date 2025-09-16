/**
 * Admin Page – Minimal login integration using existing static HTML in index.html
 */

import { isLoggedIn, login, logout } from '../api/auth.js';
import { getContext } from '../context/globalContext.js';

let adminState = {
  context: null,
  initialized: false
};

export async function initAdminPage(context = null) {
  // Ensure admin page is visible
  const section = document.getElementById('page-admin');
  if (section) { section.classList.remove('hidden'); section.style.display = 'block'; }

  adminState.context = normalizeContext(context) || getContext();
  showAuthOnly();
  bindAuthForm();





  bindLogout();
  adminState.initialized = true;
}

export function setAdminContext(year, semesterId) {
  adminState.context = { year, semesterId };
}

export function validateAdminContextAccess(context, user) {
  // Keep permissive; we gate UI with isLoggedIn()
  return true;
}

export async function updateAdminUIForContext(context) {
  adminState.context = normalizeContext(context) || adminState.context;
}

// No-op placeholders to keep API surface compatible
export async function showTeacherManagement() {}
export async function showClassManagement() {}
export async function showRoomManagement() {}
export async function showSubjectManagement() {}
export async function showScheduleManagement() {}

// ------------------------ Helpers ------------------------

function bindAuthForm() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = (document.getElementById('admin-username')?.value || '').trim();
    const p = (document.getElementById('admin-password')?.value || '');
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...'; }
    const res = await login(u, p);
    if (res.ok) {
      showAdminSections(); updateUsernameHeader();
    } else {
      alert(res.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
  });
}

function bindLogout() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('btn-logout-admin')) {
      try { logout(); } catch {}
      window.location.hash = 'login';
      window.location.reload();
    }
  }, { passive: true });
}

function showAuthOnly() {
  const auth = document.getElementById('admin-auth-check');
  const sections = document.querySelectorAll('#page-admin .admin-section');
  if (auth) auth.classList.remove('hidden');
  sections.forEach(s => s.classList.add('hidden'));
  const headerBtn = document.querySelector('#page-admin .btn-logout-admin');
  if (headerBtn) headerBtn.classList.add('hidden');
}

function showAdminSections() {
  const auth = document.getElementById('admin-auth-check');
  const sections = document.querySelectorAll('#page-admin .admin-section');
  if (auth) auth.classList.add('hidden');
  sections.forEach(s => s.classList.remove('hidden'));
  const headerBtn = document.querySelector('#page-admin .btn-logout-admin');
  if (headerBtn) headerBtn.classList.remove('hidden');
}

function normalizeContext(ctx) {
  if (!ctx) return null;
  if (ctx.currentYear && ctx.currentSemester) {
    return { year: ctx.currentYear, semesterId: ctx.currentSemester.id };
  }
  if (ctx.year && ctx.semesterId) return ctx;
  return null;
}


function updateUsernameHeader() {
  try {
    const raw = localStorage.getItem('admin_session');
    let n = 'admin';
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.user && data.user.username) n = data.user.username;
    }
    const el = document.getElementById('admin-username-display');
    if (el) el.textContent = 'ผู้ใช้: ' + n;
  } catch (e) {}
}



