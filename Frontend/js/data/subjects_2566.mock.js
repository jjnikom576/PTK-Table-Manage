// Enhanced Subjects Mock Data - ปี 2566 เต็ม
// วิชาชั้น ม.1 ทุกห้อง ทุกครู ภาค 1-2

export const subjects_2566 = [
  // ================================
  // ภาคเรียนที่ 1/2566 
  // ================================
  
  // ม.1/1 ภาคเรียนที่ 1/2566 (8 วิชา)
  {
    id: 1,
    semester_id: 1,
    teacher_id: 1, // นายสมชาย วิทยาการ
    class_id: 1,   // ม.1/1
    subject_name: "วิทยาศาสตร์",
    subject_code: "ว23101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "LAB_SCI" },
    default_room_id: 5, // ห้องวิทยาศาสตร์ 1
    room_preferences: { preferred_rooms: ["ห้องวิทยาศาสตร์ 1"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 2,
    semester_id: 1,
    teacher_id: 2, // นางสาววิภา คณิตกุล
    class_id: 1,   // ม.1/1
    subject_name: "คณิตศาสตร์",
    subject_code: "ค21101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 3,
    semester_id: 1,
    teacher_id: 3, // นางสุดา ภาษาดี
    class_id: 1,   // ม.1/1
    subject_name: "ภาษาไทย",
    subject_code: "ท21101",
    periods_per_week: 5,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 4,
    semester_id: 1,
    teacher_id: 4, // Mr. John English
    class_id: 1,   // ม.1/1
    subject_name: "ภาษาอังกฤษ",
    subject_code: "อ21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 5,
    semester_id: 1,
    teacher_id: 5, // นายประยุทธ์ สังคมศาสตร์
    class_id: 1,   // ม.1/1
    subject_name: "สังคมศึกษา",
    subject_code: "ส21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 6,
    semester_id: 1,
    teacher_id: 6, // นางสาวศิลปิน ครีเอทีฟ
    class_id: 1,   // ม.1/1
    subject_name: "ศิลปะ",
    subject_code: "ศ31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 9, // ห้องศิลปะ
    room_preferences: { preferred_rooms: ["ห้องศิลปะ"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 7,
    semester_id: 1,
    teacher_id: 7, // นายกีฬา ฟิตเนส
    class_id: 1,   // ม.1/1
    subject_name: "พลศึกษา",
    subject_code: "พ31101",
    periods_per_week: 2,
    subject_constraints: {},
    default_room_id: null, // สนามกีฬา
    room_preferences: { outdoor: true },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 8,
    semester_id: 1,
    teacher_id: 8, // นางดนตรี เสียงใส
    class_id: 1,   // ม.1/1
    subject_name: "ดนตรี",
    subject_code: "ด31101",
    periods_per_week: 1,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 8, // ห้องดนตรี
    room_preferences: { preferred_rooms: ["ห้องดนตรี"] },
    created_at: "2023-05-15T00:00:00Z"
  },

  // ม.1/2 ภาคเรียนที่ 1/2566 (8 วิชา)
  {
    id: 9,
    semester_id: 1,
    teacher_id: 1, // นายสมชาย วิทยาการ
    class_id: 2,   // ม.1/2
    subject_name: "วิทยาศาสตร์",
    subject_code: "ว23101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "LAB_SCI" },
    default_room_id: 6, // ห้องวิทยาศาสตร์ 2
    room_preferences: { preferred_rooms: ["ห้องวิทยาศาสตร์ 2"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 10,
    semester_id: 1,
    teacher_id: 2, // นางสาววิภา คณิตกุล
    class_id: 2,   // ม.1/2
    subject_name: "คณิตศาสตร์",
    subject_code: "ค21101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 2, // ห้อง 102
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 11,
    semester_id: 1,
    teacher_id: 3, // นางสุดา ภาษาดี
    class_id: 2,   // ม.1/2
    subject_name: "ภาษาไทย",
    subject_code: "ท21101",
    periods_per_week: 5,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 2, // ห้อง 102
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 12,
    semester_id: 1,
    teacher_id: 4, // Mr. John English
    class_id: 2,   // ม.1/2
    subject_name: "ภาษาอังกฤษ",
    subject_code: "อ21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 2, // ห้อง 102
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 13,
    semester_id: 1,
    teacher_id: 5, // นายประยุทธ์ สังคมศาสตร์
    class_id: 2,   // ม.1/2
    subject_name: "สังคมศึกษา",
    subject_code: "ส21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 2, // ห้อง 102
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 14,
    semester_id: 1,
    teacher_id: 6, // นางสาวศิลปิน ครีเอทีฟ
    class_id: 2,   // ม.1/2
    subject_name: "ศิลปะ",
    subject_code: "ศ31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 9, // ห้องศิลปะ
    room_preferences: { preferred_rooms: ["ห้องศิลปะ"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 15,
    semester_id: 1,
    teacher_id: 7, // นายกีฬา ฟิตเนส
    class_id: 2,   // ม.1/2
    subject_name: "พลศึกษา",
    subject_code: "พ31101",
    periods_per_week: 2,
    subject_constraints: {},
    default_room_id: null,
    room_preferences: { outdoor: true },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 16,
    semester_id: 1,
    teacher_id: 8, // นางดนตรี เสียงใส
    class_id: 2,   // ม.1/2
    subject_name: "ดนตรี",
    subject_code: "ด31101",
    periods_per_week: 1,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 8, // ห้องดนตรี
    room_preferences: { preferred_rooms: ["ห้องดนตรี"] },
    created_at: "2023-05-15T00:00:00Z"
  },

  // ม.1/3 ภาคเรียนที่ 1/2566 (8 วิชา)
  {
    id: 17,
    semester_id: 1,
    teacher_id: 1, // นายสมชาย วิทยาการ
    class_id: 3,   // ม.1/3
    subject_name: "วิทยาศาสตร์",
    subject_code: "ว23101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "LAB_SCI" },
    default_room_id: 5, // ห้องวิทยาศาสตร์ 1
    room_preferences: { preferred_rooms: ["ห้องวิทยาศาสตร์ 1", "ห้องวิทยาศาสตร์ 2"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 18,
    semester_id: 1,
    teacher_id: 2, // นางสาววิภา คณิตกุล
    class_id: 3,   // ม.1/3
    subject_name: "คณิตศาสตร์",
    subject_code: "ค21101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 3, // ห้อง 103
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 19,
    semester_id: 1,
    teacher_id: 3, // นางสุดา ภาษาดี
    class_id: 3,   // ม.1/3
    subject_name: "ภาษาไทย",
    subject_code: "ท21101",
    periods_per_week: 5,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 3, // ห้อง 103
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 20,
    semester_id: 1,
    teacher_id: 4, // Mr. John English
    class_id: 3,   // ม.1/3
    subject_name: "ภาษาอังกฤษ",
    subject_code: "อ21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 3, // ห้อง 103
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 21,
    semester_id: 1,
    teacher_id: 5, // นายประยุทธ์ สังคมศาสตร์
    class_id: 3,   // ม.1/3
    subject_name: "สังคมศึกษา",
    subject_code: "ส21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 3, // ห้อง 103
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 22,
    semester_id: 1,
    teacher_id: 6, // นางสาวศิลปิน ครีเอทีฟ
    class_id: 3,   // ม.1/3
    subject_name: "ศิลปะ",
    subject_code: "ศ31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 9, // ห้องศิลปะ
    room_preferences: { preferred_rooms: ["ห้องศิลปะ"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 23,
    semester_id: 1,
    teacher_id: 7, // นายกีฬา ฟิตเนส
    class_id: 3,   // ม.1/3
    subject_name: "พลศึกษา",
    subject_code: "พ31101",
    periods_per_week: 2,
    subject_constraints: {},
    default_room_id: null,
    room_preferences: { outdoor: true },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 24,
    semester_id: 1,
    teacher_id: 8, // นางดนตรี เสียงใส
    class_id: 3,   // ม.1/3
    subject_name: "ดนตรี",
    subject_code: "ด31101",
    periods_per_week: 1,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 8, // ห้องดนตรี
    room_preferences: { preferred_rooms: ["ห้องดนตรี"] },
    created_at: "2023-05-15T00:00:00Z"
  },

  // ม.1/4 ภาคเรียนที่ 1/2566 (8 วิชา)
  {
    id: 25,
    semester_id: 1,
    teacher_id: 1, // นายสมชาย วิทยาการ
    class_id: 4,   // ม.1/4
    subject_name: "วิทยาศาสตร์",
    subject_code: "ว23101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "LAB_SCI" },
    default_room_id: 6, // ห้องวิทยาศาสตร์ 2
    room_preferences: { preferred_rooms: ["ห้องวิทยาศาสตร์ 2"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 26,
    semester_id: 1,
    teacher_id: 2, // นางสาววิภา คณิตกุล
    class_id: 4,   // ม.1/4
    subject_name: "คณิตศาสตร์",
    subject_code: "ค21101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 4, // ห้อง 104
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 27,
    semester_id: 1,
    teacher_id: 3, // นางสุดา ภาษาดี
    class_id: 4,   // ม.1/4
    subject_name: "ภาษาไทย",
    subject_code: "ท21101",
    periods_per_week: 5,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 4, // ห้อง 104
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 28,
    semester_id: 1,
    teacher_id: 4, // Mr. John English
    class_id: 4,   // ม.1/4
    subject_name: "ภาษาอังกฤษ",
    subject_code: "อ21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 4, // ห้อง 104
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 29,
    semester_id: 1,
    teacher_id: 5, // นายประยุทธ์ สังคมศาสตร์
    class_id: 4,   // ม.1/4
    subject_name: "สังคมศึกษา",
    subject_code: "ส21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 4, // ห้อง 104
    room_preferences: {},
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 30,
    semester_id: 1,
    teacher_id: 6, // นางสาวศิลปิน ครีเอทีฟ
    class_id: 4,   // ม.1/4
    subject_name: "ศิลปะ",
    subject_code: "ศ31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 9, // ห้องศิลปะ
    room_preferences: { preferred_rooms: ["ห้องศิลปะ"] },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 31,
    semester_id: 1,
    teacher_id: 7, // นายกีฬา ฟิตเนส
    class_id: 4,   // ม.1/4
    subject_name: "พลศึกษา",
    subject_code: "พ31101",
    periods_per_week: 2,
    subject_constraints: {},
    default_room_id: null,
    room_preferences: { outdoor: true },
    created_at: "2023-05-15T00:00:00Z"
  },
  {
    id: 32,
    semester_id: 1,
    teacher_id: 8, // นางดนตรี เสียงใส
    class_id: 4,   // ม.1/4
    subject_name: "ดนตรี",
    subject_code: "ด31101",
    periods_per_week: 1,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 8, // ห้องดนตรี
    room_preferences: { preferred_rooms: ["ห้องดนตรี"] },
    created_at: "2023-05-15T00:00:00Z"
  }
];

export default subjects_2566;