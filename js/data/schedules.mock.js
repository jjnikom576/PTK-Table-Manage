/**
 * Enhanced Schedules Mock Data - Complete Multi-Year System
 */

// ปี 2566 - Historical Data
const schedules_2566 = [
    { id: 501, semester_id: 1, subject_id: 101, class_id: 101, day_of_week: 1, period: 1, room_id: 1 },
    { id: 502, semester_id: 1, subject_id: 102, class_id: 101, day_of_week: 1, period: 2, room_id: 2 },
    { id: 503, semester_id: 1, subject_id: 103, class_id: 101, day_of_week: 1, period: 3, room_id: 13 }
];

// ปี 2567 - Current Data 
const schedules_2567 = [
    // ม.1/1
    { id: 1, semester_id: 10, subject_id: 1, class_id: 1, day_of_week: 1, period: 1, room_id: 1 },
    { id: 2, semester_id: 10, subject_id: 2, class_id: 1, day_of_week: 1, period: 2, room_id: 2 },
    { id: 3, semester_id: 10, subject_id: 3, class_id: 1, day_of_week: 1, period: 3, room_id: 13 },
    { id: 4, semester_id: 10, subject_id: 4, class_id: 1, day_of_week: 1, period: 4, room_id: 3 },
    { id: 5, semester_id: 10, subject_id: 5, class_id: 1, day_of_week: 2, period: 1, room_id: 4 },
    { id: 6, semester_id: 10, subject_id: 6, class_id: 1, day_of_week: 2, period: 2, room_id: 5 },
    { id: 7, semester_id: 10, subject_id: 7, class_id: 1, day_of_week: 2, period: 3, room_id: 6 },
    // ม.1/2 
    { id: 11, semester_id: 10, subject_id: 11, class_id: 2, day_of_week: 1, period: 1, room_id: 7 },
    { id: 12, semester_id: 10, subject_id: 12, class_id: 2, day_of_week: 1, period: 2, room_id: 8 },
    { id: 13, semester_id: 10, subject_id: 13, class_id: 2, day_of_week: 1, period: 3, room_id: 14 }
];

// ปี 2568 - Future Data
const schedules_2568 = [
    // ม.1/1 ปี 2568 - ต้อง match กับ classes และ semesters
    { id: 801, semester_id: 7, subject_id: 1, class_id: 1, day_of_week: 1, period: 1, room_id: 1 },
    { id: 802, semester_id: 7, subject_id: 2, class_id: 1, day_of_week: 1, period: 2, room_id: 2 },
    { id: 803, semester_id: 7, subject_id: 3, class_id: 1, day_of_week: 1, period: 3, room_id: 13 },
    { id: 804, semester_id: 7, subject_id: 4, class_id: 1, day_of_week: 2, period: 1, room_id: 3 },
    { id: 805, semester_id: 7, subject_id: 5, class_id: 1, day_of_week: 2, period: 2, room_id: 4 }
];

export const schedulesData = {
    schedules_2566,
    schedules_2567,
    schedules_2568
};

export function getSchedulesByYear(year) {
    return schedulesData[`schedules_${year}`] || [];
}

export function getScheduleStats() {
    return {
        2566: schedules_2566.length,
        2567: schedules_2567.length,
        2568: schedules_2568.length
    };
}

console.log('[SchedulesMock] Complete data loaded:', getScheduleStats());