import apiManager from './core/api-manager.js';

export function registerSubstitutionMethods(ScheduleAPI) {
  /**
   * SUBSTITUTION MANAGEMENT API
   */
  ScheduleAPI.prototype.getSubstitutionStats = async function() {
    try {
      const result = await apiManager.get('schedule/substitutions/stats');
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดสถิติการสอนแทนได้'
      };
    }
  };

  ScheduleAPI.prototype.createSubstitutions = async function(date, absentTeachers, force = false) {
    try {
      const endpoint = force ? 'schedule/substitutions?force=true' : 'schedule/substitutions';
      const result = await apiManager.post(endpoint, {
        date: date,
        absentTeachers: absentTeachers
      });

      if (result.success) {
        // Invalidate substitution stats cache if exists
        this.invalidateCacheByPattern('substitutions_');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถบันทึกการสอนแทนได้'
      };
    }
  };

  ScheduleAPI.prototype.getHallOfFame = async function() {
    try {
      const result = await apiManager.get('schedule/substitutions/hall-of-fame');
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดข้อมูล Hall of Fame ได้'
      };
    }
  };

  ScheduleAPI.prototype.getTeacherSubstitutions = async function(teacherId) {
    try {
      const result = await apiManager.get(`schedule/substitutions/teacher/${teacherId}`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดข้อมูลการสอนแทนของครูได้'
      };
    }
  };

  ScheduleAPI.prototype.getSubstitutionDetails = async function(teacherId, date) {
    try {
      const result = await apiManager.get(`schedule/substitutions/teacher/${teacherId}/date/${date}`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดรายละเอียดการสอนแทนได้'
      };
    }
  };

  ScheduleAPI.prototype.getSubstitutionsByDate = async function(date) {
    try {
      const result = await apiManager.get(`schedule/substitutions/date/${date}`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดข้อมูลการสอนแทนตามวันที่ได้'
      };
    }
  };
}
