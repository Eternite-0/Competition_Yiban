import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { smoothEase } from '../../lib/motion';
import type { ChatImageAttachment } from './types';

const thinkingVerbs = [
  '匹配赛事中',
  '梳理数据中',
  '分析战绩中',
  '评估能力中',
  '生成推荐中',
  '洞察趋势中',
  '整合资源中',
  '推演策略中',
  '扫描赛事雷达',
  '绘制成长图谱',
  '挖掘潜力赛事',
  '智能研判中',
];

function ThinkingIndicator() {
  const [verbIndex, setVerbIndex] = useState(() => Math.floor(Math.random() * thinkingVerbs.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setVerbIndex((prev) => (prev + 1) % thinkingVerbs.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-2.5">
      {/* Animated brain/spark icon */}
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/20" />
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100">
          <span className="material-symbols-outlined text-[14px] text-indigo-500 animate-pulse">psychology</span>
        </span>
      </span>
      {/* Rotating verb text */}
      <AnimatePresence mode="wait">
        <motion.span
          key={verbIndex}
          initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
          transition={{ duration: 0.25, ease: smoothEase }}
          className="text-[12px] text-indigo-500 font-medium"
        >
          {thinkingVerbs[verbIndex]}
        </motion.span>
      </AnimatePresence>
      {/* Animated dots */}
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-1 w-1 rounded-full bg-indigo-400/70 animate-bounce [animation-delay:200ms]" />
        <span className="h-1 w-1 rounded-full bg-indigo-400/40 animate-bounce [animation-delay:400ms]" />
      </span>
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
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: smoothEase, delay: Math.min(index * 0.02, 0.1) }}
            className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[86%] text-[13px] leading-[1.7] ${
                message.role === 'user'
                  ? 'rounded-[16px] rounded-br-[6px] bg-gradient-to-br from-indigo-500 to-indigo-600 px-3.5 py-2.5 text-white shadow-sm'
                  : message.status === 'error'
                    ? 'rounded-[16px] rounded-bl-[6px] border border-red-200/80 bg-red-50/80 px-3.5 py-2.5 text-red-700'
                    : 'rounded-[16px] rounded-bl-[6px] border border-slate-200/60 bg-white px-3.5 py-2.5 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
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
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              {message.status === 'sending' && !message.content ? (
                <ThinkingIndicator />
              ) : message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-headings:text-slate-800 prose-h1:text-[15px] prose-h1:mt-3 prose-h1:mb-1.5 prose-h2:text-[14px] prose-h2:mt-2.5 prose-h2:mb-1 prose-h3:text-[13px] prose-h3:mt-2 prose-h3:mb-0.5 prose-p:my-1 prose-p:leading-[1.75] prose-p:text-slate-700 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-li:text-slate-700 prose-li:leading-[1.7] prose-pre:my-2 prose-pre:rounded-[10px] prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200/60 prose-pre:text-[12px] prose-pre:leading-[1.6] prose-code:before:content-none prose-code:after:content-none prose-code:bg-indigo-50/80 prose-code:text-indigo-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:font-normal prose-blockquote:my-2 prose-blockquote:border-l-indigo-300 prose-blockquote:bg-indigo-50/30 prose-blockquote:py-1 prose-blockquote:pr-2 prose-blockquote:rounded-r prose-blockquote:text-slate-600 prose-strong:text-slate-800 prose-strong:font-semibold prose-a:text-indigo-600 prose-a:underline prose-a:underline-offset-2 prose-hr:my-3 prose-hr:border-slate-200/60 prose-table:text-[12px] prose-th:bg-slate-50 prose-th:px-2 prose-th:py-1.5 prose-td:px-2 prose-td:py-1.5 prose-td:border-slate-200/60 prose-img:rounded-[10px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {message.role === 'assistant' && message.status === 'streaming' && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 text-indigo-400">
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                  </span>
                  <span className="text-[11px]">生成中</span>
                </span>
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
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
}
