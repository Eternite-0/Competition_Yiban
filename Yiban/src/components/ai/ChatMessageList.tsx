import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  get_my_participations: '活动记录',
  get_my_messages: '站内消息',
  get_announcements: '公告',
  search_students: '学生信息',
  get_student_detail: '学生详情',
  get_pending_reviews: '待审核任务',
  get_college_overview: '学院总览',
  get_award_proof_audit: '获奖审核',
  get_pending_drafts: '赛事草稿',
  get_ai_task_stats: 'AI 任务',
  get_user_stats: '用户统计',
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
    <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-500" aria-live="polite">
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
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: smoothEase, delay: Math.min(index * 0.015, 0.08) }}
            className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
  const isUser = message.role === 'user';

  return (
    <div
      className={`max-w-[88%] text-[13px] leading-[1.68] ${
        isUser
          ? 'rounded-[15px] rounded-br-[5px] bg-slate-900 px-3.5 py-2.5 text-white shadow-sm'
          : message.status === 'error'
            ? 'rounded-[15px] rounded-bl-[5px] border border-red-200/80 bg-red-50/80 px-3.5 py-2.5 text-red-700'
            : 'rounded-[15px] rounded-bl-[5px] border border-slate-200/70 bg-white/90 px-3.5 py-2.5 text-slate-800'
      }`}
    >
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
        <div className="ai-chat-markdown prose prose-sm max-w-none break-words prose-headings:font-semibold prose-headings:text-slate-800 prose-h1:text-[15px] prose-h1:mt-2.5 prose-h1:mb-1 prose-h2:text-[14px] prose-h2:mt-2 prose-h2:mb-1 prose-h3:text-[13px] prose-h3:mt-1.5 prose-h3:mb-0.5 prose-p:my-1 prose-p:leading-[1.7] prose-p:text-slate-700 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-li:text-slate-700 prose-li:leading-[1.65] prose-pre:my-2 prose-pre:rounded-[9px] prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200/70 prose-pre:text-[12px] prose-pre:leading-[1.55] prose-code:before:content-none prose-code:after:content-none prose-code:bg-slate-100 prose-code:text-slate-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:font-normal prose-blockquote:my-2 prose-blockquote:border-l-slate-200 prose-blockquote:bg-slate-50/70 prose-blockquote:py-1 prose-blockquote:pr-2 prose-blockquote:rounded-r prose-blockquote:text-slate-600 prose-strong:text-slate-800 prose-strong:font-semibold prose-a:text-indigo-600 prose-a:underline prose-a:underline-offset-2 prose-hr:my-3 prose-hr:border-slate-200/60 prose-img:rounded-[10px]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="my-2 max-w-full overflow-x-auto rounded-[10px] border border-slate-200/70 bg-white">
                  <table className="m-0 w-max min-w-full border-collapse text-[12px] leading-5">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-slate-50 text-slate-700">{children}</thead>,
              tr: ({ children }) => <tr className="border-b border-slate-200/70 last:border-b-0">{children}</tr>,
              th: ({ children }) => (
                <th className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-slate-700">{children}</th>
              ),
              td: ({ children }) => (
                <td className="whitespace-nowrap px-2.5 py-2 align-top text-slate-700">{children}</td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-2 rounded-r-[10px] border-l-2 border-slate-200 bg-slate-50/80 py-1.5 pl-3 pr-2 text-slate-600">
                  {children}
                </blockquote>
              ),
            }}
          >
            {stripEmoji(message.content)}
          </ReactMarkdown>
        </div>
      )}

      {message.role === 'assistant' && (message.status === 'streaming' || Boolean(message.content && message.progress?.message)) && (
        <div className="mt-2 border-t border-slate-100 pt-1.5">
          <ThinkingIndicator progress={message.progress ?? { message: '生成中' }} />
        </div>
      )}

      {message.role === 'assistant' && sources.length > 0 && message.status === 'done' && (
        <SourceSummary sources={sources} />
      )}

      {message.status === 'error' && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[12px] text-red-400">{message.error || '回复失败'}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-red-200/80 bg-white px-2.5 text-[12px] text-red-500 transition hover:bg-red-50 hover:border-red-300"
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

function SourceSummary({ sources }: { sources: AiSourceSummary[] }) {
  const visible = sources.slice(0, 3);
  const overflow = sources.length - visible.length;

  return (
    <div className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] leading-5 text-slate-400">
      <span className="mr-1">来源：</span>
      {visible.map((source, index) => (
        <span key={`${source.label}-${index}`} className="mr-1.5 inline-flex items-center rounded-full bg-slate-50 px-1.5 text-slate-500">
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

function summarizeToolContext(toolContext: unknown): AiSourceSummary[] {
  if (!toolContext || typeof toolContext !== 'object') return [];

  if (Array.isArray(toolContext)) {
    return toolContext.map((item) => summarizeContextEntry(item)).filter(Boolean) as AiSourceSummary[];
  }

  return Object.entries(toolContext as Record<string, unknown>)
    .map(([key, value]) => ({ label: toolLabels[key] ?? formatToolName(key), count: getContextCount(value) }))
    .filter((item) => item.label);
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

function formatToolName(name: string): string {
  if (!name) return '';
  return name.replace(/^get_/, '').replace(/^my_/, '').split('_').filter(Boolean).join(' ');
}
