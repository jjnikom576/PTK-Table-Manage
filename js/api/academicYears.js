/**
 * Academic Years API Service
 * Handles fixed academic years table operations
 */

import { API_CONFIG, apiError } from './config.js';
import { academicYearsData } from '../data/academicYears.mock.js';

/**
 * Get all academic years
 * @returns {Object} { ok: boolean, data: Array, error?: string }
 */
export async function getAcademicYears() {
  try {
    // In production: const response = await fetch(`${API_CONFIG.baseURL}/academic-years`);
    // Mock implementation
    return { 
      ok: true, 
      data: academicYearsData.sort((a, b) => b.year - a.year) // Sort by year desc
    };
  } catch (error) {
    return apiError('Failed to fetch academic years', 500, error);
  }
}

/**
 * Get academic year by year number
 * @param {number} year - Year number (e.g., 2567)
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getAcademicYear(year) {
  try {
    const yearData = academicYearsData.find(y => y.year === parseInt(year));
    
    if (!yearData) {
      return apiError(`Academic year ${year} not found`, 404);
    }
    
    return { ok: true, data: yearData };
  } catch (error) {
    return apiError(`Failed to fetch academic year ${year}`, 500, error);
  }
}

/**
 * Get current active academic year
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function getCurrentAcademicYear() {
  try {
    const currentYear = academicYearsData.find(y => y.is_active);
    
    if (!currentYear) {
      return apiError('No active academic year found', 404);
    }
    
    return { ok: true, data: currentYear };
  } catch (error) {
    return apiError('Failed to fetch current academic year', 500, error);
  }
}

/**
 * Create new academic year
 * @param {Object} yearData - Academic year data
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function createAcademicYear(yearData) {
  try {
    // Validate required fields
    if (!yearData.year || !yearData.start_date || !yearData.end_date) {
      return apiError('Missing required fields: year, start_date, end_date', 400);
    }
    
    // Check if year already exists
    const existingYear = academicYearsData.find(y => y.year === yearData.year);
    if (existingYear) {
      return apiError(`Academic year ${yearData.year} already exists`, 409);
    }
    
    // Create new year (mock implementation)
    const newYear = {
      id: Math.max(...academicYearsData.map(y => y.id), 0) + 1,
      year: parseInt(yearData.year),
      start_date: yearData.start_date,
      end_date: yearData.end_date,
      is_active: yearData.is_active || false,
      created_at: new Date().toISOString()
    };
    
    academicYearsData.push(newYear);
    
    return { ok: true, data: newYear };
  } catch (error) {
    return apiError('Failed to create academic year', 500, error);
  }
}

/**
 * Update academic year
 * @param {number} yearId - Academic year ID
 * @param {Object} updateData - Data to update
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function updateAcademicYear(yearId, updateData) {
  try {
    const yearIndex = academicYearsData.findIndex(y => y.id === parseInt(yearId));
    
    if (yearIndex === -1) {
      return apiError(`Academic year with ID ${yearId} not found`, 404);
    }
    
    // Update year data
    const updatedYear = {
      ...academicYearsData[yearIndex],
      ...updateData,
      id: parseInt(yearId) // Ensure ID doesn't change
    };
    
    academicYearsData[yearIndex] = updatedYear;
    
    return { ok: true, data: updatedYear };
  } catch (error) {
    return apiError(`Failed to update academic year ${yearId}`, 500, error);
  }
}

/**
 * Delete academic year
 * @param {number} yearId - Academic year ID  
 * @returns {Object} { ok: boolean, data?: Object, error?: string }
 */
export async function deleteAcademicYear(yearId) {
  try {
    const yearIndex = academicYearsData.findIndex(y => y.id === parseInt(yearId));
    
    if (yearIndex === -1) {
      return apiError(`Academic year with ID ${yearId} not found`, 404);
    }
    
    const deletedYear = academicYearsData.splice(yearIndex, 1)[0];
    
    return { ok: true, data: deletedYear };
  } catch (error) {
    return apiError(`Failed to delete academic year ${yearId}`, 500, error);
  }
}

/**
 * Set active academic year
 * @param {number} year - Year number to set as active
 * @returns {Object} { ok: boolean, data: Object, error?: string }
 */
export async function setActiveAcademicYear(year) {
  try {
    // Set all years as inactive
    academicYearsData.forEach(y => y.is_active = false);
    
    // Set target year as active
    const targetYear = academicYearsData.find(y => y.year === parseInt(year));
    if (!targetYear) {
      return apiError(`Academic year ${year} not found`, 404);
    }
    
    targetYear.is_active = true;
    
    return { ok: true, data: targetYear };
  } catch (error) {
    return apiError(`Failed to set active academic year ${year}`, 500, error);
  }
}