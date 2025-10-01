**สถานะ: Production Ready ✅ - ระบบ Backend สมบูรณ์พร้อม Deploy**

## 📋 สารบัญ
1. [ภาพรวม Backend](#ภาพรวม-backend)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Design](#database-design)
5. [API Documentation](#api-documentation)
6. [Authentication System](#authentication-system)
7. [Development Setup](#development-setup)
8. [Deployment Guide](#deployment-guide)
9. [Performance & Security](#performance--security)
10. [Troubleshooting](#troubleshooting)

---

## ภาพรวม Backend

ระบบ Backend ที่ใช้ **Cloudflare Workers** พร้อม **Hono.js Framework** และ **TypeScript** สำหรับการจัดการข้อมูลตารางเรียนแบบหลายปีการศึกษา

### 🎯 Core Features
- **Multi-Year Database**: รองรับหลายปีการศึกษาในฐานข้อมูลเดียว
- **Dynamic Table Creation**: สร้างตารางอัตโนมัติตามปีการศึกษา
- **RESTful API**: API ครบครันสำหรับทุก operations
- **Session Management**: ระบบ authentication ที่ปลอดภัย
- **Real-time Conflict Detection**: ตรวจสอบความขัดแย้งในตารางเรียน
- **Auto-Indexing**: สร้าง database indexes อัตโนมัติเพื่อประสิทธิภาพ

### 🏗️ Key Components
1. **Database Manager**: จัดการ CRUD operations และ dynamic tables
2. **Schema Manager**: สร้างและจัดการ database schema
3. **Authentication System**: Session-based auth พร้อม activity logging
4. **API Routes**: RESTful endpoints ครบครัน
5. **Middleware**: Security, CORS, และ authentication middleware

---

## Technology Stack

### 🔧 Core Technologies
```typescript
// Backend Stack
- Runtime: Cloudflare Workers (Edge Computing)
- Framework: Hono.js v4+ (Fast web framework for edge)
- Language: TypeScript (Type-safe development)
- Database: Cloudflare D1 (Distributed SQLite)
- Authentication: Session-based with SHA-256 hashing
- API: RESTful with OpenAPI documentation
```

### 📦 Dependencies
```json
{
  \"dependencies\": {
    \"hono\": \"^4.0.0\",              // Web framework
    \"@cloudflare/workers-types\": \"^4.0.0\"  // Type definitions
  },
  \"devDependencies\": {
    \"wrangler\": \"^3.0.0\",          // Cloudflare deployment tool
    \"typescript\": \"^5.0.0\",        // TypeScript compiler
    \"@types/node\": \"^20.0.0\"       // Node.js type definitions
  }
}
```

### 🌐 Deployment Platform
- **Cloudflare Workers**: Serverless edge computing
- **Cloudflare D1**: Distributed SQLite database
- **Global Edge Network**: Low latency worldwide
- **Zero Cold Start**: Instant response times

---

## Architecture Overview

### 🏗️ Project Structure

```
backend/school-scheduler-backend/
├── 📁 src/                          # Source Code
│   ├── 🔐 auth/                     # Authentication System
│   │   ├── auth-manager.ts          # Authentication logic
│   │   └── session-manager.ts       # Session management
│   ├── 🗃️ database/                 # Database Layer
│   │   ├── database-manager.ts      # 🎯 Main DB Operations (1000+ lines)
│   │   ├── schema-manager.ts        # Table creation & indexing
│   │   └── migrations/              # Database migrations (future)
│   ├── 🛡️ middleware/               # Middleware Components
│   │   ├── auth-middleware.ts       # Authentication middleware
│   │   ├── cors-middleware.ts       # CORS handling
│   │   └── error-middleware.ts      # Error handling
│   ├── 🛣️ routes/                  # API Routes
│   │   ├── auth-routes.ts           # Authentication endpoints
│   │   ├── core-routes.ts           # Academic years/semesters
│   │   ├── schedule-routes.ts       # 🎯 Main CRUD endpoints
│   │   └── utility-routes.ts        # Health check, setup, docs
│   ├── 🔧 utils/                    # Utility Functions
│   │   ├── validation.ts           # Input validation
│   │   ├── helpers.ts              # Helper functions
│   │   └── constants.ts            # App constants
│   ├── 📐 interfaces.ts             # TypeScript interfaces
│   └── 🚀 index.ts                  # Main server entry point
├── 📋 package.json                  # Dependencies & scripts
├── ⚙️ wrangler.toml                 # Cloudflare configuration
├── 📝 tsconfig.json                 # TypeScript configuration
└── 📚 README.md                     # This file
```

### 🔄 Request Flow
```mermaid
graph TD
    A[Client Request] --> B[CORS Middleware]
    B --> C[Auth Middleware]
    C --> D[Route Handler]
    D --> E[Database Manager]
    E --> F[Schema Manager]
    F --> G[Cloudflare D1]
    G --> H[Response]
```

### 🗃️ Database Architecture

#### Core Concept: **Dynamic Year-based Tables**
```sql
-- Fixed Core Tables (Never change)
admin_users          -- System administrators
admin_sessions       -- Active sessions
admin_activity_log   -- Activity tracking
academic_years       -- Available years (2567, 2568, 2569...)
semesters           -- Global semesters (ภาคเรียนที่ 1, 2...)
periods             -- Class periods (คาบ 1-8)

-- Dynamic Tables (Created per academic year)
teachers_2567        -- Teachers for year 2567
classes_2567         -- Classes for year 2567
rooms_2567          -- Rooms for year 2567
subjects_2567       -- Subjects for year 2567
schedules_2567      -- Schedules for year 2567

teachers_2568        -- Teachers for year 2568
classes_2568         -- Classes for year 2568
... (และต่อไปตามปี)
```

**Key Benefits:**
- ✅ **Data Isolation**: ข้อมูลแต่ละปีแยกจากกัน
- ✅ **Performance**: Query เร็วขึ้นเพราะข้อมูลน้อยลงต่อตาราง
- ✅ **Scalability**: เพิ่มปีใหม่ได้ไม่จำกัด
- ✅ **Data Safety**: ลบข้อมูลปีเก่าได้โดยไม่กระทบปีอื่น

---

## Database Design

### 🔒 Core Tables (Fixed Schema)

#### 1. Admin Users
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,      -- SHA-256 hashed
  display_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'admin',        -- admin, super_admin
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  login_count INTEGER DEFAULT 0
);
```

#### 2. Admin Sessions
```sql
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,              -- Session token
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
```

#### 3. Academic Years
```sql
CREATE TABLE academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL UNIQUE,           -- 2567, 2568, 2569...
  is_active INTEGER DEFAULT 0,            -- Only 1 can be active
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Semesters (Global)
```sql
CREATE TABLE semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_name TEXT NOT NULL UNIQUE,     -- \"ภาคเรียนที่ 1\", \"ภาคเรียนที่ 2\"
  is_active INTEGER DEFAULT 0,            -- Only 1 can be active globally
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. Periods (Class Time Slots)
```sql
CREATE TABLE periods (
  period_no INTEGER PRIMARY KEY,          -- 1, 2, 3, 4, 5, 6, 7, 8
  period_name TEXT NOT NULL,              -- \"คาบที่ 1\", \"คาบที่ 2\"
  start_time TEXT,                        -- \"08:00\" (optional)
  end_time TEXT,                          -- \"08:50\" (optional)
  duration_minutes INTEGER DEFAULT 50,
  is_active INTEGER DEFAULT 1
);
```

### 🔄 Dynamic Tables (Per Academic Year)

#### 1. Teachers Template
```sql
CREATE TABLE teachers_${YEAR} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,           -- FK to semesters table
  title TEXT,                            -- นาย, นาง, นางสาว, Mr., Ms.
  f_name TEXT NOT NULL,                  -- ชื่อ
  l_name TEXT NOT NULL,                  -- นามสกุล
  full_name TEXT GENERATED ALWAYS AS    -- Auto-generated: \"นาย สมชาย ใจดี\"
    (COALESCE(title || ' ', '') || f_name || ' ' || l_name) STORED,
  email TEXT,
  phone TEXT,
  subject_group TEXT NOT NULL,           -- สาขาวิชา: วิทยาศาสตร์, คณิตศาสตร์, etc.
  role TEXT DEFAULT 'teacher',           -- teacher, head_of_department
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);
```

#### 2. Classes Template  
```sql
CREATE TABLE classes_${YEAR} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  grade_level TEXT NOT NULL,             -- ม.1, ม.2, ม.3, ม.4, ม.5, ม.6
  section INTEGER NOT NULL,              -- 1, 2, 3, 4, 5...
  class_name TEXT GENERATED ALWAYS AS   -- Auto: \"ม.1/1\", \"ม.2/3\"
    (grade_level || '/' || section) STORED,
  student_count INTEGER DEFAULT 0,      -- Number of students
  homeroom_teacher_id INTEGER,          -- FK to teachers_${YEAR}
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  FOREIGN KEY (homeroom_teacher_id) REFERENCES teachers_${YEAR}(id) ON DELETE SET NULL,
  UNIQUE (semester_id, grade_level, section)  -- No duplicate classes
);
```

#### 3. Rooms Template
```sql
CREATE TABLE rooms_${YEAR} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  room_name TEXT NOT NULL,              -- \"ห้อง 101\", \"ห้องคอมพิวเตอร์ 1\"
  room_number TEXT,                     -- \"101\", \"A-201\"
  building TEXT,                        -- \"อาคาร A\", \"อาคารวิทยาศาสตร์\"
  floor_number INTEGER,                 -- 1, 2, 3, 4...
  room_type TEXT DEFAULT 'classroom',   -- classroom, lab, office, library
  capacity INTEGER DEFAULT 40,         -- Maximum students
  equipment TEXT,                       -- JSON string of equipment list
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE (semester_id, room_name)       -- No duplicate room names per semester
);
```

#### 4. Subjects Template
```sql
CREATE TABLE subjects_${YEAR} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  subject_name TEXT NOT NULL,           -- \"คณิตศาสตร์\", \"ฟิสิกส์\", \"ภาษาอังกฤษ\"
  subject_code TEXT,                    -- \"M101\", \"S201\", \"E301\" (optional)
  subject_group TEXT NOT NULL,          -- Same as teacher subject groups
  grade_levels TEXT NOT NULL,           -- JSON: [\"ม.1\", \"ม.2\"] or \"ALL\"
  credit_hours INTEGER DEFAULT 2,      -- จำนวนคาบต่อสัปดาห์
  teacher_id INTEGER NOT NULL,         -- FK to teachers_${YEAR}
  class_id INTEGER NOT NULL,           -- FK to classes_${YEAR}
  description TEXT,                     -- Subject description
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers_${YEAR}(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes_${YEAR}(id) ON DELETE CASCADE,
  UNIQUE (semester_id, subject_name, teacher_id, class_id) -- No duplicate assignments
);
```

#### 5. Schedules Template (Main Timetable)
```sql
CREATE TABLE schedules_${YEAR} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,          -- FK to subjects_${YEAR}
  day_of_week INTEGER NOT NULL          -- 1=Monday, 2=Tuesday... 7=Sunday
    CHECK (day_of_week BETWEEN 1 AND 7),
  period_no INTEGER NOT NULL,          -- FK to periods table (1-8)
  room_id INTEGER,                     -- FK to rooms_${YEAR} (optional)
  notes TEXT,                          -- Additional notes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects_${YEAR}(id) ON DELETE CASCADE,
  FOREIGN KEY (period_no) REFERENCES periods(period_no) ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES rooms_${YEAR}(id) ON DELETE SET NULL,
  
  -- Conflict Prevention Constraints
  UNIQUE (semester_id, day_of_week, period_no, room_id),    -- Room conflict
  UNIQUE (semester_id, subject_id, day_of_week, period_no)  -- Subject conflict
);
```

### 🔍 Database Indexes (Auto-created)

#### Performance Indexes
```sql
-- Core table indexes
CREATE INDEX idx_academic_years_active ON academic_years(is_active) WHERE is_active = 1;
CREATE INDEX idx_semesters_active ON semesters(is_active) WHERE is_active = 1;
CREATE INDEX idx_sessions_active ON admin_sessions(is_active, expires_at) WHERE is_active = 1;

-- Dynamic table indexes (per year)
CREATE INDEX idx_teachers_${YEAR}_semester ON teachers_${YEAR}(semester_id);
CREATE INDEX idx_teachers_${YEAR}_subject_group ON teachers_${YEAR}(subject_group);
CREATE INDEX idx_teachers_${YEAR}_active ON teachers_${YEAR}(is_active) WHERE is_active = 1;
CREATE INDEX idx_teachers_${YEAR}_full_name ON teachers_${YEAR}(full_name);

CREATE INDEX idx_classes_${YEAR}_semester ON classes_${YEAR}(semester_id);
CREATE INDEX idx_classes_${YEAR}_grade_section ON classes_${YEAR}(grade_level, section);

CREATE INDEX idx_schedules_${YEAR}_day_period ON schedules_${YEAR}(day_of_week, period_no);
CREATE INDEX idx_schedules_${YEAR}_subject ON schedules_${YEAR}(subject_id);
CREATE INDEX idx_schedules_${YEAR}_room ON schedules_${YEAR}(room_id);
```

---

## API Documentation

### 🌐 Base URLs
```
Development: http://localhost:8787
Production:  https://your-workers-domain.workers.dev
```

### 🔓 Public Endpoints

#### System & Health
```http
GET  /                          # API information
GET  /api/health               # Health check
POST /api/setup                # Initialize database (dev only)
GET  /api/docs                 # API documentation (dev only)
```

#### Context & Core Data  
```http
GET  /api/core/context         # Get current active year/semester
GET  /api/core/academic-years  # List all academic years
GET  /api/core/semesters       # List all semesters
```

#### Public Schedule Access
```http
GET  /api/schedule/timetable   # Get timetable for specific class
# Query params: year, semesterId, classId (optional)
```

#### Authentication
```http
POST /api/auth/login           # Admin login
# Body: { username: string, password: string }
```

### 🔒 Protected Endpoints (Require Authentication)

#### Authentication Management
```http
POST /api/auth/logout          # Logout current session
GET  /api/auth/me              # Get current user info
POST /api/auth/register-admin  # Create new admin (dev only)
# Body: { username, password, displayName?, email? }
```

#### Academic Year Management
```http
GET    /api/core/academic-years    # List academic years
POST   /api/core/academic-years    # Create new academic year
# Body: { year: number }

PUT    /api/core/academic-years/:id/activate    # Set active year
DELETE /api/core/academic-years/:id             # Delete year (with confirmation)
```

#### Semester Management
```http
GET    /api/core/semesters         # List semesters
POST   /api/core/semesters         # Create new semester  
# Body: { semester_name: string }

PUT    /api/core/semesters/:id/activate    # Set active semester
DELETE /api/core/semesters/:id             # Delete semester
```

#### Teachers Management
```http
GET    /api/schedule/teachers      # List teachers
# Query: year, semesterId, page?, limit?, search?

POST   /api/schedule/teachers      # Create teacher
# Body: { title?, f_name, l_name, email?, phone?, subject_group, role? }

GET    /api/schedule/teachers/:id  # Get teacher details
PUT    /api/schedule/teachers/:id  # Update teacher
DELETE /api/schedule/teachers/:id  # Delete teacher

# Bulk operations
DELETE /api/schedule/teachers/bulk # Delete multiple teachers
# Body: { ids: number[] }
```

#### Classes Management
```http
GET    /api/schedule/classes       # List classes
POST   /api/schedule/classes       # Create class
# Body: { grade_level, section, student_count?, homeroom_teacher_id? }

PUT    /api/schedule/classes/:id   # Update class
DELETE /api/schedule/classes/:id   # Delete class
```

#### Rooms Management
```http
GET    /api/schedule/rooms         # List rooms
POST   /api/schedule/rooms         # Create room
# Body: { room_name, room_number?, building?, floor_number?, room_type?, capacity?, equipment? }

PUT    /api/schedule/rooms/:id     # Update room
DELETE /api/schedule/rooms/:id     # Delete room
```

#### Subjects Management
```http
GET    /api/schedule/subjects?year={year}&semesterId={id}   # List subjects for semester
POST   /api/schedule/subjects?year={year}&semesterId={id}   # Create subject per class
# Body: {
#   semester_id, teacher_id, class_id,
#   subject_name, subject_code?, periods_per_week,
#   default_room_id?, special_requirements?
# }

# (Update/Delete endpoints planned – frontend currently handles edits client-side and re-syncs via API roadmap)
```

#### Schedules Management
```http
GET    /api/schedule/schedules     # List schedules
POST   /api/schedule/schedules     # Create schedule entry
# Body: { subject_id, day_of_week, period_no, room_id?, notes? }

PUT    /api/schedule/schedules/:id # Update schedule
DELETE /api/schedule/schedules/:id # Delete schedule

GET    /api/schedule/conflicts     # Check for scheduling conflicts
POST   /api/schedule/auto-generate # Auto-generate schedule (future)
```

#### Analytics & Reports
```http
GET    /api/schedule/analytics/teachers    # Teacher workload analytics
GET    /api/schedule/analytics/rooms       # Room utilization report
GET    /api/schedule/analytics/subjects    # Subject statistics
GET    /api/schedule/analytics/schedule    # Schedule efficiency metrics
```

### 📝 Request/Response Format

#### Standard Success Response
```json
{
  \"success\": true,
  \"data\": {
    // Response data here
  },
  \"message\": \"Operation completed successfully\" // optional
}
```

#### Standard Error Response
```json
{
  \"success\": false,
  \"error\": \"ERROR_CODE\",
  \"message\": \"Human readable error message\",
  \"details\": {
    // Additional error details (optional)
  }
}
```

#### Paginated Response
```json
{
  \"success\": true,
  \"data\": [
    // Array of items
  ],
  \"pagination\": {
    \"page\": 1,
    \"limit\": 20,
    \"total\": 150,
    \"totalPages\": 8,
    \"hasNext\": true,
    \"hasPrev\": false
  }
}
```

#### Example: Teachers List Response
```json
{
  \"success\": true,
  \"data\": [
    {
      \"id\": 1,
      \"semester_id\": 1,
      \"title\": \"นาย\",
      \"f_name\": \"สมชาย\",
      \"l_name\": \"ใจดี\",
      \"full_name\": \"นาย สมชาย ใจดี\",
      \"email\": \"somchai@school.ac.th\",
      \"phone\": \"081-234-5678\",
      \"subject_group\": \"คณิตศาสตร์\",
      \"role\": \"teacher\",
      \"is_active\": 1,
      \"created_at\": \"2024-01-15T08:30:00Z\",
      \"updated_at\": \"2024-01-15T08:30:00Z\"
    }
  ],
  \"pagination\": {
    \"page\": 1,
    \"limit\": 20,
    \"total\": 25,
    \"totalPages\": 2,
    \"hasNext\": true,
    \"hasPrev\": false
  }
}
```

---

## Authentication System

### 🔐 Authentication Flow

#### 1. Login Process
```typescript
// Login Request
POST /api/auth/login
{
  \"username\": \"admin\",
  \"password\": \"admin123\"
}

// Success Response
{
  \"success\": true,
  \"data\": {
    \"user\": {
      \"id\": 1,
      \"username\": \"admin\",
      \"display_name\": \"System Administrator\",
      \"role\": \"admin\"
    },
    \"session\": {
      \"token\": \"sess_1234567890abcdef\",
      \"expires_at\": \"2024-01-16T08:30:00Z\"
    }
  }
}
```

#### 2. Session Management
```typescript
// Sessions are stored in database and validated on each request
// Session token sent in Authorization header:
Authorization: Bearer sess_1234567890abcdef

// Or in custom header:
X-Session-Token: sess_1234567890abcdef

// Session validation includes:
- Token exists and is valid
- Session not expired
- User is still active
- Update last_accessed timestamp
```

#### 3. Password Security
```typescript
// Password hashing using SHA-256
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

// Passwords are never stored in plain text
// Default admin password: admin123 (change in production!)
```

#### 4. Activity Logging
```sql
-- All admin activities are logged
CREATE TABLE admin_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,           -- LOGIN, LOGOUT, CREATE_TEACHER, etc.
  resource_type TEXT,             -- teachers, classes, rooms, etc.
  resource_id INTEGER,            -- ID of affected resource
  details TEXT,                   -- JSON with additional details
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES admin_users(id)
);
```

### 🛡️ Security Features

#### 1. Input Validation
```typescript
// All inputs are validated using TypeScript interfaces
interface CreateTeacherRequest {
  title?: string;
  f_name: string;        // Required
  l_name: string;        // Required
  email?: string;        // Email format validation
  phone?: string;        // Phone format validation
  subject_group: string; // Required, must be valid subject group
  role?: string;         // Default: 'teacher'
}

// Validation middleware rejects invalid requests
```

#### 2. SQL Injection Prevention
```typescript
// All database operations use prepared statements
const result = await this.db
  .prepare('UPDATE teachers_? SET f_name = ?, l_name = ? WHERE id = ?')
  .bind(tableName, firstName, lastName, teacherId)
  .run();

// Never use string concatenation for SQL
```

#### 3. CORS Configuration
```typescript
// CORS middleware properly configured
const corsOptions = {
  origin: ['http://localhost:8000', 'http://127.0.0.1:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
};
```

#### 4. Rate Limiting (Planned)
```typescript
// Rate limiting per IP address
const rateLimits = {
  login: { requests: 5, window: '15m' },     // 5 login attempts per 15 min
  api: { requests: 100, window: '1m' },      // 100 API calls per minute
  create: { requests: 20, window: '1m' }     // 20 create operations per minute
};
```

---

## Development Setup

### 🚀 Prerequisites

#### Required Tools
```bash
# Essential tools:
- Node.js 18+ (for TypeScript compilation)
- npm or yarn (package manager)
- Wrangler CLI (Cloudflare deployment tool)
- TypeScript (for development)
```

#### Optional but Recommended
```bash
# Development tools:
- VS Code with TypeScript extension
- Postman or similar API testing tool
- SQLite browser for database inspection
```

### ⚡ Quick Start

#### 1. Install Dependencies
```bash
cd backend/school-scheduler-backend
npm install

# Install Wrangler globally (if not already installed)
npm install -g wrangler
```

#### 2. Configure Environment
```bash
# Copy and edit configuration
cp wrangler.toml.example wrangler.toml

# Edit wrangler.toml with your settings
# Make sure to set appropriate environment variables
```

#### 3. Database Setup
```bash
# Create local D1 database for development
wrangler d1 create school-scheduler-dev

# Update wrangler.toml with database ID
# Initialize database schema
npm run db:setup
```

#### 4. Start Development Server
```bash
# Start with hot reload
npm run dev

# Server will be available at:
# http://localhost:8787
```

#### 5. Initialize Database Data
```bash
# Create initial admin user and setup tables
curl -X POST http://localhost:8787/api/setup

# Test API health
curl http://localhost:8787/api/health
```

### 🔧 Development Scripts

#### Package.json Scripts
```json
{
  \"scripts\": {
    \"dev\": \"wrangler dev\",                 // Start development server
    \"deploy\": \"wrangler deploy\",           // Deploy to production
    \"build\": \"tsc\",                        // Compile TypeScript
    \"type-check\": \"tsc --noEmit\",         // Type checking only
    \"db:setup\": \"wrangler d1 execute school-scheduler --file=./setup.sql\",
    \"db:backup\": \"wrangler d1 backup school-scheduler\",
    \"logs\": \"wrangler tail\",              // View production logs
    \"test\": \"npm run type-check\"          // Run tests
  }
}
```

#### Development Workflow
```bash
# 1. Make changes to TypeScript files
# 2. Wrangler automatically recompiles and reloads
# 3. Test changes in browser/Postman
# 4. Check logs in terminal
# 5. Commit changes when ready

# Useful development commands:
npm run dev          # Start development server
npm run type-check   # Check for TypeScript errors
npm run logs         # View real-time logs
```

### 🗃️ Database Development

#### Local Database Access
```bash
# Access local D1 database
wrangler d1 execute school-scheduler-dev --command=\"SELECT * FROM admin_users;\"

# Import SQL file
wrangler d1 execute school-scheduler-dev --file=./migrations/001-initial.sql

# Export database
wrangler d1 export school-scheduler-dev --output=./backup.sql
```

#### Database Schema Updates
```typescript
// When adding new tables/columns:
// 1. Update schema-manager.ts
// 2. Update interfaces.ts with new types  
// 3. Update database-manager.ts with new CRUD methods
// 4. Test changes locally
// 5. Deploy to production
```

### 🧪 Testing

#### API Testing with curl
```bash
# Health check
curl http://localhost:8787/api/health

# Login
curl -X POST http://localhost:8787/api/auth/login \\
  -H \"Content-Type: application/json\" \\
  -d '{\"username\":\"admin\",\"password\":\"admin123\"}'
