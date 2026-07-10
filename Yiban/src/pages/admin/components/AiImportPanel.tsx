import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  averageConfidence,
  formatConfidence,
  parseCompetitionFileBatch,
  streamParseCompetitionUrlBatch,
  toConfidenceItems,
  toDisplayItems,
  toStringList,
  type AiCompetitionDraftVO,
  type AiCompetitionParseResultVO,
  type ParseProgress,
} from '../../../api/aiCompetition';
import { listContainer, listItem } from '../../../lib/motion';

type ImportMode = 'file' | 'url';

const acceptedTypes = '.pdf,.docx,.txt,.md,.html,.htm,.png,.jpg,.jpeg,.webp';

function formatDate(value?: string) {
  if (!value) return '待补充';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN');
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

function warningLabel(value: string) {
  const labels: Record<string, string> = {
    no_competitions_detected: '未识别到赛事',
    pdf_scan_image_fallback: '扫描 PDF 兜底',
    possible_dynamic_page: '疑似动态页',
    image_only_file: '图片文件',
    image_only_url: '图片链接',
    multiple_registration_windows: '存在多个报名窗口，已自动取最早开始和最晚截止',
    registration_time_corrected_from_source: '报名时间已根据原文自动修正',
    approximate_competition_time: '比赛时间由月份/旬级描述推断',
    multi_stage_competition_time: '存在多个比赛阶段，已自动汇总起止时间',
    duplicate_competition: '疑似重复赛事',
    duplicate_pending_draft: '存在相似待审核草稿',
    missing_registration_end: '报名截止待补充',
  };
  return labels[value] || value;
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

function toInputDate(value?: string) {
  if (!value) return '';
  const matched = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (matched) return matched[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function aiDraftToPublishForm(draft: AiCompetitionDraftVO) {
  return {
    title: draft.name || '',
    level: normalizeDraftLevel(draft.level) as any,
    category: normalizeDraftCategory(draft.category) as any,
    organizer: draft.organizer || '',
    regStart: toInputDate(draft.startTime),
    regEnd: toInputDate(draft.endTime),
    compStart: toInputDate(draft.competitionStart),
    compEnd: toInputDate(draft.competitionEnd),
    description: draft.content || '',
    tags: toStringList(draft.tags).join(', '),
    sourceUrl: draft.sourceUrl || '',
    maxTeamSize: draft.maxTeamSize || 5,
    tracks: toStringList(draft.tracks),
  };
}

interface AiImportPanelProps {
  onParsed: (draft: AiCompetitionDraftVO) => void;
}

export default function AiImportPanel({ onParsed }: AiImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<ImportMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AiCompetitionParseResultVO | null>(null);
  const [progress, setProgress] = useState<ParseProgress | null>(null);

  const drafts = result?.drafts || [];
  const warnings = result?.warnings || [];

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    const maxSize = 20 * 1024 * 1024;
    if (nextFile.size > maxSize) {
      toast.error('文件大小不能超过 20MB');
      return;
    }
    setFile(nextFile);
    setResult(null);
    setError('');
  };

  const handleParse = async () => {
    if (mode === 'file' && !file) {
      toast.error('请先选择赛事通知文件');
      return;
    }
    if (mode === 'url') {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        toast.error('请输入完整有效的网页 URL');
        return;
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setParsing(true);
    setError('');
    setResult(null);
    setProgress(null);
    try {
      const parsedResult = mode === 'file'
        ? await parseCompetitionFileBatch(file as File)
        : await streamParseCompetitionUrlBatch(url.trim(), {
          signal: controller.signal,
          onProgress: (p) => setProgress(p),
        });
      setResult(parsedResult);
      const count = parsedResult.drafts?.length || 0;
      if (count > 0) {
        toast.success(`解析完成，已生成 ${count} 条 AI 草稿`);
      } else {
        toast.warning('解析完成，但未识别到可用赛事');
      }
    } catch (parseError) {
      if (parseError instanceof DOMException && parseError.name === 'AbortError') return;
      const message = parseError instanceof Error ? parseError.message : '解析失败，请稍后重试';
      setError(message);
      toast.error(message);
    } finally {
      setParsing(false);
      setProgress(null);
      abortRef.current = null;
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setFile(null);
    setUrl('');
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="section-card">
        <div className="section-card-header">
          <div>
            <h2 className="section-card-title">选择导入方式</h2>
            <p className="mt-1 text-[12px] text-placeholder">上传赛事通知文件或提供公开网页地址</p>
          </div>
          <div className="flex rounded-sm border border-hairline bg-surface-tile-1 p-1">
            {([
              { value: 'file', icon: 'upload_file', label: '文件' },
              { value: 'url', icon: 'link', label: 'URL' },
            ] as const).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value);
                  setResult(null);
                  setError('');
                }}
                className={`flex h-8 items-center gap-1.5 rounded-sm px-3 text-[13px] transition ${
                  mode === item.value
                    ? 'bg-canvas text-ink shadow-none'
                    : 'text-body-muted hover:text-ink'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-card-body">
          <AnimatePresence mode="wait">
            {mode === 'file' ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex flex-col gap-md"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    chooseFile(event.dataTransfer.files[0]);
                  }}
                  className={`flex min-h-[200px] w-full flex-col items-center justify-center rounded-sm border border-dashed px-lg py-xl text-center transition ${
                    dragging
                      ? 'border-primary bg-primary-soft'
                      : 'border-hairline bg-surface-tile-1 hover:border-primary/50'
                  }`}
                >
                  <span className="material-symbols-outlined mb-3 text-[38px] text-body-muted">
                    {file ? 'description' : 'upload_file'}
                  </span>
                  <span className="text-[15px] font-medium text-ink">
                    {file ? file.name : '点击选择或拖拽赛事通知'}
                  </span>
                  <span className="mt-2 max-w-[420px] text-[12px] leading-5 text-placeholder" style={{ textWrap: 'pretty' }}>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · 点击可重新选择`
                      : '支持 PDF、DOCX、TXT、Markdown、HTML 与常见图片格式，最大 20MB'}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedTypes}
                  className="hidden"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                />
              </motion.div>
            ) : (
              <motion.div
                key="url"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex min-h-[200px] flex-col justify-center"
              >
                <label htmlFor="competition-url" className="mb-2 text-[13px] font-medium text-ink">
                  赛事网页地址
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-placeholder">
                    language
                  </span>
                  <input
                    id="competition-url"
                    type="url"
                    className="input-glass !pl-10"
                    placeholder="https://example.edu.cn/competition/notice"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !parsing) handleParse();
                    }}
                  />
                </div>
                <p className="mt-3 text-[12px] leading-5 text-placeholder">
                  仅支持无需登录即可访问的公开网页、PDF 或赛事详情页。
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {error ? (
            <div className="mt-md flex items-start gap-2 rounded-sm border border-border bg-surface-tile-1 px-md py-3 text-[13px] text-error">
              <span className="material-symbols-outlined mt-px text-[18px]">error</span>
              <span className="min-w-0 flex-1">{error}</span>
            </div>
          ) : null}

          {parsing && (
            <div className="mt-md flex items-center gap-3 rounded-sm border border-primary/20 bg-primary-soft px-md py-3">
              {(['scraping', 'analyzing', 'generating'] as const).map((step, i) => {
                const labels: Record<string, string> = { scraping: '抓取内容', analyzing: 'AI 分析', generating: '生成草稿' };
                const current = progress?.step === step || (!progress && i === (mode === 'file' ? 1 : 0));
                const done = progress ? ['scraping', 'analyzing', 'generating'].indexOf(progress.step) > i : false;
                return (
                  <div key={step} className="flex items-center gap-2">
                    {i > 0 && <span className="text-[11px] text-placeholder">—</span>}
                    <span className={`material-symbols-outlined text-[16px] ${done ? 'text-success' : current ? 'text-body-muted animate-spin' : 'text-placeholder'}`}>
                      {done ? 'check_circle' : current ? 'progress_activity' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-[12px] ${done ? 'text-success' : current ? 'text-body-muted font-medium' : 'text-placeholder'}`}>
                      {labels[step]}
                    </span>
                  </div>
                );
              })}
              <span className="ml-auto text-[12px] text-body-muted">{progress?.message || '正在解析'}</span>
            </div>
          )}

          <div className="mt-lg flex items-center justify-end gap-2 border-t border-hairline pt-md">
            {(file || url || result) && (
              <button type="button" className="btn-secondary" disabled={parsing} onClick={reset}>
                清空
              </button>
            )}
            <button type="button" className="btn-primary min-w-[132px]" disabled={parsing} onClick={handleParse}>
              <span className={`material-symbols-outlined text-[18px] ${parsing ? 'animate-spin' : ''}`}>
                {parsing ? 'progress_activity' : 'auto_awesome'}
              </span>
              {parsing ? (progress?.message || '正在解析') : '生成 AI 草稿'}
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="section-card"
          >
            <div className="flex flex-col gap-3 border-b border-hairline px-lg py-md sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={drafts.length ? 'chip chip-success' : 'chip chip-warning'}>
                    {drafts.length ? `解析完成 ${drafts.length} 条` : '未生成草稿'}
                  </span>
                  <span className="chip">{sourceLabel(result.sourceType)}</span>
                  {warnings.map((item) => (
                    <span key={item} className="chip chip-warning">{warningLabel(item)}</span>
                  ))}
                </div>
                <h2 className="mt-2 truncate text-[18px] font-medium text-ink" title={result.sourceTitle || undefined}>
                  {result.sourceTitle || result.sourceUrl || 'AI 解析结果'}
                </h2>
              </div>
              {result.sourceUrl && (
                <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  打开来源
                </a>
              )}
            </div>

            {drafts.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-lg text-center">
                <span className="material-symbols-outlined text-[42px] text-placeholder">find_in_page</span>
                <p className="mt-3 text-[14px] text-ink">暂未识别到可用赛事</p>
                <p className="mt-1 text-[12px] text-placeholder">可以换用赛事详情页、通知 PDF，或把文本更完整的文件上传。</p>
              </div>
            ) : (
              <motion.div variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-1 divide-y divide-hairline">
                {drafts.map((draft) => (
                  <DraftResultCard key={draft.id} draft={draft} onParsed={onParsed} />
                ))}
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function DraftResultCard({
  draft,
  onParsed,
}: {
  draft: AiCompetitionDraftVO;
  onParsed: (draft: AiCompetitionDraftVO) => void;
}) {
  const confidenceItems = useMemo(
    () => toConfidenceItems(draft.fieldConfidenceJson),
    [draft.fieldConfidenceJson],
  );
  const evidenceItems = useMemo(
    () => toDisplayItems(draft.evidenceJson),
    [draft.evidenceJson],
  );
  const riskItems = useMemo(
    () => toDisplayItems(draft.riskFlagsJson),
    [draft.riskFlagsJson],
  );
  const confidence = useMemo(
    () => averageConfidence(draft.fieldConfidenceJson),
    [draft.fieldConfidenceJson],
  );
  const tags = [...toStringList(draft.tags), ...toStringList(draft.tracks)];

  return (
    <motion.div variants={listItem} className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_260px]">
      <div className="section-card-body">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{sourceLabel(draft.sourceType)}</span>
          {confidence !== null && (
            <span className={`chip ${confidence < 0.7 ? 'chip-warning' : 'chip-primary'}`}>
              平均置信度 {formatConfidence(confidence)}
            </span>
          )}
          {draft.duplicateCompetitionId && <span className="chip chip-warning">疑似重复</span>}
        </div>
        <h3 className="mt-2 text-[17px] font-medium text-ink" title={draft.name || undefined}>
          {draft.name || '未识别到赛事名称'}
        </h3>
        <dl className="mt-md grid grid-cols-1 gap-x-lg gap-y-md sm:grid-cols-2">
          {[
            ['主办单位', draft.organizer || '待补充'],
            ['赛事级别', draft.level || '待补充'],
            ['赛事分类', draft.category || '待补充'],
            ['团队人数', draft.maxTeamSize ? `最多 ${draft.maxTeamSize} 人` : '待补充'],
            ['报名时间', `${formatDate(draft.startTime)} 至 ${formatDate(draft.endTime)}`],
            ['比赛时间', `${formatDate(draft.competitionStart)} 至 ${formatDate(draft.competitionEnd)}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-placeholder">{label}</dt>
              <dd className="mt-1 text-[13px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {tags.length > 0 && (
          <div className="mt-md flex flex-wrap gap-2 border-t border-hairline pt-md">
            {tags.map((item) => (
              <span key={item} className="chip">{item}</span>
            ))}
          </div>
        )}
        {draft.sourceUrl && (
          <a href={draft.sourceUrl} target="_blank" rel="noreferrer" className="mt-md inline-flex items-center gap-1 text-[12px] text-body-muted hover:underline">
            <span className="material-symbols-outlined text-[14px]">link</span>
            {draft.sourceUrl}
          </a>
        )}
      </div>

      <div className="border-t border-hairline p-lg lg:border-l lg:border-t-0">
        <h4 className="text-[13px] font-medium text-body-muted">质量检查</h4>
        <div className="mt-md flex flex-col gap-3">
          <QualityRow label="字段置信度" value={confidenceItems.length ? `${confidenceItems.length} 项` : '暂无数据'} />
          <QualityRow label="证据片段" value={`${evidenceItems.length} 条`} />
          <QualityRow label="风险提示" value={riskItems.length ? `${riskItems.length} 项` : '未发现'} tone={riskItems.length ? 'warning' : 'success'} />
          {draft.duplicateCompetitionId && (
            <div className="rounded-sm border border-border bg-surface-tile-1 px-3 py-2 text-[12px] leading-5 text-body-muted">
              疑似与赛事 #{draft.duplicateCompetitionId} 重复，相似度 {formatConfidence(draft.duplicateScore)}
            </div>
          )}
          {riskItems.slice(0, 3).map((item) => (
            <div key={`${item.label}-${item.value}`} className="rounded-sm border border-hairline bg-surface-tile-1 px-3 py-2 text-[11px] leading-5 text-body-muted">
              {warningLabel(item.value)}
            </div>
          ))}
          <button type="button" className="btn-primary mt-1 w-full justify-center" onClick={() => onParsed(draft)}>
            <span className="material-symbols-outlined text-[18px]">edit</span>
            填入表单
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QualityRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'warning';
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-placeholder">{label}</span>
      <span className={`text-[13px] font-medium ${tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}
