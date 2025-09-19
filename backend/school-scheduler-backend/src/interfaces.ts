// src/interfaces.ts
// Environment interface สำหรับ Cloudflare Workers
export interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
  ADMIN_DEFAULT_PASSWORD?: string;
  ADMIN_REGISTER_SECRET?: string;
}

// ===========================================
// Core Database Entities
// ===========================================

// Academic Year Entity
export interface AcademicYear {
  id?: number;
  year: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// Semester Entity  
export interface Semester {
  id?: number;
  semester_name: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// Period Entity (per year)
export interface Period {
  id?: number;
  semester_id: number;
  period_no: number;
  period_name: string;
  start_time: string; // TIME format
  end_time: string; // TIME format
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// ===========================================
// Dynamic Table Entities (per year)
// ===========================================

// Teacher Entity (per year)
export interface Teacher {
  id?: number;
  semester_id: number;
  title?: 'นาย' | 'นาง' | 'นางสาว';
  f_name: string;
  l_name: string;
  full_name?: string; // Generated column
  email?: string;
  phone?: string;
  subject_group: string;
  role: 'teacher' | 'head_of_department' | 'vice_principal' | 'principal';
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// Class Entity (per year)
export interface Class {
  id?: number;
  semester_id: number;
  grade_level: string;
  section: number;
  class_name?: string; // Generated column
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// Room Entity (per year)
export interface Room {
  id?: number;
  semester_id: number;
  room_name: string;
  room_type: 'ทั่วไป' | 'ปฏิบัติการคอมพิวเตอร์';
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// Subject Entity (per year) - Junction table
export interface Subject {
  id?: number;
  semester_id: number;
  teacher_id: number;
  class_id: number;
  subject_name: string;
  subject_code?: string;
  periods_per_week: number;
  default_room_id?: number;
  special_requirements?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

// Schedule Entity (per year) - Final timetable
export interface Schedule {
  id?: number;
  semester_id: number;
  subject_id: number;
  day_of_week: number; // 1-7
  period_no: number;
  room_id?: number;
  created_at?: string;
  updated_at?: string;
}

// ===========================================
// Admin Authentication
// ===========================================

// Admin User Entity
export interface AdminUser {
  id?: number;
  username: string;
  password_hash: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'super_admin';
  is_active: number;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

// Admin Session Entity
export interface AdminSession {
  id?: number;
  admin_user_id: number;
  session_token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// Admin Activity Log Entity
export interface AdminActivityLog {
  id?: number;
  admin_user_id: number;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: string; // JSON string
  new_values?: string; // JSON string
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// ===========================================
// Request/Response Types
// ===========================================

// Authentication Requests
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  session_token?: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    email?: string;
    role: string;
  };
  error?: string;
}

// Global Context
export interface GlobalContext {
  academic_year?: AcademicYear;
  semester?: Semester;
}

// API Response Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===========================================
// CRUD Request Types
// ===========================================

// Academic Year Requests
export interface CreateAcademicYearRequest {
  year: number;
}

export interface CreateSemesterRequest {
  semester_name: string;
}

// Dynamic table requests (year-specific)
export interface CreateTeacherRequest {
  semester_id: number;
  title?: 'นาย' | 'นาง' | 'นางสาว';
  f_name: string;
  l_name: string;
  email?: string;
  phone?: string;
  subject_group: string;
  role?: 'teacher' | 'head_of_department' | 'vice_principal' | 'principal';
}

export interface CreateClassRequest {
  semester_id: number;
  grade_level: string;
  section: number;
}

export interface CreateRoomRequest {
  semester_id: number;
  room_name: string;
  room_type: 'ทั่วไป' | 'ปฏิบัติการคอมพิวเตอร์';
}

export interface CreatePeriodRequest {
  semester_id: number;
  period_no: number;
  period_name: string;
  start_time: string;
  end_time: string;
}

export interface CreateSubjectRequest {
  semester_id: number;
  teacher_id: number;
  class_id: number;
  subject_name: string;
  subject_code?: string;
  periods_per_week: number;
  default_room_id?: number;
  special_requirements?: string;
}

export interface CreateScheduleRequest {
  semester_id: number;
  subject_id: number;
  day_of_week: number;
  period_no: number;
  room_id?: number;
}

// ===========================================
// Utility Types
// ===========================================

// Table existence check
export interface TableExistenceCheck {
  exists: boolean;
  tableName: string;
}

// Dynamic table management
export interface DynamicTableInfo {
  year: number;
  tables: string[];
  created: boolean;
}

// Database operation result
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  affectedRows?: number;
}
