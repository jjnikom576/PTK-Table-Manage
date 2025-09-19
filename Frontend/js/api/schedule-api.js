/**
 * Schedule API Module
 * Handles Teachers, Classes, Rooms, Subjects, and Schedules management
 */

import apiManager from './core/api-manager.js';

class ScheduleAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3 * 60 * 1000; // 3 minutes
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

      return result;
    } catch (error) {
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
   * SUBJECTS API
   */
  async getSubjects(year, semesterId) {
    const cacheKey = `subjects_${year}_${semesterId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)
      };
    }

    try {
      const endpoint = `${this.getYearEndpoint('subjects', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.get(endpoint);
      
      if (result.success) {
        this.cache.set(cacheKey, result.data);
        this.updateCacheTimestamp(cacheKey);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `ไม่สามารถโหลดข้อมูลวิชาเรียนปี ${year} ได้`
      };
    }
  }

  async createSubject(year, semesterId, subjectData) {
    try {
      const endpoint = `${this.getYearEndpoint('subjects', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.post(endpoint, {
        subject_code: subjectData.subject_code,
        subject_name: subjectData.subject_name,
        subject_group: subjectData.subject_group,
        credit_hours: subjectData.credit_hours || 0,
        description: subjectData.description || '',
        subject_constraints: subjectData.subject_constraints || null
      });

      if (result.success) {
        this.invalidateCache(`subjects_${year}_${semesterId}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มวิชาเรียนใหม่ได้'
      };
    }
  }

  async updateSubject(year, subjectId, updateData) {
    try {
      const result = await apiManager.put(`${this.getYearEndpoint('subjects', year)}/${subjectId}`, updateData);

      if (result.success) {
        this.invalidateCache(`subjects_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตข้อมูลวิชาเรียนได้'
      };
    }
  }

  async deleteSubject(year, subjectId) {
    try {
      const result = await apiManager.delete(`${this.getYearEndpoint('subjects', year)}/${subjectId}`);

      if (result.success) {
        this.invalidateCache(`subjects_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบวิชาเรียนได้'
      };
    }
  }

  /**
   * SCHEDULES API
   */
  async getSchedules(year, semesterId = null) {
    const cacheKey = semesterId ? `schedules_${year}_${semesterId}` : `schedules_${year}`;
    
    if (this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)
      };
    }

    try {
      let endpoint = this.getYearEndpoint('schedules', year);
      if (semesterId) {
        endpoint += `?semester_id=${semesterId}`;
      }

      const result = await apiManager.get(endpoint);
      
      if (result.success) {
        this.cache.set(cacheKey, result.data);
        this.updateCacheTimestamp(cacheKey);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `ไม่สามารถโหลดข้อมูลตารางสอนปี ${year} ได้`
      };
    }
  }

  async createSchedule(year, scheduleData) {
    try {
      const result = await apiManager.post(`${this.getYearEndpoint('schedules', year)}?year=${encodeURIComponent(year)}`, {
        semester_id: scheduleData.semester_id,
        class_id: scheduleData.class_id,
        subject_id: scheduleData.subject_id,
        teacher_id: scheduleData.teacher_id,
        room_id: scheduleData.room_id,
        day_of_week: scheduleData.day_of_week,
        period_number: scheduleData.period_number,
        start_time: scheduleData.start_time,
        end_time: scheduleData.end_time
      });

      if (result.success) {
        // Invalidate related caches
        this.invalidateCacheByPattern(`schedules_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มตารางสอนใหม่ได้'
      };
    }
  }

  async updateSchedule(year, scheduleId, updateData) {
    try {
      const result = await apiManager.put(`${this.getYearEndpoint('schedules', year)}/${scheduleId}?year=${encodeURIComponent(year)}`, updateData);

      if (result.success) {
        // Invalidate related caches
        this.invalidateCacheByPattern(`schedules_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตตารางสอนได้'
      };
    }
  }

  async deleteSchedule(year, scheduleId) {
    try {
      const result = await apiManager.delete(`${this.getYearEndpoint('schedules', year)}/${scheduleId}?year=${encodeURIComponent(year)}`);

      if (result.success) {
        // Invalidate related caches
        this.invalidateCacheByPattern(`schedules_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบตารางสอนได้'
      };
    }
  }

  /**
   * SCHEDULE VALIDATION
   */
  async validateSchedule(year, scheduleData) {
    try {
      const result = await apiManager.post(`${this.getYearEndpoint('schedules', year)}/validate?year=${encodeURIComponent(year)}`, scheduleData);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถตรวจสอบความถูกต้องของตารางสอนได้'
      };
    }
  }

  /**
   * BULK OPERATIONS
   */
  async bulkCreateSchedules(year, schedulesData) {
    try {
      const result = await apiManager.post(`${this.getYearEndpoint('schedules', year)}/bulk?year=${encodeURIComponent(year)}`, {
        schedules: schedulesData
      });

      if (result.success) {
        this.invalidateCacheByPattern(`schedules_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มตารางสอนจำนวนมากได้'
      };
    }
  }

  async bulkDeleteSchedules(year, scheduleIds) {
    try {
      const result = await apiManager.delete(`${this.getYearEndpoint('schedules', year)}/bulk?year=${encodeURIComponent(year)}`, {
        ids: scheduleIds
      });

      if (result.success) {
        this.invalidateCacheByPattern(`schedules_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบตารางสอนจำนวนมากได้'
      };
    }
  }

  /**
   * UTILITY METHODS
   */
  async getTeacherSchedule(year, teacherId, semesterId = null) {
    try {
      let endpoint = `${this.getYearEndpoint('teachers', year)}/${teacherId}/schedules`;
      if (semesterId) {
        endpoint += `?semester_id=${semesterId}`;
      }

      const result = await apiManager.get(endpoint);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดตารางสอนครูได้'
      };
    }
  }

  async getClassSchedule(year, classId, semesterId = null) {
    try {
      let endpoint = `${this.getYearEndpoint('classes', year)}/${classId}/schedules`;
      if (semesterId) {
        endpoint += `?semester_id=${semesterId}`;
      }

      const result = await apiManager.get(endpoint);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดตารางเรียนชั้นเรียนได้'
      };
    }
  }

  async getRoomSchedule(year, roomId, semesterId = null) {
    try {
      let endpoint = `${this.getYearEndpoint('rooms', year)}/${roomId}/schedules`;
      if (semesterId) {
        endpoint += `?semester_id=${semesterId}`;
      }

      const result = await apiManager.get(endpoint);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดตารางใช้ห้องเรียนได้'
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

  /**
   * YEAR MIGRATION UTILITIES
   */
  async migrateYearData(fromYear, toYear, entities = ['teachers', 'classes', 'rooms', 'subjects']) {
    try {
      const result = await apiManager.post('migrate', {
        from_year: fromYear,
        to_year: toYear,
        entities: entities
      });

      if (result.success) {
        // Invalidate cache for target year
        entities.forEach(entity => {
          this.invalidateCache(`${entity}_${toYear}`);
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถย้ายข้อมูลระหว่างปีได้'
      };
    }
  }
}

// Export singleton instance
const scheduleAPI = new ScheduleAPI();
export default scheduleAPI;
