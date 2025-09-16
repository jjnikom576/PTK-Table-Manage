/**
 * Admin Page – Template-based with minimal login integration
 */

import { isLoggedIn, login, logout } from '../api/auth.js';
import { getContext } from '../context/globalContext.js';
import templateLoader from '../templateLoader.js';

let adminState = {
  context: null,
  initialized: false,
  templatesLoaded: false
};

export async function initAdminPage(context = null) {
  // Ensure admin page is visible
  const section = document.getElementById('page-admin');
  if (section) { section.classList.remove('hidden'); section.style.display = 'block'; }

  // Ensure sub-nav has user actions on the right
  try { ensureUserActionsInSubnav(); } catch (e) {}

  adminState.context = normalizeContext(context) || getContext();
  showAuthOnly();
  bindAuthForm();
  adjustAuthInputWidth();





  bindLogout();
  bindDataSubNavigation();
  
  // โหลด admin templates
  await loadAdminTemplates();
  
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

// ------------------------ Template Loading ------------------------

async function loadAdminTemplates() {
  if (adminState.templatesLoaded) return;
  
  try {
    // โหลด admin form templates
    const templates = await templateLoader.loadMultiple([
      'forms/admin/add-teacher',
      'forms/admin/add-class', 
      'forms/admin/add-room',
      'forms/admin/add-subject'
    ]);
    
    // แทรก templates เข้าใน admin forms grid
    const adminFormsGrid = document.querySelector('#admin-data .admin-forms-grid');
    if (adminFormsGrid) {
      // ล้างเนื้อหาเดิม
      adminFormsGrid.innerHTML = '';
      
      // เพิ่ม templates ใหม่
      adminFormsGrid.innerHTML = 
        templates['forms/admin/add-teacher'] +
        templates['forms/admin/add-class'] +
        templates['forms/admin/add-room'] +
        templates['forms/admin/add-subject'];
      
      console.log('✅ Admin templates loaded successfully');
    }
    
    adminState.templatesLoaded = true;
  } catch (error) {
    console.error('❌ Error loading admin templates:', error);
  }
}

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
  const page = document.getElementById('page-admin');
  if (auth) auth.classList.remove('hidden');
  sections.forEach(s => s.classList.add('hidden'));
  const headerBtn = document.querySelector('#page-admin .btn-logout-admin');
  if (headerBtn) headerBtn.classList.add('hidden');
  const userBox = document.querySelector('#page-admin .admin-user-actions');
  if (userBox) userBox.classList.add('hidden');
  if (page) page.classList.add('auth-only');
}

function showAdminSections() {
  const auth = document.getElementById('admin-auth-check');
  const sections = document.querySelectorAll('#page-admin .admin-section');
  const page = document.getElementById('page-admin');
  if (auth) auth.classList.add('hidden');
  sections.forEach(s => s.classList.remove('hidden'));
  const headerBtn = document.querySelector('#page-admin .btn-logout-admin');
  if (headerBtn) headerBtn.classList.remove('hidden');
  const userBox = document.querySelector('#page-admin .admin-user-actions');
  if (userBox) userBox.classList.remove('hidden');
  if (page) page.classList.remove('auth-only');
}

function normalizeContext(ctx) {
  if (!ctx) return null;
  if (ctx.currentYear && ctx.currentSemester) {
    return { year: ctx.currentYear, semesterId: ctx.currentSemester.id };
  }
  if (ctx.year && ctx.semesterId) return ctx;
  return null;
}

function ensureUserActionsInSubnav() {
  const nav = document.querySelector('#page-admin nav.sub-navigation');
  if (!nav) return;
  // If already present, skip
  if (nav.querySelector('.admin-subnav')) return;
  const ul = nav.querySelector('ul.sub-nav-tabs');
  if (!ul) return;
  // Create wrapper and move ul inside
  const wrap = document.createElement('div');
  wrap.className = 'admin-subnav';
  ul.parentNode.insertBefore(wrap, ul);
  wrap.appendChild(ul);
  // Add user actions box
  const actions = document.createElement('div');
  actions.className = 'admin-user-actions hidden';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'admin-username';
  nameSpan.id = 'admin-username-display';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn--outline btn-logout-admin';
  btn.textContent = 'ออกจากระบบ';
  actions.appendChild(nameSpan);
  actions.appendChild(btn);
  wrap.appendChild(actions);
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




function bindDataSubNavigation() {
  // Bind data sub-navigation tabs
  const dataSubNavTabs = document.querySelectorAll('.data-sub-nav-tab');
  
  dataSubNavTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all tabs
      dataSubNavTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked tab
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      // Hide all data sub-pages
      const dataSubPages = document.querySelectorAll('.data-sub-page');
      dataSubPages.forEach(page => {
        page.classList.add('hidden');
      });
      
      // Show target page
      const targetId = tab.getAttribute('data-target');
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
      }
    });
  });
  
  // Initialize first tab as active if none are active
  const activeTab = document.querySelector('.data-sub-nav-tab.active');
  if (!activeTab && dataSubNavTabs.length > 0) {
    dataSubNavTabs[0].click();
  }
}

function adjustAuthInputWidth() {
  try {
    const form = document.querySelector('#page-admin .auth-form');
    if (!form) return;
    
    // FIX: Center entire auth-form container
    form.style.margin = '0 auto';
    form.style.textAlign = 'center';
    form.style.maxWidth = '350px';
    
    // FIX: Change form to flexbox layout for center alignment
    const formElement = form.querySelector('form');
    if (formElement) {
      formElement.style.display = 'flex';
      formElement.style.flexDirection = 'column';
      formElement.style.alignItems = 'center';
      formElement.style.gap = '0.75rem';
    }
    
    // FIX: Create row containers for label + input pairs
    const labels = form.querySelectorAll('label');
    labels.forEach((label) => {
      const input = label.nextElementSibling;
      if (input && input.tagName === 'INPUT') {
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.style.justifyContent = 'center';
        
        // Move label and input into wrapper
        label.parentNode.insertBefore(wrapper, label);
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        
        // Style the input
        input.style.padding = '0.4rem 0.55rem';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '6px';
      }
    });
    
    // FIX: Center button
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.style.margin = '0.5rem auto 0';
      button.style.padding = '0.55rem 1.5rem';
    }
  } catch (e) {}
}


