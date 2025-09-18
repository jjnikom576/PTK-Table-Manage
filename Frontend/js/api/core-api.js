/**
 * Core API Module
 * Handles Academic Years and Semesters management
 */

import apiManager from './core/api-manager.js';

class CoreAPI {
  constructor() {
    this.cache = {
      academicYears: null,
      semesters: new Map(), // Map by year
      lastFetch: new Map()
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all academic years
   */
  async getAcademicYears(useCache = true) {
    const cacheKey = 'academicYears';
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.academicYears
      };
    }

    try {
      const result = await apiManager.get('core/academic-years');
      
      if (result.success) {
        this.cache.academicYears = result.data;
        this.cache.lastFetch.set(cacheKey, Date.now());
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดข้อมูลปีการศึกษาได้'
      };
    }
  }

  /**
   * Create new academic year
   */
  async createAcademicYear(yearData) {
    try {
      const result = await apiManager.post('academic-years', {
        year: yearData.year,
        name: yearData.name,
        start_date: yearData.start_date,
        end_date: yearData.end_date,
        is_active: yearData.is_active || false
      });

      if (result.success) {
        // Invalidate cache
        this.invalidateCache('academicYears');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถสร้างปีการศึกษาใหม่ได้'
      };
    }
  }

  /**
   * Update academic year
   */
  async updateAcademicYear(year, updateData) {
    try {
      const result = await apiManager.put(`academic-years/${year}`, updateData);

      if (result.success) {
        // Invalidate cache
        this.invalidateCache('academicYears');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตปีการศึกษาได้'
      };
    }
  }

  /**
   * Delete academic year
   */
  async deleteAcademicYear(year) {
    try {
      const result = await apiManager.delete(`academic-years/${year}`);

      if (result.success) {
        // Invalidate cache
        this.invalidateCache('academicYears');
        this.invalidateCache(`semesters_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบปีการศึกษาได้'
      };
    }
  }

  /**
   * Set active academic year
   */
  async setActiveAcademicYear(year) {
    try {
      const result = await apiManager.post(`academic-years/${year}/activate`);

      if (result.success) {
        // Invalidate cache to reflect new active status
        this.invalidateCache('academicYears');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถกำหนดปีการศึกษาที่ใช้งานได้'
      };
    }
  }

  /**
   * Get semesters for a specific year
   */
  async getSemesters(year, useCache = true) {
    const cacheKey = `semesters_${year}`;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.semesters.get(year)
      };
    }

    try {
      const result = await apiManager.get(`core/academic-years/${year}/semesters`);
      
      if (result.success) {
        this.cache.semesters.set(year, result.data);
        this.cache.lastFetch.set(cacheKey, Date.now());
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `ไม่สามารถโหลดข้อมูลภาคเรียนปี ${year} ได้`
      };
    }
  }

  /**
   * Create new semester
   */
  async createSemester(year, semesterData) {
    try {
      const result = await apiManager.post(`semesters/${year}`, {
        semester_number: semesterData.semester_number,
        name: semesterData.name,
        start_date: semesterData.start_date,
        end_date: semesterData.end_date,
        is_active: semesterData.is_active || false
      });

      if (result.success) {
        // Invalidate cache
        this.invalidateCache(`semesters_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถสร้างภาคเรียนใหม่ได้'
      };
    }
  }

  /**
   * Update semester
   */
  async updateSemester(year, semesterId, updateData) {
    try {
      const result = await apiManager.put(`semesters/${year}/${semesterId}`, updateData);

      if (result.success) {
        // Invalidate cache
        this.invalidateCache(`semesters_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตภาคเรียนได้'
      };
    }
  }

  /**
   * Delete semester
   */
  async deleteSemester(year, semesterId) {
    try {
      const result = await apiManager.delete(`semesters/${year}/${semesterId}`);

      if (result.success) {
        // Invalidate cache
        this.invalidateCache(`semesters_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบภาคเรียนได้'
      };
    }
  }

  /**
   * Set active semester
   */
  async setActiveSemester(year, semesterId) {
    try {
      const result = await apiManager.post(`semesters/${year}/${semesterId}/activate`);

      if (result.success) {
        // Invalidate cache to reflect new active status
        this.invalidateCache(`semesters_${year}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถกำหนดภาคเรียนที่ใช้งานได้'
      };
    }
  }

  /**
   * Get global context (current active year and semester)
   */
  async getGlobalContext() {
    try {
      const result = await apiManager.get('core/context');
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดข้อมูล Context ได้'
      };
    }
  }

  /**
   * Get current schedule/timetable for active context
   */
  async getCurrentSchedule() {
    try {
      const result = await apiManager.get('schedule/timetable');
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดตารางสอนได้',
        data: null
      };
    }
  }

  /**
   * Check if year tables exist
   */
  async checkYearTables(year) {
    try {
      const result = await apiManager.get(`core/tables-status/${year}`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถตรวจสอบสถานะปีการศึกษาได้',
        data: {
          teachers: false,
          classes: false,
          rooms: false,
          subjects: false,
          schedules: false
        }
      };
    }
  }

  /**
   * Set global context
   */
  async setGlobalContext(year, semesterId) {
    try {
      const result = await apiManager.post('context', {
        year: year,
        semester_id: semesterId
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถกำหนด Context ได้'
      };
    }
  }

  /**
   * Get periods configuration
   */
  async getPeriods() {
    try {
      const result = await apiManager.get('periods');
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดข้อมูลคาบเรียนได้'
      };
    }
  }

  /**
   * Create new period
   */
  async createPeriod(periodData) {
    try {
      const result = await apiManager.post('periods', {
        period_number: periodData.period_number,
        name: periodData.name,
        start_time: periodData.start_time,
        end_time: periodData.end_time,
        day_of_week: periodData.day_of_week
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถสร้างคาบเรียนใหม่ได้'
      };
    }
  }

  /**
   * Update period
   */
  async updatePeriod(periodId, updateData) {
    try {
      const result = await apiManager.put(`periods/${periodId}`, updateData);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตคาบเรียนได้'
      };
    }
  }

  /**
   * Delete period
   */
  async deletePeriod(periodId) {
    try {
      const result = await apiManager.delete(`periods/${periodId}`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบคาบเรียนได้'
      };
    }
  }

  /**
   * Cache management helpers
   */
  isCacheValid(key) {
    const lastFetch = this.cache.lastFetch.get(key);
    if (!lastFetch) return false;
    
    return (Date.now() - lastFetch) < this.cacheTimeout;
  }

  invalidateCache(key) {
    if (key === 'academicYears') {
      this.cache.academicYears = null;
    } else if (key.startsWith('semesters_')) {
      const year = key.replace('semesters_', '');
      this.cache.semesters.delete(year);
    }
    
    this.cache.lastFetch.delete(key);
  }

  clearAllCache() {
    this.cache.academicYears = null;
    this.cache.semesters.clear();
    this.cache.lastFetch.clear();
  }

  /**
   * Utility: Get academic year options for dropdowns
   */
  async getAcademicYearOptions() {
    const result = await this.getAcademicYears();
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.map(year => ({
          value: year.year,
          label: year.name || `ปีการศึกษา ${year.year}`,
          isActive: year.is_active
        }))
      };
    }

    return result;
  }

  /**
   * Utility: Get semester options for dropdowns
   */
  async getSemesterOptions(year) {
    const result = await this.getSemesters(year);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.map(semester => ({
          value: semester.id,
          label: semester.name || `ภาคเรียนที่ ${semester.semester_number}`,
          semesterNumber: semester.semester_number,
          isActive: semester.is_active
        }))
      };
    }

    return result;
  }
}

// Export singleton instance
const coreAPI = new CoreAPI();
export default coreAPI;
