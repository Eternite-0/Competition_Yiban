import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import {
  createCompetitionSource,
  crawlEnabledCompetitionSources,
  crawlCompetitionSource,
  deleteCompetitionSource,
  listCompetitionSources,
  updateCompetitionSource,
  type CompetitionSource,
  type CompetitionSourcePayload,
  type CompetitionSourceType,
  type CrawlFrequency,
} from '../../api/competitionSource';
import {
  averageConfidence,
  formatConfidence,
  listAiCompetitionDrafts,
  toDisplayItems,
  type AiCompetitionDraftVO,
} from '../../api/aiCompetition';
import { listContainer, listItem, pageTransition, pageVariants } from '../../lib/motion';

const sourceTypeOptions: Array<{ value: CompetitionSourceType; label: string }> = [
  { value: 'whitelist', label: '赛事白名单' },
  { value: 'school', label: '学校官网' },
  { value: 'government', label: '政府/教育部门' },
  { value: 'enterprise', label: '企业赛事官网' },
  { value: 'custom', label: '自定义来源' },
];

const frequencyOptions: Array<{ value: CrawlFrequency; label: string }> = [
  { value: 'manual', label: '仅手动' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
];

const defaultForm: CompetitionSourcePayload = {
  name: '',
  url: '',
  sourceType: 'custom',
  crawlFrequency: 'manual',
  enabled: true,
};

function isEnabled(source: CompetitionSource) {
  return source.enabled === true || source.enabled === 1;
}

function typeLabel(type: CompetitionSourceType) {
  return sourceTypeOptions.find((item) => item.value === type)?.label || type;
}

function frequencyLabel(frequency: CrawlFrequency) {
  return frequencyOptions.find((item) => item.value === frequency)?.label || frequency;
}

function formatDateTime(value?: string) {
  if (!value) return '尚未采集';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function crawlStatusMeta(status?: string) {
  const normalized = status?.toLowerCase() || '';
  if (['success', 'succeeded', 'completed'].includes(normalized)) {
    return { label: '采集成功', className: 'chip-success', icon: 'check_circle' };
  }
  if (['running', 'processing', 'pending'].includes(normalized)) {
    return { label: '采集中', className: 'chip-info', icon: 'progress_activity' };
  }
  if (['failed', 'error'].includes(normalized)) {
    return { label: '采集失败', className: 'chip-error', icon: 'error' };
  }
  return { label: status || '未采集', className: '', icon: 'schedule' };
}

export default function CompetitionSourceManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sources' | 'results'>('sources');
  const [sources, setSources] = useState<CompetitionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState<CompetitionSourcePayload>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [batchCrawling, setBatchCrawling] = useState(false);
  const [togglingId, setTogglingId] = useState<number | string | null>(null);
  const [crawlingIds, setCrawlingIds] = useState<Set<string>>(new Set());
  const [crawlDrafts, setCrawlDrafts] = useState<AiCompetitionDraftVO[]>([]);
  const [crawlLoading, setCrawlLoading] = useState(false);
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

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCompetitionSources();
      const records = Array.isArray(result) ? result : (result.records || result.list || []);
      setSources(records);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载赛事来源失败');
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const loadCrawlResults = useCallback(async () => {
    setCrawlLoading(true);
    try {
      const result = await listAiCompetitionDrafts({ current: 1, size: 100 });
      const records = Array.isArray(result) ? result : (result.records || []);
      setCrawlDrafts(records.filter((d) => d.sourceType === 'crawler' || d.sourceType === 'crawl' || d.sourceType === 'url'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载采集结果失败');
      setCrawlDrafts([]);
    } finally {
      setCrawlLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'results') loadCrawlResults();
  }, [activeTab, loadCrawlResults]);

  const filteredSources = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return sources.filter((source) => {
      if (enabledFilter === 'enabled' && !isEnabled(source)) return false;
      if (enabledFilter === 'disabled' && isEnabled(source)) return false;
      if (!normalizedKeyword) return true;
      return source.name.toLowerCase().includes(normalizedKeyword)
        || source.url.toLowerCase().includes(normalizedKeyword);
    });
  }, [enabledFilter, keyword, sources]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (source: CompetitionSource) => {
    setEditingId(source.id);
    setForm({
      name: source.name,
      url: source.url,
      sourceType: source.sourceType,
      crawlFrequency: source.crawlFrequency,
      enabled: isEnabled(source),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('请填写来源名称');
      return;
    }
    try {
      const parsed = new URL(form.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      toast.error('请输入有效的 HTTP 或 HTTPS 地址');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), url: form.url.trim() };
      if (editingId !== null) {
        await updateCompetitionSource(editingId, payload);
        toast.success('赛事来源已更新');
      } else {
        await createCompetitionSource(payload);
        toast.success('赛事来源已添加');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      await loadSources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存赛事来源失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (source: CompetitionSource) => {
    const nextEnabled = !isEnabled(source);
    setTogglingId(source.id);
    try {
      await updateCompetitionSource(source.id, { enabled: nextEnabled });
      setSources((items) => items.map((item) => (
        String(item.id) === String(source.id) ? { ...item, enabled: nextEnabled } : item
      )));
      toast.success(nextEnabled ? '来源已启用' : '来源已停用');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新来源状态失败');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (source: CompetitionSource) => {
    const accepted = await confirm({
      title: '删除赛事来源',
      message: `确定删除“${source.name}”吗？已生成的 AI 草稿不会被删除。`,
      confirmText: '确认删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!accepted) return;
    try {
      await deleteCompetitionSource(source.id);
      setSources((items) => items.filter((item) => String(item.id) !== String(source.id)));
      toast.success('赛事来源已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除赛事来源失败');
    }
  };

  const handleCrawl = async (source: CompetitionSource) => {
    const key = String(source.id);
    setCrawlingIds((current) => new Set(current).add(key));
    try {
      await crawlCompetitionSource(source.id);
      toast.success('采集任务已触发，结果将进入 AI 草稿箱');
      await loadSources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '手动采集失败');
    } finally {
      setCrawlingIds((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const handleCrawlEnabled = async () => {
    setBatchCrawling(true);
    try {
      const result = await crawlEnabledCompetitionSources();
      toast.success(`已采集 ${result.total} 个启用来源，生成 ${result.created} 条草稿`);
      await loadSources();
      if (activeTab === 'results') await loadCrawlResults();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批量采集失败');
    } finally {
      setBatchCrawling(false);
    }
  };

  const enabledCount = sources.filter(isEnabled).length;
  const failedCount = sources.filter((source) => ['failed', 'error'].includes(source.lastCrawlStatus?.toLowerCase() || '')).length;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      transition={pageTransition}
      className="flex flex-col gap-4 pb-24"
    >
      <PageHero
        eyebrow="Competition Sources"
        title="赛事来源管理"
        description="维护公开赛事网页来源，控制采集频率并查看最近一次采集结果。"
        actions={(
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" disabled={batchCrawling || enabledCount === 0} onClick={handleCrawlEnabled}>
              <span className={`material-symbols-outlined text-[18px] ${batchCrawling ? 'animate-spin' : ''}`}>
                {batchCrawling ? 'progress_activity' : 'sync'}
              </span>
              采集启用来源
            </button>
            <button type="button" className="btn-primary" onClick={openCreate}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              新增来源
            </button>
          </div>
        )}
      />

      {/* Tab bar */}
      <div className="flex rounded-sm border border-hairline bg-surface-tile-1 p-1 self-start">
        {([
          { key: 'sources', icon: 'hub', label: '来源管理' },
          { key: 'results', icon: 'analytics', label: `采集结果 (${crawlDrafts.length})` },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex h-9 items-center gap-1.5 rounded-sm px-4 text-[13px] font-medium transition ${
              activeTab === tab.key
                ? 'bg-canvas text-ink shadow-none'
                : 'text-body-muted hover:text-ink'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sources' && (
      <>
      <div className="stat-grid !grid-cols-1 sm:!grid-cols-3">
        {[
          { label: '来源总数', value: sources.length, icon: 'hub', hint: '全部来源' },
          { label: '已启用', value: enabledCount, icon: 'toggle_on', hint: '可自动采集' },
          { label: '最近失败', value: failedCount, icon: 'error', hint: failedCount ? '需关注' : '暂无失败' },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <div className="stat-card-label">{item.label}</div>
            <div className="stat-card-value">{item.value}</div>
            <div className="stat-card-hint">
              <span className="material-symbols-outlined align-middle text-[14px] text-placeholder">{item.icon}</span>
              {' '}{item.hint}
            </div>
          </div>
        ))}
      </div>

      <section className="filter-bar">
        <div className="relative min-w-0 flex-1 sm:max-w-[420px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-placeholder">
            search
          </span>
          <input
            className="input-glass h-9 !pl-9 text-[13px]"
            placeholder="搜索来源名称或 URL"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <select
          className="input-glass h-9 w-full text-[13px] sm:w-[140px]"
          value={enabledFilter}
          onChange={(event) => setEnabledFilter(event.target.value as typeof enabledFilter)}
          aria-label="筛选启用状态"
        >
          <option value="all">全部状态</option>
          <option value="enabled">已启用</option>
          <option value="disabled">已停用</option>
        </select>
        <span className="text-[12px] text-placeholder sm:ml-auto">显示 {filteredSources.length} 条</span>
      </section>

      <section className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">来源列表</h2>
          <span className="chip tabular-nums">{filteredSources.length} 条</span>
        </div>
        {loading ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined">travel_explore</span>
            <p className="text-[13px]">暂无赛事来源</p>
            <p className="text-[12px] text-placeholder">新增公开网页来源后即可触发采集</p>
            {!keyword && enabledFilter === 'all' && (
              <button type="button" className="btn-primary mt-2" onClick={openCreate}>
                <span className="material-symbols-outlined">add</span>
                新增来源
              </button>
            )}
          </div>
        ) : (
          <div className="data-table-wrap !rounded-none !border-0">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th>来源</th>
                  <th>类型/频率</th>
                  <th>启用状态</th>
                  <th>最近采集</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <motion.tbody variants={listContainer} initial="hidden" animate="visible">
                {filteredSources.map((source) => {
                  const status = crawlStatusMeta(source.lastCrawlStatus);
                  const crawling = crawlingIds.has(String(source.id));
                  return (
                    <motion.tr
                      key={source.id}
                      variants={listItem}
                      className="border-b border-hairline align-top transition last:border-0 hover:bg-hover-overlay"
                    >
                      <td className="px-md py-md">
                        <div className="max-w-[340px]">
                          <p className="text-[13px] font-medium text-ink">{source.name}</p>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            title={source.url}
                            className="mt-1 block truncate text-[12px] text-body-muted hover:underline"
                          >
                            {source.url}
                          </a>
                        </div>
                      </td>
                      <td className="px-md py-md">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="chip">{typeLabel(source.sourceType)}</span>
                          <span className="chip chip-info">{frequencyLabel(source.crawlFrequency)}</span>
                        </div>
                      </td>
                      <td className="px-md py-md">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled(source)}
                          disabled={String(togglingId) === String(source.id)}
                          onClick={() => handleToggle(source)}
                          className="flex items-center gap-2 text-[12px] text-body-muted"
                        >
                          <span className={`relative h-5 w-9 rounded-full transition ${
                            isEnabled(source) ? 'bg-primary' : 'bg-hairline'
                          }`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-canvas shadow-none transition ${
                              isEnabled(source) ? 'left-[18px]' : 'left-0.5'
                            }`} />
                          </span>
                          {String(togglingId) === String(source.id)
                            ? '更新中'
                            : isEnabled(source) ? '已启用' : '已停用'}
                        </button>
                      </td>
                      <td className="px-md py-md">
                        <div className="max-w-[260px]">
                          <span className={`chip ${status.className}`}>
                            <span className={`material-symbols-outlined text-[14px] ${
                              crawling || status.icon === 'progress_activity' ? 'animate-spin' : ''
                            }`}>
                              {crawling ? 'progress_activity' : status.icon}
                            </span>
                            {crawling ? '采集中' : status.label}
                          </span>
                          <p className="mt-1.5 text-[11px] text-placeholder">{formatDateTime(source.lastCrawlTime)}</p>
                          {source.lastErrorMessage && (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-error" title={source.lastErrorMessage}>
                              {source.lastErrorMessage}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-md py-md text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="icon-button"
                            title={isEnabled(source) ? '手动采集' : '启用后才能采集'}
                            disabled={!isEnabled(source) || crawling}
                            onClick={() => handleCrawl(source)}
                          >
                            <span className={`material-symbols-outlined text-[18px] ${crawling ? 'animate-spin' : ''}`}>
                              {crawling ? 'progress_activity' : 'sync'}
                            </span>
                          </button>
                          <button type="button" className="icon-button" title="编辑来源" onClick={() => openEdit(source)}>
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            className="icon-button hover:!text-error"
                            title="删除来源"
                            onClick={() => handleDelete(source)}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>
      </>
      )}

      {/* Crawl Results Tab */}
      {activeTab === 'results' && (
        <section className="section-card">
          {crawlLoading ? (
            <div className="grid min-h-[320px] place-items-center text-placeholder">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : crawlDrafts.length === 0 ? (
            <div className="flex min-h-[360px] w-full min-w-0 flex-col items-center justify-center px-lg text-center">
              <span className="material-symbols-outlined text-[46px] text-placeholder">analytics</span>
              <p className="empty-state-copy mt-3 text-[14px] text-ink">暂无采集结果</p>
              <p className="empty-state-copy mt-1 text-[12px] text-placeholder">触发采集后，抓取到的赛事将显示在这里</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 divide-y divide-hairline">
              {crawlDrafts.map((draft) => {
                const avg = averageConfidence(draft.fieldConfidenceJson);
                const risky = Boolean(draft.duplicateCompetitionId) || toDisplayItems(draft.riskFlagsJson).length > 0;
                const statusLabel = draft.status === 'confirmed' ? '已确认' : draft.status === 'ignored' ? '已忽略' : '待审核';
                const statusClass = draft.status === 'confirmed' ? 'chip-success' : draft.status === 'ignored' ? 'chip-closed' : 'chip-warning';
                return (
                  <div key={draft.id} className="flex items-center gap-4 px-lg py-md transition hover:bg-hover-overlay">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-medium text-ink">{draft.name || '未命名赛事'}</h3>
                        <span className={`chip shrink-0 ${statusClass}`}>{statusLabel}</span>
                        {risky && (
                          <span className="flex items-center gap-1 chip shrink-0 chip-warning">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            风险
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-placeholder">
                        {draft.sourceUrl && (
                          <a href={draft.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink truncate max-w-[300px]">
                            <span className="material-symbols-outlined text-[14px]">link</span>
                            {draft.sourceUrl}
                          </a>
                        )}
                        <span>{draft.createTime ? new Date(draft.createTime).toLocaleString('zh-CN') : '—'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[12px]">
                      {avg !== null && (
                        <span className={`tabular-nums ${avg < 0.7 ? 'text-warning' : 'text-placeholder'}`}>
                          置信度 {formatConfidence(avg)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn-secondary !py-1.5 !text-[12px]"
                        onClick={() => navigate(`/admin/drafts?draft=${draft.id}&source=ai`)}
                      >
                        查看
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="关闭来源编辑"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="source-form-title"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="section-card relative w-full max-w-[560px] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-hairline px-lg py-md">
                <div>
                  <h2 id="source-form-title" className="text-[17px] font-medium text-ink">
                    {editingId !== null ? '编辑赛事来源' : '新增赛事来源'}
                  </h2>
                  <p className="mt-1 text-[12px] text-placeholder">仅配置公开可访问的网页地址</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="关闭">
                  <span className="material-symbols-outlined text-[19px]">close</span>
                </button>
              </div>
              <div className="grid grid-cols-1 gap-md p-lg sm:grid-cols-2">
                <Field label="来源名称" required className="sm:col-span-2">
                  <input
                    className="input-glass"
                    placeholder="例如：全国大学生竞赛分析报告"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </Field>
                <Field label="来源 URL" required className="sm:col-span-2">
                  <input
                    type="url"
                    className="input-glass"
                    placeholder="https://..."
                    value={form.url}
                    onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  />
                </Field>
                <Field label="来源类型">
                  <select
                    className="input-glass"
                    value={form.sourceType}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      sourceType: event.target.value as CompetitionSourceType,
                    }))}
                  >
                    {sourceTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="采集频率">
                  <select
                    className="input-glass"
                    value={form.crawlFrequency}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      crawlFrequency: event.target.value as CrawlFrequency,
                    }))}
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center justify-between rounded-sm border border-hairline bg-surface-tile-1 px-md py-3 sm:col-span-2">
                  <span>
                    <span className="block text-[13px] font-medium text-ink">启用来源</span>
                    <span className="mt-0.5 block text-[11px] text-placeholder">停用后不会执行手动或定时采集</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-hairline px-lg py-md">
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => setShowForm(false)}>
                  取消
                </button>
                <button type="button" className="btn-primary min-w-[100px]" disabled={saving} onClick={handleSave}>
                  <span className={`material-symbols-outlined text-[18px] ${saving ? 'animate-spin' : ''}`}>
                    {saving ? 'progress_activity' : 'save'}
                  </span>
                  {saving ? '保存中' : '保存'}
                </button>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

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
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[12px] font-medium text-body-muted">
        {required && <span className="mr-1 text-error">*</span>}
        {label}
      </span>
      {children}
    </label>
  );
}
