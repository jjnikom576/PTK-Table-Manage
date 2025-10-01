// Minimal, UTF-8 navigation module to replace corrupted navigation.js

let currentPage = 'student';
let initialized = false;

export function initNavigation() {
  if (initialized) return;
  initialized = true;

  // Nav link clicks
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.dataset.page;
      showPage(pageId);
    });
  });

  // Hash routing
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#','');
    if (hash && hash !== currentPage) showPage(hash);
  });

  // Initial page
  const hash = window.location.hash.replace('#','');
  if (hash && document.getElementById(`page-${hash}`)) {
    showPage(hash);
  } else {
    showPage('student');
  }
}

async function showPage(pageId) {
  try {
    // Hide all page sections
    document.querySelectorAll('[id^="page-"]').forEach(page => {
      page.classList.add('hidden');
      page.style.display = 'none';
    });

    // Show target
    const el = document.getElementById(`page-${pageId}`);
    if (el) {
      el.classList.remove('hidden');
      el.style.display = 'block';
      window.location.hash = pageId;
      currentPage = pageId;
      updateActiveNav(pageId);

      // Initialize page modules when first shown
      try {
        const gc = await import('./context/globalContext.js');
        const ctx = gc.getContext ? gc.getContext() : null;
        
        if (pageId === 'admin') {
          const mod = await import('./pages/admin.js');
          if (mod && typeof mod.initAdminPage === 'function') {
            await mod.initAdminPage(ctx);
          }
        } else if (pageId === 'teacher') {
          const mod = await import('./pages/teacherSchedule.js');
          if (mod && typeof mod.initTeacherSchedulePage === 'function') {
            console.log('[nav] 👨‍🏫 Initializing teacher schedule page...');
            await mod.initTeacherSchedulePage(ctx);
            console.log('[nav] ✅ Teacher schedule page initialized');
          }
        }
      } catch (e) {
        console.warn('[nav] init page failed:', e);
      }
    }
  } catch (e) {
    console.error('[nav] showPage error:', e);
  }
}

function updateActiveNav(pageId) {
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === pageId);
    if (a.parentElement?.classList.contains('nav-item')) {
      a.parentElement.classList.toggle('active', a.dataset.page === pageId);
    }
  });
}

export function navigateToPage(pageId) {
  showPage(pageId);
}

export function getCurrentPage() {
  return currentPage;
}

export function setupMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const menu = document.querySelector('.nav-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = toggle.classList.contains('open');
    toggle.classList.toggle('open', !open);
    menu.classList.toggle('open', !open);
    toggle.setAttribute('aria-expanded', String(!open));
  });
  menu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (toggle.classList.contains('open')) {
        toggle.classList.remove('open');
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

export function getNavigationState() {
  return { currentPage, initialized };
}

