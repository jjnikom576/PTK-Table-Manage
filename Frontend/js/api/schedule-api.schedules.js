import apiManager from './core/api-manager.js';

export function registerScheduleMethods(ScheduleAPI) {
  /**
   * SCHEDULES API
   */
  ScheduleAPI.prototype.getSchedules = async function(year, semesterId = null) {
    if (semesterId == null || semesterId === '') {
      console.warn(`[ScheduleAPI] getSchedules called without semesterId for year ${year}, returning empty result`);
      return {
        success: true,
        data: []
      };
    }

    const cacheKey = `schedules_${year}_${semesterId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)
      };
    }

    try {
      let endpoint = this.getYearEndpoint('schedules', year);
      endpoint += `?semester_id=${encodeURIComponent(semesterId)}`;

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
  };

  ScheduleAPI.prototype.createSchedule = async function(year, scheduleData) {
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
  };

  ScheduleAPI.prototype.updateSchedule = async function(year, scheduleId, updateData) {
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
  };

  ScheduleAPI.prototype.deleteSchedule = async function(year, scheduleId) {
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
  };

  /**
   * SCHEDULE VALIDATION
   */
  ScheduleAPI.prototype.validateSchedule = async function(year, scheduleData) {
    try {
      const result = await apiManager.post(`${this.getYearEndpoint('schedules', year)}/validate?year=${encodeURIComponent(year)}`, scheduleData);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถตรวจสอบความถูกต้องของตารางสอนได้'
      };
    }
  };

  /**
   * BULK OPERATIONS
   */
  ScheduleAPI.prototype.bulkCreateSchedules = async function(year, schedulesData) {
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
  };

  ScheduleAPI.prototype.bulkDeleteSchedules = async function(year, scheduleIds) {
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
  };

  /**
   * UTILITY METHODS
   */
  ScheduleAPI.prototype.getTeacherSchedule = async function(year, teacherId, semesterId = null) {
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
  };

  ScheduleAPI.prototype.getClassSchedule = async function(year, classId, semesterId = null) {
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
  };

  ScheduleAPI.prototype.getRoomSchedule = async function(year, roomId, semesterId = null) {
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
  };
}
