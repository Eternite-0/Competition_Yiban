import apiClient from './client';
import type { ActivityCategory, ActivityType } from '../types';

export async function listActivityCategories(type?: ActivityType | '', includeInactive = false) {
  const params: Record<string, any> = { includeInactive };
  if (type) params.type = type;
  const data: any = await apiClient.get('/activity-categories', { params });
  return Array.isArray(data) ? data as ActivityCategory[] : [];
}

export async function createActivityCategory(payload: {
  type: ActivityType;
  name: string;
  code?: string;
  icon?: string;
  sortOrder?: number;
}) {
  return apiClient.post('/activity-categories/admin', payload) as Promise<ActivityCategory>;
}
