/**
 * Enhanced Teachers Mock Data
 * Part 1: Teachers 2567 (Current Year)
 * Multi-Year System with Teacher Evolution
 */

// Teachers 2567 (Current Year - 10 คน)
const teachers_2567 = [
    // วิทยาศาสตร์ - 3 คน
    {
        id: 1,
        name: 'นายวิทย์ ศาสตร์วิทยา',
        email: 'wit.science@school.ac.th',
        phone: '081-111-1001',
        subject_group: 'วิทยาศาสตร์',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 2,
        name: 'นางสาวเคมี โมเลกุล',
        email: 'chemistry@school.ac.th',
        phone: '081-111-1002',
        subject_group: 'วิทยาศาสตร์',
        role: 'admin',
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 3,
        name: 'นายชีววิทยา เซลล์',
        email: 'biology@school.ac.th',
        phone: '081-111-1003',
        subject_group: 'วิทยาศาสตร์',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // คณิตศาสตร์ - 3 คน
    {
        id: 4,
        name: 'นายคณิต สมการ',
        email: 'math.equation@school.ac.th',
        phone: '081-222-2001',
        subject_group: 'คณิตศาสตร์',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 5,
        name: 'นางสาวเรขา คณิต',
        email: 'geometry@school.ac.th',
        phone: '081-222-2002',
        subject_group: 'คณิตศาสตร์',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 6,
        name: 'นายพีชคณิต เบส',
        email: 'algebra@school.ac.th',
        phone: '081-222-2003',
        subject_group: 'คณิตศาสตร์',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // ภาษาไทย - 2 คน
    {
        id: 7,
        name: 'นางสาวไทย ภาษา',
        email: 'thai.lang@school.ac.th',
        phone: '081-333-3001',
        subject_group: 'ภาษาไทย',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 8,
        name: 'นายวรรณกรรม การเขียน',
        email: 'literature@school.ac.th',
        phone: '081-333-3002',
        subject_group: 'ภาษาไทย',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // ภาษาอังกฤษ - 1 คน
    {
        id: 9,
        name: 'Miss English Grammar',
        email: 'english@school.ac.th',
        phone: '081-444-4001',
        subject_group: 'ภาษาอังกฤษ',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // สังคมศึกษา - 1 คน
    {
        id: 10,
        name: 'นายสังคม ประวัติศาสตร์',
        email: 'history@school.ac.th',
        phone: '081-555-5001',
        subject_group: 'สังคมศึกษา',
        role: 'teacher',
        created_at: '2024-05-01T00:00:00.000Z'
    }
];

// Teachers 2566 (Previous Year - 8 คน)
const teachers_2566 = [
    // วิทยาศาสตร์ - 2 คน (น้อยกว่า)
    {
        id: 1,
        name: 'นายวิทย์ ศาสตร์วิทยา',
        email: 'wit.science@school.ac.th',
        phone: '081-111-1001',
        subject_group: 'วิทยาศาสตร์',
        role: 'teacher',
        created_at: '2023-05-01T00:00:00.000Z'
    },
    {
        id: 2,
        name: 'นางสาวเคมี โมเลกุล',
        email: 'chemistry@school.ac.th',
        phone: '081-111-1002',
        subject_group: 'วิทยาศาสตร์',
        role: 'teacher', // ยังไม่เป็น admin
        created_at: '2023-05-01T00:00:00.000Z'
    },

    // คณิตศาสตร์ - 2 คน
    {
        id: 3,
        name: 'นายคณิต สมการ',
        email: 'math.equation@school.ac.th',
        phone: '081-222-2001',
        subject_group: 'คณิตศาสตร์',
        role: 'teacher',
        created_at: '2023-05-01T00:00:00.000Z'
    },
    {
        id: 4,
        name: 'นางสาวเรขา คณิต',
        email: 'geometry@school.ac.th',
        phone: '081-222-2002',
        subject_group: 'คณิตศาสตร์',
        role: 'teacher',
        created_at: '2023-05-01T00:00:00.000Z'
    },

    // ภาษาไทย - 2 คน
    {
        id: 5,
        name: 'นางสาวไทย ภาษา',
        email: 'thai.lang@school.ac.th',
        phone: '081-333-3001',
        subject_group: 'ภาษาไทย',
        role: 'teacher',
        created_at: '2023-05-01T00:00:00.000Z'
    },
    {
        id: 6,
        name: 'นายวรรณกรรม การเขียน',
        email: 'literature@school.ac.th',
        phone: '081-333-3002',
        subject_group: 'ภาษาไทย',
        role: 'teacher',
        created_at: '2023-05-01T00:00:00.000Z'
    },

    // ภาษาอังกฤษ - 1 คน
    {
        id: 7,
        name: 'Miss English Grammar',
        email: 'english@school.ac.th',
        phone: '081-444-4001',
        subject_group: 'ภาษาอังกฤษ',
        role: 'teacher',
        created_at: '2023-05-01T00:00:00.000Z'
    },

    // สังคมศึกษา - 1 คน
    {
        id: 8,
        name: 'นายสังคม ประวัติศาสตร์',
        email: 'history@school.ac.th',
        phone: '081-555-5001',
        subject_group: 'สังคมศึกษา',
        role: 'teacher',
        created_at: '2023-05-01T00:00:00.000Z'
    }
];

// Teachers 2568 (Future Planning - 8 คน)
const teachers_2568 = [
    // วิทยาศาสตร์ - 4 คน (ครูใหม่เข้ามา)
    {
        id: 1,
        name: 'นายวิทย์ ศาสตร์วิทยา',
        email: 'wit.science@school.ac.th',
        phone: '081-111-1001',
        subject_group: 'วิทยาศาสตร์',
        role: 'teacher',
        created_at: '2025-05-01T00:00:00.000Z'
    },
    {
        id: 2,
        name: 'นางสาวเคมี โมเลกุล',
        email: 'chemistry@school.ac.th',
        phone: '081-111-1002',
        subject_group: 'วิทยาศาสตร์',
        role: 'admin',
        created_at: '2025-05-01T00:00:00.000Z'
    },
    {
        id: 3,
        name: 'นายชีววิทยา เซลล์',
        email: 'biology@school.ac.th',
        phone: '081-111-1003',
        subject_group: 'วิทยาศาสตร์',
        role: 'teacher',
        created_at: '2025-05-01T00:00:00.000Z'
    },
    {
        id: 4,
        name: 'นางสาวฟิสิกส์ ควอนตัม', // ครูใหม่
        email: 'physics.new@school.ac.th',
        phone: '081-111-1005',
        subject_group: 'วิทยาศาสตร์',
        role: 'teacher',
        created_at: '2025-05-01T00:00:00.000Z'
    },

    // คณิตศาสตร์ - 2 คน (ลดลง)
    {
        id: 5,
        name: 'นายคณิต สมการ',
        email: 'math.equation@school.ac.th',
        phone: '081-222-2001',
        subject_group: 'คณิตศาสตร์',
        role: 'admin', // เลื่อนเป็น admin
        created_at: '2025-05-01T00:00:00.000Z'
    },
    {
        id: 6,
        name: 'นางสาวเรขา คณิต',
        email: 'geometry@school.ac.th',
        phone: '081-222-2002',
        subject_group: 'คณิตศาสตร์',
        role: 'teacher',
        created_at: '2025-05-01T00:00:00.000Z'
    },

    // ภาษาไทย - 1 คน (ลดลง)
    {
        id: 7,
        name: 'นางสาวไทย ภาษา',
        email: 'thai.lang@school.ac.th',
        phone: '081-333-3001',
        subject_group: 'ภาษาไทย',
        role: 'teacher',
        created_at: '2025-05-01T00:00:00.000Z'
    },

    // ภาษาอังกฤษ - 1 คน (เหมือนเดิม)
    {
        id: 8,
        name: 'Miss English Grammar',
        email: 'english@school.ac.th',
        phone: '081-444-4001',
        subject_group: 'ภาษาอังกฤษ',
        role: 'teacher',
        created_at: '2025-05-01T00:00:00.000Z'
    }
];

// Teacher utility functions
export const TeacherUtils = {
    getTeachersByYear(year) {
        const yearData = {
            2566: teachers_2566,
            2567: teachers_2567,
            2568: teachers_2568
        };
        return yearData[year] || [];
    },

    findTeacherByName(name, year = 2567) {
        const teachers = this.getTeachersByYear(year);
        return teachers.find(t => t.name.includes(name));
    }
};

// Export for backward compatibility
export const teachersData = [...teachers_2567];
export const getTeachersByYear = TeacherUtils.getTeachersByYear;
export const findTeacherByName = TeacherUtils.findTeacherByName;
export { teachers_2567, teachers_2566, teachers_2568 };

// Export default
export default {
    data: teachersData,
    utils: TeacherUtils
};
