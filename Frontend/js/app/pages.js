import templateLoader from '../templateLoader.js';

export async function loadStudentSchedulePage() {
  try {
    console.log('📄 Loading student schedule page...');

    const template = await templateLoader.load('pages/student-schedule');

    const pageContainer = document.getElementById('page-content-container');
    if (pageContainer) {
      pageContainer.insertAdjacentHTML('beforeend', template);
    }

    console.log('✅ Student schedule page loaded');
  } catch (error) {
    console.error('❌ Error loading student schedule page:', error);
  }
}
