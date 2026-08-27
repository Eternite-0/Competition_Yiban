import apiClient from './client';

export interface AiRecommendation {
  competitionId: number | string;
  name: string;
  level?: string;
  category?: string;
  fitScore: number;
  daysLeft?: number;
  deadline?: string;
  reasons: string[];
  actions?: { detail?: string; register?: string };
}

export interface AiRecommendationsResponse {
  profile?: { major?: string; grade?: string; historyCount?: number; signals?: string[] };
  recommendations: AiRecommendation[];
}

export interface AiPrecheckIssue {
  code: string;
  severity: 'warning' | 'error' | 'info';
  title: string;
  detail: string;
}

export interface AiPrecheckResponse {
  competitionId: number | string;
  competitionName: string;
  completeness: number;
  issueCount: number;
  issues: AiPrecheckIssue[];
  ready: boolean;
  hint: string;
}

export interface AiTeamMatch {
  postId: number | string;
  studentId: number | string;
  studentName?: string;
  major?: string;
  skillTags?: string[];
  matchScore: number;
  matchReason: string;
  postContent?: string;
}

export interface AiTeamMatchesResponse {
  competitionId: number | string;
  desiredRole?: string;
  matches: AiTeamMatch[];
  hint: string;
}

export interface AiTeacherCockpitResponse {
  title: string;
  college?: string;
  todos: Array<{ title: string; count: number; description: string; link?: string }>;
  stats?: Record<string, unknown>;
}

export interface AiAdminAnalyticsResponse {
  title: string;
  metrics: Array<{ label: string; value: number | string; unit: string }>;
  anomalies: string[];
  suggestions: string[];
}

export function getAiRecommendations(): Promise<AiRecommendationsResponse> {
  return apiClient.get('/ai/features/recommendations');
}

export function precheckAiMaterials(competitionId: number | string, payload: Record<string, unknown>): Promise<AiPrecheckResponse> {
  return apiClient.post(`/ai/features/precheck?competitionId=${encodeURIComponent(String(competitionId))}`, payload, { timeout: 30000 });
}

export function getAiTeamMatches(competitionId: number | string, desiredRole?: string): Promise<AiTeamMatchesResponse> {
  return apiClient.get('/ai/features/team-matches', { params: { competitionId, desiredRole } });
}

export function getTeacherAiCockpit(): Promise<AiTeacherCockpitResponse> {
  return apiClient.get('/ai/features/teacher-cockpit');
}

export function getAdminAiAnalytics(): Promise<AiAdminAnalyticsResponse> {
  return apiClient.get('/ai/features/admin-analytics');
}
