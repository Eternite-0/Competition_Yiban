import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import apiClient from '../../api/client';
import {
  averageConfidence,
  confirmAiCompetitionDraft,
  formatConfidence,
  getAiCompetitionDraft,
  ignoreAiCompetitionDraft,
  listAiCompetitionDrafts,
  toConfidenceItems,
  toDisplayItems,
  toStringList,
  updateAiCompetitionDraft,
  type AiCompetitionDraftVO,
} from '../../api/aiCompetition';
import { listContainer, listItem, pageTransition, pageVariants } from '../../lib/motion';

/* ─── Types ─── */

interface UnifiedDraft {
  source: 'ai' | 'manual';
  id: string;
  name: string;
  status: string;
  updateTime?: string;
  createTime?: string;
  level?: string;
  category?: string;
  aiDraft?: AiCompetitionDraftVO;
  competition?: any;
}

interface DraftFormState {
  name: string;
  sourceTitle: string;
  level: string;
  category: string;
  organizer: string;
  startTime: string;
  endTime: string;
  competitionStart: string;
  competitionEnd: string;
  maxTeamSize: string;
  content: string;
  tags: string;
  tracks: string;
  reviewNote: string;
}

/* ─── Constants ─── */

const emptyForm: DraftFormState = {
  name: '',
  sourceTitle: '',
  level: '',
  category: '',
  organizer: '',
  startTime: '',
  endTime: '',
  competitionStart: '',
  competitionEnd: '',
  maxTeamSize: '1',
  content: '',
  tags: '',
  tracks: '',
  reviewNote: '',
};

const aiStatusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending_review', label: '待审核' },
  { value: 'confirmed', label: '已确认' },
  { value: 'ignored', label: '已忽略' },
];

const aiStatusMeta: Record<string, { label: string; className: string }> = {
  pending_review: { label: '待审核', className: 'chip-warning' },
  confirmed: { label: '已确认', className: 'chip-success' },
  ignored: { label: '已忽略', className: 'chip-closed' },
  merged: { label: '已合并', className: 'chip-info' },
};

const categoryOptions = [
  { value: 'A', label: '科技创新' },
  { value: 'B', label: '商业创业' },
  { value: 'C', label: '文化艺术' },
  { value: 'algorithm', label: '算法编程' },
  { value: 'design', label: '设计创作' },
];

/* ─── Helpers ─── */

function toInputDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function sourceLabel(type?: string) {
  const labels: Record<string, string> = {
    file: '文件导入',
    url: 'URL 导入',
    crawler: '来源采集',
    crawl: '来源采集',
  };
  return labels[type || ''] || type || '未知来源';
}

function categoryLabel(value?: string) {
  return categoryOptions.find((item) => item.value === value)?.label || value || '—';
}

function normalizeDraftCategory(value?: string) {
  const raw = (value || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return '';
  if (['a', 'b', 'c', 'algorithm', 'design'].includes(lower)) return lower === 'a' || lower === 'b' || lower === 'c' ? lower.toUpperCase() : lower;
  if (/科技|信息技术|软件|ai|人工智能/i.test(raw)) return 'A';
  if (/创业|商业/.test(raw)) return 'B';
  if (/文化|艺术/.test(raw)) return 'C';
  if (/算法|编程|程序设计/.test(raw)) return 'algorithm';
  if (/设计|视觉/.test(raw)) return 'design';
  return raw;
}

function normalizeDraftLevel(value?: string) {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (/国家级|全国|全国赛|国赛|国际|国际赛|global|international|教育部|工信部|工业和信息化部/i.test(raw)) return '国家级';
  if (/省赛|省级|省教育厅/.test(raw)) return '省级';
  if (/校赛|校内|学校|校级/.test(raw)) return '校级';
  if (/院赛|学院|院级/.test(raw)) return '院级';
  if (raw === '其他') return '';
  return raw;
}

function riskLabel(value: string) {
  const labels: Record<string, string> = {
    multiple_registration_windows: '存在多个报名窗口，已自动取最早开始和最晚截止',
    registration_time_corrected_from_source: '报名时间已根据原文自动修正',
    approximate_competition_time: '比赛时间由月份/旬级描述推断',
    multi_stage_competition_time: '存在多个比赛阶段，已自动汇总起止时间',
    duplicate_competition: '疑似重复赛事',
    duplicate_pending_draft: '存在相似待审核草稿',
    missing_registration_end: '报名截止待补充',
    missing_name: '赛事名称待补充',
    missing_content: '赛事内容待补充',
    low_confidence: '字段整体置信度偏低',
    possible_dynamic_page: '疑似动态页，已按抓取文本生成草稿',
    pdf_scan_image_fallback: '扫描 PDF 兜底识别',
  };
  return labels[value] || value;
}

function draftToForm(draft: AiCompetitionDraftVO): DraftFormState {
  return {
    name: draft.name || '',
    sourceTitle: draft.sourceTitle || '',
    level: normalizeDraftLevel(draft.level),
    category: normalizeDraftCategory(draft.category),
    organizer: draft.organizer || '',
    startTime: toInputDateTime(draft.startTime),
    endTime: toInputDateTime(draft.endTime),
    competitionStart: toInputDateTime(draft.competitionStart),
    competitionEnd: toInputDateTime(draft.competitionEnd),
    maxTeamSize: String(draft.maxTeamSize || 1),
    content: draft.content || '',
    tags: toStringList(draft.tags).join(', '),
    tracks: toStringList(draft.tracks).join(', '),
    reviewNote: draft.reviewNote || '',
  };
}

function formToPayload(form: DraftFormState): Partial<AiCompetitionDraftVO> {
  const splitList = (value: string) => value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    name: form.name.trim(),
    sourceTitle: form.sourceTitle.trim(),
    level: form.level,
    category: form.category,
    organizer: form.organizer.trim(),
    startTime: form.startTime || undefined,
    endTime: form.endTime || undefined,
    competitionStart: form.competitionStart || undefined,
    competitionEnd: form.competitionEnd || undefined,
    maxTeamSize: Math.max(1, Number(form.maxTeamSize) || 1),
    content: form.content.trim(),
    tags: JSON.stringify(splitList(form.tags)),
    tracks: JSON.stringify(splitList(form.tracks)),
  };
}

/* ─── Sub-components ─── */

function StatusChip({ status }: { status?: string }) {
  const meta = aiStatusMeta[status || ''] || { label: status || '未知', className: '' };
  return <span className={`chip shrink-0 ${meta.className}`}>{meta.label}</span>;
}

function SourceTag({ source }: { source: 'ai' | 'manual' }) {
  return (
    <span className={`chip shrink-0 ${source === 'ai' ? 'chip-primary' : ''}`}>
      {source === 'ai' ? 'AI 导入' : '手动创建'}
    </span>
  );
}

function ManualDraftDetail({ competition, onEdit }: { competition: any; onEdit: () => void }) {
  const formatDateShort = (v?: string) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('zh-CN');
  };

  return (
    <div className="p-lg">
      <div className="flex items-start justify-between gap-3 mb-md">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-warning">草稿</span>
            <span className="chip">手动创建</span>
          </div>
          <h2 className="mt-2 text-[18px] font-medium text-ink">{competition.name || '未命名赛事'}</h2>
        </div>
        <button type="button" className="btn-primary" onClick={onEdit}>
          <span className="material-symbols-outlined text-[18px]">edit</span>
          编辑
        </button>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        {[
          ['赛事级别', competition.level || '—'],
          ['赛事分类', categoryLabel(competition.category)],
          ['主办单位', competition.organizer || '—'],
          ['最大团队', competition.maxTeamSize ? `${competition.maxTeamSize} 人` : '—'],
          ['报名时间', competition.startTime && competition.endTime ? `${formatDateShort(competition.startTime)} ~ ${formatDateShort(competition.endTime)}` : '—'],
          ['比赛时间', competition.competitionStart && competition.competitionEnd ? `${formatDateShort(competition.competitionStart)} ~ ${formatDateShort(competition.competitionEnd)}` : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-placeholder">{label}</dt>
            <dd className="mt-1 text-[13px] text-ink">{value}</dd>
          </div>
        ))}
      </div>

      {competition.content && (
        <div className="mt-md border-t border-hairline pt-md">
          <h3 className="text-[13px] font-medium text-body-muted mb-2">赛事简介</h3>
          <p className="text-[13px] text-ink line-clamp-4">{competition.content}</p>
        </div>
      )}

      {Array.isArray(competition.tags) && competition.tags.length > 0 && (
        <div className="mt-md flex flex-wrap gap-2">
          {competition.tags.map((tag: string) => (
            <span key={tag} className="chip">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function QualityPanel({
  confidenceItems,
  evidenceItems,
  riskItems,
  duplicateCompetitionId,
  duplicateScore,
  onOpenDuplicate,
}: {
  confidenceItems: ReturnType<typeof toConfidenceItems>;
  evidenceItems: ReturnType<typeof toDisplayItems>;
  riskItems: ReturnType<typeof toDisplayItems>;
  duplicateCompetitionId?: number | string;
  duplicateScore?: number;
  onOpenDuplicate: () => void;
}) {
  const [tab, setTab] = useState<'confidence' | 'evidence' | 'risk'>('confidence');
  const counts = {
    confidence: confidenceItems.length,
    evidence: evidenceItems.length,
    risk: riskItems.length + (duplicateCompetitionId ? 1 : 0),
  };

  return (
    <div className="sticky top-[78px]">
      <h2 className="flex items-center gap-2 text-[15px] font-medium text-ink">
        <span className="material-symbols-outlined text-[19px] text-primary">fact_check</span>
        AI 质量信息
      </h2>
      <div className="mt-md grid grid-cols-3 gap-1 rounded-sm border border-hairline bg-canvas p-1">
        {([
          ['confidence', '置信度'],
          ['evidence', '证据'],
          ['risk', '风险'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-sm px-2 py-2 text-[12px] transition ${
              tab === value ? 'bg-primary-soft text-primary' : 'text-placeholder hover:text-ink'
            }`}
          >
            {label} {counts[value]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          className="mt-md"
        >
          {tab === 'confidence' && (
            confidenceItems.length ? (
              <div className="flex flex-col gap-3">
                {confidenceItems.map((item) => (
                  <div key={item.field}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="text-body-muted">{item.label}</span>
                      <span className={item.confidence < 0.7 ? 'text-warning' : 'text-ink'}>
                        {formatConfidence(item.confidence)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.confidence * 100}%` }}
                        className={`h-full rounded-full ${item.confidence < 0.7 ? 'bg-warning' : 'bg-primary'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyQuality text="暂无字段置信度数据" />
          )}

          {tab === 'evidence' && (
            evidenceItems.length ? (
              <div className="flex flex-col gap-2">
                {evidenceItems.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-sm border border-hairline bg-canvas px-3 py-2.5">
                    <p className="text-[11px] font-medium text-primary">{item.label}</p>
                    <p className="mt-1 break-words text-[12px] leading-5 text-body-muted">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : <EmptyQuality text="暂无证据片段" />
          )}

          {tab === 'risk' && (
            counts.risk ? (
              <div className="flex flex-col gap-2">
                {duplicateCompetitionId && (
                  <div className="rounded-sm border border-yellow-200 bg-yellow-50 px-3 py-3">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-yellow-900">
                      <span className="material-symbols-outlined text-[17px]">content_copy</span>
                      疑似重复赛事
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-yellow-800">
                      匹配赛事 #{duplicateCompetitionId}，相似度 {formatConfidence(duplicateScore)}
                    </p>
                    <button type="button" className="mt-2 text-[12px] text-primary hover:underline" onClick={onOpenDuplicate}>
                      打开已有赛事
                    </button>
                  </div>
                )}
                {riskItems.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-error">{riskLabel(item.value)}</p>
                    {riskLabel(item.value) !== item.value && (
                      <p className="mt-1 break-words text-[12px] leading-5 text-red-800">{item.value}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyQuality text="未发现明显风险" positive />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function EmptyQuality({ text, positive = false }: { text: string; positive?: boolean }) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center py-xl text-center">
      <span className={`material-symbols-outlined text-[34px] ${positive ? 'text-success' : 'text-placeholder'}`}>
        {positive ? 'verified' : 'data_info_alert'}
      </span>
      <p className="empty-state-copy mt-2 text-[12px] text-placeholder">{text}</p>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="flex items-center justify-between gap-2 text-[12px] font-medium text-body-muted">
        <span>{required && <span className="mr-1 text-error">*</span>}{label}</span>
        {hint && <span className="font-normal text-placeholder">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ─── Main Component ─── */

export default function DraftsBox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data
  const [aiDrafts, setAiDrafts] = useState<AiCompetitionDraftVO[]>([]);
  const [manualDrafts, setManualDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('draft') || '');
  const [selectedSource, setSelectedSource] = useState<'ai' | 'manual'>(searchParams.get('source') as 'ai' | 'manual' || 'ai');
  const [selectedDraft, setSelectedDraft] = useState<AiCompetitionDraftVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // AI draft form
  const [form, setForm] = useState<DraftFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<'confirm' | 'ignore' | null>(null);

  // Filters
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'ai' | 'manual'>('all');

  const {
    isOpen,
    title,
    message,
    variant,
    confirmText,
    cancelText,
    onConfirm,
    confirm,
    close,
  } = useConfirmModal();

  /* ─── Load data ─── */

  const loadAiDrafts = useCallback(async () => {
    try {
      const result = await listAiCompetitionDrafts({
        current: 1,
        size: 100,
        status: status || undefined,
        keyword: keyword || undefined,
      });
      const records = Array.isArray(result) ? result : (result.records || []);
      setAiDrafts(records);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载 AI 草稿失败');
      setAiDrafts([]);
    }
  }, [keyword, status]);

  const loadManualDrafts = useCallback(async () => {
    try {
      const data: any = await apiClient.get('/competition/list', {
        params: { current: 1, size: 100, status: 'draft' },
      });
      const records = Array.isArray(data) ? data : (data?.records || []);
      setManualDrafts(records);
    } catch (error) {
      console.error('Failed to load manual drafts', error);
      setManualDrafts([]);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadAiDrafts(), loadManualDrafts()]);
    setLoading(false);
  }, [loadAiDrafts, loadManualDrafts]);

  const loadDetail = useCallback(async (id: string, source: 'ai' | 'manual') => {
    if (source === 'manual') {
      setSelectedDraft(null);
      setForm(emptyForm);
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await getAiCompetitionDraft(id);
      setSelectedDraft(detail);
      setForm(draftToForm(detail));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载草稿详情失败');
      setSelectedDraft(null);
      setForm(emptyForm);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDraft(null);
      setForm(emptyForm);
      return;
    }
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('draft', selectedId);
      next.set('source', selectedSource);
      return next;
    }, { replace: true });
    loadDetail(selectedId, selectedSource);
  }, [loadDetail, selectedId, selectedSource, setSearchParams]);

  /* ─── Derived data ─── */

  const unifiedDrafts = useMemo((): UnifiedDraft[] => {
    const items: UnifiedDraft[] = [];

    if (filterSource === 'all' || filterSource === 'ai') {
      for (const d of aiDrafts) {
        items.push({
          source: 'ai',
          id: String(d.id),
          name: d.name || '未命名赛事',
          status: d.status || '',
          updateTime: d.updateTime,
          createTime: d.createTime,
          level: d.level,
          category: d.category,
          aiDraft: d,
        });
      }
    }

    if (filterSource === 'all' || filterSource === 'manual') {
      for (const c of manualDrafts) {
        const nameMatch = !keyword || (c.name && c.name.toLowerCase().includes(keyword.toLowerCase()));
        if (!nameMatch) continue;
        items.push({
          source: 'manual',
          id: String(c.id),
          name: c.name || '未命名赛事',
          status: 'draft',
          updateTime: c.updateTime || c.createTime,
          createTime: c.createTime,
          level: c.level,
          category: c.category,
          competition: c,
        });
      }
    }

    items.sort((a, b) => {
      const ta = a.updateTime || a.createTime || '';
      const tb = b.updateTime || b.createTime || '';
      return tb.localeCompare(ta);
    });

    return items;
  }, [aiDrafts, manualDrafts, filterSource, keyword]);

  const selectedManualDraft = useMemo(
    () => manualDrafts.find((c) => String(c.id) === selectedId) || null,
    [manualDrafts, selectedId],
  );

  const confidenceItems = useMemo(
    () => toConfidenceItems(selectedDraft?.fieldConfidenceJson),
    [selectedDraft?.fieldConfidenceJson],
  );
  const evidenceItems = useMemo(
    () => toDisplayItems(selectedDraft?.evidenceJson),
    [selectedDraft?.evidenceJson],
  );
  const riskItems = useMemo(
    () => toDisplayItems(selectedDraft?.riskFlagsJson),
    [selectedDraft?.riskFlagsJson],
  );

  const pendingCount = aiDrafts.filter((item) => item.status === 'pending_review').length;

  /* ─── Handlers ─── */

  const updateField = <K extends keyof DraftFormState>(field: K, value: DraftFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const syncDraft = (updated: AiCompetitionDraftVO) => {
    setSelectedDraft(updated);
    setForm(draftToForm(updated));
    setAiDrafts((items) => items.map((item) => (String(item.id) === String(updated.id) ? updated : item)));
  };

  const saveDraft = async (showToast = true) => {
    if (!selectedDraft) return null;
    if (!form.name.trim()) {
      toast.error('赛事名称不能为空');
      return null;
    }
    setSaving(true);
    try {
      const updated = await updateAiCompetitionDraft(selectedDraft.id, formToPayload(form));
      syncDraft(updated);
      if (showToast) toast.success('草稿已保存');
      return updated;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存草稿失败');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDraft) return;
    const accepted = await confirm({
      title: '确认生成赛事草稿',
      message: '系统将保存当前修改，并在赛事管理中创建一条未发布赛事。是否继续？',
      confirmText: '确认生成',
      cancelText: '继续检查',
      variant: 'info',
    });
    if (!accepted) return;

    setAction('confirm');
    try {
      const saved = await saveDraft(false);
      if (!saved) return;
      const confirmed = await confirmAiCompetitionDraft(saved.id, form.reviewNote);
      syncDraft(confirmed);
      toast.success('已进入赛事管理，当前仍为未发布草稿');
      await loadDrafts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '确认草稿失败');
    } finally {
      setAction(null);
    }
  };

  const handleIgnore = async () => {
    if (!selectedDraft) return;
    const accepted = await confirm({
      title: '忽略此草稿',
      message: '忽略后草稿仍会保留记录，但不会进入赛事管理。是否继续？',
      confirmText: '确认忽略',
      cancelText: '取消',
      variant: 'warning',
    });
    if (!accepted) return;

    setAction('ignore');
    try {
      const ignored = await ignoreAiCompetitionDraft(selectedDraft.id, form.reviewNote);
      syncDraft(ignored);
      toast.success('草稿已忽略');
      await loadDrafts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '忽略草稿失败');
    } finally {
      setAction(null);
    }
  };

  const handleSelectItem = (item: UnifiedDraft) => {
    setSelectedId(item.id);
    setSelectedSource(item.source);
  };

  /* ─── Render ─── */

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      transition={pageTransition}
      className="flex flex-col gap-lg py-lg pb-24"
    >
      <PageHero
        eyebrow="Drafts"
        title="草稿箱"
        description="管理 AI 导入和手动保存的赛事草稿，确认后即可发布。"
        actions={(
          <button type="button" className="btn-primary" onClick={() => navigate('/admin/publish')}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            新建赛事
          </button>
        )}
      />

      {/* Filters */}
      <section className="glass-tint flex flex-col gap-3 px-md py-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-[420px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-placeholder">
            search
          </span>
          <input
            className="input-glass h-9 !pl-9 text-[13px]"
            placeholder="搜索赛事名称"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setKeyword(keywordInput.trim());
            }}
          />
        </div>

        {/* Source filter */}
        <div className="flex rounded-sm border border-hairline bg-canvas-parchment p-1">
          {([
            { value: 'all', label: '全部' },
            { value: 'ai', label: 'AI 导入' },
            { value: 'manual', label: '手动创建' },
          ] as const).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilterSource(item.value)}
              className={`flex h-8 items-center rounded-sm px-3 text-[13px] transition ${
                filterSource === item.value
                  ? 'bg-canvas text-primary shadow-sm'
                  : 'text-body-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status filter (AI drafts only) */}
        {filterSource !== 'manual' && (
          <select
            className="input-glass h-9 w-full text-[13px] lg:w-[150px]"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="筛选草稿状态"
          >
            {aiStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}

        <button type="button" className="btn-secondary" onClick={() => setKeyword(keywordInput.trim())}>
          查询
        </button>

        <div className="flex items-center gap-3 text-[12px] text-placeholder lg:ml-auto">
          <span>当前 {unifiedDrafts.length} 条</span>
          <span className="h-3 w-px bg-hairline" />
          <span className={pendingCount ? 'text-warning' : ''}>待审核 {pendingCount} 条</span>
        </div>
      </section>

      {/* Main content */}
      <div className="grid min-h-[680px] grid-cols-1 gap-lg xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left: Draft list */}
        <section className="glass overflow-hidden">
          <div className="border-b border-hairline px-md py-3">
            <h2 className="text-[14px] font-medium text-ink">草稿列表</h2>
          </div>
          <div className="max-h-[760px] overflow-y-auto">
            {loading ? (
              <div className="grid min-h-[240px] place-items-center text-placeholder">
                <span className="material-symbols-outlined animate-spin text-[26px]">progress_activity</span>
              </div>
            ) : unifiedDrafts.length === 0 ? (
              <div className="flex min-h-[280px] w-full min-w-0 flex-col items-center justify-center px-lg text-center">
                <span className="material-symbols-outlined text-[42px] text-placeholder">draft</span>
                <p className="empty-state-copy mt-3 text-[14px] text-ink">暂无匹配草稿</p>
                <p className="empty-state-copy mt-1 text-[12px] text-placeholder">尝试调整筛选条件或新建赛事</p>
              </div>
            ) : (
              <motion.div variants={listContainer} initial="hidden" animate="visible">
                {unifiedDrafts.map((item) => {
                  const selected = item.id === selectedId && item.source === selectedSource;
                  const avg = item.source === 'ai' ? averageConfidence(item.aiDraft?.fieldConfidenceJson) : null;
                  const risky = item.source === 'ai' && (Boolean(item.aiDraft?.duplicateCompetitionId) || toDisplayItems(item.aiDraft?.riskFlagsJson).length > 0);
                  return (
                    <motion.button
                      key={`${item.source}-${item.id}`}
                      type="button"
                      variants={listItem}
                      onClick={() => handleSelectItem(item)}
                      className={`block w-full border-b border-hairline px-md py-md text-left transition last:border-b-0 ${
                        selected ? 'bg-primary-soft' : 'hover:bg-canvas-parchment'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 min-w-0 text-[14px] font-medium leading-5 text-ink">
                          {item.name}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <SourceTag source={item.source} />
                          {item.source === 'ai' ? (
                            <StatusChip status={item.status} />
                          ) : (
                            <span className="chip shrink-0 chip-warning">草稿</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-placeholder">
                        {item.source === 'ai' && item.aiDraft && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              {item.aiDraft.sourceType === 'file' ? 'description' : 'language'}
                            </span>
                            {sourceLabel(item.aiDraft.sourceType)}
                          </span>
                        )}
                        {item.source === 'manual' && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            手动创建
                          </span>
                        )}
                        <span>{formatDateTime(item.updateTime || item.createTime)}</span>
                      </div>
                      {item.source === 'ai' && (
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`text-[11px] ${avg !== null && avg < 0.7 ? 'text-warning' : 'text-body-muted'}`}>
                            置信度 {formatConfidence(avg)}
                          </span>
                          {risky ? (
                            <span className="flex items-center gap-1 text-[11px] text-warning">
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              存在风险
                            </span>
                          ) : (
                            <span className="text-[11px] text-success">未发现重复</span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>
        </section>

        {/* Right: Detail panel */}
        <section className="glass min-w-0 overflow-hidden">
          {!selectedId ? (
            <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[46px] text-placeholder">select_window</span>
              <p className="mt-3 text-[14px] text-ink">选择一条草稿开始审核</p>
            </div>
          ) : selectedSource === 'manual' ? (
            selectedManualDraft ? (
              <ManualDraftDetail
                competition={selectedManualDraft}
                onEdit={() => navigate(`/admin/publish/${selectedManualDraft.id}`)}
              />
            ) : (
              <div className="grid min-h-[620px] place-items-center text-placeholder">
                <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
              </div>
            )
          ) : detailLoading ? (
            <div className="grid min-h-[620px] place-items-center text-placeholder">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : selectedDraft ? (
            <div>
              {/* AI draft header */}
              <div className="flex flex-col gap-3 border-b border-hairline px-lg py-md sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={selectedDraft.status} />
                    <span className="chip">{sourceLabel(selectedDraft.sourceType)}</span>
                    {selectedDraft.aiTaskId && <span className="text-[11px] text-placeholder">任务 #{selectedDraft.aiTaskId}</span>}
                  </div>
                  <p className="mt-2 truncate text-[12px] text-placeholder" title={selectedDraft.sourceUrl}>
                    {selectedDraft.sourceUrl || '无来源地址'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedDraft.sourceUrl?.startsWith('http') && (
                    <a
                      className="icon-button"
                      href={selectedDraft.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="打开来源网页"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={saving || selectedDraft.status !== 'pending_review'}
                    onClick={() => saveDraft()}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${saving ? 'animate-spin' : ''}`}>
                      {saving ? 'progress_activity' : 'save'}
                    </span>
                    保存
                  </button>
                </div>
              </div>

              {/* Confirmed banner */}
              {selectedDraft.status === 'confirmed' && (
                <div className="flex flex-col gap-3 border-b border-green-200 bg-green-50 px-lg py-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[20px] text-success">check_circle</span>
                    <div>
                      <p className="text-[13px] font-medium text-green-900">已创建未发布赛事</p>
                      <p className="mt-1 text-[12px] text-green-700">请在现有赛事编辑页补充封面并完成发布。</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => navigate('/admin/competitions')}>
                      赛事管理
                    </button>
                    {selectedDraft.competitionId && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => navigate(`/admin/publish/${selectedDraft.competitionId}`)}
                      >
                        继续编辑
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* AI draft form */}
              <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="p-lg">
                  <fieldset disabled={selectedDraft.status !== 'pending_review'} className="flex flex-col gap-lg disabled:opacity-75">
                    <div>
                      <h2 className="mb-md flex items-center gap-2 text-[15px] font-medium text-ink">
                        <span className="material-symbols-outlined text-[19px] text-primary">edit_note</span>
                        赛事字段
                      </h2>
                      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                        <Field label="赛事名称" required className="md:col-span-2">
                          <input className="input-glass" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
                        </Field>
                        <Field label="赛事级别">
                          <select className="input-glass" value={form.level} onChange={(event) => updateField('level', event.target.value)}>
                            <option value="">请选择</option>
                            <option value="国家级">国家级</option>
                            <option value="省级">省级</option>
                            <option value="校级">校级</option>
                            <option value="院级">院级</option>
                          </select>
                        </Field>
                        <Field label="赛事分类">
                          <select className="input-glass" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                            <option value="">请选择</option>
                            {categoryOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="主办单位" className="md:col-span-2">
                          <input className="input-glass" value={form.organizer} onChange={(event) => updateField('organizer', event.target.value)} />
                        </Field>
                        <Field label="报名开始">
                          <input type="datetime-local" className="input-glass" value={form.startTime} onChange={(event) => updateField('startTime', event.target.value)} />
                        </Field>
                        <Field label="报名截止">
                          <input type="datetime-local" className="input-glass" value={form.endTime} onChange={(event) => updateField('endTime', event.target.value)} />
                        </Field>
                        <Field label="比赛开始">
                          <input type="datetime-local" className="input-glass" value={form.competitionStart} onChange={(event) => updateField('competitionStart', event.target.value)} />
                        </Field>
                        <Field label="比赛结束">
                          <input type="datetime-local" className="input-glass" value={form.competitionEnd} onChange={(event) => updateField('competitionEnd', event.target.value)} />
                        </Field>
                        <Field label="最大团队人数">
                          <input type="number" min="1" className="input-glass" value={form.maxTeamSize} onChange={(event) => updateField('maxTeamSize', event.target.value)} />
                        </Field>
                        <Field label="来源标题">
                          <input className="input-glass" value={form.sourceTitle} onChange={(event) => updateField('sourceTitle', event.target.value)} />
                        </Field>
                        <Field label="标签" hint="使用逗号分隔" className="md:col-span-2">
                          <input className="input-glass" value={form.tags} onChange={(event) => updateField('tags', event.target.value)} />
                        </Field>
                        <Field label="赛道" hint="使用逗号分隔" className="md:col-span-2">
                          <input className="input-glass" value={form.tracks} onChange={(event) => updateField('tracks', event.target.value)} />
                        </Field>
                        <Field label="赛事内容" className="md:col-span-2">
                          <textarea
                            className="input-glass !h-auto resize-y py-3"
                            rows={9}
                            value={form.content}
                            onChange={(event) => updateField('content', event.target.value)}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="border-t border-hairline pt-lg">
                      <h2 className="mb-md flex items-center gap-2 text-[15px] font-medium text-ink">
                        <span className="material-symbols-outlined text-[19px] text-primary">rate_review</span>
                        审核意见
                      </h2>
                      <textarea
                        className="input-glass !h-auto resize-none py-3"
                        rows={3}
                        placeholder="可填写修改说明、忽略原因或确认备注"
                        value={form.reviewNote}
                        onChange={(event) => updateField('reviewNote', event.target.value)}
                      />
                    </div>
                  </fieldset>
                </div>

                <aside className="border-t border-hairline bg-canvas-parchment/50 p-lg 2xl:border-l 2xl:border-t-0">
                  <QualityPanel
                    confidenceItems={confidenceItems}
                    evidenceItems={evidenceItems}
                    riskItems={riskItems}
                    duplicateCompetitionId={selectedDraft.duplicateCompetitionId}
                    duplicateScore={selectedDraft.duplicateScore}
                    onOpenDuplicate={() => navigate(`/admin/publish/${selectedDraft.duplicateCompetitionId}`)}
                  />
                </aside>
              </div>

              {/* AI draft action bar */}
              {selectedDraft.status === 'pending_review' && (
                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-hairline bg-canvas/95 px-lg py-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[12px] text-placeholder">确认操作会先保存当前页面中的修改。</p>
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" className="btn-danger" disabled={Boolean(action) || saving} onClick={handleIgnore}>
                      <span className={`material-symbols-outlined text-[18px] ${action === 'ignore' ? 'animate-spin' : ''}`}>
                        {action === 'ignore' ? 'progress_activity' : 'block'}
                      </span>
                      忽略草稿
                    </button>
                    <button type="button" className="btn-primary" disabled={Boolean(action) || saving} onClick={handleConfirm}>
                      <span className={`material-symbols-outlined text-[18px] ${action === 'confirm' ? 'animate-spin' : ''}`}>
                        {action === 'confirm' ? 'progress_activity' : 'check_circle'}
                      </span>
                      确认并进入赛事管理
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>

      <ConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={onConfirm}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
      />
    </motion.div>
  );
}
