import SchoolScheduleApp from './app/SchoolScheduleApp.js';

const app = new SchoolScheduleApp();

function initializeApp() {
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
  initializeApp();
}

window.SchoolScheduleApp = app;
