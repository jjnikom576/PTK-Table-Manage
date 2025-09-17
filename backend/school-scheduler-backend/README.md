# School Schedule Management System - Backend API

🎯 **Complete REST API สำหรับระบบจัดตารางเรียน**

Built with **Cloudflare Workers + Hono + D1 Database**

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Initialize database (first time only)
curl -X POST http://localhost:8787/api/setup

# 4. Login with default admin
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## 📁 Project Structure

```
src/
├── auth/                   # Authentication & Authorization
│   └── auth-manager.ts     # Session management, user CRUD
├── database/               # Database Layer  
│   ├── schema-manager.ts   # Dynamic table creation & management
│   └── database-manager.ts # CRUD operations & business logic
├── middleware/             # HTTP Middleware
│   └── auth-middleware.ts  # Auth, CORS, logging, rate limiting
├── routes/                 # API Endpoints
│   ├── auth-routes.ts      # /api/auth/* - Authentication
│   ├── core-routes.ts      # /api/core/* - Academic years/semesters  
│   └── schedule-routes.ts  # /api/schedule/* - Teachers/classes/schedules
├── interfaces.ts           # TypeScript type definitions
└── index.ts               # Main application entry point
```

## 🗄️ Database Architecture

### Fixed Tables (ทุกปีใช้ร่วมกัน)
- `admin_users` - ผู้ใช้งานระบบ
- `academic_years` - ปีการศึกษา  
- `semesters` - ภาคเรียน
- `periods` - คาบเรียน (เวลา)

### Dynamic Tables (สร้างใหม่ทุกปี)
- `teachers_2567` - อาจารย์
- `classes_2567` - ชั้นเรียน
- `rooms_2567` - ห้องเรียน  
- `subjects_2567` - วิชา (ความสัมพันธ์ อาจารย์-ชั้น-วิชา)
- `schedules_2567` - ตารางสอนจริง

## 🔐 Authentication

### Login
```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

### Use Session Token
```bash
# Header method
Authorization: Bearer <session_token>

# Or custom header
X-Session-Token: <session_token>

# Or cookie (automatic)
Cookie: session_token=<session_token>
```

## 📚 API Documentation

### 🌐 Public Endpoints
- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/docs` - Complete API documentation  
- `POST /api/setup` - Initialize database
- `POST /api/auth/login` - Admin login

### 🔐 Authentication (`/api/auth`)
- `POST /logout` - Logout
- `GET /me` - Current user info
- `GET /users` - List admins (super admin only)
- `POST /users` - Create admin (super admin only)
- `GET /sessions` - User sessions
- `GET /activity` - Activity logs

### 🏛️ Core System (`/api/core`)
- `GET /context` - Get active year/semester
- `GET /academic-years` - List academic years
- `POST /academic-years` - Create new year
- `PUT /academic-years/:id/activate` - Set active year
- `POST /academic-years/:id/semesters` - Create semester
- `PUT /semesters/:id/activate` - Set active semester
- `GET /periods` - Time periods
- `GET /status` - System status

### 📋 Schedule Management (`/api/schedule`)
- `GET|POST /teachers` - Teachers CRUD
- `GET|POST /classes` - Classes CRUD  
- `GET|POST /rooms` - Rooms CRUD
- `GET|POST /subjects` - Subjects CRUD
- `GET|POST|DELETE /schedules` - Schedules CRUD
- `GET /timetable` - Formatted timetable view
- `GET /conflicts` - Scheduling conflicts detection

## 🎯 Typical Workflow

### 1. Initial Setup
```bash
# Initialize system
POST /api/setup

# Login as admin  
POST /api/auth/login

# Create academic year
POST /api/core/academic-years
{"year": 2567}

# Create semesters
POST /api/core/academic-years/1/semesters
{"semester_number": 1, "semester_name": "ภาคเรียนที่ 1"}

# Activate year & semester
PUT /api/core/academic-years/1/activate
PUT /api/core/semesters/1/activate
```

### 2. Daily Usage
```bash
# Check context
GET /api/core/context

# Add teachers
POST /api/schedule/teachers
{"f_name": "สมชาย", "l_name": "ใจดี", "subject_group": "คณิตศาสตร์"}

# Add classes  
POST /api/schedule/classes
{"grade_level": "ม.1", "section": 1}

# Add subjects
POST /api/schedule/subjects
{"teacher_id": 1, "class_id": 1, "subject_name": "คณิตศาสตร์", "periods_per_week": 5}

# Create schedule
POST /api/schedule/schedules
{"subject_id": 1, "day_of_week": 1, "period_no": 1, "room_id": 1}

# View timetable
GET /api/schedule/timetable
```

## ⚡ Features

### 🔒 Security
- JWT-like session tokens (8-hour expiry)
- Role-based access control (admin/super_admin)
- Rate limiting (100 req/min)
- Activity logging
- CORS + Security headers

### 📊 Advanced Features
- **Conflict Detection** - ป้องกันตารางซ้อน
- **Dynamic Tables** - สร้างตารางใหม่ทุกปีอัตโนมัติ
- **Global Context** - ระบบ active year/semester
- **Comprehensive Logging** - ติดตามการเปลี่ยนแปลงทั้งหมด
- **Flexible Timetable Views** - มุมมองตารางหลากหลาย

### 🎛️ Admin Tools
- User management
- Session monitoring  
- System status monitoring
- Manual table creation
- Database initialization

## 🚀 Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Create production database
wrangler d1 create scheduler-db-prod

# Update wrangler.toml with production DB ID
# Run migrations
wrangler d1 migrations apply DB --remote
```

## 🔧 Development

```bash
# Run local development
npm run dev

# Type checking
npm run check

# Database migrations (local)
npm run seedLocalD1
```

## 🎯 Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message"
}
```

### Error Response  
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human readable message"
}
```

### Paginated Response
```json
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

**🎓 Built for educational institutions requiring robust schedule management**

**⚡ Powered by Cloudflare's edge computing platform for maximum performance**
