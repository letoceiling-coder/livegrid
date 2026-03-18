/**
 * API Configuration
 * Base URL for all API calls
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Get full API URL for endpoint
 * @param endpoint - API endpoint (e.g., '/apartments' or 'apartments')
 * @returns Full URL (e.g., '/api/v1/apartments')
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Ensure API_BASE_URL doesn't have trailing slash
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  
  return `${baseUrl}/${cleanEndpoint}`;
}

/**
 * Default fetch options for API calls
 */
export const defaultFetchOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'same-origin', // Send cookies with requests
};
