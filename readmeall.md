# 🏫 School Schedule Management System - Complete Project Overview

**สถานะโปรเจค: Production Ready ✅ กำลังปรับปรุงต่อยอด**

## 📋 สารบัญ
1. [ภาพรวมโปรเจค](#ภาพรวมโปรเจค)
2. [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
3. [คุณสมบัติหลัก](#คุณสมบัติหลัก)
4. [โครงสร้างไฟล์](#โครงสร้างไฟล์)
5. [การติดตั้งและเริ่มใช้งาน](#การติดตั้งและเริ่มใช้งาน)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Frontend Features](#frontend-features)
9. [ประวัติการพัฒนา](#ประวัติการพัฒนา)
10. [การพัฒนาต่อไป](#การพัฒนาต่อไป)

---

## ภาพรวมโปรเจค

ระบบจัดการตารางเรียน-ตารางสอนสำหรับโรงเรียนมัธยมศึกษา ที่รองรับการจัดการข้อมูลแบบหลายปีการศึกษาพร้อมระบบ Admin Panel ที่ครบครัน

### 🎯 วัตถุประสงค์
- จัดการตารางเรียน/ตารางสอนอัตโนมัติ
- รองรับหลายปีการศึกษาในฐานข้อมูลเดียว  
- ระบบ Admin Panel สำหรับจัดการข้อมูลครู นักเรียน ห้องเรียน
- การตรวจสอบความขัดแย้งในตารางเรียน
- ระบบส่งออกข้อมูล (CSV, Excel, Google Sheets)

### 👥 ผู้ใช้งานเป้าหมาย
- **นักเรียน**: ดูตารางเรียนตามชั้นเรียน
- **ครู**: ดูตารางสอน ภาระงาน และสถิติ
- **ผู้ดูแลระบบ**: จัดการข้อมูลและสร้างตารางเรียน

---

## สถาปัตยกรรมระบบ

### 🔧 Technology Stack

#### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js with TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Session-based + SHA-256 hashing
- **API**: RESTful with OpenAPI documentation

#### Frontend  
- **Framework**: Vanilla JavaScript ES6 Modules
- **Architecture**: Single Page Application (SPA)
- **UI**: Responsive design with modern CSS
- **State Management**: Global context pattern
- **API Integration**: Fetch-based with caching

### 🏗️ Database Architecture

#### 🔒 Core Tables (Fixed)
```sql
admin_users          -- ผู้ดูแลระบบ
admin_sessions       -- Session management  
admin_activity_log   -- Activity tracking
academic_years       -- ปีการศึกษา
semesters           -- ภาคเรียน (Global)
periods             -- คาบเรียน
```

#### 🔄 Dynamic Tables (Per Academic Year)
```sql
teachers_{YEAR}      -- ครู (เช่น teachers_2567)
classes_{YEAR}       -- ชั้นเรียน  
rooms_{YEAR}         -- ห้องเรียน
subjects_{YEAR}      -- วิชาเรียน
schedules_{YEAR}     -- ตารางเรียน
```

**Key Features:**
- Auto table creation on first data entry
- Year-based data isolation  
- Global context management (1 active year + 1 active semester)
- Complete indexing for performance (15+ indexes per table)

---

## คุณสมบัติหลัก

### ✅ Features พร้อมใช้งาน

#### 🔐 Authentication System
- Admin login/logout with session management
- Password hashing (SHA-256)
- Activity logging สำหรับ audit trail
- Role-based access control

#### 📊 Data Management
- **Teachers**: จัดการข้อมูลครู สาขาวิชา บทบาท
- **Classes**: จัดการชั้นเรียน (ม.1/1, ม.2/3 etc.)
- **Rooms**: จัดการห้องเรียน ประเภทห้อง  
- **Subjects**: จัดการวิชาเรียน มอบหมายครู + หลายชั้นเรียน พร้อม default room / คาบต่อสัปดาห์
- **Schedules**: สร้างตารางเรียน พร้อม conflict detection

#### 🤖 Schedule Builder
- Conflict detection (teacher, class, room conflicts)
- Manual schedule editing
- Schedule preview and validation

#### 📈 Analytics & Reports  
- Teacher workload analysis
- Subject group statistics
- Schedule utilization reports

#### 📤 Export System
- CSV export
- Excel export  
- Google Sheets integration (planned)

#### 🎨 User Interface
- **Student Schedule Page**: ดูตารางเรียนตามชั้น
- **Teacher Schedule Page**: ดูตารางสอนและภาระงาน  
- **Admin Panel**: ครบครันทุกการจัดการ
- **Responsive Design**: ใช้งานได้ทุกอุปกรณ์

---

## โครงสร้างไฟล์

```
F:\Project\Web\Schedule_System\
├── 📄 readmeall.md                    (ไฟล์นี้)
├── 🔧 backend/school-scheduler-backend/
│   ├── 📁 src/
│   │   ├── 🔒 auth/                   (Authentication)
│   │   ├── 🗃️ database/               (Database management)
│   │   │   ├── database-manager.ts   (Main DB operations)
│   │   │   └── schema-manager.ts     (Table creation/indexing)
│   │   ├── 🛡️ middleware/             (Auth & security middleware)  
│   │   ├── 🛣️ routes/                (API routes)
│   │   │   ├── auth-routes.ts        (Login/logout/users)
│   │   │   ├── core-routes.ts        (Years/semesters/context)
│   │   │   └── schedule-routes.ts    (Teachers/classes/schedules)
│   │   ├── 📐 interfaces.ts          (TypeScript interfaces)
│   │   └── 🚀 index.ts               (Main server)
│   ├── 📋 package.json
│   ├── ⚙️ wrangler.toml              (Cloudflare config)
│   └── 📚 README.md
├── 🎨 frontend/
│   ├── 📄 index.html                  (Main SPA)
│   ├── 📁 js/
│   │   ├── 🔌 api/                   (API integration layer)
│   │   │   ├── core/api-manager.js   (Base API manager)
│   │   │   ├── auth-api.js          (Authentication API)
│   │   │   ├── core-api.js          (Years/semesters API)
│   │   │   └── schedule-api.js      (Teachers/schedules API)
│   │   ├── 📱 pages/                 (Page components)
│   │   │   ├── admin.js             (Admin panel - MAIN)
│   │   │   ├── studentSchedule.js   (Student schedule view)
│   │   │   └── teacherSchedule.js   (Teacher schedule view)
│   │   ├── 🔄 context/               (Global state management)
│   │   │   └── globalContext.js     (Active year/semester context)
│   │   ├── 🎯 utils/                 (Utilities)
│   │   └── 🏗️ app.js                 (Main app bootstrap)
│   ├── 🎨 css/                       (Styling)
│   ├── 📋 templates/                 (HTML templates)
│   └── 📚 README.md
└── 🗂️ docs/                          (Documentation - planned)
```

---

## การติดตั้งและเริ่มใช้งาน

### 🚀 Quick Start

#### 1. Backend Setup
```bash
cd backend/school-scheduler-backend
npm install
npm run dev
# Server: http://localhost:8787
```

#### 2. Frontend Setup  
```bash
cd frontend
# ใช้ VS Code Live Server หรือ
python -m http.server 8000
# Frontend: http://localhost:8000
```

#### 3. Database Initialization
```bash
curl -X POST http://localhost:8787/api/setup
```

### 🔑 Default Credentials
```
Username: admin
Password: admin123
```

### 🌐 Environment Variables
```javascript
// wrangler.toml
[vars]
ADMIN_DEFAULT_PASSWORD = "admin123"
ADMIN_REGISTER_SECRET = "DEV_SCHOOL_2024_REGISTER"  
NODE_ENV = "development"
```

---

## API Documentation

### 🔓 Public Endpoints
```
GET  /                          # API info
GET  /api/health               # Health check
POST /api/setup                # Database init
GET  /api/docs                 # API documentation
GET  /api/core/context         # Current year/semester
GET  /api/core/academic-years  # List years
GET  /api/core/semesters       # List semesters
GET  /api/schedule/timetable   # View timetable
POST /api/auth/login           # Admin login
```

### 🔒 Protected Endpoints (Require Authentication)

#### Authentication
```
POST /api/auth/logout          # Logout
GET  /api/auth/me              # Current user info
POST /api/auth/register-admin  # Create admin (dev only)
```

#### Core Management
```
POST /api/core/academic-years     # Create academic year
PUT  /api/core/academic-years/:id/activate  # Activate year
POST /api/core/semesters          # Create semester  
PUT  /api/core/semesters/:id/activate  # Activate semester
DELETE /api/core/semesters/:id    # Delete semester
```

#### Schedule Management
```
GET|POST /api/schedule/teachers   # Teacher CRUD
GET|POST /api/schedule/classes    # Class CRUD
GET|POST /api/schedule/rooms      # Room CRUD  
GET|POST /api/schedule/subjects   # Subject CRUD
GET|POST /api/schedule/schedules  # Schedule CRUD
GET /api/schedule/conflicts       # Conflict detection
```

### 📝 Request/Response Format
```json
// Success Response
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}

// Error Response  
{
  "success": false,
  "error": "ERROR_TYPE",
  "message": "Human readable error"
}

// Paginated Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50, 
    "total": 100,
    "totalPages": 2
  }
}
```

---

## Database Schema

### Core Tables

#### Academic Years
```sql
CREATE TABLE academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL UNIQUE,           -- 2567, 2568, etc.
  is_active INTEGER DEFAULT 0,            -- Only 1 can be active
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Semesters (Global)
```sql  
CREATE TABLE semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_name TEXT NOT NULL UNIQUE,     -- "ภาคเรียนที่ 1", "ภาคต้น", etc.
  is_active INTEGER DEFAULT 0,            -- Only 1 can be active
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  
);
```

### Dynamic Tables (Per Year)

#### Teachers
```sql
CREATE TABLE teachers_2567 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,           -- Link to global semesters
  title TEXT,                            -- นาย, นาง, นางสาว, Mr., Ms.
  f_name TEXT NOT NULL,                  -- ชื่อ  
  l_name TEXT NOT NULL,                  -- นามสกุล
  full_name TEXT GENERATED ALWAYS AS    -- Auto-generated display name
    (COALESCE(title || ' ', '') || f_name || ' ' || l_name) STORED,
  email TEXT,
  phone TEXT,  
  subject_group TEXT NOT NULL,           -- สาขาวิชา
  role TEXT DEFAULT 'teacher',           -- teacher, head_of_department, etc.
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);
```

#### Classes  
```sql
CREATE TABLE classes_2567 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  grade_level TEXT NOT NULL,             -- ม.1, ม.2, ม.3, etc.
  section INTEGER NOT NULL,              -- 1, 2, 3, etc.
  class_name TEXT GENERATED ALWAYS AS   -- Auto: "ม.1/1", "ม.2/3"
    (grade_level || '/' || section) STORED,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE (semester_id, grade_level, section)
);
```

#### Schedules
```sql
CREATE TABLE schedules_2567 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,           -- FK to subjects_2567
  day_of_week INTEGER NOT NULL          -- 1=Monday, 7=Sunday
    CHECK (day_of_week BETWEEN 1 AND 7),
  period_no INTEGER NOT NULL,           -- FK to periods table  
  room_id INTEGER,                      -- FK to rooms_2567 (optional)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects_2567(id) ON DELETE CASCADE,
  FOREIGN KEY (period_no) REFERENCES periods(period_no) ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES rooms_2567(id) ON DELETE SET NULL,
  UNIQUE (semester_id, day_of_week, period_no, room_id)  -- Prevent room conflicts
);
```

---

## Frontend Features

### 🎨 User Interface Components

#### Admin Panel (`/js/pages/admin.js`)
**หน้าหลักของระบบ - ครบครันที่สุด**

**Main Tabs:**
1. **📋 เพิ่มข้อมูล** 
   - ⭐ Sub-tabs: Teachers, Classes, Rooms, Subjects, Periods
   - Excel-like data tables with inline editing
   - Bulk operations (select all, delete multiple)
   - Real-time search and filtering
   - Pagination and sorting
   - **Teacher Management**: Full CRUD with title, name, email, subject group
   
2. **🤖 สร้างตารางสอน**
   - AI-powered schedule generation (planned)
   - Manual schedule editing
   - Conflict detection and resolution
   - Schedule preview and validation

3. **🔄 จัดการการสอนแทน** 
   - Teacher absence tracking
   - Substitute teacher assignment
   - Hall of Fame ranking system

4. **📅 จัดการปีการศึกษา**
   - Academic year creation/activation
   - Semester management (global)
   - Context switching (year/semester selection)

#### Student Schedule (`/js/pages/studentSchedule.js`)
- Class selection dropdown
- Weekly timetable view
- Export functionality
- Responsive design

#### Teacher Schedule (`/js/pages/teacherSchedule.js`)  
- **Summary Tab**: Subject group stats, teacher workload ranking
- **Details Tab**: Individual teacher schedules and workload analysis
- Teacher-specific exports

### 🔌 API Integration Layer

#### API Manager (`/js/api/core/api-manager.js`)
- Base API client with session management
- Environment switching (dev/prod)
- Error handling and retry logic
- Request/response logging

#### Schedule API (`/js/api/schedule-api.js`)
- **Caching System**: 3-minute cache with smart invalidation
- **Teachers API**: CRUD operations with proper cache management
- **Classes/Rooms/Subjects API**: Full CRUD support
- **Cache Invalidation**: Pattern-based cache clearing

#### Authentication (`/js/api/auth-api.js`)
- Login/logout management
- Session persistence
- User role verification

### 🎯 State Management

#### Global Context (`/js/context/globalContext.js`)
- Active academic year tracking
- Active semester management  
- Context switching functionality
- Backend synchronization

---

## ประวัติการพัฒนา

### ✅ Phase 1: Backend Foundation (Complete)
- [x] Cloudflare Workers + Hono setup
- [x] D1 Database integration
- [x] Authentication system
- [x] Core API endpoints
- [x] Dynamic table architecture
- [x] Admin user management

### ✅ Phase 2: Data Management (Complete)  
- [x] Teachers CRUD with full validation
- [x] Classes management
- [x] Rooms management
- [x] Subjects management  
- [x] Schedule creation with conflict detection
- [x] Academic year/semester management

### ✅ Phase 3: Frontend Foundation (Complete)
- [x] SPA architecture
- [x] Component-based page system
- [x] Template loading system
- [x] Navigation and routing

### ✅ Phase 4: API Integration (Complete - จบมาแล้ว)
- [x] API Manager with caching
- [x] Authentication integration
- [x] Teachers CRUD integration  
- [x] Cache invalidation fixes ⭐ (แก้ไขล่าสุด)
- [x] Real-time data updates
- [x] Error handling

### ✅ Phase 5: Admin Panel (Complete)
- [x] Complete teacher management UI
- [x] Excel-like data tables
- [x] Bulk operations
- [x] Search and pagination
- [x] Academic year management interface

---

## การพัฒนาต่อไป

### 🔄 Phase 6: Core Completion (Done)
- [x] **Classes Management**: CRUD + pagination/search/resize พร้อม cache invalidation
- [x] **Rooms Management**: CRUD + room type support, bulk actions, modal detail
- [x] **Subjects Management**: Multi-class assignment, modals (ดู/แก้ไข), bulk delete เชื่อม API จริง
- [ ] **Data Validation**: เพิ่มการตรวจสอบข้อมูลที่ครบถ้วน

### 🤖 Phase 7: Advanced Schedule Builder
- [ ] **Manual Schedule Creation**: สร้างตารางเรียนด้วยตัวเอง
- [ ] **Advanced Conflict Detection**: ตรวจสอบความขัดแย้งแบบละเอียด
- [ ] **Schedule Optimization**: ปรับปรุงตารางให้เหมาะสมที่สุด
- [ ] **Drag & Drop Interface**: สร้างตารางแบบลากวาง
- [ ] **Subject Insights**: รายงานโหลดวิชา/ครู เชื่อมกับ analytics dashboard

### 📊 Phase 8: Analytics & Reports  
- [ ] **Teacher Workload Analytics**: วิเคราะห์ภาระงานครู
- [ ] **Room Utilization Reports**: รรายงานการใช้ห้องเรียน
- [ ] **Schedule Efficiency Metrics**: วัดประสิทธิภาพตารางเรียน
- [ ] **Export System Enhancement**: ปรับปรุงการส่งออกข้อมูล

### 🎯 Phase 9: User Experience Enhancement
- [ ] **Responsive Design Improvements**: ปรับปรุงการแสดงผลบนมือถือ
- [ ] **Keyboard Navigation**: เพิ่มการใช้คีย์บอร์ดแทนเมาส์
- [ ] **Accessibility Features**: เพิ่มความสามารถในการเข้าถึง
- [ ] **Dark Mode**: โหมดธีมมืด

### 🔮 Phase 10: Advanced Features (Future)
- [ ] **AI Schedule Generation**: สร้างตารางอัตโนมัติด้วย AI
- [ ] **Substitution Management**: ระบบจัดการครูสอนแทน
- [ ] **Mobile App**: แอพมือถือ
- [ ] **Multi-School Support**: รองรับหลายโรงเรียน

---

## 💡 สำหรับ AI Agents ที่มาต่อ

### 🎯 สิ่งที่ต้องรู้
1. **โปรเจคนี้พร้อมใช้งานแล้ว** - Backend + Frontend + API Integration ครบถ้วน
2. **Admin Panel คือหัวใจหลัก** - `/js/pages/admin.js` มีฟีเจอร์ครบครัน  
3. **Dynamic Database** - Table สร้างตามปีการศึกษา (teachers_2567, teachers_2568)
4. **Cache System** - มีระบบ cache ที่ต้องการ invalidation ที่ถูกต้อง
5. **Authentication** - ใช้ session-based กับ Cloudflare Workers

### 🔧 การทำงานปัจจุบัน
- ✅ **Teachers Management**: ทำงานสมบูรณ์แล้ว (CRUD + UI + API)
- 🔄 **Next Priority**: Classes, Rooms, Subjects Management
- 🎯 **Architecture**: Follow ตัวอย่างจาก Teachers Management

### 🚨 Issues ที่แก้ไขแล้ว
1. **CREATE TABLE SQL Error**: แก้ไขโดยใช้ string concatenation แทน template literals
2. **Title Field Not Updating**: แก้ไข ID conflict และ cache invalidation
3. **Cache Not Clearing**: แก้ไข invalidation pattern ใน schedule-api.js

### 📁 Important Files
```
ไฟล์สำคัญที่ต้องเข้าใจ:
├── admin.js                    # Main UI (2000+ lines)
├── schedule-api.js             # API layer with caching  
├── database-manager.ts         # Backend DB operations
├── schema-manager.ts           # Table creation  
└── schedule-routes.ts          # Backend API routes
```

### 🔮 Next Steps Guidelines
1. **Follow Teachers Pattern**: ใช้รูปแบบเดียวกันกับ Teachers Management
2. **Test Cache Invalidation**: ตรวจสอบ cache clearing หลัง CRUD operations
3. **Use Debug Logs**: เพิ่ม console.log เพื่อ debug issues
4. **Maintain Consistency**: รักษารูปแบบ code และ naming conventions

---

**📞 Contact & Support**  
สำหรับ AI Agents: ดูไฟล์นี้เพื่อเข้าใจโปรเจคครบถ้วน แล้วอ่าน README.md ใน frontend/ และ backend/ สำหรับรายละเอียดเพิ่มเติม

**🎯 Current Status**: Ready for Phase 7 - Advanced Schedule Builder  
**🚀 Next Target**: Manual schedule builder, analytics & conflict detection enhancements

---
*Last Updated: 2025-09-20*  
*Version: 1.0 - Production Ready*
