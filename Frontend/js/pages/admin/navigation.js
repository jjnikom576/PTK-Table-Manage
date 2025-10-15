import { initTeacherManagement } from './teacherManagement.js';
import { initClassManagement } from './classManagement.js';
import { initRoomManagement } from './roomManagement.js';
import { initSubjectManagement } from './subjectManagement.js';
import { initPeriodManagement } from './periodManagement.js';
import { initAcademicManagement } from './academicManagement.js';
import { initSubstituteManagement } from './substituteManagement.js';

export function bindMainAdminNavigation() {
  const mainNavTabs = document.querySelectorAll('#page-admin .sub-nav-tabs .sub-nav-tab:not([data-bound])');

  if (mainNavTabs.length === 0) {
    console.log('ℹ️ Main admin navigation already bound or no tabs found');
    return;
  }

  mainNavTabs.forEach(tab => {
    tab.setAttribute('data-bound', 'true');

    tab.addEventListener('click', (event) => {
      event.preventDefault();

      const targetId = tab.getAttribute('data-target');
      console.log('🎯 Admin tab clicked:', targetId);

      const allMainTabs = document.querySelectorAll('#page-admin .sub-nav-tabs .sub-nav-tab');
      allMainTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const adminSubPages = document.querySelectorAll('#page-admin .sub-page');
      adminSubPages.forEach(page => {
        page.classList.add('hidden');
        page.style.display = 'none';
      });

      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.style.display = 'block';
        console.log('✅ Showing admin section:', targetId);

        if (targetId === 'admin-year') {
          initAcademicYearNavigation();
        } else if (targetId === 'admin-data') {
          bindDataSubNavigation(); // ensure sub nav is bound after templates render
        } else if (targetId === 'admin-substitute') {
          initSubstituteManagement();
        }
      } else {
        console.error('❌ Target admin section not found:', targetId);
      }
    });
  });

  console.log('✅ Main admin navigation bound to', mainNavTabs.length, 'tabs');
}

export function bindDataSubNavigation() {
  const dataSubNavTabs = document.querySelectorAll('.data-sub-nav-tab');

  console.log('🔧 Binding data sub navigation, found', dataSubNavTabs.length, 'tabs');

  dataSubNavTabs.forEach(tab => {
    if (tab.dataset.bound === 'true') return;
    tab.dataset.bound = 'true';

    tab.addEventListener('click', async (event) => {
      event.preventDefault();

      const targetId = tab.getAttribute('data-target');
      console.log('📋 Data sub-tab clicked:', targetId);

      dataSubNavTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const dataSubPages = document.querySelectorAll('#admin-data .data-sub-page');
      console.log('📋 Found', dataSubPages.length, 'data sub-pages');
      dataSubPages.forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('active');
      });

      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');

        if (window.adminTemplates) {
          let templateKey = null;

          switch (targetId) {
            case 'add-teacher':
              templateKey = 'forms/admin/add-teacher';
              break;
            case 'add-class':
              templateKey = 'forms/admin/add-class';
              break;
            case 'add-room':
              templateKey = 'forms/admin/add-room';
              break;
            case 'add-subject':
              templateKey = 'forms/admin/add-subject';
              break;
            case 'add-period':
              templateKey = 'forms/admin/add-period';
              break;
          }

          if (templateKey && window.adminTemplates[templateKey]) {
            console.log('🔄 Reloading template:', templateKey);

            const parser = new DOMParser();
            const doc = parser.parseFromString(window.adminTemplates[templateKey], 'text/html');
            const templateDiv = doc.querySelector(`#${targetId}`);

            console.log('🔍 Template parsed. Found div:', !!templateDiv);

            if (templateDiv) {
              targetPage.innerHTML = templateDiv.innerHTML;
              console.log('✅ Content set from template div');
            } else {
              targetPage.innerHTML = window.adminTemplates[templateKey];
              console.log('⚠️ Fallback: using template as-is');
            }

            try {
              if (targetId === 'add-teacher') {
                await initTeacherManagement();
              } else if (targetId === 'add-class') {
                await initClassManagement();
              } else if (targetId === 'add-room') {
                await initRoomManagement();
              } else if (targetId === 'add-subject') {
                await initSubjectManagement();
              } else if (targetId === 'add-period') {
                await initPeriodManagement();
              }
            } catch (error) {
              console.error('❌ Failed to initialize sub-tab:', targetId, error);
            }
          } else {
            console.warn('⚠️ Template not found:', templateKey, 'Available:', Object.keys(window.adminTemplates || {}));
          }
        }

        console.log('✅ Showing data sub-page:', targetId);
      } else {
        console.error('❌ Target data sub-page not found:', targetId);
      }
    });
  });

  const activeTab = document.querySelector('.data-sub-nav-tab.active');
  if (!activeTab && dataSubNavTabs.length > 0) {
    console.log('📋 Initializing first data sub-tab as active');
    dataSubNavTabs[0].click();
  }
}

export function initAcademicYearNavigation() {
  console.log('📅 Initializing academic year navigation...');

  const subNavItems = document.querySelectorAll('#admin-year .sub-nav-item:not([data-bound])');

  if (subNavItems.length === 0) {
    console.log('ℹ️ Academic year sub-navigation already bound or no items found');
    const container = document.querySelector('#admin-year');
    const academicMgmtDiv = document.querySelector('#admin-year #academic-management');

    if (container && academicMgmtDiv) {
      if (academicMgmtDiv.classList.contains('hidden')) {
        academicMgmtDiv.classList.remove('hidden');
        academicMgmtDiv.style.display = 'block';
        console.log('✅ Removed hidden class from academic-management div');
      }
    }
    return;
  }

  bindAcademicSubNavItems(subNavItems);
  console.log('✅ Academic year navigation initialized with', subNavItems.length, 'sub-tabs');
}

function bindAcademicSubNavItems(subNavItems) {
  subNavItems.forEach(item => {
    item.setAttribute('data-bound', 'true');

    item.addEventListener('click', async (event) => {
      event.preventDefault();

      const targetSubTab = item.getAttribute('data-sub-tab');
      console.log('📅 Academic sub-tab clicked:', targetSubTab);

      const allSubNavItems = document.querySelectorAll('#admin-year .sub-nav-item');
      allSubNavItems.forEach(i => i.classList.remove('active'));

      item.classList.add('active');

      const allSubTabContent = document.querySelectorAll('#admin-year .sub-tab-content');
      allSubTabContent.forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
      });

      const targetContent = document.getElementById(targetSubTab);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
        console.log('✅ Showing academic sub-tab:', targetSubTab);
        if (targetSubTab === 'academic-management') {
          await initAcademicManagement();
        }
      } else {
        console.error('❌ Academic sub-tab content not found:', targetSubTab);
      }
    });
  });

  if (subNavItems.length > 0) {
    subNavItems[0].click();
  }
}
