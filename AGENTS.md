# AGENTS.md — Agent Guide for School Schedule Project

This document guides AI agents working in this repository. It covers how to run the project, code conventions, integration rules, and boundaries. Scope: entire repository.

## Quick Context
- Stack: HTML/CSS/JavaScript (ES Modules), no bundler; Python `http.server` for static, custom Python Admin API (`server/app.py`); SQLite database (`database/`).
- Default data: Mock data in `js/data/` via services in `js/services/`. Frontend is context-aware (multi-year, semesters) and uses template loading.
- Goal: Keep the app simple and fast; prefer incremental improvements over rewrites.

## Run & Validate
- One-click dev (Windows PowerShell):
  - `powershell -ExecutionPolicy Bypass -File scripts/dev.ps1`
  - Web: `http://localhost:8000`
  - API health: `http://localhost:8080/api/health`
  - Env vars: `ADMIN_API_HOST` (default `127.0.0.1`), `ADMIN_API_PORT` (default `8080`)
- Manual (frontend only): `python -m http.server 8000` then open `http://localhost:8000`
- Verify templates load: check that navigation, context bar, and footer render without console errors.
- Verify API: `GET /api/health` returns `{ ok: true, ... }`

## Repository Layout
- `index.html`: Single-page shell; loads modules and renders pages.
- `css/`: Styles (`main.css`, `components.css`, `responsive.css`, etc.).
- `js/`:
  - `app.js`: Main entry. Initializes context, navigation, pages, export.
  - `templateLoader.js`: Loads HTML templates from `templates/` with cache.
  - `navigation.js`, `utils.js`, `utils/export.js`.
  - `context/`: Global context management.
  - `services/`: Data service orchestrator and year/semester services.
  - `api/`: API config and per-entity modules (currently mostly mock-backed).
  - `pages/`: Page modules (`studentSchedule.js`, `teacherSchedule.js`, `substitution.js`, `admin.js`).
  - `data/`: Mock datasets (teachers, classes, schedules, rooms, subjects, semesters...).
- `templates/`: HTML partials for components and pages.
- `server/app.py`: Minimal Admin API (login/session preview, user hash lookup, health).
- `database/`: SQLite schema (`init_database.sql`), setup guide, and example DB.
- `scripts/dev.ps1`: Starts static server and Admin API together.

## Frontend Conventions
- ES Modules only; no bundlers or transpilers.
- Keep changes minimal and localized; avoid renaming files unless requested.
- Naming: descriptive variables; avoid one-letter names. Prefer `camelCase` for JS, `kebab-case` for CSS classes.
- No inline copyright/license headers.
- Avoid gratuitous inline comments; write clear code and update docs when behavior changes.
- Do not introduce heavy libraries; prefer vanilla JS and existing utilities.

## Templates
- Location: `templates/` (e.g., `components/navigation.html`, `pages/student-schedule.html`).
- Loader: `js/templateLoader.js` fetches `./templates/<path>.html` with a simple cache.
- When adding templates: keep them HTML-only; no `<script>` tags. Use semantic markup and ARIA where appropriate.
- Variable substitution: use `templateLoader` options if needed; keep simple.

## Data & Services
- Primary coordinator: `js/services/dataService.js` (cache, context, loaders).
- Default mode: mock (`initDataService({ mode: 'mock' })`).
- When adding features:
  - Extend service functions in `services/` to orchestrate data.
  - Keep cache coherent; clear or namespace by year as needed.
  - Maintain Thai-friendly sorting and formatting.

## API Integration Rules
- Config: `js/api/config.js` selects base URL by environment (localhost -> dev).
- Existing endpoints (server/app.py):
  - `GET /api/health`
  - `POST /api/admin/login` (preview: allows `admin/admin123` only for dev)
  - `GET /api/admin/users/:username/hash` (client bcrypt flow)
  - `POST /api/admin/session` (issue token after client-side verify)
- Migration path from mock → API:
  - Add read-only endpoints first (academic years, semesters, teachers, classes, rooms, subjects, schedules).
  - Switch clients incrementally: gate via a mode flag or feature toggle inside the relevant API module.
  - Preserve mock fallback if fetch fails (dev-friendly).
  - Keep `APIError` usage consistent for error reporting.
- Security: Default admin creds are for dev only. Do not enable outside dev without explicit request. Keep CORS as-is unless instructed.

## Database
- Path: `database/school_schedule.db`. Schema and seed in `database/init_database.sql`.
- Use DB Browser for SQLite per `database/README_SETUP.md`.
- Do not change schema or write migrations without explicit request.

## Export
- Use `js/utils/export.js`. Ensure UTF-8 BOM for CSV and correct content types for XLSX.
- Filenames should include `year` and `semester` via `EXPORT_CONST.defaultFilename`.

## Accessibility & i18n
- Content is Thai-first. Preserve Thai labels and sorting rules where visible.
- Maintain ARIA roles and keyboard focus for tabs, dialogs, and loading states.

## Performance
- Favor lazy loading: dynamically import page modules on demand if adding new pages.
- Use template cache; avoid redundant fetches. Respect existing cache TTL in `dataService`.
- Avoid adding large dependencies.

## Change Management — Do / Don’t
- Do: Keep changes surgical; update relevant docs; match existing patterns.
- Do: Add small helper functions or constants if they simplify repeated logic.
- Don’t: Rename files, restructure folders, or introduce build steps unless requested.
- Don’t: Remove mock data without providing an API-backed equivalent and clear toggles.

## Testing & Debugging
- Start with `scripts/dev.ps1`. Watch browser console for errors (module imports, CORS, fetch).
- Validate `GET /api/health` before testing auth flows.
- Prefer targeted checks where you changed code; do not run expensive global scans.

## Agent Workflow (for Codex sessions)
- Communicate briefly what you’re about to do; group related actions.
- Use `apply_patch` for edits; don’t commit unless asked.
- Use `update_plan` for multi-step work; keep it concise with one in-progress item.
- Respect sandbox: network is restricted; ask for approval to run commands that need it.
- Read files in chunks (<= 250 lines) when inspecting.

## Small Roadmap Hints
- Low risk: add read-only API endpoints for academic years/semesters and wire client with fallback.
- Medium: standardize error display and loading/empty states across pages.
- Later: PDF export and analytics; only if explicitly requested.

*This file is for agents; human contributors may follow it as style/reference as well.*

