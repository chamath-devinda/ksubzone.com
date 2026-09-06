import axios from 'axios';
import { tokenService } from './tokenService';

// Keep browser requests same-origin. Next.js rewrites `/api/*` to the PHP API
// using the server-only BACKEND_URL.

const resolveBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'ksubzone.com' || host === 'www.ksubzone.com' || host.endsWith('.ksubzone.com') || host.endsWith('.vercel.app')) {
      return 'https://api.ksubzone.com';
    }
  }
  return '/';
};

const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 20000,
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
  async (error) => {
    const status = error.response ? error.response.status : null;
    const requestConfig = error.config;

    // Hosting/CDN layers can briefly answer read requests with 429. Retry GET
    // requests with bounded backoff so management tables do not fall into an
    // empty state during a short traffic burst.
    if (status === 429 && requestConfig?.method?.toLowerCase() === 'get') {
      const retryCount = requestConfig.__rateLimitRetryCount || 0;
      if (retryCount < 3) {
        requestConfig.__rateLimitRetryCount = retryCount + 1;
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        const retryAfterSeconds = Number(retryAfterHeader);
        const exponentialDelay = 1000 * (2 ** retryCount);
        const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? Math.min(retryAfterSeconds * 1000, 10000)
          : exponentialDelay;

        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return apiClient(requestConfig);
      }
    }
    
    if (status === 401 || status === 403) {
      const responseData = error.response?.data;
      
      // Permission-only 403 responses must not sign the administrator out.
      // A 401 is always an invalid session; a 403 only invalidates the session
      // when the server explicitly identifies an authentication/scope failure.
      let isAuthError = status === 401;
      
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
        
        if (status === 403 && errorMessage) {
          isAuthError = /not authorized|unauthorized|invalid .*scope|token|expired|session|suspended/i.test(errorMessage);
        }
      }
      
      if (isAuthError) {
        // Clear only the expired role token based on URL
        const url = error.config?.url || '';
        const isAdminRoute = url.startsWith('/api/admin/') || url.includes('/admin');
        
        if (isAdminRoute) {
          tokenService.removeAdminToken();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('admin-session-expired'));
          }
        } else {
          tokenService.removeUserToken();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('user-session-expired'));
          }
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
