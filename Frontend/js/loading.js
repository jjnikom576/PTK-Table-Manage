// Global loading overlay helpers for Admin pages
// Uses #admin-loading element in index.html

(function() {
  function showLoading(message) {
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

  function hideLoading() {
    try {
      const el = document.getElementById('admin-loading');
      if (!el) return;
      el.classList.add('hidden');
      el.style.display = 'none';
    } catch (_) {}
  }

  // Expose globally for non-module scripts
  window.showLoading = window.showLoading || showLoading;
  window.hideLoading = window.hideLoading || hideLoading;
  
  // Export for ES6 modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showLoading, hideLoading };
  }
  
  // Export for ES6 import/export (modern way)
  if (typeof window !== 'undefined') {
    window.loadingHelpers = { showLoading, hideLoading };
  }
})();

// ES6 exports
export { showLoading, hideLoading };

