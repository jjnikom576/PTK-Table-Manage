# ระบบจัดตารางสอนแบบ Multi-Year (Enhanced School Schedule Management System)

## 📋 Project Overview
ระบบจัดการตารางสอนสำหรับโรงเรียนมัธยมศึกษา รองรับการจัดการข้อมูลหลายปีการศึกษา พร้อมระบบ Export ครบครัน และการจัดการห้องเรียน

## ✨ Enhanced Features

### 🗓️ Multi-Year Support
- จัดการปีการศึกษา 2566-2568+
- ภาคเรียน 2-3 ภาคต่อปี พร้อมภาคฤดูร้อน
- Context Switching แบบ Real-time
- Historical Data Analysis และ Cross-year Comparison

### 🏫 Rooms Management System
- **Room Types**: ห้องเรียนทั่วไป (CLASS) และห้องเทคโนโลยี (TECH)
- **Subject Constraints**: วิชาสามารถกำหนดประเภทห้องที่ต้องการ
- **Conflict Detection**: ตรวจสอบการชนกันของ ครู/ชั้นเรียน/ห้อง
- **Room Analytics**: วิเคราะห์การใช้ห้องและประสิทธิภาพ

### 📤 Advanced Export System
- **3 Formats**: CSV (UTF-8+BOM), XLSX, Google Sheets Integration
- **Student Export**: ตารางเรียนรายห้อง พร้อมครู/วิชา/ห้อง
- **Teacher Export**: ตารางสอนรายครู พร้อมภาระงานสรุป
- **Substitution Export**: รายงานการสอนแทน รายวัน/รายเดือน
- **Admin Export**: รายงานระบบครบครัน

### 👨‍🏫 Enhanced Teacher Management
- ตารางสอนรายครู พร้อม Room Information
- วิเคราะห์ภาระงานข้ามปี/ข้ามภาคเรียน
- Hall of Fame ครูสอนแทน (แยกตามภาคเรียน)
- Teacher Evolution Tracking

### ⚙️ Advanced Admin Panel
- **Multi-Year CRUD**: ครู/ห้องเรียน/ห้อง/วิชา/ตาราง
- **Data Migration Tools**: ย้าย/โคลนข้อมูลระหว่างปี
- **AI Schedule Generation**: สร้างตารางอัตโนมัติ (กันชนครบ 3 มิติ)
- **Substitute Algorithm**: แนะนำครูสอนแทนอัตโนมัติ
- **Bulk Operations**: Import/Export จำนวนมาก

## 🏗️ Enhanced Architecture

### Database Schema
**Fixed Tables:**
- `academic_years`: ปีการศึกษา
- `semesters`: ภาคเรียน

**Dynamic Tables (per year):**
- `teachers_{year}`: ครูประจำปี
- `classes_{year}`: ห้องเรียน (กลุ่มนักเรียน)
- `rooms_{year}`: ห้อง (กายภาพ) ⭐️
- `subjects_{year}`: วิชาที่สอน + subject_constraints ⭐️
- `schedules_{year}`: ตารางสอน (เชื่อม class_id + room_id)
- `substitutions_{year}`: การลา
- `substitution_schedules_{year}`: การสอนแทน

### Frontend Structure
```
school-schedule/
├── index.html                     # Multi-year + Export UI
├── css/                          # Enhanced styling
├── js/
│   ├── app.js                   # Main app + Export handlers ⭐️
│   ├── utils/
│   │   └── export.js            # Export utilities ⭐️
│   ├── context/
│   │   └── globalContext.js     # Context + Rooms integration
│   ├── api/
│   │   ├── rooms.js             # Rooms API ⭐️
│   │   └── ...                  # Other APIs
│   ├── data/
│   │   ├── rooms.mock.js        # Rooms mock data ⭐️
│   │   └── ...                  # Other mock data
│   ├── pages/                   # Export-enabled pages ⭐️
│   │   ├── studentSchedule.js   # Student schedules + Export
│   │   ├── teacherSchedule.js   # Teacher schedules + Export
│   │   ├── substitution.js      # Substitution + Hall of Fame
│   │   └── admin.js             # Admin panel + Room management
│   └── services/                # Enhanced services
└── README.md
```

## 🔧 Setup & Usage

### Development:
```bash
# ใช้ Live Server (VS Code) หรือ
python -m http.server 8000
# เปิด http://localhost:8000
```

### Production (Supabase):
```javascript
// js/api/config.js
const API_CONFIG = {
  baseURL: 'https://your-project.supabase.co/rest/v1',
  // ... other config
};
```

## 📊 Export Specifications

### Student Schedule Export
**Columns:** วัน, เวลา, คาบ, วิชา, รหัสวิชา, ครู, ห้องเรียน, ห้อง (ประเภท)

### Teacher Schedule Export
**Columns:** วัน, เวลา, คาบ, วิชา, ห้องเรียน, ห้อง, ภาระงานรวม

### Substitution Export
**Columns:** วันที่, ครูที่ขาด, เหตุผล, คาบ, วิชา, ห้อง, ครูสอนแทน

## 🧪 Testing Checklist

- ✅ Context switching → Load data ตรงปี/ภาคเรียน
- ✅ Rooms → แสดงประเภทและตรวจ conflict
- ✅ Export → ทุกรูปแบบ ภาษาไทยถูกต้อง
- ✅ Subject constraints → ห้องตรงตามที่กำหนด
- ✅ Multi-year comparison → ข้อมูลสอดคล้อง
- ✅ Admin operations → CRUD ครบทุก entity
- ✅ Migration tools → โคลนข้อมูลสำเร็จ
- ✅ Mobile responsive → Export UI ใช้งานได้

## 🚀 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Architecture**: Multi-year context-aware design
- **Export**: CSV/XLSX/Google Sheets integration
- **Database**: Supabase PostgreSQL (production)
- **Development**: Pure frontend, no build process required

## 🔒 Security & Performance

- Year-based data isolation
- Context-aware access control
- Intelligent caching per year/semester
- Lazy loading for historical data
- Memory management for large datasets

## 📈 Future Enhancements

- PDF Export รายงานสวยงาม
- Room Booking System แยกต่างหาก
- Dashboard: Workload heatmaps
- Advanced Analytics: Trend analysis
- Mobile App version

## 🎯 Key Components

### 1. Multi-Year Context System
```javascript
// Global context switching
await globalContext.setContext(2567, 1);
const context = getContext();
```

### 2. Export System
```javascript
// Export any schedule data
await exportTableToCSV(data, filename);
await exportTableToXLSX(data, filename);
await exportTableToGoogleSheets(data, filename);
```

### 3. Room Management
```javascript
// Room with constraints
const subject = {
  subject_constraints: { requires_room_type: 'TECH' }
};
```

### 4. Conflict Detection
```javascript
// 3-dimensional conflict check
const conflict = validateScheduleConflict(newSchedule, existing, {
  subjects, rooms, teachers
});
```

## 📱 Pages Overview

### 🎓 Student Schedule (`/student-schedule`)
- Class-based schedule views
- Room information display
- Export functionality
- Multi-year comparison

### 👨‍🏫 Teacher Schedule (`/teacher-schedule`)
- Workload summary dashboard
- Individual teacher schedules
- Room usage analytics
- Hall of Fame system

### 🔄 Substitution (`/substitution`)
- Hall of Fame rankings
- Daily substitution management
- Export capabilities
- Historical analysis

### ⚙️ Admin Panel (`/admin`)
- Multi-year data management
- Room management system
- AI schedule generation
- Comprehensive exports

## 🏆 Achievement System

### Hall of Fame Features
- Semester-specific rankings
- Teacher substitution tracking
- Achievement badges
- Performance analytics

## 📄 File Structure Details

```
js/
├── app.js                    # Main application controller
├── navigation.js             # URL routing & navigation
├── utils.js                  # Utility functions
├── utils/
│   └── export.js            # Export functionality
├── context/
│   └── globalContext.js     # Global state management
├── services/
│   ├── dataService.js       # Data operations
│   └── yearService.js       # Year management
├── api/                     # API layer
├── data/                    # Mock data
└── pages/                   # Page controllers
    ├── studentSchedule.js   # Student schedule management
    ├── teacherSchedule.js   # Teacher schedule management  
    ├── substitution.js      # Substitution management
    └── admin.js             # Admin panel
```

---

**พัฒนาโดย:** Multi-Year School Schedule System  
**เวอร์ชัน:** 2.0 Enhanced (พร้อม Rooms + Export)  
**อัปเดต:** มกราคม 2025

**🎉 ระบบพร้อมใช้งาน! ครบ 26 Prompts Enhanced**
