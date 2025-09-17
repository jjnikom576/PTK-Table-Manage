-- ============================================
-- SQLite Initial Setup - Tables & Data
-- ============================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ======================================
-- 1. ADMIN AUTHENTICATION TABLES
-- ======================================

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- ======================================
-- 2. ACADEMIC SYSTEM FIXED TABLES
-- ======================================

-- Academic Years Table
CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Semesters Table
CREATE TABLE IF NOT EXISTS semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER NOT NULL,
  semester_number INTEGER NOT NULL CHECK (semester_number IN (1,2,3)),
  semester_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  UNIQUE (academic_year_id, semester_number)
);

-- Periods Table (คาบเวลา)
CREATE TABLE IF NOT EXISTS periods (
  period_no INTEGER PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- ======================================
-- 3. INDEXES (สำหรับ Performance)
-- ======================================

-- Admin Tables Indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_user ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_log(created_at);

-- Academic Tables Indexes
CREATE INDEX IF NOT EXISTS idx_semesters_year_active ON semesters(academic_year_id, is_active);
CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active);

-- ======================================
-- 4. INITIAL DATA (ข้อมูลเบื้องต้น)
-- ======================================

-- Default Admin User
-- รหัสผ่าน: admin123 (ต้องเปลี่ยนทันที!)
-- Hash: bcrypt ของ 'admin123'
INSERT OR IGNORE INTO admin_users (username, password_hash, full_name, email, role) VALUES
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ', 'admin@school.ac.th', 'super_admin');

-- Periods (คาบเวลา) - ตาม mock data ที่มีอยู่
INSERT OR IGNORE INTO periods(period_no, start_time, end_time) VALUES
(1, '08:40', '09:30'),  -- คาบ 1
(2, '09:30', '10:20'),  -- คาบ 2
(3, '10:20', '11:10'),  -- คาบ 3
(4, '11:10', '12:00'),  -- คาบ 4
-- พักเที่ยง 12:00-13:00
(5, '13:00', '13:50'),  -- คาบ 5
(6, '13:50', '14:40'),  -- คาบ 6
(7, '14:40', '15:30'),  -- คาบ 7
(8, '15:30', '16:20');  -- คาบ 8

-- Sample Academic Years (ตัวอย่าง)
INSERT OR IGNORE INTO academic_years (year, start_date, end_date, is_active) VALUES
(2566, '2023-05-15', '2024-02-29', 0),  -- ปีที่แล้ว
(2567, '2024-05-15', '2025-02-28', 1),  -- ปีปัจจุบัน (active)
(2568, '2025-05-15', '2026-02-28', 0);  -- ปีหน้า

-- Sample Semesters for 2567 (ปีปัจจุบัน)
INSERT OR IGNORE INTO semesters (academic_year_id, semester_number, semester_name, start_date, end_date, is_active) 
SELECT 
  ay.id,
  1,
  'ภาคเรียนที่ 1',
  '2024-05-15',
  '2024-09-30',
  1  -- ภาคปัจจุบัน active
FROM academic_years ay WHERE ay.year = 2567;

INSERT OR IGNORE INTO semesters (academic_year_id, semester_number, semester_name, start_date, end_date, is_active) 
SELECT 
  ay.id,
  2,
  'ภาคเรียนที่ 2',
  '2024-10-01',
  '2025-02-28',
  0  -- ยังไม่เปิด
FROM academic_years ay WHERE ay.year = 2567;

-- ======================================
-- 5. VERIFICATION QUERIES (ตรวจสอบ)
-- ======================================

-- ตรวจสอบข้อมูลที่สร้างแล้ว
SELECT 'Admin Users Created:' as check_result;
SELECT username, full_name, role, is_active FROM admin_users;

SELECT 'Academic Years Created:' as check_result;
SELECT year, start_date, end_date, is_active FROM academic_years;

SELECT 'Semesters Created:' as check_result;
SELECT s.semester_name, s.start_date, s.end_date, s.is_active, ay.year 
FROM semesters s 
JOIN academic_years ay ON ay.id = s.academic_year_id;

SELECT 'Periods Created:' as check_result;
SELECT period_no, start_time, end_time FROM periods ORDER BY period_no;

SELECT 'Tables Created:' as check_result;
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
