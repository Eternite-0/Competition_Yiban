import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  averageConfidence,
  formatConfidence,
  parseCompetitionFile,
  parseCompetitionUrl,
  toConfidenceItems,
  toDisplayItems,
  toStringList,
  type AiCompetitionDraftVO,
} from '../../../api/aiCompetition';
import { listContainer, listItem } from '../../../lib/motion';

type ImportMode = 'file' | 'url';

const acceptedTypes = '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp';

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

export function aiDraftToPublishForm(draft: AiCompetitionDraftVO) {
  return {
    title: draft.name || '',
    level: (draft.level || '') as any,
    category: (draft.category || '') as any,
    organizer: draft.organizer || '',
    regStart: draft.startTime ? new Date(draft.startTime).toISOString().slice(0, 10) : '',
    regEnd: draft.endTime ? new Date(draft.endTime).toISOString().slice(0, 10) : '',
    compStart: draft.competitionStart ? new Date(draft.competitionStart).toISOString().slice(0, 10) : '',
    compEnd: draft.competitionEnd ? new Date(draft.competitionEnd).toISOString().slice(0, 10) : '',
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
  const [mode, setMode] = useState<ImportMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<AiCompetitionDraftVO | null>(null);

  const confidenceItems = useMemo(
    () => toConfidenceItems(draft?.fieldConfidenceJson),
    [draft?.fieldConfidenceJson],
  );
  const evidenceItems = useMemo(
    () => toDisplayItems(draft?.evidenceJson),
    [draft?.evidenceJson],
  );
  const riskItems = useMemo(
    () => toDisplayItems(draft?.riskFlagsJson),
    [draft?.riskFlagsJson],
  );
  const confidence = useMemo(
    () => averageConfidence(draft?.fieldConfidenceJson),
    [draft?.fieldConfidenceJson],
  );

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    const maxSize = 20 * 1024 * 1024;
    if (nextFile.size > maxSize) {
      toast.error('文件大小不能超过 20MB');
      return;
    }
    setFile(nextFile);
    setDraft(null);
    setError('');
  };

  const handleParse = async () => {
    if (mode === 'file' && !file) {
      toast.error('请先选择赛事通知文件');
      return;
    }
    if (mode === 'url') {
      try {
        new URL(url);
      } catch {
        toast.error('请输入完整有效的网页 URL');
        return;
      }
    }

    setParsing(true);
    setError('');
    setDraft(null);
    try {
      const result = mode === 'file'
        ? await parseCompetitionFile(file as File)
        : await parseCompetitionUrl(url.trim());
      setDraft(result);
      toast.success('解析完成，已生成 AI 草稿');
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : '解析失败，请稍后重试';
      setError(message);
      toast.error(message);
    } finally {
      setParsing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setUrl('');
    setDraft(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-lg">
      <section className="glass overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-lg py-md">
          <div>
            <h2 className="text-[16px] font-medium text-ink">选择导入方式</h2>
            <p className="mt-1 text-[12px] text-placeholder">上传赛事通知文件或提供公开网页地址</p>
          </div>
          <div className="flex rounded-sm border border-hairline bg-canvas-parchment p-1">
            {([
              { value: 'file', icon: 'upload_file', label: '文件' },
              { value: 'url', icon: 'link', label: 'URL' },
            ] as const).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value);
                  setDraft(null);
                  setError('');
                }}
                className={`flex h-8 items-center gap-1.5 rounded-sm px-3 text-[13px] transition ${
                  mode === item.value
                    ? 'bg-canvas text-primary shadow-sm'
                    : 'text-body-muted hover:text-ink'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-lg">
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
                      : 'border-hairline bg-canvas-parchment hover:border-primary/50'
                  }`}
                >
                  <span className="material-symbols-outlined mb-3 text-[38px] text-primary">
                    {file ? 'description' : 'upload_file'}
                  </span>
                  <span className="text-[15px] font-medium text-ink">
                    {file ? file.name : '点击选择或拖拽赛事通知'}
                  </span>
                  <span className="mt-2 max-w-[400px] text-[12px] leading-5 text-placeholder" style={{ textWrap: 'pretty' }}>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · 点击可重新选择`
                      : '支持 PDF、Word、TXT、Markdown 与常见图片格式，最大 20MB'}
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
                  请使用无需登录即可访问的赛事通知或官网详情页。
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {error ? (
            <div className="mt-md flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-md py-3 text-[13px] text-error">
              <span className="material-symbols-outlined mt-px text-[18px]">error</span>
              <span className="min-w-0 flex-1">{error}</span>
            </div>
          ) : null}

          <div className="mt-lg flex items-center justify-end gap-2 border-t border-hairline pt-md">
            {(file || url || draft) && (
              <button type="button" className="btn-secondary" disabled={parsing} onClick={reset}>
                清空
              </button>
            )}
            <button type="button" className="btn-primary min-w-[132px]" disabled={parsing} onClick={handleParse}>
              <span className={`material-symbols-outlined text-[18px] ${parsing ? 'animate-spin' : ''}`}>
                {parsing ? 'progress_activity' : 'auto_awesome'}
              </span>
              {parsing ? '正在解析' : '生成 AI 草稿'}
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {draft && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-b border-hairline px-lg py-md sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip chip-success">解析完成</span>
                  <span className="chip">{sourceLabel(draft.sourceType)}</span>
                  {confidence !== null && (
                    <span className={`chip ${confidence < 0.7 ? 'chip-warning' : 'chip-primary'}`}>
                      平均置信度 {formatConfidence(confidence)}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 truncate text-[18px] font-medium text-ink" title={draft.name || undefined}>
                  {draft.name || '未识别到赛事名称'}
                </h2>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onParsed(draft)}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                填入表单
              </button>
            </div>

            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-0 divide-y divide-hairline lg:grid-cols-3 lg:divide-x lg:divide-y-0"
            >
              <motion.div variants={listItem} className="p-lg lg:col-span-2">
                <h3 className="mb-md text-[13px] font-medium text-body-muted">草稿摘要</h3>
                <dl className="grid grid-cols-1 gap-x-lg gap-y-md sm:grid-cols-2">
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
                {(toStringList(draft.tags).length > 0 || toStringList(draft.tracks).length > 0) && (
                  <div className="mt-lg flex flex-wrap gap-2 border-t border-hairline pt-md">
                    {[...toStringList(draft.tags), ...toStringList(draft.tracks)].map((item) => (
                      <span key={item} className="chip">{item}</span>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div variants={listItem} className="p-lg">
                <h3 className="text-[13px] font-medium text-body-muted">质量检查</h3>
                <div className="mt-md flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-placeholder">字段置信度</span>
                    <span className="text-[13px] font-medium text-ink">
                      {confidenceItems.length ? `${confidenceItems.length} 项` : '暂无数据'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-placeholder">证据片段</span>
                    <span className="text-[13px] font-medium text-ink">{evidenceItems.length} 条</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-placeholder">风险提示</span>
                    <span className={`text-[13px] font-medium ${riskItems.length ? 'text-warning' : 'text-success'}`}>
                      {riskItems.length ? `${riskItems.length} 项` : '未发现'}
                    </span>
                  </div>
                  {draft.duplicateCompetitionId && (
                    <div className="rounded-sm border border-yellow-200 bg-yellow-50 px-3 py-2 text-[12px] leading-5 text-yellow-800">
                      疑似与赛事 #{draft.duplicateCompetitionId} 重复，相似度 {formatConfidence(draft.duplicateScore)}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
