import type {
  DatabaseResult,
  Subject,
  CreateSubjectRequest
} from '../interfaces';
import { DatabaseManagerBase, Constructor } from './database-manager-base';

export function DatabaseManagerSubjectsMixin<TBase extends Constructor<DatabaseManagerBase>>(Base: TBase) {
  return class extends Base {
    protected hydrateSubjectRow(subject: any): Subject {
      if (!subject) {
        return subject;
      }

      let parsedClassIds: number[] = [];

      if (Array.isArray(subject.class_ids)) {
        parsedClassIds = subject.class_ids
          .map((id: any) => Number(id))
          .filter((id: number) => Number.isFinite(id));
      } else if (typeof subject.class_ids === 'string' && subject.class_ids.trim().length > 0) {
        try {
          const maybeArray = JSON.parse(subject.class_ids);
          if (Array.isArray(maybeArray)) {
            parsedClassIds = maybeArray
              .map((id: any) => Number(id))
              .filter((id: number) => Number.isFinite(id));
          }
        } catch (error) {
          parsedClassIds = subject.class_ids
            .split(',')
            .map((id: string) => Number(id.trim()))
            .filter((id: number) => Number.isFinite(id));
        }
      }

      if (!parsedClassIds.length && subject.class_id != null) {
        parsedClassIds = [Number(subject.class_id)];
      }

      const groupKey = subject.group_key && String(subject.group_key).trim().length > 0
        ? String(subject.group_key)
        : `SUBJ_${subject.id}`;

      return {
        ...subject,
        group_key: groupKey,
        class_ids: parsedClassIds
      } as Subject;
    }

    protected normalizeClassIds(data: CreateSubjectRequest): number[] {
      const collected = new Set<number>();

      if (Array.isArray(data.class_ids)) {
        for (const value of data.class_ids) {
          const numeric = Number(value);
          if (Number.isFinite(numeric)) {
            collected.add(numeric);
          }
        }
      }

      if (data.class_id != null) {
        const numeric = Number(data.class_id);
        if (Number.isFinite(numeric)) {
          collected.add(numeric);
        }
      }

      return Array.from(collected.values());
    }

    protected generateSubjectGroupKey(): string {
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
      } catch (error) {
        // ignore and fallback
      }

      return `SUBJ_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    async createSubject(data: CreateSubjectRequest, forYear?: number): Promise<DatabaseResult<Subject[]>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `subjects_${year}`;
        const classIds = this.normalizeClassIds(data);

        if (!classIds.length) {
          return { success: false, error: 'อย่างน้อยต้องระบุหนึ่งชั้นเรียน (class_ids หรือ class_id)' };
        }

        const groupKey = data.group_key && data.group_key.trim().length > 0
          ? data.group_key.trim()
          : this.generateSubjectGroupKey();
        const classIdsJson = JSON.stringify(classIds);

        const insertedSubjects: Subject[] = [];

        for (const classId of classIds) {
          const result = await this.db
            .prepare(`
            INSERT INTO ${tableName} (
              semester_id,
              teacher_id,
              class_id,
              class_ids,
              group_key,
              subject_name,
              subject_code,
              periods_per_week,
              default_room_id,
              special_requirements,
              is_active,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
            .bind(
              data.semester_id,
              data.teacher_id,
              classId,
              classIdsJson,
              groupKey,
              data.subject_name,
              data.subject_code || null,
              data.periods_per_week,
              data.default_room_id ?? null,
              data.special_requirements ?? null
            )
            .run();

          const newSubject = await this.db
            .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
            .bind(result.meta.last_row_id)
            .first<Subject>();

          if (newSubject) {
            insertedSubjects.push({
              ...newSubject,
              group_key: groupKey,
              class_ids: classIds
            });
          }
        }

        return { success: true, data: insertedSubjects };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getSubjectsBySemester(semesterId: number): Promise<DatabaseResult<any[]>> {
      try {
        const year = await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `subjects_${year}`;

        const subjects = await this.db
          .prepare(`
          SELECT s.*, t.full_name as teacher_name, c.class_name, r.room_name
          FROM ${tableName} s
          JOIN teachers_${year} t ON s.teacher_id = t.id
          JOIN classes_${year} c ON s.class_id = c.id
          LEFT JOIN rooms_${year} r ON s.default_room_id = r.id
          WHERE s.semester_id = ? AND s.is_active = 1
          ORDER BY t.full_name, c.class_name, s.subject_name
        `)
          .bind(semesterId)
          .all();
        const hydrated = subjects.results.map(row => this.hydrateSubjectRow(row));

        return { success: true, data: hydrated };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getSubjectsBySemesterForYear(semesterId: number, year: number): Promise<DatabaseResult<any[]>> {
      try {
        await this.ensureDynamicTablesExist(year);

        const tableName = `subjects_${year}`;
        const subjects = await this.db
          .prepare(`
          SELECT s.*, t.full_name as teacher_name, c.class_name, r.room_name
          FROM ${tableName} s
          JOIN teachers_${year} t ON s.teacher_id = t.id
          JOIN classes_${year} c ON s.class_id = c.id
          LEFT JOIN rooms_${year} r ON s.default_room_id = r.id
          WHERE s.semester_id = ? AND s.is_active = 1
          ORDER BY t.full_name, c.class_name, s.subject_name
        `)
          .bind(semesterId)
          .all();
        const hydrated = subjects.results.map(row => this.hydrateSubjectRow(row));

        return { success: true, data: hydrated };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async updateSubject(subjectId: number, semesterId: number, data: Partial<CreateSubjectRequest>, forYear?: number): Promise<DatabaseResult<Subject[]>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `subjects_${year}`;

        const existingSubject = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ? AND semester_id = ?`)
          .bind(subjectId, semesterId)
          .first<any>();

        if (!existingSubject) {
          return { success: false, error: 'Subject not found' };
        }

        let groupKey = existingSubject.group_key && String(existingSubject.group_key).trim().length > 0
          ? String(existingSubject.group_key)
          : this.generateSubjectGroupKey();

        const groupRowsResult = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE (group_key = ? OR (group_key IS NULL OR group_key = '')) AND semester_id = ?`)
          .bind(groupKey, semesterId)
          .all<any>();

        const existingRows = groupRowsResult.results.length > 0 ? groupRowsResult.results : [existingSubject];

        if ((!existingSubject.group_key || existingSubject.group_key === '') && groupKey) {
          await this.db
            .prepare(`UPDATE ${tableName} SET group_key = ? WHERE (group_key IS NULL OR group_key = '') AND semester_id = ? AND subject_name = ? AND teacher_id = ?`)
            .bind(groupKey, semesterId, existingSubject.subject_name, existingSubject.teacher_id)
            .run();
        }

        const currentClassIds = new Set<number>(
          existingRows
            .map((row: any) => Number(row.class_id))
            .filter(id => Number.isFinite(id))
        );

        const requestedClassIds = new Set<number>();
        if (Array.isArray(data.class_ids)) {
          data.class_ids.forEach(value => {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) {
              requestedClassIds.add(numeric);
            }
          });
        }

        if (data.class_id != null) {
          const numeric = Number(data.class_id);
          if (Number.isFinite(numeric)) {
            requestedClassIds.add(numeric);
          }
        }

        if (requestedClassIds.size === 0) {
          currentClassIds.forEach(id => requestedClassIds.add(id));
        }

        if (requestedClassIds.size === 0) {
          return { success: false, error: 'อย่างน้อยต้องระบุหนึ่งชั้นเรียน (class_ids หรือ class_id)' };
        }

        const teacherId = data.teacher_id ?? existingSubject.teacher_id;
        const subjectName = data.subject_name ?? existingSubject.subject_name;
        const subjectCode = data.subject_code !== undefined ? data.subject_code : existingSubject.subject_code;
        const periodsPerWeek = data.periods_per_week ?? existingSubject.periods_per_week;

        if (!Number.isFinite(periodsPerWeek) || periodsPerWeek <= 0 || periodsPerWeek > 20) {
          return { success: false, error: 'Periods per week must be between 1 and 20' };
        }

        const defaultRoomId = Object.prototype.hasOwnProperty.call(data, 'default_room_id')
          ? data.default_room_id ?? null
          : existingSubject.default_room_id ?? null;
        const specialRequirements = data.special_requirements !== undefined
          ? (data.special_requirements || null)
          : (existingSubject.special_requirements || null);

        const newClassIds = Array.from(requestedClassIds.values());
        const classIdsJson = JSON.stringify(newClassIds);

        const rowsByClass = new Map<number, any>();
        for (const row of existingRows) {
          const classId = Number(row.class_id);
          if (Number.isFinite(classId)) {
            rowsByClass.set(classId, row);
          }
        }

        const classesToRemove = Array.from(currentClassIds).filter(id => !requestedClassIds.has(id));
        const classesToAdd = Array.from(requestedClassIds).filter(id => !currentClassIds.has(id));
        const classesToUpdate = Array.from(requestedClassIds).filter(id => currentClassIds.has(id));

        for (const classId of classesToUpdate) {
          const existingRow = rowsByClass.get(classId);
          if (!existingRow) continue;

          await this.db
            .prepare(`
            UPDATE ${tableName}
            SET teacher_id = ?,
                subject_name = ?,
                subject_code = ?,
                periods_per_week = ?,
                default_room_id = ?,
                special_requirements = ?,
                class_ids = ?,
                group_key = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
            .bind(
              teacherId,
              subjectName,
              subjectCode ?? null,
              periodsPerWeek,
              defaultRoomId,
              specialRequirements,
              classIdsJson,
              groupKey,
              existingRow.id
            )
            .run();
        }

        for (const classId of classesToRemove) {
          const existingRow = rowsByClass.get(classId);
          if (!existingRow) continue;

          await this.db
            .prepare(`DELETE FROM ${tableName} WHERE id = ?`)
            .bind(existingRow.id)
            .run();
        }

        for (const classId of classesToAdd) {
          await this.db
            .prepare(`
            INSERT INTO ${tableName} (
              semester_id,
              teacher_id,
              class_id,
              class_ids,
              group_key,
              subject_name,
              subject_code,
              periods_per_week,
              default_room_id,
              special_requirements,
              is_active,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
            .bind(
              semesterId,
              teacherId,
              classId,
              classIdsJson,
              groupKey,
              subjectName,
              subjectCode ?? null,
              periodsPerWeek,
              defaultRoomId,
              specialRequirements
            )
            .run();
        }

        await this.db
          .prepare(`UPDATE ${tableName} SET class_ids = ?, group_key = ? WHERE group_key = ? OR id = ?`)
          .bind(classIdsJson, groupKey, groupKey, subjectId)
          .run();

        const refreshed = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE (group_key = ? OR id = ?) AND semester_id = ?`)
          .bind(groupKey, subjectId, semesterId)
          .all<any>();

        const hydrated = refreshed.results.map(row => this.hydrateSubjectRow(row));

        return { success: true, data: hydrated };
      } catch (error) {
        const message = String(error);
        if (message.includes('UNIQUE constraint failed')) {
          return { success: false, error: 'Subject already exists for this class and semester' };
        }
        return { success: false, error: message };
      }
    }

    async deleteSubject(subjectId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `subjects_${year}`;

        const existingSubject = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ? AND semester_id = ?`)
          .bind(subjectId, semesterId)
          .first<any>();

        if (!existingSubject) {
          return { success: false, error: 'Subject not found' };
        }

        const groupKey = existingSubject.group_key && String(existingSubject.group_key).trim().length > 0
          ? String(existingSubject.group_key)
          : null;

        let result;

        if (groupKey) {
          result = await this.db
            .prepare(`DELETE FROM ${tableName} WHERE group_key = ? AND semester_id = ?`)
            .bind(groupKey, semesterId)
            .run();
        } else {
          result = await this.db
            .prepare(`DELETE FROM ${tableName} WHERE id = ? AND semester_id = ?`)
            .bind(subjectId, semesterId)
            .run();
        }

        if (result.meta.changes === 0) {
          return { success: false, error: 'Subject not found' };
        }

        return { success: true, data: { message: 'Subject deleted successfully', deleted: result.meta.changes } };
      } catch (error) {
        const message = String(error);
        if (message.includes('FOREIGN KEY constraint failed')) {
          return { success: false, error: 'Cannot delete subject while schedules still reference it' };
        }
        return { success: false, error: message };
      }
    }
  };
}
