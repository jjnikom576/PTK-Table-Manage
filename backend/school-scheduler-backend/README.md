# School Schedule Management System - Backend

A comprehensive school schedule management system built with Cloudflare Workers, D1 Database, and Hono framework. Features dynamic database architecture with year-based table management for educational institutions.

## Project Status: PRODUCTION READY ✅

**Current Phase**: Backend Complete - Ready for Frontend Integration
**Next Phase**: Frontend API Integration

## Architecture Overview

### Dynamic Database Design
- **Core Tables**: Global admin, academic years, semesters, periods
- **Dynamic Tables**: Per-year tables (teachers_2567, classes_2567, etc.)
- **Auto-Creation**: Tables generated on first data entry per academic year
- **Global Context**: One active academic year + semester at a time

### Technology Stack
- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js with TypeScript
- **Database**: Cloudflare D1 (SQLite) - Database ID: ac2699a8-76a6-4379-a83b-fe7912ced972
- **Authentication**: Session-based (8-hour expiry) with SHA-256 password hashing
- **Security**: Role-based access control, activity logging, rate limiting

## Quick Start Guide

### 1. Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Server runs on http://localhost:8787
```

### 2. Initialize Database
```bash
# Create tables and default admin user
curl -X POST http://localhost:8787/api/setup
```

### 3. Authentication
```bash
# Login (default credentials)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Response includes session_token for subsequent requests
```

### 4. API Documentation
```bash
# Get complete endpoint documentation
curl http://localhost:8787/api/docs
```

## Core Features Implemented

### ✅ Authentication System
- Admin-only access with session management
- Password hashing with SHA-256
- Activity logging for audit trails
- Role-based access control (admin/super_admin)
- Dev admin registration endpoint with secret key protection

### ✅ Dynamic Database Architecture
- Core tables: admin_users, academic_years, semesters, periods
- Dynamic tables per year: teachers_{year}, classes_{year}, rooms_{year}, subjects_{year}, schedules_{year}
- Auto table creation on first data entry
- Global context management (one active year + semester)

### ✅ Complete CRUD Operations
- Academic year and semester management
- Teacher, class, room management
- Subject and schedule creation with conflict detection
- Comprehensive indexing for performance (15+ indexes per table)

### ✅ Production-Ready API
- RESTful endpoints with proper error handling
- Input validation and rate limiting (100 req/min)
- CORS support and security headers
- Consistent response format: `{success, data/error, message}`

## API Endpoints Summary

### Public Endpoints
- `GET /` - API information
- `GET /api/health` - Health check
- `POST /api/setup` - Initialize database
- `GET /api/docs` - API documentation
- `POST /api/auth/login` - Admin login

### Protected Endpoints (Require Authentication)
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register-admin` - Create new admin (dev only, requires secret)
- `GET|POST /api/core/academic-years` - Academic year management
- `GET|POST /api/schedule/teachers` - Teacher management
- `GET|POST /api/schedule/classes` - Class management
- `GET|POST /api/schedule/schedules` - Schedule management
- `GET /api/schedule/timetable` - Formatted timetable view
- `GET /api/schedule/conflicts` - Conflict detection

## Database Locations

### Development
```
F:\Project\Web\Schedule_System\backend\school-scheduler-backend\.wrangler\state\v3\d1\miniflare-D1DatabaseObject\{uuid}.sqlite
```

### Production
- **Database ID**: ac2699a8-76a6-4379-a83b-fe7912ced972
- **Database Name**: scheduler-db
- **Platform**: Cloudflare D1

## Environment Configuration

### wrangler.json
```json
{
  "vars": {
    "ADMIN_DEFAULT_PASSWORD": "admin123",
    "ADMIN_REGISTER_SECRET": "DEV_SCHOOL_2024_REGISTER",
    "NODE_ENV": "development"
  }
}
```

## Admin User Management

### Default Credentials
- **Username**: admin
- **Password**: Aa1234
- **Role**: super_admin

### Create Additional Admin (Development)
```bash
# Requires valid session token + secret key
curl -X POST http://localhost:8787/api/auth/register-admin \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teacher1",
    "password": "Teacher123!",
    "full_name": "Teacher Name",
    "email": "teacher@school.ac.th",
    "secret": "DEV_SCHOOL_2024_REGISTER"
  }'
```

## Implementation Notes

- **SQL Queries**: Use string concatenation (avoid template literal parsing issues)
- **Session Management**: Tokens via Authorization header or cookies
- **Dynamic Tables**: Created automatically on first data insertion per academic year
- **Error Handling**: Comprehensive error responses with proper HTTP status codes
- **Performance**: Optimized with 15+ indexes per table for fast queries
- **Security**: Rate limiting, CORS, security headers, input validation

## Testing Commands

```bash
# Health check
curl http://localhost:8787/api/health

# Create academic year
curl -X POST http://localhost:8787/api/core/academic-years \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year": 2567}'

# Get teachers
curl http://localhost:8787/api/schedule/teachers \
  -H "Authorization: Bearer TOKEN"
```

## Usage Examples with Real Data

### 1. Setup Academic Context
```bash
# Check current context
GET /api/core/context

# Create academic year
POST /api/core/academic-years
{"year": 2567}

# Create semesters (auto-created: 1/2567, 2/2567, 3/2567)
# Activate academic year (makes it current)
PUT /api/core/academic-years/1/activate

# Activate semester
PUT /api/core/semesters/1/activate
```

### 2. Daily Usage - Add School Data
```bash
# Add teachers
POST /api/schedule/teachers
{
  "f_name": "สมชาย",
  "l_name": "ใจดี",
  "subject_group": "คณิตศาสตร์",
  "email": "somchai@school.ac.th",
  "phone": "081-234-5678",
  "role": "teacher"
}

# Add classes
POST /api/schedule/classes
{
  "grade_level": "ม.1",
  "section": 1
}
# Creates class_name: "ม.1/1" automatically

# Add rooms
POST /api/schedule/rooms
{
  "room_name": "101",
  "room_type": "ทั่วไป"
}

# Add subjects (junction of teacher + class + subject)
POST /api/schedule/subjects
{
  "teacher_id": 1,
  "class_id": 1,
  "subject_name": "คณิตศาสตร์",
  "subject_code": "MATH101",
  "periods_per_week": 5,
  "default_room_id": 1,
  "special_requirements": "ต้องใช้โปรเจคเตอร์"
}

# Create actual schedule
POST /api/schedule/schedules
{
  "subject_id": 1,
  "day_of_week": 1,  // Monday = 1
  "period_no": 1,    // Period 1 (08:40-09:30)
  "room_id": 1
}
```

### 3. View Results
```bash
# Get formatted timetable
GET /api/schedule/timetable
# Returns complete timetable with teacher names, subjects, rooms

# Check for conflicts
GET /api/schedule/conflicts
# Returns any scheduling conflicts

# Get teachers list with pagination
GET /api/schedule/teachers?page=1&limit=10
```

### 4. Data Relationships
```
Academic Year (2567)
└── Semesters (1/2567, 2/2567, 3/2567)
    └── Dynamic Tables:
        ├── teachers_2567 (staff)
        ├── classes_2567 (ม.1/1, ม.1/2, etc.)
        ├── rooms_2567 (101, 102, etc.)
        ├── subjects_2567 (teacher + class + subject)
        └── schedules_2567 (final timetable)
```

### 5. Required Fields by Entity
```javascript
// Teachers
{
  "f_name": "string",           // Required
  "l_name": "string",           // Required
  "subject_group": "string",    // Required
  "email": "string",            // Optional
  "phone": "string",            // Optional
  "role": "teacher|head_of_department|vice_principal|principal" // Default: teacher
}

// Classes
{
  "grade_level": "string",      // Required (ม.1, ม.2, ม.3, etc.)
  "section": number             // Required (1, 2, 3, etc.)
}

// Rooms
{
  "room_name": "string",        // Required
  "room_type": "ทั่วไป|ปฏิบัติการคอมพิวเตอร์" // Required
}

// Subjects
{
  "teacher_id": number,         // Required - from teachers table
  "class_id": number,           // Required - from classes table
  "subject_name": "string",     // Required
  "periods_per_week": number,   // Required - must be > 0
  "subject_code": "string",     // Optional
  "default_room_id": number,    // Optional - from rooms table
  "special_requirements": "string" // Optional
}

// Schedules
{
  "subject_id": number,         // Required - from subjects table
  "day_of_week": number,        // Required - 1=Monday, 7=Sunday
  "period_no": number,          // Required - from periods table
  "room_id": number             // Optional - from rooms table
}
```

## Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Apply database migrations (production)
wrangler d1 migrations apply DB --remote
```

## Next Phase: Frontend Integration

### Planned Architecture
- Central APIManager class with environment switching
- Modular API structure (auth, core, schedule)
- Simple approach: manual refresh, no caching
- Session management integration

### Integration Phases
1. **Phase 1**: Core APIManager + Authentication module
2. **Phase 2**: Academic year/semester APIs
3. **Phase 3**: Teachers/classes/schedules APIs
4. **Phase 4**: Schedule builder integration

---

**Status**: Backend development complete. System tested and production-ready. Ready for frontend API integration.
