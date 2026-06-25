import axios from 'axios';
import type { ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const get = <T>(url: string, params?: Record<string, unknown>) =>
  api.get<ApiResponse<T>>(url, { params }).then((r) => r.data);

export const post = <T>(url: string, data?: unknown) =>
  api.post<ApiResponse<T>>(url, data).then((r) => r.data);

export const put = <T>(url: string, data?: unknown) =>
  api.put<ApiResponse<T>>(url, data).then((r) => r.data);

export const patch = <T>(url: string, data?: unknown) =>
  api.patch<ApiResponse<T>>(url, data).then((r) => r.data);

export const del = <T>(url: string) =>
  api.delete<ApiResponse<T>>(url).then((r) => r.data);
