import templateLoader from '../../templateLoader.js';
import adminState from './state.js';

export async function loadAdminTemplates() {
  if (adminState.templatesLoaded) return;

  try {
    const templates = await templateLoader.loadMultiple([
      'forms/admin/add-teacher',
      'forms/admin/add-class',
      'forms/admin/add-room',
      'forms/admin/add-subject',
      'forms/admin/add-period',
      'forms/admin/add-academic-year'
    ]);

    adminState.templates = templates;

    const adminFormsGrid = document.querySelector('#admin-data .admin-forms-grid');
    if (adminFormsGrid) {
      adminFormsGrid.innerHTML = `
        <div id="add-teacher" class="data-sub-page active">
          ${templates['forms/admin/add-teacher']}
        </div>
        <div id="add-class" class="data-sub-page hidden">
          ${templates['forms/admin/add-class']}
        </div>
        <div id="add-room" class="data-sub-page hidden">
          ${templates['forms/admin/add-room']}
        </div>
        <div id="add-subject" class="data-sub-page hidden">
          ${templates['forms/admin/add-subject']}
        </div>
        <div id="add-period" class="data-sub-page hidden">
          ${templates['forms/admin/add-period']}
        </div>
      `;

      window.adminTemplates = templates;
    }

    const academicManagementContent = document.querySelector('#academic-management-content');
    if (academicManagementContent) {
      const parser = new DOMParser();
      const templateHtml = templates['forms/admin/add-academic-year'];
      const doc = parser.parseFromString(templateHtml, 'text/html');
      const templateElement = doc.body.firstElementChild;

      academicManagementContent.innerHTML = '';
      if (templateElement) {
        academicManagementContent.appendChild(templateElement);
      } else {
        academicManagementContent.innerHTML = templateHtml;
      }
    }

    console.log('✅ Admin templates loaded successfully');
    adminState.templatesLoaded = true;
  } catch (error) {
    console.error('❌ Error loading admin templates:', error);
  }
}
