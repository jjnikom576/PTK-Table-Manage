import apiManager from './core/api-manager.js';

export function registerSubjectMethods(ScheduleAPI) {
  /**
   * SUBJECTS API
   */
  ScheduleAPI.prototype.getSubjects = async function(year, semesterId) {
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
  };

  ScheduleAPI.prototype.createSubject = async function(year, semesterId, subjectData) {
    try {
      const endpoint = `${this.getYearEndpoint('subjects', year)}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const classIds = Array.isArray(subjectData.class_ids)
        ? subjectData.class_ids
            .map(value => Number(value))
            .filter(value => Number.isFinite(value))
        : [];

      if (subjectData.class_id != null) {
        const numeric = Number(subjectData.class_id);
        if (Number.isFinite(numeric) && !classIds.includes(numeric)) {
          classIds.push(numeric);
        }
      }

      const primaryClassId = classIds.length ? classIds[0] : null;

      const payload = {
        semester_id: subjectData.semester_id || semesterId,
        teacher_id: subjectData.teacher_id,
        class_id: primaryClassId,
        class_ids: classIds,
        group_key: subjectData.group_key,
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code || null,
        periods_per_week: Number(subjectData.periods_per_week),
        default_room_id: subjectData.default_room_id || null,
        special_requirements: subjectData.special_requirements || null
      };

      const result = await apiManager.post(endpoint, payload);

      if (result.success) {
        this.invalidateCache(`subjects_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`subjects_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถเพิ่มวิชาเรียนใหม่ได้'
      };
    }
  };

  ScheduleAPI.prototype.updateSubject = async function(year, semesterId, subjectId, updateData = {}) {
    try {
      const endpoint = `${this.getYearEndpoint('subjects', year)}/${subjectId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const payload = { ...updateData };

      if (Array.isArray(updateData.class_ids)) {
        payload.class_ids = updateData.class_ids
          .map(value => Number(value))
          .filter(value => Number.isFinite(value));
      }

      if (updateData.class_id != null) {
        const numeric = Number(updateData.class_id);
        if (Number.isFinite(numeric)) {
          payload.class_id = numeric;
        }
      }

      const result = await apiManager.put(endpoint, payload);

      if (result.success) {
        this.invalidateCache(`subjects_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`subjects_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถอัปเดตข้อมูลวิชาเรียนได้'
      };
    }
  };

  ScheduleAPI.prototype.deleteSubject = async function(year, semesterId, subjectId) {
    try {
      const endpoint = `${this.getYearEndpoint('subjects', year)}/${subjectId}?year=${encodeURIComponent(year)}&semesterId=${encodeURIComponent(semesterId)}`;
      const result = await apiManager.delete(endpoint);

      if (result.success) {
        this.invalidateCache(`subjects_${year}_${semesterId}`);
        this.invalidateCacheByPattern(`subjects_${year}_`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'ไม่สามารถลบวิชาเรียนได้'
      };
    }
  };
}
