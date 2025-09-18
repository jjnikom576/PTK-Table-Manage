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
   * Get semesters for a specific year
   */
  async getSemesters(yearOrId, useCache = true) {
    // Convert year to yearId if needed
    let yearId = yearOrId;
    let year = yearOrId;
    
    // If input is a year (e.g., 2567), find the corresponding yearId
    if (typeof yearOrId === 'number' && yearOrId > 2500) {
      const yearsData = await this.getAcademicYears();
      if (yearsData.success) {
        const yearData = yearsData.data.find(y => y.year === yearOrId);
        if (yearData) {
          yearId = yearData.id;
          year = yearData.year;
        } else {
          return {
            success: false,
            error: `ไม่พบปีการศึกษา ${yearOrId}`
          };
        }
      } else {
        return yearsData; // Return the error from getAcademicYears
      }
    } else {
      // If input is yearId, find the year for caching
      const yearsData = await this.getAcademicYears();
      if (yearsData.success) {
        const yearData = yearsData.data.find(y => y.id === yearOrId);
        if (yearData) {
          year = yearData.year;
        }
      }
    }
    
    const cacheKey = `semesters_${year}`;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return {
        success: true,
        data: this.cache.semesters.get(year)
      };
    }

    try {
      // Use yearId for API call
      const result = await apiManager.get(`core/academic-years/${yearId}/semesters`);
      
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
  async createSemester({name, year, semester_number}) {
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
      
      const result = await apiManager.post(`core/academic-years/${yearData.id}/semesters`, {
        semester_number: semester_number || 1,
        semester_name: name
      });
      
      if (result.success) {
        // Clear semesters cache for this year
        this.cache.semesters.delete(year);
        this.cache.lastFetch.delete(`semesters_${year}`);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มภาคเรียนได้'
      };
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
  async setActiveSemester(year, semesterId) {
    try {
      const result = await apiManager.put(`core/semesters/${semesterId}/activate`);
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถกำหนดภาคเรียนใช้งานได้'
      };
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
