# School Schedule Management System - Frontend

## 🎯 **Current Project Status: Ready for Backend Integration**

### **What We Have ✅**
- **Backend**: Cloudflare Workers + Hono + D1 SQLite database (Complete ✅)
- **Frontend**: JavaScript SPA with full UI components (Complete ✅)
- **Admin Panel**: Comprehensive admin interface (Ready ✅)

### **What We're Doing Now 🎯**
**Connecting Frontend ↔ Backend** by building API integration layer to replace mock data with real backend calls.

---

## 📋 Project Overview

A comprehensive school schedule management system for secondary schools supporting:
- **Multi-year data management** (dynamic table creation per academic year)
- **Complete admin panel** for managing teachers, classes, rooms, subjects, and schedules
- **Schedule builder** with conflict detection
- **Export system** (CSV, Excel, Google Sheets)
- **Teacher workload analysis** and substitution management

## 🏗️ Technical Architecture

### **Backend (Complete)**
- **Platform**: Cloudflare Workers + Hono framework
- **Database**: D1 SQLite with dynamic table creation
- **API**: RESTful endpoints with authentication
- **Location**: `F:\Project\Web\Schedule_System\backend\school-scheduler-backend\`
- **Status**: ✅ Production-ready with full CRUD operations

### **Frontend (Ready for Integration)**
- **Framework**: Vanilla JavaScript SPA
- **UI**: Complete admin interface with Excel-like data tables
- **Architecture**: Modular API classes ready for backend connection
- **Location**: `F:\Project\Web\Schedule_System\frontend\`
- **Status**: ✅ All UI components ready, using mock data

## 🗄️ Database Architecture

### **Fixed Tables (Core System)**
```sql
admin_users          -- Admin authentication
academic_years       -- Academic year management  
semesters           -- Semester management
periods             -- Class periods (optional)
```

### **Dynamic Tables (Per Academic Year)**
```sql
teachers_2567       -- Teachers for year 2567
classes_2567        -- Student classes
rooms_2567          -- Physical classrooms
subjects_2567       -- Subjects and curriculum
schedules_2567      -- Teaching schedules
```

**Key Features:**
- Auto table creation on first data entry per year
- Global context management (one active year + semester)
- Complete indexing for performance

## 🎛️ Admin Panel Features

The admin panel (`#page-admin`) is the heart of the system with these sections:

### **📋 Data Management**
- **Teachers**: Add/edit teacher information, subject groups, roles
- **Classes**: Manage student class groups (ม.1/1, ม.2/3, etc.)
- **Rooms**: Physical classroom management with types
- **Subjects**: Curriculum subjects with constraints
- **Periods**: Class time periods configuration

### **🤖 Schedule Builder**
- AI-powered schedule generation
- Conflict detection (teacher, class, room conflicts)
- Manual schedule editing interface
- Batch operations and validations

### **🔄 Substitution Management**
- Track teacher absences
- Automatic substitute teacher recommendations
- Hall of Fame ranking system
- Historical substitution reports

### **📅 Academic Year Management**
- Create and manage academic years
- Semester configuration
- Data migration between years
- Context switching interface

## 🔧 Current Integration Plan

### **Phase 1: API Foundation ← WE ARE HERE**
```javascript
// Central API management
frontend/js/api/
├── core/api-manager.js     // Base APIManager class
├── auth-api.js            // Authentication module  
├── core-api.js           // Academic years/semesters
└── schedule-api.js       // Teachers/classes/schedules
```

### **Phase 2: Authentication Integration**
- Replace mock login with real backend auth
- Session management with JWT tokens
- Admin role verification

### **Phase 3: CRUD Operations**
- Connect all admin forms to backend APIs
- Replace mock data with real database calls
- Error handling and validation

### **Phase 4: Schedule Builder**
- Integrate schedule creation with backend
- Real-time conflict detection
- Save/load schedule states

## 🔐 Authentication System

### **Current Credentials**
- **Username**: `admin`
- **Password**: `admin123`
- **Registration Secret**: `DEV_SCHOOL_2024_REGISTER`

### **Backend Endpoints**
- `POST /admin/login` - Admin authentication
- `POST /admin/register` - Admin registration (dev only)
- Session management with 8-hour expiry

## 📁 Project Structure

```
F:\Project\Web\Schedule_System\
├── backend/school-scheduler-backend/     (✅ Complete)
│   ├── src/                             (TypeScript source)
│   ├── wrangler.json                    (CF Workers config)
│   └── package.json
└── frontend/                            (✅ Ready for integration)
    ├── index.html                       (Main SPA)
    ├── js/
    │   ├── api/                        (📍 Integration target)
    │   ├── pages/admin.js              (📍 Main admin interface)
    │   ├── context/globalContext.js    (📍 State management)
    │   └── data/                       (📍 Mock data to replace)
    ├── css/                            (Complete styling)
    └── templates/                      (HTML components)
```

## 🚀 Development Environment

### **Backend Development**
```bash
cd F:\Project\Web\Schedule_System\backend\school-scheduler-backend
npm run dev  # Runs on localhost:8787
```

### **Frontend Development**
```bash
cd F:\Project\Web\Schedule_System\frontend
# Use Live Server (VS Code) or:
python -m http.server 8000  # Runs on localhost:8000
```

### **Database Location**
- **Development**: `.wrangler/state/v3/d1/`
- **Production**: Cloudflare D1 (ID: ac2699a8-76a6-4379-a83b-fe7912ced972)

## 🎯 Integration Strategy

### **No Caching Philosophy**
- Always fetch fresh data from backend
- Manual refresh (F5 key, refresh buttons)
- Simple error handling with user education
- No offline support - standard network error handling

### **Environment Switching**
```javascript
// APIManager will switch between:
const API_BASE = {
  development: 'http://localhost:8787/api',
  production: 'https://your-domain.workers.dev/api'
}
```

### **Error Handling Pattern**
```javascript
// Consistent API response format:
{
  success: boolean,
  data?: any,
  error?: string,
  message?: string
}
```

## 👨‍💻 For AI Assistants

If you're helping with this project:

1. **We have**: Complete backend + complete frontend UI
2. **We need**: API integration layer to connect them
3. **Focus area**: Admin panel functionality and data management
4. **Architecture**: Replace mock data calls with real API calls
5. **Priority**: Authentication first, then CRUD operations

### **Key Files to Understand**
- `js/pages/admin.js` - Main admin interface
- `js/api/config.js` - API configuration
- `js/api/auth.js` - Authentication module
- `js/context/globalContext.js` - Global state management

### **Backend API Documentation**
The backend provides standard REST endpoints for all entities with proper authentication and year-based routing.

---

**Status**: Frontend ✅ + Backend ✅ → Integration in Progress 🔄  
**Next**: Build APIManager and connect admin panel to live data  
**Goal**: Fully functional school schedule management system
