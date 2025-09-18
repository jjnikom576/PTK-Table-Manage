/**
 * Core API Module
 * Handles Academic Years and Semesters management
 */

import apiManager from './core/api-manager.js';

class CoreAPI {
  constructor() {
    this.cache = {
      academicYears: null,
      semesters: null, // Global semesters
      lastFetch: new Map()
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Single-timetable cache (only keep latest selection)
    this.timetableCache = { key: null, data: null, ts: 0 };
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
  async createAcademicYear(year) {
    try {
      const result = await apiManager.post('core/academic-years', {
        year: year
      });
      
      if (result.success) {
        // Clear cache to force refresh
        this.cache.academicYears = null;
        this.cache.lastFetch.delete('academicYears');
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มปีการศึกษาได้'
      };
    }
  }

  /**
   * Delete academic year (NEW)
   */
  async deleteAcademicYear(yearId) {
    try {
      const result = await apiManager.delete(`core/academic-years/${yearId}`);
      
      if (result.success) {
        // Clear cache to force refresh
        this.cache.academicYears = null;
        this.cache.lastFetch.delete('academicYears');
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
   * Get semesters for a specific year
   */
  async getSemesters(useCache = true) {
    const cacheKey = 'semesters';
    if (useCache && this.isCacheValid(cacheKey) && Array.isArray(this.cache.semesters)) {
      return { success: true, data: this.cache.semesters };
    }
    try {
      const result = await apiManager.get('core/semesters');
      if (result.success) {
        this.cache.semesters = result.data;
        this.cache.lastFetch.set(cacheKey, Date.now());
      }
      return result;
    } catch (error) {
      return { success: false, error: 'ไม่สามารถโหลดข้อมูลภาคเรียนได้' };
    }
  }

  /**
   * Create new semester
   */
  async createSemester({ semester_name, name }) {
    try {
      const payload = { semester_name: semester_name || name };
      const result = await apiManager.post('core/semesters', payload);
      if (result.success) {
        this.cache.semesters = null;
        this.cache.lastFetch.delete('semesters');
      }
      return result;
    } catch (error) {
      return { success: false, error: 'ไม่สามารถเพิ่มภาคเรียนได้' };
    }
  }

  /**
   * Get global context (active year/semester)
   */
  async getGlobalContext() {
    try {
      const result = await apiManager.get('core/context');
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดข้อมูล context ได้'
      };
    }
  }

  /**
   * Set active academic year
   */
  async setActiveAcademicYear(year) {
    try {
      // Find yearId from year
      const yearsData = await this.getAcademicYears();
      if (!yearsData.success) {
        return yearsData;
      }
      
      const yearData = yearsData.data.find(y => y.year === year);
      if (!yearData) {
        return {
          success: false,
          error: `ไม่พบปีการศึกษา ${year}`
        };
      }
      
      const result = await apiManager.put(`core/academic-years/${yearData.id}/activate`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถกำหนดปีการศึกษาใช้งานได้'
      };
    }
  }

  /**
   * Set active semester
   */
  async setActiveSemester(semesterId) {
    try {
      const result = await apiManager.put(`core/semesters/${semesterId}/activate`);
      return result;
    } catch (error) {
      return { success: false, error: 'ไม่สามารถกำหนดภาคเรียนใช้งานได้' };
    }
  }

  async deleteSemester(semesterId) {
    try {
      const result = await apiManager.delete(`core/semesters/${semesterId}`);
      if (result.success) {
        this.cache.semesters = null;
        this.cache.lastFetch.delete('semesters');
      }
      return result;
    } catch (error) {
      return { success: false, error: 'ไม่สามารถลบภาคเรียนได้' };
    }
  }

  /**
   * Get current schedule/timetable
   */
  async getCurrentSchedule() {
    try {
      const result = await apiManager.get('schedule/timetable');
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถโหลดตารางสอนได้'
      };
    }
  }

  async getTimetableBy(year, semesterId, useCache = true) {
    try {
      const key = `${year}:${semesterId}`;
      if (useCache && this.timetableCache.key === key && this.timetableCache.data) {
        return { success: true, data: this.timetableCache.data, cached: true };
      }
      const params = new URLSearchParams();
      params.set('year', String(year));
      params.set('semesterId', String(semesterId));
      const url = `schedule/timetable?${params.toString()}`;
      const result = await apiManager.get(url);
      if (result.success) {
        // overwrite single cache
        this.timetableCache = { key, data: result.data, ts: Date.now() };
      }
      return result;
    } catch (error) {
      return { success: false, error: 'ไม่สามารถโหลดตารางสอนตามปี/ภาคเรียนได้' };
    }
  }

  clearTimetableCache() {
    this.timetableCache = { key: null, data: null, ts: 0 };
  }

  getCachedTimetable() {
    return this.timetableCache.data || null;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(key) {
    const lastFetch = this.cache.lastFetch.get(key);
    if (!lastFetch) return false;
    
    return (Date.now() - lastFetch) < this.cacheTimeout;
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.academicYears = null;
    this.cache.semesters.clear();
    this.cache.lastFetch.clear();
  }
}

// Export singleton instance
const coreAPI = new CoreAPI();
export default coreAPI;
