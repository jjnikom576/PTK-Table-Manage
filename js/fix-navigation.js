// FIX: ปัญหา Event Listener ซ้ำใน navigation.js

// Import dataService
import * as dataService from './services/dataService.js';

// เพิ่ม flag เพื่อป้องกันการโหลดซ้ำ
let eventListenersSetup = false;

// แก้ไข initStudentPage function
export function fixStudentPageEventListeners() {
  const classSelector = document.getElementById('class-dropdown');
  
  if (classSelector && !eventListenersSetup) {
    // ลบ event listeners เก่าก่อน (ถ้ามี)
    const newClassSelector = classSelector.cloneNode(true);
    classSelector.parentNode.replaceChild(newClassSelector, classSelector);
    
    // เพิ่ม event listener ใหม่เพียงครั้งเดียว
    newClassSelector.addEventListener('change', (e) => {
      const value = e.target.value;
      console.log('[FIX] Class selector change:', value);
      
      if (value) {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const className = selectedOption.text.split(' (')[0];
        
        // Update UI
        updateSelectedClassName(className);
        loadMockSchedule(value);
      } else {
        hideSchedule();
      }
    });
    
    eventListenersSetup = true;
    console.log('✅ Event listeners fixed - no more duplicates');
  }
}

function updateSelectedClassName(className) {
  const element = document.getElementById('selected-class-name');
  if (element) {
    element.textContent = className;
  }
}

function hideSchedule() {
  const scheduleContainer = document.getElementById('student-schedule-table');
  const emptyState = document.getElementById('student-empty-state');
  const scheduleHeader = document.getElementById('student-schedule-header');
  
  if (scheduleContainer) scheduleContainer.innerHTML = '';
  if (emptyState) emptyState.style.display = 'block';
  if (scheduleHeader) scheduleHeader.classList.add('hidden');
}

async function loadMockSchedule(classId) {
  console.log('[FIX] Loading schedule for:', classId);
  
  const scheduleContainer = document.getElementById('student-schedule-table');
  if (!scheduleContainer) return;
  
  try {
    // เรียก dataService เพียงครั้งเดียว
    const result = await dataService.getStudentSchedule(classId);
    
    if (result.ok) {
      // สร้างตารางและแสดง
      const scheduleHTML = buildScheduleTable(result.data.matrix);
      scheduleContainer.innerHTML = scheduleHTML;
      
      // แสดง header
      const emptyState = document.getElementById('student-empty-state');
      const scheduleHeader = document.getElementById('student-schedule-header');
      
      if (emptyState) emptyState.style.display = 'none';
      if (scheduleHeader) scheduleHeader.classList.remove('hidden');
      
      console.log('✅ Schedule loaded successfully');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Schedule loading failed:', error);
    scheduleContainer.innerHTML = `<p class="error">เกิดข้อผิดพลาด: ${error.message}</p>`;
  }
}

function buildScheduleTable(matrix) {
  const dayNames = { 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ', 4: 'พฤหัสบดี', 5: 'ศุกร์' };
  const timePeriods = {
    1: '08:20-09:10', 2: '09:10-10:00', 3: '10:20-11:10', 4: '11:10-12:00',
    5: '13:00-13:50', 6: '13:50-14:40', 7: '14:40-15:30', 8: '15:30-16:20'
  };
  
  let html = `<table class="schedule-table"><thead><tr><th>วัน/เวลา</th>`;
  
  // หัวตาราง
  for (let period = 1; period <= 8; period++) {
    html += `<th>คาบ ${period}<br><small>${timePeriods[period]}</small></th>`;
  }
  html += `</tr></thead><tbody>`;
  
  // เนื้อตาราง
  for (let day = 1; day <= 5; day++) {
    html += `<tr><td class="day-cell">${dayNames[day]}</td>`;
    
    for (let period = 1; period <= 8; period++) {
      const cellData = matrix[day] && matrix[day][period];
      
      if (cellData) {
        html += `<td class="schedule-cell">
          <div class="subject">${cellData.subject.subject_name}</div>
          <div class="teacher">${cellData.teacher.name}</div>
          <div class="room">${cellData.room.name}</div>
        </td>`;
      } else {
        html += `<td class="schedule-cell"><div class="subject">-</div></td>`;
      }
    }
    html += `</tr>`;
  }
  
  html += `</tbody></table>`;
  return html;
}

// Export functions สำหรับให้ navigation.js เรียกใช้
export { updateSelectedClassName, hideSchedule, loadMockSchedule, buildScheduleTable };
