import authAPI from '../../api/auth-api.js';

export function bindAuthForm({ onLoginSuccess } = {}) {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = (document.getElementById('admin-username')?.value || '').trim();
    const password = (document.getElementById('admin-password')?.value || '');
    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'กำลังเข้าสู่ระบบ...';
    }

    try {
      const result = await authAPI.login(username, password);
      if (result.success) {
        onLoginSuccess?.(result);
      } else {
        alert(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'เข้าสู่ระบบ';
      }
    }
  });
}

export function bindLogout({ onLogout } = {}) {
  document.addEventListener(
    'click',
    async (event) => {
      const target = event.target;
      if (!target || !target.classList || !target.classList.contains('btn-logout-admin')) {
        return;
      }

      try {
        await authAPI.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }

      onLogout?.();
    },
    { passive: true }
  );
}

export function showAuthOnly() {
  const auth = document.getElementById('admin-auth-check');
  const sections = document.querySelectorAll('#page-admin .admin-section');
  const page = document.getElementById('page-admin');

  if (authAPI.isAuthenticated()) {
    showAdminSections();
    updateUsernameHeader();
    return;
  }

  if (auth) auth.classList.remove('hidden');
  sections.forEach(section => section.classList.add('hidden'));

  const headerButton = document.querySelector('#page-admin .btn-logout-admin');
  if (headerButton) headerButton.classList.add('hidden');

  const userBox = document.querySelector('#page-admin .admin-user-actions');
  if (userBox) userBox.classList.add('hidden');

  if (page) page.classList.add('auth-only');
}

export function showAdminSections() {
  const auth = document.getElementById('admin-auth-check');
  const sections = document.querySelectorAll('#page-admin .admin-section');
  const page = document.getElementById('page-admin');

  if (auth) auth.classList.add('hidden');
  sections.forEach(section => section.classList.remove('hidden'));

  const headerButton = document.querySelector('#page-admin .btn-logout-admin');
  if (headerButton) headerButton.classList.remove('hidden');

  const userBox = document.querySelector('#page-admin .admin-user-actions');
  if (userBox) userBox.classList.remove('hidden');

  if (page) page.classList.remove('auth-only');
}

export function updateUsernameHeader() {
  try {
    const displayName = authAPI.getUserDisplayName();
    const element = document.getElementById('admin-username-display');
    if (element) {
      element.textContent = 'ผู้ใช้: ' + displayName;
    }
  } catch (error) {
    console.warn('Failed to update username header:', error);
  }
}
