import apiClient from './client';

export type AwardProofReviewAction = 'approve' | 'reject' | 'return';

export interface AwardProofVO {
  id?: number | string;
  aiTaskId?: number | string;
  competitionId?: number | string;
  competitionName?: string;
  awardLevel?: string;
  awardTime?: string;
  organizer?: string;
  winnerName?: string;
  certificateNo?: string;
  sealText?: string;
  fileName?: string;
  fileUrl?: string;
  fileHash?: string;
  confidence?: number;
  fieldConfidenceJson?: unknown;
  evidenceJson?: unknown;
  riskFlagsJson?: unknown;
  status?: string;
  reviewNote?: string;
  createTime?: string;
  submitTime?: string;
  updateTime?: string;
  submitterName?: string;
  studentName?: string;
  submitterNo?: string;
  studentNo?: string;
  students?: AwardProofStudentVO[];
  studentList?: AwardProofStudentVO[];
  studentIds?: Array<number | string>;
}

export interface AwardProofStudentVO {
  id?: number | string;
  studentId?: number | string;
  studentName?: string;
  realName?: string;
  studentNo?: string;
  username?: string;
}

export interface CertificateRecognizePayload {
  fileName: string;
  fileUrl: string;
  fileHash?: string;
}

export interface AwardProofSubmitPayload {
  aiTaskId?: number | string;
  competitionId?: number | string;
  competitionName: string;
  awardLevel: string;
  awardTime?: string;
  organizer?: string;
  winnerName?: string;
  certificateNo?: string;
  sealText?: string;
  fileName: string;
  fileUrl: string;
  fileHash?: string;
  confidence?: number;
  fieldConfidenceJson?: unknown;
  evidenceJson?: unknown;
  riskFlagsJson?: unknown;
  studentIds: number[];
}

export interface AwardProofReviewPayload {
  id: number | string;
  action: AwardProofReviewAction;
  reviewNote?: string;
}

export function recognizeCertificate(payload: CertificateRecognizePayload): Promise<AwardProofVO> {
  return apiClient.post('/ai/certificate/recognize', payload, { timeout: 60000 });
}

export function submitAwardProof(payload: AwardProofSubmitPayload): Promise<AwardProofVO> {
  return apiClient.post('/award-proof/submit', payload);
}

export function listAwardProofAudit(status = 'pending'): Promise<AwardProofVO[] | { records?: AwardProofVO[] }> {
  return apiClient.get('/award-proof/audit-list', { params: { status } });
}

export function getAwardProof(id: number | string): Promise<AwardProofVO> {
  return apiClient.get(`/award-proof/${id}`);
}

export function reviewAwardProof(payload: AwardProofReviewPayload): Promise<void> {
  return apiClient.post('/award-proof/review', payload);
}

export const AWARD_PROOF_FIELD_LABELS: Record<string, string> = {
  competitionName: '比赛名称',
  awardLevel: '获奖等级',
  awardTime: '获奖时间',
  organizer: '主办单位',
  winnerName: '获奖人',
  certificateNo: '证书编号',
  sealText: '印章文字',
  fileName: '文件名',
};

export interface FieldConfidenceItem {
  field: string;
  label: string;
  confidence: number;
}

export function normalizeConfidence(value?: number | string | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.max(numeric, 0);
}

export function formatConfidence(value?: number | string | null): string {
  const normalized = normalizeConfidence(value);
  if (normalized === null) return '—';
  return `${Math.round(normalized * 100)}%`;
}

export function parseJsonLike(value: unknown): unknown {
  if (!value) return null;
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
  return JSON.stringify(value);
}

export function toDisplayList(value: unknown): string[] {
  const parsed = parseJsonLike(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed.map(valueToText).filter(Boolean);
  }
  if (typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .map(([key, item]) => {
        const text = valueToText(item);
        return text ? `${AWARD_PROOF_FIELD_LABELS[key] ?? key}: ${text}` : '';
      })
      .filter(Boolean);
  }
  const text = valueToText(parsed);
  return text ? [text] : [];
}

export function toFieldConfidenceItems(value: unknown): FieldConfidenceItem[] {
  const parsed = parseJsonLike(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const obj = item as Record<string, unknown>;
        const field = valueToText(obj.field ?? obj.name ?? obj.key);
        const confidence = normalizeConfidence(obj.confidence as number | string | null);
        if (!field || confidence === null) return null;
        return { field, label: AWARD_PROOF_FIELD_LABELS[field] ?? field, confidence };
      })
      .filter(Boolean) as FieldConfidenceItem[];
  }
  if (typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .map(([field, raw]) => {
        const confidence = normalizeConfidence(raw as number | string | null);
        if (confidence === null) return null;
        return { field, label: AWARD_PROOF_FIELD_LABELS[field] ?? field, confidence };
      })
      .filter(Boolean) as FieldConfidenceItem[];
  }
  return [];
}
