import apiClient from './client';

export type CompetitionSourceType = 'whitelist' | 'school' | 'government' | 'enterprise' | 'custom';
export type CrawlFrequency = 'manual' | 'daily' | 'weekly';

export interface CompetitionSource {
  id: number | string;
  name: string;
  url: string;
  sourceType: CompetitionSourceType;
  crawlFrequency: CrawlFrequency;
  language?: string;
  crawlDepth?: number;
  maxPages?: number;
  allowPatterns?: string;
  denyPatterns?: string;
  enabled: boolean | number;
  lastCrawlTime?: string;
  lastCrawlStatus?: string;
  lastErrorMessage?: string;
  lastSuccessCount?: number;
  createTime?: string;
  updateTime?: string;
}

export interface CompetitionSourcePayload {
  name: string;
  url: string;
  sourceType: CompetitionSourceType;
  crawlFrequency: CrawlFrequency;
  language?: string;
  crawlDepth?: number;
  maxPages?: number;
  allowPatterns?: string;
  denyPatterns?: string;
  enabled: boolean;
}

export function listCompetitionSources(): Promise<
  CompetitionSource[] | { records?: CompetitionSource[]; list?: CompetitionSource[] }
> {
  return apiClient.get('/admin/competition-sources');
}

export function createCompetitionSource(payload: CompetitionSourcePayload): Promise<CompetitionSource> {
  return apiClient.post('/admin/competition-sources', payload);
}

export function updateCompetitionSource(
  id: number | string,
  payload: Partial<CompetitionSourcePayload>,
): Promise<CompetitionSource> {
  return apiClient.put(`/admin/competition-sources/${id}`, payload);
}

export function deleteCompetitionSource(id: number | string): Promise<void> {
  return apiClient.delete(`/admin/competition-sources/${id}`);
}

export function crawlCompetitionSource(id: number | string): Promise<unknown> {
  return apiClient.post(`/admin/competition-sources/${id}/crawl`, undefined, { timeout: 120000 });
}

export interface CrawlEnabledResult {
  total: number;
  succeeded: number;
  failed: number;
  created: number;
  items?: Array<{
    id: number | string;
    name: string;
    url: string;
    status: string;
    created?: number;
    error?: string;
  }>;
}

export function crawlEnabledCompetitionSources(): Promise<CrawlEnabledResult> {
  return apiClient.post('/admin/competition-sources/crawl-enabled', undefined, { timeout: 300000 });
}
