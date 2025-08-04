/**
 * API Type Definitions for Budget Application
 * 
 * Centralized type definitions for all API responses, requests, and data structures
 * used throughout the MoneyWise financial tracking application frontend.
 */

// Core API response structure for all backend endpoints
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination metadata for paginated list responses
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
