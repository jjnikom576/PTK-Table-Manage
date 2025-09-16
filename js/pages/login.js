import { login } from '../api/auth.js';

export async function initLoginPage() {
  const section = document.getElementById('page-login');
  if (!section) return;

  // Ensure visible
  section.classList.remove('hidden');
  section.style.display = 'block';

  // Bind events
  const userEl = section.querySelector('#login-username');
  const passEl = section.querySelector('#login-password');
  const btn = section.querySelector('#login-submit');
  const err = section.querySelector('#login-error');

  const doLogin = async () => {
    if (err) err.style.display = 'none';
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...'; }
    const u = (userEl?.value || '').trim();
    const p = passEl?.value || '';
    if (!u || !p) {
      if (err) { err.textContent = 'กรอกข้อมูลให้ครบ'; err.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
      return;
    }
    const res = await login(u, p);
    if (res.ok) {
      window.location.hash = 'admin';
      window.location.reload();
    } else {
      if (err) { err.textContent = res.error || 'เข้าสู่ระบบไม่สำเร็จ'; err.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
    }
  };

  if (btn) btn.addEventListener('click', doLogin);
  section.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
}
