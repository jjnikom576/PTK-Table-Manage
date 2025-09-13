/**
 * Substitutions API Service - Simple Mock Version
 */

import { getYearBasedEndpoint, getTableName, apiError } from './config.js';

// Simple mock data
const mockSubstitutions = [
  { id: 1, absent_teacher_id: 1, absent_date: '2024-12-01', reason: 'ลาป่วย', status: 'ACTIVE' },
  { id: 2, absent_teacher_id: 4, absent_date: '2024-12-02', reason: 'ลากิจ', status: 'ACTIVE' }
];

const mockSubstitutionSchedules = [
  { id: 1, substitution_id: 1, substitute_teacher_id: 2, original_schedule_id: 1, periods_count: 2 },
  { id: 2, substitution_id: 2, substitute_teacher_id: 7, original_schedule_id: 2, periods_count: 1 }
];

/**
 * Get all substitutions for a specific year
 */
export async function getSubstitutions(year) {
  try {
    return { ok: true, data: mockSubstitutions };
  } catch (error) {
    return apiError(`Failed to fetch substitutions for year ${year}`, 500, error);
  }
}

/**
 * Get all substitution schedules for a specific year
 */
export async function getSubstitutionSchedules(year) {
  try {
    return { ok: true, data: mockSubstitutionSchedules };
  } catch (error) {
    return apiError(`Failed to fetch substitution schedules for year ${year}`, 500, error);
  }
}

/**
 * Get substitutions by date range
 */
export async function getSubstitutionsByDateRange(year, startDate, endDate) {
  try {
    const filtered = mockSubstitutions.filter(sub => 
      sub.absent_date >= startDate && sub.absent_date <= endDate
    );
    return { ok: true, data: filtered };
  } catch (error) {
    return apiError(`Failed to fetch substitutions for date range`, 500, error);
  }
}
