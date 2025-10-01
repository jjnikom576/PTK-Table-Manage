// Global loading overlay helpers for Admin pages
// Uses #admin-loading element in index.html

export function showLoading(message) {
  try {
    const el = document.getElementById('admin-loading');
    if (!el) return;
    const text = el.querySelector('p');
    if (text && typeof message === 'string' && message.trim()) {
      text.textContent = message;
    }
    el.classList.remove('hidden');
    el.style.display = 'flex';
  } catch (_) {}
}

export function hideLoading() {
  try {
    const el = document.getElementById('admin-loading');
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
  } catch (_) {}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showLoading, hideLoading };
}

if (typeof window !== 'undefined') {
  window.showLoading = window.showLoading || showLoading;
  window.hideLoading = window.hideLoading || hideLoading;
  window.loadingHelpers = window.loadingHelpers || { showLoading, hideLoading };
}
