import axios from 'axios';
import { tokenService } from './tokenService';

const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL: backendUrl || '/',
  timeout: 60000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request Interceptor: Automatically inject Authorization token
apiClient.interceptors.request.use(
  (config) => {
    // Ensure withCredentials is true for all requests
    config.withCredentials = true;

    // Determine which token to use based on URL path to prevent token pollution
    const url = config.url || '';
    const isAdminRoute = url.startsWith('/api/admin/') || url.includes('/admin');
    const isMediaDetailRoute = url.includes('/api/media/dramas/') || url.includes('/api/media/movies/');
    
    const token = (isAdminRoute || (isMediaDetailRoute && tokenService.getAdminToken()))
      ? tokenService.getAdminToken()
      : tokenService.getUserToken();
      
    // Only inject header if token is an actual JWT (not the 'true' placeholder for cookie mode)
    if (token && token !== 'true') {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global error logging and token invalidation
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    
    if (status === 401 || status === 403) {
      const responseData = error.response?.data;
      
      let isAuthError = true; // Fail-safe default
      
      if (responseData) {
        let errorMessage = '';
        if (typeof responseData === 'object') {
          errorMessage = responseData?.message || responseData?.error || '';
        } else if (typeof responseData === 'string') {
          if (responseData.trim().startsWith('<')) {
            // HTML response (e.g. from firewall or server error page) is NOT a genuine auth JSON error
            isAuthError = false;
          } else {
            try {
              const parsed = JSON.parse(responseData);
              errorMessage = parsed?.message || parsed?.error || '';
            } catch (e) {
              errorMessage = responseData;
            }
          }
        }
        
        if (errorMessage) {
          isAuthError = /auth|token|expired|session|unauthorized|access denied|suspended/i.test(errorMessage);
        }
      }
      
      if (isAuthError) {
        // Clear only the expired role token based on URL
        const url = error.config?.url || '';
        const isAdminRoute = url.startsWith('/api/admin/') || url.includes('/admin');
        
        if (isAdminRoute) {
          tokenService.removeAdminToken();
          window.dispatchEvent(new Event('admin-session-expired'));
        } else {
          tokenService.removeUserToken();
          window.dispatchEvent(new Event('user-session-expired'));
        }
      }
    }
    
    // Normalize error shape
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred.',
      status,
      response: error.response,
      originalError: error
    };
    return Promise.reject(customError);
  }
);

export default apiClient;
