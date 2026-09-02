import { publicGet, publicPost } from '../lib/publicApi';
import type { Standard } from '../types';

export interface PublicSchoolInfo {
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  city?: string;
  state?: string;
  board?: string;
  activeAcademicYear?: string | null;
}

export const publicAdmissionService = {
  getSchool: (slug: string) => publicGet<PublicSchoolInfo>(`/public/schools/${slug}`),
  getClasses: (slug: string) => publicGet<Standard[]>(`/public/schools/${slug}/classes`),
  submit: (slug: string, data: Record<string, unknown>) =>
    publicPost<{ enquiryId: string }>(`/public/schools/${slug}/admissions`, data),
};
