# Schedule System – Project Overview and Work Plan (Comprehensive)

This document summarizes the project structure and all changes/decisions made today, so tomorrow’s work can continue immediately with full context.

## 1) High‑Level Architecture
- Backend
  - Runtime: Cloudflare Workers (Wrangler)
  - Framework: Hono (TypeScript)
  - Database: Cloudflare D1 (SQLite)
  - Key Concepts:
    - Dynamic tables per academic year: `teachers_{YEAR}`, `classes_{YEAR}`, `rooms_{YEAR}`, `subjects_{YEAR}`, `schedules_{YEAR}`
    - Global tables: `admin_users`, `admin_sessions`, `admin_activity_log`, `academic_years`, `semesters` (global), `periods`

- Frontend
  - Vanilla JavaScript SPA (modules)
  - Pages: Student schedule, Teacher schedule, Admin (data & context management)
  - API layer with single‑source timetable + single‑entry cache strategy

## 2) Key Decisions and Changes (Today)

### 2.1 Semesters are Global (no academic_year_id)
- Removed `academic_year_id` from `semesters` (table + interfaces + logic).
- Endpoints related to semesters:
  - GET `/api/core/semesters` (public): List global semesters
  - POST `/api/core/semesters` (admin): Create semester
  - PUT `/api/core/semesters/:id/activate` (admin): Set active semester
  - DELETE `/api/core/semesters/:id` (admin): Delete semester (blocked if active ⇒ 409)
- Global context now: active academic year + active semester are independent; semesters are not tied to year.

### 2.2 Public Read Endpoints (no login required)
- GET `/api/core/context` (read current active year/semester)
- GET `/api/core/academic-years` (list years)
- GET `/api/core/semesters` (list global semesters)
- GET `/api/schedule/timetable` (view timetable)
  - Supports `?year=YYYY&semesterId=NN` to fetch a specific year/semester without relying on active context

### 2.3 Timetable endpoint – Single Source of Truth
- Endpoint: `GET /api/schedule/timetable` (public)
- Behavior:
  - If `year` and `semesterId` are provided: read from dynamic tables `schedules_{year}`, `subjects_{year}`, `teachers_{year}`, `classes_{year}`, `rooms_{year}` and return selected semester’s schedules
  - Otherwise: fall back to active context (if any)
- Response (mock‑aligned):
  ```json
  {
    "success": true,
    "data": {
      "list": [
        {
          "id": 1,
          "semester_id": 13,
          "subject_id": 101,
          "day_of_week": 1,
          "period": 2,
          "room_id": 5,
          "created_at": "...",
          "updated_at": "...",
          "subject_name": "คณิตศาสตร์",
          "subject_code": "MATH101",
          "teacher_id": 10,
          "class_id": 55,
          "teacher_name": "ครูเอ",
          "class_name": "ม.1/1",
          "room_name": "101"
        }
      ],
      "grid": { "1": { "1": {"..."}, "2": null }, "2": { ... } }
    }
  }
  ```
- DB query joins: `schedules_{year} → subjects_{year} → teachers_{year} / classes_{year} → rooms_{year}`; aliases `period_no AS period`.

### 2.4 Schedules schema – conflicts & indexes
- schedules_{YEAR} DDL (effective constraints):
  - UNIQUE (semester_id, day_of_week, period_no, room_id)  // prevent room conflicts
  - REMOVED: UNIQUE (semester_id, subject_id, day_of_week, period_no)  // allow parallel sections/teachers for same subject code
- Indexes (added/confirmed):
  - schedules_{YEAR}: (semester_id), (day_of_week, period_no), (semester_id, day_of_week), (subject_id), (room_id)
  - subjects_{YEAR}: (teacher_id), (class_id)
- Conflict detection logic stays in code (createSchedule): checks teacher/class/room conflicts via joins.
- POST `/api/schedule/schedules`: returns 409 when conflict detected, else 200/400 as appropriate.

### 2.5 Academic Years – Delete rules
- DELETE `/api/core/academic-years/:id` (admin):
  - Cannot delete active year ⇒ 409
  - Does NOT drop dynamic tables; we retain the data for potential reuse

### 2.6 Frontend – Single cache + API‑driven pages
- API layer (frontend/js/api/core-api.js):
  - Single timetable cache: keep only the latest selection (`year:semesterId`)
  - `getTimetableBy(year, semesterId, useCache=true)`
  - `clearTimetableCache()` and `getCachedTimetable()`
- App (frontend/js/app.js):
  - On context apply (OK): clear cache → prefetch timetable → refresh current page
- Student page (frontend/js/pages/studentSchedule.js):
  - Use `getTimetableBy(..., true)`; if `data.list` exists, build matrix from list (mock‑style) and render
  - Do not rely on `grid` anymore (only list; retains fallback if no API data)
- Teacher page (frontend/js/pages/teacherSchedule.js):
  - Prefer `coreAPI.getCachedTimetable().list`; build matrix from list
  - Fallback to internal build only if no list in cache

### 2.7 Admin UX Adjustments
- Selection lists (years/semesters): click the whole item to select; no deselect (radio must always have a value once selected)
- Semester creation: fixed submit state handling; improved empty/loading/error messages
- Public viewing allowed for year/semester selection; admin operations (create/activate/delete) require login

## 3) Project Structure (Key Files)

Backend (Cloudflare Workers + Hono)
- `backend/school-scheduler-backend/src/index.ts`
  - App bootstrap, global middleware, route mounting, public GET whitelist
- `backend/school-scheduler-backend/src/routes/core-routes.ts`
  - context, academic-years (GET public; POST/PUT/DELETE admin), semesters (GET public; POST/PUT/DELETE admin)
- `backend/school-scheduler-backend/src/routes/schedule-routes.ts`
  - GET `/api/schedule/timetable` (public; supports year & semesterId)
  - Teachers/classes/rooms/subjects/schedules write operations (admin)
  - Conflicts endpoint (admin)
- `backend/school-scheduler-backend/src/database/database-manager.ts`
  - `getSchedulesBySemester(semesterId)` – active year
  - `getSchedulesBySemesterForYear(semesterId, year)` – specified year
  - `deleteAcademicYear(yearId)` (no drop dynamic tables; 409 if active)
  - Conflict checks for schedule creation
- `backend/school-scheduler-backend/src/database/schema-manager.ts`
  - Core and dynamic table creation and indexes
  - Removed subject‑level UNIQUE from schedules, added indexes
- `backend/school-scheduler-backend/src/interfaces.ts`
  - Types (Env, entities, requests, responses)

Frontend (Vanilla JS SPA)
- `frontend/index.html` – containers and script entrypoints
- API layer
  - `frontend/js/api/core-api.js` – academic years/semesters + timetable (single cache)
- App shell
  - `frontend/js/app.js` – templates, navigation, context selectors, apply context integration & prefetch timetable
- Pages
  - `frontend/js/pages/studentSchedule.js` – builds matrix from timetable list
  - `frontend/js/pages/teacherSchedule.js` – builds matrix from timetable list
  - `frontend/js/pages/admin.js` – admin data mgmt, selection UX
- Context management
  - `frontend/js/context/globalContext.js` – public read of context/years/semesters; renders selectors
- Utilities
  - `frontend/js/loading.js` – show/hide loading helpers (ESM + global exposure)

## 4) How to Run
- Backend
  - `cd backend/school-scheduler-backend`
  - `npm install`
  - `npm run dev` → http://localhost:8787
- Frontend (static hosting / dev server)
  - `cd frontend`
  - Serve with VSCode Live Server or `python -m http.server 8000` → http://localhost:8000

## 5) Quick API Examples
- Public reads (no auth):
  - `GET /api/core/context`
  - `GET /api/core/academic-years`
  - `GET /api/core/semesters`
  - `GET /api/schedule/timetable?year=2569&semesterId=13`
- Admin writes (require login + bearer):
  - `POST /api/core/academic-years { year }`
  - `PUT /api/core/academic-years/:id/activate`
  - `DELETE /api/core/academic-years/:id` (409 if active)
  - `POST /api/core/semesters { semester_name }`
  - `PUT /api/core/semesters/:id/activate`
  - `DELETE /api/core/semesters/:id` (409 if active)
  - `POST /api/schedule/schedules` (409 on conflict)

## 6) Data Model Summary
- academic_years: `id`, `year`, `is_active`, timestamps; UNIQUE(year)
- semesters (global): `id`, `semester_name`, `is_active`, timestamps; UNIQUE(semester_name)
- periods: per school day periods (period_no, names, times)
- Dynamic tables per year:
  - `teachers_{YEAR}`: teachers for the year; (indexes as needed)
  - `classes_{YEAR}`: class groups; UNIQUE(year, grade_level, section)
  - `rooms_{YEAR}`: rooms for the year; UNIQUE(year, room_name)
  - `subjects_{YEAR}`: offering (junction teacher ↔ class ↔ subject meta)
    - UNIQUE(year, teacher_id, class_id, subject_name)
    - INDEX(teacher_id), INDEX(class_id)  ← added
  - `schedules_{YEAR}`: final timetable
    - Columns: id, semester_id, subject_id, day_of_week, period_no, room_id, timestamps
    - UNIQUE(semester_id, day_of_week, period_no, room_id)  // prevent room conflict
    - Indexes: (semester_id), (day_of_week, period_no), (semester_id, day_of_week), (subject_id), (room_id)

## 7) Frontend Cache Strategy
- Only one timetable cache retained (latest selection) to reduce memory & network overhead
- On context apply: clear → prefetch → render
- student/teacher pages use the cached timetable list to build matrices for their views

## 8) Admin UX Notes
- Year/Semester selection: click anywhere on item to select; cannot deselect once selected
- Public users can select year/semester to “view” (no login); write ops require admin

## 9) Known Follow‑Ups / TODOs
- Improve conflict messages (e.g., specify teacher/class/time in error body)
- Remove remaining grid fallbacks when list‑based rendering is fully stable
- Consider adding subjects catalog table (optional) if needed for curriculum meta
- Ensure all subjects_{YEAR} indexes exist in production databases

## 10) Coding/Testing Conventions
- Prefer list‑based API for timetable (mock‑aligned) — one source → many views
- Use single cache for timetable (key = `year:semesterId`)
- Public GET only; all writes require admin auth
- Validation for conflicts in code (teacher/class/room) rather than broad UNIQUE constraints

---
This file is the single source for the current state and decisions. With the above, a new contributor (or Codex) can continue implementation by relying on the timetable API as the single source of truth and the cache strategy on the frontend.

