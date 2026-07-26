import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AiArtifact } from '../../api/aiChat';
import { smoothEase } from '../../lib/motion';
import type { AiSourceSummary, AiToolProgress, ChatImageAttachment } from './types';

const thinkingVerbs = [
  '正在理解问题',
  '正在查询平台数据',
  '正在整理回答',
  '正在核对依据',
];

const toolLabels: Record<string, string> = {
  search_competitions: '赛事信息',
  get_competition_detail: '赛事详情',
  get_my_registrations: '报名记录',
  get_my_submissions: '成果记录',
  get_my_award_proofs: '获奖证明',
  get_my_growth: '成长档案',
  get_my_comprehensive_score: '综测排名',
  get_my_participations: '活动记录',
  get_my_messages: '站内消息',
  get_announcements: '公告',
  search_students: '学生信息',
  get_student_detail: '学生详情',
  get_student_comprehensive_score: '综测排名',
  find_student_comprehensive_score: '综测排名',
  get_class_comprehensive_ranking: '班级排名',
  get_pending_reviews: '待审核任务',
  get_college_overview: '学院总览',
  get_award_proof_audit: '获奖审核',
  get_pending_drafts: '赛事草稿',
  get_ai_task_stats: 'AI 任务',
  get_user_stats: '用户统计',
  create_excel_artifact: 'Excel 文件',
  create_docx_artifact: 'DOCX 文件',
};

function ThinkingIndicator({ progress }: { progress?: AiToolProgress }) {
  const [verbIndex, setVerbIndex] = useState(() => Math.floor(Math.random() * thinkingVerbs.length));

  useEffect(() => {
    if (progress?.message) return;
    const interval = setInterval(() => {
      setVerbIndex((prev) => (prev + 1) % thinkingVerbs.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [progress?.message]);

  return (
    <span className="inline-flex items-center gap-2 text-caption font-medium text-body-subtle" aria-live="polite">
      <span className="relative flex h-1.5 w-1.5 rounded-full bg-indigo-400">
        <span className="absolute inset-0 animate-ping rounded-full bg-indigo-300/50" />
      </span>
      <span>{progress?.message || thinkingVerbs[verbIndex]}</span>
    </span>
  );
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'sending' | 'streaming' | 'done' | 'error';
  createTime?: string;
  error?: string;
  toolContext?: unknown;
  artifacts?: AiArtifact[];
  progress?: AiToolProgress;
  attachments?: ChatImageAttachment[];
}

interface ChatMessageListProps {
  messages: AssistantChatMessage[];
  onRetry?: () => void;
}

export default function ChatMessageList({ messages, onRetry }: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return <div className="min-h-0 flex-1" />;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: smoothEase, delay: Math.min(index * 0.015, 0.08) }}
            className={`mb-5 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <MessageBubble message={message} onRetry={onRetry} />
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
}

function MessageBubble({ message, onRetry }: { message: AssistantChatMessage; onRetry?: () => void }) {
  const sources = useMemo(() => summarizeToolContext(message.toolContext), [message.toolContext]);
  const comprehensiveScore = useMemo(() => extractComprehensiveScore(message.toolContext), [message.toolContext]);
  const detailTables = useMemo(() => extractDetailTables(message.toolContext), [message.toolContext]);
  const [activeTable, setActiveTable] = useState<DetailTable | null>(null);
  const isUser = message.role === 'user';
  const assistantContent = message.artifacts?.length
    ? stripArtifactDownloadLinks(message.content)
    : message.content;
  const containerClassName = isUser
    ? 'max-w-[82%] rounded-[18px] rounded-br-[6px] bg-surface-tile-2 px-3.5 py-2 text-footnote leading-[1.65] text-ink'
    : message.status === 'error'
      ? 'max-w-[88%] rounded-[15px] rounded-bl-[5px] border border-red-200/80 bg-red-50/80 px-3.5 py-2.5 text-footnote leading-[1.68] text-red-700'
      : 'w-full max-w-none text-footnote leading-[1.75] text-ink';

  return (
    <div className={containerClassName}>
      {message.attachments && message.attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {message.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.dataUrl}
              target="_blank"
              rel="noreferrer"
              className="block h-20 w-20 overflow-hidden rounded-[12px] border border-white/20 bg-black/5"
              title={attachment.name}
            >
              <img src={attachment.dataUrl} alt={attachment.name} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {message.status === 'sending' && !message.content ? (
        <ThinkingIndicator progress={message.progress} />
      ) : isUser ? (
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      ) : (
        <div className="ai-chat-markdown prose prose-sm max-w-none break-words prose-headings:font-semibold prose-headings:text-ink prose-h1:text-subhead prose-h1:mt-3 prose-h1:mb-1.5 prose-h2:text-subhead prose-h2:mt-3 prose-h2:mb-1.5 prose-h3:text-footnote prose-h3:mt-2 prose-h3:mb-1 prose-p:my-1.5 prose-p:leading-[1.75] prose-p:text-ink prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-ink prose-li:leading-[1.7] prose-pre:my-2.5 prose-pre:rounded-[9px] prose-pre:bg-surface-tile-1 prose-pre:border prose-pre:border-border/70 prose-pre:text-caption prose-pre:leading-[1.55] prose-code:before:content-none prose-code:after:content-none prose-code:bg-surface-tile-2 prose-code:text-body prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-caption prose-code:font-normal prose-blockquote:my-2 prose-blockquote:border-l-border prose-blockquote:bg-surface-tile-1/70 prose-blockquote:py-1 prose-blockquote:pr-2 prose-blockquote:rounded-r prose-blockquote:text-body-muted prose-strong:text-ink prose-strong:font-semibold prose-a:text-ink prose-a:underline prose-a:decoration-border prose-a:underline-offset-2 prose-hr:my-4 prose-hr:border-border/80 prose-img:rounded-[10px]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="my-2 max-w-full overflow-x-auto rounded-[10px] border border-border/70 bg-canvas">
                  <table className="m-0 w-max min-w-full border-collapse text-caption leading-5">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-surface-tile-1 text-body">{children}</thead>,
              tr: ({ children }) => <tr className="border-b border-border/70 last:border-b-0">{children}</tr>,
              th: ({ children }) => (
                <th className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-body">{children}</th>
              ),
              td: ({ children }) => (
                <td className="whitespace-nowrap px-2.5 py-2 align-top text-body">{children}</td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-2 rounded-r-[10px] border-l-2 border-border bg-surface-tile-1/80 py-1.5 pl-3 pr-2 text-body-muted">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => {
                const url = typeof href === 'string' ? href : '';
                if (url.startsWith('/api/file/serve/')) {
                  const label = textFromChildren(children) || '下载文件';
                  return (
                    <button
                      type="button"
                      onClick={() => void downloadUrl(url, label)}
                      className="inline-flex items-center gap-1 text-indigo-600 underline underline-offset-2"
                    >
                      {children}
                    </button>
                  );
                }
                return (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                );
              },
            }}
          >
            {stripEmoji(assistantContent)}
          </ReactMarkdown>
        </div>
      )}

      {message.role === 'assistant' && (message.status === 'streaming' || Boolean(message.content && message.progress?.message)) && (
        <div className="mt-2">
          <ThinkingIndicator progress={message.progress ?? { message: '生成中' }} />
        </div>
      )}

      {message.role === 'assistant' && comprehensiveScore && message.status === 'done' && (
        <ComprehensiveScoreCard score={comprehensiveScore} />
      )}

      {message.role === 'assistant' && detailTables.length > 0 && message.status === 'done' && (
        <DetailTableCards tables={detailTables} onOpen={setActiveTable} />
      )}

      <DetailTableModal table={activeTable} onClose={() => setActiveTable(null)} />

      {message.role === 'assistant' && message.artifacts && message.artifacts.length > 0 && (
        <ArtifactList artifacts={message.artifacts} />
      )}

      {message.role === 'assistant' && sources.length > 0 && message.status === 'done' && (
        <SourceSummary sources={sources} />
      )}

      {message.status === 'error' && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-caption text-red-400">{message.error || '回复失败'}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-red-200/80 bg-canvas px-2.5 text-caption text-red-500 transition hover:bg-red-50 hover:border-red-300"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              重试
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface ComprehensiveScoreSummary {
  academicYear?: string;
  comprehensiveRank?: number;
  rankTotal?: number;
  comprehensiveRankPercent?: number | string;
  rankScope?: string;
}

interface DetailTable {
  title: string;
  description?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  previewRows: Record<string, unknown>[];
  total?: number;
  academicYear?: string;
}

function ComprehensiveScoreCard({ score }: { score: ComprehensiveScoreSummary }) {
  const [mode, setMode] = useState<'rank' | 'percent'>('rank');
  const value = mode === 'rank'
    ? formatRank(score)
    : formatPercent(score.comprehensiveRankPercent);

  return (
    <button
      type="button"
      onClick={() => setMode((current) => current === 'rank' ? 'percent' : 'rank')}
      className="mt-2 grid w-full gap-2 rounded-[12px] border border-border/80 bg-canvas p-3 text-left transition hover:border-border-emphasis hover:bg-surface-tile-1"
      title="点击切换排名/百分比"
    >
      <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-body-muted">
        <span className="material-symbols-outlined text-[16px]">leaderboard</span>
        综测排名
      </span>
      <span className="text-title-3 font-medium leading-none text-ink tabular-nums">
        {value}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-caption-2 text-placeholder">
        <span>{score.rankScope || '本专业'}</span>
        <span>·</span>
        <span>{score.academicYear || '官方综测'}</span>
        <span className="ml-auto rounded-full bg-surface-tile-2 px-2 py-0.5 text-caption-2 text-body-subtle">
          {mode === 'rank' ? '点击查看百分比' : '点击查看排名'}
        </span>
      </span>
    </button>
  );
}

function formatRank(score: ComprehensiveScoreSummary) {
  if (!score.comprehensiveRank) return '暂无数据';
  return score.rankTotal ? `第 ${score.comprehensiveRank} / ${score.rankTotal} 名` : `第 ${score.comprehensiveRank} 名`;
}

function formatPercent(value?: number | string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '暂无数据';
  const percent = n > 1 ? n : n * 100;
  return `前 ${percent.toFixed(1)}%`;
}

function DetailTableCards({ tables, onOpen }: { tables: DetailTable[]; onOpen: (table: DetailTable) => void }) {
  return (
    <div className="mt-2 space-y-2">
      {tables.map((table) => (
        <div
          key={`${table.title}-${table.total ?? table.rows.length}`}
          className="rounded-[12px] border border-border/80 bg-canvas p-3 shadow-none"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-tile-1 text-body-muted">
              <span className="material-symbols-outlined text-[19px]">table_view</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-footnote font-semibold text-ink">{table.title}</div>
              <div className="mt-0.5 text-caption-2 text-placeholder">
                {table.academicYear ? `${table.academicYear} · ` : ''}共 {table.total ?? table.rows.length} 条
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen(table)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[9px] bg-ink px-2.5 text-caption-2 font-medium text-on-primary transition hover:bg-primary-focus"
            >
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              查看详细
            </button>
          </div>
          {table.previewRows.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-[10px] border border-hairline bg-surface-tile-1/70">
              {table.previewRows.slice(0, 3).map((row, index) => (
                <div key={index} className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5 last:border-b-0">
                  <span className="w-7 shrink-0 text-caption-2 text-placeholder">#{valueToDisplay(row['序号'] ?? index + 1)}</span>
                  <span className="min-w-0 flex-1 truncate text-caption text-body">{valueToDisplay(row['姓名'])}</span>
                  <span className="shrink-0 text-caption-2 tabular-nums text-body-subtle">
                    综测 {valueToDisplay(row['综测名次'] ?? row['学业名次'])}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailTableModal({ table, onClose }: { table: DetailTable | null; onClose: () => void }) {
  useEffect(() => {
    if (!table) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose, table]);

  if (!table) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={table.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[86vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[16px] border border-white/70 bg-canvas shadow-[0_32px_120px_rgba(15,23,42,0.28)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-callout font-semibold text-ink">{table.title}</h3>
            <p className="mt-0.5 text-caption text-body-subtle">
              {table.description || '完整表格'}{table.academicYear ? ` · ${table.academicYear}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-placeholder transition hover:bg-surface-tile-2 hover:text-body"
            aria-label="关闭表格详情"
            title="关闭"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-caption">
            <thead className="sticky top-0 z-10 bg-canvas shadow-[0_1px_0_rgba(226,232,240,1)]">
              <tr>
                {table.columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold text-body-muted">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-hairline odd:bg-surface-tile-1/60">
                  {table.columns.map((column) => (
                    <td key={column} className="whitespace-nowrap border-b border-hairline px-3 py-2 text-body">
                      {valueToDisplay(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ArtifactList({ artifacts }: { artifacts: AiArtifact[] }) {
  return (
    <div className="mt-2 space-y-2 border-t border-hairline pt-2">
      {artifacts.map((artifact) => (
        <div
          key={`${artifact.type}-${artifact.url}`}
          className="flex items-center gap-2 rounded-[12px] border border-border/70 bg-surface-tile-1/80 p-2"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-canvas text-body-muted shadow-none">
            <span className="material-symbols-outlined text-[19px]">
              {artifact.type === 'xlsx' ? 'table_view' : 'description'}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-caption font-medium text-ink">{artifact.name}</div>
            <div className="truncate text-caption-2 text-placeholder">
              {artifact.description || (artifact.type === 'xlsx' ? 'AI 生成表格' : 'AI 生成文档')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void downloadArtifact(artifact)}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[9px] bg-ink px-2.5 text-caption-2 font-medium text-on-primary transition hover:bg-primary-focus"
            aria-label={`下载 ${artifact.name}`}
            title="下载文件"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            下载
          </button>
        </div>
      ))}
    </div>
  );
}

async function downloadArtifact(artifact: AiArtifact) {
  await downloadUrl(artifact.url, artifact.name);
}

async function downloadUrl(url: string, filename: string) {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error('文件下载失败');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function textFromChildren(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textFromChildren).join('');
  return '';
}

function SourceSummary({ sources }: { sources: AiSourceSummary[] }) {
  const visible = sources.slice(0, 3);
  const overflow = sources.length - visible.length;

  return (
    <div className="mt-2 border-t border-hairline pt-1.5 text-caption-2 leading-5 text-placeholder">
      <span className="mr-1">来源：</span>
      {visible.map((source, index) => (
        <span key={`${source.label}-${index}`} className="mr-1.5 inline-flex items-center rounded-full bg-surface-tile-1 px-1.5 text-body-subtle">
          {source.label}{source.count ? ` ${source.count}` : ''}
        </span>
      ))}
      {overflow > 0 && <span>+{overflow}</span>}
    </div>
  );
}

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function stripArtifactDownloadLinks(text: string): string {
  return text
    .replace(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:下载链接|下载地址|文件链接|生成文件)[:：]?(?:\*\*)?\s*\[[^\]]+\]\(\/api\/file\/serve\/[^)]+\)\s*$/gm, '')
    .replace(/^\s*[-*]\s*\[[^\]]+\]\(\/api\/file\/serve\/[^)]+\)\s*$/gm, '')
    .replace(/^\s*(?:\*\*)?(?:下载链接|下载地址|文件链接|生成文件)[:：]?(?:\*\*)?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function summarizeToolContext(toolContext: unknown): AiSourceSummary[] {
  if (!toolContext || typeof toolContext !== 'object') return [];

  if (Array.isArray(toolContext)) {
    return toolContext.map((item) => summarizeContextEntry(item)).filter(Boolean) as AiSourceSummary[];
  }

  return Object.entries(toolContext as Record<string, unknown>)
    .map(([key, value]) => ({ label: toolLabels[key] ?? formatToolName(key), count: getContextCount(value) }))
    .filter((item) => item.label);
}

function extractComprehensiveScore(toolContext: unknown): ComprehensiveScoreSummary | null {
  if (!toolContext || typeof toolContext !== 'object' || Array.isArray(toolContext)) return null;
  const record = toolContext as Record<string, unknown>;
  const value = record.get_my_comprehensive_score ?? record.get_student_comprehensive_score ?? record.find_student_comprehensive_score;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const score = value as Record<string, unknown>;
  if (score.found === false) return null;
  const rank = toNumber(score.comprehensiveRank);
  if (!rank) return null;
  return {
    academicYear: toText(score.academicYear),
    comprehensiveRank: rank,
    rankTotal: toNumber(score.rankTotal),
    comprehensiveRankPercent: toNumber(score.comprehensiveRankPercent) ?? toText(score.comprehensiveRankPercent),
    rankScope: toText(score.rankScope),
  };
}

function extractDetailTables(toolContext: unknown): DetailTable[] {
  if (!toolContext || typeof toolContext !== 'object' || Array.isArray(toolContext)) return [];
  const tables: DetailTable[] = [];
  Object.values(toolContext as Record<string, unknown>).forEach((value) => {
    collectDetailTables(value, tables);
  });
  return tables;
}

function collectDetailTables(value: unknown, tables: DetailTable[]) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectDetailTables(item, tables));
    return;
  }
  if (typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (record.type === 'table' && Array.isArray(record.columns) && Array.isArray(record.rows)) {
    const columns = record.columns.map(valueToDisplay).filter(Boolean);
    const rows = normalizeTableRows(record.rows);
    const previewRows = Array.isArray(record.previewRows)
      ? normalizeTableRows(record.previewRows)
      : rows.slice(0, 5);
    if (columns.length && rows.length) {
      tables.push({
        title: toText(record.title) || '查询结果',
        description: toText(record.description),
        columns,
        rows,
        previewRows,
        total: toNumber(record.total) ?? rows.length,
        academicYear: toText(record.academicYear),
      });
    }
    return;
  }
  Object.values(record).forEach((nested) => collectDetailTables(nested, tables));
}

function normalizeTableRows(value: unknown[]): Record<string, unknown>[] {
  return value
    .map((row) => (row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null))
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

function toNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function summarizeContextEntry(value: unknown): AiSourceSummary | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const toolName = toText(record.toolName ?? record.name ?? record.type);
  const label = toText(record.displayName ?? record.label) || toolLabels[toolName] || formatToolName(toolName);
  return label ? { label, count: getContextCount(record.items ?? record.sources ?? record.data) } : null;
}

function getContextCount(value: unknown): number | undefined {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const count = record.count ?? record.total;
  return typeof count === 'number' ? count : undefined;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function valueToDisplay(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

function formatToolName(name: string): string {
  if (!name) return '';
  return name.replace(/^get_/, '').replace(/^my_/, '').split('_').filter(Boolean).join(' ');
}
