/**
 * Rooms API Service - Physical Rooms Management (NEW)
 * Handles physical room operations with type constraints
 */

import { getYearBasedEndpoint, getTableName, apiError } from './config.js';
import { ROOM_TYPES } from '../data/rooms.mock.js';

// Simple mock data
const mockRooms = [
  { id: 1, name: '101', room_type: 'CLASS', capacity: 40 },
  { id: 2, name: '102', room_type: 'CLASS', capacity: 40 },
  { id: 3, name: 'ห้องคอม1', room_type: 'TECH', capacity: 30 },
  { id: 4, name: 'ห้องวิทย์1', room_type: 'TECH', capacity: 35 }
];

/**
 * Get all rooms for a specific year
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getRooms(year) {
  try {
    return { 
      ok: true, 
      data: mockRooms.sort((a, b) => a.name.localeCompare(b.name, 'th'))
    };
  } catch (error) {
    return apiError(`Failed to fetch rooms for year ${year}`, 500, error);
  }
}

/**
 * Get rooms by type for specific year
 * @param {string} roomType - Room type ('CLASS' or 'TECH')
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getRoomsByTypeAPI(roomType, year) {
  try {
    const rooms = mockRooms.filter(r => r.room_type === roomType);
    return { ok: true, data: rooms };
  } catch (error) {
    return apiError(`Failed to fetch ${roomType} rooms for year ${year}`, 500, error);
  }
}

/**
 * Get room by ID
 * @param {number} roomId - Room ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getRoomById(roomId, year) {
  try {
    const rooms = getRoomsByYear(year);
    const room = rooms.find(r => r.id === parseInt(roomId));
    
    if (!room) {
      return apiError(`Room ${roomId} not found in year ${year}`, 404);
    }
    
    return { ok: true, data: room };
  } catch (error) {
    return apiError(`Failed to fetch room ${roomId} for year ${year}`, 500, error);
  }
}

/**
 * Create new room
 * @param {Object} roomData - Room data
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function createRoom(roomData, year) {
  try {
    // Validate required fields
    if (!roomData.name || !roomData.room_type) {
      return apiError('Missing required fields: name, room_type', 400);
    }
    
    // Validate room_type
    if (!['CLASS', 'TECH'].includes(roomData.room_type)) {
      return apiError('Invalid room_type. Must be CLASS or TECH', 400);
    }
    
    const tableName = `rooms_${year}`;
    if (!roomsData[tableName]) {
      roomsData[tableName] = [];
    }
    
    // Check if room name already exists
    const existingRoom = roomsData[tableName].find(r => 
      r.name.toLowerCase() === roomData.name.toLowerCase()
    );
    
    if (existingRoom) {
      return apiError(`Room "${roomData.name}" already exists in year ${year}`, 409);
    }
    
    // Create new room
    const newRoom = {
      id: Math.max(...roomsData[tableName].map(r => r.id), 0) + 1,
      name: roomData.name,
      room_type: roomData.room_type,
      capacity: roomData.capacity || null,
      location: roomData.location || null,
      is_active: roomData.is_active !== false, // Default to true
      created_at: new Date().toISOString()
    };
    
    roomsData[tableName].push(newRoom);
    
    return { ok: true, data: newRoom };
  } catch (error) {
    return apiError(`Failed to create room for year ${year}`, 500, error);
  }
}

/**
 * Update room
 * @param {number} roomId - Room ID
 * @param {Object} updateData - Data to update
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function updateRoom(roomId, updateData, year) {
  try {
    const tableName = `rooms_${year}`;
    if (!roomsData[tableName]) {
      return apiError(`No rooms data for year ${year}`, 404);
    }
    
    const roomIndex = roomsData[tableName].findIndex(r => r.id === parseInt(roomId));
    
    if (roomIndex === -1) {
      return apiError(`Room ${roomId} not found in year ${year}`, 404);
    }
    
    // Validate room_type if provided
    if (updateData.room_type && !['CLASS', 'TECH'].includes(updateData.room_type)) {
      return apiError('Invalid room_type. Must be CLASS or TECH', 400);
    }
    
    // Update room data
    const updatedRoom = {
      ...roomsData[tableName][roomIndex],
      ...updateData,
      id: parseInt(roomId)
    };
    
    roomsData[tableName][roomIndex] = updatedRoom;
    
    return { ok: true, data: updatedRoom };
  } catch (error) {
    return apiError(`Failed to update room ${roomId} for year ${year}`, 500, error);
  }
}

/**
 * Delete room
 * @param {number} roomId - Room ID
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data?: Object, error?: string }
 */
export async function deleteRoom(roomId, year) {
  try {
    const tableName = `rooms_${year}`;
    if (!roomsData[tableName]) {
      return apiError(`No rooms data for year ${year}`, 404);
    }
    
    const roomIndex = roomsData[tableName].findIndex(r => r.id === parseInt(roomId));
    
    if (roomIndex === -1) {
      return apiError(`Room ${roomId} not found in year ${year}`, 404);
    }
    
    const deletedRoom = roomsData[tableName].splice(roomIndex, 1)[0];
    
    return { ok: true, data: deletedRoom };
  } catch (error) {
    return apiError(`Failed to delete room ${roomId} for year ${year}`, 500, error);
  }
}

/**
 * Validate room availability for specific time slot
 * @param {number} roomId - Room ID
 * @param {number} day - Day of week (1-7)
 * @param {number} period - Period number (1-8)
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: {available: boolean, conflictingSchedule?: Object}, error?: string }
 */
export async function validateRoomAvailability(roomId, day, period, year) {
  try {
    // In real implementation, this would check schedules table
    // Mock implementation assumes room is available
    
    const roomResult = await getRoomById(roomId, year);
    if (!roomResult.ok) {
      return roomResult;
    }
    
    // Mock availability check
    const mockConflictingSchedules = []; // Would query schedules_${year} table
    
    const isAvailable = mockConflictingSchedules.length === 0;
    
    const result = {
      available: isAvailable,
      room: roomResult.data
    };
    
    if (!isAvailable) {
      result.conflictingSchedule = mockConflictingSchedules[0];
    }
    
    return { ok: true, data: result };
  } catch (error) {
    return apiError(`Failed to validate room ${roomId} availability for year ${year}`, 500, error);
  }
}

/**
 * Get rooms formatted for export
 * @param {number} year - Academic year
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getRoomsForExport(year) {
  try {
    const result = await getRooms(year);
    if (!result.ok) {
      return result;
    }
    
    // Format rooms for export
    const exportData = result.data.map(room => ({
      'ชื่อห้อง': room.name,
      'ประเภท': room.room_type === 'CLASS' ? 'ห้องเรียนทั่วไป' : 'ห้องเทคโนโลยี',
      'ความจุ': room.capacity || 'ไม่ระบุ',
      'ตำแหน่ง': room.location || 'ไม่ระบุ',
      'สถานะ': room.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน',
      'วันที่เพิ่ม': new Date(room.created_at).toLocaleDateString('th-TH')
    }));
    
    return { ok: true, data: exportData };
  } catch (error) {
    return apiError(`Failed to format rooms for export (year ${year})`, 500, error);
  }
}