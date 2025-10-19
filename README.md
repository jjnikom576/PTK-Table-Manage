# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A school schedule management system for secondary schools built with Cloudflare Workers (Hono framework), D1 Database, and vanilla JavaScript frontend. The system supports multi-year academic data with a dynamic database architecture where tables are created per academic year (e.g., `teachers_2567`, `teachers_2568`).

> **Status Note (2025-10-19):** Backend route logic has been modularised and the substitution dashboard is now stable after the latest bugfix pass. The vanilla JS frontend continues to run from `frontend/` via a static server while we prepare the migration to Vite (roadmap below). Expect both legacy (`python -m http.server`) and upcoming Vite commands to be documented until the cut-over is complete.

**Key Feature**: The database uses a "dynamic table" pattern where entity tables (teachers, classes, rooms, subjects, schedules) are suffixed with the academic year, allowing complete isolation of data across years while maintaining a single database.

## Development Commands

### Backend (Cloudflare Workers)
```bash
cd backend/school-scheduler-backend

# Install dependencies
npm install

# Local development with auto-migration
npm run dev
# Runs: pnpm seedLocalD1 && wrangler dev
# Server: http://localhost:8787

# Type checking and dry-run deploy
npm run check

# Deploy to Cloudflare
npm run deploy
# Note: Runs predeploy hook that applies migrations to remote DB

# Database migrations (manual)
npm run seedLocalD1              # Apply migrations locally
npm run predeploy                # Apply migrations to remote
wrangler d1 migrations apply DB --local    # Direct local migration
wrangler d1 migrations apply DB --remote   # Direct remote migration
```

### Frontend
```bash
cd frontend

# (Current) Serve static assets with any HTTP server
python -m http.server 8000   # or use VS Code Live Server
# Frontend: http://localhost:8000

# (Upcoming) After migrating to Vite
npm install
npm run dev          # Vite dev server with hot reload
npm run build        # Output production bundle to dist/
```

## Current Frontend Status

- The admin SPA is still served as vanilla ES modules via `<script type="module">` tags in `frontend/index.html`.
- Shared bootstrap logic lives in `frontend/js/app/core.js`; individual pages (teacher schedule, substitution, etc.) are implemented under `frontend/js/pages/`.
- Event handling has recently been refactored (see `frontend/js/pages/substitution/`) to rely on delegated listeners, preventing stale bindings when the DOM is regenerated.
- Asset pipeline remains manual; static `css/`, `js/`, and `templates/` directories are copied verbatim. Continue using the static-server workflow above until the Vite switchover is complete.

### Initial Setup
```bash
# 1. Start backend
cd backend/school-scheduler-backend && npm run dev

# 2. Initialize database (creates tables + default admin)
curl -X POST http://localhost:8787/api/setup

# 3. Start frontend (separate terminal)
cd frontend
python -m http.server 8000

# Default credentials: admin / Aa1234
```

## Frontend Migration to Vite

We are in the process of modernising the SPA build pipeline. The near-term plan is to replace the ad‑hoc static-server workflow with Vite so that hot reload, asset bundling, and production builds are all first-class.

### Migration Roadmap

| Phase | Goal | Key Deliverables | Status |
| --- | --- | --- | --- |
| 0. Discovery & Audit | Capture current entry points, templates, and global context wiring | Module inventory (`frontend/js/app/`, `frontend/js/pages/`), template map, substitution workflow notes | ✅ Completed (2025‑10‑19) |
| 1. Vite Bootstrap | Run Vite alongside the existing static server | `frontend/package.json`, `vite.config.ts`, ESLint/Prettier config, npm scripts (`dev`, `build`, `preview`) | 🟡 In progress |
| 2. Module Alignment | Load all ES modules via Vite with consistent aliases/env | Configure `resolve.alias`, route global context through Vite entry, migrate config reads to `import.meta.env` | ⬜ Planned |
| 3. Asset & Style Pipeline | Let Vite fingerprint assets and bundle CSS | Move icons/fonts to `public/`, import CSS in modules, convert HTML partial loading (e.g. `import.meta.glob`) | ⬜ Planned |
| 4. Build & Deploy Flow | Produce production bundle & wire CI/CD | Successful `npm run build`, GitHub Pages (or equivalent) deployment workflow, smoke tests | ⬜ Planned |
| 5. Cut-over & Cleanup | Retire legacy static server | Remove `python -m http.server` instructions, delete obsolete template loader, final regression pass | ⬜ Planned |

#### Next Actions
- Finish Phase 1 scaffolding (Vite config + dual `package.json` scripts) without breaking the static workflow.
- Add a mirrored `index.html`/entry module for Vite so we can toggle between legacy and Vite builds during Phase 3.
- Draft a manual regression checklist (auth, global context switching, substitution interactions) to execute in Phases 3–5.

Until the cut-over is complete, keep both the legacy static-server commands and the upcoming Vite commands documented so collaborators can choose the appropriate workflow.

## Architecture & Key Concepts

### Database Schema Pattern

The database has two types of tables:

**Fixed Tables (permanent)**:
- `admin_users`, `admin_sessions`, `admin_activity_log` - Authentication & audit
- `academic_years` - Years with single active flag
- `semesters` - Global semesters (not tied to specific year)

**Dynamic Tables (per year)**:
- `teachers_{YEAR}`, `classes_{YEAR}`, `rooms_{YEAR}`, `subjects_{YEAR}`, `periods_{YEAR}`, `schedules_{YEAR}`
- Created on-demand when first record is inserted for a new academic year
- All include `semester_id` foreign key to global `semesters` table
- Example: `teachers_2567`, `teachers_2568`

### Global Context System

The application operates with a global context of:
1. One active `academic_year` (e.g., 2567)
2. One active `semester` (e.g., "ภาคเรียนที่ 1")

All operations use this context to:
- Route to the correct year-specific tables
- Auto-create tables if they don't exist for the active year
- Filter data by `semester_id`

### Backend Architecture

**Tech Stack**:
- Runtime: Cloudflare Workers
- Framework: Hono.js (TypeScript)
- Database: Cloudflare D1 (SQLite)
- Auth: Session-based with SHA-256 password hashing

**File Structure**:
```
backend/school-scheduler-backend/src/
├── index.ts                    # Main Hono app with route mounting
├── interfaces.ts               # TypeScript interfaces for all entities
├── auth/
│   └── auth-manager.ts         # Authentication logic
├── middleware/
│   └── auth-middleware.ts      # Auth, CORS, rate limiting, logging
├── database/
│   ├── database-manager.ts     # CRUD operations & context management
│   └── schema-manager.ts       # Table creation & indexing
└── routes/
    ├── auth-routes.ts          # Login/logout/session management
    ├── core-routes.ts          # Academic years/semesters/context
    └── schedule-routes.ts      # Teachers/classes/rooms/subjects/schedules
```

**Key Classes**:
- `DatabaseManager`: Handles all CRUD operations, automatically creates year-specific tables on first access
- `SchemaManager`: Creates and indexes tables using string concatenation (NOT template literals due to D1 limitations)
- `AuthManager`: Session management and password hashing

**Important Notes**:
- SQL statements use string concatenation (`+`) not template literals due to Cloudflare Workers/D1 limitations
- All dynamic tables include `semester_id` to support multiple semesters within a year
- Generated columns: `full_name` (teachers), `class_name` (classes)
- Comprehensive indexing for performance (15-20 indexes per table type)

### Frontend Architecture

**Tech Stack**: Vanilla JavaScript ES6 Modules, no bundler/transpiler

**File Structure**:
```
frontend/
├── index.html                  # SPA shell with embedded page sections
├── js/
│   ├── app.js                  # Main entry point
│   ├── templateLoader.js       # Loads HTML templates from templates/
│   ├── api/
│   │   ├── config.js           # API base URL configuration
│   │   ├── auth-api.js         # Authentication API client
│   │   ├── core-api.js         # Academic years/semesters API
│   │   └── schedule-api.js     # CRUD APIs with 3-minute cache
│   ├── pages/
│   │   ├── admin.js            # Main admin panel (2000+ lines)
│   │   ├── studentSchedule.js  # Student timetable view
│   │   ├── teacherSchedule.js  # Teacher workload & schedules
│   │   └── substitution.js     # Substitute teacher management
│   └── utils/
│       └── export.js           # CSV/Excel/Google Sheets export
├── templates/                  # HTML component templates
└── css/                        # Styling
```

**Key Concepts**:
- **Caching**: `schedule-api.js` implements 3-minute cache with pattern-based invalidation
- **Cache Invalidation**: When creating/updating/deleting, clear related cache entries (e.g., creating a teacher clears `GET:/api/schedule/teachers*`)
- **Admin Panel**: `pages/admin.js` is the main UI with Excel-like data tables for all CRUD operations
- **Template Loading**: HTML templates loaded dynamically from `templates/` directory

### API Patterns

**Response Format**:
```typescript
// Success
{ success: true, data: {...}, message?: string }

// Error
{ success: false, error: "ERROR_TYPE", message: "Human readable error" }

// Paginated
{ success: true, data: [...], pagination: { page, limit, total, totalPages } }
```

**Authentication**:
- Login: `POST /api/auth/login` → returns `session_token`
- Token sent via: `Authorization: Bearer <token>` OR `X-Session-Token` header OR cookie
- Protected routes use `authMiddleware` from `middleware/auth-middleware.ts`

**Public Endpoints** (no auth required):
- `GET /api/health`, `POST /api/setup`, `GET /api/docs`
- `GET /api/core/context`, `GET /api/core/academic-years`, `GET /api/core/semesters`
- `GET /api/schedule/timetable`

**Key Endpoints**:
```
Core Management:
  POST /api/core/academic-years        # Create year (tables auto-created)
  PUT  /api/core/academic-years/:id/activate
  POST /api/core/semesters             # Create semester (global)
  PUT  /api/core/semesters/:id/activate

Schedule Management (all auto-route to year-specific tables):
  GET|POST|PUT|DELETE /api/schedule/teachers
  GET|POST|PUT|DELETE /api/schedule/classes
  GET|POST|PUT|DELETE /api/schedule/rooms
  GET|POST|PUT|DELETE /api/schedule/subjects
  GET|POST|PUT|DELETE /api/schedule/schedules
  GET /api/schedule/conflicts          # Detect scheduling conflicts
```

## Development Guidelines

### Working with Dynamic Tables

When adding features that interact with year-specific tables:

1. **Always use the active academic year** from global context
2. **Check table existence** before querying (or let DatabaseManager auto-create)
3. **Include `semester_id`** in all inserts/updates
4. **Use string concatenation** for table names in SQL (not template literals)

Example from `schema-manager.ts`:
```typescript
const tableName = `teachers_${year}`;
await this.db.exec(
  "CREATE TABLE IF NOT EXISTS " + tableName + " (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
  "semester_id INTEGER NOT NULL, " +
  // ... more columns
  ")"
);
```

### Adding New Entities

To add a new entity type (e.g., "departments"):

1. **Backend**:
   - Add interface to `interfaces.ts`
   - Add table creation method in `schema-manager.ts` → `createDepartmentsTable(year)`
   - Call from `createDynamicTablesForYear()`
   - Add CRUD methods in `database-manager.ts`
   - Create routes in `routes/schedule-routes.ts` (or new route file)

2. **Frontend**:
   - Add API client in `js/api/schedule-api.js`
   - Add page/tab in `pages/admin.js`
   - Add template in `templates/forms/admin/add-department.html`

### Cache Invalidation Pattern

When modifying `schedule-api.js` or similar cached API clients:

```javascript
// After create/update/delete operation:
this.clearCachePattern(/^GET:\/api\/schedule\/teachers/);  // Clear related GET requests
this.clearCachePattern(/^GET:\/api\/schedule\/subjects/);  // If subjects depend on teachers
```

Pattern matching uses regex on cache keys formatted as `{METHOD}:{URL}`.

### Frontend State Management

The frontend uses a simple global context pattern:
- Active academic year and semester stored in `js/context/globalContext.js`
- Context displayed in UI via `templates/components/global-context.html`
- When context changes, relevant pages reload their data

### Common Issues

**Issue**: SQL errors with template literals
**Solution**: Use string concatenation with `+` instead of template literals in SQL

**Issue**: Cache not clearing after update
**Solution**: Check cache invalidation pattern includes all affected endpoints

**Issue**: Table doesn't exist for year
**Solution**: Call `POST /api/core/academic-years` which triggers table creation via `SchemaManager`

**Issue**: Data not showing after insert
**Solution**: Ensure `semester_id` is included and matches active semester

## Testing & Debugging

### Backend
- Check Cloudflare Workers logs: `wrangler tail` (for deployed workers)
- Local logs appear in terminal running `npm run dev`
- Health check: `curl http://localhost:8787/api/health`
- Database inspection: Use Wrangler's D1 CLI or local `.sqlite` file

### Frontend
- Check browser console for API errors and cache logs
- Verify API calls in Network tab
- Global context visible in UI top bar
- Mock data available in `js/data/` for testing without backend

## Configuration

### Environment Variables (wrangler.json)
```json
{
  "vars": {
    "ADMIN_DEFAULT_PASSWORD": "Aa1234",
    "ADMIN_REGISTER_SECRET": "DEV_SCHOOL_2024_REGISTER",
    "NODE_ENV": "development"
  }
}
```

### Database Binding
D1 database bound as `DB` in worker environment (configured in `wrangler.json`)

## Project Status

**Completed**:
- ✅ Backend API with full CRUD operations
- ✅ Dynamic table architecture with auto-creation
- ✅ Authentication & session management
- ✅ Frontend SPA with admin panel
- ✅ Teachers, Classes, Rooms management (full stack)
- ✅ Subjects management with multi-class support
- ✅ Academic year/semester management

**In Progress**:
- 🔄 Schedule builder (manual schedule creation)
- 🔄 Advanced conflict detection
- 🔄 Periods management UI

**Planned**:
- AI-powered schedule generation
- Enhanced analytics dashboard
- Substitute teacher optimization

## Repository Guidelines

### Project Structure & Module Organization
- Backend worker lives in `backend/school-scheduler-backend` (TypeScript + Hono). Key directories: `src/routes`, `src/database`, `src/middleware`.
- Frontend SPA sits in `frontend`; static assets reside in `css/`, `js/`, and `templates/`, with mock datasets stored in `js/data/`.
- Database migrations and seed scripts are under `backend/school-scheduler-backend/migrations`; year-suffixed D1 tables (for example `teachers_2567`) are provisioned through `SchemaManager`.

### Build, Test, and Development Commands
- `cd backend/school-scheduler-backend && npm install` installs Wrangler/TypeScript dependencies.
- `npm run dev` seeds the local D1 instance via `seedLocalD1` then starts `wrangler dev` on http://localhost:8787.
- `npm run check` runs `tsc` type checking and a Wrangler dry-run deploy—use it before opening a PR.
- `npm run deploy` performs a full Cloudflare deploy and triggers the `predeploy` migration hook.
- `cd frontend && python -m http.server 8000` serves the static UI; VS Code Live Server is an acceptable alternative.
- `curl -X POST http://localhost:8787/api/setup` bootstraps tables and the default admin credentials.

### Coding Style & Naming Conventions
- Use TypeScript with 2-space indentation, single quotes, and explicit interface imports (see `src/index.ts`).
- Construct dynamic D1 table names with string concatenation (`'teachers_' + year` style) to avoid template literal issues in Workers.
- Frontend modules live under `js/`; cache keys follow `METHOD:/api/...` naming. New HTML fragments belong in `templates/` using snake-case filenames.

### Testing Guidelines
- No automated test suite yet—exercise routes manually via `curl` or the admin UI.
- After backend changes, run `npm run dev` and check `/api/health`; confirm seeding by requesting `/api/schedule/teachers`.
- When adjusting cache-sensitive logic, call `clearCachePattern()` with the relevant regex to verify cache invalidation.

### Commit & Pull Request Guidelines
- Match existing history: short, lower-case, imperative commit subjects (e.g., `add teacher cache`, `fix login session`).
- Keep unrelated backend and frontend tweaks in separate commits, and isolate generated migrations where practical.
- Pull requests should include a problem summary, linked issue or ticket, screenshots or JSON samples when UI/API behaviour changes, and confirmation that `npm run check` passes.
- Tag reviewers responsible for the affected area and call out any follow-up or open questions.

### Security & Configuration Tips
- Configuration secrets stay in `wrangler.json` vars; never commit real credentials. Use the default `ADMIN_DEFAULT_PASSWORD` for local work only.
- Ensure new tables or queries always include `semester_id` and respect the active academic year/semester context to prevent cross-year leakage.
