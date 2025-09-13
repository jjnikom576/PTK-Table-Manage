/**
 * Enhanced Rooms Mock Data (กายภาพ)
 * Part 1: Rooms 2567 (Current Year)
 * แยกจาก classes (กลุ่มนักเรียน) ชัดเจน
 */

// Room Types Configuration
export const ROOM_TYPES = {
    CLASS: {
        value: 'CLASS',
        label: 'ห้องเรียนทั่วไป',
        color: '#3182ce',
        bgColor: '#ebf8ff'
    },
    TECH: {
        value: 'TECH', 
        label: 'ห้องเทคโนโลยี/ปฏิบัติการ',
        color: '#805ad5',
        bgColor: '#faf5ff'
    }
};

// Rooms 2567 (Current Year)
const rooms_2567 = [
    // ห้องเรียนทั่วไป (CLASS) - ชั้น 1
    {
        id: 1,
        name: '101',
        room_type: 'CLASS',
        capacity: 40,
        location: 'ชั้น 1',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 2,
        name: '102',
        room_type: 'CLASS',
        capacity: 40,
        location: 'ชั้น 1',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 3,
        name: '103',
        room_type: 'CLASS',
        capacity: 40,
        location: 'ชั้น 1',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 4,
        name: '104',
        room_type: 'CLASS',
        capacity: 40,
        location: 'ชั้น 1',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // ห้องเรียนทั่วไป (CLASS) - ชั้น 2
    {
        id: 5,
        name: '201',
        room_type: 'CLASS',
        capacity: 38,
        location: 'ชั้น 2',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 6,
        name: '202',
        room_type: 'CLASS',
        capacity: 38,
        location: 'ชั้น 2',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 7,
        name: '203',
        room_type: 'CLASS',
        capacity: 38,
        location: 'ชั้น 2',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 8,
        name: '204',
        room_type: 'CLASS',
        capacity: 38,
        location: 'ชั้น 2',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // ห้องเรียนทั่วไป (CLASS) - ชั้น 3
    {
        id: 9,
        name: '301',
        room_type: 'CLASS',
        capacity: 35,
        location: 'ชั้น 3',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 10,
        name: '302',
        room_type: 'CLASS',
        capacity: 35,
        location: 'ชั้น 3',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 11,
        name: '303',
        room_type: 'CLASS',
        capacity: 35,
        location: 'ชั้น 3',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },

    // ห้องเทคโนโลยี (TECH)
    {
        id: 12,
        name: 'ห้องคอมพิวเตอร์ 1',
        room_type: 'TECH',
        capacity: 30,
        location: 'อาคารเทคโนโลยี',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 13,
        name: 'ห้องคอมพิวเตอร์ 2',
        room_type: 'TECH',
        capacity: 30,
        location: 'อาคารเทคโนโลยี',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 14,
        name: 'ห้องวิทยาศาสตร์ 1',
        room_type: 'TECH',
        capacity: 32,
        location: 'อาคารวิทยาศาสตร์',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 15,
        name: 'ห้องวิทยาศาสตร์ 2',
        room_type: 'TECH',
        capacity: 32,
        location: 'อาคารวิทยาศาสตร์',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 16,
        name: 'ห้องปฏิบัติการเคมี',
        room_type: 'TECH',
        capacity: 24,
        location: 'อาคารวิทยาศาสตร์',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    },
    {
        id: 17,
        name: 'ห้องปฏิบัติการฟิสิกส์',
        room_type: 'TECH',
        capacity: 24,
        location: 'อาคารวิทยาศาสตร์',
        available: true,
        created_at: '2024-05-01T00:00:00.000Z'
    }
];

// Rooms 2566 (Historical - มีห้องมากกว่า)
const rooms_2566 = [
    // ห้องเรียนทั่วไป (CLASS) - ชั้น 1-4 (มากกว่าปัจจุบัน)
    { id: 1, name: '101', room_type: 'CLASS', capacity: 42, location: 'ชั้น 1', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 2, name: '102', room_type: 'CLASS', capacity: 42, location: 'ชั้น 1', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 3, name: '103', room_type: 'CLASS', capacity: 42, location: 'ชั้น 1', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 4, name: '104', room_type: 'CLASS', capacity: 42, location: 'ชั้น 1', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 5, name: '105', room_type: 'CLASS', capacity: 42, location: 'ชั้น 1', available: true, created_at: '2023-05-01T00:00:00.000Z' }, // พิเศษ
    
    { id: 6, name: '201', room_type: 'CLASS', capacity: 40, location: 'ชั้น 2', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 7, name: '202', room_type: 'CLASS', capacity: 40, location: 'ชั้น 2', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 8, name: '203', room_type: 'CLASS', capacity: 40, location: 'ชั้น 2', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 9, name: '204', room_type: 'CLASS', capacity: 40, location: 'ชั้น 2', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    
    { id: 10, name: '301', room_type: 'CLASS', capacity: 38, location: 'ชั้น 3', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 11, name: '302', room_type: 'CLASS', capacity: 38, location: 'ชั้น 3', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 12, name: '303', room_type: 'CLASS', capacity: 38, location: 'ชั้น 3', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 13, name: '304', room_type: 'CLASS', capacity: 38, location: 'ชั้น 3', available: true, created_at: '2023-05-01T00:00:00.000Z' }, // พิเศษ
    
    { id: 14, name: '401', room_type: 'CLASS', capacity: 35, location: 'ชั้น 4', available: true, created_at: '2023-05-01T00:00:00.000Z' }, // เก่ามี
    { id: 15, name: '402', room_type: 'CLASS', capacity: 35, location: 'ชั้น 4', available: true, created_at: '2023-05-01T00:00:00.000Z' }, // เก่ามี
    
    // ห้องเทคโนโลยี (TECH) - น้อยกว่าปัจจุบัน
    { id: 16, name: 'ห้องคอมพิวเตอร์ 1', room_type: 'TECH', capacity: 28, location: 'อาคารเทคโนโลยี', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 17, name: 'ห้องวิทยาศาสตร์ 1', room_type: 'TECH', capacity: 30, location: 'อาคารวิทยาศาสตร์', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 18, name: 'ห้องปฏิบัติการเคมี', room_type: 'TECH', capacity: 22, location: 'อาคารวิทยาศาสตร์', available: true, created_at: '2023-05-01T00:00:00.000Z' },
    { id: 19, name: 'ห้องปฏิบัติการฟิสิกส์', room_type: 'TECH', capacity: 22, location: 'อาคารวิทยาศาสตร์', available: true, created_at: '2023-05-01T00:00:00.000Z' }
];

// Rooms 2568 (Future - ปรับปรุงใหม่, capacity เพิ่ม)
const rooms_2568 = [
    // ห้องเรียนทั่วไป (CLASS) - ลดจำนวน แต่ capacity เพิ่ม
    { id: 1, name: '101', room_type: 'CLASS', capacity: 45, location: 'ชั้น 1', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 2, name: '102', room_type: 'CLASS', capacity: 45, location: 'ชั้น 1', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 3, name: '103', room_type: 'CLASS', capacity: 45, location: 'ชั้น 1', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    
    { id: 4, name: '201', room_type: 'CLASS', capacity: 42, location: 'ชั้น 2', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 5, name: '202', room_type: 'CLASS', capacity: 42, location: 'ชั้น 2', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 6, name: '203', room_type: 'CLASS', capacity: 42, location: 'ชั้น 2', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    
    { id: 7, name: '301', room_type: 'CLASS', capacity: 40, location: 'ชั้น 3', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 8, name: '302', room_type: 'CLASS', capacity: 40, location: 'ชั้น 3', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    
    // ห้องเทคโนโลยี (TECH) - อัพเกรดใหม่, capacity เพิ่ม
    { id: 9, name: 'ห้องคอมพิวเตอร์ 1', room_type: 'TECH', capacity: 35, location: 'อาคารเทคโนโลยี', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 10, name: 'ห้องคอมพิวเตอร์ 2', room_type: 'TECH', capacity: 35, location: 'อาคารเทคโนโลยี', available: true, created_at: '2025-05-01T00:00:00.000Z' },
    { id: 11, name: 'ห้องคอมพิวเตอร์ 3', room_type: 'TECH', capacity: 35, location: 'อาคารเทคโนโลยี', available: true, created_at: '2025-05-01T00:00:00.000Z' }, // ใหม่
    { id: 12, name: 'ห้องวิทยาศาสตร์ Smart', room_type: 'TECH', capacity: 40, location: 'อาคารวิทยาศาสตร์', available: true, created_at: '2025-05-01T00:00:00.000Z' }, // อัพเกรด
    { id: 13, name: 'ห้องปฏิบัติการเคมีใหม่', room_type: 'TECH', capacity: 30, location: 'อาคารวิทยาศาสตร์', available: true, created_at: '2025-05-01T00:00:00.000Z' }, // อัพเกรด
    { id: 14, name: 'ห้องปฏิบัติการฟิสิกส์ใหม่', room_type: 'TECH', capacity: 30, location: 'อาคารวิทยาศาสตร์', available: true, created_at: '2025-05-01T00:00:00.000Z' } // อัพเกรด
];

// Export Structure
export const roomsData = {
    rooms_2566,
    rooms_2567,
    rooms_2568
};

// Helper Functions
export const RoomUtils = {
    /**
     * Get rooms by year
     * @param {string|number} year - Academic year (2566, 2567, 2568)
     * @returns {Array} - Array of room objects
     */
    getRoomsByYear(year) {
        const yearStr = year.toString();
        return roomsData[`rooms_${yearStr}`] || [];
    },

    /**
     * Get rooms by type in specific year
     * @param {string} roomType - Room type ('CLASS' | 'TECH')
     * @param {string|number} year - Academic year
     * @returns {Array} - Array of rooms of specified type
     */
    getRoomsByType(roomType, year) {
        const rooms = this.getRoomsByYear(year);
        return rooms.filter(room => room.room_type === roomType);
    },

    /**
     * Get room by ID in specific year
     * @param {number} roomId - Room ID
     * @param {string|number} year - Academic year
     * @returns {Object|null} - Room object or null
     */
    getRoomById(roomId, year) {
        const rooms = this.getRoomsByYear(year);
        return rooms.find(room => room.id === roomId) || null;
    },

    /**
     * Get room by name in specific year
     * @param {string} roomName - Room name
     * @param {string|number} year - Academic year
     * @returns {Object|null} - Room object or null
     */
    getRoomByName(roomName, year) {
        const rooms = this.getRoomsByYear(year);
        return rooms.find(room => room.name === roomName) || null;
    },

    /**
     * Find available rooms (simplified - real version needs schedule checking)
     * @param {number} day - Day of week (1-7)
     * @param {number} period - Period number (1-12)
     * @param {string|null} roomType - Required room type (optional)
     * @param {string|number} year - Academic year
     * @returns {Array} - Array of potentially available rooms
     */
    findAvailableRooms(day, period, roomType = null, year) {
        let rooms = this.getRoomsByYear(year);
        
        // Filter by room type if specified
        if (roomType) {
            rooms = rooms.filter(room => room.room_type === roomType);
        }
        
        // Filter only available rooms
        rooms = rooms.filter(room => room.available);
        
        // Note: In real implementation, this should check against
        // existing schedules to find truly available rooms
        // For now, return all rooms of specified type
        
        return rooms;
    },

    /**
     * Validate room conflict (simplified)
     * @param {Object} newSchedule - New schedule to validate
     * @param {Array} existingSchedules - Existing schedules array
     * @param {string|number} year - Academic year
     * @returns {Object} - Validation result {isValid, conflicts, room}
     */
    validateRoomConflict(newSchedule, existingSchedules, year) {
        const { room_id, day_of_week, period } = newSchedule;
        
        if (!room_id) {
            return { isValid: true, conflicts: [], room: null };
        }
        
        const room = this.getRoomById(room_id, year);
        if (!room) {
            return {
                isValid: false,
                conflicts: ['ไม่พบห้องที่ระบุ'],
                room: null
            };
        }
        
        // Check for time conflicts in the same room
        const conflicts = existingSchedules.filter(schedule => 
            schedule.room_id === room_id &&
            schedule.day_of_week === day_of_week &&
            schedule.period === period &&
            schedule.id !== newSchedule.id // Don't conflict with self
        );
        
        return {
            isValid: conflicts.length === 0,
            conflicts: conflicts.map(c => 
                `ห้อง ${room.name} ถูกใช้แล้วในวัน ${day_of_week} คาบ ${period}`
            ),
            room: room
        };
    },

    /**
     * Get room display name with type badge
     * @param {Object} room - Room object
     * @returns {Object} - Display information {name, badge, fullDisplay}
     */
    getRoomDisplayName(room) {
        if (!room) {
            return {
                name: '-',
                badge: '',
                fullDisplay: '-'
            };
        }
        
        const typeInfo = ROOM_TYPES[room.room_type] || ROOM_TYPES.CLASS;
        
        return {
            name: room.name,
            badge: typeInfo.label,
            badgeColor: typeInfo.color,
            badgeBgColor: typeInfo.bgColor,
            fullDisplay: `${room.name} (${typeInfo.label})`,
            location: room.location,
            capacity: room.capacity
        };
    },

    /**
     * Get room statistics by year
     * @param {string|number} year - Academic year
     * @returns {Object} - Statistics object
     */
    getRoomStats(year) {
        const rooms = this.getRoomsByYear(year);
        
        const stats = {
            total: rooms.length,
            available: rooms.filter(r => r.available).length,
            byType: {},
            byLocation: {},
            totalCapacity: rooms.reduce((sum, r) => sum + (r.capacity || 0), 0),
            averageCapacity: 0
        };
        
        // Calculate average capacity
        if (stats.total > 0) {
            stats.averageCapacity = Math.round(stats.totalCapacity / stats.total);
        }
        
        // Group by type
        Object.keys(ROOM_TYPES).forEach(type => {
            const typeRooms = rooms.filter(r => r.room_type === type);
            stats.byType[type] = {
                count: typeRooms.length,
                available: typeRooms.filter(r => r.available).length,
                totalCapacity: typeRooms.reduce((sum, r) => sum + (r.capacity || 0), 0)
            };
        });
        
        // Group by location
        const locations = [...new Set(rooms.map(r => r.location))].sort();
        locations.forEach(location => {
            const locationRooms = rooms.filter(r => r.location === location);
            stats.byLocation[location] = {
                count: locationRooms.length,
                available: locationRooms.filter(r => r.available).length,
                capacity: locationRooms.reduce((sum, r) => sum + (r.capacity || 0), 0)
            };
        });
        
        return stats;
    }
};

// Export default
export default {
    data: roomsData,
    utils: RoomUtils,
    types: ROOM_TYPES
};
