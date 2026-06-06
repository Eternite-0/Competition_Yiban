import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { smoothEase } from '../../lib/motion';
import type { ChatImageAttachment } from './types';

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
                    <span className="inline-flex items-center gap-2 text-slate-400">
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-4 w-4 animate-ping rounded-full bg-indigo-400/30" />
                    <span className="material-symbols-outlined animate-spin text-[16px] text-indigo-500">progress_activity</span>
                  </span>
                  <span className="text-[12px]">思考中</span>
                </span>
              ) : message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none break-words prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-pre:rounded-[10px] prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200/60 prose-code:before:content-none prose-code:after:content-none prose-code:bg-indigo-50 prose-code:text-indigo-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px]">
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

              {message.role === 'assistant' && message.toolContext !== undefined && message.status !== 'error' && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50/80 px-2.5 py-1 text-[11px] text-indigo-600">
                  <span className="material-symbols-outlined text-[13px]">data_object</span>
                  已附加上下文
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
