/**
 * Schedule API Module
 * Handles Teachers, Classes, Rooms, Subjects, and Schedules management
 */

import apiManager from './core/api-manager.js';
import { registerScheduleMethods } from './schedule-api.schedules.js';
import { registerSubstitutionMethods } from './schedule-api.substitutions.js';
import { registerMigrationMethods } from './schedule-api.migration.js';
import { registerSubjectMethods } from './schedule-api.subjects.js';

class ScheduleAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3 * 60 * 1000; // 3 minutes
    this.periodsUnauthorizedUntil = 0;
  }

  /**
   * Generate year-based endpoint
   */
  getYearEndpoint(entity, year) {
    // Use backend's correct endpoint format
    return `schedule/${entity}`;
  }

  /**
   * TEACHERS API
   */
  async getTeachers(year, semesterId) {
    const cacheKey = `teachers_${year}_${semesterId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)
      };
    }

    try {
      const endpoint = `${this.getYearEndpoint('teachers', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.get(endpoint);
      
      if (result.success) {
        this.cache.set(cacheKey, result.data);
        this.updateCacheTimestamp(cacheKey);
        this.periodsUnauthorizedUntil = 0;
        this.periodsUnauthorizedUntil = 0;
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `ไม่สามารถโหลดข้อมูลครูปี ${year} ได้`
      };
    }
  }

  async createTeacher(year, semesterId, teacherData) {
    try {
      const endpoint = `${this.getYearEndpoint('teachers', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.post(endpoint, {
        title: teacherData.title,
        f_name: teacherData.f_name,
        l_name: teacherData.l_name,
        email: teacherData.email,
        phone: teacherData.phone,
        subject_group: teacherData.subject_group,
        role: teacherData.role || 'teacher'
      });

      if (result.success) {
        this.invalidateCache(`teachers_${year}_${semesterId}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มครูใหม่ได้'
      };
    }
  }

  async updateTeacher(year, teacherId, updateData) {
    try {
      const result = await apiManager.put(`${this.getYearEndpoint('teachers', year)}/${teacherId}?year=${encodeURIComponent(year)}`, updateData);

      if (result.success) {
        // แก้ไข: Invalidate cache ที่มีรูปแบบถูกต้อง
        this.invalidateCacheByPattern(`teachers_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตข้อมูลครูได้'
      };
    }
  }

  async deleteTeacher(year, teacherId) {
    try {
      const result = await apiManager.delete(`${this.getYearEndpoint('teachers', year)}/${teacherId}?year=${encodeURIComponent(year)}`);

      if (result.success) {
        this.invalidateCacheByPattern(`teachers_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบครูได้'
      };
    }
  }

  /**
   * CLASSES API
   */
  async getClasses(year, semesterId) {
    const cacheKey = `classes_${year}_${semesterId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)
      };
    }

    try {
      const endpoint = `${this.getYearEndpoint('classes', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.get(endpoint);
      
      if (result.success) {
        this.cache.set(cacheKey, result.data);
        this.updateCacheTimestamp(cacheKey);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `ไม่สามารถโหลดข้อมูลชั้นเรียนปี ${year} ได้`
      };
    }
  }

  async createClass(year, semesterId, classData = {}) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('classes', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const section = Number(classData.section);
      const payload = {
        grade_level: classData.grade_level,
        section: Number.isInteger(section) ? section : classData.section,
        semester_id: classData.semester_id || semesterId
      };

      const result = await apiManager.post(endpoint, payload);

      if (result.success) {
        this.invalidateCache(`classes_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`classes_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มชั้นเรียนใหม่ได้'
      };
    }
  }

  async updateClass(year, semesterId, classId, updateData = {}) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('classes', year)}/${classId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.put(endpoint, updateData);

      if (result.success) {
        this.invalidateCache(`classes_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`classes_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตข้อมูลชั้นเรียนได้'
      };
    }
  }

  async deleteClass(year, semesterId, classId) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('classes', year)}/${classId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.delete(endpoint);

      if (result.success) {
        this.invalidateCache(`classes_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`classes_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบชั้นเรียนได้'
      };
    }
  }

  /**
   * ROOMS API
   */
  async getRooms(year, semesterId) {
    const cacheKey = `rooms_${year}_${semesterId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)
      };
    }

    try {
      const endpoint = `${this.getYearEndpoint('rooms', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.get(endpoint);
      
      if (result.success) {
        this.cache.set(cacheKey, result.data);
        this.updateCacheTimestamp(cacheKey);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `ไม่สามารถโหลดข้อมูลห้องเรียนปี ${year} ได้`
      };
    }
  }

  async createRoom(year, semesterId, roomData = {}) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('rooms', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.post(endpoint, {
        room_name: roomData.room_name,
        room_type: roomData.room_type || 'ทั่วไป',
        semester_id: roomData.semester_id || semesterId
      });

      if (result.success) {
        this.invalidateCache(`rooms_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`rooms_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มห้องเรียนใหม่ได้'
      };
    }
  }

  async updateRoom(year, semesterId, roomId, updateData = {}) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('rooms', year)}/${roomId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.put(endpoint, updateData);

      if (result.success) {
        this.invalidateCache(`rooms_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`rooms_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตข้อมูลห้องเรียนได้'
      };
    }
  }

  async deleteRoom(year, semesterId, roomId) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('rooms', year)}/${roomId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.delete(endpoint);

      if (result.success) {
        this.invalidateCache(`rooms_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`rooms_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบห้องเรียนได้'
      };
    }
  }

  /**
   * PERIODS API
   */
  async getPeriods(year, semesterId) {
    const cacheKey = `periods_${year}_${semesterId}`;

    const now = Date.now();
    if (this.periodsUnauthorizedUntil && now < this.periodsUnauthorizedUntil) {
      return {
        success: true,
        data: [],
        fallback: true,
        reason: 'unauthorized-cache',
        status: 401
      };
    }

    if (this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)
      };
    }

    try {
      const endpoint = `${this.getYearEndpoint('periods', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.get(endpoint);

      if (result.success) {
        this.cache.set(cacheKey, result.data);
        this.updateCacheTimestamp(cacheKey);
      }
      if (!result.success && result.status === 401) {
        this.periodsUnauthorizedUntil = Date.now() + this.cacheTimeout;
      }

      return result;
    } catch (error) {
      this.periodsUnauthorizedUntil = 0;
      return {
        success: false,
        error: `ไม่สามารถโหลดข้อมูลคาบเรียนปี ${year} ได้`
      };
    }
  }

  async createPeriod(year, semesterId, periodData = {}) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('periods', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.post(endpoint, {
        semester_id: periodData.semester_id || semesterId,
        period_no: periodData.period_no,
        period_name: periodData.period_name,
        start_time: periodData.start_time,
        end_time: periodData.end_time
      });

      if (result.success) {
        this.invalidateCache(`periods_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`periods_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มคาบเรียนใหม่ได้'
      };
    }
  }

  async updatePeriod(year, semesterId, periodId, updateData = {}) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('periods', year)}/${periodId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.put(endpoint, updateData);

      if (result.success) {
        this.invalidateCache(`periods_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`periods_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตข้อมูลคาบเรียนได้'
      };
    }
  }

  async deletePeriod(year, semesterId, periodId) {
    try {
      if (!semesterId) {
        return {
          success: false,
          error: 'ไม่พบภาคเรียนที่ใช้งานอยู่'
        };
      }

      const endpoint = `${this.getYearEndpoint('periods', year)}/${periodId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.delete(endpoint);

      if (result.success) {
        this.invalidateCache(`periods_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`periods_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบคาบเรียนได้'
      };
    }
  }

  /**
   * CACHE MANAGEMENT
   */
  isCacheValid(key) {
    const data = this.cache.get(key);
    if (!data || !data._timestamp) return false;
    
    return (Date.now() - data._timestamp) < this.cacheTimeout;
  }

  updateCacheTimestamp(key) {
    const data = this.cache.get(key);
    if (data) {
      data._timestamp = Date.now();
    }
  }

  invalidateCache(key) {
    this.cache.delete(key);
  }

  invalidateCacheByPattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clearAllCache() {
    this.cache.clear();
  }

}

registerSubjectMethods(ScheduleAPI);
registerScheduleMethods(ScheduleAPI);
registerSubstitutionMethods(ScheduleAPI);
registerMigrationMethods(ScheduleAPI);

// Export singleton instance
const scheduleAPI = new ScheduleAPI();
export default scheduleAPI;
