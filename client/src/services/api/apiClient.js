import axios from 'axios';
import { tokenService } from './tokenService';

// Keep browser requests same-origin. Next.js rewrites `/api/*` to the PHP API
// using the server-only BACKEND_URL.

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In the browser, always use same-origin relative URLs ('') so requests
    // route through Next.js rewrites on Vercel. Direct cross-origin browser calls to
    // https://api.ksubzone.com trigger CORS preflight checks that get blocked or
    // timed out by the hosting CDN WAF (StackProtect), causing "Network Error".
    return '';
  }
  if (typeof process !== 'undefined' && process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/+$/, '');
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, '');
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'https://api.ksubzone.com';
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

    // Resilient fallback: If a browser request encounters a Network Error (e.g. proxy issue or CORS/WAF block),
    // automatically retry once using the alternative origin (same-origin '' <-> direct 'https://api.ksubzone.com').
    if (!error.response && requestConfig && !requestConfig.__networkRetried && typeof window !== 'undefined') {
      requestConfig.__networkRetried = true;
      const currentBase = requestConfig.baseURL || '';
      if (currentBase === '') {
        requestConfig.baseURL = 'https://api.ksubzone.com';
        return apiClient(requestConfig);
      } else if (currentBase.includes('api.ksubzone.com')) {
        requestConfig.baseURL = '';
        return apiClient(requestConfig);
      }
    }

    // Hosting/CDN layers can briefly answer read requests with 429. Retry GET
    // requests with bounded backoff so management tables do not fall into an
    // empty state during a short traffic burst.
    if (status === 429 && requestConfig?.method?.toLowerCase() === 'get' && !requestConfig.skipRateLimitRetry) {
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
    
    // Normalize error shape with safe message extraction
    let responseMessage = error.response?.data?.message;
    if (!responseMessage && typeof error.response?.data === 'string' && error.response.data.trim()) {
      if (error.response.data.includes('<html') || error.response.data.includes('<body')) {
        responseMessage = status === 403
          ? 'Server rejected the request (HTTP 403). Please check your connection or permissions.'
          : `Server request failed (HTTP ${status || 'Error'}).`;
      } else {
        responseMessage = error.response.data.slice(0, 200);
      }
    }

    const fallbackMessage = status === 403
      ? 'Access denied (403). Please verify your credentials or permissions.'
      : (error.message || 'An unexpected error occurred.');

    const customError = {
      message: responseMessage || fallbackMessage,
      status,
      response: error.response,
      originalError: error
    };
    return Promise.reject(customError);
  }
);

export default apiClient;
