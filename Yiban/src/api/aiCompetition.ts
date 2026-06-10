import apiClient from './client';

export type AiCompetitionDraftStatus = 'pending_review' | 'confirmed' | 'ignored' | 'merged' | string;

export interface AiCompetitionDraftVO {
  id: number | string;
  aiTaskId?: number | string;
  competitionId?: number | string;
  sourceType?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  name?: string;
  level?: string;
  category?: string;
  organizer?: string;
  startTime?: string;
  endTime?: string;
  competitionStart?: string;
  competitionEnd?: string;
  maxTeamSize?: number;
  coverUrl?: string;
  content?: string;
  tags?: string | string[];
  tracks?: string | string[];
  stagesJson?: string | unknown[];
  fieldConfidenceJson?: unknown;
  evidenceJson?: unknown;
  riskFlagsJson?: unknown;
  duplicateCompetitionId?: number | string;
  duplicateScore?: number;
  status?: AiCompetitionDraftStatus;
  reviewerId?: number | string;
  reviewNote?: string;
  createTime?: string;
  updateTime?: string;
}

export interface AiCompetitionDraftQuery {
  current?: number;
  size?: number;
  status?: string;
  keyword?: string;
}

export interface PageResult<T> {
  records: T[];
  total?: number;
  current?: number;
  size?: number;
  pages?: number;
}

export interface AiCompetitionParseResultVO {
  taskId?: number | string;
  sourceType?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  drafts: AiCompetitionDraftVO[];
  warnings?: string[];
}

export interface ConfidenceItem {
  field: string;
  label: string;
  confidence: number;
}

export interface DisplayItem {
  label: string;
  value: string;
}

export const DRAFT_FIELD_LABELS: Record<string, string> = {
  name: '赛事名称',
  level: '赛事级别',
  category: '赛事分类',
  organizer: '主办单位',
  startTime: '报名开始',
  endTime: '报名截止',
  competitionStart: '比赛开始',
  competitionEnd: '比赛结束',
  maxTeamSize: '团队人数',
  content: '赛事内容',
  tags: '标签',
  tracks: '赛道',
  sourceTitle: '来源标题',
};

export function parseCompetitionFile(file: File): Promise<AiCompetitionDraftVO> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/ai/competition/parse-file', formData, {
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function parseCompetitionFileBatch(file: File): Promise<AiCompetitionParseResultVO> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/ai/competition/parse-file-batch', formData, {
    timeout: 180000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function parseCompetitionUrl(url: string): Promise<AiCompetitionDraftVO> {
  return apiClient.post('/ai/competition/parse-url', { url }, { timeout: 120000 });
}

export function parseCompetitionUrlBatch(url: string): Promise<AiCompetitionParseResultVO> {
  return apiClient.post('/ai/competition/parse-url-batch', { url }, { timeout: 180000 });
}

export interface ParseProgress {
  step: 'scraping' | 'analyzing' | 'generating';
  message: string;
}

export async function streamParseCompetitionUrl(
  url: string,
  handlers: {
    signal?: AbortSignal;
    onProgress?: (progress: ParseProgress) => void;
  } = {},
): Promise<AiCompetitionDraftVO> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/ai/competition/parse-url-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url }),
    signal: handlers.signal,
  });

  if (!response.ok) {
    throw new Error(`AI 解析失败: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('AI 解析流为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let resultDraft: AiCompetitionDraftVO | null = null;
  let errorMsg = '';

  const applyEvent = (eventName: string, data: string) => {
    if (!data || data === '[DONE]') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    if (eventName === 'error') {
      const msg = typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: unknown }).message)
        : String(parsed);
      throw new Error(msg || 'AI 解析失败');
    }

    if (eventName === 'progress' && typeof parsed === 'object' && parsed !== null) {
      handlers.onProgress?.(parsed as ParseProgress);
      return;
    }

    if (eventName === 'done') {
      const unwrapped = parsed && typeof parsed === 'object' && 'data' in (parsed as Record<string, unknown>)
        ? (parsed as Record<string, unknown>).data
        : parsed;
      resultDraft = unwrapped as AiCompetitionDraftVO;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const lines = part.split(/\r?\n/);
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim() || 'message';
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      applyEvent(eventName, dataLines.join('\n'));
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const lines = buffer.split(/\r?\n/);
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim() || 'message';
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    applyEvent(eventName, dataLines.join('\n'));
  }

  if (!resultDraft) {
    throw new Error(errorMsg || 'AI 解析未返回结果');
  }
  return resultDraft;
}

export async function streamParseCompetitionUrlBatch(
  url: string,
  handlers: {
    signal?: AbortSignal;
    onProgress?: (progress: ParseProgress) => void;
  } = {},
): Promise<AiCompetitionParseResultVO> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/ai/competition/parse-url-batch-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url }),
    signal: handlers.signal,
  });

  if (!response.ok) {
    throw new Error(`AI 解析失败: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('AI 解析流为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AiCompetitionParseResultVO | null = null;

  const applyEvent = (eventName: string, data: string) => {
    if (!data || data === '[DONE]') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    if (eventName === 'error') {
      const msg = typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: unknown }).message)
        : String(parsed);
      throw new Error(msg || 'AI 解析失败');
    }

    if (eventName === 'progress' && typeof parsed === 'object' && parsed !== null) {
      handlers.onProgress?.(parsed as ParseProgress);
      return;
    }

    if (eventName === 'done') {
      const unwrapped = parsed && typeof parsed === 'object' && 'data' in (parsed as Record<string, unknown>)
        ? (parsed as Record<string, unknown>).data
        : parsed;
      result = unwrapped as AiCompetitionParseResultVO;
    }
  };

  const consumeChunk = (chunk: string) => {
    const parts = chunk.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const lines = part.split(/\r?\n/);
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim() || 'message';
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      applyEvent(eventName, dataLines.join('\n'));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    consumeChunk(buffer);
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const lines = buffer.split(/\r?\n/);
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim() || 'message';
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    applyEvent(eventName, dataLines.join('\n'));
  }

  if (!result) {
    throw new Error('AI 解析未返回结果');
  }
  return result;
}

export function listAiCompetitionDrafts(
  query: AiCompetitionDraftQuery = {},
): Promise<PageResult<AiCompetitionDraftVO> | AiCompetitionDraftVO[]> {
  return apiClient.get('/ai/competition/drafts', { params: query });
}

export function getAiCompetitionDraft(id: number | string): Promise<AiCompetitionDraftVO> {
  return apiClient.get(`/ai/competition/drafts/${id}`);
}

export function updateAiCompetitionDraft(
  id: number | string,
  payload: Partial<AiCompetitionDraftVO>,
): Promise<AiCompetitionDraftVO> {
  return apiClient.put(`/ai/competition/drafts/${id}`, payload);
}

export function confirmAiCompetitionDraft(
  id: number | string,
  reviewNote?: string,
): Promise<AiCompetitionDraftVO> {
  return apiClient.post(`/ai/competition/drafts/${id}/confirm`, {
    reviewNote: reviewNote?.trim() || undefined,
  });
}

export function ignoreAiCompetitionDraft(
  id: number | string,
  reviewNote?: string,
): Promise<AiCompetitionDraftVO> {
  return apiClient.post(`/ai/competition/drafts/${id}/ignore`, {
    reviewNote: reviewNote?.trim() || undefined,
  });
}

export function parseJsonLike(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function valueToText(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join('、');
  return JSON.stringify(value);
}

export function normalizeConfidence(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return number > 1 ? Math.min(number / 100, 1) : Math.max(number, 0);
}

export function formatConfidence(value: unknown): string {
  const normalized = normalizeConfidence(value);
  return normalized === null ? '—' : `${Math.round(normalized * 100)}%`;
}

export function toConfidenceItems(value: unknown): ConfidenceItem[] {
  const parsed = parseJsonLike(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const object = item as Record<string, unknown>;
        const field = valueToText(object.field ?? object.name ?? object.key);
        const confidence = normalizeConfidence(object.confidence ?? object.score ?? object.value);
        if (!field || confidence === null) return null;
        return { field, label: DRAFT_FIELD_LABELS[field] ?? field, confidence };
      })
      .filter(Boolean) as ConfidenceItem[];
  }
  if (typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .map(([field, value]) => {
        const confidence = normalizeConfidence(value);
        if (confidence === null) return null;
        return { field, label: DRAFT_FIELD_LABELS[field] ?? field, confidence };
      })
      .filter(Boolean) as ConfidenceItem[];
  }
  return [];
}

export function toDisplayItems(value: unknown): DisplayItem[] {
  const parsed = parseJsonLike(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .map((item, index) => {
        if (item && typeof item === 'object') {
          const object = item as Record<string, unknown>;
          const label = valueToText(object.field ?? object.label ?? object.name) || `条目 ${index + 1}`;
          const detail = valueToText(object.evidence ?? object.text ?? object.value ?? object.message ?? item);
          return detail ? { label: DRAFT_FIELD_LABELS[label] ?? label, value: detail } : null;
        }
        const detail = valueToText(item);
        return detail ? { label: `条目 ${index + 1}`, value: detail } : null;
      })
      .filter(Boolean) as DisplayItem[];
  }
  if (typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .map(([key, item]) => {
        const detail = valueToText(item);
        return detail ? { label: DRAFT_FIELD_LABELS[key] ?? key, value: detail } : null;
      })
      .filter(Boolean) as DisplayItem[];
  }
  const detail = valueToText(parsed);
  return detail ? [{ label: '信息', value: detail }] : [];
}

export function toStringList(value: unknown): string[] {
  const parsed = parseJsonLike(value);
  if (Array.isArray(parsed)) return parsed.map(valueToText).filter(Boolean);
  const text = valueToText(parsed);
  return text ? text.split(/[,，、]/).map((item) => item.trim()).filter(Boolean) : [];
}

export function averageConfidence(value: unknown): number | null {
  const items = toConfidenceItems(value);
  if (!items.length) return null;
  return items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
}
