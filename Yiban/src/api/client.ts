import axios from 'axios';
import * as Sentry from '@sentry/react';
import { useStore } from '../store/useStore';

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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Friendly error messages for common HTTP status codes
const STATUS_MESSAGES: Record<number, string> = {
  400: '请求参数有误，请检查后重试',
  401: '登录已过期，请重新登录',
  403: '您没有权限执行此操作',
  404: '请求的内容不存在',
  408: '请求超时，请稍后重试',
  409: '操作冲突，请刷新后重试',
  422: '提交的数据格式有误，请检查',
  429: '请求过于频繁，请稍后重试',
  500: '服务器暂时异常，请稍后重试',
  502: '服务暂时不可用，请稍后重试',
  503: '服务维护中，请稍后重试',
};

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Capture backend correlation ID for tracing
    const correlationId = response.headers['x-correlation-id'];
    if (correlationId) {
      Sentry.setContext('request', {
        correlationId,
        url: response.config.url,
        method: response.config.method?.toUpperCase(),
      });
    }

    // Backend returns Result<T> with code, message, data
    const res = response.data;
    if (res.code !== 200 && res.code !== 0 && res.code !== undefined) {
      const message = res.message || res.msg || STATUS_MESSAGES[res.code] || '操作失败';
      console.error('API Error:', message);
      // If unauthorized, clear stale token and Zustand state so the user is forced to re-login
      const platformAuthError = res.code === 401 && ['请先登录', '未登录或登录已过期'].includes(String(message));
      if (platformAuthError) {
        localStorage.removeItem('token');
        useStore.getState().logout();
      }
      const err = new Error(message);
      (err as any).code = res.code;
      return Promise.reject(err);
    }
    // Return just the data part (or the whole response if it's not wrapped in Result)
    return res.data !== undefined ? res.data : res;
  },
  (error) => {
    // Capture backend correlation ID even on error responses
    const correlationId = error.response?.headers?.['x-correlation-id'];
    if (correlationId) {
      Sentry.setContext('request', {
        correlationId,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
      });
    }

    // Report network errors to Sentry
    if (!error.response) {
      Sentry.captureException(error, {
        tags: { errorType: 'network' },
      });
      // Network error - provide friendly message
      const networkError = new Error('网络连接异常，请检查网络后重试');
      (networkError as any).originalError = error;
      return Promise.reject(networkError);
    }

    // HTTP error with status code
    const status = error.response.status;
    const friendlyMessage = STATUS_MESSAGES[status] || '请求失败，请稍后重试';
    const httpError = new Error(friendlyMessage);
    (httpError as any).status = status;
    (httpError as any).originalError = error;
    console.error('HTTP Error:', status, error);
    return Promise.reject(httpError);
  }
);

export default apiClient;
