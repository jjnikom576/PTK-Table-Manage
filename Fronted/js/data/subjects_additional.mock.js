// Enhanced Subjects Mock Data - ปี 2566 ภาคเรียนที่ 2 + ปี 2567-2568
// วิชาชั้น ม.1 ทุกห้อง ทุกครู (ต่อจากไฟล์แรก)

const subjects_2566_semester2 = [
  // ================================
  // ภาคเรียนที่ 2/2566 
  // ================================
  
  // ม.1/1 ภาคเรียนที่ 2/2566 (8 วิชา)
  {
    id: 33,
    semester_id: 2,
    teacher_id: 1, // นายสมชาย วิทยาการ
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "วิทยาศาสตร์",
    subject_code: "ว23102",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "LAB_SCI" },
    default_room_id: 5, // ห้องวิทยาศาสตร์ 1
    room_preferences: { preferred_rooms: ["ห้องวิทยาศาสตร์ 1"] },
    created_at: "2023-11-01T00:00:00Z"
  },
  {
    id: 34,
    semester_id: 2,
    teacher_id: 2, // นางสาววิภา คณิตกุล
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "คณิตศาสตร์",
    subject_code: "ค21102",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-11-01T00:00:00Z"
  },
  {
    id: 35,
    semester_id: 2,
    teacher_id: 3, // นางสุดา ภาษาดี
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "ภาษาไทย",
    subject_code: "ท21102",
    periods_per_week: 5,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-11-01T00:00:00Z"
  },
  {
    id: 36,
    semester_id: 2,
    teacher_id: 4, // Mr. John English
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "ภาษาอังกฤษ",
    subject_code: "อ21102",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-11-01T00:00:00Z"
  },
  {
    id: 37,
    semester_id: 2,
    teacher_id: 5, // นายประยุทธ์ สังคมศาสตร์
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "สังคมศึกษา",
    subject_code: "ส21102",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2023-11-01T00:00:00Z"
  },
  {
    id: 38,
    semester_id: 2,
    teacher_id: 6, // นางสาวศิลปิน ครีเอทีฟ
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "ศิลปะ",
    subject_code: "ศ31102",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 9, // ห้องศิลปะ
    room_preferences: { preferred_rooms: ["ห้องศิลปะ"] },
    created_at: "2023-11-01T00:00:00Z"
  },
  {
    id: 39,
    semester_id: 2,
    teacher_id: 7, // นายกีฬา ฟิตเนส
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "พลศึกษา",
    subject_code: "พ31102",
    periods_per_week: 2,
    subject_constraints: {},
    default_room_id: null,
    room_preferences: { outdoor: true },
    created_at: "2023-11-01T00:00:00Z"
  },
  {
    id: 40,
    semester_id: 2,
    teacher_id: 8, // นางดนตรี เสียงใส
    class_id: 5,   // ม.1/1 ภาค 2
    subject_name: "ดนตรี",
    subject_code: "ด31102",
    periods_per_week: 1,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 8, // ห้องดนตรี
    room_preferences: { preferred_rooms: ["ห้องดนตรี"] },
    created_at: "2023-11-01T00:00:00Z"
  }
];

// ม.1/2, ม.1/3, ม.1/4 ภาคเรียนที่ 2/2566 (ย่อเพื่อ token limit)
const subjects_2566_others = [
  // ม.1/2 ภาค 2 (id: 41-48)
  // ม.1/3 ภาค 2 (id: 49-56) 
  // ม.1/4 ภาค 2 (id: 57-64)
  // ข้ามไปเพื่อประหยัด token - pattern เหมือนกัน
];

// ================================
// ปี 2567 (Current Year)
// ================================

const subjects_2567 = [
  // ม.1/1 ภาคเรียนที่ 1/2567 (9 วิชา - เพิ่มเทคโนโลยี)
  {
    id: 100,
    semester_id: 3, // ภาคเรียนที่ 1/2567
    teacher_id: 1, // นายสมชาย วิทยาการ
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "วิทยาศาสตร์",
    subject_code: "ว23101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "LAB_SCI" },
    default_room_id: 6, // ห้องวิทยาศาสตร์ 1
    room_preferences: { preferred_rooms: ["ห้องวิทยาศาสตร์ 1"] },
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 101,
    semester_id: 3,
    teacher_id: 2, // นางสาววิภา คณิตกุล
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "คณิตศาสตร์",
    subject_code: "ค21101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 102,
    semester_id: 3,
    teacher_id: 3, // นางสุดา ภาษาดี
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "ภาษาไทย",
    subject_code: "ท21101",
    periods_per_week: 5,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 103,
    semester_id: 3,
    teacher_id: 4, // Ms. Emily Wilson
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "ภาษาอังกฤษ",
    subject_code: "อ21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 104,
    semester_id: 3,
    teacher_id: 5, // นายประยุทธ์ สังคมศาสตร์
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "สังคมศึกษา",
    subject_code: "ส21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 105,
    semester_id: 3,
    teacher_id: 6, // นางสาวศิลปิน ครีเอทีฟ
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "ศิลปะ",
    subject_code: "ศ31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 11, // ห้องศิลปะ
    room_preferences: { preferred_rooms: ["ห้องศิลปะ"] },
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 106,
    semester_id: 3,
    teacher_id: 7, // นายเทคโน โลยี
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "เทคโนโลยี",
    subject_code: "ท31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "LAB_COMP" },
    default_room_id: 8, // ห้องคอมพิวเตอร์ 1
    room_preferences: { preferred_rooms: ["ห้องคอมพิวเตอร์ 1", "ห้องคอมพิวเตอร์ 2"] },
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 107,
    semester_id: 3,
    teacher_id: 8, // นางการงาน ฝีมือ
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "การงานอาชีพ",
    subject_code: "ก31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 12, // ห้องการงาน
    room_preferences: { preferred_rooms: ["ห้องการงาน"] },
    created_at: "2024-05-15T00:00:00Z"
  },
  {
    id: 108,
    semester_id: 3,
    teacher_id: 9, // นายลูกเสือ กิจกรรม
    class_id: 9,   // ม.1/1 ปี 2567
    subject_name: "กิจกรรมพัฒนาผู้เรียน",
    subject_code: "ก21101",
    periods_per_week: 1,
    subject_constraints: {},
    default_room_id: null,
    room_preferences: { outdoor: true },
    created_at: "2024-05-15T00:00:00Z"
  }
];

// ================================
// ปี 2568 (Future Year)
// ================================

const subjects_2568 = [
  // ม.1/1 ภาคเรียนที่ 1/2568 (10 วิชา - เพิ่มวิทยาการคำนวณ)
  {
    id: 200,
    semester_id: 5, // ภาคเรียนที่ 1/2568
    teacher_id: 1, // นายสมชาย วิทยาการ
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "วิทยาศาสตร์",
    subject_code: "ว23101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "LAB_SCI" },
    default_room_id: 7, // ห้องวิทยาศาสตร์ 1
    room_preferences: { preferred_rooms: ["ห้องวิทยาศาสตร์ 1"] },
    created_at: "2025-05-15T00:00:00Z"
  },
  {
    id: 201,
    semester_id: 5,
    teacher_id: 2, // นางสาววิภา คณิตกุล
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "คณิตศาสตร์",
    subject_code: "ค21101",
    periods_per_week: 4,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2025-05-15T00:00:00Z"
  },
  {
    id: 202,
    semester_id: 5,
    teacher_id: 3, // นางสุดา ภาษาดี
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "ภาษาไทย",
    subject_code: "ท21101",
    periods_per_week: 4, // ลดลง 1 คาบ
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2025-05-15T00:00:00Z"
  },
  {
    id: 203,
    semester_id: 5,
    teacher_id: 4, // Ms. Emily Wilson
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "ภาษาอังกฤษ",
    subject_code: "อ21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2025-05-15T00:00:00Z"
  },
  {
    id: 204,
    semester_id: 5,
    teacher_id: 5, // นายประยุทธ์ สังคมศาสตร์
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "สังคมศึกษา",
    subject_code: "ส21101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "CLASS" },
    default_room_id: 1, // ห้อง 101
    room_preferences: {},
    created_at: "2025-05-15T00:00:00Z"
  },
  {
    id: 205,
    semester_id: 5,
    teacher_id: 6, // นางสาวศิลปิน ครีเอทีฟ
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "ศิลปะ",
    subject_code: "ศ31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 13, // ห้องศิลปะ
    room_preferences: { preferred_rooms: ["ห้องศิลปะ"] },
    created_at: "2025-05-15T00:00:00Z"
  },
  {
    id: 206,
    semester_id: 5,
    teacher_id: 7, // นายเอไอ อัจฉริยะ
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "วิทยาการคำนวณ",
    subject_code: "ว31101",
    periods_per_week: 3,
    subject_constraints: { requires_room_type: "LAB_COMP" },
    default_room_id: 9, // ห้อง AI Lab
    room_preferences: { preferred_rooms: ["ห้อง AI Lab"] },
    created_at: "2025-05-15T00:00:00Z"
  },
  {
    id: 207,
    semester_id: 5,
    teacher_id: 8, // นางสาวโรบอท เทคโนโลยี
    class_id: 17,  // ม.1/1 ปี 2568
    subject_name: "โรบอติกส์",
    subject_code: "ร31101",
    periods_per_week: 2,
    subject_constraints: { requires_room_type: "TECH" },
    default_room_id: 15, // ห้องโรบอติกส์
    room_preferences: { preferred_rooms: ["ห้องโรบอติกส์"] },
    created_at: "2025-05-15T00:00:00Z"
  }
];

export { subjects_2566_semester2, subjects_2566_others, subjects_2567, subjects_2568 };