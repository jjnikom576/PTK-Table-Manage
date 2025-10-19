import type {
  DatabaseResult,
  Room,
  CreateRoomRequest
} from '../interfaces';
import { DatabaseManagerBase, Constructor } from './database-manager-base';

export function DatabaseManagerRoomsMixin<TBase extends Constructor<DatabaseManagerBase>>(Base: TBase) {
  return class extends Base {
    async createRoom(data: CreateRoomRequest, forYear?: number): Promise<DatabaseResult<Room>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `rooms_${year}`;

        const exists = await this.db
          .prepare(`SELECT 1 FROM ${tableName} WHERE semester_id = ? AND room_name = ?`)
          .bind(data.semester_id, data.room_name)
          .first();

        if (exists) {
          return { success: false, error: 'Room already exists for this semester' };
        }

        const result = await this.db
          .prepare(`
          INSERT INTO ${tableName} (
            semester_id,
            room_name,
            room_type,
            is_active,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
          .bind(
            data.semester_id,
            data.room_name,
            data.room_type
          )
          .run();

        const newRoom = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(result.meta.last_row_id)
          .first<Room>();

        return { success: true, data: newRoom! };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getRoomsBySemester(semesterId: number): Promise<DatabaseResult<Room[]>> {
      try {
        const year = await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `rooms_${year}`;
        const rooms = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY room_name
        `)
          .bind(semesterId)
          .all<Room>();

        return { success: true, data: rooms.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async getRoomsBySemesterForYear(semesterId: number, year: number): Promise<DatabaseResult<Room[]>> {
      try {
        await this.ensureDynamicTablesExist(year);

        const tableName = `rooms_${year}`;
        const rooms = await this.db
          .prepare(`
          SELECT * FROM ${tableName}
          WHERE semester_id = ? AND is_active = 1
          ORDER BY room_name
        `)
          .bind(semesterId)
          .all<Room>();

        return { success: true, data: rooms.results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    async updateRoom(roomId: number, semesterId: number, data: Partial<CreateRoomRequest>, forYear?: number): Promise<DatabaseResult<Room>> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `rooms_${year}`;
        const fields: string[] = [];
        const values: any[] = [];

        if (data.room_name !== undefined) {
          fields.push('room_name = ?');
          values.push(data.room_name);
        }
        if (data.room_type !== undefined) {
          fields.push('room_type = ?');
          values.push(data.room_type);
        }
        if (fields.length === 0) {
          return { success: false, error: 'No room fields to update' };
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        const result = await this.db
          .prepare(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ? AND semester_id = ? AND is_active = 1`)
          .bind(...values, roomId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Room not found' };
        }

        const updatedRoom = await this.db
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(roomId)
          .first<Room>();

        return { success: true, data: updatedRoom! };
      } catch (error) {
        const message = String(error);
        if (message.includes('UNIQUE constraint failed')) {
          return { success: false, error: 'Room already exists for this semester' };
        }
        return { success: false, error: message };
      }
    }

    async deleteRoom(roomId: number, semesterId: number, forYear?: number): Promise<DatabaseResult> {
      try {
        const year = forYear ?? await this.getActiveYear();
        await this.ensureDynamicTablesExist(year);

        const tableName = `rooms_${year}`;
        const result = await this.db
          .prepare(`DELETE FROM ${tableName} WHERE id = ? AND semester_id = ?`)
          .bind(roomId, semesterId)
          .run();

        if (result.meta.changes === 0) {
          return { success: false, error: 'Room not found' };
        }

        return { success: true, data: { message: 'Room deleted successfully' } };
      } catch (error) {
        const message = String(error);
        if (message.includes('FOREIGN KEY constraint failed')) {
          return { success: false, error: 'Cannot delete room while schedules still reference it' };
        }
        return { success: false, error: message };
      }
    }
  };
}
