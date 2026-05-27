import axios from 'axios';

// Create Axios instance
export const apiClient = axios.create({
  baseURL: '/api', // Proxied by Vite to http://localhost:8080/api
  timeout: 10000,
  paramsSerializer: (params) => {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    return parts.join('&');
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // We could add token here if auth is implemented
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // As a temporary mock for the backend interceptors (like UserContext / @RequireRole)
    // The backend might expect something in headers or we'll pass parameters for now,
    // but typically a mock token or interceptor logic goes here.
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns Result<T> with code, message, data
    const res = response.data;
    if (res.code !== 200 && res.code !== 0 && res.code !== undefined) {
      const message = res.message || res.msg || 'Error';
      console.error('API Error:', message);
      // If unauthorized, clear stale token so the user is forced to re-login
      if (res.code === 401) {
        localStorage.removeItem('token');
      }
      return Promise.reject(new Error(message));
    }
    // Return just the data part (or the whole response if it's not wrapped in Result)
    return res.data !== undefined ? res.data : res;
  },
  (error) => {
    console.error('Network Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
