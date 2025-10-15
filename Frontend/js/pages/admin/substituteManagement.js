/**
 * Substitute Management Module for Admin Panel
 * Handles finding and assigning substitute teachers
 */

import { getContext } from '../../context/globalContext.js';
import { getTeachers, getSchedules, getSubjects, getClasses, getRooms } from '../../services/dataService.js';
import { formatThaiDate, getTeacherName } from '../../utils.js';
import scheduleAPI from '../../api/schedule-api.js';

let substituteState = {
  teachers: [],
  schedules: [],
  subjects: [],
  classes: [],
  rooms: [],
  selectedDate: new Date().toISOString().slice(0, 10),
  // Track current assignments to prevent duplicate assignments
  currentAssignments: {}, // { period_no: teacher_id }
  // Track substitute stats (จำนวนครั้งที่สอนแทนในภาคเรียนนี้)
  substituteStats: {} // { teacher_id: count }
};

/**
 * Initialize substitute management
 */
export async function initSubstituteManagement() {
  console.log('🔄 Initializing Substitute Management...');

  try {
    // Set default date to today
    const dateInput = document.querySelector('#substitute-date');
    if (dateInput) {
      dateInput.value = substituteState.selectedDate;
      dateInput.addEventListener('change', (e) => {
        substituteState.selectedDate = e.target.value;
        console.log('[Substitute] Date changed to:', e.target.value);
      });
    }

    // Load all necessary data
    await loadSubstituteData();

    // Render teacher checklist
    renderTeacherChecklist();

    // Bind event listeners
    bindSubstituteEventListeners();

    console.log('✅ Substitute Management initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Substitute Management:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

/**
 * Load all necessary data
 */
async function loadSubstituteData() {
  console.log('[Substitute] Loading data...');

  const [teachersResp, schedulesResp, subjectsResp, classesResp, roomsResp, statsResp] = await Promise.all([
    getTeachers(),
    getSchedules(),
    getSubjects(),
    getClasses(),
    getRooms(),
    scheduleAPI.getSubstitutionStats()
  ]);

  substituteState.teachers = teachersResp.data || [];
  substituteState.schedules = schedulesResp.data || [];
  substituteState.subjects = subjectsResp.data || [];
  substituteState.classes = classesResp.data || [];
  substituteState.rooms = roomsResp.data || [];
  substituteState.substituteStats = statsResp.success ? (statsResp.data || {}) : {};

  console.log('[Substitute] Data loaded:', {
    teachers: substituteState.teachers.length,
    schedules: substituteState.schedules.length,
    subjects: substituteState.subjects.length,
    substituteStats: Object.keys(substituteState.substituteStats).length
  });
}

/**
 * Render teacher checklist
 */
function renderTeacherChecklist() {
  const checklistContainer = document.querySelector('#absent-teachers-checklist');
  if (!checklistContainer) return;

  // Sort teachers by name (using getTeacherName helper)
  const sortedTeachers = substituteState.teachers.sort((a, b) =>
    getTeacherName(a).localeCompare(getTeacherName(b), 'th')
  );

  checklistContainer.innerHTML = `
    <div class="teacher-search-container">
      <input type="text"
             id="teacher-search-input"
             class="teacher-search-input"
             placeholder="🔍 ค้นหาชื่อครู...">
    </div>
    <div class="teacher-toggle-grid" id="teacher-toggle-grid">
      ${sortedTeachers.map(teacher => `
        <button class="teacher-toggle-btn"
                data-teacher-id="${teacher.id}"
                data-teacher-name="${getTeacherName(teacher)}"
                data-state="off"
                role="switch"
                aria-checked="false">
          <span class="teacher-name">${getTeacherName(teacher)}</span>
          <span class="toggle-indicator">○</span>
        </button>
      `).join('')}
    </div>
  `;

  // Bind search functionality
  const searchInput = document.getElementById('teacher-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterTeachers(e.target.value);
    });
  }

  console.log('[Substitute] Rendered', sortedTeachers.length, 'teachers in toggle grid');
}

/**
 * Filter teachers by search text
 */
function filterTeachers(searchText) {
  const buttons = document.querySelectorAll('.teacher-toggle-btn');
  const lowerSearch = searchText.toLowerCase().trim();

  buttons.forEach(btn => {
    const teacherName = btn.dataset.teacherName.toLowerCase();
    if (teacherName.includes(lowerSearch)) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  });
}

/**
 * Bind event listeners
 */
function bindSubstituteEventListeners() {
  const findButton = document.querySelector('#btn-find-substitutes');
  const submitButton = document.querySelector('#btn-submit-substitutes');

  if (findButton) {
    findButton.addEventListener('click', handleFindSubstitutes);
  }

  if (submitButton) {
    submitButton.addEventListener('click', handleSubmitSubstitutes);
  }

  // Bind teacher toggle buttons
  const checklistContainer = document.querySelector('#absent-teachers-checklist');
  if (checklistContainer) {
    checklistContainer.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.teacher-toggle-btn');
      if (toggleBtn) {
        const currentState = toggleBtn.dataset.state;
        const newState = currentState === 'off' ? 'on' : 'off';

        toggleBtn.dataset.state = newState;
        toggleBtn.setAttribute('aria-checked', newState === 'on' ? 'true' : 'false');

        const indicator = toggleBtn.querySelector('.toggle-indicator');
        if (indicator) {
          indicator.textContent = newState === 'on' ? '●' : '○';
        }

        // Toggle active class for styling
        if (newState === 'on') {
          toggleBtn.classList.add('active');
        } else {
          toggleBtn.classList.remove('active');
        }
      }
    });
  }

  console.log('[Substitute] Event listeners bound');
}

/**
 * Handle find substitutes button click
 */
async function handleFindSubstitutes() {
  try {
    const selectedDate = substituteState.selectedDate;
    if (!selectedDate) {
      alert('กรุณาเลือกวันที่');
      return;
    }

    // Get selected absent teachers from toggle buttons
    const toggleButtons = document.querySelectorAll('.teacher-toggle-btn[data-state="on"]');
    if (toggleButtons.length === 0) {
      alert('กรุณาเลือกครูที่ไม่อยู่อย่างน้อย 1 คน');
      return;
    }

    const absentTeacherIds = Array.from(toggleButtons).map(btn => parseInt(btn.dataset.teacherId));

    console.log('[Substitute] Finding substitutes for:', {
      date: selectedDate,
      absentTeachers: absentTeacherIds
    });

    // Show loading
    const recommendationsDiv = document.querySelector('#substitute-recommendations');
    if (recommendationsDiv) {
      recommendationsDiv.classList.remove('hidden');
      recommendationsDiv.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>กำลังค้นหาครูสอนแทนที่เหมาะสม...</p></div>';
    }

    // Get day of week from selected date
    const dayOfWeek = new Date(selectedDate).getDay(); // 0=Sunday, 1=Monday, ...

    // ⭐ NEW APPROACH: รวบรวม schedules ของครูที่ไม่มาทุกคน
    const allAffectedSchedules = [];

    for (const teacherId of absentTeacherIds) {
      // กรอง schedules จาก subjects ที่ครูคนนี้สอน
      const teacherSubjects = substituteState.subjects.filter(s => s.teacher_id === teacherId);
      const teacherSubjectIds = teacherSubjects.map(s => s.id);

      const teacherSchedules = substituteState.schedules.filter(sch =>
        teacherSubjectIds.includes(sch.subject_id) && sch.day_of_week === dayOfWeek
      );

      console.log(`[Substitute] Teacher ${teacherId} has ${teacherSchedules.length} schedules on day ${dayOfWeek}`);
      if (teacherSchedules[0]) {
        console.log(`[Substitute] Sample schedule:`, teacherSchedules[0]);
        console.log(`[Substitute] Schedule keys:`, Object.keys(teacherSchedules[0]));
        console.log(`[Substitute] All period-related fields:`, {
          period_number: teacherSchedules[0].period_number,
          period_no: teacherSchedules[0].period_no,
          period: teacherSchedules[0].period,
          periodNumber: teacherSchedules[0].periodNumber,
          period_id: teacherSchedules[0].period_id
        });
      }

      allAffectedSchedules.push(...teacherSchedules);
    }

    if (allAffectedSchedules.length === 0) {
      recommendationsDiv.innerHTML = '<div class="empty-state"><p>ไม่พบตารางสอนที่ได้รับผลกระทบในวันนี้</p></div>';
      return;
    }

    // Find optimal substitutes
    const recommendations = findOptimalSubstitutes(allAffectedSchedules, absentTeacherIds, dayOfWeek);

    // Display recommendations
    displayRecommendations(recommendations);

  } catch (error) {
    console.error('[Substitute] Error finding substitutes:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);
  }
}

/**
 * Find optimal substitute teachers
 * @param {Array} affectedSchedules - Schedules that need substitutes
 * @param {Array} absentTeacherIds - IDs of absent teachers
 * @param {number} dayOfWeek - Day of week (0=Sunday, 1=Monday, ...)
 * @returns {Array} Recommendations with all available teachers
 */
function findOptimalSubstitutes(affectedSchedules, absentTeacherIds, dayOfWeek) {
  const recommendations = [];
  const allTeachers = substituteState.teachers.filter(t => !absentTeacherIds.includes(t.id));

  console.log('[Algorithm] Finding substitutes for', affectedSchedules.length, 'affected schedules');
  console.log('[Algorithm] Total teachers available:', allTeachers.length);
  console.log('[Algorithm] Day of week:', dayOfWeek);

  for (const schedule of affectedSchedules) {
    const subject = substituteState.subjects.find(s => s.id === schedule.subject_id);
    const classData = substituteState.classes.find(c => c.id === schedule.class_id);
    const room = substituteState.rooms.find(r => r.id === schedule.room_id);
    const absentTeacher = substituteState.teachers.find(t => t.id === subject?.teacher_id);

    // ⭐ FIX: ใช้ period (ตามโครงสร้างฐานข้อมูล)
    const periodNo = schedule.period || schedule.period_number || schedule.period_no;

    console.log(`[Algorithm] Processing schedule:`, {
      period_number: schedule.period_number,
      period_no: schedule.period_no,
      finalPeriodNo: periodNo,
      class: classData?.class_name,
      subject: subject?.subject_name,
      scheduleKeys: Object.keys(schedule)
    });

    // Find available teachers with constraints
    const availableTeachers = allTeachers.filter(teacher => {
      // Constraint 1: ไม่มี conflict ในคาบนี้ (⭐ แก้ไขให้ใช้ field ที่ถูกต้อง)
      const hasConflict = substituteState.schedules.some(sch => {
        const schPeriod = sch.period || sch.period_number || sch.period_no; // ⭐ FIX: ใช้ period
        const teacherSubjects = substituteState.subjects.filter(s => s.teacher_id === teacher.id);
        return teacherSubjects.some(s => s.id === sch.subject_id) &&
               sch.day_of_week === dayOfWeek &&
               schPeriod === periodNo;
      });

      // Constraint 2: ไม่สอนแทนเกิน 1 คาบในวันนี้ (ตรวจสอบจาก currentAssignments)
      const alreadyAssignedToday = Object.values(substituteState.currentAssignments).includes(teacher.id);

      return !hasConflict && !alreadyAssignedToday;
    });

    console.log(`[Algorithm] Period ${periodNo} - Total teachers: ${allTeachers.length}, Available: ${availableTeachers.length}`);

    // ⭐ Debug: แสดงรายชื่อครูที่ว่างและไม่ว่าง
    const conflictTeachers = allTeachers.filter(teacher => {
      const hasConflict = substituteState.schedules.some(sch => {
        const schPeriod = sch.period || sch.period_number || sch.period_no;
        const teacherSubjects = substituteState.subjects.filter(s => s.teacher_id === teacher.id);
        return teacherSubjects.some(s => s.id === sch.subject_id) &&
               sch.day_of_week === dayOfWeek &&
               schPeriod === periodNo;
      });
      return hasConflict;
    });

    if (conflictTeachers.length > 0) {
      console.log(`[Algorithm] Period ${periodNo} - Teachers with conflict:`, conflictTeachers.map(t => getTeacherName(t)).join(', '));
    }

    if (availableTeachers.length > 0) {
      console.log(`[Algorithm] Period ${periodNo} - Available teachers:`, availableTeachers.map(t => getTeacherName(t)).join(', '));
    }

    // Score each teacher
    const scoredTeachers = availableTeachers.map(teacher => {
      // ⭐ Priority 0 (สำคัญสุด): สอนชั้นเดียวกัน (ค่ามากกว่า = ดีกว่า)
      const teachesSameClass = substituteState.subjects.some(s =>
        s.teacher_id === teacher.id &&
        (s.class_id === schedule.class_id || (s.class_ids && s.class_ids.includes(schedule.class_id)))
      );

      // Priority 1: Count classes on this day (น้อยกว่า = ดีกว่า)
      const classesOnDay = substituteState.schedules.filter(sch => {
        const teacherSubjects = substituteState.subjects.filter(s => s.teacher_id === teacher.id);
        return teacherSubjects.some(s => s.id === sch.subject_id) && sch.day_of_week === dayOfWeek;
      }).length;

      // Priority 2: Previous substitution count (น้อยกว่า = ดีกว่า)
      const previousSubstitutions = substituteState.substituteStats[teacher.id] || 0;

      // Calculate score (lower is better)
      // Priority 0: teachesSameClass (ถ้าสอนชั้นเดียวกัน -1000 คะแนน)
      // Priority 1: classesOnDay (x10)
      // Priority 2: previousSubstitutions (x5)
      const score = (teachesSameClass ? -1000 : 0) + (classesOnDay * 10) + (previousSubstitutions * 5);

      return {
        teacher,
        score,
        teachesSameClass,
        classesOnDay,
        previousSubstitutions
      };
    });

    // Sort by score (ascending = ดีที่สุดอันดับแรก)
    scoredTeachers.sort((a, b) => a.score - b.score);

    console.log(`[Algorithm] Top candidate for period ${periodNo}:`,
      scoredTeachers[0] ? `${getTeacherName(scoredTeachers[0].teacher)} (score: ${scoredTeachers[0].score})` : 'None');

    recommendations.push({
      schedule: { ...schedule, period_no: periodNo }, // ⭐ แก้ให้ period_no ถูกต้อง
      subject,
      classData,
      room,
      absentTeacher,
      candidates: scoredTeachers, // ⭐ ส่งทุกคนที่ว่าง ไม่ใช่แค่ Top 5
      defaultCandidate: scoredTeachers[0] || null // ⭐ Default = อันดับ 1
    });
  }

  return recommendations;
}

/**
 * Display recommendations as timetable grid
 */
function displayRecommendations(recommendations) {
  const recommendationsDiv = document.querySelector('#substitute-recommendations');
  if (!recommendationsDiv) return;

  // Get unique absent teachers
  const absentTeachers = [...new Set(recommendations.map(r => r.absentTeacher))];

  // Group schedules by absent teacher
  const schedulesByTeacher = {};
  absentTeachers.forEach(teacher => {
    schedulesByTeacher[teacher.id] = recommendations.filter(r => r.absentTeacher?.id === teacher.id);
  });

  // Build HTML for each teacher's timetable
  const html = `
    <div class="substitute-timetables">
      ${absentTeachers.map(teacher => {
        const teacherSchedules = schedulesByTeacher[teacher.id];

        // Get all unique periods for this teacher
        const periods = [...new Set(teacherSchedules.map(s => s.schedule.period_no))].sort((a, b) => a - b);

        return `
          <div class="substitute-timetable-card">
            <h4 class="timetable-header">
              📋 ตารางสอนแทน - ${getTeacherName(teacher)}
              <span class="badge">${teacherSchedules.length} คาบ</span>
            </h4>

            <div class="timetable-grid">
              <table class="substitute-table">
                <thead>
                  <tr>
                    <th>คาบ</th>
                    <th>วิชา</th>
                    <th>ชั้นเรียน</th>
                    <th>ห้อง</th>
                    <th>ครูสอนแทน</th>
                  </tr>
                </thead>
                <tbody>
                  ${teacherSchedules.map(rec => {
                    const defaultTeacherId = rec.defaultCandidate?.teacher?.id || '';
                    const hasSameClassTeacher = rec.candidates.some(c => c.teachesSameClass);

                    return `
                      <tr data-period="${rec.schedule.period_no}">
                        <td class="period-cell">
                          <strong>คาบ ${rec.schedule.period_no}</strong>
                        </td>
                        <td class="subject-cell">
                          ${rec.subject?.subject_name || '-'}
                        </td>
                        <td class="class-cell">
                          <span class="badge badge-class">${rec.classData?.class_name || '-'}</span>
                        </td>
                        <td class="room-cell">
                          ${rec.room?.room_name || '-'}
                        </td>
                        <td class="teacher-select-cell">
                          ${rec.candidates.length > 0 ? `
                            <select class="substitute-teacher-select"
                                    data-schedule-id="${rec.schedule.id}"
                                    data-period-no="${rec.schedule.period_no}"
                                    data-absent-teacher-id="${rec.absentTeacher?.id}">
                              <option value="">-- เลือกครู --</option>
                              ${rec.candidates.map(candidate => {
                                const sameClassIndicator = candidate.teachesSameClass ? '⭐ ' : '';
                                return `
                                  <option value="${candidate.teacher.id}"
                                          ${candidate.teacher.id === defaultTeacherId ? 'selected' : ''}
                                          data-same-class="${candidate.teachesSameClass}">
                                    ${sameClassIndicator}${getTeacherName(candidate.teacher)}
                                    (สอน ${candidate.classesOnDay} คาบ, แทน ${candidate.previousSubstitutions} ครั้ง)
                                  </option>
                                `;
                              }).join('')}
                            </select>
                            ${hasSameClassTeacher ? '<div class="hint-text">⭐ = สอนชั้นนี้อยู่แล้ว</div>' : ''}
                          ` : `
                            <span class="warning-text">⚠️ ไม่มีครูว่าง</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  recommendationsDiv.innerHTML = html;
  recommendationsDiv.classList.remove('hidden');

  // ⭐ บันทึก default assignments
  recommendations.forEach(rec => {
    if (rec.defaultCandidate) {
      substituteState.currentAssignments[rec.schedule.period_no] = rec.defaultCandidate.teacher.id;
    }
  });

  // ⭐ Bind event listeners สำหรับ ComboBox
  bindComboBoxListeners();

  console.log('[Substitute] Displayed', recommendations.length, 'recommendations as timetable grid');
}

/**
 * Bind ComboBox listeners for tracking assignments
 */
function bindComboBoxListeners() {
  const selects = document.querySelectorAll('.substitute-teacher-select');

  selects.forEach(select => {
    select.addEventListener('change', (e) => {
      const periodNo = parseInt(e.target.dataset.periodNo);
      const selectedTeacherId = e.target.value ? parseInt(e.target.value) : null;

      console.log('[Substitute] ComboBox changed:', { periodNo, selectedTeacherId });

      // อัปเดต currentAssignments
      if (selectedTeacherId) {
        substituteState.currentAssignments[periodNo] = selectedTeacherId;
      } else {
        delete substituteState.currentAssignments[periodNo];
      }

      console.log('[Substitute] Current assignments:', substituteState.currentAssignments);
    });
  });

  console.log('[Substitute] ComboBox listeners bound to', selects.length, 'selects');
}

/**
 * Handle submit substitutes button click
 */
async function handleSubmitSubstitutes() {
  try {
    const selectedDate = substituteState.selectedDate;
    if (!selectedDate) {
      alert('กรุณาเลือกวันที่');
      return;
    }

    // Get selected absent teachers from toggle buttons
    const toggleButtons = document.querySelectorAll('.teacher-toggle-btn[data-state="on"]');
    if (toggleButtons.length === 0) {
      alert('กรุณาเลือกครูที่ไม่อยู่อย่างน้อย 1 คน');
      return;
    }

    // Get substitute selections
    const selects = document.querySelectorAll('.substitute-teacher-select');
    const substitutions = [];

    selects.forEach(select => {
      const scheduleId = parseInt(select.dataset.scheduleId);
      const absentTeacherId = parseInt(select.dataset.absentTeacherId);
      const substituteTeacherId = select.value ? parseInt(select.value) : null;

      if (substituteTeacherId) {
        substitutions.push({
          schedule_id: scheduleId,
          absent_teacher_id: absentTeacherId,
          substitute_teacher_id: substituteTeacherId,
          absent_date: selectedDate
        });
      }
    });

    if (substitutions.length === 0) {
      alert('กรุณาเลือกครูสอนแทนอย่างน้อย 1 คน');
      return;
    }

    console.log('[Substitute] Submitting:', {
      date: selectedDate,
      substitutions: substitutions.length,
      data: substitutions
    });

    // Confirm before submitting
    const confirmMsg = `ยืนยันการบันทึกการสอนแทน ${substitutions.length} คาบ\nในวันที่ ${formatThaiDate(selectedDate)}`;
    if (!confirm(confirmMsg)) {
      return;
    }

    // Show loading state
    const submitButton = document.querySelector('#btn-submit-substitutes');
    const originalButtonText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '⏳ กำลังบันทึก...';
    }

    // Call API to submit
    const response = await scheduleAPI.createSubstitutions(selectedDate, substitutions);

    if (response.success) {
      alert(`✅ บันทึกการสอนแทนสำเร็จ!\n\nบันทึกแล้ว ${response.data?.inserted_count || substitutions.length} คาบ`);

      // Reset UI
      substituteState.currentAssignments = {};
      const recommendationsDiv = document.querySelector('#substitute-recommendations');
      if (recommendationsDiv) {
        recommendationsDiv.innerHTML = '';
        recommendationsDiv.classList.add('hidden');
      }

      // Reset toggle buttons
      document.querySelectorAll('.teacher-toggle-btn[data-state="on"]').forEach(btn => {
        btn.dataset.state = 'off';
        btn.setAttribute('aria-checked', 'false');
        btn.classList.remove('active');
        const indicator = btn.querySelector('.toggle-indicator');
        if (indicator) indicator.textContent = '○';
      });

      // Reload stats
      const statsResp = await scheduleAPI.getSubstitutionStats();
      if (statsResp.success) {
        substituteState.substituteStats = statsResp.data || {};
        console.log('[Substitute] Stats reloaded:', Object.keys(substituteState.substituteStats).length);
      }

    } else {
      alert(`❌ เกิดข้อผิดพลาด: ${response.error || response.message || 'ไม่สามารถบันทึกการสอนแทนได้'}`);
    }

    // Restore button state
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }

  } catch (error) {
    console.error('[Substitute] Submit error:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message}`);

    // Restore button state
    const submitButton = document.querySelector('#btn-submit-substitutes');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = '💾 บันทึกการสอนแทน';
    }
  }
}
