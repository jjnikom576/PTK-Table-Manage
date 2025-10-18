import apiManager from './core/api-manager.js';

export function registerMigrationMethods(ScheduleAPI) {
  /**
   * YEAR MIGRATION UTILITIES
   */
  ScheduleAPI.prototype.migrateYearData = async function(fromYear, toYear, entities = ['teachers', 'classes', 'rooms', 'subjects']) {
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
  };
}
