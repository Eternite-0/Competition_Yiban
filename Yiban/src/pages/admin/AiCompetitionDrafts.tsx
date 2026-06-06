import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';
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

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending_review', label: '待审核' },
  { value: 'confirmed', label: '已确认' },
  { value: 'ignored', label: '已忽略' },
];

const statusMeta: Record<string, { label: string; className: string }> = {
  pending_review: { label: '待审核', className: 'chip-warning' },
  confirmed: { label: '已确认', className: 'chip-success' },
  ignored: { label: '已忽略', className: 'chip-closed' },
  merged: { label: '已合并', className: 'chip-info' },
};

const categoryOptions = [
  { value: 'A', label: '科技创新' },
  { value: 'B', label: '商业创业' },
  { value: 'C', label: '文化艺术' },
];

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

function draftToForm(draft: AiCompetitionDraftVO): DraftFormState {
  return {
    name: draft.name || '',
    sourceTitle: draft.sourceTitle || '',
    level: draft.level || '',
    category: draft.category || '',
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

function StatusChip({ status }: { status?: string }) {
  const meta = statusMeta[status || ''] || { label: status || '未知', className: '' };
  return <span className={`chip ${meta.className}`}>{meta.label}</span>;
}

export default function AiCompetitionDrafts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drafts, setDrafts] = useState<AiCompetitionDraftVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('draft') || '');
  const [selectedDraft, setSelectedDraft] = useState<AiCompetitionDraftVO | null>(null);
  const [form, setForm] = useState<DraftFormState>(emptyForm);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<'confirm' | 'ignore' | null>(null);
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

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAiCompetitionDrafts({
        current: 1,
        size: 100,
        status: status || undefined,
        keyword: keyword || undefined,
      });
      const records = Array.isArray(result) ? result : (result.records || []);
      setDrafts(records);
      setSelectedId((current) => {
        if (current && records.some((item) => String(item.id) === current)) return current;
        return records.length ? String(records[0].id) : '';
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载 AI 草稿失败');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, status]);

  const loadDetail = useCallback(async (id: string) => {
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
      return next;
    }, { replace: true });
    loadDetail(selectedId);
  }, [loadDetail, selectedId, setSearchParams]);

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

  const updateField = <K extends keyof DraftFormState>(field: K, value: DraftFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const syncDraft = (updated: AiCompetitionDraftVO) => {
    setSelectedDraft(updated);
    setForm(draftToForm(updated));
    setDrafts((items) => items.map((item) => (String(item.id) === String(updated.id) ? updated : item)));
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

  const pendingCount = drafts.filter((item) => item.status === 'pending_review').length;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      transition={pageTransition}
      className="flex flex-col gap-lg py-lg pb-24"
    >
      <PageHero
        eyebrow="AI Draft Review"
        title="AI 草稿箱"
        description="核对 AI 提取字段、证据和重复风险，确认后再进入现有赛事发布流程。"
        actions={(
          <button type="button" className="btn-primary" onClick={() => navigate('/admin/ai-import')}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            导入赛事
          </button>
        )}
      />

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
        <select
          className="input-glass h-9 w-full text-[13px] lg:w-[150px]"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="筛选草稿状态"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button type="button" className="btn-secondary" onClick={() => setKeyword(keywordInput.trim())}>
          查询
        </button>
        <div className="flex items-center gap-3 text-[12px] text-placeholder lg:ml-auto">
          <span>当前 {drafts.length} 条</span>
          <span className="h-3 w-px bg-hairline" />
          <span className={pendingCount ? 'text-warning' : ''}>待审核 {pendingCount} 条</span>
        </div>
      </section>

      <div className="grid min-h-[680px] grid-cols-1 gap-lg xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="glass overflow-hidden">
          <div className="border-b border-hairline px-md py-3">
            <h2 className="text-[14px] font-medium text-ink">草稿列表</h2>
          </div>
          <div className="max-h-[760px] overflow-y-auto">
            {loading ? (
              <div className="grid min-h-[240px] place-items-center text-placeholder">
                <span className="material-symbols-outlined animate-spin text-[26px]">progress_activity</span>
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-lg text-center">
                <span className="material-symbols-outlined text-[42px] text-placeholder">draft</span>
                <p className="mt-3 text-[14px] text-ink">暂无匹配草稿</p>
                <p className="mt-1 text-[12px] text-placeholder">尝试调整筛选条件或导入新赛事</p>
              </div>
            ) : (
              <motion.div variants={listContainer} initial="hidden" animate="visible">
                {drafts.map((draft) => {
                  const selected = String(draft.id) === selectedId;
                  const avg = averageConfidence(draft.fieldConfidenceJson);
                  const risky = Boolean(draft.duplicateCompetitionId) || toDisplayItems(draft.riskFlagsJson).length > 0;
                  return (
                    <motion.button
                      key={draft.id}
                      type="button"
                      variants={listItem}
                      onClick={() => setSelectedId(String(draft.id))}
                      className={`block w-full border-b border-hairline px-md py-md text-left transition last:border-b-0 ${
                        selected ? 'bg-primary-soft' : 'hover:bg-canvas-parchment'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 min-w-0 text-[14px] font-medium leading-5 text-ink">
                          {draft.name || '未命名赛事'}
                        </h3>
                        <StatusChip status={draft.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-placeholder">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            {draft.sourceType === 'file' ? 'description' : 'language'}
                          </span>
                          {sourceLabel(draft.sourceType)}
                        </span>
                        <span>{formatDateTime(draft.updateTime || draft.createTime)}</span>
                      </div>
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
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>
        </section>

        <section className="glass min-w-0 overflow-hidden">
          {!selectedId ? (
            <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[46px] text-placeholder">select_window</span>
              <p className="mt-3 text-[14px] text-ink">选择一条草稿开始审核</p>
            </div>
          ) : detailLoading ? (
            <div className="grid min-h-[620px] place-items-center text-placeholder">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : selectedDraft ? (
            <div>
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
                    <p className="text-[11px] font-medium text-error">{item.label}</p>
                    <p className="mt-1 break-words text-[12px] leading-5 text-red-800">{item.value}</p>
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
    <div className="flex flex-col items-center py-xl text-center">
      <span className={`material-symbols-outlined text-[34px] ${positive ? 'text-success' : 'text-placeholder'}`}>
        {positive ? 'verified' : 'data_info_alert'}
      </span>
      <p className="mt-2 text-[12px] text-placeholder">{text}</p>
    </div>
  );
}
