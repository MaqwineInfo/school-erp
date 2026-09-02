import axios from 'axios';
import type { ApiResponse } from '../types';

const publicApi = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export default publicApi;

export const publicGet = <T>(url: string) =>
  publicApi.get<ApiResponse<T>>(url).then((r) => r.data);

export const publicPost = <T>(url: string, data?: unknown) =>
  publicApi.post<ApiResponse<T>>(url, data).then((r) => r.data);
