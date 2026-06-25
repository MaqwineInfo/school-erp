import { get, post, put, del } from '../lib/api';
import type { Student } from '../types';

export const studentService = {
  list: (params?: Record<string, unknown>) => get<Student[]>('/students', params),
  get: (id: string) => get<Student>(`/students/${id}`),
  create: (data: Partial<Student>) => post<Student>('/students', data),
  update: (id: string, data: Partial<Student>) => put<Student>(`/students/${id}`, data),
  remove: (id: string) => del(`/students/${id}`),
  bulkImport: (students: Partial<Student>[]) => post('/students/bulk-import', { students }),
};
